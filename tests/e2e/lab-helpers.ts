/** Helpers for the lab end-to-end tests: a made-up bakery lab served by `page.route`, and reads of the stored log. */
import type { Page } from '@playwright/test';
import type { ContentIndex, LabMeta, LabView, ModuleChunk, QuestionView } from '../../schemas/chunks.ts';
import { SCHEMA_VERSION } from '../../schemas/version.ts';
import { DB_NAME, STORES } from '../../src/store/idb.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { bakeryPlaceLab } from '../fixtures/lab-place.ts';
import { bakerySimulateLab } from '../fixtures/lab-specs.ts';

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

export const SYNTHETIC_CONFIGURE_LAB_ID = 'lab-m01-bakery-region';

/** "Read in notes" for a synthetic lab: the section of the first debrief question. */
function notesOf(questions: QuestionView[]): LabView['notes'] {
  return [{ route: questions[0]?.read.route ?? '#/m/01', title: 'The first Module 1 lesson' }];
}

/** A made-up Configure lab with a lab-credit price index, so the screen shows the credits line. */
export function syntheticConfigureLab(questions: QuestionView[]): LabView {
  return {
    id: SYNTHETIC_CONFIGURE_LAB_ID,
    module: 1,
    engine: 'configure',
    tier: 'core',
    rev: 1,
    title: 'Choose the bakery Region',
    minutes: 4,
    concepts: ['bakery-region'],
    brief: 'The bakery moves its order service to the cloud. Customer data must stay in the home country.',
    spec: {
      fields: [
        {
          kind: 'select',
          id: 'region',
          label: 'Region',
          options: [
            {
              id: 'southvale',
              label: 'Southvale',
              detail:
                'Home country. 70 ms from the bakery. No order service yet. Price index 70 lab credits.',
            },
            {
              id: 'northport',
              label: 'Northport',
              detail:
                'Home country. 40 ms from the bakery. Runs the order service. Price index 120 lab credits.',
            },
            {
              id: 'eastmere',
              label: 'Eastmere',
              detail: 'Abroad. 15 ms from the bakery. Runs the order service. Price index 80 lab credits.',
            },
          ],
          initial: 'southvale',
        },
        { kind: 'toggle', id: 'spare', label: 'Keep a spare copy in a second zone', initial: false },
      ],
      rules: [
        { goal: 'g1', field: 'region', in: ['southvale', 'northport'] },
        { goal: 'g2', field: 'region', in: ['northport'] },
        { goal: 'g2', field: 'spare', in: [true] },
      ],
    },
    goals: [
      { id: 'g1', label: 'Customer data stays home', hint: 'Check where each Region keeps its data.' },
      { id: 'g2', label: 'Orders run, with a spare', hint: 'The order service must run there, twice over.' },
    ],
    notes: notesOf(questions),
    debrief: {
      lines: ['Residency rules come first, then the services you need.', 'Price breaks a tie last.'],
      questions: questions.slice(0, 2),
    },
    credits: true,
  };
}

export const SYNTHETIC_SIMULATE_LAB_ID = 'lab-m01-bakery-rush';

/** The bakery Oven rush lab of `tests/fixtures/lab-specs.ts` as the build ships it. */
export function syntheticSimulateLab(questions: QuestionView[]): LabView {
  const lab = bakerySimulateLab();
  return {
    id: SYNTHETIC_SIMULATE_LAB_ID,
    module: 1,
    engine: 'simulate',
    tier: 'core',
    rev: 1,
    title: 'Bakery morning rush',
    minutes: lab.minutes,
    concepts: lab.concepts,
    brief: lab.brief,
    spec: lab.spec,
    goals: lab.goals,
    notes: notesOf(questions),
    debrief: { lines: lab.debrief.lines, questions: questions.slice(0, 2) },
    credits: true,
  };
}

export const SYNTHETIC_PLACE_LAB_ID = 'lab-m01-bakery-ovens';

/** The bakery Place lab of `tests/fixtures/lab-place.ts` as the build ships it, with `questions` as its debrief. */
export function syntheticPlaceLab(questions: QuestionView[]): LabView {
  const lab = bakeryPlaceLab();
  return {
    id: SYNTHETIC_PLACE_LAB_ID,
    module: 1,
    engine: 'place',
    tier: 'core',
    rev: 1,
    title: lab.title,
    minutes: lab.minutes,
    concepts: lab.concepts,
    brief: lab.brief,
    spec: lab.spec,
    goals: lab.goals,
    notes: notesOf(questions),
    debrief: { lines: lab.debrief.lines, questions: questions.slice(0, 2) },
    credits: false,
  };
}
