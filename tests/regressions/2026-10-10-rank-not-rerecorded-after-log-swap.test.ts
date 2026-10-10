import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContentIndex, RankView } from '../../schemas/chunks.ts';
import { index } from '../../src/app/content.ts';
import { watchRanks } from '../../src/app/memory.ts';
import { events, storeReady } from '../../src/app/progress.ts';
import { emptyIndexFields } from '../fixtures/index.ts';

/** Basic, then a made-up rank with no requirement, so every replay promotes. */
const RANKS: RankView[] = [
  { id: 'basic', name: 'Basic', short: 'Basic', requires: {}, facts: [] },
  { id: 'apprentice-baker', name: 'Apprentice Baker', short: 'Apprentice', requires: {}, facts: [] },
];
const IDX: ContentIndex = {
  contentVersion: 'test',
  modules: [],
  concepts: [],
  glossary: [],
  missions: [],
  questionVersions: {},
  search: 'content/search.json',
  ...emptyIndexFields(),
  ranks: RANKS,
};
const rankEvents = (): string[] => events.value.flatMap((e) => (e.t === 'rank' ? [e.rank] : []));

let stop: (() => void) | null = null;
afterEach(() => {
  stop?.();
  stop = null;
  events.value = [];
  storeReady.value = false;
  index.value = null;
});

describe('a rank earned again after the log is replaced without a reload', () => {
  it('records the rank again once the first write has settled', async () => {
    index.value = IDX;
    storeReady.value = true;
    stop = watchRanks();
    await vi.waitFor(() => expect(rankEvents()).toEqual(['apprentice-baker']));
    // Progress > Replace or Reset all progress swaps the log in place, dropping the rank event.
    events.value = [];
    await vi.waitFor(() => expect(rankEvents()).toEqual(['apprentice-baker']));
  });
});
