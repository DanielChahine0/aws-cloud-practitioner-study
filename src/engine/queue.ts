import { dayStartAt, daysBetween, nextDayStart, studyDayAt } from './day.ts';
import { CATCH_UP_OVER, CATCH_UP_PLAN, type MemoryContent, type MemoryState } from './memory.ts';
import { recall, type SrsCard } from './srs.ts';

/**
 * The review queue (spec 3.6 and 3.7): which concepts to review now, in which order,
 * and whether new lessons may start today.
 */
export const CHUNK_SIZE = 20;
export const LOOKAHEAD = 5;
export const CONFUSABLE_DAYS = 2;
export const CONFUSABLE_GAP = 3;
export const NEW_CONCEPT_CAP = 20;
export const ITEM_SECONDS = 30;

export interface ReviewQueue {
  /** Concept ids in review order. */
  items: readonly string[];
  /** Tested concepts due before the next 04:00. */
  due: number;
  misconceptions: number;
  catchUp: boolean;
  newToday: number;
  lessonsAllowed: boolean;
  /** When nothing is queued: how many concepts fall due on the next study day that has any, and its 04:00. */
  next: { count: number; at: string } | null;
}

interface Scored {
  id: string;
  r: number;
}

const byRecall = (a: Scored, b: Scored): number => a.r - b.r || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Takes the first of the next `LOOKAHEAD` items whose module differs from the last placed one. */
function interleave(ids: readonly string[], moduleOf: (id: string) => number): string[] {
  const rest = [...ids];
  const out: string[] = [];
  while (rest.length > 0) {
    const last = out.at(-1);
    let pick = 0;
    if (last !== undefined) {
      const window = Math.min(LOOKAHEAD, rest.length);
      for (let i = 0; i < window; i++) {
        if (moduleOf(rest[i] as string) !== moduleOf(last)) {
          pick = i;
          break;
        }
      }
    }
    out.push(...rest.splice(pick, 1));
  }
  return out;
}

/** Pulls a confusable partner up to `CONFUSABLE_GAP` positions after its pair when their dues are close. */
function pairUp(
  ids: readonly string[],
  partnersOf: (id: string) => readonly string[],
  dueDayOf: (id: string) => string | null,
): string[] {
  const out = [...ids];
  for (let i = 0; i < out.length; i++) {
    const a = out[i] as string;
    for (const b of partnersOf(a)) {
      const j = out.indexOf(b);
      const target = i + CONFUSABLE_GAP;
      if (j <= target) continue;
      const dayA = dueDayOf(a);
      const dayB = dueDayOf(b);
      if (dayA === null || dayB === null || Math.abs(daysBetween(dayA, dayB)) > CONFUSABLE_DAYS) continue;
      out.splice(j, 1);
      out.splice(target, 0, b);
    }
  }
  return out;
}

export function reviewQueue(memory: MemoryState, content: MemoryContent, now: Date, tz: number): ReviewQueue {
  const today = studyDayAt(now, tz);
  const horizon = nextDayStart(now, tz).getTime();
  const cards = new Map<string, SrsCard>();
  for (const [id, cm] of memory.concepts) {
    if (cm.card && content.concepts.get(id)?.tested) cards.set(id, cm.card);
  }
  const score = (id: string): Scored => {
    const card = cards.get(id);
    return { id, r: card ? recall(card, now) : 0 };
  };

  const dueSet: Scored[] = [];
  for (const [id, card] of cards) if (Date.parse(card.due) < horizon) dueSet.push(score(id));
  dueSet.sort(byRecall);

  const marked: Scored[] = [];
  for (const [id, cm] of memory.concepts) {
    if (cm.misconception && cm.lastAnswerDay !== today && content.concepts.get(id)?.tested)
      marked.push(score(id));
  }
  marked.sort(byRecall);

  let plan = memory.catchUpPlans.get(today);
  if (plan === undefined && dueSet.length > CATCH_UP_OVER)
    plan = dueSet.slice(0, CATCH_UP_PLAN).map((s) => s.id);
  const catchUp = plan !== undefined;
  const dueIds = new Set(dueSet.map((s) => s.id));
  const base = plan ? dueSet.filter((s) => plan.includes(s.id)) : dueSet;

  const markedIds = new Set(marked.map((s) => s.id));
  const ordered = [...marked.map((s) => s.id), ...base.filter((s) => !markedIds.has(s.id)).map((s) => s.id)];
  const moduleOf = (id: string) => content.concepts.get(id)?.module ?? 0;
  const dueDayOf = (id: string) => {
    const card = cards.get(id);
    return card ? studyDayAt(new Date(card.due), tz) : null;
  };
  const items = pairUp(
    interleave(ordered, moduleOf),
    (id) => content.concepts.get(id)?.confusableWith ?? [],
    dueDayOf,
  );

  const due = dueIds.size;
  const newToday = memory.newByDay.get(today) ?? 0;
  const lessonsAllowed = newToday < NEW_CONCEPT_CAP && !(catchUp && due >= CATCH_UP_OVER);

  let next: ReviewQueue['next'] = null;
  if (items.length === 0 && cards.size > 0) {
    let earliest: number | null = null;
    for (const card of cards.values()) {
      const t = Date.parse(card.due);
      if (t >= horizon && (earliest === null || t < earliest)) earliest = t;
    }
    if (earliest !== null) {
      const day = studyDayAt(new Date(earliest), tz);
      const start = dayStartAt(day, tz);
      const end = nextDayStart(start, tz).getTime();
      let count = 0;
      for (const card of cards.values()) if (Date.parse(card.due) < end) count++;
      next = { count, at: start.toISOString() };
    }
  }

  return { items, due, misconceptions: marked.length, catchUp, newToday, lessonsAllowed, next };
}
