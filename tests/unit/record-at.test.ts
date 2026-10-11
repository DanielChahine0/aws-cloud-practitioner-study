import { afterEach, describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { events, recordAt } from '../../src/app/progress.ts';

const step = (mission: string, s: 'start' | 'verified' | 'usage-ok'): NewEvent => ({
  t: 'mission',
  mission,
  step: s,
});
/** Local dates, so the study day reads the same in every zone the tests run in. */
const local = (day: number, hour: number, minute = 0): Date => new Date(2026, 9, day, hour, minute);

afterEach(() => {
  events.value = [];
});

describe('recordAt (spec 8.1 Already done)', () => {
  it('stamps each event with its own date and study day, and ids that sort by date', async () => {
    const added = await recordAt([
      [step('mission-01', 'start'), local(15, 12)],
      [step('mission-00', 'start'), local(12, 12)],
      [step('mission-00', 'verified'), local(12, 12)],
      [step('mission-01', 'usage-ok'), local(16, 3, 30)],
    ]);
    expect(added.map((e) => (e.t === 'mission' ? `${e.mission} ${e.step}` : e.t))).toEqual([
      'mission-00 start',
      'mission-00 verified',
      'mission-01 start',
      'mission-01 usage-ok',
    ]);
    expect(added.map((e) => e.day)).toEqual(['2026-10-12', '2026-10-12', '2026-10-15', '2026-10-15']);
    expect(added.map((e) => e.at)).toEqual([
      local(12, 12).toISOString(),
      local(12, 12).toISOString(),
      local(15, 12).toISOString(),
      local(16, 3, 30).toISOString(),
    ]);
    const ids = added.map((e) => e.id);
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(4);
    expect(events.value).toEqual(added);
  });

  it('never clamps a later call to the time of an earlier one, so its earlier date sorts first', async () => {
    const [later] = await recordAt([[step('mission-03', 'start'), local(20, 9)]]);
    const [earlier] = await recordAt([[step('mission-00', 'start'), local(12, 12)]]);
    expect((earlier?.id ?? '') < (later?.id ?? '')).toBe(true);
  });
});
