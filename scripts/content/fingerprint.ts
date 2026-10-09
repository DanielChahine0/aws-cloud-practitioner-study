/** pnpm content:fingerprint: writes content/fingerprints/ from the course source outside the repo (spec 2.5). */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { allowFile, fingerprintModule } from './lib/fingerprint-files.ts';

const home = process.env.CCP_STUDY_HOME ?? join(homedir(), 'Library', 'Application Support', 'ccp-study');
const outDir = resolve(import.meta.dirname, '..', '..', 'content', 'fingerprints');
mkdirSync(outDir, { recursive: true });

const sources: string[] = [];
let checks = 0;
let quizzes = 0;
for (let module = 1; module <= 13; module++) {
  const nn = String(module).padStart(2, '0');
  const source = readFileSync(join(home, 'source', `module-${nn}.md`), 'utf8');
  const file = fingerprintModule(module, source);
  const kc = file.items.filter((id) => id.startsWith('kc-')).length;
  checks += kc;
  quizzes += file.items.length - kc;
  writeFileSync(join(outDir, `m${nn}.json`), `${JSON.stringify(file)}\n`);
  console.log(
    `m${nn}: ${file.text.count} shingles at ${file.text.b} bits (f ${file.text.f.toFixed(4)}), ${kc} knowledge checks, ${file.items.length - kc} assessment items`,
  );
  sources.push(source);
}
writeFileSync(
  join(outDir, 'allow.txt'),
  allowFile(sources, readFileSync(join(home, 'pipeline', 'allow.txt'), 'utf8')),
);
console.log(`total: ${checks} knowledge checks, ${quizzes} assessment items`);
