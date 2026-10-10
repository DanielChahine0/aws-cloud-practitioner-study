import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
import { injectManifest, swManifest } from './lib/sw-manifest.ts';

/** Every file under `dir`, as paths from it with `/` separators. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'));
}

/**
 * Emits `src/sw.ts` as the unhashed `sw.js` (spec 1.4 and 2.10), then, once every file is written, writes the
 * precache manifest of the whole build into it.
 */
export function swPlugin(root: string): Plugin {
  return {
    name: 'ccp-sw',
    apply: 'build',
    buildStart() {
      this.emitFile({ type: 'chunk', id: join(root, 'src', 'sw.ts'), fileName: 'sw.js' });
    },
    writeBundle({ dir }) {
      if (dir === undefined) this.error('the build has no output directory');
      const worker = join(dir, 'sw.js');
      const manifest = swManifest(filesUnder(dir), readFileSync(join(dir, 'index.html'), 'utf8'));
      writeFileSync(worker, injectManifest(readFileSync(worker, 'utf8'), manifest));
    },
  };
}
