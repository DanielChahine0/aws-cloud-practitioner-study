import { expect, test } from '@playwright/test';
import { readyModule, useSyntheticExam } from '../e2e/exam-helpers.ts';
import { failOnPageProblems } from '../e2e/helpers.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC' });

test('recall dots sit on their heading line and name their concept', async ({ page }) => {
  await useSyntheticExam(page);
  await page.clock.install({ time: new Date(E2E_NOW) });
  await readyModule(page, 3);
  await page.goto('/#/m/03/l/aws-lambda');
  const dots = page.locator('.recall-dot');
  await expect(dots.first()).toBeVisible();
  const report = await page.evaluate(() =>
    [...document.querySelectorAll('.recall-dot')].map((dot) => {
      const heading = dot.closest('h3');
      const box = dot.getBoundingClientRect();
      const range = document.createRange();
      if (heading !== null) range.selectNodeContents(heading.firstChild ?? heading);
      const text = [...range.getClientRects()].at(-1);
      const mid = (box.top + box.bottom) / 2;
      return {
        label: dot.getAttribute('aria-label') ?? '',
        inHeading: heading !== null,
        onLine: text !== undefined && mid >= text.top && mid <= text.bottom && box.left >= text.right,
      };
    }),
  );
  for (const dot of report) {
    expect(dot.inHeading, dot.label).toBe(true);
    expect(dot.onLine, dot.label).toBe(true);
    expect(dot.label).toMatch(/^Recall of .+: (not studied|weak|fading|strong)$/);
  }
  expect(new Set(report.map((d) => d.label)).size).toBe(report.length);
});
