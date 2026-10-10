/** Hash routes (spec 7.3); pure, so the tests run without a browser. */
export type Route =
  | { kind: 'home' }
  | { kind: 'module'; module: number }
  | { kind: 'lesson'; module: number; slug: string; anchor: string | null }
  | { kind: 'missions' }
  | { kind: 'mission'; id: string }
  | { kind: 'check'; module: number; slug: string }
  | { kind: 'quiz'; module: number }
  | { kind: 'review' }
  | { kind: 'boss'; module: number }
  | { kind: 'mocks' }
  | { kind: 'mock'; form: MockRoute }
  | { kind: 'focus'; scope: string }
  | { kind: 'results'; sid: string }
  | { kind: 'not-found'; hash: string };

/** A mock's route segment: a form in lower case, or the remix. */
export type MockRoute = 'a' | 'b' | 'c' | 'd' | 'remix';

const MODULE = '(0[1-9]|1[0-3])';
const SLUG = '([a-z0-9]+(?:-[a-z0-9]+)*)';
const MODULE_PATH = new RegExp(`^/m/${MODULE}$`);
const LESSON_PATH = new RegExp(`^/m/${MODULE}/l/${SLUG}(?:/([a-z0-9-]+))?$`);
const MISSION_PATH = /^\/missions\/(mission-\d{2})$/;
const CHECK_PATH = new RegExp(`^/s/check/m${MODULE}/${SLUG}$`);
const QUIZ_PATH = new RegExp(`^/s/quiz/m${MODULE}$`);
const BOSS_PATH = new RegExp(`^/s/boss/m${MODULE}$`);
const MOCK_PATH = /^\/s\/mock\/(a|b|c|d|remix)$/;
/** A blueprint task (1.1 to 4.3) or a module (`m01` to `m13`). */
const FOCUS_PATH = new RegExp(`^/s/focus/(1\\.[1-4]|2\\.[1-4]|3\\.[1-8]|4\\.[1-3]|m${MODULE})$`);
const RESULTS_PATH = /^\/r\/([0-9A-HJKMNP-TV-Z]{26})$/;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Reads `location.hash`; anything unknown becomes a not-found route that keeps the hash. */
export function parseHash(hash: string): Route {
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  if (path === '' || path === '/') return { kind: 'home' };
  if (path === '/missions') return { kind: 'missions' };
  if (path === '/s/review') return { kind: 'review' };
  if (path === '/s/mock') return { kind: 'mocks' };
  const module = MODULE_PATH.exec(path);
  if (module) return { kind: 'module', module: Number(module[1]) };
  const lesson = LESSON_PATH.exec(path);
  if (lesson) {
    return { kind: 'lesson', module: Number(lesson[1]), slug: lesson[2] ?? '', anchor: lesson[3] ?? null };
  }
  const mission = MISSION_PATH.exec(path);
  if (mission) return { kind: 'mission', id: mission[1] ?? '' };
  const check = CHECK_PATH.exec(path);
  if (check) return { kind: 'check', module: Number(check[1]), slug: check[2] ?? '' };
  const quiz = QUIZ_PATH.exec(path);
  if (quiz) return { kind: 'quiz', module: Number(quiz[1]) };
  const boss = BOSS_PATH.exec(path);
  if (boss) return { kind: 'boss', module: Number(boss[1]) };
  const mock = MOCK_PATH.exec(path);
  if (mock) return { kind: 'mock', form: (mock[1] ?? 'a') as MockRoute };
  const focus = FOCUS_PATH.exec(path);
  if (focus) return { kind: 'focus', scope: focus[1] ?? '' };
  const results = RESULTS_PATH.exec(path);
  if (results) return { kind: 'results', sid: results[1] ?? '' };
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
    case 'check':
      return `#/s/check/m${pad2(route.module)}/${route.slug}`;
    case 'quiz':
      return `#/s/quiz/m${pad2(route.module)}`;
    case 'review':
      return '#/s/review';
    case 'boss':
      return `#/s/boss/m${pad2(route.module)}`;
    case 'mocks':
      return '#/s/mock';
    case 'mock':
      return `#/s/mock/${route.form}`;
    case 'focus':
      return `#/s/focus/${route.scope}`;
    case 'results':
      return `#/r/${route.sid}`;
    case 'not-found':
      return route.hash;
  }
}
