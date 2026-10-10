import { defineConfig, devices } from '@playwright/test';

/** The tests' own port, so a `pnpm preview` left running on 4173 never blocks `pnpm verify` or `pnpm site:deploy`. */
const BASE_URL = 'http://localhost:4317';

/** End-to-end and accessibility tests against the production build, which `vite preview` serves with the site's CSP. */
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // The production build registers a cache-first service worker; only tests/e2e/offline.spec.ts allows it.
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'pnpm exec vite preview --port 4317 --strictPort',
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
