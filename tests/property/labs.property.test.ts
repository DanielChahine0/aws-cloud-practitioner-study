import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { SortSpec } from '../../schemas/lab.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { replayLab } from '../../src/labs/contract.ts';
import { SORT } from '../../src/labs/sort/model.ts';
import { bakeryLab } from '../fixtures/labs.ts';

/** Lab reducers (spec 5.1, 9): any action sequence, known ids or not, never throws, replays the same and checks purely. */
const RUNS = { seed: 20_261_031, numRuns: 200 };

const SORT_SPEC = bakeryLab().spec as SortSpec;
const cardArb = fc.constantFrom(...SORT_SPEC.cards.map((c) => c.id), 'rye-loaf', '');
const bucketArb = fc.constantFrom(...SORT_SPEC.buckets.map((b) => b.id), 'bread-van');
const sortActionArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.record({ t: fc.constant('place'), card: cardArb, bucket: bucketArb }),
  fc.record({ t: fc.constant('unplace'), card: cardArb }),
  fc.constant({ t: 'reset' }),
  fc.anything(),
);

describe('Sort reducer properties', () => {
  it('never throws, replays to equal states and checks as a pure function of the state', () => {
    fc.assert(
      fc.property(fc.array(sortActionArb, { maxLength: 40 }), (actions) => {
        const once = replayLab(SORT, SORT_SPEC, actions as never[]);
        const twice = replayLab(SORT, SORT_SPEC, actions as never[]);
        expect(toPlain(once)).toEqual(toPlain(twice));
        const before = toPlain(once);
        const first = SORT.check(SORT_SPEC, once);
        expect(SORT.check(SORT_SPEC, once)).toEqual(first);
        expect(toPlain(once)).toEqual(before);
        expect(first.map((r) => r.goalId)).toEqual(['g1', 'g2']);
      }),
      RUNS,
    );
  });
});
