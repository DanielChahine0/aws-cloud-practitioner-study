import { describe, expect, it } from 'vitest';
import { type MatchQuestion, Question, type SingleQuestion } from '../../schemas/question.ts';
import { canonicalJson, correctKey, fullHash, keyHash } from '../../scripts/content/lib/hashes.ts';

const base = {
  id: 'q-b4k7m2',
  version: 1,
  status: 'live',
  pool: 'practice',
  concept: 'shared-kitchen',
  note: 'm01/what-a-bakery-cloud-is',
  task: '1.1',
  level: 2,
  stem: 'A branch runs out of ovens every Saturday morning. What should it do?',
  evidence: ['Branches use ovens from one central kitchen when their queues grow.'],
  takeaway: 'Borrow ovens when busy.',
};

const single = Question.parse({
  ...base,
  type: 'single',
  options: ['a', 'b', 'c', 'd'].map((id) => ({
    id,
    text: `Choice ${id} for the branch`,
    correct: id === 'a',
    why: `Why choice ${id} fits or not.`,
  })),
}) as SingleQuestion;

const match = Question.parse({
  ...base,
  type: 'match',
  pairs: [1, 2, 3].map((n) => ({ left: `Left ${n}`, right: `Right ${n}`, why: `Why pair ${n}.` })),
}) as MatchQuestion;

const withOption = (index: number, change: Partial<SingleQuestion['options'][number]>): SingleQuestion => ({
  ...single,
  options: single.options.map((o, i) => (i === index ? { ...o, ...change } : o)),
});
const moveCorrect = (q: SingleQuestion): SingleQuestion => ({
  ...q,
  options: q.options.map((o) => ({ ...o, correct: o.id === 'b' })),
});

describe('canonicalJson', () => {
  it('sorts keys, drops undefined members and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 1, c: 2 }], u: undefined })).toBe('{"a":[{"c":2,"d":1}],"b":1}');
  });
});

describe('keyHash and fullHash', () => {
  it('are 12 lowercase hex characters and ignore key order', () => {
    for (const hash of [keyHash(single), fullHash(single), keyHash(match), fullHash(match)])
      expect(hash).toMatch(/^[0-9a-f]{12}$/);
    const reordered = Object.fromEntries(Object.entries(single).reverse()) as SingleQuestion;
    expect(keyHash(reordered)).toBe(keyHash(single));
    expect(fullHash(reordered)).toBe(fullHash(single));
  });

  it('change only fullHash for a why, evidence or note edit', () => {
    for (const edited of [
      withOption(1, { why: 'A different reason.' }),
      { ...single, evidence: ['Another line.'] },
      { ...single, note: 'm01/another-note' },
      { ...match, pairs: match.pairs.map((p, i) => (i === 0 ? { ...p, why: 'Changed.' } : p)) },
    ]) {
      const before = edited.type === 'match' ? match : single;
      expect(keyHash(edited)).toBe(keyHash(before));
      expect(fullHash(edited)).not.toBe(fullHash(before));
    }
  });

  it('change both for a stem edit, an option text edit or a moved correct flag', () => {
    for (const edited of [
      { ...single, stem: `${single.stem} Pick one.` },
      withOption(2, { text: 'A new choice' }),
      moveCorrect(single),
    ]) {
      expect(keyHash(edited)).not.toBe(keyHash(single));
      expect(fullHash(edited)).not.toBe(fullHash(single));
    }
  });
});

describe('correctKey', () => {
  it('ignores option text edits and follows the correct flag', () => {
    expect(correctKey(single)).toBe('a');
    expect(correctKey(withOption(2, { text: 'A new choice' }))).toBe('a');
    expect(correctKey(moveCorrect(single))).toBe('b');
  });

  it('lists a match key as its pairs without whys', () => {
    expect(correctKey(match)).toBe(
      '[{"left":"Left 1","right":"Right 1"},{"left":"Left 2","right":"Right 2"},{"left":"Left 3","right":"Right 3"}]',
    );
  });
});
