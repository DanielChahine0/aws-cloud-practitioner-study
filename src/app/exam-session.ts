/**
 * The exam draft (spec 4.3 and 8.1): while a boss or mock runs, picks, flags, answer changes and time per item live
 * in kv under `examSession`, and only at submit do they become answer events. Pure, so the tests run without a browser.
 */
import type { ExamItemRef, QuestionView } from '../../schemas/chunks.ts';
import type { NewEvent } from '../../schemas/events.ts';
import { DOMAIN_IDS } from '../../schemas/ids.ts';
import type { FormTargets } from '../engine/forms.ts';
import type { Domain } from '../engine/quotas.ts';
import type { SessionState } from '../engine/replay.ts';
import { isCorrect } from './runner.ts';

export interface ExamDraft {
  sid: string;
  /** The current pick per question id; an empty or missing pick is unanswered. */
  picks: Record<string, string[]>;
  flagged: string[];
  /** Earlier picks per question id, oldest first, for the `Changed right to wrong` tag (spec 4.4). */
  changes: Record<string, string[][]>;
  /** Milliseconds each question was on screen. */
  ms: Record<string, number>;
  /** The 0-based index of the question on screen. */
  current: number;
}

export function newDraft(sid: string): ExamDraft {
  return { sid, picks: {}, flagged: [], changes: {}, ms: {}, current: 0 };
}

const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((x) => typeof x === 'string');

const isRecordOf = <T>(value: unknown, item: (x: unknown) => x is T): value is Record<string, T> =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((x) => item(x));

const isPickList = (value: unknown): value is string[][] => Array.isArray(value) && value.every(isStrings);
const isMs = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** The kv draft of session `sid`, or null when the value is another session's or is malformed. */
export function examDraftOf(value: unknown, sid: string): ExamDraft | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.sid !== sid) return null;
  if (!isRecordOf(v.picks, isStrings) || !isStrings(v.flagged) || !isRecordOf(v.changes, isPickList))
    return null;
  if (
    !isRecordOf(v.ms, isMs) ||
    typeof v.current !== 'number' ||
    !Number.isInteger(v.current) ||
    v.current < 0
  )
    return null;
  return { sid, picks: v.picks, flagged: v.flagged, changes: v.changes, ms: v.ms, current: v.current };
}

const samePick = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

/** Sets the pick of one question, logging the previous non-empty pick in `changes` when it differs. */
export function pick(draft: ExamDraft, qid: string, picked: string[]): ExamDraft {
  const before = draft.picks[qid] ?? [];
  if (samePick(before, picked)) return draft;
  const changes =
    before.length > 0 ? { ...draft.changes, [qid]: [...(draft.changes[qid] ?? []), before] } : draft.changes;
  return { ...draft, picks: { ...draft.picks, [qid]: picked }, changes };
}

export function toggleFlag(draft: ExamDraft, qid: string): ExamDraft {
  const flagged = draft.flagged.includes(qid)
    ? draft.flagged.filter((x) => x !== qid)
    : [...draft.flagged, qid];
  return { ...draft, flagged };
}

/** Adds time on screen to one question. */
export function addTime(draft: ExamDraft, qid: string, ms: number): ExamDraft {
  if (ms <= 0) return draft;
  return { ...draft, ms: { ...draft.ms, [qid]: (draft.ms[qid] ?? 0) + Math.round(ms) } };
}

export const isAnswered = (draft: ExamDraft, qid: string): boolean => (draft.picks[qid]?.length ?? 0) > 0;

/**
 * The events of a submit: one answer per question in session order, an unanswered one with `picked: []` and
 * `correct: false` (spec 4.3), every one `sure: false` (spec 3.1), then the session submit.
 * A question whose text is not loaded is left out, and still counts as wrong because the score is over `qids`.
 */
export function submitEvents(args: {
  draft: ExamDraft;
  session: SessionState;
  questions: ReadonlyMap<string, QuestionView>;
  mode: 'boss' | 'mock';
}): NewEvent[] {
  const { draft, session, questions, mode } = args;
  const out: NewEvent[] = [];
  for (const qid of session.qids) {
    const q = questions.get(qid);
    if (q === undefined) continue;
    const picked = draft.picks[qid] ?? [];
    const changes = draft.changes[qid] ?? [];
    out.push({
      t: 'answer',
      sid: session.sid,
      mode,
      qid,
      qv: q.version,
      concept: q.concept,
      picked,
      correct: picked.length > 0 && isCorrect(q, picked),
      sure: false,
      ms: draft.ms[qid] ?? 0,
      ...(draft.flagged.includes(qid) ? { flagged: true } : {}),
      ...(changes.length > 0 ? { changes } : {}),
    });
  }
  out.push({ t: 'session', sid: session.sid, mode, phase: 'submit', seed: session.seed });
  return out;
}

/** A grid button's accessible name: `Question 3, answered, flagged`. */
export function gridLabel(n: number, answered: boolean, flagged: boolean): string {
  return [`Question ${n}`, answered ? 'answered' : 'unanswered', ...(flagged ? ['flagged'] : [])].join(', ');
}

/** The review page's and the confirmation's count line: `3 unanswered, 2 flagged.` */
export function countsLine(unanswered: number, flagged: number): string {
  return `${unanswered} unanswered, ${flagged} flagged.`;
}

/**
 * The per-form targets a remix must meet, read off the frozen forms' live items in the index: each task count and each
 * multi-response count per domain is the largest over the forms, which all share the same counts (spec 4.3), so an
 * item retired from one form never shrinks or skews a remix.
 */
export function remixTargets(items: Readonly<Record<string, ExamItemRef>>): FormTargets {
  const perForm = new Map<string, { tasks: Record<string, number>; multi: Record<string, number> }>();
  for (const item of Object.values(items)) {
    const counts = perForm.get(item.form) ?? { tasks: {}, multi: {} };
    perForm.set(item.form, counts);
    counts.tasks[item.task] = (counts.tasks[item.task] ?? 0) + 1;
    const domain = item.task.split('.')[0] as string;
    if (item.type === 'multi') counts.multi[domain] = (counts.multi[domain] ?? 0) + 1;
  }
  const tasks: Record<string, number> = {};
  const multi = Object.fromEntries(DOMAIN_IDS.map((d) => [d, 0])) as Record<Domain, number>;
  for (const counts of perForm.values()) {
    for (const [task, n] of Object.entries(counts.tasks)) tasks[task] = Math.max(tasks[task] ?? 0, n);
    for (const d of DOMAIN_IDS) multi[d] = Math.max(multi[d], counts.multi[d] ?? 0);
  }
  return { tasks, multi };
}
