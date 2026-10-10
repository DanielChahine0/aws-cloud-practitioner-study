import { ADR_FIELDS, type AdrText } from '../../schemas/project-view.ts';

/**
 * One capstone ADR draft (spec 6), kept in kv under `adrKey(module)`: the six headings, citations stored as
 * `[[concept-id]]`, and the key point ids ticked after the reveal, held here until the final grade.
 * Text stays editable after grading; the grades live in `decision` events and never change.
 */
export interface AdrDraft extends AdrText {
  v: 1;
  ticks: string[];
}

/** A new draft whose Context holds the brief's context sentences, one per line. */
export function emptyAdrDraft(context: readonly string[]): AdrDraft {
  return {
    v: 1,
    context: context.join('\n'),
    options: '',
    decision: '',
    why: '',
    tradeoffs: '',
    cost: '',
    ticks: [],
  };
}

/** The draft in a kv value, or null when it is not one; tick ids the content no longer has are kept. Never throws. */
export function adrDraftOf(value: unknown): AdrDraft | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.v !== 1 || !Array.isArray(v.ticks) || !v.ticks.every((t) => typeof t === 'string')) return null;
  if (!ADR_FIELDS.every((field) => typeof v[field] === 'string')) return null;
  const text = Object.fromEntries(ADR_FIELDS.map((field) => [field, v[field] as string])) as AdrText;
  return { v: 1, ...text, ticks: [...(v.ticks as string[])] };
}
