import { describe, expect, it } from 'vitest';
import {
  investigateTexts,
  labTexts,
  placeTexts,
  SPEC_TEXTS,
  traceTexts,
} from '../../scripts/content/lib/labs.ts';
import {
  bakeryInvestigateLab,
  INVESTIGATE_LISTING_SPEC,
  INVESTIGATE_SPEC,
} from '../fixtures/lab-investigate.ts';
import { bakeryPlaceLab, PLACE_SPEC } from '../fixtures/lab-place.ts';
import {
  bakeryPolicyLab,
  bakeryTraceLab,
  TRACE_NETWORK_SPEC,
  TRACE_POLICY_SPEC,
} from '../fixtures/lab-trace.ts';

/** Drops the empty strings an optional field leaves behind. */
const present = (texts: readonly (string | undefined)[]): string[] =>
  texts.filter((t): t is string => t !== undefined && t !== '');

describe('lab texts for R7 (spec 2.9)', () => {
  it('reads every container and piece of a Place spec, labels and details', () => {
    expect(placeTexts(PLACE_SPEC)).toEqual(
      present([
        ...PLACE_SPEC.containers.flatMap((c) => [c.label, c.detail]),
        ...PLACE_SPEC.pieces.flatMap((p) => [p.label, p.detail]),
      ]),
    );
    expect(placeTexts(PLACE_SPEC)).toEqual(
      expect.arrayContaining(['Flourtown', 'Network edge', 'Not used', 'Internet gateway', 'Spare mixer']),
    );
  });

  it('reads the target, the rule sets and the cases of a network Trace spec', () => {
    expect(traceTexts(TRACE_NETWORK_SPEC)).toEqual([
      'Order window',
      'window-sg',
      'front-acl',
      ...TRACE_NETWORK_SPEC.cases.map((c) => c.label),
    ]);
  });

  it('reads the policies, principals, groups, nodes and cases of a policy Trace spec', () => {
    expect(traceTexts(TRACE_POLICY_SPEC)).toEqual([
      ...TRACE_POLICY_SPEC.policies.map((p) => p.label),
      ...TRACE_POLICY_SPEC.principals.map((p) => p.label),
      ...TRACE_POLICY_SPEC.groups.map((g) => g.label),
      ...TRACE_POLICY_SPEC.org.map((n) => n.label),
      ...TRACE_POLICY_SPEC.cases.map((c) => c.label),
    ]);
  });

  it('reads the source, columns, every cell, the questions and their options of an Investigate spec', () => {
    expect(investigateTexts(INVESTIGATE_SPEC)).toEqual([
      INVESTIGATE_SPEC.source,
      ...INVESTIGATE_SPEC.columns.map((c) => c.label),
      ...INVESTIGATE_SPEC.records.flatMap((r) => INVESTIGATE_SPEC.columns.map((c) => r.cells[c.id] ?? '')),
      ...INVESTIGATE_SPEC.questions.flatMap((q) => [q.prompt, ...q.options.map((o) => o.label)]),
    ]);
  });

  it('reads the listing of an Investigate spec, line by line, without its blank lines', () => {
    const listing = INVESTIGATE_LISTING_SPEC.listing;
    if (listing === undefined) throw new Error('the listing fixture has a listing');
    expect(investigateTexts(INVESTIGATE_LISTING_SPEC)).toEqual([
      INVESTIGATE_LISTING_SPEC.source,
      listing.label,
      ...present(listing.lines),
      ...INVESTIGATE_LISTING_SPEC.questions.flatMap((q) => [q.prompt, ...q.options.map((o) => o.label)]),
    ]);
  });

  it('reads nothing from a spec that does not parse', () => {
    for (const junk of [
      undefined,
      null,
      7,
      {},
      { kind: 'network' },
      { containers: [] },
      { source: 'Ledger' },
    ]) {
      expect(placeTexts(junk)).toEqual([]);
      expect(traceTexts(junk)).toEqual([]);
      expect(investigateTexts(junk)).toEqual([]);
    }
  });

  it('gives each new engine its texts in SPEC_TEXTS, so labTexts reads them', () => {
    expect(SPEC_TEXTS.place).toBe(placeTexts);
    expect(SPEC_TEXTS.trace).toBe(traceTexts);
    expect(SPEC_TEXTS.investigate).toBe(investigateTexts);
    const cases: [ReturnType<typeof labTexts>, string[]][] = [
      [labTexts(bakeryPlaceLab()), placeTexts(PLACE_SPEC)],
      [labTexts(bakeryTraceLab()), traceTexts(TRACE_NETWORK_SPEC)],
      [labTexts(bakeryPolicyLab()), traceTexts(TRACE_POLICY_SPEC)],
      [labTexts(bakeryInvestigateLab()), investigateTexts(INVESTIGATE_SPEC)],
    ];
    for (const [texts, spec] of cases) {
      expect(spec.length).toBeGreaterThan(0);
      expect(texts).toEqual(expect.arrayContaining(spec));
    }
  });
});
