import type { KvRecord, KvValue } from '../../schemas/backup.ts';
import { commit, request, STORES } from './idb.ts';

/**
 * Keyed records with `updatedAt` (spec 8.1), merged per key by the newer `updatedAt` on import.
 * `examAsk` is `'dismissed'` after Not now (spec 7.5); `engineVersion` is the `ENGINE_VERSION` whose
 * `Rules updated, progress recalculated.` line was dismissed (spec 8.2); `currentLesson` is the note id of the
 * lesson last opened, because reading writes no event (spec 4.6); `schemaVersion` is the storage version of the
 * local log, and `preMigration` holds `{ events, kv }` as they were before the last local migration (spec 8.2).
 * `rankSeen` is the id of the rank whose promotion line was dismissed (spec 3.4); `examSession` is the draft of the
 * open boss or mock, `{ sid, picks, flagged, changes, ms, current }`, which the exam shell writes on every change
 * and turns into answer events at submit (spec 8.1).
 * `labDrafts` holds `Record<lab id, { rev, actions, hints }>` for unfinished labs.
 * `plan` is the plan status that Mission 0 or the Already done form records, `{ plan, credits, endsOn, services,
 * recordedAt }`, and `missionTicks` maps each mission id to its ticked step ids (spec 5.3, 8.1).
 * The capstone ADR drafts live under `adr-01` to `adr-13` (`adrKey`), one key per module, so an import that keeps
 * the newer `updatedAt` per key never drops a module typed on another device (spec 6, 8.3).
 */
export const KV_KEYS = {
  lastExportAt: 'lastExportAt',
  examAsk: 'examAsk',
  engineVersion: 'engineVersion',
  currentLesson: 'currentLesson',
  schemaVersion: 'schemaVersion',
  preMigration: 'preMigration',
  rankSeen: 'rankSeen',
  examSession: 'examSession',
  labDrafts: 'labDrafts',
  plan: 'plan',
  missionTicks: 'missionTicks',
} as const;

/** The prefix of the 13 ADR draft keys. */
export const ADR_KEY_PREFIX = 'adr-';

/** The kv key of one module's ADR draft: `adr-01` to `adr-13`. */
export function adrKey(module: number): string {
  return `${ADR_KEY_PREFIX}${String(module).padStart(2, '0')}`;
}

export type KvRecords = Record<string, KvValue>;

export async function getKv(db: IDBDatabase, key: string): Promise<KvRecord | undefined> {
  const tx = db.transaction(STORES.kv, 'readonly');
  return (await request(tx.objectStore(STORES.kv).get(key))) as KvRecord | undefined;
}

export async function setKv(db: IDBDatabase, key: string, value: unknown, now: Date): Promise<KvRecord> {
  const record: KvRecord = { key, value, updatedAt: now.toISOString() };
  const tx = db.transaction(STORES.kv, 'readwrite');
  tx.objectStore(STORES.kv).put(record);
  await commit(tx);
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
  await commit(tx);
}
