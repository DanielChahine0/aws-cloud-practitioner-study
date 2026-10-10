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
 * Review then found three more gaps: replay capped every due by the latest exam date, so a later exam date
 * rewrote past days and revoked or granted the badge after the fact; the due check skipped a split concept
 * not yet answered, though its inherited card was due in the queue; and the review count reset whenever
 * the study day changed, so a day left and re-entered lost its earlier reviews.
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

describe('Clean Queue reads each day as it was, with every due card and all its reviews', () => {
  const ELEVEN = contentOf([...TEN, 'c-11'].map((id) => ({ id, module: 1 })));
  const sevenDays = Array.from({ length: 7 }, (_, i) => addDays('2026-10-01', i)).flatMap((d) =>
    reviews(d, 18, d),
  );
  // Three right answers put c-11 due on 2026-11-14, past an exam on 2026-10-08.
  const eleventh: Log = ['2026-09-01', '2026-09-04', '2026-09-18'].map(
    (d, i) =>
      [
        at(d, 17),
        answerOf({ concept: 'c-11', correct: true, sure: true, mode: 'check', qid: `q-11-${i}` }),
      ] as const,
  );
  const setExam = (examDate: string | null): NewEvent => ({ t: 'settings', patch: { examDate } });

  it('keeps the badge when a later exam date pulls an old card into past days', () => {
    const before = timelineOf([...eleventh, ...sevenDays]);
    const earned = deriveMemory(before, ELEVEN).badges.get('clean-queue');
    expect(earned).toEqual({ day: '2026-10-07', eventId: (before.at(-1) as StudyEvent).id });
    const after = deriveMemory(
      [...before, ...timelineOf([[at('2026-10-08', 9), setExam('2026-10-08')]])],
      ELEVEN,
    );
    expect(after.badges.get('clean-queue')).toEqual(earned);
    // The new date still caps the card from now on.
    expect(after.concepts.get('c-11')?.card?.due).toBe('2026-10-05T04:00:00.000Z');
  });

  it('never grants the badge on past days when a cleared exam date pushes an old card out', () => {
    const capped = timelineOf([[at('2026-08-31', 9), setExam('2026-10-08')], ...eleventh, ...sevenDays]);
    expect(deriveMemory(capped, ELEVEN).badges.get('clean-queue')).toBeUndefined();
    const cleared = [...capped, ...timelineOf([[at('2026-10-08', 9), setExam(null)]])];
    const m = deriveMemory(cleared, ELEVEN);
    expect(m.badges.get('clean-queue')).toBeUndefined();
    expect(m.concepts.get('c-11')?.card?.due).toBe('2026-11-14T17:00:00.000Z');
  });

  it('sees the inherited card of a split concept not yet answered as due', () => {
    const content = contentOf([
      ...TEN.map((id) => ({ id, module: 1 })),
      { id: 'b-new', module: 1, splitFrom: 'a-old' },
    ]);
    const old: Log = [
      [
        at('2026-09-01', 17),
        answerOf({ concept: 'a-old', correct: true, sure: true, mode: 'check', qid: 'q-a-old' }),
      ],
    ];
    const m = deriveMemory(timelineOf([...old, ...sevenDays]), content);
    expect(m.concepts.get('b-new')?.card?.due).toBe('2026-09-04T17:00:00.000Z');
    expect(m.badges.get('clean-queue')).toBeUndefined();
  });

  it('counts every review of a study day that is left and entered again', () => {
    // 2026-10-07T06:30Z at offset -180 is 03:30, so 2026-10-06, between two runs of 2026-10-07 at offset 0.
    const morning = timelineOf([...sixDays, ...reviews('2026-10-07', 5, 'am').slice(0, 6)]);
    const away = timelineOf([[at('2026-10-07', 6, 30), { t: 'lesson.done', note: 'm01/a' }]], -180);
    const back = timelineOf(
      reviews('2026-10-07', 7, 'back')
        .slice(6)
        .map(([, e], i) => [at('2026-10-07', 7, i), e] as const),
    );
    expect(away[0]?.day).toBe('2026-10-06');
    expect(back.every((e) => e.day === '2026-10-07')).toBe(true);
    const m = deriveMemory([...morning, ...away, ...back], BASIC);
    expect(m.badges.get('clean-queue')).toEqual({
      day: '2026-10-07',
      eventId: (back.at(-1) as StudyEvent).id,
    });
  });
});
