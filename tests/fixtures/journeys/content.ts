import type { ConceptInfo, MemoryContent } from '../../../src/engine/memory.ts';

/**
 * Made-up content for the golden journeys (spec 9): 13 modules of 10 bakery concepts,
 * each with two question variants, in two lessons of 5 concepts per module.
 */
export const JOURNEY_MODULES = 13;
export const CONCEPTS_PER_MODULE = 10;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** The concept id of a module and a 1-based index, `bake-03-07`. */
export function conceptId(module: number, index: number): string {
  return `bake-${pad2(module)}-${pad2(index)}`;
}

/** The question id of a concept's variant, `q-bake-03-07-a`. */
export function variantId(concept: string, variant: 'a' | 'b'): string {
  return `q-${concept}-${variant}`;
}

/** The lesson note of a module's first or second lesson, `m03/lesson-2`. */
export function lessonNote(module: number, lesson: 1 | 2): string {
  return `m${pad2(module)}/lesson-${lesson}`;
}

/** The 5 concepts a lesson homes: the first 5 of its module for lesson 1, the last 5 for lesson 2. */
export function lessonConcepts(module: number, lesson: 1 | 2): string[] {
  const from = lesson === 1 ? 1 : 6;
  return Array.from({ length: 5 }, (_, i) => conceptId(module, from + i));
}

/** The blueprint tasks of each domain, in order. */
const DOMAIN_TASKS: readonly (readonly string[])[] = [
  ['1.1', '1.2', '1.3', '1.4'],
  ['2.1', '2.2', '2.3', '2.4'],
  ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'],
  ['4.1', '4.2', '4.3'],
];

/** The domain of a module: Modules 1 to 4 in domain 1, 5 to 7 in 2, 8 to 11 in 3, 12 and 13 in 4. */
export function journeyDomain(module: number): number {
  return module <= 4 ? 1 : module <= 7 ? 2 : module <= 11 ? 3 : 4;
}

/** The one task of a concept: its domain's tasks in turn by index, so `bake-02-06` is `1.2`. */
export function conceptTask(module: number, index: number): string {
  const tasks = DOMAIN_TASKS[journeyDomain(module) - 1] ?? [];
  return tasks[(index - 1) % tasks.length] ?? '';
}

/**
 * The 65 Mock A items of exam-crunch as `[qid, concept]`: item i tests the (i mod 40)th concept of
 * Modules 1 to 4, so they reach only the 40 concepts the journey studies, the first 25 of them twice.
 */
export const MOCK_A_ITEMS: readonly (readonly [string, string])[] = Array.from({ length: 65 }, (_, i) => {
  const c = i % 40;
  return [`qx-a-${pad2(i + 1)}`, conceptId(Math.floor(c / 10) + 1, (c % 10) + 1)] as const;
});

const PAIRS: readonly (readonly [string, string])[] = [
  [conceptId(1, 1), conceptId(1, 2)],
  [conceptId(3, 4), conceptId(5, 4)],
  [conceptId(7, 1), conceptId(7, 9)],
];

function build(): MemoryContent {
  const concepts = new Map<string, ConceptInfo>();
  const questionVersions = new Map<string, number>();
  const examTasks = new Map<string, string>();
  for (let module = 1; module <= JOURNEY_MODULES; module++) {
    for (let index = 1; index <= CONCEPTS_PER_MODULE; index++) {
      const id = conceptId(module, index);
      const partners = PAIRS.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
      const tasks = [conceptTask(module, index)];
      concepts.set(id, { module, tested: true, confusableWith: partners, splitFrom: null, tasks });
      questionVersions.set(variantId(id, 'a'), 1);
      questionVersions.set(variantId(id, 'b'), 1);
    }
  }
  for (const [qid, concept] of MOCK_A_ITEMS) {
    questionVersions.set(qid, 1);
    examTasks.set(qid, concepts.get(concept)?.tasks[0] ?? '');
  }
  return {
    concepts,
    aliases: new Map(),
    questionVersions,
    examTasks,
    coreLabs: new Map([
      [1, ['lab-m01-a', 'lab-m01-b']],
      [2, ['lab-m02-a', 'lab-m02-b']],
      [3, ['lab-m03-a', 'lab-m03-b']],
    ]),
    keptMissions: new Set(['mission-01']),
  };
}

export const JOURNEY_CONTENT: MemoryContent = build();

export type JourneyName =
  | 'first-week'
  | 'exam-crunch'
  | 'comeback-10-days'
  | 'hands-on-week'
  | 'missions-and-capstone';

const NOW: Record<JourneyName, string> = {
  'first-week': '2026-10-18T20:00:00.000Z',
  'exam-crunch': '2026-11-12T20:00:00.000Z',
  'comeback-10-days': '2026-10-27T12:00:00.000Z',
  'hands-on-week': '2026-10-23T20:00:00.000Z',
  'missions-and-capstone': '2026-11-16T20:00:00.000Z',
};

/** The moment each journey is read at, in offset 0. */
export function journeyNow(name: JourneyName): Date {
  return new Date(NOW[name]);
}
