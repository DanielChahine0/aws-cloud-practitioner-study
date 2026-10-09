import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  bitsFor,
  buildSet,
  hashShingle,
  pack,
  runsAgainst,
  shareAgainst,
  shingleWindows,
  unpack,
} from '../../scripts/content/lib/fingerprint.ts';
import { MASK, words } from '../../scripts/content/lib/text.ts';

const SOURCE = words(
  'Every branch borrows ovens from the shared kitchen whenever the morning queue grows, ' +
    'and bakers hand the proofing cabinets back once the dough has risen so nobody pays for idle shelves at night.',
);

describe('bitsFor', () => {
  it('keeps the false-positive rate above 0.5% and at most 1%', () => {
    for (const n of [1, 2, 7, 100, 1000, 10_485, 20_000]) {
      const rate = n / 2 ** bitsFor(n);
      expect(rate).toBeLessThanOrEqual(0.01);
      expect(rate).toBeGreaterThan(0.005);
    }
  });
});

describe('hashShingle', () => {
  it('always fits in b bits', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 1, max: 24 }), (s, b) => {
        const h = hashShingle(s, b);
        return Number.isInteger(h) && h >= 0 && h < 2 ** b;
      }),
    );
  });
});

describe('pack and unpack', () => {
  it('round-trip any set of 20-bit values', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 2 ** 20 - 1 })), (values) => {
        const set = unpack(pack(new Set(values), 20));
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

describe('buildSet', () => {
  it('stores every distinct shingle with a rate in range', () => {
    const set = buildSet(SOURCE);
    expect(set.f).toBeGreaterThan(0.004);
    expect(set.f).toBeLessThanOrEqual(0.01);
    expect(set.count).toBeLessThanOrEqual(SOURCE.length - 5);
  });
});

describe('runsAgainst', () => {
  const set = unpack(buildSet(SOURCE));

  it('reports a copied run of 9 or more words as the words it covers', () => {
    const copied = SOURCE.slice(3, 15);
    const tokens = [...words('our own opening words here'), ...copied, ...words('and our own closing words')];
    expect(runsAgainst(tokens, set)).toEqual([copied.join(' ')]);
  });

  it('ignores a copied run of 8 words', () => {
    const tokens = [
      ...words('our own opening words here'),
      ...SOURCE.slice(3, 11),
      ...words('and our own closing words'),
    ];
    expect(runsAgainst(tokens, set)).toEqual([]);
  });
});

describe('shareAgainst', () => {
  const set = unpack(buildSet(SOURCE));

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
