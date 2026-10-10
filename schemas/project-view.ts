/**
 * Zod-free capstone shapes shared by the build, the engine and the app (spec 6).
 * `src/engine` imports this file, so it must never import zod; `schemas/project.ts` validates the YAML.
 */

/** The six ADR headings, in editor and export order (spec 6). */
export const ADR_HEADINGS = [
  'Context',
  'Options considered',
  'Decision',
  'Why',
  'Trade-offs and mitigation',
  'Cost note',
] as const;

/** The draft field behind each heading, in the same order. */
export const ADR_FIELDS = ['context', 'options', 'decision', 'why', 'tradeoffs', 'cost'] as const;
export type AdrField = (typeof ADR_FIELDS)[number];

/** The text of one ADR, citations stored as `[[concept-id]]`. */
export type AdrText = Record<AdrField, string>;

/** Rubric criteria in score order: a `decision` event's `scores` tuple follows it. */
export const CRITERION_ORDER = ['fit', 'grounding', 'tradeoffs', 'cost'] as const;
export type CriterionId = (typeof CRITERION_ORDER)[number];

export interface RubricView {
  passTotal: number;
  criteria: { id: CriterionId; name: string; levels: readonly [string, string, string, string] }[];
}

/** A live reference key point with the note line that grounds it and where to read it. */
export interface KeyPointView {
  id: string;
  text: string;
  concepts: string[];
  read: { route: string; text: string };
}

export interface DecisionView {
  module: number;
  title: string;
  prompt: string;
  context: string[];
  keyPoints: KeyPointView[];
}

/** The lazy project chunk: the brief, the rubric and the live key points, loaded only by the Project screen. */
export interface ProjectChunk {
  title: string;
  facts: string[];
  rubric: RubricView;
  decisions: DecisionView[];
}
