/**
 * The exam clock's shared state, in the initial bundle for the App's ticker and the focus bar; the settle itself lives
 * in `exam-settle.ts`, which loads on demand.
 */
import { signal } from '@preact/signals';
import type { Progress, SessionState } from '../engine/replay.ts';

/** The wall clock in milliseconds, ticked every second by App while an exam is open; the focus bar reads it. */
export const examTick = signal(Date.now());

/** What the focus bar's Flag and Grid buttons do, set by the exam shell while it shows a question. */
export const examControls = signal<{
  flag: () => void;
  grid: () => void;
  flagged: boolean;
  gridOpen: boolean;
} | null>(null);

/** The open boss or mock, if any; only one may be open at a time. */
export function openExam(p: Progress): SessionState | null {
  let best: SessionState | null = null;
  for (const s of p.sessions.values()) {
    if ((s.mode !== 'boss' && s.mode !== 'mock') || s.submittedAt !== null || s.abandoned) continue;
    if (best === null || s.startedAt > best.startedAt) best = s;
  }
  return best;
}
