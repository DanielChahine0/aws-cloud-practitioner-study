import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

// R2 compared only question files with HEAD, so a step of a shipped incident could change its key under the old
// version, or vanish, with no finding; replay then scored old answers against the new key (spec 2.9 R2).
const INCIDENT = 'content/incidents/inc-001.yaml';

/** A third live step, appended to the fixture incident's steps. */
const THIRD_STEP = [
  '  - id: q-f5j8m3',
  '    version: 1',
  '    status: live',
  '    pool: practice',
  '    type: single',
  '    concept: shared-kitchen',
  '    note: m01/what-a-bakery-cloud-is',
  '    task: "1.1"',
  '    level: 2',
  '    stem: By two the rush is over and the shared ovens are idle again. What should the branch do with them?',
  '    options:',
  '      - { id: a, text: Hand them back to the central kitchen, correct: true, why: Idle borrowed ovens should go back. }',
  '      - { id: b, text: Keep them warm all night, why: Warm idle ovens waste fuel. }',
  '      - { id: c, text: Buy them outright, why: Buying adds ovens the branch rarely needs. }',
  '      - { id: d, text: Lock them for tomorrow, why: Locking them stops other branches borrowing. }',
  '    evidence: []',
  '    takeaway: Hand borrowed ovens back once the rush ends.',
  '',
].join('\n');

/** R2 findings with the fixture incident in HEAD as `headEdit` makes it, after `edit` changes the working tree. */
function withIncidentHead(headEdit: (text: string) => string, edit: (root: string) => void): string[] {
  const root = makeFixtureRoot();
  const headText = headEdit(readFileSync(join(root, INCIDENT), 'utf8'));
  edit(root);
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  const withHeadFiles: Context = {
    ...ctx,
    headPaths: (prefix) => (INCIDENT.startsWith(prefix) ? [INCIDENT] : []),
    head: (path) => (path === INCIDENT ? headText : null),
  };
  return runRules(withHeadFiles, ['R2']).findings.map(
    (f) => `${f.file}${f.line === undefined ? '' : `:${f.line}`} ${f.message}`,
  );
}

/** Moves the key of step q-d2f6h8 from option a to option b. */
const moveKey = (root: string): void => {
  replaceIn(
    root,
    INCIDENT,
    '        text: Send the extra bun trays to the shared ovens for the morning\n        correct: true\n',
    '        text: Send the extra bun trays to the shared ovens for the morning\n',
  );
  replaceIn(
    root,
    INCIDENT,
    '        text: Order a new oven for the harbour branch\n',
    '        text: Order a new oven for the harbour branch\n        correct: true\n',
  );
};

describe('R2 compares the steps of a shipped incident with HEAD', () => {
  it('needs a version bump and a key-fix entry when the key of a live step changes', () => {
    expect(withIncidentHead((text) => text, moveKey)).toEqual([
      `${INCIDENT}:7 the correct answer of 'q-d2f6h8' changed, so it needs version 2 and a key-fix history entry`,
    ]);
    const bump = (root: string): void => {
      moveKey(root);
      replaceIn(root, INCIDENT, '  - id: q-d2f6h8\n    version: 1\n', '  - id: q-d2f6h8\n    version: 2\n');
      replaceIn(
        root,
        INCIDENT,
        '    takeaway: When a queue grows, borrow shared ovens instead of buying more.\n    history: []\n',
        '    takeaway: When a queue grows, borrow shared ovens instead of buying more.\n    history: [{ version: 2, change: key-fix, rescore: true }]\n',
      );
    };
    expect(withIncidentHead((text) => text, bump)).toEqual([]);
  });

  it('reports a live step of HEAD that is gone from a shipped incident', () => {
    expect(
      withIncidentHead(
        (text) => `${text}${THIRD_STEP}`,
        () => {},
      ),
    ).toEqual([
      `${INCIDENT} question 'q-f5j8m3' is live or retired in HEAD but is gone; retire it in place with status: retired`,
    ]);
  });

  it('lets a step of an incident that never shipped change or go', () => {
    const draft = (text: string): string =>
      `${text}${THIRD_STEP}`.replace(
        '  - id: q-f5j8m3\n    version: 1\n    status: live\n',
        '  - id: q-f5j8m3\n    version: 1\n    status: draft\n',
      );
    expect(withIncidentHead(draft, moveKey)).toEqual([]);
  });
});
