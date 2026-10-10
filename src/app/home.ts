/** Pure helpers for Home and the top bar (spec 4.6 and 7.2), so the tests run without a browser. */
import type { ContentIndex } from '../../schemas/chunks.ts';
import { BAND_LABEL, type HexBand } from '../engine/mastery.ts';
import type { ConceptInfo, MemoryContent } from '../engine/memory.ts';
import { type LessonRef, type NextAction, nextMinutes } from '../engine/next.ts';
import type { ReviewQueue } from '../engine/queue.ts';
import type { StreakState } from '../engine/streak.ts';
import { type MockRoute, pad2, toHash } from './router.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The module of a note id such as `m03/aws-lambda`. */
const moduleOf = (noteId: string): number => Number(noteId.slice(1, 3));

/**
 * What the memory replay needs from the index: concepts with their module and tasks, aliases, question versions
 * (practice and exam, so a stale exam answer is caught too), and each exam item's task.
 */
export function memoryContentOf(idx: ContentIndex): MemoryContent {
  const concepts = new Map<string, ConceptInfo>();
  const aliases = new Map<string, string>();
  for (const c of idx.concepts) {
    concepts.set(c.id, {
      module: moduleOf(c.home),
      tested: c.tested,
      confusableWith: c.confusableWith,
      splitFrom: c.splitFrom,
      tasks: c.tasks,
    });
    for (const alias of c.aliases) aliases.set(alias, c.id);
  }
  const questionVersions = new Map(Object.entries(idx.questionVersions));
  const examTasks = new Map<string, string>();
  for (const [qid, item] of Object.entries(idx.exam.items)) {
    questionVersions.set(qid, item.version);
    examTasks.set(qid, item.task);
  }
  return {
    concepts,
    aliases,
    questionVersions,
    examTasks,
    coreLabs: new Map(),
    keptMissions: new Set(idx.missions.filter((m) => m.keep).map((m) => m.id)),
  };
}

/** Every lesson in course order, as the Next action reads it. */
export function lessonRefs(idx: ContentIndex): LessonRef[] {
  return idx.modules.flatMap((m) =>
    m.lessons.map((l, i) => ({
      note: `m${pad2(m.n)}/${l.slug}`,
      module: m.n,
      slug: l.slug,
      title: l.title,
      first: i === 0,
      minutes: l.minutes,
      checkConcepts: l.checkConcepts,
    })),
  );
}

const lessonHash = (lesson: LessonRef): string =>
  toHash({ kind: 'lesson', module: lesson.module, slug: lesson.slug, anchor: null });

/** The title of the lesson a check scope such as `m03/aws-lambda` names. */
function lessonTitle(idx: ContentIndex, scope: string): string {
  const [module, slug] = scope.split('/');
  return (
    idx.modules.find((m) => `m${pad2(m.n)}` === module)?.lessons.find((l) => l.slug === slug)?.title ?? ''
  );
}

/** Where a session in progress lives, and what it is called. */
function resumeOf(action: Extract<NextAction, { kind: 'resume' }>, idx: ContentIndex): [string, string] {
  const { mode, scope, form } = action.session;
  if (mode === 'review') return ['Review', toHash({ kind: 'review' })];
  if (mode === 'check') {
    const [module = '', slug = ''] = scope.split('/');
    return [
      `Lesson check: ${lessonTitle(idx, scope)}`,
      toHash({ kind: 'check', module: Number(module.slice(1)), slug }),
    ];
  }
  if (mode === 'mock') {
    const remix = form === null || form === 'remix';
    const route = remix ? 'remix' : (form.toLowerCase() as MockRoute);
    return [remix ? 'Remix mock' : `Mock exam ${form}`, toHash({ kind: 'mock', form: route })];
  }
  if (mode === 'focus') return ['Focus quiz', toHash({ kind: 'focus', scope })];
  const module = Number(scope.slice(1));
  const short = idx.modules.find((m) => m.n === module)?.short ?? '';
  if (mode === 'boss') return [`Boss: ${short}`, toHash({ kind: 'boss', module })];
  return [`Module quiz: ${short}`, toHash({ kind: 'quiz', module })];
}

/** Whole minutes until an exam's deadline, rounded up and never below 0. */
const minutesLeft = (deadline: string, now: Date): number =>
  Math.max(0, Math.ceil((Date.parse(deadline) - now.getTime()) / MINUTE_MS));

/** The Next button's words, link and time estimate (spec 4.6); `done` has neither link nor time. */
export function nextLabel(
  action: NextAction,
  idx: ContentIndex,
  now: Date,
): { label: string; href: string | null; minutes: number | null } {
  const minutes = nextMinutes(action);
  switch (action.kind) {
    case 'resume': {
      const [what, href] = resumeOf(action, idx);
      const { deadline } = action.session;
      if (deadline !== null) {
        const left = minutesLeft(deadline, now);
        return { label: `Resume: ${what} (${left} min left)`, href, minutes: left };
      }
      return { label: `Resume: ${what} (${action.left} left)`, href, minutes };
    }
    case 'review':
      return {
        label: `Review ${plural(action.count, 'concept', 'concepts')}`,
        href: toHash({ kind: 'review' }),
        minutes,
      };
    case 'continue':
      return { label: `Continue: ${action.lesson.title}`, href: lessonHash(action.lesson), minutes };
    case 'check':
      return {
        label: `Check yourself: Module ${action.module} (${plural(action.concepts, 'concept', 'concepts')})`,
        href: toHash({ kind: 'check', module: action.lesson.module, slug: action.lesson.slug }),
        minutes,
      };
    case 'lesson':
      return {
        label: action.lesson.first
          ? `Start Module ${action.lesson.module}: ${action.lesson.title}`
          : `Next lesson: ${action.lesson.title}`,
        href: lessonHash(action.lesson),
        minutes,
      };
    case 'done':
      return { label: 'Done for today', href: null, minutes: null };
  }
}

/** The empty-queue line (spec 7.5): when the next reviews fall due, in minutes, hours or days. */
export function nothingDueLine(queue: ReviewQueue, now: Date): string {
  if (queue.next === null) return 'Nothing due.';
  const wait = Math.max(0, Date.parse(queue.next.at) - now.getTime());
  const when =
    wait < HOUR_MS
      ? `${Math.max(1, Math.ceil(wait / MINUTE_MS))} min`
      : wait <= 2 * DAY_MS
        ? `${Math.ceil(wait / HOUR_MS)} h`
        : `${Math.ceil(wait / DAY_MS)} days`;
  return `Nothing due. Next: ${plural(queue.next.count, 'concept', 'concepts')} in ${when}.`;
}

/** The one line after a broken streak (spec 3.5), with no guilt copy; null otherwise. */
export function streakLine(s: StreakState): string | null {
  if (s.current > 0 || s.longest === 0) return null;
  return `Streak reset. Longest: ${plural(s.longest, 'day', 'days')}.`;
}

/** `Sat 14 Nov` for `2026-11-14`, read in UTC so the zone never shifts the day. */
export function examDateLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** The accessible name of a hex (spec 7.3). */
export function hexLabel(module: number, short: string, mastery: number, band: HexBand): string {
  return `Module ${module} ${short}, mastery ${mastery}, ${BAND_LABEL[band]}`;
}

/** The one-time exam date question (spec 7.5): every Module 1 lesson read, no date set, and not dismissed. */
export function examAskDue(args: {
  idx: ContentIndex;
  lessonsDone: ReadonlyMap<string, string>;
  examDate: string | null;
  examAsk: unknown;
}): boolean {
  const { idx, lessonsDone, examDate, examAsk } = args;
  if (examDate !== null || examAsk === 'dismissed') return false;
  const first = idx.modules.find((m) => m.n === 1);
  if (first === undefined || first.lessons.length === 0) return false;
  return first.lessons.every((l) => lessonsDone.has(`m01/${l.slug}`));
}
