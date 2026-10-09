/** Blueprint-term search and coverage by exam task (spec 2.3); Phase 2's R10 reuses missingTerms. */
import type { TaskId } from '../../../schemas/common.ts';
import type { Context } from './context.ts';
import { stripMarkdown } from './text.ts';

const collapse = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

/** Every note and shared resources file as plain text, lowercased, with whitespace collapsed to one space. */
export function resourcesText(ctx: Context): string {
  return [...ctx.notes.map((n) => n.text), ...ctx.shared.map((f) => f.text)]
    .map((text) => collapse(stripMarkdown(text)))
    .join(' ');
}

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** True when the phrase occurs in the text as a case-insensitive exact phrase, never inside a longer word. */
export function phraseIn(text: string, phrase: string): boolean {
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(collapse(phrase))}(?![a-z0-9])`).test(collapse(text));
}

export interface TermStatus {
  task: TaskId;
  term: string;
  found: boolean;
  coveredBy: string | null;
}

/** Every blueprint term with whether resources/ holds it and the concept that covers it, in blueprint order. */
export function blueprintTerms(ctx: Context): TermStatus[] {
  const text = resourcesText(ctx);
  return (ctx.blueprint?.tasks ?? []).flatMap((task) =>
    task.terms.map((t): TermStatus => {
      const term = typeof t === 'string' ? t : t.term;
      return {
        task: task.id,
        term,
        found: phraseIn(text, term),
        coveredBy: typeof t === 'string' ? null : t.coveredBy,
      };
    }),
  );
}

/** The blueprint terms that resources/ lacks and no coveredBy maps. */
export function missingTerms(ctx: Context): TermStatus[] {
  return blueprintTerms(ctx).filter((t) => !t.found && t.coveredBy === null);
}

export interface TaskCoverage {
  task: TaskId;
  text: string;
  concepts: number;
  live: number;
  exam: number;
  missing: string[];
}

/** Per task: tested concepts tagged with it, live practice questions on it, exam items (0 until Phase 3) and missing terms. */
export function coverage(ctx: Context): TaskCoverage[] {
  const missing = missingTerms(ctx);
  return (ctx.blueprint?.tasks ?? []).map((task) => ({
    task: task.id,
    text: task.text,
    concepts: ctx.concepts.filter((c) => c.tested !== false && c.tasks.includes(task.id)).length,
    live: ctx.questions.filter(
      (e) => e.q.status === 'live' && e.q.pool === 'practice' && e.q.task === task.id,
    ).length,
    exam: 0,
    missing: missing.filter((t) => t.task === task.id).map((t) => t.term),
  }));
}

const CONCEPTS_MD = 'resources/concepts.md';
const TAG_LINE = /^- `([a-z0-9-]+)`:/;

/** Tags listed in resources/concepts.md against the tags in the lesson frontmatter, one line per tag on one side only. */
export function conceptsMdDrift(ctx: Context): string[] {
  const listed = new Set(
    (ctx.shared.find((f) => f.path === CONCEPTS_MD)?.text ?? '')
      .split('\n')
      .flatMap((line) => TAG_LINE.exec(line)?.[1] ?? []),
  );
  const tagged = new Set(ctx.notes.flatMap((n) => (n.kind === 'lesson' ? (n.fm?.concepts ?? []) : [])));
  return [
    ...[...listed].filter((t) => !tagged.has(t)).map((t) => `in concepts.md only: ${t}`),
    ...[...tagged].filter((t) => !listed.has(t)).map((t) => `in frontmatter only: ${t}`),
  ];
}
