import { Fragment } from 'preact';
import { useEffect } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { studyDay, tzOffset } from '../../engine/day.ts';
import { hexBand } from '../../engine/mastery.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { ensureModule, modules } from '../content.ts';
import { bosses, mastery, memory } from '../memory.ts';
import { bossLineOf, conceptMarks, labRows, masteryLine, NO_LABS, weakestConcepts } from '../module.ts';
import { progress, storeReady } from '../progress.ts';
import { pad2 } from '../router.ts';
import { quizAvailability } from '../runner.ts';
import { lazyScreen } from './Lazy.tsx';
import { NotFound } from './NotFound.tsx';

// The Capstone and Missions sections load on first use, so the capstone and mission helpers stay out of the initial bundle.
const ModuleSections = lazyScreen(() => import('./ModuleSections.tsx').then((m) => m.ModuleSections));

/**
 * Module `#/m/NN` (spec 7.3): the mastery line, the lessons, the tested concepts weakest first, practice with the
 * focus quiz, the labs with their done marks, the boss with its cooldown, then the module README without its title
 * and lesson list.
 */
export function ModulePage({ idx, module }: { idx: ContentIndex; module: number }) {
  const meta = idx.modules.find((m) => m.n === module);
  useTitle(meta === undefined ? 'Not found' : `Module ${module}: ${meta.short}`);
  useEffect(() => ensureModule(module), [module]);
  if (meta === undefined) return <NotFound hash={`#/m/${pad2(module)}`} />;
  const chunk = modules.value.get(module);
  const { lessonsDone, checkScores, labsDone } = progress.value;
  const noteId = (slug: string): string => `m${pad2(module)}/${slug}`;
  const quiz = quizAvailability({
    anyLessonDone: meta.lessons.some((l) => lessonsDone.has(noteId(l.slug))),
    questionCount: chunk?.questions.length ?? 0,
  });
  const ready = storeReady.value;
  const value = mastery.value?.get(module) ?? 0;
  const boss = ready ? bosses.value.get(module) : undefined;
  const passed = boss?.passed === true;
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
      {ready && <p class="mastery-line">{masteryLine(value, hexBand(value, passed), passed)}</p>}
      <h2>Lessons</h2>
      <ul class="rows">
        {meta.lessons.map((l) => {
          const read = lessonsDone.has(noteId(l.slug));
          const score = checkScores.get(noteId(l.slug));
          return (
            <li key={l.slug}>
              <a class="row" href={`#/m/${pad2(module)}/l/${l.slug}`} data-nav-item>
                <span class="row-n">{l.n}</span>
                <span class="row-title">{l.title}</span>
                {(read || score !== undefined) && (
                  <span class="row-meta row-marks">
                    {read && (
                      <span class="mark">
                        <CheckMark />
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
      <Concepts idx={idx} module={module} />
      <h2>Practice</h2>
      {chunk === undefined ? (
        <p class="muted">Loading</p>
      ) : quiz === 'open' ? (
        <p class="practice-links">
          <a class="button-link" href={`#/s/quiz/m${pad2(module)}`}>
            Start a module quiz
          </a>
          <a class="button-link" href={`#/s/focus/m${pad2(module)}`}>
            Focus quiz: 10 weakest concepts
          </a>
        </p>
      ) : (
        <p class="muted">
          {quiz === 'locked'
            ? 'Opens after you finish one lesson of this module.'
            : 'No practice questions for this module yet.'}
        </p>
      )}
      <Labs idx={idx} module={module} done={labsDone} />
      <ModuleSections idx={idx} module={module} />
      <h2>Boss</h2>
      {boss === undefined ? (
        <p class="muted">Loading</p>
      ) : (
        <>
          <p class="muted boss-line">{bossLineOf(boss, now.value, tzOffset(now.value))}</p>
          {boss.unlocked && (boss.open !== null || boss.cooldownUntil === null) && (
            <p>
              <a class="button-link" href={`#/s/boss/m${pad2(module)}`}>
                {boss.open !== null ? 'Resume the boss' : 'Start the boss (15 questions, 21 min)'}
              </a>
            </p>
          )}
        </>
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

/** The check before `Read` and `Done`; the word beside it carries the meaning, so the icon is hidden. */
function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" />
    </svg>
  );
}

/** The module's labs (spec 7.2), each with its engine, minutes and a Done mark once completed. */
function Labs({
  idx,
  module,
  done,
}: {
  idx: ContentIndex;
  module: number;
  done: ReadonlyMap<string, unknown>;
}) {
  const rows = labRows(idx, module, new Set(done.keys()));
  return (
    <>
      <h2>Labs</h2>
      {rows.length === 0 ? (
        <p class="muted">{NO_LABS}</p>
      ) : (
        <ul class="rows lab-rows">
          {rows.map((row) => (
            <li key={row.id}>
              <a class="row" href={row.href} data-nav-item>
                <span class="row-n">{row.engine}</span>
                <span class="row-title">{row.title}</span>
                <span class="row-meta row-marks">
                  {row.stretch && <span class="mark">Stretch</span>}
                  <span class="mark">{row.minutes} min</span>
                  {row.done && (
                    <span class="mark">
                      <CheckMark />
                      Done
                    </span>
                  )}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** The module's tested concepts, weakest first, each with its mastery and next-due day (spec 7.3). */
function Concepts({ idx, module }: { idx: ContentIndex; module: number }) {
  const m = storeReady.value ? memory.value : null;
  if (m === null) return null;
  const prefix = `m${pad2(module)}/`;
  const tested = idx.concepts.filter((c) => c.tested && c.home.startsWith(prefix));
  if (tested.length === 0) return null;
  const at = now.value;
  const rows = weakestConcepts(
    tested.map((c) => c.id),
    new Map(tested.map((c) => [c.id, c.name] as const)),
    m,
    at,
    tzOffset(at),
  );
  const today = studyDay(at);
  return (
    <>
      <h2>Concepts</h2>
      <ul class="rows">
        {rows.map((row) => {
          const c = tested.find((x) => x.id === row.id);
          return (
            <li key={row.id}>
              <a
                class="row"
                href={
                  c === undefined
                    ? `#/m/${pad2(module)}`
                    : `#/m/${pad2(module)}/l/${c.home.slice(4)}/${c.anchor}`
                }
                data-nav-item
              >
                <span class="row-title">{row.name}</span>
                <span class="row-meta row-marks">
                  {conceptMarks(row, today).map((mark, i) => (
                    <Fragment key={mark}>
                      {i > 0 && ' '}
                      <span class="mark">{mark}</span>
                    </Fragment>
                  ))}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
