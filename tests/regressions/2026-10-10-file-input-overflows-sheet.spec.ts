import { expect, test } from '@playwright/test';
import { readyModule, useSyntheticExam } from '../e2e/exam-helpers.ts';
import { failOnPageProblems } from '../e2e/helpers.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC' });

test('the backup import control stays inside the Progress sheet at 360 px', async ({ page }) => {
  await useSyntheticExam(page);
  await page.clock.install({ time: new Date(E2E_NOW) });
  await page.setViewportSize({ width: 360, height: 740 });
  await readyModule(page, 3);
  await page.locator('button.topbar-rank').click();
  const sheet = page.locator('dialog.sheet');
  await expect(sheet).toBeVisible();
  const boxes = await sheet.evaluate((dialog) => {
    const body = dialog.querySelector('.sheet-body');
    const input = dialog.querySelector('input[type="file"]');
    const label = input?.closest('label');
    if (body === null || input === null || label === null || label === undefined)
      throw new Error('no import control');
    const pad = Number.parseFloat(getComputedStyle(body).paddingRight);
    const content = body.getBoundingClientRect().right - pad;
    const visible = getComputedStyle(input).clipPath === 'inset(50%)' ? label : input;
    return { right: visible.getBoundingClientRect().right, content };
  });
  expect(boxes.right).toBeLessThanOrEqual(boxes.content + 0.5);
});
