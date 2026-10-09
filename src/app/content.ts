import { computed, signal } from '@preact/signals';
import type {
  ContentIndex,
  GlossaryItem,
  ModuleChunk,
  SearchChunk,
  SearchEntry,
} from '../../schemas/chunks.ts';

/** The content index named by the build in `<meta name="ccp-content">`. */
export const index = signal<ContentIndex | null>(null);
/** Set when any content file fails to load; the app shows it instead of a screen. */
export const loadError = signal<string | null>(null);
/** Module chunks loaded so far, by module number. */
export const modules = signal<ReadonlyMap<number, ModuleChunk>>(new Map());
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
