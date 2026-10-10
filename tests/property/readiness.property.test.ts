import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { DOMAIN_IDS } from '../../schemas/ids.ts';
import { addDays } from '../../src/engine/day.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { firstAttempts, mockDeadline } from '../../src/engine/mock.ts';
import { type Readiness, readiness } from '../../src/engine/readiness.ts';
import { derive } from '../../src/engine/replay.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, contentOf, examStartOf, submitOf } from '../fixtures/memory.ts';

/** Readiness over any log (spec 9): Memory and every Q_d never rise with time alone, and every value stays in [0, 1]. */
const SIZE = 44;
const CONTENT = contentOf([
  ...Array.from({ length: SIZE }, (_, i) => ({
    id: `bun-${i}`,
    module: 1 + (i % 13),
    tasks: [`${1 + (i % 4)}.${1 + (i % 3)}`],
  })),
  { id: 'menu', module: 2, tested: false, tasks: [] },
]);
const CONCEPTS = [...Array.from({ length: SIZE }, (_, i) => `bun-${i}`), 'menu', 'ghost'];
const START = '2026-10-01';

type Item = readonly [string, NewEvent];

/** An ISO time `minute` minutes after 04:00 UTC on day `n` from the start, so it stays in that study day. */
const timeOf = (n: number, minute: number): string =>
  new Date(Date.parse(`${addDays(START, n)}T04:00:00.000Z`) + minute * 60_000).toISOString();

const answerArb: fc.Arbitrary<Item[]> = fc
  .record({
    day: fc.integer({ min: 0, max: 20 }),
    minute: fc.integer({ min: 0, max: 1_300 }),
    concept: fc.constantFrom(...CONCEPTS),
    mode: fc.constantFrom('check' as const, 'quiz' as const, 'review' as const, 'focus' as const),
    correct: fc.boolean(),
    sure: fc.boolean(),
  })
  .map(({ day, minute, concept, mode, correct, sure }) => [
    [timeOf(day, minute), answerOf({ concept, qid: `q-${concept}-1`, mode, correct, sure })],
  ]);

const settingsArb: fc.Arbitrary<Item[]> = fc
  .record({ day: fc.integer({ min: 0, max: 20 }), exam: fc.option(fc.integer({ min: 0, max: 40 })) })
  .map(({ day, exam }) => [
    [timeOf(day, 1_390), { t: 'settings', patch: { examDate: exam === null ? null : addDays(START, exam) } }],
  ]);

/** A submitted mock of form A, B or a remix over up to 6 concepts, its answers right or wrong. */
const mockArb = (sid: string): fc.Arbitrary<Item[]> =>
  fc
    .record({
      day: fc.integer({ min: 0, max: 20 }),
      form: fc.constantFrom('A', 'B', 'remix'),
      picks: fc.array(fc.record({ concept: fc.constantFrom(...CONCEPTS), correct: fc.boolean() }), {
        minLength: 1,
        maxLength: 6,
      }),
    })
    .map(({ day, form, picks }) => {
      const start = timeOf(day, 1_000);
      const qids = picks.map((_, i) => `q-${sid}-${i}`);
      return [
        [start, examStartOf(sid, 'mock', qids, { form, deadline: mockDeadline(new Date(start)) })],
        ...picks.map(
          ({ concept, correct }, i): Item => [
            timeOf(day, 1_001 + i),
            answerOf({ concept, qid: qids[i] ?? '', mode: 'mock', sid, correct, sure: true }),
          ],
        ),
        [timeOf(day, 1_010), submitOf(sid, 'mock')],
      ];
    });

/** Optionally 40 concepts answered right on day 0, so readiness often shows a number. */
const warmArb: fc.Arbitrary<Item[]> = fc
  .boolean()
  .map((warm) =>
    warm
      ? Array.from(
          { length: 40 },
          (_, i): Item => [
            timeOf(0, i),
            answerOf({ concept: `bun-${i}`, qid: `q-bun-${i}-1`, mode: 'check', correct: true, sure: true }),
          ],
        )
      : [],
  );

const logArb = (mocks: boolean): fc.Arbitrary<StudyEvent[]> =>
  fc
    .tuple(
      warmArb,
      fc.array(answerArb, { maxLength: 60 }),
      fc.array(settingsArb, { maxLength: 2 }),
      mocks
        ? fc.tuple(mockArb('01JA0000000000000000000MK1'), mockArb('01JA0000000000000000000MK2'))
        : fc.constant([] as Item[][]),
    )
    .map(([warm, answers, settings, mockBlocks]) =>
      timelineOf(
        [...warm, ...answers.flat(), ...settings.flat(), ...mockBlocks.flat()].sort((a, b) =>
          a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
        ),
      ),
    );

const gapArb = fc.integer({ min: 0, max: 60 * 24 * 40 });

function readAt(events: readonly StudyEvent[], minutesAfterLast: number): Readiness {
  const last = events.reduce((max, e) => (e.at > max ? e.at : max), timeOf(0, 0));
  return readiness({
    memory: deriveMemory(events, CONTENT),
    content: CONTENT,
    attempts: firstAttempts(derive(events, null)),
    now: new Date(Date.parse(last) + minutesAfterLast * 60_000),
    tz: 0,
  });
}

describe('readiness properties (spec 9)', () => {
  it('Memory and every Q_d never rise as time passes without a new event', () => {
    fc.assert(
      fc.property(logArb(true), gapArb, gapArb, (events, first, more) => {
        const before = readAt(events, first);
        const after = readAt(events, first + more);
        expect(after.memory).toBeLessThanOrEqual(before.memory + 1e-12);
        for (const d of DOMAIN_IDS) expect(after.domains[d]).toBeLessThanOrEqual(before.domains[d] + 1e-12);
      }),
      { numRuns: 150 },
    );
  });

  it('readiness never rises as time passes for a log with no mock submit', () => {
    fc.assert(
      fc.property(logArb(false), gapArb, gapArb, (events, first, more) => {
        const before = readAt(events, first);
        const after = readAt(events, first + more);
        expect(after.value === null).toBe(before.value === null);
        expect(after.value ?? 0).toBeLessThanOrEqual((before.value ?? 0) + 1e-12);
      }),
      { numRuns: 150 },
    );
  });

  it('stays within 0 and 1 for any log', () => {
    fc.assert(
      fc.property(logArb(true), gapArb, (events, gap) => {
        const r = readAt(events, gap);
        for (const x of [
          r.value ?? 0,
          r.memory,
          r.mock ?? 0,
          ...Object.values(r.domains),
          r.weakest?.value ?? 0,
        ]) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 150 },
    );
  });
});
