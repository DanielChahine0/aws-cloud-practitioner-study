import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import type { Forms } from '../../schemas/exam.ts';
import { FORMS_FILE, loadContext } from '../../scripts/content/lib/context.ts';
import { runForms } from '../../scripts/content/lib/forms-command.ts';
import { r12 } from '../../scripts/content/rules/r12-forms.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { examConcept, writeExamPool } from '../fixtures/exam-pool.ts';
import { POOL_FILE } from '../fixtures/questions.ts';

const run = (root: string) => r12.run(loadContext(root, { today: FIXTURE_TODAY }));
const messages = (root: string): string[] => run(root).map((f) => f.message);

/** A fixture root with the made-up pool and forms A to D built by content:forms. */
function built(): { root: string; forms: Forms; conceptOf: Map<string, string> } {
  const root = makeFixtureRoot();
  const questions = writeExamPool(root);
  expect(runForms(root, []).code).toBe(0);
  const forms = parse(readFileSync(join(root, FORMS_FILE), 'utf8')) as Forms;
  return { root, forms, conceptOf: new Map(questions.map((q) => [q.id, q.concept])) };
}
const writeForms = (root: string, forms: Forms): void =>
  writeFileSync(join(root, FORMS_FILE), stringify(forms));
const setStatus = (root: string, id: string, status: string): void => {
  const text = readFileSync(join(root, POOL_FILE), 'utf8');
  const at = text.indexOf(`id: ${id}`);
  writeFileSync(
    join(root, POOL_FILE),
    text.slice(0, at) + text.slice(at).replace('status: live', `status: ${status}`),
  );
};

describe('R12 Mock forms', () => {
  it('passes without forms.yaml while examQuotas is off, and fires once it is on', () => {
    const root = makeFixtureRoot();
    expect(run(root)).toEqual([]);
    replaceIn(root, 'content/validate.yaml', 'examQuotas: false', 'examQuotas: true');
    expect(run(root)).toEqual([
      { rule: 'R12', file: FORMS_FILE, message: 'forms.yaml is missing; run pnpm content:forms' },
    ]);
  });

  it('passes forms that content:forms built', () => {
    expect(run(built().root)).toEqual([]);
  });

  it('fires on a draft item in a form that is not frozen', () => {
    const { root, forms } = built();
    const id = forms.forms[0]?.qids[0] ?? '';
    setStatus(root, id, 'draft');
    expect(messages(root)).toContain(`form A holds ${id}, which is not a live exam item`);
  });

  it('fires on a form of 64 items', () => {
    const { root, forms } = built();
    const formA = forms.forms[0];
    if (formA === undefined) throw new Error('no form A');
    formA.qids.pop();
    writeForms(root, forms);
    expect(messages(root)).toContain('form A has 64 items; it needs 65');
  });

  it('fires on a concept repeated inside a form', () => {
    const { root, forms, conceptOf } = built();
    const [a, b] = forms.forms;
    if (a === undefined || b === undefined) throw new Error('no forms A and B');
    const x = examConcept('2.2', 1);
    const y = examConcept('2.2', 2);
    const ax = a.qids.findIndex((id) => conceptOf.get(id) === x);
    const ay = a.qids.findIndex((id) => conceptOf.get(id) === y);
    const bx = b.qids.findIndex((id) => conceptOf.get(id) === x);
    const swapped = a.qids[ay] ?? '';
    a.qids[ay] = b.qids[bx] ?? '';
    b.qids[bx] = swapped;
    writeForms(root, forms);
    expect(ax).toBeGreaterThanOrEqual(0);
    expect(messages(root)).toContain(`form A concept ${x} appears 2 times`);
    expect(messages(root)).toContain(`form B concept ${y} appears 2 times`);
  });

  it('fires on a wrong domain split', () => {
    const { root, forms, conceptOf } = built();
    const [a, b] = forms.forms;
    if (a === undefined || b === undefined) throw new Error('no forms A and B');
    const fromA = a.qids.findIndex((id) => conceptOf.get(id) === examConcept('1.3', 1));
    const fromB = b.qids.findIndex((id) => conceptOf.get(id) === examConcept('3.3', 1));
    const swapped = a.qids[fromA] ?? '';
    a.qids[fromA] = b.qids[fromB] ?? '';
    b.qids[fromB] = swapped;
    writeForms(root, forms);
    expect(messages(root)).toContain('form A domain 1 has 15 items; it needs 16');
    expect(messages(root)).toContain('form A domain 3 has 23 items; it needs 22');
  });

  it('skips the live and count checks on a frozen form', () => {
    const { root, forms } = built();
    const formA = forms.forms[0];
    if (formA === undefined) throw new Error('no form A');
    formA.frozen = true;
    writeForms(root, forms);
    setStatus(root, formA.qids[0] ?? '', 'retired');
    expect(run(root)).toEqual([]);
  });

  it('fires on one qid in two frozen forms', () => {
    const { root, forms } = built();
    const [a, b] = forms.forms;
    if (a === undefined || b === undefined) throw new Error('no forms A and B');
    a.frozen = true;
    b.frozen = true;
    const shared = a.qids[0] ?? '';
    b.qids[0] = shared;
    writeForms(root, forms);
    expect(messages(root)).toEqual([`qid ${shared} sits in forms A and B`]);
  });
});
