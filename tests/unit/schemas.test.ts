import { describe, expect, it } from 'vitest';
import { Blueprint } from '../../schemas/blueprint.ts';
import { TASK_IDS } from '../../schemas/common.ts';
import { Concept } from '../../schemas/concept.ts';
import { Forms, Quotas } from '../../schemas/exam.ts';
import { FingerprintFile } from '../../schemas/fingerprint.ts';
import { Badges, Ranks } from '../../schemas/game.ts';
import { BADGE_IDS } from '../../schemas/ids.ts';
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
      short: `task ${id}`,
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

/** The per-form task counts of the real registry (spec 4.3), with every cell in Module 1. */
const FORM_TASKS: Record<string, number> = {
  '1.1': 4,
  '1.2': 2,
  '1.3': 7,
  '1.4': 3,
  '2.1': 3,
  '2.2': 10,
  '2.3': 3,
  '2.4': 3,
  '3.1': 2,
  '3.2': 2,
  '3.3': 4,
  '3.4': 3,
  '3.5': 2,
  '3.6': 4,
  '3.7': 3,
  '3.8': 2,
  '4.1': 3,
  '4.2': 1,
  '4.3': 4,
};
function quotas(tasks: Record<string, number> = FORM_TASKS) {
  return {
    form: {
      size: 65,
      domains: { '1': 16, '2': 19, '3': 22, '4': 8 },
      tasks,
      multi: { '1': 2, '2': 2, '3': 3, '4': 1 },
    },
    pool: { size: 260, forms: 4, maxPerConcept: 4, multi: { '1': 8, '2': 8, '3': 12, '4': 4 } },
    cells: Object.entries(tasks).map(([task, n]) => ({ module: 1, task, target: 4 * n })),
    multiByModule: [
      { module: 1, domain: '1', target: 8 },
      { module: 1, domain: '2', target: 8 },
      { module: 1, domain: '3', target: 12 },
      { module: 1, domain: '4', target: 4 },
    ],
  };
}
const form = (id: string, qids = ['q-aaaaaa', 'q-bbbbbb']) => ({ id, frozen: false, qids });

describe('Quotas and Forms', () => {
  it('accepts quotas whose tasks, cells and multi shares add up', () => {
    expect(messages(Quotas.safeParse(quotas()))).toEqual([]);
  });

  it('rejects task counts that do not sum to 65', () => {
    const tasks = { ...FORM_TASKS, '2.2': 11 };
    const result = quotas(tasks);
    expect(messages(Quotas.safeParse({ ...result, cells: quotas().cells }))).toEqual([
      'form.tasks: tasks sum to 66, not 65',
      'form.tasks: tasks of domain 2 sum to 20, not 19',
      'cells: cells of task 2.2 sum to 40, not 44',
    ]);
  });

  it('rejects quotas with a task missing', () => {
    const { '4.3': _gone, ...tasks } = FORM_TASKS;
    expect(Quotas.safeParse(quotas(tasks)).success).toBe(false);
  });

  it('accepts four forms A to D and rejects three, a wrong order and a repeated qid', () => {
    const forms = { seed: 20261024, forms: ['A', 'B', 'C', 'D'].map((id) => form(id)) };
    expect(messages(Forms.safeParse(forms))).toEqual([]);
    expect(Forms.safeParse({ ...forms, forms: forms.forms.slice(0, 3) }).success).toBe(false);
    expect(
      messages(Forms.safeParse({ ...forms, forms: ['B', 'A', 'C', 'D'].map((id) => form(id)) })),
    ).toEqual(['forms.0.id: form 1 must be A', 'forms.1.id: form 2 must be B']);
    const repeated = { ...forms, forms: [form('A', ['q-aaaaaa', 'q-aaaaaa']), ...forms.forms.slice(1)] };
    expect(messages(Forms.safeParse(repeated))).toEqual(['forms.0.qids: form A lists q-aaaaaa twice']);
  });
});

describe('Ranks and Badges', () => {
  const basic = { id: 'basic', name: 'Basic', short: 'Basic', requires: {} };
  const plus = {
    id: 'business-support-plus',
    name: 'Business Support+',
    short: 'Business+',
    requires: { bosses: 5, hexesAt60: 5 },
    facts: ['A first made-up fact about the plan.', 'A second made-up fact about the plan.'],
  };

  it('accepts basic first and later ranks with two facts', () => {
    expect(messages(Ranks.safeParse([basic, plus]))).toEqual([]);
  });

  it('rejects a first rank other than basic and a rank with one fact', () => {
    expect(messages(Ranks.safeParse([plus]))).toEqual([
      '0: the first rank must be basic, with requires {} and no facts',
    ]);
    expect(Ranks.safeParse([basic, { ...plus, facts: plus.facts.slice(0, 1) }]).success).toBe(false);
  });

  it('accepts the 12 badges in order and rejects 11', () => {
    const badges = BADGE_IDS.map((id) => ({ id, name: `Badge ${id}`, rule: 'A made-up rule for the test.' }));
    expect(messages(Badges.safeParse(badges))).toEqual([]);
    expect(Badges.safeParse(badges.slice(0, 11)).success).toBe(false);
    expect(messages(Badges.safeParse([badges[1], badges[0], ...badges.slice(2)]))).toEqual([
      '0.id: badge 1 must be first-brew',
      '1.id: badge 2 must be clean-queue',
    ]);
  });
});
