import { describe, expect, it } from 'vitest';
import {
  bossLineOf,
  conceptMeta,
  masteryLine,
  RECALL_LABEL,
  recallBand,
  weakestConcepts,
} from '../../src/app/module.ts';
import type { BossStatus } from '../../src/engine/boss.ts';
import type { MemoryState } from '../../src/engine/memory.ts';
import type { SrsCard } from '../../src/engine/srs.ts';

const NOW = new Date('2026-10-14T10:00:00.000Z');

const card = (due: string, stability: number): SrsCard => ({
  due,
  stability,
  difficulty: 5,
  elapsedDays: 0,
  scheduledDays: 1,
  learningSteps: 0,
  reps: 1,
  lapses: 0,
  state: 2,
  lastReview: '2026-10-10T10:00:00.000Z',
});

/** A memory with just the concept map filled; the other fields are never read by these helpers. */
const memoryWith = (concepts: [string, SrsCard | null, number][]): MemoryState =>
  ({
    concepts: new Map(
      concepts.map(([id, c, successDays]) => [
        id,
        {
          card: c,
          enteredOn: '2026-10-10',
          lastAnswerDay: '2026-10-10',
          fsrsDay: '2026-10-10',
          fsrsRating: null,
          extraAgainDay: null,
          misconception: null,
          successDays: Array.from({ length: successDays }, (_, i) => `2026-10-0${i + 1}`),
        },
      ]),
    ),
  }) as unknown as MemoryState;

const status = (over: Partial<BossStatus>): BossStatus => ({
  unlocked: true,
  passed: false,
  passedAt: null,
  ready: false,
  cooldownUntil: null,
  open: null,
  attempts: 0,
  ...over,
});

describe('weakestConcepts', () => {
  it('orders by mastery, weakest first, then by id, and gives each its next-due study day', () => {
    const memory = memoryWith([
      ['c-strong', card('2026-10-30T14:00:00.000Z', 40), 3],
      ['c-weak', card('2026-10-14T14:00:00.000Z', 1), 3],
    ]);
    const names = new Map([
      ['c-strong', 'Strong one'],
      ['c-weak', 'Weak one'],
      ['c-b-new', 'New b'],
      ['c-a-new', 'New a'],
    ]);
    const rows = weakestConcepts(['c-strong', 'c-weak', 'c-b-new', 'c-a-new'], names, memory, NOW);
    expect(rows.map((r) => r.id)).toEqual(['c-a-new', 'c-b-new', 'c-weak', 'c-strong']);
    expect(rows[0]).toEqual({ id: 'c-a-new', name: 'New a', mastery: 0, due: null });
    expect(rows[2]?.due).toBe('2026-10-14');
    expect(rows[3]?.due).toBe('2026-10-30');
    expect(rows[3]?.mastery ?? 0).toBeGreaterThan(rows[2]?.mastery ?? 100);
  });
});

describe('conceptMeta', () => {
  it('says not studied, due today, or the due date', () => {
    expect(conceptMeta({ id: 'c', name: 'C', mastery: 0, due: null }, '2026-10-14')).toBe('not studied');
    expect(conceptMeta({ id: 'c', name: 'C', mastery: 32, due: '2026-10-14' }, '2026-10-14')).toBe(
      'mastery 32 · due today',
    );
    expect(conceptMeta({ id: 'c', name: 'C', mastery: 32, due: '2026-10-02' }, '2026-10-14')).toBe(
      'mastery 32 · due today',
    );
    expect(conceptMeta({ id: 'c', name: 'C', mastery: 32, due: '2026-10-20' }, '2026-10-14')).toBe(
      'mastery 32 · due Oct 20',
    );
  });
});

describe('bossLineOf', () => {
  it('says what opens the boss', () => {
    expect(bossLineOf(status({ unlocked: false }), NOW)).toBe(
      'Opens after you read every lesson of this module.',
    );
  });

  it('rounds the cooldown up to whole hours', () => {
    expect(bossLineOf(status({ cooldownUntil: '2026-10-14T14:01:00.000Z' }), NOW)).toBe('Next try in 5 h.');
    expect(bossLineOf(status({ cooldownUntil: '2026-10-15T06:00:00.000Z' }), NOW)).toBe('Next try in 20 h.');
  });

  it('names the day of the pass', () => {
    expect(bossLineOf(status({ passed: true, passedAt: '2026-10-12T15:00:00.000Z' }), NOW)).toBe(
      'Passed on Oct 12.',
    );
  });

  it('gives a passed boss that is cooling down both lines', () => {
    expect(
      bossLineOf(
        status({
          passed: true,
          passedAt: '2026-10-13T14:00:00.000Z',
          cooldownUntil: '2026-10-15T04:00:00.000Z',
        }),
        NOW,
      ),
    ).toBe('Passed on Oct 13. Next try in 18 h.');
  });

  it('gives the size, time and pass mark of an open boss', () => {
    expect(bossLineOf(status({ ready: true }), NOW)).toBe('15 questions in 21 minutes; 12 right to pass.');
  });
});

describe('masteryLine', () => {
  it('shows the mastery and its band, and a passed boss', () => {
    expect(masteryLine(64, 'solid', false)).toBe('Mastery 64 · solid');
    expect(masteryLine(85, 'mastered', true)).toBe('Mastery 85 · mastered · boss passed');
  });
});

describe('recallBand', () => {
  it('cuts at 0.70 and 0.90, and has no band without a card', () => {
    expect(recallBand(null)).toBe('none');
    expect(recallBand(0.69)).toBe('weak');
    expect(recallBand(0.7)).toBe('fading');
    expect(recallBand(0.899)).toBe('fading');
    expect(recallBand(0.9)).toBe('strong');
    expect(RECALL_LABEL).toEqual({ none: 'not studied', weak: 'weak', fading: 'fading', strong: 'strong' });
  });
});
