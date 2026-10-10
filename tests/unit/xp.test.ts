import { describe, expect, it } from 'vitest';
import { effortBonus, XP } from '../../src/engine/xp.ts';

describe('XP (spec 3.2)', () => {
  it('matches the spec table row by row', () => {
    expect(XP).toEqual({
      lesson: 10,
      lightningPerCorrect: 1,
      lightningDailyCap: 10,
      incidentPerfect: 15,
      incident: 8,
      lab: 30,
      labNoHints: 10,
      boss: 100,
      mock: 150,
      decision: 20,
      decisionGood: 10,
      mission0: 50,
      mission: 75,
    });
  });

  it('pays round(10 * (1 - R)) as the effort bonus', () => {
    expect(effortBonus(0.9)).toBe(1);
    expect(effortBonus(0.77)).toBe(2);
    expect(effortBonus(0.7)).toBe(3);
    expect(effortBonus(1)).toBe(0);
    expect(effortBonus(0.97)).toBe(0);
    expect(effortBonus(0)).toBe(10);
  });

  it('clamps R to [0, 1]', () => {
    expect(effortBonus(1.2)).toBe(0);
    expect(effortBonus(-0.1)).toBe(10);
  });
});
