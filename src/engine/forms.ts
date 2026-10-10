/**
 * The mock form builder (spec 4.3): splits live exam-pool items into forms that each meet the per-task and
 * multi-response counts, with no concept twice in a form and no item in two forms, or names what blocks the split.
 * Pure and seeded, so the same pool and seed always give the same forms (spec 9).
 */
import { FORM_IDS } from '../../schemas/ids.ts';
import { type Domain, domainOf } from './quotas.ts';
import { mulberry32, seedFor, shuffle } from './rng.ts';

/** One live exam-pool item as the builder sees it: ids and shape only, never text. */
export interface FormItem {
  id: string;
  concept: string;
  task: string;
  type: 'single' | 'multi';
}

/** What one form must hold: items per task and multi-response items per domain. */
export interface FormTargets {
  tasks: Readonly<Record<string, number>>;
  multi: Readonly<Record<Domain, number>>;
}

export type FormBuild = { ok: true; forms: string[][] } | { ok: false; blocker: string };

/** Seeded greedy attempts before the search takes over. */
export const FORM_ATTEMPTS = 2000;
/** Placements the backtracking search may try before it gives up. */
export const SEARCH_STEPS = 5_000_000;

const formName = (i: number): string => FORM_IDS[i] ?? String(i + 1);

/** Items per domain in one form: the sum of its tasks' counts. */
function domainTotals(targets: FormTargets): Map<Domain, number> {
  const totals = new Map<Domain, number>();
  for (const [task, n] of Object.entries(targets.tasks)) {
    const d = domainOf(task);
    totals.set(d, (totals.get(d) ?? 0) + n);
  }
  return totals;
}

const domainList = (targets: FormTargets): Domain[] => [...domainTotals(targets).keys()];

/** The first reason `count` forms cannot be built from `items` by counting alone, or null. */
export function precheck(items: readonly FormItem[], targets: FormTargets, count: number): string | null {
  const perConcept = new Map<string, number>();
  for (const item of items) perConcept.set(item.concept, (perConcept.get(item.concept) ?? 0) + 1);
  for (const [concept, n] of [...perConcept].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (n > count) return `concept ${concept} has ${n} items; a concept can sit in at most ${count} forms`;
  }
  for (const [task, target] of Object.entries(targets.tasks)) {
    const n = items.filter((i) => i.task === task).length;
    if (n < count * target) return `task ${task} has ${n} live items; ${count} forms need ${count * target}`;
  }
  const totals = domainTotals(targets);
  for (const d of domainList(targets)) {
    const multi = items.filter((i) => i.type === 'multi' && domainOf(i.task) === d).length;
    const needMulti = count * (targets.multi[d] ?? 0);
    if (multi < needMulti)
      return `domain ${d} has ${multi} multi-response items; ${count} forms need ${needMulti}`;
    const single = items.filter((i) => i.type === 'single' && domainOf(i.task) === d).length;
    const needSingle = count * ((totals.get(d) ?? 0) - (targets.multi[d] ?? 0));
    if (single < needSingle) {
      return `domain ${d} has ${single} single-answer items; ${count} forms need ${needSingle}`;
    }
  }
  return null;
}

/** Open seats while forms are filled: per form, per task and per domain and item type. */
class Needs {
  readonly task: Map<string, number>[];
  readonly multi: Map<Domain, number>[];
  readonly single: Map<Domain, number>[];
  readonly concepts: Set<string>[];

  constructor(targets: FormTargets, count: number) {
    const totals = domainTotals(targets);
    this.task = Array.from({ length: count }, () => new Map(Object.entries(targets.tasks)));
    this.multi = Array.from(
      { length: count },
      () => new Map(domainList(targets).map((d) => [d, targets.multi[d] ?? 0] as const)),
    );
    this.single = Array.from(
      { length: count },
      () =>
        new Map(domainList(targets).map((d) => [d, (totals.get(d) ?? 0) - (targets.multi[d] ?? 0)] as const)),
    );
    this.concepts = Array.from({ length: count }, () => new Set<string>());
  }

  /** Whether form `f` can take `item` now. */
  fits(f: number, item: FormItem): boolean {
    const d = domainOf(item.task);
    const kind = item.type === 'multi' ? this.multi : this.single;
    return (
      (this.task[f]?.get(item.task) ?? 0) > 0 &&
      (kind[f]?.get(d) ?? 0) > 0 &&
      !(this.concepts[f]?.has(item.concept) ?? true)
    );
  }

  /** Places (`step` 1) or removes (`step` -1) `item` in form `f`. */
  move(f: number, item: FormItem, step: 1 | -1): void {
    const d = domainOf(item.task);
    const kind = item.type === 'multi' ? this.multi : this.single;
    this.task[f]?.set(item.task, (this.task[f]?.get(item.task) ?? 0) - step);
    kind[f]?.set(d, (kind[f]?.get(d) ?? 0) - step);
    if (step === 1) this.concepts[f]?.add(item.concept);
    else this.concepts[f]?.delete(item.concept);
  }

  /** Seats still open over every form and task. */
  missing(): number {
    return this.task.reduce((sum, m) => sum + [...m.values()].reduce((a, n) => a + n, 0), 0);
  }

  /** The first form and task still short, as a blocker sentence. */
  shortfall(): string {
    for (const [f, m] of this.task.entries()) {
      for (const [task, n] of m) if (n > 0) return `form ${formName(f)} is short of task ${task} by ${n}`;
    }
    return 'every seat is filled';
  }
}

/** One seeded greedy attempt: the biggest concepts first, each item to the form that needs its task most. */
function greedy(
  items: readonly FormItem[],
  targets: FormTargets,
  count: number,
  seed: number,
  attempt: number,
): { forms: string[][]; needs: Needs } {
  const size = new Map<string, number>();
  for (const item of items) size.set(item.concept, (size.get(item.concept) ?? 0) + 1);
  const order = shuffle(items, mulberry32(seedFor(seed, `attempt-${attempt}`))).sort(
    (a, b) => (size.get(b.concept) ?? 0) - (size.get(a.concept) ?? 0),
  );
  const needs = new Needs(targets, count);
  const forms: string[][] = Array.from({ length: count }, () => []);
  for (const item of order) {
    let best = -1;
    for (let f = 0; f < count; f += 1) {
      if (!needs.fits(f, item)) continue;
      if (best === -1 || (needs.task[f]?.get(item.task) ?? 0) > (needs.task[best]?.get(item.task) ?? 0))
        best = f;
    }
    if (best === -1) continue;
    needs.move(best, item, 1);
    forms[best]?.push(item.id);
  }
  return { forms, needs };
}

/** One open choice of the search: the multi-response items of a form's domain, or the single items of a form's task. */
interface Slot {
  form: number;
  need: () => number;
  candidates: readonly FormItem[];
  /** The candidate index chosen last for this slot; later picks take higher indexes, so a slot is a set, not a list. */
  last: number;
}

/**
 * Seeded depth-first search: it first places each form's multi-response items by domain, then fills every task with
 * single items, always taking the open slot with the fewest fitting candidates (tried in seeded order), pruning a
 * slot that can no longer be filled and backtracking on a concept clash; returns null after `steps` placements.
 */
function search(
  items: readonly FormItem[],
  targets: FormTargets,
  count: number,
  seed: number,
  steps: number,
): string[][] | null {
  const order = shuffle(items, mulberry32(seedFor(seed, 'search')));
  const needs = new Needs(targets, count);
  const multiSlots: Slot[] = [];
  const singleSlots: Slot[] = [];
  for (let f = 0; f < count; f += 1) {
    for (const d of domainList(targets)) {
      multiSlots.push({
        form: f,
        need: () => needs.multi[f]?.get(d) ?? 0,
        candidates: order.filter((i) => i.type === 'multi' && domainOf(i.task) === d),
        last: -1,
      });
    }
    for (const task of Object.keys(targets.tasks)) {
      singleSlots.push({
        form: f,
        need: () => needs.task[f]?.get(task) ?? 0,
        candidates: order.filter((i) => i.type === 'single' && i.task === task),
        last: -1,
      });
    }
  }
  const used = new Set<string>();
  const forms: string[][] = Array.from({ length: count }, () => []);
  let budget = steps;

  /** The open slot with the fewest fitting candidates, null when every slot is full, or 'dead' when one cannot fill. */
  const choose = (slots: readonly Slot[]): { slot: Slot; fitting: number[] } | null | 'dead' => {
    let pick: { slot: Slot; fitting: number[] } | null = null;
    for (const slot of slots) {
      const need = slot.need();
      if (need === 0) continue;
      const fitting: number[] = [];
      for (const [c, item] of slot.candidates.entries()) {
        if (c > slot.last && !used.has(item.id) && needs.fits(slot.form, item)) fitting.push(c);
      }
      if (fitting.length < need) return 'dead';
      if (pick === null || fitting.length < pick.fitting.length) pick = { slot, fitting };
    }
    return pick;
  };

  const fill = (): boolean => {
    let pick = choose(multiSlots);
    if (pick === null) pick = choose(singleSlots);
    if (pick === 'dead') return false;
    if (pick === null) return true;
    const { slot, fitting } = pick;
    const last = slot.last;
    for (const c of fitting) {
      const item = slot.candidates[c];
      if (item === undefined || used.has(item.id) || !needs.fits(slot.form, item)) continue;
      if (budget <= 0) return false;
      budget -= 1;
      needs.move(slot.form, item, 1);
      used.add(item.id);
      forms[slot.form]?.push(item.id);
      slot.last = c;
      if (fill()) return true;
      slot.last = last;
      forms[slot.form]?.pop();
      used.delete(item.id);
      needs.move(slot.form, item, -1);
    }
    return false;
  };
  return fill() ? forms : null;
}

/**
 * Builds `count` forms from `items`: up to `attempts` seeded greedy attempts, then a seeded backtracking search
 * of up to `steps` placements. Spare items stay unused. On failure the blocker names the shortest greedy attempt's
 * first missing seat, or the counting problem that makes the split impossible.
 */
export function buildForms(args: {
  items: readonly FormItem[];
  targets: FormTargets;
  count: number;
  seed: number;
  attempts?: number;
  steps?: number;
}): FormBuild {
  const { items, targets, count, seed } = args;
  const blocked = precheck(items, targets, count);
  if (blocked !== null) return { ok: false, blocker: blocked };
  let best: Needs | null = null;
  for (let a = 0; a < (args.attempts ?? FORM_ATTEMPTS); a += 1) {
    const { forms, needs } = greedy(items, targets, count, seed, a);
    if (needs.missing() === 0) return { ok: true, forms };
    if (best === null || needs.missing() < best.missing()) best = needs;
  }
  const found = search(items, targets, count, seed, args.steps ?? SEARCH_STEPS);
  if (found !== null) return { ok: true, forms: found };
  return { ok: false, blocker: best?.shortfall() ?? 'the search ran out of steps' };
}

/** Every way one form breaks its targets; [] when it meets them all. Shared by R12 and the tests. */
export function formProblems(form: readonly FormItem[], targets: FormTargets): string[] {
  const problems: string[] = [];
  const totals = domainTotals(targets);
  const size = [...totals.values()].reduce((a, n) => a + n, 0);
  if (form.length !== size) problems.push(`has ${form.length} items; it needs ${size}`);
  for (const [d, need] of totals) {
    const n = form.filter((i) => domainOf(i.task) === d).length;
    if (n !== need) problems.push(`domain ${d} has ${n} items; it needs ${need}`);
  }
  for (const [task, need] of Object.entries(targets.tasks)) {
    const n = form.filter((i) => i.task === task).length;
    if (n !== need) problems.push(`task ${task} has ${n} items; it needs ${need}`);
  }
  for (const d of totals.keys()) {
    const n = form.filter((i) => i.type === 'multi' && domainOf(i.task) === d).length;
    const need = targets.multi[d] ?? 0;
    if (n !== need) problems.push(`domain ${d} has ${n} multi-response items; it needs ${need}`);
  }
  const perConcept = new Map<string, number>();
  for (const item of form) perConcept.set(item.concept, (perConcept.get(item.concept) ?? 0) + 1);
  for (const [concept, n] of perConcept) if (n > 1) problems.push(`concept ${concept} appears ${n} times`);
  return problems;
}
