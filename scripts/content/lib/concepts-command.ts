import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONCEPTS_FILE, type Context, loadContext } from './context.ts';
import { parseGlossary } from './glossary.ts';
import {
  applyResults,
  checkResult,
  namesFromGlossary,
  pendingFor,
  type RawConcept,
  RegistryResult,
  readConcepts,
  seedEntries,
  stringifyConcepts,
} from './registry.ts';

export const USAGE = 'usage: pnpm content:concepts --seed | --pending NN | --check <file> | --apply <dir>';

/** What one run prints, line by line, and its exit code. */
export interface CommandOutput {
  code: 0 | 1;
  out: string[];
  err: string[];
}

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const ok = (out: string[]): CommandOutput => ({ code: 0, out, err: [] });
const failed = (err: string[]): CommandOutput => ({ code: 1, out: [], err });

/** Parses one result file, returning the result or the reasons it is not one. */
function readResult(
  file: string,
  entries: readonly RawConcept[],
  ctx: Context,
): { result: RegistryResult | null; problems: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return { result: null, problems: [`${file}: ${errorText(error)}`] };
  }
  const parsed = RegistryResult.safeParse(data);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${file}: ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`,
    );
    return { result: null, problems };
  }
  return {
    result: parsed.data,
    problems: checkResult(parsed.data, entries, ctx.notes).map((p) => `${file}: ${p}`),
  };
}

function run(root: string, args: readonly string[]): CommandOutput {
  const [mode, arg] = args;
  const ctx = loadContext(root);
  const entries = readConcepts(ctx.read(CONCEPTS_FILE));
  const write = (next: readonly RawConcept[]): void =>
    writeFileSync(join(root, CONCEPTS_FILE), stringifyConcepts(next));

  if (mode === '--seed') {
    const names = namesFromGlossary(parseGlossary(ctx.read('resources/glossary.md') ?? ''));
    const next = seedEntries(entries, ctx.notes, names);
    write(next);
    return ok([`${next.length - entries.length} seeded, ${next.length} in the registry`]);
  }
  if (mode === '--pending' && arg !== undefined && /^(?:0?[1-9]|1[0-3])$/.test(arg)) {
    const module = Number(arg);
    return ok([JSON.stringify({ module, entries: pendingFor(module, entries, ctx.notes) }, null, 2)]);
  }
  if (mode === '--check' && arg !== undefined) {
    const { result, problems } = readResult(arg, entries, ctx);
    if (result === null || problems.length > 0) return failed(problems);
    return ok([`OK ${arg}: ${result.concepts.length} concepts, ${result.aliases.length} aliases`]);
  }
  if (mode === '--apply' && arg !== undefined) {
    const files = readdirSync(arg)
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => join(arg, name));
    const read = files.map((file) => readResult(file, entries, ctx));
    const problems = read.flatMap((r) => r.problems);
    if (problems.length > 0) return failed(problems);
    const results = read.flatMap((r) => (r.result === null ? [] : [r.result]));
    const { entries: next, log, merged } = applyResults(entries, results);
    write(next);
    const filled = results.reduce((total, r) => total + r.concepts.length, 0);
    return ok([
      ...log,
      `${files.length} results: ${filled} concepts filled, ${merged} aliases merged, ${next.length} in the registry`,
    ]);
  }
  return failed([USAGE]);
}

/**
 * pnpm content:concepts against the repository at `root` (spec 2.4): seeds the registry from the note tags,
 * lists a module's pending entries, and checks and applies the registry-writer results.
 * Every problem, including an unreadable registry, comes back as lines on `err` with exit code 1, never as a throw.
 */
export function runConcepts(root: string, args: readonly string[]): CommandOutput {
  try {
    return run(root, args);
  } catch (error) {
    return failed(errorText(error).split('\n'));
  }
}
