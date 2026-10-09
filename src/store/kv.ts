import { done, request } from './idb.ts';

export const KV_KEYS = { lastExportAt: 'lastExportAt' } as const;

export interface KvValue {
  value: unknown;
  updatedAt: string;
}

export async function getKv(db: IDBDatabase, key: string): Promise<KvValue | undefined> {
  const tx = db.transaction('kv', 'readonly');
  const row = (await request(tx.objectStore('kv').get(key))) as
    | { key: string; value: unknown; updatedAt: string }
    | undefined;
  return row === undefined ? undefined : { value: row.value, updatedAt: row.updatedAt };
}

export async function setKv(db: IDBDatabase, key: string, value: unknown, now: Date): Promise<void> {
  const tx = db.transaction('kv', 'readwrite');
  tx.objectStore('kv').put({ key, value, updatedAt: now.toISOString() });
  await done(tx);
}

export async function allKv(db: IDBDatabase): Promise<Record<string, KvValue>> {
  const tx = db.transaction('kv', 'readonly');
  const rows = (await request(tx.objectStore('kv').getAll())) as {
    key: string;
    value: unknown;
    updatedAt: string;
  }[];
  return Object.fromEntries(rows.map((r) => [r.key, { value: r.value, updatedAt: r.updatedAt }]));
}

export async function putKv(db: IDBDatabase, records: Readonly<Record<string, KvValue>>): Promise<void> {
  const tx = db.transaction('kv', 'readwrite');
  const store = tx.objectStore('kv');
  for (const [key, r] of Object.entries(records)) store.put({ key, value: r.value, updatedAt: r.updatedAt });
  await done(tx);
}

export async function clearKv(db: IDBDatabase): Promise<void> {
  const tx = db.transaction('kv', 'readwrite');
  tx.objectStore('kv').clear();
  await done(tx);
}
