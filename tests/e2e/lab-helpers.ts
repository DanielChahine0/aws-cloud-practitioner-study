/** Helpers for the lab end-to-end tests: a made-up bakery lab served by `page.route`, and reads of the stored log. */
import type { Page } from '@playwright/test';
import type { ContentIndex, LabMeta, LabView, ModuleChunk, QuestionView } from '../../schemas/chunks.ts';
import { SCHEMA_VERSION } from '../../schemas/version.ts';
import { DB_NAME, STORES } from '../../src/store/idb.ts';
import { KV_KEYS } from '../../src/store/kv.ts';

export const SYNTHETIC_SORT_LAB_ID = 'lab-m01-bakery-sort';
export const SYNTHETIC_SORT_TITLE = 'Sort the bakery jobs';

/**
 * Serves a made-up lab beside the real content: the index lists its `LabMeta`, and its module's chunk carries the
 * `LabView`, whose debrief takes the first two live practice questions of that real chunk.
 */
export async function useSyntheticLab(
  page: Page,
  lab: (questions: QuestionView[]) => LabView,
): Promise<void> {
  const { id, module, engine, tier, rev, title, minutes } = lab([]);
  const meta: LabMeta = { id, module, engine, tier, rev, title, minutes };
  await page.route('**/content/index.*.json', async (route) => {
    const response = await route.fetch();
    const index = (await response.json()) as ContentIndex;
    await route.fulfill({ response, json: { ...index, labs: [...index.labs, meta] } });
  });
  await page.route(`**/content/m${String(module).padStart(2, '0')}.*.json`, async (route) => {
    const response = await route.fetch();
    const chunk = (await response.json()) as ModuleChunk;
    const view = lab(chunk.questions.slice(0, 2));
    await route.fulfill({ response, json: { ...chunk, labs: [...chunk.labs, view] } });
  });
}

/** A made-up bakery Sort lab: 3 buckets, 5 cards and 2 goals, with `questions` as its debrief. */
export function syntheticSortLab(questions: QuestionView[]): LabView {
  return {
    id: SYNTHETIC_SORT_LAB_ID,
    module: 1,
    engine: 'sort',
    tier: 'core',
    rev: 1,
    title: SYNTHETIC_SORT_TITLE,
    minutes: 4,
    concepts: [...new Set(questions.map((q) => q.concept))],
    brief:
      'The bakery opens at six. Put each morning job where it happens, so the early shift knows where to stand.',
    spec: {
      buckets: [
        { id: 'bench', label: 'Work bench' },
        { id: 'oven', label: 'Hired oven', detail: 'Paid by the hour' },
        { id: 'shelf', label: 'Dry shelf' },
      ],
      cards: [
        {
          id: 'knead',
          text: 'Knead the dough for the morning loaves',
          bucket: 'bench',
          also: [],
          goal: 'g1',
        },
        { id: 'rolls', text: 'Bake forty rolls before opening', bucket: 'oven', also: [], goal: 'g1' },
        { id: 'flour', text: 'Keep the spare flour sacks dry', bucket: 'shelf', also: [], goal: 'g2' },
        { id: 'jars', text: 'Store the jam jars for the week', bucket: 'shelf', also: [], goal: 'g2' },
        { id: 'pies', text: 'Bake the pies ordered for noon', bucket: 'oven', also: [], goal: 'g2' },
      ],
    },
    goals: [
      {
        id: 'g1',
        label: 'The opening jobs are in place',
        hint: 'Dough is worked by hand on the bench, and only baking needs the oven you pay for by the hour.',
      },
      {
        id: 'g2',
        label: 'Storage and the noon bake are in place',
        hint: 'Anything that only waits belongs on a shelf, and anything that still has to bake goes to the oven.',
      },
    ],
    notes: questions.slice(0, 1).map((q) => ({ route: q.read.route, title: 'The lesson behind this lab' })),
    debrief: {
      lines: [
        'Each job has one place where it happens, and the hired oven costs money only while it bakes.',
        'Storage never needs the oven, so the shelf keeps the paid hours for baking.',
      ],
      questions,
    },
    credits: false,
  };
}

/** A lab as the app reads it: the index named in the page, then its module's chunk. */
export async function labFor(page: Page, id: string): Promise<LabView> {
  const lab = await page.evaluate(async (labId) => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as {
      modules: { n: number; chunk: string }[];
      labs: { id: string; module: number }[];
    };
    const module = index.labs.find((l) => l.id === labId)?.module;
    const chunk = index.modules.find((m) => m.n === module)?.chunk;
    if (chunk === undefined) return null;
    return (
      ((await (await fetch(chunk)).json()) as { labs: LabView[] }).labs.find((l) => l.id === labId) ?? null
    );
  }, id);
  if (lab === null) throw new Error(`lab ${id} is not in the index`);
  return lab;
}

/** How many actions the stored draft of a lab holds, or null when it has no draft. */
export async function storedDraftActions(page: Page, id: string): Promise<number | null> {
  return page.evaluate(
    async ({ name, version, store, key, labId }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name, version);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const record = await new Promise<{ value?: Record<string, { actions?: unknown[] }> } | undefined>(
        (resolve, reject) => {
          const get = db.transaction(store, 'readonly').objectStore(store).get(key);
          get.onsuccess = () => resolve(get.result);
          get.onerror = () => reject(get.error);
        },
      );
      db.close();
      return record?.value?.[labId]?.actions?.length ?? null;
    },
    { name: DB_NAME, version: SCHEMA_VERSION, store: STORES.kv, key: KV_KEYS.labDrafts, labId: id },
  );
}

/** How many `lab.done` events of a lab the stored log holds. */
export async function labDoneCount(page: Page, id: string): Promise<number> {
  return page.evaluate(
    async ({ name, version, store, labId }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name, version);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const all = await new Promise<{ t?: string; lab?: string }[]>((resolve, reject) => {
        const get = db.transaction(store, 'readonly').objectStore(store).getAll();
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      });
      db.close();
      return all.filter((e) => e.t === 'lab.done' && e.lab === labId).length;
    },
    { name: DB_NAME, version: SCHEMA_VERSION, store: STORES.events, labId: id },
  );
}
