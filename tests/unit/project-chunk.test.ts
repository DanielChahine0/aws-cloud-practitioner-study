import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentIndex } from '../../schemas/chunks.ts';
import type { ProjectChunk } from '../../schemas/project-view.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { singleQuestion, writePool } from '../fixtures/questions.ts';

const KEY_POINTS = 'content/project/key-points/01-baking-basics.yaml';

function build(root = makeFixtureRoot()) {
  const built = buildContent(loadContext(root, { today: FIXTURE_TODAY }));
  const index = JSON.parse(built.files.get(built.indexFile) ?? 'null') as ContentIndex;
  const file = index.project === null ? undefined : built.files.get(index.project);
  return { built, index, file, project: file === undefined ? null : (JSON.parse(file) as ProjectChunk) };
}

describe('the project chunk', () => {
  it('ships the brief, the rubric and only live key points with their read links', () => {
    const { index, project } = build();
    expect(index.project).toMatch(/^content\/project\.[0-9a-f]{8}\.json$/);
    expect(project?.title).toBe('Move the bakery to the shared kitchen');
    expect(project?.facts).toHaveLength(7);
    expect(project?.rubric.passTotal).toBe(8);
    expect(project?.rubric.criteria.map((c) => c.id)).toEqual(['fit', 'grounding', 'tradeoffs', 'cost']);
    expect(project?.decisions.map((d) => d.module)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(project?.decisions[0]?.keyPoints).toEqual([
      {
        id: 'kp-01-borrow-on-busy-days',
        text: 'The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.',
        concepts: ['shared-kitchen'],
        read: {
          route: '#/m/01/l/what-a-bakery-cloud-is/shared-kitchen',
          text: 'Branches use ovens from one central kitchen when their queues grow.',
        },
      },
    ]);
    expect(project?.decisions.slice(1).every((d) => d.keyPoints.length === 0)).toBe(true);
  });

  it('holds no draft key point and no exam-pool text', () => {
    const root = makeFixtureRoot();
    const exam = singleQuestion({ id: 'q-9d4r6t', pool: 'exam', status: 'live' });
    writePool(root, [exam]);
    const { file } = build(root);
    expect(file).not.toContain('kp-01-pay-only-while-proofing');
    expect(file).not.toContain(exam.stem);
    expect(file).not.toContain('q-9d4r6t');
  });

  it('changes its name when a key point changes, and is null with no brief', () => {
    const before = build().index.project;
    const root = makeFixtureRoot();
    replaceIn(root, KEY_POINTS, 'on Saturdays instead', 'on market days instead');
    expect(build(root).index.project).not.toBe(before);
    const bare = makeFixtureRoot();
    rmSync(join(bare, 'content/project'), { recursive: true });
    const { index, built } = build(bare);
    expect(index.project).toBeNull();
    expect([...built.files.keys()].some((name) => name.startsWith('content/project.'))).toBe(false);
  });
});
