import { describe, expect, it } from 'vitest';
import { PlaceAction, PlaceSpec } from '../../schemas/lab-place.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { type AnyLabEngine, checkLab, type EngineEntry } from '../../src/labs/engines.ts';
import {
  isDown,
  PLACE,
  type PlaceState,
  placeComplete,
  placeGoals,
  placeSlots,
  reachable,
  running,
} from '../../src/labs/place/model.ts';
import { bakeryPlaceLab, PLACE_SOLUTION, PLACE_SPEC } from '../fixtures/lab-place.ts';

const issues = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => (result.error?.issues ?? []).map((i) => `${i.path.map(String).join('.')}: ${i.message}`);
const place = (piece: string, slot: string): PlaceAction => ({ t: 'place', piece, slot });
const play = (actions: readonly PlaceAction[], spec: PlaceSpec = PLACE_SPEC): PlaceState =>
  replayLab(PLACE, spec, actions as PlaceAction[]);
const messages = (actions: readonly PlaceAction[], spec: PlaceSpec = PLACE_SPEC): string[] =>
  PLACE.check(spec, play(actions, spec)).map((r) => `${r.goalId} ${r.pass ? 'pass' : 'fail'} ${r.message}`);
/** The fixture board with only these constraints, so one constraint can be judged alone. */
const only = (...constraints: PlaceSpec['constraints']): PlaceSpec => ({ ...PLACE_SPEC, constraints });
const passes = (spec: PlaceSpec, actions: readonly PlaceAction[]): boolean =>
  allPass(PLACE.check(spec, play(actions, spec)));
const [GATEWAY_ON_BENCH, RECIPES_IN_PUBLIC, FRONTS_IN_ONE_ROW] = bakeryPlaceLab().wrongPaths;

describe('Place spec schema (spec 5.1)', () => {
  it('accepts the bakery spec and its solution actions, and rejects junk actions', () => {
    expect(PlaceSpec.safeParse(PLACE_SPEC).success).toBe(true);
    expect(PLACE_SOLUTION.every((a) => PlaceAction.safeParse(a).success)).toBe(true);
    expect(PlaceAction.safeParse({ t: 'drag', piece: 'mixer' }).success).toBe(false);
    expect(issues(PlaceAction.safeParse({ t: 'place', piece: 'mixer' }))).toEqual([
      'slot: Invalid input: expected string, received undefined',
    ]);
  });

  it('defaults failures to none and survive to one running piece', () => {
    const { failures: _, ...rest } = PLACE_SPEC;
    const constraints = [{ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'] }];
    const parsed = PlaceSpec.parse({ ...rest, constraints });
    expect(parsed.failures).toEqual([]);
    expect(parsed.constraints).toEqual([
      { kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'], min: 1 },
    ]);
  });

  it('rejects repeated container and piece ids', () => {
    const copy = { id: 'private-b', label: 'Spare subnet', kind: 'subnet', parent: 'oven-row-b' } as const;
    expect(
      issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...PLACE_SPEC.containers, copy] })),
    ).toEqual(['containers.10.id: container private-b is used twice']);
    const pieces = [...PLACE_SPEC.pieces, { id: 'mixer', label: 'Mixer again' }];
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, pieces }))).toEqual([
      'pieces.8.id: piece mixer is used twice',
    ]);
  });

  it('rejects an unknown parent and a parent cycle', () => {
    const lost = PLACE_SPEC.containers.map((c) => (c.id === 'public-a' ? { ...c, parent: 'oven-row-c' } : c));
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: lost }))).toEqual([
      'containers.4.parent: names no container: oven-row-c',
    ]);
    const loop = PLACE_SPEC.containers.map((c) =>
      c.id === 'flourtown' ? { ...c, parent: 'bakery-network' } : c,
    );
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: loop }))).toEqual([
      'containers.0.parent: container flourtown is its own ancestor',
      'containers.1.parent: container bakery-network is its own ancestor',
    ]);
  });

  it('keeps one bench at the top that holds no container, and needs another slot', () => {
    const containers = PLACE_SPEC.containers;
    const shelf = { id: 'shelf', label: 'Shelf', kind: 'bench' } as const;
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...containers, shelf] }))).toEqual([
      'containers.10.kind: only one bench is allowed',
    ]);
    const hung = containers.map((c) => (c.kind === 'bench' ? { ...c, parent: 'flourtown' } : c));
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: hung }))).toEqual([
      'containers.9.parent: the bench cannot have a parent',
    ]);
    const drawer = { id: 'drawer', label: 'Drawer', kind: 'stage', parent: 'not-used' } as const;
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...containers, drawer] }))).toEqual([
      'containers.10.parent: the bench cannot hold containers',
    ]);
    const rows = [
      { id: 'oven-row-a', label: 'Oven Row A', kind: 'az', parent: 'oven-row-b' },
      { id: 'oven-row-b', label: 'Oven Row B', kind: 'az', parent: 'oven-row-a' },
      { id: 'not-used', label: 'Not used', kind: 'bench' },
    ];
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: rows }))).toEqual([
      'containers.0.parent: container oven-row-a is its own ancestor',
      'containers.1.parent: container oven-row-b is its own ancestor',
      'containers: needs a slot that is not the bench',
    ]);
  });

  it('rejects a subnet with no vpc above it', () => {
    const loose = { id: 'loose', label: 'Loose subnet', kind: 'subnet', parent: 'flourtown' } as const;
    expect(
      issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...PLACE_SPEC.containers, loose] })),
    ).toEqual(['containers.10: subnet loose needs a vpc above it']);
    const { parent: _, ...top } = loose;
    expect(
      issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...PLACE_SPEC.containers, top] })),
    ).toEqual(['containers.10: subnet loose needs a vpc above it']);
  });

  it('rejects failures that name no container, repeat one or fail the bench', () => {
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, failures: ['oven-row-c'] }))).toEqual([
      'failures.0: names no container: oven-row-c',
    ]);
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, failures: ['oven-row-a', 'oven-row-a'] }))).toEqual([
      'failures.1: lists oven-row-a twice',
    ]);
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, failures: ['not-used'] }))).toEqual([
      'failures.0: cannot fail the bench',
    ]);
  });

  it('rejects constraints that name no piece or container, repeat one, or ask for more than they list', () => {
    const pub = { kind: 'public', goal: 'g1' } as const;
    expect(issues(PlaceSpec.safeParse(only({ ...pub, pieces: ['front-one', 'front-three'] })))).toEqual([
      'constraints.0.pieces.1: names no piece: front-three',
    ]);
    expect(issues(PlaceSpec.safeParse(only({ ...pub, pieces: ['front-one', 'front-one'] })))).toEqual([
      'constraints.0.pieces.1: lists front-one twice',
    ]);
    const bin = { kind: 'in', goal: 'g1' } as const;
    expect(
      issues(PlaceSpec.safeParse(only({ ...bin, pieces: ['mixer'], within: ['not-used', 'shelf'] }))),
    ).toEqual(['constraints.0.within.1: names no container: shelf']);
    expect(
      issues(PlaceSpec.safeParse(only({ ...bin, pieces: ['mixer'], within: ['not-used', 'not-used'] }))),
    ).toEqual(['constraints.0.within.1: lists not-used twice']);
    const greedy = only({ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'], min: 3 });
    expect(issues(PlaceSpec.safeParse(greedy))).toEqual([
      'constraints.0.min: asks for 3 running but lists only 2',
    ]);
  });
});

describe('the Place checker (spec 5.1, 9)', () => {
  it('fails every goal on the starting board and passes every goal with the solution', () => {
    expect(messages([])).toEqual([
      'g1 fail 0 of 1 check passes',
      'g2 fail 0 of 1 check passes',
      'g3 fail 0 of 3 checks pass',
    ]);
    expect(messages(PLACE_SOLUTION)).toEqual([
      'g1 pass 1 of 1 check passes',
      'g2 pass 1 of 1 check passes',
      'g3 pass 3 of 3 checks pass',
    ]);
  });

  it('fails exactly the goal each wrong path names, on a finished board', () => {
    for (const path of [GATEWAY_ON_BENCH, RECIPES_IN_PUBLIC, FRONTS_IN_ONE_ROW]) {
      if (path === undefined) throw new Error('three wrong paths');
      const state = play(path.actions as PlaceAction[]);
      expect(placeComplete(PLACE_SPEC, state)).toBe(true);
      expect(
        PLACE.check(PLACE_SPEC, state)
          .filter((r) => !r.pass)
          .map((r) => r.goalId),
      ).toEqual([path.failsGoal]);
    }
  });

  it('numbers the slots depth-first with the bench last, whatever order the spec lists them in', () => {
    const slots = ['bakery-edge', 'public-a', 'private-a', 'public-b', 'private-b', 'not-used'];
    expect(placeSlots(PLACE_SPEC)).toEqual(slots);
    const byId = new Map(PLACE_SPEC.containers.map((c) => [c.id, c]));
    const breadthFirst = [
      'not-used',
      'flourtown',
      'bakery-network',
      'bakery-edge',
      'oven-row-a',
      'oven-row-b',
    ]
      .concat(['public-a', 'private-a', 'public-b', 'private-b'])
      .map((id) => byId.get(id))
      .filter((c) => c !== undefined);
    expect(placeSlots({ ...PLACE_SPEC, containers: breadthFirst })).toEqual(slots);
    expect(PLACE.init(PLACE_SPEC).slots).toEqual(slots);
  });

  it('lists goals in the order the constraints first name them', () => {
    const [g1, g2, g3a, g3b, g3c] = PLACE_SPEC.constraints;
    if (g1 === undefined || g2 === undefined || g3a === undefined || g3b === undefined || g3c === undefined)
      throw new Error('five constraints');
    expect(placeGoals(only(g3a, g1, g3b, g2, g3c))).toEqual(['g3', 'g1', 'g2']);
    expect(PLACE.check(only(g3a, g1, g3b, g2, g3c), play([])).map((r) => r.goalId)).toEqual([
      'g3',
      'g1',
      'g2',
    ]);
  });

  it('passes an in constraint below a listed container, never in a sibling, and on the bench only when named', () => {
    const inVpc = only({ kind: 'in', goal: 'g1', pieces: ['mixer'], within: ['bakery-network'] });
    const inRowB = only({ kind: 'in', goal: 'g1', pieces: ['mixer'], within: ['oven-row-b'] });
    const onBench = only({ kind: 'in', goal: 'g1', pieces: ['mixer'], within: ['not-used'] });
    expect(passes(inVpc, [place('mixer', 'public-a')])).toBe(true);
    expect(passes(inRowB, [place('mixer', 'public-a')])).toBe(false);
    expect(PLACE.hint(inRowB, play([place('mixer', 'public-a')], inRowB), 'g1')).toBe(
      'Spare mixer is not where this goal needs it.',
    );
    expect(passes(inVpc, [place('mixer', 'not-used')])).toBe(false);
    expect(passes(onBench, [place('mixer', 'not-used')])).toBe(true);
  });

  const fronts = only({ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'], min: 1 });
  const three = only({ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two', 'mixer'], min: 2 });
  it.each([
    ['both in Oven Row A', fronts, ['public-a', 'private-a'], 'Down when Oven Row A fails.'],
    ['both in Oven Row B', fronts, ['public-b', 'private-b'], 'Down when Oven Row B fails.'],
    ['one in each row', fronts, ['public-a', 'private-b'], 'Every check of this goal passes.'],
    ['one on the bench, one in Oven Row A', fronts, ['not-used', 'public-a'], 'Down when Oven Row A fails.'],
    [
      'min 2, two of three in Oven Row B',
      three,
      ['public-a', 'public-b', 'private-b'],
      'Down when Oven Row B fails.',
    ],
    [
      'min 2, one per row and one on the edge',
      three,
      ['public-a', 'public-b', 'bakery-edge'],
      'Every check of this goal passes.',
    ],
    ['min 2, two on the bench', three, ['not-used', 'not-used', 'public-a'], 'Too few of them are running.'],
  ])('survive with %s', (_, spec, slots, hint) => {
    const pieces = ['front-one', 'front-two', 'mixer'];
    const actions = slots.map((slot, i) => place(pieces[i] ?? '', slot));
    expect(PLACE.hint(spec, play(actions, spec), 'g1')).toBe(hint);
    expect(passes(spec, actions)).toBe(hint === 'Every check of this goal passes.');
  });

  it('counts running pieces only when no failure is listed', () => {
    const spec = {
      ...only({ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'], min: 2 }),
      failures: [],
    };
    expect(passes(spec, [place('front-one', 'public-a'), place('front-two', 'public-a')])).toBe(true);
    const benched = [place('front-one', 'public-a'), place('front-two', 'not-used')];
    expect(passes(spec, benched)).toBe(false);
    expect(PLACE.hint(spec, play(benched, spec), 'g1')).toBe('Too few of them are running.');
  });

  it('reaches a piece through a public route in its subnet and a gateway on the VPC edge', () => {
    const solved = play(PLACE_SOLUTION);
    expect(reachable(PLACE_SPEC, solved, 'front-one')).toBe(true);
    expect(reachable(PLACE_SPEC, solved, 'recipes-one')).toBe(false);
    const noRoute = play([...PLACE_SOLUTION, { t: 'unplace', piece: 'route-a' }]);
    expect(reachable(PLACE_SPEC, noRoute, 'front-one')).toBe(false);
    expect(reachable(PLACE_SPEC, noRoute, 'front-two')).toBe(true);
    expect(PLACE.hint(PLACE_SPEC, noRoute, 'g1')).toBe('Customers cannot reach First shop front.');
    const gatewayInSubnet = play([...PLACE_SOLUTION, place('gateway', 'public-a')]);
    expect(reachable(PLACE_SPEC, gatewayInSubnet, 'front-one')).toBe(false);
    expect(PLACE.hint(PLACE_SPEC, gatewayInSubnet, 'g1')).toBe('Customers cannot reach First shop front.');
  });

  it.each([
    ['in a public subnet', place('recipes-one', 'public-a'), 'The internet can reach Recipe store.'],
    ['on the bench', place('recipes-one', 'not-used'), 'Recipe store is not running.'],
    ['in the VPC edge slot', place('recipes-one', 'bakery-edge'), 'Recipe store is not in a subnet.'],
    ['in the tray', { t: 'unplace', piece: 'recipes-one' } as const, 'Recipe store is still in the tray.'],
  ])('fails private with the recipe store %s', (_, move, hint) => {
    const state = play([...PLACE_SOLUTION, move]);
    expect(PLACE.check(PLACE_SPEC, state).find((r) => r.goalId === 'g2')?.pass).toBe(false);
    expect(PLACE.hint(PLACE_SPEC, state, 'g2')).toBe(hint);
  });

  it('names the failed oven row and the stray piece in the hint, and says when a goal passes', () => {
    const rowA = play(FRONTS_IN_ONE_ROW?.actions as PlaceAction[]);
    expect(PLACE.hint(PLACE_SPEC, rowA, 'g3')).toBe('Down when Oven Row A fails.');
    const stray = play([...PLACE_SOLUTION, place('mixer', 'public-b')]);
    expect(PLACE.hint(PLACE_SPEC, stray, 'g3')).toBe('Spare mixer is not where this goal needs it.');
    expect(PLACE.hint(PLACE_SPEC, play(PLACE_SOLUTION), 'g1')).toBe('Every check of this goal passes.');
  });

  it('previews a failure without changing any check, and reset returns the starting board', () => {
    const solved = play(PLACE_SOLUTION);
    const down = PLACE.reduce(solved, { t: 'fail', container: 'oven-row-a' });
    expect(down.failed).toBe('oven-row-a');
    expect(isDown(PLACE_SPEC, 'public-a', 'oven-row-a')).toBe(true);
    expect(isDown(PLACE_SPEC, 'public-b', 'oven-row-a')).toBe(false);
    expect(PLACE.check(PLACE_SPEC, down)).toEqual(PLACE.check(PLACE_SPEC, solved));
    const back = PLACE.reduce(down, { t: 'restore' });
    expect(back.failed).toBeNull();
    expect(PLACE.check(PLACE_SPEC, back)).toEqual(PLACE.check(PLACE_SPEC, solved));
    expect(PLACE.reduce(down, { t: 'reset' })).toEqual(PLACE.init(PLACE_SPEC));
    const start = PLACE.init(PLACE_SPEC);
    expect(PLACE.reduce(start, { t: 'reset' })).toBe(start);
  });

  it('returns the very same state for unknown ids, non-failures, repeats and junk', () => {
    const state = play([place('mixer', 'not-used')]);
    const failed = PLACE.reduce(state, { t: 'fail', container: 'oven-row-b' });
    for (const junk of [
      place('rolling-pin', 'public-a'),
      place('front-one', 'oven-row-a'),
      place('mixer', 'not-used'),
      { t: 'unplace', piece: 'front-one' },
      { t: 'fail', container: 'public-a' },
      { t: 'fail', container: 'not-used' },
      { t: 'restore' },
      { t: 'knead' },
      null,
      'place',
      [place('front-one', 'public-a')],
    ]) {
      expect(PLACE.reduce(state, junk as PlaceAction)).toBe(state);
    }
    expect(PLACE.reduce(failed, { t: 'fail', container: 'oven-row-b' })).toBe(failed);
  });

  it('is complete only when no piece is left in the tray, the bench included', () => {
    expect(placeComplete(PLACE_SPEC, play(PLACE_SOLUTION.slice(0, -1)))).toBe(false);
    expect(placeComplete(PLACE_SPEC, play(PLACE_SOLUTION))).toBe(true);
    expect(running(PLACE_SPEC, play(PLACE_SOLUTION), 'mixer')).toBe(false);
    expect(running(PLACE_SPEC, play(PLACE_SOLUTION), 'gateway')).toBe(true);
  });

  it('checks the same through a registry entry built like the real one', () => {
    const entry: EngineEntry = {
      engine: PLACE as unknown as AnyLabEngine,
      settle: [],
      complete: (spec, state) => placeComplete(spec as PlaceSpec, state as PlaceState),
    };
    for (const actions of [[], PLACE_SOLUTION, FRONTS_IN_ONE_ROW?.actions as PlaceAction[]]) {
      const state = play(actions);
      expect(checkLab(entry, PLACE_SPEC, state)).toEqual(PLACE.check(PLACE_SPEC, state));
    }
    expect(entry.complete(PLACE_SPEC, play(PLACE_SOLUTION))).toBe(true);
  });
});
