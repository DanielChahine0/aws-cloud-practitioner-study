import { describe, expect, it } from 'vitest';
import type { OptionView, QuestionView } from '../../schemas/chunks.ts';
import { canSubmit, displayOrder, endLine, isCorrect, modeLabel } from '../../src/app/runner.ts';

const option = (id: string, correct = false): OptionView => ({
  id,
  text: `Bakery option ${id}`,
  correct,
  why: `Why option ${id} is right or wrong for the bakery.`,
});

const base = {
  version: 1,
  concept: 'shared-kitchen',
  note: 'm01/what-a-bakery-cloud-is',
  task: '1.1',
  level: 2 as const,
  stem: 'A bakery wants more ovens on busy mornings. Which choice fits?',
  takeaway: 'Share the central kitchen.',
  read: { route: '#/m/01/l/what-a-bakery-cloud-is/shared-kitchen', text: 'A line.' },
};

const single: QuestionView = {
  ...base,
  id: 'q-aaaaaa',
  type: 'single',
  select: null,
  options: [option('a'), option('b', true), option('c'), option('d')],
  pairs: [],
};

const multi: QuestionView = {
  ...base,
  id: 'q-bbbbbb',
  type: 'multi',
  select: 2,
  options: [option('a', true), option('b'), option('c', true), option('d'), option('e')],
  pairs: [],
};

const match: QuestionView = {
  ...base,
  id: 'q-cccccc',
  type: 'match',
  select: null,
  options: [],
  pairs: [
    { left: 'Proofing cabinet', right: 'Billed by the minute', why: 'Why the cabinet pairs this way here.' },
    { left: 'Oven', right: 'Shared across branches', why: 'Why the oven pairs this way for branches.' },
    { left: 'Mixer', right: 'Kept in each branch', why: 'Why the mixer pairs this way for branches.' },
  ],
};

describe('canSubmit', () => {
  it('needs one pick for a single', () => {
    expect(canSubmit(single, [])).toBe(false);
    expect(canSubmit(single, ['b'])).toBe(true);
    expect(canSubmit(single, ['a', 'b'])).toBe(false);
  });

  it('needs exactly select picks for a multi', () => {
    expect(canSubmit(multi, ['a'])).toBe(false);
    expect(canSubmit(multi, ['a', 'c'])).toBe(true);
    expect(canSubmit(multi, ['a', 'c', 'd'])).toBe(false);
  });

  it('needs every left paired for a match', () => {
    expect(
      canSubmit(match, [
        ['l1', 'r1'],
        ['l2', 'r2'],
      ]),
    ).toBe(false);
    expect(
      canSubmit(match, [
        ['l1', 'r2'],
        ['l2', 'r1'],
        ['l3', 'r3'],
      ]),
    ).toBe(true);
  });
});

describe('isCorrect', () => {
  it('compares the picked set with the correct set', () => {
    expect(isCorrect(single, ['b'])).toBe(true);
    expect(isCorrect(single, ['a'])).toBe(false);
    expect(isCorrect(multi, ['c', 'a'])).toBe(true);
    expect(isCorrect(multi, ['a', 'b'])).toBe(false);
  });

  it('wants every left paired with its own right in a match', () => {
    expect(
      isCorrect(match, [
        ['l2', 'r2'],
        ['l1', 'r1'],
        ['l3', 'r3'],
      ]),
    ).toBe(true);
    expect(
      isCorrect(match, [
        ['l1', 'r2'],
        ['l2', 'r1'],
        ['l3', 'r3'],
      ]),
    ).toBe(false);
    expect(isCorrect(match, [['l1', 'r1']])).toBe(false);
  });
});

describe('displayOrder', () => {
  it('is a permutation of the option ids, or of r1 to rN for a match', () => {
    expect([...displayOrder(single, 7)].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect([...displayOrder(match, 7)].sort()).toEqual(['r1', 'r2', 'r3']);
  });

  it('is stable for one seed and differs between questions and seeds', () => {
    expect(displayOrder(multi, 42)).toEqual(displayOrder(multi, 42));
    const orders = new Set<string>();
    for (let seed = 0; seed < 20; seed++) orders.add(displayOrder(multi, seed).join(''));
    expect(orders.size).toBeGreaterThan(1);
    const other = { ...multi, id: 'q-dddddd' };
    const differs = Array.from({ length: 20 }, (_, seed) => seed).some(
      (seed) => displayOrder(multi, seed).join('') !== displayOrder(other, seed).join(''),
    );
    expect(differs).toBe(true);
  });
});

describe('labels', () => {
  it('writes the end line and the mode names', () => {
    expect(endLine(9, 12)).toBe('9/12 correct');
    expect(modeLabel('check')).toBe('Lesson check');
    expect(modeLabel('quiz')).toBe('Module quiz');
  });
});
