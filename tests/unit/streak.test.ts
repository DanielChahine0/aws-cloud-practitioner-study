import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/engine/day.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { FREEZE_CAP, FREEZE_EVERY, streakOf } from '../../src/engine/streak.ts';
import { timelineOf } from '../fixtures/events.ts';
import { at, contentOf, labDoneOf } from '../fixtures/memory.ts';

/** `count` consecutive study days starting at `from`. */
const run = (from: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => addDays(from, i));

describe('streakOf (spec 3.5)', () => {
  it('earns a freeze every 7 days and banks at most 2', () => {
    expect(FREEZE_EVERY).toBe(7);
    expect(FREEZE_CAP).toBe(2);
  });

  it('is all zeros without qualifying days', () => {
    expect(streakOf(new Set(), '2026-10-10')).toEqual({ current: 0, longest: 0, freezes: 0, frozenDays: [] });
  });

  it('keeps a streak ending yesterday while today is not done yet, and extends it once today qualifies', () => {
    const days = run('2026-10-07', 3);
    expect(streakOf(new Set(days), '2026-10-10')).toMatchObject({ current: 3, longest: 3 });
    expect(streakOf(new Set([...days, '2026-10-10']), '2026-10-10')).toMatchObject({
      current: 4,
      longest: 4,
    });
  });

  it('resets the current streak on a missed day without a freeze and keeps the longest', () => {
    const days = new Set([...run('2026-10-01', 3), '2026-10-05']);
    expect(streakOf(days, '2026-10-05')).toEqual({ current: 1, longest: 3, freezes: 0, frozenDays: [] });
  });

  it('spends a freeze on a missed eighth day, which neither breaks nor extends the streak', () => {
    const week = run('2026-10-01', 7);
    expect(streakOf(new Set(week), '2026-10-07')).toMatchObject({ current: 7, freezes: 1 });
    const frozen = streakOf(new Set(week), '2026-10-09');
    expect(frozen).toEqual({ current: 7, longest: 7, freezes: 0, frozenDays: ['2026-10-08'] });
    const resumed = streakOf(new Set([...week, '2026-10-09']), '2026-10-09');
    expect(resumed).toEqual({ current: 8, longest: 8, freezes: 0, frozenDays: ['2026-10-08'] });
  });

  it('ends 21 straight days with 2 freezes banked', () => {
    expect(streakOf(new Set(run('2026-10-01', 21)), '2026-10-21')).toEqual({
      current: 21,
      longest: 21,
      freezes: 2,
      frozenDays: [],
    });
  });

  it('breaks the streak on two missed days with one freeze', () => {
    const days = new Set([...run('2026-10-01', 7), '2026-10-10']);
    expect(streakOf(days, '2026-10-10')).toEqual({
      current: 1,
      longest: 7,
      freezes: 0,
      frozenDays: ['2026-10-08'],
    });
  });

  it('never counts today as missed and ignores days after today', () => {
    const days = new Set([...run('2026-10-01', 3), '2026-10-06']);
    expect(streakOf(days, '2026-10-04')).toMatchObject({ current: 3, longest: 3 });
  });

  it('counts the days around the DST change as three consecutive days', () => {
    const days = new Set(['2026-10-31', '2026-11-01', '2026-11-02']);
    expect(streakOf(days, '2026-11-02')).toMatchObject({ current: 3, longest: 3 });
  });

  it('treats days stamped in different offsets as plain strings', () => {
    expect(streakOf(new Set(['2026-10-10', '2026-10-11']), '2026-10-11')).toMatchObject({ current: 2 });
  });

  it('extends the streak on a day whose only completion is a first lab completion', () => {
    const content = contentOf([{ id: 'oven', module: 1 }]);
    const log = timelineOf([
      [at('2026-10-09'), { t: 'lesson.done', note: 'm01/a' }],
      [at('2026-10-10'), labDoneOf('lab-m01-a', 1)],
    ]);
    expect(streakOf(deriveMemory(log, content).qualifyingDays, '2026-10-10').current).toBe(2);
  });
});
