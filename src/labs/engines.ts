import type { LabEngineId } from '../../schemas/ids.ts';
import type { SortSpec } from '../../schemas/lab.ts';
import type { GoalResult, LabEngine } from './contract.ts';
import { SORT, type SortState, sortComplete } from './sort/model.ts';

export type AnyLabEngine = LabEngine<unknown, unknown, unknown>;

/**
 * One engine as the lab screen and R11 use it: `settle` is the actions applied before any check (Simulate runs its
 * model; Sort and Configure need none), and `complete` says the board is finished, so a wrong path is judged by its
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
