import { fencedLines } from './text.ts';

export interface Heading {
  depth: 2 | 3;
  text: string;
  slug: string;
  line: number;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const HEADING = /^(#{2,3}) (.+?)\s*$/;

/** Splits YAML frontmatter from the body; bodyLine is the 1-based file line where the body starts. */
export function splitFrontmatter(text: string): { yaml: string | null; body: string; bodyLine: number } {
  const match = FRONTMATTER.exec(text);
  if (!match) return { yaml: null, body: text, bodyLine: 1 };
  return { yaml: match[1] ?? '', body: text.slice(match[0].length), bodyLine: match[0].split('\n').length };
}

/** The anchor slug of a heading: lowercased, only letters, digits, spaces and hyphens kept, spaces turned into hyphens. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** H2 and H3 headings outside code blocks, with 1-based line numbers in the whole file. */
export function headingsOf(body: string, bodyLine: number): Heading[] {
  const lines = body.split('\n');
  const code = fencedLines(lines);
  const out: Heading[] = [];
  for (const [i, line] of lines.entries()) {
    const match = code[i] ? null : HEADING.exec(line);
    if (!match) continue;
    const text = (match[2] ?? '').replace(/[*`]/g, '');
    out.push({ depth: match[1] === '##' ? 2 : 3, text, slug: slugify(text), line: bodyLine + i });
  }
  return out;
}

/** Slugs of the H3 headings under "## Notes", the only places a concept anchor may point (spec 2.4). */
export function notesAnchors(headings: readonly Heading[]): string[] {
  const out: string[] = [];
  let inNotes = false;
  for (const heading of headings) {
    if (heading.depth === 2) inNotes = heading.text === 'Notes';
    else if (inNotes) out.push(heading.slug);
  }
  return out;
}
