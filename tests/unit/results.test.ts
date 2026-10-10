import { describe, expect, it } from 'vitest';
import type { QuestionView } from '../../schemas/chunks.ts';
import { shortDate } from '../../src/app/dates.ts';
import {
  badgeEarnedLine,
  badgesIn,
  bossLine,
  CAUSE_LABELS,
  changedRightToWrong,
  domainLine,
  MOCKS_EMPTY,
  scoredLine,
  scoreLine,
  takenLine,
  wrongOrder,
} from '../../src/app/results.ts';
import type { AnswerRecord, ExamResult } from '../../src/engine/replay.ts';
import { SID } from '../fixtures/events.ts';

const result = (correct: number, total: number, more: Partial<ExamResult> = {}): ExamResult => ({
  sid: SID,
  mode: 'boss',
  scope: 'm01',
  form: null,
  correct,
  answered: total,
  total,
  startedAt: '2026-10-27T10:00:00.000Z',
  submittedAt: '2026-10-27T10:20:00.000Z',
  day: '2026-10-27',
  deadline: '2026-10-27T10:21:00.000Z',
  timedOut: false,
  submitId: '01JA00000000000000000000T1',
  ...more,
});

/** A made-up bakery single: option `a` is right. */
const Q: QuestionView = {
  id: 'x-aaaaa1',
  version: 1,
  type: 'single',
  concept: 'sourdough-starter',
  note: 'm01/starters',
  task: '1.1',
  level: 1,
  stem: 'Which jar holds the starter?',
  select: null,
  options: ['a', 'b', 'c'].map((id) => ({
    id,
    text: `Jar ${id}`,
    correct: id === 'a',
    why: 'The label says so.',
  })),
  pairs: [],
  takeaway: 'Label the jars.',
  read: { route: '#/m/01/l/starters', text: 'Label the jars.' },
};
const answer = (picked: string[], changes: string[][]): AnswerRecord => ({
  id: '01JA00000000000000000000A1',
  qid: Q.id,
  qv: 1,
  sid: SID,
  mode: 'mock',
  at: '2026-10-27T10:05:00.000Z',
  day: '2026-10-27',
  correct: picked.length === 1 && picked[0] === 'a',
  sure: false,
  picked,
  concept: Q.concept,
  relearn: false,
  flagged: false,
  changes,
});

describe('error review (spec 4.4)', () => {
  it('wrongOrder puts confident errors first, each group in session order', () => {
    expect(
      wrongOrder([
        { qid: 'x-1', flagged: true },
        { qid: 'x-2', flagged: false },
        { qid: 'x-3', flagged: true },
        { qid: 'x-4', flagged: false },
      ]),
    ).toEqual(['x-2', 'x-4', 'x-1', 'x-3']);
  });

  it('changedRightToWrong is true only when an earlier pick was right and the final one is wrong', () => {
    expect(changedRightToWrong(answer(['b'], [['a']]), Q)).toBe(true);
    expect(changedRightToWrong(answer(['c'], [['b'], ['a']]), Q)).toBe(true);
    expect(changedRightToWrong(answer(['b'], [['c']]), Q)).toBe(false);
    expect(changedRightToWrong(answer(['a'], [['b']]), Q)).toBe(false);
    expect(changedRightToWrong(answer(['b'], []), Q)).toBe(false);
  });

  it('labels the three causes', () => {
    expect(CAUSE_LABELS).toEqual({
      unknown: "Didn't know",
      confused: 'Confused it with another',
      misread: 'Misread',
    });
  });
});

describe('results lines', () => {
  it('scores in raw percentages, rounded down', () => {
    expect(scoreLine(result(52, 65))).toBe('Score 52/65 (80%)');
    expect(scoreLine(result(51, 65))).toBe('Score 51/65 (78%)');
    expect(scoreLine(result(0, 0))).toBe('Score 0/0 (0%)');
  });

  it('says whether a boss passed, with XP on the first pass only', () => {
    expect(bossLine(result(12, 15), true, 100)).toBe('Passed. +100 XP');
    expect(bossLine(result(15, 15), false, 0)).toBe('Passed.');
    expect(bossLine(result(11, 15), true, 0)).toBe('Not passed: 12/15 passes. The next boss opens in 20 h.');
  });

  it('names the scored items and the real exam unscored ones', () => {
    expect(scoredLine(65)).toBe(
      '65 items scored. The real exam adds 15 unscored items you cannot tell apart.',
    );
    expect(scoredLine(64)).toBe(
      '64 items scored. The real exam adds 15 unscored items you cannot tell apart.',
    );
  });

  it('writes a domain bar line', () => {
    expect(domainLine('Cloud Concepts', 12, 16)).toBe('Cloud Concepts 12/16 (75%)');
  });

  it('writes the badge line for one and for two badges', () => {
    expect(badgeEarnedLine(['First Brew'])).toBe('Badge: First Brew');
    expect(badgeEarnedLine(['First Brew', 'Pass Mark'])).toBe('Badge: First Brew · Pass Mark');
  });

  it('badgesIn finds only badges earned inside the session', () => {
    const badges = new Map([
      ['pass-mark', { day: '2026-10-27', eventId: '01JA00000000000000000000T1' }],
      ['first-brew', { day: '2026-10-10', eventId: '01JA00000000000000000000B1' }],
      ['full-dress-rehearsal', { day: '2026-10-27', eventId: '01JA00000000000000000000T1' }],
    ]);
    const inside = new Set(['01JA00000000000000000000A1', '01JA00000000000000000000T1']);
    expect(badgesIn(badges, inside).sort()).toEqual(['full-dress-rehearsal', 'pass-mark']);
    expect(badgesIn(badges, new Set())).toEqual([]);
  });
});

describe('dates and the mock list', () => {
  it('shortDate reads a study day in UTC', () => {
    expect(shortDate('2026-10-14')).toBe('Oct 14');
    expect(shortDate('2026-11-01')).toBe('Nov 1');
  });

  it('says what the mock list shows before any mock (spec 7.7)', () => {
    expect(MOCKS_EMPTY).toBe('4 exam forms. Best after about 7 bosses.');
  });

  it('takenLine dates and scores a first attempt', () => {
    expect(
      takenLine({
        form: 'A',
        sid: SID,
        percent: 0.8,
        day: '2026-10-27',
        at: '2026-10-27T11:30:00.000Z',
        correct: 52,
        total: 65,
      }),
    ).toBe('Taken Oct 27 · 52/65 (80%)');
  });
});
