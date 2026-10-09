/**
 * pnpm content:concepts: seeds content/concepts.yaml from the note tags, lists a module's pending entries,
 * and checks and applies the registry-writer results (spec 2.4).
 *   --seed            add every unregistered tag with an empty anchor
 *   --pending NN      print module NN's pending entries as JSON
 *   --check <file>    check one result file against the registry and the notes
 *   --apply <dir>     check, then apply every *.json result in <dir>, sorted by name
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CONCEPTS_FILE, loadContext } from './lib/context.ts';
import { parseGlossary } from './lib/glossary.ts';
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
} from './lib/registry.ts';

const USAGE = 'usage: pnpm content:concepts --seed | --pending NN | --check <file> | --apply <dir>';
const root = resolve(import.meta.dirname, '..', '..');
const ctx = loadContext(root);
const entries = readConcepts(ctx.read(CONCEPTS_FILE));
const [mode, arg] = process.argv.slice(2);

const write = (next: readonly RawConcept[]): void =>
  writeFileSync(join(root, CONCEPTS_FILE), stringifyConcepts(next));

/** Parses one result file, returning the result or the reasons it is not one. */
function readResult(file: string): { result: RegistryResult | null; problems: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return { result: null, problems: [`${file}: ${error instanceof Error ? error.message : String(error)}`] };
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

function fail(lines: readonly string[]): never {
  for (const line of lines) console.error(line);
  process.exit(1);
}

if (mode === '--seed') {
  const names = namesFromGlossary(parseGlossary(ctx.read('resources/glossary.md') ?? ''));
  const next = seedEntries(entries, ctx.notes, names);
  write(next);
  console.log(`${next.length - entries.length} seeded, ${next.length} in the registry`);
} else if (mode === '--pending' && arg !== undefined && /^(?:0?[1-9]|1[0-3])$/.test(arg)) {
  const module = Number(arg);
  console.log(JSON.stringify({ module, entries: pendingFor(module, entries, ctx.notes) }, null, 2));
} else if (mode === '--check' && arg !== undefined) {
  const { result, problems } = readResult(arg);
  if (result === null || problems.length > 0) fail(problems);
  console.log(`OK ${arg}: ${result.concepts.length} concepts, ${result.aliases.length} aliases`);
} else if (mode === '--apply' && arg !== undefined) {
  const files = readdirSync(arg)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(arg, name));
  const read = files.map(readResult);
  const problems = read.flatMap((r) => r.problems);
  if (problems.length > 0) fail(problems);
  const results = read.flatMap((r) => (r.result === null ? [] : [r.result]));
  const { entries: next, log } = applyResults(entries, results);
  write(next);
  for (const line of log) console.log(line);
  const filled = results.reduce((total, r) => total + r.concepts.length, 0);
  console.log(
    `${files.length} results: ${filled} concepts filled, ${log.length} aliases merged, ${next.length} in the registry`,
  );
} else {
  fail([USAGE]);
}
