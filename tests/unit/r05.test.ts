import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const QUESTIONS = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';
const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const EVIDENCE = '      - Branches use ovens from one central kitchen when their queues grow.\n';
const UPDATE = 'The fixture guide names a newer billing term.';

/** R5's messages with every fixture question live, after edits to the question file and the lesson. */
function r05(questionEdits: [string, string][] = [], lessonEdits: [string, string][] = []): string[] {
  const root = makeFixtureRoot();
  const file = join(root, QUESTIONS);
  writeFileSync(file, readFileSync(file, 'utf8').replaceAll('status: draft', 'status: live'));
  for (const [from, to] of questionEdits) replaceIn(root, QUESTIONS, from, to);
  for (const [from, to] of lessonEdits) replaceIn(root, LESSON, from, to);
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  expect(ctx.loadErrors).toEqual([]);
  return runRules(ctx, ['R5']).findings.map((f) => `${f.line} ${f.message}`);
}

describe('R5 evidence', () => {
  it('passes the fixture evidence lines', () => {
    expect(r05()).toEqual([]);
  });

  it('compares case-sensitively', () => {
    expect(r05([[EVIDENCE, EVIDENCE.replace('Branches', 'branches')]])).toEqual([
      '2 q-b4k7m2: evidence is not a whole line of m01/what-a-bakery-cloud-is: "branches use ovens from one central kitchen when their queues grow."',
    ]);
  });

  it('accepts an update line by its sentence, also after its verified_on changes', () => {
    const cite: [string, string] = [EVIDENCE, `      - ${UPDATE}\n`];
    expect(r05([cite])).toEqual([]);
    expect(r05([cite], [['verified_on 2026-10-01', 'verified_on 2026-10-05']])).toEqual([]);
  });

  it('ignores drafts and leaves an unknown note to R6', () => {
    const root = makeFixtureRoot();
    const file = join(root, QUESTIONS);
    writeFileSync(file, readFileSync(file, 'utf8').replaceAll('status: live', 'status: draft'));
    replaceIn(root, QUESTIONS, EVIDENCE, '      - Not in the note.\n');
    expect(runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R5']).findings).toEqual([]);
    expect(r05([['    note: m01/what-a-bakery-cloud-is\n', '    note: m01/nowhere\n']])).toEqual([]);
  });
});
