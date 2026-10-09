import { describe, expect, it } from 'vitest';
import { Blueprint } from '../../schemas/blueprint.ts';
import { TASK_IDS } from '../../schemas/common.ts';
import { Concept } from '../../schemas/concept.ts';
import { FingerprintFile } from '../../schemas/fingerprint.ts';
import { MissionFrontmatter } from '../../schemas/mission.ts';
import { LessonFrontmatter } from '../../schemas/note.ts';
import { Question } from '../../schemas/question.ts';
import { ValidateConfig } from '../../schemas/validate-config.ts';

const GUIDE_URL =
  'https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html';
const DOMAINS = [
  'Cloud Concepts',
  'Security and Compliance',
  'Cloud Technology and Services',
  'Billing, Pricing, and Support',
];

function blueprint(weights = [24, 30, 34, 12], taskIds: readonly string[] = TASK_IDS) {
  return {
    exam: 'CLF-C02',
    guide: { url: GUIDE_URL, verified_on: '2026-10-09' },
    domains: DOMAINS.map((name, i) => ({
      id: String(i + 1),
      name,
      weight: weights[i],
      url: GUIDE_URL,
      verified_on: '2026-10-09',
    })),
    tasks: taskIds.map((id) => ({
      id,
      text: `Fixture task ${id} statement`,
      terms: ['AWS Lambda', { term: 'AWS VPN', coveredBy: 'aws-site-to-site-vpn' }],
      url: GUIDE_URL,
      verified_on: '2026-10-09',
    })),
  };
}

const messages = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => (result.error?.issues ?? []).map((i) => `${i.path.map(String).join('.')}: ${i.message}`);

describe('Concept', () => {
  const valid = {
    id: 'aws-lambda',
    name: 'AWS Lambda',
    home: 'm03/aws-lambda',
    anchor: 'how-lambda-works',
    tasks: ['3.3'],
  };

  it('accepts a complete entry and an untested one without tasks', () => {
    expect(Concept.safeParse(valid).success).toBe(true);
    expect(Concept.safeParse({ ...valid, tasks: [], tested: false }).success).toBe(true);
  });

  it('rejects a seeded entry until its anchor and tasks are filled', () => {
    const seeded = Concept.safeParse({
      id: 'aws-lambda',
      name: 'Aws lambda',
      home: 'm03/aws-lambda',
      anchor: '',
    });
    expect(messages(seeded).map((m) => m.split(':')[0])).toEqual(['anchor', 'tasks']);
  });

  it('rejects a tested concept with no task and more than 3 confusables', () => {
    expect(messages(Concept.safeParse({ ...valid, tasks: [] }))).toEqual([
      'tasks: a tested concept needs at least one task',
    ]);
    expect(Concept.safeParse({ ...valid, confusableWith: ['a', 'b', 'c', 'd'] }).success).toBe(false);
  });
});

describe('Blueprint', () => {
  it('accepts 4 domains summing to 100 and all 19 tasks', () => {
    expect(Blueprint.safeParse(blueprint()).success).toBe(true);
  });

  it('rejects weights that do not sum to 100', () => {
    expect(messages(Blueprint.safeParse(blueprint([25, 30, 34, 12])))).toEqual([
      'domains: domain weights sum to 101, not 100',
    ]);
  });

  it('rejects a repeated task that hides a missing one', () => {
    const ids = [...TASK_IDS.slice(0, 18), '1.1'];
    expect(messages(Blueprint.safeParse(blueprint(undefined, ids)))).toEqual(['tasks: task 4.3 is missing']);
  });
});

describe('FingerprintFile', () => {
  const set = { range: 200, count: 1, f: 1 / 200, data: 'AAAl' };
  const file = (itemIds: unknown, itemsFrom: unknown = []) => ({
    module: 1,
    text: set,
    items: set,
    itemIds,
    itemsFrom,
  });

  it('accepts sorted, unique item ids', () => {
    expect(FingerprintFile.safeParse(file(['kc-01', 'kc-02', 'quiz-01'])).success).toBe(true);
    expect(FingerprintFile.safeParse(file([])).success).toBe(true);
  });

  it('rejects unsorted or repeated item ids', () => {
    expect(messages(FingerprintFile.safeParse(file(['quiz-01', 'kc-01'])))).toEqual([
      'itemIds: item ids must be sorted and unique',
    ]);
    expect(messages(FingerprintFile.safeParse(file(['kc-01', 'kc-01'])))).toEqual([
      'itemIds: item ids must be sorted and unique',
    ]);
  });

  it('takes a sorted, unique list of the modules that hold some of its item shingles', () => {
    expect(FingerprintFile.safeParse(file([], [2, 5])).success).toBe(true);
    expect(messages(FingerprintFile.safeParse(file([], [5, 2])))).toEqual([
      'itemsFrom: module numbers must be sorted and unique',
    ]);
    expect(FingerprintFile.safeParse(file([], [14])).success).toBe(false);
  });

  // Each course shingle sits in exactly one set, so the old truncated sets and per-item sets are gone (spec 2.5).
  it('rejects a truncated-bits set and per-item shingle sets', () => {
    expect(
      FingerprintFile.safeParse({ ...file([]), text: { b: 20, count: 1, f: 1 / 2 ** 20, data: 'AAAl' } })
        .success,
    ).toBe(false);
    expect(FingerprintFile.safeParse({ ...file([]), items: { 'kc-01': set } }).success).toBe(false);
    expect(FingerprintFile.safeParse({ ...file([]), text: { ...set, range: 2 ** 24 + 1 } }).success).toBe(
      false,
    );
  });
});

describe('MissionFrontmatter', () => {
  const gate = {
    id: 'mission-00',
    title: 'Guardrails',
    modules: [9, 11],
    services: ['AWS Budgets'],
    expectedCredits: '$0',
    gate: true,
    keep: false,
    canUseCredits: [],
    leftovers: [],
    sources: [{ url: GUIDE_URL, verified_on: '2026-10-09' }],
  };

  it('accepts a gate mission without maxLiveHours', () => {
    expect(MissionFrontmatter.safeParse(gate).success).toBe(true);
  });

  it('requires maxLiveHours only for missions that are cleaned up', () => {
    expect(messages(MissionFrontmatter.safeParse({ ...gate, gate: false }))).toEqual([
      'maxLiveHours: a mission that is cleaned up needs maxLiveHours',
    ]);
    expect(MissionFrontmatter.safeParse({ ...gate, gate: false, keep: true, maxLiveHours: 2 }).success).toBe(
      false,
    );
  });

  it('rejects a plain-http source', () => {
    expect(
      MissionFrontmatter.safeParse({
        ...gate,
        sources: [{ url: 'http://aws.amazon.com/', verified_on: '2026-10-09' }],
      }).success,
    ).toBe(false);
  });
});

describe('LessonFrontmatter and ValidateConfig', () => {
  it('rejects unknown keys and unknown rules', () => {
    const lesson = { module: 1, lesson: 2, slug: 'x', title: 'X', source: 'S', concepts: ['x'] };
    expect(LessonFrontmatter.safeParse(lesson).success).toBe(true);
    expect(LessonFrontmatter.safeParse({ ...lesson, covers: [] }).success).toBe(false);
    expect(
      ValidateConfig.safeParse({
        rules: ['R1', 'R14'],
        practicePerConcept: 0,
        examQuotas: false,
        blueprintTerms: false,
      }).success,
    ).toBe(false);
  });
});

describe('Question', () => {
  const option = (id: string, correct = false) => ({
    id,
    text: `Option ${id} for the bakery`,
    correct,
    why: 'Because the shared kitchen lends ovens.',
  });
  const base = {
    id: 'q-7k2m9p',
    version: 1,
    status: 'draft',
    pool: 'practice',
    concept: 'shared-kitchen',
    note: 'm01/what-a-bakery-cloud-is',
    task: '1.1',
    level: 2,
    stem: 'A branch runs out of ovens every morning. What should it do?',
    evidence: ['Branches use ovens from one central kitchen when their queues grow.'],
    takeaway: 'Borrow ovens when busy.',
  };
  const single = {
    ...base,
    type: 'single',
    options: ['a', 'b', 'c', 'd'].map((id) => option(id, id === 'a')),
  };
  const multi = {
    ...base,
    type: 'multi',
    select: 2,
    options: ['a', 'b', 'c', 'd', 'e'].map((id) => option(id, id < 'c')),
  };
  const match = {
    ...base,
    type: 'match',
    pairs: [1, 2, 3].map((n) => ({ left: `Left ${n}`, right: `Right ${n}`, why: 'Because it fits.' })),
  };
  const verified = {
    keyHash: '0123456789ab',
    fullHash: 'ba9876543210',
    checks: ['solve-closed@1', 'solve-notes@1', 'critic@1'],
    on: '2026-10-10',
  };

  it('accepts a valid single, multi and match question', () => {
    for (const q of [single, multi, match]) expect(messages(Question.safeParse(q))).toEqual([]);
    const parsed = Question.parse({ ...single, verified });
    expect(parsed.history).toEqual([]);
    expect(parsed.type === 'single' && parsed.options[1]?.correct).toBe(false);
  });

  it('rejects a bad id, a single with 5 options, a multi selecting 4, a short stem and 2 checks', () => {
    expect(messages(Question.safeParse({ ...single, id: 'q-7K2M9P' }))).toEqual([
      'id: must look like q-7k2m9p',
    ]);
    expect(Question.safeParse({ ...single, options: [...single.options, option('e')] }).success).toBe(false);
    expect(Question.safeParse({ ...multi, select: 4 }).success).toBe(false);
    expect(Question.safeParse({ ...single, stem: 'Too short.' }).success).toBe(false);
    expect(
      Question.safeParse({ ...single, verified: { ...verified, checks: verified.checks.slice(0, 2) } })
        .success,
    ).toBe(false);
  });
});
