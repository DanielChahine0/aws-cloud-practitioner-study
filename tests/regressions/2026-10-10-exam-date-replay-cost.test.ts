import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '../../schemas/events.ts';
import { addDays } from '../../src/engine/day.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { timelineOf } from '../fixtures/events.ts';
import { GRIND_DAYS, GRIND_START, grindLog, type Item, timeOf } from '../fixtures/grind-log.ts';
import { JOURNEY_CONTENT } from '../fixtures/journeys/content.ts';
import { HEAVY_TIMEOUT_MS } from '../fixtures/timeouts.ts';

/**
 * Replay re-ran the whole log so far at every exam date change, to take the schedule the new date gives, so a
 * full replay grew with the number of changes: on a 15,000-event log 3 changes took over twice and 20 changes
 * ten to twenty times as long as none, far over the 100 ms budget of spec 8.1, on the main thread at every answer.
 * The bound is relative to the same log with no change, so a slower machine does not flake, and a measurement
 * that misses it is taken again up to `ATTEMPTS` times, so a burst of load from other test files does not either;
 * the old cost missed it by far more than any noise.
 */
const RUNS = 5;
const ATTEMPTS = 3;

/** The log with an exam date settings event early on each of `days`, every fourth one clearing the date. */
const withChanges = (days: readonly number[]): StudyEvent[] => {
  const settings = days.map(
    (day, i): Item => [
      timeOf(day, 2),
      {
        t: 'settings',
        patch: { examDate: i % 4 === 3 ? null : addDays(GRIND_START, day + 14 + (i % 5) * 9) },
      },
    ],
  );
  const items = [...grindLog(), ...settings].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return timelineOf(items);
};

const spread = (count: number): number[] =>
  Array.from({ length: count }, (_, i) => Math.floor(((i + 1) * GRIND_DAYS) / (count + 1)));

/**
 * The fastest of `RUNS` replays of each log, run in turns after one warm-up each.
 * Load from parallel builds only ever adds time, and it swung the median of the same log several times over
 * between runs, so the fastest replay is the measure closest to the replay's own cost.
 */
const fastestMs = (logs: readonly (readonly StudyEvent[])[]): number[] => {
  const times = logs.map((): number[] => []);
  for (const events of logs) deriveMemory(events, JOURNEY_CONTENT);
  for (let run = 0; run < RUNS; run++) {
    for (const [i, events] of logs.entries()) {
      const started = performance.now();
      deriveMemory(events, JOURNEY_CONTENT);
      times[i]?.push(performance.now() - started);
    }
  }
  return times.map((t) => Math.min(...t));
};

describe('replay cost stays flat as the exam date changes', { timeout: HEAVY_TIMEOUT_MS }, () => {
  it('replays a 15,000-event log with 3 or 20 exam date changes about as fast as with none', () => {
    const cases: [string, StudyEvent[]][] = [
      ['0 changes', timelineOf(grindLog())],
      ['3 spread', withChanges(spread(3))],
      ['20 spread', withChanges(spread(20))],
      ['20 near the end', withChanges(Array.from({ length: 20 }, (_, i) => GRIND_DAYS - 20 + i))],
    ];
    const within = (fastest: readonly number[]) =>
      fastest.slice(1).every((ms) => ms <= 1.5 * (fastest[0] ?? 0) + 15);
    const measure = (): number[] => {
      const fastest = fastestMs(cases.map(([, events]) => events));
      const line = cases.map(([name], i) => `${name} ${(fastest[i] ?? 0).toFixed(1)} ms`).join(', ');
      console.info(`deriveMemory fastest of ${RUNS}: ${line}`);
      return fastest;
    };
    let fastest = measure();
    for (let attempt = 1; attempt < ATTEMPTS && !within(fastest); attempt++) fastest = measure();
    expect(fastest).toHaveLength(cases.length);
    const base = fastest[0] ?? 0;
    for (const ms of fastest.slice(1)) expect(ms).toBeLessThanOrEqual(1.5 * base + 15);
  });
});
