import { describe, expect, it } from 'vitest';
import type { BadgeView, QuestionView } from '../../schemas/chunks.ts';
import {
  badgeLine,
  calibrationLine,
  causeLine,
  changeCounts,
  changeVerdict,
  dayStrip,
  domainValueLine,
  memoryMockLine,
  mockLine,
  RESET_WORD,
  rankLine,
} from '../../src/app/progress-lines.ts';
import type { AnswerRecord } from '../../src/engine/replay.ts';

const badge = (over: Partial<BadgeView>): BadgeView => ({
  id: 'first-brew',
  name: 'First Brew',
  rule: 'Finish your first lesson check.',
  arrives: null,
  ...over,
});

const single: QuestionView = {
  id: 'q-made-up-1',
  version: 1,
  concept: 'c-made-up',
  note: 'm01/made-up',
  type: 'single',
  stem: 'Made-up stem.',
  options: [
    { id: 'a', text: 'Made-up right', correct: true, why: 'Made-up why.' },
    { id: 'b', text: 'Made-up wrong', correct: false, why: 'Made-up why.' },
  ],
  takeaway: 'Made-up takeaway.',
  read: { route: '#/m/01/l/made-up', text: 'Made-up evidence.' },
} as unknown as QuestionView;

const record = (picked: string[], changes: string[][], correct: boolean): AnswerRecord =>
  ({
    id: `e-${picked.join('')}-${changes.length}`,
    qid: 'q-made-up-1',
    qv: 1,
    sid: 'S1',
    mode: 'mock',
    at: '2026-10-27T10:00:00.000Z',
    day: '2026-10-27',
    correct,
    sure: false,
    picked,
    concept: 'c-made-up',
    relearn: false,
    flagged: false,
    changes,
  }) as AnswerRecord;

describe('dayStrip', () => {
  it('holds the 14 study days ending today, oldest first, with 0 for a day without XP', () => {
    const strip = dayStrip(
      new Map([
        ['2026-10-14', 40],
        ['2026-10-01', 15],
        ['2026-09-30', 99],
      ]),
      '2026-10-14',
    );
    expect(strip).toHaveLength(14);
    expect(strip[0]).toEqual({ day: '2026-10-01', xp: 15 });
    expect(strip[12]).toEqual({ day: '2026-10-13', xp: 0 });
    expect(strip[13]).toEqual({ day: '2026-10-14', xp: 40 });
  });

  it('crosses a month end', () => {
    expect(dayStrip(new Map(), '2026-11-03')[0]?.day).toBe('2026-10-21');
  });
});

describe('Progress lines', () => {
  it('writes calibration with floored percentages', () => {
    expect(calibrationLine({ sure: { right: 103, total: 120 }, notSure: { right: 42, total: 60 } })).toBe(
      'Sure: 85% right (120) · Not sure: 70% right (60)',
    );
    expect(calibrationLine({ sure: { right: 3, total: 3 }, notSure: { right: 0, total: 0 } })).toBe(
      'Sure: 100% right (3) · Not sure: none yet',
    );
    expect(calibrationLine({ sure: { right: 0, total: 0 }, notSure: { right: 0, total: 0 } })).toBe(
      'No counted answers yet.',
    );
  });

  it('counts each cause', () => {
    expect(causeLine({ unknown: 4, confused: 2, misread: 1 })).toBe(
      "Didn't know 4 · Confused it with another 2 · Misread 1",
    );
    expect(causeLine({ unknown: 0, confused: 0, misread: 0 })).toBe('No error causes yet.');
  });

  it('says whether changing answers has helped', () => {
    expect(changeVerdict(0, 0)).toBe('No changed answers yet.');
    expect(changeVerdict(5, 2)).toBe(
      'Changing answers: 5 wrong to right, 2 right to wrong. So far it has helped.',
    );
    expect(changeVerdict(1, 3)).toBe(
      'Changing answers: 1 wrong to right, 3 right to wrong. So far it has hurt.',
    );
    expect(changeVerdict(2, 2)).toBe(
      'Changing answers: 2 wrong to right, 2 right to wrong. So far it has made no difference.',
    );
  });

  it('counts wrong-to-right and right-to-wrong changes', () => {
    const questions = new Map([[single.id, single]]);
    expect(
      changeCounts(
        [record(['a'], [['b']], true), record(['b'], [['a']], false), record(['a'], [], true)],
        questions,
      ),
    ).toEqual({ wrongToRight: 1, rightToWrong: 1 });
  });

  it('shows a badge as earned, as its rule, or as arriving later', () => {
    expect(badgeLine(badge({}), { day: '2026-10-12', eventId: 'E1' })).toBe('First Brew · earned Oct 12');
    expect(badgeLine(badge({}), undefined)).toBe('First Brew · Finish your first lesson check.');
    expect(badgeLine(badge({ name: 'Hands On', arrives: 'labs' }), undefined)).toBe(
      'Hands On · arrives with labs',
    );
    expect(badgeLine(badge({ name: 'Architect', arrives: 'capstone' }), undefined)).toBe(
      'Architect · arrives with the capstone',
    );
  });

  it('writes a mock row with the exam-style date and the raw score', () => {
    const attempt = {
      form: 'A',
      sid: 'S1',
      percent: 52 / 65,
      day: '2026-10-27',
      at: '2026-10-27T11:30:00.000Z',
      correct: 52,
      total: 65,
    };
    expect(mockLine(attempt)).toBe('Mock A · Tue 27 Oct · 52/65 (80%)');
    expect(mockLine({ ...attempt, form: 'remix', correct: 40, percent: 40 / 65 })).toBe(
      'Remix · Tue 27 Oct · 40/65 (61%)',
    );
  });

  it('writes the rank, memory and mock, and domain lines', () => {
    expect(rankLine('Business Support+')).toBe('Rank Business Support+');
    expect(memoryMockLine(0.587, 0.66)).toBe('Memory 58 · Mock 66');
    expect(memoryMockLine(0.587, null)).toBe('Memory 58 · Mock -');
    expect(domainValueLine('Cloud Concepts', 0.629)).toBe('Cloud Concepts 62');
  });

  it('asks for the reset word in capitals', () => {
    expect(RESET_WORD).toBe('RESET');
  });
});
