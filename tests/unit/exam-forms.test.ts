import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContentIndex, ExamChunk } from '../../schemas/chunks.ts';
import { ensureExamForm, examForms, index } from '../../src/app/content.ts';
import { events, progress } from '../../src/app/progress.ts';
import { eventsOf } from '../fixtures/events.ts';
import { emptyIndexFields } from '../fixtures/index.ts';
import { answerOf } from '../fixtures/memory.ts';

/** A made-up index with forms A and B, each holding one made-up item. */
const IDX: ContentIndex = {
  contentVersion: 'test',
  modules: [],
  concepts: [],
  glossary: [],
  missions: [],
  questionVersions: { 'q-prac01': 1 },
  search: 'content/search.json',
  ...emptyIndexFields(),
  exam: {
    forms: [
      { id: 'A', chunk: 'content/exam-a.0000000a.json', frozen: true, size: 1 },
      { id: 'B', chunk: 'content/exam-b.0000000b.json', frozen: true, size: 1 },
    ],
    items: {
      'q-exam0a': { version: 2, concept: 'shared-kitchen', task: '1.1', form: 'A', type: 'single' },
      'q-exam0b': { version: 1, concept: 'shared-kitchen', task: '1.1', form: 'B', type: 'single' },
    },
  },
};
const CHUNK_A: ExamChunk = { form: 'A', questions: [] };

const ok = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body) }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ensureExamForm', () => {
  it('loads a form chunk once, by its id in the index, and keeps it', async () => {
    index.value = IDX;
    const fetch = vi.fn((_url: string) => Promise.resolve(ok(CHUNK_A)));
    vi.stubGlobal('fetch', fetch);
    const [first, second] = await Promise.all([ensureExamForm('A'), ensureExamForm('A')]);
    expect(first).toEqual(CHUNK_A);
    expect(second).toEqual(CHUNK_A);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['content/exam-a.0000000a.json']);
    expect(examForms.value.get('A')).toEqual(CHUNK_A);
    expect(await ensureExamForm('A')).toEqual(CHUNK_A);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('resolves null for an unknown form or a failed fetch, and a later call retries', async () => {
    index.value = IDX;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    expect(await ensureExamForm('E')).toBeNull();
    expect(await ensureExamForm('B')).toBeNull();
    expect(examForms.value.has('B')).toBe(false);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(ok({ form: 'B', questions: [] }))),
    );
    expect(await ensureExamForm('B')).toEqual({ form: 'B', questions: [] });
  });
});

describe('content refs for replay', () => {
  it('knows form items by their version, so mock answers never count as unknown', () => {
    index.value = IDX;
    events.value = eventsOf(
      answerOf({
        concept: 'shared-kitchen',
        qid: 'q-exam0a',
        qv: 2,
        mode: 'mock',
        correct: true,
        sure: true,
      }),
      answerOf({ concept: 'shared-kitchen', qid: 'q-prac01', correct: true, sure: true }),
    );
    expect(progress.value.unknownEvents).toBe(0);
    events.value = eventsOf(
      answerOf({ concept: 'shared-kitchen', qid: 'q-ghost1', correct: true, sure: true }),
    );
    expect(progress.value.unknownEvents).toBe(1);
  });
});
