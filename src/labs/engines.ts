import type { LabEngineId } from '../../schemas/ids.ts';
import type { SortSpec } from '../../schemas/lab.ts';
import type { InvestigateSpec } from '../../schemas/lab-investigate.ts';
import type { PlaceSpec } from '../../schemas/lab-place.ts';
import { CONFIGURE } from './configure/model.ts';
import type { GoalResult, LabEngine } from './contract.ts';
import { INVESTIGATE, type InvestigateState, investigateComplete } from './investigate/model.ts';
import { PLACE, type PlaceState, placeComplete } from './place/model.ts';
import { SIMULATE } from './simulate/model.ts';
import { SORT, type SortState, sortComplete } from './sort/model.ts';
import { TRACE } from './trace/model.ts';

export type AnyLabEngine = LabEngine<unknown, unknown, unknown>;

/**
 * One engine as the lab screen and R11 use it: `settle` is the actions applied before any check (Simulate runs its
 * model; the other engines need none), and `complete` says the board is finished, so a wrong path is judged by its
 * mistake and not by an unfinished board.
 */
export interface EngineEntry {
  readonly engine: AnyLabEngine;
  readonly settle: readonly unknown[];
  readonly complete: (spec: unknown, state: unknown) => boolean;
}

export const ENGINES: Readonly<Partial<Record<LabEngineId, EngineEntry>>> = {
  sort: {
    engine: SORT as unknown as AnyLabEngine,
    settle: [],
    complete: (spec, state) => sortComplete(spec as SortSpec, state as SortState),
  },
  configure: { engine: CONFIGURE as unknown as AnyLabEngine, settle: [], complete: () => true },
  simulate: { engine: SIMULATE as unknown as AnyLabEngine, settle: [{ t: 'run' }], complete: () => true },
  place: {
    engine: PLACE as unknown as AnyLabEngine,
    settle: [],
    complete: (spec, state) => placeComplete(spec as PlaceSpec, state as PlaceState),
  },
  // Any set of rules is a finished board.
  trace: { engine: TRACE as unknown as AnyLabEngine, settle: [], complete: () => true },
  investigate: {
    engine: INVESTIGATE as unknown as AnyLabEngine,
    settle: [],
    complete: (spec, state) => investigateComplete(spec as InvestigateSpec, state as InvestigateState),
  },
};

/** The registry entry of an engine id, or null when this build does not ship that engine. */
export function engineOf(id: string): EngineEntry | null {
  return Object.hasOwn(ENGINES, id) ? (ENGINES[id as LabEngineId] ?? null) : null;
}

/** Checks a board the one way the screen and R11 do: the `settle` actions first, then the engine's check. */
export function checkLab(entry: EngineEntry, spec: unknown, state: unknown): GoalResult[] {
  const settled = entry.settle.reduce((s: unknown, action) => entry.engine.reduce(s, action), state);
  return entry.engine.check(spec, settled);
}
