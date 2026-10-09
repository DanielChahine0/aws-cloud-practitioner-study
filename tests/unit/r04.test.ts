import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const QUESTIONS = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';

/** R4's messages after the edits, with every fixture question live, or every one a draft when `live` is false. */
function r04(edits: [from: string, to: string][], live = true): string[] {
  const root = makeFixtureRoot();
  const file = join(root, QUESTIONS);
  const text = readFileSync(file, 'utf8');
  writeFileSync(
    file,
    live
      ? text.replaceAll('status: draft', 'status: live')
      : text.replaceAll('status: live', 'status: draft'),
  );
  for (const [from, to] of edits) replaceIn(root, QUESTIONS, from, to);
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  expect(ctx.loadErrors).toEqual([]);
  return runRules(ctx, ['R4']).findings.map((f) => `${f.line} ${f.message}`);
}

const EMPTY_WHY: [string, string] = [
  '        why: Closing turns away the very customers the extra capacity is meant to serve.\n',
  '        why: ""\n',
];

describe('R4 explanations', () => {
  it('passes the fixture questions once live', () => {
    expect(r04([])).toEqual([]);
  });

  it('reports a short option why on a live question, and ignores it on a draft', () => {
    expect(r04([EMPTY_WHY])).toEqual(['2 q-b4k7m2: option c has no why of at least 20 characters']);
    expect(r04([EMPTY_WHY], false)).toEqual([]);
  });

  it('reports a short pair why', () => {
    expect(
      r04([
        [
          '        why: A cabinet handed back costs nothing while no dough proofs in it.\n',
          '        why: "   Free.            "\n',
        ],
      ]),
    ).toEqual(['34 q-c8n3p5: pair 2 has no why of at least 20 characters']);
  });

  it('reports missing evidence and a blank takeaway', () => {
    expect(
      r04([
        ['    evidence:\n      - Cabinets are billed only while dough proofs.\n', '    evidence: []\n'],
        [
          '    takeaway: Rented cabinets cost money only for the minutes dough is proofing.\n',
          '    takeaway: "  "\n',
        ],
      ]),
    ).toEqual(['34 q-c8n3p5: needs 1 to 3 evidence lines, has 0', '34 q-c8n3p5: takeaway is blank']);
  });
});
