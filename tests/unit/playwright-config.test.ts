import { afterEach, describe, expect, it, vi } from 'vitest';

/** The Playwright config as it loads under the given E2E_PORT (undefined leaves it unset). */
async function configWith(port: string | undefined) {
  vi.resetModules();
  vi.stubEnv('E2E_PORT', port);
  const { default: config } = await import('../../playwright.config.ts');
  const server = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
  return { baseURL: config.use?.baseURL, command: server?.command, url: server?.url };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the end-to-end port', () => {
  it('stays on 4317 when E2E_PORT is unset', async () => {
    expect(await configWith(undefined)).toEqual({
      baseURL: 'http://localhost:4317',
      command: 'pnpm exec vite preview --port 4317 --strictPort',
      url: 'http://localhost:4317',
    });
  });

  it('moves the preview server and the base URL to E2E_PORT', async () => {
    expect(await configWith('4327')).toEqual({
      baseURL: 'http://localhost:4327',
      command: 'pnpm exec vite preview --port 4327 --strictPort',
      url: 'http://localhost:4327',
    });
  });

  it.each(['', 'abc', '80', '4327.5', '70000'])('refuses E2E_PORT %j', async (port) => {
    await expect(configWith(port)).rejects.toThrow(
      `E2E_PORT must be a whole number from 1024 to 65535, not '${port}'`,
    );
  });
});
