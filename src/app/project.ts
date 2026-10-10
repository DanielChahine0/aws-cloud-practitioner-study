/** Pure copy and helpers for the capstone screen (spec 6), so the tests run without a browser. */
import type { ConceptMeta, SearchEntry } from '../../schemas/chunks.ts';
import type { DecisionView } from '../../schemas/project-view.ts';
import type { ConceptName, DecisionStage } from '../engine/capstone.ts';
import { pad2 } from './router.ts';
import { normalize, rank } from './search.ts';

export const PROJECT_LEDE = 'Thirteen decisions, one per module, each a short ADR graded against the rubric.';
export const GRADE_GATE = 'Fill in every heading and cite at least 2 concepts before you grade.';
export const SAVE_SELF = 'Save self-grade';
export const SAVE_FINAL = 'Save final grade';
export const EXPORT_PLAN = 'Export the plan';
export const REVEAL_HEADING = 'Reference key points';
export const TICK_LABEL = 'I covered this';
export const READ_IN_NOTES = 'Read in notes';
/** Shown when the build has no `content/project/brief.yaml`, so the index names no project chunk. */
export const NO_PROJECT = 'The capstone brief is not in this build yet.';
export const PROJECT_HEADINGS = {
  brief: 'The brief',
  decisions: 'Decisions',
  rubric: 'Rubric',
  self: 'Self-grade',
  final: 'Final grade',
} as const;
/** The most concept names the `[[` list offers at once. */
export const SUGGESTION_LIMIT = 8;
/** How long the editor waits after the last keystroke before it writes the draft to kv. */
export const DRAFT_SAVE_MS = 500;

/** The pass rule under the rubric (spec 6: a total of 8 or more and no criterion at 0). */
export function passLine(passTotal: number): string {
  return `A decision passes at ${passTotal} of 12 or more, with no criterion at 0.`;
}

/** The editor of one decision; the router reads the same `#/project/NN` (Task 18). */
export function decisionHref(module: number): string {
  return `#/project/${pad2(module)}`;
}

/** The registry as the citation helpers read it: id, display name and the old ids that still resolve. */
export function conceptNames(concepts: readonly ConceptMeta[]): ConceptName[] {
  return concepts.map((c) => ({ id: c.id, name: c.name, aliases: c.aliases }));
}

/** A drift or score difference with its sign: `+2`, `0`, `-3`, with a plain hyphen for minus. */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** One decision card's status line; `open` is the opening day as `examDateLabel` writes it. */
export function cardLine(
  stage: DecisionStage,
  args: { module: number; open: string; draft: boolean; self: number | null; final: number | null },
): string {
  switch (stage) {
    case 'locked':
      return `Opens after you read every lesson of Module ${args.module}.`;
    case 'waiting':
      return `Opens after your exam, on ${args.open}.`;
    case 'open':
      return args.draft ? 'Draft saved' : 'Not started';
    case 'self':
      return `Self-graded ${args.self ?? 0}/12; reveal the key points`;
    case 'done': {
      const final = args.final ?? 0;
      return `Final ${final}/12, drift ${signed(final - (args.self ?? 0))}`;
    }
  }
}

/** The live lines under Why: the count of distinct concepts cited, then one line per token that names no concept. */
export function citationLine(c: { ids: readonly string[]; unknown: readonly string[] }): string[] {
  const n = c.ids.length;
  const head =
    n === 0
      ? 'Cite at least 2 concepts, as [[Concept name]].'
      : n === 1
        ? '1 concept cited; cite at least 2.'
        : `${n} concepts cited.`;
  return [head, ...c.unknown.map((token) => `Not a concept: ${token}.`)];
}

/** What the polite live region says once a grade is stored. */
export function gradeAnnouncement(stage: 'self' | 'final', total: number, drift: number | null): string {
  return stage === 'self'
    ? `Self-grade saved: ${total} of 12.`
    : `Final grade saved: ${total} of 12. Drift ${signed(drift ?? 0)}.`;
}

/**
 * The concept names the `[[` list offers, best first, at most `SUGGESTION_LIMIT`: each concept goes through the
 * palette's `rank` as a concept entry whose text holds its name and old ids; an empty query lists names alphabetically,
 * because `rank` returns only modules for it.
 */
export function suggestions(query: string, concepts: readonly ConceptName[]): ConceptName[] {
  if (normalize(query) === '') {
    return [...concepts].sort((a, b) => a.name.localeCompare(b.name)).slice(0, SUGGESTION_LIMIT);
  }
  const byId = new Map(concepts.map((c) => [c.id, c] as const));
  const entries: SearchEntry[] = concepts.map((c) => ({
    kind: 'concept',
    title: c.name,
    detail: '',
    route: c.id,
    text: normalize([c.name, ...c.aliases].join(' ')),
  }));
  const out: ConceptName[] = [];
  for (const entry of rank(entries, query)) {
    const c = byId.get(entry.route);
    if (c !== undefined) out.push(c);
    if (out.length === SUGGESTION_LIMIT) break;
  }
  return out;
}

/** A `[[` before the caret that no `]]`, `[` or line break has closed yet, and what was typed after it. */
export interface OpenCitation {
  start: number;
  query: string;
}

export function openCitation(text: string, caret: number): OpenCitation | null {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf('[[');
  if (start === -1) return null;
  const query = before.slice(start + 2);
  return /[[\]\n]/.test(query) ? null : { start, query };
}

/** Replaces the open `[[query` (and a `]]` right after the caret) with `[[Name]]` and puts the caret after it. */
export function insertCitation(
  text: string,
  caret: number,
  open: OpenCitation,
  name: string,
): { text: string; caret: number } {
  const after = text.slice(caret);
  const token = `[[${name}]]`;
  return {
    text: text.slice(0, open.start) + token + (after.startsWith(']]') ? after.slice(2) : after),
    caret: open.start + token.length,
  };
}

/** One key point as the reveal shows it: display names only, the evidence line as a quote, and the tick. */
export interface RevealRow {
  id: string;
  text: string;
  /** `Concepts: <names>`, or '' when none of its concepts is in the registry any more. */
  concepts: string;
  quote: string;
  route: string;
  ticked: boolean;
}

/** The decision's live key points in order; ticks of ids the chunk does not hold are skipped, never shown or thrown on. */
export function revealRows(
  decision: DecisionView,
  ticks: readonly string[],
  names: ReadonlyMap<string, string>,
): RevealRow[] {
  return decision.keyPoints.map((kp) => {
    const shown = kp.concepts.flatMap((id) => {
      const name = names.get(id);
      return name === undefined ? [] : [name];
    });
    return {
      id: kp.id,
      text: kp.text,
      concepts: shown.length === 0 ? '' : `Concepts: ${shown.join(', ')}`,
      quote: kp.read.text,
      route: kp.read.route,
      ticked: ticks.includes(kp.id),
    };
  });
}

/** The ticked ids that are live key points of this decision, in key point order, for the `final` event. */
export function liveTicks(decision: DecisionView, ticks: readonly string[]): string[] {
  return decision.keyPoints.filter((kp) => ticks.includes(kp.id)).map((kp) => kp.id);
}

/** Ticks or unticks one key point; ids the chunk no longer holds stay in the draft. */
export function tickKeyPoint(ticks: readonly string[], id: string, on: boolean): string[] {
  if (on) return ticks.includes(id) ? [...ticks] : [...ticks, id];
  return ticks.filter((t) => t !== id);
}
