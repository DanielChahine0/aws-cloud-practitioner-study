import type { StudyEvent } from '../../schemas/events.ts';
import { commit, request, STORES } from './idb.ts';

/** The append-only event log; events are keyed by their ULID, so ids sort by time. */

export async function appendEvent(db: IDBDatabase, e: StudyEvent): Promise<void> {
  const tx = db.transaction(STORES.events, 'readwrite');
  tx.objectStore(STORES.events).add(e);
  await commit(tx);
}

/** Writes many events in one transaction; an id already stored is overwritten with the same fact. */
export async function putEvents(db: IDBDatabase, events: readonly StudyEvent[]): Promise<void> {
  const tx = db.transaction(STORES.events, 'readwrite');
  const store = tx.objectStore(STORES.events);
  for (const e of events) store.put(e);
  await commit(tx);
}

export async function allEvents(db: IDBDatabase): Promise<StudyEvent[]> {
  const tx = db.transaction(STORES.events, 'readonly');
  const events = (await request(tx.objectStore(STORES.events).getAll())) as StudyEvent[];
  return events.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
