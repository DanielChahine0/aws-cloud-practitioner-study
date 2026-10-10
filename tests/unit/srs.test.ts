import { describe, expect, it } from 'vitest';
import { addDays, DAY_MS, dayStartAt, studyDayAt } from '../../src/engine/day.ts';
import { fnv1a } from '../../src/engine/rng.ts';
import {
  capDue,
  type ExamCap,
  MAX_INTERVAL_DAYS,
  RETENTION,
  rate,
  recall,
  review,
  type SrsCard,
} from '../../src/engine/srs.ts';

const START = new Date('2026-10-09T10:00:00Z');
const daysUntilDue = (card: SrsCard, from: Date): number => (Date.parse(card.due) - from.getTime()) / DAY_MS;

describe('rate', () => {
  it('rates a wrong answer Again, a right Not sure Hard and a right Sure Good', () => {
    expect(rate(false, false)).toBe('again');
    expect(rate(false, true)).toBe('again');
    expect(rate(true, false)).toBe('hard');
    expect(rate(true, true)).toBe('good');
  });
});

describe('review and recall (golden vectors from ts-fsrs 5.4.2)', () => {
  it('uses retention 0.90 and a 180-day cap', () => {
    expect(RETENTION).toBe(0.9);
    expect(MAX_INTERVAL_DAYS).toBe(180);
  });

  it('schedules a first Good 3 days out with recall 0.881 at due', () => {
    const card = review(null, 'good', START);
    expect(card.due).toBe('2026-10-12T10:00:00.000Z');
    expect(card.stability).toBeCloseTo(2.3065, 4);
    expect(card.lastReview).toBe(START.toISOString());
    expect(card.reps).toBe(1);
    expect(card.lapses).toBe(0);
    expect(card.state).toBe(2);
    expect(recall(card, new Date(card.due))).toBeCloseTo(0.881, 3);
  });

  it('schedules a first Hard 2 days out with recall 0.867 at due', () => {
    const card = review(null, 'hard', START);
    expect(card.due).toBe('2026-10-11T10:00:00.000Z');
    expect(card.stability).toBeCloseTo(1.2931, 4);
    expect(recall(card, new Date(card.due))).toBeCloseTo(0.867, 3);
  });

  it('schedules a first Again 1 day out with recall 0.766 at due', () => {
    const card = review(null, 'again', START);
    expect(card.due).toBe('2026-10-10T10:00:00.000Z');
    expect(card.stability).toBeCloseTo(0.212, 3);
    expect(recall(card, new Date(card.due))).toBeCloseTo(0.766, 3);
  });

  it('orders the intervals Again < Hard < Good and recalls fully at the review itself', () => {
    const intervals = (['again', 'hard', 'good'] as const).map((r) =>
      daysUntilDue(review(null, r, START), START),
    );
    expect(intervals).toEqual([1, 2, 3]);
    expect(recall(review(null, 'good', START), START)).toBe(1);
  });

  it('keeps recall at due near 0.90 over ten Good reviews and never passes 180 days', () => {
    let card = review(null, 'good', START);
    let at = START;
    for (let i = 0; i < 10; i++) {
      const days = daysUntilDue(card, at);
      expect(days).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
      if (days >= 7 && days < MAX_INTERVAL_DAYS) {
        expect(Math.abs(recall(card, new Date(card.due)) - 0.9)).toBeLessThanOrEqual(0.01);
      }
      at = new Date(card.due);
      card = review(card, 'good', at);
    }
    expect(daysUntilDue(card, at)).toBe(MAX_INTERVAL_DAYS);
  });

  it('keeps a card plain JSON, so it survives a round trip', () => {
    const card = review(review(null, 'good', START), 'again', new Date('2026-10-12T10:00:00Z'));
    expect(JSON.parse(JSON.stringify(card))).toEqual(card);
    expect(card.lapses).toBe(1);
    expect(recall(card, new Date('2026-10-12T10:00:00Z'))).toBe(1);
  });

  it('clamps recall to [0, 1] even before the last review', () => {
    const card = review(null, 'good', START);
    const before = recall(card, new Date('2026-10-01T00:00:00Z'));
    expect(before).toBeGreaterThanOrEqual(0);
    expect(before).toBeLessThanOrEqual(1);
  });
});

describe('capDue', () => {
  const EXAM = '2026-11-14';
  const tz = 60;
  const cap = (concept: string, reviewDay: string, examDate: string | null = EXAM): ExamCap => ({
    concept,
    reviewDay,
    examDate,
    tz,
  });
  const at = (day: string, hour = 12): Date =>
    new Date(dayStartAt(day, tz).getTime() + (hour - 4) * 3_600_000);

  it('moves a due after the eve of the exam into the last week, spread by the concept id', () => {
    const due = capDue(at('2026-11-20'), cap('proof-box', '2026-11-02'));
    const spread = fnv1a('proof-box') % 7;
    expect(due.toISOString()).toBe(dayStartAt(addDays('2026-11-13', -spread), tz).toISOString());
  });

  it('leaves a due on or before the eve of the exam alone', () => {
    const early = at('2026-11-10');
    expect(capDue(early, cap('proof-box', '2026-11-02')).toISOString()).toBe(early.toISOString());
    const eve = at('2026-11-13', 23);
    expect(capDue(eve, cap('proof-box', '2026-11-02')).toISOString()).toBe(eve.toISOString());
  });

  it('never moves a due to the review day or before it', () => {
    for (const concept of ['proof-box', 'oven-rental', 'flour-delivery', 'display-case']) {
      const due = capDue(at('2026-12-01'), cap(concept, '2026-11-12'));
      expect(studyDayAt(due, tz)).toBe('2026-11-13');
    }
  });

  it('leaves the due alone without an exam date or on and after the exam day', () => {
    const late = at('2026-12-01');
    expect(capDue(late, cap('proof-box', '2026-11-02', null)).toISOString()).toBe(late.toISOString());
    expect(capDue(late, cap('proof-box', '2026-11-14')).toISOString()).toBe(late.toISOString());
    expect(capDue(late, cap('proof-box', '2026-11-20')).toISOString()).toBe(late.toISOString());
  });

  it('spreads 50 concepts over at least 5 days of the last week', () => {
    const days = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const due = capDue(at('2026-12-01'), cap(`bake-concept-${i}`, '2026-11-01'));
      const day = studyDayAt(due, tz);
      expect(day >= '2026-11-07' && day <= '2026-11-13').toBe(true);
      days.add(day);
    }
    expect(days.size).toBeGreaterThanOrEqual(5);
  });
});
