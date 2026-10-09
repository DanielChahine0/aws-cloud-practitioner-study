import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { derive } from '../../src/engine/replay.ts';
import { type PoolQuestion, QUIZ_SIZE, selectCheck, selectQuiz } from '../../src/engine/select.ts';
import { eventsOf, SID } from '../fixtures/events.ts';

const q = (id: string, concept: string, note = 'm01/a'): PoolQuestion => ({ id, concept, note });
const answer = (pool: readonly PoolQuestion[], qid: string, correct: boolean): NewEvent => ({
  t: 'answer',
  sid: SID,
  mode: 'quiz',
  qid,
  qv: 1,
  concept: pool.find((p) => p.id === qid)?.concept ?? 'unknown',
  picked: ['a'],
  correct,
  sure: false,
  ms: 1000,
});

const POOL = [q('a1', 'a'), q('a2', 'a'), q('b1', 'b'), q('b2', 'b'), q('c1', 'c')];
const EMPTY = derive([], null);

describe('selectCheck', () => {
  it('takes one question per concept, in the given concept order', () => {
    const ids = selectCheck({ concepts: ['c', 'a', 'b', 'none'], pool: POOL, progress: EMPTY, seed: 1 });
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe('c1');
    expect(ids[1]?.startsWith('a')).toBe(true);
    expect(ids[2]?.startsWith('b')).toBe(true);
  });

  it('never repeats the last shown variant when another exists', () => {
    for (const shown of ['a1', 'a2']) {
      const progress = derive(eventsOf(answer(POOL, shown, true)), null);
      for (let seed = 0; seed < 20; seed++) {
        const [pick] = selectCheck({ concepts: ['a'], pool: POOL, progress, seed });
        expect(pick).not.toBe(shown);
      }
    }
    const progress = derive(eventsOf(answer(POOL, 'c1', true)), null);
    expect(selectCheck({ concepts: ['c'], pool: POOL, progress, seed: 1 })).toEqual(['c1']);
  });

  it('puts unseen variants before seen ones, then the oldest answer first', () => {
    const pool = [q('a1', 'a'), q('a2', 'a'), q('a3', 'a'), q('z', 'z')];
    // a1 answered first (oldest), a2 later, z last so the last shown of a is a2.
    const seen = derive(eventsOf(answer(pool, 'a1', true), answer(pool, 'a2', true)), null);
    for (let seed = 0; seed < 20; seed++) {
      expect(selectCheck({ concepts: ['a'], pool, progress: seen, seed })).toEqual(['a3']);
    }
    const allSeen = derive(
      eventsOf(answer(pool, 'a3', true), answer(pool, 'a1', true), answer(pool, 'a2', true)),
      null,
    );
    expect(selectCheck({ concepts: ['a'], pool, progress: allSeen, seed: 3 })).toEqual(['a3']);
  });

  it('gives the same list for the same seed', () => {
    const run = (seed: number) =>
      selectCheck({ concepts: ['a', 'b', 'c'], pool: POOL, progress: EMPTY, seed });
    expect(run(42)).toEqual(run(42));
    const seen = new Set(Array.from({ length: 30 }, (_, seed) => run(seed).join()));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('selectQuiz', () => {
  const big = Array.from({ length: 20 }, (_, i) => q(`q${String(i).padStart(2, '0')}`, `c${i % 8}`));

  it('caps at 12 and spreads concepts before repeating one', () => {
    expect(QUIZ_SIZE).toBe(12);
    const ids = selectQuiz({ pool: big, progress: EMPTY, seed: 9 });
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    const firstEight = ids.slice(0, 8).map((id) => big.find((p) => p.id === id)?.concept);
    expect(new Set(firstEight).size).toBe(8);
  });

  it('puts never answered first, then last wrong, then last right', () => {
    const pool = [q('n', 'c1'), q('w', 'c2'), q('r', 'c3')];
    const progress = derive(eventsOf(answer(pool, 'r', true), answer(pool, 'w', false)), null);
    for (let seed = 0; seed < 10; seed++) {
      expect(selectQuiz({ pool, progress, seed })).toEqual(['n', 'w', 'r']);
    }
  });

  it('ranks by the last answer only and takes the oldest first within a rank', () => {
    const pool = [q('x', 'c1'), q('y', 'c2'), q('z', 'c3')];
    const progress = derive(
      eventsOf(
        answer(pool, 'x', false),
        answer(pool, 'z', true),
        answer(pool, 'y', true),
        answer(pool, 'x', true),
      ),
      null,
    );
    expect(selectQuiz({ pool, progress, seed: 1 })).toEqual(['z', 'y', 'x']);
  });

  it('fills up to the size with a second pass when concepts run out', () => {
    const pool = [q('a1', 'a'), q('a2', 'a'), q('a3', 'a'), q('b1', 'b')];
    const ids = selectQuiz({ pool, progress: EMPTY, seed: 2, size: 3 });
    expect(ids).toHaveLength(3);
    expect(ids.slice(0, 2).sort((x, y) => x.localeCompare(y))[1]).toBe('b1');
  });

  it('gives the same list for the same seed', () => {
    expect(selectQuiz({ pool: big, progress: EMPTY, seed: 5 })).toEqual(
      selectQuiz({ pool: big, progress: EMPTY, seed: 5 }),
    );
  });
});
