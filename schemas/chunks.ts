/** Types of the JSON chunks that scripts/content/build.ts writes and the app reads (spec 2.10). */
import type { LabEngineId } from './ids.ts';

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
  /** Live lab ids that name this concept (spec 2.4 reverse links); present only when there is one, to keep the index small. */
  labs?: string[];
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

/** A live lab as Home, the module page and badges need it without its chunk (spec 5). */
export interface LabMeta {
  id: string;
  module: number;
  engine: LabEngineId;
  tier: 'core' | 'stretch';
  rev: number;
  title: string;
  minutes: number;
}

/**
 * A live lab as the lab screen runs it: the engine spec with its defaults applied, never the solution or the wrong
 * paths (spec 5.1). Text is plain, and `credits` asks the screen to label prices as lab credits.
 */
export interface LabView extends LabMeta {
  concepts: string[];
  brief: string;
  spec: unknown;
  goals: { id: string; label: string; hint: string }[];
  /** "Read in notes" links: each cited note's route and lesson title. */
  notes: { route: string; title: string }[];
  /** The debrief lines and its 2 to 3 live practice questions, in file order. */
  debrief: { lines: string[]; questions: QuestionView[] };
  credits: boolean;
}

/** A shipped daily incident in the index: its id, title and required modules, the first being its home (spec 4.5). */
export interface IncidentMeta {
  id: string;
  title: string;
  modules: number[];
}

/** A shipped incident in its home module's chunk: the brief and its steps as the runner shows them. */
export interface IncidentView extends IncidentMeta {
  brief: string;
  steps: QuestionView[];
}

/** content/mNN.<hash>.json */
export interface ModuleChunk {
  module: number;
  readme: Section[];
  lessons: Record<string, LessonChunk>;
  /** Live practice questions of the module's lessons, in note order then id. */
  questions: QuestionView[];
  /** The module's live labs, core before stretch, then by id. */
  labs: LabView[];
  /** Shipped incidents whose home module is this one, in id order. */
  incidents: IncidentView[];
}

export interface SearchEntry {
  kind: 'module' | 'lesson' | 'concept' | 'term' | 'mission' | 'lab';
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

/** A blueprint domain for Progress and readiness (spec 2.10). */
export interface DomainView {
  id: string;
  name: string;
  weight: number;
}

/** A blueprint task statement; `short` names it on one Home line, for example `access management`. */
export interface TaskView {
  id: string;
  domain: string;
  text: string;
  short: string;
}

/** A rank of content/game/ranks.yaml; Basic has no requirements and no facts. */
export interface RankView {
  id: string;
  name: string;
  short: string;
  requires: Record<string, number | boolean>;
  facts: string[];
}

/** A badge of content/game/badges.yaml; `arrives` names the phase content a badge waits for. */
export interface BadgeView {
  id: string;
  name: string;
  rule: string;
  arrives: 'labs' | 'missions' | 'capstone' | null;
}

/**
 * What replay, stale detection and domain scores need of a form item, never its text.
 * `concept` is the registered concept id, never an alias.
 */
export interface ExamItemRef {
  version: number;
  concept: string;
  task: string;
  form: string;
  type: 'single' | 'multi';
}

/** One mock form: `chunk` is content/exam-a.<hash8>.json, and `size` counts the live items it ships. */
export interface ExamFormMeta {
  id: string;
  chunk: string;
  frozen: boolean;
  size: number;
}

/** content/exam-<form>.<hash>.json: one form's live items in form order, loaded only by its mock or once it is taken. */
export interface ExamChunk {
  form: string;
  questions: QuestionView[];
}

/** content/index.<hash>.json, whose name the build injects into index.html. */
export interface ContentIndex {
  contentVersion: string;
  modules: ModuleMeta[];
  concepts: ConceptMeta[];
  glossary: GlossaryItem[];
  missions: MissionMeta[];
  /** Every live practice question and shipped incident step id to its version, so replay can count unknown ones. */
  questionVersions: Record<string, number>;
  /** Path of the search chunk from the site root. */
  search: string;
  blueprint: { domains: DomainView[]; tasks: TaskView[] };
  ranks: RankView[];
  badges: BadgeView[];
  /** The mock forms and their item refs; form items never appear in `questionVersions`, a module chunk or search. */
  exam: { forms: ExamFormMeta[]; items: Record<string, ExamItemRef> };
  /** Every live lab, in module order, core before stretch, then by id. */
  labs: LabMeta[];
  /** Every shipped incident, in id order, so Home can pick today's without loading a chunk. */
  incidents: IncidentMeta[];
  /** Path of the lazy project chunk (spec 6) from the site root, or null while there is no brief. */
  project: string | null;
}
