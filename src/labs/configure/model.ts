import type { ConfigureAction, ConfigureSpec } from '../../../schemas/lab.ts';
import type { GoalResult, LabEngine } from '../contract.ts';

/** The chosen value of every field: an option id for a select, a boolean for a toggle. */
export interface ConfigureState {
  readonly spec: ConfigureSpec;
  readonly values: Readonly<Record<string, string | boolean>>;
}

type Field = ConfigureSpec['fields'][number];
type Rule = ConfigureSpec['rules'][number];

function initial(spec: ConfigureSpec): ConfigureState {
  return { spec, values: Object.fromEntries(spec.fields.map((f) => [f.id, f.initial])) };
}

/** A value fits a field when it is one of a select's option ids, or a boolean for a toggle. */
function fits(field: Field, value: unknown): value is string | boolean {
  if (field.kind === 'toggle') return typeof value === 'boolean';
  return typeof value === 'string' && field.options.some((o) => o.id === value);
}

/** Goal ids in the order the rules first name them. */
export function configureGoals(spec: ConfigureSpec): string[] {
  return [...new Set(spec.rules.map((r) => r.goal))];
}

const holds = (state: ConfigureState, rule: Rule): boolean => {
  const value = state.values[rule.field];
  return value !== undefined && rule.in.includes(value);
};

export const CONFIGURE: LabEngine<ConfigureSpec, ConfigureState, ConfigureAction> = {
  init: initial,

  reduce(state, action) {
    if (typeof action !== 'object' || action === null) return state;
    const a = action as { t?: unknown; field?: unknown; value?: unknown };
    if (a.t === 'reset') return initial(state.spec);
    if (a.t !== 'set') return state;
    const field = state.spec.fields.find((f) => f.id === a.field);
    if (field === undefined || !fits(field, a.value)) return state;
    return { spec: state.spec, values: { ...state.values, [field.id]: a.value } };
  },

  check(spec, state): GoalResult[] {
    return configureGoals(spec).map((goalId) => {
      const rules = spec.rules.filter((r) => r.goal === goalId);
      const right = rules.filter((r) => holds(state, r)).length;
      return { goalId, pass: right === rules.length, message: `${right} of ${rules.length} settings right` };
    });
  },

  hint(spec, state, goalId) {
    const wrong = spec.rules.filter((r) => r.goal === goalId && !holds(state, r)).map((r) => r.field);
    const labels = [...new Set(wrong)].map((id) => spec.fields.find((f) => f.id === id)?.label ?? id);
    return labels.length === 0
      ? 'Every setting of this goal is right.'
      : `Look again at ${labels.join(' and ')}.`;
  },
};
