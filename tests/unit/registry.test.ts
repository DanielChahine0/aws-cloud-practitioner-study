import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { CONCEPTS_FILE, type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { parseGlossary, termForms } from '../../scripts/content/lib/glossary.ts';
import {
  applyResults,
  checkResult,
  namesFromGlossary,
  pendingFor,
  type RawConcept,
  REGISTRY_HEADER,
  RegistryResult,
  readConcepts,
  seedEntries,
  stringifyConcepts,
} from '../../scripts/content/lib/registry.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const HOME = 'm01/what-a-bakery-cloud-is';

/** The fixture tree with two extra tags on the lesson, one of them defined in the glossary, seeded into the registry. */
function seededFixture(): { ctx: Context; seeded: RawConcept[] } {
  const root = makeFixtureRoot();
  const lesson = readFileSync(join(root, LESSON), 'utf8');
  writeFileSync(
    join(root, LESSON),
    lesson.replace(
      '  - per-minute-rental\n',
      '  - per-minute-rental\n  - sourdough-starter\n  - rye-flour-blend\n',
    ),
  );
  appendFileSync(
    join(root, 'resources', 'glossary.md'),
    '- **Sourdough starter (levain)** ([Module 1, What a Bakery Cloud Is](01-baking-basics/01-what-a-bakery-cloud-is.md)): A live culture that leavens bread.\n',
  );
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  const names = namesFromGlossary(parseGlossary(ctx.read('resources/glossary.md') ?? ''));
  return { ctx, seeded: seedEntries(readConcepts(ctx.read(CONCEPTS_FILE)), ctx.notes, names) };
}

describe('parseGlossary and termForms', () => {
  it('reads every ref, even when a label holds parentheses, as a repo path', () => {
    const text = [
      '# Glossary',
      '',
      '## P',
      '',
      '- **Proofing cabinet (proofer)** ([Module 1, Ovens (and Racks) at Scale](01-baking-basics/02-ovens.md); [Module 2, Night Shifts](02-night-shifts/01-night-shifts.md)): A warm box where dough rises (slowly) before baking.',
    ].join('\n');
    expect(parseGlossary(text)).toEqual([
      {
        id: 'proofing-cabinet-proofer',
        term: 'Proofing cabinet (proofer)',
        definition: 'A warm box where dough rises (slowly) before baking.',
        refs: [
          { label: 'Module 1, Ovens (and Racks) at Scale', path: 'resources/01-baking-basics/02-ovens.md' },
          { label: 'Module 2, Night Shifts', path: 'resources/02-night-shifts/01-night-shifts.md' },
        ],
      },
    ]);
  });

  it('splits X (Y) terms and drops forms shorter than 3 characters', () => {
    expect(termForms('Proofing cabinet (proofer)')).toEqual([
      'Proofing cabinet (proofer)',
      'Proofing cabinet',
      'proofer',
    ]);
    expect(termForms('Oven zone (OZ)')).toEqual(['Oven zone (OZ)', 'Oven zone']);
    expect(termForms('Shared kitchen')).toEqual(['Shared kitchen']);
  });
});

describe('seedEntries and pendingFor', () => {
  it('seeds each unregistered tag once, named from the glossary or in sentence case', () => {
    const { ctx, seeded } = seededFixture();
    expect(seeded.map((c) => c.id)).toEqual([
      'shared-kitchen',
      'per-minute-rental',
      'sourdough-starter',
      'rye-flour-blend',
    ]);
    expect(seeded.slice(2)).toEqual([
      { id: 'sourdough-starter', name: 'Sourdough starter', home: HOME, anchor: '' },
      { id: 'rye-flour-blend', name: 'Rye flour blend', home: HOME, anchor: '' },
    ]);
    expect(seedEntries(seeded, ctx.notes, new Map())).toEqual(seeded);
  });

  it('lists the pending entries of a module with the notes that list each tag', () => {
    const { ctx, seeded } = seededFixture();
    expect(pendingFor(1, seeded, ctx.notes)).toEqual([
      { id: 'sourdough-starter', name: 'Sourdough starter', home: HOME, listedIn: [HOME] },
      { id: 'rye-flour-blend', name: 'Rye flour blend', home: HOME, listedIn: [HOME] },
    ]);
    expect(pendingFor(2, seeded, ctx.notes)).toEqual([]);
  });
});

describe('stringifyConcepts', () => {
  it('writes a header, a fixed key order and flow-style lists that parse back to the same entries', () => {
    const entries: RawConcept[] = [
      {
        aliases: ['shared-oven'],
        confusableWith: ['per-minute-rental'],
        tasks: ['1.1', '3.3'],
        anchor: 'shared-kitchen',
        home: HOME,
        name: 'Shared kitchen',
        id: 'shared-kitchen',
      },
      { id: 'bakery-mascot', name: 'Bakery mascot: Crumb', home: HOME, anchor: '', tasks: [], tested: false },
    ];
    const text = stringifyConcepts(entries);
    expect(text.split('\n')[0]).toBe(REGISTRY_HEADER);
    expect(parseYaml(text)).toEqual(entries);
    expect(Object.keys(parseYaml(text)[0])).toEqual([
      'id',
      'name',
      'home',
      'anchor',
      'tasks',
      'confusableWith',
      'aliases',
    ]);
    expect(text).toMatch(/^ +tasks: \[.*"1\.1".*\]$/m);
    expect(readConcepts(text)).toEqual(entries);
  });

  it('reads no file or a blank file as an empty registry, and rejects anything but a list', () => {
    expect(readConcepts(null)).toEqual([]);
    expect(readConcepts(`${REGISTRY_HEADER}\n`)).toEqual([]);
    expect(() => readConcepts('id: shared-kitchen\n')).toThrow('must be a YAML list');
  });
});

describe('checkResult', () => {
  const filled = { name: 'Sourdough starter', home: HOME, anchor: 'shared-kitchen', tasks: ['1.1'] };

  it('accepts a result that fills every pending entry of its module', () => {
    const { ctx, seeded } = seededFixture();
    const result = RegistryResult.parse({
      module: 1,
      concepts: [
        { id: 'sourdough-starter', ...filled, confusableWith: ['shared-kitchen'] },
        {
          id: 'rye-flour-blend',
          name: 'Rye flour blend',
          home: HOME,
          anchor: 'paying-by-the-minute',
          tasks: [],
          tested: false,
        },
      ],
      aliases: [{ alias: 'rye-flour-blend', of: 'sourdough-starter', reason: 'Both name the same culture.' }],
    });
    expect(checkResult(result, seeded, ctx.notes)).toEqual([]);
  });

  it('reports a wrong anchor, a home outside listedIn, and a missing or extra entry', () => {
    const { ctx, seeded } = seededFixture();
    const result = RegistryResult.parse({
      module: 1,
      concepts: [
        { id: 'sourdough-starter', ...filled, anchor: 'objectives' },
        { id: 'shared-kitchen', ...filled, name: 'Shared kitchen', home: 'm01/nowhere' },
      ],
    });
    expect(checkResult(result, seeded, ctx.notes)).toEqual([
      'rye-flour-blend is pending for module 1 but missing from the result',
      'shared-kitchen is not pending for module 1',
      "[sourdough-starter] anchor 'objectives' is not an H3 under ## Notes in m01/what-a-bakery-cloud-is",
      '[shared-kitchen] home m01/nowhere is not one of the notes that list it: m01/what-a-bakery-cloud-is',
    ]);
  });

  it('reports an unknown id in the alias-only result', () => {
    const { ctx, seeded } = seededFixture();
    const result = RegistryResult.parse({
      concepts: [],
      aliases: [{ alias: 'rye-bread', of: 'shared-kitchen', reason: 'x' }],
    });
    expect(checkResult(result, seeded, ctx.notes)).toEqual([
      "alias rye-bread of shared-kitchen: 'rye-bread' is not a registered concept",
    ]);
  });
});

describe('applyResults', () => {
  const entry = (id: string, extra: Partial<RawConcept> = {}): RawConcept => ({
    id,
    name: id,
    home: HOME,
    anchor: 'shared-kitchen',
    tasks: ['1.1'],
    ...extra,
  });

  it('fills an entry in place and keeps its aliases', () => {
    const entries = [
      entry('a'),
      { id: 'b', name: 'B', home: HOME, anchor: '', aliases: ['old-b'] },
      entry('c'),
    ];
    const result = RegistryResult.parse({
      module: 1,
      concepts: [
        {
          id: 'b',
          name: 'Bee',
          home: HOME,
          anchor: 'paying-by-the-minute',
          tasks: [],
          tested: false,
          confusableWith: [],
        },
      ],
    });
    expect(applyResults(entries, [result]).entries).toEqual([
      entry('a'),
      {
        id: 'b',
        name: 'Bee',
        home: HOME,
        anchor: 'paying-by-the-minute',
        tasks: [],
        tested: false,
        aliases: ['old-b'],
      },
      entry('c'),
    ]);
    const unknown = RegistryResult.parse({ concepts: [entry('zz')] });
    expect(() => applyResults(entries, [unknown])).toThrow('zz is not in content/concepts.yaml');
  });

  it('merges an alias chain a into b into c and rewrites the confusables that pointed at them', () => {
    const entries = [
      entry('a'),
      entry('b'),
      entry('c', { confusableWith: ['a'] }),
      entry('d', { confusableWith: ['a', 'b'] }),
    ];
    const result = RegistryResult.parse({
      concepts: [],
      aliases: [
        { alias: 'a', of: 'b', reason: 'same idea' },
        { alias: 'b', of: 'c', reason: 'same idea again' },
        { alias: 'a', of: 'c', reason: 'already merged' },
      ],
    });
    expect(applyResults(entries, [result])).toEqual({
      entries: [entry('c', { aliases: ['b', 'a'] }), entry('d', { confusableWith: ['c'] })],
      log: ['a is now an alias of b: same idea', 'b is now an alias of c: same idea again'],
    });
  });
});
