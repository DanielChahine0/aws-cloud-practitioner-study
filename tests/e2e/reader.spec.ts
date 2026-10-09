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
  // Scan the settled page: mid fade-in, a dialog's text is still partly transparent and fails color-contrast.
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations = results.violations.map(
    (v) => `${v.id} (${v.nodes.length} nodes): ${v.help}; first: ${v.nodes[0]?.html ?? ''}`,
  );
  expect(violations).toEqual([]);
}

/** Opens the lesson and waits until its note and its term buttons answer. */
async function openSupportPlans(page: Page): Promise<Locator> {
  await page.goto(SUPPORT_PLANS);
  await expect(h1(page, 'AWS Support Plans')).toBeVisible();
  await expect(page.locator('li.update').first()).toBeVisible();
  return page.locator('button.term').first();
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
  await expect(term).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(term).toHaveAttribute('aria-expanded', 'false');
  await term.click();
  const popover = page.getByRole('dialog', { name: label });
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('Defined in');
  await expect(popover).toBeFocused();
  await expect(term).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(term).toBeFocused();
  await expect(term).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveURL(/#\/m\/11\/l\/aws-support-plans$/);
});

test('clicking the open term again closes its popover', async ({ page }) => {
  const term = await openSupportPlans(page);
  await term.click();
  await expect(page.locator('.popover')).toHaveCount(1);
  await term.click();
  await expect(page.locator('.popover')).toHaveCount(0);
  await expect(term).toHaveAttribute('aria-expanded', 'false');
});

test('Tab from a popover goes on through the note after its term, not to the end of the page', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'WebKit tabs to links only when full keyboard access is on');
  const term = await openSupportPlans(page);
  await term.focus();
  await page.keyboard.press('Enter');
  const popover = page.locator('.popover');
  await expect(popover).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(popover.getByRole('link')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(popover).toHaveCount(0);
  const next = await page.evaluate(() => {
    const active = document.activeElement;
    const term = document.querySelector('button.term');
    return {
      inNote: active?.closest('.prose') !== null,
      afterTerm:
        active !== null &&
        term !== null &&
        (term.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    };
  });
  expect(next).toEqual({ inNote: true, afterTerm: true });
});

test('a popover link to the lesson already shown closes the popover', async ({ page }) => {
  const term = await openSupportPlans(page);
  await term.click();
  const popover = page.locator('.popover');
  await popover.locator('a[href="#/m/11/l/aws-support-plans"]').click();
  await expect(popover).toHaveCount(0);
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

test('the palette closes when the chosen result is the page already shown', async ({ page }) => {
  await openSupportPlans(page);
  await page.keyboard.press('/');
  await page.getByRole('combobox').fill('aws support plans');
  await expect(page.getByRole('option', { selected: true })).toContainText('AWS Support Plans');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/m\/11\/l\/aws-support-plans$/);
  await expect(page.locator('#main')).toBeFocused();
});

test('Escape closes the palette at once, even with a query typed', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.keyboard.press('/');
  await page.getByRole('combobox').fill('lambda');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('combobox')).toHaveCount(0);
});

test('the palette keeps its last result on screen', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.keyboard.press('/');
  const options = page.getByRole('option');
  await expect(options).toHaveCount(13);
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('ArrowDown');
  await expect(options.last()).toHaveAttribute('aria-selected', 'true');
  // Fully on screen, after the dialog scrolls the selected row into view.
  await expect(options.last()).toBeInViewport({ ratio: 1 });
  await expect(page.locator('dialog.palette')).toBeInViewport({ ratio: 1 });
});

test('g then Shift+H goes Home', async ({ page }) => {
  await page.goto('/#/m/05');
  await expect(page.getByRole('heading', { level: 2, name: 'Key takeaways' })).toBeVisible();
  await page.keyboard.press('g');
  await page.keyboard.press('Shift+H');
  await expect(page).toHaveURL(/#\/$/);
  await expect(h1(page, HOME_TITLE)).toBeVisible();
});

test('a lesson loads without sideways scroll or a pager that jumps', async ({ page }) => {
  // Records every frame from the first, since the note's wide table arrives after the shell.
  await page.addInitScript(() => {
    const record = { wideFrames: 0, shift: 0 };
    Object.assign(window, { record });
    const tick = (): void => {
      const root = document.documentElement;
      if (root.scrollWidth > root.clientWidth) record.wideFrames += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) record.shift += (entry as unknown as { value: number }).value;
      }).observe({ type: 'layout-shift', buffered: true });
    }
  });
  await openSupportPlans(page);
  await expect(page.locator('nav.pager')).toBeVisible();
  const record = await page.evaluate(
    () => (window as unknown as { record: { wideFrames: number; shift: number } }).record,
  );
  expect(record.wideFrames, 'frames with sideways scroll').toBe(0);
  expect(record.shift, 'cumulative layout shift').toBeLessThan(0.01);
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
  { name: 'Mission 1', path: '/#/missions/mission-01', ready: (page) => page.locator('main pre').first() },
  { name: 'the not-found screen', path: '/#/nowhere', ready: (page) => h1(page, 'Page not found') },
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

  test('the open term popover has no axe violations', async ({ page }) => {
    const term = await openSupportPlans(page);
    await term.click();
    await expect(page.locator('.popover')).toBeFocused();
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
