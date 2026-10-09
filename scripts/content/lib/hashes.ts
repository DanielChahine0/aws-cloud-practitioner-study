/** Question hashes: the stamp binds each check pass to the exact text it saw (spec 2.7). */
import { createHash } from 'node:crypto';
import type { Question } from '../../../schemas/question.ts';

/** JSON with object keys sorted by code point, undefined members dropped, arrays in order and no whitespace. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v ?? null)).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** What a solver sees and answers: the stem, the options or pairs, and which are correct. */
export function keyPayload(q: Question): unknown {
  switch (q.type) {
    case 'single':
      return {
        type: q.type,
        stem: q.stem,
        options: q.options.map(({ id, text, correct }) => ({ id, text, correct })),
      };
    case 'multi':
      return {
        type: q.type,
        select: q.select,
        stem: q.stem,
        options: q.options.map(({ id, text, correct }) => ({ id, text, correct })),
      };
    case 'match':
      return { type: q.type, stem: q.stem, pairs: q.pairs.map(({ left, right }) => ({ left, right })) };
  }
}

/** Everything the notes check and the critic judge: the key plus whys, evidence, takeaway, concept, task and note. */
export function fullPayload(q: Question): unknown {
  return {
    key: keyPayload(q),
    whys: q.type === 'match' ? q.pairs.map(({ why }) => why) : q.options.map(({ id, why }) => ({ id, why })),
    evidence: q.evidence,
    takeaway: q.takeaway,
    concept: q.concept,
    task: q.task,
    note: q.note,
  };
}

/** The first 12 hex characters of the sha256 of the value's canonical JSON. */
export function hash12(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex').slice(0, 12);
}

export const keyHash = (q: Question): string => hash12(keyPayload(q));
export const fullHash = (q: Question): string => hash12(fullPayload(q));

/** The answer alone: sorted correct option ids joined by commas, or a match question's pairs. */
export function correctKey(q: Question): string {
  if (q.type === 'match') return canonicalJson(q.pairs.map(({ left, right }) => ({ left, right })));
  return q.options
    .filter((o) => o.correct)
    .map((o) => o.id)
    .sort()
    .join(',');
}
