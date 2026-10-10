/** Pure copy for the Progress overlay (spec 7.3 and 4.4), so the tests run without a browser. */
import type { BadgeView, QuestionView } from '../../schemas/chunks.ts';
import type { BadgeEarned, Calibration } from '../engine/badges.ts';
import { addDays } from '../engine/day.ts';
import type { MockAttempt } from '../engine/mock.ts';
import type { AnswerRecord, Cause } from '../engine/replay.ts';
import { shortDate } from './dates.ts';
import { examDateLabel } from './home.ts';
import { CAUSE_LABELS, changedRightToWrong } from './results.ts';
import { isCorrect } from './runner.ts';

/** How many study days the XP strip shows. */
const STRIP_DAYS = 14;

/** Floored, so a shown 80 always means at least 0.80. */
const percent = (value: number): number => Math.floor(100 * value);

/** XP per study day for the 14 days ending today, oldest first. */
export function dayStrip(xpByDay: ReadonlyMap<string, number>, today: string): { day: string; xp: number }[] {
  return Array.from({ length: STRIP_DAYS }, (_, i) => {
    const day = addDays(today, i - (STRIP_DAYS - 1));
    return { day, xp: xpByDay.get(day) ?? 0 };
  });
}

const side = (label: string, s: { right: number; total: number }): string =>
  s.total === 0 ? `${label}: none yet` : `${label}: ${percent(s.right / s.total)}% right (${s.total})`;

/** Sure and Not sure accuracy over the badge window (spec 3.10 Well Calibrated). */
export function calibrationLine(c: Calibration): string {
  if (c.sure.total === 0 && c.notSure.total === 0) return 'No counted answers yet.';
  return `${side('Sure', c.sure)} · ${side('Not sure', c.notSure)}`;
}

/** The cause counts of spec 4.4, in the order the results page offers them. */
export function causeLine(counts: Readonly<Record<Cause, number>>): string {
  if (counts.unknown + counts.confused + counts.misread === 0) return 'No error causes yet.';
  return (['unknown', 'confused', 'misread'] as const)
    .map((cause) => `${CAUSE_LABELS[cause]} ${counts[cause]}`)
    .join(' · ');
}

/** Changed exam answers: first pick wrong and final right, or right to wrong as the results page tags it. */
export function changeCounts(
  records: readonly AnswerRecord[],
  questions: ReadonlyMap<string, QuestionView>,
): { wrongToRight: number; rightToWrong: number } {
  let wrongToRight = 0;
  let rightToWrong = 0;
  for (const r of records) {
    const q = questions.get(r.qid);
    const first = r.changes[0];
    if (q === undefined || first === undefined) continue;
    if (changedRightToWrong(r, q)) rightToWrong += 1;
    else if (r.correct && !isCorrect(q, first)) wrongToRight += 1;
  }
  return { wrongToRight, rightToWrong };
}

/** Whether changing answers has helped so far (spec 4.4). */
export function changeVerdict(wrongToRight: number, rightToWrong: number): string {
  if (wrongToRight + rightToWrong === 0) return 'No changed answers yet.';
  const verdict =
    wrongToRight > rightToWrong ? 'helped' : wrongToRight < rightToWrong ? 'hurt' : 'made no difference';
  return `Changing answers: ${wrongToRight} wrong to right, ${rightToWrong} right to wrong. So far it has ${verdict}.`;
}

const ARRIVES: Record<NonNullable<BadgeView['arrives']>, string> = {
  labs: 'labs',
  missions: 'missions',
  capstone: 'the capstone',
};

/** `First Brew · earned Oct 12` (date by `shortDate`), its rule, or when a later phase makes it earnable. */
export function badgeLine(b: BadgeView, earned: BadgeEarned | undefined): string {
  if (earned !== undefined) return `${b.name} · earned ${shortDate(earned.day)}`;
  if (b.arrives !== null) return `${b.name} · arrives with ${ARRIVES[b.arrives]}`;
  return `${b.name} · ${b.rule}`;
}

/** `Mock A · Tue 27 Oct · 52/65 (80%)` (date by `examDateLabel`); a remix reads `Remix`. */
export function mockLine(a: MockAttempt): string {
  const name = a.form === 'remix' ? 'Remix' : `Mock ${a.form}`;
  return `${name} · ${examDateLabel(a.day)} · ${a.correct}/${a.total} (${percent(a.percent)}%)`;
}

/** `Rank Business Support+`. */
export function rankLine(name: string): string {
  return `Rank ${name}`;
}

/** `Memory 58 · Mock 66`, with `Mock -` before the first unseen mock (spec 3.9). */
export function memoryMockLine(memory: number, mock: number | null): string {
  return `Memory ${percent(memory)} · Mock ${mock === null ? '-' : percent(mock)}`;
}

/** One domain bar's text: `Cloud Concepts 62`. */
export function domainValueLine(name: string, value: number): string {
  return `${name} ${percent(value)}`;
}

/** The word to type before deleting every event and setting. */
export const RESET_WORD = 'RESET';
