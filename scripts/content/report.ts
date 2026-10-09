/**
 * pnpm content:report: the soft checks (spec 2.9).
 *   (no flag)            counts, one style line per module with questions, and the concepts.md drift
 *   --coverage [--json]  concepts, live and exam items and missing blueprint terms per task; --json lists the missing terms
 *   --needs-dani         practice drafts with 2 failed revisions
 *   --homed <noteId>     JSON of the tested concepts homed in a lesson, for the question writers
 */
import { resolve } from 'node:path';
import { loadContext } from './lib/context.ts';
import { missingTerms } from './lib/coverage.ts';
import { coverageReport, homed, needsDani, report } from './lib/report.ts';

const args = process.argv.slice(2);
const ctx = loadContext(resolve(import.meta.dirname, '..', '..'));
const homedAt = args.indexOf('--homed');

if (homedAt >= 0) {
  const noteId = args[homedAt + 1];
  if (noteId === undefined) {
    console.error('content:report: --homed needs a note id, like m03/aws-lambda');
    process.exit(1);
  }
  try {
    console.log(JSON.stringify(homed(ctx, noteId), null, 2));
  } catch (error) {
    console.error(`content:report: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
} else if (args.includes('--coverage')) {
  if (args.includes('--json')) {
    console.log(JSON.stringify(missingTerms(ctx).map(({ task, term }) => ({ task, term }))));
  } else {
    for (const line of coverageReport(ctx)) console.log(line);
  }
} else if (args.includes('--needs-dani')) {
  for (const line of needsDani(ctx)) console.log(line);
} else {
  for (const line of report(ctx)) console.log(line);
}
