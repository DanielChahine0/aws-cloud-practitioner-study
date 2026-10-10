import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { overdueLightning } from '../../src/app/home.ts';
import {
  clockText,
  LIGHTNING_LEDE,
  LIGHTNING_LOAD_ERROR,
  LIGHTNING_LOCKED,
  LIGHTNING_START,
  LIGHTNING_UNPAID,
  missLine,
  paidToday,
  roundEndEvents,
} from '../../src/app/lightning.ts';
import { derive, type SessionState } from '../../src/engine/replay.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import { answerOf, lightningStartOf, submitOf } from '../fixtures/memory.ts';

type Log = readonly (readonly [string, NewEvent])[];

/** A round at noon UTC on 2026-10-12, so its study day is 2026-10-12 in every machine zone from UTC-8 to UTC+11. */
const ROUND: Log = [
  ['2026-10-12T12:00:00.000Z', lightningStartOf(SID, ['q-a', 'q-b', 'q-c'], '2026-10-12T12:01:30.000Z')],
  [
    '2026-10-12T12:00:10.000Z',
    answerOf({ concept: 'oven', qid: 'q-a', correct: false, sure: false, mode: 'lightning' }),
  ],
  [
    '2026-10-12T12:00:20.000Z',
    answerOf({ concept: 'crust', qid: 'q-b', correct: true, sure: false, mode: 'lightning' }),
  ],
  [
    '2026-10-12T12:00:30.000Z',
    answerOf({ concept: 'flour', qid: 'q-c', correct: false, sure: false, mode: 'lightning' }),
  ],
];

describe('lightning copy (spec 4.1 and 7.2)', () => {
  it('says the exact lines', () => {
    expect(LIGHTNING_LOCKED).toBe('Opens after 20 concepts settle.');
    expect(LIGHTNING_LEDE).toBe(
      "Answer as many as you can in 90 seconds; misses come back in today's review.",
    );
    expect(LIGHTNING_UNPAID).toBe('Only the first round each day pays XP.');
    expect(LIGHTNING_START).toBe('Start the round');
    expect(LIGHTNING_LOAD_ERROR).toBe('This round could not load. Check your connection and try again.');
  });

  it('shows the time left as m:ss, rounded up and never below 0:00', () => {
    expect(clockText(90_000)).toBe('1:30');
    expect(clockText(4_001)).toBe('0:05');
    expect(clockText(5_000)).toBe('0:05');
    expect(clockText(0)).toBe('0:00');
    expect(clockText(-3_000)).toBe('0:00');
  });

  it('counts the misses that go back into review, and says nothing for none', () => {
    expect(missLine(0)).toBeNull();
    expect(missLine(1)).toBe("1 concept goes back into today's review.");
    expect(missLine(3)).toBe("3 concepts go back into today's review.");
  });
});

describe('paidToday', () => {
  it('is true once a lightning round has started that study day, submitted or not', () => {
    const p = derive(timelineOf(ROUND), null);
    expect(paidToday(p, '2026-10-12')).toBe(true);
    expect(paidToday(p, '2026-10-13')).toBe(false);
    expect(paidToday(derive([], null), '2026-10-12')).toBe(false);
  });
});

describe('roundEndEvents', () => {
  it('closes the round and sends each missed concept back once, in answer order', () => {
    const session = derive(timelineOf(ROUND), null).sessions.get(SID) as SessionState;
    expect(roundEndEvents(session)).toEqual([
      { t: 'session', sid: SID, mode: 'lightning', phase: 'submit', seed: 7 },
      { t: 'review.now', concept: 'oven' },
      { t: 'review.now', concept: 'flour' },
    ]);
  });
});

describe('overdueLightning', () => {
  it('lists the open rounds past their deadline, and no closed or running one', () => {
    const p = derive(timelineOf(ROUND), null);
    expect(overdueLightning(p, new Date('2026-10-12T12:01:29.000Z'))).toEqual([]);
    expect(overdueLightning(p, new Date('2026-10-12T12:01:30.000Z')).map((s) => s.sid)).toEqual([SID]);
    const closed = derive(
      timelineOf([...ROUND, ['2026-10-12T12:00:40.000Z', submitOf(SID, 'lightning')]]),
      null,
    );
    expect(overdueLightning(closed, new Date('2026-10-12T13:00:00.000Z'))).toEqual([]);
    const quiz: NewEvent = {
      t: 'session',
      sid: SID2,
      mode: 'quiz',
      phase: 'start',
      seed: 7,
      scope: 'm01',
      deadline: '2026-10-12T12:00:01.000Z',
    };
    const other = derive(timelineOf([['2026-10-12T12:00:00.000Z', quiz]]), null);
    expect(overdueLightning(other, new Date('2026-10-12T13:00:00.000Z'))).toEqual([]);
  });
});
