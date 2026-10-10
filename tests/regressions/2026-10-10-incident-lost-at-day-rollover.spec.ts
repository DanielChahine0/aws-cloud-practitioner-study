import { expect, type Page, test } from '@playwright/test';
import { failOnPageProblems, h1 } from '../e2e/helpers.ts';
import {
  answerStep,
  at,
  DAY1,
  DAY2,
  expectedOn,
  incidentSteps,
  incidentTitle,
  readModule2,
  useSyntheticIncidents,
} from '../e2e/incident-helpers.ts';

/**
 * The incident screen found its incident only through today's offer and offered only once, when the store got ready.
 * So when the study day rolled over at 04:00 with the screen open, a running or just-solved incident vanished for
 * "No incident today.", and an idle screen never showed the new day's incident (spec 4.5).
 */
failOnPageProblems();
test.use({ timezoneId: 'UTC' });

/** From 23:00 on `DAY1` to 04:01 on `DAY2`, one minute into the next study day. */
const PAST_ROLLOVER = '05:01:00';

/** Moves the clock past 04:00 with the page open, so the minute tick moves the app into the next study day. */
async function rollOver(page: Page): Promise<void> {
  await page.clock.fastForward(PAST_ROLLOVER);
  await page.clock.runFor(1000);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: at(DAY1, 23) });
  await useSyntheticIncidents(page);
});

// A chunk request still in flight when a test ends or the page reloads must not fail the test.
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('an incident in progress keeps running past 04:00', async ({ page }) => {
  await readModule2(page);
  const title = await incidentTitle(page);
  expect(title).toBe(expectedOn(DAY1).title);
  const steps = await incidentSteps(page);
  await answerStep(page, steps);
  await expect(page.locator('.runner-position')).toHaveText('2 of 2');
  await rollOver(page);
  await expect(h1(page, title)).toBeVisible();
  await expect(page.locator('.runner-position')).toHaveText('2 of 2');
  await answerStep(page, steps);
  await expect(page.locator('.incident-paid')).toHaveText('Incident solved. Plus 15 XP.');
});

test('a solved incident keeps its end line past 04:00', async ({ page }) => {
  await readModule2(page);
  const title = await incidentTitle(page);
  const steps = await incidentSteps(page);
  await answerStep(page, steps);
  await answerStep(page, steps);
  await expect(page.locator('.incident-paid')).toHaveText('Incident solved. Plus 15 XP.');
  await rollOver(page);
  await expect(h1(page, title)).toBeVisible();
  await expect(page.locator('.incident-paid')).toHaveText('Incident solved. Plus 15 XP.');
});

test("a solved screen left open shows the next day's incident at 04:00", async ({ page }) => {
  await readModule2(page);
  await incidentTitle(page);
  const steps = await incidentSteps(page);
  await answerStep(page, steps);
  await answerStep(page, steps);
  await expect(page.locator('.incident-paid')).toBeVisible();
  await page.reload();
  await expect(page.locator('.incident-empty')).toHaveText('Solved. The next incident comes tomorrow.');
  await rollOver(page);
  await expect(h1(page, expectedOn(DAY2).title)).toBeVisible();
  await expect(page.locator('section.runner')).toBeVisible();
});
