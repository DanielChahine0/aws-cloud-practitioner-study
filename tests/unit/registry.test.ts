import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const OVENS = 'm01/ovens';
const NIGHT = 'm02/night-shifts';

/** A minimal lesson note listing the given tags, with one H3 under ## Notes. */
const lessonNote = (module: number, lesson: number, slug: string, tags: readonly string[]): string =>
  [
    '---',
    `module: ${module}`,
    `lesson: ${lesson}`,
    `slug: ${slug}`,
    `title: "${slug}"`,
    `source: "Fixture course, Module ${module}, lesson: ${slug}"`,
    'concepts:',
    ...tags.map((tag) => `  - ${tag}`),
    '---',
    '',
    `# ${slug}`,
    '',
    '## Notes',
    '',
    '### Feeding the starter',
    '',
    '- The starter is fed before the shift ends.',
    '',
  ].join('\n');

/**
 * The fixture tree with three extra tags seeded into the registry: the first lesson lists two of them,
 * a later lesson of module 1 and a lesson of module 2 list them again, and the module 2 lesson adds one of its own.
 * Only one tag is in the glossary, under a form that sentence case would not produce.
 */
function seededFixture(): {
  ctx: Context;
  existing: RawConcept[];
  names: Map<string, string>;
  seeded: RawConcept[];
} {
  const root = makeFixtureRoot();
  const lesson = readFileSync(join(root, LESSON), 'utf8');
  writeFileSync(
    join(root, LESSON),
    lesson.replace(
      '  - per-minute-rental\n',
      '  - per-minute-rental\n  - sourdough-starter\n  - rye-flour-blend\n',
    ),
  );
  writeFileSync(
    join(root, 'resources', '01-baking-basics', '02-ovens.md'),
    lessonNote(1, 2, 'ovens', ['rye-flour-blend']),
  );
  mkdirSync(join(root, 'resources', '02-night-shifts'));
  writeFileSync(
    join(root, 'resources', '02-night-shifts', '01-night-shifts.md'),
    lessonNote(2, 1, 'night-shifts', ['sourdough-starter', 'overnight-proof']),
  );
  appendFileSync(
    join(root, 'resources', 'glossary.md'),
    '- **Sourdough Starter (levain)** ([Module 1, What a Bakery Cloud Is](01-baking-basics/01-what-a-bakery-cloud-is.md)): A live culture that leavens bread.\n',
  );
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  const names = namesFromGlossary(parseGlossary(ctx.read('resources/glossary.md') ?? ''));
  const existing = readConcepts(ctx.read(CONCEPTS_FILE));
  return { ctx, existing, names, seeded: seedEntries(existing, ctx.notes, names) };
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
  it('seeds each unregistered tag once, homed at the first lesson that lists it, named from the glossary or in sentence case', () => {
    const { ctx, existing, names, seeded } = seededFixture();
    expect(seeded.map((c) => c.id)).toEqual([
      'shared-kitchen',
      'per-minute-rental',
      'sourdough-starter',
      'rye-flour-blend',
      'overnight-proof',
    ]);
    expect(seeded.slice(2)).toEqual([
      { id: 'sourdough-starter', name: 'Sourdough Starter', home: HOME, anchor: '' },
      { id: 'rye-flour-blend', name: 'Rye flour blend', home: HOME, anchor: '' },
      { id: 'overnight-proof', name: 'Overnight proof', home: NIGHT, anchor: '' },
    ]);
    expect(seedEntries(existing, [...ctx.notes].reverse(), names)).toEqual(seeded);
    expect(seedEntries(seeded, ctx.notes, new Map())).toEqual(seeded);
  });

  it('lists the pending entries of a module with every note that lists each tag', () => {
    const { ctx, seeded } = seededFixture();
    expect(pendingFor(1, seeded, ctx.notes)).toEqual([
      { id: 'sourdough-starter', name: 'Sourdough Starter', home: HOME, listedIn: [HOME, NIGHT] },
      { id: 'rye-flour-blend', name: 'Rye flour blend', home: HOME, listedIn: [HOME, OVENS] },
    ]);
    expect(pendingFor(2, seeded, ctx.notes)).toEqual([
      { id: 'overnight-proof', name: 'Overnight proof', home: NIGHT, listedIn: [NIGHT] },
    ]);
    expect(pendingFor(3, seeded, ctx.notes)).toEqual([]);
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

  it('rejects every entry that lacks a field the tools rely on, naming the entry and the field', () => {
    const text = [
      '- id: shared-kitchen',
      '  name: Shared kitchen',
      '  anchor: ""',
      '- name: No id',
      '  home: m01/what-a-bakery-cloud-is',
      '  anchor: ""',
      '- { id: rye, name: Rye, home: m01/what-a-bakery-cloud-is, anchor: "", confusableWith: shared-kitchen }',
      '- 7',
    ].join('\n');
    expect(() => readConcepts(text)).toThrow(
      [
        'content/concepts.yaml: entry 1 (shared-kitchen): home: Invalid input: expected string, received undefined',
        'content/concepts.yaml: entry 2: id: Invalid input: expected string, received undefined',
        'content/concepts.yaml: entry 3 (rye): confusableWith: Invalid input: expected array, received string',
        'content/concepts.yaml: entry 4: Invalid input: expected object, received number',
      ].join('\n'),
    );
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

  it('reports a repeated entry, a tested concept without tasks, a bad confusable and a self alias', () => {
    const { ctx, seeded } = seededFixture();
    const result = RegistryResult.parse({
      module: 1,
      concepts: [
        { id: 'sourdough-starter', ...filled, confusableWith: ['sourdough-starter', 'rye-bread'] },
        { id: 'rye-flour-blend', ...filled, name: 'Rye flour blend', tasks: [] },
        { id: 'rye-flour-blend', ...filled, name: 'Rye flour blend' },
      ],
      aliases: [{ alias: 'shared-kitchen', of: 'shared-kitchen', reason: 'x' }],
    });
    expect(checkResult(result, seeded, ctx.notes)).toEqual([
      'rye-flour-blend appears 2 times',
      "[sourdough-starter] confusableWith 'sourdough-starter' is not another registered concept",
      "[sourdough-starter] confusableWith 'rye-bread' is not another registered concept",
      '[rye-flour-blend] a tested concept needs 1 to 3 tasks',
      'alias shared-kitchen points at itself',
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

  it('merges an alias chain a into b into c, keeps the merged confusables and rewrites those that pointed at them', () => {
    const entries = [
      entry('a', { confusableWith: ['e'] }),
      entry('b'),
      entry('c', { confusableWith: ['a'] }),
      entry('d', { confusableWith: ['a', 'b'] }),
      entry('e'),
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
      entries: [
        entry('c', { aliases: ['b', 'a'], confusableWith: ['e'] }),
        entry('d', { confusableWith: ['c'] }),
        entry('e'),
      ],
      log: ['a is now an alias of b: same idea', 'b is now an alias of c: same idea again'],
      merged: 2,
    });
  });

  it('keeps at most 3 confusables after a merge and logs the ones it drops', () => {
    const entries = [
      entry('a', { confusableWith: ['x', 'y'] }),
      entry('b', { confusableWith: ['w', 'z'] }),
      ...['w', 'x', 'y', 'z'].map((id) => entry(id)),
    ];
    const result = RegistryResult.parse({
      concepts: [],
      aliases: [{ alias: 'a', of: 'b', reason: 'same idea' }],
    });
    expect(applyResults(entries, [result])).toEqual({
      entries: [
        entry('b', { aliases: ['a'], confusableWith: ['w', 'z', 'x'] }),
        ...['w', 'x', 'y', 'z'].map((id) => entry(id)),
      ],
      log: ['a is now an alias of b: same idea', 'b keeps 3 confusables and drops y'],
      merged: 1,
    });
  });
});
