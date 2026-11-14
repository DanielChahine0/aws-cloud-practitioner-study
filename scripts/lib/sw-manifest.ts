import { createHash } from 'node:crypto';

/** The string `src/sw.ts` holds where the build writes the precache manifest. */
export const SW_PLACEHOLDER = '__SW_MANIFEST__';

/** What the service worker precaches, and the version that names its cache. */
export interface SwManifest {
  version: string;
  files: string[];
}

/** Build files the worker never caches: itself, the deploy log and source maps. */
const SKIPPED = new Set(['sw.js', 'deploys.json']);
/** The placeholder as a string literal in any quote style; the minifier writes it as a template literal. */
const PLACEHOLDER = new RegExp(`(['"\`])${SW_PLACEHOLDER}\\1`, 'g');

/**
 * The precache manifest of a build (spec 1.4): `./` first, then every build path relative to `sw.js`, sorted, so the
 * worker precaches the right files under any sub-path;
 * the version changes whenever a file name or `index.html` changes, so each deploy gets a new cache.
 */
export function swManifest(files: readonly string[], indexHtml: string): SwManifest {
  const kept = files.filter((file) => !SKIPPED.has(file) && !file.endsWith('.map')).sort();
  const list = ['./', ...kept];
  const hash = createHash('sha256')
    .update(`${list.join('\n')}\n${indexHtml}`, 'utf8')
    .digest('hex');
  return { version: `sw-${hash.slice(0, 12)}`, files: list };
}

/** Writes the manifest over the one quoted placeholder in the built worker, in single, double or back quotes. */
export function injectManifest(code: string, manifest: SwManifest): string {
  const count = code.match(PLACEHOLDER)?.length ?? 0;
  if (count === 0) throw new Error('sw.js has no manifest placeholder');
  if (count > 1) throw new Error('sw.js has more than one manifest placeholder');
  const json = JSON.stringify(manifest);
  return code.replace(PLACEHOLDER, () => json);
}
