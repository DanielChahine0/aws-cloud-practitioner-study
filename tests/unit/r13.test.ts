import { appendFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadContext, RANKS_FILE } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { r13 as rule13, sourceProblem } from '../../scripts/content/rules/r13-sources.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const DOCS = 'https://docs.aws.amazon.com/x.html';

describe('sourceProblem', () => {
  it('accepts an AWS source checked 180 days ago or less', () => {
    expect(sourceProblem(DOCS, '2026-04-13', '2026-10-10')).toBeNull();
    expect(
      sourceProblem('https://aws.amazon.com/premiumsupport/plans/', '2026-10-10', '2026-10-10'),
    ).toBeNull();
  });

  it('rejects other hosts, stale or future dates, and non-URLs', () => {
    expect(sourceProblem('https://repost.aws/x', '2026-10-01', '2026-10-10')).toMatch(
      /not on aws.amazon.com/,
    );
    expect(sourceProblem(DOCS, '2026-04-12', '2026-10-10')).toMatch(/181 days old/);
    expect(sourceProblem(DOCS, '2026-10-11', '2026-10-10')).toMatch(/in the future/);
    expect(sourceProblem('not a url', '2026-10-01', '2026-10-10')).toMatch(/is not a URL/);
  });

  it('rejects a date that does not exist instead of rolling it over', () => {
    expect(sourceProblem(DOCS, '2026-02-30', '2026-10-10')).toBe("verified_on '2026-02-30' is not a date");
  });
});

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const r13 = (edit: (root: string) => void): string[] => {
  const root = makeFixtureRoot();
  edit(root);
  return runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R13']).findings.map(
    (f) => `${f.file}${f.line === undefined ? '' : `:${f.line}`} ${f.message}`,
  );
};

describe('R13 sources', () => {
  it('reports update lines that are spelled slightly wrong as malformed, and ignores prose and code', () => {
    const lines = [
      '- **Exam guide update:** (verified_on 2024-01-01, [Blog](https://example.com/x)): A sentence.',
      '* **Exam guide update** (verified_on 2024-01-01, [Blog](https://example.com/x)): A sentence.',
      '- The exam guide update cycle is not fixed.',
      '```',
      '- **Exam guide update** (when quoted as code)',
      '```',
    ];
    expect(r13((root) => appendFileSync(join(root, LESSON), `\n${lines.join('\n')}\n`))).toEqual([
      `${LESSON}:37 malformed Exam guide update line; see spec 2.3 for the format`,
      `${LESSON}:38 malformed Exam guide update line; see spec 2.3 for the format`,
    ]);
  });

  it('checks every blueprint task and every mission source', () => {
    expect(
      r13((root) =>
        replaceIn(
          root,
          'content/exam/blueprint.yaml',
          'Fixture task statement 1.1, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html", verified_on: "2026-10-01"',
          'Fixture task statement 1.1, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html", verified_on: "2026-01-01"',
        ),
      ),
    ).toEqual([
      'content/exam/blueprint.yaml verified_on 2026-01-01 is 282 days old (limit 180); re-check the source and update the date',
    ]);
    expect(
      r13((root) =>
        replaceIn(
          root,
          'content/missions/mission-00-guardrails.md',
          'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html',
          'https://repost.aws/x',
        ),
      ),
    ).toEqual([
      'content/missions/mission-00-guardrails.md source https://repost.aws/x is not on aws.amazon.com or docs.aws.amazon.com',
    ]);
  });
});

describe('R13 rank facts (spec 3.4)', () => {
  it('reports a rank fact that is no Module 11 Exam guide update sentence', () => {
    const root = makeFixtureRoot();
    writeFileSync(
      join(root, RANKS_FILE),
      [
        '- { id: basic, name: Basic, short: Basic, requires: {} }',
        '- id: bakery-plus',
        '  name: Bakery Plus',
        '  short: Bakery+',
        '  requires: { bosses: 5 }',
        '  facts: [The bakery plan answers within the hour., The bakery plan sends a chef monthly.]',
        '',
      ].join('\n'),
    );
    const findings = runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R13']).findings;
    expect(findings.map((f) => `${f.file}  ${f.message}`)).toEqual([
      `${RANKS_FILE}  rank bakery-plus fact 1 is not a Module 11 Exam guide update sentence`,
      `${RANKS_FILE}  rank bakery-plus fact 2 is not a Module 11 Exam guide update sentence`,
    ]);
  });

  it('passes the real ranks, whose facts are Module 11 update sentences', () => {
    const ctx = loadContext(fileURLToPath(new URL('../../', import.meta.url)));
    expect(rule13.run(ctx).filter((f) => f.file === RANKS_FILE)).toEqual([]);
  });
});
