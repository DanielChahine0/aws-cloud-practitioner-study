import { effect } from '@preact/signals';
import { useEffect, useRef } from 'preact/hooks';
import { ENGINE_VERSION } from '../engine/replay.ts';
import { KV_KEYS } from '../store/kv.ts';
import { closeOnBackdrop } from '../ui/backdrop.ts';
import { startClock } from './clock.ts';
import { index, loadError, loadIndex } from './content.ts';
import { examTick, openExam, settleExam } from './exam-settle.ts';
import { useKeyboard } from './keyboard.ts';
import { rankUp, watchRanks } from './memory.ts';
import { events, initStore, kvRecords, progress, saveError, storeReady, writeKv } from './progress.ts';
import { Help } from './screens/Help.tsx';
import { LAZY_ERROR, lazyScreen } from './screens/Lazy.tsx';
import { Palette } from './screens/Palette.tsx';
import { Screen } from './screens/Screen.tsx';
import { TopBar } from './screens/TopBar.tsx';
import { exam, overlay, route } from './state.ts';
import { rankUpLine, rulesLine } from './topbar.ts';

// The Progress overlay's code stays out of the initial bundle (spec 2.10); the app fetches it once the log has loaded,
// so the save-error banner's Export works offline on a first visit too.
const Progress = lazyScreen(
  () => import('./screens/Progress.tsx').then((m) => m.Progress),
  ProgressLoadError,
);

/** The shell: the top bar, the screen for the route once the content index has loaded, and the open dialog. */
export function App() {
  useEffect(() => {
    loadIndex();
    void initStore().then(Progress.preload);
    return startClock();
  }, []);
  useEffect(() => watchRanks(), []);
  useExamTicker();
  useKeyboard();
  return (
    <>
      <TopBar />
      <SaveError />
      <RulesUpdated />
      <RankUp />
      <main id="main" class="page" tabIndex={-1}>
        <Body />
      </main>
      {overlay.value === 'palette' && <Palette />}
      {overlay.value === 'help' && <Help />}
      {overlay.value === 'progress' && <Progress />}
    </>
  );
}

/**
 * The exam clock: while any boss or mock is open, wherever the route is, ticks `examTick` every second and settles the
 * exam once its deadline has passed, also for an exam already past it when the log loads (spec 4.3).
 * It waits for the content index too, which loads on its own fetch, since a settle needs it to find the questions.
 */
function useExamTicker(): void {
  useEffect(
    () =>
      effect(() => {
        if (!storeReady.value || index.value === null) return;
        const open = openExam(progress.value);
        if (open === null || open.deadline === null) return;
        const { sid } = open;
        const deadline = Date.parse(open.deadline);
        const tick = (): void => {
          const at = Date.now();
          examTick.value = at;
          if (at >= deadline) void settleExam(sid, new Date(at));
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
      }),
    [],
  );
}

const openProgress = (): void => {
  overlay.value = 'progress';
};

/** The banner of spec 8.1 while writes fail; the log still lives in memory, so an export saves it. */
function SaveError() {
  const message = saveError.value;
  if (message === null) return null;
  return (
    <div class="banner" role="alert">
      <span>{message}</span>
      <button class="button" type="button" onClick={openProgress}>
        Export
      </button>
    </div>
  );
}

/**
 * The Progress sheet when its code cannot load: a closable dialog, so closing it gives the keys back and the next open
 * tries the load again.
 */
function ProgressLoadError() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (el !== null && !el.open) el.showModal();
  }, []);
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
        <h2 id="progress-title">Progress</h2>
        <p role="alert">{LAZY_ERROR}</p>
        <form method="dialog">
          <button class="button" type="submit">
            Close
          </button>
        </form>
      </div>
    </dialog>
  );
}

const stampEngine = (): void => {
  void writeKv(KV_KEYS.engineVersion, ENGINE_VERSION);
};

/** The one line of spec 8.2 after `ENGINE_VERSION` changes; an empty log takes the new version silently. */
function RulesUpdated() {
  const state = rulesLine({
    ready: storeReady.value,
    stored: kvRecords.value[KV_KEYS.engineVersion]?.value,
    events: events.value.length,
  });
  useEffect(() => {
    if (state === 'stamp') stampEngine();
  }, [state]);
  if (state !== 'show') return null;
  return (
    <div class="banner banner-info" role="status">
      <span>Rules updated, progress recalculated.</span>
      <button class="link-button" type="button" onClick={stampEngine}>
        Dismiss
      </button>
    </div>
  );
}

/** The one promotion line of spec 3.4; Dismiss writes `rankSeen`, so neither a reload nor a replay brings it back. */
function RankUp() {
  const up = storeReady.value ? rankUp.value : null;
  if (up === null || exam.value !== null) return null;
  return (
    <div class="banner banner-info" role="status">
      <span>{rankUpLine(up)}</span>
      <button class="link-button" type="button" onClick={() => void writeKv(KV_KEYS.rankSeen, up.id)}>
        Dismiss
      </button>
    </div>
  );
}

function Body() {
  const error = loadError.value;
  const idx = index.value;
  if (error !== null) return <p role="alert">{error}</p>;
  if (idx === null) return <p class="muted">Loading</p>;
  return <Screen route={route.value} idx={idx} />;
}
