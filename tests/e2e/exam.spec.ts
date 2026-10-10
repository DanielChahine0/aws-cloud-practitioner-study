import { expect, type Page, test } from '@playwright/test';
import { timelineOf } from '../fixtures/events.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';
import {
  answerBoss,
  answerMock,
  bossQuestions,
  finishBoss,
  HOME_TITLE,
  readyModule,
  startBoss,
  useSyntheticExam,
} from './exam-helpers.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
} from './helpers.ts';

failOnPageProblems();
// UTC keeps the study day fixed; nothing of an exam may land in a trace, a screenshot or a video.
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

test.beforeEach(async ({ page }) => {
  await useSyntheticExam(page);
  await page.clock.install({ time: new Date(E2E_NOW) });
});

const resultsTitle = (page: Page) => page.getByRole('heading', { level: 1, name: /^Boss: .+ results$/ });
const nextBlock = (page: Page) => page.locator('.next-block');

test('a boss that runs out of time leads to results and the error review', async ({ page }) => {
  await readyModule(page, 3);
  await expect(page.locator('a.hex[href="#/m/03"] span.hex-dot')).toBeVisible();
  await page.goto('/#/m/03');
  await page.getByRole('link', { name: 'Start the boss (15 questions, 21 min)', exact: true }).click();
  await expect(
    page.getByText('15 questions, 21 minutes. The timer cannot pause.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start the boss', exact: true }).click();
  const questions = await bossQuestions(page, 3);
  for (let i = 0; i < 3; i += 1) {
    await answerBoss(page, questions, i !== 1);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.clock.fastForward('21:00');
  await page.clock.runFor(1000);
  await expect(resultsTitle(page)).toBeVisible();
  await expect(page.getByText(/^Not passed: /)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Wrong answers' })).toBeVisible();
  const misread = page.getByRole('button', { name: 'Misread', exact: true }).first();
  await expect(misread).toHaveAttribute('aria-pressed', 'false');
  await misread.click();
  await expect(misread).toHaveAttribute('aria-pressed', 'true');
});

test('a boss settles at its deadline while Dani is on Home', async ({ page }) => {
  await readyModule(page, 3);
  await startBoss(page, 3);
  await page.goto('/#/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await expect(nextBlock(page)).toContainText('Resume: Boss');
  await page.clock.fastForward('21:00');
  await page.clock.runFor(1000);
  await expect(nextBlock(page)).not.toContainText('Resume: Boss');
  await page.goto('/#/m/03');
  await expect(page.getByText('Next try in 20 h.', { exact: true })).toBeVisible();
});

test('a mock survives a reload with the right time left', async ({ page }) => {
  await page.goto('/#/s/mock/a');
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  const exam = page.locator('section.exam');
  await expect(exam).toBeVisible();
  for (let i = 0; i < 2; i += 1) {
    await page.keyboard.press('1');
    await page.keyboard.press('ArrowRight');
  }
  const qid = await exam.getAttribute('data-qid');
  await page.clock.fastForward('10:00');
  await page.reload();
  // The page clock keeps running, so the bar reads 80:00 less the few real seconds the test itself took.
  await expect(page.locator('header.topbar.focus')).toHaveText(
    /^Mock A\s+3\/65\s+(80:00|79:[0-5]\d)\s+Flag \(f\)\s+Grid \(g\)$/,
  );
  await expect(exam).toHaveAttribute('data-qid', qid ?? '');
});

test('a mock that runs out of time says so on its results', async ({ page }) => {
  await page.goto('/#/s/mock/a');
  await expect(
    page.getByText('65 questions, 90 minutes. The timer cannot pause.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  await expect(page.locator('section.exam')).toBeVisible();
  await page.keyboard.press('1');
  await page.clock.fastForward('01:30:00');
  await page.clock.runFor(1000);
  await expect(page.getByRole('heading', { level: 1, name: 'Mock A results' })).toBeVisible();
  await expect(page.getByText('Time ran out.', { exact: true })).toBeVisible();
});

test('the remix start screen and an unknown result say why nothing runs', async ({ page }) => {
  await page.goto('/#/s/mock/remix');
  const lede =
    '65 questions from forms you have taken. No XP, and it does not count toward readiness or rank.';
  await expect(page.getByText(lede, { exact: true })).toBeVisible();
  await expect(page.getByText('Opens after you take all four mocks.', { exact: true })).toBeVisible();
  await page.goto('/#/r/01JA0000000000000000000000');
  await expect(page.getByText('This result is not in this browser.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Home', exact: true }).click();
  await expect(h1(page, HOME_TITLE)).toBeVisible();
});

test('the go/no-go line shows a week before the exam while readiness is below Ready', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  const start = Date.parse(E2E_NOW);
  await seedEvents(
    page,
    timelineOf([[new Date(start).toISOString(), { t: 'settings', patch: { examDate: '2026-11-14' } }]]),
  );
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  const line = 'Exam Sat 14 Nov, readiness Building. Rescheduling closes 24 h before the appointment.';
  await page.clock.setSystemTime(new Date('2026-11-06T09:00:00.000Z'));
  await page.reload();
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await expect(page.getByText(line, { exact: true })).toHaveCount(0);
  await page.clock.setSystemTime(new Date('2026-11-07T09:00:00.000Z'));
  await page.reload();
  await expect(page.getByText(line, { exact: true })).toBeVisible();
  await page.clock.setSystemTime(new Date('2026-11-13T09:00:00.000Z'));
  await page.reload();
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await expect(page.getByText(line, { exact: true })).toHaveCount(0);
});

test('the exam shell works by keyboard alone', async ({ page, browserName }) => {
  await readyModule(page, 3);
  await page.goto('/#/s/boss/m03');
  await page.getByRole('button', { name: 'Start the boss', exact: true }).focus();
  await page.keyboard.press('Enter');
  const exam = page.locator('section.exam');
  await expect(exam).toBeVisible();
  const bar = page.locator('header.topbar.focus');
  await page.keyboard.press('1');
  await expect(exam.locator('fieldset.options input').first()).toBeChecked();
  await page.keyboard.press('f');
  await expect(exam.getByRole('button', { name: 'Flag', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('ArrowRight');
  await expect(bar).toContainText('2/15');
  // Focus moves to the stem on every new question (spec 7.6).
  await expect(exam.locator('#stem')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(bar).toContainText('1/15');
  await expect(exam.locator('#stem')).toBeFocused();
  await page.keyboard.press('g');
  await expect(page.getByRole('navigation', { name: 'Questions' })).toBeVisible();
  await page.keyboard.press('h');
  await expect(page).toHaveURL(/#\/s\/boss\/m03$/);
  await page.keyboard.press('/');
  await expect(page.locator('dialog.palette')).toHaveCount(0);
  await page.keyboard.press('?');
  const help = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(help).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(help).toHaveCount(0);
  await expect(page).toHaveURL(/#\/s\/boss\/m03$/);
  await page.keyboard.press('Control+Enter');
  const confirm = page.locator('dialog.confirm');
  await expect(confirm).toBeVisible();
  await expect(confirm.getByRole('heading', { name: 'Submit the exam?', exact: true })).toBeVisible();
  await expect(confirm.getByRole('button', { name: 'Keep working', exact: true })).toBeFocused();
  // WebKit, like Safari, tabs to buttons only with Option held.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(confirm.getByRole('button', { name: 'Submit', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(resultsTitle(page)).toBeVisible();
});

test('a passed boss rings its hex and pays 100 XP once', async ({ page }) => {
  await readyModule(page, 3);
  await startBoss(page, 3);
  await finishBoss(page, 3, () => true);
  await expect(resultsTitle(page)).toBeVisible();
  await expect(page.getByText('Passed. +100 XP', { exact: true })).toBeVisible();
  await page.goto('/#/');
  await expect(page.locator('a.hex[href="#/m/03"] polygon.hex-ring')).toHaveCount(1);
  await expect(page.locator('a.hex[href="#/m/03"] span.hex-dot')).toHaveCount(0);
  await page.clock.fastForward('20:01:00');
  await startBoss(page, 3);
  await finishBoss(page, 3, () => true);
  await expect(page.getByText('Passed.', { exact: true })).toBeVisible();
  await expect(page.getByText('Passed. +100 XP', { exact: true })).toHaveCount(0);
});

test('the exam screens and the new surfaces have no axe violations and no sideways scroll', async ({
  page,
}) => {
  await readyModule(page, 3);
  await page.goto('/#/s/boss/m03');
  await expect(page.getByRole('button', { name: 'Start the boss', exact: true })).toBeVisible();
  await expectNoAxeViolations(page, { redact: true });
  await expectNoSidewaysScroll(page);

  await page.getByRole('button', { name: 'Start the boss', exact: true }).click();
  await expect(page.locator('section.exam')).toBeVisible();
  await page.keyboard.press('g');
  await expect(page.getByRole('navigation', { name: 'Questions' })).toBeVisible();
  await expectNoAxeViolations(page, { redact: true });
  await expectNoSidewaysScroll(page);

  await page.keyboard.press('Control+Enter');
  const confirm = page.locator('dialog.confirm');
  await expect(confirm).toBeVisible();
  await expectNoAxeViolations(page, { redact: true });
  await confirm.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(resultsTitle(page)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Wrong answers' })).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await page.goto('/#/s/mock');
  await expect(h1(page, 'Mock exams')).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await page.goto('/#/m/03');
  await expect(page.getByRole('heading', { level: 2, name: 'Concepts' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Boss' })).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await page.goto('/#/m/03/l/aws-lambda');
  await expect(page.locator('.recall-dot').first()).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await page.goto('/#/');
  await page.locator('button.topbar-rank').click();
  for (const name of [
    'Rank',
    'Readiness',
    'Last 14 days',
    'Calibration',
    'Error causes',
    'Badges',
    'Mock exams',
    'Reset',
  ]) {
    await expect(page.getByRole('heading', { level: 3, name, exact: true })).toBeVisible();
  }
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test('mock options are full width and at least 44 px tall on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await page.goto('/#/s/mock/a');
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  const options = page.locator('section.exam fieldset.options');
  await expect(options).toBeVisible();
  const field = await options.boundingBox();
  const labels = await options.locator('label.option').all();
  expect(labels.length).toBe(4);
  for (const label of labels) {
    const box = await label.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual((field?.width ?? 0) - 2);
  }
  await answerMock(page, true);
  await expect(page.getByRole('radio', { name: 'Option 1', exact: true })).toBeChecked();
});
