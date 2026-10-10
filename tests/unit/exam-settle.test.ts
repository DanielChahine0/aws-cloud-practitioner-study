import { afterEach, describe, expect, it } from 'vitest';
import type { ContentIndex, QuestionView } from '../../schemas/chunks.ts';
import type { StudyEvent } from '../../schemas/events.ts';
import { examForms, index } from '../../src/app/content.ts';
import { newDraft, pick } from '../../src/app/exam-session.ts';
import { openExam, settleExam } from '../../src/app/exam-settle.ts';
import { events, kvRecords, progress } from '../../src/app/progress.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { eventsOf, SID } from '../fixtures/events.ts';
import { emptyIndexFields } from '../fixtures/index.ts';

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
const START: StudyEvent[] = eventsOf({
  t: 'session',
  sid: SID,
  mode: 'mock',
  phase: 'start',
  seed: 7,
  form: 'A',
  qids: QIDS,
  deadline: '2026-10-10T09:30:00.000Z',
});
const NOW = new Date('2026-10-10T09:31:00.000Z');

const setUp = (): void => {
  index.value = IDX;
  examForms.value = new Map([['A', { form: 'A', questions: QIDS.map(view) }]]);
  events.value = START;
  kvRecords.value = {
    [KV_KEYS.examSession]: { value: pick(newDraft(SID), 'x-aaaaa1', ['a']), updatedAt: NOW.toISOString() },
  };
};

afterEach(() => {
  events.value = [];
  kvRecords.value = {};
  examForms.value = new Map();
  index.value = null;
});

describe('settleExam', () => {
  it('two settle calls for one session record one set of events', async () => {
    setUp();
    const results = await Promise.all([settleExam(SID, NOW), settleExam(SID, NOW)]);
    expect(results.sort()).toEqual([false, true]);
    expect(events.value.slice(1).map((e) => e.t)).toEqual(['answer', 'answer', 'session']);
    expect(progress.value.exams.get(SID)).toMatchObject({
      correct: 1,
      answered: 1,
      total: 2,
      timedOut: true,
    });
    expect(kvRecords.value[KV_KEYS.examSession]?.value).toBeNull();
    expect(openExam(progress.value)).toBeNull();
  });

  it('settles nothing for a session that is already submitted', async () => {
    setUp();
    expect(await settleExam(SID, NOW)).toBe(true);
    const count = events.value.length;
    expect(await settleExam(SID, NOW)).toBe(false);
    expect(events.value).toHaveLength(count);
  });

  it('finds the open exam until it is settled', () => {
    setUp();
    expect(openExam(progress.value)?.sid).toBe(SID);
  });
});
