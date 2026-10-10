import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '../../schemas/events.ts';
import { appendEvent, putEvents } from '../../src/store/events.ts';
import { putKv, setKv } from '../../src/store/kv.ts';
import { replaceStores } from '../../src/store/replace.ts';

/**
 * A fake database whose transactions record their calls and complete only once `commit()` is called, the way
 * a write must reach disk before a reload that follows at once (Chromium aborts a transaction still waiting
 * for its automatic commit when the page unloads).
 */
function fakeDb(): { db: IDBDatabase; calls: string[] } {
  const calls: string[] = [];
  const db = {
    transaction(_stores: unknown, mode: string) {
      const store = {
        add: () => calls.push(`add ${mode}`),
        put: () => calls.push(`put ${mode}`),
        clear: () => calls.push(`clear ${mode}`),
      };
      const tx = {
        oncomplete: null as (() => void) | null,
        onerror: null,
        onabort: null,
        error: null,
        objectStore: () => store,
        commit() {
          calls.push('commit');
          queueMicrotask(() => tx.oncomplete?.());
        },
      };
      return tx;
    },
  } as unknown as IDBDatabase;
  return { db, calls };
}

const EVENT = { id: '01K7000000000000000000000E', t: 'lesson.done', note: 'm01/x' } as unknown as StudyEvent;

describe('every write commits its transaction explicitly', () => {
  it('appendEvent adds, then commits', async () => {
    const { db, calls } = fakeDb();
    await appendEvent(db, EVENT);
    expect(calls).toEqual(['add readwrite', 'commit']);
  });

  it('putEvents puts each event, then commits', async () => {
    const { db, calls } = fakeDb();
    await putEvents(db, [EVENT, EVENT]);
    expect(calls).toEqual(['put readwrite', 'put readwrite', 'commit']);
  });

  it('setKv and putKv put, then commit', async () => {
    const { db, calls } = fakeDb();
    await setKv(db, 'examAsk', 'dismissed', new Date('2026-10-12T09:00:00.000Z'));
    await putKv(db, { a: { value: 1, updatedAt: '2026-10-12T09:00:00.000Z' } });
    expect(calls).toEqual(['put readwrite', 'commit', 'put readwrite', 'commit']);
  });

  it('replaceStores clears and puts in one transaction, then commits', async () => {
    const { db, calls } = fakeDb();
    await replaceStores(db, [EVENT], {});
    expect(calls).toEqual(['clear readwrite', 'clear readwrite', 'put readwrite', 'commit']);
  });
});
