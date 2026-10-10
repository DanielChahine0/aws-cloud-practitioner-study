/** Levels (spec 3.3): they show only as the top bar's 2 px line and a number in Progress, and gate nothing. */

/** The total XP at which level `level` starts. */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

/** The level for a total XP; 1 at 0 XP. */
export function level(xp: number): number {
  return Math.floor((1 + Math.sqrt(1 + Math.max(0, xp) / 12.5)) / 2);
}

/** How far a total XP is from the start of its level to the next, in [0, 1). */
export function levelProgress(xp: number): number {
  const current = level(xp);
  const from = xpForLevel(current);
  return (Math.max(0, xp) - from) / (xpForLevel(current + 1) - from);
}
