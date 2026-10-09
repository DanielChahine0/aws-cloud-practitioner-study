import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content/vite-plugin.ts';
import { CSP } from './scripts/csp.ts';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig({
  plugins: [preact(), contentPlugin(fileURLToPath(new URL('.', import.meta.url)))],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2022', assetsInlineLimit: 0 },
  preview: { headers: { 'Content-Security-Policy': CSP } },
});
