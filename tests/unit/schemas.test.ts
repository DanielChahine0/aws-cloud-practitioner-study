import { describe, expect, it } from 'vitest';
import { Blueprint } from '../../schemas/blueprint.ts';
import { TASK_IDS } from '../../schemas/common.ts';
import { Concept } from '../../schemas/concept.ts';
import { MissionFrontmatter } from '../../schemas/mission.ts';
import { LessonFrontmatter } from '../../schemas/note.ts';
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
