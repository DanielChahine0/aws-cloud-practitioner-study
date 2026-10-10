import type { StudyEvent } from '../../schemas/events.ts';
import { addDays } from './day.ts';

/**
 * Mission state (spec 5.3), derived from `mission` events, the `plan` record and the clock.
 * The log always wins: the gate and plan fit only choose between `locked`, `not-on-plan` and `ready`
 * for a mission with no open attempt, so a started mission keeps its chip and its cleanup.
 */

/** Mission 0 locks every other mission until it has a `verified` event (spec 5.3 rule 1). */
export const GATE_MISSION = 'mission-00';
/** Spec 5.3 rule 6's default; the schema makes cleaned-up missions write it out. */
export const DEFAULT_LIVE_HOURS = 2;
const HOUR_MS = 3_600_000;

/** What the engine needs of a mission page's frontmatter. */
export interface MissionRef {
  id: string;
  n: number;
  keep: boolean;
  gate: boolean;
  maxLiveHours: number | null;
  services: readonly string[];
}

/** The kv `plan` record that Mission 0's Plan status form writes (spec 8.1). */
export interface PlanRecord {
  plan: 'free' | 'paid';
  credits: number;
  endsOn: string;
  /** Service name to whether the plan offers it; a service missing here counts as not offered. */
  services: Readonly<Record<string, boolean>>;
  recordedAt: string;
}

export type MissionStep = Extract<StudyEvent, { t: 'mission' }>['step'];

export interface StepAt {
  at: string;
  day: string;
}

/** One try at a mission, opened by `start`; only the first event of each step counts. */
export interface MissionAttempt {
  start: StepAt;
  verified: StepAt | null;
  cleaned: StepAt | null;
  usageOk: (StepAt & { credits: number | null }) | null;
}

export interface MissionLog {
  attempts: readonly MissionAttempt[];
  /** When the mission closed for good; nothing after it counts. */
  closed: StepAt | null;
}

export type MissionEvent = Extract<StudyEvent, { t: 'mission' }>;

/** A mission log while it is read, one event at a time; `missionLogOf` and the memory replay both grow one. */
export interface OpenMissionLog {
  attempts: MissionAttempt[];
  closed: StepAt | null;
}

/** Whether an attempt is over: a non-kept attempt ends with its later-day usage check. */
function attemptOver(a: MissionAttempt): boolean {
  return a.usageOk !== null;
}

/**
 * Applies one event of mission `m` to its log: a `start` opens the first attempt, or a retry after a cleanup with no
 * Verify; Verify counts only before cleanup; a usage check counts only on a later study day than the cleanup (the
 * kept mission: than Verify); the gate closes on Verify, any other mission on the usage check of a verified attempt.
 */
export function stepMission(m: MissionRef, log: OpenMissionLog, e: MissionEvent): void {
  if (log.closed !== null) return;
  const step: StepAt = { at: e.at, day: e.day };
  const current = log.attempts.at(-1);
  if (e.step === 'start') {
    const retry = current !== undefined && current.cleaned !== null && current.verified === null;
    if (current === undefined || retry) {
      log.attempts.push({ start: step, verified: null, cleaned: null, usageOk: null });
    }
    return;
  }
  if (current === undefined || attemptOver(current)) return;
  if (e.step === 'verified') {
    if (current.verified !== null || current.cleaned !== null) return;
    current.verified = step;
    if (m.gate) log.closed = step;
    return;
  }
  if (e.step === 'cleaned') {
    if (!m.keep && !m.gate && current.cleaned === null) current.cleaned = step;
    return;
  }
  if (m.gate) return;
  const after = m.keep ? current.verified : current.cleaned;
  if (after === null || e.day <= after.day) return;
  current.usageOk = { ...step, credits: e.credits ?? null };
  if (current.verified !== null) log.closed = step;
}

/** Each known mission's attempts and close, from events in id order; unknown mission ids are ignored. */
export function missionLogOf(
  events: readonly StudyEvent[],
  missions: readonly MissionRef[],
): ReadonlyMap<string, MissionLog> {
  const refs = new Map(missions.map((m) => [m.id, m]));
  const logs = new Map<string, OpenMissionLog>();
  const sorted = events
    .filter((e): e is MissionEvent => e.t === 'mission')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const e of sorted) {
    const m = refs.get(e.mission);
    if (m === undefined) continue;
    const log = logs.get(m.id) ?? { attempts: [], closed: null };
    logs.set(m.id, log);
    stepMission(m, log, e);
  }
  return logs;
}

export type MissionStage =
  | 'locked'
  | 'not-on-plan'
  | 'ready'
  | 'started'
  | 'live'
  | 'overdue'
  | 'cleaned'
  | 'verified'
  | 'closed';

export interface MissionStatus {
  id: string;
  n: number;
  stage: MissionStage;
  /** Services of this mission that the plan does not offer; always empty for the gate. */
  missing: readonly string[];
  /** Time since `start` while live or overdue, else null. */
  liveMs: number | null;
  /** The first study day the usage check is offered, while it waits. */
  usageFrom: string | null;
  closedDay: string | null;
}

const NO_LOG: MissionLog = { attempts: [], closed: null };

function statusOf(
  m: MissionRef,
  log: MissionLog,
  gatePassed: boolean,
  plan: PlanRecord | null,
  now: Date,
): MissionStatus {
  const missing = m.gate ? [] : m.services.filter((s) => plan?.services[s] !== true);
  const base = { id: m.id, n: m.n, missing, liveMs: null, usageFrom: null, closedDay: null };
  if (log.closed !== null) return { ...base, stage: 'closed', closedDay: log.closed.day };
  const open = log.attempts.at(-1);
  if (open !== undefined && !attemptOver(open)) {
    if (m.gate) return { ...base, stage: 'started' };
    if (m.keep) {
      if (open.verified === null) return { ...base, stage: 'started' };
      return { ...base, stage: 'verified', usageFrom: addDays(open.verified.day, 1) };
    }
    if (open.cleaned !== null) return { ...base, stage: 'cleaned', usageFrom: addDays(open.cleaned.day, 1) };
    const liveMs = now.getTime() - Date.parse(open.start.at);
    const limit = (m.maxLiveHours ?? DEFAULT_LIVE_HOURS) * HOUR_MS;
    return { ...base, stage: liveMs > limit ? 'overdue' : 'live', liveMs };
  }
  if (!m.gate && !gatePassed) return { ...base, stage: 'locked' };
  return { ...base, stage: missing.length > 0 ? 'not-on-plan' : 'ready' };
}

/**
 * Every mission's stage, in the order given. Days come from the events' own `day`, so `tz` (minutes east of UTC,
 * as every engine helper that takes the clock receives it) changes nothing today.
 */
export function missionStatuses(args: {
  missions: readonly MissionRef[];
  log: ReadonlyMap<string, MissionLog>;
  plan: PlanRecord | null;
  now: Date;
  tz: number;
}): MissionStatus[] {
  const gatePassed = args.log.get(GATE_MISSION)?.closed != null;
  return args.missions.map((m) => statusOf(m, args.log.get(m.id) ?? NO_LOG, gatePassed, args.plan, args.now));
}

/** The plan-fit list: the sorted union of every non-gate mission's services. */
export function planServices(missions: readonly MissionRef[]): string[] {
  return [...new Set(missions.filter((m) => !m.gate).flatMap((m) => m.services))].sort();
}

function lowest(statuses: readonly MissionStatus[]): MissionStatus | null {
  return [...statuses].sort((a, b) => a.n - b.n)[0] ?? null;
}

/** The live (or overdue) mission the top bar chip shows, lowest number first. */
export function liveMission(statuses: readonly MissionStatus[]): MissionStatus | null {
  return lowest(statuses.filter((s) => s.stage === 'live' || s.stage === 'overdue'));
}

export type MissionSafety = { kind: 'cleanup' | 'usage'; mission: string; n: number };

/** Next's mission entry (spec 4.6): an overdue cleanup first, then a usage check that is due today. */
export function missionSafety(statuses: readonly MissionStatus[], today: string): MissionSafety | null {
  const overdue = lowest(statuses.filter((s) => s.stage === 'overdue'));
  if (overdue !== null) return { kind: 'cleanup', mission: overdue.id, n: overdue.n };
  const usage = lowest(statuses.filter((s) => s.usageFrom !== null && today >= s.usageFrom));
  return usage === null ? null : { kind: 'usage', mission: usage.id, n: usage.n };
}
