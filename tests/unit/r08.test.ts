import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';

describe('R8 Markdown style', () => {
  it('reports missing keys, unknown sections, sections out of order and two sentences on a line', () => {
    const root = makeFixtureRoot();
    writeFileSync(
      join(root, LESSON),
      [
        '---',
        'module: 1',
        'lesson: 1',
        'slug: what-a-bakery-cloud-is',
        'title: "What a Bakery Cloud Is"',
        'concepts: [shared-kitchen, per-minute-rental]',
        '---',
        '',
        '# What a Bakery Cloud Is',
        '',
        '## Notes',
        '',
        '### Shared kitchen',
        '',
        '- Ovens are shared. Branches borrow them.',
        '',
        '### Paying by the minute',
        '',
        '## Objectives',
        '',
        '## Key takeaways',
        '',
        '## Extra',
        '',
        '## Terms',
        '',
      ].join('\n'),
    );
    const messages = runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R8']).findings.map(
      (f) => `${f.line ?? '-'} ${f.message}`,
    );
    // runRules sorts by file, then line, and a finding without a line sorts first.
    expect(messages).toEqual([
      '- sections out of order: Notes, Objectives, Key takeaways, Terms',
      "1 frontmatter is missing 'source'",
      '15 more than one sentence on this line',
      "23 unexpected section '## Extra'",
    ]);
  });
});
