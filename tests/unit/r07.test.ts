import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { fingerprintCourse } from '../../scripts/content/lib/fingerprint-files.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { bakeryLab, FIXTURE_LAB, writeLab } from '../fixtures/labs.ts';

describe('R7 originality', () => {
  it('checks shared files against the course too', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', 'glossary.md'),
      '- **Proofing cabinet** ([Module 1, What a Bakery Cloud Is](01-baking-basics/01-what-a-bakery-cloud-is.md)): Bakers rent proofing cabinets by the minute and hand them back once the dough has risen.\n',
    );
    const findings = runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R7']).findings;
    expect(findings.map((f) => f.file)).toContain('resources/glossary.md');
    expect(findings.some((f) => f.message.startsWith('copies a 16-word run'))).toBe(true);
  });

  it('masks titles, so a line built from course titles is never a copied run', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', '01-baking-basics', '01-what-a-bakery-cloud-is.md'),
      '\n- Module 1: Baking Basics, Section Getting Started, Lesson 1: What a Bakery Cloud Is.\n',
    );
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(runRules(ctx, ['R7']).findings).toEqual([]);
    // The same line without masking copies a run, so the empty result above comes from the masking.
    const unmasked = runRules({ ...ctx, allow: [['no', 'such', 'phrase']] }, ['R7']).findings;
    expect(unmasked.map((f) => f.message.split(' from')[0])).toEqual([
      'copies a 14-word run',
      '9.4% of its 6-word sequences come',
    ]);
  });
});

describe('R7 across the one-set partition', () => {
  // Module 2's knowledge check shares one 6-word shingle, "a branch borrow ovens only during", with Module 1's check,
  // and the one-set rule stores that shingle only in Module 1's items set.
  const MODULE_2 = [
    '# Module 2: Selling Bread',
    '## SECTION: Market',
    '### LESSON 1: Market Stalls (blocks)',
    '[TEXT]',
    'Market stalls sell the last loaves at half price just before closing time each evening.',
    '[KNOWLEDGE CHECK (multiple choice)]',
    'Why would a branch borrow ovens only during closing time each evening?',
    '- (CORRECT) To bake fresh loaves for the evening market',
    '',
  ].join('\n');

  function twoModuleRoot(): string {
    const root = makeFixtureRoot();
    const one = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'source', 'module-01.md'), 'utf8');
    for (const file of fingerprintCourse(
      new Map([
        [1, one],
        [2, MODULE_2],
      ]),
    )) {
      writeFileSync(join(root, 'content', 'fingerprints', `m0${file.module}.json`), JSON.stringify(file));
    }
    return root;
  }

  it("finds a stem-check run whose shingles the partition split between two modules' items", () => {
    const root = twoModuleRoot();
    replaceIn(
      root,
      'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml',
      'Which choice fits the bakery cloud?',
      'The owner asks, would a branch borrow ovens only during closing rush? Which choice fits the bakery cloud?',
    );
    const findings = runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R7']).findings;
    expect(findings.map((f) => f.message)).toEqual([
      'q-b4k7m2 shares an 8-word run with a Module 2 knowledge check or assessment item: "would a branch borrow ovens only during closing"',
    ]);
  });

  it("reports a copied Module 1 check once, not again for Module 2, which reads Module 1's items too", () => {
    const root = twoModuleRoot();
    replaceIn(
      root,
      'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml',
      'Which choice fits the bakery cloud?',
      'Which feature lets a branch borrow ovens only during the busy morning hours?',
    );
    const findings = runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R7']).findings;
    const copied = 'which feature lets a branch borrow ovens only during the busy morning hours';
    expect(findings.map((f) => f.message)).toEqual([
      `q-b4k7m2 copies a 9-word run from the course: "${copied}"`,
      `q-b4k7m2 shares an 8-word run with a Module 1 knowledge check or assessment item: "${copied}"`,
    ]);
  });
});

describe('R7 for questions', () => {
  const QUESTIONS = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';
  const STEM =
    'A harbour branch sells out of rolls each Saturday because its two ovens cannot keep up. Which choice fits the bakery cloud?';
  // 8 words of the fixture knowledge check, and 8 and 11 words of the fixture lesson text.
  const FROM_CHECK = 'lets a branch borrow ovens only during the';
  const FROM_TEXT = 'bakers rent proofing cabinets by the minute and';
  const LONG_FROM_TEXT = 'bakers rent proofing cabinets by the minute and hand them back';

  function r07(edit: [from: string, to: string], status = 'live'): string[] {
    const root = makeFixtureRoot();
    const file = join(root, QUESTIONS);
    writeFileSync(file, readFileSync(file, 'utf8').replace('    status: live\n', `    status: ${status}\n`));
    replaceIn(root, QUESTIONS, ...edit);
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([]);
    return runRules(ctx, ['R7']).findings.map((f) => `${f.file}:${f.line} ${f.message}`);
  }
  const inStem = (words: string): [string, string] => [
    STEM,
    `A harbour branch sells out of rolls each Saturday because its two ovens cannot keep up, and the owner says it ${words} morning rush. Which choice fits the bakery cloud?`,
  ];

  it('reports 8 words of a knowledge check in a live stem as the stem check only', () => {
    expect(r07(inStem(FROM_CHECK))).toEqual([
      `${QUESTIONS}:2 q-b4k7m2 shares an 8-word run with a Module 1 knowledge check or assessment item: "${FROM_CHECK}"`,
    ]);
  });

  it('passes the same length of lesson text, which is no knowledge check', () => {
    expect(r07(inStem(FROM_TEXT))).toEqual([]);
  });

  it('reports a 9-word copy of the course inside a why', () => {
    const why = 'why: Baking ahead does not add oven capacity and leaves the rolls stale.';
    expect(r07([why, `why: Not so, because ${LONG_FROM_TEXT} for free.`])).toEqual([
      `${QUESTIONS}:2 q-b4k7m2 copies a 9-word run from the course: "${LONG_FROM_TEXT}"`,
    ]);
  });

  it('reports a stem that copies a whole knowledge check as a run, a stem-check run and a share', () => {
    const copied = 'which feature lets a branch borrow ovens only during the busy morning hours';
    // The 9 shingles of the copied check are about a third of the shingles in the stem and option texts.
    expect(
      r07([
        STEM,
        'Which feature lets a branch borrow ovens only during the busy morning hours? Pick the best fit.',
      ]),
    ).toEqual([
      `${QUESTIONS}:2 q-b4k7m2 copies a 9-word run from the course: "${copied}"`,
      `${QUESTIONS}:2 q-b4k7m2 shares an 8-word run with a Module 1 knowledge check or assessment item: "${copied}"`,
      `${QUESTIONS}:2 q-b4k7m2: 31.7% of its stem and option text matches Module 1's knowledge checks and assessment items (limit 25%)`,
    ]);
  });

  it('ignores a draft with a copied stem', () => {
    expect(r07(inStem(FROM_CHECK), 'draft')).toEqual([]);
  });
});

describe('R7 for labs', () => {
  const COPIED = 'Bakers rent proofing cabinets by the minute and hand them back once the dough has risen.';

  /** R7 findings for the fixture lab with its last card's text replaced. */
  const withCardText = (text: string, status: 'live' | 'retired' = 'live'): string[] => {
    const root = makeFixtureRoot();
    const lab = bakeryLab({ status });
    const spec = lab.spec as { cards: { text: string }[] };
    writeLab(root, {
      ...lab,
      spec: { ...spec, cards: spec.cards.map((c, i) => (i === 3 ? { ...c, text } : c)) },
    });
    return runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R7']).findings.map(
      (f) => `${f.file}  ${f.message.split(':')[0]}`,
    );
  };

  it('passes the fixture lab', () => {
    expect(withCardText('A cabinet nobody needs between closing and dawn')).toEqual([]);
  });

  it('reports a card text that copies a run of the course, on the lab file', () => {
    expect(withCardText(COPIED)).toEqual([
      `${FIXTURE_LAB}  lab-m01-sort-the-bakes copies a 9-word run from the course`,
    ]);
  });

  it('ignores a retired lab', () => {
    expect(withCardText(COPIED, 'retired')).toEqual([]);
  });
});
