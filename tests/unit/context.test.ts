import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

describe('loadContext', () => {
  it('loads the fixture tree with no errors', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([]);
    expect(ctx.notes.map((n) => n.id)).toEqual(['m01', 'm01/what-a-bakery-cloud-is']);
    expect(ctx.concepts.map((c) => c.id)).toEqual(['shared-kitchen', 'per-minute-rental']);
    expect(ctx.blueprint?.tasks).toHaveLength(19);
    expect(ctx.missions.map((m) => m.id)).toEqual(['mission-00']);
    expect(ctx.fingerprints.get(1)?.itemIds).toEqual(['kc-01', 'quiz-01']);
    expect(ctx.fingerprints.get(1)?.items.values.size).toBeGreaterThan(0);
    expect(ctx.allow.length).toBeGreaterThan(0);
    expect(ctx.shared.map((s) => s.path)).toEqual([
      'resources/README.md',
      'resources/concepts.md',
      'resources/glossary.md',
    ]);
    expect(ctx.head('content/concepts.yaml')).toBeNull();
    expect(ctx.headPaths('content/questions/')).toEqual([]);
  });

  it('reports a missing required file as an R1 finding', () => {
    const root = makeFixtureRoot();
    unlinkSync(join(root, 'content', 'concepts.yaml'));
    expect(loadContext(root, { today: FIXTURE_TODAY }).loadErrors).toEqual([
      { rule: 'R1', file: 'content/concepts.yaml', message: 'required file is missing' },
    ]);
  });

  it('names the concept in schema errors and keeps the valid entries', () => {
    const root = makeFixtureRoot();
    writeFileSync(
      join(root, 'content', 'concepts.yaml'),
      '- id: half-done\n  name: Half done\n  home: m01/what-a-bakery-cloud-is\n  anchor: ""\n- id: shared-kitchen\n  name: Shared kitchen\n  home: m01/what-a-bakery-cloud-is\n  anchor: shared-kitchen\n  tasks: ["1.1"]\n',
    );
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors.map((f) => f.message.split(':')[0])).toEqual([
      '[half-done].anchor',
      '[half-done].tasks',
    ]);
    expect(ctx.concepts.map((c) => c.id)).toEqual(['shared-kitchen']);
  });

  it('reports a fingerprint file whose count disagrees with its data as an R1 finding', () => {
    const root = makeFixtureRoot();
    const file = join(root, 'content', 'fingerprints', 'm01.json');
    const prints = JSON.parse(readFileSync(file, 'utf8'));
    prints.text.count += 1;
    writeFileSync(file, JSON.stringify(prints));
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([
      {
        rule: 'R1',
        file: 'content/fingerprints/m01.json',
        message: `text: packed set holds ${(prints.text.count - 1) * 3} bytes, not ${prints.text.count * 3} for its count of ${prints.text.count}`,
      },
    ]);
    expect(ctx.fingerprints.has(1)).toBe(false);
  });

  it('reports invalid YAML and invalid frontmatter YAML as R1 findings', () => {
    const root = makeFixtureRoot();
    writeFileSync(join(root, 'content', 'concepts.yaml'), '- id: a\n  name: [unclosed\n');
    const lesson = join(root, 'resources', '01-baking-basics', '01-what-a-bakery-cloud-is.md');
    writeFileSync(lesson, readFileSync(lesson, 'utf8').replace('module: 1', 'module: [1'));
    const errors = loadContext(root, { today: FIXTURE_TODAY }).loadErrors;
    expect(errors.map((f) => `${f.file} ${f.message.split(':')[0]}`)).toEqual([
      'content/concepts.yaml YAML',
      'resources/01-baking-basics/01-what-a-bakery-cloud-is.md frontmatter YAML',
    ]);
  });

  it('reports a resources Markdown file that is not a note path, so no file escapes the checks', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'resources', '01-baking-basics', 'extra'));
    for (const path of [
      'resources/01-baking-basics/07-AWS-Lambda.md',
      'resources/01-baking-basics/7-aws-lambda.md',
      'resources/01-baking-basics/extra/notes.md',
    ])
      writeFileSync(join(root, path), '# Stray\n');
    const errors = loadContext(root, { today: FIXTURE_TODAY }).loadErrors;
    expect(errors.map((f) => `${f.rule} ${f.file}`)).toEqual([
      'R1 resources/01-baking-basics/07-AWS-Lambda.md',
      'R1 resources/01-baking-basics/7-aws-lambda.md',
      'R1 resources/01-baking-basics/extra/notes.md',
    ]);
  });

  const QUESTIONS = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';

  it('loads the fixture questions with their note id and item lines', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(ctx.questions.map((e) => [e.path, e.index, e.line, e.noteId, e.q.id, e.q.type])).toEqual([
      [QUESTIONS, 0, 2, 'm01/what-a-bakery-cloud-is', 'q-b4k7m2', 'single'],
      [QUESTIONS, 1, 34, 'm01/what-a-bakery-cloud-is', 'q-c8n3p5', 'match'],
    ]);
  });

  it('reports a broken question item once, with its index and line, and keeps the other item', () => {
    const root = makeFixtureRoot();
    replaceIn(root, QUESTIONS, '    task: "4.1"\n', '    task: "9.9"\n');
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([expect.objectContaining({ rule: 'R1', file: QUESTIONS, line: 34 })]);
    expect(ctx.loadErrors[0]?.message.startsWith('questions[1] (q-c8n3p5).task: ')).toBe(true);
    expect(ctx.questions.map((e) => e.q.id)).toEqual(['q-b4k7m2']);
  });

  it('reports question YAML errors, a file without a questions list and stray question paths', () => {
    const root = makeFixtureRoot();
    writeFileSync(join(root, QUESTIONS), 'questions:\n  - id: [unclosed\n');
    writeFileSync(join(root, 'content', 'questions', 'notes.yaml'), 'questions: []\n');
    mkdirSync(join(root, 'content', 'questions', '02-more'));
    writeFileSync(join(root, 'content', 'questions', '02-more', '01-lists.yaml'), '- id: q-b4k7m2\n');
    const errors = loadContext(root, { today: FIXTURE_TODAY }).loadErrors;
    expect(errors.map((f) => `${f.file} ${f.message.split(':')[0]}`)).toEqual([
      'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml YAML',
      'content/questions/02-more/01-lists.yaml (root)',
      'content/questions/notes.yaml not a question file path (content/questions/NN-module/NN-lesson.yaml), so no rule checks it',
    ]);
  });
});
