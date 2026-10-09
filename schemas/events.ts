/**
 * The event log (spec 8.1) in zod/mini; the app writes events it builds itself and loads this file only to
 * validate an imported backup, so zod stays out of the initial bundle.
 */
import * as z from 'zod/mini';

/** The storage shape's version (spec 8.2); `src/store/migrations` moves older backups up to it. */
export const SCHEMA_VERSION = 1;

export const MODES = ['check', 'quiz', 'focus', 'review', 'lightning', 'incident', 'boss', 'mock'] as const;
export type Mode = (typeof MODES)[number];

export const Ulid = z.string().check(z.regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'must be an uppercase ULID'));

const BASE = {
  id: Ulid,
  at: z
    .string()
    .check(z.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/, 'must be an ISO time in UTC')),
  tz: z.int(),
  day: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')),
};

const Mode = z.enum(MODES);
const Picked = z.union([z.array(z.string()), z.array(z.tuple([z.string(), z.string()]))]);

export const StudyEvent = z.discriminatedUnion('t', [
  z.strictObject({
    ...BASE,
    t: z.literal('answer'),
    sid: z.string(),
    mode: Mode,
    qid: z.string(),
    qv: z.int(),
    concept: z.string(),
    picked: Picked,
    correct: z.boolean(),
    sure: z.boolean(),
    flagged: z.optional(z.boolean()),
    changes: z.optional(z.array(z.array(z.string()))),
    ms: z.number(),
  }),
  z.strictObject({
    ...BASE,
    t: z.literal('session'),
    sid: z.string(),
    mode: Mode,
    phase: z.enum(['start', 'submit', 'abandon']),
    seed: z.number(),
    scope: z.optional(z.string()),
    form: z.optional(z.string()),
    qids: z.optional(z.array(z.string())),
    deadline: z.optional(z.string()),
  }),
  z.strictObject({ ...BASE, t: z.literal('lesson.done'), note: z.string() }),
  z.strictObject({ ...BASE, t: z.literal('lab.done'), lab: z.string(), rev: z.int(), hints: z.int() }),
  z.strictObject({
    ...BASE,
    t: z.literal('incident.offered'),
    incident: z.string(),
    firstTry: z.optional(z.boolean()),
  }),
  z.strictObject({
    ...BASE,
    t: z.literal('incident.done'),
    incident: z.string(),
    firstTry: z.optional(z.boolean()),
  }),
  z.strictObject({ ...BASE, t: z.literal('review.now'), concept: z.string() }),
  z.strictObject({
    ...BASE,
    t: z.literal('cause'),
    sid: z.string(),
    qid: z.string(),
    cause: z.enum(['unknown', 'confused', 'misread']),
  }),
  z.strictObject({
    ...BASE,
    t: z.literal('mission'),
    mission: z.string(),
    step: z.enum(['start', 'verified', 'cleaned', 'usage-ok']),
    credits: z.optional(z.number()),
  }),
  z.strictObject({
    ...BASE,
    t: z.literal('decision'),
    module: z.int(),
    stage: z.enum(['self', 'final']),
    scores: z.tuple([z.number(), z.number(), z.number(), z.number()]),
    keyPoints: z.optional(z.array(z.string())),
  }),
  z.strictObject({
    ...BASE,
    t: z.literal('flag'),
    qid: z.string(),
    qv: z.int(),
    reason: z.enum(['wrong-key', 'ambiguous', 'outdated', 'typo', 'other']),
    note: z.optional(z.string()),
  }),
  z.strictObject({
    ...BASE,
    t: z.literal('settings'),
    patch: z.strictObject({ examDate: z.optional(z.nullable(z.string())) }),
  }),
  z.strictObject({ ...BASE, t: z.literal('rank'), rank: z.string() }),
]);

/** One event of the log; named `StudyEvent` because `Event` is the DOM's type. */
export type StudyEvent = z.infer<typeof StudyEvent>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** An event before `record` stamps its id, time, offset and study day. */
export type NewEvent = DistributiveOmit<StudyEvent, 'id' | 'at' | 'tz' | 'day'>;
