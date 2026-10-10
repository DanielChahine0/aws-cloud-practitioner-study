import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { bakeryLab, writeLab } from '../fixtures/labs.ts';
import { QUESTION_FILE } from '../fixtures/questions.ts';

// A debrief answer and an incident step are counted answers, one per concept per study day (spec 3.1), so a second
// debrief question or step on the same concept could never pay or move its card.
// Choose the Region shipped two debrief questions on region-selection, and R6 said nothing.
const INCIDENT = 'content/incidents/inc-001.yaml';

function r06(edit: (root: string) => void): string[] {
  const root = makeFixtureRoot();
  edit(root);
  return runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R6']).findings.map((f) => f.message);
}

describe('a concept repeated within one lab debrief or one incident', () => {
  it('reports a second debrief question on the same concept, by id only', () => {
    const findings = r06((root) => {
      replaceIn(root, QUESTION_FILE, 'status: draft', 'status: live');
      const debrief = { ...bakeryLab().debrief, questions: ['q-b4k7m2', 'q-d9p4r6', 'q-c8n3p5'] };
      writeLab(root, bakeryLab({ debrief }));
    });
    expect(findings).toEqual([
      'lab-m01-sort-the-bakes: debrief question q-c8n3p5 is on per-minute-rental, like q-d9p4r6, and only one counted answer per concept a day pays',
    ]);
  });

  const STEP =
    '  - id: q-e3g7j9\n    version: 1\n    status: live\n    pool: practice\n    type: single\n    concept: ';
  const REPEATED =
    'inc-001: step q-e3g7j9 is on shared-kitchen, like q-d2f6h8, and only one counted answer per concept a day pays';

  it('reports a second incident step on the same concept', () => {
    const findings = r06((root) =>
      replaceIn(root, INCIDENT, `${STEP}per-minute-rental`, `${STEP}shared-kitchen`),
    );
    expect(findings).toContain(REPEATED);
  });

  it('leaves an incident that does not ship yet to its author', () => {
    const draft = STEP.replace('status: live', 'status: draft');
    const findings = r06((root) =>
      replaceIn(root, INCIDENT, `${STEP}per-minute-rental`, `${draft}shared-kitchen`),
    );
    expect(findings).not.toContain(REPEATED);
  });
});
