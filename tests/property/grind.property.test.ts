import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Mode, NewEvent, StudyEvent } from '../../schemas/events.ts';
import { addDays, DAY_MS } from '../../src/engine/day.ts';
import { moduleMastery } from '../../src/engine/mastery.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { timelineOf } from '../fixtures/events.ts';
import { JOURNEY_CONTENT, variantId } from '../fixtures/journeys/content.ts';
import { answerOf, contentOf } from '../fixtures/memory.ts';

/** Grind invariance (spec 3.1 and 3.11): extra answers never pay or schedule twice, whatever the log. */
const CONTENT = contentOf([
  { id: 'oven', module: 1, aliases: ['old-oven'] },
  { id: 'proofing', module: 1 },
  { id: 'crust', module: 2 },
  { id: 'menu', module: 2, tested: false },
]);
const CONCEPTS = ['oven', 'proofing', 'crust', 'menu', 'old-oven', 'ghost'];
const MODES: Mode[] = ['check', 'quiz', 'review', 'lightning'];
const START = '2026-10-01';

type Item = readonly [string, NewEvent];

/** An ISO time `minute` minutes after 04:00 UTC on day `n` from the start, so it stays in that study day. */
const timeOf = (n: number, minute: number): string =>
  new Date(Date.parse(`${addDays(START, n)}T04:00:00.000Z`) + minute * 60_000).toISOString();

const itemArb = (days: { min: number; max: number }): fc.Arbitrary<Item> =>
  fc.oneof(
    {
      weight: 8,
      arbitrary: fc
        .record({
          day: fc.integer(days),
          minute: fc.integer({ min: 0, max: 1_400 }),
          concept: fc.constantFrom(...CONCEPTS),
          variant: fc.integer({ min: 1, max: 3 }),
          correct: fc.boolean(),
          sure: fc.boolean(),
          mode: fc.constantFrom(...MODES),
          relearn: fc.boolean(),
        })
        .map(
          (s): Item => [
            timeOf(s.day, s.minute),
            answerOf({
              concept: s.concept,
              qid: `q-${s.concept}-${s.variant}`,
              correct: s.correct,
              sure: s.sure,
              mode: s.mode,
              relearn: s.relearn,
            }),
          ],
        ),
    },
    {
      weight: 1,
      arbitrary: fc
        .record({ day: fc.integer(days), note: fc.constantFrom('m01/a', 'm02/b') })
        .map((s): Item => [timeOf(s.day, 600), { t: 'lesson.done', note: s.note }]),
    },
    {
      weight: 1,
      arbitrary: fc
        .record({ day: fc.integer(days), date: fc.constantFrom('2026-10-20', '2026-11-14', null) })
        .map((s): Item => [timeOf(s.day, 5), { t: 'settings', patch: { examDate: s.date } }]),
    },
  );

const sortItems = (items: readonly Item[]): Item[] =>
  [...items].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

/** A log of up to 40 events over the first 20 days. */
const historyArb = fc.array(itemArb({ min: 0, max: 19 }), { maxLength: 40 }).map(sortItems);

/** Answers to one concept on day 25, after any history: the first one, then `extra` more. */
const burstArb = (correct: boolean) =>
  fc
    .record({
      concept: fc.constantFrom('oven', 'proofing', 'crust'),
      firstSure: fc.boolean(),
      extra: fc.array(fc.record({ variant: fc.integer({ min: 1, max: 3 }), sure: fc.boolean() }), {
        minLength: 1,
        maxLength: 4,
      }),
    })
    .map(({ concept, firstSure, extra }) => {
      const first: Item = [
        timeOf(25, 60),
        answerOf({ concept, qid: `q-${concept}-1`, correct: true, sure: firstSure }),
      ];
      const more = extra.map(
        (e, i): Item => [
          timeOf(25, 120 + i),
          answerOf({ concept, qid: `q-${concept}-${e.variant}`, correct, sure: e.sure }),
        ],
      );
      return { concept, first, more };
    });

describe('grind invariance', () => {
  it('gives one to five right answers to a concept on one day the XP and card of the first alone', () => {
    fc.assert(
      fc.property(historyArb, burstArb(true), (history, { concept, first, more }) => {
        const once = deriveMemory(timelineOf([...history, first]), CONTENT);
        const many = deriveMemory(timelineOf([...history, first, ...more]), CONTENT);
        expect(many.xp).toBe(once.xp);
        expect(many.concepts.get(concept)?.card).toEqual(once.concepts.get(concept)?.card);
      }),
    );
  });

  it('gives any number of wrong answers after the first answer of a day the card of exactly one', () => {
    fc.assert(
      fc.property(historyArb, burstArb(false), (history, { concept, first, more }) => {
        const one = deriveMemory(timelineOf([...history, first, ...more.slice(0, 1)]), CONTENT);
        const all = deriveMemory(timelineOf([...history, first, ...more]), CONTENT);
        expect(all.concepts.get(concept)?.card).toEqual(one.concepts.get(concept)?.card);
        expect(all.xp).toBe(one.xp);
      }),
    );
  });

  it('derives the same state for any order of the same events', () => {
    fc.assert(
      fc.property(
        historyArb.chain((items) => {
          const events = timelineOf(items);
          return fc.tuple(fc.constant(events), fc.shuffledSubarray(events, { minLength: events.length }));
        }),
        ([events, shuffled]) => {
          expect(toPlain(deriveMemory(shuffled, CONTENT))).toEqual(toPlain(deriveMemory(events, CONTENT)));
        },
      ),
    );
  });

  it('never throws on unknown concept and question ids', () => {
    const looseArb = fc.array(
      fc.record({
        minute: fc.integer({ min: 0, max: 30 * 1_440 }),
        concept: fc.string(),
        qid: fc.string(),
        qv: fc.integer({ min: 1, max: 3 }),
        correct: fc.boolean(),
        sure: fc.boolean(),
        mode: fc.constantFrom(...MODES),
      }),
      { maxLength: 30 },
    );
    fc.assert(
      fc.property(looseArb, (steps) => {
        const items = sortItems(
          steps.map(
            (s): Item => [
              timeOf(0, s.minute),
              answerOf({
                concept: s.concept,
                qid: s.qid,
                qv: s.qv,
                correct: s.correct,
                sure: s.sure,
                mode: s.mode,
              }),
            ],
          ),
        );
        expect(() => deriveMemory(timelineOf(items), CONTENT)).not.toThrow();
        expect(() => deriveMemory(timelineOf(items), JOURNEY_CONTENT)).not.toThrow();
      }),
    );
  });

  it('never raises module mastery as time passes with no new event', () => {
    fc.assert(
      fc.property(
        historyArb,
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 1, max: 200 }),
        (items, start, wait) => {
          const memory = deriveMemory(timelineOf(items), CONTENT);
          const t0 = Date.parse(timeOf(20, 0)) + start * DAY_MS;
          const before = moduleMastery(memory, CONTENT, new Date(t0));
          const after = moduleMastery(memory, CONTENT, new Date(t0 + wait * DAY_MS));
          for (const [module, value] of after) expect(value).toBeLessThanOrEqual(before.get(module) ?? 0);
        },
      ),
    );
  });
});

describe('replay cost', () => {
  it('replays a 15,000-event log in under a second', () => {
    const concepts = [...JOURNEY_CONTENT.concepts.keys()];
    const items: Item[] = [];
    for (let day = 0; day < 100; day++) {
      for (let n = 0; n < 150; n++) {
        const concept = concepts[(day * 37 + n) % concepts.length] as string;
        items.push([
          timeOf(day, n * 5),
          answerOf({
            concept,
            qid: variantId(concept, n % 2 === 0 ? 'a' : 'b'),
            correct: (day + n) % 5 !== 0,
            sure: n % 3 !== 0,
            mode: n % 4 === 0 ? 'quiz' : 'review',
          }),
        ]);
      }
    }
    const events: StudyEvent[] = timelineOf(items);
    expect(events).toHaveLength(15_000);
    const started = performance.now();
    const memory = deriveMemory(events, JOURNEY_CONTENT);
    const elapsed = performance.now() - started;
    expect(memory.concepts.size).toBe(130);
    expect(elapsed).toBeLessThan(1_000);
  });
});
