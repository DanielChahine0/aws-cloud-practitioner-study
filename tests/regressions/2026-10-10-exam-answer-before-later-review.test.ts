import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf, examStartOf, submitOf } from '../fixtures/memory.ts';

/**
 * A boss or mock answer is held until its submit and then applied at its own time, but the concept's card
 * may have had a later FSRS update in between (a learn answer on a later day, or later on the same study day
 * across UTC midnight), so `deriveMemory` threw ts-fsrs's `Invalid delta_t "-1"` instead of replaying the log.
 * Found by `tests/property/grind.property.test.ts` (seed 1603011107).
 */
type Log = (readonly [string, NewEvent])[];

const CONTENT = contentOf([{ id: 'oven', module: 1 }]);
const QIDS = ['q-oven-1'];

const boss = (startAt: string): readonly [string, NewEvent] => [
  startAt,
  examStartOf(SID, 'boss', QIDS, { scope: 'm01', deadline: '2026-10-10T00:00:00.000Z' }),
];
const bossAnswer = (when: string, correct: boolean): readonly [string, NewEvent] => [
  when,
  answerOf({ concept: 'oven', mode: 'boss', correct, sure: true }),
];
const check = (when: string, correct: boolean): readonly [string, NewEvent] => [
  when,
  answerOf({ concept: 'oven', mode: 'check', sid: SID2, correct, sure: true }),
];
const submit = (when: string): readonly [string, NewEvent] => [when, submitOf(SID, 'boss')];

describe('a held exam answer older than the card review', () => {
  it('replays when the card was reviewed on a later day before the submit', () => {
    const log: Log = [
      boss(at('2026-10-01', 4)),
      bossAnswer(at('2026-10-01', 4, 1), false),
      check(at('2026-10-02', 4), false),
      submit(at('2026-10-03', 4)),
    ];
    const memory = deriveMemory(timelineOf(log), CONTENT);
    const card = memory.concepts.get('oven')?.card ?? null;
    expect(card).not.toBeNull();
    expect(card?.lastReview).toBe(at('2026-10-02', 4));
  });

  it('replays when the card was reviewed later on the same study day across UTC midnight', () => {
    const log: Log = [
      boss(at('2026-10-01', 23)),
      bossAnswer(at('2026-10-01', 23, 30), false),
      check(at('2026-10-02', 1), true),
      submit(at('2026-10-02', 2)),
    ];
    const memory = deriveMemory(timelineOf(log), CONTENT);
    const card = memory.concepts.get('oven')?.card ?? null;
    expect(card).not.toBeNull();
    expect(card?.lastReview).toBe(at('2026-10-02', 1));
  });
});
