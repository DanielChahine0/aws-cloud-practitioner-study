import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentIndex } from '../../schemas/chunks.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { CONCEPTS_FILE, FORMS_FILE, loadContext } from '../../scripts/content/lib/context.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { POOL_FILE } from '../fixtures/questions.ts';

/**
 * The index filed each exam item under its raw concept id, so after a rename an item still tagged with the old
 * alias joined the learn pool under a different key from its practice variants: a boss could draw one real concept
 * twice and a remix could repeat a concept inside one form. R12 already resolves the alias; the index did not.
 */
const item = (id: string): string => `
  - id: ${id}
    version: 1
    status: live
    pool: exam
    type: single
    concept: shared-oven
    note: m01/what-a-bakery-cloud-is
    task: "1.1"
    level: 2
    stem: A seaside branch runs out of loaves at noon on market days. Which choice fits the bakery cloud?
    options:
      - { id: a, text: Borrow central ovens on market days, correct: true, why: The central kitchen lends ovens when a queue grows. }
      - { id: b, text: Buy a second oven for the branch, why: A second oven idles on quiet days. }
      - { id: c, text: Close the branch at noon, why: Closing turns customers away. }
      - { id: d, text: Bake every loaf the night before, why: Baking early adds no oven time. }
    evidence:
      - Branches use ovens from one central kitchen when their queues grow.
    takeaway: Borrow ovens for a busy day.
`;

describe('an exam item tagged with a concept alias', () => {
  it('is filed in the index under the registered concept id', () => {
    const root = makeFixtureRoot();
    replaceIn(
      root,
      CONCEPTS_FILE,
      '- id: shared-kitchen\n',
      '- id: shared-kitchen\n  aliases: [shared-oven]\n',
    );
    mkdirSync(join(root, 'content', 'exam', 'pool'), { recursive: true });
    writeFileSync(
      join(root, POOL_FILE),
      `questions:${['a', 'b', 'c', 'd'].map((f) => item(`q-ex${f}001`)).join('')}`,
    );
    writeFileSync(
      join(root, FORMS_FILE),
      [
        'seed: 20261024',
        'forms:',
        '  - { id: A, frozen: true, qids: [q-exa001] }',
        '  - { id: B, frozen: false, qids: [q-exb001] }',
        '  - { id: C, frozen: false, qids: [q-exc001] }',
        '  - { id: D, frozen: false, qids: [q-exd001] }',
        '',
      ].join('\n'),
    );
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    const built = buildContent(ctx);
    const index = JSON.parse(built.files.get(built.indexFile) ?? 'null') as ContentIndex;
    expect(index.exam.items['q-exa001']?.concept).toBe('shared-kitchen');
  });
});
