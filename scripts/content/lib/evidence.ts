/** Evidence lines: a question cites whole lines of its note, compared in one normal form (spec 2.6 and R5 in 2.9). */
import type { Note } from './context.ts';
import type { Heading } from './markdown.ts';
import { fencedLines } from './text.ts';
import { parseUpdateLine } from './update-line.ts';

const LIST_MARKER = /^(?:[-*+]|\d+[.)])\s+/;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;

/** A line in its comparable form: trimmed, one list marker stripped, bold markers removed and links reduced to their text. */
export function evidenceForm(line: string): string {
  return line.trim().replace(LIST_MARKER, '').replaceAll('**', '').replace(LINK, '$1').trim();
}

const TABLE_ROW = /^\|.*\|$/;
const SEPARATOR = /^\|(?:\s*:?-+:?\s*\|)+$/;

/** The cells of a Markdown table row as they render: trimmed, and an escaped pipe kept inside its cell as a pipe. */
function cellsOf(row: string): string[] {
  return row
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replaceAll('\\|', '|').trim());
}

/**
 * Every citable line of a note body outside code fences, in evidence form, mapped to its first 1-based file line; an
 * update line counts by its sentence only. In a table each body cell is citable on its own and a whole row is not,
 * since "Read in notes" marks one rendered p, li or td; a header cell renders as th, so it is not citable either.
 */
export function noteLines(note: Note): Map<string, number> {
  const out = new Map<string, number>();
  const lines = note.body.split('\n');
  const code = fencedLines(lines);
  for (const [i, line] of lines.entries()) {
    if (code[i]) continue;
    const row = line.trim();
    if (TABLE_ROW.test(row)) {
      const header = SEPARATOR.test(lines[i + 1]?.trim() ?? '');
      if (SEPARATOR.test(row) || header) continue;
      for (const cell of cellsOf(row)) {
        const form = evidenceForm(cell);
        if (form !== '' && !out.has(form)) out.set(form, note.bodyLine + i);
      }
      continue;
    }
    const update = parseUpdateLine(line.trim());
    const form = evidenceForm(update === null ? line : update.sentence);
    if (form !== '' && !out.has(form)) out.set(form, note.bodyLine + i);
  }
  return out;
}

/** The section that holds a file line: the nearest H3 or H2 heading at or above it, or null above every heading. */
export function sectionAt(note: Note, line: number): Heading | null {
  let found: Heading | null = null;
  for (const heading of note.headings) {
    if (heading.line > line) break;
    found = heading;
  }
  return found;
}
