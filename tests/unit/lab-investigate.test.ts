import { describe, expect, it } from 'vitest';
import { InvestigateAction, InvestigateSpec } from '../../schemas/lab-investigate.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { type AnyLabEngine, checkLab, type EngineEntry } from '../../src/labs/engines.ts';
import {
  filterValues,
  INVESTIGATE,
  type InvestigateState,
  investigateComplete,
  investigateGoals,
  visibleRecords,
} from '../../src/labs/investigate/model.ts';
import {
  bakeryInvestigateLab,
  INVESTIGATE_LISTING_SPEC,
  INVESTIGATE_SPEC,
} from '../fixtures/lab-investigate.ts';

const lab = bakeryInvestigateLab();
const spec = InvestigateSpec.parse(lab.spec);
const run = (actions: readonly unknown[]): InvestigateState =>
  replayLab(INVESTIGATE, spec, actions as never[]);
const words = (state: InvestigateState) =>
  INVESTIGATE.check(spec, state).map((r) => [r.goalId, r.pass, r.message]);
const shown = (actions: readonly unknown[]): string[] => visibleRecords(spec, run(actions)).map((r) => r.id);
const answer = (question: string, option: string) => ({ t: 'answer', question, option });
const filter = (column: string, value: string) => ({ t: 'filter', column, value });

/** The one element a fixture list must have at `i`. */
function at<T>(list: readonly T[], i: number): T {
  const item = list[i];
  if (item === undefined) throw new Error(`the fixture has no element ${i}`);
  return item;
}

/** Every issue of a spec as `path: message`, or none when it parses. */
function issues(value: unknown): string[] {
  const r = InvestigateSpec.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('Investigate spec schema (spec 5.1)', () => {
  it('accepts the pantry ledger and the recipe card listing', () => {
    expect(issues(INVESTIGATE_SPEC)).toEqual([]);
    expect(issues(INVESTIGATE_LISTING_SPEC)).toEqual([]);
  });

  it('defaults a column to no filter and a listing to no columns or records', () => {
    const { columns, records, ...bare } = INVESTIGATE_LISTING_SPEC;
    const parsed = InvestigateSpec.parse(bare);
    expect([parsed.columns, parsed.records]).toEqual([[], []]);
    const plain = InvestigateSpec.parse({
      ...INVESTIGATE_SPEC,
      columns: INVESTIGATE_SPEC.columns.map(({ filter, ...c }) => c),
    });
    expect(plain.columns.every((c) => c.filter === false)).toBe(true);
  });

  const r1 = at(INVESTIGATE_SPEC.records, 0);
  const otherRecords = INVESTIGATE_SPEC.records.slice(1);
  const who = at(INVESTIGATE_SPEC.questions, 0);
  const otherQuestions = INVESTIGATE_SPEC.questions.slice(1);
  const { listing: _listing, ...listingless } = INVESTIGATE_LISTING_SPEC;
  const { item: _item, ...cellsWithoutItem } = r1.cells;

  it.each([
    ['nothing to read', listingless, ': needs records or a listing'],
    ['records without columns', { ...INVESTIGATE_SPEC, columns: [] }, 'columns: records need columns'],
    [
      'a repeated column',
      { ...INVESTIGATE_SPEC, columns: [...INVESTIGATE_SPEC.columns, { id: 'who', label: 'Who again' }] },
      'columns.5.id: column who is used twice',
    ],
    [
      'a repeated record',
      { ...INVESTIGATE_SPEC, records: [...INVESTIGATE_SPEC.records, r1] },
      'records.8.id: record r1 is used twice',
    ],
    [
      'a record without a cell for a column',
      { ...INVESTIGATE_SPEC, records: [{ ...r1, cells: cellsWithoutItem }, ...otherRecords] },
      'records.0.cells: record r1 has no cell for column item',
    ],
    [
      'a cell of no column',
      {
        ...INVESTIGATE_SPEC,
        records: [{ ...r1, cells: { ...r1.cells, oven: 'Deck oven' } }, ...otherRecords],
      },
      'records.0.cells.oven: names no column: oven',
    ],
    [
      'a repeated question',
      { ...INVESTIGATE_SPEC, questions: [...INVESTIGATE_SPEC.questions, who] },
      'questions.3.id: question who is used twice',
    ],
    [
      'a repeated option',
      {
        ...INVESTIGATE_SPEC,
        questions: [
          { ...who, options: [...who.options, { id: 'mara', label: 'Mara again' }] },
          ...otherQuestions,
        ],
      },
      'questions.0.options.3.id: option mara is used twice',
    ],
    [
      'an answer that is not an option',
      { ...INVESTIGATE_SPEC, questions: [{ ...who, answer: 'olek' }, ...otherQuestions] },
      'questions.0.answer: names no option: olek',
    ],
    [
      'a filter column with no records',
      { ...INVESTIGATE_LISTING_SPEC, columns: [{ id: 'step', label: 'Step', filter: true }] },
      'columns.0.filter: a filter column needs records',
    ],
  ])('rejects %s with its message and path', (_, value, issue) => {
    expect(issues(value)).toEqual([issue]);
  });

  it('parses filter, unfilter, answer and reset actions only', () => {
    expect(InvestigateAction.safeParse(filter('who', 'Ines')).success).toBe(true);
    expect(InvestigateAction.safeParse({ t: 'unfilter', column: 'who' }).success).toBe(true);
    expect(InvestigateAction.safeParse(answer('who', 'ines')).success).toBe(true);
    expect(InvestigateAction.safeParse({ t: 'reset' }).success).toBe(true);
    expect(InvestigateAction.safeParse(filter('who', '')).success).toBe(false);
    expect(InvestigateAction.safeParse({ t: 'clear' }).success).toBe(false);
  });
});

describe('the Investigate checker (spec 5.1, 9)', () => {
  it('starts with no filter and no answer, knows each filter value and fails every goal', () => {
    const start = INVESTIGATE.init(spec);
    expect(start.filterable).toEqual({
      who: ['Mara', 'Tobin', 'Ines'],
      event: ['Open pantry', 'Take out', 'Throw away', 'Count stock'],
      result: ['Done', 'Refused'],
    });
    expect([start.filters, start.answers]).toEqual([{}, {}]);
    expect(investigateGoals(spec)).toEqual(['g1', 'g2']);
    expect(words(start)).toEqual([
      ['g1', false, '0 of 2 right'],
      ['g2', false, '0 of 1 right'],
    ]);
    expect(visibleRecords(spec, start)).toEqual(spec.records);
  });

  it('passes every goal with the solution, and each wrong path fails only its goal', () => {
    expect(words(run(lab.solution))).toEqual([
      ['g1', true, '2 of 2 right'],
      ['g2', true, '1 of 1 right'],
    ]);
    for (const path of lab.wrongPaths) {
      const state = run(path.actions);
      expect(investigateComplete(spec, state)).toBe(true);
      const failed = INVESTIGATE.check(spec, state).filter((r) => !r.pass);
      expect(failed.map((r) => r.goalId)).toEqual([path.failsGoal]);
    }
  });

  it('lists the distinct values of a column in first-seen order', () => {
    expect(filterValues(spec, 'event')).toEqual(['Open pantry', 'Take out', 'Throw away', 'Count stock']);
    expect(filterValues(spec, 'oven')).toEqual([]);
  });

  it.each([
    ['one filter', [filter('who', 'Tobin')], ['r3', 'r4', 'r8']],
    ['two filters', [filter('who', 'Tobin'), filter('event', 'Throw away')], ['r4']],
    [
      'a filter then unfilter',
      [filter('who', 'Tobin'), filter('event', 'Throw away'), { t: 'unfilter', column: 'who' }],
      ['r4', 'r6'],
    ],
    ['a changed filter value', [filter('who', 'Tobin'), filter('who', 'Ines')], ['r5', 'r6']],
    ['a filter that leaves no record', [filter('who', 'Mara'), filter('result', 'Refused')], []],
  ])('shows the records of %s', (_, actions, ids) => {
    expect(shown(actions)).toEqual(ids);
  });

  it.each([
    ['a value of another column', filter('who', 'Throw away')],
    ['a column without a filter', filter('time', '06:02 UTC')],
    ['an unknown column', filter('oven', 'Mara')],
    ['an unfilter with no filter on', { t: 'unfilter', column: 'who' }],
    ['an unknown question', answer('why', 'ines')],
    ['an option of another question', answer('who', 'throw-away')],
    ['a reset of a fresh board', { t: 'reset' }],
    ['an unknown action', { t: 'place', card: 'who', bucket: 'ines' }],
    ['a value that is not an object', 'answer'],
    ['null', null],
  ])('ignores %s and returns the same state object', (_, action) => {
    const start = INVESTIGATE.init(spec);
    expect(INVESTIGATE.reduce(start, action as never)).toBe(start);
  });

  it('returns the same state object for a filter or an answer that changes nothing', () => {
    const filtered = run([filter('who', 'Ines')]);
    expect(INVESTIGATE.reduce(filtered, filter('who', 'Ines') as never)).toBe(filtered);
    const answered = run([answer('who', 'ines')]);
    expect(INVESTIGATE.reduce(answered, answer('who', 'ines') as never)).toBe(answered);
  });

  it('checks exact answers: a wrong when fails only its goal, and changing it back passes again', () => {
    const right = [answer('who', 'ines'), answer('what', 'throw-away'), answer('when', 'at-0732')];
    expect(words(run([...right, answer('when', 'at-0705')]))).toEqual([
      ['g1', true, '2 of 2 right'],
      ['g2', false, '0 of 1 right'],
    ]);
    expect(
      allPass(INVESTIGATE.check(spec, run([...right, answer('when', 'at-0705'), answer('when', 'at-0732')]))),
    ).toBe(true);
    expect(words(run([answer('who', 'mara'), answer('what', 'throw-away')]))).toEqual([
      ['g1', false, '1 of 2 right'],
      ['g2', false, '0 of 1 right'],
    ]);
  });

  it('never changes a check because of the filters', () => {
    const answers = [answer('who', 'tobin'), answer('when', 'at-0732')];
    const filters = [filter('who', 'Mara'), filter('result', 'Refused'), { t: 'unfilter', column: 'who' }];
    expect(INVESTIGATE.check(spec, run([...filters, ...answers]))).toEqual(
      INVESTIGATE.check(spec, run(answers)),
    );
    expect(INVESTIGATE.check(spec, run([...answers, ...filters]))).toEqual(
      INVESTIGATE.check(spec, run(answers)),
    );
  });

  it('is complete only once every question has an answer', () => {
    expect(investigateComplete(spec, INVESTIGATE.init(spec))).toBe(false);
    expect(investigateComplete(spec, run([answer('who', 'ines'), answer('what', 'take-out')]))).toBe(false);
    expect(investigateComplete(spec, run(at(lab.wrongPaths, 0).actions))).toBe(true);
  });

  it('reset clears every filter and answer', () => {
    expect(run([...lab.solution, { t: 'reset' }])).toEqual(INVESTIGATE.init(spec));
  });

  it('checks the same through a registry entry built like Task 4 adds it', () => {
    const entry: EngineEntry = {
      engine: INVESTIGATE as unknown as AnyLabEngine,
      settle: [],
      complete: (s, state) => investigateComplete(s as InvestigateSpec, state as InvestigateState),
    };
    const state = run(at(lab.wrongPaths, 1).actions);
    expect(checkLab(entry, spec, state)).toEqual(INVESTIGATE.check(spec, state));
    expect(entry.complete(spec, INVESTIGATE.init(spec))).toBe(false);
  });

  it('reads a listing with no records and checks its one question', () => {
    const listing = InvestigateSpec.parse(INVESTIGATE_LISTING_SPEC);
    const start = INVESTIGATE.init(listing);
    expect(start.filterable).toEqual({});
    expect(visibleRecords(listing, start)).toEqual([]);
    const done = INVESTIGATE.reduce(start, answer('proof', 'two-hours') as never);
    expect(INVESTIGATE.check(listing, done)).toEqual([{ goalId: 'g1', pass: true, message: '1 of 1 right' }]);
  });

  it('hints in one sentence about the answers of a goal', () => {
    const start = INVESTIGATE.init(spec);
    expect(INVESTIGATE.hint(spec, start, 'g1')).toBe('2 questions still unanswered.');
    expect(INVESTIGATE.hint(spec, start, 'g2')).toBe('1 question still unanswered.');
    expect(INVESTIGATE.hint(spec, run([answer('who', 'tobin')]), 'g1')).toBe(
      '1 question still unanswered and 1 answer wrong.',
    );
    expect(INVESTIGATE.hint(spec, run([answer('who', 'tobin'), answer('what', 'take-out')]), 'g1')).toBe(
      '2 answers wrong.',
    );
    expect(INVESTIGATE.hint(spec, run(lab.solution), 'g1')).toBe('Every answer of this goal is right.');
  });
});
