import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

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

  it('reports a module README section that is missing', () => {
    const root = makeFixtureRoot();
    replaceIn(
      root,
      'resources/01-baking-basics/README.md',
      '## Summary\n\nBorrowing beats buying for bursty baking.\n\n',
      '',
    );
    expect(runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R8']).findings).toEqual([
      { rule: 'R8', file: 'resources/01-baking-basics/README.md', message: "missing section '## Summary'" },
    ]);
  });

  it('exempts tests/content/bad/ and checks the same text anywhere else', () => {
    const root = makeFixtureRoot();
    const text = 'Two sentences. On one line \u2014 with an em dash.\n';
    mkdirSync(join(root, 'tests', 'content', 'bad'), { recursive: true });
    writeFileSync(join(root, 'tests', 'content', 'bad', 'r08-x.md'), text);
    writeFileSync(join(root, 'tests', 'content', 'x.md'), text);
    expect(
      runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R8']).findings.map(
        (f) => `${f.file}:${f.line}`,
      ),
    ).toEqual(['tests/content/x.md:1', 'tests/content/x.md:1']);
  });
});
