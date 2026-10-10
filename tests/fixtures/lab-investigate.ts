import type { LabFile } from '../../schemas/lab.ts';
import type { InvestigateSpec } from '../../schemas/lab-investigate.ts';

/** Made-up bakery Investigate specs and a whole lab (spec 5.1); no course text. */

/**
 * A lab file of the Investigate engine: `LabFile['engine']` names `investigate` only once Phase 5 Task 4 adds it to
 * `LAB_ENGINES`, and this type is assignable to `LabFile` from then on.
 */
export type InvestigateLabFile = Omit<LabFile, 'engine'> & { engine: 'investigate' };

/** The pantry ledger of one made-up morning: 8 records, 3 filter columns, 3 questions in 2 goals. */
export const INVESTIGATE_SPEC: InvestigateSpec = {
  source: 'Pantry ledger, Flourtown bakery, 14 March, times in UTC',
  columns: [
    { id: 'time', label: 'Time', filter: false },
    { id: 'who', label: 'Who', filter: true },
    { id: 'event', label: 'Event', filter: true },
    { id: 'item', label: 'Item', filter: false },
    { id: 'result', label: 'Result', filter: true },
  ],
  records: [
    {
      id: 'r1',
      cells: { time: '06:02 UTC', who: 'Mara', event: 'Open pantry', item: 'Front door', result: 'Done' },
    },
    {
      id: 'r2',
      cells: { time: '06:15 UTC', who: 'Mara', event: 'Take out', item: 'Rye flour', result: 'Done' },
    },
    {
      id: 'r3',
      cells: { time: '06:40 UTC', who: 'Tobin', event: 'Open pantry', item: 'Front door', result: 'Done' },
    },
    {
      id: 'r4',
      cells: {
        time: '07:05 UTC',
        who: 'Tobin',
        event: 'Throw away',
        item: 'Sourdough starter',
        result: 'Refused',
      },
    },
    {
      id: 'r5',
      cells: { time: '07:30 UTC', who: 'Ines', event: 'Open pantry', item: 'Back door', result: 'Done' },
    },
    {
      id: 'r6',
      cells: {
        time: '07:32 UTC',
        who: 'Ines',
        event: 'Throw away',
        item: 'Sourdough starter',
        result: 'Done',
      },
    },
    {
      id: 'r7',
      cells: { time: '08:10 UTC', who: 'Mara', event: 'Take out', item: 'Butter', result: 'Done' },
    },
    {
      id: 'r8',
      cells: { time: '08:45 UTC', who: 'Tobin', event: 'Count stock', item: 'Starter jar', result: 'Done' },
    },
  ],
  questions: [
    {
      id: 'who',
      goal: 'g1',
      prompt: 'Who threw the sourdough starter away?',
      options: [
        { id: 'mara', label: 'Mara' },
        { id: 'tobin', label: 'Tobin' },
        { id: 'ines', label: 'Ines' },
      ],
      answer: 'ines',
    },
    {
      id: 'what',
      goal: 'g1',
      prompt: 'Which event took the starter out of the pantry for good?',
      options: [
        { id: 'take-out', label: 'Take out' },
        { id: 'throw-away', label: 'Throw away' },
        { id: 'count-stock', label: 'Count stock' },
      ],
      answer: 'throw-away',
    },
    {
      id: 'when',
      goal: 'g2',
      prompt: 'When did the starter leave the pantry?',
      options: [
        { id: 'at-0705', label: '07:05 UTC' },
        { id: 'at-0732', label: '07:32 UTC' },
        { id: 'at-0845', label: '08:45 UTC' },
      ],
      answer: 'at-0732',
    },
  ],
};

/** A recipe card read as a listing: no records, no columns, one question. */
export const INVESTIGATE_LISTING_SPEC: InvestigateSpec = {
  source: 'Recipe card for the Saturday rolls',
  listing: {
    label: 'Recipe card',
    lines: [
      'recipe: saturday-rolls',
      'makes: 40 rolls',
      'flour: 5 kg',
      'water: 3 litres',
      'yeast: 50 g',
      'salt: 100 g',
      'proof: 2 hours',
      'bake: 20 minutes at 220 degrees',
    ],
  },
  columns: [],
  records: [],
  questions: [
    {
      id: 'proof',
      goal: 'g1',
      prompt: 'How long does the dough proof?',
      options: [
        { id: 'twenty-minutes', label: '20 minutes' },
        { id: 'two-hours', label: '2 hours' },
        { id: 'five-hours', label: '5 hours' },
      ],
      answer: 'two-hours',
    },
  ],
};

/** A complete Investigate lab on the pantry ledger: a solution, one wrong path per goal, the fixture debrief. */
export function bakeryInvestigateLab(over: Partial<InvestigateLabFile> = {}): InvestigateLabFile {
  return {
    id: 'lab-m01-bakery-ledger',
    module: 1,
    title: 'Who threw away the starter?',
    engine: 'investigate',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 5,
    brief:
      'The sourdough starter is gone from the bakery pantry. Filter the pantry ledger, then answer who threw the starter away, how, and when. Every time in the ledger is in UTC.',
    spec: INVESTIGATE_SPEC,
    goals: [
      {
        id: 'g1',
        label: 'Name who threw the starter away, and how',
        hint: 'A refused event changes nothing in the pantry; only an event that is done removes the starter.',
      },
      {
        id: 'g2',
        label: 'Pin down when the starter left',
        hint: 'Every time in this ledger is in UTC; read the time of the event that worked.',
      },
    ],
    solution: [
      { t: 'filter', column: 'event', value: 'Throw away' },
      { t: 'answer', question: 'who', option: 'ines' },
      { t: 'answer', question: 'what', option: 'throw-away' },
      { t: 'answer', question: 'when', option: 'at-0732' },
    ],
    wrongPaths: [
      {
        actions: [
          { t: 'answer', question: 'who', option: 'tobin' },
          { t: 'answer', question: 'what', option: 'throw-away' },
          { t: 'answer', question: 'when', option: 'at-0732' },
        ],
        failsGoal: 'g1',
        mistake: 'Blames the first person who tried, though that try was refused',
      },
      {
        actions: [
          { t: 'answer', question: 'who', option: 'ines' },
          { t: 'answer', question: 'what', option: 'throw-away' },
          { t: 'answer', question: 'when', option: 'at-0705' },
        ],
        failsGoal: 'g2',
        mistake: 'Takes the time of the refused try for the time of the loss',
      },
    ],
    debrief: {
      lines: [
        'A ledger that records every try, refused or done, tells you who acted, what they did and when.',
        'Filtering narrows what you read; the answer still comes from the one record that worked.',
      ],
      questions: ['q-b4k7m2', 'q-d9p4r6'],
    },
    ...over,
  };
}
