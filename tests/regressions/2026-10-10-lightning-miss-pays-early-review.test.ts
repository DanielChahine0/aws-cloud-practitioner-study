import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { deriveMemory, isDue } from '../../src/engine/memory.ts';
import type { SrsCard } from '../../src/engine/srs.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf, reviewNowOf } from '../fixtures/memory.ts';

/**
 * A lightning miss writes `review.now`, which made the card due today, so the next review answer counted as a due
 * answer: it earned bet XP and the effort bonus and made a full FSRS update.
 * Lightning answers cost nothing and the round summary shows the key, so missing on purpose turned every early
 * review into a paid one that pushed the card weeks out (spec 3.11, Reviewing early).
 */
type Log = (readonly [string, NewEvent])[];

const CONTENT = contentOf([{ id: 'oven', module: 1 }]);
const review = (when: string, correct: boolean, qid = 'q-oven-1'): readonly [string, NewEvent] => [
  when,
  answerOf({ concept: 'oven', qid, mode: 'review', correct, sure: true }),
];
const settled: Log = [
  [at('2026-10-01'), answerOf({ concept: 'oven', qid: 'q-oven-1', correct: true, sure: true })],
  review(at('2026-10-04'), true),
];
const missed: Log = [...settled, [at('2026-10-10', 11), reviewNowOf('oven')]];
const memoryOf = (log: Log) => deriveMemory(timelineOf(log), CONTENT);
const cardOf = (log: Log) => memoryOf(log).concepts.get('oven')?.card as SrsCard;

describe('a review answer after a lightning miss', () => {
  it('pays and schedules like an early answer when right', () => {
    const early = memoryOf([...settled, review(at('2026-10-10', 12), true)]);
    expect(early.xp).toBe(21);
    expect(early.concepts.get('oven')?.card?.due).toBe('2026-10-18T10:00:00.000Z');
    const after = memoryOf([...missed, review(at('2026-10-10', 12), true)]);
    expect(after.xp).toBe(early.xp);
    expect(after.concepts.get('oven')?.card).toEqual(early.concepts.get('oven')?.card);
    expect(after.concepts.get('oven')?.card?.reps).toBe(2);
  });

  it('pays the bet once for a never-answered question, with no FSRS update', () => {
    const after = memoryOf([...missed, review(at('2026-10-10', 12), true, 'q-oven-2')]);
    expect(after.xpByDay.get('2026-10-10')).toBe(10);
    expect(after.concepts.get('oven')?.card).toEqual(cardOf(settled));
  });

  it('applies Again when wrong, with no XP', () => {
    const after = memoryOf([...missed, review(at('2026-10-10', 12), false)]);
    expect(after.xpByDay.get('2026-10-10')).toBeUndefined();
    const card = after.concepts.get('oven')?.card as SrsCard;
    expect(card.reps).toBe(3);
    expect(card.lapses).toBe(1);
    expect(Date.parse(card.due)).toBeLessThan(Date.parse('2026-10-18T10:00:00.000Z'));
  });

  it('leaves the queue once answered right, and counts in full from the real due day', () => {
    const answered: Log = [...missed, review(at('2026-10-10', 12), true)];
    expect(isDue(cardOf(missed), new Date(at('2026-10-10', 12)), 0)).toBe(true);
    expect(isDue(cardOf(answered), new Date(at('2026-10-10', 13)), 0)).toBe(false);
    const unanswered = memoryOf([...missed, review(at('2026-10-18'), true)]);
    expect(unanswered.xpByDay.get('2026-10-18')).toBeGreaterThanOrEqual(10);
    expect(unanswered.concepts.get('oven')?.card?.reps).toBe(3);
  });
});
