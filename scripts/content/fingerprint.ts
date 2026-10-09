/** pnpm content:fingerprint: writes content/fingerprints/ from the course source outside the repo (spec 2.5). */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { allowFile, fingerprintCourse, partitionShingles } from './lib/fingerprint-files.ts';

const home = process.env.CCP_STUDY_HOME ?? join(homedir(), 'Library', 'Application Support', 'ccp-study');
const outDir = resolve(import.meta.dirname, '..', '..', 'content', 'fingerprints');
mkdirSync(outDir, { recursive: true });

const sources = new Map<number, string>();
for (let module = 1; module <= 13; module++) {
  const nn = String(module).padStart(2, '0');
  sources.set(module, readFileSync(join(home, 'source', `module-${nn}.md`), 'utf8'));
}

// Every shingle goes into exactly one of the 26 sets, so the files are written from the whole course at once.
const parts = partitionShingles(sources);
let shingles = 0;
let checks = 0;
let quizzes = 0;
for (const file of fingerprintCourse(sources)) {
  const nn = String(file.module).padStart(2, '0');
  const part = parts.get(file.module);
  const text = part?.text.size ?? 0;
  const items = part?.items.size ?? 0;
  const kc = file.itemIds.filter((id) => id.startsWith('kc-')).length;
  shingles += text + items;
  checks += kc;
  quizzes += file.itemIds.length - kc;
  writeFileSync(join(outDir, `m${nn}.json`), `${JSON.stringify(file)}\n`);
  console.log(
    `m${nn}: text ${text} (f ${file.text.f.toFixed(4)}), items ${items} (f ${file.items.f.toFixed(4)}), ${kc} knowledge checks, ${file.itemIds.length - kc} assessment items`,
  );
}
writeFileSync(
  join(outDir, 'allow.txt'),
  allowFile([...sources.values()], readFileSync(join(home, 'pipeline', 'allow.txt'), 'utf8')),
);
console.log(
  `total: ${shingles} shingles in ${sources.size * 2} sets, ${checks} knowledge checks, ${quizzes} assessment items`,
);
