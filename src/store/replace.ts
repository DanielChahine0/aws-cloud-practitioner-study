import type { StudyEvent } from '../../schemas/events.ts';
import { done, STORES } from './idb.ts';
import type { KvRecords } from './kv.ts';

/**
 * Replaces the whole log and kv in one transaction over both stores, so a closed tab or a failed write leaves
 * either the old data or the new, never an empty store or a log without its kv (spec 8.2's `preMigration`).
 */
export async function replaceStores(
  db: IDBDatabase,
  events: readonly StudyEvent[],
  kv: KvRecords,
): Promise<void> {
  const tx = db.transaction([STORES.events, STORES.kv], 'readwrite');
  const eventStore = tx.objectStore(STORES.events);
  const kvStore = tx.objectStore(STORES.kv);
  eventStore.clear();
  kvStore.clear();
  for (const e of events) eventStore.put(e);
  for (const [key, { value, updatedAt }] of Object.entries(kv)) kvStore.put({ key, value, updatedAt });
  await done(tx);
}
