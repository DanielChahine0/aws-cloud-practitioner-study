import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content/vite-plugin.ts';
import { CSP, cspMetaPlugin } from './scripts/csp.ts';
import { swPlugin } from './scripts/sw-plugin.ts';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Relative URLs, so one build runs at a domain root (CloudFront) and under a sub-path (GitHub Pages).
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [preact(), contentPlugin(root), swPlugin(root), cspMetaPlugin()],
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    // Every module the entry imports statically ships as one chunk: lazy screens that share them (the lab, the exam,
    // the Help sheet) would otherwise split them into several small chunks, each compressed on its own (spec 2.10).
    // The service worker is an entry of its own and stays out.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'app', tags: ['$initial'], test: (id) => !id.endsWith('/src/sw.ts') }],
        },
      },
    },
  },
  preview: { headers: { 'Content-Security-Policy': CSP } },
});
