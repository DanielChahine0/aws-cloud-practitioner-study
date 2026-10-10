/**
 * The one place learn screens get their question pool (spec 4.3): the practice items of the loaded module chunks,
 * plus the items of every form whose mock is over, so an untaken form, or the form of a mock still open, never
 * reaches a learn-mode selector.
 */
import type { ContentIndex, ExamChunk, ExamItemRef, ModuleChunk } from '../../schemas/chunks.ts';
import { type ExamPoolQuestion, learnPool, type PoolQuestion } from '../engine/select.ts';
import { ensureExamForm, examForms, index } from './content.ts';
import { learnForms } from './memory.ts';

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
 * A learn screen's pool now: asks for the chunk of every form whose mock is over (a form not loaded yet joins on a
 * later call), then adds the loaded items of those forms to the practice items.
 */
export function learnPoolNow(practice: readonly PoolQuestion[]): PoolQuestion[] {
  const forms = learnForms.peek();
  for (const form of forms) void ensureExamForm(form);
  return learnPool(practice, examPoolOf(examForms.peek(), index.peek()?.exam.items ?? {}), forms);
}

/**
 * The forms a learn session must load before it shows (spec 4.3): the form of each of its exam items, plus `also`,
 * which a review passes every form of its learn pool as, since its relearn variants come from their items too.
 * Forms already loaded and forms the index does not list (they can never load) are left out.
 */
export function formsToLoad(
  qids: readonly string[],
  also: Iterable<string>,
  exam: ContentIndex['exam'],
  loaded: ReadonlyMap<string, ExamChunk>,
): string[] {
  const wanted = new Set(also);
  for (const qid of qids) {
    const form = exam.items[qid]?.form;
    if (form !== undefined) wanted.add(form);
  }
  const listed = new Set(exam.forms.map((f) => f.id));
  return [...wanted].filter((f) => listed.has(f) && !loaded.has(f)).sort();
}
