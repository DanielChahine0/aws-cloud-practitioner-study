import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { hash12 } from '../../scripts/content/lib/hashes.ts';
import { BRIEF_FILE, keyPointHash, projectOf } from '../../scripts/content/lib/project.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const KEY_POINTS = 'content/project/key-points/01-baking-basics.yaml';

function project(edit?: (root: string) => void) {
  const root = makeFixtureRoot();
  edit?.(root);
  return projectOf(loadContext(root, { today: FIXTURE_TODAY }));
}
const errors = (edit: (root: string) => void): string[] =>
  project(edit).errors.map((f) => `${f.rule} ${f.file}:${f.line ?? '-'} ${f.message}`);

describe('projectOf', () => {
  it('loads the fixture brief and key points with no errors', () => {
    const p = project();
    expect(p.errors).toEqual([]);
    expect(p.brief?.title).toBe('Move the bakery to the shared kitchen');
    expect(p.brief?.decisions).toHaveLength(13);
    expect(p.keyPoints.map((e) => [e.kp.id, e.module, e.index, e.line])).toEqual([
      ['kp-01-borrow-on-busy-days', 1, 0, 4],
      ['kp-01-pay-only-while-proofing', 1, 1, 13],
      ['kp-01-give-capacity-back', 1, 2, 18],
      ['kp-01-name-the-billing-term', 1, 3, 23],
    ]);
    expect(p.keyPoints.every((e) => e.path === KEY_POINTS)).toBe(true);
  });

  it('lists every brief string and key point text with its line', () => {
    const p = project();
    expect(p.strings).toContainEqual({
      path: BRIEF_FILE,
      line: 2,
      field: 'title',
      text: 'Move the bakery to the shared kitchen',
    });
    expect(p.strings).toContainEqual({
      path: BRIEF_FILE,
      line: 23,
      field: 'decisions[0].context[0]',
      text: 'The bakery runs one branch today.',
    });
    expect(p.strings).toContainEqual({
      path: KEY_POINTS,
      line: 6,
      field: 'kp-01-borrow-on-busy-days',
      text: 'The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.',
    });
    expect(p.strings.filter((s) => s.path === KEY_POINTS)).toHaveLength(4);
  });

  it('loads once per context', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(projectOf(ctx)).toBe(projectOf(ctx));
  });

  it('treats a missing brief as no project', () => {
    const p = project((root) => rmSync(join(root, 'content', 'project'), { recursive: true }));
    expect(p).toEqual({ brief: null, keyPoints: [], strings: [], errors: [] });
  });

  it('reports a YAML error at its line', () => {
    expect(errors((root) => replaceIn(root, KEY_POINTS, 'module: 1', 'module: [1'))).toEqual([
      expect.stringMatching(/^R1 content\/project\/key-points\/01-baking-basics\.yaml:\d+ YAML: /),
    ]);
  });

  it('reports a schema error at the line of its key point', () => {
    expect(errors((root) => replaceIn(root, KEY_POINTS, 'status: draft', 'status: ready'))).toEqual([
      `R1 ${KEY_POINTS}:14 keyPoints.1.status: Invalid option: expected one of "draft"|"live"|"retired"`,
    ]);
  });

  it('reports a brief with 12 decisions at the decisions list', () => {
    const found = errors((root) => {
      const file = join(root, BRIEF_FILE);
      writeFileSync(file, readFileSync(file, 'utf8').replace(/ {2}- module: 13\n[\s\S]*?(?=rubric:)/, ''));
    });
    expect(found).toEqual([
      `R1 ${BRIEF_FILE}:19 decisions: Too small: expected array to have exactly 13 items`,
    ]);
  });

  it('reports a file whose name prefix differs from its module', () => {
    expect(errors((root) => replaceIn(root, KEY_POINTS, 'module: 1', 'module: 2'))).toEqual([
      `R1 ${KEY_POINTS}:2 module 2 must match the file name prefix 01`,
    ]);
  });

  it('reports a second file for one module and a stray file', () => {
    const found = errors((root) => {
      writeFileSync(join(root, 'content/project/key-points/01-again.yaml'), 'module: 1\nkeyPoints: []\n');
      writeFileSync(join(root, 'content/project/notes.md'), '# Notes\n');
    });
    expect(found).toContainEqual(
      expect.stringMatching(
        /^R1 content\/project\/key-points\/01-[a-z-]+\.yaml:- a second key point file for Module 1; keep one file per module$/,
      ),
    );
    expect(found).toContain(
      'R1 content/project/notes.md:- content/project holds brief.yaml and key-points/NN-module-dir.yaml files only',
    );
  });
});

describe('keyPointHash', () => {
  it('hashes text, concepts and evidence only', () => {
    const kp = project().keyPoints[0]?.kp;
    if (kp === undefined) throw new Error('no fixture key point');
    expect(keyPointHash(kp)).toBe(hash12({ text: kp.text, concepts: kp.concepts, evidence: kp.evidence }));
    expect(keyPointHash(kp)).toBe(kp.verified?.fullHash);
    expect(keyPointHash({ ...kp, concepts: ['per-minute-rental'] })).not.toBe(kp.verified?.fullHash);
  });
});
