import { describe, expect, it } from 'vitest';
import { type RunnerKeyInput, type RunnerKeyState, runnerKey } from '../../src/app/runner-keys.ts';

const key = (k: string, more: Partial<RunnerKeyInput> = {}): RunnerKeyInput => ({
  key: k,
  meta: false,
  ctrl: false,
  alt: false,
  shift: false,
  typing: false,
  at: 0,
  ...more,
});
const state = (more: Partial<RunnerKeyState> = {}): RunnerKeyState => ({
  type: 'single',
  answered: false,
  optionCount: 4,
  leftCount: 0,
  reportOpen: false,
  ...more,
});
const MATCH = state({ type: 'match', optionCount: 0, leftCount: 3 });

describe('runnerKey', () => {
  it('chooses options with digits up to the option count, before feedback only', () => {
    expect(runnerKey(key('1'), state())).toEqual({ kind: 'choose', n: 1 });
    expect(runnerKey(key('4'), state())).toEqual({ kind: 'choose', n: 4 });
    expect(runnerKey(key('5'), state())).toBeNull();
    expect(runnerKey(key('6'), state({ type: 'multi', optionCount: 6 }))).toEqual({ kind: 'choose', n: 6 });
    expect(runnerKey(key('1'), state({ answered: true }))).toBeNull();
  });

  it('is Check on Enter before feedback and Next after it, and Sure on Shift+Enter', () => {
    expect(runnerKey(key('Enter'), state())).toEqual({ kind: 'check' });
    expect(runnerKey(key('Enter', { shift: true }), state())).toEqual({ kind: 'sure' });
    expect(runnerKey(key('Enter'), state({ answered: true }))).toEqual({ kind: 'next' });
    expect(runnerKey(key('Enter', { shift: true }), state({ answered: true }))).toBeNull();
  });

  it('expands whys with e and reads the notes with o, after feedback only', () => {
    expect(runnerKey(key('e'), state())).toBeNull();
    expect(runnerKey(key('o'), state())).toBeNull();
    expect(runnerKey(key('E'), state({ answered: true }))).toEqual({ kind: 'expand' });
    expect(runnerKey(key('o'), state({ answered: true }))).toEqual({ kind: 'read' });
  });

  it('opens the report with ! before and after feedback', () => {
    expect(runnerKey(key('!', { shift: true }), state())).toEqual({ kind: 'report' });
    expect(runnerKey(key('!', { shift: true }), state({ answered: true }))).toEqual({ kind: 'report' });
  });

  it('picks lefts with digits, pairs with letters and unpairs with Backspace in a match', () => {
    expect(runnerKey(key('2'), MATCH)).toEqual({ kind: 'pick-left', n: 2 });
    expect(runnerKey(key('4'), MATCH)).toBeNull();
    expect(runnerKey(key('a'), MATCH)).toEqual({ kind: 'pair', letter: 'a' });
    expect(runnerKey(key('C'), MATCH)).toEqual({ kind: 'pair', letter: 'c' });
    expect(runnerKey(key('d'), MATCH)).toBeNull();
    expect(runnerKey(key('Backspace'), MATCH)).toEqual({ kind: 'unpair' });
    expect(runnerKey(key('e'), { ...MATCH, leftCount: 5 })).toEqual({ kind: 'pair', letter: 'e' });
    expect(runnerKey(key('e'), { ...MATCH, leftCount: 5, answered: true })).toEqual({ kind: 'expand' });
  });

  it('uses letters only in a match', () => {
    expect(runnerKey(key('a'), state())).toBeNull();
    expect(runnerKey(key('Backspace'), state())).toBeNull();
    expect(runnerKey(key('a'), state({ type: 'multi', optionCount: 5 }))).toBeNull();
  });

  it('does nothing while typing, with the report open, or with a modifier', () => {
    expect(runnerKey(key('1', { typing: true }), state())).toBeNull();
    expect(runnerKey(key('Enter'), state({ reportOpen: true }))).toBeNull();
    expect(runnerKey(key('1', { meta: true }), state())).toBeNull();
    expect(runnerKey(key('Enter', { ctrl: true }), state())).toBeNull();
  });
});
