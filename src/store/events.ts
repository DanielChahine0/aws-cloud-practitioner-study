import type { StudyEvent } from '../../schemas/events.ts';
import { done, request } from './idb.ts';

export async function appendEvent(db: IDBDatabase, e: StudyEvent): Promise<void> {
  const tx = db.transaction('events', 'readwrite');
  tx.objectStore('events').add(e);
  await done(tx);
}

export async function putEvents(db: IDBDatabase, events: readonly StudyEvent[]): Promise<void> {
  const tx = db.transaction('events', 'readwrite');
  const store = tx.objectStore('events');
  for (const e of events) store.put(e);
  await done(tx);
}

/** Every event, sorted by id (the store's key order). */
export async function allEvents(db: IDBDatabase): Promise<StudyEvent[]> {
  const tx = db.transaction('events', 'readonly');
  return (await request(tx.objectStore('events').getAll())) as StudyEvent[];
}

export async function clearEvents(db: IDBDatabase): Promise<void> {
  const tx = db.transaction('events', 'readwrite');
  tx.objectStore('events').clear();
  await done(tx);
}
