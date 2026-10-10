/** The lightning round's copy and pure helpers (spec 4.1 and 7.2), so the tests run without a browser. */
import type { NewEvent } from '../../schemas/events.ts';
import { missedConcepts } from '../engine/lightning.ts';
import type { Progress, SessionState } from '../engine/replay.ts';

export const LIGHTNING_LOCKED = 'Opens after 20 concepts settle.';
export const LIGHTNING_LEDE = "Answer as many as you can in 90 seconds; misses come back in today's review.";
export const LIGHTNING_UNPAID = 'Only the first round each day pays XP.';
export const LIGHTNING_START = 'Start the round';
export const LIGHTNING_LOAD_ERROR = 'This round could not load. Check your connection and try again.';

/** The time left as `m:ss`, rounded up to the second and never below `0:00`. */
export function clockText(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The line under the summary: how many missed concepts go back into today's review, or null for none. */
export function missLine(n: number): string | null {
  if (n === 0) return null;
  return `${n} ${n === 1 ? 'concept goes' : 'concepts go'} back into today's review.`;
}

/**
 * Whether a lightning round has already started on study day `today`, so a new round pays nothing (spec 3.2). It reads
 * the day stamped on each start, as the replay pays, so a change of zone since never moves a round to another day.
 */
export function paidToday(progress: Progress, today: string): boolean {
  for (const s of progress.sessions.values()) {
    if (s.mode === 'lightning' && s.startDay === today) return true;
  }
  return false;
}

/** The events that close a round (spec 4.1 and 3.6): its submit, then one `review.now` per missed concept. */
export function roundEndEvents(session: SessionState): NewEvent[] {
  return [
    { t: 'session', sid: session.sid, mode: 'lightning', phase: 'submit', seed: session.seed },
    ...missedConcepts(session).map((concept): NewEvent => ({ t: 'review.now', concept })),
  ];
}
