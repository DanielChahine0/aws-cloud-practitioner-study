import { copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const CONCEPTS = 'content/concepts.yaml';

function withHead(headConcepts: string, edit: (root: string) => void = () => {}): Context {
  const root = makeFixtureRoot();
  edit(root);
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  return { ...ctx, head: (path) => (path === 'content/concepts.yaml' ? headConcepts : null) };
}

describe('R2 against HEAD', () => {
  it('reports a concept id that HEAD has and the working tree lost', () => {
    const findings = runRules(withHead('- id: rye-bread\n  name: Rye\n- id: shared-kitchen\n'), [
      'R2',
    ]).findings;
    expect(findings.map((f) => f.message)).toEqual([
      "concept id 'rye-bread' exists in HEAD but is gone; keep it as an alias of the concept that replaced it, or name it in splitFrom on each concept split from it",
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

  it('accepts an old id that every new concept names in splitFrom (spec 2.4)', () => {
    const split = (root: string): void => {
      for (const id of ['shared-kitchen', 'per-minute-rental'])
        replaceIn(root, CONCEPTS, `- id: ${id}\n`, `- id: ${id}\n  splitFrom: kitchen-and-billing\n`);
    };
    const ctx = withHead('- id: kitchen-and-billing\n', split);
    expect(ctx.concepts.map((c) => c.splitFrom)).toEqual(['kitchen-and-billing', 'kitchen-and-billing']);
    expect(runRules(ctx, ['R1', 'R2']).findings).toEqual([]);
  });

  it('leaves a working-tree registry that does not parse to R1 instead of reporting every HEAD id', () => {
    const ctx = withHead('- id: per-minute-rental\n- id: shared-kitchen\n', (root) =>
      writeFileSync(join(root, CONCEPTS), '- id: shared-kitchen\n  name: [unclosed\n'),
    );
    expect(runRules(ctx, ['R1', 'R2']).findings.map((f) => `${f.rule} ${f.message.split(':')[0]}`)).toEqual([
      'R1 YAML',
    ]);
  });
});

describe('R2 uniqueness', () => {
  const r02 = (edit: (root: string) => void): string[] => {
    const root = makeFixtureRoot();
    edit(root);
    return runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R2']).findings.map((f) => f.message);
  };

  it('reports an alias that repeats a concept id, its own id, or another alias', () => {
    expect(
      r02((root) =>
        replaceIn(root, CONCEPTS, '  confusableWith: [shared-kitchen]\n', '  aliases: [shared-kitchen]\n'),
      ),
    ).toEqual([
      "id 'shared-kitchen' (alias of per-minute-rental) is already used by concept in content/concepts.yaml",
    ]);
    expect(
      r02((root) =>
        replaceIn(root, CONCEPTS, '  tasks: ["4.1"]\n', '  tasks: ["4.1"]\n  aliases: [per-minute-rental]\n'),
      ),
    ).toEqual([
      "id 'per-minute-rental' (alias of per-minute-rental) is already used by concept in content/concepts.yaml",
    ]);
    expect(
      r02((root) => {
        replaceIn(root, CONCEPTS, '  tasks: ["1.1"]\n', '  tasks: ["1.1"]\n  aliases: [oven]\n');
        replaceIn(root, CONCEPTS, '  tasks: ["4.1"]\n', '  tasks: ["4.1"]\n  aliases: [oven]\n');
      }),
    ).toEqual([
      "id 'oven' (alias of per-minute-rental) is already used by alias of shared-kitchen in content/concepts.yaml",
    ]);
  });

  it('reports two missions with one id', () => {
    expect(
      r02((root) =>
        copyFileSync(
          join(root, 'content/missions/mission-00-guardrails.md'),
          join(root, 'content/missions/mission-00-budget.md'),
        ),
      ),
    ).toEqual([
      "id 'mission-00' (mission) is already used by mission in content/missions/mission-00-budget.md",
    ]);
  });
});
