import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '../../schemas/events.ts';
import { allEvents } from '../../src/store/events.ts';
import { allKv, KV_KEYS, type KvRecords } from '../../src/store/kv.ts';
import type { Migration } from '../../src/store/migrations/index.ts';
import { migrateStored } from '../../src/store/migrations/stored.ts';

/**
 * An in-memory database whose write transactions apply their queued writes only on commit.
 * `tab.closeAfter` is the number of write transactions that reach disk before the tab closes: every later one
 * aborts, until a reload sets it back to Infinity on the same data.
 */
function memoryDb(): { db: IDBDatabase; tab: { closeAfter: number } } {
  const tab = { closeAfter: Number.POSITIVE_INFINITY };
  const data: Record<string, Map<string, unknown>> = { events: new Map(), kv: new Map() };
  const keyPath: Record<string, string> = { events: 'id', kv: 'key' };
  let writes = 0;
  const db = {
    transaction(_stores: unknown, mode: string) {
      const queued: (() => void)[] = [];
      const tx = {
        oncomplete: null as (() => void) | null,
        onerror: null,
        onabort: null as (() => void) | null,
        error: null,
        objectStore: (name: string) => {
          const store = data[name] as Map<string, unknown>;
          const key = keyPath[name] as string;
          const write = (r: Record<string, unknown>) =>
            queued.push(() => store.set(r[key] as string, structuredClone(r)));
          return {
            put: write,
            add: write,
            clear: () => queued.push(() => store.clear()),
            getAll() {
              const req = {
                result: [...store.values()].map((v) => structuredClone(v)),
                onsuccess: null as (() => void) | null,
              };
              queueMicrotask(() => req.onsuccess?.());
              return req;
            },
          };
        },
        commit() {
          if (mode === 'readwrite' && ++writes > tab.closeAfter) {
            queueMicrotask(() => tx.onabort?.());
            return;
          }
          for (const run of queued) run();
          queueMicrotask(() => tx.oncomplete?.());
        },
      };
      return tx;
    },
  } as unknown as IDBDatabase;
  return { db, tab };
}

/** A made-up step from schema 1 to 2 that renames every answer's `ms` to `millis`. */
const renameMs: Migration = (data) => ({
  ...data,
  events: (data.events as Record<string, unknown>[]).map(({ ms, ...rest }) =>
    ms === undefined ? rest : { ...rest, millis: ms },
  ),
});

const EVENT = { id: '01J9Z8Y7X6W5V4T3S2R1Q0P9N8', t: 'answer', ms: 4200 } as unknown as StudyEvent;
const KV: KvRecords = {
  [KV_KEYS.schemaVersion]: { value: 1, updatedAt: '2026-10-01T08:00:00.000Z' },
};
const NOW = new Date('2026-10-09T09:00:00.000Z');

/** Stores a schema 1 log: one answer and kv `schemaVersion` 1. */
function seed(db: IDBDatabase): void {
  const tx = db.transaction(['events', 'kv'], 'readwrite');
  tx.objectStore('events').put(EVENT);
  tx.objectStore('kv').put({ key: KV_KEYS.schemaVersion, ...KV[KV_KEYS.schemaVersion] });
  tx.commit();
}

/** Opens the app once: reads both stores, then migrates them to schema 2. */
async function open(db: IDBDatabase) {
  const [loaded, kv] = await Promise.all([allEvents(db), allKv(db)]);
  return migrateStored(db, loaded, kv, NOW, [renameMs], 2);
}

describe('migrateStored', () => {
  it('migrates, keeps the old data under preMigration and stamps the new version', async () => {
    const { db } = memoryDb();
    seed(db);
    const out = await open(db);
    expect(out.events).toEqual([{ id: EVENT.id, t: 'answer', millis: 4200 }]);
    const kv = await allKv(db);
    expect(kv[KV_KEYS.schemaVersion]?.value).toBe(2);
    expect(kv[KV_KEYS.preMigration]?.value).toEqual({ schemaVersion: 1, events: [EVENT], kv: KV });
    expect(out.kv).toEqual(kv);
  });

  it('commits the migrated data and the new version together, so a tab closed mid-way keeps the true old copy', async () => {
    const { db, tab } = memoryDb();
    seed(db);
    // The tab closes after the migration's first write: anything not in that one transaction is lost.
    tab.closeAfter = 2;
    await open(db).catch(() => undefined);
    const kv = await allKv(db);
    const events = await allEvents(db);
    const migrated = events.some((e) => 'millis' in e);
    expect(kv[KV_KEYS.schemaVersion]?.value).toBe(migrated ? 2 : 1);

    // The next open must not migrate again and overwrite preMigration with already-migrated events.
    tab.closeAfter = Number.POSITIVE_INFINITY;
    await open(db);
    const after = await allKv(db);
    expect(after[KV_KEYS.preMigration]?.value).toEqual({ schemaVersion: 1, events: [EVENT], kv: KV });
    expect(after[KV_KEYS.schemaVersion]?.value).toBe(2);
  });

  it('only stamps the version when nothing needs migrating', async () => {
    const { db } = memoryDb();
    const out = await migrateStored(db, [EVENT], {}, NOW, [renameMs], 1);
    expect(out.events).toEqual([EVENT]);
    expect(await allKv(db)).toEqual({
      [KV_KEYS.schemaVersion]: { value: 1, updatedAt: NOW.toISOString() },
    });
  });
});
