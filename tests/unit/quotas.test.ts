import { describe, expect, it } from 'vitest';
import { TASK_IDS } from '../../schemas/common.ts';
import {
  domainCounts,
  domainOf,
  FORM_COUNT,
  largestRemainder,
  MULTI_PER_FORM,
  multiByModule,
  poolCells,
  type QuotaConcept,
  taskCounts,
} from '../../src/engine/quotas.ts';

const DOMAINS = domainCounts({ '1': 24, '2': 30, '3': 34, '4': 12 });

/** Made-up tested concepts: `n` concepts in `module` tagged with `tasks`. */
function concepts(module: number, tasks: readonly string[], n: number): QuotaConcept[] {
  return Array.from({ length: n }, (_, i) => ({ id: `m${module}-${tasks.join('-')}-${i}`, module, tasks }));
}
const REGISTRY: QuotaConcept[] = [
  ...concepts(1, ['1.1'], 10),
  ...concepts(1, ['1.1', '1.4'], 5),
  ...concepts(2, ['1.2'], 1),
  ...concepts(2, ['1.3'], 30),
  ...concepts(3, ['2.1'], 4),
  ...concepts(3, ['2.2'], 40),
  ...concepts(4, ['2.2', '2.3'], 10),
  ...concepts(4, ['2.4'], 8),
  ...TASK_IDS.filter((t) => t.startsWith('3.')).flatMap((t, i) => concepts(5 + (i % 3), [t], 6 + i)),
  ...concepts(9, ['4.1'], 12),
  ...concepts(9, ['4.2'], 2),
  ...concepts(10, ['4.3'], 20),
];

describe('largestRemainder', () => {
  it('splits 65 by the CLF-C02 weights into 16, 19, 22 and 8', () => {
    expect(largestRemainder(65, [24, 30, 34, 12])).toEqual([16, 19, 22, 8]);
    expect(DOMAINS).toEqual({ '1': 16, '2': 19, '3': 22, '4': 8 });
  });

  it('breaks ties by the larger remainder, then the larger weight, then the earlier index', () => {
    expect(largestRemainder(3, [1, 1, 1, 1])).toEqual([1, 1, 1, 0]);
    expect(largestRemainder(1, [1, 3])).toEqual([0, 1]);
    expect(largestRemainder(2, [2, 1, 2, 1])).toEqual([1, 0, 1, 0]);
    expect(largestRemainder(2, [1, 3])).toEqual([0, 2]);
  });

  it('gives nothing to all-zero weights', () => {
    expect(largestRemainder(5, [0, 0])).toEqual([0, 0]);
  });
});

describe('taskCounts', () => {
  const counts = taskCounts(REGISTRY, DOMAINS, TASK_IDS);

  it('splits each domain over its tasks by the concepts tagged with each task', () => {
    // Domain 1 weights 15, 1, 30, 5 of 51: 4.71, 0.31, 9.41, 1.57 floor to 4, 0, 9, 1, then 1.4 and 1.1 take the 2 left.
    expect([counts['1.1'], counts['1.2'], counts['1.3'], counts['1.4']]).toEqual([5, 1, 8, 2]);
    // Domain 2 weights 4, 50, 10, 8 of 72 give 1.06, 13.19, 2.64, 2.11, so 1, 13, 3, 2.
    expect([counts['2.1'], counts['2.2'], counts['2.3'], counts['2.4']]).toEqual([1, 13, 3, 2]);
    expect([counts['4.1'], counts['4.2'], counts['4.3']]).toEqual([3, 1, 4]);
  });

  it('raises a covered task from 0 to 1 by taking a seat from the task with the most', () => {
    // Without the raise, 1.2 (1 concept of 51) would round to 0 and 1.3 would keep 9.
    expect(largestRemainder(16, [15, 1, 30, 5])).toEqual([5, 0, 9, 2]);
    expect(counts['1.2']).toBe(1);
    expect(counts['1.3']).toBe(8);
  });

  it('takes the raised seat from the later task when two tie for the most', () => {
    // Weights 20, 1, 20 of 41 split 8 seats into 4, 0, 4; 4.2 then takes its seat from 4.3, not 4.1.
    const tied = [...concepts(1, ['4.1'], 20), ...concepts(1, ['4.2'], 1), ...concepts(1, ['4.3'], 20)];
    const seats = taskCounts(tied, { '1': 0, '2': 0, '3': 0, '4': 8 }, ['4.1', '4.2', '4.3']);
    expect(seats).toEqual({ '4.1': 4, '4.2': 1, '4.3': 3 });
  });

  it('sums to 65 over the 19 tasks and to each domain count within it', () => {
    expect(Object.values(counts).reduce((a, n) => a + n, 0)).toBe(65);
    for (const d of ['1', '2', '3', '4'] as const) {
      const inDomain = TASK_IDS.filter((t) => domainOf(t) === d).reduce((a, t) => a + (counts[t] ?? 0), 0);
      expect(inDomain).toBe(DOMAINS[d]);
    }
  });
});

describe('poolCells and multiByModule', () => {
  const tasks = taskCounts(REGISTRY, DOMAINS, TASK_IDS);
  const cells = poolCells(REGISTRY, tasks);

  it('gives each task 4 x its per-form count, split over the modules of its tagged concepts', () => {
    for (const t of TASK_IDS) {
      const sum = cells.filter((c) => c.task === t).reduce((a, c) => a + c.target, 0);
      expect(sum, t).toBe(FORM_COUNT * (tasks[t] ?? 0));
    }
    expect(cells.filter((c) => c.task === '2.2')).toEqual([
      { module: 3, task: '2.2', target: 42 },
      { module: 4, task: '2.2', target: 10 },
    ]);
    expect(cells.reduce((a, c) => a + c.target, 0)).toBe(260);
  });

  it('sorts cells by module, then task, and drops empty ones', () => {
    const keys = cells.map((c) => [c.module, c.task] as const);
    expect(keys).toEqual([...keys].sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1])));
    expect(cells.every((c) => c.target > 0)).toBe(true);
  });

  it('splits 8, 8, 12 and 4 multi-response items over the modules by their cells in each domain', () => {
    const shares = multiByModule(cells);
    for (const d of ['1', '2', '3', '4'] as const) {
      const sum = shares.filter((s) => s.domain === d).reduce((a, s) => a + s.target, 0);
      expect(sum, d).toBe(FORM_COUNT * MULTI_PER_FORM[d]);
    }
    // Domain 2 cells: module 3 holds 4 + 42 = 46 seats and module 4 holds 10 + 12 + 8 = 30, so 4.84 and 3.16.
    expect(shares.filter((s) => s.domain === '2')).toEqual([
      { module: 3, domain: '2', target: 5 },
      { module: 4, domain: '2', target: 3 },
    ]);
  });
});
