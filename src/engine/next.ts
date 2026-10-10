import { studyDayAt } from './day.ts';
import { CHUNK_SIZE, ITEM_SECONDS, type ReviewQueue } from './queue.ts';
import type { Progress, SessionState } from './replay.ts';

/**
 * The Next action (spec 4.6): the one thing Home suggests, the first that applies.
 * Mission safety and the extras line wait for missions and incidents in later phases.
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

const RESUMABLE = new Set(['check', 'quiz', 'review']);

/** The newest unfinished check, quiz or today's review that still has a question to answer. */
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
