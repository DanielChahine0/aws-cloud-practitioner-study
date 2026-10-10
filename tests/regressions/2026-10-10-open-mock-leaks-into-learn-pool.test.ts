import { afterEach, describe, expect, it } from 'vitest';
import type { ContentIndex, ExamChunk, ExamItemRef, QuestionView } from '../../schemas/chunks.ts';
import { examForms, index } from '../../src/app/content.ts';
import { learnPoolNow } from '../../src/app/learn-pool.ts';
import { events } from '../../src/app/progress.ts';
import type { PoolQuestion } from '../../src/engine/select.ts';
import { eventsOf, SID } from '../fixtures/events.ts';
import { emptyIndexFields } from '../fixtures/index.ts';
import { abandonOf, examStartOf, submitOf } from '../fixtures/memory.ts';

/**
 * A form counted as taken as soon as its mock started, and every taken form's items joined the learn pool.
 * So with Mock A still open, a module quiz or review could pick a Form A item and show its key and explanations,
 * and Dani could then go back and answer the open mock (spec 3.11 and 4.3, "Peeking at mocks").
 */
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
  options: [],
  pairs: [],
  takeaway: 'The starter lives in the jar.',
  read: { route: '#/m/01/l/starters', text: 'The starter lives in the jar.' },
});
const ref: ExamItemRef = { version: 1, concept: 'sourdough-starter', task: '1.1', form: 'A', type: 'single' };
const IDX: ContentIndex = {
  contentVersion: 'test',
  modules: [],
  concepts: [],
  glossary: [],
  missions: [],
  questionVersions: { 'q-ppppp1': 1 },
  search: 'content/search.json',
  ...emptyIndexFields(),
  exam: {
    forms: [{ id: 'A', chunk: 'content/exam-a.0000aaaa.json', frozen: true, size: 1 }],
    items: { 'x-aaaaa1': ref },
  },
};
const PRACTICE: PoolQuestion[] = [
  { id: 'q-ppppp1', concept: 'sourdough-starter', note: 'm01/starters', type: 'single', module: 1 },
];
const START = examStartOf(SID, 'mock', ['x-aaaaa1'], { form: 'A', deadline: '2026-10-10T09:30:00.000Z' });
const ids = (pool: readonly PoolQuestion[]): string[] => pool.map((q) => q.id).sort();

afterEach(() => {
  events.value = [];
  examForms.value = new Map();
  index.value = null;
});

describe('the learn pool while a mock is open', () => {
  it('holds no item of the open form, and gains them once the mock is submitted or abandoned', () => {
    index.value = IDX;
    examForms.value = new Map<string, ExamChunk>([['A', { form: 'A', questions: [view('x-aaaaa1')] }]]);
    events.value = eventsOf(START);
    expect(ids(learnPoolNow(PRACTICE))).toEqual(['q-ppppp1']);
    events.value = eventsOf(START, submitOf(SID, 'mock'));
    expect(ids(learnPoolNow(PRACTICE))).toEqual(['q-ppppp1', 'x-aaaaa1']);
    events.value = eventsOf(START, abandonOf(SID, 'mock'));
    expect(ids(learnPoolNow(PRACTICE))).toEqual(['q-ppppp1', 'x-aaaaa1']);
  });
});
