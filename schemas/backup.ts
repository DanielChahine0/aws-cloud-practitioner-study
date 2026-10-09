import * as z from 'zod/mini';
import { StudyEvent } from './events.ts';
import { BACKUP_FORMAT } from './version.ts';

/** The backup file (spec 8.3): the event log itself plus the `kv` records, validated with `zod/mini` on import. */
export { BACKUP_FORMAT };

export const KvValue = z.strictObject({ value: z.unknown(), updatedAt: z.string() });
export type KvValue = z.infer<typeof KvValue>;

/** One stored `kv` record, as the IndexedDB `kv` store keeps it. */
export const KvRecord = z.strictObject({ key: z.string(), value: z.unknown(), updatedAt: z.string() });
export type KvRecord = z.infer<typeof KvRecord>;

export const Backup = z.strictObject({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.int().check(z.minimum(1)),
  appVersion: z.string(),
  contentVersion: z.string(),
  exportedAt: z.string(),
  events: z.array(StudyEvent),
  kv: z.record(z.string(), KvValue),
});
export type Backup = z.infer<typeof Backup>;
