import type { Mode, StudyEvent } from '../../schemas/events.ts';
import { betXp } from './bets.ts';
import { addDays, dayStartAt, nextDayStart, studyDayAt } from './day.ts';
import type { SessionState } from './replay.ts';
import { capDue, rate, recall, review, type SrsCard, type SrsRating } from './srs.ts';
import { effortBonus, XP } from './xp.ts';

/**
 * The memory replay (spec 3.1, 3.2, 3.5 and 3.6): one FSRS card per tested concept, XP, misconceptions
 * and qualifying days, all derived from the event log and the shipped content, never stored.
 * It sits beside `derive` because it needs the content, while `derive` must work without it.
 */

/** The modes whose answers count toward memory (spec 3.1); lightning, bosses and mocks do not, yet. */
export const COUNTING_MODES: ReadonlySet<Mode> = new Set<Mode>([
  'check',
  'quiz',
  'focus',
  'review',
  'incident',
]);

/** Catch-up (spec 3.7): above this many due concepts, a day's plan is the lowest-R `CATCH_UP_PLAN`. */
export const CATCH_UP_OVER = 100;
export const CATCH_UP_PLAN = 60;

export interface ConceptInfo {
  module: number;
  tested: boolean;
  confusableWith: readonly string[];
  splitFrom: string | null;
}

/** What the replay needs from the content index; `aliases` maps an alias to its surviving concept id. */
export interface MemoryContent {
  concepts: ReadonlyMap<string, ConceptInfo>;
  aliases: ReadonlyMap<string, string>;
  questionVersions: ReadonlyMap<string, number>;
}

export interface Misconception {
  qid: string;
  day: string;
}

export interface ConceptMemory {
  card: SrsCard | null;
  /** The study day of the concept's first FSRS update. */
  enteredOn: string | null;
  /** The study day of its latest non-relearn counted answer. */
  lastAnswerDay: string | null;
  /** The study day and rating of its latest day's FSRS update. */
  fsrsDay: string | null;
  fsrsRating: SrsRating | null;
  /** The study day an extra Again was applied, so a day applies at most one. */
  extraAgainDay: string | null;
  /** Study days with a right counted answer, oldest first. */
  successDays: readonly string[];
  misconception: Misconception | null;
}

export interface MemoryState {
  concepts: ReadonlyMap<string, ConceptMemory>;
  xp: number;
  /** Answer and lesson events that earned XP, by event id; events that earned 0 are absent. */
  xpByEvent: ReadonlyMap<string, number>;
  xpByDay: ReadonlyMap<string, number>;
  /** Every question id answered in any mode. */
  answered: ReadonlySet<string>;
  qualifyingDays: ReadonlySet<string>;
  /** Concepts that entered FSRS, by study day. */
  newByDay: ReadonlyMap<string, number>;
  /** The catch-up plan of each study day that opened with more than `CATCH_UP_OVER` due concepts. */
  catchUpPlans: ReadonlyMap<string, readonly string[]>;
  examDate: string | null;
  /** Counted answers to an older question version, kept for XP and left out of FSRS (spec 8.4). */
  staleAnswers: number;
}

interface MutableConcept extends ConceptMemory {
  successDays: string[];
}

type AnswerEvent = Extract<StudyEvent, { t: 'answer' }>;

const byId = (a: StudyEvent, b: StudyEvent): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const freshConcept = (): MutableConcept => ({
  card: null,
  enteredOn: null,
  lastAnswerDay: null,
  fsrsDay: null,
  fsrsRating: null,
  extraAgainDay: null,
  successDays: [],
  misconception: null,
});

/** The concept an id stands for: itself or its alias target, when that concept exists and is tested. */
export function resolveConcept(content: MemoryContent, id: string): string | null {
  const target = content.concepts.has(id) ? id : (content.aliases.get(id) ?? id);
  return content.concepts.get(target)?.tested === true ? target : null;
}

/** A card is due when its due time falls before the 04:00 that ends the study day of `at`. */
export function isDue(card: SrsCard, at: Date, tz: number): boolean {
  return Date.parse(card.due) < nextDayStart(at, tz).getTime();
}

/** The exam date of the last `settings` event that sets one (or clears it); replay uses it throughout. */
function examDateOf(sorted: readonly StudyEvent[]): string | null {
  let examDate: string | null = null;
  for (const e of sorted) {
    if (e.t === 'settings' && 'examDate' in e.patch) examDate = e.patch.examDate ?? null;
  }
  return examDate;
}

/** The ids with the lowest recall at `at`, ties by id. */
function lowestRecall(cards: readonly (readonly [string, SrsCard])[], at: Date, count: number): string[] {
  return cards
    .map(([id, card]) => ({ id, r: recall(card, at) }))
    .sort((a, b) => a.r - b.r || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, count)
    .map((x) => x.id);
}

/** Replays the log in id order into memory state; unknown ids are skipped, never thrown on (spec 8.4). */
export function deriveMemory(events: readonly StudyEvent[], content: MemoryContent): MemoryState {
  const sorted = [...events].sort(byId);
  const examDate = examDateOf(sorted);
  const splitSources = new Set<string>();
  for (const info of content.concepts.values()) if (info.splitFrom !== null) splitSources.add(info.splitFrom);

  const concepts = new Map<string, MutableConcept>();
  const xpByEvent = new Map<string, number>();
  const xpByDay = new Map<string, number>();
  const answered = new Set<string>();
  const qualifyingDays = new Set<string>();
  const newByDay = new Map<string, number>();
  const catchUpPlans = new Map<string, readonly string[]>();
  const starts = new Map<string, { at: string; tz: number }>();
  const lessons = new Set<string>();
  let xp = 0;
  let staleAnswers = 0;

  let day: string | null = null;
  let dayTz = 0;
  let completion = false;
  let countedAnswer = false;

  /** A memory key: a tested concept, or the old id of a split, whose card the new concepts copy. */
  const keyOf = (id: string): string | null => {
    const resolved = resolveConcept(content, id);
    if (resolved !== null) return resolved;
    return splitSources.has(id) && !content.concepts.has(id) ? id : null;
  };

  const testedCards = (): [string, SrsCard][] => {
    const out: [string, SrsCard][] = [];
    for (const [id, cm] of concepts) {
      if (cm.card !== null && content.concepts.get(id)?.tested === true) out.push([id, cm.card]);
    }
    return out;
  };

  const earn = (e: StudyEvent, amount: number) => {
    if (amount <= 0) return;
    xp += amount;
    xpByEvent.set(e.id, amount);
    xpByDay.set(e.day, (xpByDay.get(e.day) ?? 0) + amount);
  };

  const openDay = (e: StudyEvent) => {
    if (catchUpPlans.has(e.day)) return;
    const at = new Date(e.at);
    const due = testedCards().filter(([, card]) => isDue(card, at, e.tz));
    if (due.length > CATCH_UP_OVER) catchUpPlans.set(e.day, lowestRecall(due, at, CATCH_UP_PLAN));
  };

  const closeDay = () => {
    if (day === null) return;
    if (completion) {
      qualifyingDays.add(day);
      return;
    }
    if (!countedAnswer) return;
    const end = dayStartAt(addDays(day, 1), dayTz).getTime();
    const clear = testedCards().every(([, card]) => Date.parse(card.due) >= end);
    const today = day;
    const plan = catchUpPlans.get(today);
    const planDone = plan?.every((id) => concepts.get(id)?.lastAnswerDay === today) === true;
    if (clear || planDone) qualifyingDays.add(today);
  };

  const update = (cm: MutableConcept, key: string, rating: SrsRating, e: AnswerEvent) => {
    const next = review(cm.card, rating, new Date(e.at));
    const due = capDue(new Date(next.due), { concept: key, reviewDay: e.day, examDate, tz: e.tz });
    cm.card = { ...next, due: due.toISOString() };
  };

  const firstOfDay = (cm: MutableConcept, key: string, e: AnswerEvent, stale: boolean, isNew: boolean) => {
    const card = cm.card;
    const start = starts.get(e.sid) ?? { at: e.at, tz: e.tz };
    const dueAtStart = card === null || isDue(card, new Date(start.at), start.tz);
    if (dueAtStart) {
      const shown = new Date(Date.parse(e.at) - e.ms);
      const bonus = card !== null && e.correct ? effortBonus(recall(card, shown)) : 0;
      earn(e, betXp(e.correct, e.sure) + bonus);
      if (!stale) {
        const rating = rate(e.correct, e.sure);
        update(cm, key, rating, e);
        cm.fsrsDay = e.day;
        cm.fsrsRating = rating;
        if (card === null) {
          cm.enteredOn = e.day;
          newByDay.set(e.day, (newByDay.get(e.day) ?? 0) + 1);
        }
      }
    } else if (isNew) {
      earn(e, betXp(e.correct, e.sure));
    }
    if (e.correct && !cm.successDays.includes(e.day)) cm.successDays.push(e.day);
  };

  const laterAnswer = (cm: MutableConcept, key: string, e: AnswerEvent, stale: boolean) => {
    const extraAgain =
      !e.correct &&
      !stale &&
      cm.card !== null &&
      cm.fsrsDay === e.day &&
      cm.extraAgainDay !== e.day &&
      (cm.fsrsRating === 'hard' || cm.fsrsRating === 'good');
    if (!extraAgain) return;
    update(cm, key, 'again', e);
    cm.extraAgainDay = e.day;
  };

  const applyAnswer = (e: AnswerEvent) => {
    const key = keyOf(e.concept);
    const shipped = content.questionVersions.get(e.qid);
    const stale = shipped !== undefined && e.qv < shipped;
    const isNew = !answered.has(e.qid);
    if (!COUNTING_MODES.has(e.mode) || key === null) {
      answered.add(e.qid);
      return;
    }
    let cm = concepts.get(key);
    if (!cm) {
      cm = freshConcept();
      const from = content.concepts.get(key)?.splitFrom ?? null;
      const old = from === null ? undefined : concepts.get(from);
      if (old?.card) {
        cm.card = old.card;
        cm.enteredOn = old.enteredOn;
      }
      concepts.set(key, cm);
    }
    if (stale) staleAnswers++;
    if (e.relearn !== true) {
      countedAnswer = true;
      if (cm.lastAnswerDay !== e.day) firstOfDay(cm, key, e, stale, isNew);
      else laterAnswer(cm, key, e, stale);
      cm.lastAnswerDay = e.day;
    }
    const mark = cm.misconception;
    if (!e.correct && e.sure) cm.misconception = { qid: e.qid, day: e.day };
    else if (e.correct && e.sure && mark && mark.qid !== e.qid && e.day > mark.day) cm.misconception = null;
    answered.add(e.qid);
  };

  for (const e of sorted) {
    if (e.day !== day) {
      closeDay();
      day = e.day;
      completion = false;
      countedAnswer = false;
      openDay(e);
    }
    dayTz = e.tz;
    switch (e.t) {
      case 'session':
        if (e.phase === 'start') starts.set(e.sid, { at: e.at, tz: e.tz });
        break;
      case 'lesson.done':
        if (!lessons.has(e.note)) {
          lessons.add(e.note);
          earn(e, XP.lesson);
          completion = true;
        }
        break;
      case 'answer':
        applyAnswer(e);
        break;
      default:
        break;
    }
  }
  closeDay();

  for (const [id, info] of content.concepts) {
    if (info.splitFrom === null || concepts.has(id)) continue;
    const old = concepts.get(info.splitFrom);
    if (old?.card) concepts.set(id, { ...freshConcept(), card: old.card, enteredOn: old.enteredOn });
  }

  return {
    concepts,
    xp,
    xpByEvent,
    xpByDay,
    answered,
    qualifyingDays,
    newByDay,
    catchUpPlans,
    examDate,
    staleAnswers,
  };
}

export interface SessionSummary {
  correct: number;
  total: number;
  xp: number;
  /** Concepts of the session that fall due on the next study day. */
  backTomorrow: number;
}

/** The end line's numbers for one session, read at `now` in offset `tz`. */
export function sessionSummary(
  session: SessionState,
  memory: MemoryState,
  content: MemoryContent,
  now: Date,
  tz: number,
): SessionSummary {
  let correct = 0;
  let xp = 0;
  const touched = new Set<string>();
  for (const a of session.answers.values()) {
    if (a.correct && !a.relearn) correct++;
    xp += memory.xpByEvent.get(a.id) ?? 0;
    const key = resolveConcept(content, a.concept);
    if (key !== null) touched.add(key);
  }
  const from = nextDayStart(now, tz).getTime();
  const to = dayStartAt(addDays(studyDayAt(now, tz), 2), tz).getTime();
  let backTomorrow = 0;
  for (const id of touched) {
    const due = memory.concepts.get(id)?.card?.due;
    if (due === undefined) continue;
    const t = Date.parse(due);
    if (t >= from && t < to) backTomorrow++;
  }
  return { correct, total: session.qids.length, xp, backTomorrow };
}
