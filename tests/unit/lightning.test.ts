import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import {
  LIGHTNING_SCOPE,
  LIGHTNING_SECONDS,
  LIGHTNING_SIZE,
  LIGHTNING_STABILITY_DAYS,
  LIGHTNING_UNLOCK,
  lightningDeadline,
  lightningOpen,
  missedConcepts,
  selectLightning,
  settledConcepts,
} from '../../src/engine/lightning.ts';
import { type ConceptMemory, deriveMemory, type MemoryState } from '../../src/engine/memory.ts';
import { derive, type SessionState } from '../../src/engine/replay.ts';
import type { ExamPoolQuestion, PoolQuestion } from '../../src/engine/select.ts';
import { review } from '../../src/engine/srs.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf, lightningStartOf } from '../fixtures/memory.ts';

/** Made-up bakery concepts: 25 in 3 modules. */
const IDS = Array.from({ length: 25 }, (_, i) => `bake-${String(i + 1).padStart(2, '0')}`);
const CONTENT = contentOf(IDS.map((id, i) => ({ id, module: (i % 3) + 1 })));

/** Memory where each listed concept has a card of the given stability, and the rest have none. */
function memoryWith(stability: Readonly<Record<string, number>>): MemoryState {
  const base = review(null, 'good', new Date(at('2026-10-01')));
  const concepts = new Map<string, ConceptMemory>(
    Object.entries(stability).map(([id, s]) => [
      id,
      {
        card: { ...base, stability: s },
        enteredOn: '2026-10-01',
        lastAnswerDay: '2026-10-01',
        fsrsDay: '2026-10-01',
        fsrsRating: 'good',
        extraAgainDay: null,
        successDays: ['2026-10-01'],
        misconception: null,
      },
    ]),
  );
  return { ...deriveMemory([], CONTENT), concepts };
}

const settled = (n: number): Record<string, number> =>
  Object.fromEntries(IDS.slice(0, n).map((id) => [id, LIGHTNING_STABILITY_DAYS]));

/** Two single variants and one multi per concept, plus one single exam item of Form A on each concept. */
const POOL: PoolQuestion[] = IDS.flatMap((concept, i) => [
  { id: `q-${concept}-1`, concept, note: 'm01/a', type: 'single' as const, module: (i % 3) + 1 },
  { id: `q-${concept}-2`, concept, note: 'm01/a', type: 'single' as const, module: (i % 3) + 1 },
  { id: `q-${concept}-3`, concept, note: 'm01/a', type: 'multi' as const, module: (i % 3) + 1 },
]);
const EXAM: ExamPoolQuestion[] = IDS.map((concept, i) => ({
  id: `xa-${concept}`,
  concept,
  note: 'm01/a',
  type: 'single',
  module: (i % 3) + 1,
  form: 'A',
}));

type Log = readonly (readonly [string, NewEvent])[];
const lightning = (
  concept: string,
  correct: boolean,
  when: string,
  sid = SID,
): readonly [string, NewEvent] => [
  when,
  answerOf({ concept, qid: `q-${concept}-1`, correct, sure: false, mode: 'lightning', sid }),
];

describe('lightning constants (spec 4.1)', () => {
  it('runs 90 seconds, opens at 20 settled concepts of stability 3 days or more, draws at most 30', () => {
    expect([LIGHTNING_SECONDS, LIGHTNING_UNLOCK, LIGHTNING_STABILITY_DAYS, LIGHTNING_SIZE]).toEqual([
      90, 20, 3, 30,
    ]);
    expect(LIGHTNING_SCOPE).toBe('lightning');
  });
});

describe('settledConcepts and lightningOpen', () => {
  it('lists the concepts whose card has a stability of at least 3 days, sorted', () => {
    const memory = memoryWith({ 'bake-03': 3, 'bake-01': 12.5, 'bake-02': 2.99 });
    expect(settledConcepts(memory)).toEqual(['bake-01', 'bake-03']);
  });

  it('opens at 20 settled concepts and not at 19', () => {
    expect(lightningOpen(memoryWith(settled(19)))).toBe(false);
    expect(lightningOpen(memoryWith(settled(20)))).toBe(true);
    expect(lightningOpen(deriveMemory([], CONTENT))).toBe(false);
  });
});

describe('lightningDeadline', () => {
  it('is 90 seconds after the start', () => {
    expect(lightningDeadline(new Date('2026-10-12T09:00:00.000Z'))).toBe('2026-10-12T09:01:30.000Z');
  });
});

describe('selectLightning', () => {
  const progress = derive([], null);

  it('draws one single practice item per listed concept and nothing else', () => {
    const concepts = IDS.slice(0, 12);
    const qids = selectLightning({ pool: POOL, concepts, progress, seed: 4 });
    expect(qids).toHaveLength(12);
    const picked = qids.map((id) => POOL.find((q) => q.id === id));
    expect(picked.every((q) => q?.type === 'single')).toBe(true);
    expect(new Set(picked.map((q) => q?.concept))).toEqual(new Set(concepts));
  });

  it('orders by the seed: the same seed gives the same round, another seed another order', () => {
    const args = { pool: POOL, concepts: IDS, progress };
    expect(selectLightning({ ...args, seed: 9 })).toEqual(selectLightning({ ...args, seed: 9 }));
    expect(selectLightning({ ...args, seed: 9 })).not.toEqual(selectLightning({ ...args, seed: 10 }));
  });

  it('stops at the size, 30 by default', () => {
    const many = Array.from({ length: 40 }, (_, i) => `c-${i}`);
    const pool = many.map((concept) => ({
      id: `q-${concept}`,
      concept,
      note: 'm01/a',
      type: 'single' as const,
      module: 1,
    }));
    expect(selectLightning({ pool, concepts: many, progress, seed: 1 })).toHaveLength(LIGHTNING_SIZE);
    expect(selectLightning({ pool, concepts: many, progress, seed: 1, size: 5 })).toHaveLength(5);
  });

  it('prefers the variant never answered', () => {
    const answered = derive(timelineOf([lightning('bake-01', true, at('2026-10-10'))]), null);
    for (let seed = 0; seed < 10; seed++) {
      expect(selectLightning({ pool: POOL, concepts: ['bake-01'], progress: answered, seed })).toEqual([
        'q-bake-01-2',
      ]);
    }
  });

  it('never returns an item with a form, even a single one on a listed concept', () => {
    for (let seed = 0; seed < 25; seed++) {
      const qids = selectLightning({ pool: [...EXAM, ...POOL], concepts: IDS, progress, seed });
      expect(qids.filter((id) => id.startsWith('xa-'))).toEqual([]);
    }
    expect(selectLightning({ pool: EXAM, concepts: IDS, progress, seed: 3 })).toEqual([]);
  });
});

describe('missedConcepts', () => {
  it('lists the concepts of wrong answers once each, in answer order', () => {
    const log: Log = [
      [at('2026-10-12', 9), lightningStartOf(SID, ['q-bake-02-1', 'q-bake-01-1'], at('2026-10-12', 9, 2))],
      lightning('bake-02', false, '2026-10-12T09:00:10.000Z'),
      lightning('bake-03', true, '2026-10-12T09:00:20.000Z'),
      lightning('bake-01', false, '2026-10-12T09:00:30.000Z'),
      [
        '2026-10-12T09:00:40.000Z',
        answerOf({ concept: 'bake-02', qid: 'q-bake-02-2', correct: false, sure: false, mode: 'lightning' }),
      ],
    ];
    const session = derive(timelineOf(log), null).sessions.get(SID) as SessionState;
    expect(missedConcepts(session)).toEqual(['bake-02', 'bake-01']);
  });
});

describe('lightning XP (spec 3.2)', () => {
  it('pays nothing for an answer after the deadline', () => {
    const log: Log = [
      [
        at('2026-10-12', 9),
        lightningStartOf(SID, ['q-bake-01-1', 'q-bake-02-1'], '2026-10-12T09:01:30.000Z'),
      ],
      lightning('bake-01', true, '2026-10-12T09:01:29.000Z'),
      lightning('bake-02', true, '2026-10-12T09:01:31.000Z'),
    ];
    expect(deriveMemory(timelineOf(log), CONTENT).xp).toBe(1);
  });

  it('pays only the first answer to each question of the round', () => {
    const log: Log = [
      [at('2026-10-12', 9), lightningStartOf(SID, ['q-bake-01-1'], '2026-10-12T09:01:30.000Z')],
      lightning('bake-01', false, '2026-10-12T09:00:10.000Z'),
      lightning('bake-01', true, '2026-10-12T09:00:20.000Z'),
    ];
    expect(deriveMemory(timelineOf(log), CONTENT).xp).toBe(0);
  });

  it('pays a round started before 04:00 on its start day, and the next day still has its own paid round', () => {
    const log: Log = [
      [
        '2026-10-13T03:59:00.000Z',
        lightningStartOf(SID, ['q-bake-01-1', 'q-bake-02-1'], '2026-10-13T04:00:30.000Z'),
      ],
      lightning('bake-01', true, '2026-10-13T03:59:30.000Z'),
      lightning('bake-02', true, '2026-10-13T04:00:10.000Z'),
      [at('2026-10-13', 9), lightningStartOf(SID2, ['q-bake-03-1'], at('2026-10-13', 9, 2))],
      lightning('bake-03', true, at('2026-10-13', 9, 1), SID2),
    ];
    const memory = deriveMemory(timelineOf(log), CONTENT);
    expect(memory.xp).toBe(3);
    expect(memory.xpByDay.get('2026-10-12')).toBe(1);
    expect(memory.xpByDay.get('2026-10-13')).toBe(2);
  });
});
