import { describe, expect, it } from 'vitest';
import { QID_ALPHABET, Qid } from '../../schemas/question.ts';
import { newQid, takenQids } from '../../scripts/content/lib/qid.ts';

describe('newQid', () => {
  it('draws 6 characters of the Crockford alphabet that the schema accepts', () => {
    for (let i = 0; i < 200; i++) {
      const id = newQid(new Set());
      expect(Qid.safeParse(id).success).toBe(true);
      expect([...id.slice(2)].every((c) => QID_ALPHABET.includes(c))).toBe(true);
    }
  });

  it('never returns a taken id', () => {
    const draws = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
    let i = 0;
    const random = (max: number): number => {
      expect(max).toBe(QID_ALPHABET.length);
      return draws[i++] ?? 2;
    };
    expect(newQid(new Set(['q-000000']), random)).toBe('q-000001');
  });
});

describe('takenQids', () => {
  it('collects every id-shaped token, also from files that do not parse', () => {
    expect([...takenQids(['questions:\n  - id: q-7k2m9p\n', 'not: [valid yaml q-abcdef'])].sort()).toEqual([
      'q-7k2m9p',
      'q-abcdef',
    ]);
  });
});
