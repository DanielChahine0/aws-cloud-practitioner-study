import { describe, expect, it } from 'vitest';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { deriveMemory, isDue, type MemoryContent } from '../../src/engine/memory.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf } from '../fixtures/memory.ts';

/**
 * Replay applied each exam date from its settings event on, re-capping every card from its uncapped due.
 * Whether an answer makes an FSRS update depends on the capped due at the time (spec 3.1), so the current
 * dues kept or dropped updates that the current exam date decides differently (spec 3.6): a date set late
 * left the day's answered cards due all day with no way to clear them, and a moved or cleared date started
 * from reviews the current date never counts.
 * A same-day date change also left that day's catch-up plan built from the old dues, so the queue offered a
 * plan the replay never counted and the day failed to qualify.
 */
type Log = (readonly [string, NewEvent])[];

const FIVE = ['c-01', 'c-02', 'c-03', 'c-04', 'c-05'];
const CONTENT = contentOf(FIVE.map((id) => ({ id, module: 1 })));
const setExam = (examDate: string | null): NewEvent => ({ t: 'settings', patch: { examDate } });
const isSettings = ([, e]: readonly [string, NewEvent]) => e.t === 'settings';

/** Three right answers on 2026-09-01, 09-04 and 09-18, which put each card due on 2026-11-14. */
const built = (ids: readonly string[]): Log =>
  ['2026-09-01', '2026-09-04', '2026-09-18'].flatMap((d, i) =>
    ids.map(
      (c, j) =>
        [
          at(d, 17 + Math.floor(j / 60), j % 60),
          answerOf({ concept: c, correct: true, sure: true, mode: 'check', qid: `q-${c}-${i}` }),
        ] as const,
    ),
  );

const answers = (day: string, hour: number, mode: 'focus' | 'review', tag: string): Log =>
  FIVE.map(
    (c, i) =>
      [
        at(day, hour, i),
        answerOf({ concept: c, correct: true, sure: true, mode, qid: `q-${c}-${tag}` }),
      ] as const,
  );

const duesOf = (events: readonly StudyEvent[], content: MemoryContent = CONTENT) => {
  const m = deriveMemory(events, content);
  return FIVE.map((c) => m.concepts.get(c)?.card?.due);
};

/** Spec 3.6: the dues the current exam date gives, as if it had been set before every answer. */
const specDues = (log: Log, examDate: string | null) =>
  duesOf(
    timelineOf([
      ...(examDate === null ? [] : [[at('2026-08-01', 9), setExam(examDate)] as const]),
      ...log.filter((x) => !isSettings(x)),
    ]),
  );

/** The XP and qualifying days of every study day before `day`, which a later exam date must not rewrite. */
const pastOf = (events: readonly StudyEvent[], day: string) => {
  const m = deriveMemory(events, CONTENT);
  return {
    xp: [...m.xpByDay].filter(([d]) => d < day),
    qualifying: [...m.qualifyingDays].filter((d) => d < day),
  };
};

const expectSpec = (log: Log, examDate: string | null, changedOn: string) => {
  const events = timelineOf(log);
  expect(duesOf(events)).toEqual(specDues(log, examDate));
  const last = log.findLastIndex(isSettings);
  const before = timelineOf(log.slice(0, last));
  expect(pastOf(events, changedOn)).toEqual(pastOf(before, changedOn));
};

describe('the current exam date decides every current due, past days stay as they were', () => {
  it('counts the answers of a day whose exam date is set later that day, so the cards leave the queue', () => {
    const log: Log = [
      ...built(FIVE),
      ...answers('2026-10-07', 8, 'focus', 'f'),
      [at('2026-10-07', 9), setExam('2026-10-08')],
      ...answers('2026-10-07', 10, 'review', 'r'),
    ];
    expectSpec(log, '2026-10-08', '2026-10-07');
    const m = deriveMemory(timelineOf(log), CONTENT);
    const noon = new Date(at('2026-10-07', 12));
    for (const c of FIVE) {
      const card = m.concepts.get(c)?.card;
      expect(card && isDue(card, noon, 0)).toBe(false);
    }
    expect(m.qualifyingDays.has('2026-10-07')).toBe(true);
  });

  it('judges answers between an earlier exam date and the move by the current date', () => {
    const log: Log = [
      [at('2026-08-31', 9), setExam('2026-11-30')],
      ...built(FIVE),
      ...answers('2026-10-03', 8, 'focus', 'f'),
      [at('2026-10-07', 9), setExam('2026-10-08')],
    ];
    expectSpec(log, '2026-10-08', '2026-10-07');
  });

  it('never re-caps a moved-later date from a review the current date does not count', () => {
    const log: Log = [
      [at('2026-08-31', 9), setExam('2026-10-08')],
      ...built(FIVE),
      ...answers('2026-10-06', 8, 'review', 'r'),
      [at('2026-10-07', 9), setExam('2026-12-31')],
    ];
    expectSpec(log, '2026-12-31', '2026-10-07');
  });

  it('drops the updates that existed only because of a cleared exam date', () => {
    const log: Log = [
      [at('2026-08-31', 9), setExam('2026-10-08')],
      ...built(FIVE),
      ...answers('2026-10-06', 8, 'review', 'r'),
      [at('2026-10-06', 9), setExam(null)],
    ];
    expectSpec(log, null, '2026-10-06');
  });

  it('re-caps already capped cards with reviews in between from the current date', () => {
    const log: Log = [
      [at('2026-08-31', 9), setExam('2026-10-20')],
      ...built(FIVE),
      ...answers('2026-10-12', 8, 'review', 'r'),
      [at('2026-10-13', 9), setExam('2026-10-15')],
    ];
    expectSpec(log, '2026-10-15', '2026-10-13');
  });
});

describe('a same-day exam date change rebuilds that day catch-up plan', () => {
  const MANY = Array.from({ length: 110 }, (_, i) => `k-${String(i + 1).padStart(3, '0')}`);
  const content = contentOf(MANY.map((id) => ({ id, module: 1 })));

  it('stores the plan the queue offers and counts the day once the plan is answered', () => {
    const day = '2026-10-08';
    const head: Log = [...built(MANY), [at(day, 9), setExam('2026-10-09')]];
    const opened = deriveMemory(timelineOf(head), content);
    const plan = opened.catchUpPlans.get(day) ?? [];
    expect(plan).toHaveLength(60);
    const work: Log = plan.map(
      (c, i) =>
        [
          at(day, 10 + Math.floor(i / 60), i % 60),
          answerOf({ concept: c, correct: true, sure: true, mode: 'review', qid: `q-${c}-r` }),
        ] as const,
    );
    const m = deriveMemory(timelineOf([...head, ...work]), content);
    expect(m.catchUpPlans.get(day)).toEqual(plan);
    expect(m.qualifyingDays.has(day)).toBe(true);
  });
});
