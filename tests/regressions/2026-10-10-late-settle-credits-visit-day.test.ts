import { afterEach, describe, expect, it } from 'vitest';
import type { ContentIndex, QuestionView } from '../../schemas/chunks.ts';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { examForms, index } from '../../src/app/content.ts';
import { newDraft, pick } from '../../src/app/exam-session.ts';
import { settleExam } from '../../src/app/exam-settle.ts';
import { events, kvRecords, progress } from '../../src/app/progress.ts';
import { studyDay } from '../../src/engine/day.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { SID, timelineOf } from '../fixtures/events.ts';
import { emptyIndexFields } from '../fixtures/index.ts';
import { examStartOf, rankOf } from '../fixtures/memory.ts';

/**
 * A mock left open by closing the tab was settled on the next visit and stamped with that visit's time.
 * So a mock that ran out on Monday counted on Thursday: Thursday qualified as a study day with a mock done, and the
 * readiness window and mock attempts placed the mock there (spec 3.5 and 4.3).
 * The settle now stands at the deadline, the moment the mock ended, unless the log already holds a later event.
 */
const QIDS = ['x-aaaaa1', 'x-aaaaa2'];
const view = (id: string): QuestionView => ({
  id,
  version: 1,
  type: 'single',
  concept: 'sourdough-starter',
  note: 'm01/starters',
  task: '1.1',
  level: 1,
  stem: 'Which jar holds the starter?',
  select: null,
  options: [
    { id: 'a', text: 'The labelled jar', correct: true, why: 'It says so.' },
    { id: 'b', text: 'The empty jar', correct: false, why: 'It is empty.' },
  ],
  pairs: [],
  takeaway: 'Label the jars.',
  read: { route: '#/m/01/l/starters', text: 'Label the jars.' },
});
const IDX: ContentIndex = {
  contentVersion: 'test',
  modules: [],
  concepts: [],
  glossary: [],
  missions: [],
  questionVersions: {},
  search: 'content/search.json',
  ...emptyIndexFields(),
  exam: {
    forms: [{ id: 'A', chunk: 'content/exam-a.0000aaaa.json', frozen: true, size: 2 }],
    items: Object.fromEntries(
      QIDS.map((id) => [
        id,
        { version: 1, concept: 'sourdough-starter', task: '1.1', form: 'A', type: 'single' },
      ]),
    ),
  },
};
const DEADLINE = '2026-10-12T11:30:00.000Z';
const START: [string, NewEvent] = [
  '2026-10-12T10:00:00.000Z',
  examStartOf(SID, 'mock', QIDS, { form: 'A', deadline: DEADLINE }),
];
const THURSDAY = new Date('2026-10-15T11:00:00.000Z');

const setUp = (log: StudyEvent[]): void => {
  index.value = IDX;
  examForms.value = new Map([['A', { form: 'A', questions: QIDS.map(view) }]]);
  events.value = log;
  kvRecords.value = {
    [KV_KEYS.examSession]: { value: pick(newDraft(SID), 'x-aaaaa1', ['a']), updatedAt: START[0] },
  };
};

afterEach(() => {
  events.value = [];
  kvRecords.value = {};
  examForms.value = new Map();
  index.value = null;
});

describe('settling a mock on a visit after its deadline', () => {
  it('stamps the submit at the deadline, so the mock counts on the day it ran out', async () => {
    setUp(timelineOf([START]));
    expect(await settleExam(SID, THURSDAY)).toBe(true);
    const result = progress.value.exams.get(SID);
    expect(result).toMatchObject({ submittedAt: DEADLINE, timedOut: true, correct: 1 });
    expect(result?.day).toBe(studyDay(new Date(DEADLINE)));
  });

  it('stamps it after the last event when the log already holds a later one', async () => {
    const later = '2026-10-13T08:00:00.000Z';
    setUp(timelineOf([START, [later, rankOf('r1')]]));
    expect(await settleExam(SID, THURSDAY)).toBe(true);
    const ids = events.value.map((e) => e.id);
    expect(events.value.at(-1)?.t).toBe('session');
    expect(ids).toEqual([...ids].sort());
    expect(Date.parse(progress.value.exams.get(SID)?.submittedAt ?? '')).toBeGreaterThan(Date.parse(later));
  });

  it('stamps a submit before the deadline at the time it was made', async () => {
    setUp(timelineOf([START]));
    const early = new Date('2026-10-12T11:00:00.000Z');
    expect(await settleExam(SID, early)).toBe(true);
    expect(progress.value.exams.get(SID)).toMatchObject({
      submittedAt: early.toISOString(),
      timedOut: false,
    });
  });
});
