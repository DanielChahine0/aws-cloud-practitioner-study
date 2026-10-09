import { describe, expect, it } from 'vitest';
import { fnv1a, mulberry32, seedFor, shuffle } from '../../src/engine/rng.ts';

describe('fnv1a', () => {
  it('matches the published 32-bit FNV-1a vectors', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
  });

  it('is unsigned', () => {
    for (const text of ['q-7k2m9p', 'm03/aws-lambda', 'zzzzzz']) {
      expect(fnv1a(text)).toBeGreaterThanOrEqual(0);
      expect(fnv1a(text)).toBeLessThan(2 ** 32);
    }
  });
});

describe('mulberry32', () => {
  it('gives the same values for the same seed, all in [0, 1)', () => {
    const take = (random: () => number) => Array.from({ length: 5 }, () => random());
    const first = take(mulberry32(42));
    expect(take(mulberry32(42))).toEqual(first);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(new Set(first).size).toBe(5);
  });

  it('differs between seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('shuffle', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  it('returns a permutation and leaves its input alone', () => {
    const copy = [...items];
    const out = shuffle(items, mulberry32(7));
    expect(items).toEqual(copy);
    expect([...out].sort()).toEqual(items);
    expect(out).not.toBe(items);
  });

  it('is stable for one seed', () => {
    expect(shuffle(items, mulberry32(7))).toEqual(shuffle(items, mulberry32(7)));
  });

  it('handles empty and single lists', () => {
    expect(shuffle([], mulberry32(1))).toEqual([]);
    expect(shuffle(['x'], mulberry32(1))).toEqual(['x']);
  });
});

describe('seedFor', () => {
  it('mixes the session seed with the question id', () => {
    expect(seedFor(5, 'q-aaaaaa')).toBe((5 ^ fnv1a('q-aaaaaa')) >>> 0);
    expect(seedFor(5, 'q-aaaaaa')).not.toBe(seedFor(5, 'q-bbbbbb'));
    expect(seedFor(0xffffffff, 'q-aaaaaa')).toBeGreaterThanOrEqual(0);
  });
});
