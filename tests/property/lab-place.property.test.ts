import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { PlaceAction, PlaceSpec } from '../../schemas/lab-place.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { replayLab } from '../../src/labs/contract.ts';
import { PLACE, placeGoals, placeSlots } from '../../src/labs/place/model.ts';
import { PLACE_SPEC } from '../fixtures/lab-place.ts';

/** The Place reducer (spec 5.1, 9): any action sequence never throws, replays the same and checks purely. */
const RUNS = { seed: 20_261_031, numRuns: 200 };

const PIECES = PLACE_SPEC.pieces.map((p) => p.id);
const SLOTS = placeSlots(PLACE_SPEC);
const pieceArb = fc.constantFrom(...PIECES, 'rolling-pin', '');
const slotArb = fc.constantFrom(...SLOTS, 'oven-row-a', 'bakery-network', 'bread-van');
const failureArb = fc.constantFrom(...PLACE_SPEC.failures, 'public-a', 'not-used', 'bread-van');
const previewArb: fc.Arbitrary<PlaceAction> = fc.oneof(
  failureArb.map((container) => ({ t: 'fail', container }) as const),
  fc.constant({ t: 'restore' } as const),
);
const actionArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.record({ t: fc.constant('place'), piece: pieceArb, slot: slotArb }),
  fc.record({ t: fc.constant('unplace'), piece: pieceArb }),
  previewArb,
  fc.constant({ t: 'reset' }),
  fc.anything(),
);
/** Actions whose ids the spec does not know, or a failure the spec does not list. */
const rejectedArb: fc.Arbitrary<PlaceAction> = fc.oneof(
  fc.record({ t: fc.constant('place' as const), piece: fc.constantFrom('rolling-pin', ''), slot: slotArb }),
  fc.record({
    t: fc.constant('place' as const),
    piece: pieceArb,
    slot: fc.constantFrom('oven-row-a', 'bread-van'),
  }),
  fc.record({ t: fc.constant('unplace' as const), piece: fc.constantFrom('rolling-pin', '') }),
  fc.record({
    t: fc.constant('fail' as const),
    container: fc.constantFrom('public-a', 'not-used', 'bread-van'),
  }),
);
/** A board built by placing known pieces in known slots, or taking them back. */
const boardArb: fc.Arbitrary<PlaceAction[]> = fc
  .array(fc.record({ piece: fc.constantFrom(...PIECES), slot: fc.constantFrom(...SLOTS, null) }), {
    maxLength: 16,
  })
  .map((rows) =>
    rows.map(
      ({ piece, slot }): PlaceAction =>
        slot === null ? { t: 'unplace', piece } : { t: 'place', piece, slot },
    ),
  );
const play = (actions: readonly unknown[], spec: PlaceSpec = PLACE_SPEC) =>
  replayLab(PLACE, spec, actions as PlaceAction[]);
const parentOf = new Map(PLACE_SPEC.containers.map((c) => [c.id, c.parent]));
const kindOf = new Map(PLACE_SPEC.containers.map((c) => [c.id, c.kind]));
/** True when the slot is a subnet or has one above it, walked here without the model. */
function subnetAbove(slot: string): boolean {
  for (let at: string | undefined = slot; at !== undefined; at = parentOf.get(at))
    if (kindOf.get(at) === 'subnet') return true;
  return false;
}

describe('the Place reducer', () => {
  it('never throws, is deterministic and checks purely', () => {
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 40 }), (actions) => {
        const once = play(actions);
        const twice = play(actions);
        expect(toPlain(once)).toEqual(toPlain(twice));
        const before = toPlain(once);
        const first = PLACE.check(PLACE_SPEC, once);
        expect(PLACE.check(PLACE_SPEC, once)).toEqual(first);
        expect(toPlain(once)).toEqual(before);
        expect(first.map((r) => r.goalId)).toEqual(placeGoals(PLACE_SPEC));
      }),
      RUNS,
    );
  });

  it('rejected actions return the same state', () => {
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 20 }), rejectedArb, (actions, rejected) => {
        const state = play(actions);
        expect(PLACE.reduce(state, rejected)).toBe(state);
      }),
      RUNS,
    );
  });

  it('survival is the same whatever failure is previewed', () => {
    fc.assert(
      fc.property(boardArb, fc.nat(), previewArb, (board, at, preview) => {
        const cut = at % (board.length + 1);
        const previewed = [...board.slice(0, cut), preview, ...board.slice(cut)];
        expect(PLACE.check(PLACE_SPEC, play(previewed))).toEqual(PLACE.check(PLACE_SPEC, play(board)));
      }),
      RUNS,
    );
  });

  it('survival under every failure equals survival under each failure alone', () => {
    const survive: PlaceSpec['constraints'] = [
      ...PLACE_SPEC.constraints.filter((c) => c.kind === 'survive'),
      {
        kind: 'survive',
        goal: 'g1',
        pieces: ['front-one', 'front-two', 'recipes-one', 'recipes-two'],
        min: 2,
      },
    ];
    fc.assert(
      fc.property(boardArb, (board) => {
        for (const c of survive) {
          const alone: PlaceSpec = { ...PLACE_SPEC, constraints: [{ ...c, goal: 'g1' }] };
          const state = play(board, alone);
          const all = PLACE.check(alone, state)[0]?.pass;
          const each = alone.failures.every((f) => PLACE.check({ ...alone, failures: [f] }, state)[0]?.pass);
          expect(all).toBe(each);
        }
      }),
      RUNS,
    );
  });

  it('a passing private constraint has a subnet above each of its pieces', () => {
    fc.assert(
      fc.property(boardArb, fc.subarray(PIECES, { minLength: 1 }), (board, pieces) => {
        const spec: PlaceSpec = { ...PLACE_SPEC, constraints: [{ kind: 'private', goal: 'g1', pieces }] };
        const state = play(board, spec);
        if (PLACE.check(spec, state)[0]?.pass !== true) return;
        for (const piece of pieces) expect(subnetAbove(state.placed[piece] ?? '')).toBe(true);
      }),
      RUNS,
    );
  });
});
