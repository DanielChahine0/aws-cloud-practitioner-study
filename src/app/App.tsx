import { useEffect } from 'preact/hooks';
import { index, loadError, loadIndex } from './content.ts';
import { useKeyboard } from './keyboard.ts';
import { initStore, saveError } from './progress.ts';
import { Help } from './screens/Help.tsx';
import { Palette } from './screens/Palette.tsx';
import { Screen } from './screens/Screen.tsx';
import { overlay, route } from './state.ts';

/** The shell: the top bar, the screen for the route once the content index has loaded, and the open dialog. */
export function App() {
  useEffect(() => {
    loadIndex();
    void initStore();
  }, []);
  useKeyboard();
  return (
    <>
      <TopBar />
      <SaveError />
      <main id="main" class="page" tabIndex={-1}>
        <Body />
      </main>
      {overlay.value === 'palette' && <Palette />}
      {overlay.value === 'help' && <Help />}
    </>
  );
}

function TopBar() {
  return (
    <header class="topbar">
      <nav class="topbar-inner" aria-label="Site">
        <a class="brand" href="#/">
          CCP
        </a>
        <a href="#/missions">Missions</a>
        <button class="topbar-button" type="button" onClick={openProgress}>
          Progress
        </button>
        <button
          class="search"
          type="button"
          onClick={() => {
            overlay.value = 'palette';
          }}
        >
          Search <kbd>/</kbd>
        </button>
      </nav>
    </header>
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

function Body() {
  const error = loadError.value;
  const idx = index.value;
  if (error !== null) return <p role="alert">{error}</p>;
  if (idx === null) return <p class="muted">Loading</p>;
  return <Screen route={route.value} idx={idx} />;
}
