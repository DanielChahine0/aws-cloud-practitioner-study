import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InvestigateSpec } from '../../schemas/lab-investigate.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { replayLab } from '../../src/labs/contract.ts';
import { INVESTIGATE, investigateGoals, visibleRecords } from '../../src/labs/investigate/model.ts';
import { INVESTIGATE_SPEC } from '../fixtures/lab-investigate.ts';

/** The Investigate reducer (spec 5.1, 9): any action sequence never throws, replays the same and checks purely. */
const RUNS = { seed: 20_261_031, numRuns: 200 };

const SPEC = InvestigateSpec.parse(INVESTIGATE_SPEC);
const columnArb = fc.constantFrom(...SPEC.columns.map((c) => c.id), 'oven', '');
const valueArb = fc.constantFrom(...new Set(SPEC.records.flatMap((r) => Object.values(r.cells))), 'Olek', '');
const questionArb = fc.constantFrom(...SPEC.questions.map((q) => q.id), 'why', '');
const optionArb = fc.constantFrom(...SPEC.questions.flatMap((q) => q.options.map((o) => o.id)), 'olek', '');
const filterArb = fc.oneof(
  fc.record({ t: fc.constant('filter'), column: columnArb, value: valueArb }),
  fc.record({ t: fc.constant('unfilter'), column: columnArb }),
);
const answerArb = fc.record({ t: fc.constant('answer'), question: questionArb, option: optionArb });
const actionArb: fc.Arbitrary<unknown> = fc.oneof(
  filterArb,
  answerArb,
  fc.constant({ t: 'reset' }),
  fc.anything(),
);
const run = (actions: readonly unknown[]) => replayLab(INVESTIGATE, SPEC, actions as never[]);

describe('the Investigate reducer', () => {
  it('never throws, is deterministic and checks purely', () => {
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 40 }), (actions) => {
        const once = run(actions);
        const twice = run(actions);
        expect(toPlain(once)).toEqual(toPlain(twice));
        const before = toPlain(once);
        const first = INVESTIGATE.check(SPEC, once);
        expect(INVESTIGATE.check(SPEC, once)).toEqual(first);
        expect(toPlain(once)).toEqual(before);
        expect(first.map((r) => r.goalId)).toEqual(investigateGoals(SPEC));
      }),
      RUNS,
    );
  });

  it('rejected actions return the same state', () => {
    const unknown = fc.oneof(
      fc.record({ t: fc.constant('filter'), column: fc.constantFrom('oven', 'time'), value: valueArb }),
      fc.record({
        t: fc.constant('filter'),
        column: fc.constantFrom('who', 'event'),
        value: fc.constant('Olek'),
      }),
      fc.record({ t: fc.constant('unfilter'), column: fc.constantFrom('oven', '') }),
      fc.record({ t: fc.constant('answer'), question: fc.constantFrom('why', ''), option: optionArb }),
      fc.record({ t: fc.constant('answer'), question: questionArb, option: fc.constantFrom('olek', '') }),
      fc.anything().filter((a) => typeof a !== 'object' || a === null),
    );
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 20 }), unknown, (actions, junk) => {
        const state = run(actions);
        expect(INVESTIGATE.reduce(state, junk as never)).toBe(state);
      }),
      RUNS,
    );
  });

  it('filters never change a check', () => {
    const answersArb = fc.array(fc.oneof(answerArb, fc.constant({ t: 'reset' })), { maxLength: 12 });
    fc.assert(
      fc.property(
        answersArb,
        fc.array(fc.tuple(fc.nat(12), filterArb), { maxLength: 12 }),
        (answers, filters) => {
          const mixed: unknown[] = [...answers];
          for (const [at, f] of filters) mixed.splice(Math.min(at, mixed.length), 0, f);
          expect(INVESTIGATE.check(SPEC, run(mixed))).toEqual(INVESTIGATE.check(SPEC, run(answers)));
        },
      ),
      RUNS,
    );
  });

  it('every visible record matches every active filter and visibleRecords is a subsequence of records', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(filterArb, actionArb), { maxLength: 30 }), (actions) => {
        const state = run(actions);
        const shown = visibleRecords(SPEC, state);
        for (const record of shown) {
          for (const [column, value] of Object.entries(state.filters))
            expect(record.cells[column]).toBe(value);
        }
        const order = shown.map((r) => SPEC.records.indexOf(r));
        expect(order.every((i, n) => i >= 0 && i > (order[n - 1] ?? -1))).toBe(true);
        const hidden = SPEC.records.filter((r) => !shown.includes(r));
        for (const record of hidden) {
          expect(
            Object.entries(state.filters).some(([column, value]) => record.cells[column] !== value),
          ).toBe(true);
        }
      }),
      RUNS,
    );
  });
});
