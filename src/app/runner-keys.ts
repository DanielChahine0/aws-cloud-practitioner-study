/** The runner's keys (spec 7.4), pure so the tests run without a browser. */
import type { KeyInput } from './keys.ts';

export type RunnerCommand =
  | { kind: 'choose'; n: number }
  | { kind: 'pick-left'; n: number }
  | { kind: 'pair'; letter: string }
  | { kind: 'unpair' }
  | { kind: 'check' }
  | { kind: 'sure' }
  | { kind: 'next' }
  | { kind: 'expand' }
  | { kind: 'read' }
  | { kind: 'report' };

export type RunnerKeyInput = KeyInput & { shift: boolean };

export interface RunnerKeyState {
  type: 'single' | 'multi' | 'match';
  /** True while the verdict shows. */
  answered: boolean;
  optionCount: number;
  leftCount: number;
  reportOpen: boolean;
}

const LETTERS = 'abcde';

export function runnerKey(input: RunnerKeyInput, state: RunnerKeyState): RunnerCommand | null {
  if (input.meta || input.ctrl || input.alt || input.typing || state.reportOpen) return null;
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if (key === 'Enter') {
    if (state.answered) return input.shift ? null : { kind: 'next' };
    return input.shift ? { kind: 'sure' } : { kind: 'check' };
  }
  if (key === '!') return { kind: 'report' };
  if (state.answered) {
    if (key === 'e') return { kind: 'expand' };
    if (key === 'o') return { kind: 'read' };
    return null;
  }
  const digit = /^[1-6]$/.test(key) ? Number(key) : null;
  if (state.type === 'match') {
    if (digit !== null) return digit <= Math.min(state.leftCount, 5) ? { kind: 'pick-left', n: digit } : null;
    const letter = LETTERS.indexOf(key);
    if (key.length === 1 && letter !== -1)
      return letter < state.leftCount ? { kind: 'pair', letter: key } : null;
    if (key === 'Backspace') return { kind: 'unpair' };
    return null;
  }
  if (digit !== null && digit <= state.optionCount) return { kind: 'choose', n: digit };
  return null;
}
