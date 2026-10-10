import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf } from '../fixtures/memory.ts';

/**
 * The Well Calibrated window (spec 3.10) took every non-relearn answer in a counting mode, including same-day
 * re-answers and answers to a seen question on a concept not due, which spec 3.1 does not count.
 * Re-running a quiz on an easy concept with Sure could fill the Sure side and earn the badge (spec 3.11).
 */
type Log = (readonly [string, NewEvent])[];

const CONTENT = contentOf([{ id: 'oven', module: 1 }]);

describe('the calibration window', () => {
  it('takes only counted answers, not the same question re-answered all day', () => {
    const log: Log = Array.from({ length: 50 }, (_, i) => [
      at('2026-10-10', 9, i),
      answerOf({ concept: 'oven', mode: 'quiz', correct: true, sure: true }),
    ]);
    const memory = deriveMemory(timelineOf(log), CONTENT);
    expect(memory.calibration.sure).toEqual({ right: 1, total: 1 });
  });

  it('leaves out a seen question on a concept that is not due, on a later day', () => {
    const log: Log = [
      [at('2026-10-10', 9), answerOf({ concept: 'oven', mode: 'check', correct: true, sure: true })],
      [at('2026-10-11', 9), answerOf({ concept: 'oven', mode: 'quiz', correct: true, sure: true })],
    ];
    const memory = deriveMemory(timelineOf(log), CONTENT);
    expect((memory.concepts.get('oven')?.card?.due ?? '').slice(0, 10) > '2026-10-11').toBe(true);
    expect(memory.calibration.sure).toEqual({ right: 1, total: 1 });
  });
});
