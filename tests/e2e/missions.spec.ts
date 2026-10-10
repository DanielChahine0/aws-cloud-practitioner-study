import { expect, type Page, test } from '@playwright/test';
import type { NewEvent } from '../../schemas/events.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
  seedKv,
} from './helpers.ts';

/** The mission tests run on 2026-10-20 at 09:00 UTC, the day after Mission 0 was verified in the seeded logs. */
const NOW = '2026-10-20T09:00:00.000Z';
const YESTERDAY = '2026-10-19T09:00:00.000Z';
const TOMORROW = '2026-10-21T09:00:00.000Z';
const HOME_TITLE = 'AWS Cloud Practitioner Essentials';

/** Every service of Missions 1 to 8, as the Plan status form lists them. */
const PLAN_SERVICES = [
  'Amazon CloudFront',
  'Amazon CloudWatch',
  'Amazon CloudWatch Logs',
  'Amazon DynamoDB',
  'Amazon EC2',
  'Amazon S3',
  'Amazon SNS',
  'Amazon VPC',
  'AWS CloudFormation',
  'AWS CloudTrail',
  'AWS Identity and Access Management',
  'AWS Lambda',
  'AWS Pricing Calculator',
  'AWS Well-Architected Tool',
];

const step = (mission: string, s: 'start' | 'verified' | 'cleaned' | 'usage-ok'): NewEvent =>
  s === 'usage-ok' ? { t: 'mission', mission, step: s, credits: 118.5 } : { t: 'mission', mission, step: s };

/** Mission 0 started and verified the day before. */
const GATE: (readonly [string, NewEvent])[] = [
  ['2026-10-19T08:00:00.000Z', step('mission-00', 'start')],
  [YESTERDAY, step('mission-00', 'verified')],
];

/** A saved plan with every service offered, except those in `without`. */
const plan = (without: readonly string[] = []) => ({
  plan: 'free',
  credits: 120,
  endsOn: '2027-04-10',
  services: Object.fromEntries(PLAN_SERVICES.map((s) => [s, !without.includes(s)])),
  recordedAt: YESTERDAY,
});

/** Opens Home, then stores the plan and the log, which the reload in `seedEvents` loads. */
async function seed(
  page: Page,
  log: readonly (readonly [string, NewEvent])[],
  kv: Record<string, unknown> = {},
) {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION, ...kv });
  await seedEvents(page, timelineOf(log));
}

const row = (page: Page, n: number) =>
  page.locator(`main a.row[href="#/missions/mission-${String(n).padStart(2, '0')}"]`);
const chip = (page: Page) => page.locator('.topbar-live');
const announced = (page: Page) => page.locator('main p[aria-live="polite"]');

/** Ticks every step of the open mission page. */
async function tickAll(page: Page): Promise<void> {
  const boxes = page.getByRole('checkbox', { name: /^Done: / });
  const count = await boxes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) await boxes.nth(i).check();
}

failOnPageProblems();
// UTC keeps the study day and the 04:00 boundary the same on every machine.
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
});

test('Missions 2 to 8 show Locked until Mission 0 is verified', async ({ page }) => {
  await page.goto('/#/missions');
  await expect(h1(page, 'Missions')).toBeVisible();
  await expect(page.locator('main .lede')).toHaveText('Start with Mission 0: Guardrails.');
  await expect(row(page, 0).locator('.row-meta')).toHaveText('Ready');
  for (let n = 1; n <= 8; n++) await expect(row(page, n).locator('.row-meta')).toHaveText('Locked');
  await row(page, 3).click();
  await expect(page.getByText('Locked until Mission 0 is verified.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Mission 3' })).toHaveCount(0);
});

test('Mission 0 ticks, the plan status and Verify unlock Mission 2', async ({ page }) => {
  await page.goto('/#/missions/mission-00');
  await page.getByRole('button', { name: 'Start Mission 0' }).click();
  await expect(announced(page)).toHaveText('Mission 0 started.');
  const verify = page.getByRole('button', { name: 'Verify' });
  await expect(verify).toBeDisabled();
  await expect(page.getByText('Tick every step first.')).toBeVisible();
  await tickAll(page);
  await expect(page.getByText('Save your plan status first.')).toBeVisible();
  await page.getByRole('button', { name: 'Save plan status' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter the credits you have left.');
  await expect(page.getByRole('alert')).toContainText('Enter the date your plan ends.');
  await page.getByLabel('Free plan').check();
  await page.getByLabel('Credits left ($)').fill('120');
  await page.getByLabel('Plan ends on').fill('2027-04-10');
  const services = page.getByRole('group', { name: 'Services on your plan' });
  for (const name of PLAN_SERVICES) await services.getByLabel(name, { exact: true }).check();
  await page.getByRole('button', { name: 'Save plan status' }).click();
  await expect(page.getByText('Plan status saved on Tue 20 Oct.')).toBeVisible();
  await expect(verify).toBeEnabled();
  await verify.click();
  await expect(announced(page)).toHaveText('Mission 0 verified.');
  await expect(page.getByText('Closed on Tue 20 Oct.')).toBeVisible();
  await page.goto('/#/missions');
  await expect(page.locator('main .lede')).toHaveText(
    'Real AWS, done by hand in your own account, one mission at a time.',
  );
  await expect(row(page, 0).locator('.row-meta')).toHaveText('Closed');
  await expect(row(page, 2).locator('.row-meta')).toHaveText('Ready');
});

test('a service the plan lacks shows Not on your plan and no Start button', async ({ page }) => {
  await seed(page, GATE, { [KV_KEYS.plan]: plan(['AWS Lambda']) });
  await page.goto('/#/missions');
  await expect(row(page, 3).locator('.row-meta')).toHaveText('Not on your plan');
  await row(page, 3).click();
  await expect(page.getByText('Not on your plan: AWS Lambda.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Mission 3' })).toHaveCount(0);
});

test('Start Mission 3 shows the live chip, which counts up and leaves on cleanup', async ({ page }) => {
  await seed(page, GATE, { [KV_KEYS.plan]: plan() });
  await page.goto('/#/missions/mission-03');
  await page.getByRole('button', { name: 'Start Mission 3' }).click();
  await expect(announced(page)).toHaveText('Mission 3 started.');
  await expect(chip(page)).toHaveText('M3 live 0m');
  // The chip takes the Missions link's place at every width, phone included.
  await expect(chip(page)).toBeVisible();
  await expect(page.locator('.topbar-missions')).toHaveCount(0);
  await expect(chip(page)).toHaveAttribute('href', '#/missions/mission-03');
  await page.clock.fastForward('01:00:00');
  await expect(chip(page)).toHaveText('M3 live 1h');
  await expect(chip(page)).toHaveAccessibleName('Mission 3 has been live for 1 hour; open it');
  await page.getByRole('button', { name: 'Cleaned up' }).click();
  await expect(announced(page)).toHaveText('Mission 3 cleaned up.');
  await expect(chip(page)).toHaveCount(0);
  await expect(page.locator('.topbar-missions')).toHaveCount(1);
});

test('the usage check opens the next study day and closes a verified mission', async ({ page }) => {
  await seed(
    page,
    [
      ...GATE,
      ['2026-10-20T07:00:00.000Z', step('mission-03', 'start')],
      ['2026-10-20T07:30:00.000Z', step('mission-03', 'verified')],
      ['2026-10-20T08:00:00.000Z', step('mission-03', 'cleaned')],
    ],
    { [KV_KEYS.plan]: plan() },
  );
  await page.goto('/#/missions/mission-03');
  const usage = page.getByRole('button', { name: 'Usage is back to baseline' });
  await expect(usage).toBeDisabled();
  await expect(page.getByText('Check usage on Wed 21 Oct or later.')).toBeVisible();
  await page.clock.setSystemTime(new Date(TOMORROW));
  await page.reload();
  await expect(usage).toBeEnabled();
  await usage.click();
  await expect(page.getByRole('alert')).toHaveText('Enter the credits you have left.');
  await page.getByLabel('Credits left ($)').fill('118.5');
  await usage.click();
  await expect(announced(page)).toHaveText('Mission 3 closed.');
  await expect(page.getByText('Closed on Wed 21 Oct.')).toBeVisible();
});

test('Mission 3 cleaned up without Verify offers Start Mission 3 again after its usage check', async ({
  page,
}) => {
  await seed(
    page,
    [
      ...GATE,
      ['2026-10-19T10:00:00.000Z', step('mission-03', 'start')],
      ['2026-10-19T11:00:00.000Z', step('mission-03', 'cleaned')],
      ['2026-10-20T08:00:00.000Z', step('mission-03', 'usage-ok')],
    ],
    { [KV_KEYS.plan]: plan() },
  );
  await page.goto('/#/missions');
  await expect(row(page, 3).locator('.row-meta')).toHaveText('Ready');
  await row(page, 3).click();
  await expect(page.getByRole('button', { name: 'Start Mission 3' })).toBeVisible();
});

test('the kept Mission 1 never shows a chip', async ({ page }) => {
  await seed(page, [...GATE, ['2026-10-20T06:00:00.000Z', step('mission-01', 'start')]], {
    [KV_KEYS.plan]: plan(),
  });
  await page.goto('/#/missions/mission-01');
  await expect(page.locator('.stage-word')).toHaveText('Started');
  await page.clock.fastForward('03:00:00');
  await expect(chip(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cleaned up' })).toHaveCount(0);
});

test.describe('accessibility and layout', () => {
  test('the list, a locked page, a live page and the Mission 0 form have no axe violations', async ({
    page,
  }) => {
    await page.goto('/#/missions');
    await expect(row(page, 8)).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
    await page.goto('/#/missions/mission-02');
    await expect(page.getByText('Locked until Mission 0 is verified.')).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
    await page.goto('/#/missions/mission-00');
    await page.getByRole('button', { name: 'Start Mission 0' }).click();
    await expect(page.getByRole('button', { name: 'Save plan status' })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
  });

  test('a live mission page and its chip have no axe violations', async ({ page }) => {
    await seed(page, [...GATE, ['2026-10-20T08:30:00.000Z', step('mission-03', 'start')]], {
      [KV_KEYS.plan]: plan(),
    });
    await page.goto('/#/missions/mission-03');
    await expect(chip(page)).toHaveText('M3 live 30m');
    await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
  });
});

test.describe('Next (spec 9 e2e 7)', () => {
  const nextLink = (page: Page) => page.locator('a.next[data-next]');

  test('a live mission past its 2 hours turns Next into Clean up, and Enter opens it', async ({ page }) => {
    await seed(page, [...GATE, ['2026-10-20T08:55:00.000Z', step('mission-03', 'start')]], {
      [KV_KEYS.plan]: plan(),
    });
    await expect(nextLink(page)).not.toContainText('Clean up');
    await page.clock.fastForward('02:06:00');
    await expect(nextLink(page).locator('.next-label')).toHaveText('Clean up M3');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/missions\/mission-03$/);
    await expect(page.getByRole('button', { name: 'Cleaned up' })).toBeVisible();
  });

  test('the day after cleanup Next asks for the usage check', async ({ page }) => {
    await seed(
      page,
      [
        ...GATE,
        ['2026-10-20T07:00:00.000Z', step('mission-03', 'start')],
        ['2026-10-20T08:00:00.000Z', step('mission-03', 'cleaned')],
      ],
      { [KV_KEYS.plan]: plan() },
    );
    await expect(nextLink(page)).toBeVisible();
    await expect(nextLink(page)).not.toContainText('Check usage');
    await page.clock.setSystemTime(new Date(TOMORROW));
    await page.reload();
    await expect(nextLink(page).locator('.next-label')).toHaveText('Check usage for M3');
  });

  test('the kept Mission 1 never turns Next into Clean up', async ({ page }) => {
    await seed(page, [...GATE, ['2026-10-20T06:00:00.000Z', step('mission-01', 'start')]], {
      [KV_KEYS.plan]: plan(),
    });
    await page.clock.fastForward('04:00:00');
    await expect(nextLink(page)).toBeVisible();
    await expect(nextLink(page)).not.toContainText('Clean up');
  });
});
