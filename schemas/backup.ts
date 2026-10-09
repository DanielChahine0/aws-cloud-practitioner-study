/** The backup file (spec 8.3) in zod/mini, loaded only when a backup is imported. */
import * as z from 'zod/mini';
import { StudyEvent } from './events.ts';

export const BACKUP_FORMAT = 'ccp-study-backup';

export const KvRecord = z.strictObject({ key: z.string(), value: z.unknown(), updatedAt: z.string() });
export type KvRecord = z.infer<typeof KvRecord>;

export const Backup = z.strictObject({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.int().check(z.minimum(1)),
  appVersion: z.string(),
  contentVersion: z.string(),
  exportedAt: z.string(),
  events: z.array(StudyEvent),
  kv: z.record(z.string(), z.strictObject({ value: z.unknown(), updatedAt: z.string() })),
});
export type Backup = z.infer<typeof Backup>;
