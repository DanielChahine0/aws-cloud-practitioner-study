/** Types of the JSON chunks that scripts/content/build.ts writes and the app reads (spec 2.10). */

export interface LessonMeta {
  n: number;
  slug: string;
  title: string;
  concepts: string[];
  /** Reading time: the note's words over 200, rounded up, at least 1 (spec 4.6). */
  minutes: number;
  /** Tested concepts homed in the lesson that have a live practice question, so its check asks this many. */
  checkConcepts: number;
}

export interface ModuleMeta {
  n: number;
  slug: string;
  title: string;
  /** The title without its "Module N: " prefix. */
  short: string;
  lessons: LessonMeta[];
  /** Path of the module's chunk from the site root, such as content/m03.1a2b3c4d.json. */
  chunk: string;
}

export interface ConceptMeta {
  id: string;
  name: string;
  home: string;
  anchor: string;
  tested: boolean;
  /** Blueprint task ids, copied from the registry. */
  tasks: string[];
  /** Symmetric and capped at 3 by the build (spec 2.4); the queue uses it for placement only (spec 3.7). */
  confusableWith: string[];
  /** Old ids that now mean this concept; replay resolves answers filed under them (spec 8.4). */
  aliases: string[];
  /** The old concept this one was split from; replay copies its card (spec 2.4). */
  splitFrom: string | null;
}

export interface GlossaryItem {
  id: string;
  term: string;
  /** The definition rendered as inline HTML. */
  html: string;
  refs: { label: string; route: string }[];
}

export interface MissionMeta {
  id: string;
  title: string;
  modules: number[];
  services: string[];
  expectedCredits: string;
  gate: boolean;
  keep: boolean;
  maxLiveHours: number | null;
  canUseCredits: string[];
  leftovers: string[];
  sources: { url: string; verified_on: string }[];
  html: string;
}

/** One H2 section of a rendered note; the part before the first H2 has the id and title ''. */
export interface Section {
  id: string;
  title: string;
  html: string;
}

export interface HeadingMeta {
  depth: 2 | 3;
  id: string;
  text: string;
}

export interface LessonChunk {
  slug: string;
  html: string;
  headings: HeadingMeta[];
}

export interface OptionView {
  id: string;
  text: string;
  correct: boolean;
  why: string;
}

export interface PairView {
  left: string;
  right: string;
  why: string;
}

/** A live practice question as the runner shows it (spec 2.6); raw ids show only in the report panel (spec 2.8). */
export interface QuestionView {
  id: string;
  version: number;
  type: 'single' | 'multi' | 'match';
  concept: string;
  note: string;
  task: string;
  level: 1 | 2 | 3;
  /** The stem, with ` (Select TWO.)` or ` (Select THREE.)` added to a multi. */
  stem: string;
  select: 2 | 3 | null;
  /** Single and multi only; empty for a match. */
  options: OptionView[];
  /** Match only, in authored order; empty otherwise. */
  pairs: PairView[];
  takeaway: string;
  /** "Read in notes": the section route that holds the first evidence line, and that line's text. */
  read: { route: string; text: string };
}

/** content/mNN.<hash>.json */
export interface ModuleChunk {
  module: number;
  readme: Section[];
  lessons: Record<string, LessonChunk>;
  /** Live practice questions of the module's lessons, in note order then id. */
  questions: QuestionView[];
}

export interface SearchEntry {
  kind: 'module' | 'lesson' | 'concept' | 'term' | 'mission';
  title: string;
  detail: string;
  route: string;
  /** Normalized text the palette matches word prefixes against. */
  text: string;
}

/** content/search.<hash>.json */
export interface SearchChunk {
  entries: SearchEntry[];
}

/** content/index.<hash>.json, whose name the build injects into index.html. */
export interface ContentIndex {
  contentVersion: string;
  modules: ModuleMeta[];
  concepts: ConceptMeta[];
  glossary: GlossaryItem[];
  missions: MissionMeta[];
  /** Every live practice question id to its version, so replay can count events about unknown questions. */
  questionVersions: Record<string, number>;
  /** Path of the search chunk from the site root. */
  search: string;
}
