import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  hashShingle,
  hitsAgainst,
  pack,
  packShingles,
  RUN_SHINGLES,
  rangeFor,
  runsAgainst,
  shareAgainst,
  shingleWindows,
  TARGET_RATE,
  unpack,
} from '../../scripts/content/lib/fingerprint.ts';
import { MASK, words } from '../../scripts/content/lib/text.ts';

const SOURCE = words(
  'Every branch borrows ovens from the shared kitchen whenever the morning queue grows, ' +
    'and bakers hand the proofing cabinets back once the dough has risen so nobody pays for idle shelves at night.',
);
const shinglesOf = (tokens: readonly string[]): Set<string> =>
  new Set(shingleWindows(tokens).filter((s): s is string => s !== null));
const OWN_START = words('our own opening words here');
const OWN_END = words('and our own closing words');

describe('rangeFor', () => {
  it('keeps the rate of a set of n shingles at 0.5%, never below', () => {
    expect(TARGET_RATE).toBe(0.005);
    expect(rangeFor(0)).toBe(1);
    for (let n = 100; n <= 20_000; n += 37) {
      const rate = n / rangeFor(n);
      expect(rate).toBeGreaterThanOrEqual(0.005);
      expect(rate).toBeLessThan(0.0051);
    }
  });
});

describe('hashShingle', () => {
  it('always falls below the range', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 1, max: 2 ** 24 }), (s, range) => {
        const h = hashShingle(s, range);
        return Number.isInteger(h) && h >= 0 && h < range;
      }),
    );
  });
});

describe('pack and unpack', () => {
  it('round-trip any set of values below 2^24', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 2 ** 24 - 1 })), (values) => {
        const set = unpack(pack(new Set(values), 2 ** 24));
        return set.values.size === values.length && values.every((v) => set.values.has(v));
      }),
    );
  });
});

describe('shingleWindows', () => {
  it('yields one shingle per position and null where a masked word sits', () => {
    expect(shingleWindows(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual(['a b c d e f', 'b c d e f g']);
    expect(shingleWindows(['a', 'b', 'c', 'd', 'e', 'f', MASK])).toEqual(['a b c d e f', null]);
  });
});

describe('packShingles', () => {
  it('stores every distinct shingle with a rate of about 0.5%', () => {
    const shingles = shinglesOf(SOURCE);
    const set = packShingles(shingles);
    expect(set.range).toBe(rangeFor(shingles.size));
    expect(set.count).toBeLessThanOrEqual(shingles.size);
    expect(set.f).toBeGreaterThan(0.004);
    expect(set.f).toBeLessThanOrEqual(0.0051);
  });
});

describe('hitsAgainst and runsAgainst', () => {
  const first = shinglesOf(SOURCE.slice(0, 14));
  const rest = new Set([...shinglesOf(SOURCE)].filter((s) => !first.has(s)));
  const sets = [unpack(packShingles(first)), unpack(packShingles(rest))];
  const tokens = (copied: readonly string[]): string[] => [...OWN_START, ...copied, ...OWN_END];

  it('reports a copied run of 9 or more words whose shingles split across two sets', () => {
    const copied = SOURCE.slice(3, 17);
    expect(runsAgainst(tokens(copied), sets)).toEqual([copied.join(' ')]);
  });

  it('ignores 8 copied words at the default minimum and reports them at a minimum of 3', () => {
    const copied = SOURCE.slice(3, 11);
    expect(RUN_SHINGLES).toBe(4);
    expect(runsAgainst(tokens(copied), sets)).toEqual([]);
    expect(runsAgainst(tokens(copied), sets, 3)).toEqual([copied.join(' ')]);
  });

  it('never counts a masked window as a hit', () => {
    const masked = [...SOURCE.slice(0, 6)];
    masked[5] = MASK;
    expect(hitsAgainst(masked, sets)).toEqual([false]);
    expect(hitsAgainst(SOURCE.slice(0, 6), sets)).toEqual([true]);
  });
});

describe('shareAgainst', () => {
  const set = unpack(packShingles(shinglesOf(SOURCE)));

  it('is about 1 for a full copy and near 0 for unrelated text', () => {
    expect(shareAgainst(SOURCE, [set]).share).toBeGreaterThan(0.95);
    const unrelated = words(
      'Cloud storage keeps receipts safe for seven years while the shop sleeps and the till rests quietly',
    );
    // A single false-positive hit among 13 shingles would read about 7%, so the bound allows one.
    expect(shareAgainst(unrelated, [set]).share).toBeLessThan(0.1);
  });

  it('skips masked shingles', () => {
    const tokens = [...SOURCE.slice(0, 6), MASK];
    expect(shareAgainst(tokens, [set]).shingles).toBe(1);
  });
});
