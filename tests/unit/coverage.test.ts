import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import {
  blueprintTerms,
  conceptsMdDrift,
  coverage,
  missingTerms,
  phraseIn,
  resourcesText,
} from '../../scripts/content/lib/coverage.ts';
import { homed, needsDani, report } from '../../scripts/content/lib/report.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { matchQuestion, multiQuestion, singleQuestion, writeQuestions } from '../fixtures/questions.ts';

const BLUEPRINT = 'content/exam/blueprint.yaml';
const load = (root: string) => loadContext(root, { today: FIXTURE_TODAY });

function withTerms(): string {
  const root = makeFixtureRoot();
  replaceIn(
    root,
    BLUEPRINT,
    'text: Fixture task statement 1.1, terms: []',
    'text: Fixture task statement 1.1, terms: ["Shared kitchen", "speed of baking", { term: "oven pool", coveredBy: shared-kitchen }]',
  );
  return root;
}

describe('phraseIn', () => {
  it('matches across a line break and Markdown emphasis, in any case', () => {
    const text = resourcesText(load(makeFixtureRoot()));
    expect(phraseIn(text, 'Central  KITCHEN')).toBe(true);
    expect(
      phraseIn('the **shared\nkitchen** idea'.replace(/[*]/g, ' ').replace(/\s+/g, ' '), 'shared kitchen'),
    ).toBe(true);
  });

  it('never matches inside a longer word', () => {
    expect(phraseIn('aws wafv2 rules', 'AWS WAF')).toBe(false);
    expect(phraseIn('aws waf rules', 'AWS WAF')).toBe(true);
    expect(phraseIn('aws business support+ plan', 'AWS Business Support+')).toBe(true);
  });
});

describe('blueprint terms', () => {
  it('finds a term in the notes, maps a coveredBy term, and lists the rest as missing', () => {
    const ctx = load(withTerms());
    expect(blueprintTerms(ctx).filter((t) => t.task === '1.1')).toEqual([
      { task: '1.1', term: 'Shared kitchen', found: true, coveredBy: null },
      { task: '1.1', term: 'speed of baking', found: false, coveredBy: null },
      { task: '1.1', term: 'oven pool', found: false, coveredBy: 'shared-kitchen' },
    ]);
    expect(missingTerms(ctx).map((t) => t.term)).toEqual(['speed of baking']);
  });

  it('counts concepts, live questions and missing terms by task', () => {
    const root = withTerms();
    writeQuestions(root, [
      singleQuestion({ status: 'live' }),
      multiQuestion(),
      matchQuestion({ status: 'live' }),
    ]);
    const rows = coverage(load(root));
    expect(rows.find((r) => r.task === '1.1')).toEqual({
      task: '1.1',
      text: 'Fixture task statement 1.1',
      concepts: 1,
      live: 1,
      exam: 0,
      missing: ['speed of baking'],
    });
    expect(rows.find((r) => r.task === '4.1')?.live).toBe(1);
    expect(rows).toHaveLength(19);
  });
});

describe('conceptsMdDrift', () => {
  it('lists tags on one side only', () => {
    const root = makeFixtureRoot();
    expect(conceptsMdDrift(load(root))).toEqual([]);
    replaceIn(root, 'resources/concepts.md', '- `per-minute-rental`', '- `per-hour-rental`');
    expect(conceptsMdDrift(load(root))).toEqual([
      'in concepts.md only: per-hour-rental',
      'in frontmatter only: per-minute-rental',
    ]);
  });
});

describe('report', () => {
  it('counts the fixture tree and prints a style line for its module', () => {
    const root = makeFixtureRoot();
    writeQuestions(root, [singleQuestion({ status: 'live' }), multiQuestion(), matchQuestion()]);
    expect(report(load(root))).toEqual([
      'modules 1, lessons 1, glossary terms 1, concepts 2 (2 tested)',
      'questions: 2 draft, 1 live, 0 retired; live single 1, multi 0, match 0',
      'm01: 3 practice (single 1, multi 1, match 1); correct option longest in 0 of 1 singles (0%); negative stems 0 (0%)',
      'concepts.md drift: 0',
    ]);
  });

  it('lists the drafts that need Dani', () => {
    const root = makeFixtureRoot();
    expect(needsDani(load(root))).toEqual(['none']);
    writeQuestions(root, [
      singleQuestion({ review: { attempts: 3, lastFailure: 'critic: a tell' } }),
      matchQuestion({ review: { attempts: 2, lastFailure: 'critic: a tell' } }),
    ]);
    expect(needsDani(load(root))).toEqual(['q-7k2m9p m01/what-a-bakery-cloud-is attempts 3: critic: a tell']);
  });

  it('describes the concepts homed in a note for the question writers', () => {
    const root = makeFixtureRoot();
    expect(homed(load(root), 'm01/what-a-bakery-cloud-is')).toEqual({
      note: 'm01/what-a-bakery-cloud-is',
      title: 'What a Bakery Cloud Is',
      concepts: [
        {
          id: 'shared-kitchen',
          name: 'Shared kitchen',
          anchor: 'shared-kitchen',
          tasks: [{ id: '1.1', text: 'Fixture task statement 1.1' }],
          confusableWith: [],
        },
        {
          id: 'per-minute-rental',
          name: 'Per-minute rental',
          anchor: 'paying-by-the-minute',
          tasks: [{ id: '4.1', text: 'Fixture task statement 4.1' }],
          confusableWith: ['shared-kitchen'],
        },
      ],
      existing: 2,
    });
    writeFileSync(join(root, 'content/concepts.yaml'), '[]\n');
    expect(() => homed(load(root), 'm01/nowhere')).toThrow('m01/nowhere is not a lesson note');
  });
});
