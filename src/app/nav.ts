import type { ModuleMeta } from '../../schemas/chunks.ts';
import type { Route } from './router.ts';

export interface LessonLink {
  module: number;
  slug: string;
  title: string;
}

/** The lessons before and after this one in course order, across module boundaries. */
export function neighbors(
  modules: readonly ModuleMeta[],
  module: number,
  slug: string,
): { prev: LessonLink | null; next: LessonLink | null } {
  const all = modules.flatMap((m) => m.lessons.map((l) => ({ module: m.n, slug: l.slug, title: l.title })));
  const i = all.findIndex((l) => l.module === module && l.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return { prev: all[i - 1] ?? null, next: all[i + 1] ?? null };
}

/** Where Escape goes: one level up, or null at Home. */
export function up(route: Route): Route | null {
  switch (route.kind) {
    case 'lesson':
      return { kind: 'module', module: route.module };
    case 'module':
    case 'missions':
    case 'not-found':
      return { kind: 'home' };
    case 'mission':
      return { kind: 'missions' };
    case 'check':
      return { kind: 'lesson', module: route.module, slug: route.slug, anchor: null };
    case 'quiz':
      return { kind: 'module', module: route.module };
    case 'home':
      return null;
  }
}
