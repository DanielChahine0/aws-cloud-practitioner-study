import { describe, expect, it } from 'vitest';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { studyDayAt } from '../../src/engine/day.ts';
import { moduleMastery } from '../../src/engine/mastery.ts';
import { deriveMemory, type MemoryContent } from '../../src/engine/memory.ts';
import { mockDeadline } from '../../src/engine/mock.ts';
import {
  computedRank,
  meets,
  nextRankLine,
  type RankDef,
  type RankFacts,
  rankFacts,
  rankToRecord,
  shownRank,
} from '../../src/engine/ranks.ts';
import { derive, type Progress } from '../../src/engine/replay.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf, examStartOf, submitOf } from '../fixtures/memory.ts';

/** The spec 3.4 rank ladder with made-up facts, so these tests never depend on content/game/ranks.yaml. */
const RANKS: RankDef[] = [
  { id: 'basic', name: 'Basic', short: 'Basic', requires: {}, facts: [] },
  {
    id: 'business-support-plus',
    name: 'Business Support+',
    short: 'Business+',
    requires: { bosses: 5, hexesAt60: 5 },
    facts: ['A made-up first fact.', 'A made-up second fact.'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    short: 'Enterprise',
    requires: { bosses: 13, hexesAt60: 13 },
    facts: ['A made-up first fact.', 'A made-up second fact.'],
  },
  {
    id: 'unified-operations',
    name: 'Unified Operations',
    short: 'Unified Ops',
    requires: { unseenMocksAt80: 2, latestMockWithinDays: 14, ready: true },
    facts: ['A made-up first fact.', 'A made-up second fact.'],
  },
];
const [BASIC, PLUS, ENTERPRISE, UNIFIED] = RANKS as [RankDef, RankDef, RankDef, RankDef];

type Item = readonly [string, NewEvent];

const DAY1 = '2026-10-20';
const DAY2 = '2026-10-21';
const NOW = new Date(at(DAY2, 20));
const pad2 = (n: number): string => String(n).padStart(2, '0');
const bun = (m: number): string => `bun-${pad2(m)}`;
/** One tested concept per module, so each hex is that concept's mastery. */
const SPECS = Array.from({ length: 13 }, (_, i) => ({ id: bun(i + 1), module: i + 1, tasks: ['1.1'] }));
const CONTENT = contentOf(SPECS);

/** A right answer on day 1 gives a hex near 40; a second success day on day 2 lifts it near 80. */
const studied = (m: number, days: 1 | 2): Item[] => [
  [
    at(DAY1, 9, m),
    answerOf({ concept: bun(m), qid: `q-${bun(m)}-a`, mode: 'quiz', correct: true, sure: true }),
  ],
  ...(days === 2
    ? [
        [
          at(DAY2, 9, m),
          answerOf({ concept: bun(m), qid: `q-${bun(m)}-b`, mode: 'quiz', correct: true, sure: true }),
        ] as Item,
      ]
    : []),
];

const bossSid = (m: number): string => `01JA0000000000000000000B${pad2(m)}`;
/** A passed one-item boss of module `m`; its concept is unknown to the content, so memory ignores it. */
const boss = (m: number): Item[] => {
  const start = at(DAY2, 10, 3 * m);
  return [
    [
      start,
      examStartOf(bossSid(m), 'boss', [`q-boss-${m}`], {
        scope: `m${pad2(m)}`,
        deadline: mockDeadline(new Date(start)),
      }),
    ],
    [
      at(DAY2, 10, 3 * m + 1),
      answerOf({
        concept: 'boss-ghost',
        qid: `q-boss-${m}`,
        mode: 'boss',
        sid: bossSid(m),
        correct: true,
        sure: true,
      }),
    ],
    [at(DAY2, 10, 3 * m + 2), submitOf(bossSid(m), 'boss')],
  ];
};

/** A mock of `form` with 10 items, `right` of them right; without `submit` it stops before the submit. */
const mock = (sid: string, form: string, right: number, hour: number, submit = true): Item[] => {
  const start = at(DAY2, hour);
  const qids = Array.from({ length: 10 }, (_, i) => `q-${form}-${i}`);
  return [
    [start, examStartOf(sid, 'mock', qids, { form, deadline: mockDeadline(new Date(start)) })],
    ...qids.map(
      (qid, i): Item => [
        at(DAY2, hour, i + 1),
        answerOf({ concept: 'mock-ghost', qid, mode: 'mock', sid, correct: i < right, sure: true }),
      ],
    ),
    ...(submit ? [[at(DAY2, hour, 30), submitOf(sid, 'mock')] as Item] : []),
  ];
};

const rankEvent = (rank: string): Item => [at(DAY2, 21), { t: 'rank', rank }];

const logOf = (items: readonly Item[]): StudyEvent[] =>
  timelineOf([...items].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));

function factsOf(
  events: readonly StudyEvent[],
  options: { now?: Date; ready?: boolean; content?: MemoryContent } = {},
): { facts: RankFacts; progress: Progress } {
  const now = options.now ?? NOW;
  const progress = derive(events, null);
  const mastery = moduleMastery(
    deriveMemory(events, options.content ?? CONTENT),
    options.content ?? CONTENT,
    now,
  );
  return {
    progress,
    facts: rankFacts({ progress, mastery, ready: options.ready ?? false, today: studyDayAt(now, 0) }),
  };
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);
const ENTERPRISE_LOG: Item[] = [...range(1, 13).flatMap((m) => studied(m, 2)), ...range(1, 13).flatMap(boss)];

describe('rank thresholds (spec 3.4), each crossed by exactly one event', () => {
  it('reaches Business Support+ with the fifth boss pass', () => {
    const base = [...range(1, 5).flatMap((m) => studied(m, 2)), ...range(1, 4).flatMap(boss)];
    const before = factsOf(logOf(base)).facts;
    expect([before.bossesPassed, before.hexesAt60]).toEqual([4, 5]);
    expect(computedRank(RANKS, before).id).toBe('basic');
    const after = factsOf(logOf([...base, ...boss(5)])).facts;
    expect(after.bossesPassed).toBe(5);
    expect(computedRank(RANKS, after).id).toBe('business-support-plus');
  });

  it('reaches Enterprise when one answer lifts the thirteenth hex to 60', () => {
    const base = [
      ...range(1, 12).flatMap((m) => studied(m, 2)),
      ...studied(13, 1),
      ...range(1, 13).flatMap(boss),
    ];
    const before = factsOf(logOf(base)).facts;
    expect([before.bossesPassed, before.hexesAt60]).toEqual([13, 12]);
    expect(computedRank(RANKS, before).id).toBe('business-support-plus');
    const after = factsOf(logOf(ENTERPRISE_LOG)).facts;
    expect(after.hexesAt60).toBe(13);
    expect(computedRank(RANKS, after).id).toBe('enterprise');
  });

  it('reaches Unified Operations with the second unseen form at 80% while readiness reads Ready', () => {
    const sidA = '01JA00000000000000000000UA';
    const sidB = '01JA00000000000000000000UB';
    const base = [...ENTERPRISE_LOG, ...mock(sidA, 'A', 9, 12), ...mock(sidB, 'B', 8, 14, false)];
    const before = factsOf(logOf(base), { ready: true }).facts;
    expect(computedRank(RANKS, before).id).toBe('enterprise');
    const after = factsOf(logOf([...base, [at(DAY2, 14, 30), submitOf(sidB, 'mock')]]), {
      ready: true,
    }).facts;
    expect(after.attempts.map((a) => [a.form, a.percent])).toEqual([
      ['A', 0.9],
      ['B', 0.8],
    ]);
    expect(computedRank(RANKS, after).id).toBe('unified-operations');
    expect(computedRank(RANKS, { ...after, ready: false }).id).toBe('enterprise');
  });

  it('needs the latest unseen mock at 80% within 14 days', () => {
    const facts: RankFacts = {
      bossesPassed: 0,
      hexesAt60: 0,
      attempts: [
        {
          form: 'A',
          sid: 's1',
          percent: 0.9,
          day: '2026-10-27',
          at: '2026-10-27T10:00:00.000Z',
          correct: 9,
          total: 10,
        },
        {
          form: 'B',
          sid: 's2',
          percent: 0.85,
          day: '2026-10-31',
          at: '2026-10-31T10:00:00.000Z',
          correct: 17,
          total: 20,
        },
      ],
      ready: true,
      today: '2026-11-14',
    };
    expect(meets(UNIFIED, facts)).toBe(true);
    expect(meets(UNIFIED, { ...facts, today: '2026-11-15' })).toBe(false);
  });
});

describe('a rank is never taken away (spec 3.4)', () => {
  it('keeps the rank after decay lowers the hexes', () => {
    const events = logOf([...ENTERPRISE_LOG, rankEvent('enterprise')]);
    const later = new Date(NOW.getTime() + 60 * 86_400_000);
    const { facts, progress } = factsOf(events, { now: later });
    expect(facts.hexesAt60).toBeLessThan(13);
    expect(computedRank(RANKS, facts).id).not.toBe('enterprise');
    expect(shownRank(RANKS, facts, progress.ranks).id).toBe('enterprise');
  });

  it('keeps the rank after a questionVersions bump makes old answers stale', () => {
    const events = logOf([
      ...range(1, 5).flatMap((m) => studied(m, 2)),
      ...range(1, 5).flatMap(boss),
      rankEvent('business-support-plus'),
    ]);
    const bumped = contentOf(
      SPECS,
      new Map(range(1, 13).flatMap((m) => [[`q-${bun(m)}-a`, 2] as const, [`q-${bun(m)}-b`, 2] as const])),
    );
    const { facts, progress } = factsOf(events, { content: bumped });
    expect(facts.hexesAt60).toBe(0);
    expect(computedRank(RANKS, facts).id).toBe('basic');
    expect(shownRank(RANKS, facts, progress.ranks).id).toBe('business-support-plus');
  });

  it('keeps the rank after an ENGINE_VERSION replay', () => {
    const events = logOf([...ENTERPRISE_LOG, rankEvent('enterprise')]);
    const stored = JSON.parse(JSON.stringify(events)) as StudyEvent[];
    const replayed = derive(stored, null);
    const { facts } = factsOf(stored);
    const lowered: RankFacts = { ...facts, bossesPassed: 0, hexesAt60: 0 };
    expect(computedRank(RANKS, lowered).id).toBe('basic');
    expect(shownRank(RANKS, lowered, replayed.ranks).id).toBe('enterprise');
  });

  it('never needs XP', () => {
    const lessons: Item[] = range(1, 1_000).map((n) => [
      new Date(Date.parse(at(DAY1, 5)) + n * 1_000).toISOString(),
      { t: 'lesson.done', note: `m01/lesson-${n}` },
    ]);
    const events = logOf(lessons);
    expect(deriveMemory(events, CONTENT).xp).toBeGreaterThanOrEqual(10_000);
    const { facts } = factsOf(events, { ready: true });
    expect(computedRank(RANKS, facts).id).toBe('basic');
  });
});

describe('rankToRecord', () => {
  const facts = (bossesPassed: number, hexesAt60: number): RankFacts => ({
    bossesPassed,
    hexesAt60,
    attempts: [],
    ready: false,
    today: DAY2,
  });

  it('records a computed rank above every recorded one and never Basic', () => {
    expect(rankToRecord(RANKS, facts(0, 0), new Set())).toBeNull();
    expect(rankToRecord(RANKS, facts(5, 5), new Set())?.id).toBe('business-support-plus');
    expect(rankToRecord(RANKS, facts(5, 5), new Set(['business-support-plus']))).toBeNull();
    expect(rankToRecord(RANKS, facts(5, 5), new Set(['enterprise']))).toBeNull();
    expect(rankToRecord(RANKS, facts(13, 13), new Set(['business-support-plus']))?.id).toBe('enterprise');
  });
});

describe('nextRankLine', () => {
  const facts: RankFacts = { bossesPassed: 3, hexesAt60: 4, attempts: [], ready: false, today: DAY2 };

  it('names the next rank and how far each requirement is', () => {
    expect(nextRankLine(RANKS, BASIC, facts, 'Close')).toBe('Business Support+: 3/5 bosses, 4/5 hexes at 60');
    expect(nextRankLine(RANKS, PLUS, { ...facts, bossesPassed: 9, hexesAt60: 8 }, 'Close')).toBe(
      'Enterprise: 9/13 bosses, 8/13 hexes at 60',
    );
    const oneForm: RankFacts = {
      ...facts,
      attempts: [
        { form: 'A', sid: 's1', percent: 0.85, day: DAY2, at: at(DAY2, 12), correct: 17, total: 20 },
        { form: 'B', sid: 's2', percent: 0.7, day: DAY2, at: at(DAY2, 13), correct: 14, total: 20 },
      ],
    };
    expect(nextRankLine(RANKS, ENTERPRISE, oneForm, 'Close')).toBe(
      'Unified Operations: 1/2 unseen mocks at 80, readiness Close',
    );
    expect(nextRankLine(RANKS, ENTERPRISE, oneForm, '-')).toBe(
      'Unified Operations: 1/2 unseen mocks at 80, readiness -',
    );
  });

  it('gives no line at the top rank', () => {
    expect(nextRankLine(RANKS, UNIFIED, facts, 'Ready')).toBeNull();
  });
});
