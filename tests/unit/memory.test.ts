import { describe, expect, it } from 'vitest';
import type { Mode, NewEvent, StudyEvent } from '../../schemas/events.ts';
import { addDays, dayStartAt, studyDayAt } from '../../src/engine/day.ts';
import {
  bossPassMark,
  CATCH_UP_OVER,
  CATCH_UP_PLAN,
  COUNTING_MODES,
  type ConceptInfo,
  deriveMemory,
  EXAM_MODES,
  isDue,
  type MemoryContent,
  resolveConcept,
  sessionSummary,
} from '../../src/engine/memory.ts';
import { derive } from '../../src/engine/replay.ts';
import { fnv1a } from '../../src/engine/rng.ts';
import { recall, review, type SrsCard } from '../../src/engine/srs.ts';
import { effortBonus } from '../../src/engine/xp.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import { abandonOf, answerOf, at, contentOf, examStartOf, labDoneOf, submitOf } from '../fixtures/memory.ts';

const SID3 = '01JA00000000000000000000S3';

const info = (module: number, tested = true, splitFrom: string | null = null): ConceptInfo => ({
  module,
  tested,
  confusableWith: [],
  splitFrom,
  tasks: [],
});

const NO_EXTRAS = { examTasks: new Map(), coreLabs: new Map(), keptMissions: new Set<string>() };

/** Made-up bakery content: 4 concepts in 2 modules, one untested, and one alias. */
const CONTENT: MemoryContent = {
  concepts: new Map([
    ['proof-box', info(1)],
    ['oven-rental', info(1)],
    ['flour-delivery', info(2)],
    ['display-case', info(2, false)],
  ]),
  aliases: new Map([['proofing-cabinet', 'proof-box']]),
  questionVersions: new Map([
    ['q-pb1', 1],
    ['q-pb2', 1],
    ['q-pb3', 1],
    ['q-or1', 1],
    ['q-or2', 2],
    ['q-fd1', 1],
    ['q-fd2', 1],
    ['q-dc1', 1],
  ]),
  ...NO_EXTRAS,
};

interface AnswerOptions {
  sid?: string;
  mode?: Mode;
  relearn?: boolean;
  qv?: number;
  ms?: number;
}

const answer = (
  qid: string,
  concept: string,
  correct: boolean,
  sure: boolean,
  options: AnswerOptions = {},
): NewEvent => ({
  t: 'answer',
  sid: options.sid ?? SID,
  mode: options.mode ?? 'check',
  qid,
  qv: options.qv ?? 1,
  concept,
  picked: ['a'],
  correct,
  sure,
  ms: options.ms ?? 4000,
  ...(options.relearn === undefined ? {} : { relearn: options.relearn }),
});

const start = (sid: string, mode: Mode = 'check'): NewEvent => ({
  t: 'session',
  sid,
  mode,
  phase: 'start',
  seed: 1,
  scope: 'test',
  qids: [],
});

const idOf = (events: readonly StudyEvent[], i: number): string => events[i]?.id ?? '';
const must = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) throw new Error('expected a value');
  return value;
};
const cardOf = (events: readonly StudyEvent[], concept = 'proof-box', content = CONTENT) =>
  deriveMemory(events, content).concepts.get(concept)?.card ?? null;

describe('resolveConcept and isDue', () => {
  it('resolves an alias, and returns null for untested and unknown concepts', () => {
    expect(resolveConcept(CONTENT, 'proof-box')).toBe('proof-box');
    expect(resolveConcept(CONTENT, 'proofing-cabinet')).toBe('proof-box');
    expect(resolveConcept(CONTENT, 'display-case')).toBeNull();
    expect(resolveConcept(CONTENT, 'mystery')).toBeNull();
  });

  it('counts a card as due until the 04:00 that ends its study day', () => {
    const card = review(null, 'good', new Date('2026-10-09T10:00:00Z'));
    expect(isDue(card, new Date('2026-10-12T03:59:00Z'), 0)).toBe(false);
    expect(isDue(card, new Date('2026-10-12T04:00:00Z'), 0)).toBe(true);
    expect(isDue(card, new Date('2026-10-11T23:00:00Z'), 360)).toBe(true);
  });

  it('counts the modes of spec 3.1 and no others', () => {
    expect([...COUNTING_MODES].sort()).toEqual(['check', 'debrief', 'focus', 'incident', 'quiz', 'review']);
    expect(CATCH_UP_OVER).toBe(100);
    expect(CATCH_UP_PLAN).toBe(60);
  });
});

describe('deriveMemory: counted answers and the bet', () => {
  it('pays 10 for a first Sure right answer and starts a card due 3 days later', () => {
    const events = timelineOf([
      ['2026-10-09T09:59:00Z', start(SID)],
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(10);
    expect(m.xpByEvent.get(idOf(events, 1))).toBe(10);
    expect(m.xpByDay.get('2026-10-09')).toBe(10);
    const cm = m.concepts.get('proof-box');
    expect(cm?.card?.due).toBe('2026-10-12T10:00:00.000Z');
    expect(cm?.enteredOn).toBe('2026-10-09');
    expect(cm?.fsrsRating).toBe('good');
    expect(cm?.successDays).toEqual(['2026-10-09']);
    expect(m.newByDay.get('2026-10-09')).toBe(1);
    expect(m.answered.has('q-pb1')).toBe(true);
  });

  it('pays 8 and rates Hard for Not sure right, and pays 5 with a due the next day for Not sure wrong', () => {
    const at = '2026-10-09T10:00:00Z';
    const right = deriveMemory(timelineOf([[at, answer('q-pb1', 'proof-box', true, false)]]), CONTENT);
    expect(right.xp).toBe(8);
    expect(right.concepts.get('proof-box')?.card).toEqual(review(null, 'hard', new Date(at)));
    const wrong = deriveMemory(timelineOf([[at, answer('q-pb1', 'proof-box', false, false)]]), CONTENT);
    expect(wrong.xp).toBe(5);
    expect(wrong.concepts.get('proof-box')?.card?.due).toBe('2026-10-10T10:00:00.000Z');
    expect(wrong.concepts.get('proof-box')?.successDays).toEqual([]);
  });

  it('pays 0 for a second answer the same day and leaves the card as it was', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', true, true)],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(10);
    expect(m.xpByEvent.has(idOf(events, 1))).toBe(false);
    expect(cardOf(events)).toEqual(cardOf(events.slice(0, 1)));
  });

  it('applies one extra Again for a later wrong answer after a Good, and only one', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', false, false)],
      ['2026-10-09T10:10:00Z', answer('q-pb3', 'proof-box', false, true)],
    ]);
    const good = must(cardOf(events.slice(0, 1)));
    const extra = cardOf(events.slice(0, 2));
    expect(extra).not.toEqual(good);
    expect(extra).toEqual(review(good, 'again', new Date('2026-10-09T10:05:00Z')));
    expect(cardOf(events)).toEqual(extra);
    expect(deriveMemory(events, CONTENT).xp).toBe(10);
  });

  it('applies no extra Again after a first answer of the day that was already Again', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', false, false)],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', false, false)],
    ]);
    expect(cardOf(events)).toEqual(cardOf(events.slice(0, 1)));
  });

  it('pays the bet plus an effort bonus of 1 on the due day', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-12T09:59:00Z', start(SID2, 'review')],
      ['2026-10-12T10:00:00Z', answer('q-pb2', 'proof-box', true, true, { sid: SID2, mode: 'review' })],
    ]);
    const first = must(cardOf(events.slice(0, 1)));
    const m = deriveMemory(events, CONTENT);
    expect(effortBonus(recall(first, new Date('2026-10-12T09:59:56Z')))).toBe(1);
    expect(m.xpByEvent.get(idOf(events, 2))).toBe(11);
    expect(m.xp).toBe(21);
    expect(m.concepts.get('proof-box')?.card).not.toEqual(first);
    expect(m.concepts.get('proof-box')?.successDays).toEqual(['2026-10-09', '2026-10-12']);
  });

  it('pays an early answer only for a never-answered question and leaves the card alone', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-10T10:00:00Z', answer('q-pb2', 'proof-box', true, true)],
      ['2026-10-11T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xpByEvent.get(idOf(events, 1))).toBe(10);
    expect(m.xpByEvent.has(idOf(events, 2))).toBe(false);
    expect(m.xp).toBe(20);
    expect(cardOf(events)).toEqual(cardOf(events.slice(0, 1)));
  });

  it("judges due at the session's start, so a session begun before 04:00 stays early", () => {
    const first: [string, NewEvent] = ['2026-10-09T00:30:00Z', answer('q-pb1', 'proof-box', true, true)];
    const before = cardOf(timelineOf([first]));
    expect(before?.due).toBe('2026-10-12T00:30:00.000Z');
    const early = timelineOf([
      first,
      ['2026-10-11T03:30:00Z', start(SID2, 'review')],
      ['2026-10-11T04:10:00Z', answer('q-pb2', 'proof-box', true, true, { sid: SID2, mode: 'review' })],
    ]);
    expect(early[2]?.day).toBe('2026-10-11');
    expect(cardOf(early)).toEqual(before);
    expect(deriveMemory(early, CONTENT).xpByEvent.get(idOf(early, 2))).toBe(10);
    const due = timelineOf([
      first,
      ['2026-10-11T04:05:00Z', start(SID2, 'review')],
      ['2026-10-11T04:10:00Z', answer('q-pb2', 'proof-box', true, true, { sid: SID2, mode: 'review' })],
    ]);
    expect(cardOf(due)).not.toEqual(before);
    expect(deriveMemory(due, CONTENT).xpByEvent.get(idOf(due, 2))).toBe(11);
  });
});

describe('deriveMemory: misconceptions and relearn answers', () => {
  it('marks a wrong Sure answer and clears it only with a right Sure on another question a day later', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', false, true)],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', true, true)],
      ['2026-10-10T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-11T10:00:00Z', answer('q-pb3', 'proof-box', true, true)],
    ]);
    const markAfter = (n: number) =>
      deriveMemory(events.slice(0, n), CONTENT).concepts.get('proof-box')?.misconception;
    const mark = { qid: 'q-pb1', day: '2026-10-09' };
    expect(markAfter(1)).toEqual(mark);
    expect(markAfter(2)).toEqual(mark);
    expect(markAfter(3)).toEqual(mark);
    expect(markAfter(4)).toBeNull();
    expect(deriveMemory(events.slice(0, 1), CONTENT).xp).toBe(0);
  });

  it('gives a relearn answer 0 XP and no update, while a wrong Sure relearn still marks', () => {
    const events = timelineOf([
      ['2026-10-09T09:59:00Z', start(SID, 'review')],
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, false, { mode: 'review' })],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', false, true, { mode: 'review', relearn: true })],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(8);
    expect(m.xpByEvent.has(idOf(events, 2))).toBe(false);
    expect(cardOf(events)).toEqual(cardOf(events.slice(0, 2)));
    expect(m.concepts.get('proof-box')?.misconception).toEqual({ qid: 'q-pb2', day: '2026-10-09' });
  });
});

describe('deriveMemory: the exam cap', () => {
  const chain: [string, NewEvent][] = [
    ['2026-10-16T10:00:00Z', answer('q-fd1', 'flour-delivery', true, true)],
    ['2026-10-19T10:00:00Z', answer('q-fd2', 'flour-delivery', true, true)],
    ['2026-11-02T10:00:00Z', answer('q-fd1', 'flour-delivery', true, true)],
  ];
  const setExam = (examDate: string | null): NewEvent => ({ t: 'settings', patch: { examDate } });
  const spread = fnv1a('flour-delivery') % 7;

  it('moves a due after the eve of the exam into the last week', () => {
    const events = timelineOf([['2026-10-09T08:00:00Z', setExam('2026-11-14')], ...chain]);
    const m = deriveMemory(events, CONTENT);
    expect(m.examDate).toBe('2026-11-14');
    const due = m.concepts.get('flour-delivery')?.card?.due ?? '';
    expect(due).toBe(dayStartAt(addDays('2026-11-13', -spread), 0).toISOString());
    const day = studyDayAt(new Date(due), 0);
    expect(day >= '2026-11-07' && day <= '2026-11-13').toBe(true);
  });

  it('recomputes every capped due from the latest exam date', () => {
    const moved = timelineOf([
      ['2026-10-09T08:00:00Z', setExam('2026-11-14')],
      ...chain,
      ['2026-11-03T08:00:00Z', setExam('2026-11-28')],
    ]);
    expect(cardOf(moved, 'flour-delivery')?.due).toBe(
      dayStartAt(addDays('2026-11-27', -spread), 0).toISOString(),
    );
    const cleared = timelineOf([
      ['2026-10-09T08:00:00Z', setExam('2026-11-14')],
      ...chain,
      ['2026-11-03T08:00:00Z', setExam(null)],
    ]);
    const natural = chain.reduce<SrsCard | null>((card, [at]) => review(card, 'good', new Date(at)), null);
    expect(cardOf(cleared, 'flour-delivery')).toEqual(natural);
    expect(natural?.due).toBe('2026-12-29T10:00:00.000Z');
  });
});

describe('deriveMemory: lessons, aliases, unknown ids and stale versions', () => {
  it('pays 10 XP once per lesson note and makes its day qualify', () => {
    const done = (note: string): NewEvent => ({ t: 'lesson.done', note });
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', done('m01/proofing-at-scale')],
      ['2026-10-09T11:00:00Z', done('m01/renting-ovens')],
      ['2026-10-10T10:00:00Z', done('m01/proofing-at-scale')],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(20);
    expect(m.xpByEvent.has(idOf(events, 2))).toBe(false);
    expect([...m.qualifyingDays]).toEqual(['2026-10-09']);
  });

  it('updates the surviving concept for an alias and skips untested and unknown concepts', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proofing-cabinet', true, true)],
      ['2026-10-09T10:01:00Z', answer('q-dc1', 'display-case', true, true)],
      ['2026-10-09T10:02:00Z', answer('q-zz9', 'mystery', true, true)],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.concepts.get('proof-box')?.card).not.toBeNull();
    expect(m.concepts.has('proofing-cabinet')).toBe(false);
    expect(m.concepts.has('display-case')).toBe(false);
    expect(m.concepts.has('mystery')).toBe(false);
    expect(m.xp).toBe(10);
    expect([...m.answered].sort()).toEqual(['q-dc1', 'q-pb1', 'q-zz9']);
  });

  it('keeps the XP of an answer to an older question version but leaves it out of FSRS', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-or2', 'oven-rental', true, true, { qv: 1 })],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(10);
    expect(m.concepts.get('oven-rental')?.card ?? null).toBeNull();
    expect(m.staleAnswers).toBe(1);
    expect(m.newByDay.size).toBe(0);
  });

  it('never throws on answers outside the counting modes, and still records their questions', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true, { mode: 'lightning' })],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(0);
    expect(m.concepts.size).toBe(0);
    expect(m.answered.has('q-pb1')).toBe(true);
  });
});

describe('deriveMemory: qualifying days and catch-up', () => {
  it('qualifies a day whose only due concept is answered', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-12T10:00:00Z', answer('q-pb2', 'proof-box', true, true)],
    ]);
    expect([...deriveMemory(events, CONTENT).qualifyingDays]).toEqual(['2026-10-09', '2026-10-12']);
  });

  it('does not qualify a day that leaves a due concept unanswered, or a day of lightning only', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-09T10:01:00Z', answer('q-or1', 'oven-rental', true, true)],
      ['2026-10-10T10:00:00Z', answer('q-pb2', 'proof-box', true, true, { mode: 'lightning' })],
      ['2026-10-12T10:00:00Z', answer('q-pb2', 'proof-box', true, true)],
    ]);
    expect([...deriveMemory(events, CONTENT).qualifyingDays]).toEqual(['2026-10-09']);
  });

  it('plans the 60 lowest-R concepts when more than 100 are due, and qualifies the day once all 60 are answered', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `c-${String(i).padStart(3, '0')}`);
    const big: MemoryContent = {
      concepts: new Map(ids.map((id) => [id, info(1)])),
      aliases: new Map(),
      questionVersions: new Map(),
      ...NO_EXTRAS,
    };
    const firstDay = ids.map((id, i): [string, NewEvent] => [
      new Date(Date.UTC(2026, 9, 9, 8, 0, i)).toISOString(),
      answer(`q-${id}`, id, true, true),
    ]);
    const planDay = ids
      .slice(0, CATCH_UP_PLAN)
      .map((id, i): [string, NewEvent] => [
        new Date(Date.UTC(2026, 9, 12, 12, 1, i)).toISOString(),
        answer(`q-${id}-b`, id, true, true, { sid: SID2, mode: 'review' }),
      ]);
    const events = timelineOf([...firstDay, ['2026-10-12T12:00:00Z', start(SID2, 'review')], ...planDay]);
    const m = deriveMemory(events, big);
    expect(m.catchUpPlans.get('2026-10-12')).toEqual(ids.slice(0, CATCH_UP_PLAN));
    expect(m.qualifyingDays.has('2026-10-12')).toBe(true);
    const evening = new Date('2026-10-12T23:00:00Z');
    const stillDue = [...m.concepts.values()].filter((cm) => cm.card && isDue(cm.card, evening, 0));
    expect(stillDue).toHaveLength(41);
    const short = deriveMemory(events.slice(0, -1), big);
    expect(short.qualifyingDays.has('2026-10-12')).toBe(false);
  });
});

describe('deriveMemory: split concepts', () => {
  const SPLIT: MemoryContent = {
    concepts: new Map([
      ['rye-starter', info(1, true, 'old-starter')],
      ['wheat-starter', info(1, true, 'old-starter')],
    ]),
    aliases: new Map(),
    questionVersions: new Map(),
    ...NO_EXTRAS,
  };

  it("starts each new concept from the old concept's card", () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-os1', 'old-starter', true, true)],
      ['2026-10-10T10:00:00Z', answer('q-rs1', 'rye-starter', true, true)],
    ]);
    const m = deriveMemory(events, SPLIT);
    const old = m.concepts.get('old-starter')?.card;
    expect(old?.due).toBe('2026-10-12T10:00:00.000Z');
    expect(m.concepts.get('rye-starter')?.card).toEqual(old);
    expect(m.concepts.get('rye-starter')?.enteredOn).toBe('2026-10-09');
    expect(m.concepts.get('wheat-starter')?.card).toEqual(old);
    expect(m.xpByEvent.get(idOf(events, 1))).toBe(10);
  });
});

describe('sessionSummary', () => {
  it('sums a 3-question review with 2 right and 1 wrong', () => {
    const events = timelineOf([
      ['2026-10-09T09:59:00Z', start(SID)],
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-09T10:01:00Z', answer('q-or1', 'oven-rental', true, true)],
      ['2026-10-09T10:02:00Z', answer('q-fd1', 'flour-delivery', true, true)],
      [
        '2026-10-12T10:09:00Z',
        {
          t: 'session',
          sid: SID3,
          mode: 'review',
          phase: 'start',
          seed: 2,
          scope: 'review',
          qids: ['q-pb2', 'q-or2', 'q-fd2'],
        },
      ],
      ['2026-10-12T10:10:00Z', answer('q-pb2', 'proof-box', true, true, { sid: SID3, mode: 'review' })],
      [
        '2026-10-12T10:11:00Z',
        answer('q-or2', 'oven-rental', true, true, { sid: SID3, mode: 'review', qv: 2 }),
      ],
      [
        '2026-10-12T10:12:00Z',
        answer('q-fd2', 'flour-delivery', false, false, { sid: SID3, mode: 'review' }),
      ],
    ]);
    const memory = deriveMemory(events, CONTENT);
    const session = must(derive(events, null).sessions.get(SID3));
    const summary = sessionSummary(session, memory, CONTENT, new Date('2026-10-12T10:13:00Z'), 0);
    const reviewXp = [5, 6, 7].reduce((sum, i) => sum + (memory.xpByEvent.get(idOf(events, i)) ?? 0), 0);
    expect(summary).toEqual({ correct: 2, total: 3, xp: reviewXp, backTomorrow: 1 });
    expect(reviewXp).toBe(27);
  });
});

describe('deriveMemory: boss and mock answers (spec 3.1, 3.2, 4.1)', () => {
  const EXAM = contentOf([
    { id: 'oven', module: 1 },
    { id: 'proofing', module: 1 },
    { id: 'crust', module: 2 },
  ]);
  type Log = (readonly [string, NewEvent])[];
  interface Item {
    concept: string;
    correct: boolean;
    flagged?: boolean;
    picked?: string[];
    qid?: string;
  }
  const S3 = '01JA00000000000000000000S3';
  const S4 = '01JA00000000000000000000S4';
  const qidOf = (item: Item, i: number) => item.qid ?? `qx-${item.concept}-${i}`;

  /** An exam session on `day`: start at 10:00, every answer at 10:15, then the submit unless `open`. */
  function exam(
    day: string,
    sid: string,
    mode: 'boss' | 'mock',
    items: readonly Item[],
    opts: { scope?: string; form?: string; open?: boolean; hour?: number } = {},
  ): Log {
    const hour = opts.hour ?? 10;
    const qids = items.map(qidOf);
    const log: Log = [
      [
        at(day, hour, 0),
        examStartOf(sid, mode, qids, {
          scope: opts.scope ?? (mode === 'boss' ? 'm01' : 'a'),
          deadline: at(day, hour, 21),
          ...(opts.form === undefined ? {} : { form: opts.form }),
        }),
      ],
      ...items.map(
        (item, i) =>
          [
            new Date(Date.parse(at(day, hour, 15)) + i).toISOString(),
            answerOf({
              concept: item.concept,
              qid: qidOf(item, i),
              correct: item.correct,
              sure: false,
              mode,
              sid,
              ms: 0,
              ...(item.flagged === undefined ? {} : { flagged: item.flagged }),
              ...(item.picked === undefined ? {} : { picked: item.picked }),
            }),
          ] as const,
      ),
    ];
    if (opts.open !== true) log.push([at(day, hour, 16), submitOf(sid, mode)]);
    return log;
  }
  const checkRight = (day: string, concept: string, hour = 9): Log => [
    [at(day, hour), answerOf({ concept, correct: true, sure: true, qid: `q-${concept}-1`, sid: S4 })],
  ];
  const memoryOf = (log: Log) => deriveMemory(timelineOf(log), EXAM);
  const card = (log: Log, concept: string) => memoryOf(log).concepts.get(concept)?.card ?? null;
  const fifteen = (right: number): Item[] =>
    Array.from({ length: 15 }, (_, i) => ({ concept: 'oven', correct: i < right, qid: `qb-${i}` }));

  it('keeps boss and mock out of the counting modes and passes a boss at 12 of 15', () => {
    expect([...EXAM_MODES].sort()).toEqual(['boss', 'mock']);
    expect(COUNTING_MODES.has('boss')).toBe(false);
    expect(bossPassMark(15)).toBe(12);
    expect(bossPassMark(10)).toBe(8);
    expect(bossPassMark(11)).toBe(9);
  });

  it('applies a boss answer only on submit', () => {
    const items = [{ concept: 'oven', correct: true }];
    expect(card(exam('2026-10-10', SID, 'boss', items, { open: true }), 'oven')).toBeNull();
    expect(card(exam('2026-10-10', SID, 'boss', items), 'oven')).toEqual(
      review(null, 'good', new Date(at('2026-10-10', 10, 15))),
    );
  });

  it('rates a correct flagged boss answer Hard and an unflagged one Good', () => {
    const log = exam('2026-10-10', SID, 'boss', [
      { concept: 'oven', correct: true, flagged: true },
      { concept: 'proofing', correct: true, flagged: false },
    ]);
    const m = memoryOf(log);
    const t = Date.parse(at('2026-10-10', 10, 15));
    expect(m.concepts.get('oven')?.card).toEqual(review(null, 'hard', new Date(t)));
    expect(m.concepts.get('oven')?.fsrsRating).toBe('hard');
    expect(m.concepts.get('proofing')?.card).toEqual(review(null, 'good', new Date(t + 1)));
  });

  it('leaves a not-due concept alone when the boss answer is right', () => {
    const before = checkRight('2026-10-10', 'oven');
    const log = [...before, ...exam('2026-10-11', SID, 'boss', [{ concept: 'oven', correct: true }])];
    const m = memoryOf(log);
    expect(m.concepts.get('oven')?.card).toEqual(card(before, 'oven'));
    expect(m.concepts.get('oven')?.lastAnswerDay).toBe('2026-10-10');
    expect(m.concepts.get('oven')?.fsrsDay).toBe('2026-10-10');
  });

  it('applies Again to a not-due concept answered wrong in a boss', () => {
    const before = checkRight('2026-10-10', 'oven');
    const log = [...before, ...exam('2026-10-11', SID, 'boss', [{ concept: 'oven', correct: false }])];
    expect(card(log, 'oven')).toEqual(
      review(card(before, 'oven'), 'again', new Date(at('2026-10-11', 10, 15))),
    );
  });

  it('a correct boss answer adds no success day', () => {
    const m = memoryOf(exam('2026-10-10', SID, 'boss', [{ concept: 'oven', correct: true }]));
    expect(m.concepts.get('oven')?.successDays).toEqual([]);
  });

  it('a second submit of one boss applies nothing', () => {
    const once = exam('2026-10-10', SID, 'boss', fifteen(12));
    const twice: Log = [
      ...once,
      [
        at('2026-10-10', 10, 17),
        answerOf({ concept: 'proofing', correct: false, sure: false, mode: 'boss' }),
      ],
      [at('2026-10-10', 10, 18), submitOf(SID, 'boss')],
    ];
    const a = memoryOf(once);
    const b = memoryOf(twice);
    expect(b.xp).toBe(a.xp);
    expect(b.xp).toBe(100);
    expect(b.concepts.get('oven')?.card).toEqual(a.concepts.get('oven')?.card);
    expect(b.concepts.get('proofing')).toBeUndefined();
  });

  it('creates a card for an unstudied concept in a mock without counting it as new', () => {
    const m = memoryOf(exam('2026-10-10', SID, 'mock', [{ concept: 'crust', correct: true }], { form: 'A' }));
    expect(m.concepts.get('crust')?.card).not.toBeNull();
    expect(m.concepts.get('crust')?.enteredOn).toBe('2026-10-10');
    expect(m.newByDay.size).toBe(0);
  });

  it('applies one update per concept per day across a boss and a quiz', () => {
    const boss = exam('2026-10-10', SID, 'boss', [{ concept: 'oven', correct: true }]);
    const quiz: Log = [
      [at('2026-10-10', 12), answerOf({ concept: 'oven', correct: true, sure: true, mode: 'quiz', sid: S3 })],
    ];
    expect(card([...boss, ...quiz], 'oven')).toEqual(card(boss, 'oven'));
    const quizFirst: Log = [
      [at('2026-10-10', 8), answerOf({ concept: 'oven', correct: true, sure: true, mode: 'quiz', sid: S3 })],
    ];
    expect(card([...quizFirst, ...boss], 'oven')).toEqual(card(quizFirst, 'oven'));
  });

  it('applies one extra Again for a later wrong boss answer the same day', () => {
    const quiz: Log = [
      [at('2026-10-10', 8), answerOf({ concept: 'oven', correct: true, sure: true, mode: 'quiz', sid: S3 })],
    ];
    const wrong = (sid: string, hour: number) =>
      exam('2026-10-10', sid, 'boss', [{ concept: 'oven', correct: false, qid: `qb-${hour}` }], { hour });
    const once = [...quiz, ...wrong(SID, 10)];
    expect(card(once, 'oven')).toEqual(
      review(card(quiz, 'oven'), 'again', new Date(at('2026-10-10', 10, 15))),
    );
    expect(card([...once, ...wrong(SID2, 12)], 'oven')).toEqual(card(once, 'oven'));
  });

  it('counts an unanswered mock item as Again', () => {
    const before = checkRight('2026-10-10', 'oven');
    const log = [
      ...before,
      ...exam('2026-10-11', SID, 'mock', [{ concept: 'oven', correct: false, picked: [] }], { form: 'A' }),
    ];
    expect(card(log, 'oven')).toEqual(
      review(card(before, 'oven'), 'again', new Date(at('2026-10-11', 10, 15))),
    );
  });

  it('pays 100 XP on the first boss pass of a module and nothing on a second pass', () => {
    const failed = exam('2026-10-10', SID, 'boss', fifteen(11));
    expect(memoryOf(failed).xp).toBe(0);
    const passed = [...failed, ...exam('2026-10-11', SID2, 'boss', fifteen(12))];
    const m = memoryOf(passed);
    const events = timelineOf(passed);
    expect(m.xp).toBe(100);
    expect(m.xpByEvent.get(events.at(-1)?.id ?? '')).toBe(100);
    const again = [...passed, ...exam('2026-10-12', S3, 'boss', fifteen(15))];
    expect(memoryOf(again).xp).toBe(100);
    const other = [...passed, ...exam('2026-10-12', S3, 'boss', fifteen(15), { scope: 'm02' })];
    expect(memoryOf(other).xp).toBe(200);
  });

  it('pays 150 XP once per form and nothing for a remix', () => {
    const one = [{ concept: 'oven', correct: true }];
    const log = [
      ...exam('2026-10-10', SID, 'mock', one, { form: 'A' }),
      ...exam('2026-10-11', SID2, 'mock', one, { form: 'A' }),
      ...exam('2026-10-12', S3, 'mock', one, { form: 'remix' }),
    ];
    expect(memoryOf(log).xp).toBe(150);
    expect(memoryOf([...log, ...exam('2026-10-13', S4, 'mock', one, { form: 'B' })]).xp).toBe(300);
  });

  it('pays no XP per boss or mock item', () => {
    const m = memoryOf([
      ...exam('2026-10-10', SID, 'boss', fifteen(3)),
      ...exam('2026-10-11', SID2, 'mock', [{ concept: 'crust', correct: true }], { form: 'remix' }),
    ]);
    expect(m.xp).toBe(0);
    expect(m.xpByEvent.size).toBe(0);
  });

  it('qualifies the study day of a submitted boss', () => {
    const m = memoryOf(exam('2026-10-10', SID, 'boss', fifteen(3)));
    expect([...m.qualifyingDays]).toEqual(['2026-10-10']);
    expect([...m.examsDone]).toEqual(['2026-10-10']);
  });

  it('ignores an abandoned boss', () => {
    const log: Log = [
      ...exam('2026-10-10', SID, 'boss', fifteen(15), { open: true }),
      [at('2026-10-10', 10, 16), abandonOf(SID, 'boss')],
      [at('2026-10-10', 10, 17), submitOf(SID, 'boss')],
    ];
    const m = memoryOf(log);
    expect(m.concepts.size).toBe(0);
    expect(m.xp).toBe(0);
    expect(m.qualifyingDays.size).toBe(0);
    expect(m.answered.size).toBe(15);
  });
});

describe('deriveMemory: labs and debriefs (spec 3.1, 3.2, 3.5)', () => {
  it('pays 40 for a first completion without hints and 30 with hints', () => {
    const clean = timelineOf([['2026-10-09T10:00:00Z', labDoneOf('lab-m01-a', 0)]]);
    expect(deriveMemory(clean, CONTENT).xp).toBe(40);
    expect(deriveMemory(clean, CONTENT).xpByEvent.get(idOf(clean, 0))).toBe(40);
    const hinted = timelineOf([['2026-10-09T10:00:00Z', labDoneOf('lab-m01-a', 2)]]);
    expect(deriveMemory(hinted, CONTENT).xp).toBe(30);
  });

  it('pays a lab once: a rerun without hints or with a higher rev pays 0 and keeps the completion', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', labDoneOf('lab-m01-a', 2)],
      ['2026-10-09T11:00:00Z', labDoneOf('lab-m01-a', 0)],
      ['2026-10-10T10:00:00Z', labDoneOf('lab-m01-a', 0, 2)],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(30);
    expect(m.xpByEvent.has(idOf(events, 1))).toBe(false);
    expect(m.xpByEvent.has(idOf(events, 2))).toBe(false);
  });

  it('qualifies the day of a first completion and not the day of a rerun', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', labDoneOf('lab-m01-a')],
      ['2026-10-10T10:00:00Z', labDoneOf('lab-m01-a')],
    ]);
    expect([...deriveMemory(events, CONTENT).qualifyingDays]).toEqual(['2026-10-09']);
  });

  it('pays an unknown lab id like any other and never throws', () => {
    const events = timelineOf([['2026-10-09T10:00:00Z', labDoneOf('lab-m09-gone', 1)]]);
    expect(deriveMemory(events, CONTENT).xp).toBe(30);
  });

  it('counts a debrief answer like a check answer: the bet and a new card', () => {
    const events = timelineOf([
      ['2026-10-09T09:59:00Z', start(SID, 'debrief')],
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true, { mode: 'debrief' })],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(10);
    expect(m.concepts.get('proof-box')?.card?.due).toBe('2026-10-12T10:00:00.000Z');
    expect(m.concepts.get('proof-box')?.successDays).toEqual(['2026-10-09']);
  });

  it('pays the effort bonus to a first debrief answer of the day on a due concept', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-12T09:59:00Z', start(SID2, 'debrief')],
      ['2026-10-12T10:00:00Z', answer('q-pb2', 'proof-box', true, true, { sid: SID2, mode: 'debrief' })],
    ]);
    expect(deriveMemory(events, CONTENT).xpByEvent.get(idOf(events, 2))).toBe(11);
  });

  it('applies one extra Again for a later wrong debrief answer the same day', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', false, false, { sid: SID2, mode: 'debrief' })],
      ['2026-10-09T10:10:00Z', answer('q-pb3', 'proof-box', false, false, { sid: SID2, mode: 'debrief' })],
    ]);
    const good = must(cardOf(events.slice(0, 1)));
    expect(cardOf(events.slice(0, 2))).toEqual(review(good, 'again', new Date('2026-10-09T10:05:00Z')));
    expect(cardOf(events)).toEqual(cardOf(events.slice(0, 2)));
  });

  it('marks a misconception for a debrief miss bet Sure', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', false, true, { mode: 'debrief' })],
    ]);
    expect(deriveMemory(events, CONTENT).concepts.get('proof-box')?.misconception).toEqual({
      qid: 'q-pb1',
      day: '2026-10-09',
    });
  });
});
