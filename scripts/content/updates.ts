/**
 * pnpm content:updates: checks and applies update-writer results (spec 2.3).
 *   --check <file>  check one .results/updates/<task>.json against the notes, the registry and the blueprint
 *   --apply <dir>   check, then apply every *.json result in <dir>, sorted by name
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadContext } from './lib/context.ts';
import { applyUpdates, checkUpdates, UpdateResult } from './lib/updates.ts';

const root = resolve(import.meta.dirname, '..', '..');
const [flag, target] = process.argv.slice(2);
const fail = (lines: readonly string[]): never => {
  for (const line of lines) console.error(line);
  process.exit(1);
};

function parse(file: string): UpdateResult {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return fail([`${file}: ${error instanceof Error ? error.message : String(error)}`]);
  }
  const parsed = UpdateResult.safeParse(data);
  if (!parsed.success) {
    return fail(parsed.error.issues.map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`));
  }
  return parsed.data;
}

if (flag === '--check' && target !== undefined) {
  const result = parse(target);
  const problems = checkUpdates(result, loadContext(root));
  if (problems.length > 0) fail(problems.map((p) => `${target}: ${p}`));
  console.log(`OK ${target}: ${result.updates.length} update lines, ${result.coveredBy.length} coveredBy`);
} else if (flag === '--apply' && target !== undefined) {
  const files = readdirSync(target)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const results = files.map((f) => parse(join(target, f)));
  try {
    for (const line of applyUpdates(root, results)) console.log(line);
  } catch (error) {
    fail([error instanceof Error ? error.message : String(error)]);
  }
  const lines = results.reduce((n, r) => n + r.updates.length, 0);
  const mapped = results.reduce((n, r) => n + r.coveredBy.length, 0);
  console.log(`applied ${lines} update lines and ${mapped} coveredBy mappings`);
} else {
  fail(['usage: pnpm content:updates --check <file> | --apply <dir>']);
}
