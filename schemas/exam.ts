import { z } from 'zod';
import { ModuleNumber, TASK_IDS, TaskId } from './common.ts';
import { DOMAIN_IDS, FORM_IDS } from './ids.ts';
import { Qid } from './question.ts';

export const DomainId = z.enum(DOMAIN_IDS);
export const FormId = z.enum(FORM_IDS);

const Count = z.int().min(0);
const DomainCounts = z.strictObject({ '1': Count, '2': Count, '3': Count, '4': Count });
const total = (values: Iterable<number>): number => {
  let sum = 0;
  for (const v of values) sum += v;
  return sum;
};
const pad = (module: number): string => String(module).padStart(2, '0');

/**
 * content/exam/quotas.yaml, written only by pnpm content:quotas (spec 2.6, 4.3): the per-form domain, task and
 * multi-response counts, the pool's module by task cells and each module's share of the multi-response target.
 */
export const Quotas = z
  .strictObject({
    form: z.strictObject({
      size: z.literal(65),
      domains: DomainCounts,
      tasks: z.record(TaskId, Count),
      multi: DomainCounts,
    }),
    pool: z.strictObject({
      size: z.literal(260),
      forms: z.literal(4),
      maxPerConcept: z.literal(4),
      multi: DomainCounts,
    }),
    cells: z.array(z.strictObject({ module: ModuleNumber, task: TaskId, target: z.int().min(1) })),
    multiByModule: z.array(
      z.strictObject({ module: ModuleNumber, domain: DomainId, target: z.int().min(1) }),
    ),
  })
  .superRefine((q, ctx) => {
    const issue = (path: (string | number)[], message: string): void => {
      ctx.addIssue({ code: 'custom', path, message });
    };
    const taskSum = total(Object.values(q.form.tasks));
    if (taskSum !== q.form.size) issue(['form', 'tasks'], `tasks sum to ${taskSum}, not ${q.form.size}`);
    const domainSum = total(Object.values(q.form.domains));
    if (domainSum !== q.form.size)
      issue(['form', 'domains'], `domains sum to ${domainSum}, not ${q.form.size}`);
    for (const d of DOMAIN_IDS) {
      const inDomain = total(TASK_IDS.filter((t) => t.startsWith(`${d}.`)).map((t) => q.form.tasks[t]));
      if (inDomain !== q.form.domains[d]) {
        issue(['form', 'tasks'], `tasks of domain ${d} sum to ${inDomain}, not ${q.form.domains[d]}`);
      }
      if (q.pool.multi[d] !== q.pool.forms * q.form.multi[d]) {
        issue(
          ['pool', 'multi', d],
          `domain ${d} needs ${q.pool.forms * q.form.multi[d]}, not ${q.pool.multi[d]}`,
        );
      }
      const shares = total(q.multiByModule.filter((m) => m.domain === d).map((m) => m.target));
      if (shares !== q.pool.multi[d]) {
        issue(['multiByModule'], `domain ${d} shares sum to ${shares}, not ${q.pool.multi[d]}`);
      }
    }
    const seen = new Set<string>();
    for (const [i, cell] of q.cells.entries()) {
      const key = `${cell.module}|${cell.task}`;
      if (seen.has(key)) issue(['cells', i], `cell m${pad(cell.module)} task ${cell.task} is listed twice`);
      seen.add(key);
    }
    for (const t of TASK_IDS) {
      const cells = total(q.cells.filter((c) => c.task === t).map((c) => c.target));
      const want = q.pool.forms * q.form.tasks[t];
      if (cells !== want) issue(['cells'], `cells of task ${t} sum to ${cells}, not ${want}`);
    }
  });
export type Quotas = z.infer<typeof Quotas>;

/** content/exam/forms.yaml, written only by pnpm content:forms (spec 4.3): forms A to D by qid, frozen once committed. */
export const Forms = z
  .strictObject({
    seed: z.int().min(0),
    forms: z
      .array(z.strictObject({ id: FormId, frozen: z.boolean(), qids: z.array(Qid).min(1).max(65) }))
      .length(4),
  })
  .superRefine((f, ctx) => {
    for (const [i, form] of f.forms.entries()) {
      if (form.id !== FORM_IDS[i]) {
        ctx.addIssue({
          code: 'custom',
          path: ['forms', i, 'id'],
          message: `form ${i + 1} must be ${FORM_IDS[i]}`,
        });
      }
      const seen = new Set<string>();
      for (const qid of form.qids) {
        if (seen.has(qid)) {
          ctx.addIssue({
            code: 'custom',
            path: ['forms', i, 'qids'],
            message: `form ${form.id} lists ${qid} twice`,
          });
        }
        seen.add(qid);
      }
    }
  });
export type Forms = z.infer<typeof Forms>;
