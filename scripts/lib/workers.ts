import { availableParallelism, loadavg } from 'node:os';

/**
 * How many test workers to start: the cores that other work leaves idle, at most all but one and at least one.
 * Parallel worktree builds share one machine, and each test run that starts a worker per core oversubscribes it,
 * so every run slows down and the machine swaps; on an idle machine this is the usual all-but-one.
 */
export function workersFor({
  cores,
  load,
  cap = cores - 1,
}: {
  cores: number;
  load: number;
  cap?: number;
}): number {
  return Math.max(1, Math.min(cap, cores - 1, cores - Math.round(load)));
}

/** `workersFor` on this machine now, from its core count and one-minute load average. */
export const workersNow = (cap?: number): number =>
  workersFor({
    cores: availableParallelism(),
    load: loadavg()[0] ?? 0,
    ...(cap === undefined ? {} : { cap }),
  });
