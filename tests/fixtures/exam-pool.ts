import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify } from 'yaml';
import { TASK_IDS } from '../../schemas/common.ts';
import { DOMAIN_IDS } from '../../schemas/ids.ts';
import type { Question } from '../../schemas/question.ts';
import { multiQuestion, singleQuestion, writePool } from './questions.ts';

/** Per-form task counts of the Phase 3 quota decision; they sum to 65. */
export const FORM_TASKS: Readonly<Record<string, number>> = {
  '1.1': 4,
  '1.2': 2,
  '1.3': 7,
  '1.4': 3,
  '2.1': 3,
  '2.2': 10,
  '2.3': 3,
  '2.4': 3,
  '3.1': 2,
  '3.2': 2,
  '3.3': 4,
  '3.4': 3,
  '3.5': 2,
  '3.6': 4,
  '3.7': 3,
  '3.8': 2,
  '4.1': 3,
  '4.2': 1,
  '4.3': 4,
};
const FORM_MULTI = { '1': 2, '2': 2, '3': 3, '4': 1 } as const;
const CROCKFORD = '0123456789abcdefghjkmnpqrstvwxyz';

/** A made-up exam id: `q-e` and the number in five Crockford digits, so it never meets a practice fixture id. */
export function examQid(n: number): string {
  let digits = '';
  for (let rest = n, i = 0; i < 5; i++, rest = Math.floor(rest / 32))
    digits = CROCKFORD.charAt(rest % 32) + digits;
  return `q-e${digits}`;
}

/** The concept of the j-th seat (from 1) of a task: `exam-1-3-2` for task 1.3. */
export const examConcept = (task: string, j: number): string => `exam-${task.replace('.', '-')}-${j}`;

/**
 * Exactly 4 x 65 live exam items: each task holds as many concepts as its per-form count, each concept 4 items, and the
 * first concepts of each domain are multi-response until the domain's per-form multi count is met. `text` is added to
 * every stem, why and takeaway, so a test can prove that no tool prints item text; `status` sets every item's status.
 */
export function examPoolQuestions(text = '', status: 'draft' | 'live' = 'live'): Question[] {
  const out: Question[] = [];
  const multiLeft: Record<string, number> = { ...FORM_MULTI };
  let n = 0;
  for (const task of TASK_IDS) {
    for (let j = 1; j <= (FORM_TASKS[task] ?? 0); j++) {
      const domain = task.charAt(0);
      const multi = (multiLeft[domain] ?? 0) > 0;
      if (multi) multiLeft[domain] = (multiLeft[domain] ?? 0) - 1;
      for (let copy = 0; copy < 4; copy++) {
        const id = examQid(n++);
        const base = { id, status, pool: 'exam' as const, concept: examConcept(task, j), task };
        if (multi) {
          const q = multiQuestion(base);
          out.push({ ...q, stem: `${q.stem} ${text}`.trim(), takeaway: `${q.takeaway} ${text}`.trim() });
        } else {
          const q = singleQuestion(base);
          out.push({
            ...q,
            stem: `${q.stem} ${text}`.trim(),
            options: q.options.map((o) => ({ ...o, why: `${o.why} ${text}`.trim() })),
            takeaway: `${q.takeaway} ${text}`.trim(),
          });
        }
      }
    }
  }
  return out;
}

/**
 * A quotas.yaml for the made-up pool. With `splitTask`, that task's pool target is split between Modules 1 and 2, so
 * the Module 2 cell stays short while the forms still build from the Module 1 items.
 */
export function examQuotas(splitTask?: string): object {
  const domains = { '1': 16, '2': 19, '3': 22, '4': 8 };
  const cells = TASK_IDS.flatMap((task) => {
    const target = 4 * (FORM_TASKS[task] ?? 0);
    return task === splitTask
      ? [
          { module: 1, task, target: target / 2 },
          { module: 2, task, target: target / 2 },
        ]
      : [{ module: 1, task, target }];
  }).sort((a, b) => a.module - b.module || TASK_IDS.indexOf(a.task) - TASK_IDS.indexOf(b.task));
  return {
    form: { size: 65, domains, tasks: { ...FORM_TASKS }, multi: { ...FORM_MULTI } },
    pool: { size: 260, forms: 4, maxPerConcept: 4, multi: { '1': 8, '2': 8, '3': 12, '4': 4 } },
    cells,
    multiByModule: DOMAIN_IDS.map((domain) => ({ module: 1, domain, target: 4 * FORM_MULTI[domain] })),
  };
}

/** Writes the made-up pool and its quotas.yaml into a fixture root; returns the questions it wrote. */
export function writeExamPool(
  root: string,
  options: { text?: string; status?: 'draft' | 'live'; splitTask?: string } = {},
): Question[] {
  const questions = examPoolQuestions(options.text, options.status);
  writePool(root, questions);
  writeFileSync(join(root, 'content/exam/quotas.yaml'), stringify(examQuotas(options.splitTask)));
  return questions;
}
