import type { StudyEvent } from '../../schemas/events.ts';

/**
 * The mission log rules (spec 5.3): how `mission` events grow each mission's attempts and close.
 * The memory replay reads them in the initial bundle, so they live apart from the stages in `missions.ts`, which only
 * the lazy mission code loads.
 */

/** Mission 0 locks every other mission until it has a `verified` event (spec 5.3 rule 1). */
export const GATE_MISSION = 'mission-00';

/** What the engine needs of a mission page's frontmatter. */
export interface MissionRef {
  id: string;
  n: number;
  keep: boolean;
  gate: boolean;
  maxLiveHours: number | null;
  services: readonly string[];
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
export function attemptOver(a: MissionAttempt): boolean {
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
