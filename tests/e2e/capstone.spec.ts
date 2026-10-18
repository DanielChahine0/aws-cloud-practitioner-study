import { readFile } from 'node:fs/promises';
import { expect, type Locator, type Page, test } from '@playwright/test';
import type { NewEvent } from '../../schemas/events.ts';
import { emDashLines, multiSentenceLines } from '../../scripts/content/lib/text.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';
import { HOME_TITLE } from './exam-helpers.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
  seedKv,
} from './helpers.ts';
import {
  KEY_POINTS_PER_DECISION,
  SYNTHETIC_CONTEXT,
  SYNTHETIC_PROJECT_TITLE,
  useSyntheticProject,
} from './project-helpers.ts';
import { lessonsOf } from './questions.ts';

failOnPageProblems();
// UTC keeps the study day the same on every machine.
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await useSyntheticProject(page);
});

/** The first study day after the booked exam of Saturday, November 14, when decisions open. */
const AFTER_EXAM = '2026-11-15T09:00:00.000Z';
const EDITOR = 'Decision 3: Bakery decision 3';
const card = (page: Page): Locator => page.locator('a.row[href="#/project/03"]');
const announcement = (page: Page): Locator => page.locator('p.visually-hidden[aria-live="polite"]');

/**
 * Opens the app at `at` with the synthetic project, Module 3's first `read` lessons read (`-1` is all but the last),
 * and `more` events after them.
 */
async function setUp(
  page: Page,
  at: string,
  read: number | 'all',
  more: readonly NewEvent[] = [],
): Promise<void> {
  await page.clock.install({ time: new Date(at) });
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  const lessons = await lessonsOf(page, 3);
  const slugs = read === 'all' ? lessons : lessons.slice(0, read);
  const start = Date.parse(at) - 86_400_000;
  const items: [string, NewEvent][] = [
    ...slugs.map((slug): NewEvent => ({ t: 'lesson.done', note: `m03/${slug}` })),
    ...more,
  ].map((e, i) => [new Date(start + i * 1000).toISOString(), e]);
  await seedEvents(page, timelineOf(items));
  await expect(h1(page, HOME_TITLE)).toBeVisible();
}

/** Presses Tab (Alt+Tab in WebKit, which otherwise skips links and buttons) until `target` has focus. */
async function tabTo(page: Page, target: Locator, key: string): Promise<void> {
  for (let i = 0; i < 80; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  throw new Error('Tab never reached the target');
}

/** Picks a level on one criterion of a grade panel by keyboard: Tab into the group, then the arrow keys. */
async function gradeByKeys(
  page: Page,
  panel: Locator,
  criterion: string,
  level: number,
  tab: string,
): Promise<void> {
  const radios = panel.getByRole('group', { name: criterion, exact: true }).getByRole('radio');
  const checked = await radios.evaluateAll((els) => els.findIndex((el) => (el as HTMLInputElement).checked));
  await tabTo(page, radios.nth(Math.max(checked, 0)), tab);
  if (checked === -1) await page.keyboard.press('Space');
  const from = Math.max(checked, 0);
  for (let i = from; i < level; i++) await page.keyboard.press('ArrowRight');
  await expect(radios.nth(level)).toBeChecked();
}

/** Types `[[query` into Why, then moves down the concept list to `name` and picks it with Enter. */
async function cite(page: Page, query: string, name: string): Promise<void> {
  await page.keyboard.type(`[[${query}`);
  const option = page.getByRole('option', { name, exact: true });
  await expect(option).toBeVisible();
  for (let i = 0; i < 8 && (await option.getAttribute('aria-selected')) !== 'true'; i++) {
    await page.keyboard.press('ArrowDown');
  }
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox', { name: 'Concepts' })).toHaveCount(0);
}

test('a decision opens once every lesson of its module is read, and only after the exam', async ({
  page,
}) => {
  await setUp(page, AFTER_EXAM, -1);
  await page.goto('/#/project');
  await expect(h1(page, SYNTHETIC_PROJECT_TITLE)).toBeVisible();
  await expect(
    page.getByText('Thirteen decisions, one per module, each a short ADR graded against the rubric.'),
  ).toBeVisible();
  await expect(card(page)).toContainText('Opens after you read every lesson of Module 3.');

  const last = (await lessonsOf(page, 3)).at(-1);
  const at = new Date(Date.parse(AFTER_EXAM) - 60_000).toISOString();
  await seedEvents(page, timelineOf([[at, { t: 'lesson.done', note: `m03/${last}` }]]));
  await expect(card(page)).toContainText('Not started');
  await page.goto('/#/m/03');
  const row = page.locator('a.row[href="#/project/03"]');
  await expect(row).toContainText('Decision 3: Bakery decision 3');
  await expect(row).toContainText('Open');
});

test('a read decision waits for the day after the exam', async ({ page }) => {
  await setUp(page, E2E_NOW, 'all');
  await page.goto('/#/project');
  await expect(card(page)).toContainText('Opens after your exam, on Sun 15 Nov.');
  await page.goto('/#/project/03');
  await expect(h1(page, EDITOR)).toBeVisible();
  await expect(page.locator('#decision-status')).toHaveText('Opens after your exam, on Sun 15 Nov.');
  await expect(page.getByRole('textbox')).toHaveCount(0);
});

test('a decision is written, self-graded, revealed, ticked, graded once and exported, by keyboard alone', async ({
  page,
  browserName,
}) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await setUp(page, AFTER_EXAM, 'all');
  await page.locator('h1').click();
  await page.keyboard.press('g');
  await page.keyboard.press('c');
  await expect(h1(page, SYNTHETIC_PROJECT_TITLE)).toBeVisible();
  await tabTo(page, card(page), tab);
  await page.keyboard.press('Enter');
  await expect(h1(page, EDITOR)).toBeVisible();

  await expect(page.getByLabel('Context', { exact: true })).toHaveValue(SYNTHETIC_CONTEXT.join('\n'));
  const fields: [string, string][] = [
    ['Options considered', 'Hire ovens by the minute.\nBuy two ovens outright.'],
    ['Decision', 'Hire ovens by the minute for the morning rush.'],
  ];
  for (const [label, text] of fields) {
    await tabTo(page, page.getByLabel(label, { exact: true }), tab);
    await page.keyboard.type(text);
  }
  await tabTo(page, page.getByLabel('Why', { exact: true }), tab);
  await expect(page.locator('#why-citations')).toHaveText('Cite at least 2 concepts, as [[Concept name]].');
  await page.keyboard.type('Rented ovens follow the rush, like ');
  await cite(page, 'Lam', 'AWS Lambda');
  await expect(page.locator('#why-citations')).toHaveText('1 concept cited; cite at least 2.');
  await page.keyboard.type(' and ');
  await cite(page, 'Farg', 'AWS Fargate');
  await page.keyboard.type(', not [[Bread oven]].');
  await expect(page.locator('#why-citations p')).toHaveText([
    '2 concepts cited.',
    'Not a concept: Bread oven.',
  ]);
  await expect(page.getByLabel('Why', { exact: true })).toHaveValue(
    'Rented ovens follow the rush, like [[AWS Lambda]] and [[AWS Fargate]], not [[Bread oven]].',
  );
  await expect(
    page.getByText('Fill in every heading and cite at least 2 concepts before you grade.'),
  ).toBeVisible();
  for (const [label, text] of [
    [
      'Trade-offs and mitigation',
      'Per-minute ovens cost more per hour, so the night bake stays on owned ovens.',
    ],
    ['Cost note', 'The rush costs about $40 a month, checked at https://calculator.aws/ today.'],
  ] as const) {
    await tabTo(page, page.getByLabel(label, { exact: true }), tab);
    await page.keyboard.type(text);
  }

  const self = page.getByRole('region', { name: 'Self-grade' });
  for (const [criterion, level] of [
    ['Fit', 2],
    ['Grounding', 2],
    ['Trade-offs', 1],
    ['Cost and responsibility', 2],
  ] as const) {
    await gradeByKeys(page, self, criterion, level, tab);
  }
  await tabTo(page, page.getByRole('button', { name: 'Save self-grade', exact: true }), tab);
  await page.keyboard.press('Enter');
  await expect(announcement(page)).toHaveText('Self-grade saved: 7 of 12.');
  await expect(page.getByRole('heading', { name: 'Reference key points' })).toBeFocused();
  await expect(page.locator('#decision-status')).toHaveText('Self-graded 7/12; reveal the key points');
  await expect(page.locator('.key-point')).toHaveCount(KEY_POINTS_PER_DECISION);
  await expect(page.locator('.key-point').first()).toContainText('Made-up evidence line 1 for decision 3.');
  await expect(page.locator('.key-point').first()).toContainText(/Concepts: \S/);
  await expect(page.getByRole('button', { name: 'Save self-grade' })).toHaveCount(0);

  const ticks = page.getByRole('checkbox', { name: 'I covered this' });
  for (const i of [0, 1]) {
    await tabTo(page, ticks.nth(i), tab);
    await page.keyboard.press('Space');
    await expect(ticks.nth(i)).toBeChecked();
  }

  const final = page.getByRole('region', { name: 'Final grade' });
  await expect(
    final.getByRole('group', { name: 'Fit', exact: true }).getByRole('radio').nth(2),
  ).toBeChecked();
  await gradeByKeys(page, final, 'Fit', 3, tab);
  await gradeByKeys(page, final, 'Grounding', 3, tab);
  await tabTo(page, page.getByRole('button', { name: 'Save final grade', exact: true }), tab);
  await page.keyboard.press('Enter');
  await expect(announcement(page)).toHaveText('Final grade saved: 9 of 12. Drift +2.');
  await expect(page.locator('#decision-status')).toHaveText('Final 9/12, drift +2');
  await expect(page.getByRole('button', { name: /^Save/ })).toHaveCount(0);
  await expect(ticks.nth(0)).toBeChecked();
  await expect(ticks.nth(0)).toBeDisabled();

  await page.keyboard.press('Escape');
  await expect(h1(page, SYNTHETIC_PROJECT_TITLE)).toBeVisible();
  await expect(card(page)).toContainText('Final 9/12, drift +2');
  await page.keyboard.press('g');
  await page.keyboard.press('p');
  const sheet = page.getByRole('dialog', { name: 'Progress' });
  await expect(sheet).toContainText('Capstone drift: +2 over 1 decision (final minus self).');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);

  await tabTo(page, page.getByRole('button', { name: 'Export the plan', exact: true }), tab);
  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
  expect(download.suggestedFilename()).toBe('cafe-cloud-plan.md');
  const text = await readFile(await download.path(), 'utf8');
  expect(text.startsWith(`# ${SYNTHETIC_PROJECT_TITLE}\n`)).toBe(true);
  expect(text).toContain('## Decision 3: Bakery decision 3');
  expect(text).toContain('7/12');
  expect(text).toContain('9/12');
  expect(text).toContain('AWS Lambda');
  expect(text).toContain('https://calculator.aws/');
  expect(text).not.toContain('[[aws-lambda]]');
  expect(multiSentenceLines(text)).toEqual([]);
  expect(emDashLines(text)).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
});

test.describe('accessibility and layout', () => {
  test('the cards, the editor with its rubric, the concept list and the reveal have no axe violations', async ({
    page,
  }) => {
    await setUp(page, AFTER_EXAM, 'all');
    await page.goto('/#/project');
    await expect(card(page)).toContainText('Not started');
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);

    await page.goto('/#/project/03');
    await expect(page.getByRole('region', { name: 'Self-grade' })).toBeVisible();
    await page.getByLabel('Why', { exact: true }).fill('');
    await page.getByLabel('Why', { exact: true }).pressSequentially('[[Lam');
    await expect(page.getByRole('listbox', { name: 'Concepts' })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
  });

  test('the reveal and the final grade have no axe violations', async ({ page }) => {
    await setUp(page, AFTER_EXAM, 'all', [{ t: 'decision', module: 3, stage: 'self', scores: [2, 2, 1, 2] }]);
    await page.goto('/#/project/03');
    await expect(page.locator('.key-point')).toHaveCount(KEY_POINTS_PER_DECISION);
    await expect(page.getByRole('region', { name: 'Final grade' })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
  });
});
