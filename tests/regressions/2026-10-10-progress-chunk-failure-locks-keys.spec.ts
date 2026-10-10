import { expect, test } from '@playwright/test';
import { LAZY_ERROR } from '../../src/app/screens/Lazy.tsx';

// No failOnPageProblems here: the aborted chunk request logs a network error by design.

const PROGRESS_CHUNK = '**/assets/Progress-*.js';

test('a Progress chunk that cannot load shows a closable sheet, and the keys and the button work again', async ({
  page,
}) => {
  await page.route(PROGRESS_CHUNK, (route) => route.abort());
  await page.goto('/');
  const rankButton = page.locator('button.topbar-rank');
  await rankButton.click();

  // The failure shows in a modal sheet on screen, not as a line below the page.
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByText(LAZY_ERROR, { exact: true })).toBeVisible();

  // Escape closes it and clears the overlay, which removes the dialog, and the single-key shortcuts answer again.
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog')).toHaveCount(0);

  // Once the connection is back, the same button retries the load.
  await page.unroute(PROGRESS_CHUNK);
  await rankButton.click();
  await expect(page.getByRole('dialog', { name: 'Progress' })).toBeVisible();
});
