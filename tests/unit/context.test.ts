import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { bakeryLab, FIXTURE_LAB, writeLab } from '../fixtures/labs.ts';
import {
  POOL_FILE,
  QUESTION_FILE,
  singleQuestion,
  writePool,
  writeQuestions,
} from '../fixtures/questions.ts';

/** The lesson and exam-pool entries, without the fixture incident's steps. */
const lessonAndPool = (ctx: Context) => ctx.questions.filter((e) => e.incident === null);

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
    expect(lessonAndPool(ctx).map((e) => [e.path, e.index, e.line, e.noteId, e.q.id, e.q.type])).toEqual([
      [QUESTIONS, 0, 2, 'm01/what-a-bakery-cloud-is', 'q-b4k7m2', 'single'],
      [QUESTIONS, 1, 34, 'm01/what-a-bakery-cloud-is', 'q-c8n3p5', 'match'],
      [QUESTIONS, 2, 57, 'm01/what-a-bakery-cloud-is', 'q-d9p4r6', 'single'],
    ]);
  });

  it('reports a broken question item once, with its index and line, and keeps the other item', () => {
    const root = makeFixtureRoot();
    replaceIn(root, QUESTIONS, '    task: "4.1"\n', '    task: "9.9"\n');
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([expect.objectContaining({ rule: 'R1', file: QUESTIONS, line: 34 })]);
    expect(ctx.loadErrors[0]?.message.startsWith('questions[1] (q-c8n3p5).task: ')).toBe(true);
    expect(lessonAndPool(ctx).map((e) => e.q.id)).toEqual(['q-b4k7m2', 'q-d9p4r6']);
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

describe('loadContext on exam files (spec 2.6)', () => {
  it("loads an exam-pool file with its module and each item's note", () => {
    const root = makeFixtureRoot();
    writePool(root, [singleQuestion({ id: 'q-9d4r6t', pool: 'exam' })]);
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([]);
    expect(lessonAndPool(ctx).map((e) => [e.path, e.module, e.noteId, e.q.id])).toEqual([
      [POOL_FILE, 1, 'm01/what-a-bakery-cloud-is', 'q-9d4r6t'],
      [QUESTION_FILE, 1, 'm01/what-a-bakery-cloud-is', 'q-b4k7m2'],
      [QUESTION_FILE, 1, 'm01/what-a-bakery-cloud-is', 'q-c8n3p5'],
      [QUESTION_FILE, 1, 'm01/what-a-bakery-cloud-is', 'q-d9p4r6'],
    ]);
  });

  it('keeps practice items out of pool files and exam items out of content/questions/', () => {
    const root = makeFixtureRoot();
    writePool(root, [singleQuestion({ id: 'q-9d4r6t' })]);
    writeQuestions(root, [singleQuestion({ pool: 'exam' })]);
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([
      { rule: 'R1', file: POOL_FILE, line: 2, message: 'q-9d4r6t: pool files hold pool: exam only' },
      {
        rule: 'R1',
        file: QUESTION_FILE,
        line: 2,
        message: 'q-7k2m9p: exam items live under content/exam/pool/',
      },
    ]);
    expect(lessonAndPool(ctx)).toEqual([]);
  });

  it('reports a pool item whose note is in another module, and a stray pool path', () => {
    const root = makeFixtureRoot();
    writePool(root, [singleQuestion({ pool: 'exam' })], 'content/exam/pool/02-proofing.yaml');
    writePool(root, [], 'content/exam/pool/extra.yaml');
    writePool(root, [], 'content/exam/pool/01-baking/items.yaml');
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors.map((f) => `${f.file}  ${f.message}`)).toEqual([
      'content/exam/pool/01-baking/items.yaml  not a pool file path; use content/exam/pool/NN-module-slug.yaml',
      'content/exam/pool/02-proofing.yaml  q-7k2m9p: note m01/what-a-bakery-cloud-is is not in module 02',
      'content/exam/pool/extra.yaml  not a pool file path; use content/exam/pool/NN-module-slug.yaml',
    ]);
  });

  it('loads absent quotas and forms as null, and needs the rank and badge files', () => {
    const root = makeFixtureRoot();
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect([ctx.quotas, ctx.forms]).toEqual([null, null]);
    expect(ctx.ranks?.map((r) => r.id)).toEqual(['basic']);
    expect(ctx.badges).toHaveLength(12);
    unlinkSync(join(root, 'content/game/ranks.yaml'));
    unlinkSync(join(root, 'content/game/badges.yaml'));
    expect(loadContext(root, { today: FIXTURE_TODAY }).loadErrors).toEqual([
      { rule: 'R1', file: 'content/game/ranks.yaml', message: 'required file is missing' },
      { rule: 'R1', file: 'content/game/badges.yaml', message: 'required file is missing' },
    ]);
  });

  it('reports a forms file that breaks its schema', () => {
    const root = makeFixtureRoot();
    writeFileSync(join(root, 'content/exam/forms.yaml'), 'seed: 1\nforms: []\n');
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.forms).toBeNull();
    expect(ctx.loadErrors.map((f) => `${f.file}  ${f.message}`)).toEqual([
      'content/exam/forms.yaml  forms: Too small: expected array to have exactly 4 items',
    ]);
  });
});

describe('loadContext on lab files (spec 5.1)', () => {
  const labErrors = (edit: (root: string) => void): string[] => {
    const root = makeFixtureRoot();
    edit(root);
    return loadContext(root, { today: FIXTURE_TODAY }).loadErrors.map((f) => `${f.file}  ${f.message}`);
  };

  it('loads the fixture lab with its folder module and file slug', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(ctx.labs.map((e) => [e.path, e.module, e.slug, e.lab.id, e.lab.status])).toEqual([
      [FIXTURE_LAB, 1, 'sort-the-bakes', 'lab-m01-sort-the-bakes', 'live'],
    ]);
  });

  it('reports a lab whose module or id does not match its folder and file, and keeps it out of labs', () => {
    const moved = 'content/labs/02-baking-basics/sort-the-bakes.yaml';
    expect(labErrors((root) => writeLab(root, bakeryLab(), moved))).toEqual([
      `${moved}  lab module 1 does not match its folder 02`,
    ]);
    const renamed = 'content/labs/01-baking-basics/sort-the-loaves.yaml';
    expect(labErrors((root) => writeLab(root, bakeryLab(), renamed))).toEqual([
      `${renamed}  lab id must be lab-m01-sort-the-loaves`,
    ]);
  });

  it('reports a lab that breaks its schema, and any other file under content/labs', () => {
    expect(labErrors((root) => writeLab(root, { ...bakeryLab(), minutes: 30 }))).toEqual([
      `${FIXTURE_LAB}  minutes: Too big: expected number to be <=20`,
    ]);
    expect(
      labErrors((root) => {
        writeLab(root, bakeryLab(), 'content/labs/sort-the-bakes.yaml');
        writeFileSync(join(root, 'content', 'labs', '01-baking-basics', 'notes.md'), '# Notes\n');
      }),
    ).toEqual([
      'content/labs/01-baking-basics/notes.md  content/labs holds lab YAML files in NN-module folders only',
      'content/labs/sort-the-bakes.yaml  content/labs holds lab YAML files in NN-module folders only',
    ]);
  });
});

describe('loadContext on incident files (spec 2.6, 4.5)', () => {
  const INCIDENT = 'content/incidents/inc-001.yaml';

  it('loads the fixture incident and puts its steps among the questions with the incident id and home module', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(ctx.incidents.map((i) => [i.path, i.incident.id, i.incident.status, i.steps.length])).toEqual([
      [INCIDENT, 'inc-001', 'live', 2],
    ]);
    expect(
      ctx.questions
        .filter((e) => e.incident !== null)
        .map((e) => [e.path, e.line, e.module, e.noteId, e.q.id, e.incident]),
    ).toEqual([
      [INCIDENT, 7, 1, 'm01/what-a-bakery-cloud-is', 'q-d2f6h8', 'inc-001'],
      [INCIDENT, 40, 1, 'm01/what-a-bakery-cloud-is', 'q-e3g7j9', 'inc-001'],
    ]);
    expect(lessonAndPool(ctx).every((e) => e.incident === null)).toBe(true);
  });

  it('needs the file name to equal the id, and reports a stray file under content/incidents/', () => {
    const root = makeFixtureRoot();
    replaceIn(root, INCIDENT, 'id: inc-001\n', 'id: inc-002\n');
    writeFileSync(join(root, 'content/incidents/notes.yaml'), 'id: inc-003\n');
    expect(loadContext(root, { today: FIXTURE_TODAY }).loadErrors).toEqual([
      { rule: 'R1', file: INCIDENT, message: 'id inc-002 must match the file name inc-001.yaml' },
      {
        rule: 'R1',
        file: 'content/incidents/notes.yaml',
        message: 'not an incident file path; use content/incidents/inc-NNN.yaml',
      },
    ]);
  });

  it('rejects a match step, an exam-pool step and a step that fails the question schema, keeping the others', () => {
    const root = makeFixtureRoot();
    replaceIn(
      root,
      INCIDENT,
      '    pool: practice\n    type: single\n    concept: per-minute-rental',
      '    pool: exam\n    type: single\n    concept: per-minute-rental',
    );
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([
      {
        rule: 'R1',
        file: INCIDENT,
        line: 40,
        message: 'steps[1]: incident steps are single or multi practice items',
      },
    ]);
    expect(ctx.incidents[0]?.steps.map((s) => s.q.id)).toEqual(['q-d2f6h8']);
    const broken = makeFixtureRoot();
    replaceIn(broken, INCIDENT, '    task: "4.1"\n', '    task: "9.9"\n');
    const errors = loadContext(broken, { today: FIXTURE_TODAY }).loadErrors;
    expect(errors.map((f) => [f.line, f.message.split(':')[0]])).toEqual([[40, 'steps[1] (q-e3g7j9).task']]);
    const match = makeFixtureRoot();
    replaceIn(
      match,
      INCIDENT,
      '    type: single\n    concept: per-minute-rental',
      '    type: match\n    concept: per-minute-rental',
    );
    const matchErrors = loadContext(match, { today: FIXTURE_TODAY }).loadErrors.map((f) => f.message);
    expect(matchErrors.length).toBeGreaterThan(0);
    expect(matchErrors.every((m) => m.startsWith('steps[1] (q-e3g7j9)'))).toBe(true);
  });
});
