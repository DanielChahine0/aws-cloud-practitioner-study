import { expect, test } from '@playwright/test';
import { readyModule, useSyntheticExam } from '../e2e/exam-helpers.ts';
import { failOnPageProblems } from '../e2e/helpers.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC' });

test('a concept row never breaks a line inside "mastery 90" or "due Dec 26" at 360 px', async ({ page }) => {
  await useSyntheticExam(page);
  await page.clock.install({ time: new Date(E2E_NOW) });
  await page.setViewportSize({ width: 360, height: 740 });
  await readyModule(page, 3);
  await page.goto('/#/m/03');
  await expect(page.getByRole('heading', { level: 2, name: 'Concepts' })).toBeVisible();
  const split = await page.evaluate(() => {
    const out: string[] = [];
    let phrases = 0;
    for (const meta of document.querySelectorAll('.row-meta')) {
      const walker = document.createTreeWalker(meta, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = node.textContent ?? '';
        for (const m of text.matchAll(/mastery \d+|due (?:today|[A-Z][a-z]{2} \d{1,2})/g)) {
          phrases += 1;
          const range = document.createRange();
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const lines = new Set(
            [...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)),
          );
          if (lines.size > 1) out.push(m[0]);
        }
      }
    }
    return { out, phrases };
  });
  expect(split.phrases).toBeGreaterThan(0);
  expect(split.out).toEqual([]);
});
