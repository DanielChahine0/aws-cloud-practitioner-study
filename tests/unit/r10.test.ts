import { describe, expect, it } from 'vitest';
import type { SingleQuestion } from '../../schemas/question.ts';
import type { ValidateConfig } from '../../schemas/validate-config.ts';
import { type Context, loadContext, type QuestionEntry } from '../../scripts/content/lib/context.ts';
import { r10 } from '../../scripts/content/rules/r10-coverage.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import {
  fixtureQuotas,
  matchQuestion,
  multiQuestion,
  POOL_FILE,
  QUESTION_FILE,
  singleQuestion,
} from '../fixtures/questions.ts';

const BLUEPRINT = 'content/exam/blueprint.yaml';
const OFF: ValidateConfig = {
  rules: ['R10'],
  practicePerConcept: 0,
  examQuotas: false,
  blueprintTerms: false,
};

/** The fixture tree's context with the R10 switches replaced and any extra questions appended. */
function contextWith(
  switches: Partial<ValidateConfig>,
  extra: readonly QuestionEntry['q'][] = [],
  root = makeFixtureRoot(),
): Context {
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  const added = extra.map(
    (q, i): QuestionEntry => ({
      path: QUESTION_FILE,
      line: 100 + i,
      index: ctx.questions.length + i,
      module: 1,
      noteId: 'm01/what-a-bakery-cloud-is',
      q,
    }),
  );
  return { ...ctx, config: { ...OFF, ...switches }, questions: [...ctx.questions, ...added] };
}
const messages = (ctx: Context): string[] => r10.run(ctx).map((f) => `${f.file}  ${f.message}`);

describe('R10 practice per concept', () => {
  it('reports each tested concept below the target, counting live practice questions only', () => {
    expect(messages(contextWith({ practicePerConcept: 2 }))).toEqual([
      'content/concepts.yaml  concept shared-kitchen has 1 live practice question; it needs 2',
      'content/concepts.yaml  concept per-minute-rental has 1 live practice question; it needs 2',
    ]);
  });

  it('clears a concept once it has enough live practice questions', () => {
    const ctx = contextWith({ practicePerConcept: 2 }, [singleQuestion({ status: 'live' })]);
    expect(messages(ctx)).toEqual([
      'content/concepts.yaml  concept per-minute-rental has 1 live practice question; it needs 2',
    ]);
  });

  it('counts a question tagged with an alias for the concept that lists it', () => {
    const base = contextWith({ practicePerConcept: 2 }, [
      singleQuestion({ status: 'live' }),
      matchQuestion({ status: 'live', concept: 'minute-rental' }),
      matchQuestion({ id: 'q-4j6k8m', status: 'live', concept: 'minute-rental' }),
    ]);
    const concepts = base.concepts.map((c) =>
      c.id === 'per-minute-rental' ? { ...c, aliases: ['minute-rental'] } : c,
    );
    expect(messages({ ...base, concepts })).toEqual([]);
  });

  it('never counts drafts, retired questions or exam-pool questions', () => {
    const ctx = contextWith({ practicePerConcept: 2 }, [
      singleQuestion(),
      singleQuestion({ id: 'q-9r9r9r', status: 'retired' }),
      singleQuestion({ id: 'q-8p8p8p', status: 'live', pool: 'exam' }),
    ]);
    expect(messages(ctx)).toContain(
      'content/concepts.yaml  concept shared-kitchen has 1 live practice question; it needs 2',
    );
  });

  it('skips an untested concept', () => {
    const base = contextWith({ practicePerConcept: 2 });
    const concepts = base.concepts.map((c) => (c.id === 'per-minute-rental' ? { ...c, tested: false } : c));
    expect(messages({ ...base, concepts })).toEqual([
      'content/concepts.yaml  concept shared-kitchen has 1 live practice question; it needs 2',
    ]);
  });
});

describe('R10 blueprint terms', () => {
  it('reports a term the notes miss, and not one that a coveredBy maps', () => {
    const root = makeFixtureRoot();
    replaceIn(
      root,
      BLUEPRINT,
      'text: Fixture task statement 2.3, terms: []',
      'text: Fixture task statement 2.3, terms: ["access keys", { term: "oven pool", coveredBy: shared-kitchen }, "shared kitchen"]',
    );
    expect(messages(contextWith({ blueprintTerms: true }, [], root))).toEqual([
      'content/exam/blueprint.yaml  task 2.3 term "access keys" is not in resources/ and has no coveredBy; add an Exam guide update line',
    ]);
  });
});

describe('R10 exam quotas', () => {
  /** The fixture context with examQuotas on, the fixture quotas (or none), and the given exam-pool items. */
  function examContext(items: readonly QuestionEntry['q'][], quotas = fixtureQuotas()): Context {
    const ctx = contextWith({ examQuotas: true });
    const pool = items.map(
      (q, i): QuestionEntry => ({ path: POOL_FILE, line: 2 + i, index: i, module: 1, noteId: q.note, q }),
    );
    return { ...ctx, quotas, questions: [...ctx.questions, ...pool] };
  }
  const exam = (id: string, over: Partial<SingleQuestion> = {}): SingleQuestion =>
    singleQuestion({ id, pool: 'exam', status: 'live', ...over });
  const multi = (id: string, status: 'draft' | 'live' = 'live') =>
    multiQuestion({ id, pool: 'exam', status });
  const rental = (id: string) => exam(id, { concept: 'per-minute-rental', task: '4.1' });

  it('reports a missing quotas file on the config', () => {
    expect(messages({ ...examContext([]), quotas: null })).toEqual([
      'content/validate.yaml  examQuotas is on, but content/exam/quotas.yaml is missing',
    ]);
  });

  it('reports a short cell and a short domain multi-response target', () => {
    expect(messages(examContext([exam('q-e00001'), rental('q-e00002')]))).toEqual([
      'content/exam/quotas.yaml  cell m01 task 1.1 has 1 live exam items; it needs 2',
      'content/exam/quotas.yaml  domain 1 has 0 live multi-response exam items; it needs 1',
    ]);
  });

  it('passes a pool that meets every target, surplus items included', () => {
    expect(
      messages(examContext([multi('q-e00001'), exam('q-e00002'), exam('q-e00003'), rental('q-e00004')])),
    ).toEqual([]);
  });

  it('reports a concept with 5 live exam items', () => {
    const five = [multi('q-e00001'), exam('q-e00002'), exam('q-e00003'), exam('q-e00004'), exam('q-e00005')];
    expect(messages(examContext([...five, rental('q-e00006')]))).toEqual([
      'content/exam/quotas.yaml  concept shared-kitchen has 5 live exam items; at most 4',
    ]);
  });

  it('never counts drafts, retired items or practice questions', () => {
    const items = [
      multi('q-e00001', 'draft'),
      exam('q-e00002', { status: 'retired' }),
      exam('q-e00003', { pool: 'practice' }),
      rental('q-e00004'),
    ];
    expect(messages(examContext(items))).toEqual([
      'content/exam/quotas.yaml  cell m01 task 1.1 has 0 live exam items; it needs 2',
      'content/exam/quotas.yaml  domain 1 has 0 live multi-response exam items; it needs 1',
    ]);
  });
});

describe('R10 switches', () => {
  it('reports nothing with every switch off, even with a missing term', () => {
    const root = makeFixtureRoot();
    replaceIn(
      root,
      BLUEPRINT,
      'text: Fixture task statement 1.1, terms: []',
      'text: Fixture task statement 1.1, terms: ["sourdough starter rotation"]',
    );
    expect(messages(contextWith({}, [], root))).toEqual([]);
  });

  it('reports nothing without a config, which R1 reports instead', () => {
    expect(r10.run({ ...contextWith({ practicePerConcept: 2 }), config: null })).toEqual([]);
  });
});
