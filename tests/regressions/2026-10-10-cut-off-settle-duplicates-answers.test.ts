import { afterEach, describe, expect, it } from 'vitest';
import type { ContentIndex, QuestionView } from '../../schemas/chunks.ts';
import type { StudyEvent } from '../../schemas/events.ts';
import { examForms, index } from '../../src/app/content.ts';
import { newDraft, pick } from '../../src/app/exam-session.ts';
import { settleExam } from '../../src/app/exam-settle.ts';
import { events, kvRecords, progress } from '../../src/app/progress.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { eventsOf, SID } from '../fixtures/events.ts';
import { emptyIndexFields } from '../fixtures/index.ts';
import { answerOf, examStartOf } from '../fixtures/memory.ts';

/**
 * A settle wrote each answer and the submit in its own transaction, so a tab closed partway left some answers, no
 * submit and the draft in the log.
 * After a reload the exam was open again, and the next settle wrote every answer a second time; replay keeps the first
 * answer of a question, so a pick changed after the reload never counted (spec 4.3 and 8.1).
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
const START = examStartOf(SID, 'mock', QIDS, { form: 'A', deadline: '2026-10-10T09:30:00.000Z' });
const NOW = new Date('2026-10-10T09:31:00.000Z');

const setUp = (log: StudyEvent[], draft = newDraft(SID)): void => {
  index.value = IDX;
  examForms.value = new Map([['A', { form: 'A', questions: QIDS.map(view) }]]);
  events.value = log;
  kvRecords.value = { [KV_KEYS.examSession]: { value: draft, updatedAt: NOW.toISOString() } };
};

afterEach(() => {
  events.value = [];
  kvRecords.value = {};
  examForms.value = new Map();
  index.value = null;
});

describe('settling an exam', () => {
  it('adds every answer and the submit to the log in one step', async () => {
    setUp(eventsOf(START), pick(newDraft(SID), 'x-aaaaa1', ['a']));
    const seen: number[] = [];
    const stop = events.subscribe((log) => seen.push(log.length));
    await settleExam(SID, NOW);
    stop();
    expect(seen).toEqual([1, 4]);
  });

  it('writes no second answer for a question a cut-off settle already answered', async () => {
    const cut = answerOf({
      sid: SID,
      mode: 'mock',
      qid: 'x-aaaaa1',
      concept: 'sourdough-starter',
      picked: ['b'],
      correct: false,
      sure: false,
    });
    setUp(eventsOf(START, cut), pick(newDraft(SID), 'x-aaaaa1', ['a']));
    expect(await settleExam(SID, NOW)).toBe(true);
    const answers = events.value.filter((e) => e.t === 'answer');
    expect(answers.map((e) => e.qid).sort()).toEqual(QIDS);
    expect(progress.value.exams.get(SID)).toMatchObject({ answered: 1, total: 2 });
  });
});
