import fc from 'fast-check';
import type { Mode, NewEvent } from '../../schemas/events.ts';
import { addDays } from '../../src/engine/day.ts';
import { SID, SID2 } from './events.ts';
import { answerOf, contentOf } from './memory.ts';

/**
 * Random logs with exam date changes (spec 3.6): answers, reviews, practice and exam sessions, a split concept
 * and up to 4 exam date settings, some on the same day and some clearing the date.
 * An optional opening block answers 104 concepts three times, so a date set later caps them all into its last
 * week and the days before the exam open with a catch-up plan.
 */
type Item = readonly [string, NewEvent];

const START = '2026-09-01';
const MANY = Array.from({ length: 104 }, (_, i) => `k-${String(i + 1).padStart(3, '0')}`);

export const EXAM_DATE_CONTENT = contentOf([
  ...MANY.map((id) => ({ id, module: 1 })),
  { id: 'oven', module: 2, aliases: ['old-oven'] },
  { id: 'menu', module: 2, tested: false },
  { id: 'dough', module: 3, splitFrom: 'starter' },
  { id: 'crumb', module: 3, splitFrom: 'starter' },
]);

const CONCEPTS = [
  'k-001',
  'k-002',
  'k-050',
  'oven',
  'old-oven',
  'menu',
  'starter',
  'dough',
  'crumb',
  'ghost',
];
const MODES: Mode[] = ['check', 'quiz', 'focus', 'review', 'review', 'lightning', 'boss', 'mock'];
const LAST_DAY = 60;
/** A day that settings events and answers favour, so same-day changes happen often. */
const BUSY = 40;

/** An ISO time `minute` minutes after 04:00 UTC on day `n` from the start, so it stays in that study day. */
const timeOf = (n: number, minute: number): string =>
  new Date(Date.parse(`${addDays(START, n)}T04:00:00.000Z`) + minute * 60_000).toISOString();

const dayArb = fc.oneof(fc.integer({ min: 0, max: LAST_DAY }), fc.integer({ min: BUSY - 1, max: BUSY + 1 }));
const minuteArb = fc.integer({ min: 0, max: 1_400 });

const answerArb: fc.Arbitrary<Item> = fc
  .record({
    day: dayArb,
    minute: minuteArb,
    concept: fc.constantFrom(...CONCEPTS),
    variant: fc.integer({ min: 1, max: 3 }),
    correct: fc.boolean(),
    sure: fc.boolean(),
    mode: fc.constantFrom(...MODES),
    relearn: fc.integer({ min: 0, max: 5 }).map((n) => n === 0),
    sid: fc.constantFrom(SID, SID2),
    flagged: fc.boolean(),
  })
  .map(
    (s): Item => [
      timeOf(s.day, s.minute),
      answerOf({
        concept: s.concept,
        qid: `q-${s.concept}-${s.variant}`,
        correct: s.correct,
        sure: s.sure,
        mode: s.mode,
        relearn: s.relearn,
        sid: s.sid,
        flagged: s.flagged,
      }),
    ],
  );

const sessionArb: fc.Arbitrary<Item> = fc
  .record({
    day: dayArb,
    minute: minuteArb,
    sid: fc.constantFrom(SID, SID2),
    mode: fc.constantFrom<Mode>('review', 'quiz', 'boss', 'mock'),
    phase: fc.constantFrom<'start' | 'submit' | 'abandon'>('start', 'start', 'submit', 'abandon'),
    form: fc.constantFrom('A', 'remix'),
  })
  .map((s): Item => {
    const exam = s.mode === 'boss' || s.mode === 'mock';
    if (s.phase !== 'start')
      return [timeOf(s.day, s.minute), { t: 'session', sid: s.sid, mode: s.mode, phase: s.phase, seed: 7 }];
    return [
      timeOf(s.day, s.minute),
      {
        t: 'session',
        sid: s.sid,
        mode: s.mode,
        phase: 'start',
        seed: 7,
        scope: 'm01',
        qids: ['q-oven-1', 'q-dough-1', 'q-k-001-1'],
        ...(exam ? { deadline: timeOf(s.day, s.minute + 90) } : {}),
        ...(s.mode === 'mock' ? { form: s.form } : {}),
      },
    ];
  });

const settingsArb: fc.Arbitrary<Item> = fc
  .record({
    day: fc.oneof(fc.integer({ min: 0, max: LAST_DAY }), fc.constant(BUSY)),
    minute: minuteArb,
    exam: fc.option(fc.integer({ min: 5, max: LAST_DAY + 15 }), { nil: null, freq: 4 }),
  })
  .map(
    (s): Item => [
      timeOf(s.day, s.minute),
      { t: 'settings', patch: { examDate: s.exam === null ? null : addDays(START, s.exam) } },
    ],
  );

/** Three right answers on days 0, 3 and 17 to each of the 104 concepts, which leave them due on day 74. */
const opening: Item[] = [0, 3, 17].flatMap((day, i) =>
  MANY.map(
    (c, j): Item => [
      timeOf(day, 60 + j),
      answerOf({ concept: c, correct: true, sure: true, mode: 'check', qid: `q-${c}-${i + 1}` }),
    ],
  ),
);

const byTime = (a: Item, b: Item): number => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);

/** A dated log, in time order, with 0 to 4 exam date settings events. */
export const examDateLogArb: fc.Arbitrary<Item[]> = fc
  .record({
    opening: fc.boolean(),
    events: fc.array(fc.oneof({ weight: 6, arbitrary: answerArb }, { weight: 2, arbitrary: sessionArb }), {
      maxLength: 60,
    }),
    settings: fc.array(settingsArb, { maxLength: 4 }),
  })
  .map((s) => [...(s.opening ? opening : []), ...s.events, ...s.settings].sort(byTime));
