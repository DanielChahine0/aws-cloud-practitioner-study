import { expect, type Locator, type Page, test } from '@playwright/test';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { PLACE_SOLUTION } from '../fixtures/lab-place.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';
import { HOME_TITLE } from './exam-helpers.ts';
import { expectNoAxeViolations, expectNoSidewaysScroll, failOnPageProblems, h1, seedKv } from './helpers.ts';
import {
  labDoneCount,
  labFor,
  SYNTHETIC_CONFIGURE_LAB_ID,
  SYNTHETIC_PLACE_LAB_ID,
  SYNTHETIC_POLICY_LAB_ID,
  SYNTHETIC_SIMULATE_LAB_ID,
  SYNTHETIC_SORT_LAB_ID,
  SYNTHETIC_SORT_TITLE,
  SYNTHETIC_TRACE_LAB_ID,
  storedDraftActions,
  syntheticConfigureLab,
  syntheticPlaceLab,
  syntheticPolicyLab,
  syntheticSimulateLab,
  syntheticSortLab,
  syntheticTraceLab,
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

/**
 * Answers the debrief of the lab `id` by the Runner keys: digits (and letters in a match), Enter to check, Enter for
 * Next.
 */
async function answerDebriefByKeys(page: Page, id = SYNTHETIC_SORT_LAB_ID): Promise<void> {
  const lab = await labFor(page, id);
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
 * Serves and opens another synthetic lab: the hash change alone keeps the index the Sort setup loaded, so the page
 * reloads to fetch the index and the chunk again through the new lab's routes.
 */
async function useLabAt(page: Page, lab: Parameters<typeof useSyntheticLab>[1], url: string): Promise<void> {
  await useSyntheticLab(page, lab);
  await page.goto(url);
  await page.reload();
}

const useConfigureLab = (page: Page): Promise<void> => useLabAt(page, syntheticConfigureLab, CONFIGURE_URL);

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

const SIMULATE_URL = `/#/m/01/lab/${SYNTHETIC_SIMULATE_LAB_ID}`;
const SIM_IDLE_LINE = 'Not run yet. Press Run and check to run the simulation with these parameters.';

test('a Simulate lab works by keyboard alone and runs before it checks', async ({ page, browserName }) => {
  test.skip(
    browserName === 'webkit',
    'WebKit opens a native menu for letter keys on a select, so typing a letter is unreliable there',
  );
  await useLabAt(page, syntheticSimulateLab, SIMULATE_URL);
  await expect(h1(page, 'Bakery morning rush')).toBeVisible();
  await expect(page.getByText('Prices are in lab credits, a made-up unit, not AWS prices.')).toBeVisible();
  await expect(page.getByText(SIM_IDLE_LINE)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Run and check/ })).toBeVisible();
  const mode = page.getByLabel('When ovens are added');
  await mode.focus();
  await page.keyboard.press('a');
  await expect(mode).toHaveValue('predictive');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  const most = page.getByLabel('Most ovens', { exact: true });
  await expect(most).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(most).toHaveValue('3');
  await page.keyboard.press('Enter');
  await expect(page.getByText('1 of 2 goals met.', { exact: true })).toBeAttached();
  const results = page.getByRole('table', { name: 'Results of the last run' });
  await expect(results.getByRole('row', { name: 'Daily cost 29 lab credits' })).toBeVisible();
  await expect(results.getByRole('row', { name: 'Dropped share 29.4%' })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Orders and Capacity for each hour from 0:00 to 23:00' }),
  ).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Share orders across ovens')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByText(SIM_IDLE_LINE)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText('All 2 goals met. Plus 40 XP.', { exact: true })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
});

test('a Simulate lab has no axe violations and no sideways scroll, before and after a run', async ({
  page,
}) => {
  await useLabAt(page, syntheticSimulateLab, SIMULATE_URL);
  await expect(h1(page, 'Bakery morning rush')).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await page.getByRole('button', { name: /^Run and check/ }).click();
  await expect(page.getByRole('table', { name: 'Results of the last run' })).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test('Simulate inputs, selects and checkboxes are at least 44 px tall on a phone', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useLabAt(page, syntheticSimulateLab, SIMULATE_URL);
  await expect(h1(page, 'Bakery morning rush')).toBeVisible();
  const controls = [
    page.getByLabel('When ovens are added'),
    page.getByLabel('Fewest ovens', { exact: true }),
    page.getByLabel('Ovens at opening', { exact: true }),
    page.getByLabel('Most ovens', { exact: true }),
    page.locator('label.sim-toggle'),
  ];
  for (const control of controls) {
    expect((await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: /^Run and check/ }).click();
  await expect(
    page.getByRole('img', { name: 'Orders and Capacity for each hour from 0:00 to 23:00' }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
});

const PLACE_URL = `/#/m/01/lab/${SYNTHETIC_PLACE_LAB_ID}`;
const PLACE_TITLE = 'Keep the ovens baking';
/** The fixture's solution as (piece, slot) pairs, in the order a tap run places them. */
const PLACE_TAPS = PLACE_SOLUTION.flatMap((a) => (a.t === 'place' ? [[a.piece, a.slot] as const] : []));
const piece = (page: Page, id: string): Locator => page.locator(`[data-piece="${id}"]`);
const slot = (page: Page, id: string): Locator => page.locator(`[data-slot="${id}"]`);
const pieceIn = (page: Page, slotId: string, pieceId: string): Locator =>
  page.locator(`section:has(> [data-slot="${slotId}"]) > [data-piece="${pieceId}"]`);
const failure = (page: Page, label: string): Locator => page.getByRole('button', { name: `${label} fails` });
const trayStop = (page: Page): Locator => page.locator('.place-tray [data-lab-item][tabindex="0"]');

const usePlaceLab = async (page: Page): Promise<void> => {
  await useLabAt(page, syntheticPlaceLab, PLACE_URL);
  await expect(h1(page, PLACE_TITLE)).toBeVisible();
};

/** Tabs into the Place tray with `key`, steps to a piece with the arrow keys and picks it up with Space. */
async function holdByKeys(page: Page, id: string, key: string): Promise<void> {
  await tabTo(page, trayStop(page), key);
  for (let i = 0; i < 16; i++) {
    if (await piece(page, id).evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('ArrowDown');
  }
  await expect(piece(page, id)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(piece(page, id)).toHaveAttribute('aria-pressed', 'true');
}

/** Places a piece by keys: pick it up in the tray, then press the slot's digit. */
async function placeByKeys(page: Page, id: string, digit: string, key: string): Promise<void> {
  await holdByKeys(page, id, key);
  await page.keyboard.press(digit);
  await expect(piece(page, id)).toHaveAttribute('aria-pressed', 'false');
  // The screen moves focus to the tray's first piece (or to the slot once the tray is empty) on the next frame, so
  // wait for it before the next key, or that key lands on the page and the late focus undoes it.
  await expect(page.locator('.place-tray [data-lab-item]:focus, .slot-target:focus')).toHaveCount(1);
}

test('a Place lab works by keyboard alone, previews a failure and records its completion', async ({
  page,
  browserName,
}) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  const back = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  await usePlaceLab(page);

  // Space picks a piece up in the tray, a digit places it, and focus goes back to the tray's first piece.
  await holdByKeys(page, 'front-one', tab);
  await page.keyboard.press('2');
  await expect(said(page, 'Placed First shop front in Public subnet A.')).toBeAttached();
  await expect(pieceIn(page, 'public-a', 'front-one')).toBeVisible();
  await expect(piece(page, 'front-two')).toBeFocused();

  // In the map, the arrow keys reach a placed piece; Space picks it up and Backspace sends it back to the tray.
  await page.keyboard.press(tab);
  await expect(slot(page, 'bakery-edge')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(piece(page, 'front-one')).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Backspace');
  await expect(said(page, 'First shop front is back in the tray.')).toBeAttached();
  await expect(piece(page, 'front-one')).toBeFocused();

  // Escape puts a held piece down without leaving the lab.
  await page.keyboard.press('Space');
  await expect(piece(page, 'front-one')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(piece(page, 'front-one')).toHaveAttribute('aria-pressed', 'false');
  await expect(h1(page, PLACE_TITLE)).toBeVisible();

  // With a piece held, Space on a focused slot places it there.
  await page.keyboard.press('Space');
  await page.keyboard.press(tab);
  await page.keyboard.press('ArrowDown');
  await expect(slot(page, 'public-a')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(said(page, 'Placed First shop front in Public subnet A.')).toBeAttached();
  await expect(pieceIn(page, 'public-a', 'front-one')).toBeVisible();

  // A failure button previews the failure in words, and a second press brings the zone back.
  await tabTo(page, failure(page, 'Oven Row A'), tab);
  await page.keyboard.press('Enter');
  await expect(said(page, 'Oven Row A is down.')).toBeAttached();
  await expect(failure(page, 'Oven Row A')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.place-box.is-down')).toContainText('Oven Row A Down');
  await expect(piece(page, 'front-one')).toContainText('Down');
  await page.keyboard.press('Enter');
  await expect(said(page, 'Oven Row A is back.')).toBeAttached();
  await expect(page.locator('.place-box.is-down')).toHaveCount(0);

  // The scripted partial board meets one goal; Enter on a slot checks it.
  await placeByKeys(page, 'front-two', '4', back);
  await placeByKeys(page, 'gateway', '1', tab);
  await placeByKeys(page, 'route-a', '2', tab);
  await placeByKeys(page, 'route-b', '4', tab);
  await page.keyboard.press(tab);
  await expect(page.locator('.slot-target:focus')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(said(page, '1 of 3 goals met.')).toBeAttached();

  // The draft survives a reload.
  await expect.poll(() => storedDraftActions(page, SYNTHETIC_PLACE_LAB_ID)).toBeGreaterThan(0);
  const stored = await storedDraftActions(page, SYNTHETIC_PLACE_LAB_ID);
  await page.reload();
  await expect(h1(page, PLACE_TITLE)).toBeVisible();
  expect(await storedDraftActions(page, SYNTHETIC_PLACE_LAB_ID)).toBe(stored);
  await expect(pieceIn(page, 'public-b', 'route-b')).toBeVisible();

  await placeByKeys(page, 'recipes-one', '3', tab);
  await placeByKeys(page, 'recipes-two', '5', tab);
  await placeByKeys(page, 'mixer', '6', tab);
  // With the tray empty, focus stays on the slot that took the last piece, where Enter checks.
  await expect(page.getByText('Every piece is placed.')).toBeVisible();
  await expect(slot(page, 'not-used')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(said(page, 'All 3 goals met. Plus 40 XP.')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
  await answerDebriefByKeys(page, SYNTHETIC_PLACE_LAB_ID);
  await expect(page.getByRole('link', { name: 'Back to Module 1' })).toBeVisible();
  await expect.poll(() => labDoneCount(page, SYNTHETIC_PLACE_LAB_ID)).toBe(1);
});

test('a Place lab has no axe violations and no sideways scroll', async ({ page }) => {
  await usePlaceLab(page);
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await piece(page, 'gateway').click();
  await expect(piece(page, 'gateway')).toHaveAttribute('aria-pressed', 'true');
  await failure(page, 'Oven Row A').click();
  await expect(said(page, 'Oven Row A is down.')).toBeAttached();
  // An opened hint adds the Place engine's sentence about the board now, and the held piece stays held.
  await page.getByRole('button', { name: 'Hint' }).first().click();
  await expect(page.locator('.lab-goals .hint')).toContainText('First shop front is still in the tray.');
  await expect(piece(page, 'gateway')).toHaveAttribute('aria-pressed', 'true');
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  for (const [id, target] of PLACE_TAPS) {
    if (id !== 'gateway') await piece(page, id).click();
    await slot(page, target).click();
    await expect(pieceIn(page, target, id)).toBeVisible();
  }
  await expect(piece(page, 'front-one')).toContainText('Down');
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await checkButton(page).click();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
  await expect(page.locator('section.runner')).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test('a Place lab works by taps on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the tap run is checked on the phone project only');
  await usePlaceLab(page);
  await piece(page, 'front-one').tap();
  await slot(page, 'public-a').tap();
  await expect(said(page, 'Placed First shop front in Public subnet A.')).toBeAttached();
  await failure(page, 'Oven Row A').tap();
  await expect(said(page, 'Oven Row A is down.')).toBeAttached();
  await expect(piece(page, 'front-one')).toContainText('Down');
  for (const [id, target] of PLACE_TAPS.filter(([id]) => id !== 'front-one')) {
    await piece(page, id).tap();
    await slot(page, target).tap();
    await expect(pieceIn(page, target, id)).toBeVisible();
  }
  await checkButton(page).tap();
  await expect(said(page, 'All 3 goals met. Plus 40 XP.')).toBeAttached();
});

test('Place pieces, slots and failure buttons are at least 44 px tall on a phone', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await usePlaceLab(page);
  const targets = await page.locator('.place-tray .piece, .slot-target, .place-failures button').all();
  expect(targets.length).toBe(16);
  for (const target of targets) {
    expect((await target.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const board = await page.locator('.lab-board').boundingBox();
  const goals = await page.locator('.lab-goals').boundingBox();
  if (!board || !goals) throw new Error('the board or the goals have no box');
  expect(goals.y).toBeGreaterThanOrEqual(board.y + board.height);
  await expectNoSidewaysScroll(page);
});

const TRACE_URL = `/#/m/01/lab/${SYNTHETIC_TRACE_LAB_ID}`;
const POLICY_URL = `/#/m/01/lab/${SYNTHETIC_POLICY_LAB_ID}`;
const HTTPS_IN = 'Inbound TCP 443 from 0.0.0.0/0';
const SSH_OFFICE = 'Inbound TCP 22 from 192.0.2.0/24';
const REPLIES_OUT = 'Rule 100: allow outbound TCP 1024-65535 to 0.0.0.0/0';
const CUSTOMER = 'A customer opens the order page';
const rule = (page: Page, text: string): Locator => page.getByRole('checkbox', { name: text, exact: true });
const caseSummary = (page: Page, label: string): Locator => page.locator('summary', { hasText: label });
const hopsOf = (page: Page, label: string): Locator =>
  page.locator('li.trace-case', { has: caseSummary(page, label) }).locator('.trace-hops li');

/**
 * Scans the lab from the top of the page: opening a case scrolls it into view, and axe counts a checkbox that sits
 * under the sticky top bar as a target with no room around it, which says where the page is scrolled, not how the
 * board is built.
 */
async function scanFromTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
}

test('a Trace lab works by keyboard alone and steps a case through its hops', async ({
  page,
  browserName,
}) => {
  // WebKit tabs to checkboxes and summaries only with Option held, as on a Mac without full keyboard access.
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  const back = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  await useLabAt(page, syntheticTraceLab, TRACE_URL);
  await expect(h1(page, 'Open the order window')).toBeVisible();
  await expect(page.getByText('Trace lab, about 6 minutes')).toBeVisible();
  await tabTo(page, rule(page, HTTPS_IN), tab);
  await page.keyboard.press('Space');
  await expect(rule(page, HTTPS_IN)).toBeChecked();
  await expect(said(page, `${HTTPS_IN} is on.`)).toBeAttached();
  await tabTo(page, caseSummary(page, CUSTOMER), tab);
  await expect(caseSummary(page, CUSTOMER)).toContainText('Result: Denied. Expected: Allowed.');
  await page.keyboard.press('Enter');
  await expect(hopsOf(page, CUSTOMER)).toHaveText([
    'Network ACL, inbound: Allowed by rule 100',
    'Security group, inbound: Allowed',
    'Security group, outbound (reply): Allowed as a reply',
    'Network ACL, outbound (reply): Denied by the final * rule',
  ]);
  await tabTo(page, rule(page, REPLIES_OUT), back);
  await page.keyboard.press('Space');
  await expect(said(page, `${REPLIES_OUT} is on.`)).toBeAttached();
  await expect(caseSummary(page, CUSTOMER)).toContainText('Result: Allowed. Expected: Allowed.');
  await expect(hopsOf(page, CUSTOMER).last()).toHaveText(
    'Network ACL, outbound (reply): Allowed by rule 100',
  );
  await page.keyboard.press('Enter');
  await expect(page.getByText('1 of 2 goals met.', { exact: true })).toBeAttached();
  await expect(goal(page, 'Only the office logs in')).toContainText('Not met');
  // The draft keeps both switched rules across a reload.
  await expect.poll(() => storedDraftActions(page, SYNTHETIC_TRACE_LAB_ID)).toBe(2);
  await page.reload();
  await expect(h1(page, 'Open the order window')).toBeVisible();
  await expect(rule(page, HTTPS_IN)).toBeChecked();
  await expect(rule(page, REPLIES_OUT)).toBeChecked();
  await tabTo(page, rule(page, SSH_OFFICE), tab);
  await page.keyboard.press('Space');
  await expect(rule(page, SSH_OFFICE)).toBeChecked();
  await page.keyboard.press('Enter');
  await expect(page.getByText('All 2 goals met. Plus 40 XP.', { exact: true })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
  await answerDebriefByKeys(page, SYNTHETIC_TRACE_LAB_ID);
  expect(await labDoneCount(page, SYNTHETIC_TRACE_LAB_ID)).toBe(1);
});

test('Trace labs of both kinds have no axe violations and no sideways scroll', async ({ page }) => {
  await useLabAt(page, syntheticTraceLab, TRACE_URL);
  await expect(h1(page, 'Open the order window')).toBeVisible();
  await caseSummary(page, CUSTOMER).click();
  await expect(hopsOf(page, CUSTOMER)).toHaveCount(4);
  await scanFromTop(page);
  await checkButton(page).click();
  await expect(page.getByText('0 of 2 goals met.', { exact: true })).toBeAttached();
  await scanFromTop(page);

  await useLabAt(page, syntheticPolicyLab, POLICY_URL);
  await expect(h1(page, 'Keys for the bakers')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Bakers policy, attached to Bakers' })).toBeVisible();
  await caseSummary(page, 'Mo reads the rye recipe').click();
  await expect(hopsOf(page, 'Mo reads the rye recipe')).toHaveText([
    'SCP at Bakery group: Allowed',
    'SCP at Shops: Allowed',
    'SCP at East shop: Allowed',
    'IAM policies: No match',
  ]);
  await scanFromTop(page);
  await checkButton(page).click();
  await expect(page.getByText('1 of 2 goals met.', { exact: true })).toBeAttached();
  await scanFromTop(page);
});

test('a Trace lab works by taps on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useLabAt(page, syntheticPolicyLab, POLICY_URL);
  await expect(h1(page, 'Keys for the bakers')).toBeVisible();
  const recipes = 'Allow recipes:Get* on recipes/*';
  await rule(page, recipes).tap();
  await expect(said(page, `${recipes} is on.`)).toBeAttached();
  await caseSummary(page, 'Mo starts a bake in the deck oven').tap();
  await expect(hopsOf(page, 'Mo starts a bake in the deck oven').last()).toHaveText('IAM policies: No match');
  await rule(page, 'Allow oven:StartBake, oven:StopBake on oven/*').tap();
  await expect(hopsOf(page, 'Mo starts a bake in the deck oven').last()).toHaveText('IAM policies: Allowed');
  await checkButton(page).tap();
  await expect(page.getByText('All 2 goals met. Plus 40 XP.', { exact: true })).toBeAttached();
  expect(await labDoneCount(page, SYNTHETIC_POLICY_LAB_ID)).toBe(1);
});

test('Trace checkboxes and case summaries are at least 44 px tall on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useLabAt(page, syntheticTraceLab, TRACE_URL);
  await expect(h1(page, 'Open the order window')).toBeVisible();
  const targets = [
    ...(await page.locator('label.trace-rule').all()),
    ...(await page.locator('.trace-case summary').all()),
  ];
  expect(targets).toHaveLength(16);
  for (const target of targets) expect((await target.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expectNoSidewaysScroll(page);
});
