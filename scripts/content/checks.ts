/**
 * pnpm content:checks <command>: the agent check pipeline (spec 2.7).
 *   prepare --modules 01,03 [--seed N]  write keyless batches for every question that needs a check, and keys.json
 *   lint <answers file>                 check one answer file against its batch until it prints OK
 *   grade                               grade every answer file and record the passes and failures
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { grade, lintAnswers, prepare } from './lib/checks.ts';
import { loadContext } from './lib/context.ts';

const root = resolve(import.meta.dirname, '..', '..');
const [command, ...rest] = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const at = rest.indexOf(name);
  return at < 0 ? undefined : rest[at + 1];
};
const fail = (message: string): never => {
  console.error(`content:checks: ${message}`);
  process.exit(1);
};

switch (command) {
  case 'prepare': {
    const modules = (option('--modules') ?? fail('prepare needs --modules, like --modules 01,03'))
      .split(',')
      .map(Number);
    if (modules.some((m) => !Number.isInteger(m) || m < 1 || m > 13))
      fail('--modules lists module numbers 01 to 13');
    const seed = Number(option('--seed') ?? '1');
    if (!Number.isInteger(seed)) fail('--seed must be a whole number');
    const { paths, questions } = prepare(loadContext(root), modules, seed);
    for (const path of paths) console.log(path);
    console.log(`prepared ${paths.length} batches for ${questions} questions`);
    break;
  }
  case 'lint': {
    const file = rest[0] ?? fail('lint needs an answers file');
    const problems = lintAnswers(root, resolve(file));
    if (problems.length > 0) {
      for (const problem of problems) console.error(problem);
      process.exit(1);
    }
    const count = (JSON.parse(readFileSync(resolve(file), 'utf8')) as { answers: unknown[] }).answers.length;
    console.log(`OK ${file}: ${count} answers`);
    break;
  }
  case 'grade': {
    const { passes, failures } = grade(root);
    for (const f of failures) console.log(`FAIL ${f.id} ${f.check}: ${f.reason}`);
    console.log(`graded ${passes + failures.length} answers: ${passes} passed, ${failures.length} failed`);
    break;
  }
  default:
    fail('usage: pnpm content:checks prepare --modules 01,03 [--seed N] | lint <answers file> | grade');
}
