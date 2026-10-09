import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isNode, isSeq, LineCounter, parseDocument, parse as parseYaml } from 'yaml';
import { Blueprint } from '../../../schemas/blueprint.ts';
import { Concept } from '../../../schemas/concept.ts';
import { FingerprintFile } from '../../../schemas/fingerprint.ts';
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
  /** The note the file belongs to, from its path: m01/what-a-bakery-cloud-is. */
  noteId: string;
  q: Question;
}

export interface ModulePrints {
  text: HashSet;
  /** Knowledge check and assessment item ids, sorted; items carry no hashes of their own (spec 2.5). */
  items: readonly string[];
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
  /** Questions that passed the schema, in file then item order. */
  questions: readonly QuestionEntry[];
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
const QUESTION = /^content\/questions\/(\d{2})-[a-z0-9-]+\/(\d{2})-([a-z0-9-]+)\.yaml$/;
const NOTE = /^resources\/(\d{2})-([a-z0-9-]+)\/(?:(\d{2})-([a-z0-9-]+)|README)\.md$/;
const SHARED = /^resources\/[^/]+\.md$/;
const MISSION = /^content\/missions\/(mission-\d{2})-[a-z0-9-]+\.md$/;
const PRINTS = /^content\/fingerprints\/m(\d{2})\.json$/;
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

  const yamlFile = (path: string): unknown => {
    const text = read(path);
    if (text === null) {
      errors.push({ rule: 'R1', file: path, message: 'required file is missing' });
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
    try {
      fingerprints.set(module, { text: unpack(parsed.data.text), items: parsed.data.items });
    } catch (error) {
      errors.push({ rule: 'R1', file: path, message: `text: ${errorText(error)}` });
    }
  };

  const questions: QuestionEntry[] = [];
  const loadQuestions = (path: string, match: RegExpExecArray): void => {
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
      questions.push({ path, line: line ?? 1, index, noteId: `m${match[1]}/${match[3]}`, q: result.data });
    }
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
      loadQuestions(path, questionFile);
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
    fingerprints,
    allow: allowText === null ? [] : phrasesFrom(allowText.split('\n')),
    loadErrors: errors,
    read,
    head,
    headPaths,
  };
}
