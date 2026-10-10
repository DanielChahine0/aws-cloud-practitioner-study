import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import { parse } from 'yaml';
import type { NewEvent } from '../../schemas/events.ts';
import { eventsOf, timelineOf } from '../fixtures/events.ts';
import { failOnPageProblems, h1, seedEvents } from './helpers.ts';
import { labDoneCount } from './lab-helpers.ts';
import { chunkFor } from './questions.ts';

const HOME_TITLE = 'AWS Cloud Practitioner Essentials';

// The only file that runs under the service worker; playwright.config.ts blocks it everywhere else.
test.use({ serviceWorkers: 'allow' });

failOnPageProblems();

/** A module's lessons from the content index, read the way the app reads it. */
async function lessonsOf(page: Page, module: number): Promise<{ slug: string; title: string }[]> {
  return page.evaluate(async (n) => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as {
      modules: { n: number; lessons: { slug: string; title: string }[] }[];
    };
    return index.modules.find((m) => m.n === n)?.lessons ?? [];
  }, module);
}

/** Loads Home once online and waits until the service worker has precached the build and controls the page. */
async function installWorker(page: Page): Promise<void> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect(async () => {
    await page.reload();
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  }).toPass({ timeout: 15_000 });
}

test.beforeEach(({ browserName }) => {
  test.skip(
    browserName === 'webkit',
    "Playwright's WebKit offline mode fails even the requests a service worker answers, so offline use is tested in Chromium only",
  );
});

test('after one visit, Home and a lesson never opened online work offline', async ({ page, context }) => {
  await installWorker(page);
  const [lesson] = await lessonsOf(page, 7);
  if (lesson === undefined) throw new Error('Module 7 has no lessons');

  await context.setOffline(true);
  await page.reload();
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.goto(`/#/m/07/l/${lesson.slug}`);
  await expect(h1(page, lesson.title)).toBeVisible();
});

test('offline, a module quiz shows a question from a chunk never loaded online', async ({
  page,
  context,
}) => {
  await installWorker(page);
  await context.setOffline(true);
  await page.goto('/#/s/quiz/m03');
  await expect(page.locator('section.runner')).toBeVisible();
  await expect(page.locator('section.runner')).toHaveAttribute('data-qid', /^q-[0-9a-z]{6}$/);
});

test('offline, the app replays a seeded log', async ({ page, context }) => {
  await installWorker(page);
  const [lesson] = await lessonsOf(page, 7);
  if (lesson === undefined) throw new Error('Module 7 has no lessons');
  await seedEvents(page, eventsOf({ t: 'lesson.done', note: `m07/${lesson.slug}` }));

  await context.setOffline(true);
  // A hash-only goto would keep the running page, so reload to boot the app and replay the log offline.
  await page.goto('/#/m/07');
  await page.reload();
  await expect(page.locator('a.row', { hasText: lesson.title })).toContainText('Read');
});

test('offline, a review shows a concept that fell due', async ({ page, context }) => {
  await installWorker(page);
  const questions = await chunkFor(page, 3);
  const [q] = questions;
  if (q === undefined) throw new Error('Module 3 has no live questions');
  // A wrong Not sure answer three days ago rates Again, so the concept fell due two days ago in any zone.
  const ago = (minutes: number): string =>
    new Date(Date.now() - (3 * 24 * 60 - minutes) * 60_000).toISOString();
  const sid = `01K7${'0'.repeat(20)}RV`;
  const items: (readonly [string, NewEvent])[] = [
    [ago(0), { t: 'session', sid, mode: 'check', phase: 'start', seed: 1, scope: q.note, qids: [q.id] }],
    [
      ago(1),
      {
        t: 'answer',
        sid,
        mode: 'check',
        qid: q.id,
        qv: q.version,
        concept: q.concept,
        picked: ['z'],
        correct: false,
        sure: false,
        ms: 5000,
      },
    ],
    [ago(2), { t: 'session', sid, mode: 'check', phase: 'submit', seed: 1 }],
  ];
  await seedEvents(page, timelineOf(items));

  await context.setOffline(true);
  await page.goto('/#/s/review');
  const runner = page.locator('section.runner');
  await expect(runner).toBeVisible();
  const qid = await runner.getAttribute('data-qid');
  expect(questions.find((x) => x.id === qid)?.concept).toBe(q.concept);
});

/** The parts of a shipped Sort lab file this test reads. */
interface SortLabFile {
  id: string;
  module: number;
  title: string;
  engine: string;
  status?: string;
  spec: { cards: { id: string; text: string }[] };
  solution: { t: string; card?: string; bucket?: string }[];
}

/** The shipped `lab-m01-who-patches-what`, or the first live Sort lab in file order when that one was cut. */
function shippedSortLab(): SortLabFile {
  const root = fileURLToPath(new URL('../../content/labs/', import.meta.url));
  const files = readdirSync(root)
    .sort()
    .flatMap((dir) =>
      readdirSync(join(root, dir))
        .filter((file) => file.endsWith('.yaml'))
        .sort()
        .map((file) => join(root, dir, file)),
    );
  const labs = files
    .map((file) => parse(readFileSync(file, 'utf8')) as SortLabFile)
    .filter((lab) => lab.engine === 'sort' && (lab.status ?? 'live') === 'live');
  const lab = labs.find((l) => l.id === 'lab-m01-who-patches-what') ?? labs[0];
  if (lab === undefined) throw new Error('no Sort lab has shipped');
  return lab;
}

test('offline, a Sort lab never opened online runs and records lab.done', async ({ page, context }) => {
  const lab = shippedSortLab();
  await installWorker(page);

  await context.setOffline(true);
  await page.goto(`/#/m/${String(lab.module).padStart(2, '0')}/lab/${lab.id}`);
  await expect(h1(page, lab.title)).toBeVisible();
  for (const action of lab.solution) {
    if (action.t !== 'place') continue;
    const text = lab.spec.cards.find((c) => c.id === action.card)?.text ?? '';
    await page.getByRole('group', { name: 'Cards' }).getByRole('button', { name: text, exact: true }).click();
    await page.locator(`#bucket-${action.bucket}`).click();
  }
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeVisible();
  await expect.poll(() => labDoneCount(page, lab.id)).toBe(1);
});
