import { describe, expect, it } from 'vitest';
import type { SimulateSpec } from '../../schemas/lab.ts';
import { checkLab, ENGINES } from '../../src/labs/engines.ts';
import { SIMULATE } from '../../src/labs/simulate/model.ts';
import { type BillConstants, metricInfo, metricText } from '../../src/labs/simulate/models.ts';

// The bill model reports an alert that never fires within the month as day 31, and the lab printed it with the
// unit `day of 30`, so a learner read "Alert day: 31 day of 30" and, when it fired, "27 day of 30" (spec 5.1).

const C: BillConstants = {
  accounts: [{ id: 'a', label: 'Cafe', hours: 100, s3Gb: 0, outGb: 0 }],
  hourRate: 1,
  commitRate: 1,
  s3Tiers: [{ upTo: null, rate: 1 }],
  outTiers: [{ upTo: null, rate: 1 }],
  budget: 100,
};
const spec = {
  model: 'bill',
  constants: C,
  params: [
    { kind: 'int', id: 'commit', label: 'Commit', min: 0, max: 100, step: 10, initial: 0, unit: '%' },
    { kind: 'toggle', id: 'consolidated', label: 'Consolidated', initial: false },
    { kind: 'int', id: 'alert', label: 'Alert', min: 50, max: 150, step: 10, initial: 100, unit: '%' },
  ],
  thresholds: [{ goal: 'g1', metric: 'alertDay', max: 23 }],
} as unknown as SimulateSpec;
const ENTRY = ENGINES.simulate;
if (ENTRY === undefined) throw new Error('simulate is not registered');
const run = (alert: number) =>
  SIMULATE.reduce(SIMULATE.reduce(SIMULATE.init(spec), { t: 'set', param: 'alert', value: alert }), {
    t: 'run',
  });

describe('the budget alert day', () => {
  it('reads as a day of the month, or after day 30 when the month never reaches it', () => {
    const info = metricInfo('bill', 'alertDay', C);
    expect(info?.label).toBe('Budget alert');
    expect(metricText(27, info ?? { unit: '' })).toBe('day 27 of 30');
    expect(metricText(31, info ?? { unit: '' })).toBe('after day 30');
  });

  it('words the goal line and the hint without a bare day count', () => {
    expect(checkLab(ENTRY, spec, run(50))[0]?.message).toBe('Budget alert: day 15 of 30 (max day 23 of 30)');
    const never = run(150);
    expect(checkLab(ENTRY, spec, never)[0]?.message).toBe('Budget alert: after day 30 (max day 23 of 30)');
    expect(SIMULATE.hint(spec, never, 'g1')).toBe(
      'Budget alert is after day 30, over the day 23 of 30 limit.',
    );
  });
});
