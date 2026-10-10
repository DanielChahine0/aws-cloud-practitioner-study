import { describe, expect, it } from 'vitest';
import { level, levelProgress, xpForLevel } from '../../src/engine/level.ts';

describe('levels (spec 3.3)', () => {
  it('needs 50 * L * (L - 1) XP for level L', () => {
    expect([2, 5, 10, 20, 25].map(xpForLevel)).toEqual([100, 1_000, 4_500, 19_000, 30_000]);
    expect(xpForLevel(1)).toBe(0);
  });

  it('inverts xpForLevel exactly at every boundary up to level 40', () => {
    for (let L = 1; L <= 40; L++) {
      expect(level(xpForLevel(L))).toBe(L);
      if (L >= 2) expect(level(xpForLevel(L) - 1)).toBe(L - 1);
    }
  });

  it('starts at level 1 and never drops below it', () => {
    expect(level(0)).toBe(1);
    expect(level(-50)).toBe(1);
  });

  it('measures the way to the next level as a fraction in [0, 1)', () => {
    expect(levelProgress(450)).toBe(0.5);
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
    expect(levelProgress(99)).toBeCloseTo(0.99, 12);
  });
});
