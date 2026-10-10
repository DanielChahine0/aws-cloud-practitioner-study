import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf, examStartOf, startOf, submitOf } from '../fixtures/memory.ts';

/**
 * A boss or mock answer set the concept's `lastAnswerDay`, though spec 3.1 does not count exam answers.
 * So a later practice answer that day went to the later-answer path: a never-answered question paid no bet XP
 * and a right answer added no success day, which holds g_c (spec 3.8) down for every concept a mock touched.
 */
type Log = (readonly [string, NewEvent])[];

const SID3 = '01JA00000000000000000000S3';
const CONTENT = contentOf([{ id: 'oven', module: 1 }]);

const dayOne: Log = [
  [at('2026-10-01', 9), answerOf({ concept: 'oven', mode: 'check', sid: SID2, correct: true, sure: true })],
];
const boss: Log = [
  [
    at('2026-10-02', 9),
    examStartOf(SID, 'boss', ['q-oven-1'], { scope: 'm01', deadline: '2026-10-02T10:00:00.000Z' }),
  ],
  [at('2026-10-02', 9, 5), answerOf({ concept: 'oven', mode: 'boss', correct: true, sure: true })],
  [at('2026-10-02', 9, 10), submitOf(SID, 'boss')],
];
const quiz: Log = [
  [
    at('2026-10-02', 11),
    answerOf({ concept: 'oven', qid: 'q-oven-2', mode: 'quiz', sid: SID3, correct: true, sure: true }),
  ],
];

const quizXp = (log: Log): number | undefined => {
  const events = timelineOf(log);
  const last = events.at(-1);
  return last === undefined ? undefined : deriveMemory(events, CONTENT).xpByEvent.get(last.id);
};

describe('an exam answer before a practice answer the same day', () => {
  it('leaves the practice answer the first counted answer of the day', () => {
    const plain = quizXp([...dayOne, ...quiz]);
    expect(plain).toBeGreaterThan(0);
    expect(quizXp([...dayOne, ...boss, ...quiz])).toBe(plain);
    const memory = deriveMemory(timelineOf([...dayOne, ...boss, ...quiz]), CONTENT);
    expect(memory.concepts.get('oven')?.successDays).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('still gives the day one FSRS update when a quiz started before the boss answers after it', () => {
    const log: Log = [
      ...dayOne,
      [at('2026-11-20', 8), startOf(SID3, 'quiz', ['q-oven-2'], 'm01')],
      [
        at('2026-11-20', 9),
        examStartOf(SID, 'boss', ['q-oven-1'], { scope: 'm01', deadline: '2026-11-20T10:00:00.000Z' }),
      ],
      [at('2026-11-20', 9, 5), answerOf({ concept: 'oven', mode: 'boss', correct: true, sure: true })],
      [at('2026-11-20', 9, 10), submitOf(SID, 'boss')],
      [
        at('2026-11-20', 11),
        answerOf({ concept: 'oven', qid: 'q-oven-2', mode: 'quiz', sid: SID3, correct: true, sure: true }),
      ],
    ];
    const memory = deriveMemory(timelineOf(log), CONTENT);
    expect(memory.concepts.get('oven')?.card?.lastReview).toBe(at('2026-11-20', 9, 5));
    expect(memory.concepts.get('oven')?.successDays).toEqual(['2026-10-01', '2026-11-20']);
  });
});
