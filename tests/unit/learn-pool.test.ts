import { afterEach, describe, expect, it } from 'vitest';
import type { ContentIndex, ExamChunk, ExamItemRef, QuestionView } from '../../schemas/chunks.ts';
import { examForms, index } from '../../src/app/content.ts';
import { examPoolOf, learnPoolNow } from '../../src/app/learn-pool.ts';
import { events } from '../../src/app/progress.ts';
import { derive, takenForms } from '../../src/engine/replay.ts';
import { learnPool, type PoolQuestion } from '../../src/engine/select.ts';
import { eventsOf, SID } from '../fixtures/events.ts';
import { emptyIndexFields } from '../fixtures/index.ts';

/** A made-up bakery exam item; only its id, note and type matter here. */
const view = (id: string, note: string): QuestionView => ({
  id,
  version: 1,
  type: 'single',
  concept: 'sourdough-starter',
  note,
  task: '1.1',
  level: 1,
  stem: 'Which jar holds the starter?',
  select: null,
  options: [],
  pairs: [],
  takeaway: 'The starter lives in the jar.',
  read: { route: '#/m/01/l/starters', text: 'The starter lives in the jar.' },
});
const ref = (form: string): ExamItemRef => ({
  version: 1,
  concept: 'sourdough-starter',
  task: '1.1',
  form,
  type: 'single',
});
const ITEMS: Record<string, ExamItemRef> = { 'x-aaaaa1': ref('A'), 'x-bbbbb1': ref('B') };
const FORMS = new Map<string, ExamChunk>([
  ['A', { form: 'A', questions: [view('x-aaaaa1', 'm01/starters')] }],
  ['B', { form: 'B', questions: [view('x-bbbbb1', 'm02/ovens')] }],
]);
const PRACTICE: PoolQuestion[] = [
  { id: 'q-ppppp1', concept: 'sourdough-starter', note: 'm01/starters', type: 'single', module: 1 },
];
const MOCK_A_STARTED = eventsOf({
  t: 'session',
  sid: SID,
  mode: 'mock',
  phase: 'start',
  seed: 7,
  form: 'A',
  qids: ['x-aaaaa1'],
  deadline: '2026-10-10T09:30:00.000Z',
});
const MOCK_A_SUBMITTED = eventsOf(
  {
    t: 'session',
    sid: SID,
    mode: 'mock',
    phase: 'start',
    seed: 7,
    form: 'A',
    qids: ['x-aaaaa1'],
    deadline: '2026-10-10T09:30:00.000Z',
  },
  { t: 'session', sid: SID, mode: 'mock', phase: 'submit', seed: 7 },
);
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
    forms: [
      { id: 'A', chunk: 'content/exam-a.0000aaaa.json', frozen: true, size: 1 },
      { id: 'B', chunk: 'content/exam-b.0000bbbb.json', frozen: true, size: 1 },
    ],
    items: ITEMS,
  },
};
const ids = (pool: readonly PoolQuestion[]): string[] => pool.map((q) => q.id).sort();

afterEach(() => {
  events.value = [];
  examForms.value = new Map();
  index.value = null;
});

describe('examPoolOf', () => {
  it('tags each loaded form item with its form and module, and skips items the index does not list', () => {
    expect(examPoolOf(FORMS, ITEMS)).toEqual([
      {
        id: 'x-aaaaa1',
        concept: 'sourdough-starter',
        note: 'm01/starters',
        type: 'single',
        module: 1,
        form: 'A',
      },
      {
        id: 'x-bbbbb1',
        concept: 'sourdough-starter',
        note: 'm02/ovens',
        type: 'single',
        module: 2,
        form: 'B',
      },
    ]);
    expect(examPoolOf(FORMS, { 'x-aaaaa1': ref('A') }).map((q) => q.id)).toEqual(['x-aaaaa1']);
  });
});

describe('the learn pool (spec 4.3)', () => {
  it('a boss pool built after Mock A starts can hold a Form A item', () => {
    const taken = takenForms(derive(MOCK_A_STARTED, null));
    expect(ids(learnPool(PRACTICE, examPoolOf(FORMS, ITEMS), taken))).toEqual(['q-ppppp1', 'x-aaaaa1']);
  });

  it('holds no item of an untaken form', () => {
    expect(ids(learnPool(PRACTICE, examPoolOf(FORMS, ITEMS), new Set()))).toEqual(['q-ppppp1']);
    const taken = takenForms(derive(MOCK_A_STARTED, null));
    expect(ids(learnPool(PRACTICE, examPoolOf(FORMS, ITEMS), taken))).not.toContain('x-bbbbb1');
  });

  it('learnPoolNow adds the loaded items of forms whose mock is over only', () => {
    index.value = IDX;
    examForms.value = FORMS;
    expect(ids(learnPoolNow(PRACTICE))).toEqual(['q-ppppp1']);
    events.value = MOCK_A_SUBMITTED;
    expect(ids(learnPoolNow(PRACTICE))).toEqual(['q-ppppp1', 'x-aaaaa1']);
  });
});
