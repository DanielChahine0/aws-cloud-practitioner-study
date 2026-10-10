/** The study day starts at 04:00 local time, so a late-night session counts for the day before. */
export const DAY_START_HOUR = 4;

/** One day in milliseconds; study-day arithmetic runs on UTC dates, which have no DST. */
export const DAY_MS = 86_400_000;

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** The local study day of a moment, as `YYYY-MM-DD`. */
export function studyDay(at: Date): string {
  const day = new Date(at.getTime());
  if (day.getHours() < DAY_START_HOUR) day.setDate(day.getDate() - 1);
  return `${pad(day.getFullYear(), 4)}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/** The local offset from UTC in minutes, east positive. */
export function tzOffset(at: Date): number {
  return 0 - at.getTimezoneOffset();
}

/** `YYYY-MM-DD` of a UTC millisecond count. */
function utcDay(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Midnight UTC of a `YYYY-MM-DD` day, in milliseconds. */
function utcMidnight(day: string): number {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

/**
 * The study day of a moment in a given offset (minutes east), whatever zone runs the code.
 * Replay reads each event's stamped offset through this, so a log replays the same everywhere.
 */
export function studyDayAt(at: Date, tz: number): string {
  return utcDay(at.getTime() + tz * MINUTE_MS - DAY_START_HOUR * HOUR_MS);
}

/** The moment a study day starts (04:00) in a given offset. */
export function dayStartAt(day: string, tz: number): Date {
  return new Date(utcMidnight(day) + DAY_START_HOUR * HOUR_MS - tz * MINUTE_MS);
}

/** The study day `n` days after `day` (before it for a negative `n`). */
export function addDays(day: string, n: number): string {
  return utcDay(utcMidnight(day) + n * DAY_MS);
}

/** Whole days from `from` to `to`; negative when `to` comes first. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / DAY_MS);
}

/**
 * The 04:00 that ends the study day holding `at`, in a given offset: `dayStartAt` of the day after `studyDayAt`,
 * worked out in whole UTC days without day strings, since replay asks it for every due check.
 */
export function nextDayStart(at: Date, tz: number): Date {
  const shift = tz * MINUTE_MS - DAY_START_HOUR * HOUR_MS;
  return new Date((Math.floor((at.getTime() + shift) / DAY_MS) + 1) * DAY_MS - shift);
}
