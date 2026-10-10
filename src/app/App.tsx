import { useEffect } from 'preact/hooks';
import { ENGINE_VERSION } from '../engine/replay.ts';
import { KV_KEYS } from '../store/kv.ts';
import { startClock } from './clock.ts';
import { index, loadError, loadIndex } from './content.ts';
import { useKeyboard } from './keyboard.ts';
import { events, initStore, kvRecords, saveError, storeReady, writeKv } from './progress.ts';
import { Help } from './screens/Help.tsx';
import { Palette } from './screens/Palette.tsx';
import { Progress } from './screens/Progress.tsx';
import { Screen } from './screens/Screen.tsx';
import { TopBar } from './screens/TopBar.tsx';
import { overlay, route } from './state.ts';
import { rulesLine } from './topbar.ts';

/** The shell: the top bar, the screen for the route once the content index has loaded, and the open dialog. */
export function App() {
  useEffect(() => {
    loadIndex();
    void initStore();
    return startClock();
  }, []);
  useKeyboard();
  return (
    <>
      <TopBar />
      <SaveError />
      <RulesUpdated />
      <main id="main" class="page" tabIndex={-1}>
        <Body />
      </main>
      {overlay.value === 'palette' && <Palette />}
      {overlay.value === 'help' && <Help />}
      {overlay.value === 'progress' && <Progress />}
    </>
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

function Body() {
  const error = loadError.value;
  const idx = index.value;
  if (error !== null) return <p role="alert">{error}</p>;
  if (idx === null) return <p class="muted">Loading</p>;
  return <Screen route={route.value} idx={idx} />;
}
