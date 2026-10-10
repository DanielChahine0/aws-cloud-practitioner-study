import { expect, type Page, test } from '@playwright/test';
import type { NewEvent } from '../../schemas/events.ts';
import { eventsOf, timelineOf } from '../fixtures/events.ts';
import { failOnPageProblems, h1, seedEvents } from './helpers.ts';
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
