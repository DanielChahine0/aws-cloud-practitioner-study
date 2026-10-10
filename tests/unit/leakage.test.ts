import { describe, expect, it } from 'vitest';
import { bossDraw } from '../../src/engine/boss.ts';
import { selectLightning } from '../../src/engine/lightning.ts';
import { derive, type Progress, practiceForms, takenForms } from '../../src/engine/replay.ts';
import {
  type ExamPoolQuestion,
  learnPool,
  type PoolQuestion,
  relearnVariant,
  selectCheck,
  selectQuiz,
} from '../../src/engine/select.ts';
import { eventsOf, SID } from '../fixtures/events.ts';
import { abandonOf, examStartOf, submitOf } from '../fixtures/memory.ts';

/**
 * The leakage test (spec 4.3 and 9, an exit criterion of Phase 3): no learn-mode selector ever returns an item
 * of a form whose mock has not started, nor of a form whose mock is still open. Made-up bakery pools: 2 modules of 6 concepts, and 4 forms of 12 items
 * on the same concepts.
 */
const concepts = (m: number) => Array.from({ length: 6 }, (_, i) => `bake-0${m}-0${i + 1}`);
const PRACTICE: PoolQuestion[] = [1, 2].flatMap((m) =>
  concepts(m).flatMap((concept, i) =>
    [1, 2].map((v) => ({
      id: `q-${concept}-${v}`,
      concept,
      note: `m0${m}/lesson-${(i % 2) + 1}`,
      type: 'single' as const,
      module: m,
    })),
  ),
);
const EXAM: ExamPoolQuestion[] = ['A', 'B', 'C', 'D'].flatMap((form) =>
  [1, 2].flatMap((m) =>
    concepts(m).map((concept, i) => ({
      id: `x${form.toLowerCase()}-${concept}`,
      concept,
      note: `m0${m}/lesson-${(i % 2) + 1}`,
      type: 'multi' as const,
      module: m,
      form,
    })),
  ),
);
const ALL_CONCEPTS = [...concepts(1), ...concepts(2)];

/** Every learn-mode selection over the learn pool of `progress`, for a few seeds. */
function everySelection(progress: Progress): string[] {
  const pool = learnPool(PRACTICE, EXAM, practiceForms(progress));
  const out: string[] = [];
  for (let seed = 0; seed < 25; seed++) {
    out.push(
      ...selectCheck({ concepts: concepts(1), pool: pool.filter((q) => q.module === 1), progress, seed }),
    );
    out.push(...selectQuiz({ pool, progress, seed, recall: () => 0.3 }));
    out.push(...selectQuiz({ pool, progress, seed, size: 10, recall: () => 0.3 }));
    out.push(...selectCheck({ concepts: ALL_CONCEPTS, pool, progress, seed }));
    for (const concept of ALL_CONCEPTS) {
      const variant = relearnVariant({ concept, avoid: `q-${concept}-1`, pool, seed });
      if (variant !== null) out.push(variant);
    }
    out.push(
      ...bossDraw({
        module: 2,
        pool,
        lessons: ['m02/lesson-1', 'm02/lesson-2'],
        progress,
        recall: () => 0.3,
        studied: () => true,
        now: new Date('2026-10-27T10:00:00.000Z'),
        seed,
      }),
    );
  }
  return out;
}
const MOCK_A = examStartOf(SID, 'mock', ['xa-bake-01-01'], {
  form: 'A',
  deadline: '2026-10-27T11:30:00.000Z',
});
const formOf = (id: string) => (id.startsWith('x') ? id.slice(1, 2).toUpperCase() : null);

describe('leakage (spec 4.3)', () => {
  it('never returns an exam item from any learn-mode selector while no form is taken', () => {
    const picked = everySelection(derive([], null));
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.filter((id) => formOf(id) !== null)).toEqual([]);
  });

  it('never returns a Form A item while Mock A is still open', () => {
    const progress = derive(eventsOf(MOCK_A), null);
    const picked = everySelection(progress);
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.filter((id) => formOf(id) !== null)).toEqual([]);
  });

  it('lets only Form A items in once Mock A is submitted or abandoned', () => {
    for (const close of [submitOf(SID, 'mock'), abandonOf(SID, 'mock')]) {
      const forms = new Set(everySelection(derive(eventsOf(MOCK_A, close), null)).map(formOf));
      expect(forms.has('A')).toBe(true);
      expect([...forms].filter((f) => f !== null && f !== 'A')).toEqual([]);
    }
  });

  it('a form counts as taken once its mock starts', () => {
    const started = eventsOf(
      examStartOf(SID, 'mock', ['xb-bake-01-01'], { form: 'B', deadline: '2026-10-27T11:30:00.000Z' }),
    );
    expect([...takenForms(derive([], null))]).toEqual([]);
    expect([...takenForms(derive(started, null))]).toEqual(['B']);
    const remix = eventsOf(
      examStartOf(SID, 'mock', ['xb-bake-01-01'], { form: 'remix', deadline: '2026-10-27T11:30:00.000Z' }),
    );
    expect([...takenForms(derive(remix, null))]).toEqual([]);
  });
});

describe('leakage of the lightning round (spec 4.1)', () => {
  /** The same forms with single items, which the round's type filter alone would let through. */
  const SINGLE_EXAM = EXAM.map((q) => ({ ...q, type: 'single' as const }));

  // `learnPool` drops the `form` field of the taken forms it lets in, so the round takes the practice pool
  // (`practicePoolOf`) only; here exam items of every form sit beside it with their form, taken or not.
  it('never returns an untaken-form or a taken-form exam item, for any seed', () => {
    const logs = [[], eventsOf(MOCK_A), eventsOf(MOCK_A, submitOf(SID, 'mock'))];
    for (const log of logs) {
      const progress = derive(log, null);
      const pool = [...SINGLE_EXAM, ...PRACTICE];
      for (let seed = 0; seed < 25; seed++) {
        const picked = selectLightning({ pool, concepts: ALL_CONCEPTS, progress, seed });
        expect(picked.length).toBeGreaterThan(0);
        expect(picked.filter((id) => formOf(id) !== null)).toEqual([]);
      }
    }
  });
});
