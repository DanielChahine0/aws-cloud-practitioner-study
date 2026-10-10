import type { Forms, Quotas } from '../../../schemas/exam.ts';
import { type FormItem, type FormTargets, formProblems } from '../../../src/engine/forms.ts';
import { type Context, FORMS_FILE } from '../lib/context.ts';
import { finding, type Rule } from './rule.ts';

/** Every live exam item as the form builder sees it, by qid; an alias resolves to its registered concept id. */
export function liveFormItems(ctx: Context): Map<string, FormItem> {
  const canonical = new Map<string, string>();
  for (const c of ctx.concepts) {
    canonical.set(c.id, c.id);
    for (const alias of c.aliases ?? []) canonical.set(alias, c.id);
  }
  const out = new Map<string, FormItem>();
  for (const { q } of ctx.questions) {
    if (q.pool !== 'exam' || q.status !== 'live' || q.type === 'match') continue;
    out.set(q.id, { id: q.id, concept: canonical.get(q.concept) ?? q.concept, task: q.task, type: q.type });
  }
  return out;
}

/** The per-form targets of quotas.yaml. */
export function formTargets(quotas: Quotas): FormTargets {
  return { tasks: quotas.form.tasks, multi: quotas.form.multi };
}

/**
 * The problems of a set of forms, ids and counts only: across all forms no qid twice; in each form that is not frozen,
 * every qid a live exam item and, when the targets are known, no formProblems.
 */
export function formSetProblems(
  forms: Forms,
  live: ReadonlyMap<string, FormItem>,
  targets: FormTargets | null,
): string[] {
  const out: string[] = [];
  for (const form of forms.forms) {
    if (form.frozen) continue;
    const items: FormItem[] = [];
    for (const qid of form.qids) {
      const item = live.get(qid);
      if (item === undefined) out.push(`form ${form.id} holds ${qid}, which is not a live exam item`);
      else items.push(item);
    }
    if (targets !== null)
      for (const problem of formProblems(items, targets)) out.push(`form ${form.id} ${problem}`);
  }
  const first = new Map<string, string>();
  for (const form of forms.forms) {
    for (const qid of form.qids) {
      const seen = first.get(qid);
      if (seen === undefined) first.set(qid, form.id);
      else out.push(`qid ${qid} sits in forms ${seen} and ${form.id}`);
    }
  }
  return out;
}

/**
 * R12 Mock forms (spec 2.9, 4.3): each form that is not frozen holds 65 live exam items that meet the per-form domain,
 * task and multi-response counts with no concept twice, and no qid sits in two forms, frozen or not. A missing
 * forms.yaml passes until examQuotas is on, so deleting the file can never switch the mocks off unnoticed.
 */
export const r12: Rule = {
  id: 'R12',
  title: 'Mock forms',
  run(ctx) {
    if (ctx.forms === null) {
      // A forms.yaml that is there but does not parse is an R1 finding already.
      if (ctx.read(FORMS_FILE) !== null || ctx.config?.examQuotas !== true) return [];
      return [finding('R12', FORMS_FILE, 'forms.yaml is missing; run pnpm content:forms')];
    }
    const targets = ctx.quotas === null ? null : formTargets(ctx.quotas);
    const out = formSetProblems(ctx.forms, liveFormItems(ctx), targets).map((m) =>
      finding('R12', FORMS_FILE, m),
    );
    if (targets === null)
      out.push(finding('R12', FORMS_FILE, 'quotas.yaml is missing; run pnpm content:quotas'));
    return out;
  },
};
