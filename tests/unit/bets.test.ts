import { describe, expect, it } from 'vitest';
import { BET, betXp, expectedXp, SURE_BREAKEVEN, SURE_HINT } from '../../src/engine/bets.ts';

describe('the bet (spec 3.1)', () => {
  it('pays 10 or 0 for Sure and 8 or 5 for Not sure', () => {
    expect(BET).toEqual({ sure: { right: 10, wrong: 0 }, notSure: { right: 8, wrong: 5 } });
    expect(betXp(true, true)).toBe(10);
    expect(betXp(false, true)).toBe(0);
    expect(betXp(true, false)).toBe(8);
    expect(betXp(false, false)).toBe(5);
  });

  it('breaks even at p = 5/7', () => {
    expect(SURE_BREAKEVEN).toBe(5 / 7);
    expect(expectedXp(5 / 7, true)).toBeCloseTo(expectedXp(5 / 7, false), 12);
  });

  it('makes Not sure pay more at 71% and Sure pay more at 72%', () => {
    expect(expectedXp(0.71, false)).toBeGreaterThan(expectedXp(0.71, true));
    expect(expectedXp(0.72, true)).toBeGreaterThan(expectedXp(0.72, false));
  });

  it('gives a hint that names the crossover', () => {
    expect(Math.floor(SURE_BREAKEVEN * 100)).toBe(71);
    expect(SURE_HINT).toBe('Press Sure when you are more than 71% sure.');
    expect(SURE_HINT).toContain(`${Math.floor(SURE_BREAKEVEN * 100)}%`);
  });
});
