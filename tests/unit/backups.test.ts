import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { derive, snapshotOf } from '../../src/engine/replay.ts';
import { parseBackup } from '../../src/store/backup.ts';

/**
 * Every past backup schema is kept forever (spec 8.2): each `vN.json` must import, migrate and replay
 * to its committed `vN.snapshot.json`. A missing snapshot is written once by this helper, then committed.
 */
const dir = fileURLToPath(new URL('../fixtures/backups/', import.meta.url));
const files = readdirSync(dir).filter((f) => /^v\d+\.json$/.test(f));

describe('backup fixtures', () => {
  it('include schema 1', () => {
    expect(files).toContain('v1.json');
  });

  for (const file of files) {
    it(`${file} parses, migrates and derives to its snapshot`, async () => {
      const result = await parseBackup(readFileSync(join(dir, file), 'utf8'));
      if (!result.ok) throw new Error(result.error);
      const snapshot = snapshotOf(derive(result.data.events, null));
      const snapshotFile = join(dir, file.replace('.json', '.snapshot.json'));
      if (!existsSync(snapshotFile)) writeFileSync(snapshotFile, `${JSON.stringify(snapshot, null, 2)}\n`);
      expect(snapshot).toEqual(JSON.parse(readFileSync(snapshotFile, 'utf8')));
    });
  }
});
