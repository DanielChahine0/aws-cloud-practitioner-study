import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { Brief } from '../../schemas/project.ts';
import { emDashLines, multiSentenceLines } from '../../scripts/content/lib/text.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const text = readFileSync(join(ROOT, 'content', 'project', 'brief.yaml'), 'utf8');
const brief = Brief.parse(parse(text));

/** Every string the brief holds, depth first. */
function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(stringsIn);
  return [];
}

describe('the capstone brief (spec 6)', () => {
  it('is titled after the spec', () => {
    expect(brief.title).toBe('Move the cafe to the cloud');
  });

  it('holds the 13 decisions in module order with their card titles', () => {
    expect(brief.decisions.map((d) => `${d.module} ${d.title}`)).toEqual([
      '1 Deployment model and shared responsibility',
      '2 Compute for online ordering',
      '3 Serverless and containers',
      '4 Regions, edge and repeatable infrastructure',
      '5 Network layout and shop connections',
      '6 Storage classes and lifecycle',
      '7 Databases and caching',
      '8 Analytics and an AI feature',
      '9 Identity, encryption and edge protection',
      '10 Monitoring, audit and governance',
      '11 Cost, budgets and Support plan',
      '12 Migration strategies and data transfer',
      '13 Well-Architected review',
    ]);
  });

  it('carries every number of the spec brief in its facts', () => {
    const facts = new Map(brief.facts.map((f) => [f.id, f.text] as const));
    expect([...facts.keys()]).toEqual(['growth', 'peak', 'loyalty', 'archive', 'pos', 'staff', 'budget']);
    expect(facts.get('growth')).toContain('12');
    expect(facts.get('growth')).toContain('abroad');
    for (const n of ['10 times', '07:00', '09:00']) expect(facts.get('peak')).toContain(n);
    for (const n of ['2 TB', '7 years']) expect(facts.get('archive')).toContain(n);
    expect(facts.get('budget')).toContain('$300');
  });

  it('holds the spec rubric word for word', () => {
    expect(brief.rubric.passTotal).toBe(8);
    expect(brief.rubric.criteria.map((c) => [c.id, c.name, ...c.levels])).toEqual([
      [
        'fit',
        'Fit',
        'Ignores the brief',
        'Meets some constraints',
        'Meets every main constraint',
        'Also meets edge constraints and names the course-taught reason',
      ],
      [
        'grounding',
        'Grounding',
        'No course concepts, or wrong ones',
        '1 concept used correctly',
        '2 or more used correctly',
        'Also compared against the rejected option',
      ],
      [
        'tradeoffs',
        'Trade-offs',
        'None',
        'Names a cost or a limit',
        'Adds a mitigation',
        'Adds the cost or responsibility impact',
      ],
      [
        'cost',
        'Cost and responsibility',
        'Missing',
        'Mentioned vaguely',
        'Pricing model or responsibility split stated',
        'Both stated, and they match earlier ADRs',
      ],
    ]);
  });

  it('keeps every string to one sentence with no em dash', () => {
    const bad = stringsIn(brief).filter((s) => emDashLines(s).length > 0 || multiSentenceLines(s).length > 0);
    expect(bad).toEqual([]);
    expect(emDashLines(text)).toEqual([]);
  });

  it('uses only the exam guide current Support plan names', () => {
    const old = /\bDeveloper Support\b|\bBusiness Support\b(?!\+)|\bEnterprise On-Ramp\b/;
    expect(stringsIn(brief).filter((s) => old.test(s))).toEqual([]);
  });
});
