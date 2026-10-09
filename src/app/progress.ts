/** The progress store: the event log and kv in signals, written through to IndexedDB (spec 8.1). */
import { computed, signal } from '@preact/signals';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { studyDay, tzOffset } from '../engine/day.ts';
import { type ContentRefs, derive } from '../engine/replay.ts';
import { type BackupData, mergeEvents, mergeKv } from '../store/backup.ts';
import { allEvents, appendEvent, clearEvents, putEvents } from '../store/events.ts';
import { openDb } from '../store/idb.ts';
import { allKv, clearKv, type KvRecords, putKv, setKv } from '../store/kv.ts';
import { ulid } from '../store/ulid.ts';
import { index } from './content.ts';
import { pad2 } from './router.ts';

export const SAVE_ERROR = "Progress can't be saved in this browser";

/** Every event of the log, sorted by id. */
export const events = signal<readonly StudyEvent[]>([]);
export const kvRecords = signal<Readonly<KvRecords>>({});
/** True once the log has loaded, or failed to and fallen back to memory. */
export const storeReady = signal(false);
export const saveError = signal<string | null>(null);

const refs = computed<ContentRefs | null>(() => {
  const idx = index.value;
  if (idx === null) return null;
  return {
    questions: new Map(Object.entries(idx.questionVersions)),
    notes: new Set(idx.modules.flatMap((m) => m.lessons.map((l) => `m${pad2(m.n)}/${l.slug}`))),
  };
});

export const progress = computed(() => derive(events.value, refs.value));

/** The open database; null before `initStore` and when IndexedDB failed, so the log lives in memory only. */
let db: IDBDatabase | null = null;
let started = false;

const failed = (): void => {
  saveError.value = SAVE_ERROR;
};

/** Opens the database and loads the log and kv; on failure the app keeps working with an in-memory log. */
export async function initStore(): Promise<void> {
  if (started) return;
  started = true;
  try {
    db = await openDb();
    const [loaded, kv] = await Promise.all([allEvents(db), allKv(db)]);
    events.value = mergeEvents(loaded, events.value);
    kvRecords.value = { ...kv, ...kvRecords.value };
  } catch {
    db = null;
    failed();
  } finally {
    storeReady.value = true;
  }
}

/** Stamps an event with its id, time, offset and study day, shows it at once, then writes it. */
export async function record(e: NewEvent, now = new Date()): Promise<StudyEvent> {
  const event = {
    ...e,
    id: ulid(now.getTime()),
    at: now.toISOString(),
    tz: tzOffset(now),
    day: studyDay(now),
  } as StudyEvent;
  const firstAnswer = event.t === 'answer' && !events.value.some((x) => x.t === 'answer');
  events.value = [...events.value, event];
  if (firstAnswer) {
    // Ask the browser to keep the log through storage pressure (spec 8.1); a refusal changes nothing here.
    navigator.storage?.persist?.().catch(() => undefined);
  }
  if (db !== null) {
    try {
      await appendEvent(db, event);
    } catch {
      failed();
    }
  }
  return event;
}

/** Sets one kv value, stamped with `now`. */
export async function writeKv(key: string, value: unknown, now = new Date()): Promise<void> {
  kvRecords.value = { ...kvRecords.value, [key]: { value, updatedAt: now.toISOString() } };
  if (db === null) return;
  try {
    await setKv(db, key, value, now);
  } catch {
    failed();
  }
}

/** A seed for a new session, drawn outside the pure engine. */
export function newSessionSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

/** Replaces the whole log and kv with a backup's; returns the number of events this browser now has. */
export async function replaceAll(backup: BackupData): Promise<number> {
  const next = mergeEvents(backup.events, []);
  if (db !== null) {
    try {
      await clearEvents(db);
      await clearKv(db);
      await putEvents(db, next);
      await putKv(db, backup.kv);
    } catch {
      failed();
    }
  }
  events.value = next;
  kvRecords.value = { ...backup.kv };
  return next.length;
}

/** Merges a backup into the log by event id and into kv by `updatedAt`; returns the number of new events. */
export async function mergeIn(backup: BackupData): Promise<number> {
  const known = new Set(events.value.map((e) => e.id));
  const added = backup.events.filter((e) => !known.has(e.id));
  const kv = mergeKv(kvRecords.value, backup.kv);
  if (db !== null) {
    try {
      await putEvents(db, added);
      await putKv(db, kv);
    } catch {
      failed();
    }
  }
  events.value = mergeEvents(events.value, added);
  kvRecords.value = kv;
  return new Set(added.map((e) => e.id)).size;
}
