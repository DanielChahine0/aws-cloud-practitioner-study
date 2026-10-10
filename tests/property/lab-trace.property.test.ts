import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type NetworkTraceSpec, type PolicyTraceSpec, TraceSpec } from '../../schemas/lab-trace.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { replayLab } from '../../src/labs/contract.ts';
import {
  globMatch,
  inCidr,
  TRACE,
  type TraceState,
  traceCase,
  traceGoals,
} from '../../src/labs/trace/model.ts';
import { TRACE_NETWORK_SPEC, TRACE_POLICY_SPEC } from '../fixtures/lab-trace.ts';

/** The Trace reducer (spec 5.1, 9): any action sequence never throws, replays the same and checks purely. */
const RUNS = { seed: 20_261_031, numRuns: 200 };

const NET = TraceSpec.parse(TRACE_NETWORK_SPEC) as NetworkTraceSpec;
const POL = TraceSpec.parse(TRACE_POLICY_SPEC) as PolicyTraceSpec;
const NET_RULES = [...NET.sg.rules, ...NET.nacl.rules].map((r) => r.id);
const POL_RULES = POL.policies.flatMap((p) => p.statements.map((s) => s.id));

const actionArb = (ids: readonly string[]): fc.Arbitrary<unknown> =>
  fc.oneof(
    fc.record({
      t: fc.constant('toggle'),
      rule: fc.constantFrom(...ids, 'sg-ftp-all', 'toString'),
      on: fc.boolean(),
    }),
    fc.record({ t: fc.constant('toggle'), rule: fc.constantFrom(...ids), on: fc.anything() }),
    fc.constant({ t: 'reset' }),
    fc.anything(),
  );
/** Random on and off switches for every rule of a spec, as toggles. */
const flagsArb = (ids: readonly string[]) =>
  fc
    .tuple(...ids.map(() => fc.boolean()))
    .map((flags) => ids.map((rule, i) => ({ t: 'toggle', rule, on: flags[i] })));

const results = (spec: TraceSpec, state: TraceState) =>
  spec.cases.map((c) => traceCase(spec, state, c.id)?.result);

describe('the Trace reducer', () => {
  it('never throws, is deterministic and checks purely', () => {
    for (const [spec, ids] of [
      [NET, NET_RULES],
      [POL, POL_RULES],
    ] as const) {
      fc.assert(
        fc.property(fc.array(actionArb(ids), { maxLength: 30 }), (actions) => {
          const a = replayLab(TRACE, spec, actions as never[]);
          const b = replayLab(TRACE, spec, actions as never[]);
          expect(toPlain(a)).toEqual(toPlain(b));
          expect(TRACE.check(spec, a)).toEqual(TRACE.check(spec, b));
          expect(TRACE.check(spec, a).map((r) => r.goalId)).toEqual(traceGoals(spec));
          expect(Object.keys(a.on).sort()).toEqual([...ids].sort());
        }),
        RUNS,
      );
    }
  });

  it('rejected actions return the same state', () => {
    fc.assert(
      fc.property(
        flagsArb(NET_RULES),
        fc.oneof(
          fc.record({
            t: fc.constant('toggle'),
            rule: fc.string().filter((s) => !NET_RULES.includes(s)),
            on: fc.boolean(),
          }),
          fc.record({ t: fc.string().filter((t) => t !== 'toggle' && t !== 'reset') }),
          fc.oneof(fc.integer(), fc.string(), fc.constant(null), fc.constant(undefined)),
        ),
        (flags, junk) => {
          const state = replayLab(TRACE, NET, flags as never[]);
          expect(TRACE.reduce(state, junk as never)).toBe(state);
        },
      ),
      RUNS,
    );
  });

  it('an enabled matching Deny always wins', () => {
    const deny = POL.policies.flatMap((p) =>
      p.statements.filter((s) => s.effect === 'deny').map((s) => ({ p, s })),
    );
    /** The org nodes from an account up to the root. */
    const pathOf = (account: string | undefined): string[] => {
      const node = POL.org.find((n) => n.id === account);
      return node === undefined ? [] : [node.id, ...pathOf(node.parent)];
    };
    fc.assert(
      fc.property(flagsArb(POL_RULES), (flags) => {
        const state = replayLab(TRACE, POL, flags as never[]);
        for (const c of POL.cases) {
          const principal = POL.principals.find((p) => p.id === c.principal);
          const applies = deny.some(
            ({ p, s }) =>
              state.on[s.id] === true &&
              (p.kind === 'scp'
                ? pathOf(principal?.account).includes(p.attach)
                : p.attach === c.principal || (principal?.groups ?? []).includes(p.attach)) &&
              s.actions.some((a) => globMatch(a, c.action, true)) &&
              s.resources.some((r) => globMatch(r, c.resource)),
          );
          if (applies) expect(traceCase(POL, state, c.id)?.result).toBe('deny');
        }
      }),
      RUNS,
    );
  });

  it('an allowed policy case has every hop allowed', () => {
    fc.assert(
      fc.property(flagsArb(POL_RULES), (flags) => {
        const state = replayLab(TRACE, POL, flags as never[]);
        for (const c of POL.cases) {
          const run = traceCase(POL, state, c.id);
          if (run?.result === 'allow') expect(run.hops.every((h) => h.verdict === 'allow')).toBe(true);
        }
      }),
      RUNS,
    );
  });

  it('security group outbound rules never change an inbound case', () => {
    const outbound = NET.sg.rules.filter((r) => r.dir === 'out');
    const inbound = NET.cases.filter((c) => c.dir === 'in').map((c) => c.id);
    fc.assert(
      fc.property(flagsArb(NET_RULES), fc.constantFrom(...outbound), (flags, rule) => {
        const state = replayLab(TRACE, NET, flags as never[]);
        const flipped = TRACE.reduce(state, { t: 'toggle', rule: rule.id, on: !state.on[rule.id] });
        for (const id of inbound)
          expect(traceCase(NET, flipped, id)?.result).toBe(traceCase(NET, state, id)?.result);
      }),
      RUNS,
    );
  });

  it('network ACL rules that match no hop never change a case', () => {
    type Rule = NetworkTraceSpec['nacl']['rules'][number];
    type Case = NetworkTraceSpec['cases'][number];
    const covers = (r: Rule, c: Case, port: number) =>
      (r.proto === 'all' || r.proto === c.proto) && port >= r.from && port <= r.to && inCidr(c.ip, r.cidr);
    const touches = (r: Rule, c: Case) => (r.dir === c.dir ? covers(r, c, c.port) : covers(r, c, c.reply));
    fc.assert(
      fc.property(flagsArb(NET_RULES), fc.constantFrom(...NET.nacl.rules), (flags, rule) => {
        const state = replayLab(TRACE, NET, flags as never[]);
        const flipped = TRACE.reduce(state, { t: 'toggle', rule: rule.id, on: !state.on[rule.id] });
        const before = results(NET, state);
        const after = results(NET, flipped);
        NET.cases.forEach((c, i) => {
          if (!touches(rule, c)) expect(after[i]).toBe(before[i]);
        });
      }),
      RUNS,
    );
  });
});
