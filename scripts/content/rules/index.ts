import type { RuleId } from '../../../schemas/validate-config.ts';
import type { Context, Finding } from '../lib/context.ts';
import { r01 } from './r01-schema.ts';
import { r02 } from './r02-ids.ts';
import { r03 } from './r03-answer-counts.ts';
import { r04 } from './r04-explanations.ts';
import { r05 } from './r05-evidence.ts';
import { r06 } from './r06-references.ts';
import { r07 } from './r07-originality.ts';
import { r08 } from './r08-style.ts';
import { r09 } from './r09-verified.ts';
import { r13 } from './r13-sources.ts';
import type { Rule } from './rule.ts';

/** The implemented rules, in id order; each rule task in this phase adds its rule here. */
export const RULES: readonly Rule[] = [r01, r02, r03, r04, r05, r06, r07, r08, r09, r13];

const rank = (id: RuleId): number => Number(id.slice(1));

/** Runs the given rules and reports any id that has no implementation yet. */
export function runRules(ctx: Context, ids: readonly RuleId[]): { findings: Finding[]; missing: RuleId[] } {
  const missing = ids.filter((id) => !RULES.some((rule) => rule.id === id));
  const findings = RULES.filter((rule) => ids.includes(rule.id)).flatMap((rule) => rule.run(ctx));
  findings.sort(
    (a, b) => rank(a.rule) - rank(b.rule) || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0),
  );
  return { findings, missing };
}

export function formatFinding(f: Finding): string {
  return `${f.rule} ${f.file}${f.line === undefined ? '' : `:${f.line}`}  ${f.message}`;
}
