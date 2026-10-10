import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { stringify } from 'yaml';
import type { LabFile } from '../../schemas/lab.ts';

/** The fixture tree's one lab file. */
export const FIXTURE_LAB = 'content/labs/01-baking-basics/sort-the-bakes.yaml';

/** A made-up bakery Sort lab for the pipeline tests; each call returns a fresh copy. */
export function bakeryLab(over: Partial<LabFile> = {}): LabFile {
  return {
    id: 'lab-m01-sort-the-bakes',
    module: 1,
    title: 'Sort the bakes',
    engine: 'sort',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 4,
    brief:
      'The harbour branch runs short of oven space on Saturdays and pays for cabinets it barely uses. Sort each need under the bakery cloud idea that answers it.',
    spec: {
      buckets: [
        { id: 'shared-kitchen', label: 'Shared kitchen' },
        { id: 'per-minute-rental', label: 'Per-minute rental', detail: 'Pay only while it is in use' },
      ],
      cards: [
        {
          id: 'saturday-ovens',
          text: 'Two extra ovens for the long Saturday queue',
          bucket: 'shared-kitchen',
          also: [],
          goal: 'g1',
        },
        {
          id: 'harbour-trays',
          text: 'Extra harbour trays baked away from the branch',
          bucket: 'shared-kitchen',
          also: [],
          goal: 'g1',
        },
        {
          id: 'forty-minutes',
          text: 'Forty minutes of rising time for the rye dough',
          bucket: 'per-minute-rental',
          also: [],
          goal: 'g2',
        },
        {
          id: 'empty-overnight',
          text: 'A cabinet nobody needs between closing and dawn',
          bucket: 'per-minute-rental',
          also: [],
          goal: 'g2',
        },
      ],
    },
    goals: [
      {
        id: 'g1',
        label: 'Oven needs sit under Shared kitchen',
        hint: 'Ask whether the branch borrows ovens it does not own while its queue is long.',
      },
      {
        id: 'g2',
        label: 'Cabinet needs sit under Per-minute rental',
        hint: 'Ask whether the branch pays only for the minutes the dough is inside.',
      },
    ],
    solution: [
      { t: 'place', card: 'saturday-ovens', bucket: 'shared-kitchen' },
      { t: 'place', card: 'harbour-trays', bucket: 'shared-kitchen' },
      { t: 'place', card: 'forty-minutes', bucket: 'per-minute-rental' },
      { t: 'place', card: 'empty-overnight', bucket: 'per-minute-rental' },
    ],
    wrongPaths: [
      {
        actions: [
          { t: 'place', card: 'saturday-ovens', bucket: 'per-minute-rental' },
          { t: 'place', card: 'harbour-trays', bucket: 'shared-kitchen' },
          { t: 'place', card: 'forty-minutes', bucket: 'per-minute-rental' },
          { t: 'place', card: 'empty-overnight', bucket: 'per-minute-rental' },
        ],
        failsGoal: 'g1',
        mistake: 'Treats borrowed ovens as a cabinet billed by the minute',
      },
      {
        actions: [
          { t: 'place', card: 'saturday-ovens', bucket: 'shared-kitchen' },
          { t: 'place', card: 'harbour-trays', bucket: 'shared-kitchen' },
          { t: 'place', card: 'forty-minutes', bucket: 'shared-kitchen' },
          { t: 'place', card: 'empty-overnight', bucket: 'per-minute-rental' },
        ],
        failsGoal: 'g2',
        mistake: 'Treats a rented cabinet as an oven borrowed from the kitchen',
      },
    ],
    debrief: {
      lines: [
        'Borrowing central ovens covers a long queue without owning ovens that sit idle on quiet days.',
        'A cabinet billed by the minute costs nothing once it goes back, so empty hours are free.',
      ],
      questions: ['q-b4k7m2', 'q-d9p4r6'],
    },
    ...over,
  };
}

/** Writes a lab as YAML into a fixture root. */
export function writeLab(root: string, lab: unknown, file = FIXTURE_LAB): void {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, stringify(lab));
}

/** Deletes the fixture lab, for tests that retire or rewrite the questions its debrief names. */
export function dropFixtureLab(root: string): void {
  rmSync(join(root, FIXTURE_LAB));
}
