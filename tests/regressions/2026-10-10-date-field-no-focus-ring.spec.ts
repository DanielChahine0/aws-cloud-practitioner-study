import { expect, test } from '@playwright/test';
import { readyModule, useSyntheticExam } from '../e2e/exam-helpers.ts';
import { failOnPageProblems } from '../e2e/helpers.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC' });

test('every keyboard stop in the exam date field shows a focus ring', async ({ page }) => {
  await useSyntheticExam(page);
  await page.clock.install({ time: new Date(E2E_NOW) });
  await readyModule(page, 3);
  await page.locator('button.topbar-rank').click();
  const input = page.locator('dialog.sheet .date-field input[type="date"]');
  await expect(input).toBeVisible();
  await input.focus();
  let stops = 0;
  while (stops < 6 && (await input.evaluate((el) => el === document.activeElement))) {
    const outline = await input.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline, `stop ${stops + 1}`).not.toBe('none');
    stops += 1;
    await page.keyboard.press('Tab');
  }
  expect(stops).toBeGreaterThan(0);
});
