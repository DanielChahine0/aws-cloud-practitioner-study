import { describe, expect, it } from 'vitest';
import type { ContentIndex, ExamChunk, ExamItemRef } from '../../schemas/chunks.ts';
import { formsToLoad } from '../../src/app/learn-pool.ts';

/**
 * After a reload, a resumed check, quiz, focus quiz or review rendered before anything asked for the chunks of
 * taken forms, so the session dropped its exam items as unshipped and submitted without asking them.
 * The runners now wait for `formsToLoad` to come back empty before they show the session.
 */
const ref = (form: string): ExamItemRef => ({
  version: 1,
  concept: 'sourdough-starter',
  task: '1.1',
  form,
  type: 'single',
});
const EXAM: ContentIndex['exam'] = {
  forms: [
    { id: 'A', chunk: 'content/exam-a.0000aaaa.json', frozen: true, size: 1 },
    { id: 'B', chunk: 'content/exam-b.0000bbbb.json', frozen: true, size: 1 },
  ],
  items: { 'x-aaaaa1': ref('A'), 'x-bbbbb1': ref('B') },
};
const chunk = (form: string): ExamChunk => ({ form, questions: [] });
/** A module quiz started once Mock A was taken: nine practice items and one item of form A. */
const QUIZ = [...Array.from({ length: 9 }, (_, i) => `q-ppppp${i}`), 'x-aaaaa1'];

describe('a resumed learn session holding an item of a taken form', () => {
  it('waits for that form before it shows, instead of dropping the item', () => {
    expect(formsToLoad(QUIZ, [], EXAM, new Map())).toEqual(['A']);
  });

  it('shows once the form has loaded', () => {
    expect(formsToLoad(QUIZ, [], EXAM, new Map([['A', chunk('A')]]))).toEqual([]);
  });

  it('makes a review wait for every taken form, since its relearn variants come from their items', () => {
    expect(formsToLoad(['q-ppppp1'], ['A', 'B'], EXAM, new Map([['A', chunk('A')]]))).toEqual(['B']);
  });

  it('never waits for a form the index does not list', () => {
    expect(formsToLoad(['q-ppppp1', 'x-zzzzz1'], ['Z'], EXAM, new Map())).toEqual([]);
  });
});
