import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { derive, type SessionState } from '../../src/engine/replay.ts';
import {
  type PoolQuestion,
  QUIZ_SIZE,
  RELEARN_GAP,
  relearnVariant,
  selectCheck,
  selectQuiz,
  sessionItems,
} from '../../src/engine/select.ts';
import { eventsOf, SID, SID2 } from '../fixtures/events.ts';

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
  const flat = () => 0.5;

  it('caps at 12 and spreads concepts before repeating one', () => {
    expect(QUIZ_SIZE).toBe(12);
    const ids = selectQuiz({ pool: big, progress: EMPTY, seed: 9, recall: flat });
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    const firstEight = ids.slice(0, 8).map((id) => big.find((p) => p.id === id)?.concept);
    expect(new Set(firstEight).size).toBe(8);
  });

  it('puts never answered first, then the answered ones by recall, lowest first', () => {
    const pool = [q('n', 'c1'), q('w', 'c2'), q('r', 'c3')];
    const progress = derive(eventsOf(answer(pool, 'w', false), answer(pool, 'r', true)), null);
    const recall = (concept: string) => (concept === 'c2' ? 0.4 : 0.95);
    for (let seed = 0; seed < 10; seed++) {
      expect(selectQuiz({ pool, progress, seed, recall })).toEqual(['n', 'w', 'r']);
    }
  });

  it('puts the concept with the lowest recall first once every question was answered', () => {
    const pool = [q('x', 'c1'), q('y', 'c2'), q('z', 'c3')];
    const progress = derive(
      eventsOf(answer(pool, 'x', true), answer(pool, 'y', true), answer(pool, 'z', true)),
      null,
    );
    const recall = (concept: string) => ({ c1: 0.9, c2: 0.95, c3: 0.6 })[concept] ?? 0;
    expect(selectQuiz({ pool, progress, seed: 4, recall })).toEqual(['z', 'x', 'y']);
  });

  it('keeps never answered ahead of the lowest recall', () => {
    const pool = [q('seen', 'low'), q('new', 'high')];
    const progress = derive(eventsOf(answer(pool, 'seen', false)), null);
    const recall = (concept: string) => (concept === 'low' ? 0 : 1);
    expect(selectQuiz({ pool, progress, seed: 1, recall })).toEqual(['new', 'seen']);
  });

  it('takes the oldest last answer first when recall ties', () => {
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
    expect(selectQuiz({ pool, progress, seed: 1, recall: flat })).toEqual(['z', 'y', 'x']);
  });

  it('fills up to the size with a second pass when concepts run out', () => {
    const pool = [q('a1', 'a'), q('a2', 'a'), q('a3', 'a'), q('b1', 'b')];
    const ids = selectQuiz({ pool, progress: EMPTY, seed: 2, size: 3, recall: flat });
    expect(ids).toHaveLength(3);
    expect(ids.slice(0, 2).sort((x, y) => x.localeCompare(y))[1]).toBe('b1');
  });

  it('gives the same list for the same seed', () => {
    expect(selectQuiz({ pool: big, progress: EMPTY, seed: 5, recall: flat })).toEqual(
      selectQuiz({ pool: big, progress: EMPTY, seed: 5, recall: flat }),
    );
  });
});

describe('relearnVariant', () => {
  const pool = [q('a1', 'a'), q('a2', 'a'), q('a3', 'a'), q('b1', 'b')];

  it('never returns the question just answered', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const avoid of ['a1', 'a2', 'a3']) {
        const pick = relearnVariant({ concept: 'a', avoid, pool, seed });
        expect(pick).not.toBe(avoid);
        expect(pick?.startsWith('a')).toBe(true);
      }
    }
  });

  it('is null for a concept with one variant', () => {
    expect(relearnVariant({ concept: 'b', avoid: 'b1', pool, seed: 3 })).toBeNull();
    expect(relearnVariant({ concept: 'none', avoid: 'x', pool, seed: 3 })).toBeNull();
  });

  it('is stable for one seed whatever the pool order', () => {
    const reversed = [...pool].reverse();
    for (let seed = 0; seed < 10; seed++) {
      expect(relearnVariant({ concept: 'a', avoid: 'a1', pool: reversed, seed })).toBe(
        relearnVariant({ concept: 'a', avoid: 'a1', pool, seed }),
      );
    }
    const picks = new Set(
      Array.from({ length: 30 }, (_, seed) => relearnVariant({ concept: 'a', avoid: 'a1', pool, seed })),
    );
    expect(picks).toEqual(new Set(['a2', 'a3']));
  });
});

describe('sessionItems', () => {
  const qids = Array.from({ length: 10 }, (_, i) => `q${i}`);
  const conceptOf = (qid: string) => `c${qid.slice(1)}`;
  const reviewOf = (
    wrong: readonly string[],
    mode: 'review' | 'check' = 'review',
    concept = conceptOf,
  ): SessionState => {
    const start: NewEvent = { t: 'session', sid: SID2, mode, phase: 'start', seed: 1, scope: mode, qids };
    const answers: NewEvent[] = qids.map((qid) => ({
      t: 'answer',
      sid: SID2,
      mode,
      qid,
      qv: 1,
      concept: concept(qid),
      picked: ['a'],
      correct: !wrong.includes(qid),
      sure: false,
      ms: 1000,
    }));
    const session = derive(eventsOf(start, ...answers), null).sessions.get(SID2);
    if (!session) throw new Error('no session');
    return session;
  };
  const relearnFor = (qid: string) => `${qid}-again`;

  it('lists the session questions in order when every answer is right', () => {
    expect(sessionItems(reviewOf([]), relearnFor)).toEqual(qids.map((qid) => ({ qid, relearn: false })));
  });

  it('inserts a relearn item 5 places after a wrong answer at index 1', () => {
    expect(RELEARN_GAP).toBe(5);
    const items = sessionItems(reviewOf(['q1']), relearnFor);
    expect(items).toHaveLength(11);
    expect(items[6]).toEqual({ qid: 'q1-again', relearn: true });
    expect(items.filter((i) => i.relearn)).toHaveLength(1);
  });

  it('appends the relearn item for a wrong answer near the end', () => {
    const items = sessionItems(reviewOf(['q8']), relearnFor);
    expect(items.at(-1)).toEqual({ qid: 'q8-again', relearn: true });
    expect(items).toHaveLength(11);
  });

  it('inserts once per concept', () => {
    const items = sessionItems(
      reviewOf(['q1', 'q3'], 'review', () => 'same'),
      (qid) => `${qid}-again`,
    );
    expect(items.filter((i) => i.relearn)).toEqual([{ qid: 'q1-again', relearn: true }]);
  });

  it('skips a concept with no other variant, and a variant already in the list', () => {
    expect(sessionItems(reviewOf(['q1']), () => null).some((i) => i.relearn)).toBe(false);
    expect(sessionItems(reviewOf(['q1']), () => 'q4').some((i) => i.relearn)).toBe(false);
  });

  it('never inserts in a lesson check', () => {
    expect(sessionItems(reviewOf(['q1', 'q2'], 'check'), relearnFor).some((i) => i.relearn)).toBe(false);
  });

  it('keeps the relearn item once its own answer is in, so a reload resumes at the same item', () => {
    const base = reviewOf(['q1']);
    const items = sessionItems(base, relearnFor);
    const relearnAnswer = {
      ...(base.answers.get('q1') as NonNullable<ReturnType<typeof base.answers.get>>),
      qid: 'q1-again',
      relearn: true,
      correct: false,
    };
    const answered: SessionState = {
      ...base,
      answers: new Map([...base.answers, ['q1-again', relearnAnswer]]),
    };
    expect(sessionItems(answered, relearnFor)).toEqual(items);
  });
});
