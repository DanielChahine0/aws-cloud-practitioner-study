import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { DAY_MS } from '../../src/engine/day.ts';
import {
  BAND_LABEL,
  conceptMastery,
  HORIZON_DAYS,
  hexBand,
  moduleMastery,
  successGate,
} from '../../src/engine/mastery.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { recall } from '../../src/engine/srs.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf } from '../fixtures/memory.ts';

const CONTENT = contentOf([
  { id: 'oven', module: 1 },
  { id: 'proofing', module: 2 },
  { id: 'crust', module: 2 },
  { id: 'menu', module: 2, tested: false },
  { id: 'flour', module: 3 },
]);
const good = (qid: string): NewEvent => answerOf({ concept: 'oven', qid, correct: true, sure: true });
const masteryAfter = (log: readonly (readonly [string, NewEvent])[], now: string) =>
  moduleMastery(deriveMemory(timelineOf(log), CONTENT), CONTENT, new Date(now));

describe('successGate and conceptMastery', () => {
  it('gates recall by success on two study days', () => {
    expect(HORIZON_DAYS).toBe(7);
    expect(successGate(undefined)).toBe(0);
    const memory = deriveMemory(timelineOf([[at('2026-10-10'), good('q-oven-1')]]), CONTENT);
    const cm = memory.concepts.get('oven');
    expect(successGate(cm)).toBe(0.5);
    const card = cm?.card;
    if (!card) throw new Error('oven has no card');
    const ahead = new Date(Date.parse(at('2026-10-17')));
    expect(conceptMastery(cm, ahead)).toBeCloseTo(recall(card, ahead) * 0.5, 12);
    expect(conceptMastery(undefined, ahead)).toBe(0);
  });
});

describe('moduleMastery', () => {
  it('gives 40 for one Good answer today: recall a week out of about 0.808, halved', () => {
    const mastery = masteryAfter([[at('2026-10-10'), good('q-oven-1')]], at('2026-10-10'));
    expect(mastery.get(1)).toBe(40);
  });

  it('gives 94 right after a second Good on the due day', () => {
    const mastery = masteryAfter(
      [
        [at('2026-10-10'), good('q-oven-1')],
        [at('2026-10-13'), good('q-oven-2')],
      ],
      at('2026-10-13'),
    );
    expect(mastery.get(1)).toBe(94);
  });

  it('gives 90 for a Hard, then a Good on the due day', () => {
    const mastery = masteryAfter(
      [
        [at('2026-10-10'), answerOf({ concept: 'oven', correct: true, sure: false })],
        [at('2026-10-12'), good('q-oven-2')],
      ],
      at('2026-10-12'),
    );
    expect(mastery.get(1)).toBe(90);
  });

  it('averages over the tested concepts only and gives 0 with no answers', () => {
    const mastery = masteryAfter(
      [[at('2026-10-10'), answerOf({ concept: 'proofing', correct: true, sure: true })]],
      at('2026-10-10'),
    );
    expect(mastery.get(2)).toBe(20);
    expect(mastery.get(1)).toBe(0);
    expect(mastery.get(3)).toBe(0);
    expect([...mastery.keys()]).toEqual([1, 2, 3]);
  });

  it('is never higher a day later with no new event', () => {
    const log = [
      [at('2026-10-10'), good('q-oven-1')],
      [at('2026-10-13'), good('q-oven-2')],
      [at('2026-10-13', 11), answerOf({ concept: 'crust', correct: false, sure: false })],
    ] as const;
    const memory = deriveMemory(timelineOf(log), CONTENT);
    let previous = moduleMastery(memory, CONTENT, new Date(at('2026-10-13', 12)));
    for (let day = 1; day <= 60; day++) {
      const now = new Date(Date.parse(at('2026-10-13', 12)) + day * DAY_MS);
      const mastery = moduleMastery(memory, CONTENT, now);
      for (const [module, value] of mastery) expect(value).toBeLessThanOrEqual(previous.get(module) ?? 0);
      previous = mastery;
    }
  });
});

describe('hexBand', () => {
  it('maps mastery to the bands of spec 3.8, with the top band only after a boss', () => {
    const cases: [number, string, string][] = [
      [0, 'outline', 'outline'],
      [19, 'outline', 'outline'],
      [20, 'faint', 'faint'],
      [39, 'faint', 'faint'],
      [40, 'light', 'light'],
      [59, 'light', 'light'],
      [60, 'solid', 'solid'],
      [79, 'solid', 'solid'],
      [80, 'solid', 'mastered'],
      [100, 'solid', 'mastered'],
    ];
    for (const [mastery, without, withBoss] of cases) {
      expect(hexBand(mastery, false)).toBe(without);
      expect(hexBand(mastery, true)).toBe(withBoss);
    }
  });

  it('labels each band in words', () => {
    expect(BAND_LABEL).toEqual({
      outline: 'not started',
      faint: 'started',
      light: 'learning',
      solid: 'solid',
      mastered: 'mastered',
    });
  });
});
