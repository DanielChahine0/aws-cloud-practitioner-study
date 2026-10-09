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

/** One way a note may write a glossary term, and where and how it counts as that term. */
interface TermForm {
  id: string;
  /** The form as the glossary writes it. */
  text: string;
  /** True for a single word, which must keep the glossary's capitalisation after its first letter. */
  word: boolean;
  /** For an ordinary word, the notes that define the term; null means every note. */
  notes: ReadonlySet<string> | null;
}

/** Finds glossary terms in note text: one case-insensitive pattern over every form, longest first, and each form by its lowercase. */
export interface TermMatcher {
  pattern: RegExp;
  forms: ReadonlyMap<string, TermForm>;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** A plain word such as "Route", "tier" or "Lift-and-shift", as opposed to an acronym or name such as "AMI", "SaaS" or "CI/CD". */
const ORDINARY_WORD = /^[A-Za-z][a-z]*(?:-[a-z]+)*$/;

function formOf(text: string, entry: GlossaryEntry): TermForm {
  if (/\s/.test(text)) return { id: entry.id, text, word: false, notes: null };
  const notes = ORDINARY_WORD.test(text) ? new Set(entry.refs.map((ref) => ref.path)) : null;
  return { id: entry.id, text, word: true, notes };
}

/**
 * Phrases and acronyms link anywhere, but an ordinary word such as "Route" or "Tier" links only in the lessons
 * that define it, since elsewhere it is mostly another sense ("Route 53", "Free Tier"). Full terms claim their
 * form first, so a short form such as "Amazon EC2" never steals a term of its own.
 */
export function termMatcher(entries: readonly GlossaryEntry[]): TermMatcher {
  const forms = new Map<string, TermForm>();
  for (const entry of entries) {
    const key = entry.term.toLowerCase();
    if (!forms.has(key)) forms.set(key, formOf(entry.term, entry));
  }
  for (const entry of entries) {
    for (const extra of termForms(entry.term)) {
      const key = extra.toLowerCase();
      if (!forms.has(key)) forms.set(key, formOf(extra, entry));
    }
  }
  if (forms.size === 0) return { pattern: /(?!)/g, forms };
  const alts = [...forms.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  // A term stops at a letter, digit or hyphen, and at a dot that joins two words, as in "Node.js".
  const before = '(?<![A-Za-z0-9-]|[A-Za-z0-9]\\.)';
  const after = '(?![A-Za-z0-9-]|\\.[A-Za-z0-9])';
  return { pattern: new RegExp(`${before}(?:${alts})${after}`, 'gi'), forms };
}

/** The glossary id that a match of the pattern links to in the note at `path`, or null when it is not the term there. */
export function termAt(matcher: TermMatcher, text: string, path: string): string | null {
  const form = matcher.forms.get(text.toLowerCase());
  if (form === undefined) return null;
  if (form.notes !== null && !form.notes.has(path)) return null;
  if (form.word && text.slice(1) !== form.text.slice(1)) return null;
  return form.id;
}
