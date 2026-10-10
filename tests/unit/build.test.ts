import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentIndex, ModuleChunk, SearchChunk } from '../../schemas/chunks.ts';
import type { Concept } from '../../schemas/concept.ts';
import { buildContent, confusableLinks, readingMinutes } from '../../scripts/content/build.ts';
import { CONCEPTS_FILE, loadContext } from '../../scripts/content/lib/context.ts';
import { normalize } from '../../src/app/search.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const LESSON_ROUTE = '#/m/01/l/what-a-bakery-cloud-is';
const QUESTIONS_FILE = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';
const LESSON_SLUG = 'what-a-bakery-cloud-is';

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
    expect(index.missions[0]?.html).toContain('<h2 id="goal">Goal</h2>');
  });

  it('writes a search chunk with a normalized entry per module, lesson, concept, term and mission', () => {
    const { index, json } = build();
    const { entries } = json<SearchChunk>(index.search);
    expect(entries.map((e) => `${e.kind} ${e.route}`)).toEqual([
      'module #/m/01',
      `lesson ${LESSON_ROUTE}`,
      `concept ${LESSON_ROUTE}/shared-kitchen`,
      `concept ${LESSON_ROUTE}/paying-by-the-minute`,
      `term ${LESSON_ROUTE}`,
      'mission #/missions/mission-00',
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
    expect(chunk.questions.map((q) => q.id)).toEqual(['q-b4k7m2']);
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
    expect(index.questionVersions).toEqual({ 'q-b4k7m2': 1 });
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
    expect(index.questionVersions).toEqual({ 'q-b4k7m2': 1, 'q-c8n3p5': 1 });
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
    expect(chunk.questions.map((q) => q.id)).toEqual(['q-9q4r5s', 'q-b4k7m2']);
    expect(index.questionVersions).toEqual({ 'q-b4k7m2': 1, 'q-9q4r5s': 3 });
  });

  it('never ships a retired question or one from the exam pool', () => {
    const root = makeFixtureRoot();
    replaceIn(root, QUESTIONS_FILE, 'status: live', 'status: retired');
    expect(build(root).index.questionVersions).toEqual({});
    const exam = makeFixtureRoot();
    replaceIn(exam, QUESTIONS_FILE, 'pool: practice', 'pool: exam');
    expect(build(exam).index.questionVersions).toEqual({});
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

describe('concept links and lesson sizes in the index', () => {
  const lessonOf = (index: ContentIndex) => index.modules[0]?.lessons.find((l) => l.slug === LESSON_SLUG);

  it('counts the reading minutes of each lesson and the concepts its check can ask about', () => {
    const lesson = lessonOf(build().index);
    expect(lesson?.minutes).toBe(1);
    expect(lesson?.checkConcepts).toBe(1);
    const root = makeFixtureRoot();
    replaceIn(root, QUESTIONS_FILE, 'status: draft', 'status: live');
    expect(lessonOf(build(root).index)?.checkConcepts).toBe(2);
  });

  it('counts a live question filed under an alias for the surviving concept', () => {
    const root = makeFixtureRoot();
    replaceIn(root, CONCEPTS_FILE, 'tasks: ["1.1"]', 'tasks: ["1.1"]\n  aliases: [central-oven]');
    replaceIn(root, QUESTIONS_FILE, 'concept: shared-kitchen', 'concept: central-oven');
    const { index } = build(root);
    expect(index.concepts[0]?.aliases).toEqual(['central-oven']);
    expect(lessonOf(index)?.checkConcepts).toBe(1);
  });

  it('never counts an untested concept, and copies splitFrom', () => {
    const root = makeFixtureRoot();
    replaceIn(root, CONCEPTS_FILE, 'tasks: ["1.1"]', 'tasks: ["1.1"]\n  tested: false');
    replaceIn(root, CONCEPTS_FILE, 'tasks: ["4.1"]', 'tasks: ["4.1"]\n  splitFrom: kitchen-rental');
    const { index } = build(root);
    expect(lessonOf(index)?.checkConcepts).toBe(0);
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
