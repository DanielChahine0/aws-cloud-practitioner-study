/**
 * pnpm content:quotas: writes content/exam/quotas.yaml from content/concepts.yaml and content/exam/blueprint.yaml,
 * the per-form domain, task and multi-response counts and the pool's module by task cells (spec 2.6, 4.3).
 *   --check   write nothing; exit 1 when the committed file is out of date
 */
import { resolve } from 'node:path';
import { runQuotas } from './lib/quotas-command.ts';

const { code, out } = runQuotas(resolve(import.meta.dirname, '..', '..'), process.argv.slice(2));
for (const line of out) (code === 0 ? console.log : console.error)(line);
process.exitCode = code;
