import { describe, expect, it } from 'vitest';
import { planOf, ticksOf, withTick } from '../../src/app/mission-records.ts';
import type { PlanRecord } from '../../src/engine/missions.ts';

const PLAN: PlanRecord = {
  plan: 'free',
  credits: 140,
  endsOn: '2027-04-10',
  services: { 'Amazon S3': true, 'Amazon VPC': false },
  recordedAt: '2026-10-10T09:00:00.000Z',
};

describe('planOf', () => {
  it('accepts a round-tripped plan record', () => {
    expect(planOf(JSON.parse(JSON.stringify(PLAN)))).toEqual(PLAN);
    expect(planOf({ ...PLAN, plan: 'paid', credits: 0, services: {} })).toEqual({
      ...PLAN,
      plan: 'paid',
      credits: 0,
      services: {},
    });
  });

  it('rejects wrong shapes', () => {
    expect(planOf(null)).toBeNull();
    expect(planOf([PLAN])).toBeNull();
    expect(planOf({ ...PLAN, plan: 'business' })).toBeNull();
    expect(planOf({ ...PLAN, credits: -1 })).toBeNull();
    expect(planOf({ ...PLAN, credits: '140' })).toBeNull();
    expect(planOf({ ...PLAN, credits: Number.NaN })).toBeNull();
    expect(planOf({ ...PLAN, endsOn: 'April' })).toBeNull();
    expect(planOf({ ...PLAN, recordedAt: 'soon' })).toBeNull();
    expect(planOf({ ...PLAN, services: { 'Amazon S3': 'yes' } })).toBeNull();
    expect(planOf({ ...PLAN, services: ['Amazon S3'] })).toBeNull();
  });
});

describe('mission ticks', () => {
  it('reads ticks and drops malformed entries', () => {
    expect(ticksOf({ 'mission-00': ['budget', 'mfa'], 'mission-03': 'bucket', 'mission-04': [1] })).toEqual({
      'mission-00': ['budget', 'mfa'],
    });
    expect(ticksOf(null)).toEqual({});
    expect(ticksOf(['mission-00'])).toEqual({});
  });

  it('ticks and unticks one step without touching the input', () => {
    const before = { 'mission-00': ['budget'] };
    const ticked = withTick(before, 'mission-00', 'mfa', true);
    expect(ticked).toEqual({ 'mission-00': ['budget', 'mfa'] });
    expect(before).toEqual({ 'mission-00': ['budget'] });
    expect(withTick(ticked, 'mission-00', 'mfa', true)).toEqual({ 'mission-00': ['budget', 'mfa'] });
    expect(withTick(ticked, 'mission-03', 'bucket', true)).toEqual({
      'mission-00': ['budget', 'mfa'],
      'mission-03': ['bucket'],
    });
    expect(withTick(before, 'mission-00', 'budget', false)).toEqual({});
  });
});
