import { describe, expect, it } from 'vitest';
import { ConfigureSpec } from '../../schemas/lab.ts';
import { configureTexts } from '../../scripts/content/lib/labs.ts';
import { CONFIGURE, type ConfigureState } from '../../src/labs/configure/model.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { checkLab, ENGINES } from '../../src/labs/engines.ts';
import { bakeryConfigureLab } from '../fixtures/lab-specs.ts';

const lab = bakeryConfigureLab();
const spec = ConfigureSpec.parse(lab.spec);
const run = (actions: readonly unknown[]): ConfigureState =>
  replayLab(CONFIGURE, spec, actions as Parameters<typeof CONFIGURE.reduce>[1][]);
const words = (state: ConfigureState) =>
  CONFIGURE.check(spec, state).map((r) => [r.goalId, r.pass, r.message]);

describe('the Configure checker', () => {
  it('starts from every field initial and fails every goal', () => {
    const start = CONFIGURE.init(spec);
    expect(start.values).toEqual({ oven: 'small-oven', rental: 'monthly', door: true });
    expect(words(start)).toEqual([
      ['g1', false, '0 of 1 settings right'],
      ['g2', false, '0 of 2 settings right'],
    ]);
  });

  it('passes every goal with the solution', () => {
    expect(allPass(CONFIGURE.check(spec, run(lab.solution)))).toBe(true);
    expect(words(run(lab.solution))).toEqual([
      ['g1', true, '1 of 1 settings right'],
      ['g2', true, '2 of 2 settings right'],
    ]);
  });

  it('counts a wrong option against its goal only', () => {
    const state = run([
      { t: 'set', field: 'oven', value: 'deck-oven' },
      { t: 'set', field: 'rental', value: 'per-minute' },
    ]);
    expect(words(state)).toEqual([
      ['g1', true, '1 of 1 settings right'],
      ['g2', false, '1 of 2 settings right'],
    ]);
  });

  it.each([
    ['an unknown field', { t: 'set', field: 'chimney', value: 'deck-oven' }],
    ['an option of another field', { t: 'set', field: 'oven', value: 'per-minute' }],
    ['a boolean for a select', { t: 'set', field: 'oven', value: true }],
    ['an option id for a toggle', { t: 'set', field: 'door', value: 'deck-oven' }],
    ['an unknown action', { t: 'place', card: 'oven', bucket: 'deck-oven' }],
    ['a value that is not an object', 'set'],
    ['null', null],
  ])('ignores %s and returns the same state object', (_, action) => {
    const start = CONFIGURE.init(spec);
    expect(CONFIGURE.reduce(start, action as never)).toBe(start);
  });

  it('reset restores every initial value', () => {
    expect(run([...lab.solution, { t: 'reset' }]).values).toEqual(CONFIGURE.init(spec).values);
  });

  it('names the fields whose rule fails in the hint, in rule order', () => {
    const start = CONFIGURE.init(spec);
    expect(CONFIGURE.hint(spec, start, 'g1')).toBe('Look again at Oven.');
    expect(CONFIGURE.hint(spec, start, 'g2')).toBe(
      'Look again at Rental and Leave the back door open to everyone.',
    );
    expect(CONFIGURE.hint(spec, run(lab.solution), 'g2')).toBe('Every setting of this goal is right.');
  });

  it('checks the same through the engine registry, which settles nothing and is always complete', () => {
    const entry = ENGINES.configure;
    if (entry === undefined) throw new Error('configure is not registered');
    const state = run(lab.solution);
    expect(entry.settle).toEqual([]);
    expect(entry.complete(spec, CONFIGURE.init(spec))).toBe(true);
    expect(checkLab(entry, spec, state)).toEqual(CONFIGURE.check(spec, state));
  });

  it('gives R7 every field label, option label and detail', () => {
    expect(configureTexts(lab.spec)).toEqual([
      'Oven',
      'Small oven',
      'Holds 6 trays.',
      'Deck oven',
      'Holds 20 trays.',
      'Tunnel oven',
      'Holds 200 trays and needs a crew of four.',
      'Rental',
      'Per minute',
      'Billed only while the oven is on.',
      'Monthly',
      'One fixed fee, on or off.',
      'Leave the back door open to everyone',
    ]);
    expect(configureTexts({ fields: [] })).toEqual([]);
  });
});
