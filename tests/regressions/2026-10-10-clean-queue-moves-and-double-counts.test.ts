import { describe, expect, it } from 'vitest';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { addDays } from '../../src/engine/day.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf, startOf, submitOf } from '../fixtures/memory.ts';

/**
 * Clean Queue was granted on the last event of the open day, so every later event that day moved its
 * `eventId`, and it counted clean days with a counter, so a study day revisited after a timezone change
 * counted twice toward the 7 distinct days of spec 3.10.
 */
type Log = (readonly [string, NewEvent])[];

const TEN = Array.from({ length: 10 }, (_, i) => `c-${String(i + 1).padStart(2, '0')}`);
const BASIC = contentOf(TEN.map((id) => ({ id, module: 1 })));

const reviews = (day: string, hour: number, tag: string, sid = SID): Log =>
  TEN.map(
    (c, i) =>
      [
        at(day, hour, i),
        answerOf({ concept: c, correct: true, sure: true, mode: 'review', qid: `q-${c}-${tag}`, sid }),
      ] as const,
  );

const sixDays = Array.from({ length: 6 }, (_, i) => addDays('2026-10-01', i)).flatMap((d) =>
  reviews(d, 18, d),
);

describe('Clean Queue keeps its event and counts distinct study days', () => {
  it('keeps the crossing event when more events follow on the same day', () => {
    const first: Log = [
      [at('2026-10-07', 17, 59), startOf(SID, 'review', [])],
      ...reviews('2026-10-07', 18, 's1', SID),
      [at('2026-10-07', 18, 30), submitOf(SID, 'review')],
    ];
    const second: Log = [
      [at('2026-10-07', 20), startOf(SID2, 'review', [])],
      [
        at('2026-10-07', 20, 1),
        answerOf({ concept: 'c-01', correct: true, sure: true, mode: 'review', qid: 'q-c-01-s2', sid: SID2 }),
      ],
      [at('2026-10-07', 20, 2), submitOf(SID2, 'review')],
    ];
    const events = timelineOf([...sixDays, ...first, ...second]);
    const tenth = events[sixDays.length + 10] as StudyEvent;
    const afterFirst = deriveMemory(events.slice(0, sixDays.length + first.length), BASIC);
    const afterSecond = deriveMemory(events, BASIC);
    expect(afterFirst.badges.get('clean-queue')).toEqual({ day: '2026-10-07', eventId: tenth.id });
    expect(afterSecond.badges.get('clean-queue')).toEqual({ day: '2026-10-07', eventId: tenth.id });
  });

  it('never counts one study day twice when a timezone change sends the day backwards', () => {
    // 2026-10-07T05:00Z is 2026-10-07 at offset 0, and 2026-10-07T06:00Z is 03:00 at offset -180, so 2026-10-06 again.
    const forward = timelineOf([...sixDays, [at('2026-10-07', 5), { t: 'lesson.done', note: 'm01/a' }]]);
    const back = timelineOf(reviews('2026-10-07', 6, 'back'), -180);
    expect(back.every((e) => e.day === '2026-10-06')).toBe(true);
    const m = deriveMemory([...forward, ...back], BASIC);
    expect(m.badges.get('clean-queue')).toBeUndefined();
  });
});
