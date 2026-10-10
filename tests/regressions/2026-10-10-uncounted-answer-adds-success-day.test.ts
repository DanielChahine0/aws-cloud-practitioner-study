import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { SID2, timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf } from '../fixtures/memory.ts';

/**
 * A right first answer of the day added a success day even when it was not a counted answer (spec 3.1):
 * re-answering a seen question on a concept that is not due earned nothing but still lifted g_c (spec 3.8),
 * so re-running yesterday's quiz took a concept's mastery to its success cap the next day.
 */
type Log = (readonly [string, NewEvent])[];

const CONTENT = contentOf([{ id: 'oven', module: 1 }]);

describe('success days', () => {
  it('come from counted answers only, not a seen question on a concept that is not due', () => {
    const log: Log = [
      [at('2026-10-10', 9), answerOf({ concept: 'oven', mode: 'check', correct: true, sure: true })],
      [
        at('2026-10-11', 9),
        answerOf({ concept: 'oven', mode: 'quiz', sid: SID2, correct: true, sure: true }),
      ],
    ];
    const memory = deriveMemory(timelineOf(log), CONTENT);
    expect((memory.concepts.get('oven')?.card?.due ?? '').slice(0, 10) > '2026-10-11').toBe(true);
    expect(memory.xp).toBe(deriveMemory(timelineOf(log.slice(0, 1)), CONTENT).xp);
    expect(memory.concepts.get('oven')?.successDays).toEqual(['2026-10-10']);
  });
});
