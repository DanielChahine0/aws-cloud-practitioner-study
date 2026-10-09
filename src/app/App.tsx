import { useEffect } from 'preact/hooks';
import { index, loadError, loadIndex } from './content.ts';
import { useKeyboard } from './keyboard.ts';
import { Help } from './screens/Help.tsx';
import { Palette } from './screens/Palette.tsx';
import { Screen } from './screens/Screen.tsx';
import { overlay, route } from './state.ts';

/** The shell: the top bar, the screen for the route once the content index has loaded, and the open dialog. */
export function App() {
  useEffect(() => loadIndex(), []);
  useKeyboard();
  return (
    <>
      <TopBar />
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

function Body() {
  const error = loadError.value;
  const idx = index.value;
  if (error !== null) return <p role="alert">{error}</p>;
  if (idx === null) return <p class="muted">Loading</p>;
  return <Screen route={route.value} idx={idx} />;
}
