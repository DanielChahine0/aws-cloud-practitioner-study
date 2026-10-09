import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

describe('R7 originality', () => {
  it('checks shared files against the course too', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', 'glossary.md'),
      '- **Proofing cabinet** ([Module 1, What a Bakery Cloud Is](01-baking-basics/01-what-a-bakery-cloud-is.md)): Bakers rent proofing cabinets by the minute and hand them back once the dough has risen.\n',
    );
    const findings = runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R7']).findings;
    expect(findings.map((f) => f.file)).toContain('resources/glossary.md');
    expect(findings.some((f) => f.message.startsWith('copies a 16-word run'))).toBe(true);
  });

  it('masks titles, so a lesson title is never a copied run', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', '01-baking-basics', '01-what-a-bakery-cloud-is.md'),
      '\n- What a Bakery Cloud Is, Module 1: Baking Basics, and What a Bakery Cloud Is again.\n',
    );
    expect(runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R7']).findings).toEqual([]);
  });
});
