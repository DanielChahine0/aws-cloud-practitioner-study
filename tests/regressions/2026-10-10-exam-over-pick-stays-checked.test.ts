import { describe, expect, it } from 'vitest';
import { examPick, examPickable } from '../../src/app/exam.ts';

/**
 * On a 'select 2' exam item, a click on a third option was refused without a state change, so Preact never
 * re-rendered and the native checkbox stayed checked while the draft and the scored picks held two options.
 * The screen now disables every option the exam would refuse, so a refused click can never reach the checkbox.
 * Found in review of the exam shell (Phase 3 Task 18).
 */
const SELECT_2 = { type: 'multi', select: 2 } as const;
const IDS = ['a', 'b', 'c', 'd'];

describe('an exam over-pick', () => {
  it('is refused, and only the options it would refuse are disabled', () => {
    const chosen = ['a', 'b'];
    expect(examPick(SELECT_2, chosen, 'c')).toBeNull();
    expect(IDS.map((id) => examPickable(SELECT_2, chosen, id))).toEqual([true, true, false, false]);
  });

  it('agrees with the pick rule for every option and every pick count', () => {
    for (const chosen of [[], ['a'], ['a', 'b'], ['a', 'b', 'c']]) {
      for (const id of IDS)
        expect(examPickable(SELECT_2, chosen, id)).toBe(examPick(SELECT_2, chosen, id) !== null);
    }
  });

  it('toggles an option off and adds one under the cap', () => {
    expect(examPick(SELECT_2, ['a', 'b'], 'a')).toEqual(['b']);
    expect(examPick(SELECT_2, ['a'], 'c')).toEqual(['a', 'c']);
  });

  it('never refuses a single-answer item', () => {
    const single = { type: 'single', select: null } as const;
    expect(examPick(single, ['a'], 'b')).toEqual(['b']);
    expect(IDS.every((id) => examPickable(single, ['a'], id))).toBe(true);
  });
});
