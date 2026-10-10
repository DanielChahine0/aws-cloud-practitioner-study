import { DOMAIN_IDS, type DomainIdValue } from '../../schemas/ids.ts';
import { addDays, DAY_MS, dayStartAt, daysBetween, studyDayAt } from './day.ts';
import { conceptMastery } from './mastery.ts';
import type { MemoryContent, MemoryState } from './memory.ts';
import { MOCK_WINDOW_DAYS, type MockAttempt } from './mock.ts';
import { domainOf } from './quotas.ts';

/**
 * Readiness (spec 3.9): memory of the tested concepts read at the exam moment `t*`, blended with the latest unseen
 * mocks, and capped at 0.70 until a mock has been taken. It sits beside `deriveMemory` and is read for a moment.
 */
export const DOMAIN_WEIGHTS = { '1': 0.24, '2': 0.3, '3': 0.34, '4': 0.12 } as const;
/** Tested concepts with a card before readiness shows a number. */
export const EVIDENCE_MIN = 40;
export const NO_MOCK_CAP = 0.7;
export const READY = 0.8;
export const CLOSE = 0.65;
/** Every domain's `Q_d` must reach this for Ready. */
export const DOMAIN_FLOOR = 0.7;
/** A task needs this many tested concepts to be named the weakest. */
export const WEAKEST_MIN_CONCEPTS = 3;
/** Without an exam date after today, readiness reads this many days ahead. */
export const PROJECT_DAYS = 7;

export type ReadinessLabel = 'Ready' | 'Close' | 'Building';

export interface Readiness {
  /** In [0, 1], or null before `EVIDENCE_MIN` tested concepts have a card; shown as `Math.floor(100 * value)`. */
  value: number | null;
  label: ReadinessLabel;
  /** True when no first attempt sits in the window, so the value is capped at 0.70. */
  capped: boolean;
  memory: number;
  mock: number | null;
  domains: Record<DomainIdValue, number>;
  weakest: { task: string; value: number } | null;
  /** The moment `t*` readiness is read at, as an ISO time. */
  at: string;
}

/** `t*`: the exam day's 04:00 when the exam date is after today, else `now` plus 7 days. */
export function readinessTarget(examDate: string | null, now: Date, tz: number): Date {
  if (examDate !== null && examDate > studyDayAt(now, tz)) return dayStartAt(examDate, tz);
  return new Date(now.getTime() + PROJECT_DAYS * DAY_MS);
}

/** Tested concepts of the content whose memory has a card. */
export function evidenceCount(memory: MemoryState, content: MemoryContent): number {
  let count = 0;
  for (const [id, info] of content.concepts) {
    if (info.tested && (memory.concepts.get(id)?.card ?? null) !== null) count++;
  }
  return count;
}

const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));
const byAt = (a: MockAttempt, b: MockAttempt): number => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0);

export function readiness(args: {
  memory: MemoryState;
  content: MemoryContent;
  attempts: readonly MockAttempt[];
  now: Date;
  tz: number;
}): Readiness {
  const { memory, content, now, tz } = args;
  const today = studyDayAt(now, tz);
  const target = readinessTarget(memory.examDate, now, tz);

  const byDomain = new Map<DomainIdValue, number[]>(DOMAIN_IDS.map((d) => [d, []]));
  const byTask = new Map<string, number[]>();
  for (const [id, info] of content.concepts) {
    if (!info.tested) continue;
    const value = conceptMastery(memory.concepts.get(id), target);
    for (const domain of new Set(info.tasks.map(domainOf))) byDomain.get(domain)?.push(value);
    for (const task of new Set(info.tasks)) {
      const list = byTask.get(task) ?? [];
      list.push(value);
      byTask.set(task, list);
    }
  }
  const domains = {} as Record<DomainIdValue, number>;
  for (const d of DOMAIN_IDS) domains[d] = mean(byDomain.get(d) ?? []);
  const memoryValue = clamp01(DOMAIN_IDS.reduce((sum, d) => sum + DOMAIN_WEIGHTS[d] * domains[d], 0));

  const recent = args.attempts.filter((a) => daysBetween(a.day, today) <= MOCK_WINDOW_DAYS).sort(byAt);
  const latestTwo = recent.slice(-2);
  const mock = latestTwo.length === 0 ? null : mean(latestTwo.map((a) => a.percent));
  const blended = mock === null ? Math.min(memoryValue, NO_MOCK_CAP) : 0.5 * memoryValue + 0.5 * mock;
  const value = evidenceCount(memory, content) < EVIDENCE_MIN ? null : clamp01(blended);

  const latest = recent.at(-1);
  const ready =
    value !== null &&
    value >= READY &&
    latest !== undefined &&
    latest.percent >= READY &&
    DOMAIN_IDS.every((d) => domains[d] >= DOMAIN_FLOOR);
  const label: ReadinessLabel = ready ? 'Ready' : value !== null && value >= CLOSE ? 'Close' : 'Building';

  let weakest: { task: string; value: number } | null = null;
  for (const task of [...byTask.keys()].sort()) {
    const values = byTask.get(task) ?? [];
    if (values.length < WEAKEST_MIN_CONCEPTS) continue;
    const taskValue = mean(values);
    if (weakest === null || taskValue < weakest.value) weakest = { task, value: taskValue };
  }

  return {
    value,
    label,
    capped: mock === null,
    memory: memoryValue,
    mock,
    domains,
    weakest,
    at: target.toISOString(),
  };
}

/** The go/no-go line (spec 10.2): shown from 7 to 2 days before the exam while readiness is not Ready. */
export function goNoGo(args: { examDate: string | null; today: string; readiness: Readiness }): boolean {
  const { examDate, today } = args;
  if (examDate === null) return false;
  return addDays(examDate, -7) <= today && today <= addDays(examDate, -2) && args.readiness.label !== 'Ready';
}
