import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const missions = loadContext(ROOT).missions;

/** The plan-fit list (spec 5.3 rule 2): the union of every mission's services but Mission 0's, one spelling each. */
const PLAN_SERVICES = [
  'Amazon CloudFront',
  'Amazon CloudWatch',
  'Amazon CloudWatch Logs',
  'Amazon DynamoDB',
  'Amazon EC2',
  'Amazon S3',
  'Amazon SNS',
  'Amazon VPC',
  'AWS CloudFormation',
  'AWS CloudTrail',
  'AWS Identity and Access Management',
  'AWS Lambda',
  'AWS Pricing Calculator',
  'AWS Well-Architected Tool',
];

/** Missions 2 to 8 as decided: file, modules and services; each is cleaned up within 2 hours. */
const DECIDED = [
  {
    id: 'mission-02',
    file: 'mission-02-ec2-lifecycle.md',
    modules: [2, 6],
    services: ['Amazon EC2', 'Amazon VPC'],
  },
  {
    id: 'mission-03',
    file: 'mission-03-upload-receipt.md',
    modules: [3, 6, 10],
    services: ['Amazon S3', 'AWS Lambda', 'Amazon CloudWatch Logs'],
  },
  { id: 'mission-04', file: 'mission-04-loyalty-table.md', modules: [7], services: ['Amazon DynamoDB'] },
  {
    id: 'mission-05',
    file: 'mission-05-least-privilege.md',
    modules: [9, 10],
    services: ['AWS Identity and Access Management', 'AWS CloudTrail'],
  },
  {
    id: 'mission-06',
    file: 'mission-06-error-alarm.md',
    modules: [10],
    services: ['Amazon CloudWatch', 'Amazon SNS', 'AWS Lambda', 'Amazon CloudWatch Logs'],
  },
  { id: 'mission-07', file: 'mission-07-two-tier-vpc.md', modules: [5], services: ['Amazon VPC'] },
  {
    id: 'mission-08',
    file: 'mission-08-estimate-and-review.md',
    modules: [11, 13],
    services: ['AWS Pricing Calculator', 'AWS Well-Architected Tool'],
  },
];

const H2_ORDER = ['Goal', 'Before you start', 'Steps', 'Verify', 'Cleanup', 'Usage check', 'Never do'];

/** One phrase per shared cost-safety rule that every Never do section names (spec 5.3, S:853-858). */
const NEVER_DO = [
  'Paid plan',
  'Support plan',
  'NAT gateway',
  'Elastic IP',
  'Reserved Instances',
  'access keys',
  'organization',
  'Control Tower',
  'AWS Artifact',
  'Skill Builder',
];

/** The lines under one H2, up to the next H2. */
function section(body: string, title: string): string[] {
  const lines = body.split('\n');
  const start = lines.indexOf(`## ${title}`);
  if (start === -1) return [];
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

describe('Missions 0 to 8 (spec 5.3)', () => {
  it('ships Mission 0, Mission 1 and the seven cleaned-up missions, each in its decided file', () => {
    expect(missions.map((m) => m.path)).toEqual([
      'content/missions/mission-00-guardrails.md',
      'content/missions/mission-01-host-this-site.md',
      ...DECIDED.map((d) => `content/missions/${d.file}`),
    ]);
  });

  it('spells every later service the one way the plan-fit list does, Mission 0 included', () => {
    const later = new Set(missions.filter((m) => m.id !== 'mission-00').flatMap((m) => m.fm?.services ?? []));
    expect([...later].sort()).toEqual([...PLAN_SERVICES].sort());
    const gate = missions.find((m) => m.id === 'mission-00')?.fm?.services ?? [];
    expect(gate).toContain('AWS Identity and Access Management');
  });

  it("drops the service list from Mission 0's Plan status step and points to the form", () => {
    const gate = missions.find((m) => m.id === 'mission-00');
    const plan = section(gate?.body ?? '', 'Steps').join('\n');
    expect(plan).toContain('on the Plan status form below the steps');
    expect(plan).not.toContain('Amazon CloudFront');
    expect(gate?.fm?.services).toEqual([
      'AWS Identity and Access Management',
      'AWS Budgets',
      'AWS Billing and Cost Management',
    ]);
  });

  for (const d of DECIDED) {
    describe(d.id, () => {
      const m = missions.find((x) => x.id === d.id);
      const fm = m?.fm;
      const body = m?.body ?? '';

      it('has the decided frontmatter', () => {
        expect(fm?.id).toBe(d.id);
        expect(fm?.modules).toEqual(d.modules);
        expect(fm?.services).toEqual(d.services);
        expect(fm?.keep).toBe(false);
        expect(fm?.gate).toBeUndefined();
        expect(fm?.maxLiveHours).toBe(2);
        expect(fm?.expectedCredits.length).toBeGreaterThan(0);
      });

      it('has the H2 sections in order and at least one H3 step', () => {
        const h2 = body.split('\n').flatMap((line) => (line.startsWith('## ') ? [line.slice(3)] : []));
        expect(h2).toEqual(H2_ORDER);
        expect(section(body, 'Steps').filter((line) => line.startsWith('### ')).length).toBeGreaterThan(0);
      });

      it('tags its resources and ends Cleanup with the Tag Editor sweep', () => {
        expect(body).toContain(`ccp:mission=${d.id}`);
        const bullets = section(body, 'Cleanup').filter((line) => line.startsWith('- '));
        const last = bullets.at(-1) ?? '';
        expect(last).toContain('Tag Editor');
        expect(last).toContain('ccp:mission');
        for (const leftover of fm?.leftovers ?? [])
          expect(section(body, 'Cleanup').join('\n')).toContain(leftover);
      });

      it('names every shared rule under Never do', () => {
        const never = section(body, 'Never do').join('\n');
        for (const rule of NEVER_DO) expect(never).toContain(rule);
      });

      it('cites only official AWS pages', () => {
        expect(fm?.sources.length).toBeGreaterThan(0);
        for (const s of fm?.sources ?? []) {
          expect(['aws.amazon.com', 'docs.aws.amazon.com']).toContain(new URL(s.url).hostname);
        }
      });
    });
  }

  it("tells Mission 8's reader to paste the estimate link into decision 11's Cost note", () => {
    const body = missions.find((m) => m.id === 'mission-08')?.body ?? '';
    expect(section(body, 'Verify').join('\n')).toContain('decision 11');
    expect(body).toContain('Cost note');
  });

  it("states Mission 5's allow and deny matrix and draws Mission 7's network in a code block", () => {
    const five = missions.find((m) => m.id === 'mission-05')?.body ?? '';
    expect(five).toMatch(/\| *Action *\|.*\| *Expected *\|/);
    expect(five).toMatch(/denied/i);
    const seven = section(missions.find((m) => m.id === 'mission-07')?.body ?? '', 'Steps').join('\n');
    expect(seven).toMatch(/```text\n[\s\S]+\n```/);
  });
});
