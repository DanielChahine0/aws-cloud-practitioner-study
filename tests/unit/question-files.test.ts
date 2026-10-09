import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { editQuestionFile } from '../../scripts/content/lib/question-files.ts';

const TEXT = `# Lesson questions.
questions:
  # The shared kitchen scenario.
  - id: q-7k2m9p
    version: 1
    status: draft
    stem: The harbour branch sells out early.
    review: { attempts: 1, lastFailure: "critic: a tell" }
  - id: q-3h8r2t
    version: 1
    status: draft
    stem: Match each situation.
`;

const verified = {
  keyHash: '0123456789ab',
  fullHash: 'ba9876543210',
  checks: ['solve-closed@1', 'solve-notes@1', 'critic@2'],
  on: '2026-10-10',
};

describe('editQuestionFile', () => {
  it('keeps comments and key order while it stamps an item', () => {
    const out = editQuestionFile(
      TEXT,
      new Map([['q-7k2m9p', { status: 'live' as const, verified, review: null }]]),
    );
    expect(out).toContain('# Lesson questions.');
    expect(out).toContain('  # The shared kitchen scenario.\n  - id: q-7k2m9p');
    expect(out).toContain('checks: [ solve-closed@1, solve-notes@1, critic@2 ]');
    const data = parse(out) as { questions: Record<string, unknown>[] };
    expect(Object.keys(data.questions[0] ?? {})).toEqual(['id', 'version', 'status', 'stem', 'verified']);
    expect(data.questions[0]?.status).toBe('live');
    expect(data.questions[0]?.verified).toEqual(verified);
    expect(data.questions[1]).toEqual({
      id: 'q-3h8r2t',
      version: 1,
      status: 'draft',
      stem: 'Match each situation.',
    });
  });

  it('removes a key given null and replaces a review', () => {
    const stamped = editQuestionFile(TEXT, new Map([['q-7k2m9p', { verified }]]));
    const removed = editQuestionFile(stamped, new Map([['q-7k2m9p', { verified: null }]]));
    expect(removed).not.toContain('verified');
    const review = editQuestionFile(
      TEXT,
      new Map([['q-3h8r2t', { review: { attempts: 1, lastFailure: 'solve-closed: picked 2' } }]]),
    );
    const data = parse(review) as { questions: Record<string, unknown>[] };
    expect(data.questions[1]?.review).toEqual({ attempts: 1, lastFailure: 'solve-closed: picked 2' });
  });

  it('throws on an unknown id', () => {
    expect(() => editQuestionFile(TEXT, new Map([['q-zzzzzz', { status: 'draft' as const }]]))).toThrow(
      'q-zzzzzz is not in this file',
    );
  });

  it('keeps a folded stem and every untouched line byte for byte', () => {
    const folded = `questions:
  - id: q-7k2m9p
    version: 1
    status: draft
    stem: >-
      The harbour branch sells out of croissants by 9 a.m. every Saturday.
      Which change helps most?
    takeaway: >-
      Plan for the peak.

  - id: q-3h8r2t
    version: 1
    status: draft
    stem: >-
      Match each situation.
      Then check the pairs.
    review:
      attempts: 1
      lastFailure: "critic: a tell"
`;
    const out = editQuestionFile(
      folded,
      new Map([
        ['q-7k2m9p', { status: 'live' as const, verified, review: null }],
        ['q-3h8r2t', { review: { attempts: 2, lastFailure: 'solve-closed: picked b' } }],
      ]),
    );
    expect(out).toBe(`questions:
  - id: q-7k2m9p
    version: 1
    status: live
    stem: >-
      The harbour branch sells out of croissants by 9 a.m. every Saturday.
      Which change helps most?
    takeaway: >-
      Plan for the peak.
    verified:
      keyHash: 0123456789ab
      fullHash: ba9876543210
      checks: [ solve-closed@1, solve-notes@1, critic@2 ]
      on: 2026-10-10

  - id: q-3h8r2t
    version: 1
    status: draft
    stem: >-
      Match each situation.
      Then check the pairs.
    review:
      attempts: 2
      lastFailure: "solve-closed: picked b"
`);
    const block =
      '    verified:\n      keyHash: 0123456789ab\n      fullHash: ba9876543210\n' +
      '      checks: [ solve-closed@1, solve-notes@1, critic@2 ]\n      on: 2026-10-10\n';
    expect(editQuestionFile(out, new Map([['q-7k2m9p', { verified: null }]]))).toBe(out.replace(block, ''));
  });
});
