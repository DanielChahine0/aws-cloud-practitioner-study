import type { Backup } from '../../schemas/backup.ts';
import type { StudyEvent } from '../../schemas/events.ts';
import { BACKUP_FORMAT, SCHEMA_VERSION } from '../../schemas/version.ts';
import type { KvRecords } from './kv.ts';
import { migrate } from './migrations/index.ts';

/**
 * Backups (spec 8.3): the event log itself plus the `kv` records.
 * Import merges by event id, so it is idempotent and works in either order; for `kv` the newer `updatedAt` wins.
 */
/** The `package.json` version, from Vite's `define`. */
export const APP_VERSION: string = __APP_VERSION__;

export type BackupData = Omit<Backup, 'events' | 'kv'> & { events: StudyEvent[]; kv: KvRecords };

const pad = (n: number): string => String(n).padStart(2, '0');

export function makeBackup(
  events: readonly StudyEvent[],
  kv: KvRecords,
  meta: { appVersion: string; contentVersion: string; now: Date },
): BackupData {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion: meta.appVersion,
    contentVersion: meta.contentVersion,
    exportedAt: meta.now.toISOString(),
    events: [...events],
    kv,
  };
}

/** `ccp-study-backup-YYYY-MM-DD.json` by the local calendar date. */
export function backupFileName(now: Date): string {
  return `ccp-study-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** The union by id, sorted by id; on a clash the event from `a` stays. */
export function mergeEvents(a: readonly StudyEvent[], b: readonly StudyEvent[]): StudyEvent[] {
  const byId = new Map<string, StudyEvent>();
  for (const e of b) byId.set(e.id, e);
  for (const e of a) byId.set(e.id, e);
  return [...byId.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/** Per key the record with the newer `updatedAt`; `a` wins a tie. */
export function mergeKv(a: KvRecords, b: KvRecords): KvRecords {
  const out: KvRecords = { ...b };
  for (const [key, record] of Object.entries(a)) {
    const other = out[key];
    if (!other || record.updatedAt >= other.updatedAt) out[key] = record;
  }
  return out;
}

export interface ImportPreview {
  events: number;
  from: string | null;
  to: string | null;
  local: number;
  added: number;
}

export function previewOf(backup: BackupData, local: readonly StudyEvent[]): ImportPreview {
  const sorted = mergeEvents(backup.events, []);
  const known = new Set(local.map((e) => e.id));
  return {
    events: sorted.length,
    from: sorted[0]?.at ?? null,
    to: sorted.at(-1)?.at ?? null,
    local: local.length,
    added: sorted.filter((e) => !known.has(e.id)).length,
  };
}

const count = (n: number): string => n.toLocaleString('en-US');
const shortDate = (at: string): string =>
  new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** `1,240 events from Sep 2 to Oct 9; this browser has 310`. */
export function previewLine(p: ImportPreview): string {
  const here = `this browser has ${count(p.local)}`;
  if (p.events === 0 || p.from === null || p.to === null) return `No events in this backup; ${here}`;
  const noun = p.events === 1 ? 'event' : 'events';
  return `${count(p.events)} ${noun} from ${shortDate(p.from)} to ${shortDate(p.to)}; ${here}`;
}

export type ParseResult = { ok: true; data: BackupData } | { ok: false; error: string };

/** Parses, migrates and validates a backup file; `zod/mini` loads only here, on import. */
export async function parseBackup(text: string): Promise<ParseResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not JSON' };
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'This file is not a CCP Study backup' };
  }
  const data = raw as Record<string, unknown>;
  if (data.format !== BACKUP_FORMAT) return { ok: false, error: 'This file is not a CCP Study backup' };
  let migrated: Record<string, unknown>;
  try {
    migrated = migrate(data);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const { Backup } = await import('../../schemas/backup.ts');
  const result = Backup.safeParse(migrated);
  if (!result.success) {
    const issue = result.error.issues[0];
    const where = issue && issue.path.length > 0 ? `${issue.path.map(String).join('.')}: ` : '';
    return {
      ok: false,
      error: `This backup does not match this app: ${where}${issue?.message ?? 'unknown problem'}`,
    };
  }
  return { ok: true, data: result.data as BackupData };
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Spec 8.3: remind only after at least this many new events... */
export const REMINDER_EVENTS = 50;
/** ...and when the last export is older than this many days, or missing. */
export const REMINDER_DAYS = 7;

/**
 * True when Home should show the backup reminder (spec 8.3): at least 50 events newer than the last export
 * (all events when there is none), and the last export more than 7 days old or missing.
 */
export function reminderDue(events: readonly StudyEvent[], lastExportAt: string | null, now: Date): boolean {
  const since =
    lastExportAt ?? events.reduce<string | null>((min, e) => (min === null || e.at < min ? e.at : min), null);
  if (since === null) return false;
  const fresh = events.filter((e) => e.at > since).length;
  if (fresh < REMINDER_EVENTS) return false;
  return lastExportAt === null || now.getTime() - new Date(lastExportAt).getTime() > REMINDER_DAYS * DAY_MS;
}
