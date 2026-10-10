import type {
  NetworkTraceSpec,
  PolicyTraceSpec,
  TraceAction,
  TraceSpec,
} from '../../../schemas/lab-trace.ts';
import type { GoalResult, LabEngine } from '../contract.ts';

/**
 * The Trace engine (spec 5.1): fixed candidate rules, each on or off. `start` keeps every rule's starting value, so
 * `reduce` validates a rule id and `reset` restores the start without the spec.
 */
export interface TraceState {
  readonly start: Readonly<Record<string, boolean>>;
  readonly on: Readonly<Record<string, boolean>>;
}

export type HopVerdict = 'allow' | 'deny' | 'nomatch' | 'stateful' | 'skipped';

/** One check a request or its reply passes through. */
export interface TraceHop {
  readonly at: 'nacl-in' | 'sg-in' | 'sg-out' | 'nacl-out' | 'scp' | 'iam';
  /** The org node id of an `scp` hop, else null. */
  readonly node: string | null;
  /** True on the reply leg of a network case. */
  readonly reply: boolean;
  readonly verdict: HopVerdict;
  /** The deciding rule or statement id, `*` for the network ACL's final rule, else null. */
  readonly by: string | null;
}

export interface TraceRun {
  readonly result: 'allow' | 'deny';
  readonly hops: readonly TraceHop[];
}

type NaclRule = NetworkTraceSpec['nacl']['rules'][number];
type SgRule = NetworkTraceSpec['sg']['rules'][number];
type NetCase = NetworkTraceSpec['cases'][number];
type PolicyCase = PolicyTraceSpec['cases'][number];
type Statement = PolicyTraceSpec['policies'][number]['statements'][number];

/** Every rule or statement id of a spec with its starting value. */
function initial(spec: TraceSpec): TraceState {
  const rules =
    spec.kind === 'network'
      ? [...spec.sg.rules, ...spec.nacl.rules]
      : spec.policies.flatMap((p) => p.statements);
  const start = Object.fromEntries(rules.map((r) => [r.id, r.on]));
  return { start, on: start };
}

const sameFlags = (a: Readonly<Record<string, boolean>>, b: Readonly<Record<string, boolean>>): boolean =>
  Object.keys(a).every((id) => a[id] === b[id]);

/** The IPv4 address as an unsigned 32-bit number, or null when it is not one. */
function ipNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    n = n * 256 + Number(part);
  }
  return n;
}

/** True when `ip` lies in `cidr`, by a 32-bit mask compare; `/0` matches every address. */
export function inCidr(ip: string, cidr: string): boolean {
  const [base = '', bitsText = ''] = cidr.split('/');
  const bits = /^\d{1,2}$/.test(bitsText) ? Number(bitsText) : -1;
  const a = ipNumber(ip);
  const b = ipNumber(base);
  if (a === null || b === null || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const shift = 32 - bits;
  return Math.floor(a / 2 ** shift) === Math.floor(b / 2 ** shift);
}

/** True when `value` matches `pattern`, where `*` stands for any run of characters, possibly empty. */
export function globMatch(pattern: string, value: string, ignoreCase = false): boolean {
  const p = ignoreCase ? pattern.toLowerCase() : pattern;
  const v = ignoreCase ? value.toLowerCase() : value;
  let pi = 0;
  let vi = 0;
  let star = -1;
  let mark = 0;
  while (vi < v.length) {
    if (pi < p.length && p[pi] !== '*' && p[pi] === v[vi]) {
      pi++;
      vi++;
    } else if (pi < p.length && p[pi] === '*') {
      star = pi++;
      mark = vi;
    } else if (star >= 0) {
      pi = star + 1;
      vi = ++mark;
    } else {
      return false;
    }
  }
  while (pi < p.length && p[pi] === '*') pi++;
  return pi === p.length;
}

/** Goal ids in the order the cases first name them. */
export function traceGoals(spec: TraceSpec): string[] {
  return [...new Set(spec.cases.map((c) => c.goal))];
}

const isOn = (state: TraceState, id: string): boolean => state.on[id] === true;

const covers = (rule: SgRule | NaclRule, c: NetCase, port: number): boolean =>
  (rule.proto === 'all' || rule.proto === c.proto) &&
  port >= rule.from &&
  port <= rule.to &&
  inCidr(c.ip, rule.cidr);

/** A network ACL hop: enabled rules of that direction by ascending number, the first match decides, else `*`. */
function naclHop(
  spec: NetworkTraceSpec,
  state: TraceState,
  c: NetCase,
  dir: 'in' | 'out',
  reply: boolean,
): TraceHop {
  const port = reply ? c.reply : c.port;
  const hit = spec.nacl.rules
    .filter((r) => r.dir === dir && isOn(state, r.id))
    .sort((a, b) => a.n - b.n)
    .find((r) => covers(r, c, port));
  const at = dir === 'in' ? 'nacl-in' : 'nacl-out';
  return hit === undefined
    ? { at, node: null, reply, verdict: 'deny', by: '*' }
    : { at, node: null, reply, verdict: hit.action, by: hit.id };
}

/** A security group hop: a request needs an enabled allow; the reply of an allowed request always passes. */
function sgHop(
  spec: NetworkTraceSpec,
  state: TraceState,
  c: NetCase,
  dir: 'in' | 'out',
  reply: boolean,
): TraceHop {
  const at = dir === 'in' ? 'sg-in' : 'sg-out';
  if (reply) return { at, node: null, reply, verdict: 'stateful', by: null };
  const hit = spec.sg.rules.find((r) => r.dir === dir && isOn(state, r.id) && covers(r, c, c.port));
  return hit === undefined
    ? { at, node: null, reply, verdict: 'nomatch', by: null }
    : { at, node: null, reply, verdict: 'allow', by: hit.id };
}

function networkRun(spec: NetworkTraceSpec, state: TraceState, c: NetCase): TraceRun {
  const back = c.dir === 'in' ? 'out' : 'in';
  const legs: (() => TraceHop)[] =
    c.dir === 'in'
      ? [
          () => naclHop(spec, state, c, 'in', false),
          () => sgHop(spec, state, c, 'in', false),
          () => sgHop(spec, state, c, back, true),
          () => naclHop(spec, state, c, back, true),
        ]
      : [
          () => sgHop(spec, state, c, 'out', false),
          () => naclHop(spec, state, c, 'out', false),
          () => naclHop(spec, state, c, back, true),
          () => sgHop(spec, state, c, back, true),
        ];
  const hops: TraceHop[] = [];
  let dropped = false;
  for (const leg of legs) {
    const hop = leg();
    if (dropped) {
      hops.push({ ...hop, verdict: 'skipped', by: null });
      continue;
    }
    hops.push(hop);
    if (hop.verdict === 'deny' || hop.verdict === 'nomatch') dropped = true;
  }
  return { result: dropped ? 'deny' : 'allow', hops };
}

/** Deny on an enabled matching Deny, else allow on an enabled matching Allow, else no match. */
function judge(
  statements: readonly Statement[],
  state: TraceState,
  c: PolicyCase,
): Pick<TraceHop, 'verdict' | 'by'> {
  const matching = statements.filter(
    (s) =>
      isOn(state, s.id) &&
      s.actions.some((a) => globMatch(a, c.action, true)) &&
      s.resources.some((r) => globMatch(r, c.resource)),
  );
  const deny = matching.find((s) => s.effect === 'deny');
  if (deny !== undefined) return { verdict: 'deny', by: deny.id };
  const allow = matching.find((s) => s.effect === 'allow');
  return allow === undefined ? { verdict: 'nomatch', by: null } : { verdict: 'allow', by: allow.id };
}

/** The org node ids from the root down to `account`; empty without an org. */
function orgPath(spec: PolicyTraceSpec, account: string | undefined): string[] {
  const path: string[] = [];
  let id = account;
  while (id !== undefined && path.length <= spec.org.length) {
    const node = spec.org.find((n) => n.id === id);
    if (node === undefined || path.includes(node.id)) break;
    path.unshift(node.id);
    id = node.parent;
  }
  return path;
}

function policyRun(spec: PolicyTraceSpec, state: TraceState, c: PolicyCase): TraceRun | null {
  const principal = spec.principals.find((p) => p.id === c.principal);
  if (principal === undefined) return null;
  const scps = orgPath(spec, principal.account).map(
    (node): TraceHop => ({
      at: 'scp',
      node,
      reply: false,
      ...judge(
        spec.policies.filter((p) => p.kind === 'scp' && p.attach === node).flatMap((p) => p.statements),
        state,
        c,
      ),
    }),
  );
  const holders = new Set([principal.id, ...principal.groups]);
  const iam: TraceHop = {
    at: 'iam',
    node: null,
    reply: false,
    ...judge(
      spec.policies.filter((p) => p.kind === 'iam' && holders.has(p.attach)).flatMap((p) => p.statements),
      state,
      c,
    ),
  };
  const hops = [...scps, iam];
  return { result: hops.every((h) => h.verdict === 'allow') ? 'allow' : 'deny', hops };
}

/** Steps one test case through its hops with the rules as they are now; null for a case the spec does not hold. */
export function traceCase(spec: TraceSpec, state: TraceState, caseId: string): TraceRun | null {
  if (spec.kind === 'network') {
    const c = spec.cases.find((x) => x.id === caseId);
    return c === undefined ? null : networkRun(spec, state, c);
  }
  const c = spec.cases.find((x) => x.id === caseId);
  return c === undefined ? null : policyRun(spec, state, c);
}

/** The cases of a goal whose result differs from the expected one, in spec order. */
function misses(spec: TraceSpec, state: TraceState, goalId: string) {
  const cases: readonly (NetCase | PolicyCase)[] = spec.cases;
  return cases
    .filter((c) => c.goal === goalId)
    .map((c) => ({ c, result: traceCase(spec, state, c.id)?.result ?? 'deny' }))
    .filter(({ c, result }) => result !== c.expect);
}

export const TRACE: LabEngine<TraceSpec, TraceState, TraceAction> = {
  init: initial,

  reduce(state, action) {
    if (typeof action !== 'object' || action === null) return state;
    const a = action as { t?: unknown; rule?: unknown; on?: unknown };
    if (a.t === 'reset') return sameFlags(state.on, state.start) ? state : { ...state, on: state.start };
    if (a.t !== 'toggle' || typeof a.rule !== 'string' || typeof a.on !== 'boolean') return state;
    if (!Object.hasOwn(state.on, a.rule) || state.on[a.rule] === a.on) return state;
    return { ...state, on: { ...state.on, [a.rule]: a.on } };
  },

  check(spec, state): GoalResult[] {
    return traceGoals(spec).map((goalId) => {
      const total = spec.cases.filter((c) => c.goal === goalId).length;
      const right = total - misses(spec, state, goalId).length;
      return { goalId, pass: right === total, message: `${right} of ${total} cases as expected` };
    });
  },

  hint(spec, state, goalId) {
    const first = misses(spec, state, goalId)[0];
    if (first === undefined) return 'Every case of this goal gives the expected result.';
    return first.result === 'allow'
      ? `${first.c.label}: allowed, but it should be denied.`
      : `${first.c.label}: denied, but it should be allowed.`;
  },
};
