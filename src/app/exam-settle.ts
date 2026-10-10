/**
 * Settling an exam: the single writer that turns the kv draft of a boss or mock into answer events and the submit,
 * whether the Submit button, the deadline or a later visit asks first (spec 4.3).
 */
import { effect, signal } from '@preact/signals';
import type { ModuleChunk, QuestionView } from '../../schemas/chunks.ts';
import type { StudyEvent } from '../../schemas/events.ts';
import type { Progress, SessionState } from '../engine/replay.ts';
import { KV_KEYS } from '../store/kv.ts';
import { ensureExamForm, ensureModule, index, loadError, modules } from './content.ts';
import { examDraftOf, newDraft, submitEvents } from './exam-session.ts';
import { events, kvRecords, progress, recordAll, writeKv } from './progress.ts';

/** The wall clock in milliseconds, ticked every second by App while an exam is open; the focus bar reads it. */
export const examTick = signal(Date.now());

/** What the focus bar's Flag and Grid buttons do, set by the exam shell while it shows a question. */
export const examControls = signal<{
  flag: () => void;
  grid: () => void;
  flagged: boolean;
  gridOpen: boolean;
} | null>(null);

/** The open boss or mock, if any; only one may be open at a time. */
export function openExam(p: Progress): SessionState | null {
  let best: SessionState | null = null;
  for (const s of p.sessions.values()) {
    if ((s.mode !== 'boss' && s.mode !== 'mock') || s.submittedAt !== null || s.abandoned) continue;
    if (best === null || s.startedAt > best.startedAt) best = s;
  }
  return best;
}

/** Resolves once every module chunk asked for has loaded, or with null when a load fails. */
export function loadModules(ns: readonly number[]): Promise<ModuleChunk[] | null> {
  for (const n of ns) ensureModule(n);
  return new Promise((resolve) => {
    let stop: (() => void) | null = null;
    let done = false;
    stop = effect(() => {
      const loaded = ns.map((n) => modules.value.get(n));
      const failed = loadError.value !== null;
      if (!failed && loaded.some((c) => c === undefined)) return;
      done = true;
      resolve(failed ? null : (loaded as ModuleChunk[]));
      stop?.();
    });
    if (done) stop();
  });
}

/**
 * The question text of a session's items: the form chunks of its exam items and, for a boss, the module chunks of
 * its module and every earlier one; null when a chunk cannot load, or while the content index has not loaded, since
 * without it no chunk can be found and a settle would score every answer as missing.
 */
export async function examQuestions(session: SessionState): Promise<Map<string, QuestionView> | null> {
  const idx = index.peek();
  if (idx === null) return null;
  const items = idx.exam.items;
  const forms = new Set<string>();
  for (const qid of session.qids) {
    const item = items[qid];
    if (item !== undefined) forms.add(item.form);
  }
  const chunks = await Promise.all([...forms].map((f) => ensureExamForm(f)));
  if (chunks.some((c) => c === null)) return null;
  const module = session.mode === 'boss' ? Number(session.scope.slice(1)) : 0;
  const practice = module > 0 ? await loadModules(Array.from({ length: module }, (_, i) => i + 1)) : [];
  if (practice === null) return null;
  const wanted = new Set(session.qids);
  const out = new Map<string, QuestionView>();
  for (const q of [...chunks.flatMap((c) => c?.questions ?? []), ...practice.flatMap((c) => c.questions)]) {
    if (wanted.has(q.id)) out.set(q.id, q);
  }
  return out;
}

const settling = new Set<string>();

/**
 * The time a settle is stamped with: `now` before the deadline, and after it the deadline itself, since that is when
 * the exam ended, so an exam left open and settled on a later visit counts on the day it ran out (spec 3.5).
 * It never stamps before the last event of the log, so ids stay in time order.
 */
export function settleTime(deadline: string | null, log: readonly StudyEvent[], now: Date): Date {
  const end = deadline === null ? Number.NaN : Date.parse(deadline);
  if (Number.isNaN(end) || now.getTime() < end) return now;
  const last = Date.parse(log.at(-1)?.at ?? '');
  const after = Number.isNaN(last) ? end : Math.max(end, last + 1);
  return new Date(Math.min(after, now.getTime()));
}

/**
 * Records the answers and the submit of an open exam, then clears its draft; true when it recorded.
 * It is the only caller of `submitEvents`, ignores a second call while one is in flight, and re-reads the session
 * right before recording, so a duplicate submit can never reach the log; the answers and the submit are written as one
 * transaction, so a settle cut off partway leaves nothing behind.
 */
export async function settleExam(sid: string, now: Date): Promise<boolean> {
  if (settling.has(sid)) return false;
  settling.add(sid);
  try {
    const first = progress.peek().sessions.get(sid);
    if (first === undefined || first.submittedAt !== null || first.abandoned) return false;
    if (first.mode !== 'boss' && first.mode !== 'mock') return false;
    const questions = await examQuestions(first);
    if (questions === null) return false;
    const session = progress.peek().sessions.get(sid);
    if (session === undefined || session.submittedAt !== null || session.abandoned) return false;
    const draft = examDraftOf(kvRecords.peek()[KV_KEYS.examSession]?.value, sid) ?? newDraft(sid);
    const at = settleTime(session.deadline, events.peek(), now);
    await recordAll(submitEvents({ draft, session, questions, mode: first.mode }), at);
    await writeKv(KV_KEYS.examSession, null, now);
    return true;
  } finally {
    settling.delete(sid);
  }
}
