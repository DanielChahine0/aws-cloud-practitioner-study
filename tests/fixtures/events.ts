import type { NewEvent, StudyEvent } from '../../schemas/events.ts';

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
