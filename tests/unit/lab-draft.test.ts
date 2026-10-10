import { describe, expect, it } from 'vitest';
import { type LabDraft, labDraftOf, labDraftsOf, withDraft, withHint } from '../../src/app/lab-draft.ts';

const LAB = 'lab-m01-sort-the-bakes';
const DRAFT: LabDraft = {
  rev: 2,
  actions: [{ t: 'place', card: 'rye', bucket: 'shared-kitchen' }],
  hints: ['g1'],
};

describe('labDraftsOf', () => {
  it('reads well-formed drafts and copies them', () => {
    const value = { [LAB]: DRAFT };
    const drafts = labDraftsOf(value);
    expect(drafts).toEqual(value);
    expect(drafts[LAB]).not.toBe(DRAFT);
  });

  it('gives {} for a value that is not a record, and never throws', () => {
    for (const value of [undefined, null, 3, 'x', [DRAFT], true]) expect(labDraftsOf(value)).toEqual({});
  });

  it('drops each malformed entry and keeps the rest', () => {
    const value = {
      [LAB]: DRAFT,
      'lab-m01-no-rev': { actions: [], hints: [] },
      'lab-m01-rev-0': { rev: 0, actions: [], hints: [] },
      'lab-m01-half-rev': { rev: 1.5, actions: [], hints: [] },
      'lab-m01-actions': { rev: 1, actions: 'place', hints: [] },
      'lab-m01-hints': { rev: 1, actions: [], hints: [1] },
      'lab-m01-null': null,
    };
    expect(labDraftsOf(value)).toEqual({ [LAB]: DRAFT });
  });
});

describe('labDraftOf', () => {
  it('finds the draft of the lab at its rev, and null when absent or the rev changed', () => {
    const drafts = { [LAB]: DRAFT };
    expect(labDraftOf(drafts, LAB, 2)).toEqual(DRAFT);
    expect(labDraftOf(drafts, LAB, 3)).toBeNull();
    expect(labDraftOf(drafts, 'lab-m02-other', 2)).toBeNull();
  });
});

describe('withDraft and withHint', () => {
  it('sets a draft, replaces it, and removes it with null', () => {
    const one = withDraft({}, LAB, DRAFT);
    expect(one).toEqual({ [LAB]: DRAFT });
    const other = withDraft(one, 'lab-m02-other', { rev: 1, actions: [], hints: [] });
    expect(Object.keys(other)).toEqual([LAB, 'lab-m02-other']);
    expect(withDraft(other, LAB, null)).toEqual({ 'lab-m02-other': { rev: 1, actions: [], hints: [] } });
    expect(withDraft({}, LAB, null)).toEqual({});
  });

  it('adds an opened hint once', () => {
    expect(withHint(DRAFT, 'g2').hints).toEqual(['g1', 'g2']);
    expect(withHint(DRAFT, 'g1')).toBe(DRAFT);
  });
});
