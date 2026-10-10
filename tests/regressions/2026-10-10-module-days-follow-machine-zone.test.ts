import { describe, expect, it } from 'vitest';
import { bossLineOf, weakestConcepts } from '../../src/app/module.ts';
import type { BossStatus } from '../../src/engine/boss.ts';
import type { MemoryState } from '../../src/engine/memory.ts';
import type { SrsCard } from '../../src/engine/srs.ts';

// The module helpers read the machine zone, so their study days moved with TZ and no fixed instant
// tested the same day in every zone from -12 h to +14 h. They now take the zone like `studyDayAt`.

const NOW = new Date('2026-10-14T10:00:00.000Z');
const AT = '2026-10-14T14:00:00.000Z';

const memory = {
  concepts: new Map([
    [
      'c-1',
      {
        card: {
          due: AT,
          stability: 1,
          difficulty: 5,
          elapsedDays: 0,
          scheduledDays: 1,
          learningSteps: 0,
          reps: 1,
          lapses: 0,
          state: 2,
          lastReview: '2026-10-10T10:00:00.000Z',
        } satisfies SrsCard,
        successDays: [],
      },
    ],
  ]),
} as unknown as MemoryState;

const passed: BossStatus = {
  unlocked: true,
  passed: true,
  passedAt: AT,
  ready: false,
  cooldownUntil: null,
  open: null,
  attempts: 1,
};

describe('module study days in a given zone', () => {
  it.each([
    [-720, '2026-10-13', 'Oct 13'],
    [-600, '2026-10-14', 'Oct 14'],
    [0, '2026-10-14', 'Oct 14'],
    [840, '2026-10-15', 'Oct 15'],
  ])('uses the offset %i passed in, not the machine zone', (tz, day, short) => {
    expect(weakestConcepts(['c-1'], new Map(), memory, NOW, tz)[0]?.due).toBe(day);
    expect(bossLineOf(passed, NOW, tz)).toBe(`Passed on ${short}.`);
  });
});
