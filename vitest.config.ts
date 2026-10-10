import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { workersNow } from './scripts/lib/workers.ts';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  test: {
    include: [
      'tests/unit/**/*.test.ts',
      'tests/content/**/*.test.ts',
      'tests/property/**/*.test.ts',
      'tests/regressions/**/*.test.ts',
    ],
    environment: 'node',
    // Parallel worktree builds share this machine and slow CPU-bound tests five to ten times, so a test that
    // takes half a second alone can pass Vitest's 5 s default; 30 s (60 s for hooks) still fails a real hang.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // VITEST_MAX_WORKERS still overrides this.
    maxWorkers: workersNow(),
  },
});
