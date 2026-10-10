/** The runner's pure answer logic, so the tests run without a browser. */
import type { ContentIndex, ModuleChunk, QuestionView } from '../../schemas/chunks.ts';
import type { Mode } from '../../schemas/events.ts';
import type { SessionSummary } from '../engine/memory.ts';
import { mulberry32, seedFor, shuffle } from '../engine/rng.ts';

/** Option ids, or `[leftId, rightId]` pairs for a match, with ids `l1`.. and `r1`.. in authored pair order. */
export type Picked = string[] | [string, string][];

export const leftId = (i: number): string => `l${i + 1}`;
export const rightId = (i: number): string => `r${i + 1}`;

/** The order the options, or a match's rights, show in; a match's lefts keep their authored order. */
export function displayOrder(q: QuestionView, seed: number): string[] {
  const ids = q.type === 'match' ? q.pairs.map((_, i) => rightId(i)) : q.options.map((o) => o.id);
  return shuffle(ids, mulberry32(seedFor(seed, q.id)));
}

const isPairs = (picked: Picked): picked is [string, string][] => picked.some((p) => Array.isArray(p));

export function canSubmit(q: QuestionView, picked: Picked): boolean {
  if (q.type === 'match') {
    if (!isPairs(picked)) return false;
    const lefts = new Set(picked.map(([l]) => l));
    return q.pairs.every((_, i) => lefts.has(leftId(i)));
  }
  if (isPairs(picked)) return false;
  return picked.length === (q.type === 'single' ? 1 : (q.select ?? 0));
}

export function isCorrect(q: QuestionView, picked: Picked): boolean {
  if (!canSubmit(q, picked)) return false;
  if (q.type === 'match') {
    const pairs = new Map((picked as [string, string][]).map(([l, r]) => [l, r]));
    return q.pairs.every((_, i) => pairs.get(leftId(i)) === rightId(i));
  }
  const chosen = new Set(picked as string[]);
  const correct = q.options.filter((o) => o.correct).map((o) => o.id);
  return chosen.size === correct.length && correct.every((id) => chosen.has(id));
}

/** The tested concepts homed in a note, in the order of their anchors in the note. */
export function homedConcepts(idx: ContentIndex, chunk: ModuleChunk, noteId: string, slug: string): string[] {
  const headings = chunk.lessons[slug]?.headings.map((h) => h.id) ?? [];
  const at = (anchor: string): number => {
    const i = headings.indexOf(anchor);
    return i === -1 ? headings.length : i;
  };
  return idx.concepts
    .filter((c) => c.home === noteId && c.tested)
    .sort((a, b) => at(a.anchor) - at(b.anchor))
    .map((c) => c.id);
}

/** Whether the module quiz can start: it opens after one lesson of the module is done (spec 4.1). */
export function quizAvailability({
  anyLessonDone,
  questionCount,
}: {
  anyLessonDone: boolean;
  questionCount: number;
}): 'open' | 'locked' | 'empty' {
  if (questionCount === 0) return 'empty';
  return anyLessonDone ? 'open' : 'locked';
}

/** Text as "Read in notes" compares it: trimmed, with each run of whitespace as one space. */
export function collapseSpace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The end of a session (spec 7.3): `9/12 · +95 XP · 3 concepts back tomorrow`, leaving out each part at 0. */
export function endSummaryLine(s: SessionSummary): string {
  const parts = [`${s.correct}/${s.total}`];
  if (s.xp > 0) parts.push(`+${s.xp} XP`);
  if (s.backTomorrow > 0) {
    parts.push(`${s.backTomorrow} ${s.backTomorrow === 1 ? 'concept' : 'concepts'} back tomorrow`);
  }
  return parts.join(' · ');
}

/** What the live region reads after an answer (spec 7.5): `Correct. Plus 10 XP`, or the verdict alone at 0 XP. */
export function verdictAnnouncement(correct: boolean, xp: number): string {
  const verdict = correct ? 'Correct.' : 'Incorrect.';
  return xp > 0 ? `${verdict} Plus ${xp} XP` : verdict;
}

const MODE_LABELS: Record<Mode, string> = {
  check: 'Lesson check',
  quiz: 'Module quiz',
  focus: 'Focus quiz',
  review: 'Review',
  lightning: 'Lightning round',
  incident: 'Incident',
  boss: 'Boss',
  mock: 'Mock exam',
};

export function modeLabel(mode: Mode): string {
  return MODE_LABELS[mode];
}
