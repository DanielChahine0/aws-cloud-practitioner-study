import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '../../schemas/events.ts';
import { reminderDue } from '../../src/store/backup.ts';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-20T12:00:00Z');

/** `n` lesson.done events, one minute apart, all after `after`. */
function eventsAfter(after: Date, n: number): StudyEvent[] {
  return Array.from({ length: n }, (_, i) => {
    const at = new Date(after.getTime() + (i + 1) * 60_000).toISOString();
    return {
      id: `01K0000000000000000000${String(i).padStart(4, '0')}`,
      at,
      tz: 0,
      day: at.slice(0, 10),
      t: 'lesson.done',
      note: `m01/lesson-${i}`,
    };
  });
}

describe('reminderDue', () => {
  it('stays quiet with 49 new events, even long after the last export', () => {
    const exported = new Date(NOW.getTime() - 8 * DAY);
    expect(reminderDue(eventsAfter(exported, 49), exported.toISOString(), NOW)).toBe(false);
  });

  it('reminds with 50 new events and an export 8 days old', () => {
    const exported = new Date(NOW.getTime() - 8 * DAY);
    expect(reminderDue(eventsAfter(exported, 50), exported.toISOString(), NOW)).toBe(true);
  });

  it('stays quiet with 50 new events and an export 6 days old', () => {
    const exported = new Date(NOW.getTime() - 6 * DAY);
    expect(reminderDue(eventsAfter(exported, 50), exported.toISOString(), NOW)).toBe(false);
  });

  it('counts events after the first one when nothing was exported yet', () => {
    const start = new Date(NOW.getTime() - 2 * DAY);
    expect(reminderDue(eventsAfter(start, 50), null, NOW)).toBe(false);
    expect(reminderDue(eventsAfter(start, 51), null, NOW)).toBe(true);
    expect(reminderDue([], null, NOW)).toBe(false);
  });
});
