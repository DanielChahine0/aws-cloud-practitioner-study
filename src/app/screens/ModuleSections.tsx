import { useEffect } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { decisionStage, decisionsOf } from '../../engine/capstone.ts';
import { studyDay } from '../../engine/day.ts';
import { now } from '../clock.ts';
import { TARGET_EXAM_DATE } from '../config.ts';
import { bosses, memory } from '../memory.ts';
import { stageWord } from '../mission-copy.ts';
import { statuses } from '../missions.ts';
import { capstoneRow, missionRows, NO_MISSIONS } from '../module-sections.ts';
import { events, storeReady } from '../progress.ts';
import { ensureProject, project } from '../project-content.ts';

/** The module page's Capstone and Missions sections (spec 7.3), after Labs and before Boss. */
export function ModuleSections({ idx, module }: { idx: ContentIndex; module: number }) {
  return (
    <>
      <Capstone idx={idx} module={module} />
      <Missions idx={idx} module={module} />
    </>
  );
}

/**
 * The module's capstone decision (spec 6) as one row with its stage word; its title comes from the project chunk,
 * which this page loads but never shows the key points of.
 */
function Capstone({ idx, module }: { idx: ContentIndex; module: number }) {
  useEffect(() => {
    if (idx.project !== null) void ensureProject();
  }, [idx]);
  if (idx.project === null) return null;
  const title = project.value?.decisions.find((d) => d.module === module)?.title;
  const m = storeReady.value ? memory.value : null;
  const row =
    title === undefined || m === null
      ? null
      : capstoneRow(
          module,
          decisionStage({
            lessonsRead: bosses.value.get(module)?.unlocked === true,
            today: studyDay(now.value),
            examDate: m.examDate ?? TARGET_EXAM_DATE,
            record: decisionsOf(events.value).get(module),
          }),
          title,
        );
  return (
    <>
      <h2>Capstone</h2>
      {row === null ? (
        <p class="muted">Loading</p>
      ) : (
        <ul class="rows">
          <li>
            <a class="row" href={row.href} data-nav-item>
              <span class="row-title">{row.label}</span>
              <span class="row-meta">{row.meta}</span>
            </a>
          </li>
        </ul>
      )}
    </>
  );
}

/** The missions that use this module (spec 5.3), each with its state word. */
function Missions({ idx, module }: { idx: ContentIndex; module: number }) {
  const rows = missionRows(module, statuses.value, idx);
  return (
    <>
      <h2>Missions</h2>
      {rows.length === 0 ? (
        <p class="muted">{NO_MISSIONS}</p>
      ) : (
        <ul class="rows">
          {rows.map((row) => (
            <li key={row.id}>
              <a class="row" href={row.href} data-nav-item>
                <span class="row-n">{row.n}</span>
                <span class="row-title">{row.title}</span>
                <span class="row-meta">{stageWord(row.status)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
