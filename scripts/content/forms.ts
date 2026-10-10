/**
 * pnpm content:forms: builds mock forms A to D from the live exam pool into content/exam/forms.yaml (spec 4.3).
 *   (no flag)             keep the frozen forms and build the others with seed 20261024
 *   --seed N              build with another seed
 *   --freeze              freeze every form, only when every quota cell and every form holds
 *   --allow-short-cells   with --freeze: freeze although a quota cell is short (only after Dani says yes)
 */
import { resolve } from 'node:path';
import { runForms } from './lib/forms-command.ts';

const { code, out } = runForms(resolve(import.meta.dirname, '..', '..'), process.argv.slice(2));
for (const line of out) console.log(line);
process.exitCode = code;
