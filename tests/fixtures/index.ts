import type { ContentIndex } from '../../schemas/chunks.ts';

/** The Phase 3 and Phase 4 index fields, empty, for typed `ContentIndex` literals in tests that build no exam or lab. */
export function emptyIndexFields(): Pick<
  ContentIndex,
  'blueprint' | 'ranks' | 'badges' | 'exam' | 'labs' | 'incidents'
> {
  return {
    blueprint: { domains: [], tasks: [] },
    ranks: [],
    badges: [],
    exam: { forms: [], items: {} },
    labs: [],
    incidents: [],
  };
}
