import { rmSync, writeFileSync } from 'node:fs';
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
import {
  cellSpare,
  examTargets,
  homed,
  needsDani,
  report,
  targets,
} from '../../scripts/content/lib/report.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import {
  fixtureQuotas,
  matchQuestion,
  multiQuestion,
  POOL_FILE,
  QUESTION_FILE,
  singleQuestion,
  writePool,
  writeQuestions,
} from '../fixtures/questions.ts';

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
          live: 1,
          open: 1,
          need: 1,
        },
        {
          id: 'per-minute-rental',
          name: 'Per-minute rental',
          anchor: 'paying-by-the-minute',
          tasks: [{ id: '4.1', text: 'Fixture task statement 4.1' }],
          confusableWith: ['shared-kitchen'],
          live: 0,
          open: 1,
          need: 1,
        },
      ],
      existing: 2,
    });
    writeFileSync(join(root, 'content/concepts.yaml'), '[]\n');
    expect(() => homed(load(root), 'm01/nowhere')).toThrow('m01/nowhere is not a lesson note');
  });
});

describe('open questions per concept', () => {
  it('leaves a draft that needs Dani out of open, so the writer adds a fresh one', () => {
    const root = makeFixtureRoot();
    writeQuestions(root, [
      singleQuestion({ status: 'live' }),
      singleQuestion({ id: 'q-4j6k8m', review: { attempts: 3, lastFailure: 'critic: a tell' } }),
      matchQuestion({ concept: 'minute-rental' }),
      matchQuestion({ id: 'q-5m7n9p', review: { attempts: 2, lastFailure: 'critic: a tell' } }),
    ]);
    replaceIn(
      root,
      'content/concepts.yaml',
      'confusableWith: [shared-kitchen]',
      'confusableWith: [shared-kitchen]\n  aliases: [minute-rental]',
    );
    const { concepts } = homed(load(root), 'm01/what-a-bakery-cloud-is');
    expect(concepts.map(({ id, live, open, need }) => ({ id, live, open, need }))).toEqual([
      { id: 'shared-kitchen', live: 1, open: 1, need: 1 },
      { id: 'per-minute-rental', live: 0, open: 2, need: 0 },
    ]);
  });

  it('lists the notes whose concepts need questions, with the file to write and how many', () => {
    const root = makeFixtureRoot();
    expect(targets(load(root))).toEqual([
      { note: 'm01/what-a-bakery-cloud-is', file: QUESTION_FILE, need: 2 },
    ]);
    writeQuestions(root, [
      singleQuestion({ status: 'live' }),
      multiQuestion(),
      matchQuestion(),
      matchQuestion({ id: 'q-5m7n9p' }),
    ]);
    expect(targets(load(root))).toEqual([]);
  });

  it('points a note without questions at the file its path maps to', () => {
    const root = makeFixtureRoot();
    rmSync(join(root, QUESTION_FILE));
    expect(targets(load(root))).toEqual([
      {
        note: 'm01/what-a-bakery-cloud-is',
        file: 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml',
        need: 4,
      },
    ]);
  });
});

describe('exam-pool counts in the report (spec 2.6)', () => {
  const pool = [
    singleQuestion({ id: 'q-e00001', pool: 'exam', status: 'live' }),
    singleQuestion({ id: 'q-e00002', pool: 'exam' }),
    singleQuestion({
      id: 'q-e00003',
      pool: 'exam',
      review: { attempts: 3, lastFailure: 'critic: made-up reason' },
    }),
    singleQuestion({ id: 'q-e00004', pool: 'exam', status: 'retired' }),
    multiQuestion({ id: 'q-e00005', pool: 'exam', status: 'retired' }),
  ];

  it('leaves exam items out of the practice lines and prints a counts-only exam line', () => {
    const root = makeFixtureRoot();
    writeQuestions(root, [singleQuestion({ status: 'live' }), multiQuestion(), matchQuestion()]);
    writePool(root, pool);
    expect(report(load(root))).toEqual([
      'modules 1, lessons 1, glossary terms 1, concepts 2 (2 tested)',
      'questions: 2 draft, 1 live, 0 retired; live single 1, multi 0, match 0',
      'm01: 3 practice (single 1, multi 1, match 1); correct option longest in 0 of 1 singles (0%); negative stems 0 (0%)',
      'm01 exam: 3 (single 3, multi 0); correct option longest in 0 of 3 singles (0%); negative stems 0 (0%)',
      'concepts.md drift: 0',
    ]);
  });

  it('gives a cell one spare item per started ten of its target, never below one', () => {
    expect([1, 2, 10, 11, 20, 21].map(cellSpare)).toEqual([1, 1, 1, 2, 2, 3]);
  });

  it('gives each cell and multi-response share its spare, open, need and liveNeed', () => {
    const root = makeFixtureRoot();
    writePool(root, pool);
    expect(examTargets({ ...load(root), quotas: fixtureQuotas() })).toEqual([
      {
        module: 1,
        file: POOL_FILE,
        cells: [
          { task: '1.1', target: 2, spare: 1, live: 1, open: 2, need: 1, liveNeed: 1 },
          { task: '4.1', target: 1, spare: 1, live: 0, open: 0, need: 2, liveNeed: 1 },
        ],
        multi: [{ domain: '1', target: 1, spare: 1, live: 0, open: 0, need: 2, liveNeed: 1 }],
        concepts: [
          { id: 'shared-kitchen', note: 'm01/what-a-bakery-cloud-is', tasks: ['1.1'], open: 2 },
          { id: 'per-minute-rental', note: 'm01/what-a-bakery-cloud-is', tasks: ['4.1'], open: 0 },
        ],
      },
    ]);
  });

  it('names the pool file a module would get, and needs quotas.yaml', () => {
    const root = makeFixtureRoot();
    expect(examTargets({ ...load(root), quotas: fixtureQuotas() }).map((t) => t.file)).toEqual([
      'content/exam/pool/01-baking-basics.yaml',
    ]);
    expect(() => examTargets(load(root))).toThrow(
      'content/exam/quotas.yaml is missing; run pnpm content:quotas',
    );
  });

  it('keeps homed and targets on practice files when a pool file exists', () => {
    const root = makeFixtureRoot();
    const before = homed(load(root), 'm01/what-a-bakery-cloud-is').existing;
    writePool(root, pool);
    expect(homed(load(root), 'm01/what-a-bakery-cloud-is').existing).toBe(before);
    expect(targets(load(root))).toEqual([
      { note: 'm01/what-a-bakery-cloud-is', file: QUESTION_FILE, need: 2 },
    ]);
  });
});
