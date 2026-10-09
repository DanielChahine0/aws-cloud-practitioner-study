/** Export, import and merge of the event log (spec 8.3); pure apart from the lazy schema import. */
import type { Backup } from '../../schemas/backup.ts';
import type { StudyEvent } from '../../schemas/events.ts';
import { SCHEMA_VERSION } from '../../schemas/schema-version.ts';
import type { KvValue } from './kv.ts';
import { migrate } from './migrations/index.ts';

const BACKUP_FORMAT = 'ccp-study-backup';

/** The app's version from package.json, which Vite and Vitest define. */
export const APP_VERSION: string = __APP_VERSION__;

export type BackupData = Omit<Backup, 'events'> & { events: StudyEvent[] };

export function makeBackup(
  events: readonly StudyEvent[],
  kv: Readonly<Record<string, KvValue>>,
  meta: { appVersion: string; contentVersion: string; now: Date },
): BackupData {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    appVersion: meta.appVersion,
    contentVersion: meta.contentVersion,
    exportedAt: meta.now.toISOString(),
    events: [...events],
    kv: { ...kv },
  };
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function backupFileName(now: Date): string {
  return `ccp-study-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Union by event id, sorted by id; on a clash the event from `a` stays. */
export function mergeEvents(a: readonly StudyEvent[], b: readonly StudyEvent[]): StudyEvent[] {
  const byId = new Map<string, StudyEvent>();
  for (const e of b) byId.set(e.id, e);
  for (const e of a) byId.set(e.id, e);
  return [...byId.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}

/** Per key, the record with the newer `updatedAt`; `a` wins a tie. */
export function mergeKv(
  a: Readonly<Record<string, KvValue>>,
  b: Readonly<Record<string, KvValue>>,
): Record<string, KvValue> {
  const out: Record<string, KvValue> = { ...b };
  for (const [key, record] of Object.entries(a)) {
    const other = out[key];
    if (other === undefined || record.updatedAt >= other.updatedAt) out[key] = record;
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
  const ids = new Set(local.map((e) => e.id));
  const times = backup.events.map((e) => e.at).sort();
  return {
    events: backup.events.length,
    from: times[0] ?? null,
    to: times[times.length - 1] ?? null,
    local: local.length,
    added: new Set(backup.events.filter((e) => !ids.has(e.id)).map((e) => e.id)).size,
  };
}

const count = (n: number): string => n.toLocaleString('en-US');
const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function previewLine(p: ImportPreview): string {
  if (p.events === 0 || p.from === null || p.to === null) {
    return `No events in this backup; this browser has ${count(p.local)}`;
  }
  const noun = p.events === 1 ? 'event' : 'events';
  return `${count(p.events)} ${noun} from ${shortDate(p.from)} to ${shortDate(p.to)}; this browser has ${count(p.local)}`;
}

export async function parseBackup(
  text: string,
): Promise<{ ok: true; data: BackupData } | { ok: false; error: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not JSON' };
  }
  if (typeof raw !== 'object' || raw === null || (raw as { format?: unknown }).format !== BACKUP_FORMAT) {
    return { ok: false, error: 'This file is not a CCP Study backup' };
  }
  let migrated: Record<string, unknown>;
  try {
    migrated = migrate(raw as Record<string, unknown>);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  const { Backup } = await import('../../schemas/backup.ts');
  const parsed = Backup.safeParse(migrated);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue === undefined || issue.path.length === 0 ? '' : `${issue.path.join('.')}: `;
    return {
      ok: false,
      error: `This backup does not match this app: ${where}${issue?.message ?? 'unknown problem'}`,
    };
  }
  return { ok: true, data: parsed.data as BackupData };
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
