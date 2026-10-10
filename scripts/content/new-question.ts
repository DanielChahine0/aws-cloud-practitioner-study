/** pnpm content:new-question [count]: prints fresh question ids, one per line, used in no practice or exam-pool file of the working tree or HEAD. */
import { resolve } from 'node:path';
import { newQid, qidSourceTexts, takenQids } from './lib/qid.ts';

const MAX_COUNT = 200;
const arg = process.argv[2] ?? '1';
const count = Number(arg);
if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
  console.error(`content:new-question: count must be a whole number from 1 to ${MAX_COUNT}, not '${arg}'`);
  process.exit(1);
}

const taken = takenQids(qidSourceTexts(resolve(import.meta.dirname, '..', '..')));
for (let i = 0; i < count; i++) {
  const id = newQid(taken);
  taken.add(id);
  console.log(id);
}
