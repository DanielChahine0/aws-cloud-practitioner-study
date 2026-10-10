import type { StudyEvent } from '../../../schemas/events.ts';
import { SCHEMA_VERSION } from '../../../schemas/version.ts';
import { KV_KEYS, type KvRecords, setKv } from '../kv.ts';
import { replaceStores } from '../replace.ts';
import { MIGRATIONS, type Migration, migrateLocal } from './index.ts';

/**
 * Brings a stored log and kv up to `target` (spec 8.2): a migration first keeps the old data under kv
 * `preMigration` and rewrites both stores, with the new kv `schemaVersion`, in one transaction; without a
 * migration, kv `schemaVersion` is stamped whenever it differs.
 * Tests inject made-up steps and targets.
 */
export async function migrateStored(
  store: IDBDatabase,
  loaded: StudyEvent[],
  kv: KvRecords,
  now: Date = new Date(),
  steps: readonly Migration[] = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): Promise<{ events: StudyEvent[]; kv: KvRecords }> {
  const stored = kv[KV_KEYS.schemaVersion]?.value;
  const result = migrateLocal(
    typeof stored === 'number' ? stored : null,
    { events: loaded, kv },
    steps,
    target,
  );
  if (result.migrated) {
    // Migration steps return events in the current schema, which the app writes itself, as record() does.
    const migrated = result.data.events as StudyEvent[];
    // The new version goes in the same transaction as the data: stamped later, a tab closed in between would
    // migrate the migrated log again on the next open and overwrite preMigration with it.
    const nextKv: KvRecords = {
      ...result.data.kv,
      [KV_KEYS.schemaVersion]: { value: target, updatedAt: now.toISOString() },
      [KV_KEYS.preMigration]: {
        value: { schemaVersion: result.from, events: loaded, kv },
        updatedAt: now.toISOString(),
      },
    };
    await replaceStores(store, migrated, nextKv);
    return { events: migrated, kv: nextKv };
  }
  if (kv[KV_KEYS.schemaVersion]?.value === target) return { events: loaded, kv };
  // Nothing to migrate, as for a log written before the app stamped its version: only the stamp is written.
  const stamp = await setKv(store, KV_KEYS.schemaVersion, target, now);
  return {
    events: loaded,
    kv: { ...kv, [KV_KEYS.schemaVersion]: { value: stamp.value, updatedAt: stamp.updatedAt } },
  };
}
