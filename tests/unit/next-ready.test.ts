import { describe, expect, it, vi } from 'vitest';
import type { ContentIndex } from '../../schemas/chunks.ts';
import { index } from '../../src/app/content.ts';
import { nextUp } from '../../src/app/memory.ts';
import { missionState } from '../../src/app/mission-state.ts';
import { storeReady } from '../../src/app/progress.ts';
import { emptyIndexFields } from '../fixtures/index.ts';

const IDX: ContentIndex = {
  contentVersion: 'test',
  modules: [
    {
      n: 1,
      slug: 'baking-basics',
      title: 'Module 1: Baking Basics',
      short: 'Baking Basics',
      chunk: 'content/m01.json',
      lessons: [
        { n: 1, slug: 'welcome', title: 'Welcome to the Bakery', concepts: [], minutes: 3, checkConcepts: 0 },
      ],
    },
  ],
  concepts: [],
  glossary: [],
  missions: [],
  questionVersions: {},
  search: 'content/search.json',
  ...emptyIndexFields(),
};

describe('nextUp', () => {
  it('waits for the stored log, so Enter and the Next button never act on an empty one', async () => {
    index.value = IDX;
    await vi.waitFor(() => expect(missionState.value).toBeDefined());
    storeReady.value = false;
    expect(nextUp.value).toBeNull();
    storeReady.value = true;
    expect(nextUp.value).not.toBeNull();
  });

  it('waits for the mission state, so Enter never skips a due cleanup, and goes on without it when it fails', async () => {
    index.value = IDX;
    storeReady.value = true;
    await vi.waitFor(() => expect(missionState.value).toBeDefined());
    const loaded = missionState.value;
    missionState.value = undefined;
    expect(nextUp.value).toBeNull();
    missionState.value = null;
    expect(nextUp.value).not.toBeNull();
    missionState.value = loaded;
  });
});
