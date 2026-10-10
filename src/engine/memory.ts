import type { Mode, StudyEvent } from '../../schemas/events.ts';
import { FORM_IDS } from '../../schemas/ids.ts';
import {
  ARCHITECT,
  type BadgeEarned,
  type BadgeId,
  CALIBRATION,
  type Calibration,
  CHANGED_MIND,
  CLEAN_QUEUE,
  CORE_LABS,
  CORE_LABS_PER_MODULE,
  calibrationOf,
  decisionPasses,
  domainScores,
  EVEN_KEEL,
  HANDS_ON_MODULES,
  LEAVE_NO_TRACE,
  LONG_MEMORY,
  PASS_MARK,
  wellCalibrated,
} from './badges.ts';
import { betXp } from './bets.ts';
import { scoreTotal } from './capstone.ts';
import { addDays, dayStartAt, nextDayStart, studyDayAt } from './day.ts';
import { GATE_MISSION, type MissionRef, type OpenMissionLog, stepMission } from './mission-log.ts';
import type { SessionState } from './replay.ts';
import { capDue, capDueOn, rate, recall, review, type SrsCard, type SrsRating } from './srs.ts';
import { effortBonus, XP } from './xp.ts';

/**
 * The memory replay (spec 3.1, 3.2, 3.5 and 3.6): one FSRS card per tested concept, XP, misconceptions
 * and qualifying days, all derived from the event log and the shipped content, never stored.
 * It sits beside `derive` because it needs the content, while `derive` must work without it.
 */

/** The modes whose answers count toward memory (spec 3.1), lab debriefs among them; lightning, bosses and mocks do not. */
export const COUNTING_MODES: ReadonlySet<Mode> = new Set<Mode>([
  'check',
  'quiz',
  'focus',
  'review',
  'incident',
  'debrief',
]);

/**
 * Boss and mock answers (spec 3.1, 4.1): held per session and applied once, on its first submit,
 * with no XP per item, no success day and at most one update per concept per day.
 */
export const EXAM_MODES: ReadonlySet<Mode> = new Set<Mode>(['boss', 'mock']);

/** The boss pass mark: 80% of the drawn items, rounded up, so 12 of 15 (spec 4.2). */
export function bossPassMark(total: number): number {
  return Math.ceil((4 * total) / 5);
}

/** Catch-up (spec 3.7): above this many due concepts, a day's plan is the lowest-R `CATCH_UP_PLAN`. */
export const CATCH_UP_OVER = 100;
export const CATCH_UP_PLAN = 60;

export interface ConceptInfo {
  module: number;
  tested: boolean;
  confusableWith: readonly string[];
  splitFrom: string | null;
  /** The blueprint task ids the concept is tagged with (`2.3`). */
  tasks: readonly string[];
}

/** What the replay needs from the content index; `aliases` maps an alias to its surviving concept id. */
export interface MemoryContent {
  concepts: ReadonlyMap<string, ConceptInfo>;
  aliases: ReadonlyMap<string, string>;
  questionVersions: ReadonlyMap<string, number>;
  /** Exam-pool question id to its blueprint task, for every item of a form. */
  examTasks: ReadonlyMap<string, string>;
  /** Module number to its core lab ids; empty until labs ship (Phase 4). */
  coreLabs: ReadonlyMap<number, readonly string[]>;
  /** Missions whose resources are kept on purpose, so they never count as cleaned up. */
  keptMissions: ReadonlySet<string>;
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
  /** Answer, lesson, lab, incident, exam, mission and decision events that earned XP, by event id; 0 is absent. */
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
  /** Study days with a submitted boss or mock, each of which qualifies (spec 3.5). */
  examsDone: ReadonlySet<string>;
  /** Each badge with the first event at which its rule held (spec 3.10). */
  badges: ReadonlyMap<BadgeId, BadgeEarned>;
  /** Sure and Not sure accuracy over the last 150 counted answers. */
  calibration: Calibration;
}

interface MutableConcept extends ConceptMemory {
  successDays: string[];
}

type AnswerEvent = Extract<StudyEvent, { t: 'answer' }>;
type ReviewNowEvent = Extract<StudyEvent, { t: 'review.now' }>;
type SessionEvent = Extract<StudyEvent, { t: 'session' }>;

const FORMS: ReadonlySet<string> = new Set(FORM_IDS);

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

/** The ids with the lowest recall at `at`, ties by id. */
function lowestRecall(cards: readonly (readonly [string, SrsCard])[], at: Date, count: number): string[] {
  return cards
    .map(([id, card]) => ({ id, r: recall(card, at) }))
    .sort((a, b) => a.r - b.r || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, count)
    .map((x) => x.id);
}

/**
 * The part of a concept's memory an exam date can change (spec 3.6): its card and its day's FSRS update.
 * A state is never changed in place, so each step keeps the state it started from.
 */
interface CardState {
  readonly card: SrsCard | null;
  readonly enteredOn: string | null;
  readonly fsrsDay: string | null;
  readonly fsrsRating: SrsRating | null;
  readonly extraAgainDay: string | null;
  /** Whether its latest FSRS update left a stability of `LONG_MEMORY.stabilityDays` or more. */
  readonly long: boolean;
}

const NO_CARD: CardState = {
  card: null,
  enteredOn: null,
  fsrsDay: null,
  fsrsRating: null,
  extraAgainDay: null,
  long: false,
};

interface SessionStart {
  at: string;
  tz: number;
}

/** An FSRS update a step made: the due FSRS gave, and the due the exam cap left of it. */
interface Made {
  readonly due: number;
  readonly capped: number;
  /** The study day of `due` in the answer's offset, worked out the first time an exam date needs it. */
  dueDay: string | null;
}

/**
 * One answer that reaches a card, with all it needs but the exam date, so a new date can run it again: a counted
 * answer that is the concept's first of the day or a later one, or a boss or mock answer applied on submit.
 */
interface AnswerStep {
  /** When it ran, on the replay's clock of steps, day openings and new keys. */
  readonly tick: number;
  readonly kind: 'first' | 'later' | 'exam';
  readonly e: AnswerEvent;
  readonly start: SessionStart;
  readonly stale: boolean;
  before: CardState;
  made: Made | null;
}

/**
 * A `review.now` that reaches a card (spec 3.6): it makes the card due at the start of the event's study day,
 * with no review and no rating, and stays on the track so a new exam date runs it again in its place.
 */
interface NowStep {
  readonly tick: number;
  readonly kind: 'now';
  readonly e: ReviewNowEvent;
  before: CardState;
}

type Step = AnswerStep | NowStep;

/** The card history of one memory key, so a new exam date runs again only the steps whose outcome it changes. */
interface Track {
  readonly key: string;
  readonly tested: boolean;
  readonly created: number;
  /** The key whose card it took when it was created: the old id of a split. */
  readonly from: string | null;
  initial: CardState;
  readonly steps: Step[];
  state: CardState;
}

interface Outcome {
  state: CardState;
  made: Made | null;
  /** Whether the card was due when the answer's session started, or had none (spec 3.1). */
  due: boolean;
}

/**
 * One FSRS update at the answer's time, or at the card's last review when that is later: a boss or mock answer is
 * held until its submit, so the card may have been reviewed after it, and FSRS never steps back.
 */
function updated(
  s: CardState,
  key: string,
  tested: boolean,
  rating: SrsRating,
  e: AnswerEvent,
  examDate: string | null,
): { card: SrsCard; long: boolean; made: Made } {
  const last = s.card?.lastReview ?? null;
  const moment = last !== null && last > e.at ? last : e.at;
  const next = review(s.card, rating, new Date(moment));
  const due = Date.parse(next.due);
  const capped = capDue(new Date(due), { concept: key, reviewDay: e.day, examDate, tz: e.tz }).getTime();
  return {
    card: { ...next, due: new Date(capped).toISOString() },
    long: tested ? next.stability >= LONG_MEMORY.stabilityDays : s.long,
    made: { due, capped, dueDay: null },
  };
}

/** The extra Again of a wrong answer after the day's FSRS update, at most one a day. */
function extraAgain(
  s: CardState,
  key: string,
  tested: boolean,
  e: AnswerEvent,
  stale: boolean,
  examDate: string | null,
): Outcome {
  const applies =
    !e.correct &&
    !stale &&
    s.card !== null &&
    s.fsrsDay === e.day &&
    s.extraAgainDay !== e.day &&
    (s.fsrsRating === 'hard' || s.fsrsRating === 'good');
  if (!applies) return { state: s, made: null, due: false };
  const { card, long, made } = updated(s, key, tested, 'again', e, examDate);
  return { state: { ...s, card, long, extraAgainDay: e.day }, made, due: false };
}

/**
 * Runs a step on `s` under `examDate`. The day's first counted answer updates when due at start or new; a boss or
 * mock answer applies Again when wrong whatever the due state, and Hard (flagged) or Good when right only when due
 * at start or new; a concept already updated that day gets only the one extra Again of a later wrong answer.
 */
function runStep(s: CardState, key: string, tested: boolean, step: Step, examDate: string | null): Outcome {
  if (step.kind === 'now') return { state: dueToday(s, step.e), made: null, due: false };
  const { e, start, kind } = step;
  if (kind === 'later') return extraAgain(s, key, tested, e, step.stale, examDate);
  if (kind === 'exam' && s.fsrsDay === e.day) return extraAgain(s, key, tested, e, false, examDate);
  const card = s.card;
  const due = card === null || isDue(card, new Date(start.at), start.tz);
  let rating: SrsRating | null = null;
  if (kind === 'first') rating = due && !step.stale ? rate(e.correct, e.sure) : null;
  else if (!e.correct || due) rating = e.correct ? rate(true, e.flagged !== true) : 'again';
  if (rating === null) return { state: s, made: null, due };
  const u = updated(s, key, tested, rating, e, examDate);
  const enteredOn = card === null ? e.day : s.enteredOn;
  const state = { ...s, card: u.card, long: u.long, enteredOn, fsrsDay: e.day, fsrsRating: rating };
  return { state, made: u.made, due };
}

/** The card made due at the start of the study day of `e`, unless it already falls due earlier. */
function dueToday(s: CardState, e: ReviewNowEvent): CardState {
  if (s.card === null) return s;
  const due = Math.min(Date.parse(s.card.due), dayStartAt(e.day, e.tz).getTime());
  if (due === Date.parse(s.card.due)) return s;
  return { ...s, card: { ...s.card, due: new Date(due).toISOString() } };
}

/** The due a step's update would have under `examDate`, from the due FSRS gave it. */
function cappedUnder(made: Made, key: string, e: AnswerEvent, examDate: string | null): number {
  if (examDate === null || e.day >= examDate) return made.due;
  made.dueDay ??= studyDayAt(new Date(made.due), e.tz);
  return capDueOn(new Date(made.due), made.dueDay, {
    concept: key,
    reviewDay: e.day,
    examDate,
    tz: e.tz,
  }).getTime();
}

/** The state of a track just before `tick`. */
function stateAt(track: Track, tick: number): CardState {
  const { steps } = track;
  let lo = 0;
  let hi = steps.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((steps[mid] as Step).tick < tick) lo = mid + 1;
    else hi = mid;
  }
  return lo < steps.length ? (steps[lo] as Step).before : track.state;
}

/**
 * Runs a track again under a new exam date. Its steps keep their outcome up to the first update whose capped due
 * the new date changes, since until then every state is the same, so only the steps from there run again.
 */
function rebase(track: Track, initial: CardState, examDate: string | null): void {
  const { key, tested, steps } = track;
  let from = 0;
  if (initial === track.initial) {
    while (from < steps.length) {
      const step = steps[from] as Step;
      if (step.kind !== 'now' && step.made !== null) {
        if (cappedUnder(step.made, key, step.e, examDate) !== step.made.capped) break;
      }
      from++;
    }
    if (from === steps.length) return;
  }
  track.initial = initial;
  let s = from === 0 ? initial : (steps[from] as Step).before;
  for (let i = from; i < steps.length; i++) {
    const step = steps[i] as Step;
    step.before = s;
    const out = runStep(s, key, tested, step, examDate);
    if (step.kind !== 'now') step.made = out.made;
    s = out.state;
  }
  track.state = s;
}

/** Replays the log in id order into memory state; unknown ids are skipped, never thrown on (spec 8.4). */
export function deriveMemory(events: readonly StudyEvent[], content: MemoryContent): MemoryState {
  const state = replay([...events].sort(byId), content);
  for (const [id, info] of content.concepts) {
    if (info.splitFrom === null || state.concepts.has(id)) continue;
    const old = state.concepts.get(info.splitFrom);
    if (old?.card) state.concepts.set(id, { ...freshConcept(), card: old.card, enteredOn: old.enteredOn });
  }
  return state;
}

/**
 * The replay of `sorted`, in one pass. Each memory key keeps a track of the answers that reached its card, so a
 * settings event that changes the exam date gives every card the schedule of the new date over the log so far by
 * running again only what the new date changes, while the XP, days and badges already judged stay (spec 3.6).
 */
function replay(
  sorted: readonly StudyEvent[],
  content: MemoryContent,
): MemoryState & { concepts: Map<string, MutableConcept> } {
  const splitSources = new Set<string>();
  /** Each tested split concept with the id it was split from, whose card it inherits until answered. */
  const splitTargets: [string, string][] = [];
  for (const [id, info] of content.concepts) {
    if (info.splitFrom === null) continue;
    splitSources.add(info.splitFrom);
    if (info.tested) splitTargets.push([id, info.splitFrom]);
  }

  const concepts = new Map<string, MutableConcept>();
  const xpByEvent = new Map<string, number>();
  const xpByDay = new Map<string, number>();
  const answered = new Set<string>();
  const qualifyingDays = new Set<string>();
  const newByDay = new Map<string, number>();
  const catchUpPlans = new Map<string, readonly string[]>();
  const starts = new Map<string, { at: string; tz: number }>();
  const examStarts = new Map<string, SessionEvent>();
  const examAnswers = new Map<string, Map<string, AnswerEvent>>();
  const examsClosed = new Set<string>();
  const examsDone = new Set<string>();
  const bossesPassed = new Set<string>();
  const formsPaid = new Set<string>();
  const lessons = new Set<string>();
  const badges = new Map<BadgeId, BadgeEarned>();
  const window: { correct: boolean; sure: boolean }[] = [];
  const clearedMarks = new Set<string>();
  const longCards = new Set<string>();
  const labsDone = new Set<string>();
  /** Study days whose first lightning round has started, so a later round that day pays nothing. */
  const lightningDays = new Set<string>();
  /** The paid round of each day, by session id: its deadline, the questions it has seen and the XP it paid. */
  const lightningRounds = new Map<string, { deadline: number | null; seen: Set<string>; xp: number }>();
  /** Study days whose incident XP is paid; one incident pays per day (spec 3.2). */
  const incidentPaidDays = new Set<string>();
  const missionCleaned = new Map<string, string>();
  const missionsClosed = new Set<string>();
  /** Each mission's attempts, read by the same rules as `src/engine/mission-log.ts`, so XP pays when the page closes. */
  const missionLogs = new Map<string, OpenMissionLog>();
  /** Modules with a counted self-grade; only a final after it counts (spec 6). */
  const selfDecisions = new Set<number>();
  /** The first final grade of each module, which pays XP and decides Architect. */
  const finalDecisions = new Map<number, readonly number[]>();
  const cleanDays = new Set<string>();
  /** Non-relearn review answers per study day, kept per day so a day left and entered again keeps its count. */
  const reviewsByDay = new Map<string, number>();
  const tracks = new Map<string, Track>();
  /** Each opening of a study day, as its first event after another day, at which its catch-up plan is made. */
  const opens = new Map<string, { tick: number; at: Date; tz: number }[]>();
  /** The replay's clock, which orders steps, day openings and new keys. */
  let tick = 0;
  /** The exam date in force at the current event. */
  let examDate: string | null = null;
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

  /** Every tested card, including the card a split concept inherits before its first answer, as the queue sees it. */
  const testedCards = (): [string, SrsCard][] => {
    const out: [string, SrsCard][] = [];
    for (const [id, cm] of concepts) {
      if (cm.card !== null && content.concepts.get(id)?.tested === true) out.push([id, cm.card]);
    }
    for (const [id, from] of splitTargets) {
      const card = concepts.has(id) ? null : (concepts.get(from)?.card ?? null);
      if (card !== null) out.push([id, card]);
    }
    return out;
  };

  const setCard = (cm: MutableConcept, s: CardState) => {
    cm.card = s.card;
    cm.enteredOn = s.enteredOn;
    cm.fsrsDay = s.fsrsDay;
    cm.fsrsRating = s.fsrsRating;
    cm.extraAgainDay = s.extraAgainDay;
  };

  /** Every tested card just before `at` on the clock, as `testedCards` saw it then. */
  const testedCardsAt = (at: number): [string, SrsCard][] => {
    const out: [string, SrsCard][] = [];
    for (const track of tracks.values()) {
      if (!track.tested || track.created > at) continue;
      const card = stateAt(track, at).card;
      if (card !== null) out.push([track.key, card]);
    }
    for (const [id, from] of splitTargets) {
      if ((tracks.get(id)?.created ?? Number.POSITIVE_INFINITY) < at) continue;
      const source = tracks.get(from);
      const card = source === undefined || source.created > at ? null : stateAt(source, at).card;
      if (card !== null) out.push([id, card]);
    }
    return out;
  };

  /** The catch-up plan the current cards give `day`: the plan of its first opening with too many due. */
  const planOf = (day: string): readonly string[] | undefined => {
    for (const open of opens.get(day) ?? []) {
      const due = testedCardsAt(open.tick).filter(([, card]) => isDue(card, open.at, open.tz));
      if (due.length > CATCH_UP_OVER) return lowestRecall(due, open.at, CATCH_UP_PLAN);
    }
    return undefined;
  };

  /**
   * A new exam date at `e` (spec 3.6): every card, its day's FSRS update and today's catch-up plan become what the
   * new date gives over the log so far, as if it had been set before the first answer, since whether an answer
   * updates its card depends on the capped due it met (spec 3.1). The XP, success days, qualifying days and
   * badges judged before this event stay as they were.
   */
  const setExamDate = (next: string | null, e: StudyEvent) => {
    if (next === examDate) return;
    examDate = next;
    longCards.clear();
    for (const track of tracks.values()) {
      let initial = track.initial;
      if (track.from !== null) {
        const source = stateAt(tracks.get(track.from) as Track, track.created);
        const same = source.card === initial.card && source.enteredOn === initial.enteredOn;
        if (!same)
          initial =
            source.card === null ? NO_CARD : { ...NO_CARD, card: source.card, enteredOn: source.enteredOn };
      }
      rebase(track, initial, next);
      setCard(concepts.get(track.key) as MutableConcept, track.state);
      if (track.tested && track.state.long) longCards.add(track.key);
    }
    if (longCards.size >= LONG_MEMORY.concepts) grant('long-memory', e);
    const plan = planOf(e.day);
    if (plan === undefined) catchUpPlans.delete(e.day);
    else catchUpPlans.set(e.day, plan);
  };

  const grant = (badge: BadgeId, e: StudyEvent) => {
    if (!badges.has(badge)) badges.set(badge, { day: e.day, eventId: e.id });
  };

  const earn = (e: StudyEvent, amount: number) => {
    if (amount <= 0) return;
    xp += amount;
    xpByEvent.set(e.id, amount);
    xpByDay.set(e.day, (xpByDay.get(e.day) ?? 0) + amount);
  };

  const openDay = (e: StudyEvent) => {
    const at = new Date(e.at);
    const dayOpens = opens.get(e.day);
    const open = { tick: tick++, at, tz: e.tz };
    if (dayOpens === undefined) opens.set(e.day, [open]);
    else dayOpens.push(open);
    if (catchUpPlans.has(e.day)) return;
    const due = testedCards().filter(([, card]) => isDue(card, at, e.tz));
    if (due.length > CATCH_UP_OVER) catchUpPlans.set(e.day, lowestRecall(due, at, CATCH_UP_PLAN));
  };

  const closeDay = () => {
    if (day === null) return;
    if (completion || examsDone.has(day)) {
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

  /**
   * Counts the study day of `e` toward Clean Queue at its first event with enough reviews and no tested card
   * due before the day ends, and grants the badge at that event on the seventh distinct day. With no
   * short-term steps every review is due a day or more later, so a day once clear stays clear and the grant
   * never moves as more events of that day arrive.
   */
  const countCleanDay = (e: StudyEvent) => {
    if (badges.has('clean-queue') || cleanDays.has(e.day)) return;
    if ((reviewsByDay.get(e.day) ?? 0) < CLEAN_QUEUE.reviews) return;
    const end = dayStartAt(addDays(e.day, 1), e.tz).getTime();
    if (!testedCards().every(([, card]) => Date.parse(card.due) >= end)) return;
    cleanDays.add(e.day);
    if (cleanDays.size >= CLEAN_QUEUE.days) grant('clean-queue', e);
  };

  /** Runs a step of `e` on the card of `key` under the exam date in force, and keeps it on the key's track. */
  const step = (
    cm: MutableConcept,
    key: string,
    kind: AnswerStep['kind'],
    e: AnswerEvent,
    stale: boolean,
  ): Outcome => {
    const track = tracks.get(key) as Track;
    const start = starts.get(e.sid) ?? { at: e.at, tz: e.tz };
    const run: AnswerStep = { tick: tick++, kind, e, start, stale, before: track.state, made: null };
    const out = runStep(track.state, key, track.tested, run, examDate);
    run.made = out.made;
    track.steps.push(run);
    track.state = out.state;
    if (out.made === null) return out;
    setCard(cm, out.state);
    if (!track.tested) return out;
    if (out.state.long) longCards.add(key);
    else longCards.delete(key);
    if (longCards.size >= LONG_MEMORY.concepts) grant('long-memory', e);
    return out;
  };

  /** The day's first answer to a concept; returns whether it is a counted answer (spec 3.1): due at start, or new. */
  const firstOfDay = (
    cm: MutableConcept,
    key: string,
    e: AnswerEvent,
    stale: boolean,
    isNew: boolean,
  ): boolean => {
    const card = cm.card;
    const { due } = step(cm, key, 'first', e, stale);
    if (due) {
      const shown = new Date(Date.parse(e.at) - e.ms);
      const bonus = card !== null && e.correct ? effortBonus(recall(card, shown)) : 0;
      earn(e, betXp(e.correct, e.sure) + bonus);
      if (!stale && card === null) newByDay.set(e.day, (newByDay.get(e.day) ?? 0) + 1);
    } else if (isNew) {
      earn(e, betXp(e.correct, e.sure));
    }
    const counted = due || isNew;
    if (counted && e.correct && !cm.successDays.includes(e.day)) cm.successDays.push(e.day);
    return counted;
  };

  /** The memory of a key, created on first use from the card of the concept it was split from. */
  const conceptOf = (key: string): MutableConcept => {
    const known = concepts.get(key);
    if (known) return known;
    const cm = freshConcept();
    const from = content.concepts.get(key)?.splitFrom ?? null;
    const old = from === null ? undefined : concepts.get(from);
    let initial = NO_CARD;
    if (old?.card) {
      cm.card = old.card;
      cm.enteredOn = old.enteredOn;
      initial = { ...NO_CARD, card: old.card, enteredOn: old.enteredOn };
    }
    concepts.set(key, cm);
    const tested = content.concepts.get(key)?.tested === true;
    const source = old === undefined ? null : from;
    tracks.set(key, { key, tested, created: tick++, from: source, initial, steps: [], state: initial });
    return cm;
  };

  const isStale = (e: AnswerEvent): boolean => {
    const shipped = content.questionVersions.get(e.qid);
    return shipped !== undefined && e.qv < shipped;
  };

  /**
   * A lightning answer (spec 3.2 and 3.11): in the day's paid round, the first answer to each question pays
   * `XP.lightningPerCorrect` when right and given by the deadline, up to `XP.lightningDailyCap`; it never touches
   * FSRS, counted answers, the calibration window or the day's qualification.
   */
  const applyLightning = (e: AnswerEvent) => {
    answered.add(e.qid);
    const round = lightningRounds.get(e.sid);
    if (round === undefined || round.seen.has(e.qid)) return;
    round.seen.add(e.qid);
    if (!e.correct || (round.deadline !== null && Date.parse(e.at) > round.deadline)) return;
    if (round.xp >= XP.lightningDailyCap) return;
    round.xp += XP.lightningPerCorrect;
    earn(e, XP.lightningPerCorrect);
  };

  /**
   * A `review.now` (spec 3.6) makes the concept due today through a step on its track, so a later exam date keeps
   * it. An unknown concept, one never studied, and one already answered today (whose one update of the day is spent,
   * so it could never leave the queue today) are left alone.
   */
  const applyReviewNow = (e: ReviewNowEvent) => {
    const key = keyOf(e.concept);
    const cm = key === null ? undefined : concepts.get(key);
    const track = key === null ? undefined : tracks.get(key);
    if (key === null || cm === undefined || track === undefined || track.state.card === null) return;
    if (cm.lastAnswerDay === e.day) return;
    const run: NowStep = { tick: tick++, kind: 'now', e, before: track.state };
    const out = runStep(track.state, key, track.tested, run, examDate);
    track.steps.push(run);
    track.state = out.state;
    setCard(cm, out.state);
  };

  const applyAnswer = (e: AnswerEvent) => {
    if (e.mode === 'lightning') {
      applyLightning(e);
      return;
    }
    const key = keyOf(e.concept);
    const stale = isStale(e);
    const isNew = !answered.has(e.qid);
    if (!COUNTING_MODES.has(e.mode) || key === null) {
      answered.add(e.qid);
      return;
    }
    const cm = conceptOf(key);
    if (stale) staleAnswers++;
    if (e.relearn !== true) {
      countedAnswer = true;
      if (e.mode === 'review') reviewsByDay.set(e.day, (reviewsByDay.get(e.day) ?? 0) + 1);
      let counted = false;
      if (cm.lastAnswerDay !== e.day) counted = firstOfDay(cm, key, e, stale, isNew);
      else step(cm, key, 'later', e, stale);
      cm.lastAnswerDay = e.day;
      // Well Calibrated reads counted answers only, so re-answering an easy question cannot fill its window.
      if (counted) {
        window.push({ correct: e.correct, sure: e.sure });
        if (window.length > CALIBRATION.window) window.shift();
        if (!badges.has('well-calibrated') && wellCalibrated(calibrationOf(window))) {
          grant('well-calibrated', e);
        }
      }
    }
    const mark = cm.misconception;
    if (!e.correct && e.sure) cm.misconception = { qid: e.qid, day: e.day };
    else if (e.correct && e.sure && mark && mark.qid !== e.qid && e.day > mark.day) {
      cm.misconception = null;
      clearedMarks.add(`${key}|${mark.qid}`);
      if (clearedMarks.size >= CHANGED_MIND) grant('changed-my-mind', e);
    }
    answered.add(e.qid);
  };

  /** Holds the first answer per question of an open boss or mock until its submit. */
  const holdExamAnswer = (e: AnswerEvent) => {
    answered.add(e.qid);
    const held = examAnswers.get(e.sid);
    if (held && !held.has(e.qid)) held.set(e.qid, e);
  };

  /** One boss or mock answer on submit, which updates FSRS but is not a counted answer (spec 3.1). */
  const applyExamAnswer = (e: AnswerEvent) => {
    const key = keyOf(e.concept);
    if (key === null) return;
    const cm = conceptOf(key);
    if (!isStale(e)) step(cm, key, 'exam', e, false);
    // No `lastAnswerDay`: an exam answer is not a counted answer (spec 3.1), so a practice answer later the same day
    // is still that day's first, with its bet XP and success day.
  };

  /** Full Dress Rehearsal, Pass Mark and Even Keel, judged at the submit of a form's first attempt. */
  const firstAttemptBadges = (
    e: SessionEvent,
    qids: readonly string[],
    held: ReadonlyMap<string, AnswerEvent>,
    correct: number,
  ) => {
    if (qids.length === 0) return;
    if (qids.every((qid) => (held.get(qid)?.picked.length ?? 0) > 0)) grant('full-dress-rehearsal', e);
    if (correct / qids.length >= PASS_MARK) grant('pass-mark', e);
    const answers = qids.map((qid) => ({ qid, correct: held.get(qid)?.correct === true }));
    const domains = [...domainScores(answers, content.examTasks).values()];
    if (domains.every((d) => d.total > 0 && d.correct / d.total >= EVEN_KEEL)) grant('even-keel', e);
  };

  /**
   * A lab's first completion pays 30, plus 10 without hints, and qualifies the day, whatever its `rev`;
   * later completions pay nothing and qualify nothing (spec 3.2, 8.4).
   * Hands On counts a module only once it lists its two core labs and both are done.
   */
  const applyLab = (e: Extract<StudyEvent, { t: 'lab.done' }>) => {
    if (labsDone.has(e.lab)) return;
    earn(e, XP.lab + (e.hints === 0 ? XP.labNoHints : 0));
    completion = true;
    labsDone.add(e.lab);
    const modules = [...content.coreLabs.values()];
    const done = (labs: readonly string[]) => labs.every((lab) => labsDone.has(lab));
    if (
      modules.filter((labs) => labs.length >= CORE_LABS_PER_MODULE && done(labs)).length >= HANDS_ON_MODULES
    )
      grant('hands-on', e);
    const all = modules.flat();
    if (all.length >= CORE_LABS && done(all)) grant('lab-complete', e);
  };

  const applyMission = (e: Extract<StudyEvent, { t: 'mission' }>) => {
    const log = missionLogs.get(e.mission) ?? { attempts: [], closed: null };
    missionLogs.set(e.mission, log);
    const ref: MissionRef = {
      id: e.mission,
      n: 0,
      keep: content.keptMissions.has(e.mission),
      gate: e.mission === GATE_MISSION,
      maxLiveHours: null,
      services: [],
    };
    const wasOpen = log.closed === null;
    stepMission(ref, log, e);
    if (wasOpen && log.closed !== null) earn(e, ref.gate ? XP.mission0 : XP.mission);
    if (e.step === 'cleaned' && !missionCleaned.has(e.mission)) missionCleaned.set(e.mission, e.day);
    if (e.step !== 'usage-ok' || content.keptMissions.has(e.mission)) return;
    const cleaned = missionCleaned.get(e.mission);
    if (cleaned === undefined || e.day <= cleaned) return;
    missionsClosed.add(e.mission);
    if (missionsClosed.size >= LEAVE_NO_TRACE) grant('leave-no-trace', e);
  };

  const applyDecision = (e: Extract<StudyEvent, { t: 'decision' }>) => {
    if (e.stage === 'self') {
      selfDecisions.add(e.module);
      return;
    }
    if (!selfDecisions.has(e.module) || finalDecisions.has(e.module)) return;
    finalDecisions.set(e.module, e.scores);
    earn(e, XP.decision + (scoreTotal(e.scores) >= ARCHITECT.minTotal ? XP.decisionGood : 0));
    const all = [...finalDecisions.values()];
    if (all.length >= ARCHITECT.decisions && all.every(decisionPasses)) grant('architect', e);
  };

  /** Opens a boss or mock on start; closes it on its first submit or abandon, applying a submit. */
  const applyExamSession = (e: SessionEvent) => {
    if (e.phase === 'start') {
      examStarts.set(e.sid, e);
      examAnswers.set(e.sid, new Map());
      examsClosed.delete(e.sid);
      return;
    }
    const start = examStarts.get(e.sid);
    if (!start || examsClosed.has(e.sid)) return;
    examsClosed.add(e.sid);
    const held = examAnswers.get(e.sid) ?? new Map<string, AnswerEvent>();
    examAnswers.delete(e.sid);
    if (e.phase === 'abandon') return;
    for (const a of [...held.values()].sort(byId)) applyExamAnswer(a);
    const qids = start.qids ?? [];
    const correct = qids.filter((qid) => held.get(qid)?.correct === true).length;
    if (start.mode === 'boss') {
      const scope = start.scope ?? '';
      if (qids.length > 0 && correct >= bossPassMark(qids.length) && !bossesPassed.has(scope)) {
        bossesPassed.add(scope);
        earn(e, XP.boss);
      }
    } else if (start.form !== undefined && FORMS.has(start.form) && !formsPaid.has(start.form)) {
      formsPaid.add(start.form);
      earn(e, XP.mock);
      firstAttemptBadges(e, qids, held, correct);
    }
    examsDone.add(e.day);
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
        if (e.phase === 'start' && e.mode === 'lightning' && !lightningDays.has(e.day)) {
          lightningDays.add(e.day);
          const deadline = e.deadline === undefined ? null : Date.parse(e.deadline);
          lightningRounds.set(e.sid, { deadline, seen: new Set(), xp: 0 });
        }
        if (EXAM_MODES.has(e.mode)) applyExamSession(e);
        if (e.phase === 'submit' && e.mode === 'check' && starts.has(e.sid)) grant('first-brew', e);
        break;
      case 'lesson.done':
        if (!lessons.has(e.note)) {
          lessons.add(e.note);
          earn(e, XP.lesson);
          completion = true;
        }
        break;
      case 'answer':
        if (EXAM_MODES.has(e.mode)) holdExamAnswer(e);
        else applyAnswer(e);
        break;
      case 'lab.done':
        applyLab(e);
        break;
      case 'review.now':
        applyReviewNow(e);
        break;
      case 'incident.done':
        if (!incidentPaidDays.has(e.day)) {
          incidentPaidDays.add(e.day);
          earn(e, e.firstTry === true ? XP.incidentPerfect : XP.incident);
        }
        completion = true;
        break;
      case 'mission':
        applyMission(e);
        break;
      case 'decision':
        applyDecision(e);
        break;
      case 'settings':
        if ('examDate' in e.patch) setExamDate(e.patch.examDate ?? null, e);
        break;
      default:
        break;
    }
    countCleanDay(e);
  }
  closeDay();

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
    examsDone,
    badges,
    calibration: calibrationOf(window),
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
