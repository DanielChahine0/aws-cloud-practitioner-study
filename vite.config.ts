import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content/vite-plugin.ts';
import { CSP } from './scripts/csp.ts';

export default defineConfig({
  plugins: [preact(), contentPlugin(fileURLToPath(new URL('.', import.meta.url)))],
  build: { target: 'es2022', assetsInlineLimit: 0 },
  preview: { headers: { 'Content-Security-Policy': CSP } },
});
