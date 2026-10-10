import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bossDraw } from '../../src/engine/boss.ts';
import { derive, practiceForms, takenForms } from '../../src/engine/replay.ts';
import {
  type ExamPoolQuestion,
  learnPool,
  type PoolQuestion,
  relearnVariant,
  selectCheck,
  selectQuiz,
} from '../../src/engine/select.ts';
import { eventLogArb } from './arbitraries.ts';

/**
 * For any log and seed, no learn-mode selector returns an item of a form whose mock never started, nor of a form
 * whose mock is still open (spec 4.3).
 */
const CONCEPTS = ['shared-kitchen', 'per-minute-rental'];
const PRACTICE: PoolQuestion[] = ['q-aaaaaa', 'q-bbbbbb', 'q-cccccc'].map((id, i) => ({
  id,
  concept: CONCEPTS[i % 2] as string,
  note: 'm01/a',
  type: 'single',
  module: 1,
}));
const EXAM: ExamPoolQuestion[] = ['A', 'B', 'C', 'D'].flatMap((form) =>
  CONCEPTS.map((concept) => ({
    id: `x-${form}-${concept}`,
    concept,
    note: 'm01/a',
    type: 'single' as const,
    module: 1,
    form,
  })),
);

describe('leakage property (spec 4.3)', () => {
  it('never selects an item of an untaken or open form, whatever the log and seed', () => {
    fc.assert(
      fc.property(eventLogArb, fc.nat(), (events, seed) => {
        const progress = derive(events, null);
        const taken = takenForms(progress);
        const open = new Set(
          [...progress.sessions.values()]
            .filter((s) => s.mode === 'mock' && s.submittedAt === null && !s.abandoned)
            .map((s) => s.form),
        );
        const pool = learnPool(PRACTICE, EXAM, practiceForms(progress));
        const picked = [
          ...selectCheck({ concepts: CONCEPTS, pool, progress, seed }),
          ...selectQuiz({ pool, progress, seed, recall: () => 0.5 }),
          ...selectQuiz({ pool, progress, seed, size: 10, recall: () => 0.5 }),
          ...CONCEPTS.flatMap((concept) => relearnVariant({ concept, avoid: 'q-aaaaaa', pool, seed }) ?? []),
          ...bossDraw({
            module: 1,
            pool,
            lessons: ['m01/a'],
            progress,
            recall: () => 0.5,
            studied: () => true,
            now: new Date('2026-10-27T10:00:00.000Z'),
            seed,
          }),
        ];
        for (const id of picked) {
          const item = EXAM.find((x) => x.id === id);
          if (item) {
            expect(taken.has(item.form)).toBe(true);
            expect(open.has(item.form)).toBe(false);
          }
        }
      }),
    );
  });
});
