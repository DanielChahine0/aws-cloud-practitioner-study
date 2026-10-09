import { describe, expect, it } from 'vitest';
import { FingerprintFile } from '../../schemas/fingerprint.ts';
import { hashShingle, shingleWindows, unpack } from '../../scripts/content/lib/fingerprint.ts';
import { fingerprintCourse, partitionShingles } from '../../scripts/content/lib/fingerprint-files.ts';
import { words } from '../../scripts/content/lib/text.ts';

const SHARED = 'Every loaf leaves the kitchen wrapped in brown paper and tied with string.';
const REPEATED = 'Branches borrow ovens from the central kitchen whenever their morning queues grow long.';
const MODULE_1 = [
  '# Module 1: Baking Basics',
  '[TEXT]',
  REPEATED,
  SHARED,
  '[KNOWLEDGE CHECK (multiple choice)]',
  'Which cabinet should a baker rent for rye dough on a cold winter morning?',
  '- (CORRECT) The warm proofing cabinet by the window',
  '',
].join('\n');
const MODULE_2 = [
  '# Module 2: Selling Bread',
  '[TEXT]',
  SHARED,
  'Market stalls sell the last loaves at half price just before closing time each evening.',
  '[KNOWLEDGE CHECK (multiple choice)]',
  REPEATED,
  '- (CORRECT) True for every branch in the city',
  '',
].join('\n');
const SOURCES = new Map([
  [1, MODULE_1],
  [2, MODULE_2],
]);
const shinglesOf = (text: string): string[] =>
  shingleWindows(words(text)).filter((s): s is string => s !== null);

describe('partitionShingles', () => {
  const parts = partitionShingles(SOURCES);
  const sets = [...parts.entries()].flatMap(([module, p]) => [
    { name: `m${module} text`, set: p.text },
    { name: `m${module} items`, set: p.items },
  ]);
  const homes = (shingle: string): string[] => sets.filter((s) => s.set.has(shingle)).map((s) => s.name);

  it('puts every course shingle in exactly one of the four sets', () => {
    const all = new Set([...SOURCES.values()].flatMap(shinglesOf));
    expect(sets).toHaveLength(4);
    for (const shingle of all) expect(homes(shingle)).toHaveLength(1);
    expect(sets.reduce((n, s) => n + s.set.size, 0)).toBe(all.size);
  });

  it("files a lesson sentence that a later knowledge check repeats under that check's items", () => {
    for (const shingle of shinglesOf(REPEATED)) expect(homes(shingle)).toEqual(['m2 items']);
  });

  it('files a plain sentence two modules share under the lower module text', () => {
    for (const shingle of shinglesOf(SHARED)) expect(homes(shingle)).toEqual(['m1 text']);
  });

  it('keeps an empty entry for a module number that has no source', () => {
    const gaps = partitionShingles(new Map([[2, MODULE_2]]));
    expect([...gaps.keys()]).toEqual([1, 2]);
    expect(gaps.get(1)?.text.size).toBe(0);
  });
});

describe('fingerprintCourse', () => {
  it('writes one valid file per module with both sets and the item ids', () => {
    const files = fingerprintCourse(SOURCES);
    expect(files.map((f) => f.module)).toEqual([1, 2]);
    for (const file of files) expect(FingerprintFile.parse(file)).toEqual(file);
    expect(files.map((f) => f.itemIds)).toEqual([['kc-01'], ['kc-01']]);
    const second = files[1];
    if (second === undefined) throw new Error('module 2 is missing');
    const items = unpack(second.items);
    for (const shingle of shinglesOf(REPEATED)) {
      expect(items.values.has(hashShingle(shingle, items.range))).toBe(true);
    }
  });

  it("names the other modules whose items sets hold some of a module's item shingles", () => {
    // Module 2's check repeats a Module 1 lesson sentence, which is still Module 2's own item text.
    expect(fingerprintCourse(SOURCES).map((f) => f.itemsFrom)).toEqual([[], []]);
    const check = 'Which cabinet should a baker rent for rye dough on a cold winter morning?';
    const third = `# Module 3: Delivery\n[KNOWLEDGE CHECK (multiple choice)]\n${check}\n- (CORRECT) Vans\n`;
    const withThird = fingerprintCourse(new Map([...SOURCES, [3, third]]));
    expect(withThird.map((f) => f.itemsFrom)).toEqual([[], [], [1]]);
  });

  it('refuses a source that repeats an assessment question number', () => {
    const block = '[ASSESSMENT Q1 (MULTIPLE_CHOICE)]\nWhich oven should a branch rent this morning?\n';
    expect(() => fingerprintCourse(new Map([[1, block + block]]))).toThrow('module 1 repeats item quiz-01');
  });
});
