import type { LabFile } from '../../schemas/lab.ts';
import type { PlaceAction, PlaceSpec } from '../../schemas/lab-place.ts';

/** A made-up bakery Place board (the worked example for the Place engine); no course text. */
export const PLACE_SPEC: PlaceSpec = {
  containers: [
    { id: 'flourtown', label: 'Flourtown', kind: 'region' },
    { id: 'bakery-network', label: 'Bakery network', kind: 'vpc', parent: 'flourtown' },
    {
      id: 'bakery-edge',
      label: 'Network edge',
      kind: 'edge',
      parent: 'bakery-network',
      detail: 'Where the bakery network meets the street.',
    },
    { id: 'oven-row-a', label: 'Oven Row A', kind: 'az', parent: 'bakery-network' },
    { id: 'public-a', label: 'Public subnet A', kind: 'subnet', parent: 'oven-row-a' },
    { id: 'private-a', label: 'Private subnet A', kind: 'subnet', parent: 'oven-row-a' },
    { id: 'oven-row-b', label: 'Oven Row B', kind: 'az', parent: 'bakery-network' },
    { id: 'public-b', label: 'Public subnet B', kind: 'subnet', parent: 'oven-row-b' },
    { id: 'private-b', label: 'Private subnet B', kind: 'subnet', parent: 'oven-row-b' },
    { id: 'not-used', label: 'Not used', kind: 'bench' },
  ],
  pieces: [
    { id: 'front-one', label: 'First shop front', detail: 'Takes the online cake orders.' },
    { id: 'front-two', label: 'Second shop front', detail: 'Takes the same orders as the first.' },
    { id: 'recipes-one', label: 'Recipe store', detail: 'Holds the secret recipes.' },
    { id: 'recipes-two', label: 'Recipe store copy', detail: 'A standby copy of the recipe store.' },
    { id: 'gateway', label: 'Internet gateway', role: 'internet-gateway' },
    { id: 'route-a', label: 'Public route A', role: 'public-route' },
    { id: 'route-b', label: 'Public route B', role: 'public-route' },
    { id: 'mixer', label: 'Spare mixer', detail: 'Nothing on the board needs it.' },
  ],
  failures: ['oven-row-a', 'oven-row-b'],
  constraints: [
    { kind: 'public', goal: 'g1', pieces: ['front-one', 'front-two'] },
    { kind: 'private', goal: 'g2', pieces: ['recipes-one', 'recipes-two'] },
    { kind: 'survive', goal: 'g3', pieces: ['front-one', 'front-two'], min: 1 },
    { kind: 'survive', goal: 'g3', pieces: ['recipes-one', 'recipes-two'], min: 1 },
    { kind: 'in', goal: 'g3', pieces: ['mixer'], within: ['not-used'] },
  ],
};

const place = (piece: string, slot: string): PlaceAction => ({ t: 'place', piece, slot });

/** The solution: a gateway on the edge, a route and a shop front in each public subnet, a recipe store in each private one. */
export const PLACE_SOLUTION: PlaceAction[] = [
  place('gateway', 'bakery-edge'),
  place('route-a', 'public-a'),
  place('front-one', 'public-a'),
  place('recipes-one', 'private-a'),
  place('route-b', 'public-b'),
  place('front-two', 'public-b'),
  place('recipes-two', 'private-b'),
  place('mixer', 'not-used'),
];

/** The solution with some pieces moved: a finished board with one mistake. */
const moved = (...moves: PlaceAction[]): PlaceAction[] => [...PLACE_SOLUTION, ...moves];

/** A lab file on the Place engine; once Task 4 adds `place` to `LAB_ENGINES`, every `PlaceLabFile` is a `LabFile`. */
export type PlaceLabFile = Omit<LabFile, 'engine'> & { engine: 'place' };

/** A complete Place lab: keep the shop fronts open and the recipes private while one oven row is down. */
export function bakeryPlaceLab(over: Partial<PlaceLabFile> = {}): PlaceLabFile {
  return {
    id: 'lab-m01-bakery-ovens',
    module: 1,
    title: 'Keep the ovens baking',
    engine: 'place',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 8,
    brief:
      'The bakery runs two shop fronts and a recipe store in its own network. Customers reach a piece only through a public route in its subnet and a gateway on the network edge, and either oven row can go dark at any time.',
    spec: PLACE_SPEC,
    goals: [
      {
        id: 'g1',
        label: 'Customers reach both shop fronts',
        hint: 'A shop front needs a public route in its own subnet and a gateway on the network edge.',
      },
      {
        id: 'g2',
        label: 'The recipes stay private',
        hint: 'A recipe store belongs in a subnet that has no public route.',
      },
      {
        id: 'g3',
        label: 'One oven row can go dark',
        hint: 'Spread each pair over both oven rows, and leave what nobody needs on the bench.',
      },
    ],
    solution: PLACE_SOLUTION,
    wrongPaths: [
      {
        actions: moved(place('gateway', 'not-used')),
        failsGoal: 'g1',
        mistake: 'Leaves the internet gateway on the bench',
      },
      {
        actions: moved(place('recipes-one', 'public-a')),
        failsGoal: 'g2',
        mistake: 'Puts the recipe store in a public subnet',
      },
      {
        actions: moved(place('front-two', 'public-a')),
        failsGoal: 'g3',
        mistake: 'Runs both shop fronts in Oven Row A',
      },
    ],
    debrief: {
      lines: [
        'A shop front in each oven row keeps the orders coming when one row goes dark.',
        'A recipe store with no public route in its subnet stays out of reach from the street.',
      ],
      questions: ['q-b4k7m2', 'q-d9p4r6'],
    },
    ...over,
  };
}
