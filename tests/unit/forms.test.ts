import { describe, expect, it } from 'vitest';
import { buildForms, type FormItem, type FormTargets, formProblems } from '../../src/engine/forms.ts';
import { domainOf } from '../../src/engine/quotas.ts';
import { mulberry32, shuffle } from '../../src/engine/rng.ts';

/** The per-form counts of the real registry (spec 4.3). */
const TARGETS: FormTargets = {
  tasks: {
    '1.1': 4,
    '1.2': 2,
    '1.3': 7,
    '1.4': 3,
    '2.1': 3,
    '2.2': 10,
    '2.3': 3,
    '2.4': 3,
    '3.1': 2,
    '3.2': 2,
    '3.3': 4,
    '3.4': 3,
    '3.5': 2,
    '3.6': 4,
    '3.7': 3,
    '3.8': 2,
    '4.1': 3,
    '4.2': 1,
    '4.3': 4,
  },
  multi: { '1': 2, '2': 2, '3': 3, '4': 1 },
};

/**
 * Four made-up forms that meet TARGETS, merged and shuffled. Within a domain, seat k of form f holds concept
 * c-<d>-<(k + 3f) mod n>, so each concept sits once in every form but under different tasks, which defeats the
 * greedy pass on most seeds; ids are f<form>-<domain>-<seat>, and seat k is multi-response when (k + f) mod n is
 * below the domain's multi count.
 */
function exactPool(): FormItem[] {
  const items: FormItem[] = [];
  for (let f = 0; f < 4; f += 1) {
    for (const d of ['1', '2', '3', '4'] as const) {
      const seats = Object.entries(TARGETS.tasks)
        .filter(([task]) => domainOf(task) === d)
        .flatMap(([task, n]) => Array.from({ length: n }, () => task));
      for (const [k, task] of seats.entries()) {
        const type = (k + f) % seats.length < TARGETS.multi[d] ? 'multi' : 'single';
        items.push({ id: `f${f}-${d}-${k}`, concept: `c-${d}-${(k + 3 * f) % seats.length}`, task, type });
      }
    }
  }
  return shuffle(items, mulberry32(11));
}

/** The exact pool plus about 10% spare single items per task, each on a concept of its own. */
function sparePool(): FormItem[] {
  const spare = Object.entries(TARGETS.tasks).flatMap(([task, n]) =>
    Array.from(
      { length: Math.ceil(0.4 * n) },
      (_, k): FormItem => ({
        id: `spare-${task}-${k}`,
        concept: `spare-${task}-${k}`,
        task,
        type: 'single',
      }),
    ),
  );
  return shuffle([...exactPool(), ...spare], mulberry32(12));
}

function built(
  items: readonly FormItem[],
  seed = 20261024,
  extra: { attempts?: number; steps?: number } = {},
) {
  const result = buildForms({ items, targets: TARGETS, count: 4, seed, ...extra });
  if (!result.ok) throw new Error(result.blocker);
  const byId = new Map(items.map((i) => [i.id, i] as const));
  return result.forms.map((qids) => qids.map((id) => byId.get(id) as FormItem));
}

describe('buildForms (spec 4.3)', () => {
  const forms = built(sparePool());

  it('builds four forms of exactly 16, 19, 22 and 8 items by domain', () => {
    expect(forms).toHaveLength(4);
    for (const form of forms) {
      expect(form).toHaveLength(65);
      expect(['1', '2', '3', '4'].map((d) => form.filter((i) => domainOf(i.task) === d).length)).toEqual([
        16, 19, 22, 8,
      ]);
    }
  });

  it('meets every per-task count', () => {
    for (const form of forms) {
      for (const [task, n] of Object.entries(TARGETS.tasks)) {
        expect(form.filter((i) => i.task === task).length, task).toBe(n);
      }
    }
  });

  it('puts 8 multi-response items in each form, 2, 2, 3 and 1 by domain', () => {
    for (const form of forms) {
      const multi = form.filter((i) => i.type === 'multi');
      expect(multi).toHaveLength(8);
      expect(['1', '2', '3', '4'].map((d) => multi.filter((i) => domainOf(i.task) === d).length)).toEqual([
        2, 2, 3, 1,
      ]);
    }
  });

  it('never repeats a concept inside a form', () => {
    for (const form of forms) expect(new Set(form.map((i) => i.concept)).size).toBe(form.length);
  });

  it('never puts one item in two forms', () => {
    const ids = forms.flat().map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives forms that formProblems passes', () => {
    for (const form of forms) expect(formProblems(form, TARGETS)).toEqual([]);
  });

  it('gives the same forms for the same seed and different forms for another seed', () => {
    const ids = (fs: FormItem[][]) => fs.map((f) => f.map((i) => i.id));
    expect(ids(built(sparePool()))).toEqual(ids(forms));
    expect(ids(built(sparePool(), 7))).not.toEqual(ids(forms));
  });

  it('builds four forms from a pool of exactly 4 x targets', () => {
    const exact = built(exactPool());
    expect(exact.flat()).toHaveLength(260);
    for (const form of exact) expect(formProblems(form, TARGETS)).toEqual([]);
  });

  it('finds the forms by search when every greedy attempt fails', () => {
    const greedyOnly = buildForms({
      items: exactPool(),
      targets: TARGETS,
      count: 4,
      seed: 3,
      attempts: 1,
      steps: 0,
    });
    expect(greedyOnly.ok).toBe(false);
    const forms = built(exactPool(), 3, { attempts: 1 });
    expect(forms.flat()).toHaveLength(260);
    for (const form of forms) expect(formProblems(form, TARGETS)).toEqual([]);
  });

  it('names the concept that holds five items', () => {
    const items: FormItem[] = [
      ...exactPool(),
      { id: 'extra', concept: 'c-1-0', task: '1.1', type: 'single' },
    ];
    expect(buildForms({ items, targets: TARGETS, count: 4, seed: 1 })).toEqual({
      ok: false,
      blocker: 'concept c-1-0 has 5 items; a concept can sit in at most 4 forms',
    });
  });

  it('names the task that is one item short', () => {
    const items = exactPool().filter((i) => i.id !== 'f0-4-3');
    expect(buildForms({ items, targets: TARGETS, count: 4, seed: 1 })).toEqual({
      ok: false,
      blocker: 'task 4.2 has 3 live items; 4 forms need 4',
    });
  });

  it('names the domain that lacks multi-response items', () => {
    const items = exactPool().map((i): FormItem => (i.id === 'f0-4-0' ? { ...i, type: 'single' } : i));
    expect(buildForms({ items, targets: TARGETS, count: 4, seed: 1 })).toEqual({
      ok: false,
      blocker: 'domain 4 has 3 multi-response items; 4 forms need 4',
    });
  });

  it('names the first short form and task of the closest greedy attempt when the search runs out of steps', () => {
    const result = buildForms({
      items: exactPool(),
      targets: TARGETS,
      count: 4,
      seed: 1,
      attempts: 5,
      steps: 0,
    });
    expect(result).toEqual({ ok: false, blocker: 'form A is short of task 1.1 by 1' });
  });
});

describe('formProblems', () => {
  const small: FormTargets = { tasks: { '1.1': 2, '2.1': 1 }, multi: { '1': 1, '2': 0, '3': 0, '4': 0 } };

  it('passes a form that meets its targets', () => {
    const form: FormItem[] = [
      { id: 'a', concept: 'c1', task: '1.1', type: 'multi' },
      { id: 'b', concept: 'c2', task: '1.1', type: 'single' },
      { id: 'c', concept: 'c3', task: '2.1', type: 'single' },
    ];
    expect(formProblems(form, small)).toEqual([]);
  });

  it('names every count a form misses and every repeated concept, in that order', () => {
    const form: FormItem[] = [
      { id: 'a', concept: 'c1', task: '1.1', type: 'single' },
      { id: 'b', concept: 'c1', task: '1.1', type: 'single' },
    ];
    expect(formProblems(form, small)).toEqual([
      'has 2 items; it needs 3',
      'domain 2 has 0 items; it needs 1',
      'task 2.1 has 0 items; it needs 1',
      'domain 1 has 0 multi-response items; it needs 1',
      'concept c1 appears 2 times',
    ]);
  });
});
