import { z } from 'zod';
import { ConceptId, IsoDate, ModuleNumber, Slug } from './common.ts';
import { Review } from './question.ts';

/**
 * The capstone content (spec 6): the brief in content/project/brief.yaml and one key point file per decision in
 * content/project/key-points/NN-<module-dir>.yaml.
 */

/** A key point id: `kp-`, the two-digit module of its file and a kebab-case slug, like kp-06-lifecycle-to-deep-archive. */
export const KEY_POINT_ID = /^kp-(0[1-9]|1[0-3])-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Rubric criterion ids in score order; a decision's `scores` tuple follows this order. */
export const CRITERION_IDS = ['fit', 'grounding', 'tradeoffs', 'cost'] as const;

const Level = z.string().min(1).max(120);

export const Fact = z.strictObject({ id: Slug, text: z.string().min(10).max(300) });
export type Fact = z.infer<typeof Fact>;

export const BriefDecision = z.strictObject({
  module: ModuleNumber,
  title: z.string().min(3).max(60),
  prompt: z.string().min(20).max(300),
  context: z.array(z.string().min(10).max(300)).min(2).max(4),
});
export type BriefDecision = z.infer<typeof BriefDecision>;

export const Criterion = z.strictObject({
  id: z.enum(CRITERION_IDS),
  name: z.string().min(1),
  levels: z.tuple([Level, Level, Level, Level]),
});
export type Criterion = z.infer<typeof Criterion>;

export const Rubric = z
  .strictObject({
    passTotal: z.literal(8),
    criteria: z.tuple([Criterion, Criterion, Criterion, Criterion]),
  })
  .refine((r) => r.criteria.map((c) => c.id).join() === CRITERION_IDS.join(), {
    message: `criteria must be ${CRITERION_IDS.join(', ')} in that order`,
    path: ['criteria'],
  });
export type Rubric = z.infer<typeof Rubric>;

export const Brief = z
  .strictObject({
    title: z.string().min(1).max(80),
    facts: z.array(Fact).length(7),
    decisions: z.array(BriefDecision).length(13),
    rubric: Rubric,
  })
  .superRefine((b, ctx) => {
    for (const [i, d] of b.decisions.entries()) {
      if (d.module !== i + 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['decisions', i, 'module'],
          message: `decision ${i + 1} must be for Module ${i + 1}`,
        });
      }
    }
    const seen = new Set<string>();
    for (const [i, f] of b.facts.entries()) {
      if (seen.has(f.id)) {
        ctx.addIssue({ code: 'custom', path: ['facts', i, 'id'], message: `fact id ${f.id} appears twice` });
      }
      seen.add(f.id);
    }
  });
export type Brief = z.infer<typeof Brief>;

/** The stamp of a key point: its fullHash over text, concepts and evidence, and its one agent check, critic (spec 2.7). */
export const KeyPointVerified = z.strictObject({
  fullHash: z.string().regex(/^[0-9a-f]{12}$/, 'must be 12 hex characters'),
  checks: z.tuple([z.string().regex(/^critic@[1-9]\d*$/, 'must look like critic@1')]),
  on: IsoDate,
});
export type KeyPointVerified = z.infer<typeof KeyPointVerified>;

export const KeyPointStatus = z.enum(['draft', 'live', 'retired']);

export const KeyPoint = z.strictObject({
  id: z.string().regex(KEY_POINT_ID, 'must look like kp-06-lifecycle-to-deep-archive'),
  status: KeyPointStatus,
  text: z.string().min(20).max(300),
  concepts: z.array(ConceptId).min(1).max(3),
  evidence: z.string().min(1).max(400),
  verified: KeyPointVerified.optional(),
  review: Review.optional(),
});
export type KeyPoint = z.infer<typeof KeyPoint>;

/** Key points that are not retired: a file holds 4 to 6 of them (spec 6, 4 to 6 per decision). */
export const MIN_KEY_POINTS = 4;
export const MAX_KEY_POINTS = 6;

export const KeyPointFile = z
  .strictObject({ module: ModuleNumber, keyPoints: z.array(KeyPoint) })
  .superRefine((f, ctx) => {
    const open = f.keyPoints.filter((k) => k.status !== 'retired').length;
    if (open < MIN_KEY_POINTS || open > MAX_KEY_POINTS) {
      ctx.addIssue({
        code: 'custom',
        path: ['keyPoints'],
        message: `a key point file needs ${MIN_KEY_POINTS} to ${MAX_KEY_POINTS} key points that are not retired; it has ${open}`,
      });
    }
    const seen = new Set<string>();
    for (const [i, k] of f.keyPoints.entries()) {
      if (seen.has(k.id))
        ctx.addIssue({ code: 'custom', path: ['keyPoints', i, 'id'], message: `${k.id} appears twice` });
      seen.add(k.id);
      const owner = Number(KEY_POINT_ID.exec(k.id)?.[1]);
      if (owner !== f.module) {
        ctx.addIssue({
          code: 'custom',
          path: ['keyPoints', i, 'id'],
          message: `${k.id} belongs to Module ${owner}, not Module ${f.module}`,
        });
      }
    }
  });
export type KeyPointFile = z.infer<typeof KeyPointFile>;
