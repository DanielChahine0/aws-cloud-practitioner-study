import { describe, expect, it } from 'vitest';
import type { ContentIndex } from '../../schemas/chunks.ts';
import { index } from '../../src/app/content.ts';
import { nextUp } from '../../src/app/memory.ts';
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
  it('waits for the stored log, so Enter and the Next button never act on an empty one', () => {
    index.value = IDX;
    storeReady.value = false;
    expect(nextUp.value).toBeNull();
    storeReady.value = true;
    expect(nextUp.value).not.toBeNull();
  });
});
