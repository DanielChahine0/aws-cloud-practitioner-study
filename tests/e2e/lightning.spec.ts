import { expect, type Page, test } from '@playwright/test';
import type { QuestionView } from '../../schemas/chunks.ts';
import type { NewEvent } from '../../schemas/events.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, startOf, submitOf } from '../fixtures/memory.ts';
import { HOME_TITLE } from './exam-helpers.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
  seedKv,
} from './helpers.ts';
import { chunkFor, pickWrong, shown } from './questions.ts';

/** Every lightning test runs at 09:00 UTC on Tuesday, October 20, 2026. */
const NOW = '2026-10-20T09:00:00.000Z';
const DAY_MS = 86_400_000;
/** The days before `NOW` of the two right Sure answers that settle a concept: stability about 14 days, due a week on. */
const SETTLE_DAYS = [10, 7] as const;

failOnPageProblems();
// UTC keeps the study day and the 04:00 boundary the same on every machine.
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
});

/** The top bar's review button, which shows only while something is due. */
const dueButton = (page: Page) => page.getByRole('button', { name: /^\d+ due: / });

/**
 * Seeds a log in which 24 concepts of Modules 1 to 3 are settled (stability of at least 3 days) and none is due
 * before next week, then returns the live questions of those modules.
 */
async function seedSettled(page: Page): Promise<QuestionView[]> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  const questions = (await Promise.all([1, 2, 3].map((m) => chunkFor(page, m)))).flat();
  const first = new Map<string, QuestionView>();
  for (const q of questions) if (q.type === 'single' && !first.has(q.concept)) first.set(q.concept, q);
  const picks = [...first.values()].slice(0, 24);
  const iso = (ms: number): string => new Date(ms).toISOString();
  const items: (readonly [string, NewEvent])[] = [];
  for (const [i, days] of SETTLE_DAYS.entries()) {
    const sid = `01JA00000000000000000000L${i + 1}`;
    let t = Date.parse(NOW) - days * DAY_MS;
    items.push([
      iso(t),
      startOf(
        sid,
        'quiz',
        picks.map((q) => q.id),
        'm01',
      ),
    ]);
    for (const q of picks) {
      t += 1000;
      items.push([
        iso(t),
        answerOf({
          concept: q.concept,
          qid: q.id,
          qv: q.version,
          correct: true,
          sure: true,
          mode: 'quiz',
          sid,
        }),
      ]);
    }
    items.push([iso(t + 1000), submitOf(sid, 'quiz')]);
  }
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  await seedEvents(page, timelineOf(items));
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  return questions;
}

/** Starts a round from the lightning screen and answers its first item wrong; returns that item. */
async function startAndMissOne(page: Page, questions: readonly QuestionView[]): Promise<QuestionView> {
  await page.goto('/#/s/lightning');
  await expect(h1(page, 'Lightning round')).toBeVisible();
  await page.getByRole('button', { name: 'Start the round', exact: true }).click();
  const q = await shown(page, questions);
  await expect(page.locator('#stem')).toBeFocused();
  await pickWrong(page, q);
  await page.getByRole('button', { name: /^Answer/ }).click();
  await expect(page.locator('.runner-position')).toHaveText('1 answered');
  await expect(page.locator('section.runner')).not.toHaveAttribute('data-qid', q.id);
  return q;
}

test('a lightning round runs 90 seconds, shows a summary and sends a miss to review', async ({ page }) => {
  const questions = await seedSettled(page);
  await expect(dueButton(page)).toHaveCount(0);
  await startAndMissOne(page, questions);
  await expect(page.getByRole('timer')).toHaveText(/^1:[0-2]\d$/);
  await page.clock.fastForward('01:30');
  await expect(page.locator('.end-line')).toHaveText('0/1');
  await expect(page.getByText("1 concept goes back into today's review.", { exact: true })).toBeVisible();
  const summary = page.locator('.lightning-summary li');
  await expect(summary).toHaveCount(1);
  await expect(summary.locator('.verdict')).toHaveText('Incorrect');
  await expect(summary.locator('.tag.ok')).toContainText('Correct answer: ');
  await page.getByRole('link', { name: 'Back to Home', exact: true }).click();
  await expect(dueButton(page)).toHaveAccessibleName('1 due: 1 concept, start a review');
});

test('a round left mid-way is settled on the next app start after its deadline', async ({ page }) => {
  const questions = await seedSettled(page);
  await startAndMissOne(page, questions);
  await page.goto('about:blank');
  await page.clock.fastForward('02:00');
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await expect(dueButton(page)).toHaveAccessibleName('1 due: 1 concept, start a review');
  await page.goto('/#/s/lightning');
  await expect(page.getByRole('button', { name: 'Start the round', exact: true })).toBeVisible();
});

test('a second round the same day says it pays no XP', async ({ page }) => {
  const questions = await seedSettled(page);
  await page.goto('/#/s/lightning');
  await expect(page.getByRole('button', { name: 'Start the round', exact: true })).toBeVisible();
  await expect(page.getByText('Only the first round each day pays XP.')).toHaveCount(0);
  await startAndMissOne(page, questions);
  await page.clock.fastForward('01:30');
  await expect(page.locator('.end-line')).toBeVisible();
  await page.getByRole('link', { name: 'Another round', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start the round', exact: true })).toBeVisible();
  await expect(page.getByText('Only the first round each day pays XP.', { exact: true })).toBeVisible();
});

test('the lightning screen has no axe violations and no sideways scroll', async ({ page }) => {
  const questions = await seedSettled(page);
  await page.goto('/#/s/lightning');
  await expect(page.getByRole('button', { name: 'Start the round', exact: true })).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await startAndMissOne(page, questions);
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await page.clock.fastForward('01:30');
  await expect(page.locator('.lightning-summary')).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test('before 20 concepts settle the round says when it opens', async ({ page }) => {
  await page.goto('/#/s/lightning');
  await expect(h1(page, 'Lightning round')).toBeVisible();
  await expect(page.getByText('Opens after 20 concepts settle.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start the round' })).toHaveCount(0);
  await page.goto('/');
  await page.getByRole('link', { name: 'Lightning round', exact: true }).click();
  await expect(h1(page, 'Lightning round')).toBeVisible();
});
