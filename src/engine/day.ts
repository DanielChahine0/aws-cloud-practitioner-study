/** The study day starts at 04:00 local time, so a late-night session counts for the day before. */
export const DAY_START_HOUR = 4;

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
