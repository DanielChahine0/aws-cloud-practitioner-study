import { ADR_FIELDS, ADR_HEADINGS, type AdrText, type ProjectChunk } from '../../schemas/project-view.ts';
import { scoreTotal } from './badges.ts';
import { type ConceptName, citedText, type DecisionRecord } from './capstone.ts';

/**
 * The capstone export (spec 6): `cafe-cloud-plan.md`, a summary table and the 13 ADRs,
 * one sentence per line with no em dashes, whatever Dani typed.
 */

export const PLAN_FILE = 'cafe-cloud-plan.md';

/**
 * Copies of `ABBREVIATIONS`, `SENTENCE_BREAK` and `FENCE` in `scripts/content/lib/text.ts`, which `src` cannot import;
 * `tests/unit/plan.test.ts` pins them equal, so the export splits exactly where rule R8 would object.
 */
export const ABBREVIATIONS = [
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
export const SENTENCE_BREAK = /(\S+)[.!?]["')\]]*\s+(?=[A-Z0-9"'([])/g;
export const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;

/** Spaces and tabs only, so a dash at either end of a line never joins it to its neighbour. */
const EM_DASH = /[ \t]*\u2014[ \t]*/g;

const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
/** Links, inline code and bare URLs are never split inside. */
const PROTECTED = /\[[^\]]*\]\([^)]*\)|`[^`]*`|https?:\/\/\S*[^\s.,;:!?'")\]]/g;
const NOT_WRITTEN = 'Not written yet';

/** Each em dash and the spaces around it as ` - `, without the space that would sit at the start or end of a line. */
function plainDashes(text: string): string {
  return text.replace(EM_DASH, (dash: string, at: number) => {
    const end = at + dash.length;
    const before = at === 0 || text[at - 1] === '\n' ? '' : ' ';
    const after = end === text.length || text[end] === '\n' ? '' : ' ';
    return `${before}-${after}`;
  });
}

function protectedRanges(line: string): [number, number][] {
  return [...line.matchAll(PROTECTED)].map((m) => [m.index, m.index + m[0].length]);
}

function splitLine(line: string): string[] {
  const marker = LIST_MARKER.exec(line)?.[0] ?? '';
  const body = line.slice(marker.length);
  const keep = protectedRanges(body);
  const pieces: string[] = [];
  let start = 0;
  for (const match of body.matchAll(SENTENCE_BREAK)) {
    const head = match[1] ?? '';
    const stop = match.index + head.length;
    const word = head + (body[stop] ?? '');
    if (ABBREVIATIONS.some((a) => word.endsWith(a)) || /^[A-Z]$/.test(head)) continue;
    if (keep.some(([from, to]) => stop >= from && stop < to)) continue;
    const end = match.index + match[0].length;
    pieces.push(body.slice(start, end).trimEnd());
    start = end;
  }
  pieces.push(body.slice(start).trimEnd());
  const indent = ' '.repeat(marker.length);
  return pieces.filter((p) => p !== '').map((p, i) => (i === 0 ? marker : indent) + p);
}

/**
 * Dani's text with em dashes as ` - ` and each sentence on its own line.
 * Blank lines and table rows stay, and fenced code blocks pass through as typed, as rule R8 exempts them.
 */
export function oneSentencePerLine(text: string): string {
  const out: string[] = [];
  let open: string | null = null;
  for (const line of plainDashes(text.replaceAll('\r\n', '\n')).split('\n')) {
    const fence = FENCE.exec(line);
    const marker = fence?.[1] ?? '';
    if (open !== null) {
      out.push(line);
      const closes =
        fence !== null &&
        marker[0] === open[0] &&
        marker.length >= open.length &&
        (fence[2] ?? '').trim() === '';
      if (closes) open = null;
    } else if (fence !== null) {
      out.push(line);
      open = marker;
    } else if (line.trim() === '') {
      if (out.length > 0 && out.at(-1) !== '') out.push('');
    } else if (line.trimStart().startsWith('|')) {
      out.push(line.trim());
    } else {
      out.push(...splitLine(line));
    }
  }
  while (out.at(-1)?.trim() === '') out.pop();
  return out.join('\n');
}

function cell(text: string): string {
  return text.replaceAll('|', '\\|');
}

function scoreCell(record: DecisionRecord | undefined, stage: 'self' | 'final'): string {
  const grade = record?.[stage];
  return grade == null ? '-' : `${scoreTotal(grade.scores)}/12`;
}

/** The whole `cafe-cloud-plan.md`: title, summary table, then one section per decision with the six ADR headings. */
export function planMarkdown(args: {
  project: ProjectChunk;
  drafts: ReadonlyMap<number, AdrText>;
  decisions: ReadonlyMap<number, DecisionRecord>;
  concepts: readonly ConceptName[];
}): string {
  const prose = (stored: string) => oneSentencePerLine(citedText(stored, args.concepts));
  const lines = [`# ${args.project.title}`, '', '| Module | Decision | Self | Final |', '|---|---|---|---|'];
  for (const d of args.project.decisions) {
    const chosen = prose(args.drafts.get(d.module)?.decision ?? '').split('\n')[0] ?? '';
    const record = args.decisions.get(d.module);
    lines.push(
      `| ${d.module} | ${cell(chosen === '' ? NOT_WRITTEN : chosen)} | ${scoreCell(record, 'self')} | ${scoreCell(record, 'final')} |`,
    );
  }
  for (const d of args.project.decisions) {
    lines.push('', `## Decision ${d.module}: ${d.title}`);
    const draft = args.drafts.get(d.module);
    ADR_FIELDS.forEach((field, i) => {
      const body = prose(draft?.[field] ?? '');
      lines.push('', `### ${ADR_HEADINGS[i]}`, '', body === '' ? `${NOT_WRITTEN}.` : body);
    });
  }
  return `${lines.join('\n')}\n`;
}
