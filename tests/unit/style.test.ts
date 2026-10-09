import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { LessonNote } from '../../scripts/content/lib/context.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { coverageProblems, moduleStyle, styleProblems } from '../../scripts/content/lib/style.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';
import { matchQuestion, multiQuestion, singleQuestion } from '../fixtures/questions.ts';

const FILE = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';

function fixture(): { note: LessonNote; root: string } {
  const root = makeFixtureRoot();
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  const note = ctx.notes.find((n) => n.id === 'm01/what-a-bakery-cloud-is');
  if (note?.kind !== 'lesson') throw new Error('fixture lesson missing');
  return { note, root };
}

describe('styleProblems', () => {
  it('passes a clean question', () => {
    const { note } = fixture();
    expect(styleProblems(singleQuestion(), note)).toEqual([]);
  });

  it.each([
    ['All of the above', 'uses "all of the above"'],
    ['none of the above', 'uses "none of the above"'],
    ['Both a and c', 'uses "both A and B"'],
    ['The same as option b', 'uses a letter reference'],
  ])('reports %s once', (text, message) => {
    const { note } = fixture();
    const q = singleQuestion();
    const options = q.options.map((o) => (o.id === 'd' ? { ...o, text } : o));
    expect(styleProblems({ ...q, options }, note)).toEqual([message]);
  });

  it('wants NOT and EXCEPT in bold capitals', () => {
    const { note } = fixture();
    const stem = 'Which arrangement does not give the harbour branch extra baking capacity?';
    expect(styleProblems({ ...singleQuestion(), stem }, note)).toEqual([
      'a negative stem must write NOT in bold capitals',
    ]);
    const bold = 'Which arrangement does **NOT** give the harbour branch extra baking capacity?';
    expect(styleProblems({ ...singleQuestion(), stem: bold }, note)).toEqual([]);
    const except = 'Each arrangement adds baking capacity except which one for the harbour branch?';
    expect(styleProblems({ ...singleQuestion(), stem: except }, note)).toEqual([
      'a negative stem must write NOT in bold capitals',
    ]);
  });

  it('accepts a number only when the note states it', () => {
    const { note, root } = fixture();
    const stem = 'The harbour branch needs 99.99% of its mornings covered by spare ovens.';
    expect(styleProblems({ ...singleQuestion(), stem }, note)).toEqual([
      'the number 99.99% is not in m01/what-a-bakery-cloud-is',
    ]);
    const line = '\nOvens are ready 99.99% of the time.\n';
    const stated = { ...note, text: `${note.text}${line}`, body: `${note.body}${line}` };
    expect(styleProblems({ ...singleQuestion(), stem }, stated)).toEqual([]);
    expect(root).not.toBe('');
  });

  it('ignores the frontmatter when it looks for a stated number', () => {
    const { note } = fixture();
    const body = '# Ovens\n\n- Branches share ovens.\n';
    const bare = { ...note, text: `---\nmodule: 1\nlesson: 4\n---\n${body}`, body };
    const stem = 'The harbour branch spreads its ovens across 4 kitchens. Which idea is this?';
    expect(styleProblems({ ...singleQuestion(), stem }, bare)).toEqual([
      'the number 4 is not in m01/what-a-bakery-cloud-is',
    ]);
  });

  it('does not read the digits of a service name as a number', () => {
    const { note } = fixture();
    const q = singleQuestion();
    const options = q.options.map((o) => (o.id === 'd' ? { ...o, text: 'Amazon S3 Glacier on EC2' } : o));
    expect(styleProblems({ ...q, options }, note)).toEqual([]);
  });

  it('checks numbers in match pairs too', () => {
    const { note } = fixture();
    const q = matchQuestion();
    const pairs = q.pairs.map((p, i) => (i === 0 ? { ...p, right: 'Billed for 15 minutes' } : p));
    expect(styleProblems({ ...q, pairs }, note)).toEqual([
      'the number 15 is not in m01/what-a-bakery-cloud-is',
    ]);
  });

  it('reports the old Support plan names anywhere, but not Business Support+', () => {
    const { note } = fixture();
    const q = singleQuestion();
    const why = (text: string) => ({
      ...q,
      options: q.options.map((o) => (o.id === 'b' ? { ...o, why: text } : o)),
    });
    expect(
      styleProblems(why('Developer Support gives a branch email help in business hours.'), note),
    ).toEqual(['names a Support plan the exam no longer uses']);
    expect(
      styleProblems(why('AWS Business Support+ gives a branch help from a team of engineers.'), note),
    ).toEqual([]);
  });
});

describe('moduleStyle', () => {
  it('counts types, correct-longest singles and negative stems over live and draft practice questions', () => {
    const longest = singleQuestion();
    const options = longest.options.map((o) =>
      o.correct ? { ...o, text: `${o.text} on market days only` } : o,
    );
    const negative = {
      ...singleQuestion(),
      stem: 'Which arrangement does **NOT** give the branch more ovens?',
    };
    const retired = { ...singleQuestion(), status: 'retired' as const };
    expect(
      moduleStyle([{ ...longest, options }, negative, retired, multiQuestion(), matchQuestion()]),
    ).toEqual({
      singles: 2,
      correctLongest: 1,
      negatives: 1,
      total: 4,
      byType: { single: 2, multi: 1, match: 1 },
    });
  });
});

describe('coverageProblems', () => {
  it('asks for 2 questions per concept homed in the note', () => {
    const root = makeFixtureRoot();
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(coverageProblems(FILE, ctx)).toEqual([
      'concept shared-kitchen has 1 question; it needs 2',
      'concept per-minute-rental has 1 question; it needs 2',
    ]);
    writeFileSync(join(root, FILE), 'questions: []\n');
    expect(coverageProblems(FILE, loadContext(root, { today: FIXTURE_TODAY }))).toEqual([
      'concept shared-kitchen has 0 questions; it needs 2',
      'concept per-minute-rental has 0 questions; it needs 2',
    ]);
  });
});
