import { describe, expect, it } from 'vitest';
import type { ModuleMeta } from '../../schemas/chunks.ts';
import { type KeyCommand, type KeyContext, type KeyInput, keyCommand, keyStep } from '../../src/app/keys.ts';

const lesson = (n: number, slug: string) => ({ n, slug, title: slug, concepts: [] });
const MODULES: ModuleMeta[] = [
  {
    n: 1,
    slug: 'one',
    title: 'Module 1: One',
    short: 'One',
    chunk: 'content/m01.json',
    lessons: [lesson(1, 'a')],
  },
  {
    n: 2,
    slug: 'two',
    title: 'Module 2: Two',
    short: 'Two',
    chunk: 'content/m02.json',
    lessons: [lesson(1, 'b')],
  },
];
const LESSON_A: KeyContext['route'] = { kind: 'lesson', module: 1, slug: 'a', anchor: null };

const key = (k: string, more: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  meta: false,
  ctrl: false,
  alt: false,
  typing: false,
  at: 10_000,
  ...more,
});
const ctx = (more: Partial<KeyContext> = {}): KeyContext => ({
  route: { kind: 'home' },
  modules: MODULES,
  overlayOpen: false,
  termOpen: false,
  gAt: null,
  ...more,
});

describe('keyCommand', () => {
  it('opens the palette with / or Cmd/Ctrl+K, and help with ?', () => {
    expect(keyCommand(key('/'), ctx())).toEqual({ kind: 'palette' });
    expect(keyCommand(key('k', { meta: true }), ctx())).toEqual({ kind: 'palette' });
    expect(keyCommand(key('K', { ctrl: true }), ctx({ overlayOpen: true }))).toEqual({ kind: 'palette' });
    expect(keyCommand(key('?'), ctx())).toEqual({ kind: 'help' });
  });

  it('leaves keys alone while a dialog is open, while typing, and with other modifiers', () => {
    expect(keyCommand(key('/'), ctx({ overlayOpen: true }))).toBeNull();
    expect(keyCommand(key('Escape'), ctx({ overlayOpen: true, termOpen: true }))).toBeNull();
    expect(keyCommand(key('/', { typing: true }), ctx())).toBeNull();
    expect(keyCommand(key(']', { alt: true }), ctx({ route: LESSON_A }))).toBeNull();
  });

  it('goes Home with g then h within a second, in either case', () => {
    expect(keyCommand(key('G'), ctx())).toEqual({ kind: 'g', at: 10_000 });
    expect(keyCommand(key('h'), ctx({ gAt: 9_200 }))).toEqual({ kind: 'navigate', hash: '#/' });
    expect(keyCommand(key('H'), ctx({ gAt: 8_900 }))).toBeNull();
    expect(keyCommand(key('h'), ctx())).toBeNull();
  });

  it('goes Home with g then Shift+H, whose Shift sends a keydown of its own first', () => {
    // The keydowns a browser sends, fed through keyStep the way keyboard.ts carries the pending g.
    const press = (...inputs: KeyInput[]): (KeyCommand | null)[] => {
      let gAt: number | null = null;
      return inputs.map((input) => {
        const step = keyStep(input, ctx({ gAt }));
        gAt = step.gAt;
        return step.command;
      });
    };
    expect(press(key('g', { at: 10_000 }), key('Shift', { at: 10_200 }), key('H', { at: 10_300 }))).toEqual([
      { kind: 'g', at: 10_000 },
      null,
      { kind: 'navigate', hash: '#/' },
    ]);
    expect(press(key('g', { at: 10_000 }), key('x', { at: 10_100 }), key('h', { at: 10_200 }))).toEqual([
      { kind: 'g', at: 10_000 },
      null,
      null,
    ]);
  });

  it('closes an open term popover before Escape goes up a level', () => {
    expect(keyCommand(key('Escape'), ctx({ route: LESSON_A, termOpen: true }))).toEqual({
      kind: 'close-term',
    });
    expect(keyCommand(key('Escape'), ctx({ route: LESSON_A }))).toEqual({ kind: 'navigate', hash: '#/m/01' });
    expect(keyCommand(key('Escape'), ctx())).toBeNull();
  });

  it('moves between lessons with [ and ], across modules, only on a lesson', () => {
    expect(keyCommand(key(']'), ctx({ route: LESSON_A }))).toEqual({ kind: 'navigate', hash: '#/m/02/l/b' });
    expect(keyCommand(key('['), ctx({ route: LESSON_A }))).toBeNull();
    expect(keyCommand(key(']'), ctx({ route: { kind: 'module', module: 1 } }))).toBeNull();
  });

  it('opens Progress with g then p, in either case', () => {
    expect(keyCommand(key('p'), ctx({ gAt: 9_500 }))).toEqual({ kind: 'progress' });
    expect(keyCommand(key('P'), ctx({ gAt: 9_500 }))).toEqual({ kind: 'progress' });
    expect(keyCommand(key('p'), ctx({ gAt: 8_000 }))).toBeNull();
    expect(keyCommand(key('p'), ctx())).toBeNull();
  });

  it('jumps from a lesson to its check with c, only on a lesson', () => {
    expect(keyCommand(key('c'), ctx({ route: LESSON_A }))).toEqual({
      kind: 'navigate',
      hash: '#/s/check/m01/a',
    });
    expect(keyCommand(key('C'), ctx({ route: LESSON_A }))).toEqual({
      kind: 'navigate',
      hash: '#/s/check/m01/a',
    });
    expect(keyCommand(key('c'), ctx({ route: { kind: 'module', module: 1 } }))).toBeNull();
    expect(keyCommand(key('c', { typing: true }), ctx({ route: LESSON_A }))).toBeNull();
  });
});
