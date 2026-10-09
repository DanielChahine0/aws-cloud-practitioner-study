import type { Progress } from './replay.ts';
import { mulberry32, shuffle } from './rng.ts';

/**
 * Question selection for lesson checks and the module quiz.
 * Without FSRS (Phase 2) the quiz order stands in for "lowest R" (spec 4.1):
 * never answered first, then last answered wrong, then the least recently answered.
 */
export const QUIZ_SIZE = 12;

export interface PoolQuestion {
  id: string;
  concept: string;
  note: string;
}

interface Ranked {
  q: PoolQuestion;
  rank: number;
  lastAt: string;
  tie: number;
}

/** Ranks the pool: `rank` from `rankOf`, then the oldest last answer, then the seeded shuffle. */
function ranked(
  pool: readonly PoolQuestion[],
  progress: Progress,
  seed: number,
  rankOf: (correct: boolean | null) => number,
): Ranked[] {
  const order = new Map(shuffle(pool, mulberry32(seed)).map((q, i) => [q.id, i]));
  return pool
    .map((q) => {
      const last = progress.answers.get(q.id)?.at(-1);
      return {
        q,
        rank: rankOf(last ? last.correct : null),
        lastAt: last?.at ?? '',
        tie: order.get(q.id) ?? 0,
      };
    })
    .sort(
      (a, b) => a.rank - b.rank || (a.lastAt < b.lastAt ? -1 : a.lastAt > b.lastAt ? 1 : 0) || a.tie - b.tie,
    );
}

/** One question per concept, in the given concept order, never the variant shown last when another exists. */
export function selectCheck(args: {
  concepts: readonly string[];
  pool: readonly PoolQuestion[];
  progress: Progress;
  seed: number;
}): string[] {
  const { concepts, pool, progress, seed } = args;
  const order = ranked(pool, progress, seed, (correct) => (correct === null ? 0 : 1));
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

/** Up to `size` questions: one per concept first, then a second pass fills up in the same order. */
export function selectQuiz(args: {
  pool: readonly PoolQuestion[];
  progress: Progress;
  seed: number;
  size?: number;
}): string[] {
  const { pool, progress, seed, size = QUIZ_SIZE } = args;
  const order = ranked(pool, progress, seed, (correct) => (correct === null ? 0 : correct ? 2 : 1));
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
