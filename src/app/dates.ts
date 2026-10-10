/**
 * The short date of lists and lines (`Oct 14`), read in UTC so a study day never shifts with the time zone.
 * The other style is `examDateLabel` (`Sat 14 Nov`) in home.ts; no third style exists.
 */
export function shortDate(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
