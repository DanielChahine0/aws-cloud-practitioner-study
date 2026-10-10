import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { betXp, expectedXp, SURE_BREAKEVEN } from '../../src/engine/bets.ts';
import { BOSS_COOLDOWN_MS, bossDraw, bossStatus } from '../../src/engine/boss.ts';
import { moduleMastery } from '../../src/engine/mastery.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { firstAttempts, mockDeadline, mockHistory } from '../../src/engine/mock.ts';
import { reviewQueue } from '../../src/engine/queue.ts';
import { meets, type RankDef, rankFacts } from '../../src/engine/ranks.ts';
import { readiness } from '../../src/engine/readiness.ts';
import { derive } from '../../src/engine/replay.ts';
import type { PoolQuestion } from '../../src/engine/select.ts';
import { effortBonus } from '../../src/engine/xp.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import {
  answerOf,
  at,
  contentOf,
  examStartOf,
  labDoneOf,
  lightningStartOf,
  submitOf,
} from '../fixtures/memory.ts';

/** One test per Phase 2 row of the anti-grind audit (spec 3.11), named after the row. */
const CONTENT = contentOf([
  { id: 'oven', module: 1 },
  { id: 'proofing', module: 1 },
  { id: 'crust', module: 2 },
  { id: 'flour', module: 3 },
  { id: 'yeast', module: 3 },
  { id: 'salt', module: 3 },
  { id: 'water', module: 3 },
]);
type Log = readonly (readonly [string, NewEvent])[];
const memoryOf = (log: Log) => deriveMemory(timelineOf(log), CONTENT);
const right = (concept: string, qid: string, mode: 'check' | 'quiz' | 'debrief' = 'check') =>
  answerOf({ concept, qid, mode, correct: true, sure: true });
const SID3 = '01JA00000000000000000000S3';

/** A submitted boss or mock on `day` over the given concepts, every item right. */
const examOf = (
  day: string,
  sid: string,
  mode: 'boss' | 'mock',
  concepts: readonly string[],
  form?: string,
): Log => [
  [
    at(day, 10),
    examStartOf(
      sid,
      mode,
      concepts.map((c) => `qx-${c}`),
      {
        scope: mode === 'boss' ? 'm03' : 'a',
        deadline: at(day, 11),
        ...(form === undefined ? {} : { form }),
      },
    ),
  ],
  ...concepts.map(
    (c, i) =>
      [
        at(day, 10, 20 + i),
        answerOf({ concept: c, qid: `qx-${c}`, mode, sid, correct: true, sure: false }),
      ] as const,
  ),
  [at(day, 10, 40), submitOf(sid, mode)],
];

describe('anti-grind audit (spec 3.11)', () => {
  it('Re-answering the same concept', () => {
    const first: Log = [[at('2026-10-10'), right('oven', 'q-oven-1')]];
    const five: Log = [
      ...first,
      ...[2, 3, 4, 5].map((n) => [at('2026-10-10', 10 + n), right('oven', `q-oven-${n}`)] as const),
    ];
    const once = memoryOf(first);
    const grind = memoryOf(five);
    expect(grind.xp).toBe(once.xp);
    expect(grind.xp).toBe(10);
    expect(grind.concepts.get('oven')?.card).toEqual(once.concepts.get('oven')?.card);
  });

  it('Re-running quizzes', () => {
    const quiz = (day: string): Log =>
      ['oven', 'proofing', 'crust', 'flour'].map(
        (concept, i) => [at(day, 10, i), right(concept, `q-${concept}-1`, 'quiz')] as const,
      );
    const memory = memoryOf([...quiz('2026-10-10'), ...quiz('2026-10-11')]);
    expect(memory.xpByDay.get('2026-10-10')).toBe(40);
    expect(memory.xpByDay.get('2026-10-11')).toBeUndefined();
    expect(memory.concepts.get('oven')?.card).toEqual(
      memoryOf(quiz('2026-10-10')).concepts.get('oven')?.card,
    );
  });

  it('Re-running a lab and its debrief', () => {
    const run = (day: string, hints: number): Log => [
      [at(day, 10), labDoneOf('lab-m01-a', hints)],
      [at(day, 10, 1), right('oven', 'q-oven-1', 'debrief')],
      [at(day, 10, 2), right('proofing', 'q-proofing-1', 'debrief')],
    ];
    const once = memoryOf(run('2026-10-10', 1));
    const again = memoryOf([
      ...run('2026-10-10', 1),
      ...run('2026-10-10', 0),
      [at('2026-10-11', 10), labDoneOf('lab-m01-a', 0)],
    ]);
    expect(once.xp).toBe(50);
    expect(again.xp).toBe(once.xp);
    expect(again.qualifyingDays.has('2026-10-11')).toBe(false);
    expect(again.concepts.get('oven')?.card).toEqual(once.concepts.get('oven')?.card);
  });

  it('Reviewing early', () => {
    const learn: Log = [[at('2026-10-10'), right('oven', 'q-oven-1')]];
    const early: Log = [
      ...learn,
      [at('2026-10-11'), right('oven', 'q-oven-1')],
      [at('2026-10-11', 11), right('oven', 'q-oven-2')],
      [at('2026-10-12'), right('oven', 'q-oven-3')],
    ];
    const memory = memoryOf(early);
    expect(memory.concepts.get('oven')?.card).toEqual(memoryOf(learn).concepts.get('oven')?.card);
    expect(memory.xpByDay.get('2026-10-11')).toBeUndefined();
    expect(memory.xpByDay.get('2026-10-12')).toBe(10);
    expect(effortBonus(0.97)).toBe(0);
  });

  it('Always pressing Sure', () => {
    for (let p = 0; p < SURE_BREAKEVEN - 0.005; p += 0.01) {
      expect(expectedXp(p, true)).toBeLessThan(expectedXp(p, false));
    }
    expect(betXp(false, true)).toBe(0);
    const memory = memoryOf([
      [at('2026-10-10'), answerOf({ concept: 'crust', correct: false, sure: false })],
      [at('2026-10-10', 11), answerOf({ concept: 'oven', correct: false, sure: true })],
    ]);
    const queue = reviewQueue(memory, CONTENT, new Date(at('2026-10-11')), 0);
    expect(queue.items).toEqual(['oven', 'crust']);
    expect(queue.misconceptions).toBe(1);
  });

  it('Failing on purpose', () => {
    const log = (correct: boolean): Log => [
      [at('2026-10-10'), answerOf({ concept: 'oven', correct, sure: true })],
      [at('2026-10-10', 11), answerOf({ concept: 'proofing', correct, sure: true })],
    ];
    const failed = memoryOf(log(false));
    expect(failed.xp).toBe(0);
    expect(failed.xpByEvent.size).toBe(0);
    const now = new Date(at('2026-10-10', 12));
    const wrongMastery = moduleMastery(failed, CONTENT, now).get(1) ?? 0;
    const rightMastery = moduleMastery(memoryOf(log(true)), CONTENT, now).get(1) ?? 0;
    expect(wrongMastery).toBeLessThan(rightMastery);
  });

  it('Cramming a module', () => {
    const module3 = ['flour', 'yeast', 'salt', 'water'];
    const round = (day: string, hour: number, variant: number): Log =>
      module3.map((concept, i) => [at(day, hour, i), right(concept, `q-${concept}-${variant}`)] as const);
    const cram = [...round('2026-10-10', 9, 1), ...round('2026-10-10', 10, 2), ...round('2026-10-10', 11, 3)];
    const crammed = moduleMastery(memoryOf(cram), CONTENT, new Date(at('2026-10-10', 12)));
    expect(crammed.get(3)).toBeLessThanOrEqual(41);
    const spaced = [...cram, ...round('2026-10-13', 10, 4)];
    const later = moduleMastery(memoryOf(spaced), CONTENT, new Date(at('2026-10-13', 12)));
    expect(later.get(3)).toBeGreaterThanOrEqual(85);
  });

  it('Lightning spam: the first round of a day pays at most 10, later rounds 0, no card moves, no streak', () => {
    const studied: Log = [
      [at('2026-10-10'), right('oven', 'q-oven-1')],
      [at('2026-10-10', 10, 1), right('proofing', 'q-proofing-1')],
    ];
    const names = ['oven', 'proofing', 'crust', 'flour', 'yeast', 'salt', 'water'];
    /** A round of 15 right answers on 2026-10-11 at `hour`, three seconds apart, inside its 90 seconds. */
    const round = (sid: string, hour: number): Log => {
      const qids = Array.from({ length: 15 }, (_, i) => `ql-${i}`);
      const start = Date.parse(at('2026-10-11', hour));
      return [
        [at('2026-10-11', hour), lightningStartOf(sid, qids, new Date(start + 90_000).toISOString())],
        ...qids.map(
          (qid, i) =>
            [
              new Date(start + (i + 1) * 3_000).toISOString(),
              answerOf({
                concept: names[i % names.length] ?? 'oven',
                qid,
                correct: true,
                sure: false,
                mode: 'lightning',
                sid,
              }),
            ] as const,
        ),
      ];
    };
    const base = memoryOf(studied);
    const first = memoryOf([...studied, ...round(SID2, 10)]);
    const both = memoryOf([...studied, ...round(SID2, 10), ...round(SID3, 11)]);
    expect(first.xp - base.xp).toBe(10);
    expect(both.xp - base.xp).toBe(10);
    for (const concept of names)
      expect(both.concepts.get(concept)?.card).toEqual(base.concepts.get(concept)?.card);
    expect(both.qualifyingDays.has('2026-10-11')).toBe(false);
  });
  it('Re-rolling a boss: a second pass pays nothing', () => {
    const module3 = ['flour', 'yeast', 'salt', 'water'];
    const first = memoryOf(examOf('2026-10-10', SID, 'boss', module3));
    const twice = memoryOf([
      ...examOf('2026-10-10', SID, 'boss', module3),
      ...examOf('2026-10-11', SID2, 'boss', module3),
    ]);
    expect(first.xp).toBe(100);
    expect(twice.xp).toBe(100);
  });

  it('Re-rolling a boss: 20 h cooldown and a new draw', () => {
    const module3 = ['flour', 'yeast', 'salt', 'water'];
    const events = timelineOf(examOf('2026-10-10', SID, 'boss', module3.slice(0, 1)));
    const submitted = Date.parse(events.at(-1)?.at ?? '');
    const statusAt = (ms: number) =>
      bossStatus({
        module: 3,
        progress: derive(events, null),
        lessonsRead: true,
        mastery: 70,
        now: new Date(submitted + ms),
      });
    expect(statusAt(BOSS_COOLDOWN_MS - 1).cooldownUntil).not.toBeNull();
    expect(statusAt(BOSS_COOLDOWN_MS).cooldownUntil).toBeNull();
    const pool: PoolQuestion[] = Array.from({ length: 40 }, (_, i) => ({
      id: `q-m3-${i}`,
      concept: module3[i % 4] as string,
      note: `m03/lesson-${(i % 2) + 1}`,
      type: 'single',
      module: 3,
    }));
    const drawOf = (seed: number) =>
      bossDraw({
        module: 3,
        pool,
        lessons: ['m03/lesson-1', 'm03/lesson-2'],
        progress: derive([], null),
        recall: () => 0.5,
        studied: () => true,
        now: new Date(submitted + BOSS_COOLDOWN_MS),
        seed,
      });
    expect(drawOf(1)).not.toEqual(drawOf(2));
  });

  it('Peeking at mocks: each form pays once and a remix pays nothing', () => {
    const all = ['oven', 'proofing', 'crust', 'flour'];
    const memory = memoryOf([
      ...examOf('2026-10-10', SID, 'mock', all, 'A'),
      ...examOf('2026-10-13', SID2, 'mock', all, 'A'),
      ...examOf('2026-10-16', SID3, 'mock', all, 'remix'),
    ]);
    expect(memory.xp).toBe(150);
  });

  it('Peeking at mocks: a remix never counts toward Ready or a rank', () => {
    const sid = '01JA00000000000000000000RX';
    const start = at('2026-10-27', 9);
    const picks = [
      ['q-oven-1', 'oven'],
      ['q-proofing-1', 'proofing'],
    ] as const;
    const log: Log = [
      [
        start,
        examStartOf(
          sid,
          'mock',
          picks.map(([qid]) => qid),
          { form: 'remix', deadline: mockDeadline(new Date(start)) },
        ),
      ],
      ...picks.map(
        ([qid, concept], i) =>
          [
            at('2026-10-27', 9, i + 1),
            answerOf({ concept, qid, mode: 'mock', sid, correct: true, sure: true }),
          ] as const,
      ),
      [at('2026-10-27', 10), submitOf(sid, 'mock')],
    ];
    const events = timelineOf(log);
    const progress = derive(events, null);
    expect(mockHistory(progress).map((a) => a.percent)).toEqual([1]);
    expect(firstAttempts(progress)).toEqual([]);
    const now = new Date(at('2026-10-27', 12));
    const memory = deriveMemory(events, CONTENT);
    const r = readiness({ memory, content: CONTENT, attempts: firstAttempts(progress), now, tz: 0 });
    expect(r.mock).toBeNull();
    expect(r.capped).toBe(true);
    // One mock at 80 is enough here, so only skipping the remix can keep this rank unmet.
    const oneMock: RankDef = {
      id: 'one-mock',
      name: 'One Mock',
      short: 'One Mock',
      requires: { unseenMocksAt80: 1, latestMockWithinDays: 14, ready: true },
      facts: [],
    };
    expect(
      meets(oneMock, rankFacts({ progress, mastery: new Map(), ready: true, today: '2026-10-27' })),
    ).toBe(false);
  });
});
