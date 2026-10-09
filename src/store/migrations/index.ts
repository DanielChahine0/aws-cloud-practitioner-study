import { SCHEMA_VERSION } from '../../../schemas/version.ts';

/**
 * Schema migrations (spec 8.2): one pure step per storage version, run when the app opens and on every import.
 * `MIGRATIONS[i]` turns schema `i + 1` into schema `i + 2`; `tests/fixtures/backups/vN.json` keeps every past schema.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: readonly Migration[] = [];

export function migrate(data: Record<string, unknown>): Record<string, unknown> {
  const from = data.schemaVersion;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) {
    throw new Error('This backup has no valid schema version');
  }
  if (from > SCHEMA_VERSION) {
    throw new Error(`This backup is from a newer version of the app (schema ${from}); update the app first`);
  }
  let out = data;
  for (let version = from; version < SCHEMA_VERSION; version++) {
    const step = MIGRATIONS[version - 1];
    if (!step) throw new Error(`No migration from schema ${version}`);
    out = step(out);
  }
  return { ...out, schemaVersion: SCHEMA_VERSION };
}
