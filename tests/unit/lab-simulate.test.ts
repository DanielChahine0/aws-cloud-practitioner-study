import { describe, expect, it } from 'vitest';
import { SIM_CONSTANTS, SimulateSpec } from '../../schemas/lab.ts';
import { simulateTexts } from '../../scripts/content/lib/labs.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { checkLab, ENGINES } from '../../src/labs/engines.ts';
import { SIMULATE, type SimulateState } from '../../src/labs/simulate/model.ts';
import {
  type BillConstants,
  type DataLossConstants,
  fmt,
  type LifecycleConstants,
  metricInfo,
  modelParams,
  NEVER,
  onlineDays,
  PURCHASE_OPTIONS,
  type PurchaseConstants,
  runModel,
  type SimValues,
  tiered,
} from '../../src/labs/simulate/models.ts';
import { bakerySimulateLab, OVEN_RUSH_ORDERS } from '../fixtures/lab-specs.ts';

const lab = bakerySimulateLab();
const spec = SimulateSpec.parse(lab.spec);
const run = (actions: readonly unknown[]): SimulateState =>
  replayLab(SIMULATE, spec, actions as Parameters<typeof SIMULATE.reduce>[1][]);

/** 24 hours with a two-hour bump: 100 orders at 01:00 and 50 at 02:00. */
const BUMP = { orders: [0, 100, 50, ...Array<number>(21).fill(0)], perInstance: 50, credits: 1 };
const scaling = (values: SimValues) => runModel('scaling', BUMP, values);
const LIMITS = { min: 0, desired: 0, max: 4 };

describe('the scaling model', () => {
  it('follows the previous hour when dynamic and drops the first hour of a rise', () => {
    const r = scaling({ ...LIMITS, mode: 'dynamic', balancer: true });
    expect(r.metrics).toEqual({ dropped: 100, droppedShare: 66.7, cost: 3, fewest: 0, most: 2 });
    expect(r.series[1]?.values.slice(0, 4)).toEqual([0, 0, 100, 50]);
  });

  it('scales ahead of the forecast when predictive and drops nothing', () => {
    const r = scaling({ ...LIMITS, mode: 'predictive', balancer: true });
    expect(r.metrics).toEqual({ dropped: 0, droppedShare: 0, cost: 3, fewest: 0, most: 2 });
    expect(r.series.map((s) => s.label)).toEqual(['Orders', 'Capacity']);
    expect(r.series[1]?.values.slice(0, 4)).toEqual([0, 100, 50, 0]);
  });

  it('sends every order to one instance without a load balancer', () => {
    const r = scaling({ ...LIMITS, mode: 'predictive', balancer: false });
    expect(r.metrics).toEqual({ dropped: 50, droppedShare: 33.3, cost: 3, fewest: 0, most: 2 });
  });

  it('starts at desired, clamped between min and max', () => {
    expect(scaling({ min: 2, desired: 0, max: 3, mode: 'predictive', balancer: true }).metrics.cost).toBe(48);
    expect(scaling({ min: 1, desired: 5, max: 1, mode: 'predictive', balancer: true }).metrics.most).toBe(1);
  });
});

describe('the compute-cost model', () => {
  const C = {
    workloads: [
      { id: 'bursty', label: 'Bursty job', requests: 1_000_000, ms: 100, mb: 256 },
      { id: 'steady', label: 'Steady job', requests: 100_000_000, ms: 200, mb: 1024 },
    ],
    perMillion: 0.2,
    perGbSecond: 0.00002,
    instanceMonth: 10,
  };
  it('prices requests and GB-seconds on Lambda and a flat month on an instance', () => {
    expect(runModel('compute-cost', C, { bursty: 'lambda', steady: 'lambda' }).metrics).toEqual({
      'cost.bursty': 0.7,
      'cost.steady': 420,
      total: 420.7,
    });
    expect(runModel('compute-cost', C, { bursty: 'lambda', steady: 'instance' }).metrics).toEqual({
      'cost.bursty': 0.7,
      'cost.steady': 10,
      total: 10.7,
    });
  });
});

describe('the s3-lifecycle model', () => {
  const C: LifecycleConstants = {
    gb: 30,
    classes: [
      { id: 'hot', label: 'Hot', storage: 3, retrieval: 0, minDays: 0, hours: 0, zones: 3 },
      { id: 'cold', label: 'Cold', storage: 0.3, retrieval: 1, minDays: 90, hours: 12, zones: 3 },
      { id: 'single', label: 'Single', storage: 1.5, retrieval: 0.5, minDays: 30, hours: 0, zones: 1 },
    ],
    reads: [],
    zoneLoss: 50,
  };
  const all = (id: string, expire = 0): SimValues => ({
    first: id,
    second: id,
    third: id,
    secondDay: 0,
    thirdDay: 0,
    expire,
  });

  it('charges the rest of the minimum duration when data leaves a class early', () => {
    expect(runModel('s3-lifecycle', C, all('cold', 60)).metrics).toEqual({
      cost: 27,
      lateReads: 0,
      lost: 0,
      keptDays: 60,
    });
  });

  it('charges retrieval, counts a slow read as late, and finds nothing after expiry', () => {
    const reads = [
      { day: 10, gb: 2, within: 1 },
      { day: 100, gb: 1, within: 48 },
    ];
    expect(runModel('s3-lifecycle', { ...C, reads }, all('cold', 60)).metrics).toEqual({
      cost: 29,
      lateReads: 2,
      lost: 0,
      keptDays: 60,
    });
  });

  it('loses the only copy in a one-zone class when the zone fails before expiry', () => {
    expect(runModel('s3-lifecycle', C, all('single')).metrics.lost).toBe(1);
    expect(runModel('s3-lifecycle', C, all('single', 40)).metrics.lost).toBe(0);
    expect(runModel('s3-lifecycle', C, all('hot')).metrics).toMatchObject({ lost: 0, keptDays: NEVER });
  });

  it('treats a transition to the class in use as no transition', () => {
    const values = { ...all('cold'), secondDay: 30, thirdDay: 60 };
    expect(runModel('s3-lifecycle', C, values).metrics.cost).toBe(109.5);
  });

  it('reports the cost so far at the end of each 30-day month', () => {
    const series = runModel('s3-lifecycle', C, all('hot')).series[0];
    expect(series?.label).toBe('Cost so far');
    expect(series?.values).toHaveLength(12);
    expect(series?.values[0]).toBe(90);
  });
});

describe('the cache model', () => {
  const C = {
    reads: 500,
    writes: 100,
    dbs: [{ id: 'db', label: 'Database', capacity: 200, credits: 10 }],
    caches: [
      { id: 'off', label: 'No cache', hit: 0, credits: 0 },
      { id: 'half', label: 'Half cache', hit: 0.5, credits: 5 },
    ],
    cacheMs: 2,
    dbMs: 10,
  };
  it('slows down with the square of the load once the database is over capacity', () => {
    expect(runModel('cache', C, { db: 'db', cache: 'off' }).metrics).toEqual({
      load: 600,
      spare: -400,
      latency: 90,
      cost: 10,
    });
    expect(runModel('cache', C, { db: 'db', cache: 'half' }).metrics).toEqual({
      load: 350,
      spare: -150,
      latency: 16.3,
      cost: 15,
    });
  });
});

describe('the bill model', () => {
  const C: BillConstants = {
    accounts: [
      { id: 'a', label: 'Cafe', hours: 100, s3Gb: 60, outGb: 0 },
      { id: 'b', label: 'Bakery', hours: 100, s3Gb: 60, outGb: 0 },
    ],
    hourRate: 2,
    commitRate: 1,
    s3Tiers: [
      { upTo: 100, rate: 1 },
      { upTo: null, rate: 0.5 },
    ],
    outTiers: [
      { upTo: 10, rate: 1 },
      { upTo: null, rate: 0.5 },
    ],
    budget: 500,
  };
  it('charges each band at its rate', () => {
    expect(tiered(50, C.s3Tiers)).toBe(50);
    expect(tiered(120, C.s3Tiers)).toBe(110);
    expect(tiered(0, C.outTiers)).toBe(0);
  });

  it('applies the tiers per account, or to the summed usage when consolidated', () => {
    expect(runModel('bill', C, { commit: 0, consolidated: false, alert: 100 }).metrics.bill).toBe(520);
    expect(runModel('bill', C, { commit: 0, consolidated: true, alert: 100 }).metrics.bill).toBe(510);
  });

  it('saves against no commitment and separate bills, and names the alert day', () => {
    expect(runModel('bill', C, { commit: 50, consolidated: true, alert: 50 }).metrics).toEqual({
      bill: 410,
      saved: 110,
      alertDay: 19,
    });
    expect(runModel('bill', C, { commit: 50, consolidated: true, alert: 100 }).metrics.alertDay).toBe(31);
  });
});

describe('the transfer model', () => {
  it('gives the spec 5.2 online days at 80% of the link', () => {
    expect(onlineDays(1, 100)).toBe(1.16);
    expect(onlineDays(2, 500)).toBe(0.46);
    expect(onlineDays(200, 100)).toBe(231.48);
  });

  it('ships offline jobs together in one turnaround and counts devices and late jobs', () => {
    const C = {
      jobs: [
        { id: 'photos', label: 'Photos', tb: 1, mbps: 100, deadline: 1 },
        { id: 'archive', label: 'Archive', tb: 161, mbps: 100, deadline: 20 },
      ],
      turnaround: 9,
      deviceTb: 80,
    };
    expect(runModel('transfer', C, { photos: 'online', archive: 'offline' }).metrics).toEqual({
      'days.photos': 1.16,
      'devices.photos': 1,
      'days.archive': 9,
      'devices.archive': 3,
      late: 1,
    });
  });
});

describe('fmt', () => {
  it.each([
    [2.5, '%', '2.5%'],
    [12, 'lab credits', '12 lab credits'],
    [0.46, 'days', '0.46 days'],
    [1778, 'lab credits', '1778 lab credits'],
    [3, '', '3'],
    [4.8, 'ms', '4.8 ms'],
    [1 / 3, '', '0.33'],
    [-0, '', '0'],
  ])('formats %s with unit %j as %j', (value, unit, text) => {
    expect(fmt(value, unit)).toBe(text);
  });
});

describe('the Simulate engine', () => {
  it('runs the same parameters to the same result every time', () => {
    const values = { mode: 'predictive', min: 1, desired: 1, max: 3, balancer: true };
    expect(runModel('scaling', spec.constants, values)).toEqual(runModel('scaling', spec.constants, values));
    expect(run([...lab.solution, { t: 'run' }])).toEqual(run([...lab.solution, { t: 'run' }]));
  });

  it('says Not run yet before a run and asks for one in the hint', () => {
    const start = SIMULATE.init(spec);
    expect(SIMULATE.check(spec, start)).toEqual([
      { goalId: 'g1', pass: false, message: 'Not run yet' },
      { goalId: 'g2', pass: false, message: 'Not run yet' },
    ]);
    expect(SIMULATE.hint(spec, start, 'g1')).toBe('Run the simulation first.');
  });

  it('reads the thresholds after a run, with labels, units and limits', () => {
    const state = run([...lab.solution, { t: 'run' }]);
    expect(SIMULATE.check(spec, state)).toEqual([
      { goalId: 'g1', pass: true, message: 'Dropped share: 0% (max 1%)' },
      { goalId: 'g2', pass: true, message: 'Daily cost: 29 lab credits (max 40 lab credits)' },
    ]);
    expect(SIMULATE.hint(spec, state, 'g1')).toBe('Every threshold of this goal holds.');
  });

  it('names the first failing threshold in the hint', () => {
    const state = run([{ t: 'run' }]);
    expect(SIMULATE.check(spec, state)[0]).toEqual({
      goalId: 'g1',
      pass: false,
      message: 'Dropped share: 29.4% (max 1%)',
    });
    expect(SIMULATE.hint(spec, state, 'g1')).toBe('Dropped share is 29.4%, over the 1% limit.');
    const min = SimulateSpec.parse({
      ...spec,
      thresholds: [...spec.thresholds, { goal: 'g3', metric: 'fewest', min: 2 }],
    });
    expect(SIMULATE.hint(min, SIMULATE.reduce(SIMULATE.init(min), { t: 'run' }), 'g3')).toBe(
      'Fewest instances is 1, under the 2 minimum.',
    );
  });

  it('clears the result on any accepted change, and ignores values off the range or step', () => {
    const ran = run([{ t: 'run' }]);
    expect(ran.result).not.toBeNull();
    expect(SIMULATE.reduce(ran, { t: 'set', param: 'max', value: 2 }).result).toBeNull();
    for (const action of [
      { t: 'set', param: 'max', value: 7 },
      { t: 'set', param: 'max', value: 1.5 },
      { t: 'set', param: 'mode', value: 'reactive' },
      { t: 'set', param: 'balancer', value: 'yes' },
      { t: 'set', param: 'chimney', value: 1 },
      { t: 'bake' },
      42,
    ]) {
      expect(SIMULATE.reduce(ran, action as never)).toBe(ran);
    }
    expect(SIMULATE.reduce(ran, { t: 'reset' })).toEqual(SIMULATE.init(spec));
  });

  it('runs the model before every check through the engine registry', () => {
    const entry = ENGINES.simulate;
    if (entry === undefined) throw new Error('simulate is not registered');
    expect(entry.settle).toEqual([{ t: 'run' }]);
    const results = checkLab(entry, spec, run(lab.solution));
    expect(results.map((r) => r.message)).not.toContain('Not run yet');
    expect(allPass(results)).toBe(true);
  });
});

describe('the Simulate spec schema', () => {
  const parse = (over: Record<string, unknown>) => SimulateSpec.safeParse({ ...spec, ...over });
  const messages = (over: Record<string, unknown>) => {
    const r = parse(over);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };
  const param = (id: string, patch: Record<string, unknown>) =>
    spec.params.map((p) => (p.id === id ? { ...p, ...patch } : p));

  it('accepts the bakery lab', () => {
    expect(parse({}).success).toBe(true);
    expect(OVEN_RUSH_ORDERS).toHaveLength(24);
  });

  it('rejects a choice option the model does not know', () => {
    const options = [
      { id: 'dynamic', label: 'Once the orders arrive' },
      { id: 'reactive', label: 'When someone notices' },
    ];
    expect(messages({ params: param('mode', { options }) })).toContain(
      'options of mode must be dynamic, predictive',
    );
  });

  it('rejects an int range outside the model bounds, an initial off its step, and a missing parameter', () => {
    expect(messages({ params: param('max', { max: 12 }) })).toContain('max must range within 1 to 10');
    expect(messages({ params: param('min', { step: 2, initial: 1 }) })).toContain(
      'initial 1 is off the range or step of min',
    );
    expect(messages({ params: spec.params.filter((p) => p.id !== 'balancer') })).toContain(
      "missing parameter 'balancer'",
    );
  });

  it('rejects a threshold on an unknown metric or with both limits', () => {
    expect(messages({ thresholds: [{ goal: 'g1', metric: 'queue', max: 1 }] })).toContain(
      "model scaling has no metric 'queue'",
    );
    expect(messages({ thresholds: [{ goal: 'g1', metric: 'cost', max: 1, min: 0 }] })).toContain(
      'a threshold has exactly one of max and min',
    );
  });

  it('rejects constants that break the model, such as tiers that do not rise', () => {
    const bill = {
      accounts: [
        { id: 'a', label: 'Cafe', hours: 1, s3Gb: 1, outGb: 1 },
        { id: 'b', label: 'Bakery', hours: 1, s3Gb: 1, outGb: 1 },
      ],
      hourRate: 1,
      commitRate: 0.7,
      s3Tiers: [
        { upTo: 500, rate: 0.5 },
        { upTo: 400, rate: 0.4 },
        { upTo: null, rate: 0.3 },
      ],
      outTiers: [{ upTo: 100, rate: 1 }],
      budget: 10,
    };
    const issues = SIM_CONSTANTS.bill
      .safeParse(bill)
      .error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    expect(issues).toEqual([
      's3Tiers.1.upTo: upTo must rise from band to band',
      'outTiers.0.upTo: only the last band has upTo: null',
    ]);
    expect(messages({ constants: { ...BUMP, orders: [1, 2, 3] } }).length).toBeGreaterThan(0);
  });
});

describe('the Simulate texts R7 checks', () => {
  it('lists parameter labels, option labels, units and the labels inside the constants', () => {
    expect(simulateTexts(lab.spec)).toEqual([
      'When ovens are added',
      'Once the orders arrive',
      'Ahead of the forecast',
      'Fewest ovens',
      'Ovens at opening',
      'Most ovens',
      'Share orders across ovens',
    ]);
    const cost = {
      model: 'compute-cost',
      constants: {
        workloads: [{ id: 'bread-export', label: 'Bread export', requests: 10, ms: 1, mb: 128 }],
        perMillion: 1,
        perGbSecond: 1,
        instanceMonth: 1,
      },
      params: [
        {
          kind: 'choice',
          id: 'bread-export',
          label: 'Where it runs',
          options: [
            { id: 'lambda', label: 'AWS Lambda' },
            { id: 'instance', label: 'An instance' },
          ],
          initial: 'instance',
        },
      ],
      thresholds: [{ goal: 'g1', metric: 'total', max: 5 }],
    };
    expect(simulateTexts(cost)).toEqual(['Where it runs', 'AWS Lambda', 'An instance', 'Bread export']);
    expect(simulateTexts({ model: 'scaling' })).toEqual([]);
  });
});

/** Four made-up bakery jobs: two all year, one for a month, one that may stop; one needs its own hardware. */
const BAKES: PurchaseConstants = {
  workloads: [
    {
      id: 'oven',
      label: 'Oven controller',
      hours: 100,
      months: 12,
      interruptible: false,
      needs: 'dedicated-instance',
    },
    { id: 'batch', label: 'Batch planner', hours: 10, months: 2, interruptible: true, needs: 'none' },
    {
      id: 'vault',
      label: 'Recipe vault',
      hours: 100,
      months: 1,
      interruptible: false,
      needs: 'dedicated-host',
    },
    { id: 'promo', label: 'Promo page', hours: 100, months: 1, interruptible: false, needs: 'none' },
  ],
  rates: {
    'on-demand': 1,
    reserved: 0.5,
    'savings-plan': 0.6,
    spot: 0.2,
    'dedicated-instance': 1.5,
    'dedicated-host': 2,
  },
  termMonths: 12,
};
const everyWorkload = (option: string): SimValues =>
  Object.fromEntries(BAKES.workloads.map((w) => [w.id, option]));

describe('the purchase model', () => {
  it.each([
    ['on-demand', 1200, 20, 100, 1420, 0, 2],
    ['reserved', 600, 60, 600, 1860, 0, 2],
    ['savings-plan', 720, 72, 720, 2232, 0, 2],
    ['spot', 240, 4, 20, 284, 3, 2],
    ['dedicated-instance', 1800, 30, 150, 2130, 0, 1],
    ['dedicated-host', 2400, 40, 200, 2840, 0, 0],
  ] as const)(
    'prices every workload on %s, where a commitment bills the whole term',
    (option, oven, batch, month, total, interrupted, unmet) => {
      expect(runModel('purchase', BAKES, everyWorkload(option))).toEqual({
        metrics: {
          'cost.oven': oven,
          'cost.batch': batch,
          'cost.vault': month,
          'cost.promo': month,
          total,
          interrupted,
          unmet,
        },
        series: [],
      });
    },
  );

  it('counts an unknown or missing option as On-Demand', () => {
    const onDemand = runModel('purchase', BAKES, everyWorkload('on-demand'));
    expect(runModel('purchase', BAKES, {})).toEqual(onDemand);
    expect(runModel('purchase', BAKES, everyWorkload('cheapest'))).toEqual(onDemand);
  });

  it('counts Spot only on a job that cannot stop, and a hardware need only when the option misses it', () => {
    const mixed = { oven: 'dedicated-host', batch: 'spot', vault: 'dedicated-host', promo: 'spot' };
    expect(runModel('purchase', BAKES, mixed).metrics).toMatchObject({ interrupted: 1, unmet: 0 });
    expect(runModel('purchase', BAKES, { ...mixed, vault: 'dedicated-instance' }).metrics.unmet).toBe(1);
  });
});

/** Two days of orders on one instance: it stops at hour 10 and its zone fails at hour 30. */
const SHOP: DataLossConstants = {
  hours: 48,
  perHour: 10,
  stopAt: 10,
  zoneLossAt: 30,
  fullSnapshot: 5,
  incrementalSnapshot: 0.5,
};

describe('the data-loss model', () => {
  it.each([
    [0, 0, 0, 300],
    [1, 47, 28, 0],
    [6, 7, 8, 0],
    [12, 3, 6, 60],
    [24, 1, 5, 60],
  ] as const)(
    'on EBS every %i hours takes snapshots that keep the orders up to the last one before the zone fails',
    (every, snapshots, cost, zoneLost) => {
      expect(runModel('data-loss', SHOP, { store: 'ebs', snapshotEvery: every })).toEqual({
        metrics: { stopLost: 0, zoneLost, snapshots, cost },
        series: [],
      });
    },
  );

  it.each([0, 1, 6, 12, 24])(
    'on the instance store every %i hours loses the orders at the stop and after it, with no snapshot',
    (every) => {
      expect(runModel('data-loss', SHOP, { store: 'instance-store', snapshotEvery: every })).toEqual({
        metrics: { stopLost: 100, zoneLost: 200, snapshots: 0, cost: 0 },
        series: [],
      });
    },
  );
});

describe('the purchase and data-loss shapes', () => {
  it('gives one purchase choice per workload, and a store and a snapshot interval for data loss', () => {
    expect(modelParams('purchase', BAKES)).toEqual(
      ['oven', 'batch', 'vault', 'promo'].map((id) => ({
        id,
        kind: 'choice',
        options: [...PURCHASE_OPTIONS],
      })),
    );
    expect(PURCHASE_OPTIONS).toEqual([
      'on-demand',
      'reserved',
      'savings-plan',
      'spot',
      'dedicated-instance',
      'dedicated-host',
    ]);
    expect(modelParams('data-loss', SHOP)).toEqual([
      { id: 'store', kind: 'choice', options: ['instance-store', 'ebs'] },
      { id: 'snapshotEvery', kind: 'int', min: 0, max: 24 },
    ]);
  });

  it('labels every purchase and data-loss metric', () => {
    expect(metricInfo('purchase', 'total', BAKES)).toEqual({ label: 'Yearly cost', unit: 'lab credits' });
    expect(metricInfo('purchase', 'cost.vault', BAKES)).toEqual({
      label: 'Cost: Recipe vault',
      unit: 'lab credits',
    });
    expect(metricInfo('purchase', 'interrupted', BAKES)).toEqual({ label: 'Jobs Spot may stop', unit: '' });
    expect(metricInfo('purchase', 'unmet', BAKES)).toEqual({ label: 'Hardware needs not met', unit: '' });
    expect(metricInfo('purchase', 'cost.nothing', BAKES)).toBeNull();
    expect(metricInfo('data-loss', 'stopLost', SHOP)).toEqual({ label: 'Orders lost at the stop', unit: '' });
    expect(metricInfo('data-loss', 'zoneLost', SHOP)).toEqual({
      label: 'Orders lost with the zone',
      unit: '',
    });
    expect(metricInfo('data-loss', 'snapshots', SHOP)).toEqual({ label: 'Snapshots taken', unit: '' });
    expect(metricInfo('data-loss', 'cost', SHOP)).toEqual({ label: 'Snapshot cost', unit: 'lab credits' });
    expect(metricInfo('data-loss', 'cost.oven', SHOP)).toBeNull();
  });

  it('rejects a repeated workload id, a missing rate and a stop or zone loss out of order', () => {
    const issues = (model: 'purchase' | 'data-loss', c: unknown) =>
      SIM_CONSTANTS[model].safeParse(c).error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];
    expect(SIM_CONSTANTS.purchase.safeParse(BAKES).success).toBe(true);
    expect(issues('purchase', { ...BAKES, workloads: [BAKES.workloads[0], BAKES.workloads[0]] })).toEqual([
      "workloads.1.id: duplicate id 'oven'",
    ]);
    const { spot: _, ...noSpot } = BAKES.rates;
    expect(issues('purchase', { ...BAKES, rates: noSpot })).toHaveLength(1);
    expect(SIM_CONSTANTS['data-loss'].safeParse(SHOP).success).toBe(true);
    expect(issues('data-loss', { ...SHOP, stopAt: 30 })).toEqual([
      ': stopAt and zoneLossAt must fall in order inside hours',
    ]);
    expect(issues('data-loss', { ...SHOP, zoneLossAt: 48 })).toEqual([
      ': stopAt and zoneLossAt must fall in order inside hours',
    ]);
  });

  it('gives R7 every workload label of a purchase spec', () => {
    const beans = {
      model: 'purchase',
      constants: BAKES,
      params: BAKES.workloads.map((w) => ({
        kind: 'choice',
        id: w.id,
        label: `Buy ${w.label}`,
        options: PURCHASE_OPTIONS.map((o) => ({ id: o, label: o })),
        initial: 'on-demand',
      })),
      thresholds: [{ goal: 'g1', metric: 'total', max: 1000 }],
    };
    expect(SimulateSpec.safeParse(beans).success).toBe(true);
    expect(simulateTexts(beans)).toEqual(
      expect.arrayContaining(['Oven controller', 'Batch planner', 'Recipe vault', 'Promo page']),
    );
  });
});
