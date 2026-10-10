import { SCHEMA_VERSION } from '../../schemas/version.ts';

/**
 * The IndexedDB database (spec 8.1): `events` is the append-only source of truth, `kv` holds keyed records
 * with `updatedAt`, and `cache` exists from version 1 but stays unused until Phase 2.
 */
export const DB_NAME = 'ccp-study';
export const STORES = { events: 'events', kv: 'kv', cache: 'cache' } as const;

export function openDb(name: string = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(name, SCHEMA_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORES.events))
        db.createObjectStore(STORES.events, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.kv)) db.createObjectStore(STORES.kv, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(STORES.cache)) db.createObjectStore(STORES.cache, { keyPath: 'key' });
    };
    open.onsuccess = () => {
      const db = open.result;
      // Another tab's upgrade or a deletion waits on this connection; let it go instead of blocking it.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    open.onerror = () => reject(open.error);
    open.onblocked = () =>
      reject(new Error('The progress database is open in an older tab; close it and reload'));
  });
}

export function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/**
 * Commits a write transaction now and resolves once it is on disk; call it right after queuing the writes,
 * while the transaction is still active.
 * Waiting for the automatic commit is not enough: Chromium aborts a transaction that has not committed yet when
 * the page unloads, so a reload just after Save or Not now on Home would lose the write.
 */
export function commit(tx: IDBTransaction): Promise<void> {
  const stored = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('The transaction was aborted'));
  });
  tx.commit();
  return stored;
}
