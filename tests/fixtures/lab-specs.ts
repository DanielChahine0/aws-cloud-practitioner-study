import type { LabFile } from '../../schemas/lab.ts';

/** Made-up bakery labs for the Configure and Simulate engines; no course text. */

const DEBRIEF: LabFile['debrief'] = {
  lines: [
    'A shared kitchen is rented by the minute, so the bakery pays only while the ovens run.',
    'A bigger oven for the weekend rush costs nothing on the quiet weekdays when it is switched off.',
  ],
  questions: ['q-b4k7m2', 'q-d9p4r6'],
};

/** A complete Configure lab: pick the oven and the rental for the weekend bake. */
export function bakeryConfigureLab(over: Partial<LabFile> = {}): LabFile {
  return {
    id: 'lab-m01-pick-the-oven',
    module: 1,
    title: 'Pick the oven',
    engine: 'configure',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 4,
    brief:
      'The bakery rents one oven in the shared kitchen for the weekend bake. Choose the oven and how to pay for it, then lock the back door.',
    spec: {
      fields: [
        {
          kind: 'select',
          id: 'oven',
          label: 'Oven',
          options: [
            { id: 'small-oven', label: 'Small oven', detail: 'Holds 6 trays.' },
            { id: 'deck-oven', label: 'Deck oven', detail: 'Holds 20 trays.' },
            { id: 'tunnel-oven', label: 'Tunnel oven', detail: 'Holds 200 trays and needs a crew of four.' },
          ],
          initial: 'small-oven',
        },
        {
          kind: 'select',
          id: 'rental',
          label: 'Rental',
          options: [
            { id: 'per-minute', label: 'Per minute', detail: 'Billed only while the oven is on.' },
            { id: 'monthly', label: 'Monthly', detail: 'One fixed fee, on or off.' },
          ],
          initial: 'monthly',
        },
        { kind: 'toggle', id: 'door', label: 'Leave the back door open to everyone', initial: true },
      ],
      rules: [
        { goal: 'g1', field: 'oven', in: ['deck-oven'] },
        { goal: 'g2', field: 'rental', in: ['per-minute'] },
        { goal: 'g2', field: 'door', in: [false] },
      ],
    },
    goals: [
      {
        id: 'g1',
        label: 'The oven fits 20 trays',
        hint: 'The weekend bake fills 20 trays, and a crew of one runs it.',
      },
      {
        id: 'g2',
        label: 'Pay only while baking, door locked',
        hint: 'Weekdays are quiet, and only bakers should reach the oven.',
      },
    ],
    solution: [
      { t: 'set', field: 'oven', value: 'deck-oven' },
      { t: 'set', field: 'rental', value: 'per-minute' },
      { t: 'set', field: 'door', value: false },
    ],
    wrongPaths: [
      {
        actions: [
          { t: 'set', field: 'oven', value: 'tunnel-oven' },
          { t: 'set', field: 'rental', value: 'per-minute' },
          { t: 'set', field: 'door', value: false },
        ],
        failsGoal: 'g1',
        mistake: 'Picks the biggest oven to be safe',
      },
      {
        actions: [
          { t: 'set', field: 'oven', value: 'deck-oven' },
          { t: 'set', field: 'door', value: false },
        ],
        failsGoal: 'g2',
        mistake: 'Keeps the monthly fee for a weekend-only oven',
      },
    ],
    debrief: DEBRIEF,
    ...over,
  };
}
