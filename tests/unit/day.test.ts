import { describe, expect, it } from 'vitest';
import {
  addDays,
  DAY_MS,
  DAY_START_HOUR,
  dayStartAt,
  daysBetween,
  nextDayStart,
  studyDay,
  studyDayAt,
  tzOffset,
} from '../../src/engine/day.ts';

describe('studyDay', () => {
  it('starts the study day at 04:00 local time', () => {
    expect(DAY_START_HOUR).toBe(4);
    expect(studyDay(new Date(2026, 9, 10, 3, 59))).toBe('2026-10-09');
    expect(studyDay(new Date(2026, 9, 10, 4, 0))).toBe('2026-10-10');
    expect(studyDay(new Date(2026, 9, 10, 23, 59))).toBe('2026-10-10');
  });

  it('crosses a month and a year boundary before 04:00', () => {
    expect(studyDay(new Date(2026, 10, 1, 2, 0))).toBe('2026-10-31');
    expect(studyDay(new Date(2027, 0, 1, 0, 30))).toBe('2026-12-31');
  });

  it('leaves its input alone', () => {
    const at = new Date(2026, 9, 10, 1, 0);
    studyDay(at);
    expect(at.getDate()).toBe(10);
  });
});

describe('tzOffset', () => {
  it('is minutes east of UTC', () => {
    const at = new Date(2026, 9, 10, 12, 0);
    expect(tzOffset(at)).toBe(0 - at.getTimezoneOffset());
  });
});

describe('studyDayAt', () => {
  it('reads the study day in the given offset, whatever zone runs the code', () => {
    expect(studyDayAt(new Date('2026-10-10T01:59:00Z'), 120)).toBe('2026-10-09');
    expect(studyDayAt(new Date('2026-10-10T02:00:00Z'), 120)).toBe('2026-10-10');
    expect(studyDayAt(new Date('2026-10-10T07:59:00Z'), -240)).toBe('2026-10-09');
    expect(studyDayAt(new Date('2026-10-10T08:00:00Z'), -240)).toBe('2026-10-10');
  });

  it('agrees with the local studyDay for every hour around both 2026 DST changes', () => {
    const zone = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      for (const [y, m, d] of [
        [2026, 10, 1],
        [2026, 2, 8],
      ] as const) {
        for (let hour = 0; hour < 24; hour++) {
          for (const minute of [0, 30, 59]) {
            const at = new Date(y, m, d, hour, minute);
            expect(studyDayAt(at, tzOffset(at))).toBe(studyDay(at));
          }
        }
      }
    } finally {
      if (zone === undefined) Reflect.deleteProperty(process.env, 'TZ');
      else process.env.TZ = zone;
    }
  });
});

describe('day arithmetic', () => {
  it('starts a study day at 04:00 in the given offset', () => {
    expect(dayStartAt('2026-10-10', 120).toISOString()).toBe('2026-10-10T02:00:00.000Z');
    expect(dayStartAt('2026-10-10', -240).toISOString()).toBe('2026-10-10T08:00:00.000Z');
    expect(dayStartAt('2026-10-10', 0).toISOString()).toBe('2026-10-10T04:00:00.000Z');
  });

  it('adds days across months and years in both directions', () => {
    expect(DAY_MS).toBe(86_400_000);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-10', 0)).toBe('2026-10-10');
    expect(addDays('2026-11-14', -7)).toBe('2026-11-07');
  });

  it('counts whole days between two study days', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-11-02', '2026-10-30')).toBe(-3);
    expect(daysBetween('2026-10-10', '2026-10-10')).toBe(0);
  });

  it('finds the next 04:00 after a moment', () => {
    expect(nextDayStart(new Date('2026-10-10T01:59:00Z'), 120).toISOString()).toBe(
      '2026-10-10T02:00:00.000Z',
    );
    expect(nextDayStart(new Date('2026-10-10T02:00:00Z'), 120).toISOString()).toBe(
      '2026-10-11T02:00:00.000Z',
    );
  });
});
