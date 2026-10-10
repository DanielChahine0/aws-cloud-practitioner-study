/** Phase 2's derived state as computed signals: replayed from the log, read at the minute clock (spec 3). */
import { computed, effect } from '@preact/signals';
import type { BadgeEarned, BadgeId } from '../engine/badges.ts';
import { type BossStatus, bossStatus } from '../engine/boss.ts';
import { studyDay, tzOffset } from '../engine/day.ts';
import { moduleMastery } from '../engine/mastery.ts';
import { deriveMemory } from '../engine/memory.ts';
import { firstAttempts } from '../engine/mock.ts';
import { extras, nextAction } from '../engine/next.ts';
import { reviewQueue } from '../engine/queue.ts';
import {
  rankFacts as factsOf,
  type RankDef,
  type RankFacts,
  rankToRecord,
  shownRank,
} from '../engine/ranks.ts';
import { readiness } from '../engine/readiness.ts';
import { practiceForms, takenForms } from '../engine/replay.ts';
import { streakOf } from '../engine/streak.ts';
import { KV_KEYS } from '../store/kv.ts';
import { now } from './clock.ts';
import { index } from './content.ts';
import { lessonRefs, memoryContentOf } from './home.ts';
import { events, kvRecords, progress, record, storeReady } from './progress.ts';
import { pad2 } from './router.ts';

export const memoryContent = computed(() => {
  const idx = index.value;
  return idx === null ? null : memoryContentOf(idx);
});

const lessons = computed(() => {
  const idx = index.value;
  return idx === null ? null : lessonRefs(idx);
});

export const memory = computed(() => {
  const content = memoryContent.value;
  return content === null ? null : deriveMemory(events.value, content);
});

export const queue = computed(() => {
  const m = memory.value;
  const content = memoryContent.value;
  if (m === null || content === null) return null;
  const at = now.value;
  return reviewQueue(m, content, at, tzOffset(at));
});

export const streak = computed(() => {
  const m = memory.value;
  return m === null ? null : streakOf(m.qualifyingDays, studyDay(now.value));
});

export const mastery = computed(() => {
  const m = memory.value;
  const content = memoryContent.value;
  return m === null || content === null ? null : moduleMastery(m, content, now.value);
});

/** The lesson note last opened, which the lesson page writes to kv because reading writes no event. */
export const currentLesson = computed(() => {
  const value = kvRecords.value[KV_KEYS.currentLesson]?.value;
  return typeof value === 'string' ? value : null;
});

/** `dismissed` once Not now was pressed on the exam date question. */
export const examAsk = computed(() => kvRecords.value[KV_KEYS.examAsk]?.value ?? null);

/** Null until the stored log has loaded, so neither the Next button nor Enter acts on an empty log. */
export const nextUp = computed(() => {
  const list = lessons.value;
  const q = queue.value;
  if (!storeReady.value || list === null || q === null) return null;
  const at = now.value;
  return nextAction({
    lessons: list,
    progress: progress.value,
    queue: q,
    currentLesson: currentLesson.value,
    today: studyDay(at),
    tz: tzOffset(at),
  });
});

/** The ranks of `content/game/ranks.yaml` in order, Basic first. */
export const ranks = computed<readonly RankDef[]>(() =>
  (index.value?.ranks ?? []).map((r) => ({ ...r, requires: r.requires as RankDef['requires'] })),
);

/** The forms A to D whose mock has started, so the next mock takes another form (spec 4.3). */
export const taken = computed(() => takenForms(progress.value));

/** The forms A to D whose mock is submitted or abandoned, so their items may join practice (spec 4.3). */
export const learnForms = computed(() => practiceForms(progress.value));

/** Each module's boss: unlocked, ready, passed, cooling down or open (spec 4.2). */
export const bosses = computed<ReadonlyMap<number, BossStatus>>(() => {
  const idx = index.value;
  const masteries = mastery.value;
  const out = new Map<number, BossStatus>();
  if (idx === null || masteries === null) return out;
  const p = progress.value;
  for (const m of idx.modules) {
    out.set(
      m.n,
      bossStatus({
        module: m.n,
        progress: p,
        lessonsRead: m.lessons.every((l) => p.lessonsDone.has(`m${pad2(m.n)}/${l.slug}`)),
        mastery: masteries.get(m.n) ?? 0,
        now: now.value,
      }),
    );
  }
  return out;
});

/** The first submitted attempt of each form A to D. */
export const attempts = computed(() => firstAttempts(progress.value));

/** Readiness at the minute clock (spec 3.9); null until the content index has loaded. */
export const readinessNow = computed(() => {
  const m = memory.value;
  const content = memoryContent.value;
  if (m === null || content === null) return null;
  const at = now.value;
  return readiness({ memory: m, content, attempts: attempts.value, now: at, tz: tzOffset(at) });
});

/** The facts the rank rules read (spec 3.4), counted once by the engine's `rankFacts`. */
export const rankFacts = computed<RankFacts>(() =>
  factsOf({
    progress: progress.value,
    mastery: mastery.value ?? new Map(),
    ready: readinessNow.value?.label === 'Ready',
    today: studyDay(now.value),
  }),
);

/** Modules whose boss has been passed at least once. */
export const bossesPassed = computed(() => rankFacts.value.bossesPassed);

/** Modules whose mastery is 60 or more. */
export const hexesAt60 = computed(() => rankFacts.value.hexesAt60);

/**
 * The rank shown: the highest of the computed and the recorded ranks, so it never drops (spec 3.4); null until the
 * index lists the ranks, because the engine's rank helpers need at least Basic.
 */
export const rank = computed<RankDef | null>(() =>
  ranks.value.length === 0 ? null : shownRank(ranks.value, rankFacts.value, progress.value.ranks),
);

/** The rank whose promotion line was dismissed, from kv. */
export const rankSeen = computed(() => {
  const value = kvRecords.value[KV_KEYS.rankSeen]?.value;
  return typeof value === 'string' ? value : null;
});

/** The shown rank while it is above the one last dismissed, else null; Basic never shows a promotion line. */
export const rankUp = computed<RankDef | null>(() => {
  const shown = rank.value;
  if (!storeReady.value || shown === null) return null;
  const list = ranks.value;
  const seen = Math.max(
    0,
    list.findIndex((r) => r.id === rankSeen.value),
  );
  return list.findIndex((r) => r.id === shown.id) > seen ? shown : null;
});

/** The extras line's entries (spec 4.6): a ready boss and a due mock, at most two. */
export const extraItems = computed(() => {
  const at = now.value;
  return extras({
    bosses: bosses.value,
    progress: progress.value,
    today: studyDay(at),
    now: at,
    lab: null,
    incident: null,
  });
});

/** Badges earned, each with the event that earned it. */
export const badges = computed<ReadonlyMap<BadgeId, BadgeEarned>>(() => memory.value?.badges ?? new Map());

/** Records one `rank` event per promotion once the log has loaded (spec 3.4); returns the cleanup. */
export function watchRanks(): () => void {
  const writing = new Set<string>();
  return effect(() => {
    if (!storeReady.value || ranks.value.length === 0) return;
    const due = rankToRecord(ranks.value, rankFacts.value, progress.value.ranks);
    if (due === null || writing.has(due.id)) return;
    writing.add(due.id);
    // Release the guard once the write settles, so a log replaced in place can earn the rank again.
    void record({ t: 'rank', rank: due.id }).finally(() => writing.delete(due.id));
  });
}
