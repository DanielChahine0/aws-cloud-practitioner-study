import { signal } from '@preact/signals';

/** How often the clock ticks; due counts and "Done for today" move on the minute. */
export const CLOCK_MS = 60_000;

/** The current moment, for everything that depends on time: the queue, the streak, mastery and Next. */
export const now = signal(new Date());

/** Ticks `now` every minute and whenever the page becomes visible again; returns the cleanup. */
export function startClock(): () => void {
  const tick = (): void => {
    now.value = new Date();
  };
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') tick();
  };
  const timer = setInterval(tick, CLOCK_MS);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
