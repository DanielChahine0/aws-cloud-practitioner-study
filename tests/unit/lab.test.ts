import { describe, expect, it } from 'vitest';
import {
  type NetworkTraceSpec,
  type PolicyTraceSpec,
  type TraceAction,
  TraceSpec,
} from '../../schemas/lab-trace.ts';
import {
  CASES_HEADING,
  CREDITS_NOTE,
  caseLine,
  checkLabel,
  ENGINE_LABEL,
  goalWord,
  HOP_WORD,
  hintLine,
  hopLine,
  labCheckLine,
  labDoneLine,
  labLede,
  naclRuleText,
  placedLine,
  policyLegend,
  RESET_ASK,
  RESULT_WORD,
  returnedLine,
  ruleOffLine,
  ruleOnLine,
  SIM_IDLE,
  SIM_RESULTS,
  sgRuleText,
  simChartLabel,
  statementText,
  TRAY_EMPTY,
  traceRuleText,
} from '../../src/app/lab.ts';
import { replayLab } from '../../src/labs/contract.ts';
import { TRACE, traceCase } from '../../src/labs/trace/model.ts';
import { TRACE_NETWORK_SPEC, TRACE_POLICY_SPEC } from '../fixtures/lab-trace.ts';

describe('lab copy', () => {
  it('names the engines and says how long a lab takes', () => {
    expect(ENGINE_LABEL).toEqual({
      sort: 'Sort',
      configure: 'Configure',
      simulate: 'Simulate',
      place: 'Place',
      trace: 'Trace',
      investigate: 'Investigate',
    });
    expect(labLede('sort', 6)).toBe('Sort lab, about 6 minutes');
    expect(labLede('configure', 8)).toBe('Configure lab, about 8 minutes');
    expect(labLede('simulate', 1)).toBe('Simulate lab, about 1 minute');
    expect(labLede('place', 8)).toBe('Place lab, about 8 minutes');
    expect(labLede('trace', 10)).toBe('Trace lab, about 10 minutes');
    expect(labLede('investigate', 1)).toBe('Investigate lab, about 1 minute');
  });

  it('labels prices and asks before a reset', () => {
    expect(CREDITS_NOTE).toBe('Prices are in lab credits, a made-up unit, not AWS prices.');
    expect(RESET_ASK).toBe('Reset this lab? Your work is cleared; hints you opened still count.');
    expect(TRAY_EMPTY).toBe('Every card is placed.');
  });

  it('words a goal before and after a check', () => {
    expect(goalWord(null)).toBe('Not checked');
    expect(goalWord({ goalId: 'g1', pass: true, message: '2 of 2 right' })).toBe('Met');
    expect(goalWord({ goalId: 'g1', pass: false, message: '1 of 2 right' })).toBe('Not met');
  });

  it('announces a check, with the XP only when the completion paid some', () => {
    expect(labCheckLine(1, 3, 0)).toBe('1 of 3 goals met.');
    expect(labCheckLine(0, 2, 0)).toBe('0 of 2 goals met.');
    expect(labCheckLine(3, 3, 0)).toBe('All 3 goals met.');
    expect(labCheckLine(3, 3, 40)).toBe('All 3 goals met. Plus 40 XP.');
    expect(labCheckLine(2, 2, 30)).toBe('All 2 goals met. Plus 30 XP.');
  });

  it('joins a goal hint with what the board says now', () => {
    expect(hintLine('Shared kitchens bill by the hour.', '1 card still in the tray.')).toBe(
      'Shared kitchens bill by the hour. 1 card still in the tray.',
    );
  });

  it('says when a lab was done, and what card moved where', () => {
    expect(labDoneLine('2026-10-19')).toBe('Done on Oct 19; a rerun pays no XP.');
    expect(placedLine('Rye for the market', 'Shared kitchen')).toBe(
      'Placed Rye for the market in Shared kitchen.',
    );
    expect(returnedLine('Rye for the market')).toBe('Rye for the market is back in the tray.');
  });
});

describe('the check button', () => {
  it('names the check button by engine', () => {
    expect(checkLabel('sort')).toBe('Check');
    expect(checkLabel('configure')).toBe('Check');
    expect(checkLabel('simulate')).toBe('Run and check');
    expect(checkLabel('place')).toBe('Check');
    expect(checkLabel('trace')).toBe('Check');
    expect(checkLabel('investigate')).toBe('Check');
  });
});

describe('Simulate copy', () => {
  it('says what a Simulate lab shows before and after a run', () => {
    expect(SIM_IDLE).toBe('Not run yet. Press Run and check to run the simulation with these parameters.');
    expect(SIM_RESULTS).toBe('Results of the last run');
    expect(simChartLabel('scaling', ['Orders', 'Capacity'])).toBe(
      'Orders and Capacity for each hour from 0:00 to 23:00',
    );
    expect(simChartLabel('s3-lifecycle', ['Cost so far'])).toBe(
      'Cost so far at the end of each 30-day month',
    );
  });
});

describe('Trace copy', () => {
  const net = TraceSpec.parse(TRACE_NETWORK_SPEC) as NetworkTraceSpec;
  const pol = TraceSpec.parse(TRACE_POLICY_SPEC) as PolicyTraceSpec;
  const lines = (spec: TraceSpec, actions: readonly unknown[], caseId: string): string[] =>
    traceCase(spec, replayLab(TRACE, spec, actions as TraceAction[]), caseId)?.hops.map((h) =>
      hopLine(spec, h),
    ) ?? [];

  it('names hop verdicts and case results in words, never colour alone', () => {
    expect(HOP_WORD).toEqual({
      allow: 'Allowed',
      deny: 'Denied',
      nomatch: 'No match',
      stateful: 'Allowed as a reply',
      skipped: 'Not reached',
    });
    expect(RESULT_WORD).toEqual({ allow: 'Allowed', deny: 'Denied' });
    expect(CASES_HEADING).toBe('Test cases');
    expect(caseLine('deny', 'allow')).toBe('Result: Denied. Expected: Allowed.');
    expect(caseLine('allow', 'allow')).toBe('Result: Allowed. Expected: Allowed.');
    expect(checkLabel('trace')).toBe('Check');
  });

  it('reads security group and network ACL rules as plain sentences', () => {
    expect(
      sgRuleText({ id: 'a', dir: 'in', proto: 'tcp', from: 443, to: 443, cidr: '0.0.0.0/0', on: true }),
    ).toBe('Inbound TCP 443 from 0.0.0.0/0');
    expect(
      sgRuleText({ id: 'b', dir: 'out', proto: 'all', from: 0, to: 65535, cidr: '10.20.0.0/16', on: true }),
    ).toBe('Outbound all traffic to 10.20.0.0/16');
    expect(
      sgRuleText({
        id: 'c',
        dir: 'in',
        proto: 'udp',
        from: 1024,
        to: 65535,
        cidr: '198.51.100.0/24',
        on: false,
      }),
    ).toBe('Inbound UDP 1024-65535 from 198.51.100.0/24');
    expect(
      naclRuleText({
        id: 'd',
        n: 100,
        dir: 'in',
        proto: 'tcp',
        from: 443,
        to: 443,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      }),
    ).toBe('Rule 100: allow inbound TCP 443 from 0.0.0.0/0');
    expect(
      naclRuleText({
        id: 'e',
        n: 90,
        dir: 'in',
        proto: 'all',
        from: 0,
        to: 65535,
        cidr: '198.51.100.0/24',
        action: 'deny',
        on: true,
      }),
    ).toBe('Rule 90: deny inbound all traffic from 198.51.100.0/24');
  });

  it('reads policy statements and where a policy is attached', () => {
    expect(
      statementText({
        id: 'a',
        effect: 'allow',
        actions: ['s3:GetObject'],
        resources: ['cafe-menu/*'],
        on: true,
      }),
    ).toBe('Allow s3:GetObject on cafe-menu/*');
    expect(
      statementText({ id: 'b', effect: 'deny', actions: ['s3:*', 'iam:*'], resources: ['*'], on: true }),
    ).toBe('Deny s3:*, iam:* on *');
    expect(pol.policies.map((p) => policyLegend(pol, p))).toEqual([
      'Full access, attached to Bakery group',
      'Full access, attached to Shops',
      'No oven deletes, attached to Shops',
      'Full access, attached to East shop',
      'Bakers policy, attached to Bakers',
      'Till policy, attached to Lu at the till',
    ]);
  });

  it('names each hop by its place, its word and the network ACL rule that decided it', () => {
    expect(lines(net, [], 'customer-order')).toEqual([
      'Network ACL, inbound: Allowed by rule 100',
      'Security group, inbound: No match',
      'Security group, outbound (reply): Not reached',
      'Network ACL, outbound (reply): Not reached',
    ]);
    expect(lines(net, [{ t: 'toggle', rule: 'sg-https-all', on: true }], 'customer-order')).toEqual([
      'Network ACL, inbound: Allowed by rule 100',
      'Security group, inbound: Allowed',
      'Security group, outbound (reply): Allowed as a reply',
      'Network ACL, outbound (reply): Denied by the final * rule',
    ]);
    expect(lines(net, [], 'blocked-order')[0]).toBe('Network ACL, inbound: Denied by rule 90');
    expect(lines(pol, [], 'mo-recipes')).toEqual([
      'SCP at Bakery group: Allowed',
      'SCP at Shops: Allowed',
      'SCP at East shop: Allowed',
      'IAM policies: No match',
    ]);
  });

  it('announces a switched rule by its text, never its id', () => {
    expect(traceRuleText(net, 'sg-https-all')).toBe('Inbound TCP 443 from 0.0.0.0/0');
    expect(traceRuleText(net, 'acl-replies-out')).toBe(
      'Rule 100: allow outbound TCP 1024-65535 to 0.0.0.0/0',
    );
    expect(traceRuleText(pol, 'read-recipes')).toBe('Allow recipes:Get* on recipes/*');
    expect(traceRuleText(net, 'read-recipes')).toBeNull();
    expect(ruleOnLine('Inbound TCP 443 from 0.0.0.0/0')).toBe('Inbound TCP 443 from 0.0.0.0/0 is on.');
    expect(ruleOffLine('Allow recipes:Get* on recipes/*')).toBe('Allow recipes:Get* on recipes/* is off.');
  });
});
