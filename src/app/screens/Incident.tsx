/** The daily incident (spec 4.1, 4.5): today's offered incident, run step by step in the Runner's Session. */
import { useEffect, useState } from 'preact/hooks';
import type { ContentIndex, IncidentView, QuestionView } from '../../../schemas/chunks.ts';
import { studyDay } from '../../engine/day.ts';
import { INCIDENT_UNLOCK_MODULE } from '../../engine/incident.ts';
import { openSession } from '../../engine/replay.ts';
import { ulid } from '../../store/ulid.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { ensureModule, modules } from '../content.ts';
import { INCIDENT_LOCKED, INCIDENT_NONE, INCIDENT_SOLVED, modulesRead } from '../incident.ts';
import { offerIncident } from '../incident-offer.ts';
import { incidentNow } from '../memory.ts';
import { newSessionSeed, progress, record, storeReady } from '../progress.ts';
import { Session } from './Runner.tsx';

const CRUMBS = [
  { label: 'Home', href: '#/' },
  { label: 'Incident', href: '#/s/incident' },
];

/** Resumes the open session of this incident, or records the start of a new one with its steps in file order. */
function startOrResume(incident: IncidentView): string {
  const open = openSession(progress.peek(), 'incident', incident.id);
  if (open !== null) return open.sid;
  const sid = ulid();
  void record({
    t: 'session',
    sid,
    mode: 'incident',
    phase: 'start',
    scope: incident.id,
    seed: newSessionSeed(),
    qids: incident.steps.map((s) => s.id),
  });
  return sid;
}

export function Incident({ idx }: { idx: ContentIndex }) {
  const ready = storeReady.value;
  const p = progress.value;
  const day = studyDay(now.value);
  const today = ready ? incidentNow.value : null;
  const [sid, setSid] = useState<string | null>(null);
  const session = sid === null ? undefined : p.sessions.get(sid);
  // A run keeps its own incident, so a study day that rolls over at 04:00 never swaps or drops it while it is open.
  const id = session?.scope ?? today?.incident;
  const meta = id === undefined ? undefined : idx.incidents.find((i) => i.id === id);
  const home = meta?.modules[0];
  useTitle(meta?.title ?? 'Incident');
  // A direct visit, or a screen left open into a new study day, offers that day's incident as Home would.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes values read from signals for constants; the store's readiness and the study day change, and each change offers again
  useEffect(() => {
    if (ready) void offerIncident(now.peek());
  }, [ready, day]);
  useEffect(() => {
    if (home !== undefined) ensureModule(home);
  }, [home]);

  const view =
    home === undefined ? undefined : modules.value.get(home)?.incidents.find((i) => i.id === meta?.id);
  // A solve keeps its end line on screen until Dani leaves; a later visit shows the solved line instead.
  const startable = today !== null && !today.done && sid === null ? view : undefined;
  useEffect(() => {
    if (startable !== undefined) setSid(startOrResume(startable));
  }, [startable]);

  if (meta !== undefined && view !== undefined && session !== undefined) {
    const shipped = new Map<string, QuestionView>(view.steps.map((s) => [s.id, s]));
    return (
      <>
        <Breadcrumbs items={CRUMBS} />
        <h1>{meta.title}</h1>
        <p class="lede incident-brief">{view.brief}</p>
        <Session
          idx={idx}
          shipped={shipped}
          pool={[]}
          session={session}
          mode="incident"
          module={null}
          slug={null}
        />
      </>
    );
  }
  const line = !ready
    ? null
    : !modulesRead(idx.modules, p.lessonsDone)(INCIDENT_UNLOCK_MODULE)
      ? INCIDENT_LOCKED
      : today === null
        ? INCIDENT_NONE
        : today.done
          ? INCIDENT_SOLVED
          : null;
  return (
    <>
      <Breadcrumbs items={CRUMBS} />
      <h1>Incident</h1>
      <p class={line === null ? 'muted' : 'incident-empty'}>{line ?? 'Loading'}</p>
    </>
  );
}
