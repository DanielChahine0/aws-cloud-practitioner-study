import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ConfigureSpec, type SortSpec } from '../../schemas/lab.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { CONFIGURE } from '../../src/labs/configure/model.ts';
import { replayLab } from '../../src/labs/contract.ts';
import { SORT } from '../../src/labs/sort/model.ts';
import { bakeryConfigureLab } from '../fixtures/lab-specs.ts';
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

const CONFIGURE_SPEC = ConfigureSpec.parse(bakeryConfigureLab().spec);
/** Known and unknown fields with right, wrong and junk values, plus junk actions. */
const configureActionArb = fc.oneof(
  fc.record({
    t: fc.constant('set'),
    field: fc.constantFrom('oven', 'rental', 'door', 'chimney'),
    value: fc.oneof(
      fc.constantFrom('small-oven', 'deck-oven', 'tunnel-oven', 'per-minute', 'monthly', 'brick-oven'),
      fc.boolean(),
      fc.integer(),
    ),
  }),
  fc.constant({ t: 'reset' }),
  fc.anything(),
);

describe('the Configure reducer', () => {
  it('never throws, is deterministic and checks purely', () => {
    fc.assert(
      fc.property(fc.array(configureActionArb, { maxLength: 30 }), (actions) => {
        const a = replayLab(CONFIGURE, CONFIGURE_SPEC, actions as never[]);
        const b = replayLab(CONFIGURE, CONFIGURE_SPEC, actions as never[]);
        expect(toPlain(a)).toEqual(toPlain(b));
        expect(CONFIGURE.check(CONFIGURE_SPEC, a)).toEqual(CONFIGURE.check(CONFIGURE_SPEC, b));
        for (const value of Object.values(a.values)) expect(['string', 'boolean']).toContain(typeof value);
      }),
      RUNS,
    );
  });
});
