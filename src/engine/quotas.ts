/**
 * Exam-pool quota math (spec 2.6 and 4.3): domain counts per form, per-task counts, the pool's module by task
 * cells and each module's share of the multi-response target. Pure; `pnpm content:quotas` and the engine share it.
 */
import { DOMAIN_IDS, type DomainIdValue } from '../../schemas/ids.ts';

export type Domain = DomainIdValue;

/** Questions in one mock form (spec 4.3). */
export const FORM_SIZE = 65;
/** Mock forms A to D (spec 4.3). */
export const FORM_COUNT = 4;
/** No concept holds more exam-pool items than there are forms (spec 2.6). */
export const MAX_PER_CONCEPT = 4;
/** Multi-response items per form, by domain (spec 4.3). */
export const MULTI_PER_FORM: Readonly<Record<Domain, number>> = { '1': 2, '2': 2, '3': 3, '4': 1 };

/** The domain of a task id: its first character. */
export function domainOf(task: string): Domain {
  const domain = DOMAIN_IDS.find((d) => task.startsWith(`${d}.`));
  if (domain === undefined) throw new Error(`task ${task} is in no domain`);
  return domain;
}

/**
 * Splits `total` in proportion to `weights`, flooring each share and giving the seats left over one by one to the
 * largest remainder; ties go to the larger weight, then to the earlier index. All-zero weights get nothing.
 */
export function largestRemainder(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, w) => a + w, 0);
  if (sum === 0) return weights.map(() => 0);
  // Integer arithmetic: share i is floor(total * w / sum) and its remainder is (total * w) mod sum.
  const floors = weights.map((w) => Math.floor((total * w) / sum));
  const remainders = weights.map((w, i) => total * w - (floors[i] ?? 0) * sum);
  let left = total - floors.reduce((a, f) => a + f, 0);
  const order = weights
    .map((w, i) => ({ w, i, r: remainders[i] ?? 0 }))
    .sort((a, b) => b.r - a.r || b.w - a.w || a.i - b.i);
  for (const { i } of order) {
    if (left === 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    left -= 1;
  }
  return floors;
}

/** A tested concept as quota math sees it: its home module and every task it is tagged with. */
export interface QuotaConcept {
  id: string;
  module: number;
  tasks: readonly string[];
}

/** Questions per domain in one form: 65 x weights / 100 by largest remainder (16, 19, 22 and 8 for CLF-C02). */
export function domainCounts(weights: Readonly<Record<Domain, number>>): Record<Domain, number> {
  const seats = largestRemainder(
    FORM_SIZE,
    DOMAIN_IDS.map((d) => weights[d]),
  );
  return { '1': seats[0] ?? 0, '2': seats[1] ?? 0, '3': seats[2] ?? 0, '4': seats[3] ?? 0 };
}

/**
 * Questions per task in one form: each domain's seats split over its tasks in proportion to the tested concepts
 * tagged with each task (a concept counts once in every task it carries); a covered task that rounds to 0 takes
 * one seat from the task in its domain with the most seats (ties: the later task id).
 */
export function taskCounts(
  concepts: readonly QuotaConcept[],
  domains: Readonly<Record<Domain, number>>,
  taskIds: readonly string[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of DOMAIN_IDS) {
    const tasks = taskIds.filter((t) => domainOf(t) === d);
    const tagged = tasks.map((t) => concepts.filter((c) => c.tasks.includes(t)).length);
    const seats = largestRemainder(domains[d], tagged);
    for (const [i, t] of tasks.entries()) counts[t] = seats[i] ?? 0;
    for (const [i, t] of tasks.entries()) {
      if ((tagged[i] ?? 0) === 0 || counts[t] !== 0) continue;
      let donor: string | undefined;
      for (const other of tasks) {
        if ((counts[other] ?? 0) >= (donor === undefined ? 2 : (counts[donor] ?? 0))) donor = other;
      }
      if (donor === undefined) continue;
      counts[donor] = (counts[donor] ?? 0) - 1;
      counts[t] = 1;
    }
  }
  return counts;
}

/** One module by task cell of the exam pool: how many live items the module's writer owes that task. */
export interface Cell {
  module: number;
  task: string;
  target: number;
}

/**
 * The pool's cells: each task's pool target (4 x its per-form count) split over the home modules of the concepts
 * tagged with it, by largest remainder; empty cells are dropped, and cells sort by module, then task.
 */
export function poolCells(
  concepts: readonly QuotaConcept[],
  tasks: Readonly<Record<string, number>>,
): Cell[] {
  const cells: Cell[] = [];
  for (const [task, perForm] of Object.entries(tasks)) {
    const target = FORM_COUNT * perForm;
    const modules = [...new Set(concepts.filter((c) => c.tasks.includes(task)).map((c) => c.module))].sort(
      (a, b) => a - b,
    );
    const weights = modules.map(
      (m) => concepts.filter((c) => c.module === m && c.tasks.includes(task)).length,
    );
    const split = largestRemainder(target, weights);
    for (const [i, module] of modules.entries()) {
      const n = split[i] ?? 0;
      if (n > 0) cells.push({ module, task, target: n });
    }
  }
  return cells.sort((a, b) => a.module - b.module || a.task.localeCompare(b.task));
}

/** Each module's share of a domain's multi-response target (4 x MULTI_PER_FORM), in proportion to its cells there. */
export function multiByModule(cells: readonly Cell[]): { module: number; domain: Domain; target: number }[] {
  const out: { module: number; domain: Domain; target: number }[] = [];
  for (const d of DOMAIN_IDS) {
    const inDomain = cells.filter((c) => domainOf(c.task) === d);
    const modules = [...new Set(inDomain.map((c) => c.module))].sort((a, b) => a - b);
    const weights = modules.map((m) =>
      inDomain.filter((c) => c.module === m).reduce((sum, c) => sum + c.target, 0),
    );
    const split = largestRemainder(FORM_COUNT * MULTI_PER_FORM[d], weights);
    for (const [i, module] of modules.entries()) {
      const n = split[i] ?? 0;
      if (n > 0) out.push({ module, domain: d, target: n });
    }
  }
  return out.sort((a, b) => a.module - b.module || a.domain.localeCompare(b.domain));
}
