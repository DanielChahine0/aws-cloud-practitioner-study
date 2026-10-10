import * as z from 'zod/mini';

/**
 * The event log (spec 8.1): append-only facts keyed by ULID, the only source of truth for progress.
 * Written in `zod/mini` and loaded lazily: the app builds the events it writes itself,
 * and only import validation loads this file, by dynamic `import()`.
 */

export { SCHEMA_VERSION } from './version.ts';

export const MODES = ['check', 'quiz', 'focus', 'review', 'lightning', 'incident', 'boss', 'mock'] as const;
export const Mode = z.enum(MODES);
export type Mode = z.infer<typeof Mode>;

export const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
export const Ulid = z.string().check(z.regex(ULID, 'must be a ULID'));

const UInt = z.int().check(z.minimum(0));
const PosInt = z.int().check(z.minimum(1));
const Day = z.iso.date();
const At = z.iso.datetime();

const BASE = { id: Ulid, at: At, tz: z.int(), day: Day };

/** Picked options: option ids, or `[leftId, rightId]` pairs (`l1`..`l5`, `r1`..`r5` by authored order). */
export const Picked = z.union([z.array(z.string()), z.array(z.tuple([z.string(), z.string()]))]);
export type Picked = z.infer<typeof Picked>;

const Answer = z.strictObject({
  ...BASE,
  t: z.literal('answer'),
  sid: Ulid,
  mode: Mode,
  qid: z.string(),
  qv: PosInt,
  concept: z.string(),
  picked: Picked,
  correct: z.boolean(),
  sure: z.boolean(),
  flagged: z.optional(z.boolean()),
  changes: z.optional(z.array(z.array(z.string()))),
  ms: z.number().check(z.minimum(0)),
  /** A relearn step in a review (spec 3.6): 0 XP and no FSRS update. */
  relearn: z.optional(z.boolean()),
});

const Session = z.strictObject({
  ...BASE,
  t: z.literal('session'),
  sid: Ulid,
  mode: Mode,
  phase: z.enum(['start', 'submit', 'abandon']),
  seed: UInt,
  scope: z.optional(z.string()),
  form: z.optional(z.string()),
  qids: z.optional(z.array(z.string())),
  deadline: z.optional(At),
});

const LessonDone = z.strictObject({ ...BASE, t: z.literal('lesson.done'), note: z.string() });

const LabDone = z.strictObject({
  ...BASE,
  t: z.literal('lab.done'),
  lab: z.string(),
  rev: UInt,
  hints: UInt,
});

const IncidentOffered = z.strictObject({
  ...BASE,
  t: z.literal('incident.offered'),
  incident: z.string(),
  firstTry: z.optional(z.boolean()),
});

const IncidentDone = z.strictObject({
  ...BASE,
  t: z.literal('incident.done'),
  incident: z.string(),
  firstTry: z.optional(z.boolean()),
});

const ReviewNow = z.strictObject({ ...BASE, t: z.literal('review.now'), concept: z.string() });

const Cause = z.strictObject({
  ...BASE,
  t: z.literal('cause'),
  sid: Ulid,
  qid: z.string(),
  cause: z.enum(['unknown', 'confused', 'misread']),
});

const Mission = z.strictObject({
  ...BASE,
  t: z.literal('mission'),
  mission: z.string(),
  step: z.enum(['start', 'verified', 'cleaned', 'usage-ok']),
  credits: z.optional(z.number()),
});

const Decision = z.strictObject({
  ...BASE,
  t: z.literal('decision'),
  module: z.int().check(z.minimum(1), z.maximum(13)),
  stage: z.enum(['self', 'final']),
  scores: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  keyPoints: z.optional(z.array(z.string())),
});

export const FLAG_REASONS = ['wrong-key', 'ambiguous', 'outdated', 'typo', 'other'] as const;

const Flag = z.strictObject({
  ...BASE,
  t: z.literal('flag'),
  qid: z.string(),
  qv: PosInt,
  reason: z.enum(FLAG_REASONS),
  note: z.optional(z.string()),
});

const Settings = z.strictObject({
  ...BASE,
  t: z.literal('settings'),
  patch: z.strictObject({ examDate: z.optional(z.nullable(Day)) }),
});

const Rank = z.strictObject({ ...BASE, t: z.literal('rank'), rank: z.string() });

/** One event of the log; named `StudyEvent` because `Event` is the DOM's type. */
export const StudyEvent = z.discriminatedUnion('t', [
  Answer,
  Session,
  LessonDone,
  LabDone,
  IncidentOffered,
  IncidentDone,
  ReviewNow,
  Cause,
  Mission,
  Decision,
  Flag,
  Settings,
  Rank,
]);
export type StudyEvent = z.infer<typeof StudyEvent>;
export type EventType = StudyEvent['t'];

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An event before the store stamps its `id`, `at`, `tz` and `day`. */
export type NewEvent = DistributiveOmit<StudyEvent, 'id' | 'at' | 'tz' | 'day'>;
