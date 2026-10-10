import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { Blueprint } from '../../schemas/blueprint.ts';

const file = fileURLToPath(new URL('../../content/exam/blueprint.yaml', import.meta.url));
const blueprint = Blueprint.parse(parse(readFileSync(file, 'utf8')));

/** Terms the current exam guide names that the course does not teach under these words (spec 2.3, Appendix B). */
const EXPECTED: Record<string, readonly string[]> = {
  '1.1': ['speed of deployment'],
  '1.3': [
    'reduced business risk',
    'improved ESG performance',
    'increased revenue',
    'increased operational efficiency',
    'database replication',
  ],
  '1.4': ['included licenses'],
  '2.1': ['Amazon RDS', 'AWS Lambda', 'Amazon EC2'],
  '2.2': ['access reports'],
  '2.3': ['access keys', 'password policies', 'AWS IAM Identity Center'],
  '2.4': ['AWS WAF', 'AWS Firewall Manager', 'AWS Shield', 'Amazon GuardDuty', 'AWS Security Center'],
  '3.5': ['AWS VPN', 'AWS Direct Connect'],
  '3.7': [
    'Amazon SageMaker AI',
    'Amazon Lex',
    'Amazon Athena',
    'Amazon Kinesis',
    'AWS Glue',
    'Amazon Quick Sight',
  ],
  '4.2': ['AWS cost allocation tags', 'AWS Cost and Usage Report'],
  '4.3': [
    'Basic Support',
    'AWS Business Support+',
    'AWS Enterprise Support',
    'AWS Unified Operations',
    'AWS Prescriptive Guidance',
    'AWS Knowledge Center',
    'AWS re:Post',
    'system integrators',
    'independent software vendors',
  ],
};

describe('the CLF-C02 blueprint', () => {
  it('has the four domains with their names and weights', () => {
    expect(blueprint.domains.map((d) => [d.id, d.name, d.weight])).toEqual([
      ['1', 'Cloud Concepts', 24],
      ['2', 'Security and Compliance', 30],
      ['3', 'Cloud Technology and Services', 34],
      ['4', 'Billing, Pricing, and Support', 12],
    ]);
  });

  it.each(Object.entries(EXPECTED))('task %s names the terms the exam guide lists', (id, phrases) => {
    const task = blueprint.tasks.find((t) => t.id === id);
    const terms = (task?.terms ?? []).map((t) => (typeof t === 'string' ? t : t.term).toLowerCase());
    for (const phrase of phrases) {
      expect(
        terms.some((term) => term.includes(phrase.toLowerCase())),
        `task ${id} has no term containing "${phrase}"`,
      ).toBe(true);
    }
  });

  it('gives every task a short name for one-line copy', () => {
    expect(Object.fromEntries(blueprint.tasks.map((t) => [t.id, t.short]))).toEqual({
      '1.1': 'cloud benefits',
      '1.2': 'design principles',
      '1.3': 'migration',
      '1.4': 'cloud economics',
      '2.1': 'shared responsibility',
      '2.2': 'security and compliance',
      '2.3': 'access management',
      '2.4': 'security resources',
      '3.1': 'deploying and operating',
      '3.2': 'global infrastructure',
      '3.3': 'compute',
      '3.4': 'databases',
      '3.5': 'networking',
      '3.6': 'storage',
      '3.7': 'AI/ML and analytics',
      '3.8': 'other services',
      '4.1': 'pricing models',
      '4.2': 'billing and budgets',
      '4.3': 'support and resources',
    });
  });
});
