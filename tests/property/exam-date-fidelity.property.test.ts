import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '../../schemas/events.ts';
import { DAY_MS } from '../../src/engine/day.ts';
import { deriveMemory, type MemoryState } from '../../src/engine/memory.ts';
import { reviewQueue } from '../../src/engine/queue.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { timelineOf } from '../fixtures/events.ts';
import { EXAM_DATE_CONTENT, examDateLogArb } from '../fixtures/exam-date-logs.ts';
import { HEAVY_TIMEOUT_MS } from '../fixtures/timeouts.ts';

/**
 * Exam date fidelity (spec 3.6): the current exam date decides every current due as if it had been set before the
 * first answer, while past days keep what the date in force judged, whatever the number and order of changes.
 */
const CONTENT = EXAM_DATE_CONTENT;
const RUNS = { seed: 20_261_010, numRuns: 200 };

type Settings = Extract<StudyEvent, { t: 'settings' }>;
const isSettings = (e: StudyEvent): e is Settings => e.t === 'settings';

/**
 * The same log with the final exam date set before the first event, and every settings event setting that date
 * again, which changes nothing but still opens its study day as the original did.
 */
const underFinalDate = (events: readonly StudyEvent[]): StudyEvent[] => {
  const examDate = events.filter(isSettings).at(-1)?.patch.examDate ?? null;
  const first = events[0];
  const rest = events.map((e): StudyEvent => (isSettings(e) ? { ...e, patch: { examDate } } : e));
  if (examDate === null || first === undefined) return rest;
  const { at, tz, day } = first;
  return [{ t: 'settings', id: '00000000000000000000000000', at, tz, day, patch: { examDate } }, ...rest];
};

/** What the queue and Next read of each concept: its schedule and the date-free marks. */
const scheduleOf = (m: MemoryState) =>
  toPlain(
    new Map(
      [...m.concepts].map(([id, c]) => [
        id,
        {
          card: c.card,
          enteredOn: c.enteredOn,
          fsrsDay: c.fsrsDay,
          fsrsRating: c.fsrsRating,
          extraAgainDay: c.extraAgainDay,
          lastAnswerDay: c.lastAnswerDay,
          misconception: c.misconception,
        },
      ]),
    ),
  );

/** The review queue at `now`, without the new-concept count, which is history judged by the date in force. */
const queueOf = (m: MemoryState, now: Date) => {
  const { newToday: _, lessonsAllowed: __, ...queue } = reviewQueue(m, CONTENT, now, 0);
  return queue;
};

/** The history of every study day before `day`. */
const pastOf = (m: MemoryState, day: string) => ({
  xpByDay: [...m.xpByDay].filter(([d]) => d < day).sort(),
  newByDay: [...m.newByDay].filter(([d]) => d < day).sort(),
  qualifying: [...m.qualifyingDays].filter((d) => d < day).sort(),
  badges: toPlain(new Map([...m.badges].filter(([, b]) => b.day < day))),
  plans: toPlain(new Map([...m.catchUpPlans].filter(([d]) => d < day))),
});

describe('exam date fidelity', { timeout: HEAVY_TIMEOUT_MS }, () => {
  it('schedules every card as a replay with the final exam date from the start does', () => {
    fc.assert(
      fc.property(examDateLogArb, (items) => {
        const events = timelineOf(items);
        const m = deriveMemory(events, CONTENT);
        const f = deriveMemory(underFinalDate(events), CONTENT);
        expect(scheduleOf(m)).toEqual(scheduleOf(f));
        expect(m.examDate).toBe(events.filter(isSettings).at(-1)?.patch.examDate ?? null);
        const lastChange = events.filter(isSettings).at(-1)?.day ?? '';
        const plansFrom = (s: MemoryState) =>
          toPlain(new Map([...s.catchUpPlans].filter(([d]) => d >= lastChange)));
        expect(plansFrom(m)).toEqual(plansFrom(f));
        const end = events.at(-1);
        if (end === undefined) return;
        for (const later of [0, 1, 7]) {
          const now = new Date(Date.parse(end.at) + later * DAY_MS);
          expect(queueOf(m, now)).toEqual(queueOf(f, now));
        }
      }),
      RUNS,
    );
  });

  it('keeps the XP, qualifying days, badges and catch-up plans of the days before each change', () => {
    fc.assert(
      fc.property(examDateLogArb, (items) => {
        const events = timelineOf(items);
        const m = deriveMemory(events, CONTENT);
        for (const [index, e] of events.entries()) {
          if (!isSettings(e)) continue;
          const before = deriveMemory(events.slice(0, index), CONTENT);
          expect(pastOf(m, e.day)).toEqual(pastOf(before, e.day));
        }
      }),
      RUNS,
    );
  });
});
