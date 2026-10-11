import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { listLede, stageWord } from '../mission-copy.ts';
import { statuses } from '../missions.ts';
import { events, storeReady } from '../progress.ts';
import { AlreadyDone } from './AlreadyDone.tsx';

/** Missions `#/missions` (spec 5.3, 7.3): every mission with its lock, plan-fit, live or done state. */
export function MissionsPage({ idx }: { idx: ContentIndex }) {
  useTitle('Missions');
  const ready = storeReady.value;
  const byId = new Map(statuses.value.map((s) => [s.id, s] as const));
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: 'Missions', href: '#/missions' },
        ]}
      />
      <h1>Missions</h1>
      <p class="muted lede">{listLede(statuses.value)}</p>
      {ready && !events.value.some((e) => e.t === 'mission') && <AlreadyDone />}
      <ul class="rows">
        {idx.missions.map((m) => {
          const s = ready ? byId.get(m.id) : undefined;
          const live = s?.stage === 'live' || s?.stage === 'overdue';
          return (
            <li key={m.id}>
              <a class={live ? 'row row-live' : 'row'} href={`#/missions/${m.id}`} data-nav-item>
                <span class="row-n">{Number(m.id.slice('mission-'.length))}</span>
                <span class="row-title">{m.title}</span>
                <span class="row-meta">{s === undefined ? m.expectedCredits : stageWord(s)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
