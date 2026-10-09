import { describe, expect, it } from 'vitest';
import { MIGRATIONS, migrate } from '../../src/store/migrations/index.ts';

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
});
