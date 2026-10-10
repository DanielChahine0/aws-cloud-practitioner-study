import type { InvestigateAction, InvestigateSpec } from '../../../schemas/lab-investigate.ts';
import type { GoalResult, LabEngine } from '../contract.ts';

/** What Dani has filtered and answered; the spec's filter values and option ids ride along so `reduce` validates alone. */
export interface InvestigateState {
  /** Each filter column's distinct values, in first-seen record order. */
  readonly filterable: Readonly<Record<string, readonly string[]>>;
  /** Each question's option ids. */
  readonly options: Readonly<Record<string, readonly string[]>>;
  /** The active filters: column id to the one value shown. */
  readonly filters: Readonly<Record<string, string>>;
  /** The chosen answers: question id to option id. */
  readonly answers: Readonly<Record<string, string>>;
}

type Question = InvestigateSpec['questions'][number];

/** The distinct values of one column across the records, in first-seen order; none for an unknown column. */
export function filterValues(spec: InvestigateSpec, column: string): string[] {
  const values = spec.records.flatMap((r) => {
    const value = Object.hasOwn(r.cells, column) ? r.cells[column] : undefined;
    return value === undefined ? [] : [value];
  });
  return [...new Set(values)];
}

/** Goal ids in the order the questions first name them. */
export function investigateGoals(spec: InvestigateSpec): string[] {
  return [...new Set(spec.questions.map((q) => q.goal))];
}

/** The records every active filter lets through, in spec order; filters never change a check. */
export function visibleRecords(spec: InvestigateSpec, state: InvestigateState): InvestigateSpec['records'] {
  const active = Object.entries(state.filters);
  return spec.records.filter((r) => active.every(([column, value]) => r.cells[column] === value));
}

/** An Investigate board is finished when every question has an answer. */
export function investigateComplete(spec: InvestigateSpec, state: InvestigateState): boolean {
  return spec.questions.every((q) => Object.hasOwn(state.answers, q.id));
}

const answerOf = (state: InvestigateState, q: Question): string | undefined =>
  Object.hasOwn(state.answers, q.id) ? state.answers[q.id] : undefined;

const plural = (n: number, word: string, what: string): string => `${n} ${word}${n === 1 ? '' : 's'} ${what}`;

function initial(spec: InvestigateSpec): InvestigateState {
  return {
    filterable: Object.fromEntries(
      spec.columns.filter((c) => c.filter).map((c) => [c.id, filterValues(spec, c.id)]),
    ),
    options: Object.fromEntries(spec.questions.map((q) => [q.id, q.options.map((o) => o.id)])),
    filters: {},
    answers: {},
  };
}

export const INVESTIGATE: LabEngine<InvestigateSpec, InvestigateState, InvestigateAction> = {
  init: initial,

  reduce(state, action) {
    if (typeof action !== 'object' || action === null) return state;
    const a = action as {
      t?: unknown;
      column?: unknown;
      value?: unknown;
      question?: unknown;
      option?: unknown;
    };
    switch (a.t) {
      case 'filter': {
        if (typeof a.column !== 'string' || typeof a.value !== 'string') return state;
        const values = Object.hasOwn(state.filterable, a.column) ? state.filterable[a.column] : undefined;
        if (values === undefined || !values.includes(a.value)) return state;
        if (Object.hasOwn(state.filters, a.column) && state.filters[a.column] === a.value) return state;
        return { ...state, filters: { ...state.filters, [a.column]: a.value } };
      }
      case 'unfilter': {
        if (typeof a.column !== 'string' || !Object.hasOwn(state.filters, a.column)) return state;
        const { [a.column]: _gone, ...filters } = state.filters;
        return { ...state, filters };
      }
      case 'answer': {
        if (typeof a.question !== 'string' || typeof a.option !== 'string') return state;
        const options = Object.hasOwn(state.options, a.question) ? state.options[a.question] : undefined;
        if (options === undefined || !options.includes(a.option)) return state;
        if (Object.hasOwn(state.answers, a.question) && state.answers[a.question] === a.option) return state;
        return { ...state, answers: { ...state.answers, [a.question]: a.option } };
      }
      case 'reset':
        if (Object.keys(state.filters).length === 0 && Object.keys(state.answers).length === 0) return state;
        return { ...state, filters: {}, answers: {} };
      default:
        return state;
    }
  },

  check(spec, state): GoalResult[] {
    return investigateGoals(spec).map((goalId) => {
      const questions = spec.questions.filter((q) => q.goal === goalId);
      const right = questions.filter((q) => answerOf(state, q) === q.answer).length;
      return { goalId, pass: right === questions.length, message: `${right} of ${questions.length} right` };
    });
  },

  hint(spec, state, goalId) {
    const questions = spec.questions.filter((q) => q.goal === goalId);
    const open = questions.filter((q) => answerOf(state, q) === undefined).length;
    const wrong = questions.filter((q) => {
      const chosen = answerOf(state, q);
      return chosen !== undefined && chosen !== q.answer;
    }).length;
    const parts = [
      ...(open > 0 ? [plural(open, 'question', 'still unanswered')] : []),
      ...(wrong > 0 ? [plural(wrong, 'answer', 'wrong')] : []),
    ];
    if (parts.length === 0) return 'Every answer of this goal is right.';
    const sentence = parts.join(' and ');
    return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
  },
};
