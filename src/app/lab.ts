/** The lab screen's copy (spec 5, 7.4), pure so the tests match it word for word. */
import type { LabEngineId } from '../../schemas/ids.ts';
import type { GoalResult } from '../labs/contract.ts';
import { shortDate } from './dates.ts';

export const ENGINE_LABEL = {
  sort: 'Sort',
  configure: 'Configure',
  simulate: 'Simulate',
  place: 'Place',
  trace: 'Trace',
  investigate: 'Investigate',
} as const satisfies Record<LabEngineId, string>;

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

/** Announced when a card lands in a bucket or a piece in a slot. */
export function placedLine(card: string, bucket: string): string {
  return `Placed ${card} in ${bucket}.`;
}

/** Announced when a card or a piece goes back to the tray. */
export function returnedLine(card: string): string {
  return `${card} is back in the tray.`;
}

/** The Place tray once every piece is in a slot or on the bench. */
export const PIECES_EMPTY = 'Every piece is placed.';
/** The Place tray's legend, read by screen readers. */
export const PIECES_LEGEND = 'Pieces';
/** The legend over the Place failure buttons. */
export const FAILURE_LEGEND = 'Try a failure';
/** The word on a failed container and on each piece below it, so colour is never the only signal (spec 7.6). */
export const DOWN_MARK = 'Down';

/** A Place failure button: `Oven Row A fails`. */
export function failureButton(label: string): string {
  return `${label} fails`;
}

/** Announced when a failure preview starts. */
export function downLine(label: string): string {
  return `${label} is down.`;
}

/** Announced when a failure preview ends. */
export function backLine(label: string): string {
  return `${label} is back.`;
}

/** The check button's words: Simulate runs the model before it checks (Task 13). */
export function checkLabel(engine: LabEngineId): string {
  return engine === 'simulate' ? 'Run and check' : 'Check';
}

export const SIM_IDLE = 'Not run yet. Press Run and check to run the simulation with these parameters.';
export const SIM_RESULTS = 'Results of the last run';
/** The accessible name of a Simulate chart, naming its series and its points. */
export function simChartLabel(model: 'scaling' | 's3-lifecycle', series: readonly string[]): string {
  return model === 'scaling'
    ? `${series.join(' and ')} for each hour from 0:00 to 23:00`
    : `${series.join(' and ')} at the end of each 30-day month`;
}

/**
 * The points that get a label under the chart: the first, the quarters and the last,
 * dropping a quarter that would crowd the last label (0:00, 6:00, 12:00, 18:00, 23:00 for a day).
 */
export function tickPoints(n: number): number[] {
  if (n <= 0) return [];
  const last = n - 1;
  const quarters = [0, 1, 2, 3].map((q) => Math.round((n * q) / 4)).filter((i) => i < last);
  const kept = [last];
  for (const i of [...new Set(quarters)].reverse()) {
    if ((kept[0] ?? last) - i >= n / 5) kept.unshift(i);
  }
  return kept;
}
