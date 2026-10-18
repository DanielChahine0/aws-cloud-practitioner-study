/** Helpers for the capstone end-to-end tests; the project chunk they serve is made-up bakery text. */
import type { Page } from '@playwright/test';
import type { ConceptMeta, ContentIndex } from '../../schemas/chunks.ts';
import type { ProjectChunk } from '../../schemas/project-view.ts';
import { SCHEMA_VERSION } from '../../schemas/version.ts';
import { DB_NAME, STORES } from '../../src/store/idb.ts';

/** The file name the patched index gives the project chunk; any `content/project.*.json` request gets the chunk. */
export const SYNTHETIC_PROJECT_FILE = 'content/project.e2e00000.json';
export const SYNTHETIC_PROJECT_TITLE = 'Move the bakery to the cloud';
export const SYNTHETIC_CONTEXT = [
  'The bakery bakes for twelve shops.',
  'Mornings bring ten times the usual orders.',
];
/** Live key points per synthetic decision. */
export const KEY_POINTS_PER_DECISION = 4;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * A made-up brief: 13 decisions titled `Bakery decision N`, each with four key points on the first four tested
 * concepts homed in module N, linking to their real lesson anchors, so the reveal shows real display names.
 */
export function syntheticProject(concepts: readonly ConceptMeta[]): ProjectChunk {
  const levels = ['Missing', 'Weak', 'Good', 'Strong'] as const;
  return {
    title: SYNTHETIC_PROJECT_TITLE,
    facts: ['The bakery has twelve shops and one kitchen.', 'Its cloud budget is $300 a month.'],
    rubric: {
      passTotal: 8,
      criteria: [
        { id: 'fit', name: 'Fit', levels },
        { id: 'grounding', name: 'Grounding', levels },
        { id: 'tradeoffs', name: 'Trade-offs', levels },
        { id: 'cost', name: 'Cost and responsibility', levels },
      ],
    },
    decisions: Array.from({ length: 13 }, (_, i) => {
      const module = i + 1;
      const homed = concepts.filter((c) => c.tested && c.home.startsWith(`m${pad2(module)}/`));
      return {
        module,
        title: `Bakery decision ${module}`,
        prompt: `Choose how the bakery handles step ${module} of its move.`,
        context: SYNTHETIC_CONTEXT,
        keyPoints: homed.slice(0, KEY_POINTS_PER_DECISION).map((c, k) => ({
          id: `kp-${pad2(module)}-e2e-${k + 1}`,
          text: `Bakery point ${k + 1} of decision ${module} keeps the ovens honest.`,
          concepts: [c.id],
          read: {
            route: `#/m/${pad2(module)}/l/${c.home.slice(4)}/${c.anchor}`,
            text: `Made-up evidence line ${k + 1} for decision ${module}.`,
          },
        })),
      };
    }),
  };
}

/**
 * Serves the made-up project in place of the real one, as `useSyntheticExam` does for the exam: the index names the
 * synthetic chunk file, and every project chunk request gets the synthetic chunk, so no real key point is fetched.
 */
export async function useSyntheticProject(page: Page): Promise<void> {
  let chunk: ProjectChunk | null = null;
  await page.route('**/content/index.*.json', async (route) => {
    const response = await route.fetch();
    const index = (await response.json()) as ContentIndex;
    chunk = syntheticProject(index.concepts);
    await route.fulfill({ response, json: { ...index, project: SYNTHETIC_PROJECT_FILE } });
  });
  await page.route('**/content/project.*.json', async (route) => {
    if (chunk === null) await route.fulfill({ status: 404, body: '' });
    else await route.fulfill({ json: chunk });
  });
}

/** Reads kv values straight from the page's IndexedDB, by key; a missing key reads as undefined. */
export async function readKv(page: Page, keys: readonly string[]): Promise<Record<string, unknown>> {
  return page.evaluate(
    async ({ name, version, store, list }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name, version);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const out: Record<string, unknown> = {};
      for (const key of list) {
        const row = await new Promise<{ value: unknown } | undefined>((resolve, reject) => {
          const request = db.transaction(store, 'readonly').objectStore(store).get(key);
          request.onsuccess = () => resolve(request.result as { value: unknown } | undefined);
          request.onerror = () => reject(request.error);
        });
        out[key] = row?.value;
      }
      db.close();
      return out;
    },
    { name: DB_NAME, version: SCHEMA_VERSION, store: STORES.kv, list: [...keys] },
  );
}
