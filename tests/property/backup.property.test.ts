import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '../../schemas/events.ts';
import { derive, snapshotOf } from '../../src/engine/replay.ts';
import { makeBackup, mergeEvents, parseBackup } from '../../src/store/backup.ts';
import { eventLogArb } from './arbitraries.ts';

const META = { appVersion: '0.2.0', contentVersion: 'c-3f9a1e', now: new Date(Date.UTC(2026, 9, 9, 8)) };

/** Splits one log with unique ids into up to three overlapping parts. */
const partsArb = eventLogArb.chain((log) =>
  fc.tuple(fc.constant(log), fc.subarray(log), fc.subarray(log), fc.subarray(log)),
);

const ids = (events: readonly StudyEvent[]) => events.map((e) => e.id);

describe('mergeEvents', () => {
  it('is idempotent', () => {
    fc.assert(
      fc.property(partsArb, ([, a, b]) => {
        expect(mergeEvents(a, a)).toEqual(mergeEvents(a, []));
        expect(mergeEvents(mergeEvents(a, b), b)).toEqual(mergeEvents(a, b));
      }),
    );
  });

  it('is commutative on sets with unique ids', () => {
    fc.assert(
      fc.property(partsArb, ([, a, b]) => {
        expect(mergeEvents(a, b)).toEqual(mergeEvents(b, a));
      }),
    );
  });

  it('is associative', () => {
    fc.assert(
      fc.property(partsArb, ([, a, b, c]) => {
        expect(mergeEvents(mergeEvents(a, b), c)).toEqual(mergeEvents(a, mergeEvents(b, c)));
      }),
    );
  });

  it('holds every id of both sides, sorted', () => {
    fc.assert(
      fc.property(partsArb, ([, a, b]) => {
        const merged = ids(mergeEvents(a, b));
        expect(merged).toEqual([...new Set([...ids(a), ...ids(b)])].sort());
      }),
    );
  });
});

describe('export then import', () => {
  it('derives the same state', async () => {
    await fc.assert(
      fc.asyncProperty(eventLogArb, async (log) => {
        const result = await parseBackup(JSON.stringify(makeBackup(log, {}, META)));
        if (!result.ok) throw new Error(result.error);
        expect(snapshotOf(derive(result.data.events, null))).toEqual(snapshotOf(derive(log, null)));
      }),
    );
  });
});
