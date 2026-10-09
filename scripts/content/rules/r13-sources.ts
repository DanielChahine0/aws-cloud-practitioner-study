import { BLUEPRINT_FILE, type Finding } from '../lib/context.ts';
import { parseUpdateLine, UPDATE_PREFIX } from '../lib/update-line.ts';
import { finding, type Rule } from './rule.ts';

const HOSTS = new Set(['aws.amazon.com', 'docs.aws.amazon.com']);
/** A source must have been re-checked within this many days (spec 2.3). */
export const MAX_AGE_DAYS = 180;
const DAY_MS = 86_400_000;

/** Why a source fails R13, or null when it passes. */
export function sourceProblem(url: string, verifiedOn: string, today: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return `'${url}' is not a URL`;
  }
  if (!HOSTS.has(host)) return `source ${url} is not on aws.amazon.com or docs.aws.amazon.com`;
  const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${verifiedOn}T00:00:00Z`)) / DAY_MS;
  if (Number.isNaN(age)) return `verified_on '${verifiedOn}' is not a date`;
  if (age < 0) return `verified_on ${verifiedOn} is in the future`;
  if (age > MAX_AGE_DAYS) {
    return `verified_on ${verifiedOn} is ${age} days old (limit ${MAX_AGE_DAYS}); re-check the source and update the date`;
  }
  return null;
}

/** R13 Sources: every update line, blueprint entry and mission cites an AWS page re-checked within 180 days. */
export const r13: Rule = {
  id: 'R13',
  title: 'Sources',
  run(ctx) {
    const out: Finding[] = [];
    const check = (file: string, url: string, verifiedOn: string, line?: number): void => {
      const problem = sourceProblem(url, verifiedOn, ctx.today);
      if (problem !== null) out.push(finding('R13', file, problem, line));
    };

    for (const note of ctx.notes) {
      for (const [i, line] of note.text.split('\n').entries()) {
        if (!line.trimStart().startsWith(UPDATE_PREFIX)) continue;
        const update = parseUpdateLine(line);
        if (update === null) {
          out.push(
            finding('R13', note.path, 'malformed Exam guide update line; see spec 2.3 for the format', i + 1),
          );
        } else {
          check(note.path, update.url, update.verifiedOn, i + 1);
        }
      }
    }

    const blueprint = ctx.blueprint;
    if (blueprint !== null) {
      check(BLUEPRINT_FILE, blueprint.guide.url, blueprint.guide.verified_on);
      for (const d of blueprint.domains) check(BLUEPRINT_FILE, d.url, d.verified_on);
      for (const t of blueprint.tasks) check(BLUEPRINT_FILE, t.url, t.verified_on);
    }

    for (const mission of ctx.missions) {
      for (const source of mission.fm?.sources ?? []) check(mission.path, source.url, source.verified_on);
    }
    return out;
  },
};
