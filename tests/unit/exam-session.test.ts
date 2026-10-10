import { describe, expect, it } from 'vitest';
import type { ExamItemRef, QuestionView } from '../../schemas/chunks.ts';
import {
  addTime,
  countsLine,
  examDraftOf,
  gridLabel,
  newDraft,
  pick,
  remixTargets,
  submitEvents,
  toggleFlag,
} from '../../src/app/exam-session.ts';
import { derive, type SessionState } from '../../src/engine/replay.ts';
import { eventsOf, SID, SID2 } from '../fixtures/events.ts';

/** A made-up bakery item: option `a` is right for a single, `a` and `b` for a multi. */
const item = (id: string, type: 'single' | 'multi' = 'single', version = 1): QuestionView => ({
  id,
  version,
  type,
  concept: `concept-${id}`,
  note: 'm01/starters',
  task: '1.1',
  level: 1,
  stem: 'Which jar holds the starter?',
  select: type === 'multi' ? 2 : null,
  options: ['a', 'b', 'c', 'd'].map((o) => ({
    id: o,
    text: `Jar ${o}`,
    correct: o === 'a' || (type === 'multi' && o === 'b'),
    why: 'Because of the label.',
  })),
  pairs: [],
  takeaway: 'Label the jars.',
  read: { route: '#/m/01/l/starters', text: 'Label the jars.' },
});
const QUESTIONS = new Map([
  ['x-one', item('x-one')],
  ['x-two', item('x-two', 'multi', 2)],
  ['x-three', item('x-three')],
]);
const SESSION: SessionState = (() => {
  const p = derive(
    eventsOf({
      t: 'session',
      sid: SID,
      mode: 'mock',
      phase: 'start',
      seed: 42,
      form: 'A',
      qids: ['x-one', 'x-two', 'x-three'],
      deadline: '2026-10-10T09:30:00.000Z',
    }),
    null,
  );
  const s = p.sessions.get(SID);
  if (s === undefined) throw new Error('no session');
  return s;
})();

describe('pick', () => {
  it('logs the previous non-empty pick when it changes, and nothing for a first pick or the same pick', () => {
    let d = pick(newDraft(SID), 'x-one', ['a']);
    expect(d.changes).toEqual({});
    d = pick(d, 'x-one', ['a']);
    expect(d.changes).toEqual({});
    d = pick(d, 'x-one', ['c']);
    d = pick(d, 'x-one', ['d']);
    expect(d.picks['x-one']).toEqual(['d']);
    expect(d.changes).toEqual({ 'x-one': [['a'], ['c']] });
  });

  it('treats a multi pick as a set', () => {
    const d = pick(pick(newDraft(SID), 'x-two', ['a', 'b']), 'x-two', ['b', 'a']);
    expect(d.changes).toEqual({});
  });
});

describe('toggleFlag and addTime', () => {
  it('flags and unflags, and sums the time on screen', () => {
    const d = toggleFlag(toggleFlag(toggleFlag(newDraft(SID), 'x-one'), 'x-two'), 'x-one');
    expect(d.flagged).toEqual(['x-two']);
    expect(addTime(addTime(d, 'x-two', 1500.4), 'x-two', 2000).ms).toEqual({ 'x-two': 3500 });
    expect(addTime(d, 'x-two', -5)).toBe(d);
  });
});

describe('submitEvents', () => {
  it('writes one answer per item in session order, unanswered items wrong with an empty pick, then the submit', () => {
    let d = pick(newDraft(SID), 'x-one', ['b']);
    d = pick(d, 'x-one', ['a']);
    d = pick(d, 'x-two', ['a', 'c']);
    d = toggleFlag(d, 'x-two');
    d = addTime(d, 'x-one', 4000);
    expect(submitEvents({ draft: d, session: SESSION, questions: QUESTIONS, mode: 'mock' })).toEqual([
      {
        t: 'answer',
        sid: SID,
        mode: 'mock',
        qid: 'x-one',
        qv: 1,
        concept: 'concept-x-one',
        picked: ['a'],
        correct: true,
        sure: false,
        ms: 4000,
        changes: [['b']],
      },
      {
        t: 'answer',
        sid: SID,
        mode: 'mock',
        qid: 'x-two',
        qv: 2,
        concept: 'concept-x-two',
        picked: ['a', 'c'],
        correct: false,
        sure: false,
        ms: 0,
        flagged: true,
      },
      {
        t: 'answer',
        sid: SID,
        mode: 'mock',
        qid: 'x-three',
        qv: 1,
        concept: 'concept-x-three',
        picked: [],
        correct: false,
        sure: false,
        ms: 0,
      },
      { t: 'session', sid: SID, mode: 'mock', phase: 'submit', seed: 42 },
    ]);
  });

  it('leaves out an item whose text is not loaded, which the score still counts as wrong', () => {
    const questions = new Map([['x-one', item('x-one')]]);
    const events = submitEvents({ draft: newDraft(SID), session: SESSION, questions, mode: 'mock' });
    expect(events.map((e) => (e.t === 'answer' ? e.qid : e.t))).toEqual(['x-one', 'session']);
  });
});

describe('examDraftOf', () => {
  it('reads back a draft written for this session', () => {
    const d = toggleFlag(pick(newDraft(SID), 'x-one', ['a']), 'x-one');
    expect(examDraftOf(JSON.parse(JSON.stringify({ ...d, current: 2 })), SID)).toEqual({ ...d, current: 2 });
  });

  it('rejects a draft for another session or a malformed value', () => {
    expect(examDraftOf(newDraft(SID2), SID)).toBeNull();
    expect(examDraftOf(null, SID)).toBeNull();
    expect(examDraftOf('draft', SID)).toBeNull();
    expect(examDraftOf({ ...newDraft(SID), picks: { 'x-one': 'a' } }, SID)).toBeNull();
    expect(examDraftOf({ ...newDraft(SID), flagged: [1] }, SID)).toBeNull();
    expect(examDraftOf({ ...newDraft(SID), changes: { 'x-one': ['a'] } }, SID)).toBeNull();
    expect(examDraftOf({ ...newDraft(SID), ms: { 'x-one': -1 } }, SID)).toBeNull();
    expect(examDraftOf({ ...newDraft(SID), current: 1.5 }, SID)).toBeNull();
    expect(examDraftOf({ sid: SID }, SID)).toBeNull();
  });
});

describe('the grid and the counts', () => {
  it('names each grid button by its number, whether it is answered, and whether it is flagged', () => {
    expect(gridLabel(3, true, true)).toBe('Question 3, answered, flagged');
    expect(gridLabel(4, false, false)).toBe('Question 4, unanswered');
    expect(gridLabel(5, false, true)).toBe('Question 5, unanswered, flagged');
  });

  it('counts unanswered and flagged items', () => {
    expect(countsLine(3, 2)).toBe('3 unanswered, 2 flagged.');
    expect(countsLine(0, 0)).toBe('0 unanswered, 0 flagged.');
  });
});

describe('remixTargets', () => {
  it('takes each task and multi-response count as the largest over the forms', () => {
    const ref = (form: string, task: string, type: 'single' | 'multi'): ExamItemRef => ({
      version: 1,
      concept: `c-${task}`,
      task,
      form,
      type,
    });
    const items = {
      'x-1': ref('A', '1.1', 'single'),
      'x-2': ref('A', '1.1', 'multi'),
      'x-3': ref('A', '3.2', 'multi'),
      'x-4': ref('B', '1.1', 'single'),
      'x-5': ref('B', '3.2', 'multi'),
      'x-6': ref('B', '2.2', 'multi'),
    };
    expect(remixTargets(items)).toEqual({
      tasks: { '1.1': 2, '2.2': 1, '3.2': 1 },
      multi: { '1': 1, '2': 1, '3': 1, '4': 0 },
    });
  });
});
