/** The exam shell's keys and its focus bar text (spec 7.2 and 7.4), pure so the tests run without a browser. */
import type { ContentIndex, QuestionView } from '../../schemas/chunks.ts';
import type { SessionState } from '../engine/replay.ts';
import { type MockRoute, toHash } from './router.ts';
import { type RunnerKeyInput, runnerKey } from './runner-keys.ts';

/** The `form` a remix mock's session events carry; forms A to D are upper case (spec 4.3). */
export const REMIX_FORM = 'remix';

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

/** The route of an exam session: `#/s/boss/m05`, `#/s/mock/a` or `#/s/mock/remix`. */
export function examHashOf(session: Pick<SessionState, 'mode' | 'scope' | 'form'>): string {
  if (session.mode === 'boss') return toHash({ kind: 'boss', module: Number(session.scope.slice(1)) });
  const form = session.form === null || session.form === REMIX_FORM ? 'remix' : session.form.toLowerCase();
  return toHash({ kind: 'mock', form: form as MockRoute });
}

/** The name of an exam session: `Boss: <short>`, `Mock A` or `Remix mock`. */
export function examLabel(session: Pick<SessionState, 'mode' | 'scope' | 'form'>, idx: ContentIndex): string {
  if (session.mode === 'boss') {
    const module = Number(session.scope.slice(1));
    return `Boss: ${idx.modules.find((m) => m.n === module)?.short ?? `Module ${module}`}`;
  }
  return session.form === null || session.form === REMIX_FORM ? 'Remix mock' : `Mock ${session.form}`;
}

/**
 * The picks after choosing option `id`: a single-answer item swaps its pick, a multi-response item toggles it,
 * and null refuses a new pick on an item that already holds its `select` picks.
 */
export function examPick(
  q: Pick<QuestionView, 'type' | 'select'>,
  chosen: readonly string[],
  id: string,
): string[] | null {
  if (q.type === 'single') return [id];
  if (chosen.includes(id)) return chosen.filter((x) => x !== id);
  if (chosen.length >= (q.select ?? 0)) return null;
  return [...chosen, id];
}

/**
 * False for an option `examPick` would refuse; the screen disables its checkbox, because a refused click
 * changes no state, so Preact never re-renders and the native checkbox would stay checked.
 */
export function examPickable(
  q: Pick<QuestionView, 'type' | 'select'>,
  chosen: readonly string[],
  id: string,
): boolean {
  return examPick(q, chosen, id) !== null;
}
