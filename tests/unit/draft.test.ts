import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { asLive, demote, draftCheck } from '../../scripts/content/lib/draft.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';
import { matchQuestion, QUESTION_FILE, singleQuestion, writeQuestions } from '../fixtures/questions.ts';

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
    expect(questions).toBe(2);
    expect(problems.filter((p) => p.includes('q-3h8r2t'))).toEqual([]);
    expect(problems).toEqual([
      `${QUESTION_FILE}  concept shared-kitchen has 1 question; it needs 2`,
      `${QUESTION_FILE}  concept per-minute-rental has 1 question; it needs 2`,
    ]);
  });

  it('reports an empty why only under --draft', () => {
    const root = makeFixtureRoot();
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
