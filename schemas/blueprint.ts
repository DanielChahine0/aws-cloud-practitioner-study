import { z } from 'zod';
import { ConceptId, HttpsUrl, IsoDate, TASK_IDS, TaskId } from './common.ts';

const Term = z.union([z.string().min(2), z.strictObject({ term: z.string().min(2), coveredBy: ConceptId })]);
export type BlueprintTerm = z.infer<typeof Term>;

/** content/exam/blueprint.yaml: the CLF-C02 domains and task statements, with the terms each task names (spec 2.3). */
export const Blueprint = z
  .strictObject({
    exam: z.literal('CLF-C02'),
    guide: z.strictObject({ url: HttpsUrl, verified_on: IsoDate }),
    domains: z
      .array(
        z.strictObject({
          id: z.enum(['1', '2', '3', '4']),
          name: z.string().min(1),
          weight: z.number().int().min(1).max(100),
          url: HttpsUrl,
          verified_on: IsoDate,
        }),
      )
      .length(4),
    tasks: z
      .array(
        z.strictObject({
          id: TaskId,
          text: z.string().min(10),
          terms: z.array(Term),
          url: HttpsUrl,
          verified_on: IsoDate,
        }),
      )
      .length(19),
  })
  .superRefine((b, ctx) => {
    const sum = b.domains.reduce((total, d) => total + d.weight, 0);
    if (sum !== 100)
      ctx.addIssue({ code: 'custom', path: ['domains'], message: `domain weights sum to ${sum}, not 100` });
    const ids = new Set(b.tasks.map((t) => t.id));
    for (const id of TASK_IDS) {
      if (!ids.has(id)) ctx.addIssue({ code: 'custom', path: ['tasks'], message: `task ${id} is missing` });
    }
  });
export type Blueprint = z.infer<typeof Blueprint>;
