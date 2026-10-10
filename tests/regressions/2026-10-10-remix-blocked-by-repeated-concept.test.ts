import { describe, expect, it } from 'vitest';
import type { FormItem, FormTargets } from '../../src/engine/forms.ts';
import { domainOf } from '../../src/engine/quotas.ts';
import { remixQids } from '../../src/engine/remix.ts';

/**
 * The form builder's precheck refused any concept with more items than the number of forms asked for.
 * A remix asks for one form, so a single concept seen in two taken forms blocked the whole remix,
 * and the real forms do repeat concepts across forms, so every remix start failed once all four mocks were taken.
 */
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

/** Four taken forms' items, where forms A and B test the same concepts seat for seat. */
function takenFormItems(): FormItem[] {
  const multiTask = (domain: string): string =>
    Object.entries(TARGETS.tasks)
      .filter(([t]) => domainOf(t) === domain)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)[0] ?? '';
  const multiSeats = new Map(Object.entries(TARGETS.multi).map(([d, n]) => [multiTask(d), n] as const));
  const items: FormItem[] = [];
  for (const form of ['A', 'B', 'C', 'D']) {
    const shared = form === 'A' || form === 'B';
    for (const [task, seats] of Object.entries(TARGETS.tasks)) {
      const multi = multiSeats.get(task) ?? 0;
      for (let i = 0; i < seats; i++) {
        const concept = shared ? `c-${task}-${i}` : `c-${task}-${form}${i}`;
        items.push({ id: `q-${form}-${task}-${i}`, concept, task, type: i < multi ? 'multi' : 'single' });
      }
    }
  }
  return items;
}

describe('remix with concepts repeated across taken forms', () => {
  it('builds one 65-item form with no concept twice', () => {
    const items = takenFormItems();
    expect(items).toHaveLength(260);
    const byId = new Map(items.map((item) => [item.id, item] as const));
    const qids = remixQids({ items, targets: TARGETS, seed: 11 });
    expect(qids).not.toBeNull();
    expect(qids).toHaveLength(65);
    expect(new Set((qids ?? []).map((qid) => byId.get(qid)?.concept)).size).toBe(65);
  });
});
