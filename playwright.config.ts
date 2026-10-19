import { availableParallelism } from 'node:os';
import { defineConfig, devices } from '@playwright/test';
import { workersNow } from './scripts/lib/workers.ts';

/**
 * The tests' own port, so a `pnpm preview` left running on 4173 never blocks `pnpm verify` or `pnpm site:deploy`.
 * E2E_PORT moves it, so two worktrees on one machine can run end-to-end tests at the same time.
 */
const PORT = Number(process.env.E2E_PORT ?? 4317);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error(`E2E_PORT must be a whole number from 1024 to 65535, not '${process.env.E2E_PORT}'`);
}
const BASE_URL = `http://localhost:${PORT}`;

/** End-to-end and accessibility tests against the production build, which `vite preview` serves with the site's CSP. */
export default defineConfig({
  testDir: 'tests',
  // Browser-only regression tests sit beside the Vitest ones as `.spec.ts` (tests/regressions/README.md).
  testMatch: ['e2e/**/*.spec.ts', 'regressions/**/*.spec.ts'],
  // One baseline per project, beside the tests: tests/e2e/__screenshots__/<project>/<name>.png (spec 9).
  snapshotPathTemplate: '{testDir}/e2e/__screenshots__/{projectName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixels: 100 },
  },
  forbidOnly: true,
  // Half the cores at most, as Playwright's default, and fewer while other builds load the machine.
  workers: workersNow(Math.max(1, Math.floor(availableParallelism() / 2))),
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // The production build registers a cache-first service worker; only tests/e2e/offline.spec.ts allows it.
    serviceWorkers: 'block',
  },
  webServer: {
    command: `pnpm exec vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } },
    },
  ],
});
