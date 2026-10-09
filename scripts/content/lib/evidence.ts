import type { Note } from './context.ts';
import type { Heading } from './markdown.ts';
import { fencedLines } from './text.ts';
import { parseUpdateLine } from './update-line.ts';

/** The normal form of an evidence line: no list marker, no bold, links reduced to their text (spec 2.6). */
export function evidenceForm(line: string): string {
  return line
    .trim()
    .replace(/^(?:[-*+]|\d+[.)])\s+/, '')
    .replaceAll('**', '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
}

/** Every citable line of a note in evidence form, mapped to its 1-based file line; the first occurrence wins. */
export function noteLines(note: Note): Map<string, number> {
  const lines = note.body.split('\n');
  const code = fencedLines(lines);
  const out = new Map<string, number>();
  for (const [i, line] of lines.entries()) {
    if (code[i]) continue;
    const update = parseUpdateLine(line.trim());
    const form = evidenceForm(update ? update.sentence : line);
    if (form === '' || out.has(form)) continue;
    out.set(form, note.bodyLine + i);
  }
  return out;
}

/** The section that holds a file line: the last H3, or the H2 when no H3 follows it, at or above that line. */
export function sectionAt(note: Note, line: number): Heading | null {
  let found: Heading | null = null;
  for (const heading of note.headings) {
    if (heading.line > line) break;
    found = heading;
  }
  return found;
}
