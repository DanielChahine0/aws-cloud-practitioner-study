import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const CONCEPTS = 'content/concepts.yaml';

function withHead(headConcepts: string, edit: (root: string) => void = () => {}): Context {
  const root = makeFixtureRoot();
  edit(root);
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  return { ...ctx, head: (path) => (path === 'content/concepts.yaml' ? headConcepts : null) };
}

describe('R2 against HEAD', () => {
  it('reports a concept id that HEAD has and the working tree lost', () => {
    const findings = runRules(withHead('- id: rye-bread\n  name: Rye\n- id: shared-kitchen\n'), [
      'R2',
    ]).findings;
    expect(findings.map((f) => f.message)).toEqual([
      "concept id 'rye-bread' exists in HEAD but is gone; keep it as an alias of the concept that replaced it, or name it in splitFrom on each concept split from it",
    ]);
  });

  it('accepts an old id that survives as an alias', () => {
    const ctx = withHead('- id: per-minute-rental\n- id: shared-kitchen\n- id: shared-oven\n');
    const merged: Context = {
      ...ctx,
      concepts: ctx.concepts.map((c) => (c.id === 'shared-kitchen' ? { ...c, aliases: ['shared-oven'] } : c)),
      read: (path) =>
        path === 'content/concepts.yaml'
          ? '- id: per-minute-rental\n- id: shared-kitchen\n  aliases: [shared-oven]\n'
          : ctx.read(path),
    };
    expect(runRules(merged, ['R2']).findings).toEqual([]);
  });

  it('accepts an old id that every new concept names in splitFrom (spec 2.4)', () => {
    const split = (root: string): void => {
      for (const id of ['shared-kitchen', 'per-minute-rental'])
        replaceIn(root, CONCEPTS, `- id: ${id}\n`, `- id: ${id}\n  splitFrom: kitchen-and-billing\n`);
    };
    const ctx = withHead('- id: kitchen-and-billing\n', split);
    expect(ctx.concepts.map((c) => c.splitFrom)).toEqual(['kitchen-and-billing', 'kitchen-and-billing']);
    expect(runRules(ctx, ['R1', 'R2']).findings).toEqual([]);
  });

  it('leaves a working-tree registry that does not parse to R1 instead of reporting every HEAD id', () => {
    const ctx = withHead('- id: per-minute-rental\n- id: shared-kitchen\n', (root) =>
      writeFileSync(join(root, CONCEPTS), '- id: shared-kitchen\n  name: [unclosed\n'),
    );
    expect(runRules(ctx, ['R1', 'R2']).findings.map((f) => `${f.rule} ${f.message.split(':')[0]}`)).toEqual([
      'R1 YAML',
    ]);
  });
});

describe('R2 uniqueness', () => {
  const r02 = (edit: (root: string) => void): string[] => {
    const root = makeFixtureRoot();
    edit(root);
    return runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R2']).findings.map((f) => f.message);
  };

  it('reports an alias that repeats a concept id, its own id, or another alias', () => {
    expect(
      r02((root) =>
        replaceIn(root, CONCEPTS, '  confusableWith: [shared-kitchen]\n', '  aliases: [shared-kitchen]\n'),
      ),
    ).toEqual([
      "id 'shared-kitchen' (alias of per-minute-rental) is already used by concept in content/concepts.yaml",
    ]);
    expect(
      r02((root) =>
        replaceIn(root, CONCEPTS, '  tasks: ["4.1"]\n', '  tasks: ["4.1"]\n  aliases: [per-minute-rental]\n'),
      ),
    ).toEqual([
      "id 'per-minute-rental' (alias of per-minute-rental) is already used by concept in content/concepts.yaml",
    ]);
    expect(
      r02((root) => {
        replaceIn(root, CONCEPTS, '  tasks: ["1.1"]\n', '  tasks: ["1.1"]\n  aliases: [oven]\n');
        replaceIn(root, CONCEPTS, '  tasks: ["4.1"]\n', '  tasks: ["4.1"]\n  aliases: [oven]\n');
      }),
    ).toEqual([
      "id 'oven' (alias of per-minute-rental) is already used by alias of shared-kitchen in content/concepts.yaml",
    ]);
  });

  it('reports two missions with one id', () => {
    expect(
      r02((root) =>
        copyFileSync(
          join(root, 'content/missions/mission-00-guardrails.md'),
          join(root, 'content/missions/mission-00-budget.md'),
        ),
      ),
    ).toEqual([
      "id 'mission-00' (mission) is already used by mission in content/missions/mission-00-budget.md",
    ]);
  });
});

describe('R2 questions', () => {
  const QUESTIONS = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';
  const same = (text: string): string => text;
  const extra = (status: string): string =>
    [
      '  - id: q-d9r4t6',
      '    version: 1',
      `    status: ${status}`,
      '    pool: practice',
      '    type: single',
      '    concept: shared-kitchen',
      '    note: m01/what-a-bakery-cloud-is',
      '    task: "1.1"',
      '    level: 1',
      '    stem: Which kitchen lends ovens to a branch with a long queue?',
      '    options:',
      '      - { id: a, text: The central kitchen, correct: true, why: It lends ovens. }',
      '      - { id: b, text: The harbour branch, why: It has two ovens. }',
      '      - { id: c, text: The flour mill, why: It mills flour. }',
      '      - { id: d, text: The delivery van, why: It carries rolls. }',
      '    evidence: []',
      '    takeaway: The central kitchen lends ovens.',
      '',
    ].join('\n');

  /** R2 findings with the fixture question file in HEAD as `headEdit` makes it, after `edit` changes the working tree. */
  function withQuestionHead(
    headEdit: (text: string) => string,
    edit: (root: string) => void = () => {},
  ): string[] {
    const root = makeFixtureRoot();
    const headText = headEdit(readFileSync(join(root, QUESTIONS), 'utf8'));
    edit(root);
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    const withHeadFiles: Context = {
      ...ctx,
      headPaths: (prefix) => (QUESTIONS.startsWith(prefix) ? [QUESTIONS] : []),
      head: (path) => (path === QUESTIONS ? headText : null),
    };
    return runRules(withHeadFiles, ['R2']).findings.map(
      (f) => `${f.file}${f.line === undefined ? '' : `:${f.line}`} ${f.message}`,
    );
  }

  it('passes when HEAD matches the working tree', () => {
    expect(withQuestionHead(same)).toEqual([]);
  });

  it('reports a live question of HEAD that is gone, and passes a deleted draft or a kept retired one', () => {
    expect(withQuestionHead((text) => text + extra('live'))).toEqual([
      `${QUESTIONS} question 'q-d9r4t6' is live or retired in HEAD but is gone; retire it in place with status: retired`,
    ]);
    expect(withQuestionHead((text) => text + extra('draft'))).toEqual([]);
    const retired = (text: string): string => text + extra('retired');
    const keep = (root: string): void =>
      writeFileSync(join(root, QUESTIONS), retired(readFileSync(join(root, QUESTIONS), 'utf8')));
    expect(withQuestionHead(retired, keep)).toEqual([]);
  });

  it('needs a version bump and a key-fix entry when the correct answer of a live question changes', () => {
    const moveKey = (root: string): void => {
      replaceIn(root, QUESTIONS, '        correct: true\n', '');
      replaceIn(
        root,
        QUESTIONS,
        '        text: Install a third oven at the harbour branch\n',
        '        text: Install a third oven at the harbour branch\n        correct: true\n',
      );
    };
    expect(withQuestionHead(same, moveKey)).toEqual([
      `${QUESTIONS}:2 the correct answer of 'q-b4k7m2' changed, so it needs version 2 and a key-fix history entry`,
    ]);
    const bump = (root: string): void => {
      moveKey(root);
      replaceIn(
        root,
        QUESTIONS,
        '  - id: q-b4k7m2\n    version: 1\n',
        '  - id: q-b4k7m2\n    version: 2\n    history: [{ version: 2, change: key-fix, rescore: true }]\n',
      );
    };
    expect(withQuestionHead(same, bump)).toEqual([]);
  });

  it('reports a question id used twice', () => {
    const twice = (root: string): void =>
      replaceIn(root, QUESTIONS, '  - id: q-c8n3p5\n', '  - id: q-b4k7m2\n');
    expect(withQuestionHead(same, twice)).toEqual([
      `${QUESTIONS} id 'q-b4k7m2' (question) is already used by question in ${QUESTIONS}`,
    ]);
  });
});
