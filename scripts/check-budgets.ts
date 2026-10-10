/**
 * Fails the build when the initial JavaScript, a module's content chunk or the service worker exceeds its gzip
 * budget (spec 1.1), or when the worker does not precache the page and every module chunk (spec 1.4).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { SW_PLACEHOLDER } from './lib/sw-manifest.ts';

const KB = 1024;
const INITIAL_JS_BUDGET = 50 * KB;
const CHUNK_BUDGET = 120 * KB;
const SW_BUDGET = 4 * KB;
const MODULE_CHUNK = /^m\d{2}\.[0-9a-f]{8}\.json$/;

const dist = resolve(import.meta.dirname, '..', 'dist');
const gzipped = (file: string): number => gzipSync(readFileSync(join(dist, file)), { level: 9 }).length;
const kb = (bytes: number): string => `${(bytes / KB).toFixed(1)} KB`;
const breaches: string[] = [];

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const scripts = [
  ...new Set([...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map((m) => m[1] ?? '')),
];
const initialJs = scripts.reduce((total, file) => total + gzipped(file), 0);
if (scripts.length === 0) breaches.push('dist/index.html references no script under assets/');
if (initialJs > INITIAL_JS_BUDGET) {
  breaches.push(`initial JS is ${kb(initialJs)} gzipped, over ${kb(INITIAL_JS_BUDGET)}`);
}

const chunks = readdirSync(join(dist, 'content'))
  .filter((name) => MODULE_CHUNK.test(name))
  .sort();
if (chunks.length !== 13) breaches.push(`dist/content holds ${chunks.length} module chunks, not 13`);
let largest = { name: '-', size: 0 };
for (const name of chunks) {
  const size = gzipped(join('content', name));
  if (size > largest.size) largest = { name, size };
  if (size > CHUNK_BUDGET) breaches.push(`content/${name} is ${kb(size)} gzipped, over ${kb(CHUNK_BUDGET)}`);
}

let worker = 0;
if (existsSync(join(dist, 'sw.js'))) {
  const code = readFileSync(join(dist, 'sw.js'), 'utf8');
  worker = gzipped('sw.js');
  if (code.includes(SW_PLACEHOLDER)) breaches.push('dist/sw.js still holds the manifest placeholder');
  for (const file of ['index.html', ...chunks.map((name) => `content/${name}`)]) {
    if (!code.includes(`"/${file}"`)) breaches.push(`dist/sw.js does not precache /${file}`);
  }
  if (worker > SW_BUDGET) breaches.push(`sw.js is ${kb(worker)} gzipped, over ${kb(SW_BUDGET)}`);
} else {
  breaches.push('dist/sw.js is missing');
}

console.log(
  `budgets: initial JS ${kb(initialJs)} of ${kb(INITIAL_JS_BUDGET)} in ${scripts.length} script(s); ` +
    `largest module chunk ${largest.name} ${kb(largest.size)} of ${kb(CHUNK_BUDGET)} across ${chunks.length} chunks; ` +
    `sw.js ${kb(worker)} of ${kb(SW_BUDGET)}`,
);
for (const breach of breaches) console.error(`budget breach: ${breach}`);
process.exit(breaches.length > 0 ? 1 : 0);
