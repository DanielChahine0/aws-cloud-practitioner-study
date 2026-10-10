import { computed, signal } from '@preact/signals';
import type {
  ContentIndex,
  ExamChunk,
  GlossaryItem,
  ModuleChunk,
  SearchChunk,
  SearchEntry,
} from '../../schemas/chunks.ts';
import type { ProjectChunk } from '../../schemas/project-view.ts';

/** The content index named by the build in `<meta name="ccp-content">`. */
export const index = signal<ContentIndex | null>(null);
/** Set when any content file fails to load; the app shows it instead of a screen. */
export const loadError = signal<string | null>(null);
/** Module chunks loaded so far, by module number. */
export const modules = signal<ReadonlyMap<number, ModuleChunk>>(new Map());
/** Mock form chunks loaded so far, by form id (`A` to `D`). */
export const examForms = signal<ReadonlyMap<string, ExamChunk>>(new Map());
/** The capstone brief and live key points, once the Project screen or a module page has asked for them. */
export const project = signal<ProjectChunk | null>(null);
/** The search entries, once the palette has asked for them. */
export const searchEntries = signal<readonly SearchEntry[] | null>(null);
/** Glossary items by id, for the term popovers. */
export const glossary = computed<ReadonlyMap<string, GlossaryItem>>(
  () => new Map((index.value?.glossary ?? []).map((item) => [item.id, item])),
);

const requested = new Set<string>();
let searchWanted = false;

/** Fetches one content file at most once; a failure sets `loadError` and allows a later retry. */
function load<T>(name: string, apply: (data: T) => void): void {
  if (requested.has(name)) return;
  requested.add(name);
  fetch(name)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<T>;
    })
    .then(apply)
    .catch((error: unknown) => {
      requested.delete(name);
      loadError.value = `Could not load ${name}: ${error instanceof Error ? error.message : String(error)}`;
    });
}

export function loadIndex(): void {
  const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content;
  if (name === undefined || name === '') {
    loadError.value = 'This page has no content index; rebuild the site.';
    return;
  }
  load<ContentIndex>(name, (data) => {
    index.value = data;
    if (searchWanted) ensureSearch();
  });
}

export function ensureModule(n: number): void {
  const meta = index.value?.modules.find((m) => m.n === n);
  if (meta === undefined || modules.value.has(n)) return;
  load<ModuleChunk>(meta.chunk, (chunk) => {
    modules.value = new Map(modules.value).set(n, chunk);
  });
}

/** Loads the search entries; asked for before the index has arrived, it loads them once the index does. */
export function ensureSearch(): void {
  searchWanted = true;
  const name = index.value?.search;
  if (name === undefined || searchEntries.value !== null) return;
  load<SearchChunk>(name, (chunk) => {
    searchEntries.value = chunk.entries;
  });
}

const examLoads = new Map<string, Promise<ExamChunk | null>>();

/**
 * Loads one mock form's chunk at most once (spec 4.3); only its mock, and once the form is taken the learn screens
 * and results, ask for it. It resolves to the chunk, or to null for an unknown form or a failed fetch, which a later
 * call retries; it never sets `loadError`, so a mock start that cannot load its form records nothing and says so.
 */
export function ensureExamForm(id: string): Promise<ExamChunk | null> {
  const loaded = examForms.value.get(id);
  if (loaded !== undefined) return Promise.resolve(loaded);
  const meta = index.value?.exam.forms.find((f) => f.id === id);
  if (meta === undefined) return Promise.resolve(null);
  const pending = examLoads.get(id);
  if (pending !== undefined) return pending;
  const load = fetch(meta.chunk)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<ExamChunk>;
    })
    .then((chunk) => {
      examForms.value = new Map(examForms.value).set(id, chunk);
      return chunk;
    })
    .catch(() => null)
    .finally(() => examLoads.delete(id));
  examLoads.set(id, load);
  return load;
}

let projectLoad: Promise<ProjectChunk | null> | null = null;

/**
 * Loads the project chunk at most once (spec 6); only the Project screen and the module page's Capstone row ask for
 * it, so no other screen holds the key points before a self-grade. It resolves to null when the build has no brief or
 * the fetch fails, which a later call retries, and it never sets `loadError`.
 */
export function ensureProject(): Promise<ProjectChunk | null> {
  if (project.value !== null) return Promise.resolve(project.value);
  const name = index.value?.project ?? null;
  if (name === null) return Promise.resolve(null);
  if (projectLoad !== null) return projectLoad;
  const load = fetch(name)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<ProjectChunk>;
    })
    .then((chunk) => {
      project.value = chunk;
      return chunk;
    })
    .catch(() => null)
    .finally(() => {
      projectLoad = null;
    });
  projectLoad = load;
  return load;
}
