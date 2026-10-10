import { expect, type Locator, type Page, test } from '@playwright/test';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';
import { HOME_TITLE } from './exam-helpers.ts';
import { expectNoAxeViolations, expectNoSidewaysScroll, failOnPageProblems, h1, seedKv } from './helpers.ts';
import {
  labDoneCount,
  labFor,
  SYNTHETIC_CONFIGURE_LAB_ID,
  SYNTHETIC_SORT_LAB_ID,
  SYNTHETIC_SORT_TITLE,
  storedDraftActions,
  syntheticConfigureLab,
  syntheticSortLab,
  useSyntheticLab,
} from './lab-helpers.ts';
import { shown } from './questions.ts';

failOnPageProblems();
// UTC keeps the study day the same on every machine.
test.use({ timezoneId: 'UTC' });

const LAB = `/#/m/01/lab/${SYNTHETIC_SORT_LAB_ID}`;
const KNEAD = 'Knead the dough for the morning loaves';
const ROLLS = 'Bake forty rolls before opening';
const FLOUR = 'Keep the spare flour sacks dry';
const JARS = 'Store the jam jars for the week';
const PIES = 'Bake the pies ordered for noon';
const GOAL_1 = 'The opening jobs are in place';
const GOAL_2 = 'Storage and the noon bake are in place';
/** The synthetic lab's solution: each card with its bucket label and that bucket's digit. */
const SOLUTION: readonly (readonly [string, string, string])[] = [
  [KNEAD, 'Work bench', '1'],
  [ROLLS, 'Hired oven', '2'],
  [FLOUR, 'Dry shelf', '3'],
  [JARS, 'Dry shelf', '3'],
  [PIES, 'Hired oven', '2'],
];

const card = (page: Page, text: string): Locator => page.getByRole('button', { name: text, exact: true });
const tray = (page: Page): Locator => page.getByRole('group', { name: 'Cards' });
const bucket = (page: Page, label: string): Locator => page.locator('.bucket-target', { hasText: label });
const placedIn = (page: Page, label: string, text: string): Locator =>
  page.locator('.bucket', { has: bucket(page, label) }).getByRole('button', { name: text, exact: true });
const goal = (page: Page, label: string): Locator => page.locator('li.goal', { hasText: label });
/** An announcement of a polite live region, matched as its whole text. */
const said = (page: Page, text: string): Locator =>
  page.getByText(text, { exact: true }).and(page.locator('[aria-live="polite"]'));
const checkButton = (page: Page): Locator => page.getByRole('button', { name: /^Check/ });

/** Presses `key` until `target` has focus, the way a keyboard user tabs into a region. */
async function tabTo(page: Page, target: Locator, key: string): Promise<void> {
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  throw new Error('Tab never reached the target');
}

/** Places every card of the synthetic lab by tapping the card, then its bucket. */
async function placeAllByTaps(page: Page): Promise<void> {
  for (const [text, label] of SOLUTION) {
    await card(page, text).click();
    await bucket(page, label).click();
    await expect(placedIn(page, label, text)).toBeVisible();
  }
}

/** Answers the debrief by the Runner keys: digits (and letters in a match), Enter to check, Enter for Next. */
async function answerDebriefByKeys(page: Page): Promise<void> {
  const lab = await labFor(page, SYNTHETIC_SORT_LAB_ID);
  for (let i = 0; i < lab.debrief.questions.length; i++) {
    const q = await shown(page, lab.debrief.questions);
    // The debrief runs in the Runner, so it shows the bet buttons and the Sure hint (spec 4.1).
    await expect(page.getByText('Press Sure when you are more than 71% sure.')).toBeVisible();
    await page.locator('#stem').focus();
    if (q.type === 'match') {
      for (let n = 0; n < q.pairs.length; n++) {
        await page.keyboard.press(String(n + 1));
        await page.keyboard.press('abcde'[n] ?? 'a');
      }
    } else {
      for (let n = 1; n <= (q.select ?? 1); n++) await page.keyboard.press(String(n));
    }
    await page.keyboard.press('Enter');
    await expect(page.locator('.verdict')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Next/ })).toBeFocused();
    await page.keyboard.press('Enter');
  }
}

test.beforeEach(async ({ page }) => {
  await useSyntheticLab(page, syntheticSortLab);
  await page.clock.install({ time: new Date(E2E_NOW) });
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  await page.goto(LAB);
  // The lab must render before the reload, or WebKit reports the aborted chunk fetch as a page error.
  await expect(h1(page, SYNTHETIC_SORT_TITLE)).toBeVisible();
  await page.reload();
  await expect(h1(page, SYNTHETIC_SORT_TITLE)).toBeVisible();
});

test('a Sort lab works by keyboard alone and pays 40 XP once', async ({ page, browserName }) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  const back = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';

  // Tab moves between regions (the tray, the buckets, the goal hints) and the arrow keys move within one.
  await tabTo(page, card(page, KNEAD), tab);
  await page.keyboard.press(tab);
  await expect(page.locator('.bucket-target').first()).toBeFocused();
  await page.keyboard.press(tab);
  await expect(page.getByRole('button', { name: 'Hint' }).first()).toBeFocused();
  await page.keyboard.press(back);
  await page.keyboard.press(back);
  await expect(card(page, KNEAD)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(card(page, ROLLS)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(card(page, KNEAD)).toBeFocused();

  // Space picks a card up and Escape puts it down without leaving the lab.
  await page.keyboard.press('Space');
  await expect(card(page, KNEAD)).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(card(page, KNEAD)).toHaveAttribute('aria-pressed', 'false');
  await expect(h1(page, SYNTHETIC_SORT_TITLE)).toBeVisible();

  // A digit places the held card, and focus goes back to the first card left in the tray.
  await page.keyboard.press('Space');
  await page.keyboard.press('1');
  await expect(said(page, `Placed ${KNEAD} in Work bench.`)).toBeAttached();
  await expect(placedIn(page, 'Work bench', KNEAD)).toBeVisible();
  await expect(card(page, ROLLS)).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('2');
  await expect(card(page, FLOUR)).toBeFocused();

  // Enter checks the board on demand: the first goal is met, the second is not.
  await page.keyboard.press('Enter');
  await expect(said(page, '1 of 2 goals met.')).toBeAttached();
  await expect(goal(page, GOAL_1)).toContainText('Met');
  await expect(goal(page, GOAL_2)).toContainText('Not met');

  for (const [text, label, digit] of SOLUTION.slice(2)) {
    await expect(card(page, text)).toBeFocused();
    await page.keyboard.press('Space');
    await page.keyboard.press(digit);
    await expect(placedIn(page, label, text)).toBeVisible();
  }
  // With the tray empty, focus stays on the bucket that took the last card, where Enter still checks.
  await expect(bucket(page, 'Hired oven')).toBeFocused();
  await page.keyboard.press('Enter');
  // The XP flash shows for 600 ms from the moment lab.done joins the log, so it is checked first.
  await expect(page.getByText('+40', { exact: true })).toBeVisible();
  await expect(said(page, 'All 2 goals met. Plus 40 XP.')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();

  await answerDebriefByKeys(page);
  await expect(page.getByRole('link', { name: 'Back to Module 1' })).toBeVisible();

  await page.goto('/#/m/01');
  await expect(page.locator('.lab-rows .row', { hasText: SYNTHETIC_SORT_TITLE })).toContainText('Done');

  // A rerun works the same way but pays nothing.
  await page.goto(LAB);
  await expect(page.locator('.lab-done-line')).toContainText('a rerun pays no XP.');
  await tabTo(page, card(page, KNEAD), tab);
  for (const [text, label, digit] of SOLUTION) {
    await expect(card(page, text)).toBeFocused();
    await page.keyboard.press('Space');
    await page.keyboard.press(digit);
    await expect(placedIn(page, label, text)).toBeVisible();
  }
  await page.keyboard.press('Enter');
  await expect(said(page, 'All 2 goals met.')).toBeAttached();
  await expect.poll(() => labDoneCount(page, SYNTHETIC_SORT_LAB_ID)).toBe(2);
});

test('a lab placed by taps resumes after a reload', async ({ page }) => {
  await card(page, ROLLS).click();
  await expect(card(page, ROLLS)).toHaveAttribute('aria-pressed', 'true');
  // Tapping the held card again puts it down.
  await card(page, ROLLS).click();
  await expect(card(page, ROLLS)).toHaveAttribute('aria-pressed', 'false');

  await card(page, KNEAD).click();
  await bucket(page, 'Work bench').click();
  await expect(placedIn(page, 'Work bench', KNEAD)).toBeVisible();
  await expect.poll(() => storedDraftActions(page, SYNTHETIC_SORT_LAB_ID)).toBe(1);

  await page.reload();
  await expect(h1(page, SYNTHETIC_SORT_TITLE)).toBeVisible();
  await expect(placedIn(page, 'Work bench', KNEAD)).toBeVisible();
  await expect(tray(page).getByRole('button')).toHaveCount(4);
});

test('Reset asks inline and keeps the opened hint', async ({ page }) => {
  await card(page, KNEAD).click();
  await bucket(page, 'Work bench').click();
  await expect(placedIn(page, 'Work bench', KNEAD)).toBeVisible();

  await page.keyboard.press('h');
  await expect(page.locator('.lab-goals .hint')).toHaveCount(1);

  // Keep working closes the question and keeps the board.
  await page.keyboard.press('r');
  const panel = page.locator('.lab-reset');
  await expect(panel).toContainText('Reset this lab? Your work is cleared; hints you opened still count.');
  await expect(panel.getByRole('button', { name: 'Keep working' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(panel).toHaveCount(0);
  await expect(tray(page).getByRole('button')).toHaveCount(4);

  // Reset clears the board, and the hint opened before it still costs the no-hint bonus.
  await page.keyboard.press('r');
  await panel.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(tray(page).getByRole('button')).toHaveCount(5);
  await placeAllByTaps(page);
  await checkButton(page).click();
  await expect(said(page, 'All 2 goals met. Plus 30 XP.')).toBeAttached();
});

test('the lab screen has no axe violations and no sideways scroll', async ({ page }) => {
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await card(page, KNEAD).click();
  await expect(card(page, KNEAD)).toHaveAttribute('aria-pressed', 'true');
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await bucket(page, 'Work bench').click();
  await checkButton(page).click();
  await expect(said(page, '0 of 2 goals met.')).toBeAttached();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  for (const [text, label] of SOLUTION.slice(1)) {
    await card(page, text).click();
    await bucket(page, label).click();
  }
  await checkButton(page).click();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
  await expect(page.locator('section.runner')).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test('lab cards and buckets are at least 44 px tall and stack on a phone', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'webkit-mobile',
    'the phone layout is checked on the phone project only',
  );
  for (const target of await page.locator('.sort-tray .card, .bucket-target').all()) {
    expect((await target.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const boxes = await Promise.all((await page.locator('.bucket').all()).map((b) => b.boundingBox()));
  for (let i = 1; i < boxes.length; i++) {
    const [above, below] = [boxes[i - 1], boxes[i]];
    if (!above || !below) throw new Error('a bucket has no box');
    expect(below.x).toBe(above.x);
    expect(below.y).toBeGreaterThanOrEqual(above.y + above.height);
  }
  const board = await page.locator('.lab-board').boundingBox();
  const goals = await page.locator('.lab-goals').boundingBox();
  if (!board || !goals) throw new Error('the board or the goals have no box');
  expect(goals.y).toBeGreaterThanOrEqual(board.y + board.height);
  await expectNoSidewaysScroll(page);
});

const CONFIGURE_URL = `/#/m/01/lab/${SYNTHETIC_CONFIGURE_LAB_ID}`;

/**
 * Serves and opens the synthetic Configure lab: the hash change alone keeps the index the Sort setup loaded, so the
 * page reloads to fetch the index and the chunk again through the Configure routes.
 */
async function useConfigureLab(page: Page): Promise<void> {
  await useSyntheticLab(page, syntheticConfigureLab);
  await page.goto(CONFIGURE_URL);
  await page.reload();
}

test('a Configure lab works by keyboard alone and shows the lab credits line', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'WebKit opens a native menu for letter keys on a select, so typing a letter is unreliable there',
  );
  await useConfigureLab(page);
  await expect(h1(page, 'Choose the bakery Region')).toBeVisible();
  await expect(page.getByText('Prices are in lab credits, a made-up unit, not AWS prices.')).toBeVisible();
  const region = page.getByLabel('Region', { exact: true });
  await region.focus();
  await page.keyboard.press('n');
  await expect(region).toHaveValue('northport');
  await expect(
    page.getByText(
      'Home country. 40 ms from the bakery. Runs the order service. Price index 120 lab credits.',
    ),
  ).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText('1 of 2 goals met.', { exact: true })).toBeAttached();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Keep a spare copy in a second zone')).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await expect(page.getByText('All 2 goals met. Plus 40 XP.', { exact: true })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
});

test('a Configure lab has no axe violations and no sideways scroll', async ({ page }) => {
  await useConfigureLab(page);
  await expect(h1(page, 'Choose the bakery Region')).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await page.getByRole('button', { name: /^Check/ }).click();
  await expect(page.getByText('1 of 2 goals met.', { exact: true })).toBeAttached();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test('Configure selects and checkboxes are at least 44 px tall on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useConfigureLab(page);
  await expect(h1(page, 'Choose the bakery Region')).toBeVisible();
  for (const control of [page.getByLabel('Region', { exact: true }), page.locator('label.config-toggle')]) {
    expect((await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await expectNoSidewaysScroll(page);
});
