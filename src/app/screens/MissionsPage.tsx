import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';

/** Missions `#/missions`: the real-AWS missions, read-only in Phase 0. */
export function MissionsPage({ idx }: { idx: ContentIndex }) {
  useTitle('Missions');
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: 'Missions', href: '#/missions' },
        ]}
      />
      <h1>Missions</h1>
      <p class="muted lede">
        These pages are read-only for now: you do each mission by hand, in your own AWS account.
      </p>
      <ul class="rows">
        {idx.missions.map((m) => (
          <li key={m.id}>
            <a class="row" href={`#/missions/${m.id}`}>
              <span class="row-n">{Number(m.id.slice('mission-'.length))}</span>
              <span class="row-title">{m.title}</span>
              <span class="row-meta">{m.expectedCredits}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
