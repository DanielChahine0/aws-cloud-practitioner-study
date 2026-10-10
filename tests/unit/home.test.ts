import { describe, expect, it } from 'vitest';
import type { ConceptMeta, ContentIndex, LessonMeta } from '../../schemas/chunks.ts';
import {
  examAskDue,
  examDateLabel,
  hexLabel,
  lessonRefs,
  memoryContentOf,
  nextLabel,
  nothingDueLine,
  streakLine,
} from '../../src/app/home.ts';
import type { LessonRef } from '../../src/engine/next.ts';
import type { ReviewQueue } from '../../src/engine/queue.ts';
import type { SessionState } from '../../src/engine/replay.ts';

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
  it('reads each concept module from its home note and inverts the aliases', () => {
    const content = memoryContentOf(IDX);
    expect(content.concepts.get('shared-oven')).toEqual({
      module: 1,
      tested: true,
      confusableWith: ['rented-oven'],
      splitFrom: null,
    });
    expect(content.concepts.get('proofing-cabinet')).toEqual({
      module: 2,
      tested: true,
      confusableWith: [],
      splitFrom: 'shared-oven',
    });
    expect(content.concepts.get('bakery-history')?.tested).toBe(false);
    expect(content.aliases.get('common-oven')).toBe('shared-oven');
    expect(content.aliases.size).toBe(1);
    expect(content.questionVersions.get('q-bbbbbb')).toBe(2);
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
      nextLabel({ kind: 'resume', session: session('check', 'm01/shared-ovens'), left: 3 }, IDX),
    ).toEqual({
      label: 'Resume: Lesson check: Shared Ovens (3 left)',
      href: '#/s/check/m01/shared-ovens',
      minutes: 2,
    });
    expect(nextLabel({ kind: 'resume', session: session('quiz', 'm02'), left: 3 }, IDX)).toEqual({
      label: 'Resume: Module quiz: Proofing (3 left)',
      href: '#/s/quiz/m02',
      minutes: 2,
    });
    expect(nextLabel({ kind: 'resume', session: session('review', 'review'), left: 3 }, IDX)).toEqual({
      label: 'Resume: Review (3 left)',
      href: '#/s/review',
      minutes: 2,
    });
  });

  it('counts the concepts of a review, in the singular for one', () => {
    expect(nextLabel({ kind: 'review', count: 18 }, IDX)).toEqual({
      label: 'Review 18 concepts',
      href: '#/s/review',
      minutes: 9,
    });
    expect(nextLabel({ kind: 'review', count: 1 }, IDX)).toEqual({
      label: 'Review 1 concept',
      href: '#/s/review',
      minutes: 1,
    });
  });

  it('continues the current lesson with its reading time', () => {
    expect(nextLabel({ kind: 'continue', lesson: ref('m01/shared-ovens') }, IDX)).toEqual({
      label: 'Continue: Shared Ovens',
      href: '#/m/01/l/shared-ovens',
      minutes: 6,
    });
  });

  it('offers Check yourself for a module, opening its first unchecked lesson', () => {
    expect(
      nextLabel({ kind: 'check', module: 2, concepts: 6, lesson: ref('m02/proofing-cabinets') }, IDX),
    ).toEqual({
      label: 'Check yourself: Module 2 (6 concepts)',
      href: '#/s/check/m02/proofing-cabinets',
      minutes: 3,
    });
    expect(
      nextLabel({ kind: 'check', module: 2, concepts: 1, lesson: ref('m02/proofing-cabinets') }, IDX).label,
    ).toBe('Check yourself: Module 2 (1 concept)');
  });

  it('starts a module at its first lesson and otherwise names the next lesson', () => {
    expect(nextLabel({ kind: 'lesson', lesson: ref('m01/welcome') }, IDX)).toEqual({
      label: 'Start Module 1: Welcome to the Bakery',
      href: '#/m/01/l/welcome',
      minutes: 3,
    });
    expect(nextLabel({ kind: 'lesson', lesson: ref('m01/shared-ovens') }, IDX)).toEqual({
      label: 'Next lesson: Shared Ovens',
      href: '#/m/01/l/shared-ovens',
      minutes: 6,
    });
  });

  it('has no link and no time when done for today', () => {
    expect(nextLabel({ kind: 'done' }, IDX)).toEqual({ label: 'Done for today', href: null, minutes: null });
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
    expect(hexLabel(5, 'Networking', 64, 'solid')).toBe('Module 5 Networking, mastery 64, solid');
    expect(hexLabel(1, 'Baking Basics', 0, 'outline')).toBe('Module 1 Baking Basics, mastery 0, not started');
    expect(hexLabel(2, 'Proofing', 25, 'faint')).toBe('Module 2 Proofing, mastery 25, started');
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
