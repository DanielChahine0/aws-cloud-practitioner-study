/** Picks the questions of a lesson check and a module quiz (spec 4.1, without FSRS until Phase 2). */
import type { Progress } from './replay.ts';
import { mulberry32, shuffle } from './rng.ts';

export const QUIZ_SIZE = 12;

export interface PoolQuestion {
  id: string;
  concept: string;
  note: string;
}

/** The time of the last answer to a question, or null when it was never answered. */
function lastAnswer(progress: Progress, qid: string): { at: string; correct: boolean } | null {
  const list = progress.answers.get(qid);
  const last = list?.[list.length - 1];
  return last === undefined ? null : { at: last.at, correct: last.correct };
}

/** Never answered first, then the oldest last answer; ties keep the seeded order. */
function byAge(progress: Progress, ordered: readonly PoolQuestion[]): PoolQuestion[] {
  const tie = new Map(ordered.map((q, i) => [q.id, i]));
  const key = (q: PoolQuestion): string => lastAnswer(progress, q.id)?.at ?? '';
  return [...ordered].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    if (ka !== kb) return ka < kb ? -1 : 1;
    return (tie.get(a.id) ?? 0) - (tie.get(b.id) ?? 0);
  });
}

export function selectCheck({
  concepts,
  pool,
  progress,
  seed,
}: {
  concepts: readonly string[];
  pool: readonly PoolQuestion[];
  progress: Progress;
  seed: number;
}): string[] {
  const ordered = shuffle(pool, mulberry32(seed));
  const out: string[] = [];
  for (const concept of concepts) {
    let variants = ordered.filter((q) => q.concept === concept);
    const last = progress.lastShown.get(concept);
    if (variants.length > 1 && last !== undefined) variants = variants.filter((q) => q.id !== last);
    const first = byAge(progress, variants)[0];
    if (first !== undefined) out.push(first.id);
  }
  return out;
}

export function selectQuiz({
  pool,
  progress,
  seed,
  size = QUIZ_SIZE,
}: {
  pool: readonly PoolQuestion[];
  progress: Progress;
  seed: number;
  size?: number;
}): string[] {
  const rank = (q: PoolQuestion): number => {
    const last = lastAnswer(progress, q.id);
    if (last === null) return 0;
    return last.correct ? 2 : 1;
  };
  const aged = byAge(progress, shuffle(pool, mulberry32(seed)));
  const ranked = [0, 1, 2].flatMap((r) => aged.filter((q) => rank(q) === r));
  const out: PoolQuestion[] = [];
  const concepts = new Set<string>();
  for (const q of ranked) {
    if (out.length >= size) break;
    if (concepts.has(q.concept)) continue;
    concepts.add(q.concept);
    out.push(q);
  }
  for (const q of ranked) {
    if (out.length >= size) break;
    if (!out.includes(q)) out.push(q);
  }
  return out.map((q) => q.id);
}
