import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import {
  type ContentRefs,
  derive,
  ENGINE_VERSION,
  examsOf,
  openSession,
  practiceForms,
  snapshotOf,
  takenForms,
} from '../../src/engine/replay.ts';
import { eventsOf, SID, SID2 } from '../fixtures/events.ts';
import {
  abandonOf,
  answerOf,
  causeOf,
  examStartOf,
  labDoneOf,
  rankOf,
  startOf,
  submitOf,
} from '../fixtures/memory.ts';

const answer = (qid: string, correct: boolean, sid = SID, concept = 'shared-kitchen'): NewEvent => ({
  t: 'answer',
  sid,
  mode: 'check',
  qid,
  qv: 1,
  concept,
  picked: ['a'],
  correct,
  sure: false,
  ms: 1000,
});

describe('derive', () => {
  it('has engine version 5', () => {
    expect(ENGINE_VERSION).toBe(5);
  });

  it('keeps the first completion of each lab, with its rev and hints, and never replaces it', () => {
    const events = eventsOf(
      labDoneOf('lab-m01-a', 2, 1),
      labDoneOf('lab-m01-a', 0, 2),
      labDoneOf('lab-m01-b'),
    );
    const p = derive(events, null);
    expect(p.labsDone.get('lab-m01-a')).toEqual({
      at: events[0]?.at,
      day: '2026-10-10',
      rev: 1,
      hints: 2,
      eventId: events[0]?.id,
    });
    expect([...p.labsDone.keys()]).toEqual(['lab-m01-a', 'lab-m01-b']);
  });

  it('counts a lab the content does not ship as unknown, and still keeps its completion', () => {
    const refs: ContentRefs = {
      questions: new Map(),
      notes: new Set(),
      labs: new Set(['lab-m01-a']),
      incidents: new Set(),
    };
    const p = derive(eventsOf(labDoneOf('lab-m01-a'), labDoneOf('lab-m09-gone')), refs);
    expect(p.unknownEvents).toBe(1);
    expect(p.labsDone.has('lab-m09-gone')).toBe(true);
  });

  it('records the event id, the concept and the relearn flag of each answer', () => {
    const events = eventsOf(answer('q1', false, SID, 'shared-kitchen'), {
      ...answer('q2', true, SID, 'shared-kitchen'),
      relearn: true,
    } as NewEvent);
    const p = derive(events, null);
    expect(p.answers.get('q1')?.[0]).toMatchObject({
      id: events[0]?.id,
      concept: 'shared-kitchen',
      relearn: false,
    });
    expect(p.answers.get('q2')?.[0]).toMatchObject({
      id: events[1]?.id,
      concept: 'shared-kitchen',
      relearn: true,
    });
  });

  it('scores a check session of 3 with 2 correct as 2/3', () => {
    const events = eventsOf(
      {
        t: 'session',
        sid: SID,
        mode: 'check',
        phase: 'start',
        seed: 7,
        scope: 'm01/x',
        qids: ['q1', 'q2', 'q3'],
      },
      answer('q1', true),
      answer('q2', false),
      answer('q3', true),
      { t: 'session', sid: SID, mode: 'check', phase: 'submit', seed: 7 },
    );
    const p = derive(events, null);
    expect(p.eventCount).toBe(5);
    expect(p.checkScores.get('m01/x')).toEqual({ correct: 2, total: 3, at: events[4]?.at });
    const session = p.sessions.get(SID);
    expect(session?.submittedAt).toBe(events[4]?.at);
    expect(session?.answers.size).toBe(3);
    expect(p.answers.get('q1')).toHaveLength(1);
  });

  it('ignores a second answer to the same question in one session for the score', () => {
    const events = eventsOf(
      { t: 'session', sid: SID, mode: 'check', phase: 'start', seed: 7, scope: 'm01/x', qids: ['q1', 'q2'] },
      answer('q1', false),
      answer('q1', true),
      answer('q2', true),
      { t: 'session', sid: SID, mode: 'check', phase: 'submit', seed: 7 },
    );
    const p = derive(events, null);
    expect(p.checkScores.get('m01/x')).toMatchObject({ correct: 1, total: 2 });
    expect(p.sessions.get(SID)?.answers.get('q1')?.correct).toBe(false);
    expect(p.answers.get('q1')).toHaveLength(2);
  });

  it('remembers the last shown variant per concept, the first lesson.done and the flags', () => {
    const events = eventsOf(
      answer('q1', true, SID, 'shared-kitchen'),
      answer('q2', true, SID, 'shared-kitchen'),
      { t: 'lesson.done', note: 'm01/what-a-bakery-cloud-is' },
      { t: 'lesson.done', note: 'm01/what-a-bakery-cloud-is' },
      { t: 'flag', qid: 'q1', qv: 1, reason: 'typo' },
    );
    const p = derive(events, null);
    expect(p.lastShown.get('shared-kitchen')).toBe('q2');
    expect(p.lessonsDone.get('m01/what-a-bakery-cloud-is')).toBe(events[2]?.at);
    expect(p.flags).toBe(1);
  });

  it('sorts by id before replaying', () => {
    const events = eventsOf(answer('q1', true), answer('q2', true));
    expect(derive([...events].reverse(), null).lastShown.get('shared-kitchen')).toBe('q2');
  });

  it('counts an unknown question or note once, keeps it and never throws', () => {
    const refs: ContentRefs = {
      questions: new Map([['q1', 1]]),
      notes: new Set(['m01/a']),
      labs: new Set(),
      incidents: new Set(),
    };
    const events = eventsOf(answer('q1', true), answer('q-gone', true), {
      t: 'lesson.done',
      note: 'm09/gone',
    });
    const p = derive(events, refs);
    expect(p.unknownEvents).toBe(2);
    expect(p.answers.get('q-gone')).toHaveLength(1);
    expect(p.lessonsDone.has('m09/gone')).toBe(true);
    expect(derive(events, null).unknownEvents).toBe(0);
  });

  it('tolerates an answer to a session that never started and a submit without a start', () => {
    const events = eventsOf(answer('q1', true, SID2), {
      t: 'session',
      sid: SID2,
      mode: 'check',
      phase: 'submit',
      seed: 1,
    });
    expect(() => derive(events, null)).not.toThrow();
    expect(derive(events, null).answers.get('q1')).toHaveLength(1);
  });
});

describe('openSession', () => {
  it('finds the unfinished quiz and ignores a submitted or abandoned one', () => {
    const events = eventsOf(
      { t: 'session', sid: SID, mode: 'quiz', phase: 'start', seed: 1, scope: 'm03', qids: ['q1'] },
      { t: 'session', sid: SID, mode: 'quiz', phase: 'submit', seed: 1 },
      { t: 'session', sid: SID2, mode: 'quiz', phase: 'start', seed: 2, scope: 'm03', qids: ['q2'] },
    );
    expect(openSession(derive(events, null), 'quiz', 'm03')?.sid).toBe(SID2);
    expect(openSession(derive(events.slice(0, 2), null), 'quiz', 'm03')).toBeNull();
    expect(openSession(derive(events, null), 'check', 'm03')).toBeNull();
    expect(openSession(derive(events, null), 'quiz', 'm01')).toBeNull();
    const abandoned = eventsOf(
      { t: 'session', sid: SID, mode: 'quiz', phase: 'start', seed: 1, scope: 'm03', qids: ['q1'] },
      { t: 'session', sid: SID, mode: 'quiz', phase: 'abandon', seed: 1 },
    );
    expect(openSession(derive(abandoned, null), 'quiz', 'm03')).toBeNull();
  });
});

describe('snapshotOf', () => {
  it('turns maps into sorted entry arrays of plain JSON', () => {
    const events = eventsOf(answer('q2', true), answer('q1', false));
    const snapshot = snapshotOf(derive(events, null)) as { answers: [string, unknown][] };
    expect(snapshot.answers.map(([qid]) => qid)).toEqual(['q1', 'q2']);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});

describe('exam sessions in replay (spec 4.1, 4.3, 4.4)', () => {
  const BOSS_QIDS = ['qb1', 'qb2', 'qb3', 'qb4'];
  const DEADLINE = '2026-10-10T08:30:00.000Z';
  const bossAnswer = (qid: string, correct: boolean, picked: string[] = ['a']) =>
    answerOf({ concept: 'oven', correct, sure: false, qid, mode: 'boss', picked });

  it('records a boss result with unanswered items counted in the total', () => {
    const events = eventsOf(
      examStartOf(SID, 'boss', BOSS_QIDS, { scope: 'm01', deadline: DEADLINE }),
      bossAnswer('qb1', true),
      bossAnswer('qb2', false),
      bossAnswer('qb3', false, []),
      submitOf(SID, 'boss'),
    );
    const p = derive(events, null);
    expect(p.exams.get(SID)).toEqual({
      sid: SID,
      mode: 'boss',
      scope: 'm01',
      form: null,
      correct: 1,
      answered: 2,
      total: 4,
      startedAt: events[0]?.at,
      submittedAt: events[4]?.at,
      day: events[4]?.day,
      deadline: DEADLINE,
      timedOut: false,
      submitId: events[4]?.id,
    });
    expect(p.sessions.get(SID)).toMatchObject({ form: null, deadline: DEADLINE, submitId: events[4]?.id });
  });

  it('a second submit of one session changes nothing', () => {
    const once = eventsOf(
      examStartOf(SID, 'boss', BOSS_QIDS, { scope: 'm01', deadline: DEADLINE }),
      bossAnswer('qb1', true),
      submitOf(SID, 'boss'),
    );
    const twice = eventsOf(
      examStartOf(SID, 'boss', BOSS_QIDS, { scope: 'm01', deadline: DEADLINE }),
      bossAnswer('qb1', true),
      submitOf(SID, 'boss'),
      bossAnswer('qb2', true),
      submitOf(SID, 'boss'),
    );
    const first = derive(once, null);
    const second = derive(twice, null);
    expect(second.exams.get(SID)).toEqual(first.exams.get(SID));
    expect(second.sessions.get(SID)?.submittedAt).toBe(once[2]?.at);
    expect(second.sessions.get(SID)?.submitId).toBe(once[2]?.id);
  });

  it('ignores a submit after an abandon', () => {
    const p = derive(
      eventsOf(
        examStartOf(SID, 'boss', BOSS_QIDS, { scope: 'm01', deadline: DEADLINE }),
        abandonOf(SID, 'boss'),
        submitOf(SID, 'boss'),
      ),
      null,
    );
    expect(p.sessions.get(SID)).toMatchObject({ abandoned: true, submittedAt: null, submitId: null });
    expect(p.exams.size).toBe(0);
  });

  it('marks a mock submitted at or after its deadline as timed out', () => {
    const submittedBy = (deadline: string) =>
      eventsOf(
        examStartOf(SID, 'mock', ['qm1'], { form: 'A', deadline }),
        answerOf({ concept: 'oven', correct: true, sure: false, qid: 'qm1', mode: 'mock' }),
        submitOf(SID, 'mock'),
      );
    // The submit is the third event, stamped at 08:02 exactly.
    const atDeadline = submittedBy('2026-10-10T08:02:00.000Z');
    expect(atDeadline[2]?.at).toBe('2026-10-10T08:02:00.000Z');
    expect(derive(atDeadline, null).exams.get(SID)).toMatchObject({ form: 'A', timedOut: true, correct: 1 });
    const afterDeadline = submittedBy('2026-10-10T08:01:00.000Z');
    expect(derive(afterDeadline, null).exams.get(SID)).toMatchObject({
      form: 'A',
      timedOut: true,
      correct: 1,
    });
    const early = eventsOf(
      examStartOf(SID, 'mock', ['qm1'], { form: 'A', deadline: DEADLINE }),
      submitOf(SID, 'mock'),
    );
    expect(derive(early, null).exams.get(SID)).toMatchObject({ timedOut: false, correct: 0, answered: 0 });
  });

  it('keeps the first answer per question, so a second answer never changes the result', () => {
    const p = derive(
      eventsOf(
        examStartOf(SID, 'boss', BOSS_QIDS, { scope: 'm01', deadline: DEADLINE }),
        bossAnswer('qb1', false),
        bossAnswer('qb1', true),
        submitOf(SID, 'boss'),
      ),
      null,
    );
    expect(p.exams.get(SID)).toMatchObject({ correct: 0, answered: 1, total: 4 });
  });

  it('records the flag and the changed picks of an answer', () => {
    const p = derive(
      eventsOf(
        answerOf({
          concept: 'oven',
          correct: false,
          sure: false,
          qid: 'qm1',
          mode: 'mock',
          flagged: true,
          changes: [['a'], ['b']],
        }),
        answerOf({ concept: 'oven', correct: true, sure: true, qid: 'q1' }),
      ),
      null,
    );
    expect(p.answers.get('qm1')?.[0]).toMatchObject({ flagged: true, changes: [['a'], ['b']] });
    expect(p.answers.get('q1')?.[0]).toMatchObject({ flagged: false, changes: [] });
  });

  it('keeps the latest cause per item and collects rank events', () => {
    const p = derive(
      eventsOf(
        causeOf(SID, 'qb1', 'unknown'),
        causeOf(SID, 'qb1', 'misread'),
        causeOf(SID2, 'qb1', 'confused'),
        rankOf('business-support-plus'),
        rankOf('business-support-plus'),
        rankOf('enterprise'),
      ),
      null,
    );
    expect([...p.causes]).toEqual([
      [`${SID} qb1`, 'misread'],
      [`${SID2} qb1`, 'confused'],
    ]);
    expect([...p.ranks]).toEqual(['business-support-plus', 'enterprise']);
  });

  it('counts a started mock as taken, even unsubmitted, and never a remix or a boss', () => {
    const p = derive(
      eventsOf(
        examStartOf(SID, 'mock', ['qm1'], { form: 'B', deadline: DEADLINE }),
        examStartOf(SID2, 'mock', ['qm2'], { form: 'remix', deadline: DEADLINE }),
        examStartOf('01JA00000000000000000000S3', 'boss', ['qb1'], {
          scope: 'm01',
          form: 'C',
          deadline: DEADLINE,
        }),
        startOf('01JA00000000000000000000S4', 'quiz', ['q1'], 'm01'),
      ),
      null,
    );
    expect(p.sessions.get('01JA00000000000000000000S3')?.form).toBe('C');
    expect([...takenForms(p)]).toEqual(['B']);
    expect(p.sessions.get(SID2)?.form).toBe('remix');
  });

  it('lets a form join practice only once its mock is submitted or abandoned, never a remix', () => {
    const S3 = '01JA00000000000000000000S3';
    const p = derive(
      eventsOf(
        examStartOf(SID, 'mock', ['qm1'], { form: 'A', deadline: DEADLINE }),
        submitOf(SID, 'mock'),
        examStartOf(SID2, 'mock', ['qm2'], { form: 'B', deadline: DEADLINE }),
        abandonOf(SID2, 'mock'),
        examStartOf(S3, 'mock', ['qm3'], { form: 'C', deadline: DEADLINE }),
      ),
      null,
    );
    expect([...takenForms(p)].sort()).toEqual(['A', 'B', 'C']);
    expect([...practiceForms(p)].sort()).toEqual(['A', 'B']);
  });

  it('lists exam results by mode and scope in submit order', () => {
    const S3 = '01JA00000000000000000000S3';
    const p = derive(
      eventsOf(
        examStartOf(SID2, 'boss', ['qb1'], { scope: 'm02', deadline: DEADLINE }),
        examStartOf(SID, 'boss', ['qb1'], { scope: 'm01', deadline: DEADLINE }),
        examStartOf(S3, 'mock', ['qm1'], { form: 'A', deadline: DEADLINE }),
        submitOf(SID, 'boss'),
        submitOf(S3, 'mock'),
        submitOf(SID2, 'boss'),
      ),
      null,
    );
    expect(examsOf(p, 'boss').map((r) => r.scope)).toEqual(['m01', 'm02']);
    expect(examsOf(p, 'boss', 'm02').map((r) => r.sid)).toEqual([SID2]);
    expect(examsOf(p, 'mock').map((r) => r.form)).toEqual(['A']);
  });

  it('counts an exam answer to a question the content lacks only when refs are given', () => {
    const events = eventsOf(
      examStartOf(SID, 'mock', ['qm-gone'], { form: 'A', deadline: DEADLINE }),
      answerOf({ concept: 'oven', correct: true, sure: false, qid: 'qm-gone', mode: 'mock' }),
      submitOf(SID, 'mock'),
    );
    const refs: ContentRefs = {
      questions: new Map([['qm1', 1]]),
      notes: new Set(),
      labs: new Set(),
      incidents: new Set(),
    };
    expect(derive(events, refs).unknownEvents).toBe(1);
    expect(derive(events, null).unknownEvents).toBe(0);
    expect(derive(events, refs).exams.get(SID)).toMatchObject({ correct: 1, total: 1 });
  });
});
