import { useEffect, useRef, useState } from 'preact/hooks';
import { SCHEMA_VERSION } from '../../../schemas/version.ts';
import { studyDay } from '../../engine/day.ts';
import { level } from '../../engine/level.ts';
import { ENGINE_VERSION } from '../../engine/replay.ts';
import {
  APP_VERSION,
  type BackupData,
  backupFileName,
  makeBackup,
  parseBackup,
  previewLine,
  previewOf,
} from '../../store/backup.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { closeOnBackdrop } from '../../ui/backdrop.ts';
import { now } from '../clock.ts';
import { index } from '../content.ts';
import { shortDate } from '../dates.ts';
import { memory, streak } from '../memory.ts';
import {
  events,
  kvRecords,
  lastExportAt,
  mergeIn,
  progress,
  record,
  replaceAll,
  writeKv,
} from '../progress.ts';
import { overlay } from '../state.ts';
import { BadgeList } from './progress/BadgeList.tsx';
import { Calibration } from './progress/Calibration.tsx';
import { Causes } from './progress/Causes.tsx';
import { DayStrip } from './progress/DayStrip.tsx';
import { MockHistory } from './progress/MockHistory.tsx';
import { RankSection } from './progress/RankSection.tsx';
import { ReadinessSection } from './progress/ReadinessSection.tsx';
import { ResetSection } from './progress/ResetSection.tsx';

const count = (n: number): string => n.toLocaleString('en-US');
const plural = (n: number, one: string, many: string): string => `${count(n)} ${n === 1 ? one : many}`;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Saves the whole log and kv as a backup file and remembers when (spec 8.3). */
async function exportBackup(): Promise<void> {
  const now = new Date();
  await writeKv(KV_KEYS.lastExportAt, now.toISOString(), now);
  const backup = makeBackup(events.value, kvRecords.value, {
    appVersion: APP_VERSION,
    contentVersion: index.value?.contentVersion ?? '',
    now,
  });
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(now);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type ImportState =
  | { step: 'idle' }
  | { step: 'error'; message: string }
  | { step: 'preview'; data: BackupData; confirmReplace: boolean }
  | { step: 'done'; message: string };

/** The Progress overlay (`g p`): counts, backup export and import, diagnostics and versions. */
export function Progress() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<ImportState>({ step: 'idle' });

  useEffect(() => {
    const el = dialog.current;
    if (el === null || el.open) return;
    el.showModal();
    // The sheet opens at its top, on the title, not scrolled down to its first button (Export a backup).
    el.querySelector<HTMLElement>('#progress-title')?.focus();
  }, []);

  const p = progress.value;
  const answers = [...p.answers.values()].reduce((sum, list) => sum + list.length, 0);
  const last = lastExportAt();
  const contentVersion = index.value?.contentVersion ?? '-';

  return (
    <dialog
      ref={dialog}
      class="sheet"
      aria-labelledby="progress-title"
      onClose={() => {
        if (overlay.value === 'progress') overlay.value = null;
      }}
      onMouseDown={(event) => closeOnBackdrop(event.currentTarget, event)}
    >
      <div class="sheet-body">
        <h2 id="progress-title" tabIndex={-1}>
          Progress
        </h2>
        <p class="progress-summary">
          {plural(answers, 'answer', 'answers')}, {plural(p.lessonsDone.size, 'lesson', 'lessons')} read
        </p>
        <LevelAndStreak />
        <RankSection />
        {index.value !== null && <ReadinessSection idx={index.value} />}
        <DayStrip />
        <Calibration />
        <Causes />
        {index.value !== null && <BadgeList idx={index.value} />}
        <MockHistory />

        <h3>Backup</h3>
        <p class="muted">
          {last === null ? 'No backup yet' : `Last backup ${shortDate(studyDay(new Date(last)))}`}
        </p>
        <p class="sheet-actions">
          <button class="button" type="button" onClick={() => void exportBackup()}>
            Export a backup
          </button>
        </p>
        <label class="file-label">
          Import a backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              input.value = '';
              if (file === undefined) return;
              void file
                .text()
                .then(parseBackup)
                .then((result) =>
                  setState(
                    result.ok
                      ? { step: 'preview', data: result.data, confirmReplace: false }
                      : { step: 'error', message: result.error },
                  ),
                );
            }}
          />
        </label>
        {state.step === 'error' && (
          <p class="import-error" role="alert">
            {state.message}
          </p>
        )}
        {state.step === 'preview' && (
          <ImportPreviewPanel
            data={state.data}
            confirmReplace={state.confirmReplace}
            onConfirmReplace={() => setState({ ...state, confirmReplace: true })}
            onCancel={() => setState({ step: 'idle' })}
            onMerge={() =>
              void mergeIn(state.data).then((added) =>
                setState({ step: 'done', message: `Imported. ${plural(added, 'new event', 'new events')}.` }),
              )
            }
            onReplace={() =>
              void replaceAll(state.data).then((total) =>
                setState({
                  step: 'done',
                  message: `Replaced. This browser now has ${plural(total, 'event', 'events')}.`,
                }),
              )
            }
          />
        )}
        {state.step === 'done' && (
          <p class="import-done" role="status">
            {state.message}
          </p>
        )}

        <ExamDate />

        <h3>Diagnostics</h3>
        <p class="muted">
          {p.unknownEvents > 0
            ? `${plural(p.unknownEvents, 'event refers', 'events refer')} to newer content`
            : 'Every event matches this content.'}
        </p>

        <h3>Versions</h3>
        <p class="muted">
          Content {contentVersion} · Engine {ENGINE_VERSION} · Storage {SCHEMA_VERSION} · App {APP_VERSION}
        </p>

        <ResetSection />

        <form method="dialog">
          <button class="button" type="submit">
            Close
          </button>
        </form>
      </div>
    </dialog>
  );
}

/** Level, XP and today's XP, then the streak with its freezes (spec 3.3 and 3.5). */
function LevelAndStreak() {
  const m = memory.value;
  const s = streak.value;
  const today = studyDay(now.value);
  return (
    <>
      {m !== null && (
        <p class="progress-line">
          Level {level(m.xp)} · {count(m.xp)} XP · {count(m.xpByDay.get(today) ?? 0)} today
        </p>
      )}
      {s !== null && (
        <p class="progress-line">
          Streak {plural(s.current, 'day', 'days')} · {plural(s.freezes, 'freeze', 'freezes')} · longest{' '}
          {count(s.longest)}
        </p>
      )}
    </>
  );
}

/**
 * The exam date (spec 7.5), editable here at any time; each change is a `settings` event, so replay re-caps every due.
 * Clearing it also marks the Home question as answered, so Home never asks again.
 */
function ExamDate() {
  const current = memory.value?.examDate ?? null;
  const [date, setDate] = useState(current ?? '');
  useEffect(() => setDate(current ?? ''), [current]);
  const valid = ISO_DAY.test(date);
  return (
    <>
      <h3>Exam date</h3>
      {current === null && <p class="muted">No exam date set</p>}
      <form
        class="sheet-actions"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && date !== current) void record({ t: 'settings', patch: { examDate: date } });
        }}
      >
        <label class="date-field">
          Exam date
          <input type="date" value={date} onInput={(event) => setDate(event.currentTarget.value)} />
        </label>
        <button class="button" type="submit" disabled={!valid || date === current}>
          Save
        </button>
        {current !== null && (
          <button
            class="link-button"
            type="button"
            onClick={() => {
              void record({ t: 'settings', patch: { examDate: null } });
              void writeKv(KV_KEYS.examAsk, 'dismissed');
            }}
          >
            Clear
          </button>
        )}
      </form>
    </>
  );
}

function ImportPreviewPanel({
  data,
  confirmReplace,
  onConfirmReplace,
  onCancel,
  onMerge,
  onReplace,
}: {
  data: BackupData;
  confirmReplace: boolean;
  onConfirmReplace: () => void;
  onCancel: () => void;
  onMerge: () => void;
  onReplace: () => void;
}) {
  const merge = useRef<HTMLButtonElement>(null);
  const replace = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    (confirmReplace ? replace : merge).current?.focus();
  }, [confirmReplace]);
  return (
    <div class="import-preview">
      <p>{previewLine(previewOf(data, events.value))}</p>
      {confirmReplace ? (
        <p class="sheet-actions">
          <button ref={replace} class="button" type="button" onClick={onReplace}>
            Replace all progress in this browser
          </button>
          <button class="link-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        </p>
      ) : (
        <p class="sheet-actions">
          <button ref={merge} class="button" type="button" onClick={onMerge}>
            Merge
          </button>
          <button class="button button-quiet" type="button" onClick={onConfirmReplace}>
            Replace
          </button>
          <button class="link-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        </p>
      )}
    </div>
  );
}
