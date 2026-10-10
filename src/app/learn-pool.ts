/**
 * The one place learn screens get their question pool (spec 4.3): the practice items of the loaded module chunks,
 * plus the items of every form whose mock has started, so an untaken form never reaches a learn-mode selector.
 */
import type { ExamChunk, ExamItemRef, ModuleChunk } from '../../schemas/chunks.ts';
import { type ExamPoolQuestion, learnPool, type PoolQuestion } from '../engine/select.ts';
import { ensureExamForm, examForms, index } from './content.ts';
import { taken } from './memory.ts';

/** The module of a note id such as `m03/aws-lambda`. */
const moduleOf = (note: string): number => Number(note.slice(1, 3));

/** The practice pool of some module chunks, with each concept as memory keys it (aliases resolved). */
export function practicePoolOf(
  chunks: readonly ModuleChunk[],
  conceptOf: (concept: string) => string,
): PoolQuestion[] {
  return chunks.flatMap((c) =>
    c.questions.map((q) => ({
      id: q.id,
      concept: conceptOf(q.concept),
      note: q.note,
      type: q.type,
      module: c.module,
    })),
  );
}

/** The exam items of the loaded form chunks, tagged with their form; items the index does not list are left out. */
export function examPoolOf(
  forms: ReadonlyMap<string, ExamChunk>,
  items: Readonly<Record<string, ExamItemRef>>,
): ExamPoolQuestion[] {
  const pool: ExamPoolQuestion[] = [];
  for (const chunk of forms.values()) {
    for (const q of chunk.questions) {
      const item = items[q.id];
      if (item === undefined) continue;
      pool.push({
        id: q.id,
        concept: item.concept,
        note: q.note,
        type: item.type,
        module: moduleOf(q.note),
        form: item.form,
      });
    }
  }
  return pool;
}

/**
 * A learn screen's pool now: asks for every taken form's chunk (a form not loaded yet joins on a later call),
 * then adds the loaded items of taken forms to the practice items.
 */
export function learnPoolNow(practice: readonly PoolQuestion[]): PoolQuestion[] {
  const forms = taken.peek();
  for (const form of forms) void ensureExamForm(form);
  return learnPool(practice, examPoolOf(examForms.peek(), index.peek()?.exam.items ?? {}), forms);
}
