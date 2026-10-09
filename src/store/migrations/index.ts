import { SCHEMA_VERSION } from '../../../schemas/events.ts';

/** One pure step from schema N to N+1 (spec 8.2). */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

/** Index i migrates schema i+1 to i+2. */
export const MIGRATIONS: readonly Migration[] = [];

/** Moves a backup up to `SCHEMA_VERSION`, or throws when it comes from a newer app. */
export function migrate(data: Record<string, unknown>): Record<string, unknown> {
  const from = typeof data.schemaVersion === 'number' ? data.schemaVersion : 1;
  if (from > SCHEMA_VERSION) {
    throw new Error(`This backup is from a newer version of the app (schema ${from}); update the app first`);
  }
  let out = data;
  for (let v = from; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v - 1];
    if (step === undefined) throw new Error(`No migration from schema ${v}`);
    out = step(out);
  }
  return { ...out, schemaVersion: SCHEMA_VERSION };
}
