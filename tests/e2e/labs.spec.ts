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
  SYNTHETIC_INVESTIGATE_LAB_ID,
  SYNTHETIC_INVESTIGATE_TITLE,
  SYNTHETIC_SIMULATE_LAB_ID,
  SYNTHETIC_SORT_LAB_ID,
  SYNTHETIC_SORT_TITLE,
  storedDraftActions,
  syntheticConfigureLab,
  syntheticInvestigateLab,
  syntheticSimulateLab,
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

const INVESTIGATE_URL = `/#/m/01/lab/${SYNTHETIC_INVESTIGATE_LAB_ID}`;
const LEDGER = 'Pantry ledger, Flourtown bakery, 14 March, times in UTC';
const WHO = 'Who threw the sourdough starter away?';
const WHAT = 'Which event took the starter out of the pantry for good?';
const WHEN = 'When did the starter leave the pantry?';
const useInvestigateLab = (page: Page): Promise<void> =>
  useLabAt(page, syntheticInvestigateLab, INVESTIGATE_URL);
const ledgerRows = (page: Page): Locator => page.getByRole('region', { name: LEDGER }).locator('tbody tr');
const select = (page: Page, label: string): Locator => page.getByLabel(label, { exact: true });

/**
 * Types the first letters of an option on the focused select, the way a keyboard user picks one; both browsers match
 * the typed letters against the option labels without opening the menu.
 */
async function typeToChoose(page: Page, target: Locator, letters: string, value: string): Promise<void> {
  await expect(target).toBeFocused();
  await page.keyboard.type(letters);
  await expect(target).toHaveValue(value);
}

test('an Investigate lab works by keyboard alone, filters its records and records its completion', async ({
  page,
  browserName,
}) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await useInvestigateLab(page);
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  await expect(ledgerRows(page)).toHaveCount(8);

  // A filter narrows the records and says how many it shows; it never answers a question.
  await tabTo(page, select(page, 'Event'), tab);
  await typeToChoose(page, select(page, 'Event'), 'th', 'Throw away');
  await expect(said(page, '2 of 8 records shown.')).toBeAttached();
  await expect(ledgerRows(page)).toHaveCount(2);
  await page.keyboard.press(tab);
  await expect(select(page, 'Result')).toBeFocused();
  await typeToChoose(page, select(page, 'Result'), 'r', 'Refused');
  await expect(said(page, '1 of 8 records shown.')).toBeAttached();

  // Enter in a select checks the board on demand.
  await tabTo(page, select(page, WHO), tab);
  await typeToChoose(page, select(page, WHO), 'i', 'ines');
  await page.keyboard.press(tab);
  await typeToChoose(page, select(page, WHAT), 'th', 'throw-away');
  await page.keyboard.press('Enter');
  await expect(said(page, '1 of 2 goals met.')).toBeAttached();
  await expect(goal(page, 'Name who threw the starter away, and how')).toContainText('Met');
  await expect(goal(page, 'Pin down when the starter left')).toContainText('Not met');

  // The draft keeps every answer and filter across a reload.
  // Each typed letter that moves the select is a change the draft stores, and a reload replays them all.
  await expect.poll(() => storedDraftActions(page, SYNTHETIC_INVESTIGATE_LAB_ID)).toBeGreaterThan(0);
  await page.reload();
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  await expect(select(page, WHO)).toHaveValue('ines');
  await expect(select(page, WHAT)).toHaveValue('throw-away');
  await expect(select(page, 'Event')).toHaveValue('Throw away');
  await expect(page.getByText('1 of 8 records shown.', { exact: true })).toBeVisible();
  // Raw lab, question, option and record ids never show (spec 2.8).
  expect(await page.locator('.lab').innerText()).not.toMatch(
    /lab-m01-bakery-ledger|throw-away|at-0732|\br4\b/,
  );

  await tabTo(page, select(page, WHEN), tab);
  await typeToChoose(page, select(page, WHEN), '07:3', 'at-0732');
  await page.keyboard.press('Enter');
  await expect(said(page, 'All 2 goals met. Plus 40 XP.')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
  await answerDebriefByKeys(page, SYNTHETIC_INVESTIGATE_LAB_ID);
  await expect(page.getByRole('link', { name: 'Back to Module 1' })).toBeVisible();
  await expect.poll(() => labDoneCount(page, SYNTHETIC_INVESTIGATE_LAB_ID)).toBe(1);
});

test('an Investigate lab has no axe violations and no sideways scroll', async ({ page }) => {
  await useInvestigateLab(page);
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await select(page, 'Who').selectOption('Tobin');
  await expect(said(page, '3 of 8 records shown.')).toBeAttached();
  await select(page, 'Result').selectOption('Done');
  await select(page, 'Event').selectOption('Throw away');
  await expect(page.getByText('No record matches these filters.', { exact: true })).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await select(page, WHO).selectOption('mara');
  await checkButton(page).click();
  await expect(said(page, '0 of 2 goals met.')).toBeAttached();
  // A hint is free and reads the board as it is now.
  await page.getByRole('button', { name: 'Hint' }).first().click();
  await expect(
    page.getByText(
      'A refused event changes nothing in the pantry; only an event that is done removes the starter. 1 question still unanswered and 1 answer wrong.',
    ),
  ).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test('an Investigate lab works by taps on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useInvestigateLab(page);
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  await select(page, 'Who').tap();
  await select(page, 'Who').selectOption('Ines');
  await expect(said(page, '2 of 8 records shown.')).toBeAttached();
  for (const [label, option] of [
    [WHO, 'Ines'],
    [WHAT, 'Throw away'],
    [WHEN, '07:32 UTC'],
  ] as const) {
    await select(page, label).tap();
    await select(page, label).selectOption({ label: option });
  }
  await checkButton(page).tap();
  await expect(said(page, 'All 2 goals met. Plus 40 XP.')).toBeAttached();
});

test('Investigate selects are at least 44 px tall on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useInvestigateLab(page);
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  const selects = await page.locator('.inv select').all();
  expect(selects).toHaveLength(6);
  for (const control of selects) {
    expect((await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await expectNoSidewaysScroll(page);
});
