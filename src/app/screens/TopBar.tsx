import { useEffect, useRef, useState } from 'preact/hooks';
import { levelProgress } from '../../engine/level.ts';
import { BAR_GAP, formatClock } from '../exam.ts';
import { examControls, examTick } from '../exam-clock.ts';
import { memory, queue, rank, ranks, streak } from '../memory.ts';
import { liveChip } from '../missions.ts';
import { storeReady } from '../progress.ts';
import { toHash } from '../router.ts';
import { exam, examPosition, navigate, overlay } from '../state.ts';
import { dueLabel, FLASH_MS, RANK_ACTION, streakLabel, xpGain } from '../topbar.ts';

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
  const open = exam.value;
  return open === null ? <SiteBar /> : <FocusBar info={open} />;
}

/**
 * The focus bar of a boss or mock (spec 7.2): `Mock A   23/65   61:12   Flag (f)   Grid (g)`, and nothing else, so
 * XP, the rank, due counts and the streak stay out of sight. Its text equals `examBarText`; the gaps are text nodes
 * that the flex layout does not render, so the bar spaces its parts with `gap` instead.
 * On a phone the key hints are visually hidden, so the bar fits 360 px; they stay in each button's name and text.
 */
function FocusBar({ info }: { info: NonNullable<typeof exam.value> }) {
  const controls = examControls.value;
  return (
    <header class="topbar focus">
      <div class="topbar-inner focus-bar">
        <span class="exam-label">{info.label}</span>
        {BAR_GAP}
        <span class="exam-pos">
          {examPosition.value}/{info.total}
        </span>
        {BAR_GAP}
        <span class="exam-clock" role="timer" aria-live="off">
          {formatClock(Date.parse(info.deadline) - examTick.value)}
        </span>
        {BAR_GAP}
        <button
          class="topbar-button"
          type="button"
          aria-pressed={controls?.flagged ?? false}
          onClick={() => controls?.flag()}
        >
          Flag<span class="key-hint"> (f)</span>
        </button>
        {BAR_GAP}
        <button
          class="topbar-button"
          type="button"
          aria-expanded={controls?.gridOpen ?? false}
          onClick={() => controls?.grid()}
        >
          Grid<span class="key-hint"> (g)</span>
        </button>
      </div>
    </header>
  );
}

/** The site bar: links, the due count, the streak, Progress and Search, over the level line. */
function SiteBar() {
  const ready = storeReady.value;
  const due = ready ? (queue.value?.items.length ?? 0) : 0;
  const days = ready ? (streak.value?.current ?? 0) : 0;
  const shown = ready && ranks.value.length > 0 ? rank.value : null;
  const xp = ready ? (memory.value?.xp ?? null) : null;
  const flash = useXpFlash(xp);
  const chip = liveChip.value;
  return (
    <header class="topbar">
      <nav class="topbar-inner" aria-label="Site">
        <a class="brand" href="#/">
          CCP
        </a>
        {chip === null ? (
          <a class="topbar-missions" href="#/missions">
            Missions
          </a>
        ) : (
          <a class="topbar-live" href={chip.href} aria-label={chip.aria}>
            <span class="live-pill">{chip.label}</span>
          </a>
        )}
        {(due > 0 || days > 0 || shown !== null) && (
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
            {(due > 0 || days > 0) && shown !== null && (
              <span class="topbar-sep" aria-hidden="true">
                ·
              </span>
            )}
            {shown !== null && (
              <button class="topbar-button topbar-rank" type="button" onClick={openProgress}>
                <span class="rank-name">{shown.name}</span>
                <span class="rank-short">{shown.short}</span>
                <span class="visually-hidden">{RANK_ACTION}</span>
              </button>
            )}
          </span>
        )}
        <button class="topbar-button topbar-progress" type="button" onClick={openProgress}>
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
