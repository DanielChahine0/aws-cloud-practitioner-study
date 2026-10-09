import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const CONCEPTS = 'content/concepts.yaml';

function r06(edit: (root: string) => void): string[] {
  const root = makeFixtureRoot();
  edit(root);
  return runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R6']).findings.map((f) => f.message);
}

const replaceIn = (root: string, file: string, from: string, to: string): void => {
  const text = readFileSync(join(root, file), 'utf8');
  if (!text.includes(from)) throw new Error(`${file} does not contain ${from}`);
  writeFileSync(join(root, file), text.replace(from, to));
};

describe('R6 references', () => {
  it('reports a broken relative link', () => {
    expect(
      r06((root) => replaceIn(root, LESSON, 'dough proofs.', 'dough proofs, see [later](02-missing.md).')),
    ).toEqual(['broken link 02-missing.md']);
  });

  it('reports an anchor that is not an H3 under ## Notes', () => {
    expect(r06((root) => replaceIn(root, CONCEPTS, 'anchor: shared-kitchen', 'anchor: objectives'))).toEqual([
      "[shared-kitchen] anchor 'objectives' is not an H3 under ## Notes in m01/what-a-bakery-cloud-is",
    ]);
  });

  it('reports a home note that does not list the concept, and a missing home note', () => {
    expect(r06((root) => replaceIn(root, LESSON, '  - shared-kitchen\n', ''))).toEqual([
      '[shared-kitchen] home note m01/what-a-bakery-cloud-is does not list it in concepts',
    ]);
    expect(
      r06((root) =>
        replaceIn(
          root,
          CONCEPTS,
          'home: m01/what-a-bakery-cloud-is\n  anchor: shared-kitchen',
          'home: m01/nowhere\n  anchor: shared-kitchen',
        ),
      ),
    ).toEqual(['[shared-kitchen] home note m01/nowhere does not exist']);
  });

  it('reports frontmatter that disagrees with the file path', () => {
    expect(
      r06((root) => replaceIn(root, LESSON, 'slug: what-a-bakery-cloud-is', 'slug: bakery-cloud')),
    ).toEqual(["frontmatter slug 'bakery-cloud' does not match the file name"]);
  });

  it('reports a confusable that is not another registered concept', () => {
    expect(
      r06((root) =>
        replaceIn(
          root,
          CONCEPTS,
          'confusableWith: [shared-kitchen]',
          'confusableWith: [per-minute-rental, rye-bread]',
        ),
      ),
    ).toEqual([
      "[per-minute-rental] confusableWith 'per-minute-rental' is not another registered concept",
      "[per-minute-rental] confusableWith 'rye-bread' is not another registered concept",
    ]);
  });
});
