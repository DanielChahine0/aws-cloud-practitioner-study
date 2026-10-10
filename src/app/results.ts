/** Pure copy and ordering for the results page and the mock list (spec 4.3 and 4.4), tested without a browser. */
import type { QuestionView } from '../../schemas/chunks.ts';
import type { BadgeEarned } from '../engine/badges.ts';
import { bossPassMark } from '../engine/memory.ts';
import type { MockAttempt } from '../engine/mock.ts';
import type { AnswerRecord, ExamResult } from '../engine/replay.ts';
import { shortDate } from './dates.ts';
import { isCorrect } from './runner.ts';

/** The three cause taps of error review, in the order of the `cause` event's values (spec 4.4). */
export const CAUSE_LABELS = {
  unknown: "Didn't know",
  confused: 'Confused it with another',
  misread: 'Misread',
} as const;

/** Wrong items with confident errors first: unflagged, then flagged, each in session order (spec 4.4). */
export function wrongOrder(items: readonly { qid: string; flagged: boolean }[]): string[] {
  return [...items.filter((i) => !i.flagged), ...items.filter((i) => i.flagged)].map((i) => i.qid);
}

/** True when an earlier pick of this answer was right and the final one is wrong. */
export function changedRightToWrong(record: AnswerRecord, q: QuestionView): boolean {
  return !record.correct && record.changes.some((earlier) => isCorrect(q, earlier));
}

/** A raw score, `52/65 (80%)`, with the percentage rounded down so 80 always means at least 80 (spec 3.9). */
export function scoreOf(correct: number, total: number): string {
  return `${correct}/${total} (${total === 0 ? 0 : Math.floor((100 * correct) / total)}%)`;
}

export function scoreLine(r: ExamResult): string {
  return `Score ${scoreOf(r.correct, r.total)}`;
}

/** The boss verdict: XP only on the first pass of a module (spec 3.2); a fail names the pass mark and the cooldown. */
export function bossLine(r: ExamResult, firstPass: boolean, xp: number): string {
  if (r.correct >= bossPassMark(r.total)) return firstPass && xp > 0 ? `Passed. +${xp} XP` : 'Passed.';
  return `Not passed: ${bossPassMark(r.total)}/${r.total} passes. The next boss opens in 20 h.`;
}

/** How many items a mock scored, and the real exam's unscored items (spec 4.3). */
export function scoredLine(total: number): string {
  return `${total} items scored. The real exam adds 15 unscored items you cannot tell apart.`;
}

export function domainLine(name: string, correct: number, total: number): string {
  return `${name} ${scoreOf(correct, total)}`;
}

/** The line under a session's end for badges earned inside it: `Badge: First Brew · Pass Mark`. */
export function badgeEarnedLine(names: readonly string[]): string {
  return `Badge: ${names.join(' · ')}`;
}

/** The badges whose earning event is one of the session's events, in the order they were earned. */
export function badgesIn(badges: ReadonlyMap<string, BadgeEarned>, eventIds: ReadonlySet<string>): string[] {
  return [...badges.entries()]
    .filter(([, earned]) => eventIds.has(earned.eventId))
    .sort(([, a], [, b]) => (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0))
    .map(([id]) => id);
}

/** The mock list's line until the first mock starts (spec 7.7). */
export const MOCKS_EMPTY = '4 exam forms. Best after about 7 bosses.';

/** A taken form's row on the mock list: `Taken Oct 27 · 52/65 (80%)`. */
export function takenLine(attempt: MockAttempt): string {
  return `Taken ${shortDate(attempt.day)} · ${scoreOf(attempt.correct, attempt.total)}`;
}
