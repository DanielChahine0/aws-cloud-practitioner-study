import type { Progress, SessionState } from './replay.ts';
import { mulberry32, seedFor, shuffle } from './rng.ts';

/**
 * Question selection for lesson checks, the module quiz and review sessions.
 * The quiz orders by recall (spec 4.1): never answered first, then the lowest current recall of the concept.
 * A wrong review answer brings back another variant of its concept a few items later (spec 3.6).
 */
export const QUIZ_SIZE = 12;
export const RELEARN_GAP = 5;

export interface PoolQuestion {
  id: string;
  concept: string;
  note: string;
  type: 'single' | 'multi' | 'match';
  module: number;
}

/** An item of the exam pool with the form (`A` to `D`) it sits in. */
export interface ExamPoolQuestion extends PoolQuestion {
  form: string;
}

/**
 * The pool every learn mode selects from (spec 4.3): the practice items plus the items of each form in `forms`,
 * which the app passes as the forms whose mock is over (`practiceForms`).
 * Items of any other form stay out, so no selector can return them.
 */
export function learnPool(
  practice: readonly PoolQuestion[],
  exam: readonly ExamPoolQuestion[],
  forms: ReadonlySet<string>,
): PoolQuestion[] {
  const joined = exam
    .filter((q) => forms.has(q.form))
    .map(({ id, concept, note, type, module }) => ({ id, concept, note, type, module }));
  return [...practice, ...joined];
}

interface Ranked {
  q: PoolQuestion;
  rank: number;
  r: number;
  lastAt: string;
  tie: number;
}

/** Ranks the pool by `[rank, r]` from `keyOf`, then the oldest last answer, then the seeded shuffle. */
function ranked(
  pool: readonly PoolQuestion[],
  progress: Progress,
  seed: number,
  keyOf: (q: PoolQuestion, answered: boolean) => readonly [number, number],
): Ranked[] {
  const order = new Map(shuffle(pool, mulberry32(seed)).map((q, i) => [q.id, i]));
  return pool
    .map((q) => {
      const last = progress.answers.get(q.id)?.at(-1);
      const [rank, r] = keyOf(q, last !== undefined);
      return { q, rank, r, lastAt: last?.at ?? '', tie: order.get(q.id) ?? 0 };
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.r - b.r ||
        (a.lastAt < b.lastAt ? -1 : a.lastAt > b.lastAt ? 1 : 0) ||
        a.tie - b.tie,
    );
}

/** The variant to show: never answered first, then the one answered longest ago, then a seeded tie (spec 4.2). */
export function pickVariant(
  candidates: readonly PoolQuestion[],
  progress: Progress,
  random: () => number,
): PoolQuestion {
  const seed = Math.floor(random() * 2 ** 32);
  const first = ranked(candidates, progress, seed, (_q, answered) => [answered ? 1 : 0, 0])[0];
  if (!first) throw new Error('pickVariant needs at least one candidate');
  return first.q;
}

/** One question per concept, in the given concept order, never the variant shown last when another exists. */
export function selectCheck(args: {
  concepts: readonly string[];
  pool: readonly PoolQuestion[];
  progress: Progress;
  seed: number;
}): string[] {
  const { concepts, pool, progress, seed } = args;
  const order = ranked(pool, progress, seed, (_q, answered) => [answered ? 1 : 0, 0]);
  const out: string[] = [];
  for (const concept of concepts) {
    const variants = order.filter((r) => r.q.concept === concept);
    const shown = progress.lastShown.get(concept);
    const fresh = variants.length > 1 ? variants.filter((r) => r.q.id !== shown) : variants;
    const pick = fresh[0];
    if (pick) out.push(pick.q.id);
  }
  return out;
}

/**
 * Up to `size` questions: never answered first, then by the concept's recall, lowest first;
 * one per concept first, then a second pass fills up in the same order.
 */
export function selectQuiz(args: {
  pool: readonly PoolQuestion[];
  progress: Progress;
  seed: number;
  size?: number;
  recall: (concept: string) => number;
}): string[] {
  const { pool, progress, seed, size = QUIZ_SIZE, recall } = args;
  const order = ranked(pool, progress, seed, (q, answered) => (answered ? [1, recall(q.concept)] : [0, 0]));
  const out: string[] = [];
  const taken = new Set<string>();
  const concepts = new Set<string>();
  for (const { q } of order) {
    if (out.length >= size) break;
    if (concepts.has(q.concept)) continue;
    concepts.add(q.concept);
    taken.add(q.id);
    out.push(q.id);
  }
  for (const { q } of order) {
    if (out.length >= size) break;
    if (taken.has(q.id)) continue;
    taken.add(q.id);
    out.push(q.id);
  }
  return out;
}

/** Another variant of the concept for a relearn step, seeded per concept; null when the concept has no other. */
export function relearnVariant(args: {
  concept: string;
  avoid: string;
  pool: readonly PoolQuestion[];
  seed: number;
}): string | null {
  const { concept, avoid, pool, seed } = args;
  const ids = pool
    .filter((q) => q.concept === concept && q.id !== avoid)
    .map((q) => q.id)
    .sort();
  return shuffle(ids, mulberry32(seedFor(seed, concept)))[0] ?? null;
}

export interface SessionItem {
  qid: string;
  relearn: boolean;
}

/**
 * The items of a session, rebuilt from its answers so a reload resumes at the same item.
 * In a review, the first wrong answer to a concept inserts one relearn item `RELEARN_GAP` items later, or at the end.
 */
export function sessionItems(
  session: SessionState,
  relearnFor: (qid: string, concept: string) => string | null,
): SessionItem[] {
  const items: SessionItem[] = session.qids.map((qid) => ({ qid, relearn: false }));
  if (session.mode !== 'review') return items;
  const relearned = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || item.relearn) continue;
    const answer = session.answers.get(item.qid);
    if (!answer || answer.correct || answer.relearn || relearned.has(answer.concept)) continue;
    const variant = relearnFor(item.qid, answer.concept);
    if (variant === null || items.some((x) => x.qid === variant)) continue;
    relearned.add(answer.concept);
    items.splice(Math.min(i + RELEARN_GAP, items.length), 0, { qid: variant, relearn: true });
  }
  return items;
}
