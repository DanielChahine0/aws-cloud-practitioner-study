/** Pure copy for the Progress overlay (spec 7.3 and 4.4), so the tests run without a browser. */
import type { BadgeView, ExamItemRef, QuestionView } from '../../schemas/chunks.ts';
import type { BadgeEarned, Calibration } from '../engine/badges.ts';
import { addDays } from '../engine/day.ts';
import { type MemoryContent, resolveConcept } from '../engine/memory.ts';
import type { MockAttempt } from '../engine/mock.ts';
import type { AnswerRecord, Cause } from '../engine/replay.ts';
import { shortDate } from './dates.ts';
import { examDateLabel } from './home.ts';
import { CAUSE_LABELS, changedRightToWrong, scoreOf } from './results.ts';
import { isCorrect } from './runner.ts';

/** How many study days the XP strip shows. */
const STRIP_DAYS = 14;

/** Floored, so a shown 80 always means at least 0.80; a count ratio goes through `countPercent` instead. */
const percent = (value: number): number => Math.floor(100 * value);

/** XP per study day for the 14 days ending today, oldest first. */
export function dayStrip(xpByDay: ReadonlyMap<string, number>, today: string): { day: string; xp: number }[] {
  return Array.from({ length: STRIP_DAYS }, (_, i) => {
    const day = addDays(today, i - (STRIP_DAYS - 1));
    return { day, xp: xpByDay.get(day) ?? 0 };
  });
}

/** Floored from the counts, not from their ratio, whose float error can drop 29/50 to 57. */
const countPercent = (right: number, total: number): number => Math.floor((100 * right) / total);

const side = (label: string, s: { right: number; total: number }): string =>
  s.total === 0 ? `${label}: none yet` : `${label}: ${countPercent(s.right, s.total)}% right (${s.total})`;

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

/** The chunks the change verdict reads: a mock item's exam form, and a boss item's module while its concept is tested. */
export function changeChunks(
  records: readonly AnswerRecord[],
  items: Readonly<Record<string, ExamItemRef>>,
  content: MemoryContent | null,
): { forms: string[]; modules: number[] } {
  const forms = new Set<string>();
  const modules = new Set<number>();
  for (const r of records) {
    const item = items[r.qid];
    if (item !== undefined) {
      forms.add(item.form);
      continue;
    }
    const concept = content === null ? null : resolveConcept(content, r.concept);
    const module = concept === null ? undefined : content?.concepts.get(concept)?.module;
    if (module !== undefined) modules.add(module);
  }
  return { forms: [...forms], modules: [...modules] };
}

/**
 * Whether the change verdict can be written: the content index is in and every chunk it reads has arrived.
 * A question missing from an arrived chunk (a retired item, say) is skipped by `changeCounts`, never waited for.
 */
export function changeChunksLoaded(
  records: readonly AnswerRecord[],
  content: MemoryContent | null,
  chunks: { forms: readonly string[]; modules: readonly number[] },
  modules: ReadonlyMap<number, unknown>,
  forms: ReadonlyMap<string, unknown>,
): boolean {
  if (records.length === 0) return true;
  return (
    content !== null && chunks.modules.every((n) => modules.has(n)) && chunks.forms.every((f) => forms.has(f))
  );
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

/** `Mock A · Tue 27 Oct · 52/65 (80%)` (date by `examDateLabel`, score by `scoreOf` as on Results); a remix reads `Remix`. */
export function mockLine(a: MockAttempt): string {
  const name = a.form === 'remix' ? 'Remix' : `Mock ${a.form}`;
  return `${name} · ${examDateLabel(a.day)} · ${scoreOf(a.correct, a.total)}`;
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
