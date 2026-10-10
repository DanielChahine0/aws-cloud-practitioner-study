import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { addDays } from '../../src/engine/day.ts';
import { deriveMemory, isDue, type MemoryContent } from '../../src/engine/memory.ts';
import {
  CHUNK_SIZE,
  CONFUSABLE_DAYS,
  CONFUSABLE_GAP,
  ITEM_SECONDS,
  LOOKAHEAD,
  NEW_CONCEPT_CAP,
  reviewQueue,
} from '../../src/engine/queue.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, type ConceptSpec, contentOf } from '../fixtures/memory.ts';

const good = (concept: string): NewEvent => answerOf({ concept, correct: true, sure: true });
const queueAt = (content: MemoryContent, log: readonly (readonly [string, NewEvent])[], now: string) =>
  reviewQueue(deriveMemory(timelineOf(log), content), content, new Date(now), 0);

describe('queue constants', () => {
  it('match spec 3.6 and 3.7', () => {
    expect([CHUNK_SIZE, LOOKAHEAD, CONFUSABLE_DAYS, CONFUSABLE_GAP, NEW_CONCEPT_CAP, ITEM_SECONDS]).toEqual([
      20, 5, 2, 3, 20, 30,
    ]);
  });
});

describe('reviewQueue', () => {
  it('puts misconceptions first, even when they are not due', () => {
    const content = contentOf([
      { id: 'm-miss', module: 1 },
      { id: 'd-due', module: 2 },
    ]);
    const log = timelineOf([
      [at('2026-10-10'), answerOf({ concept: 'm-miss', correct: false, sure: true })],
      [at('2026-10-10', 11), answerOf({ concept: 'd-due', correct: false, sure: false })],
      [at('2026-10-11'), answerOf({ concept: 'm-miss', qid: 'q-m-miss-2', correct: true, sure: false })],
    ]);
    const memory = deriveMemory(log, content);
    const now = new Date(at('2026-10-12', 12));
    const card = memory.concepts.get('m-miss')?.card;
    if (!card) throw new Error('m-miss has no card');
    expect(isDue(card, now, 0)).toBe(false);
    const queue = reviewQueue(memory, content, now, 0);
    expect(queue.items).toEqual(['m-miss', 'd-due']);
    expect(queue.misconceptions).toBe(1);
    expect(queue.due).toBe(1);
  });

  it('keeps every misconception ahead of due concepts when interleaving', () => {
    const content = contentOf([
      { id: 'm1', module: 1 },
      { id: 'm2', module: 1 },
      { id: 'd', module: 2 },
    ]);
    const queue = queueAt(
      content,
      [
        [at('2026-10-10'), answerOf({ concept: 'm1', correct: false, sure: true })],
        [at('2026-10-10', 11), answerOf({ concept: 'm2', correct: false, sure: true })],
        [at('2026-10-10', 12), answerOf({ concept: 'd', correct: false, sure: false })],
      ],
      at('2026-10-12', 12),
    );
    expect(queue.misconceptions).toBe(2);
    expect(queue.items).toEqual(['m1', 'm2', 'd']);
  });

  it('interleaves the first due concept against the last misconception', () => {
    const content = contentOf([
      { id: 'm', module: 1 },
      { id: 'd1', module: 1 },
      { id: 'd2', module: 2 },
    ]);
    const queue = queueAt(
      content,
      [
        [at('2026-10-01'), good('d1')],
        [at('2026-10-05'), good('d2')],
        [at('2026-10-10'), answerOf({ concept: 'm', correct: false, sure: true })],
      ],
      at('2026-10-20'),
    );
    expect(queue.misconceptions).toBe(1);
    expect(queue.items).toEqual(['m', 'd2', 'd1']);
  });

  it('never pulls a due confusable partner into the misconception block', () => {
    const content = contentOf([
      { id: 'm1', module: 1, confusableWith: ['z'] },
      { id: 'm2', module: 2 },
      { id: 'm3', module: 1 },
      { id: 'm4', module: 2 },
      { id: 'z', module: 3, confusableWith: ['m1'] },
    ]);
    const queue = queueAt(
      content,
      [
        [at('2026-10-10'), answerOf({ concept: 'm1', correct: false, sure: true })],
        [at('2026-10-10'), answerOf({ concept: 'm2', correct: false, sure: true })],
        [at('2026-10-10'), answerOf({ concept: 'm3', correct: false, sure: true })],
        [at('2026-10-10'), answerOf({ concept: 'm4', correct: false, sure: true })],
        [at('2026-10-10'), answerOf({ concept: 'z', correct: false, sure: false })],
      ],
      at('2026-10-12', 12),
    );
    expect(queue.misconceptions).toBe(4);
    expect(queue.items).toEqual(['m1', 'm2', 'm3', 'm4', 'z']);
  });

  it('drops a misconception from the queue once it was answered today', () => {
    const content = contentOf([{ id: 'm-miss', module: 1 }]);
    const queue = queueAt(
      content,
      [
        [at('2026-10-10'), answerOf({ concept: 'm-miss', correct: false, sure: true })],
        [at('2026-10-11'), answerOf({ concept: 'm-miss', qid: 'q-m-miss-2', correct: true, sure: false })],
      ],
      at('2026-10-11', 12),
    );
    expect(queue.items).toEqual([]);
    expect(queue.misconceptions).toBe(0);
  });

  it('orders due concepts by recall, lowest first', () => {
    const content = contentOf([
      { id: 'x1', module: 1 },
      { id: 'x2', module: 2 },
      { id: 'x3', module: 3 },
    ]);
    const queue = queueAt(
      content,
      [
        [at('2026-10-10'), good('x2')],
        [at('2026-10-11'), good('x1')],
        [at('2026-10-12'), good('x3')],
      ],
      at('2026-10-20'),
    );
    expect(queue.items).toEqual(['x2', 'x1', 'x3']);
    expect(queue.due).toBe(3);
    expect(queue.catchUp).toBe(false);
  });

  it('never puts two concepts of one module side by side while another module is within 5', () => {
    const specs: ConceptSpec[] = [
      { id: 'p1', module: 1 },
      { id: 'p2', module: 1 },
      { id: 'p3', module: 1 },
      { id: 'p4', module: 1 },
      { id: 'r1', module: 2 },
      { id: 'r2', module: 2 },
    ];
    const log = specs.map(({ id }, i) => [at(addDays('2026-10-01', i)), good(id)] as const);
    const queue = queueAt(contentOf(specs), log, at('2026-10-20'));
    expect(queue.items).toEqual(['p1', 'r1', 'p2', 'r2', 'p3', 'p4']);
  });

  it('takes the next item when no other module is within 5', () => {
    const specs: ConceptSpec[] = [
      ...['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => ({ id, module: 1 })),
      { id: 'r1', module: 2 },
    ];
    const log = specs.map(({ id }, i) => [at(addDays('2026-10-01', i)), good(id)] as const);
    const queue = queueAt(contentOf(specs), log, at('2026-10-20'));
    expect(queue.items).toEqual(['p1', 'p2', 'r1', 'p3', 'p4', 'p5', 'p6']);
  });

  it('brings a confusable pair due a day apart within 3 positions', () => {
    const fillers = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'];
    const content = contentOf([
      { id: 'a-pair', module: 1, confusableWith: ['z-pair'] },
      { id: 'z-pair', module: 2, confusableWith: ['a-pair'] },
      ...fillers.map((id, i) => ({ id, module: 3 + (i % 2) })),
    ]);
    const fillerLog = fillers.map((id, i) => [at('2026-10-01', 11 + i), good(id)] as const);
    const near = queueAt(
      content,
      [[at('2026-10-01'), good('a-pair')], ...fillerLog, [at('2026-10-02'), good('z-pair')]],
      at('2026-10-20'),
    );
    expect(near.items).toEqual(['a-pair', 'f1', 'f2', 'z-pair', 'f3', 'f4', 'f5', 'f6']);
    const far = queueAt(
      content,
      [[at('2026-10-01'), good('a-pair')], ...fillerLog, [at('2026-10-08'), good('z-pair')]],
      at('2026-10-20'),
    );
    expect(far.items.indexOf('z-pair') - far.items.indexOf('a-pair')).toBeGreaterThan(CONFUSABLE_GAP);
  });

  it('never lists an untested concept', () => {
    const tested = contentOf([
      { id: 'u1', module: 1 },
      { id: 't1', module: 2 },
    ]);
    const memory = deriveMemory(
      timelineOf([
        [at('2026-10-10'), good('u1')],
        [at('2026-10-10', 11), good('t1')],
      ]),
      tested,
    );
    const untested = contentOf([
      { id: 'u1', module: 1, tested: false },
      { id: 't1', module: 2 },
    ]);
    const queue = reviewQueue(memory, untested, new Date(at('2026-10-20')), 0);
    expect(queue.items).toEqual(['t1']);
    expect(queue.due).toBe(1);
  });

  it('plans a catch-up of the 60 lowest-recall concepts when more than 100 are due', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `k${String(i).padStart(3, '0')}`);
    const content = contentOf(ids.map((id, i) => ({ id, module: (i % 13) + 1 })));
    const day1 = ids.map(
      (id, i) =>
        [at('2026-10-10', 10, i % 60), answerOf({ concept: id, correct: false, sure: false })] as const,
    );
    const queue = queueAt(content, day1, at('2026-10-12', 12));
    expect(queue.due).toBe(101);
    expect(queue.catchUp).toBe(true);
    expect(queue.items).toHaveLength(60);
    expect([...queue.items].sort()).toEqual(ids.slice(0, 60));
    expect(queue.lessonsAllowed).toBe(false);

    const day2 = ids.slice(0, 60).map((id, i) => [at('2026-10-12', 9, i % 60), good(id)] as const);
    const after = queueAt(content, [...day1, ...day2], at('2026-10-12', 12));
    expect(after.catchUp).toBe(true);
    expect(after.items).toEqual([]);
    expect(after.due).toBe(41);
    expect(after.lessonsAllowed).toBe(true);
  });

  it('allows lessons until 20 concepts are new today', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `n${String(i).padStart(2, '0')}`);
    const content = contentOf(ids.map((id) => ({ id, module: 1 })));
    const log = ids.map((id, i) => [at('2026-10-10', 10, i), good(id)] as const);
    const nineteen = queueAt(content, log.slice(0, 19), at('2026-10-10', 12));
    expect(nineteen.newToday).toBe(19);
    expect(nineteen.lessonsAllowed).toBe(true);
    const twenty = queueAt(content, log, at('2026-10-10', 12));
    expect(twenty.newToday).toBe(20);
    expect(twenty.lessonsAllowed).toBe(false);
    const tomorrow = queueAt(content, log, at('2026-10-11', 12));
    expect(tomorrow.newToday).toBe(0);
    expect(tomorrow.lessonsAllowed).toBe(true);
  });

  it('says when the next concepts fall due once nothing is queued', () => {
    const content = contentOf([
      { id: 'n1', module: 1 },
      { id: 'n2', module: 2 },
      { id: 'n3', module: 3 },
    ]);
    expect(queueAt(content, [], at('2026-10-10', 12)).next).toBeNull();
    const queue = queueAt(
      content,
      [
        [at('2026-10-10'), answerOf({ concept: 'n1', correct: true, sure: false })],
        [at('2026-10-10', 11), answerOf({ concept: 'n2', correct: true, sure: false })],
        [at('2026-10-10', 12), good('n3')],
      ],
      at('2026-10-10', 15),
    );
    expect(queue.items).toEqual([]);
    expect(queue.due).toBe(0);
    expect(queue.next).toEqual({ count: 2, at: '2026-10-12T04:00:00.000Z' });
  });

  it('reads due and the next day start in the given offset', () => {
    const content = contentOf([{ id: 'o1', module: 1 }]);
    const log = timelineOf([['2026-10-10T08:00:00.000Z', good('o1')]], 120);
    const memory = deriveMemory(log, content);
    expect(memory.concepts.get('o1')?.card?.due).toBe('2026-10-13T08:00:00.000Z');
    expect(reviewQueue(memory, content, new Date('2026-10-13T01:59:00.000Z'), 120).items).toEqual([]);
    expect(reviewQueue(memory, content, new Date('2026-10-13T02:00:00.000Z'), 120).items).toEqual(['o1']);
    expect(reviewQueue(memory, content, new Date('2026-10-10T09:00:00.000Z'), 120).next).toEqual({
      count: 1,
      at: '2026-10-13T02:00:00.000Z',
    });
  });
});
