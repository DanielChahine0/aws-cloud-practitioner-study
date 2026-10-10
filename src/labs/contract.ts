/**
 * The lab contract (spec 5.1): every engine is a pure reducer the UI drives only by dispatching actions. The zod spec
 * and action schemas live in `schemas/lab.ts` (a deliberate deviation: zod stays out of the app bundle).
 */
export interface GoalResult {
  goalId: string;
  pass: boolean;
  message: string;
}

export interface LabEngine<Spec, State, Action> {
  init(spec: Spec): State;
  /** Pure; a malformed or unknown action returns `state` itself. */
  reduce(state: State, action: Action): State;
  /** One result per goal id the spec names, in first-mention order. */
  check(spec: Spec, state: State): GoalResult[];
  hint(spec: Spec, state: State, goalId: string): string;
}

/** The state after `actions`, from the engine's starting state. */
export function replayLab<Spec, State, Action>(
  engine: LabEngine<Spec, State, Action>,
  spec: Spec,
  actions: readonly Action[],
): State {
  return actions.reduce((state, action) => engine.reduce(state, action), engine.init(spec));
}

/** True when there is at least one result and every one passes. */
export function allPass(results: readonly GoalResult[]): boolean {
  return results.length > 0 && results.every((r) => r.pass);
}
