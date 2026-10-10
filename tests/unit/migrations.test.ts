import { describe, expect, it } from 'vitest';
import { ADR_KEY_PREFIX, adrKey, KV_KEYS } from '../../src/store/kv.ts';
import {
  type LocalData,
  MIGRATIONS,
  type Migration,
  migrate,
  migrateLocal,
} from '../../src/store/migrations/index.ts';

/** A made-up step from schema 1 to 2 that renames every answer's `ms` to `millis`. */
const renameMs: Migration = (data) => ({
  ...data,
  events: (data.events as Record<string, unknown>[]).map(({ ms, ...rest }) =>
    ms === undefined ? rest : { ...rest, millis: ms },
  ),
});

const LOCAL: LocalData = {
  events: [{ id: '01J9Z8Y7X6W5V4T3S2R1Q0P9N8', t: 'answer', ms: 4200 }],
  kv: { lastExportAt: { value: '2026-10-09T08:00:00.000Z', updatedAt: '2026-10-09T08:00:00.000Z' } },
};

describe('migrate', () => {
  it('has no steps yet', () => {
    expect(MIGRATIONS).toEqual([]);
  });

  it('passes schema 1 through unchanged', () => {
    const data = { format: 'ccp-study-backup', schemaVersion: 1, events: [], kv: {} };
    expect(migrate(data)).toEqual(data);
  });

  it('refuses a backup from a newer schema', () => {
    expect(() => migrate({ schemaVersion: 2 })).toThrow(
      'This backup is from a newer version of the app (schema 2); update the app first',
    );
  });

  it('refuses a missing or broken schema version', () => {
    expect(() => migrate({})).toThrow();
    expect(() => migrate({ schemaVersion: 0 })).toThrow();
    expect(() => migrate({ schemaVersion: '1' })).toThrow();
  });

  it('runs injected steps up to an injected target', () => {
    const out = migrate({ schemaVersion: 1, events: LOCAL.events, kv: {} }, [renameMs], 2);
    expect(out).toEqual({
      schemaVersion: 2,
      events: [{ id: '01J9Z8Y7X6W5V4T3S2R1Q0P9N8', t: 'answer', millis: 4200 }],
      kv: {},
    });
  });

  it('names the missing step when the steps stop short of the target', () => {
    expect(() => migrate({ schemaVersion: 1, events: [] }, [renameMs], 3)).toThrow(
      'No migration from schema 2',
    );
  });
});

describe('migrateLocal', () => {
  it('treats a log with no stored version as schema 1 and leaves it alone', () => {
    const out = migrateLocal(null, LOCAL);
    expect(out).toEqual({ from: 1, data: LOCAL, migrated: false });
    expect(out.data).toBe(LOCAL);
  });

  it('leaves a log at the current version alone', () => {
    expect(migrateLocal(1, LOCAL)).toEqual({ from: 1, data: LOCAL, migrated: false });
  });

  it('runs the steps from the stored version and returns the new log and kv', () => {
    expect(migrateLocal(1, LOCAL, [renameMs], 2)).toEqual({
      from: 1,
      data: {
        events: [{ id: '01J9Z8Y7X6W5V4T3S2R1Q0P9N8', t: 'answer', millis: 4200 }],
        kv: LOCAL.kv,
      },
      migrated: true,
    });
  });

  it('refuses a log written by a newer version of the app', () => {
    expect(() => migrateLocal(3, LOCAL)).toThrow(
      'This backup is from a newer version of the app (schema 3); update the app first',
    );
  });
});

describe('KV_KEYS', () => {
  it('names every key the app writes', () => {
    expect(KV_KEYS).toEqual({
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
    });
  });

  it('gives each module its own ADR draft key', () => {
    expect(ADR_KEY_PREFIX).toBe('adr-');
    expect([1, 3, 13].map(adrKey)).toEqual(['adr-01', 'adr-03', 'adr-13']);
  });
});
