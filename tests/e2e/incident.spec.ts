import { expect, test } from '@playwright/test';
import type { QuestionView } from '../../schemas/chunks.ts';
import { SURE_HINT } from '../../src/engine/bets.ts';
import { expectNoAxeViolations, expectNoSidewaysScroll, failOnPageProblems, h1 } from './helpers.ts';
import {
  at,
  DAY1,
  DAY2,
  expectedOn,
  incidentSteps,
  incidentTitle,
  readModule2,
  useSyntheticIncidents,
} from './incident-helpers.ts';
import { pickRight, shown } from './questions.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC' });

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
    const steps: QuestionView[] = await incidentSteps(page);
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
