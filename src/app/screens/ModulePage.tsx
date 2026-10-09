import { useEffect } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, modules } from '../content.ts';
import { progress } from '../progress.ts';
import { pad2 } from '../router.ts';
import { quizAvailability } from '../runner.ts';
import { NotFound } from './NotFound.tsx';

/** Module `#/m/NN`: the lesson list, then the module README without its title and lesson list. */
export function ModulePage({ idx, module }: { idx: ContentIndex; module: number }) {
  const meta = idx.modules.find((m) => m.n === module);
  useTitle(meta === undefined ? 'Not found' : `Module ${module}: ${meta.short}`);
  useEffect(() => ensureModule(module), [module]);
  if (meta === undefined) return <NotFound hash={`#/m/${pad2(module)}`} />;
  const chunk = modules.value.get(module);
  const { lessonsDone, checkScores } = progress.value;
  const noteId = (slug: string): string => `m${pad2(module)}/${slug}`;
  const quiz = quizAvailability({
    anyLessonDone: meta.lessons.some((l) => lessonsDone.has(noteId(l.slug))),
    questionCount: chunk?.questions.length ?? 0,
  });
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: `Module ${module}: ${meta.short}`, href: `#/m/${pad2(module)}` },
        ]}
      />
      <h1>{meta.short}</h1>
      <p class="muted lede">
        Module {module}, {meta.lessons.length === 1 ? '1 lesson' : `${meta.lessons.length} lessons`}
      </p>
      <h2>Lessons</h2>
      <ul class="rows">
        {meta.lessons.map((l) => {
          const read = lessonsDone.has(noteId(l.slug));
          const score = checkScores.get(noteId(l.slug));
          return (
            <li key={l.slug}>
              <a class="row" href={`#/m/${pad2(module)}/l/${l.slug}`}>
                <span class="row-n">{l.n}</span>
                <span class="row-title">{l.title}</span>
                {(read || score !== undefined) && (
                  <span class="row-meta row-marks">
                    {read && (
                      <span class="mark">
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                          <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" />
                        </svg>
                        Read
                      </span>
                    )}
                    {score !== undefined && (
                      <span class="mark">
                        Check {score.correct}/{score.total}
                      </span>
                    )}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
      <h2>Practice</h2>
      {chunk === undefined ? (
        <p class="muted">Loading</p>
      ) : quiz === 'open' ? (
        <p>
          <a class="button-link" href={`#/s/quiz/m${pad2(module)}`}>
            Start a module quiz
          </a>
        </p>
      ) : (
        <p class="muted">
          {quiz === 'locked'
            ? 'Opens after you finish one lesson of this module.'
            : 'No practice questions for this module yet.'}
        </p>
      )}
      {chunk === undefined ? (
        <p class="muted">Loading</p>
      ) : (
        chunk.readme
          .filter((s) => s.id !== '' && s.id !== 'lessons')
          .map((s) => <Html key={s.id} className="prose" html={s.html} />)
      )}
    </>
  );
}
