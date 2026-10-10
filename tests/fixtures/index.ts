import type { ContentIndex } from '../../schemas/chunks.ts';

/** The Phase 3 index fields, empty, for typed `ContentIndex` literals in tests that build no exam. */
export function emptyIndexFields(): Pick<ContentIndex, 'blueprint' | 'ranks' | 'badges' | 'exam'> {
  return {
    blueprint: { domains: [], tasks: [] },
    ranks: [],
    badges: [],
    exam: { forms: [], items: {} },
  };
}
