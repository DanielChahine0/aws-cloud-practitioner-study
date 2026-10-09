import type { RuleId } from '../../../schemas/validate-config.ts';
import type { Context, Finding } from '../lib/context.ts';

/** A validator rule: a pure function from the loaded content to its findings (spec 2.9). */
export interface Rule {
  id: RuleId;
  title: string;
  run: (ctx: Context) => Finding[];
}

/** Builds a finding, leaving `line` out when it is unknown. */
export function finding(rule: RuleId, file: string, message: string, line?: number): Finding {
  return line === undefined ? { rule, file, message } : { rule, file, line, message };
}
