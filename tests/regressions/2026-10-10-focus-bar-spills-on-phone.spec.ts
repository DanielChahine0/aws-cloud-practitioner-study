import { expect, type Page, test } from '@playwright/test';
import { readyModule, useSyntheticExam } from '../e2e/exam-helpers.ts';
import { failOnPageProblems } from '../e2e/helpers.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

test.beforeEach(async ({ page }) => {
  await useSyntheticExam(page);
  await page.clock.install({ time: new Date(E2E_NOW) });
  await page.setViewportSize({ width: 360, height: 740 });
});

/** Every part of the focus bar sits inside the 44 px bar, and the exam label shows in full. */
async function expectBarFits(page: Page): Promise<void> {
  const bar = page.locator('header.topbar.focus');
  await expect(bar).toBeVisible();
  const report = await bar.evaluate((header) => {
    const outer = header.getBoundingClientRect();
    const inner = header.querySelector('.focus-bar');
    const label = header.querySelector('.exam-label');
    if (inner === null || label === null) throw new Error('no focus bar');
    const spills = [...inner.children]
      .map((child) => ({ text: child.textContent ?? '', box: child.getBoundingClientRect() }))
      .filter(({ box }) => box.top < outer.top || box.bottom > outer.bottom)
      .map(({ text, box }) => `${text}: ${Math.round(box.top)}..${Math.round(box.bottom)}`);
    const cut = label.scrollWidth > label.clientWidth || label.scrollHeight > label.clientHeight;
    return { spills, cut, bar: `${Math.round(outer.top)}..${Math.round(outer.bottom)}` };
  });
  expect(report.spills, `parts outside the bar ${report.bar}`).toEqual([]);
  expect(report.cut, 'the exam label is cut short').toBe(false);
}

test('the focus bar of a mock fits a 360 px phone', async ({ page }) => {
  await page.goto('/#/s/mock/a');
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  await expectBarFits(page);
  await page.keyboard.press('f');
  await page.keyboard.press('g');
  await expectBarFits(page);
});

test('the focus bar of a boss fits a 360 px phone', async ({ page }) => {
  await readyModule(page, 3);
  await page.goto('/#/s/boss/m03');
  await page.getByRole('button', { name: 'Start the boss', exact: true }).click();
  await expectBarFits(page);
});
