import type { PlaceAction, PlaceSpec } from '../../../schemas/lab-place.ts';
import type { GoalResult, LabEngine } from '../contract.ts';

/**
 * A Place board: the piece, slot and failure ids of its spec, where each placed piece sits (a piece not in `placed`
 * is in the tray), and the one failure the board previews; `check` never reads `failed`.
 */
export interface PlaceState {
  readonly pieces: readonly string[];
  readonly slots: readonly string[];
  readonly failures: readonly string[];
  readonly placed: Readonly<Record<string, string>>;
  readonly failed: string | null;
}

type Container = PlaceSpec['containers'][number];
type Constraint = PlaceSpec['constraints'][number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const placedIn = (state: PlaceState, piece: string): string | undefined =>
  Object.hasOwn(state.placed, piece) ? state.placed[piece] : undefined;

const containerOf = (spec: PlaceSpec, id: string): Container | undefined =>
  spec.containers.find((c) => c.id === id);

const labelOf = (spec: PlaceSpec, piece: string): string =>
  spec.pieces.find((p) => p.id === piece)?.label ?? piece;

/** A container and every container above it, nearest first; it stops at a repeat, so it always ends. */
function lineage(spec: PlaceSpec, id: string): Container[] {
  const out: Container[] = [];
  const seen = new Set<string>();
  let at = containerOf(spec, id);
  while (at !== undefined && !seen.has(at.id)) {
    out.push(at);
    seen.add(at.id);
    at = at.parent === undefined ? undefined : containerOf(spec, at.parent);
  }
  return out;
}

/** The slots: containers that hold no container, depth-first with children in spec order, the bench last. */
export function placeSlots(spec: PlaceSpec): string[] {
  const out: string[] = [];
  const walk = (c: Container, seen: ReadonlySet<string>): void => {
    if (seen.has(c.id)) return;
    const children = spec.containers.filter((k) => k.parent === c.id);
    if (children.length === 0) out.push(c.id);
    for (const child of children) walk(child, new Set([...seen, c.id]));
  };
  for (const top of spec.containers)
    if (top.parent === undefined && top.kind !== 'bench') walk(top, new Set());
  const bench = spec.containers.find((c) => c.kind === 'bench');
  if (bench !== undefined) out.push(bench.id);
  return out;
}

/** Goal ids in the order the constraints first name them. */
export function placeGoals(spec: PlaceSpec): string[] {
  return [...new Set(spec.constraints.map((c) => c.goal))];
}

/** True when `slot` is the failed container or sits below it. */
export function isDown(spec: PlaceSpec, slot: string, failure: string): boolean {
  return lineage(spec, slot).some((c) => c.id === failure);
}

/** True when the piece sits in a slot other than the bench. */
export function running(spec: PlaceSpec, state: PlaceState, piece: string): boolean {
  const slot = placedIn(state, piece);
  return slot !== undefined && containerOf(spec, slot)?.kind !== 'bench';
}

const inSubnet = (spec: PlaceSpec, slot: string): boolean =>
  lineage(spec, slot).some((c) => c.kind === 'subnet');

/** True when a running piece with this role sits in a slot that `where` accepts. */
function anyRunning(
  spec: PlaceSpec,
  state: PlaceState,
  role: 'internet-gateway' | 'public-route',
  where: (slot: string) => boolean,
): boolean {
  return spec.pieces.some((p) => {
    const slot = placedIn(state, p.id);
    return p.role === role && slot !== undefined && running(spec, state, p.id) && where(slot);
  });
}

/**
 * True when the internet reaches the piece: its nearest subnet holds a running public route, and that subnet's
 * nearest VPC holds a running internet gateway outside every subnet.
 */
export function reachable(spec: PlaceSpec, state: PlaceState, piece: string): boolean {
  const slot = placedIn(state, piece);
  if (slot === undefined || !running(spec, state, piece)) return false;
  const line = lineage(spec, slot);
  const at = line.findIndex((c) => c.kind === 'subnet');
  const subnet = line[at];
  const vpc = line.slice(at + 1).find((c) => c.kind === 'vpc');
  if (subnet === undefined || vpc === undefined) return false;
  return (
    anyRunning(spec, state, 'public-route', (s) => isDown(spec, s, subnet.id)) &&
    anyRunning(spec, state, 'internet-gateway', (s) => isDown(spec, s, vpc.id) && !inSubnet(spec, s))
  );
}

/** How many of the listed pieces run outside the failed container (or at all, with no failure). */
function survivors(
  spec: PlaceSpec,
  state: PlaceState,
  pieces: readonly string[],
  failure: string | null,
): number {
  return pieces.filter((p) => {
    const slot = placedIn(state, p);
    return (
      slot !== undefined && running(spec, state, p) && (failure === null || !isDown(spec, slot, failure))
    );
  }).length;
}

function passes(spec: PlaceSpec, state: PlaceState, c: Constraint): boolean {
  switch (c.kind) {
    case 'in':
      return c.pieces.every((p) => {
        const slot = placedIn(state, p);
        return slot !== undefined && c.within.some((w) => isDown(spec, slot, w));
      });
    case 'survive': {
      const failures = spec.failures.length > 0 ? spec.failures : [null];
      return failures.every((f) => survivors(spec, state, c.pieces, f) >= c.min);
    }
    case 'public':
      return c.pieces.every((p) => running(spec, state, p) && reachable(spec, state, p));
    case 'private':
      return c.pieces.every((p) => {
        const slot = placedIn(state, p);
        return (
          slot !== undefined && running(spec, state, p) && inSubnet(spec, slot) && !reachable(spec, state, p)
        );
      });
  }
}

/** The one sentence that says why a failing constraint fails, about the board as it is now. */
function reason(spec: PlaceSpec, state: PlaceState, c: Constraint): string {
  const tray = c.pieces.find((p) => placedIn(state, p) === undefined);
  if (tray !== undefined) return `${labelOf(spec, tray)} is still in the tray.`;
  switch (c.kind) {
    case 'in': {
      const off = c.pieces.find((p) => !c.within.some((w) => isDown(spec, placedIn(state, p) ?? '', w)));
      return `${labelOf(spec, off ?? c.pieces[0] ?? '')} is not where this goal needs it.`;
    }
    case 'survive': {
      if (survivors(spec, state, c.pieces, null) < c.min || spec.failures.length === 0)
        return 'Too few of them are running.';
      const down = spec.failures.find((f) => survivors(spec, state, c.pieces, f) < c.min) ?? '';
      return `Down when ${containerOf(spec, down)?.label ?? down} fails.`;
    }
    case 'public': {
      const off = c.pieces.find((p) => !reachable(spec, state, p)) ?? c.pieces[0] ?? '';
      return `Customers cannot reach ${labelOf(spec, off)}.`;
    }
    case 'private': {
      const idle = c.pieces.find((p) => !running(spec, state, p));
      if (idle !== undefined) return `${labelOf(spec, idle)} is not running.`;
      const loose = c.pieces.find((p) => !inSubnet(spec, placedIn(state, p) ?? ''));
      if (loose !== undefined) return `${labelOf(spec, loose)} is not in a subnet.`;
      const open = c.pieces.find((p) => reachable(spec, state, p)) ?? c.pieces[0] ?? '';
      return `The internet can reach ${labelOf(spec, open)}.`;
    }
  }
}

export const PLACE: LabEngine<PlaceSpec, PlaceState, PlaceAction> = {
  init(spec) {
    return {
      pieces: spec.pieces.map((p) => p.id),
      slots: placeSlots(spec),
      failures: [...spec.failures],
      placed: {},
      failed: null,
    };
  },

  reduce(state, action) {
    const a: unknown = action;
    if (!isRecord(a)) return state;
    if (a.t === 'place') {
      const { piece, slot } = a;
      if (typeof piece !== 'string' || typeof slot !== 'string') return state;
      if (!state.pieces.includes(piece) || !state.slots.includes(slot)) return state;
      if (placedIn(state, piece) === slot) return state;
      return { ...state, placed: { ...state.placed, [piece]: slot } };
    }
    if (a.t === 'unplace') {
      const { piece } = a;
      if (typeof piece !== 'string' || placedIn(state, piece) === undefined) return state;
      const placed = { ...state.placed };
      delete placed[piece];
      return { ...state, placed };
    }
    if (a.t === 'fail') {
      const { container } = a;
      if (typeof container !== 'string' || !state.failures.includes(container) || state.failed === container)
        return state;
      return { ...state, failed: container };
    }
    if (a.t === 'restore') return state.failed === null ? state : { ...state, failed: null };
    if (a.t === 'reset')
      return Object.keys(state.placed).length === 0 && state.failed === null
        ? state
        : { ...state, placed: {}, failed: null };
    return state;
  },

  check(spec, state) {
    return placeGoals(spec).map((goalId): GoalResult => {
      const constraints = spec.constraints.filter((c) => c.goal === goalId);
      const ok = constraints.filter((c) => passes(spec, state, c)).length;
      const n = constraints.length;
      return {
        goalId,
        pass: ok === n,
        message: n === 1 ? `${ok} of 1 check passes` : `${ok} of ${n} checks pass`,
      };
    });
  },

  hint(spec, state, goalId) {
    const failing = spec.constraints.find((c) => c.goal === goalId && !passes(spec, state, c));
    return failing === undefined ? 'Every check of this goal passes.' : reason(spec, state, failing);
  },
};

/** A Place board is finished when no piece is left in the tray; the bench counts as placed. */
export function placeComplete(spec: PlaceSpec, state: PlaceState): boolean {
  return spec.pieces.every((p) => placedIn(state, p.id) !== undefined);
}
