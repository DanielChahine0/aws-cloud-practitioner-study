import { describe, expect, it } from 'vitest';
import type { RuleId } from '../../schemas/validate-config.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const BRIEF = 'content/project/brief.yaml';
const KEY_POINTS = 'content/project/key-points/01-baking-basics.yaml';
const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const LIVE_EVIDENCE = 'evidence: Branches use ovens from one central kitchen when their queues grow.';

/** One rule's findings as `<line> <message>` after edits to fixture files, each edit `[file, from, to]`. */
function run(rule: RuleId, edits: [string, string, string][] = []): string[] {
  const root = makeFixtureRoot();
  for (const [file, from, to] of edits) replaceIn(root, file, from, to);
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  return runRules(ctx, [rule]).findings.map((f) => `${f.file}:${f.line ?? '-'} ${f.message}`);
}

describe('the project in R1', () => {
  it('passes the fixture brief and key points', () => {
    expect(run('R1')).toEqual([]);
  });

  it('reports a brief with a decision out of order', () => {
    expect(run('R1', [[BRIEF, '  - module: 2\n', '  - module: 3\n']])).toContain(
      `${BRIEF}:25 decisions.1.module: decision 2 must be for Module 2`,
    );
  });

  it('reports a key point id from another module', () => {
    expect(run('R1', [[KEY_POINTS, 'id: kp-01-give-capacity-back', 'id: kp-02-give-capacity-back']])).toEqual(
      [`${KEY_POINTS}:18 keyPoints.2.id: kp-02-give-capacity-back belongs to Module 2, not Module 1`],
    );
  });
});

describe('key point evidence in R5', () => {
  it('passes the live fixture key point', () => {
    expect(run('R5')).toEqual([]);
  });

  it('reports a live key point whose evidence is not a whole line of a concept home note', () => {
    expect(run('R5', [[KEY_POINTS, LIVE_EVIDENCE, `${LIVE_EVIDENCE.slice(0, -1)} fast.`]])).toEqual([
      `${KEY_POINTS}:4 kp-01-borrow-on-busy-days: evidence is not a whole line of the home note of any of its concepts`,
    ]);
  });

  it('follows the note when a cited line changes', () => {
    expect(
      run('R5', [
        [
          LESSON,
          '- Branches use ovens from one central kitchen',
          '- Branches borrow ovens from one central kitchen',
        ],
      ]).filter((f) => f.startsWith(KEY_POINTS)),
    ).toEqual([
      `${KEY_POINTS}:4 kp-01-borrow-on-busy-days: evidence is not a whole line of the home note of any of its concepts`,
    ]);
  });

  it('skips drafts', () => {
    expect(
      run('R5', [
        [KEY_POINTS, 'evidence: Cabinets are billed only while dough proofs.', 'evidence: Not in the note.'],
      ]),
    ).toEqual([]);
  });

  it('resolves a concept by its alias', () => {
    expect(
      run('R5', [
        ['content/concepts.yaml', '  tasks: ["1.1"]\n', '  tasks: ["1.1"]\n  aliases: [central-ovens]\n'],
        [
          KEY_POINTS,
          'concepts: [shared-kitchen]\n    evidence: Branches',
          'concepts: [central-ovens]\n    evidence: Branches',
        ],
      ]),
    ).toEqual([]);
  });
});

describe('project strings in R8', () => {
  it('passes the fixture brief and key points', () => {
    expect(run('R8')).toEqual([]);
  });

  it('reports a key point text with two sentences', () => {
    expect(run('R8', [[KEY_POINTS, 'that idles all week.', 'that idles all week. It saves money.']])).toEqual(
      [`${KEY_POINTS}:6 kp-01-borrow-on-busy-days: one sentence per string`],
    );
  });

  it('reports a brief prompt with two sentences by its field', () => {
    expect(run('R8', [[BRIEF, 'from the shared kitchen.', 'from the shared kitchen. Say why.']])).toEqual([
      `${BRIEF}:21 decisions[0].prompt: one sentence per string`,
    ]);
  });

  it('reports an em dash in a key point through the whole-file scan', () => {
    expect(
      run('R8', [
        [KEY_POINTS, 'on Saturdays instead', `on Saturdays ${String.fromCharCode(0x2014)} instead`],
      ]),
    ).toEqual([`${KEY_POINTS}:6 em dash (U+2014); use a plain hyphen`]);
  });
});

describe('key point stamps in R9', () => {
  it('passes the stamped live fixture key point and skips drafts', () => {
    expect(run('R9')).toEqual([]);
  });

  it('reports a live key point with no stamp', () => {
    expect(
      run('R9', [
        [KEY_POINTS, '    status: draft\n    text: Proofing', '    status: live\n    text: Proofing'],
      ]),
    ).toEqual([
      `${KEY_POINTS}:13 kp-01-pay-only-while-proofing: live but not verified; run the key point checks and node scripts/content/key-points.ts stamp`,
    ]);
  });

  it('reports a live key point whose text changed after its stamp', () => {
    expect(run('R9', [[KEY_POINTS, 'idles all week.', 'idles every week.']])).toEqual([
      `${KEY_POINTS}:4 kp-01-borrow-on-busy-days: verified at another hash; its text, concepts or evidence changed after the critic, so re-check and re-stamp it`,
    ]);
  });
});
