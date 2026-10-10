import { expect, type Page, test } from '@playwright/test';
import { eventsOf } from '../fixtures/events.ts';
import { failOnPageProblems, h1, seedEvents } from './helpers.ts';

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
  await page.goto('/#/m/07');
  await expect(page.locator('a.row', { hasText: lesson.title })).toContainText('Read');
});
