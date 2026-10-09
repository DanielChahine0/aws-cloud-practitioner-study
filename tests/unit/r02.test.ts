import { describe, expect, it } from 'vitest';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

function withHead(headConcepts: string): Context {
  const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
  return { ...ctx, head: (path) => (path === 'content/concepts.yaml' ? headConcepts : null) };
}

describe('R2 against HEAD', () => {
  it('reports a concept id that HEAD has and the working tree lost', () => {
    const findings = runRules(withHead('- id: rye-bread\n  name: Rye\n- id: shared-kitchen\n'), [
      'R2',
    ]).findings;
    expect(findings.map((f) => f.message)).toEqual([
      "concept id 'rye-bread' exists in HEAD but is gone; keep it as an alias of the concept that replaced it",
    ]);
  });

  it('accepts an old id that survives as an alias', () => {
    const ctx = withHead('- id: per-minute-rental\n- id: shared-kitchen\n- id: shared-oven\n');
    const merged: Context = {
      ...ctx,
      concepts: ctx.concepts.map((c) => (c.id === 'shared-kitchen' ? { ...c, aliases: ['shared-oven'] } : c)),
      read: (path) =>
        path === 'content/concepts.yaml'
          ? '- id: per-minute-rental\n- id: shared-kitchen\n  aliases: [shared-oven]\n'
          : ctx.read(path),
    };
    expect(runRules(merged, ['R2']).findings).toEqual([]);
  });
});
