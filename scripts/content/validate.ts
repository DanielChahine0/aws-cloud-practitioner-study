/** pnpm content:validate [--all]: runs the rules switched on in content/validate.yaml, or every implemented rule with --all (spec 2.9). */
import { resolve } from 'node:path';
import { loadContext } from './lib/context.ts';
import { formatFinding, RULES, runRules } from './rules/index.ts';

const root = resolve(import.meta.dirname, '..', '..');
const ctx = loadContext(root);
const all = process.argv.includes('--all');

if (!all && ctx.config === null) {
  for (const f of ctx.loadErrors) console.error(formatFinding(f));
  console.error('content:validate: content/validate.yaml is missing or invalid');
  process.exit(1);
}

const ids = all ? RULES.map((rule) => rule.id) : (ctx.config?.rules ?? []);
const { findings, missing } = runRules(ctx, ids);
for (const id of missing) console.error(`content:validate: ${id} is switched on but not implemented yet`);
for (const f of findings) console.error(formatFinding(f));
console.log(`content:validate: ${ids.length} rules, ${findings.length} findings`);
process.exit(findings.length > 0 || missing.length > 0 ? 1 : 0);
