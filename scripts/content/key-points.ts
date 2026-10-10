/**
 * node scripts/content/key-points.ts <command>: the capstone key point pipeline (spec 6 and 2.7).
 *   concepts --module NN   the tested concepts homed in one module: id, name and home note, tab-separated
 *   draft <file>           every R1, R5 and R8 problem of one key point file, drafts included, then the count
 *   prepare [--seed N]     write the critic batches for every key point that needs the critic
 *   lint <answers file>    check one critic answer file against its batch until it prints OK
 *   grade                  grade every answer file and record the passes and failures
 *   stamp                  stamp passes live and count new failures in review blocks
 *   demote                 move live key points whose evidence left their notes back to draft
 *   report                 the counts by status and the modules under 4 live key points
 *   needs-dani             the key points with 3 or more failed rounds
 * Output names key points by id and counts only.
 */
import { resolve } from 'node:path';
import { NEEDS_DANI_ATTEMPTS } from './lib/checks.ts';
import { loadContext } from './lib/context.ts';
import {
  demoteKeyPoints,
  draftProblems,
  gradeKeyPoints,
  keyPointReport,
  lintKpAnswers,
  moduleConcepts,
  prepareKeyPoints,
  stampKeyPoints,
} from './lib/key-point-checks.ts';
import { projectOf } from './lib/project.ts';

const root = resolve(import.meta.dirname, '..', '..');
const [command, ...rest] = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const at = rest.indexOf(name);
  return at < 0 ? undefined : rest[at + 1];
};
const fail = (message: string): never => {
  console.error(`key-points: ${message}`);
  process.exit(1);
};

switch (command) {
  case 'concepts': {
    const module = Number(option('--module') ?? fail('concepts needs --module NN'));
    if (!Number.isInteger(module) || module < 1 || module > 13)
      fail('--module is a module number from 01 to 13');
    for (const c of moduleConcepts(loadContext(root), module)) console.log(`${c.id}\t${c.name}\t${c.home}`);
    break;
  }
  case 'draft': {
    const file = rest[0] ?? fail('draft needs a key point file');
    const problems = draftProblems(loadContext(root), file);
    for (const problem of problems) console.log(problem);
    console.log(`draft ${file}: ${problems.length} problems`);
    break;
  }
  case 'prepare': {
    const seed = Number(option('--seed') ?? '1');
    if (!Number.isInteger(seed)) fail('--seed must be a whole number');
    const paths = prepareKeyPoints(loadContext(root), seed);
    for (const path of paths) console.log(path);
    console.log(`prepared ${paths.length} batches`);
    break;
  }
  case 'lint': {
    const file = rest[0] ?? fail('lint needs an answers file');
    const result = lintKpAnswers(root, resolve(file));
    if (result !== 'OK') fail(result);
    console.log('OK');
    break;
  }
  case 'grade': {
    const { passed, failed } = gradeKeyPoints(root);
    console.log(`graded ${passed + failed} key points: ${passed} passed, ${failed} failed`);
    break;
  }
  case 'stamp': {
    const { live, revise, needsDani } = stampKeyPoints(loadContext(root));
    for (const path of revise) console.log(`revise ${path}`);
    for (const id of needsDani) console.log(`needs Dani ${id}`);
    console.log(`stamp: ${live} live, ${revise.length} files to revise, ${needsDani.length} need Dani`);
    break;
  }
  case 'demote': {
    const log = demoteKeyPoints(loadContext(root));
    for (const line of log) console.log(line);
    console.log(`demoted ${log.length} key points`);
    break;
  }
  case 'report': {
    for (const line of keyPointReport(loadContext(root))) console.log(line);
    break;
  }
  case 'needs-dani': {
    const stuck = projectOf(loadContext(root)).keyPoints.filter(
      (e) => e.kp.status === 'draft' && (e.kp.review?.attempts ?? 0) >= NEEDS_DANI_ATTEMPTS,
    );
    for (const e of stuck) console.log(`${e.kp.id} (${e.path}) attempts ${e.kp.review?.attempts ?? 0}`);
    console.log(`${stuck.length} key points need Dani`);
    break;
  }
  default:
    fail(
      'usage: node scripts/content/key-points.ts concepts --module NN | draft <file> | prepare [--seed N] | lint <answers file> | grade | stamp | demote | report | needs-dani',
    );
}
