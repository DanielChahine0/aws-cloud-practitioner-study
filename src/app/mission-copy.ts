/** The mission screens' copy and helpers (spec 5.3, 7.5); only the lazy mission screens load this module. */
import { computed, signal } from '@preact/signals';
import type { MissionMeta } from '../../schemas/chunks.ts';
import { GATE_MISSION, type MissionStatus, type MissionStep, type PlanRecord } from '../engine/missions.ts';
import { KV_KEYS } from '../store/kv.ts';
import { adrDraftOf } from './adr-draft.ts';
import { examDateLabel } from './home.ts';
import { ticksOf } from './mission-records.ts';
import { kvRecords } from './progress.ts';

/** Mission 8's Verify waits for the estimate link in decision 11's Cost note (spec 5.3). */
export const ESTIMATE_MISSION = 'mission-08';
export const ESTIMATE_DECISION = 11;
export const CALCULATOR_LINK = 'https://calculator.aws/';

/** The ticked step ids of each mission, from kv `missionTicks`. */
export const missionTicks = computed(() => ticksOf(kvRecords.value[KV_KEYS.missionTicks]?.value));

/** The mission page's polite live region: what the last button did. */
export const missionAnnounce = signal('');

const STAGE_WORDS: Record<MissionStatus['stage'], string> = {
  locked: 'Locked',
  'not-on-plan': 'Not on your plan',
  ready: 'Ready',
  started: 'Started',
  live: 'Live',
  overdue: 'Clean up now',
  cleaned: 'Cleaned up',
  verified: 'Verified',
  closed: 'Closed',
};

export function stageWord(s: MissionStatus): string {
  return STAGE_WORDS[s.stage];
}

/** Why a mission cannot start: the gate, or the services the plan lacks. */
export function lockLine(s: MissionStatus): string | null {
  if (s.stage === 'locked') return 'Locked until Mission 0 is verified.';
  if (s.stage === 'not-on-plan') return `Not on your plan: ${s.missing.join(', ')}.`;
  return null;
}

const ANNOUNCED: Record<MissionStep, string> = {
  start: 'started',
  verified: 'verified',
  cleaned: 'cleaned up',
  'usage-ok': 'closed',
};

export function missionAnnouncement(n: number, step: MissionStep): string {
  return `Mission ${n} ${ANNOUNCED[step]}.`;
}

/** The announcement for a usage check that closes nothing, because its attempt never passed Verify. */
export function usageSavedLine(n: number): string {
  return `Usage check saved for Mission ${n}.`;
}

export function usageLine(from: string): string {
  return `Check usage on ${examDateLabel(from)} or later.`;
}

export function closedLine(day: string): string {
  return `Closed on ${examDateLabel(day)}.`;
}

/** The Plan status saved line; `day` is the study day of the record's `recordedAt`. */
export function savedLine(day: string): string {
  return `Plan status saved on ${examDateLabel(day)}.`;
}

/** The list's lede: the gate first (spec 7.5 empty state), then what missions are. */
export function listLede(list: readonly MissionStatus[]): string {
  const gate = list.find((s) => s.id === GATE_MISSION);
  return gate?.stage === 'closed'
    ? 'Real AWS, done by hand in your own account, one mission at a time.'
    : 'Start with Mission 0: Guardrails.';
}

export function startLabel(n: number): string {
  return `Start Mission ${n}`;
}

export function usageButtonLabel(keep: boolean): string {
  return keep ? 'Cost stays within the expected credits' : 'Usage is back to baseline';
}

/** The first thing Verify still waits for, or null when it can be pressed. */
export function verifyHint(args: {
  allTicked: boolean;
  needsPlan: boolean;
  planSaved: boolean;
  needsEstimate: boolean;
  estimateSaved: boolean;
}): string | null {
  if (!args.allTicked) return 'Tick every step first.';
  if (args.needsPlan && !args.planSaved) return 'Save your plan status first.';
  if (args.needsEstimate && !args.estimateSaved) return 'Save the estimate link in decision 11 first.';
  return null;
}

export function allTicked(steps: readonly { id: string }[], ticked: readonly string[]): boolean {
  return steps.every((s) => ticked.includes(s.id));
}

/** The ticks without one mission's, for a fresh attempt. */
export function ticksCleared(
  ticks: Readonly<Record<string, readonly string[]>>,
  mission: string,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [id, list] of Object.entries(ticks)) if (id !== mission) out[id] = [...list];
  return out;
}

/** True when a decision draft's Cost note holds a Pricing Calculator link. */
export function estimateSaved(draft: unknown): boolean {
  return adrDraftOf(draft)?.cost.includes(CALCULATOR_LINK) ?? false;
}

/** Where the mission flow puts its controls: after the section with this id, or nowhere. */
export type FlowSlot = 'start' | 'steps' | 'verify' | 'cleanup' | 'usage';

export function slotAfter(sectionId: string, m: Pick<MissionMeta, 'keep' | 'gate'>): FlowSlot | null {
  switch (sectionId) {
    case 'before-you-start':
      return 'start';
    case 'steps':
      return 'steps';
    case 'verify':
      return 'verify';
    case 'cleanup':
      return m.keep || m.gate ? null : 'cleanup';
    case 'usage-check':
      return m.keep || m.gate ? null : 'usage';
    case 'keep-it-running':
      return m.keep ? 'usage' : null;
    default:
      return null;
  }
}

/** The Plan status form as typed: numbers stay text until saved. */
export interface PlanDraft {
  plan: 'free' | 'paid';
  credits: string;
  endsOn: string;
  services: Record<string, boolean>;
}

/** The form's starting values: the saved record, else a free plan with every service unticked. */
export function planDraftOf(saved: PlanRecord | null, services: readonly string[]): PlanDraft {
  return {
    plan: saved?.plan ?? 'free',
    credits: saved === null ? '' : String(saved.credits),
    endsOn: saved?.endsOn ?? '',
    services: Object.fromEntries(services.map((s) => [s, saved?.services[s] === true])),
  };
}

const isAmount = (text: string): boolean =>
  text.trim() !== '' && Number.isFinite(Number(text)) && Number(text) >= 0;

export function planProblems(d: PlanDraft): string[] {
  const out: string[] = [];
  if (!isAmount(d.credits)) out.push('Enter the credits you have left.');
  if (d.plan === 'free' && d.endsOn === '') out.push('Enter the date your plan ends.');
  return out;
}

/** The kv `plan` record of a draft with no problems, stamped `at`. */
export function planRecordOf(d: PlanDraft, at: Date): PlanRecord {
  return {
    plan: d.plan,
    credits: Number(d.credits),
    endsOn: d.endsOn,
    services: { ...d.services },
    recordedAt: at.toISOString(),
  };
}

/** The credits typed into a usage field, or null when the field holds no amount. */
export function creditsOf(text: string): number | null {
  return isAmount(text) ? Number(text) : null;
}
