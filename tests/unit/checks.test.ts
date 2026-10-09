import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Question } from '../../schemas/question.ts';
import {
  type Candidate,
  candidates,
  checkVersion,
  grade,
  type KeyFile,
  kindOf,
  lintAnswers,
  makeBatches,
  type PassLog,
  prepare,
  RESULTS_DIR,
  stampQuestions,
} from '../../scripts/content/lib/checks.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { fullHash, keyHash } from '../../scripts/content/lib/hashes.ts';
import { r09 } from '../../scripts/content/rules/r09-verified.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';
import { matchQuestion, multiQuestion, singleQuestion, writeQuestions } from '../fixtures/questions.ts';

const load = (root: string) => loadContext(root, { today: FIXTURE_TODAY });
const readJson = <T>(root: string, path: string): T =>
  JSON.parse(readFileSync(join(root, RESULTS_DIR, path), 'utf8')) as T;

function setup(
  questions: readonly Question[] = [singleQuestion(), multiQuestion(), matchQuestion()],
): string {
  const root = makeFixtureRoot();
  mkdirSync(join(root, 'agents'), { recursive: true });
  for (const [name, version] of [
    ['solve-closed', 3],
    ['solve-notes', 2],
    ['critic', 4],
  ] as const) {
    writeFileSync(
      join(root, 'agents', `${name}.md`),
      `---\nname: ${name}\nversion: ${version}\n---\n\n# ${name}\n`,
    );
  }
  writeQuestions(root, questions);
  return root;
}

interface Batch {
  batch: string;
  kind: string;
  questions: Record<string, unknown>[];
}
const batchFiles = (root: string): Batch[] =>
  readdirSync(join(root, RESULTS_DIR, 'batches'))
    .sort()
    .map((name) => readJson<Batch>(root, `batches/${name}`));

function writeAnswers(root: string, batch: string, answers: readonly unknown[]): string {
  const path = join(root, RESULTS_DIR, 'answers', `${batch}.json`);
  writeFileSync(path, JSON.stringify({ batch, answers }));
  return path;
}

/** A cue guess that misses the key: the first displayed options that are not correct. */
function wrongGuess(q: Question, order: readonly (string | number)[]): number[] {
  if (q.type === 'match') return [];
  const wrong = q.options.filter((o) => !o.correct).map((o) => order.indexOf(o.id) + 1);
  return wrong.sort((a, b) => a - b).slice(0, q.type === 'multi' ? q.select : 1);
}

/** Answers every batch as a perfect checker would, using the key map the checkers never see. */
function answerAll(
  root: string,
  override: (batch: string, id: string, answer: object) => object = (_b, _i, a) => a,
) {
  const keys = readJson<KeyFile>(root, 'keys.json');
  const ctx = load(root);
  for (const b of batchFiles(root)) {
    const answers = b.questions.map((payload) => {
      const id = String(payload.id);
      const q = ctx.questions.find((e) => e.q.id === id)?.q;
      if (q === undefined) throw new Error(id);
      const order = keys[b.batch]?.[id]?.order ?? [];
      let picked: number[] | Record<string, string>;
      if (q.type === 'match') {
        picked = Object.fromEntries(
          q.pairs.map((_, i) => [String(i + 1), 'abcde'.charAt(order.indexOf(i))] as const),
        );
      } else {
        picked = q.options.filter((o) => o.correct).map((o) => order.indexOf(o.id) + 1);
      }
      const base =
        b.kind === 'solve-closed'
          ? { id, picked, secondDefensible: false, reason: 'Only one option fits.' }
          : b.kind === 'solve-notes'
            ? { id, picked, quote: `- ${q.evidence[0] ?? ''}` }
            : b.kind === 'critic-cue'
              ? { id, guess: wrongGuess(q, order), basis: 'guess' }
              : { id, distractorsWrong: true, noTell: true, taskFits: true, styleHolds: true, problems: [] };
      return override(b.batch, id, base);
    });
    writeAnswers(root, b.batch, answers);
  }
}

describe('checkVersion', () => {
  it('reads the version from the prompt frontmatter', () => {
    const root = setup();
    expect(checkVersion(root, 'solve-notes')).toBe(2);
  });
});

describe('makeBatches', () => {
  const fake = (i: number, concept: string, note = `m01/n${i % 3}`): Candidate => ({
    entry: {
      path: 'x.yaml',
      line: i,
      index: i,
      noteId: note,
      q: singleQuestion({ id: `q-${String(i).padStart(6, '0')}`, concept, note }),
    },
    keyHash: '000000000000',
    fullHash: '000000000000',
    needs: ['solve-closed', 'solve-notes', 'critic'],
  });

  it('holds at most 10 questions and at most 1 per concept', () => {
    const cands = [
      ...Array.from({ length: 25 }, (_, i) => fake(i, `concept-${i}`)),
      ...Array.from({ length: 4 }, (_, i) => fake(30 + i, 'concept-0')),
    ];
    const batches = makeBatches(cands, 'solve-closed', 1);
    expect(batches.every((b) => b.items.length <= 10)).toBe(true);
    for (const b of batches) {
      const concepts = b.items.map((c) => c.entry.q.concept);
      expect(new Set(concepts).size).toBe(concepts.length);
    }
    expect(batches.flatMap((b) => b.items).length).toBe(29);
    expect(batches.map((b) => b.name)).toEqual(
      batches.map((_, i) => `solve-closed-${String(i + 1).padStart(2, '0')}`),
    );
  });

  it('deals in an order fixed by the seed', () => {
    const cands = Array.from({ length: 12 }, (_, i) => fake(i, `concept-${i}`));
    const ids = (seed: number) =>
      makeBatches(cands, 'critic', seed).flatMap((b) => b.items.map((c) => c.entry.q.id));
    expect(ids(1)).toEqual(ids(1));
    expect(ids(1)).not.toEqual(ids(2));
  });

  it('skips match questions in the cue round', () => {
    const cands = [fake(1, 'a'), { ...fake(2, 'b'), entry: { ...fake(2, 'b').entry, q: matchQuestion() } }];
    expect(makeBatches(cands, 'critic-cue', 1).flatMap((b) => b.items.map((c) => c.entry.q.type))).toEqual([
      'single',
    ]);
  });
});

describe('prepare', () => {
  it('writes batches that never show the key, the whys or the evidence to the solvers', () => {
    const root = setup();
    const { paths, questions } = prepare(load(root), [1], 1);
    expect(questions).toBe(3);
    expect(paths.map((p) => p.split('/').pop())).toEqual([
      'solve-closed-01.json',
      'solve-closed-02.json',
      'solve-notes-01.json',
      'solve-notes-02.json',
      'critic-cue-01.json',
      'critic-cue-02.json',
      'critic-01.json',
      'critic-02.json',
    ]);
    const keysOf = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.flatMap(keysOf)
        : typeof value === 'object' && value !== null
          ? Object.entries(value).flatMap(([k, v]) => [k, ...keysOf(v)])
          : [];
    for (const b of batchFiles(root)) {
      const keys = new Set(keysOf(b.questions));
      const hidden = ['correct', 'why', 'evidence', 'takeaway'].filter((k) => keys.has(k));
      expect([b.batch, hidden]).toEqual([
        b.batch,
        b.kind === 'critic' ? ['correct', 'why', 'evidence', 'takeaway'] : [],
      ]);
    }
    const cue = batchFiles(root).filter((b) => b.kind === 'critic-cue');
    expect(cue.flatMap((b) => b.questions.map((q) => q.stem))).toEqual([undefined, undefined]);
    const notes = batchFiles(root).find((b) => b.kind === 'solve-notes')?.questions[0]?.notes;
    expect(notes).toContain('### Shared kitchen');
    expect(notes).toContain('## Key takeaways');
    expect(notes).toContain('## Terms');
    expect(notes).not.toContain('## Objectives');
  });
});

describe('lintAnswers', () => {
  it('accepts a complete file and names missing, unknown and malformed answers', () => {
    const root = setup();
    prepare(load(root), [1], 1);
    answerAll(root);
    const file = join(root, RESULTS_DIR, 'answers', 'solve-closed-01.json');
    expect(lintAnswers(root, file)).toEqual([]);
    const batch = readJson<{ batch: string; answers: { id: string }[] }>(
      root,
      'answers/solve-closed-01.json',
    );
    const first = batch.answers[0];
    writeAnswers(root, 'solve-closed-01', [{ ...first, id: 'q-zzzzzz' }, ...batch.answers.slice(1)]);
    const problems = lintAnswers(root, file);
    expect(problems.some((p) => p.includes('q-zzzzzz is not in batch solve-closed-01'))).toBe(true);
    expect(problems.some((p) => p.includes(`${first?.id} has no answer`))).toBe(true);
    writeAnswers(root, 'solve-closed-01', [{ id: first?.id, picked: 'a' }]);
    expect(lintAnswers(root, file).length).toBeGreaterThan(0);
  });

  it('needs a basis on every cue answer and a reason unless the basis is a guess', () => {
    const root = setup();
    prepare(load(root), [1], 1);
    answerAll(root);
    const file = join(root, RESULTS_DIR, 'answers', 'critic-cue-01.json');
    expect(lintAnswers(root, file)).toEqual([]);
    const { answers } = readJson<{ answers: { id: string; guess: number[] }[] }>(
      root,
      'answers/critic-cue-01.json',
    );
    const rewrite = (extra: object) =>
      writeAnswers(
        root,
        'critic-cue-01',
        answers.map((a) => ({ id: a.id, guess: a.guess, ...extra })),
      );
    rewrite({});
    expect(lintAnswers(root, file).some((p) => p.includes('basis'))).toBe(true);
    rewrite({ basis: 'tell' });
    expect(lintAnswers(root, file).some((p) => p.includes('reason'))).toBe(true);
    rewrite({ basis: 'knowledge', reason: ' ' });
    expect(lintAnswers(root, file).some((p) => p.includes('reason'))).toBe(true);
    rewrite({ basis: 'tell', reason: 'It is the longest option.' });
    expect(lintAnswers(root, file)).toEqual([]);
  });
});

describe('grade', () => {
  it('maps shuffled picks back to the key and records the passes', () => {
    const root = setup();
    prepare(load(root), [1], 1);
    answerAll(root);
    const { passes, failures } = grade(root, FIXTURE_TODAY);
    expect(failures).toEqual([]);
    expect(passes).toBe(9);
    const log = readJson<PassLog>(root, 'passes.json');
    const q = singleQuestion();
    expect(log[`${q.id} solve-closed@3 ${keyHash(q)}`]).toBe(FIXTURE_TODAY);
    expect(log[`${q.id} solve-notes@2 ${fullHash(q)}`]).toBe(FIXTURE_TODAY);
    expect(log[`${q.id} critic@4 ${fullHash(q)}`]).toBe(FIXTURE_TODAY);
  });

  it('fails a wrong pick, a defensible second option, a cue hit, a bad quote and a missing answer', () => {
    const root = setup();
    prepare(load(root), [1], 1);
    const keys = readJson<KeyFile>(root, 'keys.json');
    answerAll(root, (batch, id, answer) => {
      const order = keys[batch]?.[id]?.order ?? [];
      if (id === 'q-7k2m9p' && batch.startsWith('solve-closed'))
        return { ...answer, picked: [order.indexOf('b') + 1] };
      if (id === 'q-5n4w8x' && batch.startsWith('solve-closed')) return { ...answer, secondDefensible: true };
      if (id === 'q-7k2m9p' && batch.startsWith('critic-cue'))
        return {
          id,
          guess: [order.indexOf('a') + 1],
          basis: 'tell',
          reason: 'It is the only hedged option.',
        };
      if (id === 'q-3h8r2t' && batch.startsWith('solve-notes'))
        return { ...answer, quote: 'Ovens are free.' };
      return answer;
    });
    const critic = batchFiles(root).find(
      (b) => b.kind === 'critic' && b.questions.some((q) => q.id === 'q-5n4w8x'),
    );
    if (critic === undefined) throw new Error('no critic batch');
    const answers = readJson<{ answers: { id: string }[] }>(root, `answers/${critic.batch}.json`).answers;
    writeAnswers(
      root,
      critic.batch,
      answers.filter((a) => a.id !== 'q-5n4w8x'),
    );
    const { failures } = grade(root, FIXTURE_TODAY);
    expect(failures.map((f) => `${f.id} ${f.check}: ${f.reason}`).sort()).toEqual([
      'q-3h8r2t solve-notes: the quote is not a line of the given notes',
      'q-5n4w8x critic: no answer',
      'q-5n4w8x solve-closed: a second option is defensible: Only one option fits.',
      'q-7k2m9p critic: the cue round found the key from the options alone (tell: It is the only hedged option.)',
      'q-7k2m9p solve-closed: picked b, the key is a',
    ]);
  });
});

describe('grade cue round', () => {
  /** Grades with q-7k2m9p's cue answer hitting the key on the given basis. */
  const gradeCueHit = (extra: object): string[] => {
    const root = setup();
    prepare(load(root), [1], 1);
    const keys = readJson<KeyFile>(root, 'keys.json');
    answerAll(root, (batch, id, answer) => {
      const order = keys[batch]?.[id]?.order ?? [];
      if (id === 'q-7k2m9p' && batch.startsWith('critic-cue'))
        return { id, guess: [order.indexOf('a') + 1], ...extra };
      return answer;
    });
    return grade(root, FIXTURE_TODAY).failures.map((f) => `${f.id} ${f.check}: ${f.reason}`);
  };

  it('passes a cue hit that was only a guess', () => {
    expect(gradeCueHit({ basis: 'guess' })).toEqual([]);
  });

  it('fails a cue hit that names a tell or knowledge basis, with its reason', () => {
    expect(gradeCueHit({ basis: 'tell', reason: 'It is the longest option.' })).toEqual([
      'q-7k2m9p critic: the cue round found the key from the options alone (tell: It is the longest option.)',
    ]);
    expect(gradeCueHit({ basis: 'knowledge', reason: 'Only it is true of AWS.' })).toEqual([
      'q-7k2m9p critic: the cue round found the key from the options alone (knowledge: Only it is true of AWS.)',
    ]);
  });
});

describe('candidates', () => {
  it('needs only solve-notes and critic after a why edit, and nothing once stamped', () => {
    const root = setup([singleQuestion()]);
    const q = singleQuestion();
    const passes: PassLog = {
      [`${q.id} solve-closed@3 ${keyHash(q)}`]: FIXTURE_TODAY,
      [`${q.id} solve-notes@2 ${fullHash(q)}`]: FIXTURE_TODAY,
      [`${q.id} critic@4 ${fullHash(q)}`]: FIXTURE_TODAY,
    };
    expect(candidates(load(root), [1], passes).map((c) => c.needs)).toEqual([[]]);
    const options = q.options.map((o) =>
      o.id === 'b' ? { ...o, why: `${o.why} It also needs floor space.` } : o,
    );
    writeQuestions(root, [{ ...q, options }]);
    expect(candidates(load(root), [1], passes).map((c) => c.needs)).toEqual([['solve-notes', 'critic']]);
    expect(candidates(load(root), [3], passes)).toEqual([]);
  });

  it('skips a question that already failed at its current hashes, and retired and exam questions', () => {
    const root = setup([singleQuestion(), matchQuestion({ status: 'retired' })]);
    const q = singleQuestion();
    const failure = { id: q.id, check: 'critic' as const, hash: fullHash(q), reason: 'a tell' };
    expect(candidates(load(root), [1], {}, [failure])).toEqual([]);
    expect(candidates(load(root), [1], {}).map((c) => c.entry.q.id)).toEqual([q.id]);
  });
});

describe('stampQuestions', () => {
  it('stamps a question that passed every check so R9 accepts it, and counts failed revisions up', () => {
    const root = setup();
    prepare(load(root), [1], 1);
    answerAll(root, (batch, id, answer) =>
      id === 'q-3h8r2t' && batch.startsWith('critic') && !batch.startsWith('critic-cue')
        ? { ...answer, noTell: false, problems: ['The right column repeats the left.'] }
        : answer,
    );
    grade(root, FIXTURE_TODAY);
    const first = stampQuestions(load(root), FIXTURE_TODAY);
    expect(first.summary).toBe('stamp: 2 live, 1 drafts to revise, 0 need Dani');
    expect(first.revise).toEqual(['content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml']);
    const ctx = load(root);
    expect(r09.run(ctx)).toEqual([]);
    const single = ctx.questions.find((e) => e.q.id === 'q-7k2m9p')?.q;
    expect(single?.status).toBe('live');
    expect(single?.verified?.checks).toEqual(['solve-closed@3', 'solve-notes@2', 'critic@4']);
    const match = ctx.questions.find((e) => e.q.id === 'q-3h8r2t')?.q;
    expect(match?.status).toBe('draft');
    expect(match?.review).toEqual({
      attempts: 1,
      lastFailure: 'critic: The right column repeats the left.',
    });
    expect(stampQuestions(load(root), FIXTURE_TODAY).summary).toBe(
      'stamp: 2 live, 1 drafts to revise, 0 need Dani',
    );
    expect(load(root).questions.find((e) => e.q.id === 'q-3h8r2t')?.q.review?.attempts).toBe(1);

    for (const attempt of [2, 3]) {
      const text = readFileSync(
        join(root, 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml'),
        'utf8',
      );
      writeFileSync(
        join(root, 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml'),
        text.replace('Match each bakery situation', `Match each bakery situation (take ${attempt})`),
      );
      prepare(load(root), [1], attempt);
      answerAll(root, (batch, id, answer) =>
        id === 'q-3h8r2t' && batch.startsWith('critic') && !batch.startsWith('critic-cue')
          ? { ...answer, taskFits: false, problems: [] }
          : answer,
      );
      grade(root, FIXTURE_TODAY);
      stampQuestions(load(root), FIXTURE_TODAY);
    }
    const review = load(root).questions.find((e) => e.q.id === 'q-3h8r2t')?.q.review;
    expect(review).toEqual({ attempts: 3, lastFailure: 'critic: the task does not fit' });
    expect(stampQuestions(load(root), FIXTURE_TODAY).summary).toBe(
      'stamp: 2 live, 0 drafts to revise, 1 need Dani',
    );
  });
});

describe('grade and stamp reruns', () => {
  const failClosed = (root: string): void => {
    const keys = readJson<KeyFile>(root, 'keys.json');
    answerAll(root, (batch, id, answer) => {
      const order = keys[batch]?.[id]?.order ?? [];
      return id === 'q-7k2m9p' && batch.startsWith('solve-closed')
        ? { ...answer, picked: [order.indexOf('b') + 1] }
        : answer;
    });
  };
  const attempts = (root: string): number | undefined =>
    load(root).questions.find((e) => e.q.id === 'q-7k2m9p')?.q.review?.attempts;

  it('counts one failure once when grade runs twice before stamp', () => {
    const root = setup();
    prepare(load(root), [1], 1);
    failClosed(root);
    grade(root, FIXTURE_TODAY);
    stampQuestions(load(root), FIXTURE_TODAY);
    grade(root, FIXTURE_TODAY);
    stampQuestions(load(root), FIXTURE_TODAY);
    expect(attempts(root)).toBe(1);
  });

  it('does not burn an attempt on a missing answer and batches the question again', () => {
    const root = setup();
    prepare(load(root), [1], 1);
    answerAll(root);
    const closed = batchFiles(root).find(
      (b) => b.kind === 'solve-closed' && b.questions.some((q) => q.id === 'q-7k2m9p'),
    );
    if (closed === undefined) throw new Error('no solve-closed batch');
    const answers = readJson<{ answers: { id: string }[] }>(root, `answers/${closed.batch}.json`).answers;
    writeAnswers(
      root,
      closed.batch,
      answers.filter((a) => a.id !== 'q-7k2m9p'),
    );
    const { failures } = grade(root, FIXTURE_TODAY);
    expect(failures.map((f) => `${f.id} ${f.check}: ${f.reason}`)).toEqual([
      'q-7k2m9p solve-closed: no answer',
    ]);
    stampQuestions(load(root), FIXTURE_TODAY);
    expect(attempts(root)).toBeUndefined();
    const passes = readJson<PassLog>(root, 'passes.json');
    expect(candidates(load(root), [1], passes).find((c) => c.entry.q.id === 'q-7k2m9p')?.needs).toEqual([
      'solve-closed',
    ]);
  });
});

describe('kindOf', () => {
  it('accepts a batch number past 99', () => {
    expect(kindOf('solve-closed-100')).toBe('solve-closed');
    expect(kindOf('critic-cue-07')).toBe('critic-cue');
    expect(kindOf('critic-123')).toBe('critic');
  });
});
