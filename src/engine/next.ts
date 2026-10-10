import type { BossStatus } from './boss.ts';
import { daysBetween, studyDayAt } from './day.ts';
import type { MissionSafety } from './missions.ts';
import { mockHistory, nextForm } from './mock.ts';
import { CHUNK_SIZE, ITEM_SECONDS, type ReviewQueue } from './queue.ts';
import type { Progress, SessionState } from './replay.ts';

/**
 * The Next action (spec 4.6): the one thing Home suggests, the first that applies, and the optional extras line.
 * Mission safety (a live mission past its time limit, then the next-day usage check) comes right after Resume.
 */

/** A lesson in course order; `first` marks a module's first lesson. */
export interface LessonRef {
  note: string;
  module: number;
  slug: string;
  title: string;
  first: boolean;
  minutes: number;
  checkConcepts: number;
}

export interface NextInput {
  lessons: readonly LessonRef[];
  progress: Progress;
  queue: ReviewQueue;
  currentLesson: string | null;
  today: string;
  tz: number;
  /** The mission cleanup or usage check that is due, from `missionSafety` (spec 5.3 rules 10 and 11). */
  safety: MissionSafety | null;
}

export type NextAction =
  | { kind: 'resume'; session: SessionState; left: number }
  | { kind: 'cleanup'; mission: string; n: number }
  | { kind: 'usage'; mission: string; n: number }
  | { kind: 'review'; count: number }
  | { kind: 'continue'; lesson: LessonRef }
  | { kind: 'check'; module: number; concepts: number; lesson: LessonRef }
  | { kind: 'lesson'; lesson: LessonRef }
  | { kind: 'done' };

const RESUMABLE = new Set(['check', 'quiz', 'focus', 'review', 'boss', 'mock']);

/** The newest unfinished session that still has a question to answer; a review must be today's. */
function resumable(input: NextInput): { session: SessionState; left: number } | null {
  let best: { session: SessionState; left: number } | null = null;
  for (const s of input.progress.sessions.values()) {
    if (!RESUMABLE.has(s.mode) || s.submittedAt !== null || s.abandoned) continue;
    if (s.mode === 'review' && studyDayAt(new Date(s.startedAt), input.tz) !== input.today) continue;
    const left = s.qids.filter((qid) => !s.answers.has(qid)).length;
    if (left === 0) continue;
    const newer =
      !best ||
      s.startedAt > best.session.startedAt ||
      (s.startedAt === best.session.startedAt && s.sid > best.session.sid);
    if (newer) best = { session: s, left };
  }
  return best;
}

export function nextAction(input: NextInput): NextAction {
  const { lessons, progress, queue, currentLesson } = input;
  const resume = resumable(input);
  if (resume) return { kind: 'resume', ...resume };
  if (input.safety) return { ...input.safety };
  if (queue.items.length > 0) return { kind: 'review', count: Math.min(queue.items.length, CHUNK_SIZE) };
  const current = lessons.find((l) => l.note === currentLesson);
  if (current && !progress.lessonsDone.has(current.note)) return { kind: 'continue', lesson: current };
  if (!queue.lessonsAllowed) return { kind: 'done' };
  const unchecked = lessons.filter(
    (l) => progress.lessonsDone.has(l.note) && l.checkConcepts > 0 && !progress.checkScores.has(l.note),
  );
  const first = unchecked[0];
  if (first) {
    const group = unchecked.filter((l) => l.module === first.module);
    const concepts = group.reduce((sum, l) => sum + l.checkConcepts, 0);
    return { kind: 'check', module: first.module, concepts, lesson: first };
  }
  const lesson = lessons.find((l) => !progress.lessonsDone.has(l.note));
  if (lesson) return { kind: 'lesson', lesson };
  return { kind: 'done' };
}

/** About 10 minutes to delete a mission's resources by name and sweep Tag Editor, 5 to read Cost Explorer. */
export const CLEANUP_MINUTES = 10;
export const USAGE_MINUTES = 5;

/** The time estimate in whole minutes: 30 seconds per review or check item, a lesson's own minutes. */
export function nextMinutes(action: NextAction): number | null {
  const items = (count: number) => Math.ceil((count * ITEM_SECONDS) / 60);
  switch (action.kind) {
    case 'resume':
      return items(action.left);
    case 'cleanup':
      return CLEANUP_MINUTES;
    case 'usage':
      return USAGE_MINUTES;
    case 'review':
      return items(action.count);
    case 'check':
      return items(action.concepts);
    case 'continue':
    case 'lesson':
      return action.lesson.minutes;
    case 'done':
      return null;
  }
}

/** One entry of the extras line under Done for today. */
export type Extra =
  | { kind: 'incident'; incident: string }
  | { kind: 'boss'; module: number }
  | { kind: 'mock'; form: string }
  | { kind: 'lab'; lab: string; module: number };

/** The extras line shows at most this many entries (spec 4.6). */
export const MAX_EXTRAS = 2;

/** The mock extra needs this many passed bosses (spec 4.3). */
export const MOCK_AFTER_BOSSES = 7;
/** And at least this many days since the latest submitted mock (spec 10.2). */
export const MOCK_GAP_DAYS = 3;

/**
 * The lab extra (spec 4.6): among modules whose lessons are all read and which have an undone lab, the one with the
 * lowest mastery, ties to the lower module, and its first undone lab in the given order; null when none qualifies.
 */
export function weakestLab(args: {
  labs: readonly { id: string; module: number }[];
  done: ReadonlySet<string>;
  mastery: ReadonlyMap<number, number>;
  lessonsRead: (module: number) => boolean;
}): { lab: string; module: number } | null {
  let best: { lab: string; module: number; mastery: number } | null = null;
  for (const lab of args.labs) {
    if (args.done.has(lab.id) || !args.lessonsRead(lab.module)) continue;
    const mastery = args.mastery.get(lab.module) ?? 0;
    const better =
      best === null || mastery < best.mastery || (mastery === best.mastery && lab.module < best.module);
    if (better) best = { lab: lab.id, module: lab.module, mastery };
  }
  return best === null ? null : { lab: best.lab, module: best.module };
}

/**
 * Today's incident as recorded (spec 4.5): the first `incident.offered` of the study day whose incident still ships,
 * and whether it is solved. An offer the shipped content dropped is kept in the log and skipped here (spec 8.4).
 * It lives here, not in `incident.ts`, so Home never loads the pick to read the offer.
 */
export function incidentToday(
  progress: Progress,
  today: string,
  shipped: ReadonlySet<string>,
): { incident: string; done: boolean } | null {
  const incident = progress.incidentsOffered.get(today)?.find((id) => shipped.has(id));
  if (incident === undefined) return null;
  return { incident, done: progress.incidentsDone.has(incident) };
}

/**
 * The extras line (spec 4.6), at most `MAX_EXTRAS` entries in this order: today's unsolved incident, the lowest
 * ready boss out of its cooldown, the next mock, then the core lab for the weakest module.
 */
export function extras(args: {
  bosses: ReadonlyMap<number, BossStatus>;
  progress: Progress;
  today: string;
  now: Date;
  lab: { lab: string; module: number } | null;
  incident: string | null;
}): Extra[] {
  const out: Extra[] = [];
  if (args.incident !== null) out.push({ kind: 'incident', incident: args.incident });
  const cooling = (status: BossStatus): boolean =>
    status.cooldownUntil !== null && Date.parse(status.cooldownUntil) > args.now.getTime();
  const [module] = [...args.bosses]
    .filter(([, status]) => status.ready && !cooling(status))
    .map(([m]) => m)
    .sort((a, b) => a - b);
  if (module !== undefined) out.push({ kind: 'boss', module });
  const passed = [...args.bosses.values()].filter((status) => status.passed).length;
  const [latest] = mockHistory(args.progress);
  const form = nextForm(args.progress);
  const rested = latest === undefined || daysBetween(latest.day, args.today) >= MOCK_GAP_DAYS;
  if (passed >= MOCK_AFTER_BOSSES && rested && form !== null) out.push({ kind: 'mock', form });
  if (args.lab !== null) out.push({ kind: 'lab', lab: args.lab.lab, module: args.lab.module });
  return out.slice(0, MAX_EXTRAS);
}
