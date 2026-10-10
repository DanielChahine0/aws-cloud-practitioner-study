import { z } from 'zod';
import { Slug } from './common.ts';

/** A goal reference, the same rule as `GoalId` in `schemas/lab.ts`, which imports this file. */
const GoalRef = z.string().regex(/^g[1-9]$/, 'must look like g1');
const Pieces = z.array(Slug).min(1).max(8);

/** Container kinds (spec 5.1): nested Regions, zones, VPCs and subnets, a VPC edge, pipeline stages and one bench. */
export const PLACE_KINDS = ['region', 'az', 'vpc', 'subnet', 'edge', 'stage', 'bench'] as const;
/** Piece roles the reachability rule reads: the gateway on the VPC edge and the route in a public subnet. */
export const PIECE_ROLES = ['internet-gateway', 'public-route'] as const;

type Issue = { path: (string | number)[]; message: string };

/** Every reference check of a Place spec, in the order the spec reads; each issue carries its path. */
function placeIssues(spec: {
  containers: readonly { id: string; kind: string; parent?: string | undefined }[];
  pieces: readonly { id: string }[];
  failures: readonly string[];
  constraints: readonly ({ kind: string; pieces: readonly string[] } & {
    within?: readonly string[];
    min?: number;
  })[];
}): Issue[] {
  const out: Issue[] = [];
  const byId = new Map<string, { id: string; kind: string; parent?: string | undefined }>();
  for (const [i, c] of spec.containers.entries()) {
    if (byId.has(c.id))
      out.push({ path: ['containers', i, 'id'], message: `container ${c.id} is used twice` });
    else byId.set(c.id, c);
  }
  const pieces = new Set<string>();
  for (const [i, p] of spec.pieces.entries()) {
    if (pieces.has(p.id)) out.push({ path: ['pieces', i, 'id'], message: `piece ${p.id} is used twice` });
    pieces.add(p.id);
  }
  const parents = new Set(spec.containers.flatMap((c) => (c.parent === undefined ? [] : [c.parent])));
  const bench = spec.containers.find((c) => c.kind === 'bench');
  let benches = 0;
  for (const [i, c] of spec.containers.entries()) {
    if (c.kind === 'bench') {
      benches += 1;
      if (benches > 1) out.push({ path: ['containers', i, 'kind'], message: 'only one bench is allowed' });
      if (c.parent !== undefined)
        out.push({ path: ['containers', i, 'parent'], message: 'the bench cannot have a parent' });
    }
    if (c.parent === undefined) {
      if (c.kind === 'subnet')
        out.push({ path: ['containers', i], message: `subnet ${c.id} needs a vpc above it` });
      continue;
    }
    if (!byId.has(c.parent)) {
      out.push({ path: ['containers', i, 'parent'], message: `names no container: ${c.parent}` });
      continue;
    }
    if (bench !== undefined && c.parent === bench.id && c.kind !== 'bench')
      out.push({ path: ['containers', i, 'parent'], message: 'the bench cannot hold containers' });
    const seen = new Set<string>();
    let up = byId.get(c.parent);
    let vpc = false;
    let cycle = false;
    while (up !== undefined && !seen.has(up.id)) {
      if (up.id === c.id) {
        cycle = true;
        break;
      }
      if (up.kind === 'vpc') vpc = true;
      seen.add(up.id);
      up = up.parent === undefined ? undefined : byId.get(up.parent);
    }
    if (cycle)
      out.push({ path: ['containers', i, 'parent'], message: `container ${c.id} is its own ancestor` });
    else if (c.kind === 'subnet' && !vpc)
      out.push({ path: ['containers', i], message: `subnet ${c.id} needs a vpc above it` });
  }
  if (!spec.containers.some((c) => c.kind !== 'bench' && !parents.has(c.id)))
    out.push({ path: ['containers'], message: 'needs a slot that is not the bench' });
  const list = (
    ids: readonly string[],
    where: (string | number)[],
    known: (id: string) => boolean,
    noun: string,
  ) => {
    const seen = new Set<string>();
    for (const [k, id] of ids.entries()) {
      if (!known(id)) out.push({ path: [...where, k], message: `names no ${noun}: ${id}` });
      else if (seen.has(id)) out.push({ path: [...where, k], message: `lists ${id} twice` });
      seen.add(id);
    }
  };
  list(spec.failures, ['failures'], (id) => byId.has(id), 'container');
  for (const [k, id] of spec.failures.entries())
    if (byId.get(id)?.kind === 'bench') out.push({ path: ['failures', k], message: 'cannot fail the bench' });
  for (const [i, c] of spec.constraints.entries()) {
    list(c.pieces, ['constraints', i, 'pieces'], (id) => pieces.has(id), 'piece');
    if (c.within !== undefined)
      list(c.within, ['constraints', i, 'within'], (id) => byId.has(id), 'container');
    if (c.min !== undefined && c.min > c.pieces.length)
      out.push({
        path: ['constraints', i, 'min'],
        message: `asks for ${c.min} running but lists only ${c.pieces.length}`,
      });
  }
  return out;
}

/** Place (spec 5.1): pieces go into the slots of nested containers; constraints judge where they sit and what survives. */
export const PlaceSpec = z
  .strictObject({
    containers: z
      .array(
        z.strictObject({
          id: Slug,
          label: z.string().min(2).max(40),
          kind: z.enum(PLACE_KINDS),
          parent: Slug.optional(),
          detail: z.string().max(80).optional(),
        }),
      )
      .min(2)
      .max(16),
    pieces: z
      .array(
        z.strictObject({
          id: Slug,
          label: z.string().min(2).max(40),
          role: z.enum(PIECE_ROLES).optional(),
          detail: z.string().max(80).optional(),
        }),
      )
      .min(2)
      .max(16),
    failures: z.array(Slug).max(6).default([]),
    constraints: z
      .array(
        z.discriminatedUnion('kind', [
          z.strictObject({
            kind: z.literal('in'),
            goal: GoalRef,
            pieces: Pieces,
            within: z.array(Slug).min(1).max(6),
          }),
          z.strictObject({
            kind: z.literal('survive'),
            goal: GoalRef,
            pieces: Pieces,
            min: z.int().min(1).max(8).default(1),
          }),
          z.strictObject({ kind: z.literal('public'), goal: GoalRef, pieces: Pieces }),
          z.strictObject({ kind: z.literal('private'), goal: GoalRef, pieces: Pieces }),
        ]),
      )
      .min(1)
      .max(12),
  })
  .superRefine((spec, ctx) => {
    for (const issue of placeIssues(spec)) ctx.addIssue({ code: 'custom', ...issue });
  });
export const PlaceAction = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('place'), piece: Slug, slot: Slug }),
  z.strictObject({ t: z.literal('unplace'), piece: Slug }),
  z.strictObject({ t: z.literal('fail'), container: Slug }),
  z.strictObject({ t: z.literal('restore') }),
  z.strictObject({ t: z.literal('reset') }),
]);
export type PlaceSpec = z.infer<typeof PlaceSpec>;
export type PlaceAction = z.infer<typeof PlaceAction>;
