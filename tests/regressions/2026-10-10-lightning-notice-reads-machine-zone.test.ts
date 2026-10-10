import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { paidToday } from '../../src/app/lightning.ts';
import { derive } from '../../src/engine/replay.ts';
import { SID, timelineOf } from '../fixtures/events.ts';
import { lightningStartOf } from '../fixtures/memory.ts';

// The "Only the first round each day pays XP." notice re-read each round's start in the machine's current zone,
// while the replay pays by the study day stamped on the start event. After a flight the two disagreed, so the notice
// hid for a round that paid nothing, or showed for one that paid in full (spec 3.2).

let zone: string | undefined;
beforeEach(() => {
  zone = process.env.TZ;
  process.env.TZ = 'America/New_York';
});
afterEach(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

/** A round started at 04:30 in Paris (UTC+2 in October) on 2026-10-12, which is 22:30 on 2026-10-11 in New York. */
const PARIS = 120;
const round = timelineOf(
  [['2026-10-12T02:30:00.000Z', lightningStartOf(SID, ['q-a'], '2026-10-12T02:32:00.000Z')]],
  PARIS,
);

describe('paidToday after a change of zone', () => {
  it('follows the study day stamped on the round, as the replay pays', () => {
    expect(round[0]?.day).toBe('2026-10-12');
    const p = derive(round, null);
    expect(paidToday(p, '2026-10-12')).toBe(true);
    expect(paidToday(p, '2026-10-11')).toBe(false);
  });
});
