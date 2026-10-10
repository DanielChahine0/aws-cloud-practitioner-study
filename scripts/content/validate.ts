/**
 * pnpm content:validate [--all | --draft <file> | --demote]: runs the rules switched on in content/validate.yaml,
 * or every implemented rule with --all (spec 2.9).
 *   --draft <file>  checks one question or incident file as if its drafts were live, plus the style and coverage
 *                   checks, or one lab file under content/labs/ with the lab rules and its replay (R11)
 *   --demote        sets live questions whose evidence left their note back to draft, then validates as usual
 */
import { resolve } from 'node:path';
import { isIncidentFile, LABS_DIR, loadContext } from './lib/context.ts';
import { demote, draftCheck, labDraftCheck } from './lib/draft.ts';
import { formatFinding, RULES, redact, runRules } from './rules/index.ts';

const root = resolve(import.meta.dirname, '..', '..');
const args = process.argv.slice(2);
const draftAt = args.indexOf('--draft');

if (draftAt >= 0) {
  const file = args[draftAt + 1];
  if (file === undefined) {
    console.error('content:validate: --draft needs a question or lab file path');
    process.exit(1);
  }
  if (file.startsWith(`${LABS_DIR}/`)) {
    const { labs, problems } = labDraftCheck(loadContext(root), file);
    for (const problem of problems) console.error(problem);
    console.log(`draft check ${file}: ${labs} lab${labs === 1 ? '' : 's'}, ${problems.length} problems`);
    process.exit(problems.length > 0 ? 1 : 0);
  }
  const { questions, problems } = draftCheck(loadContext(root), file);
  for (const problem of problems) console.error(problem);
  const noun = isIncidentFile(file) ? 'steps' : 'questions';
  console.log(`draft check ${file}: ${questions} ${noun}, ${problems.length} problems`);
  process.exit(problems.length > 0 ? 1 : 0);
}

if (args.includes('--demote')) {
  for (const line of demote(loadContext(root))) console.log(line);
}

const ctx = loadContext(root);
const all = args.includes('--all');

if (!all && ctx.config === null) {
  for (const f of ctx.loadErrors) console.error(formatFinding(redact(f)));
  console.error('content:validate: content/validate.yaml is missing or invalid');
  process.exit(1);
}

const ids = all ? RULES.map((rule) => rule.id) : (ctx.config?.rules ?? []);
const { findings, missing } = runRules(ctx, ids);
for (const id of missing) console.error(`content:validate: ${id} is switched on but not implemented yet`);
for (const f of findings) console.error(formatFinding(f));
console.log(`content:validate: ${ids.length} rules, ${findings.length} findings`);
process.exit(findings.length > 0 || missing.length > 0 ? 1 : 0);
