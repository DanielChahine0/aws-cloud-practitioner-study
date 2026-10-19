/**
 * Visual baselines at 1280 px (chromium-desktop) and 375 px (webkit-mobile) (spec 9). Every page is drawn from
 * made-up content: the bakery fixture tree is built in the test process and served through `page.route`, padded to
 * 13 modules so Home shows the whole hex map, and the exam is the synthetic one. The clock, the time zone and
 * `crypto.getRandomValues` are fixed, so session seeds, option order and every date repeat on each run.
 */
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import type { ContentIndex, ModuleChunk, ModuleMeta } from '../../schemas/chunks.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { syntheticExam } from '../fixtures/exam-e2e.ts';
import { E2E_NOW, readyModuleEvents } from '../fixtures/ready-module.ts';
import { HOME_TITLE } from './exam-helpers.ts';
import { failOnPageProblems, h1, seedEvents, seedKv } from './helpers.ts';

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/content-root/', import.meta.url));
/** The fixture tree's own date (`FIXTURE_TODAY`), copied because `content-root.ts` imports Vitest. */
const FIXTURE_TODAY = '2026-10-10';
const MODULE_COUNT = 13;

/**
 * Exam screens show made-up items only, and nothing of them is kept beyond the run. The screenshot settings
 * (`animations`, `caret`) work through an inline style that WebKit refuses under the site's CSP, so this file
 * bypasses the CSP; every other spec still runs with it.
 */
test.use({ timezoneId: 'UTC', bypassCSP: true, trace: 'off', screenshot: 'off', video: 'off' });

failOnPageProblems();

/** The fixture build by file name, with the index padded to 13 modules and the synthetic exam in place. */
function syntheticSite(): Map<string, unknown> {
  const built = buildContent(loadContext(FIXTURE_ROOT, { today: FIXTURE_TODAY }));
  const files = new Map<string, unknown>();
  for (const [path, text] of built.files) files.set(path.slice(path.lastIndexOf('/') + 1), JSON.parse(text));
  const index = files.get(built.indexFile.slice(built.indexFile.lastIndexOf('/') + 1)) as ContentIndex;
  const first = index.modules[0];
  if (first === undefined) throw new Error('the fixture tree has no module');
  const padded: ModuleMeta[] = [first];
  for (let n = first.n + 1; n <= MODULE_COUNT; n += 1) {
    const nn = String(n).padStart(2, '0');
    padded.push({
      n,
      slug: `bakery-module-${n}`,
      title: `Module ${n}: Bakery Module ${n}`,
      short: `Bakery Module ${n}`,
      lessons: [
        {
          n: 1,
          slug: `bakery-lesson-${n}`,
          title: `Bakery Lesson ${n}`,
          concepts: [],
          minutes: 1,
          checkConcepts: 0,
        },
      ],
      chunk: `content/m${nn}.e2e00000.json`,
    });
  }
  const exam = syntheticExam(index.concepts.filter((c) => c.tested));
  for (const [file, chunk] of Object.entries(exam.chunks)) files.set(file, chunk);
  files.set('index', { ...index, modules: padded, exam: { forms: exam.forms, items: exam.items } });
  return files;
}

const SITE = syntheticSite();

/** Serves the synthetic site for every content request; an unknown chunk is a 404, which fails the test. */
async function useSyntheticSite(page: Page): Promise<void> {
  await page.route('**/content/*.json', async (route) => {
    const file = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const json = SITE.get(file.startsWith('index.') ? 'index' : file);
    if (json === undefined) await route.fulfill({ status: 404, body: '' });
    else await route.fulfill({ json });
  });
}

/** Freezes the page clock and makes `crypto.getRandomValues` return the same bytes on every run. */
async function freeze(page: Page): Promise<void> {
  await page.clock.setFixedTime(new Date(E2E_NOW));
  await page.addInitScript(() => {
    let next = 0;
    crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (array === null) return array;
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = (next * 73 + 41) % 256;
        next += 1;
      }
      return array;
    };
  });
}

/** Module 1 read and quizzed three times, so Home, the top bar and the module page show progress. */
async function seedProgress(page: Page): Promise<void> {
  const chunk = [...SITE.values()].find(
    (v): v is ModuleChunk => typeof v === 'object' && v !== null && (v as ModuleChunk).module === 1,
  );
  if (chunk === undefined) throw new Error('the fixture build has no Module 1 chunk');
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  await seedEvents(
    page,
    readyModuleEvents({
      module: 1,
      lessons: Object.keys(chunk.lessons),
      questions: chunk.questions,
      now: E2E_NOW,
    }),
  );
  await expect(h1(page, HOME_TITLE)).toBeVisible();
}

/** Moves the pointer off the page, so no hover state reaches the baseline, then compares the screenshot. */
async function expectShot(page: Page, name: string): Promise<void> {
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot(name);
}

test.beforeEach(async ({ page }) => {
  await freeze(page);
  await useSyntheticSite(page);
  await seedProgress(page);
});

test('Home', async ({ page }) => {
  await expect(page.locator('main a.hex')).toHaveCount(MODULE_COUNT);
  await expectShot(page, 'home.png');
});

test('the runner', async ({ page }) => {
  await page.goto('/#/s/check/m01/what-a-bakery-cloud-is');
  await expect(page.locator('section.runner #stem')).toBeFocused();
  await expectShot(page, 'runner.png');
});

test('the exam shell and its results', async ({ page }) => {
  await page.goto('/#/s/mock/a');
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  await expect(page.locator('section.exam #stem')).toBeFocused();
  await expectShot(page, 'exam-shell.png');
  await page.keyboard.press('Control+Enter');
  const confirm = page.locator('dialog.confirm');
  await confirm.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page).toHaveURL(/#\/r\/[0-9A-Z]{26}$/);
  await expect(page.locator('p.score-line')).toBeVisible();
  await expectShot(page, 'results.png');
});

test('a module page', async ({ page }) => {
  await page.goto('/#/m/01');
  await expect(page.getByRole('heading', { level: 2, name: 'Concepts' })).toBeVisible();
  await expectShot(page, 'module.png');
});

test('a lesson with an update line', async ({ page }) => {
  await page.goto('/#/m/01/l/what-a-bakery-cloud-is');
  await expect(page.locator('li.update').first()).toBeVisible();
  await page.locator('li.update').first().scrollIntoViewIfNeeded();
  await expectShot(page, 'lesson-update.png');
});

test('a Sort lab', async ({ page }) => {
  await page.goto('/#/m/01/lab/lab-m01-sort-the-bakes');
  await expect(page.getByRole('region', { name: 'Workspace' })).toBeVisible();
  await expectShot(page, 'sort-lab.png');
});
