import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentIndex, ExamChunk, ModuleChunk, SearchChunk } from '../../schemas/chunks.ts';
import type { Concept } from '../../schemas/concept.ts';
import { BADGE_IDS } from '../../schemas/ids.ts';
import { buildContent, confusableLinks, missionSteps, readingMinutes } from '../../scripts/content/build.ts';
import { CONCEPTS_FILE, FORMS_FILE, loadContext } from '../../scripts/content/lib/context.ts';
import { normalize } from '../../src/app/search.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { bakeryLab, dropFixtureLab, writeLab } from '../fixtures/labs.ts';
import { POOL_FILE, singleQuestion, writePool } from '../fixtures/questions.ts';

const LESSON_ROUTE = '#/m/01/l/what-a-bakery-cloud-is';
const QUESTIONS_FILE = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';
const LESSON_SLUG = 'what-a-bakery-cloud-is';
const INCIDENT_FILE = 'content/incidents/inc-001.yaml';
/** The fixture incident's two live steps, which join `questionVersions` once the incident ships. */
const STEPS = { 'q-d2f6h8': 1, 'q-e3g7j9': 1 };

const MULTI = `
  - id: q-9q4r5s
    version: 3
    status: live
    pool: practice
    type: multi
    concept: per-minute-rental
    note: m01/what-a-bakery-cloud-is
    task: "4.1"
    level: 2
    select: 2
    stem: Which two habits keep the proofing bill of a small bakery low?
    options:
      - { id: a, text: Return each cabinet once its dough has risen, correct: true, why: Returned cabinets stop counting. }
      - { id: b, text: Rent cabinets only while dough is inside, correct: true, why: Only proofing time is billed. }
      - { id: c, text: Keep every cabinet booked all week, why: A booked empty cabinet still counts. }
      - { id: d, text: Buy a cabinet for every baker, why: Owned cabinets cost money while idle. }
      - { id: e, text: Proof all dough twice, why: Twice the proofing is twice the cabinet time. }
    evidence:
      - The fixture guide names a newer billing term.
    takeaway: Pay for proofing time, not for idle cabinets.
`;

function build(root = makeFixtureRoot()) {
  const built = buildContent(loadContext(root, { today: FIXTURE_TODAY }));
  const json = <T>(name: string): T => JSON.parse(built.files.get(name) ?? 'null') as T;
  const index = json<ContentIndex>(built.indexFile);
  return { built, index, json };
}

describe('buildContent on the fixture tree', () => {
  it('names every file by its content hash and records the index name', () => {
    const { built, index } = build();
    expect(built.indexFile).toMatch(/^content\/index\.[0-9a-f]{8}\.json$/);
    expect(built.contentVersion).toMatch(/^c-[0-9a-f]{6}$/);
    expect(index.contentVersion).toBe(built.contentVersion);
    expect(index.modules.map((m) => [m.n, m.short, m.lessons.length])).toEqual([[1, 'Baking Basics', 1]]);
    expect(index.modules[0]?.chunk).toMatch(/^content\/m01\.[0-9a-f]{8}\.json$/);
    expect(index.search).toMatch(/^content\/search\.[0-9a-f]{8}\.json$/);
    expect([...built.files.keys()].sort()).toEqual(
      [built.indexFile, index.modules[0]?.chunk, index.search].sort(),
    );
  });

  it('renders the lesson with its H1 and update line, and the README by sections', () => {
    const { index, json } = build();
    const chunk = json<ModuleChunk>(index.modules[0]?.chunk ?? '');
    const lesson = chunk.lessons['what-a-bakery-cloud-is'];
    expect(lesson?.html).toContain('<h1>What a Bakery Cloud Is</h1>');
    expect(lesson?.html).toContain('<li class="update"><span class="update-label">Exam guide update</span>');
    expect(lesson?.headings.filter((h) => h.depth === 3).map((h) => h.id)).toEqual([
      'shared-kitchen',
      'paying-by-the-minute',
    ]);
    expect(chunk.readme.map((s) => s.id)).toEqual([
      '',
      'what-this-module-covers',
      'lessons',
      'key-takeaways',
      'what-the-assessment-focuses-on',
      'summary',
      'further-reading',
    ]);
    expect(chunk.readme[2]?.html).toContain(`<a href="${LESSON_ROUTE}">What a Bakery Cloud Is</a>`);
  });

  it('indexes concepts, the glossary and missions with their routes', () => {
    const { index } = build();
    expect(index.concepts).toEqual([
      {
        id: 'shared-kitchen',
        name: 'Shared kitchen',
        home: 'm01/what-a-bakery-cloud-is',
        anchor: 'shared-kitchen',
        tested: true,
        tasks: ['1.1'],
        confusableWith: ['per-minute-rental'],
        aliases: [],
        splitFrom: null,
        labs: ['lab-m01-sort-the-bakes'],
      },
      {
        id: 'per-minute-rental',
        name: 'Per-minute rental',
        home: 'm01/what-a-bakery-cloud-is',
        anchor: 'paying-by-the-minute',
        tested: true,
        tasks: ['4.1'],
        confusableWith: ['shared-kitchen'],
        aliases: [],
        splitFrom: null,
        labs: ['lab-m01-sort-the-bakes'],
      },
    ]);
    expect(index.glossary).toEqual([
      {
        id: 'shared-kitchen',
        term: 'Shared kitchen',
        html: 'A pool of ovens that many branches use.',
        refs: [{ label: 'Module 1, What a Bakery Cloud Is', route: LESSON_ROUTE }],
      },
    ]);
    expect(index.missions.map((m) => [m.id, m.gate, m.maxLiveHours])).toEqual([['mission-00', true, null]]);
    expect(index.missions[0]?.sections.map((s) => s.id)).toEqual(['goal', 'steps']);
    expect(index.missions[0]?.sections[0]?.html).toContain('<h2 id="goal">Goal</h2>');
    expect(index.missions[0]?.sections[1]?.html).toContain('<h3 id="budget-first">Budget first</h3>');
    expect(index.missions[0]?.steps).toEqual([
      { id: 'budget-first', title: 'Budget first' },
      { id: 'alert-email', title: 'Alert email' },
    ]);
  });

  it("takes a mission's steps from the H3s under its Steps section only", () => {
    expect(
      missionSteps([
        { depth: 2, id: 'goal', text: 'Goal' },
        { depth: 3, id: 'not-a-step', text: 'Not a step' },
        { depth: 2, id: 'steps', text: 'Steps' },
        { depth: 3, id: 'make-the-bucket', text: 'Make the bucket' },
        { depth: 3, id: 'add-the-trigger', text: 'Add the trigger' },
        { depth: 2, id: 'verify', text: 'Verify' },
        { depth: 3, id: 'after', text: 'After' },
      ]),
    ).toEqual([
      { id: 'make-the-bucket', title: 'Make the bucket' },
      { id: 'add-the-trigger', title: 'Add the trigger' },
    ]);
  });

  it('writes a search chunk with a normalized entry per module, lesson, concept, term, mission and lab', () => {
    const { index, json } = build();
    const { entries } = json<SearchChunk>(index.search);
    expect(entries.map((e) => `${e.kind} ${e.route}`)).toEqual([
      'module #/m/01',
      `lesson ${LESSON_ROUTE}`,
      `concept ${LESSON_ROUTE}/shared-kitchen`,
      `concept ${LESSON_ROUTE}/paying-by-the-minute`,
      `term ${LESSON_ROUTE}`,
      'mission #/missions/mission-00',
      'lab #/m/01/lab/lab-m01-sort-the-bakes',
    ]);
    expect(entries[1]).toEqual({
      kind: 'lesson',
      title: 'What a Bakery Cloud Is',
      detail: 'Module 1: Baking Basics',
      route: LESSON_ROUTE,
      text: 'what a bakery cloud is shared kitchen paying by the minute',
    });
    expect(normalize('  AWS Business Support+ (Auto-Scaling)! ')).toBe('aws business support+ auto scaling');
  });

  it('ships the live practice question in its module chunk with a Read in notes target', () => {
    const { index, json } = build();
    const chunk = json<ModuleChunk>(index.modules[0]?.chunk ?? '');
    expect(chunk.questions.map((q) => q.id)).toEqual(['q-b4k7m2', 'q-d9p4r6']);
    const single = chunk.questions[0];
    expect(single).toMatchObject({
      id: 'q-b4k7m2',
      version: 1,
      type: 'single',
      concept: 'shared-kitchen',
      note: 'm01/what-a-bakery-cloud-is',
      task: '1.1',
      level: 2,
      select: null,
      pairs: [],
      takeaway: 'Borrow central ovens for a busy day instead of buying ovens that sit idle.',
      read: {
        route: `${LESSON_ROUTE}/shared-kitchen`,
        text: 'Branches use ovens from one central kitchen when their queues grow.',
      },
    });
    expect(single?.options.map((o) => [o.id, o.correct])).toEqual([
      ['a', true],
      ['b', false],
      ['c', false],
      ['d', false],
    ]);
    expect(single?.stem).toMatch(/^A harbour branch sells out .* Which choice fits the bakery cloud\?$/);
    expect(index.questionVersions).toEqual({ 'q-b4k7m2': 1, 'q-d9p4r6': 1, ...STEPS });
  });

  it('ships the draft match only once it is live, with its pairs in authored order', () => {
    expect(build().index.questionVersions).not.toHaveProperty('q-c8n3p5');
    const root = makeFixtureRoot();
    replaceIn(root, QUESTIONS_FILE, 'status: draft', 'status: live');
    const { index, json } = build(root);
    const chunk = json<ModuleChunk>(index.modules[0]?.chunk ?? '');
    const match = chunk.questions.find((q) => q.id === 'q-c8n3p5');
    expect(match?.options).toEqual([]);
    expect(match?.pairs.map((p) => p.left)).toEqual([
      'Dough rising for forty minutes',
      'An empty cabinet overnight',
      'Two cabinets for ten minutes each',
    ]);
    expect(match?.read.route).toBe(`${LESSON_ROUTE}/paying-by-the-minute`);
    expect(index.questionVersions).toEqual({ 'q-b4k7m2': 1, 'q-c8n3p5': 1, 'q-d9p4r6': 1, ...STEPS });
  });

  it('adds the Select suffix to a multi stem and cites an update line by its sentence', () => {
    const root = makeFixtureRoot();
    appendFileSync(join(root, QUESTIONS_FILE), MULTI);
    const { index, json } = build(root);
    const chunk = json<ModuleChunk>(index.modules[0]?.chunk ?? '');
    const multi = chunk.questions.find((q) => q.id === 'q-9q4r5s');
    expect(multi?.stem).toBe('Which two habits keep the proofing bill of a small bakery low? (Select TWO.)');
    expect(multi?.select).toBe(2);
    expect(multi?.read).toEqual({
      route: `${LESSON_ROUTE}/paying-by-the-minute`,
      text: 'The fixture guide names a newer billing term.',
    });
    expect(chunk.questions.map((q) => q.id)).toEqual(['q-9q4r5s', 'q-b4k7m2', 'q-d9p4r6']);
    expect(index.questionVersions).toEqual({ 'q-b4k7m2': 1, 'q-9q4r5s': 3, 'q-d9p4r6': 1, ...STEPS });
  });

  it('never ships a retired question or one from the exam pool', () => {
    const root = makeFixtureRoot();
    dropFixtureLab(root);
    for (let i = 0; i < 2; i++) replaceIn(root, QUESTIONS_FILE, 'status: live', 'status: retired');
    expect(build(root).index.questionVersions).toEqual(STEPS);
    const exam = makeFixtureRoot();
    dropFixtureLab(exam);
    for (let i = 0; i < 3; i++) replaceIn(exam, QUESTIONS_FILE, 'pool: practice', 'pool: exam');
    expect(build(exam).index.questionVersions).toEqual(STEPS);
  });

  it('fails when a retired question is still a debrief question of a live lab', () => {
    const root = makeFixtureRoot();
    replaceIn(root, QUESTIONS_FILE, 'status: live', 'status: retired');
    expect(() => build(root)).toThrow(
      'lab-m01-sort-the-bakes: debrief question q-b4k7m2 is not a live practice question; run pnpm content:validate',
    );
  });

  it('fails when a live question cites a line its note does not have', () => {
    const root = makeFixtureRoot();
    replaceIn(root, QUESTIONS_FILE, 'when their queues grow.', 'when their queues grow long.');
    expect(() => build(root)).toThrow(
      'q-b4k7m2 cites a line m01/what-a-bakery-cloud-is does not have; run pnpm content:validate',
    );
  });

  it('gives the same names when built twice', () => {
    expect(build().built.indexFile).toBe(build().built.indexFile);
  });

  it('fails on a link to a page the site does not have', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', '01-baking-basics', '01-what-a-bakery-cloud-is.md'),
      '\n- See [later](02-gone.md).\n',
    );
    expect(() => build(root)).toThrow('link to 02-gone.md has no page on the site');
  });
});

describe('daily incidents in the chunks and the index (spec 2.10, 4.5)', () => {
  it('ships a live incident whose steps are all live in its home chunk and the index', () => {
    const { index, json } = build();
    expect(index.incidents).toEqual([{ id: 'inc-001', title: 'Saturday rush at the harbour', modules: [1] }]);
    const chunk = json<ModuleChunk>(index.modules[0]?.chunk ?? '');
    expect(chunk.incidents.map((i) => [i.id, i.brief.slice(0, 20), i.steps.map((s) => s.id)])).toEqual([
      ['inc-001', 'The harbour branch i', ['q-d2f6h8', 'q-e3g7j9']],
    ]);
    expect(chunk.incidents[0]?.steps[0]?.read.route).toBe(`${LESSON_ROUTE}/shared-kitchen`);
    expect(chunk.questions.map((q) => q.id)).toEqual(['q-b4k7m2', 'q-d9p4r6']);
  });

  it('keeps an incident with a draft step, or a retired incident, out of the chunk, the index and questionVersions', () => {
    const draft = makeFixtureRoot();
    replaceIn(
      draft,
      INCIDENT_FILE,
      '    status: live\n    pool: practice\n    type: single\n    concept: per-minute-rental',
      '    status: draft\n    pool: practice\n    type: single\n    concept: per-minute-rental',
    );
    const retired = makeFixtureRoot();
    replaceIn(retired, INCIDENT_FILE, 'modules: [1]', 'status: retired\nmodules: [1]');
    for (const root of [draft, retired]) {
      const { index, json } = build(root);
      expect(index.incidents).toEqual([]);
      expect(json<ModuleChunk>(index.modules[0]?.chunk ?? '').incidents).toEqual([]);
      expect(index.questionVersions).toEqual({ 'q-b4k7m2': 1, 'q-d9p4r6': 1 });
    }
  });
});

describe('mock forms, ranks, badges and the blueprint in the index', () => {
  const EXAM_IDS = ['q-exa001', 'q-exa002', 'q-exb001', 'q-exc001', 'q-exd001', 'q-exs001'];

  /** A made-up exam item on the fixture lesson; `multi` makes it a Select TWO item. */
  const examItem = (id: string, status: 'live' | 'retired' = 'live', multi = false): string =>
    multi
      ? MULTI.replace('q-9q4r5s', id)
          .replace('version: 3', 'version: 1')
          .replace('pool: practice', 'pool: exam')
      : `
  - id: ${id}
    version: 2
    status: ${status}
    pool: exam
    type: single
    concept: shared-kitchen
    note: m01/what-a-bakery-cloud-is
    task: "1.1"
    level: 2
    stem: A seaside branch runs out of loaves at noon on market days. Which choice fits the bakery cloud?
    options:
      - { id: a, text: Borrow central ovens on market days, correct: true, why: The central kitchen lends ovens when a queue grows. }
      - { id: b, text: Buy a second oven for the branch, why: A second oven idles on quiet days. }
      - { id: c, text: Close the branch at noon, why: Closing turns customers away. }
      - { id: d, text: Bake every loaf the night before, why: Baking early adds no oven time. }
    evidence:
      - Branches use ovens from one central kitchen when their queues grow.
    takeaway: Borrow ovens for a busy day.
`;

  /** The fixture tree plus a pool file with six exam items and forms A to D over five of them. */
  function withExam(root = makeFixtureRoot()): string {
    mkdirSync(join(root, 'content', 'exam', 'pool'), { recursive: true });
    writeFileSync(
      join(root, POOL_FILE),
      `questions:${examItem('q-exa001')}${examItem('q-exa002', 'retired')}${examItem('q-exb001', 'live', true)}${examItem('q-exc001')}${examItem('q-exd001')}${examItem('q-exs001')}`,
    );
    writeFileSync(
      join(root, FORMS_FILE),
      [
        'seed: 20261024',
        'forms:',
        '  - { id: A, frozen: true, qids: [q-exa001, q-exa002] }',
        '  - { id: B, frozen: true, qids: [q-exb001] }',
        '  - { id: C, frozen: false, qids: [q-exc001] }',
        '  - { id: D, frozen: false, qids: [q-exd001] }',
        '',
      ].join('\n'),
    );
    return root;
  }

  it('ships exam items only in their own form chunk', () => {
    const { built, index, json } = build(withExam());
    expect(index.exam.forms.map((f) => [f.id, f.frozen, f.size])).toEqual([
      ['A', true, 1],
      ['B', true, 1],
      ['C', false, 1],
      ['D', false, 1],
    ]);
    const owner: Record<string, string> = { A: 'q-exa001', B: 'q-exb001', C: 'q-exc001', D: 'q-exd001' };
    for (const form of index.exam.forms) {
      expect(form.chunk).toMatch(new RegExp(`^content/exam-${form.id.toLowerCase()}\\.[0-9a-f]{8}\\.json$`));
      const chunk = json<ExamChunk>(form.chunk);
      expect(chunk.form).toBe(form.id);
      expect(chunk.questions.map((q) => q.id)).toEqual([owner[form.id]]);
      const text = built.files.get(form.chunk) ?? '';
      for (const id of EXAM_IDS)
        expect(text.includes(id), `${id} in ${form.chunk}`).toBe(id === owner[form.id]);
    }
    expect(json<ExamChunk>(index.exam.forms[1]?.chunk ?? '').questions[0]).toMatchObject({
      type: 'multi',
      select: 2,
    });
    expect(index.exam.items).toEqual({
      'q-exa001': { version: 2, concept: 'shared-kitchen', task: '1.1', form: 'A', type: 'single' },
      'q-exb001': { version: 1, concept: 'per-minute-rental', task: '4.1', form: 'B', type: 'multi' },
      'q-exc001': { version: 2, concept: 'shared-kitchen', task: '1.1', form: 'C', type: 'single' },
      'q-exd001': { version: 2, concept: 'shared-kitchen', task: '1.1', form: 'D', type: 'single' },
    });
    expect(index.questionVersions).toEqual({ 'q-b4k7m2': 1, 'q-d9p4r6': 1, ...STEPS });
    const { exam: _exam, ...rest } = index;
    const elsewhere = [...built.files]
      .filter(([name]) => !/^content\/(exam-[a-d]|index)\./.test(name))
      .map(([, text]) => text)
      .concat(JSON.stringify(rest));
    for (const id of EXAM_IDS)
      expect(
        elsewhere.some((text) => text.includes(id)),
        id,
      ).toBe(false);
  });

  it('emits no exam chunk without a forms file', () => {
    const { built, index } = build();
    expect(index.exam).toEqual({ forms: [], items: {} });
    expect([...built.files.keys()].filter((name) => name.includes('exam'))).toEqual([]);
  });

  it('lists ranks, badges and the blueprint in the index', () => {
    const { index } = build();
    expect(index.ranks).toEqual([{ id: 'basic', name: 'Basic', short: 'Basic', requires: {}, facts: [] }]);
    expect(index.badges.map((b) => b.id)).toEqual([...BADGE_IDS]);
    for (const badge of index.badges) expect([null, 'labs', 'missions', 'capstone']).toContain(badge.arrives);
    expect(index.blueprint.domains.map((d) => [d.id, d.weight])).toEqual([
      ['1', 24],
      ['2', 30],
      ['3', 34],
      ['4', 12],
    ]);
    expect(index.blueprint.tasks).toHaveLength(19);
    expect(index.blueprint.tasks[0]).toEqual({
      id: '1.1',
      domain: '1',
      text: 'Fixture task statement 1.1',
      short: 'cloud benefits',
    });
    expect(index.blueprint.tasks.find((t) => t.id === '2.3')).toMatchObject({
      domain: '2',
      short: 'access management',
    });
  });
});

describe('concept links and lesson sizes in the index', () => {
  const lessonOf = (index: ContentIndex) => index.modules[0]?.lessons.find((l) => l.slug === LESSON_SLUG);

  it('counts the reading minutes of each lesson and the concepts its check can ask about', () => {
    const lesson = lessonOf(build().index);
    expect(lesson?.minutes).toBe(1);
    expect(lesson?.checkConcepts).toBe(2);
    const root = makeFixtureRoot();
    dropFixtureLab(root);
    replaceIn(
      root,
      QUESTIONS_FILE,
      'id: q-d9p4r6\n    version: 1\n    status: live',
      'id: q-d9p4r6\n    version: 1\n    status: retired',
    );
    expect(lessonOf(build(root).index)?.checkConcepts).toBe(1);
  });

  it('counts a live question filed under an alias for the surviving concept', () => {
    const root = makeFixtureRoot();
    replaceIn(root, CONCEPTS_FILE, 'tasks: ["1.1"]', 'tasks: ["1.1"]\n  aliases: [central-oven]');
    replaceIn(root, QUESTIONS_FILE, 'concept: shared-kitchen', 'concept: central-oven');
    const { index } = build(root);
    expect(index.concepts[0]?.aliases).toEqual(['central-oven']);
    expect(lessonOf(index)?.checkConcepts).toBe(2);
  });

  it('never counts an untested concept, and copies splitFrom', () => {
    const root = makeFixtureRoot();
    replaceIn(root, CONCEPTS_FILE, 'tasks: ["1.1"]', 'tasks: ["1.1"]\n  tested: false');
    replaceIn(root, CONCEPTS_FILE, 'tasks: ["4.1"]', 'tasks: ["4.1"]\n  splitFrom: kitchen-rental');
    const { index } = build(root);
    expect(lessonOf(index)?.checkConcepts).toBe(1);
    expect(index.concepts.map((c) => [c.id, c.tested, c.splitFrom])).toEqual([
      ['shared-kitchen', false, null],
      ['per-minute-rental', true, 'kitchen-rental'],
    ]);
  });
});

describe('readingMinutes', () => {
  it('gives one minute per 200 words, rounded up, and at least one', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('dough '.repeat(200))).toBe(1);
    expect(readingMinutes('dough '.repeat(201))).toBe(2);
    expect(readingMinutes('dough '.repeat(1000))).toBe(5);
  });

  it('counts the text of a link and not its target', () => {
    const link = '[proof](https://example.com/a/b/c/d/e/f/g) ';
    expect(readingMinutes(link.repeat(200))).toBe(1);
    expect(readingMinutes(`${link.repeat(200)}rise`)).toBe(2);
  });
});

describe('confusableLinks', () => {
  const concept = (id: string, confusableWith?: string[]): Concept => ({
    id,
    name: id,
    home: 'm01/what-a-bakery-cloud-is',
    anchor: id,
    tasks: ['1.1'],
    ...(confusableWith === undefined ? {} : { confusableWith }),
  });

  it('makes one-sided links symmetric, own list first, then registry order', () => {
    const links = confusableLinks([concept('rye', ['spelt']), concept('spelt'), concept('oat', ['rye'])]);
    expect(links.get('rye')).toEqual(['spelt', 'oat']);
    expect(links.get('spelt')).toEqual(['rye']);
    expect(links.get('oat')).toEqual(['rye']);
  });

  it('drops duplicates and self links and keeps at most 3', () => {
    const links = confusableLinks([
      concept('rye', ['spelt', 'rye']),
      concept('spelt', ['rye']),
      concept('oat', ['rye']),
      concept('barley', ['rye']),
      concept('millet', ['rye']),
    ]);
    expect(links.get('rye')).toEqual(['spelt', 'oat', 'barley']);
    expect(links.get('spelt')).toEqual(['rye']);
    expect(links.get('millet')).toEqual(['rye']);
  });

  it('gives an empty list to a concept nothing links', () => {
    expect(confusableLinks([concept('rye')]).get('rye')).toEqual([]);
  });
});

describe('labs in the module chunks and the index (spec 2.10, 5.1)', () => {
  const LAB_ROUTE = '#/m/01/lab/lab-m01-sort-the-bakes';

  it('ships the live lab in its module chunk without its solution or wrong paths', () => {
    const { index, json } = build();
    const chunk = json<ModuleChunk>(index.modules[0]?.chunk ?? '');
    expect(chunk.labs.map((l) => l.id)).toEqual(['lab-m01-sort-the-bakes']);
    const lab = chunk.labs[0];
    expect(lab).not.toHaveProperty('solution');
    expect(lab).not.toHaveProperty('wrongPaths');
    expect(lab).toMatchObject({
      id: 'lab-m01-sort-the-bakes',
      module: 1,
      engine: 'sort',
      tier: 'core',
      rev: 1,
      title: 'Sort the bakes',
      minutes: 4,
      concepts: ['shared-kitchen', 'per-minute-rental'],
      goals: bakeryLab().goals,
      notes: [{ route: LESSON_ROUTE, title: 'What a Bakery Cloud Is' }],
      credits: false,
    });
    expect(lab?.spec).toEqual(bakeryLab().spec);
    expect(lab?.debrief.lines).toEqual(bakeryLab().debrief.lines);
    expect(lab?.debrief.questions.map((q) => [q.id, q.read.route])).toEqual([
      ['q-b4k7m2', `${LESSON_ROUTE}/shared-kitchen`],
      ['q-d9p4r6', `${LESSON_ROUTE}/paying-by-the-minute`],
    ]);
  });

  it('lists the lab in the index and finds it in search', () => {
    const { index, json } = build();
    expect(index.labs).toEqual([
      {
        id: 'lab-m01-sort-the-bakes',
        module: 1,
        engine: 'sort',
        tier: 'core',
        rev: 1,
        title: 'Sort the bakes',
        minutes: 4,
      },
    ]);
    const { entries } = json<SearchChunk>(index.search);
    expect(entries.at(-1)).toEqual({
      kind: 'lab',
      title: 'Sort the bakes',
      detail: 'Module 1 lab',
      route: LAB_ROUTE,
      text: normalize(`${bakeryLab().brief} Shared kitchen Per-minute rental`),
    });
  });

  it('marks a lab that mentions lab credits, and leaves out a retired lab', () => {
    const credits = makeFixtureRoot();
    writeLab(
      credits,
      bakeryLab({ brief: `${bakeryLab().brief} Each cabinet costs 2 lab credits a minute.` }),
    );
    const chunk = (root: string) => {
      const { index, json } = build(root);
      return { index, chunk: json<ModuleChunk>(index.modules[0]?.chunk ?? '') };
    };
    expect(chunk(credits).chunk.labs[0]?.credits).toBe(true);
    const retired = makeFixtureRoot();
    writeLab(retired, bakeryLab({ status: 'retired' }));
    const { index, chunk: m01 } = chunk(retired);
    expect(m01.labs).toEqual([]);
    expect(index.labs).toEqual([]);
    expect(index.concepts.some((c) => 'labs' in c)).toBe(false);
  });

  it('fails on a debrief question from the exam pool, naming its id only', () => {
    const root = makeFixtureRoot();
    const exam = singleQuestion({ id: 'q-9d4r6t', pool: 'exam', status: 'live' });
    writePool(root, [exam]);
    writeLab(root, bakeryLab({ debrief: { ...bakeryLab().debrief, questions: ['q-b4k7m2', 'q-9d4r6t'] } }));
    let message = '';
    try {
      build(root);
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe(
      'lab-m01-sort-the-bakes: debrief question q-9d4r6t is not a live practice question; run pnpm content:validate',
    );
    expect(message).not.toContain(exam.stem);
  });
});
