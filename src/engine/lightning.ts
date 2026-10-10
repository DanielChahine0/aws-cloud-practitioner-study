import type { MemoryState } from './memory.ts';
import type { Progress, SessionState } from './replay.ts';
import { mulberry32, shuffle } from './rng.ts';
import { type PoolQuestion, pickVariant } from './select.ts';

/**
 * The lightning round (spec 4.1): single practice items for settled concepts, 90 seconds, a summary at the end.
 * Its answers never touch FSRS (spec 3.6); a miss writes `review.now`, which `deriveMemory` turns into a due card,
 * and only the first round of a study day pays, 1 XP per correct answer up to 10 (spec 3.2 and 3.11).
 */
export const LIGHTNING_SECONDS = 90;
/** Settled concepts needed before the round opens (spec 7.2 empty state `Opens after 20 concepts settle.`). */
export const LIGHTNING_UNLOCK = 20;
/** A concept is settled once its card's FSRS stability reaches this many days. */
export const LIGHTNING_STABILITY_DAYS = 3;
/** The most items one round draws: more than anyone answers in 90 seconds. */
export const LIGHTNING_SIZE = 30;
/** The scope every lightning session start carries, so `openSession` finds the open round. */
export const LIGHTNING_SCOPE = 'lightning';

/** Concepts whose card has a stability of at least `LIGHTNING_STABILITY_DAYS`, sorted by id. */
export function settledConcepts(memory: MemoryState): string[] {
  const out: string[] = [];
  for (const [id, cm] of memory.concepts) {
    if (cm.card !== null && cm.card.stability >= LIGHTNING_STABILITY_DAYS) out.push(id);
  }
  return out.sort();
}

/** Whether the round is open: at least `LIGHTNING_UNLOCK` settled concepts. */
export function lightningOpen(memory: MemoryState): boolean {
  return settledConcepts(memory).length >= LIGHTNING_UNLOCK;
}

/** The deadline of a round started at `start`, as the session start event stores it. */
export function lightningDeadline(start: Date): string {
  return new Date(start.getTime() + LIGHTNING_SECONDS * 1000).toISOString();
}

/**
 * The items of a round: one `single` item per concept in `concepts`, the concepts in a seeded order, each variant
 * picked never answered first, then answered longest ago; at most `size`.
 * Only items without a `form` field qualify, so no exam item, taken or not, ever reaches a round.
 */
export function selectLightning(args: {
  pool: readonly PoolQuestion[];
  concepts: readonly string[];
  progress: Progress;
  seed: number;
  size?: number;
}): string[] {
  const { pool, progress, seed } = args;
  const size = args.size ?? LIGHTNING_SIZE;
  const wanted = new Set(args.concepts);
  const byConcept = new Map<string, PoolQuestion[]>();
  for (const q of pool) {
    if (q.type !== 'single' || 'form' in q || !wanted.has(q.concept)) continue;
    const list = byConcept.get(q.concept);
    if (list === undefined) byConcept.set(q.concept, [q]);
    else list.push(q);
  }
  const random = mulberry32(seed);
  const order = shuffle([...byConcept.keys()].sort(), random);
  const out: string[] = [];
  for (const concept of order) {
    if (out.length >= size) break;
    out.push(pickVariant(byConcept.get(concept) ?? [], progress, random).id);
  }
  return out;
}

/** The concepts of a round's wrong answers, each once, in answer order. */
export function missedConcepts(session: SessionState): string[] {
  const answers = [...session.answers.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out: string[] = [];
  for (const a of answers) if (!a.correct && !out.includes(a.concept)) out.push(a.concept);
  return out;
}
