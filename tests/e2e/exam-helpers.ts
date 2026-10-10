/** Helpers for the exam end-to-end tests; every exam item they serve is made up. */
import { expect, type Page } from '@playwright/test';
import type { ContentIndex, QuestionView } from '../../schemas/chunks.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { syntheticExam } from '../fixtures/exam-e2e.ts';
import { E2E_NOW, readyModuleEvents } from '../fixtures/ready-module.ts';
import { h1, seedEvents, seedKv } from './helpers.ts';
import { chunkFor, lessonsOf, pickRight, pickWrong } from './questions.ts';

export const HOME_TITLE = 'AWS Cloud Practitioner Essentials';

/**
 * Serves a made-up exam in place of the real one: the index's `exam` field lists the synthetic forms and items, and
 * every exam chunk request gets the synthetic chunk, so no real exam item is fetched or shown.
 */
export async function useSyntheticExam(page: Page): Promise<void> {
  let chunks: Record<string, unknown> = {};
  await page.route('**/content/index.*.json', async (route) => {
    const response = await route.fetch();
    const index = (await response.json()) as ContentIndex;
    const exam = syntheticExam(index.concepts.filter((c) => c.tested));
    chunks = exam.chunks;
    await route.fulfill({ response, json: { ...index, exam: { forms: exam.forms, items: exam.items } } });
  });
  await page.route('**/content/exam-*.json', async (route) => {
    const file = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const chunk = chunks[file];
    if (chunk === undefined) await route.fulfill({ status: 404, body: '' });
    else await route.fulfill({ json: chunk });
  });
}

/** Seeds the events that make a module boss-ready at `E2E_NOW`, with the engine version stamped. */
export async function readyModule(page: Page, module: number): Promise<void> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  const questions = await chunkFor(page, module);
  const lessons = await lessonsOf(page, module);
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  await seedEvents(page, readyModuleEvents({ module, lessons, questions, now: E2E_NOW }));
  await expect(h1(page, HOME_TITLE)).toBeVisible();
}

/** The practice items a boss of this module can draw: its own chunk and every earlier module's. */
export async function bossQuestions(page: Page, module: number): Promise<QuestionView[]> {
  const out: QuestionView[] = [];
  for (let n = 1; n <= module; n += 1) out.push(...(await chunkFor(page, n)));
  return out;
}

/** Answers the boss item on screen right or wrong, found by its `data-qid` among practice items. */
export async function answerBoss(
  page: Page,
  questions: readonly QuestionView[],
  right: boolean,
): Promise<void> {
  const exam = page.locator('section.exam');
  await expect(exam).toBeVisible();
  const qid = await exam.getAttribute('data-qid');
  const q = questions.find((x) => x.id === qid);
  if (q === undefined) throw new Error(`boss item ${qid} is not a practice item of the modules loaded`);
  if (right) await pickRight(page, q);
  else await pickWrong(page, q);
}

/** Picks the made-up key (`Option 1`) or a made-up wrong option on the mock item on screen. */
export async function answerMock(page: Page, right: boolean): Promise<void> {
  await page.getByRole('radio', { name: right ? 'Option 1' : 'Option 2', exact: true }).check();
}

/** Starts the boss of a module from its start screen. */
export async function startBoss(page: Page, module: number): Promise<void> {
  await page.goto(`/#/s/boss/m${String(module).padStart(2, '0')}`);
  await page.getByRole('button', { name: 'Start the boss', exact: true }).click();
  await expect(page.locator('section.exam')).toBeVisible();
}

/** Answers every boss item (right when `right(i)` says so), then submits through the review page and the dialog. */
export async function finishBoss(page: Page, module: number, right: (i: number) => boolean): Promise<void> {
  const questions = await bossQuestions(page, module);
  for (let i = 0; ; i += 1) {
    await answerBoss(page, questions, right(i));
    const review = page.getByRole('button', { name: 'Review and submit', exact: true });
    if (await review.isVisible()) {
      await review.click();
      break;
    }
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.locator('dialog.confirm').getByRole('button', { name: 'Submit', exact: true }).click();
}
