/**
 * Mission state in signals (spec 5.3): each mission's stage from the log, the plan record and the minute clock, the
 * top bar's live chip and Next's safety entry.
 * `mission-state.ts` loads this module as the app starts, and the lazy mission screens import it, so it stays out of
 * the initial bundle; the screens' copy and helpers live in `mission-copy.ts`, which only the lazy mission screens
 * load.
 */
import { computed } from '@preact/signals';
import type { MissionMeta } from '../../schemas/chunks.ts';
import { studyDay, tzOffset } from '../engine/day.ts';
import {
  liveMission,
  type MissionRef,
  type MissionSafety,
  type MissionStatus,
  missionLogOf,
  missionSafety,
  missionStatuses,
  type PlanRecord,
} from '../engine/missions.ts';
import { KV_KEYS } from '../store/kv.ts';
import { now } from './clock.ts';
import { index } from './content.ts';
import { planOf } from './mission-records.ts';
import { events, kvRecords } from './progress.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** What the engine needs from a mission's index entry. */
export function refOf(m: MissionMeta): MissionRef {
  return {
    id: m.id,
    n: Number(m.id.slice('mission-'.length)),
    keep: m.keep,
    gate: m.gate,
    maxLiveHours: m.maxLiveHours,
    services: m.services,
  };
}

export const missionRefs = computed<MissionRef[]>(() => (index.value?.missions ?? []).map(refOf));

export const planRecord = computed<PlanRecord | null>(() => planOf(kvRecords.value[KV_KEYS.plan]?.value));

export const missionLogs = computed(() => missionLogOf(events.value, missionRefs.value));

/** Each mission's stage at the minute clock, so a live mission turns overdue without a timer of its own. */
export const statuses = computed<MissionStatus[]>(() => {
  const at = now.value;
  return missionStatuses({
    missions: missionRefs.value,
    log: missionLogs.value,
    plan: planRecord.value,
    now: at,
    tz: tzOffset(at),
  });
});

/** Next's mission entry (spec 4.6) at the minute clock. */
export const safety = computed<MissionSafety | null>(() =>
  missionSafety(statuses.value, studyDay(now.value)),
);

/** The amber top-bar chip while a cleaned-up mission is live (spec 5.3 rule 10); it links to the mission. */
export const liveChip = computed<{ label: string; href: string; aria: string } | null>(() => {
  const live = liveMission(statuses.value);
  if (live === null || live.liveMs === null) return null;
  return {
    label: liveLabel(live.n, live.liveMs),
    href: `#/missions/${live.id}`,
    aria: liveAria(live.n, live.liveMs),
  };
});

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** `M3 live 12m` under an hour, then `M3 live 1h` in whole hours; a clock a little behind the Start reads 0m. */
export function liveLabel(n: number, liveMs: number): string {
  const ms = Math.max(0, liveMs);
  return ms < HOUR_MS
    ? `M${n} live ${Math.floor(ms / MINUTE_MS)}m`
    : `M${n} live ${Math.floor(ms / HOUR_MS)}h`;
}

/** The chip's accessible name, which spells out the time and says where the link goes. */
export function liveAria(n: number, liveMs: number): string {
  const ms = Math.max(0, liveMs);
  const time =
    ms < HOUR_MS
      ? plural(Math.floor(ms / MINUTE_MS), 'minute', 'minutes')
      : plural(Math.floor(ms / HOUR_MS), 'hour', 'hours');
  return `Mission ${n} has been live for ${time}; open it`;
}
