import { SCHEMA_VERSION } from '../../../schemas/version.ts';
import type { KvRecords } from '../kv.ts';

/**
 * Schema migrations (spec 8.2): one pure step per storage version, run when the app opens and on every import.
 * `MIGRATIONS[i]` turns schema `i + 1` into schema `i + 2`; `tests/fixtures/backups/vN.json` keeps every past schema.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: readonly Migration[] = [];

/** Runs the steps from `data.schemaVersion` up to `target`; tests inject made-up steps and targets. */
export function migrate(
  data: Record<string, unknown>,
  steps: readonly Migration[] = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): Record<string, unknown> {
  const from = data.schemaVersion;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) {
    throw new Error('This backup has no valid schema version');
  }
  if (from > target) {
    throw new Error(`This backup is from a newer version of the app (schema ${from}); update the app first`);
  }
  let out = data;
  for (let version = from; version < target; version++) {
    const step = steps[version - 1];
    if (!step) throw new Error(`No migration from schema ${version}`);
    out = step(out);
  }
  return { ...out, schemaVersion: target };
}

/** The browser's stored log and kv records, as the app reads them before replay. */
export interface LocalData {
  events: unknown[];
  kv: KvRecords;
}

/**
 * Migrates the browser's own data when the app opens (spec 8.2); `stored` is kv `schemaVersion`, and a log
 * written before the app stamped it (null) is schema 1. The caller keeps the pre-migration copy.
 */
export function migrateLocal(
  stored: number | null,
  data: LocalData,
  steps: readonly Migration[] = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): { from: number; data: LocalData; migrated: boolean } {
  const from = stored ?? 1;
  if (from === target) return { from, data, migrated: false };
  const out = migrate({ schemaVersion: from, events: data.events, kv: data.kv }, steps, target);
  return { from, data: { events: out.events as unknown[], kv: out.kv as KvRecords }, migrated: true };
}
