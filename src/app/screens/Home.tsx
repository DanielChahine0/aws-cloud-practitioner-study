import type { ContentIndex } from '../../../schemas/chunks.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { pad2 } from '../router.ts';

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
