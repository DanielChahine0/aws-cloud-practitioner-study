import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { Brief, KEY_POINT_ID, KeyPoint, KeyPointFile } from '../../schemas/project.ts';

const FIXTURE = resolve(import.meta.dirname, '..', 'fixtures', 'content-root', 'content', 'project');
const brief = (): Record<string, unknown> =>
  parse(readFileSync(join(FIXTURE, 'brief.yaml'), 'utf8')) as Record<string, unknown>;
const keyPoints = (): { module: number; keyPoints: Record<string, unknown>[] } =>
  parse(readFileSync(join(FIXTURE, 'key-points', '01-baking-basics.yaml'), 'utf8')) as {
    module: number;
    keyPoints: Record<string, unknown>[];
  };
const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }): string[] =>
  result.success ? [] : (result.error?.issues ?? []).map((i) => i.message);

describe('the brief schema', () => {
  it('accepts the fixture brief', () => {
    const parsed = Brief.parse(brief());
    expect(parsed.decisions.map((d) => d.module)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(parsed.rubric.criteria.map((c) => c.id)).toEqual(['fit', 'grounding', 'tradeoffs', 'cost']);
  });

  it('rejects 12 decisions', () => {
    const b = brief();
    b.decisions = (b.decisions as unknown[]).slice(0, 12);
    expect(Brief.safeParse(b).success).toBe(false);
  });

  it('rejects decisions out of module order', () => {
    const b = brief();
    const decisions = b.decisions as Record<string, unknown>[];
    [decisions[0], decisions[1]] = [
      decisions[1] as Record<string, unknown>,
      decisions[0] as Record<string, unknown>,
    ];
    expect(messages(Brief.safeParse(b))).toContain('decision 1 must be for Module 1');
  });

  it('rejects a repeated fact id', () => {
    const b = brief();
    const facts = b.facts as { id: string }[];
    (facts[1] as { id: string }).id = (facts[0] as { id: string }).id;
    expect(messages(Brief.safeParse(b))).toContain(
      `fact id ${(facts[0] as { id: string }).id} appears twice`,
    );
  });

  it('rejects a criterion out of order', () => {
    const b = brief();
    const criteria = (b.rubric as { criteria: unknown[] }).criteria;
    [criteria[0], criteria[1]] = [criteria[1], criteria[0]];
    expect(messages(Brief.safeParse(b))).toContain(
      'criteria must be fit, grounding, tradeoffs, cost in that order',
    );
  });

  it('rejects a pass total other than 8', () => {
    const b = brief();
    (b.rubric as { passTotal: number }).passTotal = 9;
    expect(Brief.safeParse(b).success).toBe(false);
  });
});

describe('the key point schemas', () => {
  it('accepts the fixture key point file', () => {
    const parsed = KeyPointFile.parse(keyPoints());
    expect(parsed.keyPoints.map((k) => k.status)).toEqual(['live', 'draft', 'draft', 'draft']);
  });

  it('takes ids of the form kp-NN-slug only', () => {
    expect(KEY_POINT_ID.test('kp-06-lifecycle-to-deep-archive')).toBe(true);
    for (const bad of ['kp-14-x', 'kp-6-x', 'kp-06-', 'kp-06-Upper', 'q-7k2m9p'])
      expect(KEY_POINT_ID.test(bad)).toBe(false);
  });

  it('rejects 3 key points that are not retired', () => {
    const f = keyPoints();
    f.keyPoints = f.keyPoints.slice(0, 3);
    expect(messages(KeyPointFile.safeParse(f))).toContain(
      'a key point file needs 4 to 6 key points that are not retired; it has 3',
    );
  });

  it('counts a retired key point toward neither bound', () => {
    const f = keyPoints();
    f.keyPoints = [...f.keyPoints.slice(0, 3), { ...f.keyPoints[3], status: 'retired' }];
    expect(KeyPointFile.safeParse(f).success).toBe(false);
    f.keyPoints = [...keyPoints().keyPoints, { ...f.keyPoints[3], id: 'kp-01-old-point', status: 'retired' }];
    expect(KeyPointFile.safeParse(f).success).toBe(true);
  });

  it('rejects kp-02-x in the Module 1 file', () => {
    const f = keyPoints();
    f.keyPoints = [...f.keyPoints, { ...f.keyPoints[1], id: 'kp-02-x' }];
    expect(messages(KeyPointFile.safeParse(f))).toContain('kp-02-x belongs to Module 2, not Module 1');
  });

  it('rejects a repeated id', () => {
    const f = keyPoints();
    f.keyPoints = [...f.keyPoints, { ...f.keyPoints[1] }];
    expect(messages(KeyPointFile.safeParse(f))).toContain(`${f.keyPoints[1]?.id} appears twice`);
  });

  it('stamps with exactly one critic check', () => {
    const live = keyPoints().keyPoints[0] as Record<string, unknown>;
    expect(KeyPoint.safeParse(live).success).toBe(true);
    const verified = live.verified as Record<string, unknown>;
    expect(
      KeyPoint.safeParse({ ...live, verified: { ...verified, checks: ['critic@1', 'critic@2'] } }).success,
    ).toBe(false);
    expect(
      KeyPoint.safeParse({ ...live, verified: { ...verified, checks: ['solve-closed@1'] } }).success,
    ).toBe(false);
    expect(KeyPoint.safeParse({ ...live, verified: { ...verified, keyHash: 'abcdefabcdef' } }).success).toBe(
      false,
    );
  });

  it('takes 1 to 3 concepts and one evidence line', () => {
    const live = keyPoints().keyPoints[0] as Record<string, unknown>;
    expect(KeyPoint.safeParse({ ...live, concepts: [] }).success).toBe(false);
    expect(KeyPoint.safeParse({ ...live, concepts: ['a', 'b', 'c', 'd'] }).success).toBe(false);
    expect(KeyPoint.safeParse({ ...live, evidence: ['a line'] }).success).toBe(false);
  });
});
