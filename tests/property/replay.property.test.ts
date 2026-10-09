import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '../../schemas/events.ts';
import { type ContentRefs, derive, snapshotOf } from '../../src/engine/replay.ts';
import { eventLogArb } from './arbitraries.ts';

const REFS: ContentRefs = { questions: new Map([['q-aaaaaa', 1]]), notes: new Set(['m01/a']) };

describe('derive', () => {
  it('is the same for any order of the same events', () => {
    fc.assert(
      fc.property(
        eventLogArb.chain((events) =>
          fc.tuple(fc.constant(events), fc.shuffledSubarray(events, { minLength: events.length })),
        ),
        ([events, shuffled]) => {
          expect(snapshotOf(derive(shuffled, REFS))).toEqual(snapshotOf(derive(events, REFS)));
        },
      ),
    );
  });

  it('never throws on arbitrary ids, sessions and orders', () => {
    const loose = fc.record({
      t: fc.constantFrom('answer', 'session', 'lesson.done', 'flag'),
      sid: fc.string(),
      qid: fc.string(),
      note: fc.string(),
      concept: fc.string(),
      phase: fc.constantFrom('start', 'submit', 'abandon'),
      mode: fc.constantFrom('check', 'quiz'),
      correct: fc.boolean(),
      id: fc.string(),
      at: fc.string(),
    });
    fc.assert(
      fc.property(fc.array(loose, { maxLength: 40 }), (items) => {
        const events = items.map((item) => ({ ...item, qv: 1, seed: 0, picked: [], sure: false, ms: 0 }));
        expect(() => derive(events as unknown as StudyEvent[], REFS)).not.toThrow();
        expect(() => derive(events as unknown as StudyEvent[], null)).not.toThrow();
      }),
    );
  });
});
