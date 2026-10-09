import type { ContentIndex } from '../../../schemas/chunks.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { events, storeReady } from '../progress.ts';
import { pad2 } from '../router.ts';
import { overlay } from '../state.ts';

/** Home `#/`: the 13 modules, in course order. */
export function Home({ idx }: { idx: ContentIndex }) {
  useTitle('Home');
  const lessons = idx.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  return (
    <>
      <h1>AWS Cloud Practitioner Essentials</h1>
      <p class="muted lede">
        {idx.modules.length} modules, {lessons} lessons
      </p>
      <HomeLine />
      <ul class="rows">
        {idx.modules.map((m) => (
          <li key={m.n}>
            <a class="row" href={`#/m/${pad2(m.n)}`}>
              <span class="row-n">{m.n}</span>
              <span class="row-title">{m.short}</span>
              <span class="row-meta">
                {m.lessons.length === 1 ? '1 lesson' : `${m.lessons.length} lessons`}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p>
        <a href="#/missions">Missions: real AWS, done by hand</a>
      </p>
    </>
  );
}

const openProgress = (): void => {
  overlay.value = 'progress';
};

/** At most one line under the title (spec 4.6): the first-run line while the log is empty. */
function HomeLine() {
  if (!storeReady.value) return null;
  if (events.value.length === 0) {
    return (
      <p class="home-line">
        Progress lives in this browser.{' '}
        <button class="link-button" type="button" onClick={openProgress}>
          Import a backup
        </button>
      </p>
    );
  }
  return null;
}
