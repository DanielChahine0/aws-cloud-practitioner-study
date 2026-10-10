import type { SortAction, SortSpec } from '../../../schemas/lab.ts';
import type { GoalResult, LabEngine } from '../contract.ts';

/** A Sort board: the card and bucket ids of its spec, and where each placed card sits; a card not in `placed` is in the tray. */
export interface SortState {
  readonly cards: readonly string[];
  readonly buckets: readonly string[];
  readonly placed: Readonly<Record<string, string>>;
}

type Card = SortSpec['cards'][number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const placedIn = (state: SortState, card: string): string | undefined =>
  Object.hasOwn(state.placed, card) ? state.placed[card] : undefined;

const isRight = (card: Card, bucket: string | undefined): boolean =>
  bucket !== undefined && (bucket === card.bucket || card.also.includes(bucket));

/** Goal ids in the order they first appear on cards. */
function goalIds(spec: SortSpec): string[] {
  return [...new Set(spec.cards.map((c) => c.goal))];
}

const plural = (n: number, what: string): string => `${n} card${n === 1 ? '' : 's'} ${what}`;

export const SORT: LabEngine<SortSpec, SortState, SortAction> = {
  init(spec) {
    return { cards: spec.cards.map((c) => c.id), buckets: spec.buckets.map((b) => b.id), placed: {} };
  },

  reduce(state, action) {
    const a: unknown = action;
    if (!isRecord(a)) return state;
    if (a.t === 'place') {
      const { card, bucket } = a;
      if (typeof card !== 'string' || typeof bucket !== 'string') return state;
      if (!state.cards.includes(card) || !state.buckets.includes(bucket)) return state;
      if (placedIn(state, card) === bucket) return state;
      return { ...state, placed: { ...state.placed, [card]: bucket } };
    }
    if (a.t === 'unplace') {
      const { card } = a;
      if (typeof card !== 'string' || placedIn(state, card) === undefined) return state;
      const placed = { ...state.placed };
      delete placed[card];
      return { ...state, placed };
    }
    if (a.t === 'reset') return Object.keys(state.placed).length === 0 ? state : { ...state, placed: {} };
    return state;
  },

  check(spec, state) {
    return goalIds(spec).map((goalId): GoalResult => {
      const cards = spec.cards.filter((c) => c.goal === goalId);
      const right = cards.filter((c) => isRight(c, placedIn(state, c.id))).length;
      return { goalId, pass: right === cards.length, message: `${right} of ${cards.length} right` };
    });
  },

  hint(spec, state, goalId) {
    const cards = spec.cards.filter((c) => c.goal === goalId);
    const tray = cards.filter((c) => placedIn(state, c.id) === undefined).length;
    const wrong = cards.filter((c) => {
      const bucket = placedIn(state, c.id);
      return bucket !== undefined && !isRight(c, bucket);
    }).length;
    const parts = [
      ...(tray > 0 ? [plural(tray, 'still in the tray')] : []),
      ...(wrong > 0 ? [plural(wrong, 'in the wrong bucket')] : []),
    ];
    if (parts.length === 0) return 'Every card of this goal is in place.';
    const sentence = parts.join(' and ');
    return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
  },
};

/** A Sort board is finished when no card is left in the tray. */
export function sortComplete(spec: SortSpec, state: SortState): boolean {
  return spec.cards.every((c) => placedIn(state, c.id) !== undefined);
}
