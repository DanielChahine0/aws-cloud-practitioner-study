/**
 * The capstone project loader (spec 6): content/project/brief.yaml and the per-module key point files, read once per
 * context and shared by every rule that checks them. The brief is optional here, so a tree with no project has no
 * project findings; tests/unit/project-content.test.ts requires it in the real repo.
 */
import { type Document, isMap, isNode, isScalar, isSeq, LineCounter, parseDocument } from 'yaml';
import type { z } from 'zod';
import { Brief, type KeyPoint, KeyPointFile } from '../../../schemas/project.ts';
import type { Context, Finding } from './context.ts';
import { evidenceForm, noteLines } from './evidence.ts';
import { hash12 } from './hashes.ts';

export const PROJECT_DIR = 'content/project';
export const BRIEF_FILE = 'content/project/brief.yaml';
export const KEY_POINT_FILE = /^content\/project\/key-points\/(\d{2})-[a-z0-9-]+\.yaml$/;

/** One key point with where it sits: its file, the 1-based line of its list item and its index in the list. */
export interface KeyPointEntry {
  path: string;
  line: number;
  index: number;
  module: number;
  kp: KeyPoint;
}

/** One string of the project as R8 reads it: every brief string by field path, and each key point text by id. */
export interface ProjectString {
  path: string;
  line: number;
  field: string;
  text: string;
}

export interface Project {
  brief: Brief | null;
  keyPoints: readonly KeyPointEntry[];
  strings: readonly ProjectString[];
  errors: readonly Finding[];
}

const cache = new WeakMap<Context, Project>();

/** The fullHash a key point's stamp binds: the text, concepts and evidence the critic saw (spec 2.7). */
export function keyPointHash(kp: Pick<KeyPoint, 'text' | 'concepts' | 'evidence'>): string {
  return hash12({ text: kp.text, concepts: kp.concepts, evidence: kp.evidence });
}

/** The 1-based line of the deepest node on `path` that the document holds, or of the document start. */
function lineAt(doc: Document.Parsed, counter: LineCounter, path: readonly PropertyKey[]): number {
  for (let n = path.length; n >= 0; n--) {
    const node = n === 0 ? doc.contents : doc.getIn(path.slice(0, n), true);
    if (isNode(node) && node.range) return counter.linePos(node.range[0]).line;
  }
  return 1;
}

/** Every string scalar under `node`, labelled with its field path, such as decisions[0].context[1]. */
function stringsOf(
  node: unknown,
  field: string,
  path: string,
  counter: LineCounter,
  out: ProjectString[],
): void {
  if (isMap(node)) {
    for (const pair of node.items) {
      const key = isScalar(pair.key) ? String(pair.key.value) : '?';
      stringsOf(pair.value, field === '' ? key : `${field}.${key}`, path, counter, out);
    }
  } else if (isSeq(node)) {
    for (const [i, item] of node.items.entries()) stringsOf(item, `${field}[${i}]`, path, counter, out);
  } else if (isScalar(node) && typeof node.value === 'string' && node.range) {
    out.push({ path, line: counter.linePos(node.range[0]).line, field, text: node.value });
  }
}

/** A parsed project file: its YAML document and the line counter that maps its offsets to lines. */
interface ParsedYaml {
  doc: Document.Parsed;
  counter: LineCounter;
}

/** Parses one YAML file of the project; null on a YAML error, which it reports at its line. */
function parseFile(path: string, text: string, errors: Finding[]): ParsedYaml | null {
  const counter = new LineCounter();
  const doc = parseDocument(text, { lineCounter: counter });
  const [yamlError] = doc.errors;
  if (yamlError === undefined) return { doc, counter };
  const line = counter.linePos(yamlError.pos[0]).line;
  errors.push({ rule: 'R1', file: path, line, message: `YAML: ${yamlError.message}` });
  return null;
}

/** Checks a parsed file against its schema, reporting each issue at the line of the deepest node on its path. */
function check<T>(path: string, file: ParsedYaml, schema: z.ZodType<T>, errors: Finding[]): T | null {
  const parsed = schema.safeParse(file.doc.toJS());
  if (parsed.success) return parsed.data;
  for (const issue of parsed.error.issues) {
    const where = issue.path.map(String).join('.') || '(root)';
    const line = lineAt(file.doc, file.counter, issue.path);
    errors.push({ rule: 'R1', file: path, line, message: `${where}: ${issue.message}` });
  }
  return null;
}

/** The project of a context, loaded on first use: the brief, every key point with its line, the strings, R1 findings. */
export function projectOf(ctx: Context): Project {
  const hit = cache.get(ctx);
  if (hit !== undefined) return hit;
  const errors: Finding[] = [];
  const strings: ProjectString[] = [];
  const keyPoints: KeyPointEntry[] = [];
  const modules = new Set<number>();
  let brief: Brief | null = null;
  for (const path of ctx.files) {
    if (!path.startsWith(`${PROJECT_DIR}/`)) continue;
    const text = ctx.read(path);
    if (text === null) continue;
    if (path === BRIEF_FILE) {
      const file = parseFile(path, text, errors);
      if (file === null) continue;
      brief = check(path, file, Brief, errors);
      if (brief !== null) stringsOf(file.doc.contents, '', path, file.counter, strings);
      continue;
    }
    const match = KEY_POINT_FILE.exec(path);
    if (match === null) {
      errors.push({
        rule: 'R1',
        file: path,
        message: 'content/project holds brief.yaml and key-points/NN-module-dir.yaml files only',
      });
      continue;
    }
    const prefix = Number(match[1]);
    if (modules.has(prefix)) {
      errors.push({
        rule: 'R1',
        file: path,
        message: `a second key point file for Module ${prefix}; keep one file per module`,
      });
      continue;
    }
    modules.add(prefix);
    const file = parseFile(path, text, errors);
    if (file === null) continue;
    const declared = file.doc.get('module');
    if (typeof declared === 'number' && declared !== prefix) {
      errors.push({
        rule: 'R1',
        file: path,
        line: lineAt(file.doc, file.counter, ['module']),
        message: `module ${declared} must match the file name prefix ${match[1]}`,
      });
      continue;
    }
    const data = check(path, file, KeyPointFile, errors);
    if (data === null) continue;
    for (const [index, kp] of data.keyPoints.entries()) {
      const line = lineAt(file.doc, file.counter, ['keyPoints', index]);
      keyPoints.push({ path, line, index, module: prefix, kp });
      strings.push({
        path,
        line: lineAt(file.doc, file.counter, ['keyPoints', index, 'text']),
        field: kp.id,
        text: kp.text,
      });
    }
  }
  const project: Project = { brief, keyPoints, strings, errors };
  cache.set(ctx, project);
  return project;
}

/**
 * Whether a key point's evidence is a whole line of the home note of one of its concepts, each concept found by id or
 * alias (spec 2.9, R5); null when none of its concepts resolves to a loaded note, which R6 reports.
 */
export function evidenceHolds(ctx: Context, kp: Pick<KeyPoint, 'concepts' | 'evidence'>): boolean | null {
  const form = evidenceForm(kp.evidence);
  let found = false;
  for (const id of kp.concepts) {
    const concept = ctx.concepts.find((c) => c.id === id || (c.aliases ?? []).includes(id));
    const note = concept === undefined ? undefined : ctx.notes.find((n) => n.id === concept.home);
    if (note === undefined) continue;
    found = true;
    if (noteLines(note).has(form)) return true;
  }
  return found ? false : null;
}
