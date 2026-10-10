import { expect, test } from '@playwright/test';
import { useSyntheticExam } from '../e2e/exam-helpers.ts';
import { failOnPageProblems } from '../e2e/helpers.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

test('the current grid cell is marked unlike the keyboard focus ring', async ({ page }) => {
  await useSyntheticExam(page);
  await page.clock.install({ time: new Date(E2E_NOW) });
  await page.goto('/#/s/mock/a');
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  await expect(page.locator('section.exam')).toBeVisible();
  await page.keyboard.press('1');
  await page.keyboard.press('g');
  const grid = page.getByRole('navigation', { name: 'Questions' });
  await expect(grid).toBeVisible();
  const current = grid.locator('.grid-cell[aria-current="true"]');
  await expect(current).toHaveCount(1);
  await expect(current).not.toBeFocused();
  // Outline is the focus ring alone (base.css :focus-visible); the current cell needs a mark of its own.
  const style = await current.evaluate((el) => {
    const s = getComputedStyle(el);
    return { outline: s.outlineStyle, shadow: s.boxShadow };
  });
  expect(style.outline).toBe('none');
  expect(style.shadow).not.toBe('none');
});
