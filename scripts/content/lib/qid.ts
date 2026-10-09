import { randomInt } from 'node:crypto';
import { QID_ALPHABET } from '../../../schemas/question.ts';

const QID_LENGTH = 6;
const QID_TOKEN = /\bq-[0-9a-hjkmnp-tv-z]{6}\b/g;

/** A fresh question id, `q-` plus 6 random Crockford base32 characters, redrawn while it is taken (spec 2.6). */
export function newQid(taken: ReadonlySet<string>, random: (max: number) => number = randomInt): string {
  for (;;) {
    let id = 'q-';
    for (let i = 0; i < QID_LENGTH; i++) id += QID_ALPHABET[random(QID_ALPHABET.length)];
    if (!taken.has(id)) return id;
  }
}

/** Every id-shaped token in the given texts, so a file that does not parse still reserves its ids. */
export function takenQids(texts: readonly string[]): Set<string> {
  return new Set(texts.flatMap((text) => text.match(QID_TOKEN) ?? []));
}
