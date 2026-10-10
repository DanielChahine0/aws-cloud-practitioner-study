import { expect, type Page, test } from '@playwright/test';
import { failOnPageProblems } from '../e2e/helpers.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

/** For each goal, how far the first line of its label sits from the Met or Not met word; 0 when they share a line. */
async function labelDrops(page: Page): Promise<{ label: string; drop: number }[]> {
  return page.locator('.goal-line').evaluateAll((lines) =>
    lines.map((line) => {
      const word = line.querySelector('.goal-word');
      if (word === null) throw new Error('no goal word');
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const parent = node.parentElement;
        if ((node.textContent ?? '').trim() === '' || parent?.closest('.goal-word, .goal-message, svg'))
          continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const top = range.getClientRects()[0]?.top ?? 0;
        return {
          label: (node.textContent ?? '').trim(),
          drop: Math.abs(Math.round(top - word.getBoundingClientRect().top)),
        };
      }
      throw new Error('no goal label');
    }),
  );
}

for (const width of [375, 1280]) {
  test(`every goal label starts on the line of its word at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/#/m/02/lab/lab-m02-launch-the-order-server');
    await expect(page.locator('.goal-line').first()).toBeVisible();
    for (const row of await labelDrops(page)) expect(row.drop, row.label).toBeLessThan(4);
    await page.getByRole('button', { name: /^Check/ }).click();
    await expect(page.locator('.goal-word').first()).not.toHaveText('Not checked');
    for (const row of await labelDrops(page)) expect(row.drop, row.label).toBeLessThan(4);
  });
}
