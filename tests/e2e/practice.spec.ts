import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';
import type { QuestionView } from '../../schemas/chunks.ts';
import { findEvidence } from '../../src/app/evidence.ts';
import { expectNoAxeViolations, expectNoSidewaysScroll, failOnPageProblems, h1 } from './helpers.ts';

/** Every practice e2e test uses Module 3, which the Phase 1 pilot fills with live questions. */
const LAMBDA = '/#/m/03/l/aws-lambda';
const QUIZ = '/#/s/quiz/m03';

failOnPageProblems();

/** The live questions of a module, read the way the app reads them: the index named in the page, then the chunk. */
async function chunkFor(page: Page, module: number): Promise<QuestionView[]> {
  return page.evaluate(async (n) => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as { modules: { n: number; chunk: string }[] };
    const chunk = index.modules.find((m) => m.n === n)?.chunk ?? '';
    return ((await (await fetch(chunk)).json()) as { questions: QuestionView[] }).questions;
  }, module);
}

/** The lesson slugs of a module, from the index. */
async function lessonsOf(page: Page, module: number): Promise<string[]> {
  return page.evaluate(async (n) => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as {
      modules: { n: number; lessons: { slug: string }[] }[];
    };
    return index.modules.find((m) => m.n === n)?.lessons.map((l) => l.slug) ?? [];
  }, module);
}

/** The question on screen, found by the runner's `data-qid`. */
async function shown(page: Page, questions: readonly QuestionView[]): Promise<QuestionView> {
  const runner = page.locator('section.runner');
  await expect(runner).toBeVisible();
  const qid = await runner.getAttribute('data-qid');
  const q = questions.find((x) => x.id === qid);
  if (q === undefined) throw new Error(`question ${qid} is not in the chunk`);
  return q;
}

/** Picks the right answer with the mouse; a match pairs each left with its own right. */
async function pickRight(page: Page, q: QuestionView): Promise<void> {
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
async function pickWrong(page: Page, q: QuestionView): Promise<void> {
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

/** Answers the question on screen with keys only: digits (and letters in a match), then Enter twice. */
async function answerByKeys(page: Page, q: QuestionView): Promise<void> {
  await page.locator('#stem').focus();
  if (q.type === 'match') {
    for (let i = 0; i < q.pairs.length; i++) {
      await page.keyboard.press(String(i + 1));
      await page.keyboard.press('abcde'[i] ?? 'a');
    }
  } else {
    for (let i = 1; i <= (q.select ?? 1); i++) await page.keyboard.press(String(i));
  }
  await page.keyboard.press('Enter');
  await expect(page.locator('.verdict')).toBeVisible();
  // Next takes focus once the answer is stored.
  await expect(page.getByRole('button', { name: /^Next/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.verdict')).toHaveCount(0);
}

/** Answers every question of the session on screen correctly by clicking; returns the end line. */
async function finishByClicking(page: Page, questions: readonly QuestionView[]): Promise<string> {
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

/**
 * Runs the Module 3 lesson checks, answering right by clicking, until a question of this type is on screen.
 * Unseen variants come first, so two rounds show every question.
 */
async function untilType(page: Page, type: QuestionView['type']): Promise<[QuestionView, QuestionView[]]> {
  await page.goto('/#/m/03');
  const questions = await chunkFor(page, 3);
  const slugs = await lessonsOf(page, 3);
  for (let round = 0; round < 2; round++) {
    for (const slug of slugs) {
      await page.goto(`/#/m/03/l/${slug}`);
      await page.goto(`/#/s/check/m03/${slug}`);
      const end = page.locator('.end-line');
      for (;;) {
        await expect(page.locator('section.runner, .end-line').first()).toBeVisible();
        if (await end.isVisible()) break;
        const q = await shown(page, questions);
        if (q.type === type) return [q, questions];
        await pickRight(page, q);
        await page.getByRole('button', { name: /^Check/ }).click();
        await page.getByRole('button', { name: /^Next/ }).click();
        await expect(page.locator('.verdict')).toHaveCount(0);
      }
    }
  }
  throw new Error(`no ${type} question in the Module 3 lesson checks`);
}

/** Opens the AWS Lambda lesson check from the end of the note. */
async function startLambdaCheck(page: Page): Promise<QuestionView[]> {
  await page.goto(LAMBDA);
  await expect(h1(page, 'AWS Lambda')).toBeVisible();
  const questions = await chunkFor(page, 3);
  await page.getByRole('link', { name: /^Check yourself \(\d+\)$/ }).click();
  await expect(h1(page, 'Lesson check: AWS Lambda')).toBeVisible();
  return questions;
}

test('a lesson check runs end to end and marks the lesson on its module page', async ({ page }) => {
  const questions = await startLambdaCheck(page);
  const first = await shown(page, questions);
  await pickRight(page, first);
  await page.locator('#stem').focus();
  await page.keyboard.press('Shift+Enter');
  await expect(page.locator('.verdict')).toHaveText('Correct');
  const open = first.type === 'match' ? first.pairs.length : first.options.filter((o) => o.correct).length;
  await expect(page.locator('.review details[open]')).toHaveCount(open);
  await expect(page.getByRole('button', { name: /^Next/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.verdict')).toHaveCount(0);
  const line = await finishByClicking(page, questions);
  const [correct, total] = (/^(\d+)\/(\d+)(?: · |$)/.exec(line) ?? []).slice(1);
  expect(correct).toBe(total);

  await page.reload();
  await page.goto('/#/m/03');
  const row = page.locator('a.row[href="#/m/03/l/aws-lambda"]');
  await expect(row).toContainText('Read');
  await expect(row).toContainText(`Check ${total}/${total}`);
});

test('a wrong answer shows Incorrect and marks the correct option in text', async ({ page }) => {
  const questions = await startLambdaCheck(page);
  const q = await shown(page, questions);
  await pickWrong(page, q);
  await page.getByRole('button', { name: /^Check/ }).click();
  await expect(page.locator('.verdict')).toHaveText('Incorrect');
  if (q.type === 'match') {
    await expect(page.locator('.tag.bad').first()).toContainText('Your answer');
  } else {
    await expect(page.locator('.review-item.is-correct').first()).toContainText('Correct answer');
    await expect(page.locator('.review-item.is-wrong').first()).toContainText('Your answer');
  }
});

test('a module quiz resumes where it stopped after a reload', async ({ page }) => {
  await page.goto(QUIZ);
  await expect(h1(page, 'Module quiz: Exploring Compute Services')).toBeVisible();
  const questions = await chunkFor(page, 3);
  for (let i = 0; i < 2; i++) await answerByKeys(page, await shown(page, questions));
  await expect(page.locator('.runner-position')).toHaveText('3 of 12');
  await page.reload();
  await expect(page.locator('.runner-position')).toHaveText('3 of 12');
});

test('every Module 3 lesson check works by keyboard alone, across all three question types', async ({
  page,
}) => {
  test.slow();
  await page.goto('/#/m/03');
  const questions = await chunkFor(page, 3);
  const slugs = await lessonsOf(page, 3);
  // Unseen variants come first, so as many rounds as the most variants of one concept in one note show them all.
  const variants = new Map<string, number>();
  for (const q of questions)
    variants.set(`${q.note} ${q.concept}`, (variants.get(`${q.note} ${q.concept}`) ?? 0) + 1);
  const rounds = Math.max(...variants.values());
  const seen = new Set<string>();
  for (let round = 0; round < rounds; round++) {
    for (const slug of slugs) {
      await page.goto(`/#/m/03/l/${slug}`);
      await page.goto(`/#/s/check/m03/${slug}`);
      const end = page.locator('.end-line');
      for (;;) {
        await expect(page.locator('section.runner, .end-line').first()).toBeVisible();
        if (await end.isVisible()) break;
        const q = await shown(page, questions);
        seen.add(q.id);
        await answerByKeys(page, q);
      }
    }
  }
  const types = new Set(questions.filter((q) => seen.has(q.id)).map((q) => q.type));
  expect([...types].sort()).toEqual(['match', 'multi', 'single']);
  expect(seen.size).toBe(questions.length);
});

test('Read in notes opens the lesson with its evidence line highlighted', async ({ page }) => {
  const questions = await startLambdaCheck(page);
  const q = await shown(page, questions);
  await pickRight(page, q);
  await page.getByRole('button', { name: /^Check/ }).click();
  await expect(page.locator('.verdict')).toBeVisible();
  await page.keyboard.press('o');
  await expect(h1(page, 'AWS Lambda')).toBeVisible();
  const evidence = page.locator('.evidence');
  await expect(evidence).toHaveCount(1);
  const text = (await evidence.innerText()).replace(/\s+/g, ' ').trim();
  expect(text).toBe(q.read.text.replace(/\s+/g, ' ').trim());
  await expect(evidence).toBeInViewport();
});

test('every live question of Modules 1 and 3 finds exactly one evidence line in its note', async ({
  page,
}) => {
  test.skip(test.info().project.name !== 'chromium-desktop', 'one browser runs the content sweep');
  await page.goto('/#/m/03');
  // The app's own matcher, run in the page; a string expression, so the site's CSP has no say.
  await page.evaluate(`window.findEvidence = ${findEvidence.toString()}`);
  const misses: string[] = [];
  for (const module of [1, 3]) {
    const questions = await chunkFor(page, module);
    expect(questions.length, `live questions in Module ${module}`).toBeGreaterThan(0);
    for (const q of questions) {
      const lesson = q.read.route.split('/').slice(0, 5).join('/');
      if ((await page.evaluate(() => location.hash)) !== lesson) {
        await page.goto(`/${lesson}`);
        await expect(page.locator('.prose')).toBeVisible();
      }
      const hits = await page.evaluate(
        (text) =>
          (window as unknown as { findEvidence: (root: ParentNode, text: string) => unknown[] }).findEvidence(
            document.querySelector('.prose') ?? document,
            text,
          ).length,
        q.read.text,
      );
      if (hits !== 1) misses.push(`${q.id} has ${hits} hits for "${q.read.text}"`);
    }
  }
  expect(misses).toEqual([]);
});

test('Next waits for the answer to be stored', async ({ page }) => {
  // Holds every IndexedDB commit's completion while window.holdCommits is a pending promise.
  await page.addInitScript(() => {
    const own = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, 'oncomplete');
    if (own?.set === undefined || own.get === undefined) return;
    const { get, set } = own;
    Object.defineProperty(IDBTransaction.prototype, 'oncomplete', {
      configurable: true,
      get() {
        return get.call(this);
      },
      set(handler: ((this: IDBTransaction, ev: Event) => unknown) | null) {
        if (handler === null) return set.call(this, null);
        set.call(this, function (this: IDBTransaction, ev: Event) {
          const hold = (window as unknown as { holdCommits?: Promise<void> }).holdCommits;
          if (hold === undefined) return handler.call(this, ev);
          void hold.then(() => handler.call(this, ev));
        });
      },
    });
  });
  const questions = await startLambdaCheck(page);
  const q = await shown(page, questions);
  await page.evaluate(() => {
    const w = window as unknown as { holdCommits?: Promise<void>; releaseCommits?: () => void };
    w.holdCommits = new Promise((resolve) => {
      w.releaseCommits = resolve;
    });
  });
  await pickRight(page, q);
  await page.getByRole('button', { name: /^Check/ }).click();
  await expect(page.locator('.verdict')).toHaveText('Correct');
  const next = page.getByRole('button', { name: /^Next/ });
  await expect(next).toBeDisabled();
  await page.locator('#stem').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.verdict')).toHaveText('Correct');
  await page.evaluate(() => (window as unknown as { releaseCommits: () => void }).releaseCommits());
  await expect(next).toBeEnabled();
  await expect(next).toBeFocused();
});

test('a match answered with the mouse checks on Enter and names the correct pairing of each wrong row', async ({
  page,
}) => {
  test.slow();
  const [q] = await untilType(page, 'match');
  const selects = page.locator('.match-row select');
  for (const box of await Promise.all((await selects.all()).map((s) => s.boundingBox()))) {
    expect(box?.height ?? 0, 'select height in px').toBeGreaterThanOrEqual(44);
  }
  await pickWrong(page, q);
  // Focus stays on the select that took the last pick.
  await page.getByRole('combobox', { name: q.pairs.at(-1)?.left ?? '', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.verdict')).toHaveText('Incorrect');
  const wrong = page.locator('.review-item.is-wrong');
  await expect(wrong).toHaveCount(q.pairs.length);
  for (const [i, pair] of q.pairs.entries()) {
    await expect(wrong.nth(i).locator('.tag.ok')).toHaveText(`Correct answer: ${pair.right}`);
  }
});

test('a reported problem is confirmed inline', async ({ page }) => {
  await startLambdaCheck(page);
  await page.locator('#stem').focus();
  await page.keyboard.press('!');
  await page.getByRole('radio', { name: 'Typo' }).check();
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByRole('status')).toHaveText('Reported. It travels with your next backup.');
});

test('a backup exports, survives a wiped browser and imports once', async ({ page }) => {
  const questions = await startLambdaCheck(page);
  await page.locator('#stem').focus();
  await page.keyboard.press('!');
  await page.getByRole('radio', { name: 'Typo' }).check();
  await page.getByRole('button', { name: 'Send' }).click();
  await finishByClicking(page, questions);

  await page.goto('/#/m/03');
  const row = page.locator('a.row[href="#/m/03/l/aws-lambda"]');
  await expect(row).toContainText('Read');
  const marks = (await row.locator('.row-marks').textContent()) ?? '';
  await page.locator('h1').click();
  await page.keyboard.press('g');
  await page.keyboard.press('p');
  const sheet = page.getByRole('dialog', { name: 'Progress' });
  await expect(sheet).toBeVisible();
  const summary = await sheet.locator('.progress-summary').innerText();
  expect(summary).toMatch(/^\d+ answers?, 1 lesson read$/);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    sheet.getByRole('button', { name: 'Export a backup' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^ccp-study-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  const backup = JSON.parse(await readFile(file, 'utf8')) as {
    format: string;
    events: { t: string }[];
  };
  expect(backup.format).toBe('ccp-study-backup');
  expect(backup.events.some((e) => e.t === 'flag')).toBe(true);
  const count = backup.events.length;
  await expect(sheet).toContainText('Last backup');

  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase('ccp-study');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
  );
  await page.goto('/');
  await page.reload();
  await expect(page.locator('.home-line')).toContainText('Progress lives in this browser.');
  await page.getByRole('button', { name: 'Import a backup' }).click();
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Import a backup').setInputFiles(file);
  await expect(sheet.locator('.import-preview')).toContainText(`${count} events from`);
  await expect(sheet.locator('.import-preview')).toContainText('this browser has 0');
  await expect(sheet.getByRole('button', { name: 'Merge' })).toBeFocused();
  await sheet.getByRole('button', { name: 'Merge' }).click();
  await expect(sheet.getByRole('status')).toHaveText(`Imported. ${count} new events.`);
  await expect(sheet.locator('.progress-summary')).toHaveText(summary);

  await sheet.getByLabel('Import a backup').setInputFiles(file);
  await sheet.getByRole('button', { name: 'Merge' }).click();
  await expect(sheet.getByRole('status')).toHaveText('Imported. 0 new events.');
  await sheet.getByRole('button', { name: 'Close' }).click();
  await page.goto('/#/m/03');
  await expect(row.locator('.row-marks')).toHaveText(marks);
});

test.describe('accessibility and layout', () => {
  test('the lesson with Check yourself has no axe violations', async ({ page }) => {
    await page.goto(LAMBDA);
    await expect(page.getByRole('link', { name: /^Check yourself/ })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('the runner has no axe violations before and after feedback, for single and match', async ({
    page,
  }) => {
    test.slow();
    await page.goto('/#/m/03');
    const questions = await chunkFor(page, 3);
    const slugs = await lessonsOf(page, 3);
    const scanned = new Set<string>();
    for (let round = 0; round < 2 && scanned.size < 2; round++) {
      for (const slug of slugs) {
        await page.goto(`/#/m/03/l/${slug}`);
        await page.goto(`/#/s/check/m03/${slug}`);
        const end = page.locator('.end-line');
        for (;;) {
          await expect(page.locator('section.runner, .end-line').first()).toBeVisible();
          if (await end.isVisible()) break;
          const q = await shown(page, questions);
          const scan = (q.type === 'single' || q.type === 'match') && !scanned.has(q.type);
          if (scan) await expectNoAxeViolations(page);
          await pickRight(page, q);
          await page.getByRole('button', { name: /^Check/ }).click();
          await expect(page.locator('.verdict')).toBeVisible();
          if (scan) {
            await expectNoAxeViolations(page);
            scanned.add(q.type);
          }
          await page.getByRole('button', { name: /^Next/ }).click();
          await expect(page.locator('.verdict')).toHaveCount(0);
        }
        await expectNoAxeViolations(page);
      }
    }
    expect([...scanned].sort()).toEqual(['match', 'single']);
  });

  test('the module page with Practice has no axe violations', async ({ page }) => {
    await page.goto('/#/m/03');
    await expect(page.getByRole('heading', { level: 2, name: 'Practice' })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('Progress with the import preview open has no axe violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Progress' }).click();
    const sheet = page.getByRole('dialog', { name: 'Progress' });
    const backup = {
      format: 'ccp-study-backup',
      schemaVersion: 1,
      appVersion: '0.2.0',
      contentVersion: 'c-000000',
      exportedAt: '2026-10-09T08:00:00.000Z',
      events: [
        {
          id: '01K75S6Z000000000000000000',
          at: '2026-10-09T08:00:00.000Z',
          tz: 120,
          day: '2026-10-09',
          t: 'lesson.done',
          note: 'm03/aws-lambda',
        },
      ],
      kv: {},
    };
    await sheet.getByLabel('Import a backup').setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    });
    await expect(sheet.locator('.import-preview')).toContainText('1 event from Oct 9 to Oct 9');
    await expectNoAxeViolations(page);
  });

  test('the runner never scrolls sideways and keeps the submit bar in view on a phone', async ({ page }) => {
    test.skip(test.info().project.name !== 'webkit-mobile', 'a phone-width check');
    const questions = await startLambdaCheck(page);
    for (let i = 0; i < 3; i++) {
      const q = await shown(page, questions);
      await expectNoSidewaysScroll(page);
      await expect(page.getByRole('button', { name: /^Check/ })).toBeInViewport();
      await pickRight(page, q);
      await page.getByRole('button', { name: /^Check/ }).click();
      await expect(page.locator('.verdict')).toBeVisible();
      await expectNoSidewaysScroll(page);
      const next = page.getByRole('button', { name: /^Next/ });
      await expect(next).toBeInViewport();
      if (await page.locator('.end-line').isVisible()) break;
      await next.click();
      if (await page.locator('.end-line').isVisible()) break;
    }
  });
});
