import { DAY_MS } from './day.ts';
import type { ConceptMemory, MemoryContent, MemoryState } from './memory.ts';
import { recall } from './srs.ts';

/**
 * Module mastery (spec 3.8): the mean over a module's tested concepts of recall a week ahead,
 * gated by success on two different study days, so one day of cramming cannot fill a hex.
 */
export const HORIZON_DAYS = 7;

/** 0 with no success day, 0.5 with one, 1 with two or more. */
export function successGate(cm: ConceptMemory | undefined): number {
  return Math.min(1, (cm?.successDays.length ?? 0) / 2);
}

/** Recall at `at` times the success gate; 0 without a card. */
export function conceptMastery(cm: ConceptMemory | undefined, at: Date): number {
  if (!cm?.card) return 0;
  return recall(cm.card, at) * successGate(cm);
}

/** Mastery 0 to 100 per module that homes a tested concept, read `HORIZON_DAYS` after `now`. */
export function moduleMastery(
  memory: MemoryState,
  content: MemoryContent,
  now: Date,
): ReadonlyMap<number, number> {
  const ahead = new Date(now.getTime() + HORIZON_DAYS * DAY_MS);
  const sums = new Map<number, { total: number; count: number }>();
  for (const [id, info] of content.concepts) {
    if (!info.tested) continue;
    const sum = sums.get(info.module) ?? { total: 0, count: 0 };
    sum.total += conceptMastery(memory.concepts.get(id), ahead);
    sum.count += 1;
    sums.set(info.module, sum);
  }
  const out = new Map<number, number>();
  for (const [module, { total, count }] of [...sums].sort((a, b) => a[0] - b[0])) {
    out.set(module, Math.round((100 * total) / count));
  }
  return out;
}

export type HexBand = 'outline' | 'faint' | 'light' | 'solid' | 'mastered';

/** The hex band of a mastery value; the top band needs a passed boss, else it stays `solid`. */
export function hexBand(mastery: number, bossPassed: boolean): HexBand {
  if (mastery >= 80) return bossPassed ? 'mastered' : 'solid';
  if (mastery >= 60) return 'solid';
  if (mastery >= 40) return 'light';
  if (mastery >= 20) return 'faint';
  return 'outline';
}

export const BAND_LABEL: Record<HexBand, string> = {
  outline: 'not started',
  faint: 'started',
  light: 'learning',
  solid: 'solid',
  mastered: 'mastered',
};
