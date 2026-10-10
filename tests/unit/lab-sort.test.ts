import { describe, expect, it } from 'vitest';
import type { SortAction, SortSpec } from '../../schemas/lab.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { checkLab, ENGINES, engineOf } from '../../src/labs/engines.ts';
import { SORT, sortComplete } from '../../src/labs/sort/model.ts';
import { bakeryLab } from '../fixtures/labs.ts';

const LAB = bakeryLab();
const SPEC = LAB.spec as SortSpec;
const SOLUTION = LAB.solution as SortAction[];
const place = (card: string, bucket: string): SortAction => ({ t: 'place', card, bucket });
const play = (...actions: SortAction[]) => replayLab(SORT, SPEC, actions);
const messages = (actions: SortAction[], spec: SortSpec = SPEC) =>
  SORT.check(spec, replayLab(SORT, spec, actions)).map(
    (r) => `${r.goalId} ${r.pass ? 'pass' : 'fail'} ${r.message}`,
  );

describe('Sort checker (spec 5.1, 9)', () => {
  it('fails every goal on the starting board', () => {
    expect(messages([])).toEqual(['g1 fail 0 of 2 right', 'g2 fail 0 of 2 right']);
  });

  it('passes every goal with the solution', () => {
    expect(messages(SOLUTION)).toEqual(['g1 pass 2 of 2 right', 'g2 pass 2 of 2 right']);
    expect(allPass(SORT.check(SPEC, play(...SOLUTION)))).toBe(true);
  });

  it('counts an allowed alternative bucket as right', () => {
    const cards = SPEC.cards.map((c) =>
      c.id === 'harbour-trays' ? { ...c, also: ['per-minute-rental'] } : c,
    );
    const spec: SortSpec = { ...SPEC, cards };
    const moved = SOLUTION.map((a) =>
      a.t === 'place' && a.card === 'harbour-trays' ? place('harbour-trays', 'per-minute-rental') : a,
    );
    expect(messages(moved, spec)).toEqual(['g1 pass 2 of 2 right', 'g2 pass 2 of 2 right']);
  });

  it('gives 1 of 2 right for a card in the wrong bucket', () => {
    expect(messages([...SOLUTION, place('saturday-ovens', 'per-minute-rental')])).toEqual([
      'g1 fail 1 of 2 right',
      'g2 pass 2 of 2 right',
    ]);
  });

  it('takes a card back with unplace and clears the board with reset', () => {
    expect(play(...SOLUTION, { t: 'unplace', card: 'forty-minutes' }).placed).toEqual({
      'saturday-ovens': 'shared-kitchen',
      'harbour-trays': 'shared-kitchen',
      'empty-overnight': 'per-minute-rental',
    });
    expect(play(...SOLUTION, { t: 'reset' })).toEqual(SORT.init(SPEC));
  });

  it('returns the same state object for an unknown card, bucket or action', () => {
    const state = play(place('saturday-ovens', 'shared-kitchen'));
    const junk = [
      place('rye-loaf', 'shared-kitchen'),
      place('saturday-ovens', 'bread-van'),
      { t: 'unplace', card: 'rye-loaf' },
      { t: 'drag', card: 'saturday-ovens' },
      null,
      'place',
      [],
    ] as unknown as SortAction[];
    for (const action of junk) expect(SORT.reduce(state, action)).toBe(state);
  });

  it('is complete only once no card is left in the tray', () => {
    expect(sortComplete(SPEC, play(...SOLUTION.slice(0, 3)))).toBe(false);
    expect(sortComplete(SPEC, play(...SOLUTION))).toBe(true);
  });

  it('checks through the registry with no settle actions, exactly as check does', () => {
    const entry = engineOf('sort');
    expect(entry).toBe(ENGINES.sort);
    expect(engineOf('place')).toBeNull();
    expect(engineOf('toString')).toBeNull();
    if (entry === null) throw new Error('Sort ships in Phase 4');
    expect(entry.settle).toEqual([]);
    const state = play(place('saturday-ovens', 'shared-kitchen'));
    expect(checkLab(entry, SPEC, state)).toEqual(SORT.check(SPEC, state));
    expect(entry.complete(SPEC, play(...SOLUTION))).toBe(true);
  });

  it('says what is left for a goal in one sentence', () => {
    expect(SORT.hint(SPEC, play(), 'g1')).toBe('2 cards still in the tray.');
    expect(SORT.hint(SPEC, play(place('saturday-ovens', 'per-minute-rental')), 'g1')).toBe(
      '1 card still in the tray and 1 card in the wrong bucket.',
    );
    expect(
      SORT.hint(
        SPEC,
        play(place('saturday-ovens', 'per-minute-rental'), place('harbour-trays', 'per-minute-rental')),
        'g1',
      ),
    ).toBe('2 cards in the wrong bucket.');
    expect(SORT.hint(SPEC, play(...SOLUTION), 'g2')).toBe('Every card of this goal is in place.');
  });
});
