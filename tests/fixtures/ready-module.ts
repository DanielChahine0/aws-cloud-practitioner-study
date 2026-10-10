/** Events that make one module boss-ready (spec 3.8 and 4.2): every lesson read and every concept answered well. */
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { timelineOf } from './events.ts';
import { answerOf, startOf, submitOf } from './memory.ts';

/** The moment every exam end-to-end test starts at. */
export const E2E_NOW = '2026-10-20T09:00:00.000Z';
/** Days before the clock on which each concept gets one right answer: three study days, well spaced. */
export const READY_DAYS = [21, 17, 9] as const;

const DAY_MS = 86_400_000;

export function readyModuleEvents(args: {
  module: number;
  /** Lesson slugs of the module. */
  lessons: readonly string[];
  /** Live questions of the module; the first of each concept is answered. */
  questions: readonly { id: string; version: number; concept: string }[];
  now: string;
}): StudyEvent[] {
  const now = Date.parse(args.now);
  const scope = `m${String(args.module).padStart(2, '0')}`;
  const first = new Map<string, { id: string; version: number; concept: string }>();
  for (const q of args.questions) if (!first.has(q.concept)) first.set(q.concept, q);
  const picks = [...first.values()];
  const iso = (ms: number): string => new Date(ms).toISOString();
  const items: (readonly [string, NewEvent])[] = [];
  let t = now - 22 * DAY_MS;
  for (const slug of args.lessons) {
    items.push([iso(t), { t: 'lesson.done', note: `${scope}/${slug}` }]);
    t += 1000;
  }
  for (const [i, days] of READY_DAYS.entries()) {
    if (picks.length === 0) break;
    const sid = `01JA00000000000000000000R${i + 1}`;
    let s = now - days * DAY_MS;
    items.push([
      iso(s),
      startOf(
        sid,
        'quiz',
        picks.map((q) => q.id),
        scope,
      ),
    ]);
    for (const q of picks) {
      s += 1000;
      items.push([
        iso(s),
        answerOf({
          concept: q.concept,
          qid: q.id,
          qv: q.version,
          correct: true,
          sure: true,
          mode: 'quiz',
          sid,
        }),
      ]);
    }
    items.push([iso(s + 1000), submitOf(sid, 'quiz')]);
  }
  return timelineOf(items);
}
