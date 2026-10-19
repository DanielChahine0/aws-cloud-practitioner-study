import type { SimulateAction, SimulateSpec } from '../../../schemas/lab.ts';
import type { GoalResult, LabEngine } from '../contract.ts';
import {
  type MetricInfo,
  metricInfo,
  metricText,
  runModel,
  type SimResult,
  type SimValue,
} from './models.ts';

/** The parameter values on screen and the result of the last run, cleared by any change. */
export interface SimulateState {
  readonly spec: SimulateSpec;
  readonly values: Readonly<Record<string, SimValue>>;
  readonly result: SimResult | null;
}

type Param = SimulateSpec['params'][number];
type Threshold = SimulateSpec['thresholds'][number];

function initial(spec: SimulateSpec): SimulateState {
  return { spec, values: Object.fromEntries(spec.params.map((p) => [p.id, p.initial])), result: null };
}

/** An int within range and on its step, an option id, or a boolean, by the parameter's kind. */
function fits(p: Param, value: unknown): value is SimValue {
  if (p.kind === 'toggle') return typeof value === 'boolean';
  if (p.kind === 'choice') return typeof value === 'string' && p.options.some((o) => o.id === value);
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= p.min &&
    value <= p.max &&
    (value - p.min) % p.step === 0
  );
}

/** Goal ids in the order the thresholds first name them. */
export function simulateGoals(spec: SimulateSpec): string[] {
  return [...new Set(spec.thresholds.map((t) => t.goal))];
}

interface Reading extends MetricInfo {
  value: number;
  holds: boolean;
}

function read(spec: SimulateSpec, result: SimResult, t: Threshold): Reading {
  const info = metricInfo(spec.model, t.metric, spec.constants) ?? { label: t.metric, unit: '' };
  const value = result.metrics[t.metric] ?? Number.NaN;
  const holds = t.max !== undefined ? value <= t.max : t.min !== undefined && value >= t.min;
  return { ...info, value, holds };
}

function limitText(t: Threshold, info: MetricInfo): string {
  return t.max !== undefined ? `max ${metricText(t.max, info)}` : `min ${metricText(t.min ?? 0, info)}`;
}

export const SIMULATE: LabEngine<SimulateSpec, SimulateState, SimulateAction> = {
  init: initial,

  reduce(state, action) {
    if (typeof action !== 'object' || action === null) return state;
    const a = action as { t?: unknown; param?: unknown; value?: unknown };
    if (a.t === 'reset') return initial(state.spec);
    if (a.t === 'run') {
      return { ...state, result: runModel(state.spec.model, state.spec.constants, state.values) };
    }
    if (a.t !== 'set') return state;
    const p = state.spec.params.find((x) => x.id === a.param);
    if (p === undefined || !fits(p, a.value)) return state;
    return { spec: state.spec, values: { ...state.values, [p.id]: a.value }, result: null };
  },

  check(spec, state): GoalResult[] {
    return simulateGoals(spec).map((goalId) => {
      const result = state.result;
      if (result === null) return { goalId, pass: false, message: 'Not run yet' };
      const mine = spec.thresholds.filter((t) => t.goal === goalId);
      const readings = mine.map((t) => ({ t, r: read(spec, result, t) }));
      return {
        goalId,
        pass: readings.every(({ r }) => r.holds),
        message: readings
          .map(({ t, r }) => `${r.label}: ${metricText(r.value, r)} (${limitText(t, r)})`)
          .join('; '),
      };
    });
  },

  hint(spec, state, goalId) {
    const result = state.result;
    if (result === null) return 'Run the simulation first.';
    for (const t of spec.thresholds.filter((x) => x.goal === goalId)) {
      const r = read(spec, result, t);
      if (r.holds) continue;
      return t.max !== undefined
        ? `${r.label} is ${metricText(r.value, r)}, over the ${metricText(t.max, r)} limit.`
        : `${r.label} is ${metricText(r.value, r)}, under the ${metricText(t.min ?? 0, r)} minimum.`;
    }
    return 'Every threshold of this goal holds.';
  },
};
