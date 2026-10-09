import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';

const HOME_TITLE = 'AWS Cloud Practitioner Essentials';
const SUPPORT_PLANS = '/#/m/11/l/aws-support-plans';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Console errors and uncaught page errors of the running test; a CSP violation shows up here as a console error. */
let problems: string[] = [];

test.beforeEach(({ page }) => {
  problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    problems.push(`page error: ${error.message}`);
  });
});

test.afterEach(() => {
  expect(problems, 'console errors and page errors during the test').toEqual([]);
});

const h1 = (page: Page, name: string): Locator => page.getByRole('heading', { level: 1, name, exact: true });

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations = results.violations.map(
    (v) => `${v.id} (${v.nodes.length} nodes): ${v.help}; first: ${v.nodes[0]?.html ?? ''}`,
  );
  expect(violations).toEqual([]);
}

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'pixels of horizontal overflow').toBe(0);
}

test('Home lists the 13 modules', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await expect(page.locator('main a[href^="#/m/"]')).toHaveCount(13);
  await expect(page.locator('main a[href="#/m/05"]')).toContainText('Networking');
});

test('a lesson shows its exam guide updates and a glossary popover that Escape closes', async ({ page }) => {
  await page.goto(SUPPORT_PLANS);
  await expect(h1(page, 'AWS Support Plans')).toBeVisible();
  const update = page.locator('li.update').first();
  await expect(update).toContainText('Exam guide update');
  await expect(update).toContainText('verified');

  const term = page.locator('button.term').first();
  const label = (await term.innerText()).trim();
  expect(label).not.toBe('');
  await term.click();
  const popover = page.getByRole('dialog', { name: label });
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('Defined in');
  await expect(popover).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(term).toBeFocused();
  await expect(page).toHaveURL(/#\/m\/11\/l\/aws-support-plans$/);
});

test('the palette finds a lesson and Enter opens it', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.keyboard.press('/');
  const search = page.getByRole('combobox');
  await expect(search).toBeVisible();
  await search.fill('aws lambda');
  await expect(page.getByRole('option', { selected: true })).toContainText('AWS Lambda');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/m\/03\/l\/aws-lambda$/);
  await expect(h1(page, 'AWS Lambda')).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
});

test('] and [ move to the next lesson and back', async ({ page }) => {
  await page.goto(SUPPORT_PLANS);
  await expect(h1(page, 'AWS Support Plans')).toBeVisible();
  await page.keyboard.press(']');
  await expect(page).toHaveURL(/#\/m\/11\/l\/aws-marketplace-and-aws-partners$/);
  await expect(h1(page, 'AWS Marketplace and AWS Partners')).toBeVisible();
  await page.keyboard.press('[');
  await expect(page).toHaveURL(/#\/m\/11\/l\/aws-support-plans$/);
  await expect(h1(page, 'AWS Support Plans')).toBeVisible();
});

test('the missions list shows Missions 0 and 1', async ({ page }) => {
  await page.goto('/#/missions');
  const rows = page.locator('main a[href^="#/missions/"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Guardrails before anything else');
  await expect(rows.nth(1)).toContainText('Host this site on S3 and CloudFront');
});

test('a mission page shows its facts and its sources', async ({ page }) => {
  await page.goto('/#/missions/mission-00');
  await expect(h1(page, 'Guardrails before anything else')).toBeVisible();
  const facts = page.locator('dl.facts');
  await expect(facts).toContainText('AWS Budgets');
  await expect(facts).toContainText('$0');
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
  await expect(page.locator('main a[href="https://aws.amazon.com/free/"]').first()).toBeVisible();
});

const SCREENS: { name: string; path: string; ready: (page: Page) => Locator }[] = [
  { name: 'Home', path: '/', ready: (page) => h1(page, HOME_TITLE) },
  {
    name: 'Module 5',
    path: '/#/m/05',
    ready: (page) => page.getByRole('heading', { level: 2, name: 'Key takeaways' }),
  },
  {
    name: 'the Support plans lesson',
    path: SUPPORT_PLANS,
    ready: (page) => page.locator('li.update').first(),
  },
  {
    name: 'Missions',
    path: '/#/missions',
    ready: (page) => page.locator('main a[href="#/missions/mission-01"]'),
  },
  { name: 'Mission 0', path: '/#/missions/mission-00', ready: (page) => page.locator('dl.facts') },
];

test.describe('accessibility and layout', () => {
  for (const view of SCREENS) {
    test(`${view.name} has no axe violations and no sideways scroll`, async ({ page }) => {
      await page.goto(view.path);
      await expect(view.ready(page)).toBeVisible();
      await expectNoAxeViolations(page);
      await expectNoSidewaysScroll(page);
    });
  }

  test('the open palette has no axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(h1(page, HOME_TITLE)).toBeVisible();
    await page.keyboard.press('/');
    await page.getByRole('combobox').fill('aws lambda');
    await expect(page.getByRole('option').first()).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('the open help sheet has no axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(h1(page, HOME_TITLE)).toBeVisible();
    await page.keyboard.press('?');
    await expect(page.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
