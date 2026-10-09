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
    open.onsuccess = () => resolve(open.result);
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

export function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('The transaction was aborted'));
  });
}
