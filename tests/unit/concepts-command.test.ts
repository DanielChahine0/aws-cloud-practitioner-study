import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runConcepts, USAGE } from '../../scripts/content/lib/concepts-command.ts';
import { CONCEPTS_FILE } from '../../scripts/content/lib/context.ts';
import { makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const HOME = 'm01/what-a-bakery-cloud-is';

/** The fixture tree with one extra tag on its lesson, seeded by the command, and an empty results directory. */
function seededRoot(): { root: string; results: string } {
  const root = makeFixtureRoot();
  replaceIn(root, LESSON, '  - per-minute-rental\n', '  - per-minute-rental\n  - sourdough-starter\n');
  expect(runConcepts(root, ['--seed'])).toEqual({
    code: 0,
    out: ['1 seeded, 3 in the registry'],
    err: [],
  });
  const results = join(root, '.results', 'registry');
  mkdirSync(results, { recursive: true });
  return { root, results };
}

const GOOD = {
  module: 1,
  concepts: [
    {
      id: 'sourdough-starter',
      name: 'Sourdough starter',
      home: HOME,
      anchor: 'shared-kitchen',
      tasks: ['1.1'],
    },
  ],
  aliases: [],
};

describe('pnpm content:concepts', () => {
  it('lists the pending entries of a module as JSON', () => {
    const { root } = seededRoot();
    const { code, out } = runConcepts(root, ['--pending', '01']);
    expect(code).toBe(0);
    expect(JSON.parse(out.join('\n'))).toEqual({
      module: 1,
      entries: [{ id: 'sourdough-starter', name: 'Sourdough starter', home: HOME, listedIn: [HOME] }],
    });
  });

  it('checks one result file and says OK only when it applies cleanly', () => {
    const { root, results } = seededRoot();
    const file = join(results, 'm01.json');
    writeFileSync(file, JSON.stringify(GOOD));
    expect(runConcepts(root, ['--check', file])).toEqual({
      code: 0,
      out: [`OK ${file}: 1 concepts, 0 aliases`],
      err: [],
    });
    writeFileSync(file, JSON.stringify({ ...GOOD, concepts: [] }));
    expect(runConcepts(root, ['--check', file])).toEqual({
      code: 1,
      out: [],
      err: [`${file}: sourdough-starter is pending for module 1 but missing from the result`],
    });
  });

  it('checks every result before it writes anything, then applies them all', () => {
    const { root, results } = seededRoot();
    const before = readFileSync(join(root, CONCEPTS_FILE), 'utf8');
    writeFileSync(join(results, 'm01.json'), JSON.stringify(GOOD));
    writeFileSync(join(results, 'm02.json'), JSON.stringify({ module: 2, concepts: [], aliases: 'none' }));
    expect(runConcepts(root, ['--apply', results])).toEqual({
      code: 1,
      out: [],
      err: [`${join(results, 'm02.json')}: aliases: Invalid input: expected array, received string`],
    });
    expect(readFileSync(join(root, CONCEPTS_FILE), 'utf8')).toBe(before);

    writeFileSync(join(results, 'm02.json'), JSON.stringify({ module: 2, concepts: [], aliases: [] }));
    expect(runConcepts(root, ['--apply', results])).toEqual({
      code: 0,
      out: ['2 results: 1 concepts filled, 0 aliases merged, 3 in the registry'],
      err: [],
    });
    expect(readFileSync(join(root, CONCEPTS_FILE), 'utf8')).toContain(
      '- id: sourdough-starter\n  name: Sourdough starter\n  home: m01/what-a-bakery-cloud-is\n  anchor: shared-kitchen\n  tasks: [ "1.1" ]\n',
    );
  });

  it('reports a hand-edited entry without a home as a message, not a crash', () => {
    const { root } = seededRoot();
    replaceIn(root, CONCEPTS_FILE, '  home: m01/what-a-bakery-cloud-is\n  anchor: ""\n', '  anchor: ""\n');
    expect(runConcepts(root, ['--pending', '1'])).toEqual({
      code: 1,
      out: [],
      err: [
        'content/concepts.yaml: entry 3 (sourdough-starter): home: Invalid input: expected string, received undefined',
      ],
    });
  });

  it('prints its usage for an unknown mode or a module outside 1 to 13', () => {
    const root = makeFixtureRoot();
    expect(runConcepts(root, ['--pending', '14'])).toEqual({ code: 1, out: [], err: [USAGE] });
    expect(runConcepts(root, [])).toEqual({ code: 1, out: [], err: [USAGE] });
  });
});
