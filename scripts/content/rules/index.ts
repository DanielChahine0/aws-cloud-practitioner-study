import type { RuleId } from '../../../schemas/validate-config.ts';
import { type Context, type Finding, FORMS_FILE, POOL_DIR } from '../lib/context.ts';
import { r01 } from './r01-schema.ts';
import { r02 } from './r02-ids.ts';
import { r03 } from './r03-answer-counts.ts';
import { r04 } from './r04-explanations.ts';
import { r05 } from './r05-evidence.ts';
import { r06 } from './r06-references.ts';
import { r07 } from './r07-originality.ts';
import { r08 } from './r08-style.ts';
import { r09 } from './r09-verified.ts';
import { r10 } from './r10-coverage.ts';
import { r13 } from './r13-sources.ts';
import type { Rule } from './rule.ts';

/** The implemented rules, in id order; each rule task in this phase adds its rule here. */
export const RULES: readonly Rule[] = [r01, r02, r03, r04, r05, r06, r07, r08, r09, r10, r13];

const rank = (id: RuleId): number => Number(id.slice(1));

/** Whether a finding's file holds exam-pool text, so its messages must carry ids and counts only (spec 2.6). */
export function isExamFile(file: string): boolean {
  return file.startsWith(`${POOL_DIR}/`) || file === FORMS_FILE;
}

/**
 * A message cut down to what may be shown for an exam file: a YAML error keeps only its position, and any other
 * message keeps the part before its first double quote, where rule messages quote item text.
 */
export function redactMessage(message: string): string {
  if (message.startsWith('YAML:')) {
    const at = /at line (\d+), column (\d+)/.exec(message);
    return at === null ? 'YAML: parse error' : `YAML: parse error at line ${at[1]}, column ${at[2]}`;
  }
  const quote = message.indexOf('"');
  return quote === -1 ? message : `${message.slice(0, quote)}"..."`;
}

/** The finding as it may be shown: ids and counts only for exam-pool and form files, unchanged for every other file. */
export function redact(f: Finding): Finding {
  return isExamFile(f.file) ? { ...f, message: redactMessage(f.message) } : f;
}

/** Runs the given rules and reports any id that has no implementation yet; exam findings come back redacted. */
export function runRules(ctx: Context, ids: readonly RuleId[]): { findings: Finding[]; missing: RuleId[] } {
  const missing = ids.filter((id) => !RULES.some((rule) => rule.id === id));
  const findings = RULES.filter((rule) => ids.includes(rule.id))
    .flatMap((rule) => rule.run(ctx))
    .map(redact);
  findings.sort(
    (a, b) => rank(a.rule) - rank(b.rule) || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0),
  );
  return { findings, missing };
}

export function formatFinding(f: Finding): string {
  return `${f.rule} ${f.file}${f.line === undefined ? '' : `:${f.line}`}  ${f.message}`;
}
