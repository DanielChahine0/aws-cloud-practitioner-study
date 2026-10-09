import { defineConfig, devices } from '@playwright/test';

/** End-to-end and accessibility tests against the production build, which `vite preview` serves with the site's CSP. */
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4173',
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
