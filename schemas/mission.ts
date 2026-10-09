import { z } from 'zod';
import { HttpsUrl, IsoDate, ModuleNumber } from './common.ts';

/** Frontmatter of content/missions/mission-NN-slug.md (spec 5.3). */
export const MissionFrontmatter = z
  .strictObject({
    id: z.string().regex(/^mission-\d{2}$/),
    title: z.string().min(1),
    modules: z.array(ModuleNumber).min(1),
    services: z.array(z.string().min(1)).min(1),
    expectedCredits: z.string().min(1),
    gate: z.boolean().optional(),
    keep: z.boolean(),
    maxLiveHours: z.number().positive().optional(),
    canUseCredits: z.array(z.string().min(1)),
    leftovers: z.array(z.string().min(1)),
    sources: z.array(z.strictObject({ url: HttpsUrl, verified_on: IsoDate })).min(1),
  })
  .superRefine((m, ctx) => {
    const cleanedUp = !m.keep && m.gate !== true;
    if (cleanedUp && m.maxLiveHours === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxLiveHours'],
        message: 'a mission that is cleaned up needs maxLiveHours',
      });
    }
    if (!cleanedUp && m.maxLiveHours !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxLiveHours'],
        message: 'kept and gate missions have no maxLiveHours',
      });
    }
  });
export type MissionFrontmatter = z.infer<typeof MissionFrontmatter>;
