import { describe, expect, it } from 'vitest';
import type { ConceptMeta, ContentIndex, LessonMeta, MissionMeta } from '../../schemas/chunks.ts';
import {
  EXTRAS_JOIN,
  EXTRAS_LEAD,
  examAskDue,
  examDateLabel,
  extraLink,
  extrasLine,
  goNoGoLine,
  hexLabel,
  lessonRefs,
  memoryContentOf,
  nextLabel,
  nothingDueLine,
  readinessLine,
  reminderOf,
  streakLine,
  weakestLine,
} from '../../src/app/home.ts';
import type { LessonRef } from '../../src/engine/next.ts';
import type { ReviewQueue } from '../../src/engine/queue.ts';
import type { Readiness } from '../../src/engine/readiness.ts';
import type { SessionState } from '../../src/engine/replay.ts';
import { emptyIndexFields } from '../fixtures/index.ts';

const lesson = (
  n: number,
  slug: string,
  title: string,
  minutes: number,
  checkConcepts: number,
): LessonMeta => ({
  n,
  slug,
  title,
  concepts: [],
  minutes,
  checkConcepts,
});

const concept = (id: string, home: string, more: Partial<ConceptMeta> = {}): ConceptMeta => ({
  id,
  name: `Name of ${id}`,
  home,
  anchor: id,
  tested: true,
  tasks: ['1.1'],
  confusableWith: [],
  aliases: [],
  splitFrom: null,
  ...more,
});

/** A made-up two-module bakery course. */
const IDX: ContentIndex = {
  contentVersion: 'test',
  modules: [
    {
      n: 1,
      slug: 'baking-basics',
      title: 'Module 1: Baking Basics',
      short: 'Baking Basics',
      chunk: 'content/m01.json',
      lessons: [
        lesson(1, 'welcome', 'Welcome to the Bakery', 3, 0),
        lesson(2, 'shared-ovens', 'Shared Ovens', 6, 2),
      ],
    },
    {
      n: 2,
      slug: 'proofing',
      title: 'Module 2: Proofing',
      short: 'Proofing',
      chunk: 'content/m02.json',
      lessons: [lesson(1, 'proofing-cabinets', 'Proofing Cabinets', 5, 3)],
    },
  ],
  concepts: [
    concept('shared-oven', 'm01/shared-ovens', { aliases: ['common-oven'], confusableWith: ['rented-oven'] }),
    concept('rented-oven', 'm01/shared-ovens', { confusableWith: ['shared-oven'] }),
    concept('bakery-history', 'm01/welcome', { tested: false, tasks: [] }),
    concept('proofing-cabinet', 'm02/proofing-cabinets', { splitFrom: 'shared-oven' }),
  ],
  glossary: [],
  missions: [],
  questionVersions: { 'q-aaaaaa': 1, 'q-bbbbbb': 2 },
  search: 'content/search.json',
  ...emptyIndexFields(),
};

const REFS = lessonRefs(IDX);
const ref = (note: string): LessonRef => {
  const found = REFS.find((r) => r.note === note);
  if (found === undefined) throw new Error(`no lesson ${note}`);
  return found;
};

const session = (mode: SessionState['mode'], scope: string): SessionState => ({
  sid: '01JQ0000000000000000000000',
  mode,
  scope,
  seed: 7,
  qids: ['q-aaaaaa', 'q-bbbbbb', 'q-cccccc'],
  answers: new Map(),
  startedAt: '2026-10-10T08:00:00.000Z',
  submittedAt: null,
  abandoned: false,
  form: null,
  deadline: null,
  submitId: null,
});

const examSession = (
  mode: 'boss' | 'mock',
  scope: string,
  form: string | null,
  deadline: string,
): SessionState => ({ ...session(mode, scope), form, deadline });

const QUEUE: ReviewQueue = {
  items: [],
  due: 0,
  misconceptions: 0,
  catchUp: false,
  newToday: 0,
  lessonsAllowed: true,
  next: null,
};
const NOW = new Date('2026-10-10T18:00:00.000Z');

describe('memoryContentOf', () => {
  it('maps each exam item to its task and adds its version, so stale exam answers are caught', () => {
    const content = memoryContentOf({
      ...IDX,
      exam: {
        forms: [{ id: 'A', chunk: 'content/exam-a.0000aaaa.json', frozen: true, size: 1 }],
        items: { 'x-aaaaaa': { version: 3, concept: 'shared-oven', task: '1.2', form: 'A', type: 'single' } },
      },
    });
    expect(content.examTasks).toEqual(new Map([['x-aaaaaa', '1.2']]));
    expect(content.questionVersions.get('x-aaaaaa')).toBe(3);
    expect(content.questionVersions.get('q-bbbbbb')).toBe(2);
    expect(memoryContentOf(IDX).examTasks.size).toBe(0);
  });

  it('reads each concept module from its home note and inverts the aliases', () => {
    const content = memoryContentOf(IDX);
    expect(content.concepts.get('shared-oven')).toEqual({
      module: 1,
      tested: true,
      confusableWith: ['rented-oven'],
      splitFrom: null,
      tasks: ['1.1'],
    });
    expect(content.concepts.get('proofing-cabinet')).toEqual({
      module: 2,
      tested: true,
      confusableWith: [],
      splitFrom: 'shared-oven',
      tasks: ['1.1'],
    });
    expect(content.concepts.get('bakery-history')?.tested).toBe(false);
    expect(content.aliases.get('common-oven')).toBe('shared-oven');
    expect(content.aliases.size).toBe(1);
    expect(content.questionVersions.get('q-bbbbbb')).toBe(2);
  });

  it('keeps the missions marked keep and leaves exam tasks and core labs empty', () => {
    const mission = (id: string, keep: boolean): MissionMeta => ({
      id,
      title: `Title of ${id}`,
      modules: [1],
      services: [],
      expectedCredits: '$0',
      gate: false,
      keep,
      maxLiveHours: null,
      canUseCredits: [],
      leftovers: [],
      sources: [],
      html: '',
    });
    const content = memoryContentOf({
      ...IDX,
      missions: [mission('mission-01-kept', true), mission('mission-02-cleaned', false)],
    });
    expect([...content.keptMissions]).toEqual(['mission-01-kept']);
    expect(content.examTasks.size).toBe(0);
    expect(content.coreLabs.size).toBe(0);
  });
});

describe('lessonRefs', () => {
  it('lists every lesson in course order and marks each module first lesson', () => {
    expect(REFS).toEqual([
      {
        note: 'm01/welcome',
        module: 1,
        slug: 'welcome',
        title: 'Welcome to the Bakery',
        first: true,
        minutes: 3,
        checkConcepts: 0,
      },
      {
        note: 'm01/shared-ovens',
        module: 1,
        slug: 'shared-ovens',
        title: 'Shared Ovens',
        first: false,
        minutes: 6,
        checkConcepts: 2,
      },
      {
        note: 'm02/proofing-cabinets',
        module: 2,
        slug: 'proofing-cabinets',
        title: 'Proofing Cabinets',
        first: true,
        minutes: 5,
        checkConcepts: 3,
      },
    ]);
  });
});

describe('nextLabel', () => {
  it('resumes a lesson check, a module quiz or a review with the questions left', () => {
    expect(
      nextLabel({ kind: 'resume', session: session('check', 'm01/shared-ovens'), left: 3 }, IDX, NOW),
    ).toEqual({
      label: 'Resume: Lesson check: Shared Ovens (3 left)',
      href: '#/s/check/m01/shared-ovens',
      minutes: 2,
    });
    expect(nextLabel({ kind: 'resume', session: session('quiz', 'm02'), left: 3 }, IDX, NOW)).toEqual({
      label: 'Resume: Module quiz: Proofing (3 left)',
      href: '#/s/quiz/m02',
      minutes: 2,
    });
    expect(nextLabel({ kind: 'resume', session: session('review', 'review'), left: 3 }, IDX, NOW)).toEqual({
      label: 'Resume: Review (3 left)',
      href: '#/s/review',
      minutes: 2,
    });
  });

  it('counts the concepts of a review, in the singular for one', () => {
    expect(nextLabel({ kind: 'review', count: 18 }, IDX, NOW)).toEqual({
      label: 'Review 18 concepts',
      href: '#/s/review',
      minutes: 9,
    });
    expect(nextLabel({ kind: 'review', count: 1 }, IDX, NOW)).toEqual({
      label: 'Review 1 concept',
      href: '#/s/review',
      minutes: 1,
    });
  });

  it('continues the current lesson with its reading time', () => {
    expect(nextLabel({ kind: 'continue', lesson: ref('m01/shared-ovens') }, IDX, NOW)).toEqual({
      label: 'Continue: Shared Ovens',
      href: '#/m/01/l/shared-ovens',
      minutes: 6,
    });
  });

  it('offers Check yourself for a module, opening its first unchecked lesson', () => {
    expect(
      nextLabel({ kind: 'check', module: 2, concepts: 6, lesson: ref('m02/proofing-cabinets') }, IDX, NOW),
    ).toEqual({
      label: 'Check yourself: Module 2 (6 concepts)',
      href: '#/s/check/m02/proofing-cabinets',
      minutes: 3,
    });
    expect(
      nextLabel({ kind: 'check', module: 2, concepts: 1, lesson: ref('m02/proofing-cabinets') }, IDX, NOW)
        .label,
    ).toBe('Check yourself: Module 2 (1 concept)');
  });

  it('starts a module at its first lesson and otherwise names the next lesson', () => {
    expect(nextLabel({ kind: 'lesson', lesson: ref('m01/welcome') }, IDX, NOW)).toEqual({
      label: 'Start Module 1: Welcome to the Bakery',
      href: '#/m/01/l/welcome',
      minutes: 3,
    });
    expect(nextLabel({ kind: 'lesson', lesson: ref('m01/shared-ovens') }, IDX, NOW)).toEqual({
      label: 'Next lesson: Shared Ovens',
      href: '#/m/01/l/shared-ovens',
      minutes: 6,
    });
  });

  it('resumes a boss or a mock with the whole minutes left, rounded up', () => {
    const deadline = '2026-10-10T19:01:00.000Z';
    expect(
      nextLabel({ kind: 'resume', session: examSession('mock', '', 'A', deadline), left: 65 }, IDX, NOW),
    ).toEqual({
      label: 'Resume: Mock exam A (61 min left)',
      href: '#/s/mock/a',
      minutes: 61,
    });
    expect(
      nextLabel({ kind: 'resume', session: examSession('mock', '', 'remix', deadline), left: 65 }, IDX, NOW),
    ).toEqual({
      label: 'Resume: Remix mock (61 min left)',
      href: '#/s/mock/remix',
      minutes: 61,
    });
    expect(
      nextLabel(
        { kind: 'resume', session: examSession('boss', 'm01', null, '2026-10-10T18:00:30.000Z'), left: 15 },
        IDX,
        NOW,
      ),
    ).toEqual({ label: 'Resume: Boss: Baking Basics (1 min left)', href: '#/s/boss/m01', minutes: 1 });
    expect(
      nextLabel(
        { kind: 'resume', session: examSession('boss', 'm02', null, '2026-10-10T17:59:00.000Z'), left: 15 },
        IDX,
        NOW,
      ).label,
    ).toBe('Resume: Boss: Proofing (0 min left)');
  });

  it('resumes a focus quiz with the questions left', () => {
    expect(nextLabel({ kind: 'resume', session: session('focus', '2.3'), left: 4 }, IDX, NOW)).toEqual({
      label: 'Resume: Focus quiz (4 left)',
      href: '#/s/focus/2.3',
      minutes: 2,
    });
    expect(nextLabel({ kind: 'resume', session: session('focus', 'm02'), left: 4 }, IDX, NOW).href).toBe(
      '#/s/focus/m02',
    );
  });

  it('has no link and no time when done for today', () => {
    expect(nextLabel({ kind: 'done' }, IDX, NOW)).toEqual({
      label: 'Done for today',
      href: null,
      minutes: null,
    });
  });
});

describe('nothingDueLine', () => {
  const next = (count: number, at: string): ReviewQueue => ({ ...QUEUE, next: { count, at } });

  it('names the next reviews in hours rounded up, in minutes under an hour, and in days beyond 48 hours', () => {
    expect(nothingDueLine(next(6, '2026-10-10T22:30:00.000Z'), NOW)).toBe(
      'Nothing due. Next: 6 concepts in 5 h.',
    );
    expect(nothingDueLine(next(1, '2026-10-10T18:40:00.000Z'), NOW)).toBe(
      'Nothing due. Next: 1 concept in 40 min.',
    );
    expect(nothingDueLine(next(2, '2026-10-12T18:00:00.000Z'), NOW)).toBe(
      'Nothing due. Next: 2 concepts in 48 h.',
    );
    expect(nothingDueLine(next(6, '2026-10-13T04:00:00.000Z'), NOW)).toBe(
      'Nothing due. Next: 6 concepts in 3 days.',
    );
  });

  it('says only Nothing due without any card', () => {
    expect(nothingDueLine(QUEUE, NOW)).toBe('Nothing due.');
  });
});

describe('streakLine', () => {
  it('shows the longest streak only after a reset', () => {
    expect(streakLine({ current: 0, longest: 18, freezes: 0, frozenDays: [] })).toBe(
      'Streak reset. Longest: 18 days.',
    );
    expect(streakLine({ current: 0, longest: 1, freezes: 0, frozenDays: [] })).toBe(
      'Streak reset. Longest: 1 day.',
    );
    expect(streakLine({ current: 3, longest: 18, freezes: 1, frozenDays: [] })).toBeNull();
    expect(streakLine({ current: 0, longest: 0, freezes: 0, frozenDays: [] })).toBeNull();
  });
});

describe('labels', () => {
  it('writes the exam date with a short weekday and month, whatever the zone', () => {
    expect(examDateLabel('2026-11-14')).toBe('Sat 14 Nov');
    expect(examDateLabel('2027-01-04')).toBe('Mon 4 Jan');
  });

  it('labels a hex with its module, mastery and band', () => {
    expect(hexLabel(5, 'Networking', 64, 'solid', null)).toBe('Module 5 Networking, mastery 64, solid');
    expect(hexLabel(1, 'Baking Basics', 0, 'outline', null)).toBe(
      'Module 1 Baking Basics, mastery 0, not started',
    );
    expect(hexLabel(2, 'Proofing', 25, 'faint', null)).toBe('Module 2 Proofing, mastery 25, started');
    expect(hexLabel(5, 'Networking', 64, 'solid', 'passed')).toBe(
      'Module 5 Networking, mastery 64, solid, boss passed',
    );
    expect(hexLabel(3, 'Compute', 61, 'solid', 'ready')).toBe(
      'Module 3 Compute, mastery 61, solid, boss ready',
    );
  });
});

describe('examAskDue', () => {
  const allRead = new Map([
    ['m01/welcome', '2026-10-10T08:00:00.000Z'],
    ['m01/shared-ovens', '2026-10-10T09:00:00.000Z'],
  ]);

  it('asks once every Module 1 lesson is read, while no date is set and it was not dismissed', () => {
    expect(examAskDue({ idx: IDX, lessonsDone: allRead, examDate: null, examAsk: null })).toBe(true);
    expect(examAskDue({ idx: IDX, lessonsDone: allRead, examDate: null, examAsk: 'later' })).toBe(true);
  });

  it('waits for every Module 1 lesson', () => {
    const one = new Map([['m01/welcome', '2026-10-10T08:00:00.000Z']]);
    expect(examAskDue({ idx: IDX, lessonsDone: one, examDate: null, examAsk: null })).toBe(false);
    expect(examAskDue({ idx: IDX, lessonsDone: new Map(), examDate: null, examAsk: null })).toBe(false);
  });

  it('stays away once a date is set or the question was dismissed', () => {
    expect(examAskDue({ idx: IDX, lessonsDone: allRead, examDate: '2026-11-14', examAsk: null })).toBe(false);
    expect(examAskDue({ idx: IDX, lessonsDone: allRead, examDate: null, examAsk: 'dismissed' })).toBe(false);
  });
});

const readinessOf = (over: Partial<Readiness>): Readiness => ({
  value: 0.62,
  label: 'Close',
  capped: false,
  memory: 0.6,
  mock: 0.64,
  domains: { '1': 0.6, '2': 0.6, '3': 0.6, '4': 0.6 },
  weakest: null,
  at: '2026-11-14T04:00:00.000Z',
  ...over,
});

describe('readinessLine', () => {
  it('shows the floored number and the label', () => {
    expect(readinessLine(readinessOf({}))).toBe('Readiness 62  Close');
    expect(readinessLine(readinessOf({ value: 0.85, label: 'Ready' }))).toBe('Readiness 85  Ready');
  });

  it('shows 79 for 0.799 and 80 for 0.80', () => {
    expect(readinessLine(readinessOf({ value: 0.799 }))).toBe('Readiness 79  Close');
    expect(readinessLine(readinessOf({ value: 0.8 }))).toBe('Readiness 80  Close');
  });

  it('names the cap before the first unseen mock', () => {
    expect(readinessLine(readinessOf({ value: 0.7, capped: true, mock: null }))).toBe(
      'Readiness 70  capped until your first unseen mock',
    );
  });

  it('shows a dash before 40 concepts have evidence', () => {
    expect(readinessLine(readinessOf({ value: null, label: 'Building' }))).toBe('Readiness -');
  });
});

describe('Home lines', () => {
  it('names the weakest task with its short name', () => {
    expect(weakestLine({ id: '2.3', short: 'access management' })).toBe(
      'Weakest: 2.3 access management (focus quiz)',
    );
  });

  it('writes the go/no-go line with the exam date', () => {
    expect(goNoGoLine('2026-11-14', 'Close')).toBe(
      'Exam Sat 14 Nov, readiness Close. Rescheduling closes 24 h before the appointment.',
    );
    expect(goNoGoLine('2026-11-14', 'Building')).toBe(
      'Exam Sat 14 Nov, readiness Building. Rescheduling closes 24 h before the appointment.',
    );
  });

  it('joins the extras with a bar', () => {
    expect(extrasLine([{ label: 'Boss: Networking' }, { label: 'Mock B' }])).toBe(
      'Optional today: Boss: Networking  |  Mock B',
    );
    expect(extrasLine([{ label: 'Mock A' }])).toBe('Optional today: Mock A');
    expect(`${EXTRAS_LEAD}Boss: Networking${EXTRAS_JOIN}Mock B`).toBe(
      'Optional today: Boss: Networking  |  Mock B',
    );
  });

  it('links a boss extra to its boss and a mock extra to its form', () => {
    const modules = [{ n: 5, short: 'Networking' }];
    expect(extraLink({ kind: 'boss', module: 5 }, modules)).toEqual({
      label: 'Boss: Networking',
      href: '#/s/boss/m05',
    });
    expect(extraLink({ kind: 'mock', form: 'B' }, modules)).toEqual({ label: 'Mock B', href: '#/s/mock/b' });
  });

  it('links a lab extra to its lab, titled from the index', () => {
    const labs = [{ id: 'lab-m05-two-tiers', title: 'Two tiers, two zones' }];
    expect(extraLink({ kind: 'lab', lab: 'lab-m05-two-tiers', module: 5 }, [], labs)).toEqual({
      label: 'Lab: Two tiers, two zones',
      href: '#/m/05/lab/lab-m05-two-tiers',
    });
  });
});

describe('reminderOf', () => {
  const none = { 'go-no-go': false, 'exam-ask': false, backup: false, 'first-run': false };

  it('puts go/no-go first, then the exam date question, the backup reminder and the first-run line', () => {
    expect(reminderOf({ 'go-no-go': true, 'exam-ask': true, backup: true, 'first-run': true })).toBe(
      'go-no-go',
    );
    expect(reminderOf({ ...none, 'exam-ask': true, backup: true, 'first-run': true })).toBe('exam-ask');
    expect(reminderOf({ ...none, backup: true, 'first-run': true })).toBe('backup');
    expect(reminderOf({ ...none, 'first-run': true })).toBe('first-run');
  });

  it('shows nothing when no line is due', () => {
    expect(reminderOf(none)).toBeNull();
  });
});
