/** pnpm content:new-question [count]: prints fresh question ids, one per line, used neither in the working tree nor in HEAD. */
import { resolve } from 'node:path';
import { loadContext, QUESTIONS_DIR } from './lib/context.ts';
import { newQid, takenQids } from './lib/qid.ts';

const MAX_COUNT = 200;
const arg = process.argv[2] ?? '1';
const count = Number(arg);
if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
  console.error(`content:new-question: count must be a whole number from 1 to ${MAX_COUNT}, not '${arg}'`);
  process.exit(1);
}

const ctx = loadContext(resolve(import.meta.dirname, '..', '..'));
const prefix = `${QUESTIONS_DIR}/`;
const texts = [
  ...ctx.files.filter((f) => f.startsWith(prefix)).map((f) => ctx.read(f) ?? ''),
  ...ctx.headPaths(prefix).map((f) => ctx.head(f) ?? ''),
];
const taken = takenQids(texts);
for (let i = 0; i < count; i++) {
  const id = newQid(taken);
  taken.add(id);
  console.log(id);
}
