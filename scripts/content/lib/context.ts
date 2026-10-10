import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isNode, isSeq, LineCounter, parseDocument, parse as parseYaml } from 'yaml';
import { Blueprint } from '../../../schemas/blueprint.ts';
import { Concept } from '../../../schemas/concept.ts';
import { Forms, Quotas } from '../../../schemas/exam.ts';
import { FingerprintFile } from '../../../schemas/fingerprint.ts';
import { type Badge, Badges, type Rank, Ranks } from '../../../schemas/game.ts';
import { LabFile } from '../../../schemas/lab.ts';
import { MissionFrontmatter } from '../../../schemas/mission.ts';
import { LessonFrontmatter, ModuleFrontmatter } from '../../../schemas/note.ts';
import { Question, QuestionFile } from '../../../schemas/question.ts';
import { type RuleId, ValidateConfig } from '../../../schemas/validate-config.ts';
import { type HashSet, unpack } from './fingerprint.ts';
import { type Heading, headingsOf, splitFrontmatter } from './markdown.ts';
import { phrasesFrom } from './text.ts';

export interface Finding {
  rule: RuleId;
  file: string;
  line?: number;
  message: string;
}

interface NoteBase {
  path: string;
  id: string;
  module: number;
  number: number;
  slugFromPath: string;
  text: string;
  body: string;
  bodyLine: number;
  headings: Heading[];
  keys: string[];
}
export interface LessonNote extends NoteBase {
  kind: 'lesson';
  fm: LessonFrontmatter | null;
}
export interface ModuleNote extends NoteBase {
  kind: 'module';
  fm: ModuleFrontmatter | null;
}
export type Note = LessonNote | ModuleNote;

export interface Mission {
  path: string;
  id: string;
  fm: MissionFrontmatter | null;
  body: string;
  bodyLine: number;
}

export interface TextFile {
  path: string;
  text: string;
}

/** One question that passed the schema, with where it sits: `line` is the 1-based line of its list item. */
export interface QuestionEntry {
  path: string;
  line: number;
  index: number;
  /** The module of the file, from its NN: a lesson file's module, or an exam-pool file's module. */
  module: number;
  /** The note the item belongs to: a lesson file's note from its path, an exam-pool item's `note`. */
  noteId: string;
  q: Question;
}

/** One lab file that passed the schema, its folder module and its file slug (spec 5.1). */
export interface LabEntry {
  path: string;
  module: number;
  slug: string;
  lab: LabFile;
}

/** One module's committed fingerprints: its two shingle sets, which hold each course shingle once between all modules (spec 2.5). */
export interface ModulePrints {
  text: HashSet;
  items: HashSet;
  /** Knowledge check and assessment item ids, sorted. */
  itemIds: readonly string[];
  /** Other modules whose `items` sets hold some of this module's knowledge check and assessment item shingles. */
  itemsFrom: readonly number[];
}

/** Everything the rules and the build read, loaded once; parse and schema errors become R1 findings instead of exceptions. */
export interface Context {
  root: string;
  today: string;
  files: readonly string[];
  config: ValidateConfig | null;
  notes: readonly Note[];
  shared: readonly TextFile[];
  concepts: readonly Concept[];
  blueprint: Blueprint | null;
  missions: readonly Mission[];
  /** Questions that passed the schema, practice files and exam-pool files alike, in file then item order. */
  questions: readonly QuestionEntry[];
  /** Labs that passed the schema and sit in their module folder under their own id, in file order. */
  labs: readonly LabEntry[];
  /** content/exam/quotas.yaml, or null when it is absent or invalid. */
  quotas: Quotas | null;
  /** content/exam/forms.yaml, or null when it is absent or invalid. */
  forms: Forms | null;
  ranks: Rank[] | null;
  badges: Badge[] | null;
  fingerprints: ReadonlyMap<number, ModulePrints>;
  allow: readonly (readonly string[])[];
  loadErrors: readonly Finding[];
  read: (path: string) => string | null;
  head: (path: string) => string | null;
  /** Paths in HEAD under the prefix; [] outside git or when HEAD has none. */
  headPaths: (prefix: string) => string[];
}

export const CONFIG_FILE = 'content/validate.yaml';
export const CONCEPTS_FILE = 'content/concepts.yaml';
export const BLUEPRINT_FILE = 'content/exam/blueprint.yaml';
export const ALLOW_FILE = 'content/fingerprints/allow.txt';
export const QUESTIONS_DIR = 'content/questions';
export const POOL_DIR = 'content/exam/pool';
export const QUOTAS_FILE = 'content/exam/quotas.yaml';
export const FORMS_FILE = 'content/exam/forms.yaml';
export const RANKS_FILE = 'content/game/ranks.yaml';
export const BADGES_FILE = 'content/game/badges.yaml';
export const LABS_DIR = 'content/labs';

/** The question file of a lesson note: resources/NN-module/LL-lesson.md keeps its questions in content/questions/NN-module/LL-lesson.yaml. */
export function questionFileOf(lessonPath: string): string {
  return lessonPath.replace(/^resources\//, `${QUESTIONS_DIR}/`).replace(/\.md$/, '.yaml');
}
const QUESTION = /^content\/questions\/(\d{2})-[a-z0-9-]+\/(\d{2})-([a-z0-9-]+)\.yaml$/;
const NOTE = /^resources\/(\d{2})-([a-z0-9-]+)\/(?:(\d{2})-([a-z0-9-]+)|README)\.md$/;
const SHARED = /^resources\/[^/]+\.md$/;
const MISSION = /^content\/missions\/(mission-\d{2})-[a-z0-9-]+\.md$/;
const PRINTS = /^content\/fingerprints\/m(\d{2})\.json$/;
const POOL = /^content\/exam\/pool\/(\d{2})-[a-z0-9-]+\.yaml$/;
const LAB = /^content\/labs\/(\d{2})-[a-z0-9-]+\/([a-z0-9-]+)\.yaml$/;
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'test-results',
  'playwright-report',
  'coverage',
  '.results',
]);

type Issue = { readonly path: readonly PropertyKey[]; readonly message: string };
const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Today's date in the local time zone, as YYYY-MM-DD. */
export function localDate(date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Tracked and untracked-but-not-ignored files in a git repo; every file below root otherwise. */
function listFiles(root: string, isGit: boolean): string[] {
  if (isGit) {
    const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return [...new Set(out.split('\0'))].filter((f) => f !== '' && existsSync(join(root, f))).sort();
  }
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const rel = dir === '' ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.isFile()) files.push(rel);
    }
  };
  walk('');
  return files.sort();
}

export function loadContext(root: string, options: { today?: string } = {}): Context {
  const errors: Finding[] = [];
  const isGit = existsSync(join(root, '.git'));
  const files = listFiles(root, isGit);
  const cache = new Map<string, string | null>();
  const fingerprints = new Map<number, ModulePrints>();

  const read = (path: string): string | null => {
    if (!cache.has(path)) {
      const full = join(root, path);
      cache.set(path, existsSync(full) && statSync(full).isFile() ? readFileSync(full, 'utf8') : null);
    }
    return cache.get(path) ?? null;
  };

  const schemaErrors = (file: string, issues: readonly Issue[], prefix = '', line?: number): void => {
    for (const issue of issues) {
      const where = [prefix, ...issue.path.map(String)].filter((p) => p !== '').join('.') || '(root)';
      errors.push({
        rule: 'R1',
        file,
        ...(line === undefined ? {} : { line }),
        message: `${where}: ${issue.message}`,
      });
    }
  };

  const yamlFile = (path: string, optional = false): unknown => {
    const text = read(path);
    if (text === null) {
      if (!optional) errors.push({ rule: 'R1', file: path, message: 'required file is missing' });
      return undefined;
    }
    try {
      return parseYaml(text);
    } catch (error) {
      errors.push({ rule: 'R1', file: path, message: `YAML: ${errorText(error)}` });
      return undefined;
    }
  };

  const frontmatterOf = (path: string, text: string): { data: unknown; body: string; bodyLine: number } => {
    const { yaml, body, bodyLine } = splitFrontmatter(text);
    if (yaml === null) {
      errors.push({ rule: 'R1', file: path, line: 1, message: 'missing frontmatter' });
      return { data: undefined, body, bodyLine };
    }
    try {
      return { data: parseYaml(yaml), body, bodyLine };
    } catch (error) {
      errors.push({ rule: 'R1', file: path, line: 1, message: `frontmatter YAML: ${errorText(error)}` });
      return { data: undefined, body, bodyLine };
    }
  };

  const loadNote = (path: string, match: RegExpExecArray): Note => {
    const text = read(path) ?? '';
    const { data, body, bodyLine } = frontmatterOf(path, text);
    const base = {
      path,
      module: Number(match[1]),
      text,
      body,
      bodyLine,
      headings: headingsOf(body, bodyLine),
      keys: isRecord(data) ? Object.keys(data) : [],
    };
    const lessonSlug = match[4];
    if (lessonSlug !== undefined) {
      const parsed = data === undefined ? null : LessonFrontmatter.safeParse(data);
      if (parsed && !parsed.success) schemaErrors(path, parsed.error.issues, 'frontmatter', 1);
      return {
        ...base,
        kind: 'lesson',
        id: `m${match[1]}/${lessonSlug}`,
        number: Number(match[3]),
        slugFromPath: lessonSlug,
        fm: parsed?.success ? parsed.data : null,
      };
    }
    const parsed = data === undefined ? null : ModuleFrontmatter.safeParse(data);
    if (parsed && !parsed.success) schemaErrors(path, parsed.error.issues, 'frontmatter', 1);
    return {
      ...base,
      kind: 'module',
      id: `m${match[1]}`,
      number: 0,
      slugFromPath: match[2] ?? '',
      fm: parsed?.success ? parsed.data : null,
    };
  };

  const loadMission = (path: string, id: string): Mission => {
    const { data, body, bodyLine } = frontmatterOf(path, read(path) ?? '');
    const parsed = data === undefined ? null : MissionFrontmatter.safeParse(data);
    if (parsed && !parsed.success) schemaErrors(path, parsed.error.issues, 'frontmatter', 1);
    return { path, id, fm: parsed?.success ? parsed.data : null, body, bodyLine };
  };

  const loadPrints = (path: string, module: number): void => {
    let data: unknown;
    try {
      data = JSON.parse(read(path) ?? '');
    } catch (error) {
      errors.push({ rule: 'R1', file: path, message: `JSON: ${errorText(error)}` });
      return;
    }
    const parsed = FingerprintFile.safeParse(data);
    if (!parsed.success) {
      schemaErrors(path, parsed.error.issues);
      return;
    }
    if (parsed.data.module !== module) {
      errors.push({ rule: 'R1', file: path, message: `holds module ${parsed.data.module}, not ${module}` });
      return;
    }
    let set: 'text' | 'items' = 'text';
    try {
      const text = unpack(parsed.data.text);
      set = 'items';
      const items = unpack(parsed.data.items);
      const { itemIds, itemsFrom } = parsed.data;
      fingerprints.set(module, { text, items, itemIds, itemsFrom });
    } catch (error) {
      errors.push({ rule: 'R1', file: path, message: `${set}: ${errorText(error)}` });
    }
  };

  const questions: QuestionEntry[] = [];
  /** Loads one question file: a lesson's practice file (`pool` practice) or a module's exam-pool file (`pool` exam). */
  const loadQuestions = (
    path: string,
    module: number,
    pool: 'practice' | 'exam',
    lessonNote?: string,
  ): void => {
    const lineCounter = new LineCounter();
    const doc = parseDocument(read(path) ?? '', { lineCounter });
    const [yamlError] = doc.errors;
    if (yamlError !== undefined) {
      errors.push({
        rule: 'R1',
        file: path,
        line: lineCounter.linePos(yamlError.pos[0]).line,
        message: `YAML: ${yamlError.message}`,
      });
      return;
    }
    const parsed = QuestionFile.safeParse(doc.toJS());
    if (!parsed.success) {
      schemaErrors(path, parsed.error.issues);
      return;
    }
    const seq = doc.get('questions', true);
    const items = isSeq(seq) ? seq.items : [];
    for (const [index, item] of parsed.data.questions.entries()) {
      const node = items[index];
      const start = isNode(node) ? node.range?.[0] : undefined;
      const line = start === undefined ? undefined : lineCounter.linePos(start).line;
      const result = Question.safeParse(item);
      if (!result.success) {
        const label = isRecord(item) && typeof item.id === 'string' ? item.id : `#${index + 1}`;
        schemaErrors(path, result.error.issues, `questions[${index}] (${label})`, line);
        continue;
      }
      const q = result.data;
      const at = line ?? 1;
      if (q.pool !== pool) {
        const message =
          pool === 'exam'
            ? `${q.id}: pool files hold pool: exam only`
            : `${q.id}: exam items live under ${POOL_DIR}/`;
        errors.push({ rule: 'R1', file: path, line: at, message });
        continue;
      }
      if (pool === 'exam' && Number(q.note.slice(1, 3)) !== module) {
        const nn = String(module).padStart(2, '0');
        errors.push({
          rule: 'R1',
          file: path,
          line: at,
          message: `${q.id}: note ${q.note} is not in module ${nn}`,
        });
        continue;
      }
      questions.push({ path, line: at, index, module, noteId: lessonNote ?? q.note, q });
    }
  };

  const labs: LabEntry[] = [];
  /** Loads one lab file; the lab joins `labs` only when it passes the schema and matches its folder and file name. */
  const loadLab = (path: string, folder: number, slug: string): void => {
    const data = yamlFile(path);
    if (data === undefined) return;
    const parsed = LabFile.safeParse(data);
    if (!parsed.success) {
      schemaErrors(path, parsed.error.issues);
      return;
    }
    const lab = parsed.data;
    const nn = String(folder).padStart(2, '0');
    if (lab.module !== folder) {
      errors.push({
        rule: 'R1',
        file: path,
        message: `lab module ${lab.module} does not match its folder ${nn}`,
      });
      return;
    }
    const id = `lab-m${nn}-${slug}`;
    if (lab.id !== id) {
      errors.push({ rule: 'R1', file: path, message: `lab id must be ${id}` });
      return;
    }
    labs.push({ path, module: folder, slug, lab });
  };

  let config: ValidateConfig | null = null;
  const configData = yamlFile(CONFIG_FILE);
  if (configData !== undefined) {
    const parsed = ValidateConfig.safeParse(configData);
    if (parsed.success) config = parsed.data;
    else schemaErrors(CONFIG_FILE, parsed.error.issues);
  }

  const concepts: Concept[] = [];
  const conceptData = yamlFile(CONCEPTS_FILE);
  if (conceptData !== undefined) {
    if (!Array.isArray(conceptData)) {
      errors.push({ rule: 'R1', file: CONCEPTS_FILE, message: 'must be a list of concepts' });
    } else {
      for (const [i, entry] of conceptData.entries()) {
        const parsed = Concept.safeParse(entry);
        if (parsed.success) concepts.push(parsed.data);
        else {
          const label = isRecord(entry) && typeof entry.id === 'string' ? `[${entry.id}]` : `[#${i + 1}]`;
          schemaErrors(CONCEPTS_FILE, parsed.error.issues, label);
        }
      }
    }
  }

  let blueprint: Blueprint | null = null;
  const blueprintData = yamlFile(BLUEPRINT_FILE);
  if (blueprintData !== undefined) {
    const parsed = Blueprint.safeParse(blueprintData);
    if (parsed.success) blueprint = parsed.data;
    else schemaErrors(BLUEPRINT_FILE, parsed.error.issues);
  }

  /** An optional or required YAML file parsed by `schema`, or null with R1 findings. */
  const schemaFile = <T>(
    path: string,
    schema: {
      safeParse: (
        data: unknown,
      ) => { success: true; data: T } | { success: false; error: { issues: Issue[] } };
    },
    optional: boolean,
  ): T | null => {
    const data = yamlFile(path, optional);
    if (data === undefined) return null;
    const parsed = schema.safeParse(data);
    if (parsed.success) return parsed.data;
    schemaErrors(path, parsed.error.issues);
    return null;
  };
  const quotas = schemaFile<Quotas>(QUOTAS_FILE, Quotas, true);
  const forms = schemaFile<Forms>(FORMS_FILE, Forms, true);
  const ranks = schemaFile<Rank[]>(RANKS_FILE, Ranks, false);
  const badges = schemaFile<Badge[]>(BADGES_FILE, Badges, false);

  const notes: Note[] = [];
  const shared: TextFile[] = [];
  const missions: Mission[] = [];
  for (const path of files) {
    const note = NOTE.exec(path);
    if (note) {
      notes.push(loadNote(path, note));
      continue;
    }
    if (SHARED.test(path)) {
      shared.push({ path, text: read(path) ?? '' });
      continue;
    }
    const mission = MISSION.exec(path);
    if (mission) {
      missions.push(loadMission(path, mission[1] ?? ''));
      continue;
    }
    const prints = PRINTS.exec(path);
    if (prints) {
      loadPrints(path, Number(prints[1]));
      continue;
    }
    const questionFile = QUESTION.exec(path);
    if (questionFile) {
      loadQuestions(path, Number(questionFile[1]), 'practice', `m${questionFile[1]}/${questionFile[3]}`);
      continue;
    }
    const poolFile = POOL.exec(path);
    if (poolFile) {
      loadQuestions(path, Number(poolFile[1]), 'exam');
      continue;
    }
    const labFile = LAB.exec(path);
    if (labFile) {
      loadLab(path, Number(labFile[1]), labFile[2] ?? '');
      continue;
    }
    if (path.startsWith(`${LABS_DIR}/`)) {
      errors.push({
        rule: 'R1',
        file: path,
        message: 'content/labs holds lab YAML files in NN-module folders only',
      });
      continue;
    }
    if (path.startsWith(`${POOL_DIR}/`)) {
      errors.push({
        rule: 'R1',
        file: path,
        message: `not a pool file path; use ${POOL_DIR}/NN-module-slug.yaml`,
      });
      continue;
    }
    if (path.startsWith(`${QUESTIONS_DIR}/`) && path.endsWith('.yaml')) {
      errors.push({
        rule: 'R1',
        file: path,
        message:
          'not a question file path (content/questions/NN-module/NN-lesson.yaml), so no rule checks it',
      });
      continue;
    }
    if (path.startsWith('resources/') && path.endsWith('.md')) {
      errors.push({
        rule: 'R1',
        file: path,
        message: 'not a note path (resources/NN-module/NN-lesson.md or README.md), so no rule checks it',
      });
    }
  }
  notes.sort((a, b) => a.module - b.module || a.number - b.number);

  const allowText = read(ALLOW_FILE);
  const head = (path: string): string | null => {
    if (!isGit) return null;
    const result = spawnSync('git', ['show', `HEAD:${path}`], { cwd: root, encoding: 'utf8' });
    return result.status === 0 ? result.stdout : null;
  };
  const headPaths = (prefix: string): string[] => {
    if (!isGit) return [];
    const result = spawnSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', prefix], {
      cwd: root,
      encoding: 'utf8',
    });
    return result.status === 0 ? result.stdout.split('\n').filter((p) => p !== '') : [];
  };

  return {
    root,
    today: options.today ?? localDate(),
    files,
    config,
    notes,
    shared,
    concepts,
    blueprint,
    missions,
    questions,
    labs,
    quotas,
    forms,
    ranks,
    badges,
    fingerprints,
    allow: allowText === null ? [] : phrasesFrom(allowText.split('\n')),
    loadErrors: errors,
    read,
    head,
    headPaths,
  };
}
