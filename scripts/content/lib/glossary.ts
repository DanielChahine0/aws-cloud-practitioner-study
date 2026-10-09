import { posix } from 'node:path';
import { slugify } from './markdown.ts';

/** One entry of resources/glossary.md; each ref path is repo-relative, like `resources/03-x/02-y.md`. */
export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  refs: { label: string; path: string }[];
}

/** `- **Term** ([label](link); [label](link)): definition`; the lazy refs group stops at the first "): ", so labels may hold parentheses. */
const ENTRY = /^- \*\*(.+?)\*\* \((.+?)\): (.+)$/;
const REF = /\[([^\]]+)\]\(([^)]+)\)/g;
const ABBREVIATED = /^(.+?)\s*\(([^()]+)\)$/;

export function parseGlossary(text: string, path = 'resources/glossary.md'): GlossaryEntry[] {
  const dir = posix.dirname(path);
  const entries: GlossaryEntry[] = [];
  for (const line of text.split('\n')) {
    const match = ENTRY.exec(line);
    if (!match) continue;
    const term = match[1] ?? '';
    const refs = [...(match[2] ?? '').matchAll(REF)].map((ref) => ({
      label: ref[1] ?? '',
      path: posix.normalize(posix.join(dir, ref[2] ?? '')),
    }));
    entries.push({ id: slugify(term), term, definition: match[3] ?? '', refs });
  }
  return entries;
}

/** The ways a note may write a term: `X (Y)` also matches as X and as Y; forms shorter than 3 characters are dropped. */
export function termForms(term: string): string[] {
  const match = ABBREVIATED.exec(term);
  if (!match) return [term];
  const parts = [match[1] ?? '', match[2] ?? '']
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  return [term, ...parts];
}
