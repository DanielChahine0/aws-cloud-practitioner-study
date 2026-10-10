/**
 * The agent check pipeline (spec 2.7): keyless batches for fresh checker agents, linting and mechanical grading of
 * their answers, and the stamp that binds every pass to a question's hashes.
 * Everything lives under .results/checks/ (git-ignored); checkers read only their own batch file, never keys.json.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { CHECK_NAMES, type CheckName, type Question, type Verified } from '../../../schemas/question.ts';
import { type Context, loadContext, localDate, type Note, type QuestionEntry } from './context.ts';
import { evidenceForm, noteLines, sectionAt } from './evidence.ts';
import { fullHash, keyHash } from './hashes.ts';
import { splitFrontmatter } from './markdown.ts';
import { editQuestionFile, type QuestionEdit } from './question-files.ts';
import { fencedLines } from './text.ts';
import { parseUpdateLine } from './update-line.ts';

export const RESULTS_DIR = '.results/checks';
export const BATCH_SIZE = 10;
/**
 * A draft with this many failed check rounds (2 failed revisions) leaves the loop (spec 2.7): a practice draft waits
 * for Dani, and an exam draft is retired in place, because Dani must never see an exam item before a mock.
 */
export const NEEDS_DANI_ATTEMPTS = 3;

export const BATCH_KINDS = ['solve-closed', 'solve-notes', 'critic-cue', 'critic'] as const;
export type BatchKind = (typeof BATCH_KINDS)[number];
const CHECK_OF: Record<BatchKind, CheckName> = {
  'solve-closed': 'solve-closed',
  'solve-notes': 'solve-notes',
  'critic-cue': 'critic',
  critic: 'critic',
};
const LETTERS = 'abcdefghij';

/** Passes keyed `<id> <check>@<version> <hash>`, each with the ISO date of the pass. */
export type PassLog = Record<string, string>;

export interface Failure {
  id: string;
  check: CheckName;
  hash: string;
  reason: string;
  /** Set once pnpm content:stamp has counted this failure in the question's review block. */
  stamped?: boolean;
}

export interface Candidate {
  entry: QuestionEntry;
  keyHash: string;
  fullHash: string;
  needs: CheckName[];
}

export interface Batch {
  name: string;
  kind: BatchKind;
  items: Candidate[];
}

/** keys.json: per batch and question, the hash the check is bound to and the option ids (or right indexes) in display order. */
export type KeyFile = Record<string, Record<string, { hash: string; order: (string | number)[] }>>;

const paths = (root: string) => {
  const dir = join(root, RESULTS_DIR);
  return {
    dir,
    batches: join(dir, 'batches'),
    answers: join(dir, 'answers'),
    keys: join(dir, 'keys.json'),
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

export const readPasses = (root: string): PassLog => readJsonFile<PassLog>(paths(root).passes, {});
export const readFailures = (root: string): Failure[] => readJsonFile<Failure[]>(paths(root).failures, []);

/** The prompt version of a check, from the `version` frontmatter of agents/<name>.md. */
export function checkVersion(root: string, name: CheckName): number {
  const file = join(root, 'agents', `${name}.md`);
  const { yaml } = splitFrontmatter(existsSync(file) ? readFileSync(file, 'utf8') : '');
  const version = (parseYaml(yaml ?? '') as { version?: unknown } | null)?.version;
  if (!Number.isInteger(version) || (version as number) < 1) {
    throw new Error(`agents/${name}.md needs a frontmatter version, a whole number from 1`);
  }
  return version as number;
}

const hashFor = (check: CheckName, c: { keyHash: string; fullHash: string }): string =>
  check === 'solve-closed' ? c.keyHash : c.fullHash;

/** The highest prompt version with a recorded pass of `check` for `id` at `hash`, or null. */
function passedVersion(passes: PassLog, id: string, check: CheckName, hash: string): number | null {
  let best: number | null = null;
  const pattern = new RegExp(`^${id} ${check}@(\\d+) ${hash}$`);
  for (const key of Object.keys(passes)) {
    const version = Number(pattern.exec(key)?.[1] ?? Number.NaN);
    if (!Number.isNaN(version) && (best === null || version > best)) best = version;
  }
  return best;
}

/** The version a still-valid stamp records for `check`, or null when the stamp does not cover the current hash. */
function stampedVersion(v: Verified | undefined, check: CheckName, kh: string, fh: string): number | null {
  if (v === undefined || (check === 'solve-closed' ? v.keyHash !== kh : v.fullHash !== fh)) return null;
  const entry = v.checks.find((c) => c.startsWith(`${check}@`));
  return entry === undefined ? null : Number(entry.slice(check.length + 1));
}

const moduleOf = (entry: QuestionEntry): number => entry.module;

/**
 * Non-retired questions of one pool in the given modules whose stamp is missing or stale, with the checks each still needs.
 * solve-closed is kept by a stamp or pass at the current keyHash; solve-notes and critic need a pass at the current
 * fullHash and prompt version. A question that already failed a check at its current hashes waits for a revision.
 */
export function candidates(
  ctx: Context,
  modules: readonly number[],
  passes: PassLog,
  failures: readonly Failure[] = [],
  pool: Question['pool'] = 'practice',
): Candidate[] {
  const out: Candidate[] = [];
  const versions = new Map<CheckName, number | null>();
  const version = (check: CheckName): number | null => {
    if (!versions.has(check)) {
      try {
        versions.set(check, checkVersion(ctx.root, check));
      } catch {
        versions.set(check, null);
      }
    }
    return versions.get(check) ?? null;
  };
  for (const entry of ctx.questions) {
    const { q } = entry;
    if (q.status === 'retired' || q.pool !== pool || !modules.includes(moduleOf(entry))) continue;
    const kh = keyHash(q);
    const fh = fullHash(q);
    if (q.verified?.keyHash === kh && q.verified.fullHash === fh) continue;
    if (failures.some((f) => f.id === q.id && f.hash === hashFor(f.check, { keyHash: kh, fullHash: fh })))
      continue;
    const needs = CHECK_NAMES.filter((check) => {
      if (check === 'solve-closed') {
        return q.verified?.keyHash !== kh && passedVersion(passes, q.id, check, kh) === null;
      }
      const v = version(check);
      return v === null || passes[`${q.id} ${check}@${v} ${fh}`] === undefined;
    });
    out.push({ entry, keyHash: kh, fullHash: fh, needs });
  }
  return out;
}

const rank = (seed: number | string, ...parts: string[]): string =>
  createHash('sha256')
    .update([String(seed), ...parts].join(':'))
    .digest('hex');

/**
 * Deals the candidates that need this batch's check into batches of at most BATCH_SIZE with at most one question per
 * concept, in an order fixed by the seed, putting each question where its note is least represented.
 * Match questions skip the cue round.
 */
export function makeBatches(cands: readonly Candidate[], kind: BatchKind, seed: number): Batch[] {
  const check = CHECK_OF[kind];
  const dealt = cands
    .filter((c) => c.needs.includes(check) && !(kind === 'critic-cue' && c.entry.q.type === 'match'))
    .map((c) => ({ c, order: rank(seed, c.entry.q.id) }))
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
    .map(({ c }) => c);
  const batches: Batch[] = [];
  for (const c of dealt) {
    let best: Batch | null = null;
    let bestSameNote = Number.POSITIVE_INFINITY;
    for (const b of batches) {
      if (b.items.length >= BATCH_SIZE || b.items.some((o) => o.entry.q.concept === c.entry.q.concept))
        continue;
      const sameNote = b.items.filter((o) => o.entry.q.note === c.entry.q.note).length;
      if (sameNote < bestSameNote) {
        best = b;
        bestSameNote = sameNote;
      }
    }
    if (best === null) {
      best = { name: `${kind}-${String(batches.length + 1).padStart(2, '0')}`, kind, items: [] };
      batches.push(best);
    }
    best.items.push(c);
  }
  return batches;
}

/** Option ids, or right indexes for a match, in the shuffled display order. */
function displayOrder(q: Question, seed: number): (string | number)[] {
  const ids: (string | number)[] = q.type === 'match' ? q.pairs.map((_, i) => i) : q.options.map((o) => o.id);
  return ids
    .map((id) => ({ id, order: rank(seed, q.id, String(id)) }))
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0))
    .map(({ id }) => id);
}

/** The Markdown of a note between a heading and the next heading. */
function sectionText(note: Note, line: number): string {
  const lines = note.text.split('\n');
  const next = note.headings.find((h) => h.line > line)?.line ?? lines.length + 1;
  return lines
    .slice(line - 1, next - 1)
    .join('\n')
    .trimEnd();
}

/** What solve-notes reads: each H3 section holding an evidence line, then Key takeaways and Terms. */
function notesFor(q: Question, ctx: Context): string {
  const note = ctx.notes.find((n) => n.id === q.note);
  if (note === undefined) return '';
  const lines = noteLines(note);
  const starts: number[] = [];
  for (const e of q.evidence) {
    const at = lines.get(evidenceForm(e));
    const section = at === undefined ? null : sectionAt(note, at);
    if (section !== null && !starts.includes(section.line)) starts.push(section.line);
  }
  for (const title of ['Key takeaways', 'Terms']) {
    const h = note.headings.find((x) => x.depth === 2 && x.text === title);
    if (h !== undefined && !starts.includes(h.line)) starts.push(h.line);
  }
  return starts.map((line) => sectionText(note, line)).join('\n\n');
}

/** The citable forms of the lines of a Markdown text, as R5 compares them. */
function citable(markdown: string): Set<string> {
  const lines = markdown.split('\n');
  const code = fencedLines(lines);
  const out = new Set<string>();
  for (const [i, line] of lines.entries()) {
    if (code[i]) continue;
    const form = evidenceForm(parseUpdateLine(line.trim())?.sentence ?? line);
    if (form !== '') out.add(form);
  }
  return out;
}

/** One question as a checker of this kind sees it. */
function payloadOf(c: Candidate, kind: BatchKind, order: readonly (string | number)[], ctx: Context): object {
  const { q } = c.entry;
  const select = q.type === 'multi' ? { select: q.select } : {};
  const numbered = (texts: readonly string[]) => texts.map((text, i) => ({ n: i + 1, text }));
  const shown = (): object => {
    if (q.type === 'match') {
      return {
        lefts: numbered(q.pairs.map((p) => p.left)),
        rights: order.map((i, k) => ({ letter: LETTERS.charAt(k), text: q.pairs[Number(i)]?.right ?? '' })),
      };
    }
    return { options: numbered(order.map((id) => q.options.find((o) => o.id === id)?.text ?? '')) };
  };
  switch (kind) {
    case 'solve-closed':
      return { id: q.id, type: q.type, ...select, stem: q.stem, ...shown() };
    case 'solve-notes':
      return { id: q.id, type: q.type, ...select, stem: q.stem, ...shown(), notes: notesFor(q, ctx) };
    case 'critic-cue':
      return { id: q.id, type: q.type, ...select, ...shown() };
    case 'critic': {
      const concept = ctx.concepts.find((x) => x.id === q.concept || x.aliases?.includes(q.concept));
      const task = ctx.blueprint?.tasks.find((t) => t.id === q.task);
      const body =
        q.type === 'match'
          ? { pairs: q.pairs.map(({ left, right, why }) => ({ left, right, why })) }
          : {
              options: order.map((id, k) => {
                const o = q.options.find((x) => x.id === id);
                return { n: k + 1, text: o?.text ?? '', correct: o?.correct ?? false, why: o?.why ?? '' };
              }),
            };
      return {
        id: q.id,
        type: q.type,
        stem: q.stem,
        ...select,
        ...body,
        evidence: q.evidence,
        takeaway: q.takeaway,
        concept: { id: q.concept, name: concept?.name ?? q.concept },
        task: { id: q.task, text: task?.text ?? '' },
        note: q.note,
        pool: q.pool,
      };
    }
  }
}

/**
 * pnpm content:checks prepare: clears batches/ and answers/, then writes every batch of one pool in the given modules
 * and keys.json.
 * Returns the batch paths (relative to the root) and the number of questions that need any check.
 */
export function prepare(
  ctx: Context,
  modules: readonly number[],
  seed: number,
  pool: Question['pool'] = 'practice',
): { paths: string[]; questions: number } {
  const p = paths(ctx.root);
  rmSync(p.batches, { recursive: true, force: true });
  rmSync(p.answers, { recursive: true, force: true });
  mkdirSync(p.batches, { recursive: true });
  mkdirSync(p.answers, { recursive: true });
  const cands = candidates(ctx, modules, readPasses(ctx.root), readFailures(ctx.root), pool).filter(
    (c) => c.needs.length > 0,
  );
  const keys: KeyFile = {};
  const out: string[] = [];
  for (const kind of BATCH_KINDS) {
    for (const batch of makeBatches(cands, kind, seed)) {
      const entries: KeyFile[string] = {};
      const questions = batch.items.map((c) => {
        const order = displayOrder(c.entry.q, seed);
        entries[c.entry.q.id] = { hash: hashFor(CHECK_OF[kind], c), order };
        return payloadOf(c, kind, order, ctx);
      });
      keys[batch.name] = entries;
      const rel = `${RESULTS_DIR}/batches/${batch.name}.json`;
      writeJson(join(ctx.root, rel), { batch: batch.name, kind, questions });
      out.push(rel);
    }
  }
  writeJson(p.keys, keys);
  return { paths: out, questions: cands.length };
}

const Picked = z.union([z.array(z.number().int().min(1)), z.record(z.string(), z.string())]);
export const SolveClosedAnswer = z.strictObject({
  id: z.string(),
  picked: Picked,
  secondDefensible: z.boolean(),
  reason: z.string(),
});
export const SolveNotesAnswer = z.strictObject({ id: z.string(), picked: Picked, quote: z.string() });
/**
 * A cue round guess and what it rests on: a `tell` in the wording, `knowledge` because only the key is true of AWS,
 * or a plain `guess`; only a hit with a real basis fails the question, so a lucky guess does not.
 */
export const CueAnswer = z
  .strictObject({
    id: z.string(),
    guess: z.array(z.number().int().min(1)),
    basis: z.enum(['tell', 'knowledge', 'guess']),
    reason: z.string().trim().min(1).optional(),
  })
  .refine((a) => a.basis === 'guess' || a.reason !== undefined, {
    path: ['reason'],
    message: 'give a reason when the basis is tell or knowledge',
  });
export const CriticAnswer = z.strictObject({
  id: z.string(),
  distractorsWrong: z.boolean(),
  noTell: z.boolean(),
  taskFits: z.boolean(),
  styleHolds: z.boolean(),
  problems: z.array(z.string()),
});
type AnyAnswer =
  | z.infer<typeof SolveClosedAnswer>
  | z.infer<typeof SolveNotesAnswer>
  | z.infer<typeof CueAnswer>
  | z.infer<typeof CriticAnswer>;
const ANSWER: Record<BatchKind, z.ZodType<AnyAnswer>> = {
  'solve-closed': SolveClosedAnswer,
  'solve-notes': SolveNotesAnswer,
  'critic-cue': CueAnswer,
  critic: CriticAnswer,
};
export const AnswerFile = z.strictObject({ batch: z.string(), answers: z.array(z.unknown()) });

type Payload = {
  id: string;
  type: Question['type'];
  select?: number;
  options?: unknown[];
  lefts?: unknown[];
  rights?: unknown[];
  notes?: string;
};

export const kindOf = (batch: string): BatchKind | null =>
  BATCH_KINDS.find((k) => new RegExp(`^${k}-\\d{2,}$`).test(batch)) ?? null;

/** The shape problems a pick has against the question as the batch showed it. */
function pickProblems(p: Payload, picked: number[] | Record<string, string>, want: number): string[] {
  if (p.type === 'match') {
    const lefts = p.lefts?.length ?? 0;
    const letters = LETTERS.slice(0, p.rights?.length ?? 0);
    if (Array.isArray(picked)) return ['picked must map every left number to a letter, like {"1": "b"}'];
    const keys = Object.keys(picked).sort();
    const expected = Array.from({ length: lefts }, (_, i) => String(i + 1)).sort();
    const out: string[] = [];
    if (keys.join() !== expected.join()) out.push(`picked must map the left numbers 1 to ${lefts}`);
    for (const letter of Object.values(picked)) {
      if (letter.length !== 1 || !letters.includes(letter))
        out.push(`'${letter}' is not one of the letters ${letters}`);
    }
    return out;
  }
  if (!Array.isArray(picked)) return ['picked must be a list of option numbers'];
  const count = p.options?.length ?? 0;
  const out: string[] = [];
  if (picked.length !== want || new Set(picked).size !== picked.length) {
    out.push(`pick exactly ${want} different option number${want === 1 ? '' : 's'}`);
  }
  for (const n of picked) if (n > count) out.push(`option ${n} does not exist`);
  return out;
}

/** pnpm content:checks lint: every problem with one answer file, or an empty list when it is ready to grade. */
export function lintAnswers(root: string, file: string): string[] {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return [`${file}: not JSON: ${error instanceof Error ? error.message : String(error)}`];
  }
  const outer = AnswerFile.safeParse(data);
  if (!outer.success)
    return outer.error.issues.map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);
  const { batch } = outer.data;
  const kind = kindOf(batch);
  const batchFile = join(paths(root).batches, `${batch}.json`);
  if (kind === null || !existsSync(batchFile)) return [`${file}: batch '${batch}' was not prepared`];
  if (basename(file) !== `${batch}.json`) return [`${file}: answers to ${batch} belong in ${batch}.json`];
  const payloads = new Map(
    readJsonFile<{ questions: Payload[] }>(batchFile, { questions: [] }).questions.map(
      (p) => [p.id, p] as const,
    ),
  );
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const [i, raw] of outer.data.answers.entries()) {
    const parsed = ANSWER[kind].safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        problems.push(`answers[${i}].${issue.path.join('.') || '(answer)'}: ${issue.message}`);
      }
      continue;
    }
    const { id } = parsed.data;
    const p = payloads.get(id);
    if (p === undefined) {
      problems.push(`answers[${i}]: ${id} is not in batch ${batch}`);
      continue;
    }
    if (seen.has(id)) problems.push(`answers[${i}]: ${id} is answered twice`);
    seen.add(id);
    const want = p.type === 'multi' ? (p.select ?? 2) : 1;
    const answer = parsed.data as { picked?: number[] | Record<string, string>; guess?: number[] };
    if (answer.picked !== undefined) {
      for (const problem of pickProblems(p, answer.picked, want)) problems.push(`${id}: ${problem}`);
    }
    if (answer.guess !== undefined) {
      for (const problem of pickProblems(p, answer.guess, want)) problems.push(`${id}: ${problem}`);
    }
  }
  for (const id of payloads.keys()) if (!seen.has(id)) problems.push(`${id} has no answer`);
  return problems;
}

/** The option ids, or for a match the left-to-right pairing as `l<n>=<pair index>`, that a pick maps to. */
function mapPick(
  q: Question,
  order: readonly (string | number)[],
  picked: number[] | Record<string, string>,
): string[] {
  if (q.type === 'match') {
    if (Array.isArray(picked)) return [];
    return Object.entries(picked)
      .map(([n, letter]) => `${Number(n) - 1}=${String(order[LETTERS.indexOf(letter)] ?? '?')}`)
      .sort();
  }
  if (!Array.isArray(picked)) return [];
  return picked.map((n) => String(order[n - 1] ?? '?')).sort();
}

const keyOf = (q: Question): string[] =>
  q.type === 'match'
    ? q.pairs.map((_, i) => `${i}=${i}`).sort()
    : q.options
        .filter((o) => o.correct)
        .map((o) => o.id)
        .sort();

const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.join() === b.join();

function wrongPick(q: Question, picked: string[]): string {
  if (q.type === 'match') return 'paired at least one left with the wrong right';
  return `picked ${picked.join(', ') || 'nothing'}, the key is ${keyOf(q).join(', ')}`;
}

const CRITIC_FLAGS = [
  ['distractorsWrong', 'a distractor is not wrong for the reason its why gives'],
  ['noTell', 'the stem or options give the key away'],
  ['taskFits', 'the task does not fit'],
  ['styleHolds', 'STYLE.md does not hold'],
] as const;

/**
 * pnpm content:checks grade: grades every prepared batch against the current question files, merges the passes into
 * passes.json and the failures into failures.json, and returns this run's counts and the lines to print: an exam
 * item's failure prints as its id and check only, because its reason may quote the item (spec 2.6).
 */
export function grade(
  root: string,
  today = localDate(),
): { passes: number; failures: Failure[]; lines: string[] } {
  const p = paths(root);
  const keys = readJsonFile<KeyFile>(p.keys, {});
  const ctx = loadContext(root, { today });
  const questions = new Map(ctx.questions.map((e) => [e.q.id, e.q] as const));
  const answers = new Map<string, Map<string, unknown>>();
  for (const batch of Object.keys(keys)) {
    const file = join(p.answers, `${batch}.json`);
    const byId = new Map<string, unknown>();
    const parsed = existsSync(file) ? AnswerFile.safeParse(JSON.parse(readFileSync(file, 'utf8'))) : null;
    for (const raw of parsed?.success ? parsed.data.answers : []) {
      const id = (raw as { id?: unknown } | null)?.id;
      if (typeof id === 'string' && !byId.has(id)) byId.set(id, raw);
    }
    answers.set(batch, byId);
  }

  const cueGuess = new Map<string, (Omit<z.infer<typeof CueAnswer>, 'guess'> & { guess: string[] }) | null>();
  for (const [batch, entries] of Object.entries(keys)) {
    if (kindOf(batch) !== 'critic-cue') continue;
    for (const [id, { order }] of Object.entries(entries)) {
      const q = questions.get(id);
      const parsed = CueAnswer.safeParse(answers.get(batch)?.get(id));
      cueGuess.set(
        id,
        q !== undefined && parsed.success
          ? { ...parsed.data, guess: mapPick(q, order, parsed.data.guess) }
          : null,
      );
    }
  }

  const passed: { id: string; check: CheckName; hash: string }[] = [];
  const failures: Failure[] = [];
  // A missing answer means the checker crashed, not that the question failed, so it is reported but never recorded:
  // the question stays a candidate for the next round and keeps its attempts.
  const unanswered = new Set<Failure>();
  for (const [batch, entries] of Object.entries(keys)) {
    const kind = kindOf(batch);
    if (kind === null || kind === 'critic-cue') continue;
    const check = CHECK_OF[kind];
    for (const [id, { hash, order }] of Object.entries(entries)) {
      const fail = (reason: string, recorded = true): void => {
        const failure = { id, check, hash, reason };
        failures.push(failure);
        if (!recorded) unanswered.add(failure);
      };
      const q = questions.get(id);
      if (q === undefined) {
        fail('the question is gone');
        continue;
      }
      if (hashFor(check, { keyHash: keyHash(q), fullHash: fullHash(q) }) !== hash) {
        fail('the question changed after the batch was prepared');
        continue;
      }
      const parsed = ANSWER[kind].safeParse(answers.get(batch)?.get(id));
      if (!parsed.success) {
        fail('no answer', false);
        continue;
      }
      if (kind === 'critic') {
        const a = parsed.data as z.infer<typeof CriticAnswer>;
        const cue = q.type === 'match' ? null : cueGuess.get(id);
        if (q.type !== 'match' && (cue === undefined || cue === null))
          fail('no answer in the cue round', false);
        else if (cue !== null && cue !== undefined && cue.basis !== 'guess' && sameSet(cue.guess, keyOf(q))) {
          fail(`the cue round found the key from the options alone (${cue.basis}: ${cue.reason ?? ''})`);
        } else if (CRITIC_FLAGS.some(([flag]) => !a[flag])) {
          const first = CRITIC_FLAGS.find(([flag]) => !a[flag]);
          fail(a.problems.length > 0 ? a.problems.join(' ') : (first?.[1] ?? 'the critic rejected it'));
        } else passed.push({ id, check, hash });
        continue;
      }
      const a = parsed.data as z.infer<typeof SolveClosedAnswer> | z.infer<typeof SolveNotesAnswer>;
      const picked = mapPick(q, order, a.picked);
      if (!sameSet(picked, keyOf(q))) {
        fail(wrongPick(q, picked));
        continue;
      }
      if (kind === 'solve-closed') {
        const closed = parsed.data as z.infer<typeof SolveClosedAnswer>;
        if (closed.secondDefensible) {
          fail(`a second option is defensible: ${closed.reason}`);
          continue;
        }
      } else {
        const quote = (parsed.data as z.infer<typeof SolveNotesAnswer>).quote;
        const batchFile = readJsonFile<{ questions: Payload[] }>(join(p.batches, `${batch}.json`), {
          questions: [],
        });
        const notes = batchFile.questions.find((x) => x.id === id)?.notes ?? '';
        if (!citable(notes).has(evidenceForm(parseUpdateLine(quote.trim())?.sentence ?? quote))) {
          fail('the quote is not a line of the given notes');
          continue;
        }
      }
      passed.push({ id, check, hash });
    }
  }

  const log = readPasses(root);
  for (const { id, check, hash } of passed)
    log[`${id} ${check}@${checkVersion(root, check)} ${hash}`] = today;
  mkdirSync(p.dir, { recursive: true });
  writeJson(p.passes, log);
  // An earlier failure at the same id, check and hash stays as it is, stamped flag included, so a second grade before
  // pnpm content:stamp never counts one failure twice.
  const old = readFailures(root);
  const added = failures.filter(
    (f) => !unanswered.has(f) && !old.some((o) => o.id === f.id && o.check === f.check && o.hash === f.hash),
  );
  writeJson(p.failures, [...old, ...added]);
  const lines = failures.map((f) =>
    questions.get(f.id)?.pool === 'exam' ? `FAIL ${f.id} ${f.check}` : `FAIL ${f.id} ${f.check}: ${f.reason}`,
  );
  return { passes: passed.length, failures, lines };
}

/**
 * pnpm content:stamp: stamps and promotes every question with all three passes at its current hashes, and records each
 * new failure at a draft's current hashes in its review block (spec 2.7). An exam draft that reaches
 * NEEDS_DANI_ATTEMPTS is retired in place, and exam lines carry ids, attempts and check names only.
 */
export function stampQuestions(
  ctx: Context,
  today = localDate(),
): { log: string[]; live: number; revise: string[]; needsDani: number; retired: number; summary: string } {
  const root = ctx.root;
  const passes = readPasses(root);
  const failures = readFailures(root);
  const edits = new Map<string, Map<string, QuestionEdit>>();
  const edit = (path: string, id: string, e: QuestionEdit): void => {
    edits.set(path, (edits.get(path) ?? new Map()).set(id, e));
  };
  const log: string[] = [];
  const state = new Map<string, { status: string; attempts: number; failed: boolean; path: string }>();

  for (const entry of ctx.questions) {
    const { q } = entry;
    if (q.status === 'retired') continue;
    const exam = q.pool === 'exam';
    const kh = keyHash(q);
    const fh = fullHash(q);
    const versionOf = (check: CheckName): number | null => {
      const hash = check === 'solve-closed' ? kh : fh;
      return passedVersion(passes, q.id, check, hash) ?? stampedVersion(q.verified, check, kh, fh);
    };
    const versions = CHECK_NAMES.map(versionOf);
    const current = failures.filter(
      (f) => f.id === q.id && f.hash === hashFor(f.check, { keyHash: kh, fullHash: fh }),
    );
    if (versions.every((v) => v !== null)) {
      const checks = CHECK_NAMES.map((c, i) => `${c}@${versions[i]}`);
      const valid =
        q.status === 'live' &&
        q.review === undefined &&
        q.verified?.keyHash === kh &&
        q.verified.fullHash === fh &&
        q.verified.checks.join() === checks.join();
      if (!valid) {
        edit(entry.path, q.id, {
          status: 'live',
          verified: { keyHash: kh, fullHash: fh, checks, on: today },
          review: null,
        });
        log.push(`live ${q.id} (${entry.path})`);
      }
      state.set(q.id, { status: 'live', attempts: 0, failed: false, path: entry.path });
      continue;
    }
    let attempts = q.review?.attempts ?? 0;
    let review = q.review;
    const fresh = current.filter((f) => f.stamped !== true);
    if (q.status === 'draft' && fresh.length > 0) {
      const first = fresh[0] as Failure;
      attempts += 1;
      review = { attempts, lastFailure: `${first.check}: ${first.reason}` };
      for (const f of fresh) f.stamped = true;
      if (!exam || attempts < NEEDS_DANI_ATTEMPTS) {
        edit(entry.path, q.id, { review });
        log.push(
          exam
            ? `review ${q.id} attempts ${attempts} ${first.check}`
            : `review ${q.id} (${entry.path}) attempts ${attempts}: ${first.check}: ${first.reason}`,
        );
      }
    }
    if (exam && q.status === 'draft' && attempts >= NEEDS_DANI_ATTEMPTS) {
      edit(entry.path, q.id, review === undefined ? { status: 'retired' } : { status: 'retired', review });
      log.push(`retire ${q.id}`);
      state.set(q.id, { status: 'retired', attempts, failed: false, path: entry.path });
      continue;
    }
    state.set(q.id, { status: q.status, attempts, failed: current.length > 0, path: entry.path });
  }

  for (const [path, byId] of edits) {
    writeFileSync(join(root, path), editQuestionFile(ctx.read(path) ?? '', byId));
  }
  if (existsSync(paths(root).failures)) writeJson(paths(root).failures, failures);

  const all = [...state.values()];
  const live = all.filter((s) => s.status === 'live').length;
  const drafts = all.filter((s) => s.status === 'draft');
  const reviseDrafts = drafts.filter((s) => s.failed && s.attempts < NEEDS_DANI_ATTEMPTS);
  const needsDani = drafts.filter((s) => s.attempts >= NEEDS_DANI_ATTEMPTS).length;
  const retired =
    ctx.questions.filter((e) => e.q.pool === 'exam' && e.q.status === 'retired').length +
    all.filter((s) => s.status === 'retired').length;
  const revise = [...new Set(reviseDrafts.map((s) => s.path))].sort();
  const summary = `stamp: ${live} live, ${reviseDrafts.length} drafts to revise, ${needsDani} need Dani, ${retired} retired`;
  return { log, live, revise, needsDani, retired, summary };
}
