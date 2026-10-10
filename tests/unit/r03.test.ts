import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { matchQuestion, POOL_FILE, writePool } from '../fixtures/questions.ts';

const QUESTIONS = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';

function r03(...edits: [from: string, to: string][]): string[] {
  const root = makeFixtureRoot();
  for (const [from, to] of edits) replaceIn(root, QUESTIONS, from, to);
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  expect(ctx.loadErrors).toEqual([]);
  return runRules(ctx, ['R3']).findings.map((f) => `${f.line} ${f.message}`);
}

const SECOND_CORRECT: [string, string] = [
  '        text: Install a third oven at the harbour branch\n',
  '        text: Install a third oven at the harbour branch\n        correct: true\n',
];

describe('R3 answer counts', () => {
  it('passes the fixture questions', () => {
    expect(r03()).toEqual([]);
  });

  it('reports a single with two correct options, and skips it once retired', () => {
    expect(r03(SECOND_CORRECT)).toEqual(['2 q-b4k7m2: single needs exactly 1 correct option of 4, has 2']);
    const retire: [string, string] = [
      'status: live\n    pool: practice\n    type: single',
      'status: retired\n    pool: practice\n    type: single',
    ];
    expect(r03(SECOND_CORRECT, retire)).toEqual([]);
  });

  it('reports a multi whose correct count differs from select', () => {
    expect(
      r03(
        ['    type: single\n', '    type: multi\n    select: 3\n'],
        [
          '      - id: d\n',
          '      - id: e\n        text: Ask a neighbouring bakery for a tray\n        why: Neighbours have no spare ovens either.\n      - id: d\n',
        ],
      ),
    ).toEqual([
      '2 q-b4k7m2: multi needs exactly 3 correct options, has 1',
      '2 q-b4k7m2: option ids must run a, b, c ... in order',
    ]);
  });

  it('reports repeated option texts after trimming and lowercasing', () => {
    expect(
      r03([
        '        text: Close the harbour branch on Saturdays\n',
        '        text: "  install a third oven at the harbour branch"\n',
      ]),
    ).toEqual(['2 q-b4k7m2: two options share the text "install a third oven at the harbour branch"']);
  });

  it('reports repeated lefts and rights in a match', () => {
    expect(
      r03(
        ['      - left: An empty cabinet overnight\n', '      - left: dough rising for forty minutes\n'],
        ['        right: Twenty minutes of cabinet time\n', '        right: Forty minutes of cabinet time\n'],
      ),
    ).toEqual([
      '34 q-c8n3p5: two pairs share the left "dough rising for forty minutes"',
      '34 q-c8n3p5: two pairs share the right "forty minutes of cabinet time"',
    ]);
  });

  it('reports a match in an exam-pool file', () => {
    const root = makeFixtureRoot();
    writePool(root, [matchQuestion({ pool: 'exam' })]);
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(runRules(ctx, ['R3']).findings.map((f) => `${f.file}:${f.line}  ${f.message}`)).toEqual([
      `${POOL_FILE}:2  q-3h8r2t: match questions belong to the practice pool only`,
    ]);
  });
});
