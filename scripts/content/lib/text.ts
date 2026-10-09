/**
 * Tokenizing, masking and line checks shared by the fingerprint script and rules R7 and R8.
 * `words`, `stripMarkdown` and `mask` match overlap_check.py, and `multiSentenceLines` matches
 * lint_notes.py, so the site's checks agree with the notes workflow's tools (spec 2.5 and 2.9).
 */

/** Stands in for a masked word, so no shingle that touches it can count as copied. */
export const MASK = '§';
const EM_DASH = '—';
const WORD = /[a-z0-9]+(?:['’][a-z]+)?/g;
const ABBREVIATIONS = [
  'e.g.',
  'i.e.',
  'etc.',
  'vs.',
  'U.S.',
  'Inc.',
  'Mr.',
  'Ms.',
  'Dr.',
  'No.',
  'approx.',
  'a.m.',
  'p.m.',
];
const SENTENCE_BREAK = /(\S+)[.!?]["')\]]*\s+(?=[A-Z0-9"'([])/g;
const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

export function words(text: string): string[] {
  return text.toLowerCase().match(WORD) ?? [];
}

export function stripMarkdown(text: string): string {
  return text
    .replace(FRONTMATTER, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_`#>|]/g, ' ');
}

/** Turns allow-list lines into word sequences, longest first; comments, blanks and one-word phrases are skipped. */
export function phrasesFrom(lines: readonly string[]): string[][] {
  return lines
    .filter((line) => line.trim() !== '' && !line.startsWith('#'))
    .map(words)
    .filter((phrase) => phrase.length >= 2)
    .sort((a, b) => b.length - a.length);
}

/** Replaces every occurrence of an allowed phrase with MASK tokens, trying the longest phrase first. */
export function mask(tokens: readonly string[], phrases: readonly (readonly string[])[]): string[] {
  const out = [...tokens];
  let i = 0;
  while (i < out.length) {
    for (const phrase of phrases) {
      if (phrase.every((word, k) => out[i + k] === word)) {
        out.fill(MASK, i, i + phrase.length);
        i += phrase.length - 1;
        break;
      }
    }
    i += 1;
  }
  return out;
}

/** True for each line inside a fenced code block, fences included; a fence closes only with at least as many of the same character. */
export function fencedLines(lines: readonly string[]): boolean[] {
  const inside: boolean[] = [];
  let open: string | null = null;
  for (const line of lines) {
    const fence = FENCE.exec(line);
    const marker = fence?.[1] ?? '';
    if (open === null) {
      inside.push(fence !== null);
      if (fence !== null) open = marker;
      continue;
    }
    inside.push(true);
    const closes =
      fence !== null &&
      marker[0] === open[0] &&
      marker.length >= open.length &&
      (fence[2] ?? '').trim() === '';
    if (closes) open = null;
  }
  return inside;
}

/** 1-based numbers of the lines that contain an em dash. */
export function emDashLines(text: string): number[] {
  return text.split('\n').flatMap((line, i) => (line.includes(EM_DASH) ? [i + 1] : []));
}

/** 1-based numbers of Markdown lines that hold more than one sentence; frontmatter, code blocks and table rows are exempt. */
export function multiSentenceLines(markdown: string): number[] {
  const lines = markdown.split('\n');
  const frontmatter = FRONTMATTER.exec(markdown);
  const start = frontmatter ? frontmatter[0].split('\n').length - 1 : 0;
  const code = fencedLines(lines);
  const bad: number[] = [];
  for (let n = start; n < lines.length; n++) {
    const line = lines[n] ?? '';
    if (code[n] || line.trimStart().startsWith('|')) continue;
    const prose = line
      .replace(LIST_MARKER, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/`[^`]*`/g, '');
    for (const match of prose.matchAll(SENTENCE_BREAK)) {
      const head = match[1] ?? '';
      const word = head + (prose[(match.index ?? 0) + head.length] ?? '');
      if (!ABBREVIATIONS.some((a) => word.endsWith(a)) && !/^[A-Z]$/.test(head)) {
        bad.push(n + 1);
        break;
      }
    }
  }
  return bad;
}
