import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { studyDayAt } from '../../src/engine/day.ts';
import { monotonicUlid } from '../../src/store/ulid.ts';

/** Two valid session ULIDs for tests. */
export const SID = '01JA00000000000000000000S1';
export const SID2 = '01JA00000000000000000000S2';

/** Stamps events with increasing ULIDs one minute apart, so id order is time order. */
export function eventsOf(...items: NewEvent[]): StudyEvent[] {
  return items.map((item, i) => {
    const at = new Date(Date.UTC(2026, 9, 10, 8, i));
    return {
      ...item,
      id: `01JA${String(i).padStart(22, '0')}`,
      at: at.toISOString(),
      tz: 0,
      day: '2026-10-10',
    } as StudyEvent;
  });
}

/**
 * Stamps a multi-day log: each item is a UTC ISO time and an event, written in offset `tz`.
 * Ids are real ULIDs of those times with a zero random part, so they sort by time and repeat across runs,
 * and each event's `day` is its study day in that offset, as the store stamps it.
 */
export function timelineOf(items: readonly (readonly [string, NewEvent])[], tz = 0): StudyEvent[] {
  const next = monotonicUlid();
  const zero = (bytes: Uint8Array): Uint8Array => bytes.fill(0);
  return items.map(([iso, item]) => {
    const at = new Date(iso);
    return {
      ...item,
      id: next(at.getTime(), zero),
      at: at.toISOString(),
      tz,
      day: studyDayAt(at, tz),
    } as StudyEvent;
  });
}
