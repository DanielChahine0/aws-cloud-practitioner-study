/**
 * The key point check pipeline (spec 2.7 for the capstone key points): keyless batches for the key point critic, the
 * lint and grade of its answers, and the stamp that binds a pass to a key point's fullHash.
 * It mirrors scripts/content/lib/checks.ts, which serves the questions, so the question checks and their stamps stay
 * untouched. Everything lives under .results/key-points/ (git-ignored).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  Document,
  isMap,
  isScalar,
  isSeq,
  type Pair,
  parseDocument,
  parse as parseYaml,
  YAMLMap,
  YAMLSeq,
} from 'yaml';
import { z } from 'zod';
import { type KeyPointVerified, MIN_KEY_POINTS } from '../../../schemas/project.ts';
import type { Review } from '../../../schemas/question.ts';
import { mulberry32, shuffle } from '../../../src/engine/rng.ts';
import { NEEDS_DANI_ATTEMPTS, type PassLog } from './checks.ts';
import { type Context, localDate } from './context.ts';
import { splitFrontmatter } from './markdown.ts';
import { BRIEF_FILE, evidenceHolds, type KeyPointEntry, keyPointHash, projectOf } from './project.ts';
import { multiSentenceLines } from './text.ts';

export const KP_RESULTS_DIR = '.results/key-points';
export const KP_BATCH_SIZE = 10;
const CRITIC = 'key-point-critic';
const MODULES = Array.from({ length: 13 }, (_, i) => i + 1);
const EVIDENCE_MISS = 'evidence is not a whole line of the home note of any of its concepts';
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** One key point as the critic sees it: the decision it serves, the brief facts, its text, concepts and evidence. */
export interface KpItem {
  id: string;
  module: number;
  decision: { title: string; prompt: string; context: string[] };
  facts: string[];
  text: string;
  concepts: { id: string; name: string }[];
  evidence: string;
}

export interface KpBatch {
  batch: string;
  keyPoints: KpItem[];
}

/** The critic's verdict on one key point: four checks, and one short line per problem when any check is false. */
export const KpAnswer = z.strictObject({
  id: z.string(),
  accurate: z.boolean(),
  grounded: z.boolean(),
  fitsBrief: z.boolean(),
  currentNames: z.boolean(),
  problems: z.array(z.string()),
});
export type KpAnswer = z.infer<typeof KpAnswer>;
const KpAnswerFile = z.strictObject({ batch: z.string(), answers: z.array(z.unknown()) });

/** Each check of an answer with the reason a failure records when the critic names no problem. */
const FLAGS = [
  ['accurate', 'the critic found it wrong for the decision'],
  ['grounded', 'its evidence line does not support it'],
  ['fitsBrief', 'it does not fit the brief'],
  ['currentNames', 'it names a service or plan the exam no longer uses'],
] as const;

/** A failed critic check of one key point at one hash; `stamped` once the stamp has counted it in the review block. */
export interface KpFailure {
  id: string;
  hash: string;
  reason: string;
  stamped?: boolean;
}

const paths = (root: string) => {
  const dir = join(root, KP_RESULTS_DIR);
  return {
    dir,
    batches: join(dir, 'batches'),
    answers: join(dir, 'answers'),
    prepared: join(dir, 'prepared.json'),
    passes: join(dir, 'passes.json'),
    failures: join(dir, 'failures.json'),
  };
};

function readJsonFile<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

const writeJson = (path: string, value: unknown): void => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** Passes keyed `<id> critic@<version> <fullHash>`, each with the ISO date of the pass. */
export const readKpPasses = (root: string): PassLog => readJsonFile<PassLog>(paths(root).passes, {});
export const readKpFailures = (root: string): KpFailure[] =>
  readJsonFile<KpFailure[]>(paths(root).failures, []);

/**
 * The prompt version of an agent, from the `version` frontmatter of agents/<file>.md.
 * A mirror of checkVersion in checks.ts, whose name parameter takes the three question checks only.
 */
export function agentVersion(root: string, file: string): number {
  const path = join(root, 'agents', `${file}.md`);
  const { yaml } = splitFrontmatter(existsSync(path) ? readFileSync(path, 'utf8') : '');
  const version = (parseYaml(yaml ?? '') as { version?: unknown } | null)?.version;
  if (!Number.isInteger(version) || (version as number) < 1) {
    throw new Error(`agents/${file}.md needs a frontmatter version, a whole number from 1`);
  }
  return version as number;
}

/** The highest critic version with a recorded pass for `id` at `hash`, or null. */
function passedVersion(passes: PassLog, id: string, hash: string): number | null {
  let best: number | null = null;
  for (const key of Object.keys(passes)) {
    const [kid, check, khash] = key.split(' ');
    if (kid !== id || khash !== hash || check?.startsWith('critic@') !== true) continue;
    const version = Number(check.slice('critic@'.length));
    if (best === null || version > best) best = version;
  }
  return best;
}

/**
 * Key points the critic still has to judge: drafts, and live items whose stamp no longer matches their hash. Retired
 * items, items with 3 or more attempts, items that failed at their current hash and items with a pass at their current
 * hash and the current critic version are skipped.
 */
export function kpCandidates(ctx: Context, passes: PassLog, failures: readonly KpFailure[]): KeyPointEntry[] {
  let version: number | null;
  try {
    version = agentVersion(ctx.root, CRITIC);
  } catch {
    version = null;
  }
  return projectOf(ctx).keyPoints.filter(({ kp }) => {
    if (kp.status === 'retired' || (kp.review?.attempts ?? 0) >= NEEDS_DANI_ATTEMPTS) return false;
    const hash = keyPointHash(kp);
    if (kp.verified?.fullHash === hash) return false;
    if (failures.some((f) => f.id === kp.id && f.hash === hash)) return false;
    return version === null || passes[`${kp.id} critic@${version} ${hash}`] === undefined;
  });
}

/**
 * Writes the critic batches: every candidate in an order fixed by the seed, at most KP_BATCH_SIZE per batch, and
 * prepared.json with the hash each judged key point is bound to. Old batches and answers are wiped first.
 * Returns the batch paths relative to the root.
 */
export function prepareKeyPoints(ctx: Context, seed: number): string[] {
  const p = paths(ctx.root);
  const { brief } = projectOf(ctx);
  if (brief === null) {
    throw new Error(`${BRIEF_FILE} is missing or fails R1; fix it before preparing key point batches`);
  }
  rmSync(p.batches, { recursive: true, force: true });
  rmSync(p.answers, { recursive: true, force: true });
  mkdirSync(p.batches, { recursive: true });
  mkdirSync(p.answers, { recursive: true });
  const names = new Map<string, string>();
  for (const c of ctx.concepts) {
    names.set(c.id, c.name);
    for (const alias of c.aliases ?? []) names.set(alias, c.name);
  }
  const facts = brief.facts.map((f) => f.text);
  const cands = shuffle(
    kpCandidates(ctx, readKpPasses(ctx.root), readKpFailures(ctx.root)),
    mulberry32(seed),
  );
  const prepared: Record<string, Record<string, string>> = {};
  const out: string[] = [];
  for (let start = 0; start < cands.length; start += KP_BATCH_SIZE) {
    const batch = `kp-critic-${pad2(start / KP_BATCH_SIZE + 1)}`;
    const items = cands.slice(start, start + KP_BATCH_SIZE);
    prepared[batch] = Object.fromEntries(items.map(({ kp }) => [kp.id, keyPointHash(kp)]));
    const keyPoints: KpItem[] = items.map(({ module, kp }) => {
      const d = brief.decisions[module - 1];
      return {
        id: kp.id,
        module,
        decision: { title: d?.title ?? '', prompt: d?.prompt ?? '', context: d?.context ?? [] },
        facts,
        text: kp.text,
        concepts: kp.concepts.map((id) => ({ id, name: names.get(id) ?? id })),
        evidence: kp.evidence,
      };
    });
    const rel = `${KP_RESULTS_DIR}/batches/${batch}.json`;
    writeJson(join(ctx.root, rel), { batch, keyPoints } satisfies KpBatch);
    out.push(rel);
  }
  writeJson(p.prepared, prepared);
  return out;
}

const issueText = (issue: z.core.$ZodIssue): string =>
  `${issue.path.join('.') || '(root)'}: ${issue.message}`;

/** Lints one critic answer file against its batch: `OK`, or the first problem to fix. */
export function lintKpAnswers(root: string, file: string): string {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return `${file}: not JSON: ${error instanceof Error ? error.message : String(error)}`;
  }
  const outer = KpAnswerFile.safeParse(data);
  if (!outer.success) return `${file}: ${issueText(outer.error.issues[0] as z.core.$ZodIssue)}`;
  const { batch, answers } = outer.data;
  const p = paths(root);
  const ids = readJsonFile<Record<string, Record<string, string>>>(p.prepared, {})[batch];
  if (ids === undefined || !existsSync(join(p.batches, `${batch}.json`)))
    return `${file}: batch '${batch}' was not prepared`;
  if (basename(file) !== `${batch}.json`) return `${file}: answers to ${batch} belong in ${batch}.json`;
  const seen = new Set<string>();
  for (const [i, raw] of answers.entries()) {
    const parsed = KpAnswer.safeParse(raw);
    if (!parsed.success)
      return `${batch}: answer ${i + 1}: ${issueText(parsed.error.issues[0] as z.core.$ZodIssue)}`;
    const a = parsed.data;
    if (!(a.id in ids)) return `${batch}: ${a.id} is not in this batch`;
    if (seen.has(a.id)) return `${batch}: ${a.id} is answered twice`;
    seen.add(a.id);
    if (FLAGS.some(([flag]) => !a[flag]) && a.problems.length === 0) {
      return `${batch}: ${a.id}: name each problem in problems when a check is false`;
    }
  }
  const missing = Object.keys(ids).find((id) => !seen.has(id));
  return missing === undefined ? 'OK' : `${batch}: no answer for ${missing}`;
}

/**
 * Grades every prepared batch whose answer file lints OK: a key point passes when all four checks hold, and the pass is
 * recorded at the hash it was prepared with; any false check records a failure, once per id and hash.
 */
export function gradeKeyPoints(root: string, today = localDate()): { passed: number; failed: number } {
  const p = paths(root);
  const prepared = readJsonFile<Record<string, Record<string, string>>>(p.prepared, {});
  const version = agentVersion(root, CRITIC);
  const passes = readKpPasses(root);
  const failures = readKpFailures(root);
  let passed = 0;
  let failed = 0;
  for (const [batch, ids] of Object.entries(prepared)) {
    const file = join(p.answers, `${batch}.json`);
    if (!existsSync(file) || lintKpAnswers(root, file) !== 'OK') continue;
    const { answers } = JSON.parse(readFileSync(file, 'utf8')) as { answers: unknown[] };
    for (const raw of answers) {
      const a = KpAnswer.parse(raw);
      const hash = ids[a.id] ?? '';
      const flag = FLAGS.find(([name]) => !a[name]);
      if (flag === undefined) {
        passes[`${a.id} critic@${version} ${hash}`] = today;
        passed += 1;
        continue;
      }
      failed += 1;
      if (!failures.some((f) => f.id === a.id && f.hash === hash)) {
        failures.push({ id: a.id, hash, reason: a.problems.length > 0 ? a.problems.join(' ') : flag[1] });
      }
    }
  }
  mkdirSync(p.dir, { recursive: true });
  writeJson(p.passes, passes);
  writeJson(p.failures, failures);
  return { passed, failed };
}

/** The fields only the key point tools write; `null` removes the key. */
export type KeyPointEdit = {
  status?: 'draft' | 'live';
  verified?: KeyPointVerified | null;
  review?: Review | null;
};

const EDIT_KEYS = ['status', 'verified', 'review'] as const;

function parseKeyPoints(text: string): Document.Parsed {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`YAML: ${doc.errors[0]?.message ?? 'parse error'}`);
  return doc;
}

function itemsById(doc: Document.Parsed): Map<string, YAMLMap> {
  const seq = doc.get('keyPoints');
  const out = new Map<string, YAMLMap>();
  for (const item of isSeq(seq) ? seq.items : []) {
    const id = isMap(item) ? item.get('id') : undefined;
    if (typeof id === 'string' && item instanceof YAMLMap) out.set(id, item);
  }
  return out;
}

const lineStart = (text: string, pos: number): number => text.lastIndexOf('\n', pos - 1) + 1;

function lineEnd(text: string, pos: number): number {
  if (pos > 0 && text[pos - 1] === '\n') return pos;
  const nl = text.indexOf('\n', pos);
  return nl === -1 ? text.length : nl + 1;
}

/** One `key: value` entry in block style at the given indent, with a `verified` block's checks in flow style. */
function renderKey(key: string, value: unknown, indent: number): string {
  const doc = new Document({ [key]: value });
  const checks = doc.getIn([key, 'checks'], true);
  if (checks instanceof YAMLSeq) checks.flow = true;
  return doc
    .toString({ lineWidth: 0 })
    .split('\n')
    .map((line) => (line === '' ? line : `${' '.repeat(indent)}${line}`))
    .join('\n');
}

function spanOf(text: string, pair: Pair): [number, number] {
  const key = pair.key as { range?: [number, number, number] } | null;
  const value = pair.value as { range?: [number, number, number] } | null;
  const start = key?.range?.[0];
  const end = value?.range?.[1] ?? key?.range?.[1];
  if (start === undefined || end === undefined) throw new Error('YAML: a key without a source range');
  return [lineStart(text, start), lineEnd(text, end)];
}

function editKey(text: string, id: string, key: (typeof EDIT_KEYS)[number], value: unknown): string {
  const item = itemsById(parseKeyPoints(text)).get(id);
  if (item === undefined) throw new Error(`${id} is not in this file`);
  const first = item.items[0];
  if (first === undefined) throw new Error(`${id} has no keys`);
  const keyStart = (first.key as { range?: [number, number, number] } | null)?.range?.[0] ?? 0;
  const indent = keyStart - lineStart(text, keyStart);
  const pair = item.items.find((p) => isScalar(p.key) && p.key.value === key);
  if (pair !== undefined) {
    const [start, end] = spanOf(text, pair);
    return text.slice(0, start) + (value === null ? '' : renderKey(key, value, indent)) + text.slice(end);
  }
  if (value === null) return text;
  const at = spanOf(text, item.items[item.items.length - 1] as Pair)[1];
  const lead = at > 0 && text[at - 1] !== '\n' ? '\n' : '';
  return text.slice(0, at) + lead + renderKey(key, value, indent) + text.slice(at);
}

/**
 * Applies edits to the key points of one file by id, splicing only the edited keys so comments, key order and every
 * other line stay byte for byte, like editQuestionFile. Throws on an id that is not in the file.
 */
export function editKeyPointFile(text: string, edits: ReadonlyMap<string, KeyPointEdit>): string {
  const ids = itemsById(parseKeyPoints(text));
  for (const id of edits.keys()) if (!ids.has(id)) throw new Error(`${id} is not in this file`);
  let out = text;
  for (const [id, edit] of edits) {
    for (const key of EDIT_KEYS) {
      const value = edit[key];
      if (value !== undefined) out = editKey(out, id, key, value);
    }
  }
  parseKeyPoints(out);
  return out;
}

/** Writes per-file edits back through editKeyPointFile. */
function writeEdits(ctx: Context, edits: ReadonlyMap<string, ReadonlyMap<string, KeyPointEdit>>): void {
  for (const [path, byId] of edits)
    writeFileSync(join(ctx.root, path), editKeyPointFile(ctx.read(path) ?? '', byId));
}

/**
 * Stamps every key point with a critic pass at its current hash whose evidence holds: `status: live` and
 * `verified { fullHash, checks: [critic@N], on }`. A new failure at a draft's current hash adds one attempt to its
 * review block; a draft at NEEDS_DANI_ATTEMPTS leaves the loop and is listed for Dani.
 */
export function stampKeyPoints(
  ctx: Context,
  today = localDate(),
): { live: number; revise: string[]; needsDani: string[] } {
  const passes = readKpPasses(ctx.root);
  const failures = readKpFailures(ctx.root);
  const edits = new Map<string, Map<string, KeyPointEdit>>();
  const edit = (path: string, id: string, e: KeyPointEdit): void => {
    edits.set(path, (edits.get(path) ?? new Map()).set(id, e));
  };
  let live = 0;
  const revise = new Set<string>();
  const needsDani: string[] = [];
  for (const { path, kp } of projectOf(ctx).keyPoints) {
    if (kp.status === 'retired') continue;
    const hash = keyPointHash(kp);
    const stamped =
      kp.verified?.fullHash === hash ? Number(kp.verified.checks[0].slice('critic@'.length)) : null;
    const version = passedVersion(passes, kp.id, hash) ?? stamped;
    if (version !== null && evidenceHolds(ctx, kp) === true) {
      const checks: [string] = [`critic@${version}`];
      const valid =
        kp.status === 'live' &&
        kp.review === undefined &&
        kp.verified?.fullHash === hash &&
        kp.verified.checks[0] === checks[0];
      if (!valid)
        edit(path, kp.id, { status: 'live', verified: { fullHash: hash, checks, on: today }, review: null });
      live += 1;
      continue;
    }
    if (kp.status === 'live') {
      live += 1;
      continue;
    }
    const current = failures.filter((f) => f.id === kp.id && f.hash === hash);
    const fresh = current.filter((f) => f.stamped !== true);
    let attempts = kp.review?.attempts ?? 0;
    if (fresh.length > 0) {
      attempts += 1;
      edit(path, kp.id, { review: { attempts, lastFailure: `critic: ${fresh[0]?.reason ?? ''}` } });
      for (const f of fresh) f.stamped = true;
    }
    if (attempts >= NEEDS_DANI_ATTEMPTS) needsDani.push(kp.id);
    else if (current.length > 0) revise.add(path);
  }
  writeEdits(ctx, edits);
  if (existsSync(paths(ctx.root).failures)) writeJson(paths(ctx.root).failures, failures);
  return { live, revise: [...revise].sort(), needsDani };
}

/** Moves each live key point whose evidence left the home notes of its concepts back to draft, with the reason. */
export function demoteKeyPoints(ctx: Context): string[] {
  const edits = new Map<string, Map<string, KeyPointEdit>>();
  const log: string[] = [];
  for (const { path, kp } of projectOf(ctx).keyPoints) {
    if (kp.status !== 'live' || evidenceHolds(ctx, kp) !== false) continue;
    const review = {
      attempts: kp.review?.attempts ?? 1,
      lastFailure:
        'evidence: the evidence line is no longer a whole line of the home note of any of its concepts',
    };
    edits.set(path, (edits.get(path) ?? new Map()).set(kp.id, { status: 'draft', verified: null, review }));
    log.push(
      `demoted ${kp.id} (${path}): its evidence no longer matches the home note of any of its concepts`,
    );
  }
  writeEdits(ctx, edits);
  return log;
}

/** The key point counts by status, then the modules whose decision has fewer than 4 live key points. */
export function keyPointReport(ctx: Context): string[] {
  const { keyPoints } = projectOf(ctx);
  const count = (status: string): number => keyPoints.filter((e) => e.kp.status === status).length;
  const under = MODULES.filter(
    (m) => keyPoints.filter((e) => e.module === m && e.kp.status === 'live').length < MIN_KEY_POINTS,
  );
  return [
    `Key points: ${count('live')} live, ${count('draft')} draft, ${count('retired')} retired`,
    `Modules under ${MIN_KEY_POINTS} live: ${under.length === 0 ? 'none' : under.map(pad2).join(', ')}`,
  ];
}

/** The tested concepts whose home note is in one module, the writer's starting list. */
export function moduleConcepts(ctx: Context, module: number): { id: string; name: string; home: string }[] {
  return ctx.concepts
    .filter((c) => c.tested !== false && c.home.startsWith(`m${pad2(module)}/`))
    .map((c) => ({ id: c.id, name: c.name, home: c.home }));
}

/**
 * Every problem of one key point file as R1, R5 and R8 will see it, applying R5 to drafts too, so a writer can loop
 * until it holds none: R1 findings as `<line>: <message>`, then `<id>: <problem>` per key point.
 */
export function draftProblems(ctx: Context, file: string): string[] {
  if (!ctx.files.includes(file)) return [`${file}: no such key point file`];
  const project = projectOf(ctx);
  const out = project.errors.filter((f) => f.file === file).map((f) => `${f.line ?? 1}: ${f.message}`);
  for (const { path, kp } of project.keyPoints) {
    if (path !== file || kp.status === 'retired') continue;
    if (evidenceHolds(ctx, kp) !== true) out.push(`${kp.id}: ${EVIDENCE_MISS}`);
    if (multiSentenceLines(kp.text.replaceAll('\n', ' ')).length > 0)
      out.push(`${kp.id}: one sentence per string`);
  }
  return out;
}
