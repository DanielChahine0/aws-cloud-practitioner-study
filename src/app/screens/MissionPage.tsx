import { Fragment } from 'preact';
import { useEffect } from 'preact/hooks';
import type { ContentIndex, MissionMeta } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { missionAnnounce, slotAfter } from '../mission-copy.ts';
import { pad2 } from '../router.ts';
import { MissionFlow } from './MissionFlow.tsx';
import { NotFound } from './NotFound.tsx';

function lifetime(m: MissionMeta): string {
  if (m.keep) return 'Kept running';
  if (m.maxLiveHours !== null) return `Cleaned up within ${m.maxLiveHours} hours`;
  return 'No live resources';
}

/** The URL with a line-break opportunity after each path slash, so a long one wraps at a path boundary. */
function breakable(url: string) {
  let at = 0;
  return url.split(/(?<=[^/]\/)(?=[^/])/).map((part) => {
    const start = at;
    at += part.length;
    return (
      <Fragment key={start}>
        {start > 0 && <wbr />}
        {part}
      </Fragment>
    );
  });
}

/** Mission `#/missions/mission-NN`: the facts box, the steps and the sources they were checked against. */
export function MissionPage({ idx, id }: { idx: ContentIndex; id: string }) {
  const m = idx.missions.find((x) => x.id === id);
  useTitle(m?.title ?? 'Not found');
  // biome-ignore lint/correctness/useExhaustiveDependencies: the line belongs to one mission, so it clears when another opens
  useEffect(() => {
    missionAnnounce.value = '';
  }, [id]);
  if (m === undefined) return <NotFound hash={`#/missions/${id}`} />;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: 'Missions', href: '#/missions' },
          { label: m.title, href: `#/missions/${m.id}` },
        ]}
      />
      <h1>{m.title}</h1>
      <dl class="facts">
        <dt>Modules</dt>
        <dd>
          {m.modules.map((n, i) => (
            <span key={n}>
              {i > 0 && ', '}
              <a href={`#/m/${pad2(n)}`}>Module {n}</a>
            </span>
          ))}
        </dd>
        <dt>Services</dt>
        <dd>{m.services.join(', ')}</dd>
        <dt>Expected credits</dt>
        <dd>{m.expectedCredits}</dd>
        <dt>Time limit</dt>
        <dd>{lifetime(m)}</dd>
        <dt>Can use credits</dt>
        <dd>{m.canUseCredits.length === 0 ? 'Nothing' : m.canUseCredits.join(', ')}</dd>
      </dl>
      {m.sections.map((section) => {
        const slot = slotAfter(section.id, m);
        return (
          <Fragment key={section.id}>
            <Html className="prose" html={section.html} />
            {slot !== null && <MissionFlow mission={m} slot={slot} />}
          </Fragment>
        );
      })}
      <p class="visually-hidden" aria-live="polite">
        {missionAnnounce.value}
      </p>
      <h2>Sources</h2>
      <ul class="sources">
        {m.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} rel="noopener noreferrer" target="_blank">
              {breakable(s.url)}
            </a>{' '}
            <span class="muted">checked {s.verified_on}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
