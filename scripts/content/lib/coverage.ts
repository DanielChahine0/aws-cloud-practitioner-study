/** Blueprint-term search, practice and exam-pool counts, and coverage by exam task (spec 2.3, 2.6); R10 reuses them. */
import type { TaskId } from '../../../schemas/common.ts';
import type { DomainIdValue } from '../../../schemas/ids.ts';
import type { Question } from '../../../schemas/question.ts';
import { domainOf } from '../../../src/engine/quotas.ts';
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

/** Questions of one pool per concept id that pass `keep`, with a question tagged by an alias counted for the concept that lists it. */
function conceptCounts(
  ctx: Context,
  pool: Question['pool'],
  keep: (q: Question) => boolean,
): Map<string, number> {
  const target = new Map<string, string>();
  for (const c of ctx.concepts) {
    for (const alias of c.aliases ?? []) target.set(alias, c.id);
  }
  const counts = new Map<string, number>();
  for (const { q, incident } of ctx.questions) {
    if (incident !== null || q.pool !== pool || !keep(q)) continue;
    const id = target.get(q.concept) ?? q.concept;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Practice questions per concept id that pass `keep`, aliases counted for the concept that lists them. */
export function practiceCounts(ctx: Context, keep: (q: Question) => boolean): Map<string, number> {
  return conceptCounts(ctx, 'practice', keep);
}

/** Exam-pool items per concept id that pass `keep`, aliases counted for the concept that lists them. */
export function examConceptCounts(ctx: Context, keep: (q: Question) => boolean): Map<string, number> {
  return conceptCounts(ctx, 'exam', keep);
}

/** Exam-pool items that pass `keep`, per quota cell key `<module>|<task>`, the module being the pool file's. */
export function examCounts(ctx: Context, keep: (q: Question) => boolean): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { module, q } of ctx.questions) {
    if (q.pool !== 'exam' || !keep(q)) continue;
    const key = `${module}|${q.task}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Multi-response exam-pool items that pass `keep`, per domain. */
export function examMultiByDomain(ctx: Context, keep: (q: Question) => boolean): Map<DomainIdValue, number> {
  const counts = new Map<DomainIdValue, number>();
  for (const { q } of ctx.questions) {
    if (q.pool !== 'exam' || q.type !== 'multi' || !keep(q)) continue;
    const d = domainOf(q.task);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return counts;
}

export interface TaskCoverage {
  task: TaskId;
  text: string;
  concepts: number;
  live: number;
  exam: number;
  missing: string[];
}

/** Per task: tested concepts tagged with it, live practice questions and live exam-pool items on it, and missing terms. */
export function coverage(ctx: Context): TaskCoverage[] {
  const missing = missingTerms(ctx);
  return (ctx.blueprint?.tasks ?? []).map((task) => ({
    task: task.id,
    text: task.text,
    concepts: ctx.concepts.filter((c) => c.tested !== false && c.tasks.includes(task.id)).length,
    live: ctx.questions.filter(
      (e) => e.incident === null && e.q.status === 'live' && e.q.pool === 'practice' && e.q.task === task.id,
    ).length,
    exam: ctx.questions.filter((e) => e.q.status === 'live' && e.q.pool === 'exam' && e.q.task === task.id)
      .length,
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
