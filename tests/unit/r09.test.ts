import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const QUESTIONS = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';
const CHECKS = 'checks: [solve-closed@1, solve-notes@1, critic@1]';

function load(...edits: [from: string, to: string][]) {
  const root = makeFixtureRoot();
  for (const [from, to] of edits) replaceIn(root, QUESTIONS, from, to);
  return loadContext(root, { today: FIXTURE_TODAY });
}
const r09 = (...edits: [string, string][]): string[] =>
  runRules(load(...edits), ['R9']).findings.map((f) => `${f.line} ${f.message}`);

describe('R9 verified', () => {
  it('passes the stamped live fixture question', () => {
    const ctx = load();
    expect(ctx.questions.find((e) => e.q.id === 'q-b4k7m2')?.q.status).toBe('live');
    expect(runRules(ctx, ['R9']).findings).toEqual([]);
  });

  it('reports a live question whose why changed after the stamp', () => {
    expect(
      r09([
        'why: Baking ahead does not add oven capacity and leaves the rolls stale.',
        'why: Baking ahead adds no oven capacity and leaves the rolls stale by noon.',
      ]),
    ).toEqual([
      '2 q-b4k7m2: verified at other hashes; its text changed after the checks, so re-check and re-stamp it',
    ]);
  });

  it('reports a live question without a stamp, and ignores a draft without one', () => {
    expect(
      r09([
        '    status: draft\n    pool: practice\n    type: match',
        '    status: live\n    pool: practice\n    type: match',
      ]),
    ).toEqual(['34 q-c8n3p5: live but not verified; run the checks and pnpm content:stamp']);
    expect(r09()).toEqual([]);
  });

  it('leaves 2 checks to the schema and reports 3 checks that repeat critic', () => {
    expect(load([CHECKS, 'checks: [solve-closed@1, critic@1]']).loadErrors.map((f) => f.rule)).toEqual([
      'R1',
    ]);
    expect(r09([CHECKS, 'checks: [solve-closed@1, critic@1, critic@2]'])).toEqual([
      '2 q-b4k7m2: verified checks must name solve-closed, solve-notes and critic',
    ]);
  });
});

describe('R9 on incident steps', () => {
  it('reports a live step whose text changed after its stamp', () => {
    const root = makeFixtureRoot();
    replaceIn(
      root,
      'content/incidents/inc-001.yaml',
      'why: Turning people away loses the sales that borrowed capacity would have kept.',
      'why: Turning people away loses the sales that the borrowed ovens would have kept.',
    );
    expect(
      runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R9']).findings.map(
        (f) => `${f.file} ${f.message}`,
      ),
    ).toEqual([
      'content/incidents/inc-001.yaml q-d2f6h8: verified at other hashes; its text changed after the checks, so re-check and re-stamp it',
    ]);
  });
});
