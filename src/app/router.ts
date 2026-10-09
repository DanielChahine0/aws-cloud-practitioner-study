/** Hash routes (spec 7.3); pure, so the tests run without a browser. */
export type Route =
  | { kind: 'home' }
  | { kind: 'module'; module: number }
  | { kind: 'lesson'; module: number; slug: string; anchor: string | null }
  | { kind: 'missions' }
  | { kind: 'mission'; id: string }
  | { kind: 'not-found'; hash: string };

const MODULE = '(0[1-9]|1[0-3])';
const SLUG = '([a-z0-9]+(?:-[a-z0-9]+)*)';
const MODULE_PATH = new RegExp(`^/m/${MODULE}$`);
const LESSON_PATH = new RegExp(`^/m/${MODULE}/l/${SLUG}(?:/([a-z0-9-]+))?$`);
const MISSION_PATH = /^\/missions\/(mission-\d{2})$/;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Reads `location.hash`; anything unknown becomes a not-found route that keeps the hash. */
export function parseHash(hash: string): Route {
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  if (path === '' || path === '/') return { kind: 'home' };
  if (path === '/missions') return { kind: 'missions' };
  const module = MODULE_PATH.exec(path);
  if (module) return { kind: 'module', module: Number(module[1]) };
  const lesson = LESSON_PATH.exec(path);
  if (lesson) {
    return { kind: 'lesson', module: Number(lesson[1]), slug: lesson[2] ?? '', anchor: lesson[3] ?? null };
  }
  const mission = MISSION_PATH.exec(path);
  if (mission) return { kind: 'mission', id: mission[1] ?? '' };
  return { kind: 'not-found', hash };
}

export function toHash(route: Route): string {
  switch (route.kind) {
    case 'home':
      return '#/';
    case 'module':
      return `#/m/${pad2(route.module)}`;
    case 'lesson':
      return `#/m/${pad2(route.module)}/l/${route.slug}${route.anchor === null ? '' : `/${route.anchor}`}`;
    case 'missions':
      return '#/missions';
    case 'mission':
      return `#/missions/${route.id}`;
    case 'not-found':
      return route.hash;
  }
}
