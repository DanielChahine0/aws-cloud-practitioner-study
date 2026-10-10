import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { betXp, expectedXp, SURE_BREAKEVEN } from '../../src/engine/bets.ts';
import { moduleMastery } from '../../src/engine/mastery.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { reviewQueue } from '../../src/engine/queue.ts';
import { effortBonus } from '../../src/engine/xp.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf } from '../fixtures/memory.ts';

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
const right = (concept: string, qid: string, mode: 'check' | 'quiz' = 'check') =>
  answerOf({ concept, qid, mode, correct: true, sure: true });

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

  it.todo('Lightning spam (lightning arrives in Phase 4)');
  it.todo('Re-rolling a boss (bosses arrive in Phase 3)');
  it.todo('Peeking at mocks (mocks arrive in Phase 3)');
});
