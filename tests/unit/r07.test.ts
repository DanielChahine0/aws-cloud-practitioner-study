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

  it('masks titles, so a line built from course titles is never a copied run', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', '01-baking-basics', '01-what-a-bakery-cloud-is.md'),
      '\n- Module 1: Baking Basics, Section Getting Started, Lesson 1: What a Bakery Cloud Is.\n',
    );
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(runRules(ctx, ['R7']).findings).toEqual([]);
    // The same line without masking copies a run, so the empty result above comes from the masking.
    const unmasked = runRules({ ...ctx, allow: [['no', 'such', 'phrase']] }, ['R7']).findings;
    expect(unmasked.map((f) => f.message.split(' from')[0])).toEqual([
      'copies a 14-word run',
      '9.4% of its 6-word sequences come',
    ]);
  });
});
