import { describe, expect, it } from 'vitest';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import {
  BADGES,
  type BadgeId,
  CALIBRATION,
  calibrationOf,
  decisionPasses,
  domainScores,
  LONG_MEMORY,
  wellCalibrated,
} from '../../src/engine/badges.ts';
import { addDays, dayStartAt } from '../../src/engine/day.ts';
import { deriveMemory, type MemoryContent } from '../../src/engine/memory.ts';
import { review, type SrsCard } from '../../src/engine/srs.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf, examStartOf, startOf, submitOf } from '../fixtures/memory.ts';

/** One fixture per badge (spec 3.10 and 9): the last event crosses the threshold, and without it no badge. */
type Log = (readonly [string, NewEvent])[];

const ids = (prefix: string, n: number): string[] =>
  Array.from({ length: n }, (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`);

/** The badge earned by `log` and its absence without the last event, with the event that earned it. */
function crossing(log: Log, content: MemoryContent, badge: BadgeId) {
  const events = timelineOf(log);
  const before = deriveMemory(events.slice(0, -1), content).badges.get(badge);
  const after = deriveMemory(events, content).badges.get(badge);
  return { before, after, last: events.at(-1) as StudyEvent };
}

const TEN = ids('c', 10);
const BASIC = contentOf(TEN.map((id) => ({ id, module: 1 })));
/** Enough concepts that every answer in a calibration test is a new concept's counted answer. */
const MANY_IDS = ids('k', 200);
const MANY = contentOf(MANY_IDS.map((id) => ({ id, module: 1 })));

describe('badge helpers (spec 3.10)', () => {
  it('lists the 12 badges in spec order', () => {
    expect(BADGES).toEqual([
      'first-brew',
      'clean-queue',
      'changed-my-mind',
      'long-memory',
      'well-calibrated',
      'hands-on',
      'lab-complete',
      'leave-no-trace',
      'full-dress-rehearsal',
      'pass-mark',
      'even-keel',
      'architect',
    ]);
  });

  it('counts Sure and Not sure accuracy and needs 40 of each', () => {
    const window = [
      ...Array.from({ length: 40 }, (_, i) => ({ sure: true, correct: i < 34 })),
      ...Array.from({ length: 40 }, (_, i) => ({ sure: false, correct: i < 30 })),
    ];
    const c = calibrationOf(window);
    expect(c).toEqual({ sure: { right: 34, total: 40 }, notSure: { right: 30, total: 40 } });
    expect(wellCalibrated(c)).toBe(true);
    expect(wellCalibrated(calibrationOf(window.slice(1)))).toBe(false);
    expect(wellCalibrated({ sure: { right: 33, total: 40 }, notSure: { right: 30, total: 40 } })).toBe(false);
    expect(wellCalibrated({ sure: { right: 34, total: 40 }, notSure: { right: 31, total: 40 } })).toBe(false);
  });

  it('passes a decision at 8 of 12 with no criterion at 0', () => {
    expect(decisionPasses([2, 2, 2, 2])).toBe(true);
    expect(decisionPasses([3, 3, 1, 0])).toBe(false);
    expect(decisionPasses([2, 2, 2, 1])).toBe(false);
  });

  it('scores each domain by the task of each item', () => {
    const taskOf = new Map([
      ['x1', '1.2'],
      ['x2', '2.3'],
      ['x3', '2.1'],
    ]);
    const scores = domainScores(
      [
        { qid: 'x1', correct: true },
        { qid: 'x2', correct: false },
        { qid: 'x3', correct: true },
        { qid: 'x-unknown', correct: true },
      ],
      taskOf,
    );
    expect([...scores]).toEqual([
      ['1', { correct: 1, total: 1 }],
      ['2', { correct: 1, total: 2 }],
      ['3', { correct: 0, total: 0 }],
      ['4', { correct: 0, total: 0 }],
    ]);
  });
});

describe('badges in the memory replay (spec 3.10)', () => {
  it('First Brew: the first submitted lesson check', () => {
    const { before, after, last } = crossing(
      [
        [at('2026-10-10', 9), startOf(SID, 'check', ['q-c-01-1'], 'm01/a')],
        [at('2026-10-10', 9, 1), answerOf({ concept: 'c-01', correct: true, sure: true })],
        [at('2026-10-10', 9, 2), submitOf(SID, 'check')],
      ],
      BASIC,
      'first-brew',
    );
    expect(before).toBeUndefined();
    expect(after).toEqual({ day: '2026-10-10', eventId: last.id });
  });

  const reviewDay = (day: string, count = 10, extra: Log = []): Log => [
    ...TEN.slice(0, count).map(
      (c, i) =>
        [
          at(day, 18, i),
          answerOf({ concept: c, correct: true, sure: true, mode: 'review', qid: `q-${c}-${day}` }),
        ] as const,
    ),
    ...extra,
  ];

  it('Clean Queue: the seventh day with 10 reviews that ends with nothing due', () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays('2026-10-01', i));
    const { before, after, last } = crossing(
      days.flatMap((d) => reviewDay(d)),
      BASIC,
      'clean-queue',
    );
    expect(before).toBeUndefined();
    expect(after).toEqual({ day: '2026-10-07', eventId: last.id });
  });

  it('counts a Clean Queue day that is also a completion day', () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays('2026-10-01', i));
    const log = days.flatMap((d) => reviewDay(d, 10, [[at(d, 19), { t: 'lesson.done', note: `m01/${d}` }]]));
    expect(deriveMemory(timelineOf(log), BASIC).badges.get('clean-queue')?.day).toBe('2026-10-07');
  });

  it('never counts a day with 9 reviews toward Clean Queue', () => {
    const days = Array.from({ length: 8 }, (_, i) => addDays('2026-10-01', i));
    // Every card falls due on 2026-10-04, so 2026-10-02 ends clear and only its 9 reviews keep it from counting.
    const log = days.flatMap((d, i) => reviewDay(d, i === 1 ? 9 : 10));
    const secondDay = deriveMemory(timelineOf(log.slice(0, 19)), BASIC);
    const end = dayStartAt('2026-10-03', 0).toISOString();
    for (const c of TEN) expect((secondDay.concepts.get(c)?.card?.due ?? '') >= end).toBe(true);
    expect(deriveMemory(timelineOf(log), BASIC).badges.get('clean-queue')?.day).toBe('2026-10-08');
  });

  it('never counts a day with 10 reviews that ends with a tested card still due', () => {
    const eleven = contentOf([...TEN, 'c-11'].map((id) => ({ id, module: 1 })));
    const days = Array.from({ length: 8 }, (_, i) => addDays('2026-10-01', i));
    const eleventh = (d: string): Log => [
      [
        at(d, 18, 30),
        answerOf({ concept: 'c-11', correct: true, sure: true, mode: 'review', qid: `q-c-11-${d}` }),
      ],
    ];
    // c-11 falls due on 2026-10-04 and waits until the next day, so that day has 10 reviews but is not clear.
    const log = days.flatMap((d) => reviewDay(d, 10, d === '2026-10-04' ? [] : eleventh(d)));
    const firstDay = deriveMemory(timelineOf(log.slice(0, 11)), eleven);
    expect(firstDay.concepts.get('c-11')?.card?.due).toBe('2026-10-04T18:30:00.000Z');
    expect(deriveMemory(timelineOf(log), eleven).badges.get('clean-queue')?.day).toBe('2026-10-08');
  });

  it('counts a card due exactly at the next 04:00 as clear for Clean Queue', () => {
    const days = Array.from({ length: 7 }, (_, i) => addDays('2026-10-01', i));
    const exam: Log = [['2026-09-30T08:00:00.000Z', { t: 'settings', patch: { examDate: '2026-10-09' } }]];
    const m = deriveMemory(timelineOf([...exam, ...days.flatMap((d) => reviewDay(d))]), BASIC);
    const end = dayStartAt('2026-10-08', 0).toISOString();
    expect(TEN.some((c) => m.concepts.get(c)?.card?.due === end)).toBe(true);
    expect(m.badges.get('clean-queue')?.day).toBe('2026-10-07');
  });

  const markAndClear = (concept: string, day: string, n: number): Log => [
    [at(day, 9, n), answerOf({ concept, correct: false, sure: true, qid: `q-${concept}-1` })],
    [at(addDays(day, 1), 9, n), answerOf({ concept, correct: true, sure: true, qid: `q-${concept}-2` })],
  ];

  it('Changed My Mind: the fifth distinct misconception cleared', () => {
    const log = TEN.slice(0, 5).flatMap((c, i) => markAndClear(c, addDays('2026-10-01', 2 * i), i));
    const { before, after, last } = crossing(log, BASIC, 'changed-my-mind');
    expect(before).toBeUndefined();
    expect(after).toEqual({ day: '2026-10-10', eventId: last.id });
  });

  it('never counts the same misconception twice', () => {
    const log = [0, 1, 2, 3, 4, 5].flatMap((i) => markAndClear('c-01', addDays('2026-10-01', 2 * i), i));
    const m = deriveMemory(timelineOf(log), BASIC);
    expect(m.concepts.get('c-01')?.misconception).toBeNull();
    expect(m.badges.has('changed-my-mind')).toBe(false);
  });

  /** Good answers to one concept at each due time from `from` until its stability reaches 21 days. */
  function grow(concept: string, from: string): Log {
    const log: Log = [];
    let t = new Date(from);
    let card: SrsCard | null = null;
    for (let n = 0; card === null || card.stability < LONG_MEMORY.stabilityDays; n++) {
      log.push([
        t.toISOString(),
        answerOf({ concept, correct: true, sure: true, mode: 'review', qid: `q-${concept}-${n}` }),
      ]);
      card = review(card, 'good', t);
      t = new Date(card.due);
    }
    return log;
  }
  const FIFTY = ids('lm', 50);
  const LONG = contentOf(FIFTY.map((id) => ({ id, module: 1 })));
  const sortLog = (log: Log): Log => [...log].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const longLog = sortLog([
    ...FIFTY.slice(0, 49).flatMap((c, i) => grow(c, `2026-09-01T10:${String(i).padStart(2, '0')}:00.000Z`)),
    ...grow('lm-50', '2026-12-01T10:00:00.000Z'),
  ]);

  it('Long Memory: 50 tested cards at a stability of 21 days or more', () => {
    const { before, after, last } = crossing(longLog, LONG, 'long-memory');
    expect(before).toBeUndefined();
    expect(after?.eventId).toBe(last.id);
  });

  it('keeps Long Memory after a lapse drops a card below 21 days', () => {
    const lapse: Log = [
      [
        '2027-06-01T10:00:00.000Z',
        answerOf({ concept: 'lm-01', correct: false, sure: true, mode: 'review' }),
      ],
    ];
    const m = deriveMemory(timelineOf([...longLog, ...lapse]), LONG);
    expect(m.concepts.get('lm-01')?.card?.stability).toBeLessThan(LONG_MEMORY.stabilityDays);
    expect(m.badges.has('long-memory')).toBe(true);
  });

  it('stops counting a card toward Long Memory once a lapse drops it below 21 days', () => {
    const early = grow('lm-50', '2026-01-05T10:00:00.000Z');
    let card: SrsCard | null = null;
    for (const [t] of early) card = review(card, 'good', new Date(t));
    const lapseAt = (card as SrsCard).due;
    const lapsed = review(card, 'again', new Date(lapseAt));
    const regrowAt = lapsed.due;
    const log = sortLog([
      ...longLog.filter(([, e]) => e.t !== 'answer' || e.concept !== 'lm-50'),
      ...early,
      [
        lapseAt,
        answerOf({ concept: 'lm-50', correct: false, sure: true, mode: 'review', qid: 'q-lm-50-lapse' }),
      ],
      [
        regrowAt,
        answerOf({ concept: 'lm-50', correct: true, sure: true, mode: 'review', qid: 'q-lm-50-regrow' }),
      ],
    ]);
    expect(regrowAt < '2026-09-01').toBe(true);
    const m = deriveMemory(timelineOf(log), LONG);
    expect(m.concepts.get('lm-50')?.card?.stability).toBeLessThan(LONG_MEMORY.stabilityDays);
    expect(FIFTY.slice(0, 49).every((c) => (m.concepts.get(c)?.card?.stability ?? 0) >= 21)).toBe(true);
    expect(m.badges.has('long-memory')).toBe(false);
  });

  it('never counts an untested concept toward Long Memory', () => {
    const untested = contentOf(FIFTY.map((id, i) => ({ id, module: 1, tested: i < 49 })));
    expect(deriveMemory(timelineOf(longLog), untested).badges.has('long-memory')).toBe(false);
  });

  it("never counts the card of a split concept's old id toward Long Memory", () => {
    const split = contentOf([
      ...FIFTY.slice(0, 49).map((id) => ({ id, module: 1 })),
      { id: 'lm-50a', module: 1, splitFrom: 'lm-50' },
    ]);
    const m = deriveMemory(timelineOf(longLog), split);
    expect(m.concepts.get('lm-50')?.card?.stability).toBeGreaterThanOrEqual(LONG_MEMORY.stabilityDays);
    expect(m.badges.has('long-memory')).toBe(false);
  });

  it('Well Calibrated: 40 Not sure answers at most 75% right beside 50 Sure at 86%', () => {
    const log: Log = [
      ...Array.from(
        { length: 50 },
        (_, i) =>
          [
            at('2026-10-10', 8, i),
            answerOf({ concept: MANY_IDS[i] as string, correct: i < 43, sure: true }),
          ] as const,
      ),
      ...Array.from(
        { length: 40 },
        (_, i) =>
          [
            at('2026-10-10', 9, i),
            answerOf({ concept: MANY_IDS[50 + i] as string, correct: i < 30, sure: false }),
          ] as const,
      ),
    ];
    const { before, after, last } = crossing(log, MANY, 'well-calibrated');
    expect(before).toBeUndefined();
    expect(after?.eventId).toBe(last.id);
    expect(deriveMemory(timelineOf(log), MANY).calibration).toEqual({
      sure: { right: 43, total: 50 },
      notSure: { right: 30, total: 40 },
    });
  });

  it('keeps the calibration window to the last 150 counted answers', () => {
    const log: Log = Array.from(
      { length: CALIBRATION.window + 10 },
      (_, i) =>
        [
          new Date(Date.parse(at('2026-10-10', 8)) + i * 1000).toISOString(),
          answerOf({ concept: MANY_IDS[i] as string, correct: i >= 10, sure: i < 10 }),
        ] as const,
    );
    const m = deriveMemory(timelineOf(log), MANY);
    expect(m.calibration).toEqual({ sure: { right: 0, total: 0 }, notSure: { right: 150, total: 150 } });
  });

  const labContent = (modules: number, perModule: number) =>
    contentOf([{ id: 'c-01', module: 1 }], new Map(), {
      coreLabs: new Map(
        Array.from({ length: modules }, (_, m) => [m + 1, ids(`lab-${m + 1}`, perModule)] as const),
      ),
    });
  const labsDone = (content: MemoryContent, modules: number): Log =>
    [...content.coreLabs]
      .filter(([m]) => m <= modules)
      .flatMap(([, labs]) => labs)
      .map((lab, i) => [at('2026-10-10', 8, i), { t: 'lab.done', lab, rev: 1, hints: 0 }] as const);

  it('Hands On: every core lab done in 5 modules', () => {
    const content = labContent(6, 2);
    const { before, after, last } = crossing(labsDone(content, 5), content, 'hands-on');
    expect(before).toBeUndefined();
    expect(after?.eventId).toBe(last.id);
  });

  it('Lab Complete: all 26 core labs done', () => {
    const content = labContent(13, 2);
    const { before, after, last } = crossing(labsDone(content, 13), content, 'lab-complete');
    expect(before).toBeUndefined();
    expect(after?.eventId).toBe(last.id);
    expect(deriveMemory(timelineOf(labsDone(content, 13)), BASIC).badges.size).toBe(0);
  });

  it('Leave No Trace: 3 missions cleaned up and checked the next day, the kept mission aside', () => {
    const content = contentOf([{ id: 'c-01', module: 1 }], new Map(), {
      keptMissions: new Set(['mission-01']),
    });
    const closed = (mission: string, day: string, n: number): Log => [
      [at(day, 9, n), { t: 'mission', mission, step: 'cleaned' }],
      [at(addDays(day, 1), 9, n), { t: 'mission', mission, step: 'usage-ok' }],
    ];
    const sameDay: Log = [
      [at('2026-10-01', 9), { t: 'mission', mission: 'mission-05', step: 'cleaned' }],
      [at('2026-10-01', 10), { t: 'mission', mission: 'mission-05', step: 'usage-ok' }],
    ];
    const log = [
      ...sameDay,
      ...closed('mission-01', '2026-10-02', 0),
      ...closed('mission-02', '2026-10-04', 1),
      ...closed('mission-03', '2026-10-06', 2),
      ...closed('mission-04', '2026-10-08', 3),
    ];
    const { before, after, last } = crossing(log, content, 'leave-no-trace');
    expect(before).toBeUndefined();
    expect(after).toEqual({ day: '2026-10-09', eventId: last.id });
  });

  /** A Form A mock over `items` (`[qid, task, correct, picked]`), submitted unless `open`. */
  function mock(items: readonly (readonly [string, string, boolean, boolean])[], form = 'A') {
    const content = contentOf([{ id: 'c-01', module: 1 }], new Map(), {
      examTasks: new Map(items.map(([qid, task]) => [qid, task])),
    });
    const log: Log = [
      [
        at('2026-10-20', 9),
        examStartOf(
          SID2,
          'mock',
          items.map(([qid]) => qid),
          { scope: form.toLowerCase(), form, deadline: at('2026-10-20', 10, 30) },
        ),
      ],
      ...items.map(
        ([qid, , correct, picked], i) =>
          [
            new Date(Date.parse(at('2026-10-20', 10)) + i).toISOString(),
            answerOf({
              concept: 'c-01',
              qid,
              correct,
              sure: false,
              mode: 'mock',
              sid: SID2,
              picked: picked ? ['a'] : [],
            }),
          ] as const,
      ),
      [at('2026-10-20', 10, 1), submitOf(SID2, 'mock')],
    ];
    return { content, log };
  }
  const item = (n: number, task: string, correct: boolean, picked = true) =>
    [`qx-${String(n).padStart(2, '0')}`, task, correct, picked] as const;

  it('Full Dress Rehearsal: every item of an unseen form answered', () => {
    const { content, log } = mock([item(1, '1.1', true), item(2, '2.1', false), item(3, '3.1', false)]);
    const { before, after, last } = crossing(log, content, 'full-dress-rehearsal');
    expect(before).toBeUndefined();
    expect(after?.eventId).toBe(last.id);
    expect(deriveMemory(timelineOf(log), content).badges.has('pass-mark')).toBe(false);
  });

  it('Pass Mark: an unseen form at 80%', () => {
    const { content, log } = mock([
      item(1, '1.1', true),
      item(2, '2.1', true),
      item(3, '3.1', true),
      item(4, '4.1', true),
      item(5, '3.2', false, false),
    ]);
    const { before, after, last } = crossing(log, content, 'pass-mark');
    expect(before).toBeUndefined();
    expect(after?.eventId).toBe(last.id);
    expect(deriveMemory(timelineOf(log), content).badges.has('full-dress-rehearsal')).toBe(false);
  });

  it('Even Keel: 75% in every domain of one unseen form', () => {
    const items = ['1', '2', '3', '4'].flatMap((d, k) =>
      [0, 1, 2, 3].map((i) => item(4 * k + i + 1, `${d}.1`, i < 3)),
    );
    const { content, log } = mock(items);
    const { before, after, last } = crossing(log, content, 'even-keel');
    expect(before).toBeUndefined();
    expect(after?.eventId).toBe(last.id);
    expect(deriveMemory(timelineOf(log), content).badges.has('pass-mark')).toBe(false);
  });

  it('never earns a badge from a remix mock', () => {
    const { content, log } = mock(
      ['1', '2', '3', '4'].map((d, k) => item(k + 1, `${d}.1`, true)),
      'remix',
    );
    expect(deriveMemory(timelineOf(log), content).badges.size).toBe(0);
  });

  it('never earns a mock badge on a second attempt of a form', () => {
    const first = mock([item(1, '1.1', false)]);
    const second = mock(['1', '2', '3', '4'].map((d, k) => item(k + 1, `${d}.1`, true)));
    const retake: Log = second.log.map(([t, e]) => {
      const later = t.replace('2026-10-20', '2026-10-25');
      return [later, 'sid' in e ? { ...e, sid: SID } : e] as const;
    });
    const m = deriveMemory(timelineOf([...first.log, ...retake]), second.content);
    expect(m.badges.has('pass-mark')).toBe(false);
    expect(m.badges.has('even-keel')).toBe(false);
  });

  it('Architect: the latest final decision of all 13 modules passes', () => {
    const decision = (module: number, stage: 'self' | 'final', scores: [number, number, number, number]) =>
      [at('2026-10-20', 8, module), { t: 'decision', module, stage, scores }] as const;
    const log: Log = [
      [at('2026-10-19', 8), { t: 'decision', module: 13, stage: 'final', scores: [3, 3, 3, 0] }],
      ...Array.from({ length: 13 }, (_, i) => decision(i + 1, 'self', [1, 1, 1, 1])),
      ...Array.from(
        { length: 13 },
        (_, i) => [at('2026-10-20', 9, i), decision(i + 1, 'final', [2, 2, 2, 2])[1]] as const,
      ),
    ];
    const { before, after, last } = crossing(log, BASIC, 'architect');
    expect(before).toBeUndefined();
    expect(after?.eventId).toBe(last.id);
  });

  it('pays no XP for a badge', () => {
    const log: Log = [
      [at('2026-10-10', 9), startOf(SID, 'check', ['q-c-01-1'], 'm01/a')],
      [at('2026-10-10', 9, 1), answerOf({ concept: 'c-01', correct: true, sure: true })],
      [at('2026-10-10', 9, 2), submitOf(SID, 'check')],
    ];
    const events = timelineOf(log);
    const m = deriveMemory(events, BASIC);
    expect(m.badges.has('first-brew')).toBe(true);
    expect(m.xp).toBe(deriveMemory(events.slice(0, -1), BASIC).xp);
    expect(m.xpByEvent.has(events[2]?.id ?? '')).toBe(false);
  });
});
