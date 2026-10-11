import { expect, type Page, test } from '@playwright/test';
import { expectNoAxeViolations, expectNoSidewaysScroll, failOnPageProblems, h1 } from './helpers.ts';

/** 2026-10-20 at 09:00 UTC, a week after the missions Dani did by hand. */
const NOW = '2026-10-20T09:00:00.000Z';

const panel = (page: Page) => page.getByRole('region', { name: 'Done some missions already?' });
const row = (page: Page, n: number) =>
  page.locator(`main a.row[href="#/missions/mission-${String(n).padStart(2, '0')}"]`);

failOnPageProblems();
// UTC keeps the study day and the 04:00 boundary the same on every machine.
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
  await page.goto('/#/missions');
  await expect(h1(page, 'Missions')).toBeVisible();
});

test('Already done names what is missing or wrong, and records nothing until it is right', async ({
  page,
}) => {
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  const alert = panel(page).getByRole('alert');
  await expect(alert).toContainText('Enter the date you finished Mission 0.');
  await expect(alert).toContainText('Enter the credits you have left.');
  await panel(page).getByLabel('Mission 0 finished on').fill('2026-10-21');
  await panel(page).getByLabel('Mission 1 is done too').check();
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  await expect(alert).toContainText('Enter the day you verified Mission 1.');
  await expect(alert).toContainText('Dates cannot be in the future.');
  await panel(page).getByLabel('Mission 1 verified on').fill('2026-10-13');
  await panel(page).getByLabel('Mission 1 usage checked on').fill('2026-10-13');
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  await expect(alert).toContainText('The usage check comes after the day you verified Mission 1.');
  await expect(row(page, 0).locator('.row-meta')).toHaveText('Ready');
});

test('Already done records both missions on their days with the plan, once', async ({ page }) => {
  await expect(panel(page)).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await panel(page).getByLabel('Mission 0 finished on').fill('2026-10-12');
  await panel(page).getByLabel('Mission 1 is done too').check();
  await panel(page).getByLabel('Mission 1 verified on').fill('2026-10-13');
  await panel(page).getByLabel('Mission 1 usage checked on').fill('2026-10-14');
  await panel(page).getByLabel('Credits left that day ($)').fill('119.5');
  await panel(page).getByLabel('Credits left ($)', { exact: true }).fill('119');
  await panel(page).getByLabel('Plan ends on').fill('2027-04-10');
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  const services = panel(page).getByRole('group', { name: 'Services on your plan' });
  const boxes = services.getByRole('checkbox');
  for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check();
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(row(page, 0).locator('.row-meta')).toHaveText('Closed');
  await expect(row(page, 1).locator('.row-meta')).toHaveText('Closed');
  await expect(row(page, 2).locator('.row-meta')).toHaveText('Ready');
  await page.reload();
  await expect(row(page, 2).locator('.row-meta')).toHaveText('Ready');
  await expect(panel(page)).toHaveCount(0);
  await row(page, 0).click();
  await expect(page.getByText('Closed on Mon 12 Oct.')).toBeVisible();
  await page.goto('/#/missions/mission-01');
  await expect(page.getByText('Closed on Wed 14 Oct.')).toBeVisible();
});

test('Already done without a usage date leaves Mission 1 verified, and Next asks for its usage check', async ({
  page,
}) => {
  await panel(page).getByLabel('Mission 0 finished on').fill('2026-10-12');
  await panel(page).getByLabel('Mission 1 is done too').check();
  await panel(page).getByLabel('Mission 1 verified on').fill('2026-10-13');
  await panel(page).getByLabel('Credits left ($)', { exact: true }).fill('120');
  await panel(page).getByLabel('Plan ends on').fill('2027-04-10');
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  await expect(row(page, 1).locator('.row-meta')).toHaveText('Verified');
  await expect(row(page, 2).locator('.row-meta')).toHaveText('Not on your plan');
  await page.goto('/');
  await expect(page.locator('a.next[data-next] .next-label')).toHaveText('Check usage for M1');
});
