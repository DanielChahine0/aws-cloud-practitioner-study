import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { POOL_FILE, singleQuestion, writePool } from '../fixtures/questions.ts';

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

  it('leaves a live question that only fails the schema, or a file that does not parse, to R1', () => {
    const stem =
      'stem: A harbour branch sells out of rolls each Saturday because its two ovens cannot keep up. Which choice fits the bakery cloud?';
    const shortStem = (root: string): void => replaceIn(root, QUESTIONS, stem, 'stem: Too short?');
    expect(withQuestionHead(same, shortStem)).toEqual([]);
    const unknownKey = (root: string): void =>
      replaceIn(root, QUESTIONS, '    pool: practice\n', '    pool: practice\n    colour: blue\n');
    expect(withQuestionHead(same, unknownKey)).toEqual([]);
    const broken = (root: string): void => replaceIn(root, QUESTIONS, 'questions:\n', 'questions:\n  - [\n');
    expect(withQuestionHead(same, broken)).toEqual([]);
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

describe('R2 exam pool and frozen forms (spec 4.3)', () => {
  const FORMS = 'content/exam/forms.yaml';
  const formsText = (a: { frozen: boolean; qids: string[] }): string =>
    stringify({
      seed: 20261024,
      forms: [
        { id: 'A', ...a },
        { id: 'B', frozen: false, qids: ['q-b00001'] },
        { id: 'C', frozen: false, qids: ['q-c00001'] },
        { id: 'D', frozen: false, qids: ['q-d00001'] },
      ],
    });
  const FROZEN = formsText({ frozen: true, qids: ['q-a00001', 'q-a00002'] });

  /** R2 messages with `headFiles` as HEAD, after `edit` changes the working tree. */
  function r02Head(headFiles: Record<string, string>, edit: (root: string) => void): string[] {
    const root = makeFixtureRoot();
    edit(root);
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    const withHead: Context = {
      ...ctx,
      head: (path) => headFiles[path] ?? null,
      headPaths: (prefix) => Object.keys(headFiles).filter((path) => path.startsWith(prefix)),
    };
    return runRules(withHead, ['R2']).findings.map((f) => `${f.file}  ${f.message}`);
  }
  const writeForms = (text: string) => (root: string) => writeFileSync(join(root, FORMS), text);

  it('keeps a frozen form unchanged against HEAD', () => {
    const changed = formsText({ frozen: true, qids: ['q-a00001', 'q-a00003'] });
    const reordered = formsText({ frozen: true, qids: ['q-a00002', 'q-a00001'] });
    const thawed = formsText({ frozen: false, qids: ['q-a00001', 'q-a00002'] });
    const message = `${FORMS}  form A is frozen in HEAD and may not change`;
    expect(r02Head({ [FORMS]: FROZEN }, writeForms(FROZEN))).toEqual([]);
    expect(r02Head({ [FORMS]: FROZEN }, writeForms(changed))).toEqual([message]);
    expect(r02Head({ [FORMS]: FROZEN }, writeForms(reordered))).toEqual([message]);
    expect(r02Head({ [FORMS]: FROZEN }, writeForms(thawed))).toEqual([message]);
    expect(r02Head({ [FORMS]: FROZEN }, () => {})).toEqual([message]);
  });

  it('lets a form that is not frozen in HEAD change, and leaves a forms file that breaks its schema to R1', () => {
    const open = formsText({ frozen: false, qids: ['q-a00001'] });
    expect(r02Head({ [FORMS]: open }, writeForms(formsText({ frozen: true, qids: ['q-a00009'] })))).toEqual(
      [],
    );
    expect(r02Head({ [FORMS]: FROZEN }, writeForms('seed: 1\nforms: []\n'))).toEqual([]);
  });

  it('reports a live exam id that HEAD has and the pool lost', () => {
    const live = singleQuestion({ id: 'q-9d4r6t', pool: 'exam', status: 'live' });
    const headPool = stringify({ questions: [live] });
    expect(r02Head({ [POOL_FILE]: headPool }, (root) => writePool(root, [live]))).toEqual([]);
    expect(r02Head({ [POOL_FILE]: headPool }, () => {})).toEqual([
      `${POOL_FILE}  question 'q-9d4r6t' is live or retired in HEAD but is gone; retire it in place with status: retired`,
    ]);
  });

  it('reports an exam id that repeats a practice id', () => {
    expect(
      r02Head({}, (root) => writePool(root, [singleQuestion({ id: 'q-b4k7m2', pool: 'exam' })])),
    ).toEqual([
      `content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml  id 'q-b4k7m2' (question) is already used by question in ${POOL_FILE}`,
    ]);
  });
});
