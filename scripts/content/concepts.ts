/**
 * pnpm content:concepts: seeds content/concepts.yaml from the note tags, lists a module's pending entries,
 * and checks and applies the registry-writer results (spec 2.4).
 *   --seed            add every unregistered tag with an empty anchor
 *   --pending NN      print module NN's pending entries as JSON
 *   --check <file>    check one result file against the registry and the notes
 *   --apply <dir>     check, then apply every *.json result in <dir>, sorted by name
 */
import { resolve } from 'node:path';
import { runConcepts } from './lib/concepts-command.ts';

const { code, out, err } = runConcepts(resolve(import.meta.dirname, '..', '..'), process.argv.slice(2));
for (const line of out) console.log(line);
for (const line of err) console.error(line);
process.exitCode = code;
