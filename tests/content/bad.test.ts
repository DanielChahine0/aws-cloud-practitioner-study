import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RuleId } from '../../schemas/validate-config.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { RULES, runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const BAD = fileURLToPath(new URL('./bad/', import.meta.url));
const fixtures = readdirSync(BAD)
  .filter((name) => /^r\d{2}-[a-z0-9-]+\.(?:yaml|md)$/.test(name))
  .sort();
const ruleOf = (name: string): RuleId => RuleId.parse(`R${Number(name.slice(1, 3))}`);

describe('the baseline fixture tree', () => {
  it('passes every implemented rule', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(
      runRules(
        ctx,
        RULES.map((r) => r.id),
      ).findings,
    ).toEqual([]);
  });
});

describe('bad fixtures', () => {
  it('cover every implemented rule', () => {
    expect([...new Set(fixtures.map(ruleOf))].sort()).toEqual(RULES.map((r) => r.id).sort());
  });

  it.each(fixtures)('%s fires its rule', (name) => {
    const [first = '', ...rest] = readFileSync(join(BAD, name), 'utf8').split('\n');
    const target = /fixture-target: (\S+)/.exec(first)?.[1];
    if (target === undefined) throw new Error(`${name}: the first line must name a fixture-target`);
    const root = makeFixtureRoot();
    mkdirSync(dirname(join(root, target)), { recursive: true });
    writeFileSync(join(root, target), rest.join('\n'));
    const rule = ruleOf(name);
    const { findings } = runRules(loadContext(root, { today: FIXTURE_TODAY }), [rule]);
    expect(findings.filter((f) => f.rule === rule).length).toBeGreaterThan(0);
  });
});
