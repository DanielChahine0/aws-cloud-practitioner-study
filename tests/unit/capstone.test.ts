import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import type { AdrText } from '../../schemas/project-view.ts';
import {
  type ConceptName,
  canSelfGrade,
  citationsOf,
  citedText,
  decisionDrift,
  decisionStage,
  decisionsOf,
  driftOf,
  MIN_CITATIONS,
  openDay,
  scoreTotal,
  toShown,
  toStored,
} from '../../src/engine/capstone.ts';
import { timelineOf } from '../fixtures/events.ts';

function grade(
  module: number,
  stage: 'self' | 'final',
  scores: [number, number, number, number],
  keyPoints?: string[],
): NewEvent {
  return { t: 'decision', module, stage, scores, ...(keyPoints === undefined ? {} : { keyPoints }) };
}

const CONCEPTS: ConceptName[] = [
  { id: 'shared-kitchen', name: 'Shared kitchen', aliases: ['communal-kitchen'] },
  { id: 'per-minute-rental', name: 'Per-minute rental', aliases: [] },
  { id: 'oven-zones', name: 'Oven zones', aliases: [] },
];

const WRITTEN: AdrText = {
  context: 'The bakery opens a second shop.',
  options: 'Rent a shared kitchen.\nBuild our own kitchen.',
  decision: 'Rent a shared kitchen.',
  why: 'A [[shared-kitchen]] scales with orders and [[per-minute-rental]] keeps costs low.',
  tradeoffs: 'Peak hours are busy; we book early.',
  cost: 'We pay per minute.',
};

describe('decisionsOf', () => {
  it('keeps the first self and the first final after it, by event id', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', grade(2, 'final', [3, 3, 3, 3])],
      ['2026-11-15T10:00:00.000Z', grade(2, 'self', [1, 2, 2, 1])],
      ['2026-11-15T11:00:00.000Z', grade(2, 'self', [3, 3, 3, 3])],
      ['2026-11-15T12:00:00.000Z', grade(2, 'final', [2, 2, 2, 2], ['kp-02-burst'])],
      ['2026-11-16T12:00:00.000Z', grade(2, 'final', [0, 0, 0, 0])],
    ]);
    const record = decisionsOf([...log].reverse()).get(2);
    expect(record?.self).toEqual({ scores: [1, 2, 2, 1], at: '2026-11-15T10:00:00.000Z', day: '2026-11-15' });
    expect(record?.final).toEqual({
      scores: [2, 2, 2, 2],
      keyPoints: ['kp-02-burst'],
      at: '2026-11-15T12:00:00.000Z',
      day: '2026-11-15',
    });
  });

  it('ignores a final with no self before it', () => {
    const log = timelineOf([['2026-11-15T09:00:00.000Z', grade(4, 'final', [3, 3, 3, 3])]]);
    expect(decisionsOf(log).get(4)).toBeUndefined();
  });

  it('keeps key point ids it does not know', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', grade(1, 'self', [1, 1, 1, 1])],
      ['2026-11-15T09:05:00.000Z', grade(1, 'final', [2, 2, 2, 2], ['kp-01-gone', 'not-an-id'])],
    ]);
    expect(decisionsOf(log).get(1)?.final?.keyPoints).toEqual(['kp-01-gone', 'not-an-id']);
  });

  it('reads only decision events', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', { t: 'lesson.done', note: 'm01/what-a-bakery-cloud-is' }],
      ['2026-11-15T09:05:00.000Z', { t: 'mission', mission: 'mission-00', step: 'start' }],
    ]);
    expect(decisionsOf(log).size).toBe(0);
  });
});

describe('drift', () => {
  it('is final total minus self total, and null until both exist', () => {
    expect(scoreTotal([1, 2, 3, 0])).toBe(6);
    const self = { scores: [1, 1, 2, 2] as const, at: '', day: '' };
    expect(decisionDrift({ self, final: null })).toBeNull();
    expect(decisionDrift({ self, final: { ...self, scores: [2, 2, 2, 3], keyPoints: [] } })).toBe(3);
  });

  it('sums only decisions with both grades', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', grade(1, 'self', [1, 1, 1, 1])],
      ['2026-11-15T09:05:00.000Z', grade(1, 'final', [2, 2, 1, 1])],
      ['2026-11-15T10:00:00.000Z', grade(2, 'self', [3, 3, 3, 3])],
      ['2026-11-15T10:05:00.000Z', grade(2, 'final', [2, 3, 3, 3])],
      ['2026-11-15T11:00:00.000Z', grade(3, 'self', [0, 0, 0, 0])],
    ]);
    expect(driftOf(decisionsOf(log))).toEqual({ decisions: 2, total: 1 });
    expect(driftOf(new Map())).toEqual({ decisions: 0, total: 0 });
  });
});

describe('decisionStage', () => {
  const base = { lessonsRead: true, examDate: '2026-11-14', record: undefined };

  it('waits through the exam day and opens the study day after it', () => {
    expect(openDay('2026-11-14')).toBe('2026-11-15');
    expect(decisionStage({ ...base, today: '2026-11-14' })).toBe('waiting');
    expect(decisionStage({ ...base, today: '2026-11-15' })).toBe('open');
  });

  it('stays locked until the module is read', () => {
    expect(decisionStage({ ...base, lessonsRead: false, today: '2026-11-20' })).toBe('locked');
    expect(decisionStage({ ...base, lessonsRead: false, today: '2026-10-20' })).toBe('locked');
  });

  it('moves the opening with the exam date', () => {
    expect(decisionStage({ ...base, examDate: '2026-11-28', today: '2026-11-15' })).toBe('waiting');
    expect(decisionStage({ ...base, examDate: '2026-11-28', today: '2026-11-29' })).toBe('open');
  });

  it('keeps a graded decision self or done when the exam moves later', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', grade(5, 'self', [2, 2, 2, 2])],
      ['2026-11-15T10:00:00.000Z', grade(6, 'self', [2, 2, 2, 2])],
      ['2026-11-15T10:05:00.000Z', grade(6, 'final', [3, 2, 2, 2])],
    ]);
    const decisions = decisionsOf(log);
    const later = { lessonsRead: false, today: '2026-11-15', examDate: '2026-12-12' };
    expect(decisionStage({ ...later, record: decisions.get(5) })).toBe('self');
    expect(decisionStage({ ...later, record: decisions.get(6) })).toBe('done');
  });
});

describe('citations', () => {
  it('counts distinct canonical ids, an alias once with its concept', () => {
    const stored = 'See [[shared-kitchen]], [[communal-kitchen]] and [[per-minute-rental]].';
    expect(citationsOf(stored, CONCEPTS)).toEqual({
      ids: ['shared-kitchen', 'per-minute-rental'],
      unknown: [],
    });
  });

  it('lists unknown tokens by the text typed and never throws', () => {
    const stored =
      'Both [[Flour silo]] and [[flour-silo]] and [[Flour silo]] and [[ ]] and [[shared-kitchen]].';
    expect(citationsOf(stored, CONCEPTS)).toEqual({
      ids: ['shared-kitchen'],
      unknown: ['Flour silo', 'flour-silo'],
    });
    expect(citationsOf('a half [[token and [[]] here', CONCEPTS)).toEqual({ ids: [], unknown: [] });
  });

  it('round-trips display names through stored ids, and follows a rename', () => {
    const shown = 'Pick [[Shared kitchen]] over [[oven zones]]; keep [[Flour silo]].';
    const stored = toStored(shown, CONCEPTS);
    expect(stored).toBe('Pick [[shared-kitchen]] over [[oven-zones]]; keep [[Flour silo]].');
    expect(toShown(stored, CONCEPTS)).toBe(
      'Pick [[Shared kitchen]] over [[Oven zones]]; keep [[Flour silo]].',
    );
    const renamed = CONCEPTS.map((c) => (c.id === 'shared-kitchen' ? { ...c, name: 'Kitchen share' } : c));
    expect(toShown(stored, renamed)).toBe('Pick [[Kitchen share]] over [[Oven zones]]; keep [[Flour silo]].');
    expect(toShown('Old [[communal-kitchen]].', CONCEPTS)).toBe('Old [[Shared kitchen]].');
  });

  it('reads citations as plain names for the export', () => {
    expect(citedText('A [[shared-kitchen]] and [[Flour silo]].', CONCEPTS)).toBe(
      'A Shared kitchen and Flour silo.',
    );
  });
});

describe('canSelfGrade', () => {
  it('needs every heading and two distinct known citations in Why', () => {
    expect(MIN_CITATIONS).toBe(2);
    expect(canSelfGrade(WRITTEN, CONCEPTS)).toBe(true);
    expect(canSelfGrade({ ...WRITTEN, cost: '  ' }, CONCEPTS)).toBe(false);
    expect(canSelfGrade({ ...WRITTEN, why: '[[shared-kitchen]] and [[communal-kitchen]].' }, CONCEPTS)).toBe(
      false,
    );
    expect(canSelfGrade({ ...WRITTEN, why: '[[shared-kitchen]] and [[Flour silo]].' }, CONCEPTS)).toBe(false);
  });
});
