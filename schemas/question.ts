import { z } from 'zod';
import { ConceptId, IsoDate, NoteId, TaskId } from './common.ts';

/** The question schema (spec 2.6): shape only; rules R3, R4 and R9 check counts, explanations and the stamp. */
export const QID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
export const Qid = z.string().regex(/^q-[0-9a-hjkmnp-tv-z]{6}$/, 'must look like q-7k2m9p');

export const OptionId = z.enum(['a', 'b', 'c', 'd', 'e', 'f']);
export const Option = z.strictObject({
  id: OptionId,
  text: z.string().min(1).max(220),
  correct: z.boolean().default(false),
  why: z.string().max(400),
});
export const Pair = z.strictObject({
  left: z.string().min(1).max(80),
  right: z.string().min(1).max(160),
  why: z.string().max(400),
});
export const History = z.strictObject({
  version: z.number().int().min(2),
  change: z.enum(['key-fix', 'rewrite']),
  rescore: z.boolean(),
});

export const CHECK_NAMES = ['solve-closed', 'solve-notes', 'critic'] as const;
export type CheckName = (typeof CHECK_NAMES)[number];

const Hash12 = z.string().regex(/^[0-9a-f]{12}$/);
export const Verified = z.strictObject({
  keyHash: Hash12,
  fullHash: Hash12,
  checks: z.array(z.string().regex(/^(?:solve-closed|solve-notes|critic)@\d+$/)).length(3),
  on: IsoDate,
});
export type Verified = z.infer<typeof Verified>;
export const Review = z.strictObject({ attempts: z.number().int().min(1), lastFailure: z.string().min(1) });
export type Review = z.infer<typeof Review>;

export const QuestionStatus = z.enum(['draft', 'live', 'retired']);
export const Pool = z.enum(['practice', 'exam']);
export const Level = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const Base = z.strictObject({
  id: Qid,
  version: z.number().int().min(1),
  status: QuestionStatus,
  pool: Pool,
  concept: ConceptId,
  note: NoteId,
  task: TaskId,
  level: Level,
  stem: z.string().min(20).max(600),
  evidence: z.array(z.string().min(1)).max(3),
  takeaway: z.string().max(160),
  history: z.array(History).default([]),
  verified: Verified.optional(),
  review: Review.optional(),
});

export const Question = z.discriminatedUnion('type', [
  Base.extend({ type: z.literal('single'), options: z.array(Option).length(4) }),
  Base.extend({
    type: z.literal('multi'),
    select: z.union([z.literal(2), z.literal(3)]),
    options: z.array(Option).min(5).max(6),
  }),
  Base.extend({ type: z.literal('match'), pairs: z.array(Pair).min(3).max(5) }),
]);
export type Question = z.infer<typeof Question>;
export type SingleQuestion = Extract<Question, { type: 'single' }>;
export type MultiQuestion = Extract<Question, { type: 'multi' }>;
export type MatchQuestion = Extract<Question, { type: 'match' }>;

/** A question file's outer shape; each item is validated on its own so one bad question never hides the others. */
export const QuestionFile = z.strictObject({ questions: z.array(z.unknown()) });
