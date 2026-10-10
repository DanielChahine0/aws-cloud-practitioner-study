import { type Card, createEmptyCard, fsrs, generatorParameters, Rating, type State } from 'ts-fsrs';
import { addDays, DAY_MS, dayStartAt, studyDayAt } from './day.ts';
import { fnv1a } from './rng.ts';

/**
 * The FSRS wrapper (spec 3.6), the only file that imports ts-fsrs.
 * Cards are plain JSON with ISO times, so replay state can be compared, snapshotted and cached.
 */

export const RETENTION = 0.9;
export const MAX_INTERVAL_DAYS = 180;

const scheduler = fsrs(
  generatorParameters({
    request_retention: RETENTION,
    maximum_interval: MAX_INTERVAL_DAYS,
    enable_fuzz: false,
    enable_short_term: false,
  }),
);

/** Easy is never assigned, because picking among options overstates recall (spec 3.1). */
export type SrsRating = 'again' | 'hard' | 'good';

export interface SrsCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** ts-fsrs `State`: 0 new, 1 learning, 2 review, 3 relearning. */
  state: 0 | 1 | 2 | 3;
  lastReview: string | null;
}

const GRADE = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good } as const;

function toCard(c: SrsCard): Card {
  const card: Card = {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as State,
  };
  if (c.lastReview !== null) card.last_review = new Date(c.lastReview);
  return card;
}

function fromCard(card: Card): SrsCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as SrsCard['state'],
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** The rating of a bet answer: wrong is Again, right and Sure is Good, right and Not sure is Hard. */
export function rate(correct: boolean, sure: boolean): SrsRating {
  if (!correct) return 'again';
  return sure ? 'good' : 'hard';
}

/**
 * One FSRS update at `at`; `null` starts a new card.
 * ts-fsrs keeps Good one day past a capped Hard, so the wrapper holds every interval to 180 days.
 */
export function review(card: SrsCard | null, rating: SrsRating, at: Date): SrsCard {
  const next = fromCard(scheduler.next(card ? toCard(card) : createEmptyCard(at), at, GRADE[rating]).card);
  const latest = at.getTime() + MAX_INTERVAL_DAYS * DAY_MS;
  if (Date.parse(next.due) <= latest) return next;
  return { ...next, due: new Date(latest).toISOString(), scheduledDays: MAX_INTERVAL_DAYS };
}

/** The probability of recall R at a moment, in [0, 1]. */
export function recall(card: SrsCard, at: Date): number {
  const r = scheduler.get_retrievability(toCard(card), at, false);
  return Math.min(1, Math.max(0, r));
}

/** What the exam cap needs: the concept, the review's study day and offset, and the current exam date. */
export interface ExamCap {
  concept: string;
  reviewDay: string;
  examDate: string | null;
  tz: number;
}

/**
 * The exam cap (spec 3.6): a due after the eve of the exam moves to 04:00 of a day in the last week,
 * `max(tomorrow, examDay - 1 - (fnv1a(concept) mod 7))`, which spreads the final reviews.
 */
export function capDue(due: Date, cap: ExamCap): Date {
  const { concept, reviewDay, examDate, tz } = cap;
  if (examDate === null || reviewDay >= examDate) return due;
  const eve = addDays(examDate, -1);
  if (studyDayAt(due, tz) <= eve) return due;
  const spread = addDays(eve, -(fnv1a(concept) % 7));
  const tomorrow = addDays(reviewDay, 1);
  return dayStartAt(spread > tomorrow ? spread : tomorrow, tz);
}
