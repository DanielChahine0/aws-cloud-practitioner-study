/** The study day starts at 04:00 local time, so a late-night session still counts for the day before. */
export const DAY_START_HOUR = 4;

const pad = (n: number): string => String(n).padStart(2, '0');

/** The local study day of a moment, as YYYY-MM-DD. */
export function studyDay(at: Date): string {
  const d = new Date(at.getTime());
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The local offset from UTC in minutes, east positive. */
export function tzOffset(at: Date): number {
  return -at.getTimezoneOffset();
}
