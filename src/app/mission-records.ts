import type { PlanRecord } from '../engine/missions.ts';

/**
 * Guards for the two mission kv records (spec 5.3, 8.1): `plan`, the plan status, and `missionTicks`,
 * each mission's ticked step ids. A value from an old backup or another device is checked, never trusted.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The plan record in a kv value, or null when it is malformed. Never throws. */
export function planOf(value: unknown): PlanRecord | null {
  if (!isRecord(value)) return null;
  const { plan, credits, endsOn, services, recordedAt } = value;
  if (plan !== 'free' && plan !== 'paid') return null;
  if (typeof credits !== 'number' || !Number.isFinite(credits) || credits < 0) return null;
  if (typeof endsOn !== 'string' || !DAY.test(endsOn)) return null;
  if (typeof recordedAt !== 'string' || Number.isNaN(Date.parse(recordedAt))) return null;
  if (!isRecord(services) || !Object.values(services).every((on) => typeof on === 'boolean')) return null;
  return { plan, credits, endsOn, services: { ...(services as Record<string, boolean>) }, recordedAt };
}

/** Each mission's ticked step ids, dropping malformed entries. Never throws. */
export function ticksOf(value: unknown): Readonly<Record<string, readonly string[]>> {
  if (!isRecord(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [mission, steps] of Object.entries(value)) {
    if (Array.isArray(steps) && steps.every((s) => typeof s === 'string')) out[mission] = [...steps];
  }
  return out;
}

/** A copy of `ticks` with `step` of `mission` ticked or unticked; a mission left with no ticks drops out. */
export function withTick(
  ticks: Readonly<Record<string, readonly string[]>>,
  mission: string,
  step: string,
  on: boolean,
): Record<string, string[]> {
  const out: Record<string, string[]> = Object.fromEntries(
    Object.entries(ticks).map(([m, steps]) => [m, [...steps]]),
  );
  const steps = (out[mission] ?? []).filter((s) => s !== step);
  if (on) steps.push(step);
  if (steps.length === 0) delete out[mission];
  else out[mission] = steps;
  return out;
}
