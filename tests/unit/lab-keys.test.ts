import { describe, expect, it } from 'vitest';
import { type LabKeyState, labKey } from '../../src/app/lab-keys.ts';
import type { RunnerKeyInput } from '../../src/app/runner-keys.ts';

const key = (k: string, more: Partial<RunnerKeyInput> = {}): RunnerKeyInput => ({
  key: k,
  meta: false,
  ctrl: false,
  alt: false,
  shift: false,
  typing: false,
  control: false,
  at: 10_000,
  ...more,
});
const state = (more: Partial<LabKeyState> = {}): LabKeyState => ({
  engine: 'sort',
  holding: false,
  bucketCount: 3,
  inItems: false,
  onControl: false,
  gPending: false,
  confirmOpen: false,
  done: false,
  ...more,
});

describe('labKey', () => {
  it('checks the goals with Enter, but leaves Enter to a focused button, link or summary', () => {
    expect(labKey(key('Enter'), state())).toEqual({ kind: 'check' });
    expect(labKey(key('Enter'), state({ onControl: true }))).toBeNull();
    expect(labKey(key('Enter', { control: true }), state({ inItems: true }))).toEqual({ kind: 'check' });
  });

  it('shows a hint with h and asks to reset with r, in either case', () => {
    expect(labKey(key('h'), state())).toEqual({ kind: 'hint' });
    expect(labKey(key('H', { shift: true }), state())).toEqual({ kind: 'hint' });
    expect(labKey(key('r'), state())).toEqual({ kind: 'reset' });
    expect(labKey(key('R', { shift: true }), state({ engine: 'simulate' }))).toEqual({ kind: 'reset' });
  });

  it('leaves h and r to the g h and g r sequences while a g is pending', () => {
    expect(labKey(key('h'), state({ gPending: true }))).toBeNull();
    expect(labKey(key('r'), state({ gPending: true }))).toBeNull();
  });

  it('places a held card with a digit, 0 being the tenth bucket, only in a bucket that exists', () => {
    expect(labKey(key('1'), state({ holding: true }))).toEqual({ kind: 'place', bucket: 1 });
    expect(labKey(key('3'), state({ holding: true }))).toEqual({ kind: 'place', bucket: 3 });
    expect(labKey(key('4'), state({ holding: true }))).toBeNull();
    expect(labKey(key('0'), state({ holding: true, bucketCount: 10 }))).toEqual({
      kind: 'place',
      bucket: 10,
    });
    expect(labKey(key('0'), state({ holding: true, bucketCount: 9 }))).toBeNull();
    expect(labKey(key('1'), state())).toBeNull();
  });

  it('sends a held card back with Backspace and puts it down with Escape', () => {
    expect(labKey(key('Backspace'), state({ holding: true }))).toEqual({ kind: 'unplace' });
    expect(labKey(key('Escape'), state({ holding: true }))).toEqual({ kind: 'drop' });
    expect(labKey(key('Backspace'), state())).toBeNull();
    expect(labKey(key('Escape'), state())).toBeNull();
  });

  it('moves within a region with the arrow keys only from one of its items', () => {
    expect(labKey(key('ArrowDown'), state({ inItems: true }))).toEqual({ kind: 'move', delta: 1 });
    expect(labKey(key('ArrowRight'), state({ inItems: true }))).toEqual({ kind: 'move', delta: 1 });
    expect(labKey(key('ArrowUp'), state({ inItems: true }))).toEqual({ kind: 'move', delta: -1 });
    expect(labKey(key('ArrowLeft'), state({ inItems: true }))).toEqual({ kind: 'move', delta: -1 });
    expect(labKey(key('ArrowDown'), state())).toBeNull();
  });

  it('places a held piece in a Place lab with the same keys as a Sort lab', () => {
    const place = (more: Partial<LabKeyState> = {}) => state({ engine: 'place', bucketCount: 6, ...more });
    expect(labKey(key('6'), place({ holding: true }))).toEqual({ kind: 'place', bucket: 6 });
    expect(labKey(key('7'), place({ holding: true }))).toBeNull();
    expect(labKey(key('0'), place({ holding: true, bucketCount: 10 }))).toEqual({
      kind: 'place',
      bucket: 10,
    });
    expect(labKey(key('Backspace'), place({ holding: true }))).toEqual({ kind: 'unplace' });
    expect(labKey(key('Escape'), place({ holding: true }))).toEqual({ kind: 'drop' });
    expect(labKey(key('ArrowDown'), place({ inItems: true }))).toEqual({ kind: 'move', delta: 1 });
  });

  it('never takes Space, so the native click picks up or places', () => {
    for (const engine of ['sort', 'place'] as const) {
      expect(labKey(key(' '), state({ engine }))).toBeNull();
      expect(labKey(key(' '), state({ engine, holding: true, inItems: true }))).toBeNull();
    }
  });

  it('checks with Enter from a slot while a piece is held', () => {
    expect(labKey(key('Enter'), state({ engine: 'place', holding: true, inItems: true }))).toEqual({
      kind: 'check',
    });
  });

  it('keeps the pick-up keys to Sort and Place labs', () => {
    for (const engine of ['configure', 'simulate', 'trace', 'investigate'] as const) {
      expect(labKey(key('1'), state({ engine, holding: true }))).toBeNull();
      expect(labKey(key('Backspace'), state({ engine, holding: true }))).toBeNull();
      expect(labKey(key('ArrowDown'), state({ engine, inItems: true }))).toBeNull();
      expect(labKey(key('Enter'), state({ engine }))).toEqual({ kind: 'check' });
    }
  });

  it('takes only Enter from a focused select or number field, and nothing from a text field', () => {
    expect(labKey(key('Enter', { typing: true, select: true }), state({ engine: 'configure' }))).toEqual({
      kind: 'check',
    });
    expect(labKey(key('h', { typing: true, select: true }), state())).toBeNull();
    expect(labKey(key('1', { typing: true, select: true }), state({ holding: true }))).toBeNull();
    expect(labKey(key('Enter', { typing: true }), state())).toBeNull();
    expect(labKey(key('r', { typing: true }), state())).toBeNull();
  });

  it('does nothing with a modifier, while the reset panel asks, or once the lab is done', () => {
    expect(labKey(key('h', { meta: true }), state())).toBeNull();
    expect(labKey(key('Enter', { ctrl: true }), state())).toBeNull();
    expect(labKey(key('1', { alt: true }), state({ holding: true }))).toBeNull();
    expect(labKey(key('Enter'), state({ confirmOpen: true }))).toBeNull();
    expect(labKey(key('r'), state({ confirmOpen: true }))).toBeNull();
    expect(labKey(key('Enter'), state({ done: true }))).toBeNull();
    expect(labKey(key('h'), state({ done: true }))).toBeNull();
  });
});
