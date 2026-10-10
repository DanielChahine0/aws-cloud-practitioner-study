import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import type { BossStatus } from '../../src/engine/boss.ts';
import { mockDeadline } from '../../src/engine/mock.ts';
import {
  extras,
  incidentToday,
  type LessonRef,
  MAX_EXTRAS,
  MOCK_AFTER_BOSSES,
  MOCK_GAP_DAYS,
  type NextInput,
  nextAction,
  nextMinutes,
  weakestLab,
} from '../../src/engine/next.ts';
import type { ReviewQueue } from '../../src/engine/queue.ts';
import { derive } from '../../src/engine/replay.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import {
  answerOf,
  at,
  examStartOf,
  incidentDoneOf,
  incidentOfferedOf,
  startOf,
  submitOf,
} from '../fixtures/memory.ts';

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

describe('resuming an exam (spec 4.6 item 1)', () => {
  it('resumes an open boss and an open mock, whose answers wait for the submit', () => {
    const start = at('2026-10-10', 9);
    const bossLog = [
      [
        start,
        examStartOf(SID2, 'boss', ['q-a', 'q-b'], { scope: 'm01', deadline: mockDeadline(new Date(start)) }),
      ],
    ] as const;
    const resumeBoss = nextAction(inputOf(bossLog, { queue: queueOf(['b']) }));
    expect(resumeBoss).toMatchObject({
      kind: 'resume',
      left: 2,
      session: { sid: SID2, mode: 'boss', scope: 'm01' },
    });
    const mockLog = [
      [
        start,
        examStartOf(SID2, 'mock', ['q-a', 'q-b', 'q-c'], {
          form: 'A',
          deadline: mockDeadline(new Date(start)),
        }),
      ],
    ] as const;
    expect(nextAction(inputOf(mockLog))).toMatchObject({
      kind: 'resume',
      left: 3,
      session: { mode: 'mock', form: 'A' },
    });
    expect(nextAction(inputOf([...mockLog, [at('2026-10-10', 10), submitOf(SID2, 'mock')]])).kind).toBe(
      'lesson',
    );
  });

  it('resumes an open focus quiz', () => {
    const log = [[at('2026-10-10', 9), startOf(SID2, 'focus', ['q-a', 'q-b'], '2.3')]] as const;
    expect(nextAction(inputOf(log))).toMatchObject({ kind: 'resume', left: 2, session: { mode: 'focus' } });
  });
});

describe('extras (spec 4.6)', () => {
  const status = (over: Partial<BossStatus> = {}): BossStatus => ({
    unlocked: true,
    passed: false,
    passedAt: null,
    ready: false,
    cooldownUntil: null,
    open: null,
    attempts: 0,
    ...over,
  });
  const NOW = new Date(at('2026-10-10', 12));
  const passedUpTo = (n: number): [number, BossStatus][] =>
    Array.from({ length: n }, (_, i) => [i + 1, status({ passed: true, passedAt: at('2026-10-09') })]);
  const extrasOf = (
    bosses: [number, BossStatus][],
    log: readonly (readonly [string, NewEvent])[] = [],
    today = '2026-10-10',
    lab: { lab: string; module: number } | null = null,
    incident: string | null = null,
  ) =>
    extras({
      bosses: new Map(bosses),
      progress: derive(timelineOf(log), null),
      today,
      now: NOW,
      lab,
      incident,
    });
  const mockOn = (sid: string, form: string, day: string) => {
    const start = at(day, 9);
    return [
      [start, examStartOf(sid, 'mock', ['q-a'], { form, deadline: mockDeadline(new Date(start)) })],
      [at(day, 10), submitOf(sid, 'mock')],
    ] as const;
  };

  it('offers the lowest ready boss first, then the next mock', () => {
    expect(MOCK_AFTER_BOSSES).toBe(7);
    expect(MOCK_GAP_DAYS).toBe(3);
    const bosses = [...passedUpTo(7), [9, status({ ready: true })], [8, status({ ready: true })]] as [
      number,
      BossStatus,
    ][];
    expect(extrasOf(bosses)).toEqual([
      { kind: 'boss', module: 8 },
      { kind: 'mock', form: 'A' },
    ]);
  });

  it('orders a boss, a mock and then a lab, and stops at two', () => {
    expect(MAX_EXTRAS).toBe(2);
    const lab = { lab: 'lab-m02-a', module: 2 };
    expect(extrasOf([], [], '2026-10-10', lab)).toEqual([{ kind: 'lab', lab: 'lab-m02-a', module: 2 }]);
    expect(extrasOf([[8, status({ ready: true })]], [], '2026-10-10', lab)).toEqual([
      { kind: 'boss', module: 8 },
      { kind: 'lab', lab: 'lab-m02-a', module: 2 },
    ]);
    const bosses = [...passedUpTo(7), [8, status({ ready: true })]] as [number, BossStatus][];
    expect(extrasOf(bosses, [], '2026-10-10', lab)).toEqual([
      { kind: 'boss', module: 8 },
      { kind: 'mock', form: 'A' },
    ]);
  });

  it('skips a boss in its cooldown and offers the next ready one', () => {
    const cooling = status({ ready: true, cooldownUntil: at('2026-10-10', 20) });
    const over = status({ ready: true, cooldownUntil: at('2026-10-10', 11) });
    expect(
      extrasOf([
        [2, cooling],
        [3, status({ ready: true })],
      ]),
    ).toEqual([{ kind: 'boss', module: 3 }]);
    expect(extrasOf([[2, over]])).toEqual([{ kind: 'boss', module: 2 }]);
    expect(extrasOf([[2, cooling]])).toEqual([]);
  });

  it('offers a mock only after 7 passed bosses', () => {
    expect(extrasOf(passedUpTo(6))).toEqual([]);
    expect(extrasOf(passedUpTo(7))).toEqual([{ kind: 'mock', form: 'A' }]);
  });

  it('waits 3 days after the latest mock, a remix included', () => {
    const afterA = mockOn('01JA00000000000000000000MA', 'A', '2026-10-08');
    expect(extrasOf(passedUpTo(7), afterA, '2026-10-10')).toEqual([]);
    expect(extrasOf(passedUpTo(7), afterA, '2026-10-11')).toEqual([{ kind: 'mock', form: 'B' }]);
    const remix = mockOn('01JA00000000000000000000MR', 'remix', '2026-10-10');
    expect(extrasOf(passedUpTo(7), [...afterA, ...remix], '2026-10-11')).toEqual([]);
  });

  it('offers no mock once forms A to D are taken', () => {
    const all = [
      ...mockOn('01JA00000000000000000000M1', 'A', '2026-09-20'),
      ...mockOn('01JA00000000000000000000M2', 'B', '2026-09-24'),
      ...mockOn('01JA00000000000000000000M3', 'C', '2026-09-28'),
      ...mockOn('01JA00000000000000000000M4', 'D', '2026-10-02'),
    ];
    expect(extrasOf(passedUpTo(13), all)).toEqual([]);
  });

  it("puts today's incident first, then a ready boss or the lab, and stops at two", () => {
    expect(MAX_EXTRAS).toBe(2);
    const bosses = [...passedUpTo(7), [8, status({ ready: true })]] as [number, BossStatus][];
    expect(extrasOf(bosses, [], '2026-10-10', null, 'inc-003')).toEqual([
      { kind: 'incident', incident: 'inc-003' },
      { kind: 'boss', module: 8 },
    ]);
    expect(extrasOf([], [], '2026-10-10', null, 'inc-003')).toEqual([
      { kind: 'incident', incident: 'inc-003' },
    ]);
    const lab = { lab: 'lab-m02-a', module: 2 };
    expect(extrasOf([], [], '2026-10-10', lab, 'inc-003')).toEqual([
      { kind: 'incident', incident: 'inc-003' },
      { kind: 'lab', lab: 'lab-m02-a', module: 2 },
    ]);
  });
});

describe('incidentToday', () => {
  const progressOf = (log: readonly (readonly [string, NewEvent])[]) => derive(timelineOf(log), null);

  it('reads the first offer of the study day and whether it is solved', () => {
    const offered = [
      [at('2026-10-10', 9), incidentOfferedOf('inc-002')],
      [at('2026-10-10', 9, 5), incidentOfferedOf('inc-007')],
    ] as const;
    expect(incidentToday(progressOf(offered), '2026-10-10')).toEqual({ incident: 'inc-002', done: false });
    const solved = [...offered, [at('2026-10-10', 11), incidentDoneOf('inc-002', true)]] as const;
    expect(incidentToday(progressOf(solved), '2026-10-10')).toEqual({ incident: 'inc-002', done: true });
  });

  it('is null on a day with no offer, whatever came before', () => {
    const log = [[at('2026-10-09', 9), incidentOfferedOf('inc-002')]] as const;
    expect(incidentToday(progressOf(log), '2026-10-10')).toBeNull();
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

describe('weakestLab (spec 4.6)', () => {
  const LABS = [
    { id: 'lab-m01-a', module: 1 },
    { id: 'lab-m01-b', module: 1 },
    { id: 'lab-m02-a', module: 2 },
    { id: 'lab-m02-b', module: 2 },
    { id: 'lab-m03-a', module: 3 },
  ];
  const pick = (done: readonly string[], mastery: [number, number][], read: readonly number[]) =>
    weakestLab({
      labs: LABS,
      done: new Set(done),
      mastery: new Map(mastery),
      lessonsRead: (module) => read.includes(module),
    });

  it('picks the first undone lab of the read module with the lowest mastery', () => {
    expect(
      pick(
        [],
        [
          [1, 70],
          [2, 40],
          [3, 90],
        ],
        [1, 2, 3],
      ),
    ).toEqual({ lab: 'lab-m02-a', module: 2 });
    expect(
      pick(
        ['lab-m02-a'],
        [
          [1, 70],
          [2, 40],
          [3, 90],
        ],
        [1, 2, 3],
      ),
    ).toEqual({ lab: 'lab-m02-b', module: 2 });
  });

  it('skips unread modules and modules whose labs are all done', () => {
    expect(
      pick(
        [],
        [
          [1, 70],
          [2, 40],
          [3, 90],
        ],
        [1, 3],
      ),
    ).toEqual({ lab: 'lab-m01-a', module: 1 });
    expect(
      pick(
        ['lab-m02-a', 'lab-m02-b'],
        [
          [1, 70],
          [2, 40],
          [3, 90],
        ],
        [1, 2, 3],
      ),
    ).toEqual({
      lab: 'lab-m01-a',
      module: 1,
    });
    expect(pick([], [], [])).toBeNull();
  });

  it('breaks a mastery tie toward the lower module, and reads a missing mastery as 0', () => {
    expect(
      pick(
        [],
        [
          [1, 50],
          [2, 50],
          [3, 50],
        ],
        [1, 2, 3],
      ),
    ).toEqual({ lab: 'lab-m01-a', module: 1 });
    expect(
      pick(
        [],
        [
          [1, 50],
          [2, 50],
        ],
        [1, 2, 3],
      ),
    ).toEqual({ lab: 'lab-m03-a', module: 3 });
  });
});
