import { z } from 'zod';
import { metricInfo, modelParams, type PurchaseOption, type SimModel } from '../src/labs/simulate/models.ts';
import { ConceptId, ModuleNumber, NoteId, Slug } from './common.ts';
import { LAB_ENGINES, LAB_ID, type LabEngineId } from './ids.ts';
import { InvestigateAction, InvestigateSpec } from './lab-investigate.ts';
import { PlaceAction, PlaceSpec } from './lab-place.ts';
import { TraceAction, TraceSpec } from './lab-trace.ts';
import { Qid } from './question.ts';

/**
 * Lab files (spec 5.1): the envelope every engine shares, and each engine's spec and actions. This file and its
 * per-engine siblings (schemas/lab-place.ts, schemas/lab-trace.ts, schemas/lab-investigate.ts) are the only home of
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

export const SIM_MODELS = [
  'scaling',
  'compute-cost',
  's3-lifecycle',
  'cache',
  'bill',
  'transfer',
  'purchase',
  'data-loss',
] as const satisfies readonly SimModel[];

const Label = z.string().min(2).max(40);
/** A model parameter id: `max`, `secondDay` or a workload or job id such as `menu-export`. */
export const ParamId = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*(?:-[a-z0-9]+)*$/, 'must look like secondDay or menu-export');
/** Ids must be unique within a list; reports every repeat at its index. */
function uniqueIds(list: readonly { id: string }[], ctx: z.RefinementCtx, at: (string | number)[]): void {
  list.forEach((x, i) => {
    if (list.findIndex((y) => y.id === x.id) !== i)
      ctx.addIssue({ code: 'custom', path: [...at, i, 'id'], message: `duplicate id '${x.id}'` });
  });
}
const Tiers = z
  .array(z.strictObject({ upTo: z.number().positive().nullable(), rate: z.number().min(0) }))
  .min(1)
  .max(4)
  .superRefine((tiers, ctx) => {
    tiers.forEach((t, i) => {
      const last = i === tiers.length - 1;
      if (last !== (t.upTo === null))
        ctx.addIssue({ code: 'custom', path: [i, 'upTo'], message: 'only the last band has upTo: null' });
      const prev = i > 0 ? tiers[i - 1]?.upTo : undefined;
      if (t.upTo !== null && typeof prev === 'number' && t.upTo <= prev)
        ctx.addIssue({ code: 'custom', path: [i, 'upTo'], message: 'upTo must rise from band to band' });
    });
  });
const Named = { id: Slug, label: Label };
/** A purchase option's lab credits per hour. */
const Rate = z.number().positive();

/** The constants each model reads; every figure is a lab value, every price is in lab credits. */
export const SIM_CONSTANTS: { readonly [M in SimModel]: z.ZodType } = {
  scaling: z.strictObject({
    orders: z.array(z.int().min(0)).length(24),
    perInstance: z.int().min(1),
    credits: z.number().positive(),
  }),
  'compute-cost': z
    .strictObject({
      workloads: z
        .array(
          z.strictObject({
            ...Named,
            requests: z.int().min(0),
            ms: z.number().positive(),
            mb: z.int().min(1),
          }),
        )
        .min(1)
        .max(3),
      perMillion: z.number().min(0),
      perGbSecond: z.number().min(0),
      instanceMonth: z.number().min(0),
    })
    .superRefine((c, ctx) => uniqueIds(c.workloads, ctx, ['workloads'])),
  's3-lifecycle': z
    .strictObject({
      gb: z.number().positive(),
      classes: z
        .array(
          z.strictObject({
            ...Named,
            storage: z.number().min(0),
            retrieval: z.number().min(0),
            minDays: z.int().min(0),
            hours: z.number().min(0),
            zones: z.union([z.literal(1), z.literal(3)]),
          }),
        )
        .min(2)
        .max(8),
      reads: z
        .array(
          z.strictObject({
            day: z.int().min(0).max(364),
            gb: z.number().positive(),
            within: z.number().min(0),
          }),
        )
        .max(6),
      zoneLoss: z.int().min(0).max(364).nullable(),
    })
    .superRefine((c, ctx) => uniqueIds(c.classes, ctx, ['classes'])),
  cache: z
    .strictObject({
      reads: z.int().min(0),
      writes: z.int().min(0),
      dbs: z
        .array(z.strictObject({ ...Named, capacity: z.int().min(1), credits: z.number().min(0) }))
        .min(1)
        .max(4),
      caches: z
        .array(z.strictObject({ ...Named, hit: z.number().min(0).max(0.95), credits: z.number().min(0) }))
        .min(2)
        .max(4),
      cacheMs: z.number().positive(),
      dbMs: z.number().positive(),
    })
    .superRefine((c, ctx) => {
      uniqueIds(c.dbs, ctx, ['dbs']);
      uniqueIds(c.caches, ctx, ['caches']);
      const off = c.caches.find((x) => x.id === 'off');
      if (off === undefined || off.hit !== 0 || off.credits !== 0)
        ctx.addIssue({
          code: 'custom',
          path: ['caches'],
          message: "caches need one 'off' entry with hit 0 and credits 0",
        });
    }),
  bill: z
    .strictObject({
      accounts: z
        .array(
          z.strictObject({
            ...Named,
            hours: z.number().min(0),
            s3Gb: z.number().min(0),
            outGb: z.number().min(0),
          }),
        )
        .min(2)
        .max(3),
      hourRate: z.number().positive(),
      commitRate: z.number().positive(),
      s3Tiers: Tiers,
      outTiers: Tiers,
      budget: z.number().positive(),
    })
    .superRefine((c, ctx) => uniqueIds(c.accounts, ctx, ['accounts'])),
  transfer: z
    .strictObject({
      jobs: z
        .array(
          z.strictObject({
            ...Named,
            tb: z.number().positive(),
            mbps: z.number().positive(),
            deadline: z.number().positive(),
          }),
        )
        .min(1)
        .max(3),
      turnaround: z.number().positive(),
      deviceTb: z.number().positive(),
    })
    .superRefine((c, ctx) => uniqueIds(c.jobs, ctx, ['jobs'])),
  purchase: z
    .strictObject({
      workloads: z
        .array(
          z.strictObject({
            ...Named,
            hours: z.int().min(1).max(744),
            months: z.int().min(1).max(12),
            interruptible: z.boolean(),
            needs: z.enum(['none', 'dedicated-instance', 'dedicated-host']),
          }),
        )
        .min(2)
        .max(6),
      rates: z.strictObject({
        'on-demand': Rate,
        reserved: Rate,
        'savings-plan': Rate,
        spot: Rate,
        'dedicated-instance': Rate,
        'dedicated-host': Rate,
      } satisfies Record<PurchaseOption, z.ZodNumber>),
      termMonths: z.int().min(1).max(36),
    })
    .superRefine((c, ctx) => uniqueIds(c.workloads, ctx, ['workloads'])),
  'data-loss': z
    .strictObject({
      hours: z.int().min(24).max(168),
      perHour: z.int().min(1).max(1000),
      stopAt: z.int(),
      zoneLossAt: z.int(),
      fullSnapshot: z.number().min(0),
      incrementalSnapshot: z.number().min(0),
    })
    .refine((c) => 0 < c.stopAt && c.stopAt < c.zoneLossAt && c.zoneLossAt < c.hours, {
      message: 'stopAt and zoneLossAt must fall in order inside hours',
    }),
};

const IntParam = z.strictObject({
  kind: z.literal('int'),
  id: ParamId,
  label: Label,
  min: z.int(),
  max: z.int(),
  step: z.int().min(1),
  initial: z.int(),
  unit: z.string().max(20).optional(),
});
const ChoiceParam = z.strictObject({
  kind: z.literal('choice'),
  id: ParamId,
  label: z.string().min(2).max(60),
  options: z
    .array(z.strictObject({ id: Slug, label: Label }))
    .min(2)
    .max(8),
  initial: Slug,
});
const ToggleParam = z.strictObject({
  kind: z.literal('toggle'),
  id: ParamId,
  label: z.string().min(2).max(60),
  initial: z.boolean(),
});
const SimThreshold = z.strictObject({
  goal: GoalId,
  metric: z.string().min(1),
  max: z.number().optional(),
  min: z.number().optional(),
});

export const SimulateSpec = z
  .strictObject({
    model: z.enum(SIM_MODELS),
    constants: z.unknown(),
    params: z
      .array(z.discriminatedUnion('kind', [IntParam, ChoiceParam, ToggleParam]))
      .min(1)
      .max(12),
    thresholds: z.array(SimThreshold).min(1),
  })
  .superRefine((spec, ctx) => {
    const constants = SIM_CONSTANTS[spec.model].safeParse(spec.constants);
    if (!constants.success) {
      for (const issue of constants.error.issues)
        ctx.addIssue({
          code: 'custom',
          path: ['constants', ...issue.path.map(String)],
          message: issue.message,
        });
      return;
    }
    const shapes = modelParams(spec.model, constants.data);
    const declared = new Set(spec.params.map((p) => p.id));
    for (const s of shapes)
      if (!declared.has(s.id))
        ctx.addIssue({ code: 'custom', path: ['params'], message: `missing parameter '${s.id}'` });
    spec.params.forEach((p, i) => {
      const at = ['params', i];
      if (spec.params.findIndex((q) => q.id === p.id) !== i)
        ctx.addIssue({ code: 'custom', path: [...at, 'id'], message: `duplicate parameter '${p.id}'` });
      const shape = shapes.find((s) => s.id === p.id);
      if (shape === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [...at, 'id'],
          message: `model ${spec.model} has no parameter '${p.id}'`,
        });
        return;
      }
      if (shape.kind !== p.kind) {
        ctx.addIssue({
          code: 'custom',
          path: [...at, 'kind'],
          message: `parameter ${p.id} must be ${shape.kind}`,
        });
        return;
      }
      if (p.kind === 'choice') {
        const ids = p.options.map((o) => o.id);
        const allowed = shape.options ?? [];
        if (ids.length !== allowed.length || !allowed.every((id) => ids.includes(id)))
          ctx.addIssue({
            code: 'custom',
            path: [...at, 'options'],
            message: `options of ${p.id} must be ${allowed.join(', ')}`,
          });
        if (!ids.includes(p.initial))
          ctx.addIssue({
            code: 'custom',
            path: [...at, 'initial'],
            message: `initial '${p.initial}' is not an option of ${p.id}`,
          });
      }
      if (p.kind === 'int') {
        const lo = shape.min ?? 0;
        const hi = shape.max ?? 0;
        if (p.min < lo || p.max > hi || p.min > p.max)
          ctx.addIssue({
            code: 'custom',
            path: [...at, 'min'],
            message: `${p.id} must range within ${lo} to ${hi}`,
          });
        if (p.initial < p.min || p.initial > p.max || (p.initial - p.min) % p.step !== 0)
          ctx.addIssue({
            code: 'custom',
            path: [...at, 'initial'],
            message: `initial ${p.initial} is off the range or step of ${p.id}`,
          });
      }
    });
    spec.thresholds.forEach((t, i) => {
      if ((t.max === undefined) === (t.min === undefined))
        ctx.addIssue({
          code: 'custom',
          path: ['thresholds', i],
          message: 'a threshold has exactly one of max and min',
        });
      if (metricInfo(spec.model, t.metric, constants.data) === null)
        ctx.addIssue({
          code: 'custom',
          path: ['thresholds', i, 'metric'],
          message: `model ${spec.model} has no metric '${t.metric}'`,
        });
    });
  });
export type SimulateSpec = z.infer<typeof SimulateSpec>;
export const SimulateAction = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('set'), param: ParamId, value: z.union([z.number(), Slug, z.boolean()]) }),
  z.strictObject({ t: z.literal('run') }),
  z.strictObject({ t: z.literal('reset') }),
]);
export type SimulateAction = z.infer<typeof SimulateAction>;

/** Each shipped engine's spec and action schemas; R11 and the build parse with these, the app never imports them. */
export const LAB_SCHEMAS: {
  readonly [E in LabEngineId]?: { readonly spec: z.ZodType; readonly action: z.ZodType };
} = {
  sort: { spec: SortSpec, action: SortAction },
  configure: { spec: ConfigureSpec, action: ConfigureAction },
  simulate: { spec: SimulateSpec, action: SimulateAction },
  place: { spec: PlaceSpec, action: PlaceAction },
  trace: { spec: TraceSpec, action: TraceAction },
  investigate: { spec: InvestigateSpec, action: InvestigateAction },
};
