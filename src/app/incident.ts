/** The daily incident's copy and pure helpers (spec 4.5); small, because `home.ts` puts it in the initial bundle. */
import type { SessionState } from '../engine/replay.ts';
import { pad2 } from './router.ts';

export const INCIDENT_LOCKED = 'Starts after Module 2.';
export const INCIDENT_NONE = 'No incident today.';
export const INCIDENT_SOLVED = 'Solved. The next incident comes tomorrow.';

/** The extras line label of today's incident. */
export function incidentLabel(title: string): string {
  return `Incident "${title}"`;
}

/** The end line of a solved incident: the XP its `incident.done` paid, which is 0 for a second solve that day. */
export function incidentPaidLine(xp: number): string {
  return xp > 0 ? `Incident solved. Plus ${xp} XP.` : 'Incident solved.';
}

/** Right on the first try: every step answered, and every first answer correct (spec 3.2). */
export function firstTryOf(session: SessionState): boolean {
  return session.qids.length > 0 && session.qids.every((qid) => session.answers.get(qid)?.correct === true);
}

/** Whether every lesson of a module is read, by the lesson notes in `lessonsDone`. */
export function modulesRead(
  modules: readonly { n: number; lessons: readonly { slug: string }[] }[],
  lessonsDone: ReadonlyMap<string, string>,
): (module: number) => boolean {
  return (module) => {
    const m = modules.find((x) => x.n === module);
    return m?.lessons.every((l) => lessonsDone.has(`m${pad2(m.n)}/${l.slug}`)) === true;
  };
}
