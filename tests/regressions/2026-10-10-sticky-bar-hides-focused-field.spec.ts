import { expect, type Page, test } from '@playwright/test';
import { failOnPageProblems } from '../e2e/helpers.ts';
import { at, DAY1, incidentTitle, readModule2 } from '../e2e/incident-helpers.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
});

/** Where the focused control sits against the sticky bar, or null when focus is outside `scope` or in the bar itself. */
async function hidden(page: Page, scope: string, barSelector: string): Promise<string | null> {
  // Measure what the next painted frame shows.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return page.evaluate(
    ([scopeSel, barSel]) => {
      const el = document.activeElement;
      const bar = document.querySelector(barSel ?? '');
      if (!(el instanceof HTMLElement) || bar === null) return null;
      if (el.closest(scopeSel ?? '') === null || bar.contains(el)) return null;
      // An option's visible target is its whole label, not the small radio inside it.
      const box = (el.closest('label') ?? el).getBoundingClientRect();
      const barTop = bar.getBoundingClientRect().top;
      return box.bottom > barTop + 1
        ? `${el.id || el.tagName} at ${Math.round(box.top)}..${Math.round(box.bottom)} under the bar at ${Math.round(barTop)}`
        : null;
    },
    [scope, barSelector],
  );
}

/** Tabs through the page and lists every control the sticky bar covers when it takes focus. */
async function tabUnderBar(page: Page, steps: number): Promise<string[]> {
  const found: string[] = [];
  for (let i = 0; i < steps; i += 1) {
    await page.keyboard.press('Tab');
    const spot = await hidden(page, 'main', '.lab-actions');
    if (spot !== null) found.push(spot);
  }
  return found;
}

for (const id of ['lab-m02-launch-the-order-server', 'lab-m02-morning-rush']) {
  test(`no field of ${id} takes focus under the sticky Check bar on a phone`, async ({ page }) => {
    await page.goto(`/#/m/02/lab/${id}`);
    await expect(page.locator('.lab-actions')).toBeVisible();
    expect(await tabUnderBar(page, 40)).toEqual([]);
  });
}

test('no option of the incident takes focus under the sticky submit bar on a phone', async ({ page }) => {
  // The real incident of the day: its longer steps push the last option down to the bar.
  await page.clock.install({ time: at(DAY1) });
  await readModule2(page);
  await incidentTitle(page);
  await expect(page.locator('.submit-bar')).toBeVisible();
  const first = page.locator('section.runner input').first();
  await first.focus();
  const found: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    if (i > 0) await page.keyboard.press('ArrowDown');
    const spot = await hidden(page, 'section.runner', '.submit-bar');
    if (spot !== null) found.push(spot);
  }
  expect(found).toEqual([]);
});
