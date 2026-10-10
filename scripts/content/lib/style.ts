/**
 * The mechanical half of content/STYLE.md (spec 2.7): checks a script can make on one question or one module.
 * The critic agent judges the rest, such as parallel options and clue words.
 */
import type { Question } from '../../../schemas/question.ts';
import { NEEDS_DANI_ATTEMPTS } from './checks.ts';
import type { Context, LessonNote } from './context.ts';

/** Live practice questions per tested concept that the pilot and Phase 2's R10 aim for. */
export const PER_CONCEPT_TARGET = 2;

const BANNED: readonly (readonly [RegExp, string])[] = [
  [/\ball of the above\b/i, 'uses "all of the above"'],
  [/\bnone of the above\b/i, 'uses "none of the above"'],
  [/\bboth [a-f] and [a-f]\b/i, 'uses "both A and B"'],
  [/\b(?:option|answer|choice) [a-f]\b/i, 'uses a letter reference'],
];
const NEGATIVE = /\b(?:not|except)\b/i;
const BOLD_NEGATIVE = /\*\*(?:NOT|EXCEPT)\*\*/g;
// A digit run that starts a word, so the 3 in "S3" and the 2 in "EC2" are names, not numbers.
const NUMBER = /(?<![A-Za-z0-9])\d[\d,.]*%?/g;
const OLD_PLANS = /\bDeveloper Support\b|\bBusiness Support\b(?!\+)|\bEnterprise On-Ramp\b/;

const numbersIn = (text: string): string[] => (text.match(NUMBER) ?? []).map((n) => n.replace(/[.,]+$/, ''));

/** The visible answer texts: option texts, or each pair's left and right. */
function answerTexts(q: Question): string[] {
  return q.type === 'match' ? q.pairs.flatMap((p) => [p.left, p.right]) : q.options.map((o) => o.text);
}

/** Every text a question's author writes; evidence lines are note lines, which keep the course's names. */
function allTexts(q: Question): string[] {
  const whys = q.type === 'match' ? q.pairs.map((p) => p.why) : q.options.map((o) => o.why);
  return [q.stem, ...answerTexts(q), ...whys, q.takeaway];
}

/** A stem that negates with "not" or "except" in any case. */
export function isNegativeStem(stem: string): boolean {
  return NEGATIVE.test(stem);
}

/** The style problems a script can find in one question; `note` is its cited lesson note. */
export function styleProblems(q: Question, note: LessonNote | undefined): string[] {
  const problems: string[] = [];
  const visible = [q.stem, ...answerTexts(q)];
  for (const [pattern, message] of BANNED) {
    if (visible.some((text) => pattern.test(text))) problems.push(message);
  }
  if (isNegativeStem(q.stem.replace(BOLD_NEGATIVE, ''))) {
    problems.push('a negative stem must write NOT in bold capitals');
  }
  const stated = new Set(numbersIn(note?.body ?? ''));
  const reported = new Set<string>();
  for (const n of visible.flatMap(numbersIn)) {
    if (n === '' || stated.has(n) || reported.has(n)) continue;
    reported.add(n);
    problems.push(`the number "${n}" is not in ${q.note}`);
  }
  if (allTexts(q).some((text) => OLD_PLANS.test(text))) {
    problems.push('names a Support plan the exam no longer uses');
  }
  return problems;
}

/** Lab text that names a retired Support plan, one problem per text, so labs use the exam's current names (spec 5). */
export function labStyleProblems(texts: readonly string[]): string[] {
  return texts.filter((text) => OLD_PLANS.test(text)).map((text) => `retired Support plan name in '${text}'`);
}

export interface ModuleStyle {
  singles: number;
  correctLongest: number;
  negatives: number;
  total: number;
  byType: Record<'single' | 'multi' | 'match', number>;
}

/** Counts for the style limits of one module's questions of one pool, over the non-retired ones; the caller picks the pool. */
export function moduleStyle(questions: readonly Question[]): ModuleStyle {
  const counted = questions.filter((q) => q.status !== 'retired');
  const byType = { single: 0, multi: 0, match: 0 };
  let correctLongest = 0;
  let negatives = 0;
  for (const q of counted) {
    byType[q.type] += 1;
    if (isNegativeStem(q.stem)) negatives += 1;
    if (q.type !== 'single') continue;
    const correct = q.options.find((o) => o.correct);
    if (correct === undefined) continue;
    if (q.options.every((o) => o === correct || o.text.length < correct.text.length)) correctLongest += 1;
  }
  return { singles: byType.single, correctLongest, negatives, total: counted.length, byType };
}

/** A question that is live or can still go live: a draft with fewer than NEEDS_DANI_ATTEMPTS failed check rounds. */
export function isOpen(q: Question): boolean {
  return q.status === 'live' || (q.status === 'draft' && (q.review?.attempts ?? 0) < NEEDS_DANI_ATTEMPTS);
}

/** The tested concepts homed in a question file's note that still lack PER_CONCEPT_TARGET open questions there. */
export function coverageProblems(file: string, ctx: Context): string[] {
  const match = /^content\/questions\/(\d{2})-[a-z0-9-]+\/\d{2}-([a-z0-9-]+)\.yaml$/.exec(file);
  if (match === null) return [`${file} is not a question file path`];
  const noteId = `m${match[1]}/${match[2]}`;
  const counts = new Map<string, number>();
  for (const entry of ctx.questions) {
    if (entry.path === file && isOpen(entry.q)) {
      counts.set(entry.q.concept, (counts.get(entry.q.concept) ?? 0) + 1);
    }
  }
  const problems: string[] = [];
  for (const c of ctx.concepts) {
    if (c.home !== noteId || c.tested === false) continue;
    const n = [c.id, ...(c.aliases ?? [])].reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
    if (n < PER_CONCEPT_TARGET) {
      const noun = n === 1 ? 'question' : 'questions';
      problems.push(
        `concept ${c.id} has ${n} ${noun} that can still go live; it needs ${PER_CONCEPT_TARGET}`,
      );
    }
  }
  return problems;
}
