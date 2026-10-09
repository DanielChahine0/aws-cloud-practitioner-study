import fc from 'fast-check';
import type { StudyEvent } from '../../schemas/events.ts';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const SIDS = ['01JA00000000000000000000S1', '01JA00000000000000000000S2', '01JA00000000000000000000S3'];
const QIDS = ['q-aaaaaa', 'q-bbbbbb', 'q-cccccc'];
const NOTES = ['m01/a', 'm01/b', 'm09/gone'];
const CONCEPTS = ['shared-kitchen', 'per-minute-rental'];

/** A schema-valid ULID. */
export const ulidArb = fc
  .array(fc.constantFrom(...CROCKFORD), { minLength: 16, maxLength: 16 })
  .map((chars) => `01JA000000${chars.join('')}`);

const baseArb = fc.record({
  at: fc
    .integer({ min: Date.UTC(2026, 8, 1), max: Date.UTC(2026, 10, 14) })
    .map((t) => new Date(t).toISOString()),
  tz: fc.integer({ min: -720, max: 840 }),
  day: fc.constantFrom('2026-10-09', '2026-10-10'),
});

const bodyArb: fc.Arbitrary<Record<string, unknown>> = fc.oneof(
  fc.record({
    t: fc.constant('answer'),
    sid: fc.constantFrom(...SIDS),
    mode: fc.constantFrom('check', 'quiz'),
    qid: fc.constantFrom(...QIDS),
    qv: fc.constant(1),
    concept: fc.constantFrom(...CONCEPTS),
    picked: fc.constantFrom(['a'], ['b', 'c']),
    correct: fc.boolean(),
    sure: fc.boolean(),
    ms: fc.nat(60_000),
  }),
  fc.record({
    t: fc.constant('session'),
    sid: fc.constantFrom(...SIDS),
    mode: fc.constantFrom('check', 'quiz'),
    phase: fc.constantFrom('start', 'submit', 'abandon'),
    seed: fc.nat(),
    scope: fc.constantFrom('m01/a', 'm01'),
    qids: fc.subarray(QIDS),
  }),
  fc.record({ t: fc.constant('lesson.done'), note: fc.constantFrom(...NOTES) }),
  fc.record({
    t: fc.constant('flag'),
    qid: fc.constantFrom(...QIDS),
    qv: fc.constant(1),
    reason: fc.constantFrom('typo', 'ambiguous'),
  }),
);

/** One schema-valid event with a random ULID. */
export const eventArb: fc.Arbitrary<StudyEvent> = fc
  .tuple(ulidArb, baseArb, bodyArb)
  .map(([id, base, body]) => ({ id, ...base, ...body }) as StudyEvent);

/** A log of schema-valid events with unique ids. */
export const eventLogArb: fc.Arbitrary<StudyEvent[]> = fc.uniqueArray(eventArb, {
  selector: (e) => e.id,
  maxLength: 30,
});
