import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { asLive, demote, draftCheck, labDraftCheck } from '../../scripts/content/lib/draft.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';
import { bakeryLab, dropFixtureLab, FIXTURE_LAB, writeLab } from '../fixtures/labs.ts';
import {
  matchQuestion,
  POOL_FILE,
  QUESTION_FILE,
  singleQuestion,
  writePool,
  writeQuestions,
} from '../fixtures/questions.ts';

const load = (root: string) => loadContext(root, { today: FIXTURE_TODAY });

describe('asLive', () => {
  it('treats every non-retired question of the file as live with no stamp', () => {
    const root = makeFixtureRoot();
    writeQuestions(root, [
      singleQuestion({
        status: 'live',
        verified: {
          keyHash: '0123456789ab',
          fullHash: 'ba9876543210',
          checks: ['solve-closed@1', 'solve-notes@1', 'critic@1'],
          on: FIXTURE_TODAY,
        },
      }),
      matchQuestion(),
      singleQuestion({ id: 'q-9r9r9r', status: 'retired' }),
    ]);
    const ctx = asLive(load(root), QUESTION_FILE);
    expect(ctx.questions.map((e) => [e.q.id, e.q.status, e.q.verified])).toEqual([
      ['q-7k2m9p', 'live', undefined],
      ['q-3h8r2t', 'live', undefined],
      ['q-9r9r9r', 'retired', undefined],
    ]);
  });
});

describe('draftCheck', () => {
  it('passes the fixture match, and reports only the coverage of the half-written file', () => {
    const { questions, problems } = draftCheck(load(makeFixtureRoot()), QUESTION_FILE);
    expect(questions).toBe(3);
    expect(problems.filter((p) => p.includes('q-3h8r2t'))).toEqual([]);
    expect(problems).toEqual([
      `${QUESTION_FILE}  concept shared-kitchen has 1 question that can still go live; it needs 2`,
    ]);
  });

  it('reports an empty why only under --draft', () => {
    const root = makeFixtureRoot();
    dropFixtureLab(root);
    const q = singleQuestion();
    const options = q.options.map((o) => (o.id === 'c' ? { ...o, why: '' } : o));
    writeQuestions(root, [{ ...q, options }, matchQuestion()]);
    const ctx = load(root);
    expect(runRules(ctx, ctx.config?.rules ?? []).findings).toEqual([]);
    const { problems } = draftCheck(ctx, QUESTION_FILE);
    expect(problems.filter((p) => p.startsWith('R4'))).toEqual([
      `R4 ${QUESTION_FILE}:2  q-7k2m9p: option c has no why of at least 20 characters`,
    ]);
  });

  it('adds the style problems with the question id and line', () => {
    const root = makeFixtureRoot();
    writeQuestions(root, [
      singleQuestion({ stem: 'Which arrangement does not give the harbour branch more ovens?' }),
    ]);
    const { problems } = draftCheck(load(root), QUESTION_FILE);
    expect(problems).toContain(
      `${QUESTION_FILE}:2  q-7k2m9p: a negative stem must write NOT in bold capitals`,
    );
  });
});

describe('demote', () => {
  it('sets a live question whose evidence left the note back to draft', () => {
    const root = makeFixtureRoot();
    writeQuestions(root, [
      singleQuestion({ status: 'live', evidence: ['Branches use ovens from one central kitchen.'] }),
      matchQuestion({ status: 'live' }),
    ]);
    expect(demote(load(root))).toEqual([
      `demoted q-7k2m9p (${QUESTION_FILE}): its evidence no longer matches m01/what-a-bakery-cloud-is`,
    ]);
    const statuses = load(root).questions.map((e) => [e.q.id, e.q.status]);
    expect(statuses).toEqual([
      ['q-7k2m9p', 'draft'],
      ['q-3h8r2t', 'live'],
    ]);
    expect(readFileSync(join(root, QUESTION_FILE), 'utf8')).toContain('status: draft');
    expect(demote(load(root))).toEqual([]);
  });
});

describe('draftCheck on an exam-pool file (spec 2.6)', () => {
  it('reports a concept past 4 open exam items and a task outside the concept, by id only', () => {
    const root = makeFixtureRoot();
    const ids = ['q-e00001', 'q-e00002', 'q-e00003', 'q-e00004'];
    writePool(root, [
      ...ids.map((id) => singleQuestion({ id, pool: 'exam' })),
      singleQuestion({ id: 'q-e00005', pool: 'exam', task: '4.1' }),
    ]);
    const { questions, problems } = draftCheck(load(root), POOL_FILE);
    expect(questions).toBe(5);
    expect(problems).toEqual([
      `R6 ${POOL_FILE}:126  q-e00005: task 4.1 is not one of shared-kitchen's tasks (1.1)`,
      `${POOL_FILE}  concept shared-kitchen would hold 5 exam items; at most 4`,
    ]);
  });

  it('leaves the practice coverage check out of a pool file', () => {
    const root = makeFixtureRoot();
    writePool(root, [singleQuestion({ id: 'q-e00001', pool: 'exam' })]);
    expect(draftCheck(load(root), POOL_FILE).problems).toEqual([]);
  });
});

describe('labDraftCheck (spec 5.1)', () => {
  it('passes the fixture lab', () => {
    expect(labDraftCheck(load(makeFixtureRoot()), FIXTURE_LAB)).toEqual({ labs: 1, problems: [] });
  });

  it('reports the R11 line of a lab whose solution misses a goal', () => {
    const root = makeFixtureRoot();
    writeLab(root, bakeryLab({ solution: bakeryLab().solution.slice(0, 3) }));
    expect(labDraftCheck(load(root), FIXTURE_LAB)).toEqual({
      labs: 1,
      problems: [`R11 ${FIXTURE_LAB}  lab-m01-sort-the-bakes: the solution leaves g2 unmet: 1 of 2 right`],
    });
  });

  it('reports a retired Support plan name, and the R1 line of a lab that breaks its schema', () => {
    const root = makeFixtureRoot();
    const lab = bakeryLab();
    const spec = lab.spec as { cards: { text: string }[] };
    const cards = spec.cards.map((c, i) =>
      i === 0 ? { ...c, text: 'Phone help from Business Support at night' } : c,
    );
    writeLab(root, { ...lab, spec: { ...spec, cards } });
    expect(labDraftCheck(load(root), FIXTURE_LAB).problems).toEqual([
      `R11 ${FIXTURE_LAB}  lab-m01-sort-the-bakes: retired Support plan name in 'Phone help from Business Support at night'`,
    ]);
    writeLab(root, { ...lab, minutes: 1 });
    expect(labDraftCheck(load(root), FIXTURE_LAB)).toEqual({
      labs: 0,
      problems: [`R1 ${FIXTURE_LAB}  minutes: Too small: expected number to be >=2`],
    });
  });
});
