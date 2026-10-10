/** The lab screen's copy (spec 5, 7.4), pure so the tests match it word for word. */
import type { LabEngineId } from '../../schemas/ids.ts';
import type { NetworkTraceSpec, PolicyTraceSpec, TraceSpec } from '../../schemas/lab-trace.ts';
import type { GoalResult } from '../labs/contract.ts';
import type { TraceHop } from '../labs/trace/model.ts';
import { shortDate } from './dates.ts';

export const ENGINE_LABEL = {
  sort: 'Sort',
  configure: 'Configure',
  simulate: 'Simulate',
  place: 'Place',
  trace: 'Trace',
  investigate: 'Investigate',
} as const satisfies Record<LabEngineId, string>;

/** Shown on every lab that prices anything (spec 5): prices are never real AWS prices. */
export const CREDITS_NOTE = 'Prices are in lab credits, a made-up unit, not AWS prices.';

/** The Sort tray once every card is in a bucket. */
export const TRAY_EMPTY = 'Every card is placed.';

/** The inline reset panel's question (spec 7.5: no modal). */
export const RESET_ASK = 'Reset this lab? Your work is cleared; hints you opened still count.';

/** The line under a lab's title: `Sort lab, about 6 minutes`. */
export function labLede(engine: LabEngineId, minutes: number): string {
  return `${ENGINE_LABEL[engine]} lab, about ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** A goal's word beside its icon; colour is never the only signal (spec 7.6). */
export function goalWord(result: GoalResult | null): 'Met' | 'Not met' | 'Not checked' {
  if (result === null) return 'Not checked';
  return result.pass ? 'Met' : 'Not met';
}

/** What a Check announces: `1 of 3 goals met.`, `All 3 goals met.`, or with the XP the completion paid. */
export function labCheckLine(met: number, total: number, xp: number): string {
  if (met < total) return `${met} of ${total} goals met.`;
  return xp > 0 ? `All ${total} goals met. Plus ${xp} XP.` : `All ${total} goals met.`;
}

/** An opened hint: the goal's own hint, then what the board says about that goal now. */
export function hintLine(goalHint: string, stateHint: string): string {
  return `${goalHint} ${stateHint}`;
}

/** Under the title of a lab done before (spec 3.2: first completion only). */
export function labDoneLine(day: string): string {
  return `Done on ${shortDate(day)}; a rerun pays no XP.`;
}

/** Announced when a card lands in a bucket or a piece in a slot. */
export function placedLine(card: string, bucket: string): string {
  return `Placed ${card} in ${bucket}.`;
}

/** Announced when a card or a piece goes back to the tray. */
export function returnedLine(card: string): string {
  return `${card} is back in the tray.`;
}

/** The Place tray once every piece is in a slot or on the bench. */
export const PIECES_EMPTY = 'Every piece is placed.';
/** The Place tray's legend, read by screen readers. */
export const PIECES_LEGEND = 'Pieces';
/** The legend over the Place failure buttons. */
export const FAILURE_LEGEND = 'Try a failure';
/** The word on a failed container and on each piece below it, so colour is never the only signal (spec 7.6). */
export const DOWN_MARK = 'Down';

/** A Place failure button: `Oven Row A fails`. */
export function failureButton(label: string): string {
  return `${label} fails`;
}

/** Announced when a failure preview starts. */
export function downLine(label: string): string {
  return `${label} is down.`;
}

/** Announced when a failure preview ends. */
export function backLine(label: string): string {
  return `${label} is back.`;
}

/** The check button's words: Simulate runs the model before it checks (Task 13). */
export function checkLabel(engine: LabEngineId): string {
  return engine === 'simulate' ? 'Run and check' : 'Check';
}

export const SIM_IDLE = 'Not run yet. Press Run and check to run the simulation with these parameters.';
export const SIM_RESULTS = 'Results of the last run';
/** The accessible name of a Simulate chart, naming its series and its points. */
export function simChartLabel(model: 'scaling' | 's3-lifecycle', series: readonly string[]): string {
  return model === 'scaling'
    ? `${series.join(' and ')} for each hour from 0:00 to 23:00`
    : `${series.join(' and ')} at the end of each 30-day month`;
}

/** A Trace hop's verdict in words, so colour is never the only signal (spec 7.6). */
export const HOP_WORD = {
  allow: 'Allowed',
  deny: 'Denied',
  nomatch: 'No match',
  stateful: 'Allowed as a reply',
  skipped: 'Not reached',
} as const;
export const RESULT_WORD = { allow: 'Allowed', deny: 'Denied' } as const;
export const CASES_HEADING = 'Test cases';

/** A test case's live result beside the one it should give. */
export const caseLine = (result: 'allow' | 'deny', expect: 'allow' | 'deny'): string =>
  `Result: ${RESULT_WORD[result]}. Expected: ${RESULT_WORD[expect]}.`;

type SgRule = NetworkTraceSpec['sg']['rules'][number];
type NaclRule = NetworkTraceSpec['nacl']['rules'][number];
type Statement = PolicyTraceSpec['policies'][number]['statements'][number];
type Policy = PolicyTraceSpec['policies'][number];

/** `TCP 443`, `UDP 1024-65535` or `all traffic`. */
function traffic(rule: SgRule | NaclRule): string {
  if (rule.proto === 'all') return 'all traffic';
  const ports = rule.from === rule.to ? `${rule.from}` : `${rule.from}-${rule.to}`;
  return `${rule.proto.toUpperCase()} ${ports}`;
}

const peer = (rule: SgRule | NaclRule): string => `${rule.dir === 'in' ? 'from' : 'to'} ${rule.cidr}`;

/** `Inbound TCP 443 from 0.0.0.0/0`. */
export function sgRuleText(rule: SgRule): string {
  return `${rule.dir === 'in' ? 'Inbound' : 'Outbound'} ${traffic(rule)} ${peer(rule)}`;
}

/** `Rule 100: allow inbound TCP 443 from 0.0.0.0/0`. */
export function naclRuleText(rule: NaclRule): string {
  return `Rule ${rule.n}: ${rule.action} ${rule.dir === 'in' ? 'inbound' : 'outbound'} ${traffic(rule)} ${peer(rule)}`;
}

/** `Allow s3:GetObject on cafe-menu/*`. */
export function statementText(statement: Statement): string {
  const effect = statement.effect === 'allow' ? 'Allow' : 'Deny';
  return `${effect} ${statement.actions.join(', ')} on ${statement.resources.join(', ')}`;
}

/** A policy's legend: `Bakers policy, attached to Bakers`, naming its principal, group or org node by label. */
export function policyLegend(spec: PolicyTraceSpec, policy: Policy): string {
  const holders = policy.kind === 'scp' ? spec.org : [...spec.principals, ...spec.groups];
  const holder = holders.find((h) => h.id === policy.attach)?.label ?? 'nothing';
  return `${policy.label}, attached to ${holder}`;
}

const HOP_PLACE = {
  'nacl-in': 'Network ACL, inbound',
  'nacl-out': 'Network ACL, outbound',
  'sg-in': 'Security group, inbound',
  'sg-out': 'Security group, outbound',
} as const;

/** One hop of a stepped case: `Network ACL, outbound (reply): Denied by the final * rule`. */
export function hopLine(spec: TraceSpec, hop: TraceHop): string {
  let place: string;
  if (hop.at === 'scp') {
    const node = spec.kind === 'policy' ? spec.org.find((n) => n.id === hop.node) : undefined;
    place = `SCP at ${node?.label ?? 'the organization'}`;
  } else if (hop.at === 'iam') {
    place = 'IAM policies';
  } else {
    place = `${HOP_PLACE[hop.at]}${hop.reply ? ' (reply)' : ''}`;
  }
  let by = '';
  if (hop.by === '*') by = ' by the final * rule';
  else if (spec.kind === 'network' && (hop.at === 'nacl-in' || hop.at === 'nacl-out')) {
    const rule = spec.nacl.rules.find((r) => r.id === hop.by);
    if (rule !== undefined) by = ` by rule ${rule.n}`;
  }
  return `${place}: ${HOP_WORD[hop.verdict]}${by}`;
}

/** The text of the rule or statement a toggle names, or null when the spec has none by that id. */
export function traceRuleText(spec: TraceSpec, id: string): string | null {
  if (spec.kind === 'network') {
    const sg = spec.sg.rules.find((r) => r.id === id);
    if (sg !== undefined) return sgRuleText(sg);
    const nacl = spec.nacl.rules.find((r) => r.id === id);
    return nacl === undefined ? null : naclRuleText(nacl);
  }
  const statement = spec.policies.flatMap((p) => p.statements).find((s) => s.id === id);
  return statement === undefined ? null : statementText(statement);
}

/** Announced when a Trace rule is switched. */
export const ruleOnLine = (text: string): string => `${text} is on.`;
export const ruleOffLine = (text: string): string => `${text} is off.`;
