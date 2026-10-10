import { describe, expect, it } from 'vitest';
import type { ValidateConfig } from '../../schemas/validate-config.ts';
import { type Context, loadContext, type QuestionEntry } from '../../scripts/content/lib/context.ts';
import { r10 } from '../../scripts/content/rules/r10-coverage.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { matchQuestion, QUESTION_FILE, singleQuestion } from '../fixtures/questions.ts';

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
      'content/concepts.yaml  concept per-minute-rental has 0 live practice questions; it needs 2',
    ]);
  });

  it('clears a concept once it has enough live practice questions', () => {
    const ctx = contextWith({ practicePerConcept: 2 }, [singleQuestion({ status: 'live' })]);
    expect(messages(ctx)).toEqual([
      'content/concepts.yaml  concept per-minute-rental has 0 live practice questions; it needs 2',
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
  it('reports the switch, because the exam pool arrives in Phase 3', () => {
    expect(messages(contextWith({ examQuotas: true }))).toEqual([
      'content/validate.yaml  examQuotas is on, but the exam pool arrives in Phase 3',
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
