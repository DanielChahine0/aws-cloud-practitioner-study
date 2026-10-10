/** The lab's keys (spec 7.4), pure so the tests run without a browser. */
import type { LabEngineId } from '../../schemas/ids.ts';
import type { RunnerKeyInput } from './runner-keys.ts';

export type LabCommand =
  | { kind: 'check' }
  | { kind: 'hint' }
  | { kind: 'reset' }
  | { kind: 'place'; bucket: number }
  | { kind: 'unplace' }
  | { kind: 'move'; delta: 1 | -1 }
  | { kind: 'drop' };

export interface LabKeyState {
  engine: LabEngineId;
  /** True while a Sort card or a Place piece is held. */
  holding: boolean;
  bucketCount: number;
  /** True when focus is on a `[data-lab-item]` of a region, where the arrow keys step through that region. */
  inItems: boolean;
  /** True when focus is on a button, link or summary that answers Enter itself, other than a card, a piece or a target. */
  onControl: boolean;
  /** True when a `g` is still open, so `h` and `r` belong to the `g h` and `g r` sequences. */
  gPending: boolean;
  /** True while the inline reset panel asks. */
  confirmOpen: boolean;
  /** True once the lab is complete and its debrief shows; the Runner keys take over. */
  done: boolean;
}

const MOVES: Readonly<Record<string, 1 | -1>> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/**
 * The command for one keydown on a lab, or null when the key is not the lab's.
 * `select` on the input marks a focused select or number field, where only Enter is the lab's.
 */
export function labKey(input: RunnerKeyInput, state: LabKeyState): LabCommand | null {
  if (input.meta || input.ctrl || input.alt || state.confirmOpen || state.done) return null;
  if (input.typing) return input.select === true && input.key === 'Enter' ? { kind: 'check' } : null;
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if (key === 'Enter') return state.onControl ? null : { kind: 'check' };
  if (key === 'h' || key === 'r') {
    if (state.gPending) return null;
    return key === 'h' ? { kind: 'hint' } : { kind: 'reset' };
  }
  if (state.engine !== 'sort' && state.engine !== 'place') return null;
  if (/^[0-9]$/.test(key)) {
    const bucket = key === '0' ? 10 : Number(key);
    return state.holding && bucket <= state.bucketCount ? { kind: 'place', bucket } : null;
  }
  if (key === 'Backspace') return state.holding ? { kind: 'unplace' } : null;
  if (key === 'Escape') return state.holding ? { kind: 'drop' } : null;
  const delta = MOVES[key];
  return delta !== undefined && state.inItems ? { kind: 'move', delta } : null;
}
