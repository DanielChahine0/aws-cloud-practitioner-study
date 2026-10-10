import { fnv1a } from './rng.ts';

/**
 * The daily incident pick (spec 4.5). Only the lazy `src/app/incident-offer.ts` imports this file, so it stays out
 * of the initial bundle; Home and the extras line read the recorded offer through `incidentToday` instead.
 */

/** Nothing is offered until every lesson of this module is read (spec 4.1). */
export const INCIDENT_UNLOCK_MODULE = 2;

/** A shipped incident: its id and its required modules, the first of which is its home module. */
export interface IncidentRef {
  id: string;
  modules: readonly number[];
}

/**
 * Today's incident: among the unsolved incidents whose required modules are all read, the one with the largest
 * sum of `100 - mastery` over its modules; ties sort by id and `fnv1a(day)` picks one, so the pick holds all day.
 * A day without a pick leaves no backlog, because nothing here counts missed days.
 */
export function pickIncident(args: {
  incidents: readonly IncidentRef[];
  solved: ReadonlySet<string>;
  lessonsRead: (module: number) => boolean;
  mastery: ReadonlyMap<number, number>;
  day: string;
}): string | null {
  if (!args.lessonsRead(INCIDENT_UNLOCK_MODULE)) return null;
  let best = Number.NEGATIVE_INFINITY;
  let ties: string[] = [];
  for (const incident of args.incidents) {
    if (args.solved.has(incident.id)) continue;
    if (!incident.modules.every((m) => args.lessonsRead(m))) continue;
    const score = incident.modules.reduce((sum, m) => sum + 100 - (args.mastery.get(m) ?? 0), 0);
    if (score > best) {
      best = score;
      ties = [incident.id];
    } else if (score === best) {
      ties.push(incident.id);
    }
  }
  if (ties.length === 0) return null;
  ties.sort();
  return ties[fnv1a(args.day) % ties.length] ?? null;
}
