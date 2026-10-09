import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onTestFinished } from 'vitest';
import { allowFile, fingerprintModule } from '../../scripts/content/lib/fingerprint-files.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** Fixed date for every fixture-based test, so freshness checks never drift. */
export const FIXTURE_TODAY = '2026-10-10';

/** Copies the fixture tree to a fresh temp dir, writes fingerprints for its made-up source, and deletes the dir after the test. */
export function makeFixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'ccp-fixture-'));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(here, 'content-root'), root, { recursive: true });
  const source = readFileSync(join(here, 'source', 'module-01.md'), 'utf8');
  const out = join(root, 'content', 'fingerprints');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'm01.json'), JSON.stringify(fingerprintModule(1, source)));
  writeFileSync(join(out, 'allow.txt'), allowFile([source], ''));
  return root;
}
