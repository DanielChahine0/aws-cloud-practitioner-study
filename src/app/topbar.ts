/** Pure rules of the top bar (spec 7.2) and the engine-change line (spec 8.2), so the tests run without a browser. */
import { ENGINE_VERSION } from '../engine/replay.ts';

/** How long an XP gain shows beside the level line. */
export const FLASH_MS = 600;
/** A larger jump comes from an import or a merge, not from one answer, so it never flashes. */
export const FLASH_MAX = 200;

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export function dueLabel(due: number): string {
  return `${plural(due, 'concept', 'concepts')} due; start a review`;
}

export function streakLabel(days: number): string {
  return `Streak ${plural(days, 'day', 'days')}; open Progress`;
}

/** The gain to flash when XP moves from `before` to `after`; null for the first value, no gain, or a jump. */
export function xpGain(before: number | null, after: number): number | null {
  if (before === null) return null;
  const gain = after - before;
  return gain > 0 && gain <= FLASH_MAX ? gain : null;
}

/**
 * `Rules updated, progress recalculated.` (spec 8.2): `show` when the engine changed since the log was last
 * replayed, `stamp` to record the version silently on an empty log, `none` otherwise.
 */
export function rulesLine(args: {
  ready: boolean;
  stored: unknown;
  events: number;
}): 'none' | 'show' | 'stamp' {
  if (!args.ready || args.stored === ENGINE_VERSION) return 'none';
  return args.events === 0 ? 'stamp' : 'show';
}
