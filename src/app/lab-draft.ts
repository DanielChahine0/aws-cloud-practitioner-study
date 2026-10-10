/**
 * Unfinished labs (spec 8.1): one kv record, `labDrafts`, maps each lab id to the lab `rev` it was started on, the
 * actions dispatched so far and the goals whose hint was opened. Only actions are kept, never a state: the screen
 * replays them through the engine's reducer, so the reducer stays the one source of truth.
 */
export interface LabDraft {
  rev: number;
  actions: unknown[];
  hints: string[];
}

export type LabDrafts = Readonly<Record<string, LabDraft>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDraft = (value: unknown): value is LabDraft =>
  isRecord(value) &&
  Number.isInteger(value.rev) &&
  (value.rev as number) >= 1 &&
  Array.isArray(value.actions) &&
  Array.isArray(value.hints) &&
  value.hints.every((h) => typeof h === 'string');

/** The drafts in a kv value, dropping any malformed entry; never throws. */
export function labDraftsOf(value: unknown): LabDrafts {
  if (!isRecord(value)) return {};
  const drafts: Record<string, LabDraft> = {};
  for (const [lab, draft] of Object.entries(value)) {
    if (isDraft(draft))
      drafts[lab] = { rev: draft.rev, actions: [...draft.actions], hints: [...draft.hints] };
  }
  return drafts;
}

/** The draft of `lab`, or null when there is none or it was started on another `rev`, whose actions may not fit. */
export function labDraftOf(drafts: LabDrafts, lab: string, rev: number): LabDraft | null {
  const draft = drafts[lab];
  return draft === undefined || draft.rev !== rev ? null : draft;
}

/** The drafts with `lab` set to `draft`, or without `lab` when `draft` is null. */
export function withDraft(drafts: LabDrafts, lab: string, draft: LabDraft | null): LabDrafts {
  const { [lab]: _, ...rest } = drafts;
  return draft === null ? rest : { ...rest, [lab]: draft };
}

/** The draft with `goalId` among its opened hints, once. */
export function withHint(draft: LabDraft, goalId: string): LabDraft {
  return draft.hints.includes(goalId) ? draft : { ...draft, hints: [...draft.hints, goalId] };
}
