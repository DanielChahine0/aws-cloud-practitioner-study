import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { type LessonRef, type NextInput, nextAction, nextMinutes } from '../../src/engine/next.ts';
import type { ReviewQueue } from '../../src/engine/queue.ts';
import { derive } from '../../src/engine/replay.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import { answerOf, at, startOf, submitOf } from '../fixtures/memory.ts';

const lesson = (module: number, slug: string, first: boolean, checkConcepts: number): LessonRef => ({
  note: `m${String(module).padStart(2, '0')}/${slug}`,
  module,
  slug,
  title: `Lesson ${slug}`,
  first,
  minutes: 6,
  checkConcepts,
});

const LESSONS: LessonRef[] = [
  lesson(1, 'welcome', true, 0),
  lesson(1, 'shared-kitchen', false, 2),
  lesson(2, 'ovens', true, 3),
  lesson(2, 'proofing', false, 2),
  lesson(3, 'flour', true, 1),
];
const [WELCOME, KITCHEN, OVENS, PROOFING, FLOUR] = LESSONS as [
  LessonRef,
  LessonRef,
  LessonRef,
  LessonRef,
  LessonRef,
];

const queueOf = (items: readonly string[], lessonsAllowed = true): ReviewQueue => ({
  items,
  due: items.length,
  misconceptions: 0,
  catchUp: false,
  newToday: 0,
  lessonsAllowed,
  next: null,
});

const done = (note: string): NewEvent => ({ t: 'lesson.done', note });

const inputOf = (
  log: readonly (readonly [string, NewEvent])[],
  overrides: Partial<NextInput> = {},
): NextInput => ({
  lessons: LESSONS,
  progress: derive(timelineOf(log), null),
  queue: queueOf([]),
  currentLesson: null,
  today: '2026-10-10',
  tz: 0,
  ...overrides,
});

describe('nextAction', () => {
  it('starts Module 1 on the first run', () => {
    expect(nextAction(inputOf([]))).toEqual({ kind: 'lesson', lesson: WELCOME });
  });

  it('takes each action ahead of the ones after it', () => {
    const openCheck = [
      [at('2026-10-10', 9), done(KITCHEN.note)],
      [at('2026-10-10', 9, 1), startOf(SID, 'check', ['q-a', 'q-b', 'q-c'], KITCHEN.note)],
      [at('2026-10-10', 9, 2), answerOf({ concept: 'a', qid: 'q-a', correct: true, sure: true })],
    ] as const;
    const all = { queue: queueOf(['a', 'b']), currentLesson: OVENS.note };
    const resume = nextAction(inputOf(openCheck, all));
    expect(resume.kind).toBe('resume');
    if (resume.kind === 'resume') {
      expect(resume.session.sid).toBe(SID);
      expect(resume.left).toBe(2);
    }

    const submitted = [...openCheck, [at('2026-10-10', 9, 3), submitOf(SID, 'check')] as const];
    expect(nextAction(inputOf(submitted, all))).toEqual({ kind: 'review', count: 2 });
    expect(nextAction(inputOf(submitted, { currentLesson: OVENS.note }))).toEqual({
      kind: 'continue',
      lesson: OVENS,
    });

    const readOnly = [[at('2026-10-10', 9), done(KITCHEN.note)]] as const;
    expect(nextAction(inputOf(readOnly))).toEqual({ kind: 'check', module: 1, concepts: 2, lesson: KITCHEN });
    expect(nextAction(inputOf(submitted))).toEqual({ kind: 'lesson', lesson: WELCOME });

    const everything = LESSONS.map((l, i) => [at('2026-10-10', 9, i), done(l.note)] as const);
    const checks = LESSONS.filter((l) => l.checkConcepts > 0).flatMap((l, i) => [
      [at('2026-10-10', 10, 2 * i), startOf(SID2, 'check', [], l.note)] as const,
      [at('2026-10-10', 10, 2 * i + 1), submitOf(SID2, 'check')] as const,
    ]);
    expect(nextAction(inputOf([...everything, ...checks]))).toEqual({ kind: 'done' });
  });

  it('caps the review at one chunk of 20', () => {
    const items = Array.from({ length: 31 }, (_, i) => `c${i}`);
    expect(nextAction(inputOf([], { queue: queueOf(items) }))).toEqual({ kind: 'review', count: 20 });
  });

  it('resumes a review started today but never one from an earlier study day', () => {
    const review = (day: string) =>
      [
        [at(day, 9), startOf(SID2, 'review', ['q-a', 'q-b'], 'review')],
        [
          at(day, 9, 1),
          answerOf({ concept: 'a', qid: 'q-a', mode: 'review', sid: SID2, correct: true, sure: true }),
        ],
      ] as const;
    const today = nextAction(inputOf(review('2026-10-10'), { queue: queueOf(['b']) }));
    expect(today.kind).toBe('resume');
    expect(nextAction(inputOf(review('2026-10-09'), { queue: queueOf(['b']) }))).toEqual({
      kind: 'review',
      count: 1,
    });
  });

  it('never resumes a session with every question answered, or one that was abandoned', () => {
    const answered = [
      [at('2026-10-10', 9), startOf(SID, 'quiz', ['q-a'], 'm01')],
      [
        at('2026-10-10', 9, 1),
        answerOf({ concept: 'a', qid: 'q-a', mode: 'quiz', correct: true, sure: true }),
      ],
    ] as const;
    expect(nextAction(inputOf(answered)).kind).toBe('lesson');
    const abandoned = [
      [at('2026-10-10', 9), startOf(SID, 'quiz', ['q-a'], 'm01')],
      [
        at('2026-10-10', 9, 1),
        { t: 'session', sid: SID, mode: 'quiz', phase: 'abandon', seed: 7 } as NewEvent,
      ],
    ] as const;
    expect(nextAction(inputOf(abandoned)).kind).toBe('lesson');
  });

  it('continues only a known lesson that is not done', () => {
    expect(nextAction(inputOf([], { currentLesson: PROOFING.note }))).toEqual({
      kind: 'continue',
      lesson: PROOFING,
    });
    expect(nextAction(inputOf([], { currentLesson: 'm09/unknown' }))).toEqual({
      kind: 'lesson',
      lesson: WELCOME,
    });
    const read = [[at('2026-10-10', 9), done(PROOFING.note)]] as const;
    expect(nextAction(inputOf(read, { currentLesson: PROOFING.note }))).toEqual({
      kind: 'check',
      module: 2,
      concepts: 2,
      lesson: PROOFING,
    });
  });

  it('offers Check yourself for read lessons that now have questions, in the earliest module, with its concept total', () => {
    const log = [
      [at('2026-10-10', 9), done(WELCOME.note)],
      [at('2026-10-10', 9, 1), done(OVENS.note)],
      [at('2026-10-10', 9, 2), done(PROOFING.note)],
      [at('2026-10-10', 9, 3), done(FLOUR.note)],
    ] as const;
    expect(nextAction(inputOf(log))).toEqual({ kind: 'check', module: 2, concepts: 5, lesson: OVENS });
  });

  it('gives way to Done for today when no lesson may start', () => {
    const read = [[at('2026-10-10', 9), done(KITCHEN.note)]] as const;
    expect(nextAction(inputOf(read, { queue: queueOf([], false) }))).toEqual({ kind: 'done' });
    expect(nextAction(inputOf([], { queue: queueOf([], false) }))).toEqual({ kind: 'done' });
    expect(nextAction(inputOf([], { queue: queueOf([], false), currentLesson: OVENS.note }))).toEqual({
      kind: 'continue',
      lesson: OVENS,
    });
  });
});

describe('nextMinutes', () => {
  it('counts 30 seconds per item, rounded up, and a lesson its own minutes', () => {
    expect(nextMinutes({ kind: 'review', count: 18 })).toBe(9);
    expect(nextMinutes({ kind: 'review', count: 1 })).toBe(1);
    expect(nextMinutes({ kind: 'check', module: 2, concepts: 5, lesson: OVENS })).toBe(3);
    expect(nextMinutes({ kind: 'lesson', lesson: WELCOME })).toBe(6);
    expect(nextMinutes({ kind: 'continue', lesson: OVENS })).toBe(6);
    expect(nextMinutes({ kind: 'done' })).toBeNull();
  });

  it('counts the questions left in a resumed session', () => {
    const progress = derive(
      timelineOf([[at('2026-10-10', 9), startOf(SID, 'quiz', ['a', 'b', 'c'], 'm01')]]),
      null,
    );
    const s = progress.sessions.get(SID);
    if (!s) throw new Error('no session');
    expect(nextMinutes({ kind: 'resume', session: s, left: 3 })).toBe(2);
  });
});
