import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RuleId } from '../../schemas/validate-config.ts';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
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

const CONCEPTS = 'content/concepts.yaml';
const MISSION = 'content/missions/mission-00-guardrails.md';
const COPIED = 'Bakers rent proofing cabinets by the minute and hand them back once the dough has risen.';
const COPIED_RUN = 'bakers rent proofing cabinets by the minute and hand them back once the dough has risen';

/** R2 findings with the fixture key point file, as `headEdit` makes it, in HEAD, after `edits` to the working tree. */
function r02WithHead(headEdit: (text: string) => string, edits: [string, string, string][]): string[] {
  const root = makeFixtureRoot();
  const headText = headEdit(readFileSync(join(root, KEY_POINTS), 'utf8'));
  for (const [file, from, to] of edits) replaceIn(root, file, from, to);
  const ctx: Context = {
    ...loadContext(root, { today: FIXTURE_TODAY }),
    head: (path) => (path === KEY_POINTS ? headText : null),
    headPaths: (prefix) => (KEY_POINTS.startsWith(prefix) ? [KEY_POINTS] : []),
  };
  return runRules(ctx, ['R2']).findings.map((f) => `${f.file}:${f.line ?? '-'} ${f.message}`);
}

describe('key point ids and concept names in R2', () => {
  it('passes the fixture', () => {
    expect(run('R2')).toEqual([]);
  });

  it('claims key point ids with every other id', () => {
    expect(
      run('R2', [
        [CONCEPTS, '  confusableWith: [shared-kitchen]\n', '  aliases: [kp-01-borrow-on-busy-days]\n'],
      ]),
    ).toEqual([
      `${KEY_POINTS}:- id 'kp-01-borrow-on-busy-days' (key point) is already used by alias of per-minute-rental in ${CONCEPTS}`,
    ]);
  });

  it('keeps concept display names unique, whatever their case', () => {
    expect(run('R2', [[CONCEPTS, 'name: Per-minute rental', 'name: shared KITCHEN']])).toEqual([
      `${CONCEPTS}:- concept name 'shared KITCHEN' is used by shared-kitchen and per-minute-rental`,
    ]);
  });

  it('keeps a live or retired key point of HEAD and lets a draft go', () => {
    const renameLive: [string, string, string] = [
      KEY_POINTS,
      'id: kp-01-borrow-on-busy-days',
      'id: kp-01-borrow-on-fairs',
    ];
    expect(r02WithHead((text) => text, [renameLive])).toEqual([
      `${KEY_POINTS}:- key point 'kp-01-borrow-on-busy-days' is live or retired in HEAD but is gone; retire it in place with status: retired`,
    ]);
    const retiredInHead = (text: string) =>
      text.replace(
        'id: kp-01-give-capacity-back\n    status: draft',
        'id: kp-01-give-capacity-back\n    status: retired',
      );
    const renameDraft: [string, string, string] = [
      KEY_POINTS,
      'id: kp-01-give-capacity-back',
      'id: kp-01-hand-ovens-back',
    ];
    expect(r02WithHead((text) => text, [renameDraft])).toEqual([]);
    expect(r02WithHead(retiredInHead, [renameDraft])).toEqual([
      `${KEY_POINTS}:- key point 'kp-01-give-capacity-back' is live or retired in HEAD but is gone; retire it in place with status: retired`,
    ]);
  });
});

describe('key point concepts in R6', () => {
  it('passes the fixture', () => {
    expect(run('R6')).toEqual([]);
  });

  it('reports a key point concept that is not registered or not tested', () => {
    const rye: [string, string, string] = [
      KEY_POINTS,
      'concepts: [per-minute-rental]\n    evidence: Cabinets',
      'concepts: [rye-bread]\n    evidence: Cabinets',
    ];
    expect(run('R6', [rye])).toEqual([
      `${KEY_POINTS}:13 kp-01-pay-only-while-proofing: concept 'rye-bread' is not registered`,
    ]);
  });

  it('resolves a key point concept by its alias', () => {
    expect(
      run('R6', [
        [CONCEPTS, '  anchor: shared-kitchen\n', '  anchor: shared-kitchen\n  aliases: [communal-kitchen]\n'],
        [
          KEY_POINTS,
          'concepts: [shared-kitchen, per-minute-rental]',
          'concepts: [communal-kitchen, per-minute-rental]',
        ],
      ]),
    ).toEqual([]);
  });
});

describe('key point and brief text in R7', () => {
  it('passes the fixture', () => {
    expect(run('R7')).toEqual([]);
  });

  it('reports a live key point that copies a 9-word run from the course, and skips drafts', () => {
    const live: [string, string, string] = [
      KEY_POINTS,
      'The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.',
      COPIED,
    ];
    expect(run('R7', [live])).toEqual([
      `${KEY_POINTS}:4 kp-01-borrow-on-busy-days copies a 9-word run from the course: "${COPIED_RUN}"`,
    ]);
    const draft: [string, string, string] = [
      KEY_POINTS,
      'Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.',
      COPIED,
    ];
    expect(run('R7', [draft])).toEqual([]);
  });

  it('reports a brief string that copies a 9-word run from the course', () => {
    const copied: [string, string, string] = [BRIEF, 'Dough proofs for about an hour.', COPIED];
    expect(run('R7', [copied])).toEqual([
      `${BRIEF}:29 decisions[1].context[0] copies a 9-word run from the course: "${COPIED_RUN}"`,
    ]);
  });
});

describe('retired Support plan names in R8', () => {
  it('reports one in a key point, the brief and a mission page', () => {
    expect(
      run('R8', [
        [KEY_POINTS, 'the newer billing term', 'the Developer Support term'],
        [BRIEF, 'from the shared kitchen.', 'from the shared kitchen with Business Support.'],
        [
          MISSION,
          'Set up a budget before anything else.',
          'Set up a budget before anything else.\nSkip Enterprise On-Ramp here.',
        ],
      ]),
    ).toEqual([
      `${MISSION}:18 retired Support plan name in 'Skip Enterprise On-Ramp here.'`,
      `${BRIEF}:21 decisions[0].prompt: retired Support plan name in 'Choose how the first branch borrows ovens from the shared kitchen with Business Support.'`,
      `${KEY_POINTS}:25 kp-01-name-the-billing-term: retired Support plan name in 'The plan uses the Developer Support term that the bakery guide now prints.'`,
    ]);
  });

  it('accepts Business Support+', () => {
    expect(run('R8', [[KEY_POINTS, 'the newer billing term', 'the Business Support+ term']])).toEqual([]);
  });
});
