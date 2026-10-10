import { expect, test } from '@playwright/test';
import { readyModule, useSyntheticExam } from '../e2e/exam-helpers.ts';
import { failOnPageProblems } from '../e2e/helpers.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';

failOnPageProblems();
test.use({ timezoneId: 'UTC' });

test('each domain readiness number sits on the first line of its domain name', async ({ page }) => {
  await useSyntheticExam(page);
  await page.clock.install({ time: new Date(E2E_NOW) });
  await readyModule(page, 3);
  await page.goto('/#/');
  await page.locator('button.topbar-rank').click();
  await expect(page.getByRole('heading', { level: 3, name: 'Readiness', exact: true })).toBeVisible();
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('.bar-row')].map((row) => {
      const lines: { text: string; top: number }[] = [];
      const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const r of range.getClientRects())
          if (r.width > 0) lines.push({ text: node.textContent ?? '', top: r.top });
      }
      const text = row.textContent ?? '';
      const value = /(\d+)\s*$/.exec(text)?.[1] ?? '';
      // The number's own glyphs: the last character of the row's text.
      const last = (() => {
        const walker2 = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
        let lastNode: Node | null = null;
        for (let n = walker2.nextNode(); n !== null; n = walker2.nextNode())
          if ((n.textContent ?? '').trim() !== '') lastNode = n;
        if (lastNode === null) return null;
        const t = lastNode.textContent ?? '';
        const end = t.trimEnd().length;
        const range = document.createRange();
        range.setStart(lastNode, end - value.length);
        range.setEnd(lastNode, end);
        return range.getBoundingClientRect().top;
      })();
      return { text, valueTop: last, firstTop: Math.min(...lines.map((l) => l.top)) };
    }),
  );
  expect(rows.length).toBe(4);
  for (const row of rows) expect(Math.abs((row.valueTop ?? -100) - row.firstTop), row.text).toBeLessThan(4);
});
