/** Pure helpers for the module page and the lesson recall dots (spec 7.3), so the tests run without a browser. */
import type { ContentIndex } from '../../schemas/chunks.ts';
import { BOSS_MINUTES, BOSS_SIZE, type BossStatus } from '../engine/boss.ts';
import { studyDayAt } from '../engine/day.ts';
import { BAND_LABEL, conceptMastery, type HexBand } from '../engine/mastery.ts';
import { bossPassMark, type MemoryState } from '../engine/memory.ts';
import { shortDate } from './dates.ts';
import { pad2 } from './router.ts';

const HOUR_MS = 3_600_000;

export interface ConceptRow {
  id: string;
  name: string;
  /** Concept mastery now, 0 to 100. */
  mastery: number;
  /** The study day the concept is next due, or null without a card. */
  due: string | null;
}

/** Tested concepts weakest first, then by id, each with its next-due study day in the zone `tz` (minutes east of UTC). */
export function weakestConcepts(
  ids: readonly string[],
  names: ReadonlyMap<string, string>,
  memory: MemoryState,
  now: Date,
  tz: number,
): ConceptRow[] {
  return ids
    .map((id) => {
      const cm = memory.concepts.get(id);
      const card = cm?.card ?? null;
      return {
        id,
        name: names.get(id) ?? id,
        mastery: Math.round(100 * conceptMastery(cm, now)),
        due: card === null ? null : studyDayAt(new Date(card.due), tz),
      };
    })
    .sort((a, b) => a.mastery - b.mastery || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * A concept row's marks: `not studied`, or `mastery 32` and `due today` or `due Oct 14` (date by `shortDate`). Each
 * mark is one unbreakable phrase, so a narrow row wraps between marks and never splits a date from its label.
 */
export function conceptMarks(row: ConceptRow, today: string): string[] {
  if (row.due === null) return ['not studied'];
  return [`mastery ${row.mastery}`, `due ${row.due <= today ? 'today' : shortDate(row.due)}`];
}

/** The Boss section's line (spec 3.11 and 4.2): locked, passed, cooling down, or open; the pass day is in the zone `tz`. */
export function bossLineOf(s: BossStatus, now: Date, tz: number): string {
  if (!s.unlocked) return 'Opens after you read every lesson of this module.';
  const passed =
    s.passed && s.passedAt !== null ? `Passed on ${shortDate(studyDayAt(new Date(s.passedAt), tz))}.` : null;
  const cooling =
    s.cooldownUntil === null
      ? null
      : `Next try in ${Math.max(1, Math.ceil((Date.parse(s.cooldownUntil) - now.getTime()) / HOUR_MS))} h.`;
  // A passed boss that is cooling down says both, so the missing Start button always has its reason.
  if (passed !== null || cooling !== null) return [passed, cooling].filter((x) => x !== null).join(' ');
  return `${BOSS_SIZE} questions in ${BOSS_MINUTES} minutes; ${bossPassMark(BOSS_SIZE)} right to pass.`;
}

/** `Mastery 64 · solid`, with ` · boss passed` once the boss is passed (spec 7.3). */
export function masteryLine(mastery: number, band: HexBand, bossPassed: boolean): string {
  return `Mastery ${mastery} · ${BAND_LABEL[band]}${bossPassed ? ' · boss passed' : ''}`;
}

/** One row of the module page's Labs section (spec 7.2): engine word (`Sort`), title, minutes and done mark. */
export interface LabRow {
  id: string;
  title: string;
  href: string;
  minutes: number;
  engine: string;
  done: boolean;
}

/** What the Labs section says when the module has no lab yet. */
export const NO_LABS = 'No labs for this module yet.';

/** The module's labs in index order (core before stretch, then id), each marked done once a `lab.done` exists. */
export function labRows(
  idx: Pick<ContentIndex, 'labs'>,
  module: number,
  done: ReadonlySet<string>,
): LabRow[] {
  return idx.labs
    .filter((lab) => lab.module === module)
    .map((lab) => ({
      id: lab.id,
      title: lab.title,
      href: `#/m/${pad2(module)}/lab/${lab.id}`,
      minutes: lab.minutes,
      engine: `${lab.engine[0]?.toUpperCase()}${lab.engine.slice(1)}`,
      done: done.has(lab.id),
    }));
}

/** Recall bands for the lesson dots (spec 3.6): weak below 0.70, fading below 0.90, else strong. */
export type RecallBand = 'none' | 'weak' | 'fading' | 'strong';

export function recallBand(r: number | null): RecallBand {
  if (r === null) return 'none';
  if (r < 0.7) return 'weak';
  if (r < 0.9) return 'fading';
  return 'strong';
}

export const RECALL_LABEL: Record<RecallBand, string> = {
  none: 'not studied',
  weak: 'weak',
  fading: 'fading',
  strong: 'strong',
};
