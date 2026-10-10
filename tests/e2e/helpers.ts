import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';
import type { StudyEvent } from '../../schemas/events.ts';
import { SCHEMA_VERSION } from '../../schemas/version.ts';
import { DB_NAME, STORES } from '../../src/store/idb.ts';

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

/**
 * Scans the settled page with axe. With `redact`, each finding names only the rule, its help text and the node
 * targets, never node HTML, so an exam item's text can never reach test output.
 */
export async function expectNoAxeViolations(page: Page, options: { redact?: boolean } = {}): Promise<void> {
  // Scan the settled page: mid fade-in, a dialog's text is still partly transparent and fails color-contrast.
  await page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished)));
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations = results.violations.map((v) =>
    options.redact === true
      ? `${v.id} (${v.nodes.length} nodes): ${v.help}; targets: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
      : `${v.id} (${v.nodes.length} nodes): ${v.help}; first: ${v.nodes[0]?.html ?? ''}`,
  );
  expect(violations).toEqual([]);
}

export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'pixels of horizontal overflow').toBe(0);
}

/**
 * Writes events into the page's IndexedDB log the way the app stores them, then reloads so the app replays them.
 * Call it after the first `page.goto`, so the database belongs to the site's origin.
 */
export async function seedEvents(page: Page, events: readonly StudyEvent[]): Promise<void> {
  await page.evaluate(
    async ({ name, version, stores, list }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name, version);
        open.onupgradeneeded = () => {
          if (!open.result.objectStoreNames.contains(stores.events)) {
            open.result.createObjectStore(stores.events, { keyPath: 'id' });
          }
          if (!open.result.objectStoreNames.contains(stores.kv)) {
            open.result.createObjectStore(stores.kv, { keyPath: 'key' });
          }
          if (!open.result.objectStoreNames.contains(stores.cache)) {
            open.result.createObjectStore(stores.cache, { keyPath: 'key' });
          }
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(stores.events, 'readwrite');
        for (const e of list) tx.objectStore(stores.events).put(e);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    },
    { name: DB_NAME, version: SCHEMA_VERSION, stores: STORES, list: [...events] },
  );
  await page.reload();
}

/**
 * Writes kv records into the page's IndexedDB the way `writeKv` stores them; they take effect at the next reload.
 * Call it once the app has opened its database, for example after Home's h1 shows.
 */
export async function seedKv(page: Page, records: Readonly<Record<string, unknown>>): Promise<void> {
  await page.evaluate(
    async ({ name, version, store, list }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name, version);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        for (const [key, value] of list)
          tx.objectStore(store).put({ key, value, updatedAt: new Date().toISOString() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    },
    { name: DB_NAME, version: SCHEMA_VERSION, store: STORES.kv, list: Object.entries(records) },
  );
}
