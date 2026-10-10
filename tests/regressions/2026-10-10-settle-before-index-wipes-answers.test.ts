import { afterEach, describe, expect, it } from 'vitest';
import type { ContentIndex, QuestionView } from '../../schemas/chunks.ts';
import { examForms, index } from '../../src/app/content.ts';
import { newDraft, pick } from '../../src/app/exam-session.ts';
import { settleExam } from '../../src/app/exam-settle.ts';
import { events, kvRecords, progress } from '../../src/app/progress.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { eventsOf, SID } from '../fixtures/events.ts';
import { emptyIndexFields } from '../fixtures/index.ts';
import { examStartOf } from '../fixtures/memory.ts';

/**
 * The exam ticker waited only for the log, and the content index loads on its own fetch.
 * When the log won the race on a reload past the deadline, `settleExam` ran with no index: a mock found no form to
 * load, so it recorded only the submit, scored 0 and cleared the draft; a boss waited forever on modules that the
 * loader never asked for, so it never settled (spec 4.3).
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
const DEADLINE = '2026-10-10T09:30:00.000Z';
const NOW = new Date('2026-10-10T09:31:00.000Z');
const DRAFT = pick(newDraft(SID), 'x-aaaaa1', ['a']);

afterEach(() => {
  events.value = [];
  kvRecords.value = {};
  examForms.value = new Map();
  index.value = null;
});

describe('settling an exam before the content index has loaded', () => {
  it('records nothing and keeps the draft, then scores the picks once the index arrives', async () => {
    examForms.value = new Map([['A', { form: 'A', questions: QIDS.map(view) }]]);
    events.value = eventsOf(examStartOf(SID, 'mock', QIDS, { form: 'A', deadline: DEADLINE }));
    kvRecords.value = { [KV_KEYS.examSession]: { value: DRAFT, updatedAt: NOW.toISOString() } };
    expect(await settleExam(SID, NOW)).toBe(false);
    expect(events.value).toHaveLength(1);
    expect(kvRecords.value[KV_KEYS.examSession]?.value).toEqual(DRAFT);
    index.value = IDX;
    expect(await settleExam(SID, NOW)).toBe(true);
    expect(progress.value.exams.get(SID)).toMatchObject({ correct: 1, answered: 1, total: 2 });
  });

  it('returns for a boss instead of waiting forever on its module chunks', async () => {
    events.value = eventsOf(examStartOf(SID, 'boss', ['q-ppppp1'], { scope: 'm01', deadline: DEADLINE }));
    const settled = await Promise.race([
      settleExam(SID, NOW),
      new Promise<'hung'>((resolve) => setTimeout(() => resolve('hung'), 200)),
    ]);
    expect(settled).toBe(false);
    expect(events.value).toHaveLength(1);
  });
});
