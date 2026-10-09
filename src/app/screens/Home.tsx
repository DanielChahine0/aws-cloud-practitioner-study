import type { ContentIndex } from '../../../schemas/chunks.ts';
import { reminderDue } from '../../store/backup.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { events, storeReady } from '../progress.ts';
import { pad2 } from '../router.ts';
import { overlay } from '../state.ts';
import { lastExportAt } from './Progress.tsx';

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

const DAY_MS = 24 * 60 * 60 * 1000;

/** At most one line under the title (spec 4.6): the first-run line while the log is empty, else the backup reminder. */
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
  const last = lastExportAt();
  const now = new Date();
  if (!reminderDue(events.value, last, now)) return null;
  const days = last === null ? 0 : Math.floor((now.getTime() - new Date(last).getTime()) / DAY_MS);
  return (
    <p class="home-line">
      {last === null ? 'No backup yet.' : `Last backup ${days} days ago.`}{' '}
      <button class="link-button" type="button" onClick={openProgress}>
        Export a backup
      </button>
    </p>
  );
}
