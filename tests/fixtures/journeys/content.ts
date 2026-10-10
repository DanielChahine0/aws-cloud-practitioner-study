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

const PAIRS: readonly (readonly [string, string])[] = [
  [conceptId(1, 1), conceptId(1, 2)],
  [conceptId(3, 4), conceptId(5, 4)],
  [conceptId(7, 1), conceptId(7, 9)],
];

function build(): MemoryContent {
  const concepts = new Map<string, ConceptInfo>();
  const questionVersions = new Map<string, number>();
  for (let module = 1; module <= JOURNEY_MODULES; module++) {
    for (let index = 1; index <= CONCEPTS_PER_MODULE; index++) {
      const id = conceptId(module, index);
      const partners = PAIRS.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
      concepts.set(id, { module, tested: true, confusableWith: partners, splitFrom: null });
      questionVersions.set(variantId(id, 'a'), 1);
      questionVersions.set(variantId(id, 'b'), 1);
    }
  }
  return { concepts, aliases: new Map(), questionVersions };
}

export const JOURNEY_CONTENT: MemoryContent = build();

export type JourneyName = 'first-week' | 'exam-crunch' | 'comeback-10-days';

const NOW: Record<JourneyName, string> = {
  'first-week': '2026-10-18T20:00:00.000Z',
  'exam-crunch': '2026-11-12T20:00:00.000Z',
  'comeback-10-days': '2026-10-27T12:00:00.000Z',
};

/** The moment each journey is read at, in offset 0. */
export function journeyNow(name: JourneyName): Date {
  return new Date(NOW[name]);
}
