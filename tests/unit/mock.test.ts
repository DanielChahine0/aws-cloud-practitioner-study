import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import type { FormItem, FormTargets } from '../../src/engine/forms.ts';
import {
  domainBars,
  FORMS,
  firstAttempts,
  MOCK_MINUTES,
  MOCK_WINDOW_DAYS,
  mockDeadline,
  mockHistory,
  mockQids,
  nextForm,
  RANK_MOCK_DAYS,
  REMIX,
} from '../../src/engine/mock.ts';
import { domainOf } from '../../src/engine/quotas.ts';
import { remixQids } from '../../src/engine/remix.ts';
import { derive } from '../../src/engine/replay.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, examStartOf, submitOf } from '../fixtures/memory.ts';

type Item = readonly [string, NewEvent];

const FORM = Array.from({ length: 10 }, (_, i) => `q-mock${String(i).padStart(2, '0')}`);
const SID_A = '01JA00000000000000000000MA';
const SID_A2 = '01JA00000000000000000000MB';
const SID_B = '01JA00000000000000000000MC';
const SID_R = '01JA00000000000000000000MD';

/** A mock session on `day` at `hour`: its first `right` qids answered right, the next `wrong` wrong, the rest blank. */
function mockLog(args: {
  sid: string;
  form: string;
  qids: readonly string[];
  right: number;
  wrong?: number;
  day: string;
  hour?: number;
  submit?: boolean;
}): Item[] {
  const hour = args.hour ?? 9;
  const start = at(args.day, hour);
  const answered = args.qids.slice(0, args.right + (args.wrong ?? 0));
  return [
    [
      start,
      examStartOf(args.sid, 'mock', args.qids, { form: args.form, deadline: mockDeadline(new Date(start)) }),
    ],
    ...answered.map(
      (qid, i): Item => [
        at(args.day, hour, i + 1),
        answerOf({
          concept: `c-${qid}`,
          qid,
          mode: 'mock',
          sid: args.sid,
          correct: i < args.right,
          sure: true,
        }),
      ],
    ),
    ...(args.submit === false ? [] : [[at(args.day, hour, 59), submitOf(args.sid, 'mock')] as Item]),
  ];
}

const progressOf = (...logs: Item[][]) => derive(timelineOf(logs.flat()), null);

/** Per-form task counts (spec 4.3): 16, 19, 22 and 8 by domain, 2, 2, 3 and 1 multi-response items. */
const TARGETS: FormTargets = {
  tasks: {
    '1.1': 4,
    '1.2': 2,
    '1.3': 7,
    '1.4': 3,
    '2.1': 3,
    '2.2': 10,
    '2.3': 3,
    '2.4': 3,
    '3.1': 2,
    '3.2': 2,
    '3.3': 4,
    '3.4': 3,
    '3.5': 2,
    '3.6': 4,
    '3.7': 3,
    '3.8': 2,
    '4.1': 3,
    '4.2': 1,
    '4.3': 4,
  },
  multi: { '1': 2, '2': 2, '3': 3, '4': 1 },
};

/** Seen items with one spare per task: one concept each, and the multi-response items on each domain's largest task. */
function seenItems(): FormItem[] {
  const items: FormItem[] = [];
  for (const [task, seats] of Object.entries(TARGETS.tasks)) {
    for (let i = 0; i <= seats; i++) {
      items.push({ id: `q-${task}-s${i}`, concept: `bun-${task}-s${i}`, task, type: 'single' });
    }
  }
  for (const [domain, count] of Object.entries(TARGETS.multi)) {
    const [task = ''] = Object.entries(TARGETS.tasks)
      .filter(([t]) => domainOf(t) === domain)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);
    for (let i = 0; i <= count; i++) {
      items.push({ id: `q-${task}-m${i}`, concept: `bun-${task}-m${i}`, task, type: 'multi' });
    }
  }
  return items;
}

describe('mock constants (spec 4.3)', () => {
  it('runs 90 minutes, reads 21 days for readiness and 14 for the rank, and names forms A to D', () => {
    expect(MOCK_MINUTES).toBe(90);
    expect(MOCK_WINDOW_DAYS).toBe(21);
    expect(RANK_MOCK_DAYS).toBe(14);
    expect(FORMS).toEqual(['A', 'B', 'C', 'D']);
    expect(REMIX).toBe('remix');
  });

  it('sets the deadline 90 minutes after the start on the wall clock', () => {
    expect(mockDeadline(new Date('2026-10-27T18:00:00.000Z'))).toBe('2026-10-27T19:30:00.000Z');
  });
});

describe('mockQids', () => {
  it('shuffles the live items of a form by the session seed and drops retired ones', () => {
    const live = new Set(FORM.filter((qid) => qid !== 'q-mock03'));
    const order = mockQids(FORM, live, 7);
    expect(order).toHaveLength(9);
    expect(order).not.toContain('q-mock03');
    expect([...order].sort()).toEqual([...live].sort());
    expect(order).not.toEqual(FORM.filter((qid) => live.has(qid)));
    expect(mockQids(FORM, live, 7)).toEqual(order);
    expect(mockQids(FORM, live, 8)).not.toEqual(order);
  });
});

describe('firstAttempts', () => {
  it('scores a frozen form over its live items and reports the count', () => {
    const qids = mockQids(FORM, new Set(FORM.filter((qid) => qid !== 'q-mock03')), 7);
    const p = progressOf(mockLog({ sid: SID_A, form: 'A', qids, right: 6, wrong: 1, day: '2026-10-27' }));
    expect(p.exams.get(SID_A)?.total).toBe(9);
    expect(firstAttempts(p)).toEqual([
      {
        form: 'A',
        sid: SID_A,
        percent: 6 / 9,
        day: '2026-10-27',
        at: at('2026-10-27', 9, 59),
        correct: 6,
        total: 9,
      },
    ]);
  });

  it('counts unanswered items as wrong', () => {
    const p = progressOf(mockLog({ sid: SID_A, form: 'A', qids: FORM, right: 4, day: '2026-10-27' }));
    expect(firstAttempts(p)[0]).toMatchObject({ correct: 4, total: 10, percent: 0.4 });
  });

  it('takes the first attempt of each form only', () => {
    const p = progressOf(
      mockLog({ sid: SID_A, form: 'A', qids: FORM, right: 5, day: '2026-10-27' }),
      mockLog({ sid: SID_B, form: 'B', qids: FORM, right: 8, day: '2026-10-31' }),
      mockLog({ sid: SID_A2, form: 'A', qids: FORM, right: 10, day: '2026-11-02' }),
    );
    expect(firstAttempts(p).map((a) => [a.form, a.sid, a.percent])).toEqual([
      ['A', SID_A, 0.5],
      ['B', SID_B, 0.8],
    ]);
    expect(mockHistory(p).map((a) => a.sid)).toEqual([SID_A2, SID_B, SID_A]);
  });

  it('never counts a remix as a first attempt', () => {
    const p = progressOf(mockLog({ sid: SID_R, form: REMIX, qids: FORM, right: 10, day: '2026-11-10' }));
    expect(firstAttempts(p)).toEqual([]);
    expect(mockHistory(p).map((a) => [a.form, a.percent])).toEqual([[REMIX, 1]]);
    expect(nextForm(p)).toBe('A');
  });

  it('waits for the submit before a started mock counts as an attempt', () => {
    const p = progressOf(
      mockLog({ sid: SID_A, form: 'A', qids: FORM, right: 3, day: '2026-10-27', submit: false }),
    );
    expect(firstAttempts(p)).toEqual([]);
    expect(mockHistory(p)).toEqual([]);
  });
});

describe('nextForm', () => {
  it('walks A to D as each form starts and gives null once all four are taken', () => {
    const logs: Item[][] = [];
    expect(nextForm(progressOf())).toBe('A');
    const sids = ['01JA00000000000000000000N1', '01JA00000000000000000000N2', '01JA00000000000000000000N3'];
    const days = ['2026-10-27', '2026-10-31', '2026-11-04'];
    for (const [i, form] of (['A', 'B', 'C'] as const).entries()) {
      logs.push(
        mockLog({ sid: sids[i] ?? '', form, qids: FORM, right: 1, day: days[i] ?? '', submit: form !== 'C' }),
      );
      expect(nextForm(progressOf(...logs))).toBe(FORMS[i + 1]);
    }
    logs.push(
      mockLog({ sid: '01JA00000000000000000000N4', form: 'D', qids: FORM, right: 1, day: '2026-11-09' }),
    );
    expect(nextForm(progressOf(...logs))).toBeNull();
  });
});

describe('remixQids', () => {
  it('builds 65 from seen items with the 16, 19, 22 and 8 split', () => {
    const items = seenItems();
    const byId = new Map(items.map((item) => [item.id, item] as const));
    const qids = remixQids({ items, targets: TARGETS, seed: 11 });
    expect(qids).not.toBeNull();
    const picked = (qids ?? []).map((qid) => byId.get(qid));
    expect(picked).toHaveLength(65);
    expect(picked.every((item) => item !== undefined)).toBe(true);
    const count = (key: (item: FormItem) => string, only?: (item: FormItem) => boolean) => {
      const out: Record<string, number> = {};
      for (const item of picked)
        if (item && (only?.(item) ?? true)) out[key(item)] = (out[key(item)] ?? 0) + 1;
      return out;
    };
    expect(count((item) => domainOf(item.task))).toEqual({ '1': 16, '2': 19, '3': 22, '4': 8 });
    expect(count((item) => item.task)).toEqual(TARGETS.tasks);
    expect(
      count(
        (item) => domainOf(item.task),
        (item) => item.type === 'multi',
      ),
    ).toEqual(TARGETS.multi);
    expect(new Set(picked.map((item) => item?.concept)).size).toBe(65);
    expect(remixQids({ items, targets: TARGETS, seed: 11 })).toEqual(qids);
  });

  it('returns null when the seen items cannot fill a form', () => {
    const items = seenItems().filter((item) => item.task !== '4.2');
    expect(remixQids({ items, targets: TARGETS, seed: 11 })).toBeNull();
  });
});

describe('domainBars', () => {
  it('splits a mock result by domain and sums to the result', () => {
    const qids = ['q-d1a', 'q-d1b', 'q-d2a', 'q-d3a', 'q-d3b', 'q-d3c', 'q-d4a'];
    const taskOf = new Map([
      ['q-d1a', '1.1'],
      ['q-d1b', '1.3'],
      ['q-d2a', '2.2'],
      ['q-d3a', '3.3'],
      ['q-d3b', '3.6'],
      ['q-d3c', '3.8'],
      ['q-d4a', '4.3'],
    ]);
    const p = progressOf(mockLog({ sid: SID_A, form: 'A', qids, right: 4, wrong: 2, day: '2026-10-27' }));
    const result = p.exams.get(SID_A);
    const session = p.sessions.get(SID_A);
    if (result === undefined || session === undefined) throw new Error('the mock did not replay');
    const bars = domainBars(result, session, taskOf);
    expect(bars).toEqual([
      { domain: '1', correct: 2, total: 2 },
      { domain: '2', correct: 1, total: 1 },
      { domain: '3', correct: 1, total: 3 },
      { domain: '4', correct: 0, total: 1 },
    ]);
    expect(bars.reduce((sum, bar) => sum + bar.correct, 0)).toBe(result.correct);
    expect(bars.reduce((sum, bar) => sum + bar.total, 0)).toBe(result.total);
  });
});
