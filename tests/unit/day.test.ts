import { describe, expect, it } from 'vitest';
import { DAY_START_HOUR, studyDay, tzOffset } from '../../src/engine/day.ts';

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
