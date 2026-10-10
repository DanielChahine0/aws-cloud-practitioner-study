import { describe, expect, it } from 'vitest';
import type { AdrText, ProjectChunk } from '../../schemas/project-view.ts';
import {
  emDashLines,
  multiSentenceLines,
  ABBREVIATIONS as SCRIPT_ABBREVIATIONS,
  FENCE as SCRIPT_FENCE,
  SENTENCE_BREAK as SCRIPT_SENTENCE_BREAK,
} from '../../scripts/content/lib/text.ts';
import { type ConceptName, decisionsOf } from '../../src/engine/capstone.ts';
import {
  ABBREVIATIONS,
  FENCE,
  oneSentencePerLine,
  PLAN_FILE,
  planMarkdown,
  SENTENCE_BREAK,
} from '../../src/engine/plan.ts';
import { timelineOf } from '../fixtures/events.ts';

const CONCEPTS: ConceptName[] = [
  { id: 'shared-kitchen', name: 'Shared kitchen', aliases: [] },
  { id: 'per-minute-rental', name: 'Per-minute rental', aliases: [] },
];

const RUBRIC: ProjectChunk['rubric'] = {
  passTotal: 8,
  criteria: [
    { id: 'fit', name: 'Fit', levels: ['a', 'b', 'c', 'd'] },
    { id: 'grounding', name: 'Grounding', levels: ['a', 'b', 'c', 'd'] },
    { id: 'tradeoffs', name: 'Trade-offs', levels: ['a', 'b', 'c', 'd'] },
    { id: 'cost', name: 'Cost and responsibility', levels: ['a', 'b', 'c', 'd'] },
  ],
};

const PROJECT: ProjectChunk = {
  title: 'Move the bakery to the cloud',
  facts: ['The bakery has two shops.'],
  rubric: RUBRIC,
  decisions: [
    { module: 1, title: 'Kitchen model', prompt: 'Pick a kitchen model.', context: [], keyPoints: [] },
    { module: 2, title: 'Oven rental', prompt: 'Pick how to rent ovens.', context: [], keyPoints: [] },
  ],
};

const DRAFT: AdrText = {
  context: 'The bakery opens a second shop. Mornings are busy.',
  options: '- Rent a [[shared-kitchen]]. It is ready now.\n- Build our own kitchen.',
  decision: 'Rent a shared kitchen | by the hour. We review it in May.',
  why: 'A [[shared-kitchen]] scales\u2014and [[per-minute-rental]] keeps costs low, e.g. at night. See https://calculator.aws/#/estimate?id=abc1 for details.',
  tradeoffs: 'Peak hours are busy. We book early.',
  cost: 'Estimate: https://calculator.aws/#/estimate?id=abc1. We pay per minute.',
};

describe('the export', () => {
  it('copies the sentence rule of scripts/content/lib/text.ts exactly', () => {
    expect(ABBREVIATIONS).toEqual(SCRIPT_ABBREVIATIONS);
    expect(SENTENCE_BREAK.source).toBe(SCRIPT_SENTENCE_BREAK.source);
    expect(SENTENCE_BREAK.flags).toBe(SCRIPT_SENTENCE_BREAK.flags);
    expect(FENCE.source).toBe(SCRIPT_FENCE.source);
    expect(FENCE.flags).toBe(SCRIPT_FENCE.flags);
  });

  it('splits sentences, replaces em dashes and keeps list markers, abbreviations and links', () => {
    expect(oneSentencePerLine('One. Two!  Three? four.')).toBe('One.\nTwo!\nThree? four.');
    expect(oneSentencePerLine('Fast\u2014cheap \u2014 good.')).toBe('Fast - cheap - good.');
    expect(oneSentencePerLine('Use e.g. Lambda. Then stop.')).toBe('Use e.g. Lambda.\nThen stop.');
    expect(oneSentencePerLine('1. Tag it. Then check.')).toBe('1. Tag it.\n   Then check.');
    expect(oneSentencePerLine('See [the A. Guide](https://x.example/a.b). Next.')).toBe(
      'See [the A. Guide](https://x.example/a.b).\nNext.',
    );
    expect(oneSentencePerLine('A\r\n\r\n\r\n\r\nB')).toBe('A\n\nB');
  });

  it('builds one sentence per line with no em dash, escaped cells and links kept', () => {
    const decisions = decisionsOf(
      timelineOf([
        ['2026-11-15T09:00:00.000Z', { t: 'decision', module: 1, stage: 'self', scores: [2, 2, 1, 2] }],
        [
          '2026-11-15T09:10:00.000Z',
          { t: 'decision', module: 1, stage: 'final', scores: [2, 3, 2, 2], keyPoints: [] },
        ],
      ]),
    );
    const text = planMarkdown({
      project: PROJECT,
      drafts: new Map([[1, DRAFT]]),
      decisions,
      concepts: CONCEPTS,
    });
    expect(PLAN_FILE).toBe('cafe-cloud-plan.md');
    expect(multiSentenceLines(text)).toEqual([]);
    expect(emDashLines(text)).toEqual([]);
    expect(text).toContain('https://calculator.aws/#/estimate?id=abc1');
    expect(text).toBe(
      [
        '# Move the bakery to the cloud',
        '',
        '| Module | Decision | Self | Final |',
        '|---|---|---|---|',
        '| 1 | Rent a shared kitchen \\| by the hour. | 7/12 | 9/12 |',
        '| 2 | Not written yet | - | - |',
        '',
        '## Decision 1: Kitchen model',
        '',
        '### Context',
        '',
        'The bakery opens a second shop.',
        'Mornings are busy.',
        '',
        '### Options considered',
        '',
        '- Rent a Shared kitchen.',
        '  It is ready now.',
        '- Build our own kitchen.',
        '',
        '### Decision',
        '',
        'Rent a shared kitchen | by the hour.',
        'We review it in May.',
        '',
        '### Why',
        '',
        'A Shared kitchen scales - and Per-minute rental keeps costs low, e.g. at night.',
        'See https://calculator.aws/#/estimate?id=abc1 for details.',
        '',
        '### Trade-offs and mitigation',
        '',
        'Peak hours are busy.',
        'We book early.',
        '',
        '### Cost note',
        '',
        'Estimate: https://calculator.aws/#/estimate?id=abc1.',
        'We pay per minute.',
        '',
        '## Decision 2: Oven rental',
        '',
        '### Context',
        '',
        'Not written yet.',
        '',
        '### Options considered',
        '',
        'Not written yet.',
        '',
        '### Decision',
        '',
        'Not written yet.',
        '',
        '### Why',
        '',
        'Not written yet.',
        '',
        '### Trade-offs and mitigation',
        '',
        'Not written yet.',
        '',
        '### Cost note',
        '',
        'Not written yet.',
        '',
      ].join('\n'),
    );
  });
});
