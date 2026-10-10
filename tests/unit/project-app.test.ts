import { describe, expect, it } from 'vitest';
import type { ConceptMeta } from '../../schemas/chunks.ts';
import type { DecisionView } from '../../schemas/project-view.ts';
import {
  cardLine,
  citationLine,
  conceptNames,
  decisionHref,
  EXPORT_PLAN,
  GRADE_GATE,
  gradeAnnouncement,
  insertCitation,
  liveTicks,
  NO_PROJECT,
  openCitation,
  PROJECT_HEADINGS,
  PROJECT_LEDE,
  passLine,
  READ_IN_NOTES,
  REVEAL_HEADING,
  revealRows,
  SAVE_FINAL,
  SAVE_SELF,
  SUGGESTION_LIMIT,
  signed,
  suggestions,
  TICK_LABEL,
  tickKeyPoint,
} from '../../src/app/project.ts';

/** Made-up bakery concepts, in the shape of the content index. */
const concept = (id: string, name: string, aliases: string[] = []): ConceptMeta => ({
  id,
  name,
  home: 'm01/what-a-bakery-cloud-is',
  anchor: 'ovens',
  tested: true,
  tasks: ['1.1'],
  confusableWith: [],
  aliases,
  splitFrom: null,
});
const CONCEPTS = conceptNames([
  concept('hired-oven', 'Hired oven', ['rented-oven']),
  concept('oven-timer', 'Oven timer'),
  concept('shared-kitchen', 'Shared kitchen'),
  concept('per-minute-rental', 'Per-minute rental'),
  concept('dough-proofing', 'Dough proofing'),
  concept('flour-store', 'Flour store'),
  concept('jam-shelf', 'Jam shelf'),
  concept('bread-van', 'Bread van'),
  concept('cake-stand', 'Cake stand'),
  concept('apron-rack', 'Apron rack'),
]);

const DECISION: DecisionView = {
  module: 3,
  title: 'Ovens for the morning rush',
  prompt: 'Choose how the bakery runs its ovens.',
  context: ['The bakery bakes for twelve shops.'],
  keyPoints: [
    {
      id: 'kp-03-hire-ovens',
      text: 'Hire ovens by the minute for the morning rush.',
      concepts: ['hired-oven', 'per-minute-rental'],
      read: { route: '#/m/01/l/what-a-bakery-cloud-is/ovens', text: 'A hired oven is paid by the minute.' },
    },
    {
      id: 'kp-03-share-kitchen',
      text: 'Share one kitchen between the shops.',
      concepts: ['shared-kitchen', 'gone-concept'],
      read: { route: '#/m/01/l/what-a-bakery-cloud-is/kitchen', text: 'One kitchen serves every shop.' },
    },
  ],
};
const NAMES = new Map(CONCEPTS.map((c) => [c.id, c.name] as const));

describe('capstone copy', () => {
  it('pins the fixed lines word for word', () => {
    expect(PROJECT_LEDE).toBe(
      'Thirteen decisions, one per module, each a short ADR graded against the rubric.',
    );
    expect(GRADE_GATE).toBe('Fill in every heading and cite at least 2 concepts before you grade.');
    expect([SAVE_SELF, SAVE_FINAL, EXPORT_PLAN]).toEqual([
      'Save self-grade',
      'Save final grade',
      'Export the plan',
    ]);
    expect([REVEAL_HEADING, TICK_LABEL, READ_IN_NOTES]).toEqual([
      'Reference key points',
      'I covered this',
      'Read in notes',
    ]);
    expect(PROJECT_HEADINGS).toEqual({
      brief: 'The brief',
      decisions: 'Decisions',
      rubric: 'Rubric',
      self: 'Self-grade',
      final: 'Final grade',
    });
    expect(NO_PROJECT).toBe('The capstone brief is not in this build yet.');
    expect(passLine(8)).toBe('A decision passes at 8 of 12 or more, with no criterion at 0.');
    expect(decisionHref(3)).toBe('#/project/03');
    expect(decisionHref(13)).toBe('#/project/13');
  });

  it('writes a card line for every stage', () => {
    const base = { module: 3, open: 'Sun 15 Nov', draft: false, self: null, final: null };
    expect(cardLine('locked', base)).toBe('Opens after you read every lesson of Module 3.');
    expect(cardLine('waiting', base)).toBe('Opens after your exam, on Sun 15 Nov.');
    expect(cardLine('open', base)).toBe('Not started');
    expect(cardLine('open', { ...base, draft: true })).toBe('Draft saved');
    expect(cardLine('self', { ...base, draft: true, self: 7 })).toBe(
      'Self-graded 7/12; reveal the key points',
    );
    expect(cardLine('done', { ...base, self: 7, final: 9 })).toBe('Final 9/12, drift +2');
    expect(cardLine('done', { ...base, self: 9, final: 7 })).toBe('Final 7/12, drift -2');
    expect(cardLine('done', { ...base, self: 8, final: 8 })).toBe('Final 8/12, drift 0');
  });

  it('signs a drift with a plain hyphen for minus', () => {
    expect([signed(2), signed(0), signed(-3)]).toEqual(['+2', '0', '-3']);
  });

  it('counts citations and names every unknown token as typed', () => {
    expect(citationLine({ ids: [], unknown: [] })).toEqual([
      'Cite at least 2 concepts, as [[Concept name]].',
    ]);
    expect(citationLine({ ids: ['hired-oven'], unknown: [] })).toEqual(['1 concept cited; cite at least 2.']);
    expect(citationLine({ ids: ['hired-oven', 'oven-timer'], unknown: ['Bread oven'] })).toEqual([
      '2 concepts cited.',
      'Not a concept: Bread oven.',
    ]);
    expect(citationLine({ ids: ['a', 'b', 'c'], unknown: ['x', 'y'] })).toEqual([
      '3 concepts cited.',
      'Not a concept: x.',
      'Not a concept: y.',
    ]);
  });

  it('announces each saved grade', () => {
    expect(gradeAnnouncement('self', 7, null)).toBe('Self-grade saved: 7 of 12.');
    expect(gradeAnnouncement('final', 9, 2)).toBe('Final grade saved: 9 of 12. Drift +2.');
    expect(gradeAnnouncement('final', 6, -1)).toBe('Final grade saved: 6 of 12. Drift -1.');
  });
});

describe('concept suggestions', () => {
  it('ranks title prefixes before word prefixes and caps the list at 8', () => {
    expect(suggestions('ov', CONCEPTS).map((c) => c.name)).toEqual(['Oven timer', 'Hired oven']);
    expect(suggestions('tim', CONCEPTS).map((c) => c.name)).toEqual(['Oven timer']);
    const ovens = conceptNames(Array.from({ length: 10 }, (_, i) => concept(`oven-${i}`, `Oven ${i}`)));
    expect(suggestions('oven', ovens)).toHaveLength(SUGGESTION_LIMIT);
    expect(SUGGESTION_LIMIT).toBe(8);
  });

  it('finds a concept by an alias it keeps from a rename', () => {
    expect(suggestions('rented', CONCEPTS).map((c) => c.id)).toEqual(['hired-oven']);
  });

  it('lists the first 8 names alphabetically for an empty query', () => {
    expect(suggestions('', CONCEPTS).map((c) => c.name)).toEqual([
      'Apron rack',
      'Bread van',
      'Cake stand',
      'Dough proofing',
      'Flour store',
      'Hired oven',
      'Jam shelf',
      'Oven timer',
    ]);
  });

  it('finds the open [[ before the caret and inserts the picked name', () => {
    const text = 'We pick [[ov because mornings peak.';
    const open = openCitation(text, 'We pick [[ov'.length);
    expect(open).toEqual({ start: 8, query: 'ov' });
    expect(openCitation('Done [[Oven timer]] here', 24)).toBeNull();
    expect(openCitation('No token here', 5)).toBeNull();
    expect(openCitation('[[a\nb', 5)).toBeNull();
    if (open === null) throw new Error('expected an open citation');
    expect(insertCitation(text, 'We pick [[ov'.length, open, 'Oven timer')).toEqual({
      text: 'We pick [[Oven timer]] because mornings peak.',
      caret: 'We pick [[Oven timer]]'.length,
    });
    expect(insertCitation('A [[ov]] b', 6, { start: 2, query: 'ov' }, 'Oven timer')).toEqual({
      text: 'A [[Oven timer]] b',
      caret: 16,
    });
  });
});

describe('the reveal', () => {
  it('shows each live key point with its concept names and its evidence quote, never a raw id', () => {
    expect(revealRows(DECISION, ['kp-03-share-kitchen'], NAMES)).toEqual([
      {
        id: 'kp-03-hire-ovens',
        text: 'Hire ovens by the minute for the morning rush.',
        concepts: 'Concepts: Hired oven, Per-minute rental',
        quote: 'A hired oven is paid by the minute.',
        route: '#/m/01/l/what-a-bakery-cloud-is/ovens',
        ticked: false,
      },
      {
        id: 'kp-03-share-kitchen',
        text: 'Share one kitchen between the shops.',
        concepts: 'Concepts: Shared kitchen',
        quote: 'One kitchen serves every shop.',
        route: '#/m/01/l/what-a-bakery-cloud-is/kitchen',
        ticked: true,
      },
    ]);
  });

  it('skips a ticked key point id it does not know without throwing, and keeps it in the draft', () => {
    const ticks = ['kp-03-retired', 'kp-03-hire-ovens'];
    expect(revealRows(DECISION, ticks, NAMES).map((r) => r.ticked)).toEqual([true, false]);
    expect(liveTicks(DECISION, ticks)).toEqual(['kp-03-hire-ovens']);
    expect(tickKeyPoint(ticks, 'kp-03-share-kitchen', true)).toEqual([
      'kp-03-retired',
      'kp-03-hire-ovens',
      'kp-03-share-kitchen',
    ]);
    expect(tickKeyPoint(ticks, 'kp-03-hire-ovens', false)).toEqual(['kp-03-retired']);
    expect(tickKeyPoint(ticks, 'kp-03-hire-ovens', true)).toEqual(ticks);
  });

  it('gives final ticks in key point order', () => {
    expect(liveTicks(DECISION, ['kp-03-share-kitchen', 'kp-03-hire-ovens'])).toEqual([
      'kp-03-hire-ovens',
      'kp-03-share-kitchen',
    ]);
  });
});
