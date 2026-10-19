/**
 * The eight Simulate models (spec 5.1): six since Phase 4 Task 13, `purchase` and `data-loss` since
 * Phase 5 Task 5; pure, deterministic, no randomness.
 * Every money figure is in lab credits, a made-up unit; `schemas/lab.ts` validates the constants
 * with `SIM_CONSTANTS` before any of these functions sees them, so they only cast.
 */

export type SimModel =
  | 'scaling'
  | 'compute-cost'
  | 's3-lifecycle'
  | 'cache'
  | 'bill'
  | 'transfer'
  | 'purchase'
  | 'data-loss';
export type SimValue = number | string | boolean;
export type SimValues = Readonly<Record<string, SimValue>>;

export interface SimSeries {
  label: string;
  unit: string;
  values: number[];
}
export interface SimResult {
  metrics: Record<string, number>;
  series: SimSeries[];
}
export interface MetricInfo {
  label: string;
  unit: string;
  /** Writes the value in words where a number and its unit would mislead, such as the day an alert fires. */
  show?: (value: number) => string;
}
export interface ParamShape {
  id: string;
  kind: 'int' | 'choice' | 'toggle';
  options?: string[];
  min?: number;
  max?: number;
}

export interface ScalingConstants {
  orders: number[];
  perInstance: number;
  credits: number;
}
export interface Workload {
  id: string;
  label: string;
  requests: number;
  ms: number;
  mb: number;
}
export interface ComputeCostConstants {
  workloads: Workload[];
  perMillion: number;
  perGbSecond: number;
  instanceMonth: number;
}
export interface StorageClass {
  id: string;
  label: string;
  storage: number;
  retrieval: number;
  minDays: number;
  hours: number;
  zones: 1 | 3;
}
export interface LifecycleRead {
  day: number;
  gb: number;
  within: number;
}
export interface LifecycleConstants {
  gb: number;
  classes: StorageClass[];
  reads: LifecycleRead[];
  zoneLoss: number | null;
}
export interface CacheConstants {
  reads: number;
  writes: number;
  dbs: { id: string; label: string; capacity: number; credits: number }[];
  caches: { id: string; label: string; hit: number; credits: number }[];
  cacheMs: number;
  dbMs: number;
}
export interface Tier {
  upTo: number | null;
  rate: number;
}
export interface BillAccount {
  id: string;
  label: string;
  hours: number;
  s3Gb: number;
  outGb: number;
}
export interface BillConstants {
  accounts: BillAccount[];
  hourRate: number;
  commitRate: number;
  s3Tiers: Tier[];
  outTiers: Tier[];
  budget: number;
}
export interface TransferJob {
  id: string;
  label: string;
  tb: number;
  mbps: number;
  deadline: number;
}
export interface TransferConstants {
  jobs: TransferJob[];
  turnaround: number;
  deviceTb: number;
}

/** The ways to buy compute that `purchase` compares (spec 5.2, Pay less for beans). */
export const PURCHASE_OPTIONS = [
  'on-demand',
  'reserved',
  'savings-plan',
  'spot',
  'dedicated-instance',
  'dedicated-host',
] as const;
export type PurchaseOption = (typeof PURCHASE_OPTIONS)[number];
export interface PurchaseWorkload {
  id: string;
  label: string;
  /** Hours it runs each month it runs, at most `HOURS_PER_MONTH`. */
  hours: number;
  /** Months of the year it runs. */
  months: number;
  /** Whether it can stop and resume later, so Spot suits it. */
  interruptible: boolean;
  needs: 'none' | 'dedicated-instance' | 'dedicated-host';
}
export interface PurchaseConstants {
  workloads: PurchaseWorkload[];
  /** Lab credits per hour for each option. */
  rates: Readonly<Record<PurchaseOption, number>>;
  /**
   * The months a Reserved Instance or a Savings Plan commits to: it bills every hour of them,
   * `HOURS_PER_MONTH` a month, whether the workload runs or not.
   */
  termMonths: number;
}
/** The hours in a month, as AWS bills them; a commitment bills each one of its term. */
export const HOURS_PER_MONTH = 730;
export interface DataLossConstants {
  hours: number;
  /** Orders written each hour. */
  perHour: number;
  /** The hour the instance stops, which erases an instance store. */
  stopAt: number;
  /** The hour the Availability Zone is lost, with every volume in it. */
  zoneLossAt: number;
  fullSnapshot: number;
  incrementalSnapshot: number;
}

const CREDITS = 'lab credits';
/** Days 0 to 364 make the modelled year of `s3-lifecycle`. */
const YEAR = 365;
/** `keptDays` when a lifecycle never expires. */
export const NEVER = 99_999;

export const round1 = (x: number): number => Math.round(x * 10) / 10;
export const round2 = (x: number): number => Math.round(x * 100) / 100;
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

const num = (values: SimValues, id: string): number => {
  const v = values[id];
  return typeof v === 'number' ? v : 0;
};
const str = (values: SimValues, id: string): string => {
  const v = values[id];
  return typeof v === 'string' ? v : '';
};
const bool = (values: SimValues, id: string): boolean => values[id] === true;

/** The parameters a model reads, with their kinds, allowed options and bounds. */
export function modelParams(model: SimModel, constants: unknown): ParamShape[] {
  switch (model) {
    case 'scaling':
      return [
        { id: 'mode', kind: 'choice', options: ['dynamic', 'predictive'] },
        { id: 'min', kind: 'int', min: 0, max: 10 },
        { id: 'desired', kind: 'int', min: 0, max: 10 },
        { id: 'max', kind: 'int', min: 1, max: 10 },
        { id: 'balancer', kind: 'toggle' },
      ];
    case 'compute-cost':
      return (constants as ComputeCostConstants).workloads.map((w) => ({
        id: w.id,
        kind: 'choice',
        options: ['lambda', 'instance'],
      }));
    case 's3-lifecycle': {
      const ids = (constants as LifecycleConstants).classes.map((c) => c.id);
      return [
        { id: 'first', kind: 'choice', options: ids },
        { id: 'second', kind: 'choice', options: ids },
        { id: 'third', kind: 'choice', options: ids },
        { id: 'secondDay', kind: 'int', min: 0, max: 365 },
        { id: 'thirdDay', kind: 'int', min: 0, max: 365 },
        { id: 'expire', kind: 'int', min: 0, max: 3650 },
      ];
    }
    case 'cache': {
      const c = constants as CacheConstants;
      return [
        { id: 'db', kind: 'choice', options: c.dbs.map((d) => d.id) },
        { id: 'cache', kind: 'choice', options: c.caches.map((d) => d.id) },
      ];
    }
    case 'bill':
      return [
        { id: 'commit', kind: 'int', min: 0, max: 100 },
        { id: 'consolidated', kind: 'toggle' },
        { id: 'alert', kind: 'int', min: 50, max: 150 },
      ];
    case 'transfer':
      return (constants as TransferConstants).jobs.map((j) => ({
        id: j.id,
        kind: 'choice',
        options: ['online', 'offline'],
      }));
    case 'purchase':
      return (constants as PurchaseConstants).workloads.map((w) => ({
        id: w.id,
        kind: 'choice',
        options: [...PURCHASE_OPTIONS],
      }));
    case 'data-loss':
      return [
        { id: 'store', kind: 'choice', options: ['instance-store', 'ebs'] },
        { id: 'snapshotEvery', kind: 'int', min: 0, max: 24 },
      ];
  }
}

/** The label and unit of one metric, or null when the model has no such metric. */
export function metricInfo(model: SimModel, metric: string, constants: unknown): MetricInfo | null {
  const fixed: Record<SimModel, Record<string, MetricInfo>> = {
    scaling: {
      dropped: { label: 'Dropped orders', unit: '' },
      droppedShare: { label: 'Dropped share', unit: '%' },
      cost: { label: 'Daily cost', unit: CREDITS },
      fewest: { label: 'Fewest instances', unit: '' },
      most: { label: 'Most instances', unit: '' },
    },
    'compute-cost': { total: { label: 'Total cost', unit: CREDITS } },
    's3-lifecycle': {
      cost: { label: 'Yearly cost', unit: CREDITS },
      lateReads: { label: 'Late reads', unit: '' },
      lost: { label: 'Data lost', unit: '' },
      keptDays: { label: 'Days kept', unit: 'days' },
    },
    cache: {
      load: { label: 'Database load', unit: 'requests/s' },
      spare: { label: 'Spare capacity', unit: 'requests/s' },
      latency: { label: 'Average latency', unit: 'ms' },
      cost: { label: 'Monthly cost', unit: CREDITS },
    },
    bill: {
      bill: { label: 'Monthly bill', unit: CREDITS },
      saved: { label: 'Saved', unit: CREDITS },
      alertDay: { label: 'Budget alert', unit: '', show: alertDayText },
    },
    transfer: { late: { label: 'Late jobs', unit: '' } },
    purchase: {
      total: { label: 'Yearly cost', unit: CREDITS },
      interrupted: { label: 'Jobs Spot may stop', unit: '' },
      unmet: { label: 'Hardware needs not met', unit: '' },
    },
    'data-loss': {
      stopLost: { label: 'Orders lost at the stop', unit: '' },
      zoneLost: { label: 'Orders lost with the zone', unit: '' },
      snapshots: { label: 'Snapshots taken', unit: '' },
      cost: { label: 'Snapshot cost', unit: CREDITS },
    },
  };
  const own = Object.hasOwn(fixed[model], metric) ? fixed[model][metric] : undefined;
  if (own !== undefined) return own;
  const dot = metric.indexOf('.');
  if (dot < 0) return null;
  const head = metric.slice(0, dot);
  const id = metric.slice(dot + 1);
  if ((model === 'compute-cost' || model === 'purchase') && head === 'cost') {
    const w = (constants as ComputeCostConstants | PurchaseConstants).workloads.find((x) => x.id === id);
    return w === undefined ? null : { label: `Cost: ${w.label}`, unit: CREDITS };
  }
  if (model === 'transfer' && (head === 'days' || head === 'devices')) {
    const j = (constants as TransferConstants).jobs.find((x) => x.id === id);
    if (j === undefined) return null;
    return head === 'days'
      ? { label: `Days: ${j.label}`, unit: 'days' }
      : { label: `Devices: ${j.label}`, unit: '' };
  }
  return null;
}

/** The bill model reports 31 for an alert that never fires within the 30-day month. */
function alertDayText(day: number): string {
  return day > 30 ? 'after day 30' : `day ${day} of 30`;
}

/** A metric's value as the lab shows it: its own wording when it has one, else the number and its unit. */
export function metricText(value: number, info: Pick<MetricInfo, 'unit' | 'show'>): string {
  return info.show?.(value) ?? fmt(value, info.unit);
}

/** At most 2 decimals, trailing zeros trimmed, thousands grouped as the lab text writes them; `%` attaches, any other unit follows a space. */
export function fmt(value: number, unit: string): string {
  const n = (round2(value) + 0).toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (unit === '') return n;
  return unit === '%' ? `${n}%` : `${n} ${unit}`;
}

function scaling(c: ScalingConstants, v: SimValues): SimResult {
  const lo = num(v, 'min');
  const hi = Math.max(lo, num(v, 'max'));
  const predictive = str(v, 'mode') === 'predictive';
  const balancer = bool(v, 'balancer');
  const inst = c.orders.map((orders, t) => {
    if (t === 0) return clamp(num(v, 'desired'), lo, hi);
    const src = predictive ? orders : (c.orders[t - 1] ?? 0);
    return clamp(Math.ceil(src / c.perInstance), lo, hi);
  });
  const cap = inst.map((n) => (balancer ? n : Math.min(n, 1)) * c.perInstance);
  const dropped = sum(c.orders.map((o, t) => Math.max(0, o - (cap[t] ?? 0))));
  const total = sum(c.orders);
  return {
    metrics: {
      dropped,
      droppedShare: total === 0 ? 0 : round1((100 * dropped) / total),
      cost: round2(sum(inst) * c.credits),
      fewest: Math.min(...inst),
      most: Math.max(...inst),
    },
    series: [
      { label: 'Orders', unit: 'orders', values: [...c.orders] },
      { label: 'Capacity', unit: 'orders', values: cap },
    ],
  };
}

function computeCost(c: ComputeCostConstants, v: SimValues): SimResult {
  const metrics: Record<string, number> = {};
  let total = 0;
  for (const w of c.workloads) {
    const lambda =
      (w.requests / 1e6) * c.perMillion + w.requests * (w.ms / 1000) * (w.mb / 1024) * c.perGbSecond;
    const cost = str(v, w.id) === 'lambda' ? lambda : c.instanceMonth;
    metrics[`cost.${w.id}`] = round2(cost);
    total += cost;
  }
  metrics.total = round2(total);
  return { metrics, series: [] };
}

function lifecycle(c: LifecycleConstants, v: SimValues): SimResult {
  const byId = new Map(c.classes.map((k) => [k.id, k]));
  const expire = num(v, 'expire');
  const end = expire === 0 ? YEAR : Math.min(expire, YEAR);
  const secondDay = num(v, 'secondDay');
  const thirdDay = num(v, 'thirdDay');
  const classOn = (d: number): StorageClass | undefined =>
    byId.get(d < secondDay ? str(v, 'first') : d < thirdDay ? str(v, 'second') : str(v, 'third'));
  const perDay = (k: StorageClass): number => (c.gb * k.storage) / 30;
  let cost = 0;
  let current: StorageClass | undefined;
  let held = 0;
  const leave = (): void => {
    if (current !== undefined && held < current.minDays) cost += perDay(current) * (current.minDays - held);
  };
  const soFar: number[] = [];
  for (let d = 0; d < YEAR; d += 1) {
    if (d === end) {
      leave();
      current = undefined;
    }
    if (d < end) {
      const k = classOn(d);
      if (k !== current) {
        leave();
        current = k;
        held = 0;
      }
      if (current !== undefined) cost += perDay(current);
      held += 1;
    }
    for (const r of c.reads) {
      if (r.day !== d || d >= end || current === undefined) continue;
      cost += r.gb * current.retrieval;
    }
    if (d % 30 === 29) soFar.push(round2(cost));
  }
  let lateReads = 0;
  for (const r of c.reads) {
    const k = r.day < end ? classOn(r.day) : undefined;
    if (k === undefined || k.hours > r.within) lateReads += 1;
  }
  const lossDay = c.zoneLoss;
  const lost = lossDay !== null && lossDay < end && classOn(lossDay)?.zones === 1 ? 1 : 0;
  return {
    metrics: { cost: round2(cost), lateReads, lost, keptDays: expire === 0 ? NEVER : expire },
    series: [{ label: 'Cost so far', unit: CREDITS, values: soFar }],
  };
}

function cache(c: CacheConstants, v: SimValues): SimResult {
  const db = c.dbs.find((d) => d.id === str(v, 'db')) ?? c.dbs[0];
  const layer = c.caches.find((d) => d.id === str(v, 'cache')) ?? c.caches[0];
  const hit = layer?.hit ?? 0;
  const capacity = db?.capacity ?? 1;
  const load = Math.round(c.reads * (1 - hit) + c.writes);
  const util = load / capacity;
  return {
    metrics: {
      load,
      spare: capacity - load,
      latency: round1(hit * c.cacheMs + (1 - hit) * c.dbMs * Math.max(1, util) ** 2),
      cost: (db?.credits ?? 0) + (layer?.credits ?? 0),
    },
    series: [],
  };
}

/** Charges each band of `q` at its rate; the last band has `upTo: null`. */
export function tiered(q: number, tiers: readonly Tier[]): number {
  let total = 0;
  let floor = 0;
  for (const t of tiers) {
    const top = t.upTo ?? Number.POSITIVE_INFINITY;
    if (q > floor) total += (Math.min(q, top) - floor) * t.rate;
    floor = top;
  }
  return total;
}

function billOf(c: BillConstants, commit: number, consolidated: boolean): number {
  const share = commit / 100;
  const hours = sum(c.accounts.map((a) => a.hours * (share * c.commitRate + (1 - share) * c.hourRate)));
  const s3 = consolidated
    ? tiered(sum(c.accounts.map((a) => a.s3Gb)), c.s3Tiers)
    : sum(c.accounts.map((a) => tiered(a.s3Gb, c.s3Tiers)));
  const out = consolidated
    ? tiered(sum(c.accounts.map((a) => a.outGb)), c.outTiers)
    : sum(c.accounts.map((a) => tiered(a.outGb, c.outTiers)));
  return round2(hours + s3 + out);
}

function bill(c: BillConstants, v: SimValues): SimResult {
  const total = billOf(c, num(v, 'commit'), bool(v, 'consolidated'));
  const baseline = billOf(c, 0, false);
  const day =
    total <= 0 ? Number.POSITIVE_INFINITY : Math.ceil((30 * (num(v, 'alert') / 100) * c.budget) / total);
  return {
    metrics: { bill: total, saved: round2(baseline - total), alertDay: day > 30 ? 31 : day },
    series: [],
  };
}

/** Days to send `tb` terabytes over a `mbps` link at 80% efficiency (spec 5.2). */
export function onlineDays(tb: number, mbps: number): number {
  return round2((tb * 8e6) / (mbps * 0.8) / 86_400);
}

function transfer(c: TransferConstants, v: SimValues): SimResult {
  const metrics: Record<string, number> = {};
  let late = 0;
  for (const j of c.jobs) {
    const days = str(v, j.id) === 'offline' ? c.turnaround : onlineDays(j.tb, j.mbps);
    metrics[`days.${j.id}`] = days;
    metrics[`devices.${j.id}`] = Math.ceil(j.tb / c.deviceTb);
    if (days > j.deadline) late += 1;
  }
  metrics.late = late;
  return { metrics, series: [] };
}

const COMMITMENTS: ReadonlySet<string> = new Set(['reserved', 'savings-plan']);
const MEETS: Readonly<Record<PurchaseWorkload['needs'], readonly string[]>> = {
  none: PURCHASE_OPTIONS,
  'dedicated-instance': ['dedicated-instance', 'dedicated-host'],
  'dedicated-host': ['dedicated-host'],
};

function purchase(c: PurchaseConstants, v: SimValues): SimResult {
  const metrics: Record<string, number> = {};
  let total = 0;
  let interrupted = 0;
  let unmet = 0;
  for (const w of c.workloads) {
    const picked = str(v, w.id);
    const o: PurchaseOption = (PURCHASE_OPTIONS as readonly string[]).includes(picked)
      ? (picked as PurchaseOption)
      : 'on-demand';
    const hours = COMMITMENTS.has(o) ? HOURS_PER_MONTH * c.termMonths : w.hours * w.months;
    const cost = round2(c.rates[o] * hours);
    metrics[`cost.${w.id}`] = cost;
    total += cost;
    if (o === 'spot' && !w.interruptible) interrupted += 1;
    if (!MEETS[w.needs].includes(o)) unmet += 1;
  }
  metrics.total = round2(total);
  metrics.interrupted = interrupted;
  metrics.unmet = unmet;
  return { metrics, series: [] };
}

function dataLoss(c: DataLossConstants, v: SimValues): SimResult {
  const ebs = str(v, 'store') === 'ebs';
  const every = num(v, 'snapshotEvery');
  const at: number[] = [];
  if (ebs && every > 0) for (let h = every; h < c.hours; h += every) at.push(h);
  // A snapshot due at the hour the zone fails is taken first.
  const last = at.filter((h) => h <= c.zoneLossAt).at(-1) ?? 0;
  return {
    metrics: {
      stopLost: ebs ? 0 : c.stopAt * c.perHour,
      zoneLost: (c.zoneLossAt - (ebs ? last : c.stopAt)) * c.perHour,
      snapshots: at.length,
      cost: at.length === 0 ? 0 : round2(c.fullSnapshot + (at.length - 1) * c.incrementalSnapshot),
    },
    series: [],
  };
}

/** Runs one model over validated constants and the parameter values on screen. */
export function runModel(model: SimModel, constants: unknown, values: SimValues): SimResult {
  switch (model) {
    case 'scaling':
      return scaling(constants as ScalingConstants, values);
    case 'compute-cost':
      return computeCost(constants as ComputeCostConstants, values);
    case 's3-lifecycle':
      return lifecycle(constants as LifecycleConstants, values);
    case 'cache':
      return cache(constants as CacheConstants, values);
    case 'bill':
      return bill(constants as BillConstants, values);
    case 'transfer':
      return transfer(constants as TransferConstants, values);
    case 'purchase':
      return purchase(constants as PurchaseConstants, values);
    case 'data-loss':
      return dataLoss(constants as DataLossConstants, values);
  }
}
