import { createHash } from 'node:crypto';
import type { Question } from '../../../schemas/question.ts';

/** JSON with object keys sorted by code point, undefined members dropped and no whitespace (spec 2.7). */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((v) => canonicalJson(v === undefined ? null : v)).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** What keyHash covers: the type, stem and the options with their key, or the pairs. */
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
        stem: q.stem,
        select: q.select,
        options: q.options.map(({ id, text, correct }) => ({ id, text, correct })),
      };
    case 'match':
      return { type: q.type, stem: q.stem, pairs: q.pairs.map(({ left, right }) => ({ left, right })) };
  }
}

/** What fullHash covers: the key payload plus whys, evidence, takeaway, concept, task and note. */
export function fullPayload(q: Question): unknown {
  const whys =
    q.type === 'match' ? q.pairs.map(({ why }) => why) : q.options.map(({ id, why }) => ({ id, why }));
  return {
    key: keyPayload(q),
    whys,
    evidence: q.evidence,
    takeaway: q.takeaway,
    concept: q.concept,
    task: q.task,
    note: q.note,
  };
}

export function hash12(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex').slice(0, 12);
}

export const keyHash = (q: Question): string => hash12(keyPayload(q));
export const fullHash = (q: Question): string => hash12(fullPayload(q));

/** The correct answer alone: sorted correct option ids, or the left-right pairs of a match. */
export function correctKey(q: Question): string {
  if (q.type === 'match') return canonicalJson(q.pairs.map(({ left, right }) => ({ left, right })));
  return q.options
    .filter((o) => o.correct)
    .map((o) => o.id)
    .sort()
    .join(',');
}
