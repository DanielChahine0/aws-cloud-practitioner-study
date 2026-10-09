/** The IndexedDB database `ccp-study` (spec 8.1): `events`, `kv` and the derived `cache`. */
import { SCHEMA_VERSION } from '../../schemas/events.ts';

export const DB_NAME = 'ccp-study';

export function openDb(name = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(name, SCHEMA_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      for (const store of ['events', 'kv', 'cache']) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: store === 'events' ? 'id' : 'key' });
        }
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error('IndexedDB did not open'));
    open.onblocked = () => reject(new Error('IndexedDB is blocked by another tab'));
  });
}

export function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'));
  });
}

export function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}
