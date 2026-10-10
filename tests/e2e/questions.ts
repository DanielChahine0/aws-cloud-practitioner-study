/** Helpers that read live questions from the built site and answer them, shared by the practice and memory tests. */
import { expect, type Page } from '@playwright/test';
import type { QuestionView } from '../../schemas/chunks.ts';

/** The live questions of a module, read the way the app reads them: the index named in the page, then the chunk. */
export async function chunkFor(page: Page, module: number): Promise<QuestionView[]> {
  return page.evaluate(async (n) => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as { modules: { n: number; chunk: string }[] };
    const chunk = index.modules.find((m) => m.n === n)?.chunk ?? '';
    return ((await (await fetch(chunk)).json()) as { questions: QuestionView[] }).questions;
  }, module);
}

/** The lesson slugs of a module, from the index. */
export async function lessonsOf(page: Page, module: number): Promise<string[]> {
  return page.evaluate(async (n) => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as {
      modules: { n: number; lessons: { slug: string }[] }[];
    };
    return index.modules.find((m) => m.n === n)?.lessons.map((l) => l.slug) ?? [];
  }, module);
}

/** The question on screen, found by the runner's `data-qid`. */
export async function shown(page: Page, questions: readonly QuestionView[]): Promise<QuestionView> {
  const runner = page.locator('section.runner');
  await expect(runner).toBeVisible();
  const qid = await runner.getAttribute('data-qid');
  const q = questions.find((x) => x.id === qid);
  if (q === undefined) throw new Error(`question ${qid} is not in the chunk`);
  return q;
}

/** Picks the right answer with the mouse; a match pairs each left with its own right. */
export async function pickRight(page: Page, q: QuestionView): Promise<void> {
  if (q.type === 'match') {
    for (const [i, pair] of q.pairs.entries()) {
      await page.getByRole('combobox', { name: pair.left, exact: true }).selectOption(`r${i + 1}`);
    }
    return;
  }
  const role = q.type === 'single' ? 'radio' : 'checkbox';
  for (const option of q.options.filter((o) => o.correct)) {
    await page.getByRole(role, { name: option.text, exact: true }).check();
  }
}

/** Picks a wrong answer with the mouse. */
export async function pickWrong(page: Page, q: QuestionView): Promise<void> {
  if (q.type === 'match') {
    for (const [i, pair] of q.pairs.entries()) {
      await page
        .getByRole('combobox', { name: pair.left, exact: true })
        .selectOption(`r${((i + 1) % q.pairs.length) + 1}`);
    }
    return;
  }
  const role = q.type === 'single' ? 'radio' : 'checkbox';
  const wrong = q.options.filter((o) => !o.correct).slice(0, q.select ?? 1);
  for (const option of wrong) await page.getByRole(role, { name: option.text, exact: true }).check();
}

/** Answers every question of the session on screen correctly by clicking; returns the end line. */
export async function finishByClicking(page: Page, questions: readonly QuestionView[]): Promise<string> {
  const end = page.locator('.end-line');
  for (;;) {
    await expect(page.locator('section.runner, .end-line').first()).toBeVisible();
    if (await end.isVisible()) return end.innerText();
    const q = await shown(page, questions);
    await pickRight(page, q);
    await page.getByRole('button', { name: /^Check/ }).click();
    await expect(page.locator('.verdict')).toHaveText('Correct');
    await page.getByRole('button', { name: /^Next/ }).click();
    await expect(page.locator('.verdict')).toHaveCount(0);
  }
}
