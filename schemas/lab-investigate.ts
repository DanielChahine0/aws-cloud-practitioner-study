/** The Investigate lab spec and actions (spec 5.1): filter made-up records, read a listing, choose exact answers. */
import { z } from 'zod';
import { Slug } from './common.ts';

/** A goal reference, the same rule as `GoalId` in `schemas/lab.ts`, which imports this file. */
const GoalRef = z.string().regex(/^g[1-9]$/, 'must look like g1');

const Column = z.strictObject({
  id: Slug,
  label: z.string().min(2).max(30),
  filter: z.boolean().default(false),
});
const RecordRow = z.strictObject({ id: Slug, cells: z.record(Slug, z.string().min(1).max(120)) });
const Option = z.strictObject({ id: Slug, label: z.string().min(1).max(80) });
const Question = z.strictObject({
  id: Slug,
  goal: GoalRef,
  prompt: z.string().min(8).max(160),
  options: z.array(Option).min(2).max(8),
  answer: Slug,
});

/** The index of every entry whose id an earlier entry already used. */
function repeats(ids: readonly string[]): number[] {
  return ids.flatMap((id, i) => (ids.indexOf(id) === i ? [] : [i]));
}

export const InvestigateSpec = z
  .strictObject({
    /** The records' caption, for example `Trail log, cafe account, 14 March, times in UTC`. */
    source: z.string().min(2).max(80),
    listing: z
      .strictObject({ label: z.string().min(2).max(60), lines: z.array(z.string().max(100)).min(1).max(40) })
      .optional(),
    columns: z.array(Column).max(8).default([]),
    records: z.array(RecordRow).max(30).default([]),
    questions: z.array(Question).min(1).max(8),
  })
  .superRefine((spec, ctx) => {
    const issue = (path: (string | number)[], message: string): void => {
      ctx.addIssue({ code: 'custom', path, message });
    };
    if (spec.records.length === 0 && spec.listing === undefined) issue([], 'needs records or a listing');
    const columns = spec.columns.map((c) => c.id);
    for (const i of repeats(columns)) issue(['columns', i, 'id'], `column ${columns[i]} is used twice`);
    spec.columns.forEach((c, i) => {
      if (c.filter && spec.records.length === 0)
        issue(['columns', i, 'filter'], 'a filter column needs records');
    });
    if (spec.records.length > 0 && columns.length === 0) issue(['columns'], 'records need columns');
    const records = spec.records.map((r) => r.id);
    for (const i of repeats(records)) issue(['records', i, 'id'], `record ${records[i]} is used twice`);
    if (columns.length > 0) {
      spec.records.forEach((r, i) => {
        for (const column of new Set(columns)) {
          if (!Object.hasOwn(r.cells, column))
            issue(['records', i, 'cells'], `record ${r.id} has no cell for column ${column}`);
        }
        for (const key of Object.keys(r.cells)) {
          if (!columns.includes(key)) issue(['records', i, 'cells', key], `names no column: ${key}`);
        }
      });
    }
    const questions = spec.questions.map((q) => q.id);
    for (const i of repeats(questions))
      issue(['questions', i, 'id'], `question ${questions[i]} is used twice`);
    spec.questions.forEach((q, i) => {
      const options = q.options.map((o) => o.id);
      for (const j of repeats(options))
        issue(['questions', i, 'options', j, 'id'], `option ${options[j]} is used twice`);
      if (!options.includes(q.answer)) issue(['questions', i, 'answer'], `names no option: ${q.answer}`);
    });
  });
export type InvestigateSpec = z.infer<typeof InvestigateSpec>;

export const InvestigateAction = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('filter'), column: Slug, value: z.string().min(1).max(120) }),
  z.strictObject({ t: z.literal('unfilter'), column: Slug }),
  z.strictObject({ t: z.literal('answer'), question: Slug, option: Slug }),
  z.strictObject({ t: z.literal('reset') }),
]);
export type InvestigateAction = z.infer<typeof InvestigateAction>;
