import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SimulateSpec } from '../../schemas/lab.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { checkLab, ENGINES } from '../../src/labs/engines.ts';
import { SIMULATE } from '../../src/labs/simulate/model.ts';
import {
  type BillConstants,
  type CacheConstants,
  type ComputeCostConstants,
  type DataLossConstants,
  type LifecycleConstants,
  PURCHASE_OPTIONS,
  type PurchaseConstants,
  runModel,
  type ScalingConstants,
  type SimModel,
  type SimValues,
  type TransferConstants,
} from '../../src/labs/simulate/models.ts';

/**
 * The Simulate labs, fixed by Phase 4 Task 13 (six) and Phase 5 Task 5 (two): constants, parameters,
 * solution, thresholds and wrong paths. Writers copy them and write only the text; this test holds
 * every shipped lab to them, and its orderings hold the lessons the numbers teach.
 */

type Action = { t: 'set'; param: string; value: number | string | boolean };
const set = (param: string, value: number | string | boolean): Action => ({ t: 'set', param, value });
const choice = (id: string, options: string[], initial: string) => ({
  kind: 'choice' as const,
  id,
  label: id,
  options: options.map((o) => ({ id: o, label: o })),
  initial,
});
const int = (id: string, min: number, max: number, step: number, initial: number) => ({
  kind: 'int' as const,
  id,
  label: id,
  min,
  max,
  step,
  initial,
});
const toggle = (id: string, initial: boolean) => ({ kind: 'toggle' as const, id, label: id, initial });

interface SimLab {
  id: string;
  /** The task that fixed the numbers, as the test titles name it. */
  fixedIn: string;
  /** The content wave that writes the lab. */
  wave: string;
  model: SimModel;
  constants: unknown;
  params: unknown[];
  thresholds: { goal: string; metric: string; max?: number; min?: number }[];
  solution: Action[];
  outcome: Record<string, number>;
  wrongPaths: { actions: Action[]; failsGoal: string; outcome: Record<string, number> }[];
}

const MORNING_ORDERS = [
  0, 0, 0, 0, 5, 20, 60, 180, 220, 150, 90, 80, 120, 110, 70, 60, 70, 90, 60, 40, 20, 10, 5, 0,
];
const SCALING: ScalingConstants = { orders: MORNING_ORDERS, perInstance: 50, credits: 2 };
const COMPUTE: ComputeCostConstants = {
  workloads: [
    { id: 'menu-export', label: 'Weekly menu export', requests: 30_000, ms: 800, mb: 512 },
    { id: 'order-worker', label: 'Order queue worker', requests: 20_000_000, ms: 150, mb: 1024 },
  ],
  perMillion: 1,
  perGbSecond: 0.0001,
  instanceMonth: 50,
};
const LIFECYCLE: LifecycleConstants = {
  gb: 100,
  classes: [
    { id: 'standard', label: 'S3 Standard', storage: 2, retrieval: 0, minDays: 0, hours: 0, zones: 3 },
    {
      id: 'standard-ia',
      label: 'S3 Standard-IA',
      storage: 1.2,
      retrieval: 0.1,
      minDays: 30,
      hours: 0,
      zones: 3,
    },
    {
      id: 'one-zone-ia',
      label: 'S3 One Zone-IA',
      storage: 1,
      retrieval: 0.1,
      minDays: 30,
      hours: 0,
      zones: 1,
    },
    {
      id: 'glacier-flexible',
      label: 'S3 Glacier Flexible Retrieval',
      storage: 0.4,
      retrieval: 0.3,
      minDays: 90,
      hours: 5,
      zones: 3,
    },
    {
      id: 'deep-archive',
      label: 'S3 Glacier Deep Archive',
      storage: 0.1,
      retrieval: 0.5,
      minDays: 180,
      hours: 12,
      zones: 3,
    },
  ],
  reads: [
    { day: 20, gb: 10, within: 1 },
    { day: 200, gb: 5, within: 24 },
  ],
  zoneLoss: 150,
};
const CLASS_IDS = LIFECYCLE.classes.map((c) => c.id);
const CACHE: CacheConstants = {
  reads: 900,
  writes: 50,
  dbs: [
    { id: 'small-db', label: 'Small database', capacity: 400, credits: 100 },
    { id: 'large-db', label: 'Large database', capacity: 1200, credits: 400 },
  ],
  caches: [
    { id: 'off', label: 'No cache', hit: 0, credits: 0 },
    { id: 'menu-cache', label: 'Menu cache', hit: 0.8, credits: 60 },
  ],
  cacheMs: 1,
  dbMs: 20,
};
const BILL: BillConstants = {
  accounts: [
    { id: 'cafe', label: 'Cafe account', hours: 720, s3Gb: 400, outGb: 300 },
    { id: 'bakery', label: 'Bakery account', hours: 720, s3Gb: 300, outGb: 200 },
  ],
  hourRate: 1,
  commitRate: 0.7,
  s3Tiers: [
    { upTo: 500, rate: 0.5 },
    { upTo: null, rate: 0.3 },
  ],
  outTiers: [
    { upTo: 400, rate: 1 },
    { upTo: null, rate: 0.6 },
  ],
  budget: 2000,
};
const TRANSFER: TransferConstants = {
  jobs: [
    { id: 'menu-photos', label: 'Menu photos', tb: 2, mbps: 500, deadline: 3 },
    { id: 'receipt-archive', label: 'Receipt archive', tb: 200, mbps: 100, deadline: 30 },
  ],
  turnaround: 10,
  deviceTb: 80,
};

const PURCHASE: PurchaseConstants = {
  workloads: [
    {
      id: 'till',
      label: 'Till and order server',
      hours: 730,
      months: 12,
      interruptible: false,
      needs: 'none',
    },
    {
      id: 'roast-plan',
      label: 'Weekend roast planning',
      hours: 16,
      months: 12,
      interruptible: true,
      needs: 'none',
    },
    { id: 'promo', label: 'Holiday promo site', hours: 730, months: 1, interruptible: false, needs: 'none' },
    {
      id: 'loyalty',
      label: 'Loyalty software',
      hours: 730,
      months: 12,
      interruptible: false,
      needs: 'dedicated-host',
    },
  ],
  rates: {
    'on-demand': 1,
    reserved: 0.6,
    'savings-plan': 0.65,
    spot: 0.3,
    'dedicated-instance': 1.2,
    'dedicated-host': 1.5,
  },
  termMonths: 12,
};
const BEANS_FIX = [set('till', 'reserved'), set('roast-plan', 'spot'), set('loyalty', 'dedicated-host')];
const DATA_LOSS: DataLossConstants = {
  hours: 47,
  perHour: 40,
  stopAt: 20,
  zoneLossAt: 46,
  fullSnapshot: 20,
  incrementalSnapshot: 1,
};
const RUSH_FIX = [set('mode', 'predictive'), set('max', 5), set('balancer', true)];

const SIM_LABS: SimLab[] = [
  {
    id: 'lab-m02-morning-rush',
    fixedIn: 'Task 13',
    wave: 'CS',
    model: 'scaling',
    constants: SCALING,
    params: [
      choice('mode', ['dynamic', 'predictive'], 'dynamic'),
      int('min', 0, 6, 1, 1),
      int('desired', 0, 6, 1, 1),
      int('max', 1, 8, 1, 2),
      toggle('balancer', false),
    ],
    thresholds: [
      { goal: 'g1', metric: 'droppedShare', max: 1 },
      { goal: 'g2', metric: 'cost', max: 120 },
      { goal: 'g3', metric: 'fewest', min: 1 },
    ],
    solution: RUSH_FIX,
    outcome: { dropped: 0, cost: 90, fewest: 1 },
    wrongPaths: [
      {
        actions: [set('mode', 'predictive'), set('max', 5)],
        failsGoal: 'g1',
        outcome: { droppedShare: 48.6 },
      },
      { actions: [set('max', 5), set('balancer', true)], failsGoal: 'g1', outcome: { droppedShare: 8.9 } },
      {
        actions: [set('mode', 'predictive'), set('balancer', true)],
        failsGoal: 'g1',
        outcome: { droppedShare: 19.2 },
      },
      {
        actions: [
          set('mode', 'predictive'),
          set('balancer', true),
          set('min', 5),
          set('desired', 5),
          set('max', 5),
        ],
        failsGoal: 'g2',
        outcome: { cost: 240 },
      },
      { actions: [...RUSH_FIX, set('min', 0)], failsGoal: 'g3', outcome: { fewest: 0 } },
    ],
  },
  {
    id: 'lab-m03-bursty-or-steady',
    fixedIn: 'Task 13',
    wave: 'CS',
    model: 'compute-cost',
    constants: COMPUTE,
    params: [
      choice('menu-export', ['lambda', 'instance'], 'instance'),
      choice('order-worker', ['lambda', 'instance'], 'instance'),
    ],
    thresholds: [
      { goal: 'g1', metric: 'cost.menu-export', max: 10 },
      { goal: 'g2', metric: 'cost.order-worker', max: 100 },
    ],
    solution: [set('menu-export', 'lambda')],
    outcome: { 'cost.menu-export': 1.23, 'cost.order-worker': 50 },
    wrongPaths: [
      {
        actions: [set('menu-export', 'lambda'), set('order-worker', 'lambda')],
        failsGoal: 'g2',
        outcome: { 'cost.order-worker': 320 },
      },
      { actions: [set('menu-export', 'instance')], failsGoal: 'g1', outcome: { 'cost.menu-export': 50 } },
    ],
  },
  {
    id: 'lab-m06-receipts-for-7-years',
    fixedIn: 'Task 13',
    wave: 'CS',
    model: 's3-lifecycle',
    constants: LIFECYCLE,
    params: [
      choice('first', CLASS_IDS, 'standard'),
      choice('second', CLASS_IDS, 'standard'),
      choice('third', CLASS_IDS, 'standard'),
      int('secondDay', 0, 365, 1, 30),
      int('thirdDay', 0, 365, 1, 90),
      int('expire', 0, 3650, 1, 0),
    ],
    thresholds: [
      { goal: 'g1', metric: 'keptDays', min: 2555 },
      { goal: 'g1', metric: 'lost', max: 0 },
      { goal: 'g2', metric: 'lateReads', max: 0 },
      { goal: 'g3', metric: 'cost', max: 600 },
    ],
    solution: [set('second', 'standard-ia'), set('third', 'deep-archive')],
    outcome: { cost: 534.17, lateReads: 0, lost: 0 },
    wrongPaths: [
      {
        actions: [set('second', 'one-zone-ia'), set('thirdDay', 200), set('third', 'deep-archive')],
        failsGoal: 'g1',
        outcome: { lost: 1 },
      },
      {
        actions: [set('second', 'standard-ia'), set('third', 'deep-archive'), set('expire', 365)],
        failsGoal: 'g1',
        outcome: { keptDays: 365 },
      },
      {
        actions: [set('first', 'deep-archive'), set('second', 'deep-archive'), set('third', 'deep-archive')],
        failsGoal: 'g2',
        outcome: { lateReads: 1 },
      },
      {
        actions: [set('second', 'standard-ia'), set('third', 'glacier-flexible')],
        failsGoal: 'g3',
        outcome: { cost: 808.17 },
      },
    ],
  },
  {
    id: 'lab-m07-cache-the-menu',
    fixedIn: 'Task 13',
    wave: 'CS',
    model: 'cache',
    constants: CACHE,
    params: [
      choice('db', ['small-db', 'large-db'], 'small-db'),
      choice('cache', ['off', 'menu-cache'], 'off'),
    ],
    thresholds: [
      { goal: 'g1', metric: 'latency', max: 10 },
      { goal: 'g2', metric: 'spare', min: 0 },
      { goal: 'g3', metric: 'cost', max: 200 },
    ],
    solution: [set('cache', 'menu-cache')],
    outcome: { load: 230, spare: 170, latency: 4.8, cost: 160 },
    wrongPaths: [
      { actions: [set('db', 'large-db')], failsGoal: 'g1', outcome: { latency: 20 } },
      {
        actions: [set('db', 'large-db'), set('cache', 'menu-cache')],
        failsGoal: 'g3',
        outcome: { cost: 460 },
      },
      { actions: [set('db', 'small-db'), set('cache', 'off')], failsGoal: 'g2', outcome: { spare: -550 } },
    ],
  },
  {
    id: 'lab-m11-the-monthly-bill',
    fixedIn: 'Task 13',
    wave: 'CS',
    model: 'bill',
    constants: BILL,
    params: [int('commit', 0, 100, 10, 0), toggle('consolidated', false), int('alert', 50, 150, 10, 100)],
    thresholds: [
      { goal: 'g1', metric: 'bill', max: 2000 },
      { goal: 'g2', metric: 'saved', min: 500 },
      { goal: 'g3', metric: 'alertDay', max: 23 },
    ],
    solution: [set('commit', 100), set('consolidated', true), set('alert', 60)],
    outcome: { bill: 1778, saved: 512, alertDay: 21 },
    wrongPaths: [
      { actions: [set('commit', 100), set('alert', 60)], failsGoal: 'g2', outcome: { saved: 432 } },
      { actions: [set('consolidated', true), set('alert', 60)], failsGoal: 'g1', outcome: { bill: 2210 } },
      {
        actions: [set('commit', 100), set('consolidated', true)],
        failsGoal: 'g3',
        outcome: { alertDay: 31 },
      },
    ],
  },
  {
    id: 'lab-m12-online-or-offline',
    fixedIn: 'Task 13',
    wave: 'CS',
    model: 'transfer',
    constants: TRANSFER,
    params: [
      choice('menu-photos', ['online', 'offline'], 'online'),
      choice('receipt-archive', ['online', 'offline'], 'online'),
    ],
    thresholds: [
      { goal: 'g1', metric: 'days.menu-photos', max: 3 },
      { goal: 'g2', metric: 'days.receipt-archive', max: 30 },
    ],
    solution: [set('receipt-archive', 'offline')],
    outcome: { 'days.menu-photos': 0.46, 'days.receipt-archive': 10, 'devices.receipt-archive': 3 },
    wrongPaths: [
      {
        actions: [set('menu-photos', 'offline'), set('receipt-archive', 'offline')],
        failsGoal: 'g1',
        outcome: { 'days.menu-photos': 10 },
      },
      {
        actions: [set('receipt-archive', 'online')],
        failsGoal: 'g2',
        outcome: { 'days.receipt-archive': 231.48 },
      },
    ],
  },
  {
    id: 'lab-m02-pay-less-for-beans',
    fixedIn: 'Phase 5 Task 5',
    wave: 'p5stretch',
    model: 'purchase',
    constants: PURCHASE,
    params: PURCHASE.workloads.map((w) => choice(w.id, [...PURCHASE_OPTIONS], 'on-demand')),
    thresholds: [
      { goal: 'g1', metric: 'total', max: 20000 },
      { goal: 'g1', metric: 'cost.roast-plan', max: 100 },
      { goal: 'g2', metric: 'interrupted', max: 0 },
      { goal: 'g3', metric: 'unmet', max: 0 },
    ],
    solution: BEANS_FIX,
    outcome: {
      'cost.till': 5256,
      'cost.roast-plan': 57.6,
      'cost.promo': 730,
      'cost.loyalty': 13140,
      total: 19183.6,
      interrupted: 0,
      unmet: 0,
    },
    wrongPaths: [
      {
        actions: [set('till', 'spot'), set('roast-plan', 'spot'), set('loyalty', 'dedicated-host')],
        failsGoal: 'g2',
        outcome: { interrupted: 1, total: 16555.6 },
      },
      { actions: [...BEANS_FIX, set('promo', 'reserved')], failsGoal: 'g1', outcome: { total: 23709.6 } },
      {
        actions: [set('till', 'reserved'), set('roast-plan', 'spot'), set('loyalty', 'dedicated-instance')],
        failsGoal: 'g3',
        outcome: { unmet: 1 },
      },
      {
        actions: [set('roast-plan', 'spot'), set('loyalty', 'dedicated-host')],
        failsGoal: 'g1',
        outcome: { total: 22687.6 },
      },
      {
        actions: [set('till', 'reserved'), set('loyalty', 'dedicated-host')],
        failsGoal: 'g1',
        outcome: { 'cost.roast-plan': 192, total: 19318 },
      },
    ],
  },
  {
    id: 'lab-m06-lose-the-instance',
    fixedIn: 'Phase 5 Task 5',
    wave: 'p5stretch',
    model: 'data-loss',
    constants: DATA_LOSS,
    params: [choice('store', ['instance-store', 'ebs'], 'instance-store'), int('snapshotEvery', 0, 8, 1, 0)],
    thresholds: [
      { goal: 'g1', metric: 'stopLost', max: 0 },
      { goal: 'g2', metric: 'zoneLost', max: 160 },
      { goal: 'g3', metric: 'cost', max: 40 },
    ],
    solution: [set('store', 'ebs'), set('snapshotEvery', 6)],
    outcome: { stopLost: 0, zoneLost: 160, snapshots: 7, cost: 26 },
    wrongPaths: [
      {
        actions: [set('snapshotEvery', 6)],
        failsGoal: 'g1',
        outcome: { stopLost: 800, zoneLost: 1040, snapshots: 0 },
      },
      { actions: [set('store', 'ebs')], failsGoal: 'g2', outcome: { zoneLost: 1840 } },
      {
        actions: [set('store', 'ebs'), set('snapshotEvery', 8)],
        failsGoal: 'g2',
        outcome: { zoneLost: 240, cost: 24, snapshots: 5 },
      },
      {
        actions: [set('store', 'ebs'), set('snapshotEvery', 1)],
        failsGoal: 'g3',
        outcome: { cost: 65, snapshots: 46 },
      },
    ],
  },
];

const ENTRY = ENGINES.simulate;
if (ENTRY === undefined) throw new Error('simulate is not registered');
const specOf = (lab: SimLab) =>
  SimulateSpec.parse({
    model: lab.model,
    constants: lab.constants,
    params: lab.params,
    thresholds: lab.thresholds,
  });
const runTo = (lab: SimLab, actions: readonly Action[]) => {
  const spec = specOf(lab);
  const state = SIMULATE.reduce(replayLab(SIMULATE, spec, actions), { t: 'run' });
  return { results: checkLab(ENTRY, spec, state), metrics: state.result?.metrics ?? {} };
};

/** Drops writer text (labels, units, details) so only the fixed numbers and ids compare. */
function numbersOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(numbersOf);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([k]) => k !== 'label' && k !== 'unit' && k !== 'detail')
      .map(([k, v]) => [k, numbersOf(v)]),
  );
}

describe.each(SIM_LABS)('$id, as fixed in $fixedIn', (lab) => {
  it('fails a goal at the start and meets every goal with its solution, with the fixed outcome', () => {
    const spec = specOf(lab);
    expect(allPass(checkLab(ENTRY, spec, SIMULATE.init(spec)))).toBe(false);
    const { results, metrics } = runTo(lab, lab.solution);
    expect(results.filter((r) => !r.pass)).toEqual([]);
    expect(metrics).toMatchObject(lab.outcome);
  });

  it.each(lab.wrongPaths.map((w, j) => [j, w] as const))(
    'wrong path %i fails its goal for its reason',
    (_, w) => {
      const { results, metrics } = runTo(lab, w.actions);
      expect(results.find((r) => r.goalId === w.failsGoal)?.pass).toBe(false);
      expect(metrics).toMatchObject(w.outcome);
    },
  );
});

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const shipped = new Map(loadContext(ROOT).labs.map((e) => [e.lab.id, e.lab] as const));

describe.each(SIM_LABS)('the shipped $id', (lab) => {
  const file = shipped.get(lab.id);
  if (file === undefined) {
    it(`is not shipped yet (wave ${lab.wave} writes it)`, () => {
      expect(shipped.has(lab.id)).toBe(false);
    });
    return;
  }
  it('copies the fixed model, constants, parameters, thresholds, solution and wrong paths', () => {
    expect(file.engine).toBe('simulate');
    expect(numbersOf(file.spec)).toEqual(
      numbersOf({
        model: lab.model,
        constants: lab.constants,
        params: lab.params,
        thresholds: lab.thresholds,
      }),
    );
    expect(file.solution).toEqual(lab.solution);
    expect(file.wrongPaths.map((w) => ({ actions: w.actions, failsGoal: w.failsGoal }))).toEqual(
      lab.wrongPaths.map((w) => ({ actions: w.actions, failsGoal: w.failsGoal })),
    );
  });
});

describe('the orderings the lessons rest on', () => {
  const rush = (values: SimValues) => runModel('scaling', SCALING, values).metrics;
  const grid = [0, 1, 2, 3, 4, 5, 6].flatMap((min) =>
    [1, 2, 4, 5, 8].map((max) => ({ min, desired: min, max })),
  );

  it('Morning rush: without a load balancer more than 1% of orders drop, whatever the limits', () => {
    for (const limits of grid) {
      for (const mode of ['dynamic', 'predictive']) {
        expect(rush({ ...limits, mode, balancer: false }).droppedShare).toBeGreaterThan(1);
      }
    }
  });

  it('Morning rush: dynamic scaling never drops fewer orders than predictive, and drops more at the solution limits', () => {
    for (const limits of grid) {
      const dynamic = rush({ ...limits, mode: 'dynamic', balancer: true }).dropped ?? 0;
      expect(dynamic).toBeGreaterThanOrEqual(
        rush({ ...limits, mode: 'predictive', balancer: true }).dropped ?? 0,
      );
    }
    const limits = { min: 1, desired: 1, max: 5, balancer: true };
    expect(rush({ ...limits, mode: 'dynamic' }).dropped).toBeGreaterThan(
      rush({ ...limits, mode: 'predictive' }).dropped ?? 0,
    );
  });

  it('Bursty or steady: Lambda is cheaper for the bursty export, the instance for the busy worker', () => {
    const cost = (v: SimValues) => runModel('compute-cost', COMPUTE, v).metrics;
    const lambda = cost({ 'menu-export': 'lambda', 'order-worker': 'lambda' });
    const instance = cost({ 'menu-export': 'instance', 'order-worker': 'instance' });
    expect(lambda['cost.menu-export']).toBeLessThan(instance['cost.menu-export'] ?? 0);
    expect(instance['cost.order-worker']).toBeLessThan(lambda['cost.order-worker'] ?? 0);
  });

  it('Receipts for 7 years: Deep Archive stores cheapest and retrieves slowest and dearest; only One Zone-IA has one zone', () => {
    const deep = LIFECYCLE.classes.find((c) => c.id === 'deep-archive');
    for (const c of LIFECYCLE.classes.filter((k) => k.id !== 'deep-archive')) {
      expect(deep?.storage).toBeLessThan(c.storage);
      expect(deep?.retrieval).toBeGreaterThan(c.retrieval);
      expect(deep?.hours).toBeGreaterThan(c.hours);
    }
    expect(LIFECYCLE.classes.filter((c) => c.zones === 1).map((c) => c.id)).toEqual(['one-zone-ia']);
  });

  it('Cache the menu: the cache lowers latency on either database', () => {
    for (const db of ['small-db', 'large-db']) {
      const off = runModel('cache', CACHE, { db, cache: 'off' }).metrics.latency ?? 0;
      expect(runModel('cache', CACHE, { db, cache: 'menu-cache' }).metrics.latency).toBeLessThan(off);
    }
  });

  it('The monthly bill: consolidated is cheaper at any commitment, and more commitment costs less', () => {
    let last = Number.POSITIVE_INFINITY;
    for (let commit = 0; commit <= 100; commit += 10) {
      const together = runModel('bill', BILL, { commit, consolidated: true, alert: 100 }).metrics.bill ?? 0;
      const apart = runModel('bill', BILL, { commit, consolidated: false, alert: 100 }).metrics.bill ?? 0;
      expect(together).toBeLessThan(apart);
      expect(together).toBeLessThan(last);
      last = together;
    }
  });

  it('Online or offline transfer: the archive online takes longer than its deadline, which exceeds the turnaround', () => {
    const online = runModel('transfer', TRANSFER, { 'menu-photos': 'online', 'receipt-archive': 'online' });
    const archive = TRANSFER.jobs.find((j) => j.id === 'receipt-archive');
    expect(online.metrics['days.receipt-archive']).toBeGreaterThan(archive?.deadline ?? 0);
    expect(archive?.deadline).toBeGreaterThan(TRANSFER.turnaround);
  });

  const beans = (values: SimValues) => runModel('purchase', PURCHASE, values).metrics;
  const each = (workload: string) =>
    Object.fromEntries(PURCHASE_OPTIONS.map((o) => [o, beans({ [workload]: o })[`cost.${workload}`]]));

  it('Pay less for beans: a commitment beats On-Demand for the all-year till, and On-Demand beats one for the one-month promo', () => {
    expect(each('till')).toMatchObject({ reserved: 5256, 'savings-plan': 5694, 'on-demand': 8760 });
    expect(each('promo')).toMatchObject({ 'on-demand': 730, reserved: 5256, 'savings-plan': 5694 });
  });

  it('Pay less for beans: Spot is the cheapest option for the roast batch, and only Spot stays under 100', () => {
    const roast = each('roast-plan');
    expect(roast).toMatchObject({ spot: 57.6, 'on-demand': 192, reserved: 5256, 'savings-plan': 5694 });
    expect(PURCHASE_OPTIONS.filter((o) => (roast[o] ?? 0) <= 100)).toEqual(['spot']);
  });

  const loss = (values: SimValues) => runModel('data-loss', DATA_LOSS, values).metrics;
  const EVERY = [0, 1, 6, 12, 24];

  it('Lose the instance: snapshots never protect the instance store', () => {
    for (let every = 0; every <= 24; every += 1) {
      expect(loss({ store: 'instance-store', snapshotEvery: every })).toMatchObject({
        stopLost: 800,
        snapshots: 0,
      });
    }
  });

  it('Lose the instance: on EBS more frequent snapshots never lose more orders and cost more', () => {
    const ebs = EVERY.map((every) => loss({ store: 'ebs', snapshotEvery: every }));
    expect(ebs.map((m) => m.zoneLost)).toEqual([1840, 0, 160, 400, 880]);
    expect(ebs.map((m) => m.cost)).toEqual([0, 65, 26, 22, 20]);
    expect(ebs.map((m) => m.stopLost)).toEqual([0, 0, 0, 0, 0]);
  });
});
