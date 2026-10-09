import { describe, expect, it } from 'vitest';
import type { ModuleMeta } from '../../schemas/chunks.ts';
import { neighbors, up } from '../../src/app/nav.ts';

const lesson = (n: number, slug: string) => ({ n, slug, title: `Title of ${slug}`, concepts: [] });
const MODULES: ModuleMeta[] = [
  {
    n: 1,
    slug: 'one',
    title: 'Module 1: One',
    short: 'One',
    chunk: 'content/m01.aaaaaaaa.json',
    lessons: [lesson(1, 'a'), lesson(2, 'b')],
  },
  {
    n: 2,
    slug: 'two',
    title: 'Module 2: Two',
    short: 'Two',
    chunk: 'content/m02.bbbbbbbb.json',
    lessons: [lesson(1, 'c')],
  },
];

describe('neighbors', () => {
  it('walks every lesson in order and crosses module boundaries', () => {
    expect(neighbors(MODULES, 1, 'a')).toEqual({
      prev: null,
      next: { module: 1, slug: 'b', title: 'Title of b' },
    });
    expect(neighbors(MODULES, 1, 'b')).toEqual({
      prev: { module: 1, slug: 'a', title: 'Title of a' },
      next: { module: 2, slug: 'c', title: 'Title of c' },
    });
    expect(neighbors(MODULES, 2, 'c')).toEqual({
      prev: { module: 1, slug: 'b', title: 'Title of b' },
      next: null,
    });
  });

  it('has no neighbors for an unknown lesson', () => {
    expect(neighbors(MODULES, 2, 'a')).toEqual({ prev: null, next: null });
  });
});

describe('up', () => {
  it('goes one level up from every route', () => {
    expect(up({ kind: 'lesson', module: 3, slug: 'aws-lambda', anchor: 'x' })).toEqual({
      kind: 'module',
      module: 3,
    });
    expect(up({ kind: 'module', module: 3 })).toEqual({ kind: 'home' });
    expect(up({ kind: 'mission', id: 'mission-00' })).toEqual({ kind: 'missions' });
    expect(up({ kind: 'missions' })).toEqual({ kind: 'home' });
    expect(up({ kind: 'not-found', hash: '#/x' })).toEqual({ kind: 'home' });
    expect(up({ kind: 'home' })).toBeNull();
  });
});
