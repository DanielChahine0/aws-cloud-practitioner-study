import { describe, expect, it } from 'vitest';
import type { ExamItemRef } from '../../schemas/chunks.ts';
import { changeChunks, changeChunksLoaded, changeCounts } from '../../src/app/progress-lines.ts';
import type { MemoryContent } from '../../src/engine/memory.ts';
import type { AnswerRecord } from '../../src/engine/replay.ts';

const concept = (module: number, tested: boolean) => ({
  module,
  tested,
  confusableWith: [],
  splitFrom: null,
  tasks: [],
});

const content: MemoryContent = {
  concepts: new Map([
    ['c-made-up-live', concept(3, true)],
    ['c-made-up-untested', concept(4, false)],
  ]),
  aliases: new Map(),
  questionVersions: new Map(),
  examTasks: new Map(),
  coreLabs: new Map(),
  keptMissions: new Set(),
};

const changed = (qid: string, conceptId: string, mode: AnswerRecord['mode']): AnswerRecord =>
  ({
    id: `e-${qid}`,
    qid,
    qv: 1,
    sid: 'S1',
    mode,
    at: '2026-10-10T10:00:00.000Z',
    day: '2026-10-10',
    correct: true,
    sure: true,
    picked: ['a'],
    concept: conceptId,
    relearn: false,
    flagged: false,
    changes: [['b']],
  }) as AnswerRecord;

const items: Record<string, ExamItemRef> = {
  'x-made-up-1': { version: 1, concept: 'c-made-up-live', task: '1.1', form: 'A' } as ExamItemRef,
};

describe('the change verdict when a changed answer has no loaded question', () => {
  // A boss item retired since, an item whose concept is no longer tested, and a mock item.
  const records = [
    changed('q-made-up-retired', 'c-made-up-live', 'boss'),
    changed('q-made-up-untested', 'c-made-up-untested', 'boss'),
    changed('x-made-up-1', 'c-made-up-live', 'mock'),
  ];

  it('asks only for the chunks it can load', () => {
    expect(changeChunks(records, items, content)).toEqual({ forms: ['A'], modules: [3] });
  });

  it('stops loading once those chunks arrive, even though the retired question is not in them', () => {
    const chunks = changeChunks(records, items, content);
    expect(changeChunksLoaded(records, content, chunks, new Map(), new Map())).toBe(false);
    expect(changeChunksLoaded(records, content, chunks, new Map([[3, {}]]), new Map())).toBe(false);
    expect(changeChunksLoaded(records, content, chunks, new Map([[3, {}]]), new Map([['A', {}]]))).toBe(true);
    expect(changeCounts(records, new Map())).toEqual({ wrongToRight: 0, rightToWrong: 0 });
  });

  it('waits while the content index is still loading', () => {
    expect(changeChunksLoaded(records, null, { forms: [], modules: [] }, new Map(), new Map())).toBe(false);
    expect(changeChunksLoaded([], null, { forms: [], modules: [] }, new Map(), new Map())).toBe(true);
  });
});
