import { z } from 'zod';
import { ConceptId, ModuleNumber } from './common.ts';
import { INCIDENT_ID } from './ids.ts';

/** An incident id: `inc-` and three digits; Module m owns `inc-<4(m-2)+1>` to `inc-<4(m-1)>` (spec 4.5). */
export const IncidentId = z.string().regex(INCIDENT_ID, 'must look like inc-007');

/**
 * One daily incident (spec 2.6, 4.5): a short cafe story told over 2 to 4 steps. `modules[0]` is its home module,
 * whose chunk ships it; any later entry is an earlier module that must also be read. The steps stay `unknown` here
 * because the loader parses each one with the question schema, so a bad step reports its own path and line.
 */
export const IncidentFile = z
  .strictObject({
    id: IncidentId,
    title: z.string().min(8).max(60),
    status: z.enum(['live', 'retired']).default('live'),
    modules: z.array(ModuleNumber).min(1).max(3),
    concepts: z.array(ConceptId).min(1).max(4),
    brief: z.string().min(40).max(400),
    steps: z.array(z.unknown()).min(2).max(4),
  })
  .superRefine((file, ctx) => {
    const [home, ...earlier] = file.modules;
    if (new Set(file.modules).size !== file.modules.length) {
      ctx.addIssue({ code: 'custom', path: ['modules'], message: 'modules must be distinct' });
    }
    for (const [i, m] of earlier.entries()) {
      if (home !== undefined && m >= home) {
        ctx.addIssue({
          code: 'custom',
          path: ['modules', i + 1],
          message: `module ${m} must be lower than the home module ${home}`,
        });
      }
    }
  });
export type IncidentFile = z.infer<typeof IncidentFile>;
