/** The lab screen's copy (spec 5, 7.4), pure so the tests match it word for word. */
import type { LabEngineId } from '../../schemas/ids.ts';
import type { GoalResult } from '../labs/contract.ts';
import { shortDate } from './dates.ts';

export const ENGINE_LABEL = { sort: 'Sort', configure: 'Configure', simulate: 'Simulate' } as const;

/** Shown on every lab that prices anything (spec 5): prices are never real AWS prices. */
export const CREDITS_NOTE = 'Prices are in lab credits, a made-up unit, not AWS prices.';

/** The Sort tray once every card is in a bucket. */
export const TRAY_EMPTY = 'Every card is placed.';

/** The inline reset panel's question (spec 7.5: no modal). */
export const RESET_ASK = 'Reset this lab? Your work is cleared; hints you opened still count.';

/** The line under a lab's title: `Sort lab, about 6 minutes`. */
export function labLede(engine: LabEngineId, minutes: number): string {
  return `${ENGINE_LABEL[engine]} lab, about ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** A goal's word beside its icon; colour is never the only signal (spec 7.6). */
export function goalWord(result: GoalResult | null): 'Met' | 'Not met' | 'Not checked' {
  if (result === null) return 'Not checked';
  return result.pass ? 'Met' : 'Not met';
}

/** What a Check announces: `1 of 3 goals met.`, `All 3 goals met.`, or with the XP the completion paid. */
export function labCheckLine(met: number, total: number, xp: number): string {
  if (met < total) return `${met} of ${total} goals met.`;
  return xp > 0 ? `All ${total} goals met. Plus ${xp} XP.` : `All ${total} goals met.`;
}

/** An opened hint: the goal's own hint, then what the board says about that goal now. */
export function hintLine(goalHint: string, stateHint: string): string {
  return `${goalHint} ${stateHint}`;
}

/** Under the title of a lab done before (spec 3.2: first completion only). */
export function labDoneLine(day: string): string {
  return `Done on ${shortDate(day)}; a rerun pays no XP.`;
}

/** Announced when a card lands in a bucket. */
export function placedLine(card: string, bucket: string): string {
  return `Placed ${card} in ${bucket}.`;
}

/** Announced when a card goes back to the tray. */
export function returnedLine(card: string): string {
  return `${card} is back in the tray.`;
}
