/** Phase 2's derived state as computed signals: replayed from the log, read at the minute clock (spec 3). */
import { computed } from '@preact/signals';
import { studyDay, tzOffset } from '../engine/day.ts';
import { moduleMastery } from '../engine/mastery.ts';
import { deriveMemory } from '../engine/memory.ts';
import { nextAction } from '../engine/next.ts';
import { reviewQueue } from '../engine/queue.ts';
import { streakOf } from '../engine/streak.ts';
import { KV_KEYS } from '../store/kv.ts';
import { now } from './clock.ts';
import { index } from './content.ts';
import { lessonRefs, memoryContentOf } from './home.ts';
import { events, kvRecords, progress } from './progress.ts';

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

export const nextUp = computed(() => {
  const list = lessons.value;
  const q = queue.value;
  if (list === null || q === null) return null;
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
