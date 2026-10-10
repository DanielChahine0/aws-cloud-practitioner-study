import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

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
  },
});
