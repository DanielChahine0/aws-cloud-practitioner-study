import { expect, type Page, test } from '@playwright/test';
import type { ContentIndex, IncidentView, ModuleChunk, QuestionView } from '../../schemas/chunks.ts';
import { SURE_HINT } from '../../src/engine/bets.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { fnv1a } from '../../src/engine/rng.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import { HOME_TITLE } from './exam-helpers.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
  seedKv,
} from './helpers.ts';
import { chunkFor, lessonsOf, pickRight, shown } from './questions.ts';

/** Two study days whose `fnv1a` parities differ (tests/unit/incident-app.test.ts pins it), at 10:00 UTC. */
const DAY1 = '2026-10-20';
const DAY2 = '2026-10-21';
const at = (day: string, hour = 10): Date => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00.000Z`);

/** Two made-up incidents of equal score on Module 2, so the day alone decides between them. */
const SYNTHETIC = [
  { id: 'inc-901', title: 'The ovens went cold', modules: [2] },
  { id: 'inc-902', title: 'The till slowed down', modules: [2] },
] as const;
const expectedOn = (day: string) => SYNTHETIC[fnv1a(day) % 2] ?? SYNTHETIC[0];

failOnPageProblems();
test.use({ timezoneId: 'UTC' });

/**
 * Serves the two synthetic incidents in place of any shipped one: the index lists exactly them, every module chunk
 * loses its incidents, and Module 2's chunk carries the two, each with two of its live single practice items.
 */
async function useSyntheticIncidents(page: Page): Promise<void> {
  await page.route('**/content/index.*.json', async (route) => {
    const response = await route.fetch();
    const index = (await response.json()) as ContentIndex;
    await route.fulfill({ response, json: { ...index, incidents: SYNTHETIC } });
  });
  await page.route('**/content/m*.json', async (route) => {
    const response = await route.fetch();
    const chunk = (await response.json()) as ModuleChunk;
    const singles = chunk.questions.filter((q) => q.type === 'single');
    const incidents: IncidentView[] =
      chunk.module === 2
        ? SYNTHETIC.map((s, i) => ({
            ...s,
            modules: [...s.modules],
            brief: `A made-up incident ${i + 1} for the end-to-end test, told over two steps at the cafe.`,
            steps: singles.slice(2 * i, 2 * i + 2),
          }))
        : [];
    await route.fulfill({ response, json: { ...chunk, incidents } });
  });
}

/** Seeds every Module 2 lesson as read the day before `DAY1`, with the engine version stamped. */
async function readModule2(page: Page): Promise<void> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  const lessons = await lessonsOf(page, 2);
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  await seedEvents(
    page,
    timelineOf(
      lessons.map((slug, i) => [
        at('2026-10-19', 9 + i).toISOString(),
        { t: 'lesson.done', note: `m02/${slug}` },
      ]),
    ),
  );
  await expect(h1(page, HOME_TITLE)).toBeVisible();
}

/** Loads Home, which records the day's offer, then moves to the incident screen in the page; returns its heading. */
async function incidentTitle(page: Page): Promise<string> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.evaluate(() => {
    location.hash = '#/s/incident';
  });
  const heading = page.getByRole('heading', { level: 1 });
  await expect(heading).not.toHaveText(HOME_TITLE);
  await expect(heading).not.toHaveText('Incident');
  return (await heading.textContent()) ?? '';
}

test.describe('the daily incident (spec 4.5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: at(DAY1) });
    await useSyntheticIncidents(page);
  });

  // A chunk request still in flight when a test ends or the page reloads must not fail the test.
  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('the incident offered on Home stays the same all day and changes the next day', async ({ page }) => {
    await readModule2(page);
    expect(await incidentTitle(page)).toBe(expectedOn(DAY1).title);
    await page.clock.setSystemTime(at(DAY1, 22));
    expect(await incidentTitle(page)).toBe(expectedOn(DAY1).title);
    await page.clock.setSystemTime(at(DAY2));
    expect(await incidentTitle(page)).toBe(expectedOn(DAY2).title);
    expect(expectedOn(DAY2).title).not.toBe(expectedOn(DAY1).title);
  });

  test('an incident runs step by step with the bet buttons and keys and pays 15 XP when every step is right', async ({
    page,
  }) => {
    await readModule2(page);
    await incidentTitle(page);
    await expect(page.locator('.incident-brief')).toContainText('A made-up incident');
    const steps: QuestionView[] = (await chunkFor(page, 2)).filter((q) => q.type === 'single').slice(0, 4);
    for (let i = 0; i < 2; i += 1) {
      const q = await shown(page, steps);
      await expect(page.locator('.runner-position')).toHaveText(`${i + 1} of 2`);
      await expect(page.locator('.submit-hint')).toHaveText(SURE_HINT);
      await pickRight(page, q);
      // The first step bets Sure with its button, the second with the Runner's Shift+Enter key.
      if (i === 0) await page.getByRole('button', { name: /^Sure/ }).click();
      else await page.keyboard.press('Shift+Enter');
      await expect(page.locator('.verdict')).toHaveText(/Correct/);
      await page.getByRole('button', { name: /^Next/ }).click();
    }
    await expect(page.locator('.incident-paid')).toHaveText('Incident solved. Plus 15 XP.');
    await expect(page.getByRole('link', { name: 'Back to Home', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.locator('.incident-empty')).toHaveText('Solved. The next incident comes tomorrow.');
  });

  test('the incident screen has no axe violations and no sideways scroll', async ({ page }) => {
    await readModule2(page);
    await incidentTitle(page);
    await expect(page.locator('section.runner')).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
  });

  test('before Module 2 is read the incident says Starts after Module 2.', async ({ page }) => {
    await page.goto('/#/s/incident');
    await expect(h1(page, 'Incident')).toBeVisible();
    await expect(page.locator('.incident-empty')).toHaveText('Starts after Module 2.');
  });
});
