import { describe, expect, it } from 'vitest';
import type { ContentIndex } from '../../schemas/chunks.ts';
import {
  type ExamKeyState,
  examBarText,
  examHashOf,
  examKey,
  examLabel,
  formatClock,
} from '../../src/app/exam.ts';
import type { RunnerKeyInput } from '../../src/app/runner-keys.ts';
import { emptyIndexFields } from '../fixtures/index.ts';

const key = (k: string, more: Partial<RunnerKeyInput> = {}): RunnerKeyInput => ({
  key: k,
  meta: false,
  ctrl: false,
  alt: false,
  shift: false,
  typing: false,
  control: false,
  at: 0,
  ...more,
});
const state = (more: Partial<ExamKeyState> = {}): ExamKeyState => ({
  optionCount: 4,
  confirmOpen: false,
  gridOpen: false,
  ...more,
});

describe('examKey (spec 7.4)', () => {
  it.each([
    ['1', {}, { kind: 'choose', n: 1 }],
    ['4', {}, { kind: 'choose', n: 4 }],
    ['5', {}, null],
    ['6', { optionCount: 6 }, { kind: 'choose', n: 6 }],
    ['0', {}, null],
    ['ArrowLeft', {}, { kind: 'prev' }],
    ['ArrowRight', {}, { kind: 'next' }],
    ['f', {}, { kind: 'flag' }],
    ['F', {}, { kind: 'flag' }],
    ['g', {}, { kind: 'grid' }],
    ['G', {}, { kind: 'grid' }],
    ['Enter', {}, null],
    ['x', {}, null],
  ] as const)('reads %s', (k, more, command) => {
    expect(examKey(key(k), state(more))).toEqual(command);
  });

  it('submits on Ctrl+Enter or Cmd+Enter, and takes no other modified key', () => {
    expect(examKey(key('Enter', { ctrl: true }), state())).toEqual({ kind: 'submit' });
    expect(examKey(key('Enter', { meta: true }), state())).toEqual({ kind: 'submit' });
    expect(examKey(key('1', { ctrl: true }), state())).toBeNull();
    expect(examKey(key('f', { meta: true }), state())).toBeNull();
    expect(examKey(key('1', { alt: true }), state())).toBeNull();
    expect(examKey(key('Enter', { ctrl: true, alt: true }), state())).toBeNull();
  });

  it('is off while typing and while the confirmation is open', () => {
    expect(examKey(key('1', { typing: true }), state())).toBeNull();
    expect(examKey(key('Enter', { ctrl: true, typing: true }), state())).toBeNull();
    expect(examKey(key('1'), state({ confirmOpen: true }))).toBeNull();
    expect(examKey(key('Enter', { ctrl: true }), state({ confirmOpen: true }))).toBeNull();
  });

  it('keeps only g and submit while the grid is open', () => {
    expect(examKey(key('g'), state({ gridOpen: true }))).toEqual({ kind: 'grid' });
    expect(examKey(key('Enter', { ctrl: true }), state({ gridOpen: true }))).toEqual({ kind: 'submit' });
    expect(examKey(key('1'), state({ gridOpen: true }))).toBeNull();
    expect(examKey(key('f'), state({ gridOpen: true }))).toBeNull();
    expect(examKey(key('ArrowRight'), state({ gridOpen: true }))).toBeNull();
  });
});

describe('formatClock', () => {
  it('writes minutes unpadded and seconds padded, rounding up to the second', () => {
    expect(formatClock(3_672_000)).toBe('61:12');
    expect(formatClock(545_000)).toBe('9:05');
    expect(formatClock(5_400_000)).toBe('90:00');
    expect(formatClock(59_001)).toBe('1:00');
    expect(formatClock(1)).toBe('0:01');
  });

  it('shows 0:00 at zero and after the deadline', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-1)).toBe('0:00');
  });
});

describe('examBarText', () => {
  it('matches the focus bar of spec 7.2', () => {
    expect(examBarText({ label: 'Mock A', position: 23, total: 65, leftMs: 3_672_000 })).toBe(
      'Mock A   23/65   61:12   Flag (f)   Grid (g)',
    );
    expect(examBarText({ label: 'Boss: Module 5', position: 1, total: 15, leftMs: 1_260_000 })).toBe(
      'Boss: Module 5   1/15   21:00   Flag (f)   Grid (g)',
    );
  });
});

describe('examHashOf and examLabel', () => {
  const IDX: ContentIndex = {
    contentVersion: 'test',
    modules: [
      {
        n: 5,
        slug: 'pantry',
        title: 'Module 5: Pantry',
        short: 'Pantry',
        chunk: 'content/m05.json',
        lessons: [],
      },
    ],
    concepts: [],
    glossary: [],
    missions: [],
    questionVersions: {},
    search: 'content/search.json',
    ...emptyIndexFields(),
  };

  it('routes and names a boss, a mock and a remix', () => {
    const boss = { mode: 'boss', scope: 'm05', form: null } as const;
    const mock = { mode: 'mock', scope: '', form: 'B' } as const;
    const remix = { mode: 'mock', scope: '', form: 'remix' } as const;
    expect(examHashOf(boss)).toBe('#/s/boss/m05');
    expect(examHashOf(mock)).toBe('#/s/mock/b');
    expect(examHashOf(remix)).toBe('#/s/mock/remix');
    expect(examLabel(boss, IDX)).toBe('Boss: Pantry');
    expect(examLabel(mock, IDX)).toBe('Mock B');
    expect(examLabel(remix, IDX)).toBe('Remix mock');
  });
});
