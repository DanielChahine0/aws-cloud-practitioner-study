import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * Fails every test of the calling file on a console error or an uncaught page error; a CSP violation shows up
 * as a console error. Call it once at the top level of a spec file.
 */
export function failOnPageProblems(): void {
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
}

export const h1 = (page: Page, name: string): Locator =>
  page.getByRole('heading', { level: 1, name, exact: true });

export async function expectNoAxeViolations(page: Page): Promise<void> {
  // Scan the settled page: mid fade-in, a dialog's text is still partly transparent and fails color-contrast.
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations = results.violations.map(
    (v) => `${v.id} (${v.nodes.length} nodes): ${v.help}; first: ${v.nodes[0]?.html ?? ''}`,
  );
  expect(violations).toEqual([]);
}

export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'pixels of horizontal overflow').toBe(0);
}
