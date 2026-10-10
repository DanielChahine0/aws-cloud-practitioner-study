/** Pure rules of the top bar (spec 7.2) and the engine-change line (spec 8.2), so the tests run without a browser. */
import { ENGINE_VERSION } from '../engine/replay.ts';

/** How long an XP gain shows beside the level line. */
export const FLASH_MS = 600;
/** A larger jump comes from an import or a merge, not from one answer, so it never flashes. */
export const FLASH_MAX = 200;

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Each name starts with the visible text (`3 due`, `9d`), so a voice command for what is seen matches (WCAG 2.5.3). */
export function dueLabel(due: number): string {
  return `${due} due: ${plural(due, 'concept', 'concepts')}, start a review`;
}

export function streakLabel(days: number): string {
  return `${days}d streak: ${plural(days, 'day', 'days')}, open Progress`;
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

/**
 * What the rank button does, read after the plan name its own text shows (`Business+ rank, open Progress`); with no
 * `aria-label`, the name a width hides drops out, so the name starts with the visible name at every width (WCAG 2.5.3).
 */
export const RANK_ACTION = 'rank, open Progress';

/** The one dismissible promotion line under the top bar (spec 3.4): the plan name and its two facts. */
export function rankUpLine(rank: { name: string; facts: readonly string[] }): string {
  return `${rank.name}: ${rank.facts.join(' ')}`;
}
