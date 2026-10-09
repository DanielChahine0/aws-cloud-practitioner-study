import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { missingTerms } from '../../scripts/content/lib/coverage.ts';
import { parseUpdateLine } from '../../scripts/content/lib/update-line.ts';
import {
  addConceptTag,
  applyUpdates,
  checkUpdates,
  insertUpdateLine,
  setCoveredBy,
  UpdateResult,
  updateLineText,
} from '../../scripts/content/lib/updates.ts';
import { RULES, runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const BLUEPRINT = 'content/exam/blueprint.yaml';
const DOMAIN1 =
  'https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html';
const load = (root: string) => loadContext(root, { today: FIXTURE_TODAY });

function withMissing(terms = '"speed of baking"'): string {
  const root = makeFixtureRoot();
  replaceIn(
    root,
    BLUEPRINT,
    'text: Fixture task statement 1.1, terms: []',
    `text: Fixture task statement 1.1, terms: [${terms}]`,
  );
  return root;
}

const valid = (over: Record<string, unknown> = {}): UpdateResult =>
  UpdateResult.parse({
    task: '1.1',
    updates: [
      {
        terms: ['speed of baking'],
        note: 'm01/what-a-bakery-cloud-is',
        anchor: 'shared-kitchen',
        sentence: 'The fixture guide counts speed of baking among the gains of borrowing ovens on demand.',
        title: 'CLF-C02 Domain 1',
        url: DOMAIN1,
        verified_on: '2026-10-05',
        concept: {
          id: 'speed-of-baking',
          name: 'Speed of baking',
          tasks: ['1.1'],
          confusableWith: ['shared-kitchen'],
        },
        ...over,
      },
    ],
  });

describe('updateLineText', () => {
  it('writes a line that parseUpdateLine reads back', () => {
    const u = valid().updates[0];
    if (u === undefined) throw new Error('no update');
    expect(parseUpdateLine(updateLineText(u))).toEqual({
      verifiedOn: '2026-10-05',
      title: 'CLF-C02 Domain 1',
      url: DOMAIN1,
      sentence: u.sentence,
    });
  });
});

describe('checkUpdates', () => {
  it('passes a valid result', () => {
    expect(checkUpdates(valid(), load(withMissing()))).toEqual([]);
  });

  it.each([
    [
      { sentence: 'The fixture guide counts quick ovens among the gains of borrowing them on demand.' },
      'the sentence does not contain the term "speed of baking"',
    ],
    [
      { anchor: 'objectives' },
      "anchor 'objectives' is not an H3 under ## Notes in m01/what-a-bakery-cloud-is",
    ],
    [
      { verified_on: '2026-01-01' },
      'verified_on 2026-01-01 is 282 days old (limit 180); re-check the source and update the date',
    ],
    [
      { url: 'https://example.com/guide' },
      'source https://example.com/guide is not on aws.amazon.com or docs.aws.amazon.com',
    ],
    [
      { sentence: 'The fixture guide counts speed of baking as a gain. It also counts more.' },
      'the sentence must be exactly one sentence',
    ],
    [
      { concept: { id: 'per-minute-rental', name: 'Per-minute rental', tasks: ['4.1'] } },
      'concept per-minute-rental is registered, so it must be a tested concept homed in m01/what-a-bakery-cloud-is whose tasks include 1.1',
    ],
    [
      { concept: { id: 'speed-of-baking', name: 'Speed of baking', tasks: ['4.1', '1.1'] } },
      'new concept speed-of-baking must list task 1.1 first',
    ],
  ])('reports %o', (over, message) => {
    expect(checkUpdates(valid(over), load(withMissing()))).toEqual([`speed of baking: ${message}`]);
  });

  it('wants every missing term exactly once and nothing else', () => {
    const ctx = load(withMissing('"speed of baking", "oven pool"'));
    expect(checkUpdates(valid(), ctx)).toEqual([
      'term "oven pool" of task 1.1 is in no update and no coveredBy',
    ]);
    const extra = UpdateResult.parse({
      ...valid(),
      coveredBy: [
        { term: 'oven pool', concept: 'shared-kitchen', reason: 'Taught as the shared kitchen.' },
        { term: 'speed of baking', concept: 'shared-kitchen', reason: 'Twice.' },
        { term: 'bread', concept: 'shared-kitchen', reason: 'Not missing.' },
      ],
    });
    expect(checkUpdates(extra, ctx)).toEqual([
      'term "speed of baking" is listed 2 times',
      'term "bread" is not a missing term of task 1.1',
    ]);
  });
});

describe('note and blueprint edits', () => {
  it('inserts the line at the end of its H3 section and adds the tag once', () => {
    const text = readFileSync(join(makeFixtureRoot(), LESSON), 'utf8');
    const out = insertUpdateLine(text, 'shared-kitchen', '- NEW LINE');
    expect(out).toContain(
      '- Branches use ovens from one central kitchen when their queues grow.\n- NEW LINE\n\n### Paying',
    );
    expect(() => insertUpdateLine(text, 'nowhere', '- x')).toThrow("no H3 'nowhere'");
    const table = text.replace(
      '- Branches use ovens from one central kitchen when their queues grow.',
      '| Branch | Ovens |\n| --- | --- |\n| Harbour | Shared |',
    );
    expect(insertUpdateLine(table, 'shared-kitchen', '- NEW LINE')).toContain(
      '| Harbour | Shared |\n\n- NEW LINE\n\n### Paying',
    );
    const tagged = addConceptTag(text, 'speed-of-baking');
    expect(tagged).toContain('  - per-minute-rental\n  - speed-of-baking\n---');
    expect(addConceptTag(tagged, 'speed-of-baking')).toBe(tagged);
  });

  it('maps a term with coveredBy and keeps the comments', () => {
    const root = withMissing('"speed of baking", "oven pool"');
    const out = setCoveredBy(
      readFileSync(join(root, BLUEPRINT), 'utf8'),
      '1.1',
      'oven pool',
      'shared-kitchen',
    );
    expect(out).toContain('# Fixture blueprint for the content-check tests.');
    expect(out).toContain('{ term: oven pool, coveredBy: shared-kitchen }');
    expect(() => setCoveredBy(out, '1.1', 'bread', 'shared-kitchen')).toThrow('task 1.1 has no term "bread"');
  });
});

describe('applyUpdates', () => {
  it('applies a valid result so the term is no longer missing and every rule still passes', () => {
    const root = withMissing('"speed of baking", "oven pool"');
    const result = UpdateResult.parse({
      ...valid(),
      coveredBy: [{ term: 'oven pool', concept: 'shared-kitchen', reason: 'Taught as the shared kitchen.' }],
    });
    const log = applyUpdates(root, [result]);
    expect(log).toEqual([
      'm01/what-a-bakery-cloud-is#shared-kitchen: update line for speed of baking',
      'content/concepts.yaml: added speed-of-baking homed at m01/what-a-bakery-cloud-is#shared-kitchen',
      'content/exam/blueprint.yaml: task 1.1 "oven pool" covered by shared-kitchen',
    ]);
    const ctx = load(root);
    expect(missingTerms(ctx)).toEqual([]);
    expect(ctx.concepts.find((c) => c.id === 'speed-of-baking')).toEqual({
      id: 'speed-of-baking',
      name: 'Speed of baking',
      home: 'm01/what-a-bakery-cloud-is',
      anchor: 'shared-kitchen',
      tasks: ['1.1'],
      confusableWith: ['shared-kitchen'],
    });
    const note = readFileSync(join(root, LESSON), 'utf8');
    expect(note.match(/speed-of-baking/g)).toHaveLength(1);
    expect(
      runRules(
        ctx,
        RULES.map((r) => r.id),
      ).findings,
    ).toEqual([]);
  });

  it('applies nothing when any result has a problem or two results claim one concept', () => {
    const root = withMissing();
    const before = readFileSync(join(root, LESSON), 'utf8');
    expect(() => applyUpdates(root, [valid({ anchor: 'objectives' })])).toThrow("anchor 'objectives'");
    expect(() => applyUpdates(root, [valid(), valid()])).toThrow(
      'concept speed-of-baking is claimed by tasks 1.1 and 1.1',
    );
    expect(readFileSync(join(root, LESSON), 'utf8')).toBe(before);
  });
});
