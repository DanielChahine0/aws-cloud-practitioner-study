/** Types of the JSON chunks that scripts/content/build.ts writes and the app reads (spec 2.10). */

export interface LessonMeta {
  n: number;
  slug: string;
  title: string;
  concepts: string[];
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

/** A live practice question as the runner shows it. */
export interface QuestionView {
  id: string;
  version: number;
  type: 'single' | 'multi' | 'match';
  concept: string;
  note: string;
  task: string;
  level: 1 | 2 | 3;
  stem: string;
  select: 2 | 3 | null;
  options: OptionView[];
  pairs: PairView[];
  takeaway: string;
  /** Where "Read in notes" goes, and the evidence line it highlights there. */
  read: { route: string; text: string };
}

/** content/mNN.<hash>.json */
export interface ModuleChunk {
  module: number;
  readme: Section[];
  lessons: Record<string, LessonChunk>;
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
  /** Path of the search chunk from the site root. */
  search: string;
  /** Every live practice question id with its version, for replay's unknown-id count. */
  questionVersions: Record<string, number>;
}
