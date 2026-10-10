import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContentIndex, RankView } from '../../schemas/chunks.ts';
import { index } from '../../src/app/content.ts';
import { rank, rankUp, watchRanks } from '../../src/app/memory.ts';
import { events, storeReady } from '../../src/app/progress.ts';
import { emptyIndexFields } from '../fixtures/index.ts';

/** Basic, then a made-up rank with no requirement, so the first replay already promotes. */
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

describe('watchRanks (spec 3.4)', () => {
  it('records one rank event per promotion, and only once the log has loaded', async () => {
    index.value = IDX;
    storeReady.value = false;
    stop = watchRanks();
    expect(rankEvents()).toEqual([]);
    storeReady.value = true;
    await vi.waitFor(() => expect(rankEvents()).toEqual(['apprentice-baker']));
    events.value = [...events.value];
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(rankEvents()).toEqual(['apprentice-baker']);
  });

  it('shows no rank and records nothing until the index lists the ranks', async () => {
    storeReady.value = true;
    stop = watchRanks();
    expect(rank.value).toBeNull();
    expect(rankUp.value).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(rankEvents()).toEqual([]);
  });
});
