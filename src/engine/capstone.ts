import type { StudyEvent } from '../../schemas/events.ts';
import { ADR_FIELDS, type AdrText } from '../../schemas/project-view.ts';
import { addDays } from './day.ts';

/**
 * The capstone (spec 6), derived from `decision` events: one self-grade and one final re-grade per module.
 * The first `self` counts, then the first `final` after it; any later grade changes nothing,
 * so XP, drift and Architect all read the same two grades.
 */

/** Rubric scores in `CRITERION_ORDER`: fit, grounding, trade-offs, cost and responsibility. */
export type Scores = readonly [number, number, number, number];

interface Grade {
  scores: Scores;
  at: string;
  day: string;
}

export interface DecisionRecord {
  self: Grade | null;
  /** Key point ids are kept as written, even ones the content no longer has (spec 8.4). */
  final: (Grade & { keyPoints: readonly string[] }) | null;
}

type DecisionEvent = Extract<StudyEvent, { t: 'decision' }>;

/** The counted self and final grade of each module that has one, read in id order. */
export function decisionsOf(events: readonly StudyEvent[]): ReadonlyMap<number, DecisionRecord> {
  const sorted = events
    .filter((e): e is DecisionEvent => e.t === 'decision')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out = new Map<number, DecisionRecord>();
  for (const e of sorted) {
    const record = out.get(e.module) ?? { self: null, final: null };
    const grade: Grade = { scores: [...e.scores], at: e.at, day: e.day };
    if (e.stage === 'self' && record.self === null) out.set(e.module, { ...record, self: grade });
    if (e.stage === 'final' && record.self !== null && record.final === null) {
      out.set(e.module, { ...record, final: { ...grade, keyPoints: [...(e.keyPoints ?? [])] } });
    }
  }
  return out;
}

export function scoreTotal(scores: readonly number[]): number {
  return scores.reduce((sum, s) => sum + s, 0);
}

/** Final total minus self total, or null until both grades exist (spec 6). */
export function decisionDrift(d: DecisionRecord): number | null {
  if (d.self === null || d.final === null) return null;
  return scoreTotal(d.final.scores) - scoreTotal(d.self.scores);
}

/** How many decisions have both grades, and the sum of their drift. */
export function driftOf(decisions: ReadonlyMap<number, DecisionRecord>): {
  decisions: number;
  total: number;
} {
  let count = 0;
  let total = 0;
  for (const d of decisions.values()) {
    const drift = decisionDrift(d);
    if (drift === null) continue;
    count++;
    total += drift;
  }
  return { decisions: count, total };
}

/** `locked` until the module is read, `waiting` until the study day after the exam, then `open`; grades win. */
export type DecisionStage = 'locked' | 'waiting' | 'open' | 'self' | 'done';

export function decisionStage(args: {
  lessonsRead: boolean;
  today: string;
  examDate: string;
  record: DecisionRecord | undefined;
}): DecisionStage {
  if (args.record?.final != null) return 'done';
  if (args.record?.self != null) return 'self';
  if (!args.lessonsRead) return 'locked';
  return args.today < openDay(args.examDate) ? 'waiting' : 'open';
}

/** The study day decisions open: the day after the exam (spec 10.1, Phase 6 row). */
export function openDay(examDate: string): string {
  return addDays(examDate, 1);
}

/** The fewest distinct concepts the Why section cites before the self-grade opens (spec 6). */
export const MIN_CITATIONS = 2;

export interface ConceptName {
  id: string;
  name: string;
  /** Old ids that now mean this concept. */
  aliases: readonly string[];
}

const TOKEN = /\[\[([^[\]\n]+)\]\]/g;

function byIdOrAlias(token: string, concepts: readonly ConceptName[]): ConceptName | undefined {
  return concepts.find((c) => c.id === token) ?? concepts.find((c) => c.aliases.includes(token));
}

function byName(token: string, concepts: readonly ConceptName[]): ConceptName | undefined {
  const name = token.toLowerCase();
  return concepts.find((c) => c.name.toLowerCase() === name);
}

/** Distinct canonical ids cited as `[[id]]` (aliases resolve), and the distinct tokens that name no concept. */
export function citationsOf(
  stored: string,
  concepts: readonly ConceptName[],
): { ids: string[]; unknown: string[] } {
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const match of stored.matchAll(TOKEN)) {
    const token = (match[1] ?? '').trim();
    if (token === '') continue;
    const concept = byIdOrAlias(token, concepts);
    const list = concept === undefined ? unknown : ids;
    const value = concept === undefined ? token : concept.id;
    if (!list.includes(value)) list.push(value);
  }
  return { ids, unknown };
}

/** Editor text to stored text: `[[Display Name]]` becomes `[[concept-id]]`; a token naming no concept stays as typed. */
export function toStored(shown: string, concepts: readonly ConceptName[]): string {
  return shown.replace(TOKEN, (whole, inner: string) => {
    const token = inner.trim();
    const concept = byName(token, concepts) ?? byIdOrAlias(token, concepts);
    return concept === undefined ? whole : `[[${concept.id}]]`;
  });
}

/** Stored text to editor text: `[[concept-id]]` (or an alias) becomes `[[Current Name]]`, so a rename follows. */
export function toShown(stored: string, concepts: readonly ConceptName[]): string {
  return stored.replace(TOKEN, (whole, inner: string) => {
    const concept = byIdOrAlias(inner.trim(), concepts);
    return concept === undefined ? whole : `[[${concept.name}]]`;
  });
}

/** Stored text for reading: each citation becomes its plain display name, an unknown one its typed text. */
export function citedText(stored: string, concepts: readonly ConceptName[]): string {
  return stored.replace(TOKEN, (_whole, inner: string) => {
    const token = inner.trim();
    return byIdOrAlias(token, concepts)?.name ?? token;
  });
}

/** Every heading written and at least `MIN_CITATIONS` distinct known concepts cited in Why. */
export function canSelfGrade(text: AdrText, concepts: readonly ConceptName[]): boolean {
  if (ADR_FIELDS.some((field) => text[field].trim() === '')) return false;
  return citationsOf(text.why, concepts).ids.length >= MIN_CITATIONS;
}
