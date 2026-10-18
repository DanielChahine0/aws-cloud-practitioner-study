import { signal } from '@preact/signals';
import type { ProjectChunk } from '../../schemas/project-view.ts';
import { index } from './content.ts';

// The capstone chunk's loader lives apart from the eager `content.ts`, so only the lazy screens that ask for the
// chunk ship it: the Project screen and the module page's Capstone row.

/** The capstone brief and live key points, once the Project screen or a module page has asked for them. */
export const project = signal<ProjectChunk | null>(null);

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
