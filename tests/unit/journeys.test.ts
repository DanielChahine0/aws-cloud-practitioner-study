import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '../../schemas/events.ts';
import { dayStartAt, studyDayAt } from '../../src/engine/day.ts';
import { moduleMastery } from '../../src/engine/mastery.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { reviewQueue } from '../../src/engine/queue.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { streakOf } from '../../src/engine/streak.ts';
import { JOURNEY_CONTENT, type JourneyName, journeyNow } from '../fixtures/journeys/content.ts';
import { comebackTenDays, examCrunch, firstWeek } from '../fixtures/journeys/journeys.ts';

/**
 * Golden journeys (spec 9): each builder's log is committed as `<name>.jsonl`, and its replay at `journeyNow`
 * as `<name>.snapshot.json`; a missing file is written once by this test, then committed.
 */
const dir = fileURLToPath(new URL('../fixtures/journeys/', import.meta.url));

const JOURNEYS: Record<JourneyName, () => StudyEvent[]> = {
  'first-week': firstWeek,
  'exam-crunch': examCrunch,
  'comeback-10-days': comebackTenDays,
};

function replay(name: JourneyName) {
  const now = journeyNow(name);
  const events = JOURNEYS[name]();
  const memory = deriveMemory(events, JOURNEY_CONTENT);
  return {
    events,
    memory,
    streak: streakOf(memory.qualifyingDays, studyDayAt(now, 0)),
    queue: reviewQueue(memory, JOURNEY_CONTENT, now, 0),
    mastery: moduleMastery(memory, JOURNEY_CONTENT, now),
  };
}

/** Compares `actual` with a committed file, writing the file first when it is missing. */
function golden(file: string, actual: string): void {
  const path = join(dir, file);
  if (!existsSync(path)) writeFileSync(path, actual);
  expect(actual).toBe(readFileSync(path, 'utf8'));
}

describe('golden journeys', () => {
  for (const name of Object.keys(JOURNEYS) as JourneyName[]) {
    it(`${name} replays to its committed log and snapshot`, () => {
      const { events, memory, streak, queue, mastery } = replay(name);
      golden(`${name}.jsonl`, `${events.map((e) => JSON.stringify(e)).join('\n')}\n`);
      golden(
        `${name}.snapshot.json`,
        `${JSON.stringify(toPlain({ memory, streak, queue, mastery }), null, 2)}\n`,
      );
    });
  }

  it('first-week ends with a 7-day streak and one freeze', () => {
    const { streak, memory } = replay('first-week');
    expect(streak).toEqual({ current: 7, longest: 7, freezes: 1, frozenDays: [] });
    expect(memory.concepts.get('bake-01-03')?.misconception).toBeNull();
    expect(memory.xp).toBeGreaterThan(0);
  });

  it('exam-crunch leaves no concept due after November 13', () => {
    const { memory } = replay('exam-crunch');
    expect(memory.examDate).toBe('2026-11-14');
    const examDay = dayStartAt('2026-11-14', 0).getTime();
    const cards = [...memory.concepts.values()].flatMap((cm) => (cm.card ? [cm.card] : []));
    expect(cards).toHaveLength(40);
    for (const card of cards) expect(Date.parse(card.due)).toBeLessThan(examDay);
  });

  it('exam-crunch counts its boss and mock days in examsDone', () => {
    const { memory, events } = replay('exam-crunch');
    expect([...memory.examsDone]).toEqual(['2026-11-05', '2026-11-08']);
    expect(memory.qualifyingDays.has('2026-11-05')).toBe(true);
    const submits = events.filter(
      (e) => e.t === 'session' && e.phase === 'submit' && (e.mode === 'boss' || e.mode === 'mock'),
    );
    expect(submits.map((e) => memory.xpByEvent.get(e.id))).toEqual([100, 150]);
  });

  it('comeback-10-days opens a catch-up with the streak reset and the longest kept', () => {
    const { queue, streak, memory } = replay('comeback-10-days');
    expect(memory.concepts.size).toBe(120);
    expect(queue.catchUp).toBe(true);
    expect(queue.due).toBeGreaterThan(100);
    expect(queue.items.length).toBeLessThanOrEqual(60);
    expect(queue.lessonsAllowed).toBe(false);
    expect(memory.catchUpPlans.get('2026-10-27')).toHaveLength(60);
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(5);
  });
});
