import { z } from 'zod';
import { Slug } from './common.ts';

/**
 * The Trace engine's spec and action schemas (spec 5.1): fixed candidate rules that Dani switches on and off until
 * every test case gives its expected result. `schemas/lab.ts` gathers them into `LAB_SCHEMAS` (Task 4); this file
 * redeclares the goal-id rule, since importing it from `schemas/lab.ts` would make an import cycle.
 */
const GoalRef = z.string().regex(/^g[1-9]$/, 'must look like g1');

/** An IPv4 address in dotted form. */
export const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
/** An IPv4 range in CIDR form, `/0` to `/32`. */
export const CIDR =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/(3[0-2]|[12]?\d)$/;

const Ip = z.string().regex(IPV4, 'must look like 203.0.113.10');
const Cidr = z.string().regex(CIDR, 'must look like 203.0.113.0/24');
const Port = z.int().min(0).max(65535);
const Name = z.string().min(2).max(40);
const CaseLabel = z.string().min(8).max(80);
const Dir = z.enum(['in', 'out']);
const Proto = z.enum(['tcp', 'udp', 'all']);
const Expect = z.enum(['allow', 'deny']);

const SgRule = z.strictObject({
  id: Slug,
  dir: Dir,
  proto: Proto,
  from: Port,
  to: Port,
  cidr: Cidr,
  on: z.boolean(),
});
const NaclRule = z.strictObject({
  id: Slug,
  n: z.int().min(1).max(32766),
  dir: Dir,
  proto: Proto,
  from: Port,
  to: Port,
  cidr: Cidr,
  action: z.enum(['allow', 'deny']),
  on: z.boolean(),
});
const NetCase = z.strictObject({
  id: Slug,
  goal: GoalRef,
  label: CaseLabel,
  dir: Dir,
  proto: z.enum(['tcp', 'udp']),
  ip: Ip,
  port: Port,
  reply: Port,
  expect: Expect,
});
const NetworkSpec = z.strictObject({
  kind: z.literal('network'),
  target: Name,
  sg: z.strictObject({ label: Name, rules: z.array(SgRule).max(12) }),
  nacl: z.strictObject({ label: Name, rules: z.array(NaclRule).max(12) }),
  cases: z.array(NetCase).min(1).max(8),
});

const Pattern = z.string().regex(/^[A-Za-z0-9*:/._-]{1,80}$/, 'must look like s3:GetObject or cafe-menu/*');
const Statement = z.strictObject({
  id: Slug,
  effect: z.enum(['allow', 'deny']),
  actions: z.array(Pattern).min(1).max(6),
  resources: z.array(Pattern).min(1).max(6),
  on: z.boolean(),
});
const Policy = z.strictObject({
  id: Slug,
  label: Name,
  kind: z.enum(['iam', 'scp']),
  attach: Slug,
  statements: z.array(Statement).min(1).max(6),
});
const Principal = z.strictObject({
  id: Slug,
  label: Name,
  groups: z.array(Slug).max(3).default([]),
  account: Slug.optional(),
});
const Group = z.strictObject({ id: Slug, label: Name });
const OrgNode = z.strictObject({ id: Slug, label: Name, parent: Slug.optional() });
const PolicyCase = z.strictObject({
  id: Slug,
  goal: GoalRef,
  label: CaseLabel,
  principal: Slug,
  action: z.string().regex(/^[a-z0-9-]+:[A-Za-z0-9]+$/, 'must look like s3:GetObject'),
  resource: z.string().regex(/^[A-Za-z0-9:/._-]{1,80}$/, 'must look like cafe-menu/today.json'),
  expect: Expect,
});
const PolicySpec = z.strictObject({
  kind: z.literal('policy'),
  principals: z.array(Principal).min(1).max(6),
  groups: z.array(Group).max(4).default([]),
  org: z.array(OrgNode).max(8).default([]),
  policies: z.array(Policy).min(1).max(8),
  cases: z.array(PolicyCase).min(1).max(8),
});

type Issue = (message: string, path: (string | number)[]) => void;
type Network = z.infer<typeof NetworkSpec>;
type Policies = z.infer<typeof PolicySpec>;

/** Reports every id that `items` lists twice, as `<kind> <id> is used twice`. */
function unique(
  items: readonly { id: string }[],
  kind: string,
  at: (i: number) => (string | number)[],
  say: Issue,
) {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    if (seen.has(item.id)) say(`${kind} ${item.id} is used twice`, [...at(i), 'id']);
    seen.add(item.id);
  });
}

function checkNetwork(spec: Network, say: Issue): void {
  const rules = [
    ...spec.sg.rules.map((rule, i) => ({ rule, at: ['sg', 'rules', i] })),
    ...spec.nacl.rules.map((rule, i) => ({ rule, at: ['nacl', 'rules', i] })),
  ];
  unique(
    rules.map((r) => r.rule),
    'rule',
    (i) => rules[i]?.at ?? [],
    say,
  );
  for (const { rule, at } of rules) {
    if (rule.from > rule.to) say('from is above to', [...at, 'from']);
    if (rule.proto === 'all' && (rule.from !== 0 || rule.to !== 65535))
      say('all traffic covers every port: use 0 to 65535', [...at, 'proto']);
  }
  for (const dir of ['in', 'out'] as const) {
    const seen = new Set<number>();
    spec.nacl.rules.forEach((rule, i) => {
      if (rule.dir !== dir) return;
      if (seen.has(rule.n))
        say(`rule number ${rule.n} is used twice ${dir === 'in' ? 'inbound' : 'outbound'}`, [
          'nacl',
          'rules',
          i,
          'n',
        ]);
      seen.add(rule.n);
    });
  }
  unique(spec.cases, 'case', (i) => ['cases', i], say);
}

function checkPolicy(spec: Policies, say: Issue): void {
  unique(spec.policies, 'policy', (i) => ['policies', i], say);
  const statements = spec.policies.flatMap((p, i) =>
    p.statements.map((s, j) => ({ s, at: ['policies', i, 'statements', j] })),
  );
  unique(
    statements.map((x) => x.s),
    'rule',
    (i) => statements[i]?.at ?? [],
    say,
  );
  unique(spec.principals, 'principal', (i) => ['principals', i], say);
  unique(spec.groups, 'group', (i) => ['groups', i], say);
  unique(spec.org, 'node', (i) => ['org', i], say);
  unique(spec.cases, 'case', (i) => ['cases', i], say);

  const groups = new Set(spec.groups.map((g) => g.id));
  const principals = new Set(spec.principals.map((p) => p.id));
  const nodes = new Map(spec.org.map((n) => [n.id, n]));
  const parents = new Set(spec.org.flatMap((n) => (n.parent === undefined ? [] : [n.parent])));

  spec.principals.forEach((p, i) => {
    p.groups.forEach((g, j) => {
      if (!groups.has(g)) say(`names no group: ${g}`, ['principals', i, 'groups', j]);
    });
    if (p.account === undefined) {
      if (spec.org.length > 0) say(`needs an account: ${p.id}`, ['principals', i, 'account']);
    } else if (!nodes.has(p.account) || parents.has(p.account)) {
      say(`names no account: ${p.account}`, ['principals', i, 'account']);
    }
  });

  spec.policies.forEach((p, i) => {
    if (p.kind === 'iam') {
      if (!principals.has(p.attach) && !groups.has(p.attach))
        say(`names no principal or group: ${p.attach}`, ['policies', i, 'attach']);
    } else if (spec.org.length === 0) {
      say('an SCP needs the org', ['policies', i, 'attach']);
    } else if (!nodes.has(p.attach)) {
      say(`names no organization node: ${p.attach}`, ['policies', i, 'attach']);
    }
  });

  if (spec.org.length > 0) {
    if (spec.org.filter((n) => n.parent === undefined).length !== 1)
      say('the org needs exactly one root', ['org']);
    const covered = new Set(spec.policies.filter((p) => p.kind === 'scp').map((p) => p.attach));
    spec.org.forEach((node, i) => {
      if (node.parent !== undefined && !nodes.has(node.parent))
        say(`names no organization node: ${node.parent}`, ['org', i, 'parent']);
      let up = node.parent;
      for (let steps = 0; up !== undefined && steps <= spec.org.length; steps++) {
        if (up === node.id) {
          say(`node ${node.id} is its own ancestor`, ['org', i, 'parent']);
          break;
        }
        up = nodes.get(up)?.parent;
      }
      if (!covered.has(node.id)) say(`node ${node.id} has no SCP`, ['org', i]);
    });
  }

  spec.cases.forEach((c, i) => {
    if (!principals.has(c.principal)) say(`names no principal: ${c.principal}`, ['cases', i, 'principal']);
  });
}

export const TraceSpec = z.discriminatedUnion('kind', [NetworkSpec, PolicySpec]).superRefine((spec, ctx) => {
  const say: Issue = (message, path) => ctx.addIssue({ code: 'custom', message, path });
  if (spec.kind === 'network') checkNetwork(spec, say);
  else checkPolicy(spec, say);
});

export const TraceAction = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('toggle'), rule: Slug, on: z.boolean() }),
  z.strictObject({ t: z.literal('reset') }),
]);

export type TraceSpec = z.infer<typeof TraceSpec>;
export type TraceAction = z.infer<typeof TraceAction>;
export type NetworkTraceSpec = Extract<TraceSpec, { kind: 'network' }>;
export type PolicyTraceSpec = Extract<TraceSpec, { kind: 'policy' }>;
