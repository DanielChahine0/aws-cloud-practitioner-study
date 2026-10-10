import { describe, expect, it } from 'vitest';
import {
  type NetworkTraceSpec,
  type PolicyTraceSpec,
  TraceAction,
  TraceSpec,
} from '../../schemas/lab-trace.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { type AnyLabEngine, checkLab, type EngineEntry } from '../../src/labs/engines.ts';
import {
  globMatch,
  inCidr,
  TRACE,
  type TraceState,
  traceCase,
  traceGoals,
} from '../../src/labs/trace/model.ts';
import {
  bakeryPolicyLab,
  bakeryTraceLab,
  TRACE_NETWORK_SPEC,
  TRACE_POLICY_SPEC,
} from '../fixtures/lab-trace.ts';

const NET = TraceSpec.parse(TRACE_NETWORK_SPEC) as NetworkTraceSpec;
const POL = TraceSpec.parse(TRACE_POLICY_SPEC) as PolicyTraceSpec;

type Toggle = { t: 'toggle'; rule: string; on: boolean };
const on = (rule: string): Toggle => ({ t: 'toggle', rule, on: true });
const off = (rule: string): Toggle => ({ t: 'toggle', rule, on: false });
const run = (spec: TraceSpec, actions: readonly unknown[]): TraceState =>
  replayLab(TRACE, spec, actions as TraceAction[]);
const words = (spec: TraceSpec, state: TraceState) =>
  TRACE.check(spec, state).map((r) => [r.goalId, r.pass, r.message]);
const result = (spec: TraceSpec, actions: readonly unknown[], caseId: string) =>
  traceCase(spec, run(spec, actions), caseId)?.result;
const hops = (spec: TraceSpec, actions: readonly unknown[], caseId: string) =>
  traceCase(spec, run(spec, actions), caseId)?.hops.map((h) => [h.at, h.reply, h.verdict, h.by]);
const hopsWithNode = (spec: TraceSpec, actions: readonly unknown[], caseId: string) =>
  traceCase(spec, run(spec, actions), caseId)?.hops.map((h) => [h.at, h.node, h.verdict, h.by]);

/** The messages a spec fails with. */
const problems = (spec: unknown): string[] => {
  const parsed = TraceSpec.safeParse(spec);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
};
const copy = <T>(value: T): T => structuredClone(value) as T;

describe('Trace spec schema (spec 5.1)', () => {
  it('accepts both fixture specs and fills the defaults', () => {
    expect(NET.kind).toBe('network');
    expect(POL.kind).toBe('policy');
    const bare = {
      kind: 'policy',
      principals: [{ id: 'cashier-lu', label: 'Lu at the till' }],
      policies: [
        {
          id: 'till-policy',
          label: 'Till policy',
          kind: 'iam',
          attach: 'cashier-lu',
          statements: [
            { id: 'open-till', effect: 'allow', actions: ['till:Open'], resources: ['till/front'], on: true },
          ],
        },
      ],
      cases: [
        {
          id: 'lu-till',
          goal: 'g1',
          label: 'Lu opens the till',
          principal: 'cashier-lu',
          action: 'till:Open',
          resource: 'till/front',
          expect: 'allow',
        },
      ],
    };
    expect(TraceSpec.parse(bare)).toMatchObject({ groups: [], org: [], principals: [{ groups: [] }] });
  });

  it.each([
    [
      'a rule id used by the security group and the network ACL',
      (s: NetworkTraceSpec) => {
        s.nacl.rules[0] = {
          ...s.nacl.rules[0],
          id: 'sg-https-all',
        } as NetworkTraceSpec['nacl']['rules'][number];
      },
      'rule sg-https-all is used twice',
    ],
    [
      'an inbound rule number used twice',
      (s: NetworkTraceSpec) => {
        (s.nacl.rules[1] as { n: number }).n = 90;
      },
      'rule number 90 is used twice inbound',
    ],
    [
      'an outbound rule number used twice',
      (s: NetworkTraceSpec) => {
        (s.nacl.rules[5] as { n: number }).n = 100;
      },
      'rule number 100 is used twice outbound',
    ],
    [
      'a port range that runs backwards',
      (s: NetworkTraceSpec) => {
        (s.sg.rules[0] as { from: number }).from = 444;
      },
      'from is above to',
    ],
    [
      'all traffic on one port',
      (s: NetworkTraceSpec) => {
        (s.nacl.rules[0] as { to: number }).to = 80;
      },
      'all traffic covers every port: use 0 to 65535',
    ],
    [
      'a case id used twice',
      (s: NetworkTraceSpec) => {
        (s.cases[1] as { id: string }).id = 'customer-order';
      },
      'case customer-order is used twice',
    ],
  ])('rejects %s', (_, edit, message) => {
    const spec = copy(NET);
    edit(spec);
    expect(problems(spec)).toContain(message);
  });

  it.each([
    [
      'a statement id used in two policies',
      (s: PolicyTraceSpec) => {
        (s.policies[4]?.statements[0] as { id: string }).id = 'open-till';
      },
      'rule open-till is used twice',
    ],
    [
      'a policy id used twice',
      (s: PolicyTraceSpec) => {
        (s.policies[5] as { id: string }).id = 'root-all';
      },
      'policy root-all is used twice',
    ],
    [
      'a principal id used twice',
      (s: PolicyTraceSpec) => {
        (s.principals[1] as { id: string }).id = 'baker-mo';
      },
      'principal baker-mo is used twice',
    ],
    [
      'a group id used twice',
      (s: PolicyTraceSpec) => {
        s.groups.push({ id: 'bakers', label: 'Bakers again' });
      },
      'group bakers is used twice',
    ],
    [
      'a node id used twice',
      (s: PolicyTraceSpec) => {
        s.org.push({ id: 'shops', label: 'Shops again', parent: 'bakery-org' });
      },
      'node shops is used twice',
    ],
    [
      'a principal in a missing group',
      (s: PolicyTraceSpec) => {
        (s.principals[0] as { groups: string[] }).groups.push('ovens');
      },
      'names no group: ovens',
    ],
    [
      'an identity policy on nobody',
      (s: PolicyTraceSpec) => {
        (s.policies[4] as { attach: string }).attach = 'bakerz';
      },
      'names no principal or group: bakerz',
    ],
    [
      'an SCP on a missing node',
      (s: PolicyTraceSpec) => {
        (s.policies[0] as { attach: string }).attach = 'west';
      },
      'names no organization node: west',
    ],
    [
      'a node under a missing parent',
      (s: PolicyTraceSpec) => {
        (s.org[1] as { parent?: string }).parent = 'west';
      },
      'names no organization node: west',
    ],
    [
      'an SCP without an org',
      (s: PolicyTraceSpec) => {
        s.org.length = 0;
        for (const p of s.principals) delete (p as { account?: string }).account;
      },
      'an SCP needs the org',
    ],
    [
      'two roots',
      (s: PolicyTraceSpec) => {
        delete (s.org[1] as { parent?: string }).parent;
      },
      'the org needs exactly one root',
    ],
    [
      'a node that is its own ancestor',
      (s: PolicyTraceSpec) => {
        (s.org[0] as { parent?: string }).parent = 'shop-east';
        s.org.push({ id: 'west', label: 'West group' });
        s.policies.push({
          id: 'west-all',
          label: 'Full access',
          kind: 'scp',
          attach: 'west',
          statements: [{ id: 'west-allow-all', effect: 'allow', actions: ['*'], resources: ['*'], on: true }],
        });
      },
      'node bakery-org is its own ancestor',
    ],
    [
      'an account that is not in the org',
      (s: PolicyTraceSpec) => {
        (s.principals[0] as { account?: string }).account = 'west';
      },
      'names no account: west',
    ],
    [
      'an account that holds other nodes',
      (s: PolicyTraceSpec) => {
        (s.principals[0] as { account?: string }).account = 'shops';
      },
      'names no account: shops',
    ],
    [
      'an account while the org is empty',
      (s: PolicyTraceSpec) => {
        s.org.length = 0;
        s.policies = s.policies.filter((p) => p.kind === 'iam');
      },
      'names no account: shop-east',
    ],
    [
      'a principal without an account',
      (s: PolicyTraceSpec) => {
        delete (s.principals[1] as { account?: string }).account;
      },
      'needs an account: cashier-lu',
    ],
    [
      'a case for a missing principal',
      (s: PolicyTraceSpec) => {
        (s.cases[0] as { principal: string }).principal = 'baker-jo';
      },
      'names no principal: baker-jo',
    ],
    [
      'a node with no SCP',
      (s: PolicyTraceSpec) => {
        s.policies = s.policies.filter((p) => p.id !== 'east-all');
      },
      'node shop-east has no SCP',
    ],
  ])('rejects %s', (_, edit, message) => {
    const spec = copy(POL);
    edit(spec);
    expect(problems(spec)).toContain(message);
  });

  it('rejects a bad address, a bad range, a bad action and a bad pattern with their messages', () => {
    const net = copy(NET) as unknown as { cases: { ip: string }[]; sg: { rules: { cidr: string }[] } };
    (net.cases[0] as { ip: string }).ip = '203.0.113.256';
    (net.sg.rules[0] as { cidr: string }).cidr = '0.0.0.0/33';
    expect(problems(net)).toEqual(['must look like 203.0.113.0/24', 'must look like 203.0.113.10']);
    const pol = copy(POL) as unknown as {
      cases: { action: string }[];
      policies: { statements: { resources: string[] }[] }[];
    };
    (pol.cases[0] as { action: string }).action = 'GetRecipe';
    (pol.policies[0]?.statements[0] as { resources: string[] }).resources = ['cafe menu'];
    expect(problems(pol)).toEqual([
      'must look like s3:GetObject or cafe-menu/*',
      'must look like s3:GetObject',
    ]);
  });

  it('accepts a toggle and a reset, and rejects an unknown action or a toggle without its value', () => {
    expect(TraceAction.parse({ t: 'toggle', rule: 'sg-https-all', on: true })).toEqual({
      t: 'toggle',
      rule: 'sg-https-all',
      on: true,
    });
    expect(TraceAction.parse({ t: 'reset' })).toEqual({ t: 'reset' });
    expect(TraceAction.safeParse({ t: 'add', rule: 'sg-https-all' }).success).toBe(false);
    expect(TraceAction.safeParse({ t: 'toggle', rule: 'sg-https-all' }).success).toBe(false);
  });
});

describe('the Trace checker (spec 5.1, 9)', () => {
  it.each([
    ['203.0.113.10', '0.0.0.0/0', true],
    ['203.0.113.10', '203.0.113.0/24', true],
    ['203.0.114.10', '203.0.113.0/24', false],
    ['192.0.2.15', '192.0.2.15/32', true],
    ['192.0.2.16', '192.0.2.15/32', false],
    ['255.255.255.255', '255.255.255.0/24', true],
    ['10.20.1.9', 'not a range', false],
  ])('inCidr(%s, %s) is %s', (ip, cidr, inside) => {
    expect(inCidr(ip, cidr)).toBe(inside);
  });

  it.each([
    ['*', 'anything:At/all', false, true],
    ['s3:*', 's3:GetObject', false, true],
    ['s3:*', 'ec2:RunInstances', false, false],
    ['cafe-menu/*', 'cafe-menu/a.json', false, true],
    ['cafe-menu/*', 'cafe-menu/', false, true],
    ['cafe-menu/*', 'cafe-payroll/a.json', false, false],
    ['oven:Delete*', 'oven:DeleteOven', false, true],
    ['s3:GetObject', 's3:getobject', true, true],
    ['s3:GetObject', 's3:getobject', false, false],
    ['Cafe-menu/*', 'cafe-menu/a.json', false, false],
    ['a*b*c', 'abc', false, true],
    ['a*b*c', 'aXbYbZc', false, true],
    ['a*b*c', 'aXbYc!', false, false],
  ])('globMatch(%s, %s, ignoreCase %s) is %s', (pattern, value, ignoreCase, match) => {
    expect(globMatch(pattern, value, ignoreCase)).toBe(match);
  });

  it('starts from every rule as the spec sets it and fails a goal', () => {
    const start = TRACE.init(NET);
    expect(start.start).toBe(start.on);
    expect(start.on).toEqual({
      'sg-https-all': false,
      'sg-ssh-all': false,
      'sg-ssh-office': false,
      'sg-out-https': true,
      'sg-out-replies': false,
      'acl-deny-blocked': true,
      'acl-https-in': true,
      'acl-ssh-in': true,
      'acl-replies-in': true,
      'acl-replies-out': false,
      'acl-https-out': true,
    });
    expect(words(NET, start)).toEqual([
      ['g1', false, '2 of 3 cases as expected'],
      ['g2', false, '1 of 2 cases as expected'],
    ]);
    expect(words(POL, TRACE.init(POL))).toEqual([
      ['g1', false, '0 of 2 cases as expected'],
      ['g2', true, '2 of 2 cases as expected'],
    ]);
    expect(traceGoals(NET)).toEqual(['g1', 'g2']);
  });

  it('passes every goal with the solution of either fixture, and each wrong path fails its goal', () => {
    for (const lab of [bakeryTraceLab(), bakeryPolicyLab()]) {
      const spec = TraceSpec.parse(lab.spec);
      expect(allPass(TRACE.check(spec, run(spec, lab.solution)))).toBe(true);
      for (const path of lab.wrongPaths) {
        const failed = TRACE.check(spec, run(spec, path.actions)).find((r) => r.goalId === path.failsGoal);
        expect(failed?.pass).toBe(false);
      }
    }
  });

  it('lets the reply of an allowed inbound request out of a security group with no outbound rule for it', () => {
    expect(
      hops(NET, [on('sg-https-all'), off('sg-out-https'), on('acl-replies-out')], 'customer-order'),
    ).toEqual([
      ['nacl-in', false, 'allow', 'acl-https-in'],
      ['sg-in', false, 'allow', 'sg-https-all'],
      ['sg-out', true, 'stateful', null],
      ['nacl-out', true, 'allow', 'acl-replies-out'],
    ]);
  });

  it('drops that reply at the network ACL until an outbound rule covers its port', () => {
    expect(hops(NET, [on('sg-https-all')], 'customer-order')).toEqual([
      ['nacl-in', false, 'allow', 'acl-https-in'],
      ['sg-in', false, 'allow', 'sg-https-all'],
      ['sg-out', true, 'stateful', null],
      ['nacl-out', true, 'deny', '*'],
    ]);
    expect(result(NET, [on('sg-https-all')], 'customer-order')).toBe('deny');
    // An outbound security group rule for the reply ports does not help: the network ACL still drops the reply.
    expect(result(NET, [on('sg-https-all'), on('sg-out-replies')], 'customer-order')).toBe('deny');
    expect(result(NET, [on('sg-https-all'), on('acl-replies-out')], 'customer-order')).toBe('allow');
  });

  it('mirrors both rules for an outbound request', () => {
    expect(hops(NET, [], 'daily-menu')).toEqual([
      ['sg-out', false, 'allow', 'sg-out-https'],
      ['nacl-out', false, 'allow', 'acl-https-out'],
      ['nacl-in', true, 'allow', 'acl-replies-in'],
      ['sg-in', true, 'stateful', null],
    ]);
    expect(hops(NET, [off('acl-replies-in')], 'daily-menu')).toEqual([
      ['sg-out', false, 'allow', 'sg-out-https'],
      ['nacl-out', false, 'allow', 'acl-https-out'],
      ['nacl-in', true, 'deny', '*'],
      ['sg-in', true, 'skipped', null],
    ]);
    expect(hops(NET, [off('sg-out-https')], 'daily-menu')).toEqual([
      ['sg-out', false, 'nomatch', null],
      ['nacl-out', false, 'skipped', null],
      ['nacl-in', true, 'skipped', null],
      ['sg-in', true, 'skipped', null],
    ]);
  });

  it('checks network ACL rules from the lowest number up and takes the first enabled match', () => {
    // Rule 90 denies the blocked range before rule 100 allows HTTPS.
    expect(hops(NET, [on('sg-https-all')], 'blocked-order')?.[0]).toEqual([
      'nacl-in',
      false,
      'deny',
      'acl-deny-blocked',
    ]);
    // Numbered after the allow, the same deny never decides.
    const later = copy(NET);
    (later.nacl.rules[0] as { n: number }).n = 130;
    expect(hops(later, [on('sg-https-all')], 'blocked-order')?.[0]).toEqual([
      'nacl-in',
      false,
      'allow',
      'acl-https-in',
    ]);
    // A disabled rule is skipped.
    expect(hops(NET, [on('sg-https-all'), off('acl-deny-blocked')], 'blocked-order')?.[0]).toEqual([
      'nacl-in',
      false,
      'allow',
      'acl-https-in',
    ]);
    // No enabled match falls to the final * rule, and every later hop is not reached.
    expect(hops(NET, [off('acl-ssh-in')], 'stranger-ssh')).toEqual([
      ['nacl-in', false, 'deny', '*'],
      ['sg-in', false, 'skipped', null],
      ['sg-out', true, 'skipped', null],
      ['nacl-out', true, 'skipped', null],
    ]);
  });

  it('lets an explicit Deny win over an Allow, in the same policy and in another one', () => {
    const same = copy(POL);
    same.policies[4]?.statements.push({
      id: 'no-deletes',
      effect: 'deny',
      actions: ['oven:Delete*'],
      resources: ['*'],
      on: true,
    });
    expect(hops(same, [on('all-ovens')], 'mo-deletes')?.at(-1)).toEqual(['iam', false, 'deny', 'no-deletes']);
    expect(result(same, [on('all-ovens')], 'mo-deletes')).toBe('deny');
    expect(result(POL, [on('all-ovens')], 'mo-deletes')).toBe('allow');
    expect(result(POL, [on('all-ovens'), on('deny-oven-delete')], 'mo-deletes')).toBe('deny');
    const user = copy(POL);
    user.policies.push({
      id: 'mo-limits',
      label: 'Limits for Mo',
      kind: 'iam',
      attach: 'baker-mo',
      statements: [
        {
          id: 'mo-no-deletes',
          effect: 'deny',
          actions: ['oven:DeleteOven'],
          resources: ['oven/*'],
          on: true,
        },
      ],
    });
    expect(result(user, [on('all-ovens')], 'mo-deletes')).toBe('deny');
  });

  it('lets an Allow beat the implicit deny, and calls no matching statement no match and a denial', () => {
    expect(hops(POL, [], 'mo-recipes')?.at(-1)).toEqual(['iam', false, 'nomatch', null]);
    expect(result(POL, [], 'mo-recipes')).toBe('deny');
    expect(hops(POL, [on('read-recipes')], 'mo-recipes')?.at(-1)).toEqual([
      'iam',
      false,
      'allow',
      'read-recipes',
    ]);
    expect(result(POL, [on('read-recipes')], 'mo-recipes')).toBe('allow');
  });

  it('intersects the SCPs with the identity policies, and an SCP Deny at the root beats everything', () => {
    expect(hopsWithNode(POL, [on('read-recipes')], 'mo-recipes')).toEqual([
      ['scp', 'bakery-org', 'allow', 'root-allow-all'],
      ['scp', 'shops', 'allow', 'shops-allow-all'],
      ['scp', 'shop-east', 'allow', 'east-allow-all'],
      ['iam', null, 'allow', 'read-recipes'],
    ]);
    // An identity Allow without an SCP Allow on every node is denied.
    expect(hopsWithNode(POL, [on('read-recipes'), off('east-allow-all')], 'mo-recipes')?.[2]).toEqual([
      'scp',
      'shop-east',
      'nomatch',
      null,
    ]);
    expect(result(POL, [on('read-recipes'), off('east-allow-all')], 'mo-recipes')).toBe('deny');
    // SCPs never grant on their own.
    expect(result(POL, [], 'mo-recipes')).toBe('deny');
    const root = copy(POL);
    root.policies[0]?.statements.push({
      id: 'root-no-ovens',
      effect: 'deny',
      actions: ['oven:*'],
      resources: ['*'],
      on: true,
    });
    expect(hopsWithNode(root, [on('all-ovens')], 'mo-bakes')).toEqual([
      ['scp', 'bakery-org', 'deny', 'root-no-ovens'],
      ['scp', 'shops', 'allow', 'shops-allow-all'],
      ['scp', 'shop-east', 'allow', 'east-allow-all'],
      ['iam', null, 'allow', 'all-ovens'],
    ]);
    expect(result(root, [on('all-ovens')], 'mo-bakes')).toBe('deny');
  });

  it("reaches a group's members only", () => {
    expect(result(POL, [on('read-recipes')], 'mo-recipes')).toBe('allow');
    expect(result(POL, [on('read-recipes')], 'lu-recipes')).toBe('deny');
  });

  it('matches actions ignoring letter case and resources exactly', () => {
    const lower = copy(POL);
    (lower.cases[0] as { action: string }).action = 'recipes:getrecipe';
    expect(result(lower, [on('read-recipes')], 'mo-recipes')).toBe('allow');
    (lower.cases[0] as { resource: string }).resource = 'Recipes/rye.txt';
    expect(result(lower, [on('read-recipes')], 'mo-recipes')).toBe('deny');
  });

  it('evaluates an identity-only spec with no org at all', () => {
    const plain = copy(POL);
    plain.org = [];
    plain.policies = plain.policies.filter((p) => p.kind === 'iam');
    for (const p of plain.principals) delete (p as { account?: string }).account;
    expect(problems(plain)).toEqual([]);
    expect(hops(plain, [on('read-recipes')], 'mo-recipes')).toEqual([
      ['iam', false, 'allow', 'read-recipes'],
    ]);
  });

  it('never skips a policy hop, and knows no unknown case', () => {
    for (const c of POL.cases)
      expect(traceCase(POL, TRACE.init(POL), c.id)?.hops.every((h) => h.verdict !== 'skipped')).toBe(true);
    expect(traceCase(NET, TRACE.init(NET), 'nobody')).toBeNull();
  });

  it('toggles one rule, and reset restores the start', () => {
    const start = TRACE.init(NET);
    const next = TRACE.reduce(start, on('sg-https-all'));
    expect(next.on['sg-https-all']).toBe(true);
    expect({ ...next.on, 'sg-https-all': false }).toEqual(start.on);
    expect(TRACE.reduce(next, { t: 'reset' })).toEqual(TRACE.init(NET));
    const back = TRACE.reduce(next, off('sg-https-all'));
    expect(TRACE.reduce(back, { t: 'reset' })).toBe(back);
  });

  it.each([
    ['a toggle to the value it has', { t: 'toggle', rule: 'sg-out-https', on: true }],
    ['an unknown rule', { t: 'toggle', rule: 'sg-ftp-all', on: true }],
    ['an inherited key', { t: 'toggle', rule: 'toString', on: true }],
    ['a toggle without a boolean', { t: 'toggle', rule: 'sg-https-all', on: 'yes' }],
    ['a reset at the start', { t: 'reset' }],
    ['an unknown action', { t: 'place', card: 'sg-https-all', bucket: 'on' }],
    ['a value that is not an object', 'toggle'],
    ['null', null],
  ])('ignores %s and returns the same state object', (_, action) => {
    const start = TRACE.init(NET);
    expect(TRACE.reduce(start, action as never)).toBe(start);
  });

  it('checks the same through an engine entry that settles nothing and is always complete', () => {
    const entry: EngineEntry = { engine: TRACE as unknown as AnyLabEngine, settle: [], complete: () => true };
    const state = run(NET, bakeryTraceLab().solution);
    expect(checkLab(entry, NET, state)).toEqual(TRACE.check(NET, state));
  });

  it('hints at the first case of the goal that gives the wrong result, in one sentence', () => {
    expect(TRACE.hint(NET, TRACE.init(NET), 'g1')).toBe(
      'A customer opens the order page: denied, but it should be allowed.',
    );
    expect(
      TRACE.hint(NET, run(NET, [on('sg-https-all'), on('acl-replies-out'), on('sg-ssh-all')]), 'g2'),
    ).toBe('A stranger tries to log in over SSH: allowed, but it should be denied.');
    expect(TRACE.hint(NET, run(NET, bakeryTraceLab().solution), 'g2')).toBe(
      'Every case of this goal gives the expected result.',
    );
  });
});
