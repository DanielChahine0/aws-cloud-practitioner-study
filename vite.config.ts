import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content/vite-plugin.ts';
import { CSP } from './scripts/csp.ts';
import { swPlugin } from './scripts/sw-plugin.ts';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [preact(), contentPlugin(root), swPlugin(root)],
  build: { target: 'es2022', assetsInlineLimit: 0 },
  preview: { headers: { 'Content-Security-Policy': CSP } },
});
