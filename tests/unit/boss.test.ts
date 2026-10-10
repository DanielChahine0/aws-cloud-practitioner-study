import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import {
  BOSS_COOLDOWN_MS,
  BOSS_FROM_EARLIER,
  BOSS_MINUTES,
  BOSS_SIZE,
  bossDeadline,
  bossDraw,
  bossScope,
  bossStatus,
} from '../../src/engine/boss.ts';
import { derive } from '../../src/engine/replay.ts';
import { type ExamPoolQuestion, learnPool, type PoolQuestion } from '../../src/engine/select.ts';
import { eventsOf, SID, SID2 } from '../fixtures/events.ts';
import { answerOf, examStartOf, submitOf } from '../fixtures/memory.ts';

/** Made-up bakery pools: module `m` has `concepts` concepts over `lessons` lessons, `variants` items each. */
function modulePool(m: number, concepts: number, lessons: number, variants = 2): PoolQuestion[] {
  const mm = String(m).padStart(2, '0');
  return Array.from({ length: concepts }, (_, c) => {
    const concept = `bake-${mm}-${String(c + 1).padStart(2, '0')}`;
    const note = `m${mm}/lesson-${(c % lessons) + 1}`;
    return Array.from({ length: variants }, (_, v) => ({
      id: `q-${concept}-${v + 1}`,
      concept,
      note,
      type: v === 2 ? ('multi' as const) : ('single' as const),
      module: m,
    }));
  }).flat();
}
const lessonsOf = (m: number, n: number) =>
  Array.from({ length: n }, (_, i) => `m${String(m).padStart(2, '0')}/lesson-${i + 1}`);
const EMPTY = derive([], null);
const NOW = new Date('2026-10-20T10:00:00.000Z');
const draw = (over: Partial<Parameters<typeof bossDraw>[0]> = {}) =>
  bossDraw({
    module: 3,
    pool: [...modulePool(1, 10, 2), ...modulePool(2, 10, 2), ...modulePool(3, 14, 3)],
    lessons: lessonsOf(3, 3),
    progress: EMPTY,
    recall: () => 0.5,
    studied: () => true,
    now: NOW,
    seed: 11,
    ...over,
  });
const moduleOf = (qid: string) => Number(qid.slice(7, 9));

describe('bossDraw (spec 4.2)', () => {
  it('times a boss at 21 minutes for 15 items', () => {
    expect(BOSS_SIZE).toBe(15);
    expect(BOSS_MINUTES).toBe(21);
    expect(bossDeadline(NOW)).toBe('2026-10-20T10:21:00.000Z');
  });

  it('never draws from the exam pool', () => {
    const practice = modulePool(3, 14, 3);
    const exam: ExamPoolQuestion[] = modulePool(3, 14, 3).map((p) => ({ ...p, id: `x${p.id}`, form: 'A' }));
    for (let seed = 0; seed < 50; seed++) {
      const ids = draw({ pool: learnPool(practice, exam, new Set()), seed });
      expect(ids).toHaveLength(BOSS_SIZE);
      expect(ids.filter((id) => id.startsWith('x'))).toEqual([]);
    }
  });

  it('still draws 15 when every variant was seen within 7 days', () => {
    const pool = modulePool(1, 8, 2);
    const seen = derive(
      eventsOf(...pool.map((p) => answerOf({ concept: p.concept, qid: p.id, correct: true, sure: true }))),
      null,
    );
    const ids = draw({ module: 1, pool, lessons: lessonsOf(1, 2), progress: seen });
    expect(ids).toHaveLength(BOSS_SIZE);
    expect(new Set(ids).size).toBe(BOSS_SIZE);
  });

  it('prefers a never-seen variant, then the least recently seen', () => {
    const pool = modulePool(1, 15, 3);
    const answered = (ids: readonly string[]) =>
      derive(
        eventsOf(
          ...ids.map((id) => answerOf({ concept: id.slice(2, 12), qid: id, correct: true, sure: true })),
        ),
        null,
      );
    const firsts = pool.filter((p) => p.id.endsWith('-1')).map((p) => p.id);
    const seconds = pool.filter((p) => p.id.endsWith('-2')).map((p) => p.id);
    const fresh = draw({ module: 1, pool, lessons: lessonsOf(1, 3), progress: answered(firsts) });
    expect(fresh.every((id) => id.endsWith('-2'))).toBe(true);
    const stale = draw({
      module: 1,
      pool,
      lessons: lessonsOf(1, 3),
      progress: answered([...seconds, ...firsts]),
    });
    expect(stale.every((id) => id.endsWith('-2'))).toBe(true);
    expect(stale).toHaveLength(BOSS_SIZE);
  });

  it('covers every lesson of the module', () => {
    const lessons = lessonsOf(3, 3);
    const pool = [...modulePool(2, 10, 2), ...modulePool(3, 14, 3)];
    const lowLesson3 = (concept: string) =>
      pool.find((p) => p.concept === concept)?.note === lessons[2] ? 1 : 0;
    for (let seed = 0; seed < 100; seed++) {
      const ids = draw({ pool, lessons, recall: lowLesson3, seed });
      const notes = new Set(ids.map((id) => pool.find((p) => p.id === id)?.note));
      for (const lesson of lessons) expect(notes.has(lesson)).toBe(true);
    }
  });

  it('draws all 15 from Module 1 for the Module 1 boss', () => {
    const pool = modulePool(1, 10, 2);
    const ids = draw({ module: 1, pool, lessons: lessonsOf(1, 2) });
    expect(ids).toHaveLength(BOSS_SIZE);
    expect(ids.every((id) => moduleOf(id) === 1)).toBe(true);
    expect(new Set(ids.map((id) => id.slice(2, 12))).size).toBe(10);
  });

  it('takes 3 items from studied concepts of earlier modules, lowest recall first', () => {
    const studied = (c: string) =>
      c.endsWith('-01') || c.endsWith('-02') || c.endsWith('-03') || c.endsWith('-04');
    const recall = (c: string) => (c === 'bake-01-04' ? 0.9 : c.startsWith('bake-03') ? 0.5 : 0.1);
    const ids = draw({ studied, recall });
    const earlier = ids.filter((id) => moduleOf(id) < 3);
    expect(earlier).toHaveLength(BOSS_FROM_EARLIER);
    for (const id of earlier) {
      const concept = id.slice(2, 12);
      expect(studied(concept)).toBe(true);
      expect(concept).not.toBe('bake-01-04');
    }
    expect(ids.filter((id) => moduleOf(id) === 3)).toHaveLength(12);
  });

  it('fills a shortfall of earlier concepts from the module', () => {
    const ids = draw({ studied: (c) => c === 'bake-01-01' });
    expect(ids.filter((id) => moduleOf(id) < 3)).toHaveLength(1);
    expect(ids).toHaveLength(BOSS_SIZE);
  });

  it('draws single and multi items only', () => {
    const pool = modulePool(1, 10, 2, 3).map((p) =>
      p.id.endsWith('-1') ? { ...p, type: 'match' as const } : p,
    );
    for (let seed = 0; seed < 20; seed++) {
      const ids = draw({ module: 1, pool, lessons: lessonsOf(1, 2), seed });
      expect(ids).toHaveLength(BOSS_SIZE);
      expect(ids.some((id) => id.endsWith('-1'))).toBe(false);
    }
    const small = modulePool(1, 4, 2).map((p) =>
      p.id.endsWith('-1') ? { ...p, type: 'match' as const } : p,
    );
    expect(draw({ module: 1, pool: small, lessons: lessonsOf(1, 2) })).toHaveLength(4);
  });

  it('gives the same draw for the same seed and a fresh draw after a fail', () => {
    expect(draw({ seed: 5 })).toEqual(draw({ seed: 5 }));
    const draws = new Set(Array.from({ length: 20 }, (_, seed) => [...draw({ seed })].sort().join(' ')));
    expect(draws.size).toBeGreaterThan(10);
  });

  it('favours concepts with low recall over 1,000 seeds', () => {
    const pool = modulePool(3, 24, 2, 1);
    const low = (c: string) => Number(c.slice(-2)) % 2 === 0;
    let lowCount = 0;
    let highCount = 0;
    for (let seed = 0; seed < 1000; seed++) {
      for (const id of draw({ pool, lessons: lessonsOf(3, 2), recall: (c) => (low(c) ? 0 : 1), seed })) {
        if (low(id.slice(2, 12))) lowCount++;
        else highCount++;
      }
    }
    expect(lowCount).toBeGreaterThan(1.5 * highCount);
  });
});

describe('bossStatus (spec 3.11, 4.2)', () => {
  const qids = Array.from({ length: 15 }, (_, i) => `qb-${i}`);
  const boss = (sid: string, right: number): NewEvent[] => [
    examStartOf(sid, 'boss', qids, { scope: 'm03', deadline: '2026-10-10T09:00:00.000Z' }),
    ...qids.map((qid, i) =>
      answerOf({ concept: 'oven', qid, correct: i < right, sure: false, mode: 'boss', sid }),
    ),
    submitOf(sid, 'boss'),
  ];
  const status = (events: NewEvent[], over: Partial<Parameters<typeof bossStatus>[0]> = {}) =>
    bossStatus({
      module: 3,
      progress: derive(eventsOf(...events), null),
      lessonsRead: true,
      mastery: 60,
      now: NOW,
      ...over,
    });

  it('names the boss scope after its module', () => {
    expect(bossScope(3)).toBe('m03');
    expect(bossScope(12)).toBe('m12');
  });

  it('stays locked until every lesson of the module is read', () => {
    expect(status([], { lessonsRead: false })).toMatchObject({ unlocked: false, ready: false, attempts: 0 });
  });

  it('is ready at mastery 60 with the lessons read and no pass', () => {
    expect(status([], { mastery: 59 }).ready).toBe(false);
    expect(status([])).toEqual({
      unlocked: true,
      passed: false,
      passedAt: null,
      ready: true,
      cooldownUntil: null,
      open: null,
      attempts: 0,
    });
  });

  it('records a pass at 12 of 15 and is then no longer ready', () => {
    const events = eventsOf(...boss(SID, 12));
    const s = bossStatus({
      module: 3,
      progress: derive(events, null),
      lessonsRead: true,
      mastery: 80,
      now: NOW,
    });
    expect(s).toMatchObject({ passed: true, ready: false, attempts: 1, passedAt: events.at(-1)?.at });
    expect(status(boss(SID, 11)).passed).toBe(false);
  });

  it('holds a 20 h cooldown after any submitted boss: on at 19 h 59 min, over at 20 h', () => {
    const events = eventsOf(...boss(SID, 3));
    const submitted = Date.parse(events.at(-1)?.at ?? '');
    const at = (ms: number) =>
      bossStatus({
        module: 3,
        progress: derive(events, null),
        lessonsRead: true,
        mastery: 70,
        now: new Date(submitted + ms),
      });
    expect(at(BOSS_COOLDOWN_MS - 60_000).cooldownUntil).toBe(
      new Date(submitted + BOSS_COOLDOWN_MS).toISOString(),
    );
    expect(at(BOSS_COOLDOWN_MS).cooldownUntil).toBeNull();
    const passed = eventsOf(...boss(SID, 15));
    const passedAt = Date.parse(passed.at(-1)?.at ?? '');
    const after = bossStatus({
      module: 3,
      progress: derive(passed, null),
      lessonsRead: true,
      mastery: 90,
      now: new Date(passedAt + 60_000),
    });
    expect(after.cooldownUntil).toBe(new Date(passedAt + BOSS_COOLDOWN_MS).toISOString());
  });

  it('finds the open boss of the module', () => {
    const open = examStartOf(SID2, 'boss', qids, { scope: 'm03', deadline: '2026-10-10T09:00:00.000Z' });
    expect(status([open]).open?.sid).toBe(SID2);
    expect(status([open], { module: 4 }).open).toBeNull();
  });
});
