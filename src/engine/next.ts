import type { BossStatus } from './boss.ts';
import { daysBetween, studyDayAt } from './day.ts';
import { mockHistory, nextForm } from './mock.ts';
import { CHUNK_SIZE, ITEM_SECONDS, type ReviewQueue } from './queue.ts';
import type { Progress, SessionState } from './replay.ts';

/**
 * The Next action (spec 4.6): the one thing Home suggests, the first that applies, and the optional extras line.
 * Mission safety waits for missions (Phase 6); incident and lab extras wait for Phase 4.
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
}

export type NextAction =
  | { kind: 'resume'; session: SessionState; left: number }
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

/** The time estimate in whole minutes: 30 seconds per review or check item, a lesson's own minutes. */
export function nextMinutes(action: NextAction): number | null {
  const items = (count: number) => Math.ceil((count * ITEM_SECONDS) / 60);
  switch (action.kind) {
    case 'resume':
      return items(action.left);
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
export type Extra = { kind: 'boss'; module: number } | { kind: 'mock'; form: string };

/** The mock extra needs this many passed bosses (spec 4.3). */
export const MOCK_AFTER_BOSSES = 7;
/** And at least this many days since the latest submitted mock (spec 10.2). */
export const MOCK_GAP_DAYS = 3;

/** The extras line (spec 4.6), at most two entries: the lowest ready boss out of its cooldown, then the next mock. */
export function extras(args: {
  bosses: ReadonlyMap<number, BossStatus>;
  progress: Progress;
  today: string;
  now: Date;
}): Extra[] {
  const out: Extra[] = [];
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
  return out;
}
