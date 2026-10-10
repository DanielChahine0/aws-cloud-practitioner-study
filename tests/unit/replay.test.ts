import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import {
  type ContentRefs,
  derive,
  ENGINE_VERSION,
  openSession,
  snapshotOf,
} from '../../src/engine/replay.ts';
import { eventsOf, SID, SID2 } from '../fixtures/events.ts';

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
  it('has engine version 2', () => {
    expect(ENGINE_VERSION).toBe(2);
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
    const refs: ContentRefs = { questions: new Map([['q1', 1]]), notes: new Set(['m01/a']) };
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
