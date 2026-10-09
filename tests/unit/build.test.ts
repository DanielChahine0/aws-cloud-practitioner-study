import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentIndex, ModuleChunk, SearchChunk } from '../../schemas/chunks.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { normalize } from '../../src/app/search.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const LESSON_ROUTE = '#/m/01/l/what-a-bakery-cloud-is';
const QUESTIONS_FILE = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';

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
      },
      {
        id: 'per-minute-rental',
        name: 'Per-minute rental',
        home: 'm01/what-a-bakery-cloud-is',
        anchor: 'paying-by-the-minute',
        tested: true,
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
    expect(chunk.questions.map((q) => q.id)).toEqual(['q-7k2m9p']);
    const single = chunk.questions[0];
    expect(single).toMatchObject({
      id: 'q-7k2m9p',
      version: 1,
      type: 'single',
      concept: 'shared-kitchen',
      note: 'm01/what-a-bakery-cloud-is',
      task: '1.1',
      level: 2,
      select: null,
      pairs: [],
      takeaway: 'Borrow shared capacity for a rush and hand it back afterwards.',
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
    expect(single?.stem).toMatch(/^A chain of bakeries .* Which approach fits best\?$/);
    expect(index.questionVersions).toEqual({ 'q-7k2m9p': 1 });
  });

  it('ships the draft match only once it is live, with its pairs in authored order', () => {
    expect(build().index.questionVersions).not.toHaveProperty('q-8n3p4r');
    const root = makeFixtureRoot();
    replaceIn(root, QUESTIONS_FILE, 'status: draft', 'status: live');
    const { index, json } = build(root);
    const chunk = json<ModuleChunk>(index.modules[0]?.chunk ?? '');
    const match = chunk.questions.find((q) => q.id === 'q-8n3p4r');
    expect(match?.options).toEqual([]);
    expect(match?.pairs.map((p) => p.left)).toEqual([
      'Dough rising for forty minutes',
      'An empty cabinet overnight',
      'Two batches rising together for ten minutes',
    ]);
    expect(match?.read.route).toBe(`${LESSON_ROUTE}/paying-by-the-minute`);
    expect(index.questionVersions).toEqual({ 'q-7k2m9p': 1, 'q-8n3p4r': 1 });
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
    expect(chunk.questions.map((q) => q.id)).toEqual(['q-7k2m9p', 'q-9q4r5s']);
    expect(index.questionVersions).toEqual({ 'q-7k2m9p': 1, 'q-9q4r5s': 3 });
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
      'q-7k2m9p cites a line m01/what-a-bakery-cloud-is does not have; run pnpm content:validate',
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
