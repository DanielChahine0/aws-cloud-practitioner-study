import { isMap, isSeq, parseDocument, YAMLSeq } from 'yaml';
import type { Review, Verified } from '../../../schemas/question.ts';

/** The fields only the tools write; `null` removes the key. */
export interface QuestionEdit {
  status?: 'draft' | 'live';
  verified?: Verified | null;
  review?: Review | null;
}

/**
 * Applies edits to the questions of one file by id, keeping comments, key order and the rest of the text;
 * a `verified` block's `checks` list is written in flow style. Throws on an id that is not in the file.
 */
export function editQuestionFile(text: string, edits: ReadonlyMap<string, QuestionEdit>): string {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`YAML: ${doc.errors[0]?.message ?? 'parse error'}`);
  const seq = doc.get('questions');
  const items = isSeq(seq) ? seq.items : [];
  const indexOf = new Map<string, number>();
  for (const [i, item] of items.entries()) {
    const id = isMap(item) ? item.get('id') : undefined;
    if (typeof id === 'string') indexOf.set(id, i);
  }
  for (const [id, edit] of edits) {
    const i = indexOf.get(id);
    if (i === undefined) throw new Error(`${id} is not in this file`);
    for (const key of ['status', 'verified', 'review'] as const) {
      const value = edit[key];
      if (value === undefined) continue;
      if (value === null) {
        doc.deleteIn(['questions', i, key]);
        continue;
      }
      doc.setIn(['questions', i, key], doc.createNode(value));
      if (key === 'verified') {
        const checks = doc.getIn(['questions', i, key, 'checks'], true);
        if (checks instanceof YAMLSeq) checks.flow = true;
      }
    }
  }
  return doc.toString({ lineWidth: 0 });
}
