import { addDays } from './day.ts';

/**
 * The streak (spec 3.5), derived from the qualifying study days.
 * Every 7th day of a streak earns a freeze, up to 2 banked, and a missed day spends one automatically,
 * so it neither breaks nor extends the streak. Streaks pay no XP.
 */
export const FREEZE_EVERY = 7;
export const FREEZE_CAP = 2;

export interface StreakState {
  current: number;
  longest: number;
  freezes: number;
  /** Missed days a freeze covered, oldest first. */
  frozenDays: readonly string[];
}

/** Walks from the earliest qualifying day to `today`; today counts when it qualifies and is never missed. */
export function streakOf(qualifying: ReadonlySet<string>, today: string): StreakState {
  const days = [...qualifying].filter((d) => d <= today).sort();
  const first = days[0];
  const state = { current: 0, longest: 0, freezes: 0, frozenDays: [] as string[] };
  if (first === undefined) return state;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    if (qualifying.has(day)) {
      state.current++;
      state.longest = Math.max(state.longest, state.current);
      if (state.current % FREEZE_EVERY === 0 && state.freezes < FREEZE_CAP) state.freezes++;
    } else if (day !== today) {
      if (state.current > 0 && state.freezes > 0) {
        state.freezes--;
        state.frozenDays.push(day);
      } else {
        state.current = 0;
      }
    }
  }
  return state;
}
