import { bossPassMark } from './memory.ts';
import { examsOf, openSession, type Progress, type SessionState } from './replay.ts';
import { mulberry32, shuffle } from './rng.ts';
import { type PoolQuestion, pickVariant } from './select.ts';

/**
 * Module bosses (spec 4.2): 15 questions in 21 minutes, 12 from the module with at least one per lesson and
 * 3 from studied concepts of earlier modules (all 15 from Module 1 for its boss), single and multi only.
 * Concepts are drawn by seeded weighted sampling toward low recall, so a fresh seed gives a fresh draw.
 */
export const BOSS_SIZE = 15;
export const BOSS_FROM_MODULE = 12;
export const BOSS_FROM_EARLIER = 3;
export const BOSS_MINUTES = 21;
export const BOSS_COOLDOWN_MS = 20 * 3_600_000;
/** The module mastery at which a boss becomes ready (spec 4.6). */
export const BOSS_READY_MASTERY = 60;

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The session scope of a module's boss, `m03`. */
export function bossScope(module: number): string {
  return `m${String(module).padStart(2, '0')}`;
}

/** The deadline of a boss started at `start`: 21 minutes later, as an ISO string. */
export function bossDeadline(start: Date): string {
  return new Date(start.getTime() + BOSS_MINUTES * 60_000).toISOString();
}

/** The question ids of a boss, `min(15, eligible)` of them, shuffled by the seed. */
export function bossDraw(args: {
  module: number;
  pool: readonly PoolQuestion[];
  lessons: readonly string[];
  progress: Progress;
  recall: (concept: string) => number;
  studied: (concept: string) => boolean;
  now: Date;
  seed: number;
}): string[] {
  const { module, pool, lessons, progress, recall, studied, seed } = args;
  const random = mulberry32(seed);
  const eligible = pool.filter((q) => (q.type === 'single' || q.type === 'multi') && q.module <= module);
  const own = eligible.filter((q) => q.module === module);
  const earlier = eligible.filter((q) => q.module < module);

  const keys = new Map<string, number>();
  for (const concept of [...new Set(own.map((q) => q.concept))].sort(byText)) {
    const r = Math.min(1, Math.max(0, recall(concept)));
    keys.set(concept, random() ** (1 / (1.5 - r)));
  }
  const byKey = [...keys.keys()].sort((a, b) => (keys.get(b) ?? 0) - (keys.get(a) ?? 0) || byText(a, b));
  const rank = new Map(byKey.map((c, i) => [c, i]));

  const out: string[] = [];
  const used = new Set<string>();
  const counts = new Map<string, number>();
  const take = (candidates: readonly PoolQuestion[]): boolean => {
    const free = candidates.filter((q) => !used.has(q.id));
    if (free.length === 0) return false;
    const pick = pickVariant(free, progress, random);
    used.add(pick.id);
    counts.set(pick.concept, (counts.get(pick.concept) ?? 0) + 1);
    out.push(pick.id);
    return true;
  };
  const ownOf = (concept: string) => own.filter((q) => q.concept === concept);

  const fromModule = module === 1 ? BOSS_SIZE : BOSS_FROM_MODULE;
  const perLesson: string[] = [];
  for (const lesson of lessons) {
    const top = byKey.find(
      (c) => !perLesson.includes(c) && own.some((q) => q.note === lesson && q.concept === c),
    );
    if (top !== undefined) perLesson.push(top);
  }
  perLesson.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
  for (const concept of perLesson.slice(0, fromModule)) take(ownOf(concept));

  /** Fills from the module up to `limit`: new concepts by key first, then second variants by key, and so on. */
  const fillModule = (limit: number) => {
    for (let pass = 0; out.length < limit; pass++) {
      let grew = false;
      for (const concept of byKey) {
        if (out.length >= limit) return;
        if ((counts.get(concept) ?? 0) === pass && take(ownOf(concept))) grew = true;
      }
      if (!grew && pass >= Math.max(0, ...counts.values())) return;
    }
  };
  fillModule(fromModule);

  if (module > 1) {
    const ties = new Map(
      shuffle([...new Set(earlier.map((q) => q.concept))].sort(byText), random).map((c, i) => [c, i]),
    );
    const lowest = [...ties.keys()]
      .filter(studied)
      .sort((a, b) => recall(a) - recall(b) || (ties.get(a) ?? 0) - (ties.get(b) ?? 0));
    let fromEarlier = 0;
    for (const concept of lowest) {
      if (fromEarlier >= BOSS_FROM_EARLIER || out.length >= BOSS_SIZE) break;
      if (take(earlier.filter((q) => q.concept === concept))) fromEarlier++;
    }
  }
  fillModule(BOSS_SIZE);
  return shuffle(out, random);
}

export interface BossStatus {
  /** Every lesson of the module is read (spec 4.2). */
  unlocked: boolean;
  passed: boolean;
  passedAt: string | null;
  /** Unlocked, mastery at 60 or more, and not passed: the boss-ready dot (spec 4.6). */
  ready: boolean;
  /** The end of the 20 h cooldown after the latest submitted boss, while it runs. */
  cooldownUntil: string | null;
  open: SessionState | null;
  attempts: number;
}

/** Where a module's boss stands at `now`; `mastery` is the module's 0 to 100 mastery. */
export function bossStatus(args: {
  module: number;
  progress: Progress;
  lessonsRead: boolean;
  mastery: number;
  now: Date;
}): BossStatus {
  const { module, progress, lessonsRead, mastery, now } = args;
  const scope = bossScope(module);
  const results = examsOf(progress, 'boss', scope);
  const pass = results.find((r) => r.total > 0 && r.correct >= bossPassMark(r.total));
  const last = results.at(-1);
  const until = last === undefined ? null : Date.parse(last.submittedAt) + BOSS_COOLDOWN_MS;
  return {
    unlocked: lessonsRead,
    passed: pass !== undefined,
    passedAt: pass?.submittedAt ?? null,
    ready: lessonsRead && mastery >= BOSS_READY_MASTERY && pass === undefined,
    cooldownUntil: until !== null && until > now.getTime() ? new Date(until).toISOString() : null,
    open: openSession(progress, 'boss', scope),
    attempts: results.length,
  };
}
