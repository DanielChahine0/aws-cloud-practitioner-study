import { expect, type Page, test } from '@playwright/test';
import type { QuestionView } from '../../schemas/chunks.ts';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { timelineOf } from '../fixtures/events.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
} from './helpers.ts';
import { chunkFor, lessonsOf, pickRight, pickWrong, shown } from './questions.ts';

/** Day 1 and day 2 of every memory test, at 09:00 UTC, well after the 04:00 day start. */
const DAY1 = '2026-10-12T09:00:00.000Z';
const DAY2 = '2026-10-13T09:00:00.000Z';
const FIRST_LESSON = 'Start Module 1: Welcome to AWS Cloud Practitioner Essentials';
const LAMBDA = 'aws-lambda';

failOnPageProblems();
// UTC keeps the study day and the 04:00 boundary the same on every machine.
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(DAY1) });
});

/** The Next link on Home. */
const nextLink = (page: Page) => page.locator('a.next[data-next]');

/** The runner's screen-reader verdict line. */
const announcement = (page: Page) => page.locator('section.runner [aria-live="polite"]');

/** Clicks Check or Sure and waits for the verdict. */
async function submit(page: Page, sure: boolean): Promise<void> {
  await page.getByRole('button', { name: sure ? /^Sure/ : /^Check/ }).click();
  await expect(page.locator('.verdict')).toBeVisible();
}

/** Presses Next after feedback and waits for the next question or the end. */
async function next(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Next/ }).click();
  await expect(page.locator('.verdict')).toHaveCount(0);
}

/**
 * Runs the AWS Lambda lesson check: the first question whose concept has another live variant is answered wrong
 * (with Sure when `sure`), every other one right with Check. Returns that question.
 */
async function lambdaCheckWithOneWrong(page: Page, sure: boolean): Promise<QuestionView> {
  await page.goto(`/#/m/03/l/${LAMBDA}`);
  await expect(h1(page, 'AWS Lambda')).toBeVisible();
  const questions = await chunkFor(page, 3);
  await page.goto(`/#/s/check/m03/${LAMBDA}`);
  const variants = (q: QuestionView): number => questions.filter((x) => x.concept === q.concept).length;
  let wrong: QuestionView | null = null;
  const end = page.locator('.end-line');
  for (;;) {
    await expect(page.locator('section.runner, .end-line').first()).toBeVisible();
    if (await end.isVisible()) break;
    const q = await shown(page, questions);
    if (wrong === null && variants(q) >= 2) {
      wrong = q;
      await pickWrong(page, q);
      await submit(page, sure);
    } else {
      await pickRight(page, q);
      await submit(page, false);
    }
    await next(page);
  }
  if (wrong === null) throw new Error('no AWS Lambda check question has a second variant');
  return wrong;
}

/** Moves the page's clock to day 2 and reloads Home. */
async function goToDay2(page: Page): Promise<void> {
  await page.clock.setSystemTime(new Date(DAY2));
  await page.goto('/');
  // Home renders once the content index has loaded; a reload before that cancels its fetch, which WebKit reports.
  await expect(nextLink(page)).toBeVisible();
  await page.reload();
  await expect(h1(page, 'AWS Cloud Practitioner Essentials')).toBeVisible();
}

/** The note ids of every lesson in the given modules, in course order. */
async function noteIds(page: Page, modules: readonly number[]): Promise<string[]> {
  const out: string[] = [];
  for (const m of modules) {
    for (const slug of await lessonsOf(page, m)) out.push(`m${String(m).padStart(2, '0')}/${slug}`);
  }
  return out;
}

/** A log on day 1 that reads every given lesson, one minute apart. */
function readAll(notes: readonly string[]): StudyEvent[] {
  const start = Date.parse(DAY1) - 60 * 60_000;
  return timelineOf(
    notes.map((note, i) => [new Date(start + i * 1000).toISOString(), { t: 'lesson.done', note }] as const),
  );
}

/** A session id for seeded logs: a valid ULID per index. */
const sidOf = (i: number): string => `01K7${String(i).padStart(22, '0')}`;

test('the first run shows the first lesson as Next, 13 hexes not started and the first-run line', async ({
  page,
}) => {
  await page.goto('/');
  await expect(nextLink(page)).toContainText(FIRST_LESSON);
  const hexes = page.locator('a[data-nav-item][href^="#/m/"]');
  await expect(hexes).toHaveCount(13);
  for (const hex of await hexes.all()) {
    await expect(hex).toHaveAttribute('aria-label', /^Module \d+ .+, mastery 0, not started$/);
  }
  await expect(page.locator('.home-line')).toContainText('Progress lives in this browser.');
  await expectNoSidewaysScroll(page);
  await expectNoAxeViolations(page);
});

test('a right Sure answer pays 10 XP, flashes in the top bar and adds up in the end line', async ({
  page,
}) => {
  await page.goto(`/#/m/03/l/${LAMBDA}`);
  await expect(h1(page, 'AWS Lambda')).toBeVisible();
  const questions = await chunkFor(page, 3);
  await page.goto(`/#/s/check/m03/${LAMBDA}`);
  await pickRight(page, await shown(page, questions));
  await submit(page, true);
  // The flash shows for 600 ms from the moment the answer joins the log, so it is checked first.
  await expect(page.getByText('+10', { exact: true })).toBeVisible();
  await expect(announcement(page)).toHaveText('Correct. Plus 10 XP');
  await next(page);
  const end = page.locator('.end-line');
  for (;;) {
    await expect(page.locator('section.runner, .end-line').first()).toBeVisible();
    if (await end.isVisible()) break;
    await pickRight(page, await shown(page, questions));
    await submit(page, false);
    await next(page);
  }
  await expect(end).toHaveText(/^(\d+)\/\1 · \+\d+ XP$/);
});

test('a wrong answer comes back the next day as a review with a relearn step, and the streak reaches 2', async ({
  page,
}) => {
  const wrong = await lambdaCheckWithOneWrong(page, false);
  const questions = await chunkFor(page, 3);
  await goToDay2(page);

  await expect(page.getByRole('button', { name: '1 due: 1 concept, start a review' })).toBeVisible();
  await expect(nextLink(page)).toContainText('Review 1 concept');
  await expectNoSidewaysScroll(page);
  await expectNoAxeViolations(page);
  await page.locator('h1').click();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/s\/review$/);

  const first = await shown(page, questions);
  expect(first.concept).toBe(wrong.concept);
  await expect(page.locator('.runner-position')).toHaveText('1 of 1');
  await expectNoAxeViolations(page);
  await pickWrong(page, first);
  await submit(page, false);
  await expect(announcement(page)).toHaveText('Incorrect. Plus 5 XP');
  await expectNoAxeViolations(page);
  await next(page);

  const relearn = await shown(page, questions);
  expect(relearn.concept).toBe(first.concept);
  expect(relearn.id).not.toBe(first.id);
  await expect(page.locator('.runner-position')).toHaveText('2 of 2');
  await pickRight(page, relearn);
  await submit(page, false);
  await expect(announcement(page)).toHaveText('Correct.');
  await next(page);

  await expect(page.locator('.end-line')).toContainText('0/1 · +5 XP');
  await expect(page.getByText('Done for now.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to Home' }).click();
  await expect(page.getByRole('button', { name: '2d streak: 2 days, open Progress' })).toContainText('2d');
  await expectNoAxeViolations(page);
});

test('a wrong Sure answer comes back the next day as a misconception with every why open', async ({
  page,
}) => {
  const wrong = await lambdaCheckWithOneWrong(page, true);
  const questions = await chunkFor(page, 3);
  await goToDay2(page);
  await nextLink(page).click();
  await expect(page).toHaveURL(/#\/s\/review$/);
  const q = await shown(page, questions);
  expect(q.concept).toBe(wrong.concept);
  await pickRight(page, q);
  await submit(page, false);
  await expect(page.getByText('You were sure last time')).toBeVisible();
  const whys = page.locator('.review details');
  expect(await whys.count()).toBeGreaterThan(0);
  await expect(page.locator('.review details:not([open])')).toHaveCount(0);
});

test.describe('the exam date question', () => {
  test('shows once Module 1 is read, and Save hides it for good', async ({ page }) => {
    await page.goto('/');
    await seedEvents(page, readAll(await noteIds(page, [1])));
    const question = page.getByText('No exam date yet. The plan targets Sat 14 Nov.');
    await expect(question).toBeVisible();
    await expect(page.getByLabel('Exam date')).toHaveValue('2026-11-14');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(question).toBeHidden();
    await page.reload();
    await expect(h1(page, 'AWS Cloud Practitioner Essentials')).toBeVisible();
    await expect(nextLink(page)).toBeVisible();
    await expect(question).toBeHidden();

    await page.locator('h1').click();
    await page.keyboard.press('g');
    await page.keyboard.press('p');
    const sheet = page.getByRole('dialog', { name: 'Progress' });
    await expect(sheet.getByRole('heading', { name: 'Exam date' })).toBeVisible();
    await expect(sheet.getByLabel('Exam date')).toHaveValue('2026-11-14');
    await expectNoAxeViolations(page);
  });

  test('Not now hides it for good', async ({ page }) => {
    await page.goto('/');
    await seedEvents(page, readAll(await noteIds(page, [1])));
    const question = page.getByText('No exam date yet. The plan targets Sat 14 Nov.');
    await expect(question).toBeVisible();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(question).toBeHidden();
    await page.reload();
    await expect(nextLink(page)).toBeVisible();
    await expect(question).toBeHidden();
  });
});

test('every lesson read and checked with nothing due shows Done for today', async ({ page }) => {
  await page.goto('/');
  const notes = await noteIds(page, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  const start = Date.parse(DAY1) - 3 * 60 * 60_000;
  const at = (i: number): string => new Date(start + i * 1000).toISOString();
  const items: (readonly [string, NewEvent])[] = [];
  for (const [i, note] of notes.entries()) {
    const sid = sidOf(i + 1);
    items.push([
      at(3 * i),
      { t: 'session', sid, mode: 'check', phase: 'start', seed: 1, scope: note, qids: [] },
    ]);
    items.push([at(3 * i + 1), { t: 'session', sid, mode: 'check', phase: 'submit', seed: 1 }]);
    items.push([at(3 * i + 2), { t: 'lesson.done', note }]);
  }
  items.push([at(3 * notes.length), { t: 'settings', patch: { examDate: '2026-11-14' } }]);
  await seedEvents(page, timelineOf(items));
  await expect(page.getByText('Done for today', { exact: true })).toBeVisible();
  await expect(page.getByText('Nothing due.', { exact: true })).toBeVisible();
  await expect(nextLink(page)).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  await expectNoAxeViolations(page);
});

test('Enter follows Next, j and k move between hexes, and g r opens Review', async ({ page }) => {
  await page.goto('/');
  await expect(nextLink(page)).toContainText(FIRST_LESSON);
  await page.locator('h1').click();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/m\/01\/l\/welcome-to-aws-cloud-practitioner-essentials$/);
  // The pager shows once the module chunk has loaded; leaving before that cancels its fetch, which WebKit reports.
  await expect(page.getByRole('navigation', { name: 'Lessons' })).toBeVisible();

  await page.goto('/');
  await expect(nextLink(page)).toBeVisible();
  await page.locator('h1').click();
  await page.keyboard.press('j');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Module 1 /);
  await page.keyboard.press('j');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Module 2 /);
  await page.keyboard.press('k');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Module 1 /);
  await page.keyboard.press('k');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Module 1 /);

  await page.keyboard.press('g');
  await page.keyboard.press('r');
  await expect(page).toHaveURL(/#\/s\/review$/);
  await expect(page.getByText('Nothing due.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
});

test('the first lesson check announces First Brew', async ({ page }) => {
  await lambdaCheckWithOneWrong(page, false);
  await expect(page.locator('p.badge-line')).toHaveText('Badge: First Brew');
});
