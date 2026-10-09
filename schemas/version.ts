/**
 * Storage constants without `zod/mini`, so the app can open the database and write backups
 * without loading the schemas, which only import validation needs.
 */

/** The storage shape version (spec 8.2); a change needs a step in `src/store/migrations`. */
export const SCHEMA_VERSION = 1;

/** The `format` field of every backup file (spec 8.3). */
export const BACKUP_FORMAT = 'ccp-study-backup';
