import { expect, test } from '@playwright/test';
import { failOnPageProblems } from '../e2e/helpers.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

for (const width of [375, 1280]) {
  test(`the Morning rush chart parts its bars and labels its hours at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/#/m/02/lab/lab-m02-morning-rush');
    await page.getByRole('button', { name: /^Run and check/ }).click();
    const chart = page.locator('.sim-chart');
    await expect(chart).toBeVisible();
    // Each hour has an Orders bar then a Capacity bar; the two never touch, in screen pixels.
    const touching = await chart.locator('svg rect').evaluateAll((rects) => {
      const boxes = rects.map((r) => r.getBoundingClientRect());
      const hours = boxes.length / 2;
      const found: number[] = [];
      for (let i = 0; i < hours; i += 1) {
        const orders = boxes[i];
        const capacity = boxes[hours + i];
        if (orders === undefined || capacity === undefined) continue;
        if (capacity.left - orders.right < 1) found.push(i);
      }
      return found;
    });
    expect(touching).toEqual([]);
    // Sighted readers see when the hours fall, not only the hidden table.
    for (const hour of ['0:00', '6:00', '12:00', '18:00', '23:00']) {
      await expect(chart.locator('.sim-ticks').getByText(hour, { exact: true })).toBeVisible();
    }
    // And the height the bars are measured against.
    await expect(chart.locator('.sim-scale')).toBeVisible();
  });
}
