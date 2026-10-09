/** The `--draft <file>` and `--demote` modes of pnpm content:validate (spec 2.7, 2.9 and 8.4). */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatFinding } from '../rules/index.ts';
import { r01 } from '../rules/r01-schema.ts';
import { r03 } from '../rules/r03-answer-counts.ts';
import { r04 } from '../rules/r04-explanations.ts';
import { r05 } from '../rules/r05-evidence.ts';
import { r06 } from '../rules/r06-references.ts';
import { r07 } from '../rules/r07-originality.ts';
import type { Rule } from '../rules/rule.ts';
import type { Context, LessonNote, QuestionEntry } from './context.ts';
import { editQuestionFile, type QuestionEdit } from './question-files.ts';
import { coverageProblems, styleProblems } from './style.ts';

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

/** Every problem `--draft` reports for one question file: rule findings, style problems and missing coverage. */
export function draftCheck(ctx: Context, file: string): { questions: number; problems: string[] } {
  const live = asLive(ctx, file);
  const findings = DRAFT_RULES.flatMap((rule) => rule.run(live)).filter((f) => f.file === file);
  findings.sort((a, b) => Number(a.rule.slice(1)) - Number(b.rule.slice(1)) || (a.line ?? 0) - (b.line ?? 0));
  const problems = findings.map(formatFinding);
  const notes = new Map(ctx.notes.map((n) => [n.id, n] as const));
  const entries = ctx.questions.filter((e) => e.path === file && e.q.status !== 'retired');
  for (const entry of entries) {
    const note = notes.get(entry.q.note);
    const lesson = note?.kind === 'lesson' ? (note as LessonNote) : undefined;
    for (const problem of styleProblems(entry.q, lesson)) {
      problems.push(`${file}:${entry.line}  ${entry.q.id}: ${problem}`);
    }
  }
  for (const problem of coverageProblems(file, ctx)) problems.push(`${file}  ${problem}`);
  return { questions: entries.length, problems };
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
