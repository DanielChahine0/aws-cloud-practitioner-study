/** A made-up exam for end-to-end tests: four forms of 65 items with made-up text and known keys. */
import type { ExamChunk, ExamFormMeta, ExamItemRef, QuestionView } from '../../schemas/chunks.ts';

export const EXAM_FORMS = ['A', 'B', 'C', 'D'] as const;
export const EXAM_FORM_SIZE = 65;

export interface SyntheticExam {
  forms: ExamFormMeta[];
  items: Record<string, ExamItemRef>;
  /** Each form's chunk by its file name, as the index names it. */
  chunks: Record<string, ExamChunk>;
}

/** Builds the forms over real tested concepts, so replay and readiness see ordinary concepts and tasks. */
export function syntheticExam(
  concepts: readonly { id: string; home: string; tasks: readonly string[] }[],
): SyntheticExam {
  const usable = concepts.filter((c) => c.tasks.length > 0);
  if (usable.length === 0)
    throw new Error('the synthetic exam needs at least one tested concept with a task');
  const out: SyntheticExam = { forms: [], items: {}, chunks: {} };
  let n = 0;
  for (const form of EXAM_FORMS) {
    const questions: QuestionView[] = [];
    for (let i = 0; i < EXAM_FORM_SIZE; i += 1) {
      const c = usable[n % usable.length];
      n += 1;
      if (c === undefined) continue;
      const id = `q-zz${String(n).padStart(4, '0')}`;
      const task = c.tasks[0] ?? '';
      questions.push({
        id,
        version: 1,
        type: 'single',
        concept: c.id,
        note: c.home,
        task,
        level: 1,
        stem: `Made-up exam item ${n}`,
        select: null,
        options: [1, 2, 3, 4].map((k) => ({
          id: `o${k}`,
          text: `Option ${k}`,
          correct: k === 1,
          why: `Made-up reason ${k}.`,
        })),
        pairs: [],
        takeaway: 'Made-up takeaway.',
        read: { route: '#/', text: 'Made-up evidence.' },
      });
      out.items[id] = { version: 1, concept: c.id, task, form, type: 'single' };
    }
    const file = `exam-${form.toLowerCase()}.e2e00000.json`;
    out.forms.push({ id: form, chunk: `content/${file}`, frozen: true, size: EXAM_FORM_SIZE });
    out.chunks[file] = { form, questions };
  }
  return out;
}
