import { z } from 'zod';
import { Slug } from './common.ts';
import { BADGE_IDS } from './ids.ts';

/** What a rank needs, every condition at the same moment (spec 3.4). */
export const RankRequires = z.strictObject({
  bosses: z.int().min(1).optional(),
  hexesAt60: z.int().min(1).optional(),
  unseenMocksAt80: z.int().min(1).optional(),
  latestMockWithinDays: z.int().min(1).optional(),
  ready: z.literal(true).optional(),
});
export type RankRequires = z.infer<typeof RankRequires>;

export const Rank = z.strictObject({
  id: Slug,
  name: z.string().min(2),
  short: z.string().min(2).max(12),
  requires: RankRequires,
  facts: z.array(z.string().min(10)).length(2).optional(),
});
export type Rank = z.infer<typeof Rank>;

/** content/game/ranks.yaml: the Support-plan ranks, lowest first (spec 3.4). */
export const Ranks = z
  .array(Rank)
  .min(1)
  .superRefine((ranks, ctx) => {
    const [first] = ranks;
    if (
      first !== undefined &&
      (first.id !== 'basic' || Object.keys(first.requires).length > 0 || first.facts !== undefined)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: [0],
        message: 'the first rank must be basic, with requires {} and no facts',
      });
    }
    const seen = new Set<string>();
    for (const [i, rank] of ranks.entries()) {
      if (seen.has(rank.id))
        ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `rank ${rank.id} is listed twice` });
      seen.add(rank.id);
      if (i > 0 && rank.facts === undefined) {
        ctx.addIssue({ code: 'custom', path: [i, 'facts'], message: `rank ${rank.id} needs two facts` });
      }
    }
  });

export const BadgeId = z.enum(BADGE_IDS);
export const Badge = z.strictObject({
  id: BadgeId,
  name: z.string().min(2),
  rule: z.string().min(10),
  arrives: z.enum(['labs', 'missions', 'capstone']).optional(),
});
export type Badge = z.infer<typeof Badge>;

/** content/game/badges.yaml: the 12 badges in spec 3.10 order. */
export const Badges = z
  .array(Badge)
  .length(12)
  .superRefine((badges, ctx) => {
    for (const [i, badge] of badges.entries()) {
      if (badge.id !== BADGE_IDS[i]) {
        ctx.addIssue({ code: 'custom', path: [i, 'id'], message: `badge ${i + 1} must be ${BADGE_IDS[i]}` });
      }
    }
  });
