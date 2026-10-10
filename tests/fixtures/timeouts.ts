/**
 * The timeout for suites that do seconds of real CPU work, such as replaying a 15,000-event log or searching for
 * mock forms: about a second each on an idle machine, but five to ten times that while parallel builds load it,
 * past the 30 s default in vitest.config.ts when a replay-cost run retries. Every other test keeps that default.
 */
export const HEAVY_TIMEOUT_MS = 60_000;
