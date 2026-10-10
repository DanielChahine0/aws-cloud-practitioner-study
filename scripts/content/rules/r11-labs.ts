import { LAB_SCHEMAS } from '../../../schemas/lab.ts';
import { allPass, replayLab } from '../../../src/labs/contract.ts';
import { checkLab, engineOf } from '../../../src/labs/engines.ts';
import type { Finding, LabEntry } from '../lib/context.ts';
import { labTexts } from '../lib/labs.ts';
import { labStyleProblems } from '../lib/style.ts';
import { finding, type Rule } from './rule.ts';

type Issue = { readonly path: readonly PropertyKey[]; readonly message: string };
const where = (issue: Issue): string => issue.path.map(String).join('.');

/**
 * The R11 problems of one live lab, each prefixed with its id: the spec and every action parse with the engine's
 * schemas, the goals match the spec, the start fails a goal, the solution meets every goal, and each wrong path
 * finishes the board and fails its named goal, all judged the way the lab screen checks (`checkLab`, after `settle`).
 * Used by R11, the draft check and the replay test.
 */
export function labProblems(entry: LabEntry): string[] {
  const { lab } = entry;
  if (lab.status !== 'live') return [];
  const say = (message: string): string => `${lab.id}: ${message}`;
  const style = labStyleProblems(labTexts(lab)).map(say);
  const schemas = LAB_SCHEMAS[lab.engine];
  const engine = engineOf(lab.engine);
  if (schemas === undefined || engine === null)
    return [say(`engine ${lab.engine} is not available yet`), ...style];

  const problems: string[] = [];
  const spec = schemas.spec.safeParse(lab.spec);
  if (!spec.success)
    for (const issue of spec.error.issues) problems.push(say(`spec: ${where(issue)}: ${issue.message}`));
  const actions = (list: readonly unknown[], label: string): unknown[] =>
    list.map((action, i) => {
      const parsed = schemas.action.safeParse(action);
      if (parsed.success) return parsed.data;
      for (const issue of parsed.error.issues) {
        const path = where(issue);
        problems.push(say(`${label}[${i}]${path === '' ? '' : `.${path}`}: ${issue.message}`));
      }
      return action;
    });
  const solution = actions(lab.solution, 'solution');
  const wrongPaths = lab.wrongPaths.map((p, j) => ({
    ...p,
    actions: actions(p.actions, `wrongPaths[${j}].actions`),
  }));
  if (!spec.success || problems.length > 0) return [...problems, ...style];

  const start = checkLab(engine, spec.data, engine.engine.init(spec.data));
  const inFile = lab.goals.map((g) => g.id);
  const inSpec = start.map((r) => r.goalId);
  const differ = [
    ...inFile.filter((id) => !inSpec.includes(id)),
    ...inSpec.filter((id) => !inFile.includes(id)),
  ];
  if (differ.length > 0) return [say(`goals do not match the spec: ${differ.sort().join(', ')}`), ...style];

  if (allPass(start)) problems.push(say('the starting state already meets every goal'));
  const solved = checkLab(engine, spec.data, replayLab(engine.engine, spec.data, solution));
  for (const r of solved)
    if (!r.pass) problems.push(say(`the solution leaves ${r.goalId} unmet: ${r.message}`));
  for (const [j, path] of wrongPaths.entries()) {
    const state = replayLab(engine.engine, spec.data, path.actions);
    const settled = engine.settle.reduce((s: unknown, action) => engine.engine.reduce(s, action), state);
    if (!engine.complete(spec.data, settled)) {
      problems.push(say(`wrongPaths[${j}] (${path.mistake}) leaves the board unfinished`));
      continue;
    }
    const result = checkLab(engine, spec.data, state).find((r) => r.goalId === path.failsGoal);
    if (result?.pass === true) {
      problems.push(say(`wrongPaths[${j}] (${path.mistake}) meets ${path.failsGoal}, which it should fail`));
    }
  }
  return [...problems, ...style];
}

/** R11 Labs replay (spec 2.9): every live lab replays its solution and wrong paths with the code the app runs. */
export const r11: Rule = {
  id: 'R11',
  title: 'Labs replay',
  run(ctx) {
    const out: Finding[] = [];
    for (const entry of ctx.labs)
      for (const message of labProblems(entry)) out.push(finding('R11', entry.path, message));
    return out;
  },
};
