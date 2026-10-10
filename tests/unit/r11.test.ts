import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LabFile, SortAction, SortSpec } from '../../schemas/lab.ts';
import { type LabEntry, loadContext } from '../../scripts/content/lib/context.ts';
import { labProblems, r11 } from '../../scripts/content/rules/r11-labs.ts';
import { replayLab } from '../../src/labs/contract.ts';
import type { AnyLabEngine, EngineEntry } from '../../src/labs/engines.ts';
import { SORT, type SortState } from '../../src/labs/sort/model.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';
import { bakeryConfigureLab } from '../fixtures/lab-specs.ts';
import { bakeryLab, dropFixtureLab, writeLab } from '../fixtures/labs.ts';

/** The engine `engineOf` hands R11: the real registry while `entry` is undefined, else this stub (null: none). */
const stub = vi.hoisted(() => ({ entry: undefined as EngineEntry | null | undefined }));
vi.mock('../../src/labs/engines.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../src/labs/engines.ts')>();
  return { ...real, engineOf: (id: string) => (stub.entry === undefined ? real.engineOf(id) : stub.entry) };
});
afterEach(() => {
  stub.entry = undefined;
});

const LAB = bakeryLab();
const SPEC = LAB.spec as SortSpec;
const SOLUTION = LAB.solution as SortAction[];
const [WRONG_OVENS, WRONG_CABINET] = LAB.wrongPaths;
if (WRONG_OVENS === undefined || WRONG_CABINET === undefined)
  throw new Error('the bakery lab has two wrong paths');

/** R11 messages after `edit` changes the fixture tree (by default: nothing). */
function r11Of(edit: (root: string) => void = () => {}): string[] {
  const root = makeFixtureRoot();
  edit(root);
  return r11.run(loadContext(root, { today: FIXTURE_TODAY })).map((f) => f.message);
}
const withLab = (lab: unknown) => (root: string) => writeLab(root, lab);
const withCards = (cards: SortSpec['cards']) => withLab({ ...LAB, spec: { ...SPEC, cards } });

describe('R11 labs replay (spec 2.9)', () => {
  it('passes the fixture lab, a retired lab whose solution misses, and a tree with no labs', () => {
    expect(r11Of()).toEqual([]);
    expect(r11Of(withLab(bakeryLab({ status: 'retired', solution: SOLUTION.slice(0, 1) })))).toEqual([]);
    expect(r11Of(dropFixtureLab)).toEqual([]);
  });

  it('reports an engine this build does not ship', () => {
    stub.entry = null;
    expect(r11Of()).toEqual(['lab-m01-sort-the-bakes: engine sort is not available yet']);
  });

  it('reports a spec or an action that breaks the engine schemas', () => {
    expect(r11Of(withCards(SPEC.cards.map((c, i) => (i === 0 ? { ...c, bucket: 'bread-van' } : c))))).toEqual(
      ['lab-m01-sort-the-bakes: spec: cards.0.bucket: names no bucket: bread-van'],
    );
    const badCard: SortAction = { t: 'place', card: 'Saturday Ovens', bucket: 'shared-kitchen' };
    expect(r11Of(withLab({ ...LAB, solution: [badCard, ...SOLUTION.slice(1)] }))).toEqual([
      'lab-m01-sort-the-bakes: solution[0].card: must be kebab-case',
    ]);
    const drag = { t: 'drag', card: 'forty-minutes' };
    const wrongPaths = [WRONG_OVENS, { ...WRONG_CABINET, actions: [...WRONG_CABINET.actions, drag] }];
    expect(r11Of(withLab({ ...LAB, wrongPaths }))).toEqual([
      "lab-m01-sort-the-bakes: wrongPaths[1].actions[4].t: Invalid discriminator value. Expected 'place' | 'unplace' | 'reset'",
    ]);
  });

  it('reports goals that do not match the spec', () => {
    const goals = [
      ...LAB.goals,
      { id: 'g3', label: 'Every loaf is labelled', hint: 'Ask which card belongs to this goal.' },
    ];
    const wrongPaths = [...LAB.wrongPaths, { ...WRONG_OVENS, failsGoal: 'g3' }];
    expect(r11Of(withLab({ ...LAB, goals, wrongPaths }))).toEqual([
      'lab-m01-sort-the-bakes: goals do not match the spec: g3',
    ]);
  });

  it('reports a solution that leaves a goal unmet', () => {
    expect(r11Of(withLab({ ...LAB, solution: SOLUTION.slice(0, 3) }))).toEqual([
      'lab-m01-sort-the-bakes: the solution leaves g2 unmet: 1 of 2 right',
    ]);
  });

  it('reports a wrong path that leaves the board unfinished, and one that meets the goal it should fail', () => {
    const unfinished = { ...WRONG_OVENS, actions: SOLUTION.slice(1) };
    const passing = { ...WRONG_CABINET, actions: SOLUTION };
    expect(r11Of(withLab({ ...LAB, wrongPaths: [unfinished, passing] }))).toEqual([
      'lab-m01-sort-the-bakes: wrongPaths[0] (Treats borrowed ovens as a cabinet billed by the minute) leaves the board unfinished',
      'lab-m01-sort-the-bakes: wrongPaths[1] (Treats a rented cabinet as an oven borrowed from the kitchen) meets g2, which it should fail',
    ]);
  });

  it('reports a retired Support plan name in lab text and passes the current one', () => {
    const named = (text: string) => withCards(SPEC.cards.map((c, i) => (i === 3 ? { ...c, text } : c)));
    expect(r11Of(named('Night help from Business Support for the van'))).toEqual([
      "lab-m01-sort-the-bakes: retired Support plan name in 'Night help from Business Support for the van'",
    ]);
    expect(r11Of(named('Night help from AWS Business Support+ for the van'))).toEqual([]);
  });

  it('reports a start that already meets every goal', () => {
    const solvedAtStart = { ...SORT, init: (spec: SortSpec) => replayLab(SORT, spec, SOLUTION) };
    stub.entry = { engine: solvedAtStart as unknown as AnyLabEngine, settle: [], complete: () => true };
    expect(r11Of()).toEqual(['lab-m01-sort-the-bakes: the starting state already meets every goal']);
  });

  it('checks the start, the solution and every wrong path after the settle actions', () => {
    const settleSolves = {
      ...SORT,
      reduce: (state: SortState, action: SortAction | { t: 'settle' }): SortState =>
        action.t === 'settle'
          ? SOLUTION.reduce((s, a) => SORT.reduce(s, a), state)
          : SORT.reduce(state, action),
    };
    stub.entry = {
      engine: settleSolves as unknown as AnyLabEngine,
      settle: [{ t: 'settle' }],
      complete: () => true,
    };
    expect(r11Of()).toEqual([
      'lab-m01-sort-the-bakes: the starting state already meets every goal',
      'lab-m01-sort-the-bakes: wrongPaths[0] (Treats borrowed ovens as a cabinet billed by the minute) meets g1, which it should fail',
      'lab-m01-sort-the-bakes: wrongPaths[1] (Treats a rented cabinet as an oven borrowed from the kitchen) meets g2, which it should fail',
    ]);
  });
});

const labEntryOf = (lab: LabFile): LabEntry => ({
  path: `content/labs/01-baking-basics/${lab.id.slice('lab-m01-'.length)}.yaml`,
  module: 1,
  slug: lab.id.slice('lab-m01-'.length),
  lab,
});

describe('R11 on Configure labs', () => {
  it('replays the bakery Configure lab without a problem', () => {
    expect(labProblems(labEntryOf(bakeryConfigureLab()))).toEqual([]);
  });

  it('reports a wrong path that meets the goal it should fail', () => {
    const lab = bakeryConfigureLab();
    const wrongPaths = [
      {
        ...lab.wrongPaths[0],
        actions: lab.solution,
        failsGoal: 'g1',
        mistake: 'Picks the biggest oven to be safe',
      },
    ];
    expect(
      labProblems(labEntryOf({ ...lab, wrongPaths: [...wrongPaths, ...lab.wrongPaths.slice(1)] })),
    ).toEqual([
      'lab-m01-pick-the-oven: wrongPaths[0] (Picks the biggest oven to be safe) meets g1, which it should fail',
    ]);
  });

  it('reports a set action on a field value of the wrong type', () => {
    const lab = bakeryConfigureLab({ solution: [{ t: 'set', field: 'door', value: 3 }] });
    expect(labProblems(labEntryOf(lab))).toHaveLength(1);
    expect(labProblems(labEntryOf(lab))[0]).toMatch(/^lab-m01-pick-the-oven: solution\[0\]\.value: /);
  });
});
