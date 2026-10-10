import { describe, expect, it } from 'vitest';
import { adrDraftOf, emptyAdrDraft } from '../../src/app/adr-draft.ts';

describe('ADR drafts', () => {
  it('starts with the brief context one sentence per line and nothing else written', () => {
    expect(emptyAdrDraft(['The bakery opens a second shop.', 'Mornings are busy.'])).toEqual({
      v: 1,
      context: 'The bakery opens a second shop.\nMornings are busy.',
      options: '',
      decision: '',
      why: '',
      tradeoffs: '',
      cost: '',
      ticks: [],
    });
  });

  it('accepts a round-tripped draft and keeps tick ids it does not know', () => {
    const draft = {
      ...emptyAdrDraft(['A shop.']),
      why: '[[shared-kitchen]]',
      ticks: ['kp-01-gone', 'kp-01-live'],
    };
    expect(adrDraftOf(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  });

  it('drops extra fields and rejects wrong shapes', () => {
    const draft = emptyAdrDraft(['A shop.']);
    expect(adrDraftOf({ ...draft, extra: 1 })).toEqual(draft);
    expect(adrDraftOf(null)).toBeNull();
    expect(adrDraftOf('text')).toBeNull();
    expect(adrDraftOf([draft])).toBeNull();
    expect(adrDraftOf({ ...draft, v: 2 })).toBeNull();
    expect(adrDraftOf({ ...draft, why: 3 })).toBeNull();
    expect(adrDraftOf({ ...draft, ticks: 'kp-01-a' })).toBeNull();
    expect(adrDraftOf({ ...draft, ticks: [1] })).toBeNull();
    const { cost: _cost, ...noCost } = draft;
    expect(adrDraftOf(noCost)).toBeNull();
  });
});
