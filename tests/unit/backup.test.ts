import { describe, expect, it } from 'vitest';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import {
  APP_VERSION,
  backupFileName,
  makeBackup,
  mergeEvents,
  mergeKv,
  parseBackup,
  previewLine,
  previewOf,
  reminderDue,
} from '../../src/store/backup.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { eventsOf, SID } from '../fixtures/events.ts';

const lesson = (note: string): NewEvent => ({ t: 'lesson.done', note });
const META = { appVersion: '0.2.0', contentVersion: 'c-3f9a1e', now: new Date(Date.UTC(2026, 9, 9, 8)) };

describe('backupFileName', () => {
  it('uses the local date', () => {
    expect(backupFileName(new Date(2026, 9, 9, 23, 30))).toBe('ccp-study-backup-2026-10-09.json');
    expect(backupFileName(new Date(2026, 0, 2, 0, 5))).toBe('ccp-study-backup-2026-01-02.json');
  });
});

describe('makeBackup', () => {
  it('wraps the log and the kv records with the versions', () => {
    const events = eventsOf(lesson('m01/a'));
    const kv = { lastExportAt: { value: 'x', updatedAt: '2026-10-09T08:00:00.000Z' } };
    expect(makeBackup(events, kv, META)).toEqual({
      format: 'ccp-study-backup',
      schemaVersion: 1,
      appVersion: '0.2.0',
      contentVersion: 'c-3f9a1e',
      exportedAt: '2026-10-09T08:00:00.000Z',
      events,
      kv,
    });
  });

  it('knows the app version from package.json', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('mergeEvents', () => {
  it('is a union by id, sorted by id, keeping the first side on a clash', () => {
    const [a, b, c] = eventsOf(lesson('m01/a'), lesson('m01/b'), lesson('m01/c'));
    if (!a || !b || !c) throw new Error('fixture');
    const clash = { ...b, note: 'm01/other' };
    expect(mergeEvents([c, a], [b, a]).map((e) => e.id)).toEqual([a.id, b.id, c.id]);
    expect(mergeEvents([b], [clash])).toEqual([b]);
    expect(mergeEvents([clash], [b])).toEqual([clash]);
  });
});

describe('mergeKv', () => {
  it('keeps the newer record per key, and the first side on a tie', () => {
    const old = { value: 1, updatedAt: '2026-10-01T00:00:00.000Z' };
    const fresh = { value: 2, updatedAt: '2026-10-09T00:00:00.000Z' };
    const tie = { value: 3, updatedAt: '2026-10-09T00:00:00.000Z' };
    expect(mergeKv({ k: old, a: old }, { k: fresh, b: fresh })).toEqual({ k: fresh, a: old, b: fresh });
    expect(mergeKv({ k: fresh }, { k: old })).toEqual({ k: fresh });
    expect(mergeKv({ k: fresh }, { k: tie })).toEqual({ k: fresh });
  });

  it('merges rankSeen and examSession by newer updatedAt', () => {
    const rankOld = { value: 'basic', updatedAt: '2026-10-20T08:00:00.000Z' };
    const rankNew = { value: 'developer', updatedAt: '2026-10-27T08:00:00.000Z' };
    const draftOld = { value: { sid: SID, current: 3 }, updatedAt: '2026-10-27T09:00:00.000Z' };
    const draftNew = { value: { sid: SID, current: 40 }, updatedAt: '2026-10-27T09:30:00.000Z' };
    const here = { [KV_KEYS.rankSeen]: rankOld, [KV_KEYS.examSession]: draftNew };
    const there = { [KV_KEYS.rankSeen]: rankNew, [KV_KEYS.examSession]: draftOld };
    const merged = { [KV_KEYS.rankSeen]: rankNew, [KV_KEYS.examSession]: draftNew };
    expect(mergeKv(here, there)).toEqual(merged);
    expect(mergeKv(there, here)).toEqual(merged);
  });
});

describe('previewOf and previewLine', () => {
  it('counts the events, their dates and what a merge would add', () => {
    const events = eventsOf(lesson('m01/a'), lesson('m01/b'), lesson('m01/c'));
    const backup = makeBackup(events, {}, META);
    const p = previewOf(backup, events.slice(0, 1));
    expect(p).toEqual({ events: 3, from: events[0]?.at, to: events[2]?.at, local: 1, added: 2 });
  });

  it('writes counts with commas and short local month names', () => {
    const line = previewLine({
      events: 1240,
      from: new Date(2026, 8, 2, 12).toISOString(),
      to: new Date(2026, 9, 9, 23, 59).toISOString(),
      local: 310,
      added: 930,
    });
    expect(line).toBe('1,240 events from Sep 2 to Oct 9; this browser has 310');
  });

  it('says so when the backup is empty, and handles one event', () => {
    expect(previewLine({ events: 0, from: null, to: null, local: 1310, added: 0 })).toBe(
      'No events in this backup; this browser has 1,310',
    );
    const at = new Date(2026, 9, 9, 0, 1).toISOString();
    const one = { events: 1, from: at, to: at, local: 0, added: 1 };
    expect(previewLine(one)).toBe('1 event from Oct 9 to Oct 9; this browser has 0');
  });
});

describe('parseBackup', () => {
  const valid = () => makeBackup(eventsOf(lesson('m01/a')), {}, META);

  it('accepts a backup it wrote', async () => {
    const result = await parseBackup(JSON.stringify(valid()));
    expect(result).toEqual({ ok: true, data: valid() });
  });

  it('rejects text that is not JSON', async () => {
    expect(await parseBackup('{oops')).toEqual({ ok: false, error: 'This file is not JSON' });
  });

  it('rejects a foreign format', async () => {
    const error = 'This file is not a CCP Study backup';
    expect(await parseBackup(JSON.stringify({ format: 'other', events: [] }))).toEqual({ ok: false, error });
    expect(await parseBackup('[1, 2]')).toEqual({ ok: false, error });
    expect(await parseBackup('null')).toEqual({ ok: false, error });
  });

  it('rejects a backup from a newer schema', async () => {
    const result = await parseBackup(JSON.stringify({ ...valid(), schemaVersion: 2 }));
    expect(result).toEqual({
      ok: false,
      error: 'This backup is from a newer version of the app (schema 2); update the app first',
    });
  });

  it('names the first problem of a backup that does not match', async () => {
    const broken = valid();
    const result = await parseBackup(
      JSON.stringify({ ...broken, events: [{ ...broken.events[0], day: 'x' }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/^This backup does not match this app: events\.0\.day: /);
  });
});

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-20T12:00:00Z');

/** `n` lesson.done events, one minute apart, all after `after`. */
function eventsAfter(after: Date, n: number): StudyEvent[] {
  return Array.from({ length: n }, (_, i) => {
    const at = new Date(after.getTime() + (i + 1) * 60_000).toISOString();
    return {
      id: `01K0000000000000000000${String(i).padStart(4, '0')}`,
      at,
      tz: 0,
      day: at.slice(0, 10),
      t: 'lesson.done',
      note: `m01/lesson-${i}`,
    };
  });
}

describe('reminderDue', () => {
  it('stays quiet with 49 new events, even long after the last export', () => {
    const exported = new Date(NOW.getTime() - 8 * DAY);
    expect(reminderDue(eventsAfter(exported, 49), exported.toISOString(), NOW)).toBe(false);
  });

  it('reminds with 50 new events and an export 8 days old', () => {
    const exported = new Date(NOW.getTime() - 8 * DAY);
    expect(reminderDue(eventsAfter(exported, 50), exported.toISOString(), NOW)).toBe(true);
  });

  it('stays quiet with 50 new events and an export 6 days old', () => {
    const exported = new Date(NOW.getTime() - 6 * DAY);
    expect(reminderDue(eventsAfter(exported, 50), exported.toISOString(), NOW)).toBe(false);
  });

  it('counts events after the first one when nothing was exported yet', () => {
    const start = new Date(NOW.getTime() - 2 * DAY);
    expect(reminderDue(eventsAfter(start, 50), null, NOW)).toBe(false);
    expect(reminderDue(eventsAfter(start, 51), null, NOW)).toBe(true);
    expect(reminderDue([], null, NOW)).toBe(false);
  });
});
