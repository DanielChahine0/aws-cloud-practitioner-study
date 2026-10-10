import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import {
  agentVersion,
  demoteKeyPoints,
  draftProblems,
  editKeyPointFile,
  gradeKeyPoints,
  KP_RESULTS_DIR,
  type KpBatch,
  keyPointReport,
  kpCandidates,
  lintKpAnswers,
  moduleConcepts,
  prepareKeyPoints,
  readKpFailures,
  readKpPasses,
  stampKeyPoints,
} from '../../scripts/content/lib/key-point-checks.ts';
import { keyPointHash, projectOf } from '../../scripts/content/lib/project.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const KEY_POINTS = 'content/project/key-points/01-baking-basics.yaml';
const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const LIVE = 'kp-01-borrow-on-busy-days';
const PROOFING = 'kp-01-pay-only-while-proofing';
const CAPACITY = 'kp-01-give-capacity-back';
const BILLING = 'kp-01-name-the-billing-term';
const DRAFTS = [PROOFING, CAPACITY, BILLING];
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** A fixture root with the key point critic prompt at version 1. */
function fixtureRoot(): string {
  const root = makeFixtureRoot();
  mkdirSync(join(root, 'agents'), { recursive: true });
  writeFileSync(
    join(root, 'agents', 'key-point-critic.md'),
    '---\nname: key-point-critic\nversion: 1\n---\n\n# Key point critic\n',
  );
  return root;
}
const ctxOf = (root: string): Context => loadContext(root, { today: FIXTURE_TODAY });
const hashOf = (root: string, id: string): string => {
  const entry = projectOf(ctxOf(root)).keyPoints.find((e) => e.kp.id === id);
  if (entry === undefined) throw new Error(`${id} is not in the fixture`);
  return keyPointHash(entry.kp);
};
const results = (root: string, ...parts: string[]): string => join(root, KP_RESULTS_DIR, ...parts);
const writeJson = (path: string, value: unknown): void => {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** Writes a key point file for one module holding `count` drafts that cite the fixture note. */
function writeDrafts(root: string, module: number, count: number): void {
  const lines = [`module: ${module}`, 'keyPoints:'];
  for (let i = 1; i <= count; i++) {
    lines.push(
      `  - id: kp-${pad2(module)}-point-${i}`,
      '    status: draft',
      `    text: Draft key point ${i} keeps decision ${module} of the bakery plan grounded.`,
      '    concepts: [shared-kitchen]',
      '    evidence: Branches use ovens from one central kitchen when their queues grow.',
    );
  }
  writeFileSync(
    join(root, `content/project/key-points/${pad2(module)}-module-${module}.yaml`),
    `${lines.join('\n')}\n`,
  );
}

/** Answers every key point of a prepared batch, failing the ids in `fail` on accuracy. */
function answer(root: string, batch: string, fail: readonly string[] = []): string {
  const file = results(root, 'batches', `${batch}.json`);
  const { keyPoints } = JSON.parse(readFileSync(file, 'utf8')) as KpBatch;
  const answers = keyPoints.map(({ id }) => ({
    id,
    accurate: !fail.includes(id),
    grounded: true,
    fitsBrief: true,
    currentNames: true,
    problems: fail.includes(id) ? ['The text overstates the saving.'] : [],
  }));
  const out = results(root, 'answers', `${batch}.json`);
  writeJson(out, { batch, answers });
  return out;
}

/** The key point maps of the fixture file by id. */
const keyPointsIn = (root: string): Map<string, Record<string, unknown>> =>
  new Map(
    (
      parse(readFileSync(join(root, KEY_POINTS), 'utf8')) as { keyPoints: Record<string, unknown>[] }
    ).keyPoints.map((k) => [k.id as string, k] as const),
  );

describe('kpCandidates', () => {
  it('takes the drafts and skips the live key point stamped at its hash', () => {
    const root = fixtureRoot();
    expect(kpCandidates(ctxOf(root), {}, []).map((e) => e.kp.id)).toEqual(DRAFTS);
  });

  it('takes a live key point whose text changed after its stamp', () => {
    const root = fixtureRoot();
    replaceIn(root, KEY_POINTS, 'idles all week.', 'idles every week.');
    expect(kpCandidates(ctxOf(root), {}, []).map((e) => e.kp.id)).toEqual([LIVE, ...DRAFTS]);
  });

  it('skips retired items, 3 attempts, a failure at the current hash and a pass at the current hash', () => {
    const root = fixtureRoot();
    replaceIn(
      root,
      KEY_POINTS,
      '    evidence: Borrow capacity when busy and give it back when quiet.\n',
      '    evidence: Borrow capacity when busy and give it back when quiet.\n    review:\n      attempts: 3\n      lastFailure: "critic: vague"\n  - id: kp-01-old-point\n    status: retired\n    text: An old point that the bakery plan no longer needs at all.\n    concepts: [shared-kitchen]\n    evidence: Branches use ovens from one central kitchen when their queues grow.\n',
    );
    const failures = [{ id: PROOFING, hash: hashOf(root, PROOFING), reason: 'too vague' }];
    const passes = { [`${BILLING} critic@1 ${hashOf(root, BILLING)}`]: FIXTURE_TODAY };
    expect(kpCandidates(ctxOf(root), passes, failures)).toEqual([]);
    expect(kpCandidates(ctxOf(root), {}, []).map((e) => e.kp.id)).toEqual([PROOFING, BILLING]);
  });
});

describe('prepareKeyPoints', () => {
  it('deals the candidates into batches of at most 10 with their decision, the facts and concept names', () => {
    const root = fixtureRoot();
    for (const m of [2, 3, 4]) writeDrafts(root, m, 6);
    const paths = prepareKeyPoints(ctxOf(root), 701);
    expect(paths).toEqual([1, 2, 3].map((n) => `${KP_RESULTS_DIR}/batches/kp-critic-0${n}.json`));
    const batches = paths.map((p) => JSON.parse(readFileSync(join(root, p), 'utf8')) as KpBatch);
    expect(batches.map((b) => b.keyPoints.length)).toEqual([10, 10, 1]);
    const all = batches.flatMap((b) => b.keyPoints);
    expect(new Set(all.map((k) => k.id)).size).toBe(21);
    const proofing = all.find((k) => k.id === PROOFING);
    expect(proofing).toEqual({
      id: PROOFING,
      module: 1,
      decision: {
        title: 'Ovens for the first branch',
        prompt: 'Choose how the first branch borrows ovens from the shared kitchen.',
        context: [
          'The bakery runs one branch today.',
          'Saturday queues are three times longer than weekday queues.',
        ],
      },
      facts: expect.arrayContaining(['One baker also looks after the ovens and the till.']),
      text: 'Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.',
      concepts: [{ id: 'per-minute-rental', name: 'Per-minute rental' }],
      evidence: 'Cabinets are billed only while dough proofs.',
    });
    expect(proofing?.facts).toHaveLength(7);
    expect(all.find((k) => k.id === 'kp-03-point-2')?.decision.title).toBe('Delivery bikes');
    const prepared = JSON.parse(readFileSync(results(root, 'prepared.json'), 'utf8')) as Record<
      string,
      Record<string, string>
    >;
    expect(prepared['kp-critic-03']).toEqual({
      [batches[2]?.keyPoints[0]?.id ?? '']: expect.stringMatching(/^[0-9a-f]{12}$/),
    });
  });

  it('orders batches by the seed and wipes old batches and answers', () => {
    const root = fixtureRoot();
    for (const m of [2, 3]) writeDrafts(root, m, 6);
    const read = (): string[] =>
      prepareKeyPoints(ctxOf(root), 702).map((p) => readFileSync(join(root, p), 'utf8'));
    writeJson(results(root, 'answers', 'kp-critic-09.json'), { batch: 'kp-critic-09', answers: [] });
    const first = read();
    expect(read()).toEqual(first);
    expect(existsSync(results(root, 'answers', 'kp-critic-09.json'))).toBe(false);
  });

  it('refuses to prepare without a brief', () => {
    const root = fixtureRoot();
    replaceIn(root, 'content/project/brief.yaml', 'passTotal: 8', 'passTotal: 9');
    expect(() => prepareKeyPoints(ctxOf(root), 703)).toThrow(
      'content/project/brief.yaml is missing or fails R1; fix it before preparing key point batches',
    );
  });
});

describe('lintKpAnswers', () => {
  it('prints OK for a complete answer file', () => {
    const root = fixtureRoot();
    prepareKeyPoints(ctxOf(root), 701);
    expect(lintKpAnswers(root, answer(root, 'kp-critic-01', [CAPACITY]))).toBe('OK');
  });

  it('names the first problem', () => {
    const root = fixtureRoot();
    prepareKeyPoints(ctxOf(root), 701);
    const file = results(root, 'answers', 'kp-critic-01.json');
    const yes = { accurate: true, grounded: true, fitsBrief: true, currentNames: true, problems: [] };
    const lint = (answers: unknown[], batch = 'kp-critic-01', at = file): string => {
      writeJson(at, { batch, answers });
      return lintKpAnswers(root, at);
    };
    expect(
      lint([
        { id: PROOFING, ...yes },
        { id: CAPACITY, ...yes },
      ]),
    ).toBe(`kp-critic-01: no answer for ${BILLING}`);
    expect(lint([{ id: PROOFING, ...yes, grounded: false }])).toBe(
      `kp-critic-01: ${PROOFING}: name each problem in problems when a check is false`,
    );
    expect(lint([{ id: 'kp-01-nope', ...yes }])).toBe('kp-critic-01: kp-01-nope is not in this batch');
    expect(
      lint([
        { id: PROOFING, ...yes },
        { id: PROOFING, ...yes },
      ]),
    ).toBe(`kp-critic-01: ${PROOFING} is answered twice`);
    expect(lint([{ id: PROOFING, ...yes, solid: true }])).toBe(
      `kp-critic-01: answer 1: (root): Unrecognized key: "solid"`,
    );
    expect(lint([], 'kp-critic-07')).toBe(`${file}: batch 'kp-critic-07' was not prepared`);
    expect(lint([], 'kp-critic-01', results(root, 'answers', 'other.json'))).toBe(
      `${results(root, 'answers', 'other.json')}: answers to kp-critic-01 belong in kp-critic-01.json`,
    );
  });
});

describe('gradeKeyPoints and stampKeyPoints', () => {
  it('stamps passes live and records a failure in the review block once', () => {
    const root = fixtureRoot();
    prepareKeyPoints(ctxOf(root), 701);
    answer(root, 'kp-critic-01', [CAPACITY]);
    expect(gradeKeyPoints(root, FIXTURE_TODAY)).toEqual({ passed: 2, failed: 1 });
    expect(readKpPasses(root)).toEqual({
      [`${PROOFING} critic@1 ${hashOf(root, PROOFING)}`]: FIXTURE_TODAY,
      [`${BILLING} critic@1 ${hashOf(root, BILLING)}`]: FIXTURE_TODAY,
    });
    expect(readKpFailures(root)).toEqual([
      { id: CAPACITY, hash: hashOf(root, CAPACITY), reason: 'The text overstates the saving.' },
    ]);
    expect(stampKeyPoints(ctxOf(root), FIXTURE_TODAY)).toEqual({
      live: 3,
      revise: [KEY_POINTS],
      needsDani: [],
    });
    const kps = keyPointsIn(root);
    expect(kps.get(PROOFING)).toMatchObject({
      status: 'live',
      verified: { fullHash: hashOf(root, PROOFING), checks: ['critic@1'], on: FIXTURE_TODAY },
    });
    expect(kps.get(CAPACITY)).toMatchObject({
      status: 'draft',
      review: { attempts: 1, lastFailure: 'critic: The text overstates the saving.' },
    });
    expect(stampKeyPoints(ctxOf(root), FIXTURE_TODAY)).toEqual({
      live: 3,
      revise: [KEY_POINTS],
      needsDani: [],
    });
    expect(keyPointsIn(root).get(CAPACITY)).toMatchObject({ review: { attempts: 1 } });
    expect(runRules(ctxOf(root), ['R1', 'R5', 'R8', 'R9']).findings).toEqual([]);
  });

  it('lists a key point for Dani after its third failed round', () => {
    const root = fixtureRoot();
    replaceIn(
      root,
      KEY_POINTS,
      '    evidence: Borrow capacity when busy and give it back when quiet.\n',
      '    evidence: Borrow capacity when busy and give it back when quiet.\n    review:\n      attempts: 2\n      lastFailure: "critic: vague"\n',
    );
    prepareKeyPoints(ctxOf(root), 701);
    answer(root, 'kp-critic-01', [CAPACITY]);
    gradeKeyPoints(root, FIXTURE_TODAY);
    expect(stampKeyPoints(ctxOf(root), FIXTURE_TODAY)).toEqual({
      live: 3,
      revise: [],
      needsDani: [CAPACITY],
    });
    expect(kpCandidates(ctxOf(root), readKpPasses(root), readKpFailures(root))).toEqual([]);
  });

  it('never stamps a key point whose evidence is not in its home note', () => {
    const root = fixtureRoot();
    replaceIn(
      root,
      KEY_POINTS,
      'evidence: Cabinets are billed only while dough proofs.',
      'evidence: Cabinets are free.',
    );
    prepareKeyPoints(ctxOf(root), 701);
    answer(root, 'kp-critic-01');
    gradeKeyPoints(root, FIXTURE_TODAY);
    expect(stampKeyPoints(ctxOf(root), FIXTURE_TODAY).live).toBe(3);
    expect(keyPointsIn(root).get(PROOFING)?.status).toBe('draft');
  });
});

describe('demoteKeyPoints', () => {
  it('moves a live key point whose evidence left its note back to draft', () => {
    const root = fixtureRoot();
    replaceIn(
      root,
      LESSON,
      '- Branches use ovens from one central kitchen',
      '- Branches borrow ovens from one central kitchen',
    );
    expect(demoteKeyPoints(ctxOf(root))).toEqual([
      `demoted ${LIVE} (${KEY_POINTS}): its evidence no longer matches the home note of any of its concepts`,
    ]);
    const kp = keyPointsIn(root).get(LIVE);
    expect(kp).toMatchObject({
      status: 'draft',
      review: {
        attempts: 1,
        lastFailure:
          'evidence: the evidence line is no longer a whole line of the home note of any of its concepts',
      },
    });
    expect(kp?.verified).toBeUndefined();
    expect(demoteKeyPoints(ctxOf(root))).toEqual([]);
  });
});

describe('editKeyPointFile', () => {
  const text = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'content-root', KEY_POINTS), 'utf8');

  it('splices only the edited keys and keeps comments and other key points byte for byte', () => {
    const out = editKeyPointFile(
      text,
      new Map([
        [
          PROOFING,
          { status: 'live', verified: { fullHash: 'abcdefabcdef', checks: ['critic@1'], on: '2026-10-11' } },
        ],
      ]),
    );
    expect(out).toBe(
      text
        .replace('    status: draft\n    text: Proofing', '    status: live\n    text: Proofing')
        .replace(
          '    evidence: Cabinets are billed only while dough proofs.\n',
          '    evidence: Cabinets are billed only while dough proofs.\n    verified:\n      fullHash: abcdefabcdef\n      checks: [ critic@1 ]\n      on: 2026-10-11\n',
        ),
    );
  });

  it('removes a key on null and throws on an unknown id', () => {
    const out = editKeyPointFile(text, new Map([[LIVE, { verified: null }]]));
    expect(out).toBe(text.replace(/ {4}verified:\n(?: {6}.*\n){3}/, ''));
    expect(() => editKeyPointFile(text, new Map([['kp-01-nope', { status: 'live' }]]))).toThrow(
      'kp-01-nope is not in this file',
    );
  });
});

describe('the key point report, module concepts and the draft check', () => {
  it('counts key points and lists modules under 4 live', () => {
    expect(keyPointReport(ctxOf(fixtureRoot()))).toEqual([
      'Key points: 1 live, 3 draft, 0 retired',
      'Modules under 4 live: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13',
    ]);
  });

  it('lists the tested concepts homed in a module', () => {
    const ctx = ctxOf(fixtureRoot());
    expect(moduleConcepts(ctx, 1)).toEqual([
      { id: 'shared-kitchen', name: 'Shared kitchen', home: 'm01/what-a-bakery-cloud-is' },
      { id: 'per-minute-rental', name: 'Per-minute rental', home: 'm01/what-a-bakery-cloud-is' },
    ]);
    expect(moduleConcepts(ctx, 2)).toEqual([]);
  });

  it('checks one file the way R1, R5 and R8 will, drafts included', () => {
    const root = fixtureRoot();
    expect(draftProblems(ctxOf(root), KEY_POINTS)).toEqual([]);
    replaceIn(
      root,
      KEY_POINTS,
      'evidence: Cabinets are billed only while dough proofs.',
      'evidence: Cabinets are free.',
    );
    replaceIn(root, KEY_POINTS, 'back to the shared kitchen.', 'back. The kitchen lends them on.');
    replaceIn(
      root,
      KEY_POINTS,
      'newer billing term that',
      `newer billing term ${String.fromCodePoint(0x2014)} the one that`,
    );
    expect(draftProblems(ctxOf(root), KEY_POINTS)).toEqual([
      '25: em dash (U+2014); use a plain hyphen',
      `${PROOFING}: evidence is not a whole line of the home note of any of its concepts`,
      `${CAPACITY}: one sentence per string`,
    ]);
    replaceIn(root, KEY_POINTS, 'status: draft', 'status: ready');
    expect(draftProblems(ctxOf(root), KEY_POINTS)).toEqual([
      '14: keyPoints.1.status: Invalid option: expected one of "draft"|"live"|"retired"',
      '25: em dash (U+2014); use a plain hyphen',
    ]);
    expect(draftProblems(ctxOf(root), 'content/project/key-points/02-missing.yaml')).toEqual([
      'content/project/key-points/02-missing.yaml: no such key point file',
    ]);
  });

  it('reads the critic version from its prompt', () => {
    const root = fixtureRoot();
    expect(agentVersion(root, 'key-point-critic')).toBe(1);
    expect(() => agentVersion(root, 'key-point-writer')).toThrow(
      'agents/key-point-writer.md needs a frontmatter version, a whole number from 1',
    );
  });
});
