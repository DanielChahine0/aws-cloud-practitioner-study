import { z } from 'zod';
import { ConceptId, ModuleNumber, NoteId, Slug } from './common.ts';
import { LAB_ENGINES, LAB_ID, type LabEngineId } from './ids.ts';
import { Qid } from './question.ts';

/**
 * Lab files (spec 5.1): the envelope every engine shares, and each engine's spec and actions. This is the only home of
 * lab zod schemas; `src/labs` models import the inferred types with `import type`, so zod never reaches the app bundle.
 */
export const LabId = z.string().regex(LAB_ID, 'must look like lab-m03-pick-the-compute');
export const GoalId = z.string().regex(/^g[1-9]$/, 'must look like g1');

export const LabGoal = z.strictObject({
  id: GoalId,
  label: z.string().min(8).max(80),
  hint: z.string().min(20).max(240),
});

/** A wrong path: actions that model one learner mistake, the goal they must fail, and that mistake in a few words. */
export const WrongPath = z.strictObject({
  actions: z.array(z.unknown()).min(1),
  failsGoal: GoalId,
  mistake: z.string().min(10).max(120),
});

export const Debrief = z.strictObject({
  lines: z.array(z.string().min(20).max(240)).min(2).max(4),
  questions: z.array(Qid).min(2).max(3),
});

export const LabFile = z
  .strictObject({
    id: LabId,
    module: ModuleNumber,
    title: z.string().min(3).max(60),
    engine: z.enum(LAB_ENGINES),
    tier: z.enum(['core', 'stretch']),
    status: z.enum(['live', 'retired']).default('live'),
    rev: z.int().min(1),
    concepts: z.array(ConceptId).min(1).max(12),
    notes: z.array(NoteId).min(1).max(6),
    minutes: z.int().min(2).max(20),
    brief: z.string().min(40).max(500),
    spec: z.unknown(),
    goals: z.array(LabGoal).min(1).max(5),
    solution: z.array(z.unknown()).min(1),
    wrongPaths: z.array(WrongPath).min(1),
    debrief: Debrief,
  })
  .superRefine((lab, ctx) => {
    const nn = String(lab.module).padStart(2, '0');
    if (!lab.id.startsWith(`lab-m${nn}-`)) {
      ctx.addIssue({
        code: 'custom',
        path: ['id'],
        message: `must start with lab-m${nn}- to match module ${lab.module}`,
      });
    }
    const goals = new Set<string>();
    for (const [i, goal] of lab.goals.entries()) {
      if (goals.has(goal.id))
        ctx.addIssue({ code: 'custom', path: ['goals', i, 'id'], message: `goal ${goal.id} is used twice` });
      goals.add(goal.id);
    }
    for (const [j, path] of lab.wrongPaths.entries()) {
      if (!goals.has(path.failsGoal)) {
        ctx.addIssue({
          code: 'custom',
          path: ['wrongPaths', j, 'failsGoal'],
          message: `names no goal: ${path.failsGoal}`,
        });
      }
    }
    for (const [i, goal] of lab.goals.entries()) {
      if (!lab.wrongPaths.some((p) => p.failsGoal === goal.id)) {
        ctx.addIssue({ code: 'custom', path: ['goals', i], message: `goal ${goal.id} has no wrong path` });
      }
    }
    const qids = new Set<string>();
    for (const [k, qid] of lab.debrief.questions.entries()) {
      if (qids.has(qid))
        ctx.addIssue({
          code: 'custom',
          path: ['debrief', 'questions', k],
          message: `${qid} is listed twice`,
        });
      qids.add(qid);
    }
  });
export type LabFile = z.infer<typeof LabFile>;

/** Sort (spec 5.1): cards go into buckets; each card names its bucket, up to two allowed alternatives and its goal. */
export const SortSpec = z
  .strictObject({
    buckets: z
      .array(
        z.strictObject({
          id: Slug,
          label: z.string().min(2).max(40),
          detail: z.string().max(80).optional(),
        }),
      )
      .min(2)
      .max(10),
    cards: z
      .array(
        z.strictObject({
          id: Slug,
          text: z.string().min(3).max(120),
          bucket: Slug,
          also: z.array(Slug).max(2).default([]),
          goal: GoalId,
        }),
      )
      .min(4)
      .max(16),
  })
  .superRefine((spec, ctx) => {
    const buckets = new Set<string>();
    for (const [i, bucket] of spec.buckets.entries()) {
      if (buckets.has(bucket.id))
        ctx.addIssue({
          code: 'custom',
          path: ['buckets', i, 'id'],
          message: `bucket ${bucket.id} is used twice`,
        });
      buckets.add(bucket.id);
    }
    const cards = new Set<string>();
    for (const [i, card] of spec.cards.entries()) {
      if (cards.has(card.id))
        ctx.addIssue({ code: 'custom', path: ['cards', i, 'id'], message: `card ${card.id} is used twice` });
      cards.add(card.id);
      if (!buckets.has(card.bucket)) {
        ctx.addIssue({
          code: 'custom',
          path: ['cards', i, 'bucket'],
          message: `names no bucket: ${card.bucket}`,
        });
      }
      const seen = new Set<string>();
      for (const [k, alt] of card.also.entries()) {
        const where = ['cards', i, 'also', k];
        if (!buckets.has(alt))
          ctx.addIssue({ code: 'custom', path: where, message: `names no bucket: ${alt}` });
        else if (alt === card.bucket)
          ctx.addIssue({ code: 'custom', path: where, message: `repeats the card's bucket ${alt}` });
        else if (seen.has(alt)) ctx.addIssue({ code: 'custom', path: where, message: `lists ${alt} twice` });
        seen.add(alt);
      }
    }
  });
export const SortAction = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('place'), card: Slug, bucket: Slug }),
  z.strictObject({ t: z.literal('unplace'), card: Slug }),
  z.strictObject({ t: z.literal('reset') }),
]);
export type SortSpec = z.infer<typeof SortSpec>;
export type SortAction = z.infer<typeof SortAction>;

const ConfigureOption = z.strictObject({
  id: Slug,
  label: z.string().min(2).max(60),
  detail: z.string().max(120).optional(),
});
const SelectField = z.strictObject({
  kind: z.literal('select'),
  id: Slug,
  label: z.string().min(2).max(40),
  options: z.array(ConfigureOption).min(2).max(8),
  initial: Slug,
});
const ToggleField = z.strictObject({
  kind: z.literal('toggle'),
  id: Slug,
  label: z.string().min(2).max(60),
  initial: z.boolean(),
});
const ConfigureRule = z.strictObject({
  goal: GoalId,
  field: Slug,
  in: z.array(z.union([Slug, z.boolean()])).min(1),
});
export const ConfigureSpec = z
  .strictObject({
    fields: z
      .array(z.discriminatedUnion('kind', [SelectField, ToggleField]))
      .min(1)
      .max(8),
    rules: z.array(ConfigureRule).min(1),
  })
  .superRefine((spec, ctx) => {
    const fields = new Map<string, (typeof spec.fields)[number]>();
    spec.fields.forEach((f, i) => {
      if (fields.has(f.id))
        ctx.addIssue({ code: 'custom', path: ['fields', i, 'id'], message: `duplicate field id '${f.id}'` });
      fields.set(f.id, f);
      if (f.kind !== 'select') return;
      const ids = f.options.map((o) => o.id);
      ids.forEach((id, j) => {
        if (ids.indexOf(id) !== j)
          ctx.addIssue({
            code: 'custom',
            path: ['fields', i, 'options', j, 'id'],
            message: `duplicate option id '${id}'`,
          });
      });
      if (!ids.includes(f.initial))
        ctx.addIssue({
          code: 'custom',
          path: ['fields', i, 'initial'],
          message: `initial '${f.initial}' is not an option of ${f.id}`,
        });
    });
    spec.rules.forEach((r, i) => {
      const f = fields.get(r.field);
      if (f === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['rules', i, 'field'],
          message: `rule names unknown field '${r.field}'`,
        });
        return;
      }
      r.in.forEach((v, j) => {
        const ok =
          f.kind === 'toggle'
            ? typeof v === 'boolean'
            : typeof v === 'string' && f.options.some((o) => o.id === v);
        if (!ok)
          ctx.addIssue({
            code: 'custom',
            path: ['rules', i, 'in', j],
            message: `'${String(v)}' is not a value of field ${f.id}`,
          });
      });
    });
  });
export type ConfigureSpec = z.infer<typeof ConfigureSpec>;
export const ConfigureAction = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('set'), field: Slug, value: z.union([Slug, z.boolean()]) }),
  z.strictObject({ t: z.literal('reset') }),
]);
export type ConfigureAction = z.infer<typeof ConfigureAction>;

/** Each shipped engine's spec and action schemas; R11 and the build parse with these, the app never imports them. */
export const LAB_SCHEMAS: {
  readonly [E in LabEngineId]?: { readonly spec: z.ZodType; readonly action: z.ZodType };
} = {
  sort: { spec: SortSpec, action: SortAction },
  configure: { spec: ConfigureSpec, action: ConfigureAction },
};
