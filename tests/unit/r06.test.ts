import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { bakeryLab, writeLab } from '../fixtures/labs.ts';
import { POOL_FILE, singleQuestion, writePool } from '../fixtures/questions.ts';

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const CONCEPTS = 'content/concepts.yaml';

function r06(edit: (root: string) => void): string[] {
  const root = makeFixtureRoot();
  edit(root);
  return runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R6']).findings.map((f) => f.message);
}

describe('R6 references', () => {
  it('reports a broken relative link', () => {
    expect(
      r06((root) => replaceIn(root, LESSON, 'dough proofs.', 'dough proofs, see [later](02-missing.md).')),
    ).toEqual(['broken link 02-missing.md']);
  });

  it('reports an anchor that is not an H3 under ## Notes', () => {
    expect(r06((root) => replaceIn(root, CONCEPTS, 'anchor: shared-kitchen', 'anchor: objectives'))).toEqual([
      "[shared-kitchen] anchor 'objectives' is not an H3 under ## Notes in m01/what-a-bakery-cloud-is",
    ]);
  });

  it('reports a home note that does not list the concept, and a missing home note', () => {
    expect(r06((root) => replaceIn(root, LESSON, '  - shared-kitchen\n', ''))).toEqual([
      '[shared-kitchen] home note m01/what-a-bakery-cloud-is does not list it in concepts',
      'q-d2f6h8: note m01/what-a-bakery-cloud-is does not list concept shared-kitchen',
      'q-b4k7m2: note m01/what-a-bakery-cloud-is does not list concept shared-kitchen',
    ]);
    expect(
      r06((root) =>
        replaceIn(
          root,
          CONCEPTS,
          'home: m01/what-a-bakery-cloud-is\n  anchor: shared-kitchen',
          'home: m01/nowhere\n  anchor: shared-kitchen',
        ),
      ),
    ).toEqual(['[shared-kitchen] home note m01/nowhere does not exist']);
  });

  it('reports frontmatter that disagrees with the file path', () => {
    expect(
      r06((root) => replaceIn(root, LESSON, 'slug: what-a-bakery-cloud-is', 'slug: bakery-cloud')),
    ).toEqual(["frontmatter slug 'bakery-cloud' does not match the file name"]);
  });

  it('reports a confusable that is not another registered concept', () => {
    expect(
      r06((root) =>
        replaceIn(
          root,
          CONCEPTS,
          'confusableWith: [shared-kitchen]',
          'confusableWith: [per-minute-rental, rye-bread]',
        ),
      ),
    ).toEqual([
      "[per-minute-rental] confusableWith 'per-minute-rental' is not another registered concept",
      "[per-minute-rental] confusableWith 'rye-bread' is not another registered concept",
    ]);
  });

  it('reports module, lesson and mission numbers that disagree with the file path', () => {
    expect(
      r06((root) => replaceIn(root, 'resources/01-baking-basics/README.md', 'module: 1\n', 'module: 2\n')),
    ).toEqual(['frontmatter module 2 does not match the folder']);
    expect(r06((root) => replaceIn(root, LESSON, 'lesson: 1\n', 'lesson: 3\n'))).toEqual([
      'frontmatter lesson 3 does not match the file number',
    ]);
    expect(
      r06((root) =>
        replaceIn(root, 'content/missions/mission-00-guardrails.md', 'id: mission-00', 'id: mission-01'),
      ),
    ).toEqual(["id 'mission-01' does not match the file name"]);
  });

  it('reports two lessons with one note id and still checks the tags of both', () => {
    const root = makeFixtureRoot();
    const text = readFileSync(join(root, LESSON), 'utf8');
    writeFileSync(
      join(root, 'resources/01-baking-basics/02-what-a-bakery-cloud-is.md'),
      text.replace('lesson: 1\n', 'lesson: 2\n'),
    );
    replaceIn(root, LESSON, '  - per-minute-rental\n', '  - per-minute-rental\n  - sourdough-starter\n');
    const findings = runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R6']).findings;
    expect(findings.map((f) => `${f.file} ${f.message}`)).toEqual([
      `${LESSON} concept tag 'sourdough-starter' is not registered in ${CONCEPTS}`,
      `resources/01-baking-basics/02-what-a-bakery-cloud-is.md note id 'm01/what-a-bakery-cloud-is' is already used by ${LESSON}`,
    ]);
  });
});

describe('R6 question references', () => {
  const QUESTIONS = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';
  const inQuestions = (from: string, to: string) => (root: string) => replaceIn(root, QUESTIONS, from, to);

  it('passes a question concept given by alias', () => {
    expect(
      r06((root) => {
        replaceIn(root, CONCEPTS, '  tasks: ["1.1"]\n', '  tasks: ["1.1"]\n  aliases: [shared-oven]\n');
        replaceIn(root, QUESTIONS, '    concept: shared-kitchen\n', '    concept: shared-oven\n');
      }),
    ).toEqual([]);
  });

  it('reports a question concept that is not registered or not tested', () => {
    expect(r06(inQuestions('    concept: shared-kitchen\n', '    concept: rye-bread\n'))).toEqual([
      'lab-m01-sort-the-bakes: debrief question q-b4k7m2 is on rye-bread, which the lab does not list',
      "q-b4k7m2: concept 'rye-bread' is not registered",
    ]);
    expect(
      r06((root) => replaceIn(root, CONCEPTS, '  tasks: ["4.1"]\n', '  tasks: ["4.1"]\n  tested: false\n')),
    ).toEqual([
      "inc-001: concept 'per-minute-rental' is marked tested: false",
      "q-e3g7j9: concept 'per-minute-rental' is marked tested: false",
      "lab-m01-sort-the-bakes: concept 'per-minute-rental' is marked tested: false",
      "kp-01-pay-only-while-proofing: concept 'per-minute-rental' is marked tested: false",
      "kp-01-give-capacity-back: concept 'per-minute-rental' is marked tested: false",
      "kp-01-name-the-billing-term: concept 'per-minute-rental' is marked tested: false",
      "q-c8n3p5: concept 'per-minute-rental' is marked tested: false",
      "q-d9p4r6: concept 'per-minute-rental' is marked tested: false",
    ]);
  });

  it('reports a question note that is not its file, or does not list the concept', () => {
    expect(
      r06(inQuestions('    note: m01/what-a-bakery-cloud-is\n', '    note: m01/another-lesson\n')),
    ).toEqual(['q-b4k7m2: note m01/another-lesson does not exist']);
    expect(
      r06(inQuestions('    note: m01/what-a-bakery-cloud-is\n', '    note: m01/what-a-bakery-cloud\n')),
    ).toEqual(['q-b4k7m2: note m01/what-a-bakery-cloud does not exist']);
  });

  it("reports a question file whose path is not its lesson's path", () => {
    const moveTo = (to: string) => (root: string) => {
      mkdirSync(dirname(join(root, to)), { recursive: true });
      renameSync(join(root, QUESTIONS), join(root, to));
    };
    const misplaced = (id: string): string =>
      `${id}: note m01/what-a-bakery-cloud-is keeps its questions in ${QUESTIONS}, not in this file`;
    expect(r06(moveTo('content/questions/01-typo/01-what-a-bakery-cloud-is.yaml'))).toEqual([
      misplaced('q-b4k7m2'),
      misplaced('q-c8n3p5'),
      misplaced('q-d9p4r6'),
    ]);
    expect(r06(moveTo('content/questions/01-baking-basics/09-what-a-bakery-cloud-is.yaml'))).toEqual([
      misplaced('q-b4k7m2'),
      misplaced('q-c8n3p5'),
      misplaced('q-d9p4r6'),
    ]);
    expect(r06((root) => replaceIn(root, LESSON, '  - per-minute-rental\n', ''))).toEqual([
      '[per-minute-rental] home note m01/what-a-bakery-cloud-is does not list it in concepts',
      'q-e3g7j9: note m01/what-a-bakery-cloud-is does not list concept per-minute-rental',
      'q-c8n3p5: note m01/what-a-bakery-cloud-is does not list concept per-minute-rental',
      'q-d9p4r6: note m01/what-a-bakery-cloud-is does not list concept per-minute-rental',
    ]);
  });

  it("reports a question task that is not one of its concept's tasks", () => {
    expect(r06(inQuestions('    task: "4.1"\n', '    task: "1.1"\n'))).toEqual([
      "q-c8n3p5: task 1.1 is not one of per-minute-rental's tasks (4.1)",
    ]);
  });
});

describe('R6 exam-pool references', () => {
  const r06Pool = (over: Parameters<typeof singleQuestion>[0]): string[] => {
    const root = makeFixtureRoot();
    writePool(root, [singleQuestion({ id: 'q-9d4r6t', pool: 'exam', ...over })]);
    return runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R6']).findings.map(
      (f) => `${f.file}  ${f.message}`,
    );
  };

  it("accepts a pool item outside its note's question file", () => {
    expect(r06Pool({})).toEqual([]);
  });

  it('keeps every other reference check for pool items', () => {
    expect(r06Pool({ task: '4.1' })).toEqual([
      `${POOL_FILE}  q-9d4r6t: task 4.1 is not one of shared-kitchen's tasks (1.1)`,
    ]);
    expect(r06Pool({ concept: 'rye-bread' })).toEqual([
      `${POOL_FILE}  q-9d4r6t: concept 'rye-bread' is not registered`,
    ]);
  });
});

describe('R6 lab references (spec 5.1)', () => {
  const LAB = 'lab-m01-sort-the-bakes';
  const withLab = (over: Parameters<typeof bakeryLab>[0]) => (root: string) =>
    writeLab(root, bakeryLab(over));
  const debrief = (questions: string[]) => ({ ...bakeryLab().debrief, questions });

  it('passes the fixture lab, a concept given by alias and a retired lab with broken references', () => {
    expect(r06(() => {})).toEqual([]);
    expect(
      r06((root) => {
        replaceIn(root, CONCEPTS, '  tasks: ["1.1"]\n', '  tasks: ["1.1"]\n  aliases: [shared-oven]\n');
        writeLab(root, bakeryLab({ concepts: ['shared-oven', 'per-minute-rental'] }));
      }),
    ).toEqual([]);
    expect(r06(withLab({ status: 'retired', concepts: ['rye-bread'], notes: ['m01/gone'] }))).toEqual([]);
  });

  it('reports a concept that is not registered or not tested, and a note that does not exist', () => {
    expect(r06(withLab({ concepts: ['shared-kitchen', 'per-minute-rental', 'rye-bread'] }))).toEqual([
      `${LAB}: concept 'rye-bread' is not registered`,
    ]);
    expect(r06(withLab({ notes: ['m01/what-a-bakery-cloud-is', 'm01/gone'] }))).toEqual([
      `${LAB}: note m01/gone is not a note`,
    ]);
  });

  it('reports a debrief question that is a draft or an exam item by id only', () => {
    expect(r06(withLab({ debrief: debrief(['q-b4k7m2', 'q-c8n3p5']) }))).toEqual([
      `${LAB}: debrief question q-c8n3p5 is not a live practice question`,
    ]);
    const exam = singleQuestion({ id: 'q-9d4r6t', pool: 'exam', status: 'live' });
    const findings = r06((root) => {
      writePool(root, [exam]);
      writeLab(root, bakeryLab({ debrief: debrief(['q-b4k7m2', 'q-9d4r6t']) }));
    });
    expect(findings).toEqual([`${LAB}: debrief question q-9d4r6t is not a live practice question`]);
    expect(findings.join('\n')).not.toContain(exam.stem);
  });

  it('reports a debrief question on a concept the lab does not list', () => {
    expect(r06(withLab({ concepts: ['shared-kitchen'] }))).toEqual([
      `${LAB}: debrief question q-d9p4r6 is on per-minute-rental, which the lab does not list`,
    ]);
  });
});

describe('R6 incident references (spec 4.5)', () => {
  const INCIDENT = 'content/incidents/inc-001.yaml';

  it("passes the fixture incident, whose steps live outside their note's question file", () => {
    expect(r06(() => {})).toEqual([]);
  });

  it('reports a step on a concept the incident does not list, and an incident concept that is not registered', () => {
    expect(
      r06((root) =>
        replaceIn(
          root,
          INCIDENT,
          'concepts: [shared-kitchen, per-minute-rental]',
          'concepts: [shared-kitchen]',
        ),
      ),
    ).toEqual(['inc-001: step q-e3g7j9 is on per-minute-rental, which the incident does not list']);
    expect(
      r06((root) =>
        replaceIn(
          root,
          INCIDENT,
          'concepts: [shared-kitchen, per-minute-rental]',
          'concepts: [shared-kitchen, per-minute-rental, rye-bread]',
        ),
      ),
    ).toEqual(["inc-001: concept 'rye-bread' is not registered"]);
  });

  it('reports a lab debrief question that is an incident step, by id only', () => {
    const debrief = { ...bakeryLab().debrief, questions: ['q-b4k7m2', 'q-e3g7j9'] };
    expect(r06((root) => writeLab(root, bakeryLab({ debrief })))).toEqual([
      'lab-m01-sort-the-bakes: debrief question q-e3g7j9 is not a live practice question',
    ]);
  });

  it('skips the incident checks of a retired incident', () => {
    expect(
      r06((root) => {
        replaceIn(root, INCIDENT, 'modules: [1]', 'status: retired\nmodules: [1]');
        replaceIn(
          root,
          INCIDENT,
          'concepts: [shared-kitchen, per-minute-rental]',
          'concepts: [shared-kitchen]',
        );
      }),
    ).toEqual([]);
  });
});
