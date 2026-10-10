import { useEffect, useRef, useState } from 'preact/hooks';
import { levelProgress } from '../../engine/level.ts';
import { memory, queue, streak } from '../memory.ts';
import { storeReady } from '../progress.ts';
import { toHash } from '../router.ts';
import { navigate, overlay } from '../state.ts';
import { dueLabel, FLASH_MS, streakLabel, xpGain } from '../topbar.ts';

const openProgress = (): void => {
  overlay.value = 'progress';
};

/** Shows each XP gain for 600 ms; the first value after the log loads never flashes. */
function useXpFlash(xp: number | null): { gain: number; key: number } | null {
  const before = useRef<number | null>(null);
  const [flash, setFlash] = useState<{ gain: number; key: number } | null>(null);
  useEffect(() => {
    if (xp === null) return;
    const gain = xpGain(before.current, xp);
    before.current = xp;
    if (gain !== null) setFlash((shown) => ({ gain, key: (shown?.key ?? 0) + 1 }));
  }, [xp]);
  useEffect(() => {
    if (flash === null) return;
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);
  return flash;
}

/** The 44 px top bar (spec 7.2): the due count, the streak, Progress and Search, over the 2 px level line. */
export function TopBar() {
  const ready = storeReady.value;
  const due = ready ? (queue.value?.items.length ?? 0) : 0;
  const days = ready ? (streak.value?.current ?? 0) : 0;
  const xp = ready ? (memory.value?.xp ?? null) : null;
  const flash = useXpFlash(xp);
  return (
    <header class="topbar">
      <nav class="topbar-inner" aria-label="Site">
        <a class="brand" href="#/">
          CCP
        </a>
        <a href="#/missions">Missions</a>
        {(due > 0 || days > 0) && (
          <span class="topbar-stats">
            {due > 0 && (
              <button
                class="topbar-button"
                type="button"
                aria-label={dueLabel(due)}
                onClick={() => navigate(toHash({ kind: 'review' }))}
              >
                {due}
                <span class="topbar-word"> due</span>
              </button>
            )}
            {due > 0 && days > 0 && (
              <span class="topbar-sep" aria-hidden="true">
                ·
              </span>
            )}
            {days > 0 && (
              <button
                class="topbar-button"
                type="button"
                aria-label={streakLabel(days)}
                onClick={openProgress}
              >
                {days}d
              </button>
            )}
          </span>
        )}
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
        {flash !== null && (
          <span key={flash.key} class="xp-flash" aria-hidden="true">
            +{flash.gain}
          </span>
        )}
      </nav>
      <div class="level-line" aria-hidden="true">
        <span class="level-fill" style={{ width: `${xp === null ? 0 : levelProgress(xp) * 100}%` }} />
      </div>
    </header>
  );
}
