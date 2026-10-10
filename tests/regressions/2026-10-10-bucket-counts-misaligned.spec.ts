import { expect, test } from '@playwright/test';
import { failOnPageProblems } from '../e2e/helpers.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

for (const width of [375, 1280]) {
  test(`every bucket count sits at the right edge of its bucket at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto('/#/m/01/lab/lab-m01-name-the-cloud-benefit');
    await expect(page.locator('.bucket-target').first()).toBeVisible();
    const gaps = await page.locator('.bucket-target').evaluateAll((buttons) =>
      buttons.map((button) => {
        const count = button.querySelector('.bucket-count');
        if (count === null) throw new Error('no bucket count');
        const pad = Number.parseFloat(getComputedStyle(button).paddingRight);
        const border = Number.parseFloat(getComputedStyle(button).borderRightWidth);
        return {
          bucket: button.textContent ?? '',
          gap: Math.round(
            button.getBoundingClientRect().right - border - pad - count.getBoundingClientRect().right,
          ),
        };
      }),
    );
    expect(gaps.length).toBeGreaterThan(2);
    for (const { bucket, gap } of gaps) expect(gap, bucket).toBeLessThan(2);
  });
}
