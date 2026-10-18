import { BADGE_IDS, type BadgeIdValue, DOMAIN_IDS, type DomainIdValue } from '../../schemas/ids.ts';

/**
 * Badges (spec 3.10): derived inside `deriveMemory` as the first event at which each rule held, so a badge
 * never disappears and pays no XP. Lab, mission and capstone badges become earnable when their content ships.
 */
export type BadgeId = BadgeIdValue;

/** The 12 badges in spec 3.10 order. */
export const BADGES: readonly BadgeId[] = BADGE_IDS;

export interface BadgeEarned {
  /** The study day of the event that earned it. */
  day: string;
  eventId: string;
}

export const CLEAN_QUEUE = { reviews: 10, days: 7 } as const;
export const CHANGED_MIND = 5;
export const LONG_MEMORY = { concepts: 50, stabilityDays: 21 } as const;
export const CALIBRATION = { window: 150, minEach: 40, sure: 0.85, notSure: 0.75 } as const;
export const HANDS_ON_MODULES = 5;
/** Core labs per module (spec 5): Hands On counts a module only when it lists this many and all are done. */
export const CORE_LABS_PER_MODULE = 2;
export const CORE_LABS = 26;
export const LEAVE_NO_TRACE = 3;
export const PASS_MARK = 0.8;
export const EVEN_KEEL = 0.75;
export const ARCHITECT = { decisions: 13, minTotal: 8 } as const;

export interface Calibration {
  sure: { right: number; total: number };
  notSure: { right: number; total: number };
}

/** Sure and Not sure accuracy over a window of counted answers. */
export function calibrationOf(window: readonly { correct: boolean; sure: boolean }[]): Calibration {
  const c: Calibration = { sure: { right: 0, total: 0 }, notSure: { right: 0, total: 0 } };
  for (const a of window) {
    const side = a.sure ? c.sure : c.notSure;
    side.total++;
    if (a.correct) side.right++;
  }
  return c;
}

/** At least 40 of each, Sure right at least 85% of the time and Not sure right at most 75%. */
export function wellCalibrated(c: Calibration): boolean {
  return (
    c.sure.total >= CALIBRATION.minEach &&
    c.notSure.total >= CALIBRATION.minEach &&
    c.sure.right / c.sure.total >= CALIBRATION.sure &&
    c.notSure.right / c.notSure.total <= CALIBRATION.notSure
  );
}

/**
 * A capstone decision's rubric total. It lives here rather than in the capstone engine, so the eager XP and badge
 * derivation does not pull the capstone helpers into the initial bundle.
 */
export function scoreTotal(scores: readonly number[]): number {
  return scores.reduce((sum, s) => sum + s, 0);
}

/** A capstone decision passes with a total of at least 8 of 12 and no criterion at 0. */
export function decisionPasses(scores: readonly number[]): boolean {
  return scoreTotal(scores) >= ARCHITECT.minTotal && scores.every((s) => s > 0);
}

/** Right and total per exam domain, in domain order; an item's domain is its task's first digit. */
export function domainScores(
  answers: readonly { qid: string; correct: boolean }[],
  taskOf: ReadonlyMap<string, string>,
): Map<DomainIdValue, { correct: number; total: number }> {
  const scores = new Map<DomainIdValue, { correct: number; total: number }>(
    DOMAIN_IDS.map((d) => [d, { correct: 0, total: 0 }]),
  );
  for (const a of answers) {
    const domain = scores.get((taskOf.get(a.qid) ?? '').split('.')[0] as DomainIdValue);
    if (domain === undefined) continue;
    domain.total++;
    if (a.correct) domain.correct++;
  }
  return scores;
}
