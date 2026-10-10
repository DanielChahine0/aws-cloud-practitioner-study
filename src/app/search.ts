import type { SearchEntry } from '../../schemas/chunks.ts';

/** Lowercases and keeps letters, digits and plus signs, so "Business Support+" and "EC2 Auto-Scaling" match what people type. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}

const KIND_WEIGHT: Record<SearchEntry['kind'], number> = {
  module: 4,
  lesson: 3,
  concept: 2,
  term: 1,
  mission: 0,
  lab: 0,
};

function score(entry: SearchEntry, q: string, words: readonly string[]): number {
  const title = normalize(entry.title);
  let base = 0;
  if (title === q) base = 400;
  else if (title.startsWith(q)) base = 300;
  else if (` ${title}`.includes(` ${q}`)) base = 200;
  else if (words.every((w) => ` ${entry.text}`.includes(` ${w}`))) base = 100;
  if (base === 0) return 0;
  return base + KIND_WEIGHT[entry.kind] * 10 - Math.min(entry.title.length, 60) / 100;
}

/**
 * Palette results, best first: exact title, title prefix, word prefix in the title, then every query word
 * as a word prefix in the text; kind breaks ties (module, lesson, concept, term, then mission and lab), then shorter
 * titles.
 * An empty query lists the modules in course order.
 */
export function rank(entries: readonly SearchEntry[], query: string): SearchEntry[] {
  const q = normalize(query);
  if (q === '') return entries.filter((e) => e.kind === 'module');
  const words = q.split(' ');
  return entries
    .map((entry) => ({ entry, score: score(entry, q, words) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((s) => s.entry);
}
