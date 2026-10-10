import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { QID_ALPHABET, Qid } from '../../schemas/question.ts';
import { newQid, qidSourceTexts, takenQids } from '../../scripts/content/lib/qid.ts';
import { makeFixtureRoot } from '../fixtures/content-root.ts';
import { singleQuestion, writePool } from '../fixtures/questions.ts';

describe('newQid', () => {
  it('draws 6 characters of the Crockford alphabet that the schema accepts', () => {
    for (let i = 0; i < 200; i++) {
      const id = newQid(new Set());
      expect(Qid.safeParse(id).success).toBe(true);
      expect([...id.slice(2)].every((c) => QID_ALPHABET.includes(c))).toBe(true);
    }
  });

  it('never returns a taken id', () => {
    const draws = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
    let i = 0;
    const random = (max: number): number => {
      expect(max).toBe(QID_ALPHABET.length);
      return draws[i++] ?? 2;
    };
    expect(newQid(new Set(['q-000000']), random)).toBe('q-000001');
  });
});

describe('takenQids', () => {
  it('collects every id-shaped token, also from files that do not parse', () => {
    expect([...takenQids(['questions:\n  - id: q-7k2m9p\n', 'not: [valid yaml q-abcdef'])].sort()).toEqual([
      'q-7k2m9p',
      'q-abcdef',
    ]);
  });
});

describe('qidSourceTexts', () => {
  it('reads practice and exam-pool files, so an id used in a pool file is taken', () => {
    const root = makeFixtureRoot();
    writePool(root, [singleQuestion({ id: 'q-9d4r6t', pool: 'exam' })]);
    const taken = takenQids(qidSourceTexts(root));
    expect(taken.has('q-9d4r6t')).toBe(true);
    expect(taken.has('q-b4k7m2')).toBe(true);
  });
});

describe('qidSourceTexts and incident steps', () => {
  it('takes the ids of incident steps in the tree and in HEAD', () => {
    const root = makeFixtureRoot();
    expect(takenQids(qidSourceTexts(root)).has('q-d2f6h8')).toBe(true);
    writeFileSync(join(root, 'content/incidents/inc-002.yaml'), 'id: inc-002\nsteps:\n  - id: q-5t6v7w\n');
    expect(takenQids(qidSourceTexts(root)).has('q-5t6v7w')).toBe(true);
    rmSync(join(root, 'content/incidents/inc-002.yaml'));
    execFileSync('git', ['init', '-q'], { cwd: root });
    writeFileSync(join(root, 'content/incidents/inc-003.yaml'), 'id: inc-003\nsteps:\n  - id: q-8x9y0z\n');
    execFileSync('git', ['add', '-A'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'head'], {
      cwd: root,
    });
    rmSync(join(root, 'content/incidents/inc-003.yaml'));
    expect(takenQids(qidSourceTexts(root)).has('q-8x9y0z')).toBe(true);
  });
});
