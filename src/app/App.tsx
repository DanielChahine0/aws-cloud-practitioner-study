import { useEffect } from 'preact/hooks';
import { index, loadError, loadIndex } from './content.ts';
import { Screen } from './screens/Screen.tsx';
import { route } from './state.ts';

/** The shell: the top bar, then the screen for the route once the content index has loaded. */
export function App() {
  useEffect(() => loadIndex(), []);
  return (
    <>
      <TopBar />
      <main id="main" class="page" tabIndex={-1}>
        <Body />
      </main>
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
