/**
 * pnpm content:stamp: writes the verified block and status: live for every question with all three passes at its
 * current hashes, and a review block for every draft that failed a check at its current hashes (spec 2.7); an exam
 * draft at its third failed round is retired in place and printed as `retire <id>`.
 * Prints each file to revise as `revise <path>`, then the summary.
 */
import { resolve } from 'node:path';
import { stampQuestions } from './lib/checks.ts';
import { loadContext } from './lib/context.ts';

const { log, revise, summary } = stampQuestions(loadContext(resolve(import.meta.dirname, '..', '..')));
for (const line of log) console.log(line);
for (const path of revise) console.log(`revise ${path}`);
console.log(summary);
