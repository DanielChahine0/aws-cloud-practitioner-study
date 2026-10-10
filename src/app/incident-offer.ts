/**
 * Records today's incident offer (spec 4.5): on the first Home render of a study day with no offer yet, the pick of
 * `src/engine/incident.ts` becomes an `incident.offered` event, so it holds all day. Loaded only through `import()`.
 */
import { studyDay } from '../engine/day.ts';
import { pickIncident } from '../engine/incident.ts';
import { index } from './content.ts';
import { modulesRead } from './incident.ts';
import { mastery } from './memory.ts';
import { progress, record, storeReady } from './progress.ts';

let inFlight: Promise<void> | null = null;

/** Offers today's incident once; a call while one is being recorded waits for it instead of offering twice. */
export function offerIncident(at: Date): Promise<void> {
  if (inFlight === null) inFlight = offer(at).finally(() => (inFlight = null));
  return inFlight;
}

async function offer(at: Date): Promise<void> {
  const idx = index.peek();
  const byModule = mastery.peek();
  if (!storeReady.peek() || idx === null || byModule === null) return;
  const today = studyDay(at);
  const p = progress.peek();
  if (p.incidentsOffered.has(today)) return;
  const incident = pickIncident({
    incidents: idx.incidents,
    solved: new Set(p.incidentsDone.keys()),
    lessonsRead: modulesRead(idx.modules, p.lessonsDone),
    mastery: byModule,
    day: today,
  });
  if (incident !== null) await record({ t: 'incident.offered', incident }, at);
}
