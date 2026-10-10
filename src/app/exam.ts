/** The exam shell's keys and its focus bar text (spec 7.2 and 7.4), pure so the tests run without a browser. */
import { type RunnerKeyInput, runnerKey } from './runner-keys.ts';

export type ExamCommand =
  | { kind: 'choose'; n: number }
  | { kind: 'prev' }
  | { kind: 'next' }
  | { kind: 'flag' }
  | { kind: 'grid' }
  | { kind: 'submit' };

export interface ExamKeyState {
  optionCount: number;
  /** True while the submit confirmation is open; its own buttons and Escape answer then. */
  confirmOpen: boolean;
  /** True while the question grid covers the question. */
  gridOpen: boolean;
}

/** One keydown in the exam shell; null means the key is not the exam's. */
export function examKey(input: RunnerKeyInput, state: ExamKeyState): ExamCommand | null {
  if (input.typing || input.alt || state.confirmOpen) return null;
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if (input.ctrl || input.meta) return key === 'Enter' ? { kind: 'submit' } : null;
  if (key === 'g') return { kind: 'grid' };
  if (state.gridOpen) return null;
  if (key === 'ArrowLeft') return { kind: 'prev' };
  if (key === 'ArrowRight') return { kind: 'next' };
  if (key === 'f') return { kind: 'flag' };
  // The digits read exactly as the runner reads them, for one question that is never answered yet.
  const command = runnerKey(input, {
    type: 'single',
    answered: false,
    optionCount: state.optionCount,
    leftCount: 0,
    reportOpen: false,
  });
  return command?.kind === 'choose' ? { kind: 'choose', n: command.n } : null;
}

/** Time left as `m:ss` with unpadded minutes, rounded up to the second; `0:00` once the time is up. */
export function formatClock(ms: number): string {
  if (ms <= 0) return '0:00';
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The gap between the focus bar's parts, as the spec 7.2 mockup writes it. */
export const BAR_GAP = '   ';

/** The focus bar's text: `Mock A   23/65   61:12   Flag (f)   Grid (g)`. */
export function examBarText(args: {
  label: string;
  position: number;
  total: number;
  leftMs: number;
}): string {
  return [
    args.label,
    `${args.position}/${args.total}`,
    formatClock(args.leftMs),
    'Flag (f)',
    'Grid (g)',
  ].join(BAR_GAP);
}
