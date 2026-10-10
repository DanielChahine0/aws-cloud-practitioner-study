import { describe, expect, it } from 'vitest';
import {
  firstTryOf,
  INCIDENT_LOCKED,
  INCIDENT_NONE,
  INCIDENT_SOLVED,
  incidentLabel,
  incidentPaidLine,
  modulesRead,
} from '../../src/app/incident.ts';
import type { AnswerRecord, SessionState } from '../../src/engine/replay.ts';
import { fnv1a } from '../../src/engine/rng.ts';

/** The days `tests/e2e/incident.spec.ts` runs on, which must pick different incidents of a two-way tie. */
const DAY1 = '2026-10-20';
const DAY2 = '2026-10-21';

const answer = (qid: string, correct: boolean): AnswerRecord => ({
  id: `01JA0000000000000000000${qid.slice(-3).toUpperCase()}`,
  qid,
  qv: 1,
  sid: '01JA00000000000000000000S1',
  mode: 'incident',
  at: '2026-10-20T10:00:00.000Z',
  day: DAY1,
  correct,
  sure: true,
  picked: ['a'],
  concept: 'proof-box',
  relearn: false,
  flagged: false,
  changes: [],
});

const session = (answers: readonly AnswerRecord[], qids = ['q-aaa', 'q-bbb']): SessionState => ({
  sid: '01JA00000000000000000000S1',
  mode: 'incident',
  scope: 'inc-001',
  seed: 1,
  qids,
  answers: new Map(answers.map((a) => [a.qid, a])),
  startedAt: '2026-10-20T09:59:00.000Z',
  submittedAt: null,
  abandoned: false,
  form: null,
  deadline: null,
  submitId: null,
});

describe('incident copy (spec 4.5, 7.2)', () => {
  it('words every line exactly', () => {
    expect(INCIDENT_LOCKED).toBe('Starts after Module 2.');
    expect(INCIDENT_NONE).toBe('No incident today.');
    expect(INCIDENT_SOLVED).toBe('Solved. The next incident comes tomorrow.');
    expect(incidentLabel('The cold ovens')).toBe('Incident "The cold ovens"');
    expect(incidentPaidLine(15)).toBe('Incident solved. Plus 15 XP.');
    expect(incidentPaidLine(8)).toBe('Incident solved. Plus 8 XP.');
    expect(incidentPaidLine(0)).toBe('Incident solved.');
  });
});

describe('firstTryOf', () => {
  it('is true only when every step has a correct answer', () => {
    expect(firstTryOf(session([answer('q-aaa', true), answer('q-bbb', true)]))).toBe(true);
    expect(firstTryOf(session([answer('q-aaa', true), answer('q-bbb', false)]))).toBe(false);
    expect(firstTryOf(session([answer('q-aaa', true)]))).toBe(false);
    expect(firstTryOf(session([], []))).toBe(false);
  });
});

describe('modulesRead', () => {
  it('needs every lesson of the module in lessonsDone, and is false for an unknown module', () => {
    const modules = [{ n: 2, lessons: [{ slug: 'a' }, { slug: 'b' }] }];
    expect(modulesRead(modules, new Map([['m02/a', 't']]))(2)).toBe(false);
    expect(
      modulesRead(
        modules,
        new Map([
          ['m02/a', 't'],
          ['m02/b', 't'],
        ]),
      )(2),
    ).toBe(true);
    expect(modulesRead(modules, new Map())(9)).toBe(false);
  });
});

describe('the end-to-end days', () => {
  it('give different fnv1a parities, so a two-way tie changes between them', () => {
    expect(fnv1a(DAY1) % 2).not.toBe(fnv1a(DAY2) % 2);
  });
});
