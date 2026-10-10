/** The `--draft <file>` and `--demote` modes of pnpm content:validate (spec 2.7, 2.9, 5.1 and 8.4). */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MAX_PER_CONCEPT } from '../../../src/engine/quotas.ts';
import { formatFinding, isExamFile, redact, redactMessage } from '../rules/index.ts';
import { r01 } from '../rules/r01-schema.ts';
import { r02 } from '../rules/r02-ids.ts';
import { r03 } from '../rules/r03-answer-counts.ts';
import { r04 } from '../rules/r04-explanations.ts';
import { r05 } from '../rules/r05-evidence.ts';
import { r06 } from '../rules/r06-references.ts';
import { r07 } from '../rules/r07-originality.ts';
import { r08 } from '../rules/r08-style.ts';
import { r11 } from '../rules/r11-labs.ts';
import type { Rule } from '../rules/rule.ts';
import type { Context, LessonNote, QuestionEntry } from './context.ts';
import { examConceptCounts } from './coverage.ts';
import { editQuestionFile, type QuestionEdit } from './question-files.ts';
import { coverageProblems, isOpen, styleProblems } from './style.ts';

/** The rules a draft file must pass as if it were live, in id order. */
const DRAFT_RULES: readonly Rule[] = [r01, r03, r04, r05, r06, r07];

/** The context with every non-retired question of `file` treated as live and unstamped, so the live-only rules check it. */
export function asLive(ctx: Context, file: string): Context {
  const questions = ctx.questions.map((entry): QuestionEntry => {
    if (entry.path !== file || entry.q.status === 'retired') return entry;
    const { verified: _verified, ...rest } = entry.q;
    return { ...entry, q: { ...rest, status: 'live' } };
  });
  return { ...ctx, questions };
}

/**
 * The exam-pool cap a pool draft must keep (spec 2.6): no concept of the file above 4 open exam items over the whole
 * pool. A task outside the concept's tasks is R6's finding, which `--draft` already runs.
 */
function examDraftProblems(file: string, ctx: Context): string[] {
  const open = examConceptCounts(ctx, isOpen);
  const aliasOf = new Map<string, string>();
  for (const c of ctx.concepts) for (const alias of c.aliases ?? []) aliasOf.set(alias, c.id);
  const concepts = new Set(
    ctx.questions
      .filter((e) => e.path === file && isOpen(e.q))
      .map((e) => aliasOf.get(e.q.concept) ?? e.q.concept),
  );
  return [...concepts]
    .sort()
    .filter((id) => (open.get(id) ?? 0) > MAX_PER_CONCEPT)
    .map((id) => `concept ${id} would hold ${open.get(id)} exam items; at most ${MAX_PER_CONCEPT}`);
}

/** Every problem `--draft` reports for one question file: rule findings, style problems and missing coverage or the exam cap. */
export function draftCheck(ctx: Context, file: string): { questions: number; problems: string[] } {
  const live = asLive(ctx, file);
  const findings = DRAFT_RULES.flatMap((rule) => rule.run(live)).filter((f) => f.file === file);
  findings.sort((a, b) => Number(a.rule.slice(1)) - Number(b.rule.slice(1)) || (a.line ?? 0) - (b.line ?? 0));
  const exam = isExamFile(file);
  const problems = findings.map((f) => formatFinding(redact(f)));
  const notes = new Map(ctx.notes.map((n) => [n.id, n] as const));
  const entries = ctx.questions.filter((e) => e.path === file && e.q.status !== 'retired');
  for (const entry of entries) {
    const note = notes.get(entry.q.note);
    const lesson = note?.kind === 'lesson' ? (note as LessonNote) : undefined;
    for (const problem of styleProblems(entry.q, lesson)) {
      problems.push(`${file}:${entry.line}  ${entry.q.id}: ${exam ? redactMessage(problem) : problem}`);
    }
  }
  for (const problem of exam ? examDraftProblems(file, ctx) : coverageProblems(file, ctx)) {
    problems.push(`${file}  ${problem}`);
  }
  return { questions: entries.length, problems };
}

/** The rules a lab draft must pass, in id order: schema, ids, references, originality, style and the replay. */
const LAB_DRAFT_RULES: readonly Rule[] = [r01, r02, r06, r07, r08, r11];

/** Every problem `--draft` reports for one lab file: the findings of the lab rules on that file, R11 included. */
export function labDraftCheck(ctx: Context, file: string): { labs: number; problems: string[] } {
  const findings = LAB_DRAFT_RULES.flatMap((rule) => rule.run(ctx)).filter((f) => f.file === file);
  findings.sort((a, b) => Number(a.rule.slice(1)) - Number(b.rule.slice(1)) || (a.line ?? 0) - (b.line ?? 0));
  return { labs: ctx.labs.filter((e) => e.path === file).length, problems: findings.map(formatFinding) };
}

/** Sets every live question that fails R5 back to draft in its file, and returns one line per question it demoted. */
export function demote(ctx: Context): string[] {
  const failing = new Set(r05.run(ctx).map((f) => `${f.file}:${f.line ?? 0}`));
  const byFile = new Map<string, QuestionEntry[]>();
  for (const entry of ctx.questions) {
    if (entry.q.status !== 'live' || !failing.has(`${entry.path}:${entry.line}`)) continue;
    byFile.set(entry.path, [...(byFile.get(entry.path) ?? []), entry]);
  }
  const log: string[] = [];
  for (const [path, entries] of byFile) {
    const edits = new Map<string, QuestionEdit>(entries.map((e) => [e.q.id, { status: 'draft' }]));
    writeFileSync(join(ctx.root, path), editQuestionFile(ctx.read(path) ?? '', edits));
    for (const e of entries) {
      log.push(`demoted ${e.q.id} (${path}): its evidence no longer matches ${e.q.note}`);
    }
  }
  return log;
}
