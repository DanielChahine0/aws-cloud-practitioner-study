import type { KvRecord, KvValue } from '../../schemas/backup.ts';
import { done, request, STORES } from './idb.ts';

/**
 * Keyed records with `updatedAt` (spec 8.1), merged per key by the newer `updatedAt` on import.
 * `examAsk` is `'dismissed'` after Not now (spec 7.5); `engineVersion` is the `ENGINE_VERSION` whose
 * `Rules updated, progress recalculated.` line was dismissed (spec 8.2); `currentLesson` is the note id of the
 * lesson last opened, because reading writes no event (spec 4.6); `schemaVersion` is the storage version of the
 * local log, and `preMigration` holds `{ events, kv }` as they were before the last local migration (spec 8.2).
 */
export const KV_KEYS = {
  lastExportAt: 'lastExportAt',
  examAsk: 'examAsk',
  engineVersion: 'engineVersion',
  currentLesson: 'currentLesson',
  schemaVersion: 'schemaVersion',
  preMigration: 'preMigration',
} as const;

export type KvRecords = Record<string, KvValue>;

export async function getKv(db: IDBDatabase, key: string): Promise<KvRecord | undefined> {
  const tx = db.transaction(STORES.kv, 'readonly');
  return (await request(tx.objectStore(STORES.kv).get(key))) as KvRecord | undefined;
}

export async function setKv(db: IDBDatabase, key: string, value: unknown, now: Date): Promise<KvRecord> {
  const record: KvRecord = { key, value, updatedAt: now.toISOString() };
  const tx = db.transaction(STORES.kv, 'readwrite');
  tx.objectStore(STORES.kv).put(record);
  await done(tx);
  return record;
}

export async function allKv(db: IDBDatabase): Promise<KvRecords> {
  const tx = db.transaction(STORES.kv, 'readonly');
  const records = (await request(tx.objectStore(STORES.kv).getAll())) as KvRecord[];
  const out: KvRecords = {};
  for (const { key, value, updatedAt } of records) out[key] = { value, updatedAt };
  return out;
}

export async function putKv(db: IDBDatabase, records: KvRecords): Promise<void> {
  const tx = db.transaction(STORES.kv, 'readwrite');
  const store = tx.objectStore(STORES.kv);
  for (const [key, { value, updatedAt }] of Object.entries(records)) store.put({ key, value, updatedAt });
  await done(tx);
}

export async function clearKv(db: IDBDatabase): Promise<void> {
  const tx = db.transaction(STORES.kv, 'readwrite');
  tx.objectStore(STORES.kv).clear();
  await done(tx);
}
