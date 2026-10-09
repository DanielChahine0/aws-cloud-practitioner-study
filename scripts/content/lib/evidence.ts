import type { Note } from './context.ts';
import type { Heading } from './markdown.ts';
import { fencedLines } from './text.ts';
import { parseUpdateLine } from './update-line.ts';

/** The normal form R5 compares: one list marker, every `**` and link syntax removed, trimmed (spec 2.9). */
export function evidenceForm(line: string): string {
  return line
    .trim()
    .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
    .replaceAll('**', '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
}

/** The citable form of each Markdown line outside code fences, an update line's sentence for an update line, by first line. */
function linesOf(markdown: string, firstLine = 1): Map<string, number> {
  const lines = markdown.split('\n');
  const code = fencedLines(lines);
  const out = new Map<string, number>();
  for (const [i, raw] of lines.entries()) {
    if (code[i]) continue;
    const line = raw.replace(/\r$/, '');
    const update = parseUpdateLine(line.trim());
    const form = evidenceForm(update === null ? line : update.sentence);
    if (form !== '' && !out.has(form)) out.set(form, firstLine + i);
  }
  return out;
}

/** Every citable body line of a note, mapped to its 1-based file line. */
export function noteLines(note: Note): Map<string, number> {
  return linesOf(note.body, note.bodyLine);
}

/** The section that holds a file line: the last H3 at or above it, or the last H2 when no H3 follows that H2. */
export function sectionAt(note: Note, line: number): Heading | null {
  let found: Heading | null = null;
  for (const heading of note.headings) {
    if (heading.line > line) break;
    found = heading;
  }
  return found;
}
