import { expect, type Page, test } from '@playwright/test';
import type { StudyEvent } from '../../schemas/events.ts';
import { SCHEMA_VERSION } from '../../schemas/version.ts';
import { DB_NAME, STORES } from '../../src/store/idb.ts';
import { useSyntheticExam } from '../e2e/exam-helpers.ts';
import { failOnPageProblems } from '../e2e/helpers.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';

/**
 * Time on an exam question was only added to the draft on navigation and on Submit.
 * So the question on screen when time ran out kept none of its time, since the deadline settles from the kv draft,
 * and a reload restarted the question's clock, losing the time shown before it (spec 4.3, time per item).
 */
failOnPageProblems();
// Synthetic forms only; nothing of an exam may land in a trace, a screenshot or a video.
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

test.beforeEach(async ({ page }) => {
  await useSyntheticExam(page);
  await page.clock.install({ time: new Date(E2E_NOW) });
});

/** The answer events of the log as the app stored them. */
async function storedAnswers(page: Page): Promise<Extract<StudyEvent, { t: 'answer' }>[]> {
  const log = await page.evaluate(
    async ({ name, version, store }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name, version);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const all = await new Promise<unknown[]>((resolve, reject) => {
        const req = db.transaction(store, 'readonly').objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return all;
    },
    { name: DB_NAME, version: SCHEMA_VERSION, store: STORES.events },
  );
  return (log as StudyEvent[]).filter((e): e is Extract<StudyEvent, { t: 'answer' }> => e.t === 'answer');
}

async function startMock(page: Page): Promise<string> {
  await page.goto('/#/s/mock/a');
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  const exam = page.locator('section.exam');
  await expect(exam).toBeVisible();
  return (await exam.getAttribute('data-qid')) ?? '';
}

async function runOut(page: Page): Promise<void> {
  await page.clock.fastForward('01:30:00');
  await page.clock.runFor(1000);
  await expect(page.getByRole('heading', { level: 1, name: 'Mock A results' })).toBeVisible();
}

test('the question on screen when time runs out keeps its time', async ({ page }) => {
  const qid = await startMock(page);
  await page.keyboard.press('1');
  await runOut(page);
  const answer = (await storedAnswers(page)).find((a) => a.qid === qid);
  expect(answer?.ms ?? 0).toBeGreaterThanOrEqual(85 * 60_000);
});

test('the time on a question before a reload still counts', async ({ page }) => {
  const qid = await startMock(page);
  await page.keyboard.press('1');
  await page.clock.fastForward('06:00');
  await page.clock.runFor(1000);
  await page.reload();
  await expect(page.locator('section.exam')).toHaveAttribute('data-qid', qid);
  await page.keyboard.press('ArrowRight');
  await runOut(page);
  const answer = (await storedAnswers(page)).find((a) => a.qid === qid);
  expect(answer?.ms ?? 0).toBeGreaterThanOrEqual(6 * 60_000);
});
