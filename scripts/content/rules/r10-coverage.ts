import { DOMAIN_IDS } from '../../../schemas/ids.ts';
import {
  BLUEPRINT_FILE,
  CONCEPTS_FILE,
  CONFIG_FILE,
  type Context,
  type Finding,
  QUOTAS_FILE,
} from '../lib/context.ts';
import {
  examConceptCounts,
  examCounts,
  examMultiByDomain,
  missingTerms,
  practiceCounts,
} from '../lib/coverage.ts';
import { finding, type Rule } from './rule.ts';

const live = (q: { status: string }): boolean => q.status === 'live';

/**
 * The exam quota check of R10 (spec 2.9), also run by `pnpm content:forms --freeze`: every quotas.yaml cell and
 * domain multi-response target met by live exam-pool items, and no concept above 4 of them; surplus is fine.
 */
export function examQuotaProblems(ctx: Context): Finding[] {
  const quotas = ctx.quotas;
  if (quotas === null) {
    return [finding('R10', CONFIG_FILE, `examQuotas is on, but ${QUOTAS_FILE} is missing`)];
  }
  const out: Finding[] = [];
  const cells = examCounts(ctx, live);
  for (const cell of quotas.cells) {
    const n = cells.get(`${cell.module}|${cell.task}`) ?? 0;
    if (n >= cell.target) continue;
    const nn = String(cell.module).padStart(2, '0');
    out.push(
      finding(
        'R10',
        QUOTAS_FILE,
        `cell m${nn} task ${cell.task} has ${n} live exam items; it needs ${cell.target}`,
      ),
    );
  }
  const multi = examMultiByDomain(ctx, live);
  for (const d of DOMAIN_IDS) {
    const n = multi.get(d) ?? 0;
    const target = quotas.pool.multi[d];
    if (n < target) {
      out.push(
        finding(
          'R10',
          QUOTAS_FILE,
          `domain ${d} has ${n} live multi-response exam items; it needs ${target}`,
        ),
      );
    }
  }
  const perConcept = examConceptCounts(ctx, live);
  for (const [id, n] of [...perConcept].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (n > quotas.pool.maxPerConcept) {
      out.push(
        finding(
          'R10',
          QUOTAS_FILE,
          `concept ${id} has ${n} live exam items; at most ${quotas.pool.maxPerConcept}`,
        ),
      );
    }
  }
  return out;
}

/** R10 Coverage: the switches in content/validate.yaml set the practice count per concept, the exam quotas and the blueprint terms (spec 2.9). */
export const r10: Rule = {
  id: 'R10',
  title: 'Coverage',
  run(ctx) {
    const config = ctx.config;
    if (config === null) return [];
    const out: Finding[] = [];
    const target = config.practicePerConcept;
    if (target > 0) {
      const counts = practiceCounts(ctx, (q) => q.status === 'live');
      for (const c of ctx.concepts) {
        if (c.tested === false) continue;
        const n = counts.get(c.id) ?? 0;
        if (n >= target) continue;
        const noun = n === 1 ? 'question' : 'questions';
        out.push(
          finding('R10', CONCEPTS_FILE, `concept ${c.id} has ${n} live practice ${noun}; it needs ${target}`),
        );
      }
    }
    if (config.examQuotas) out.push(...examQuotaProblems(ctx));
    if (config.blueprintTerms) {
      for (const t of missingTerms(ctx)) {
        out.push(
          finding(
            'R10',
            BLUEPRINT_FILE,
            `task ${t.task} term "${t.term}" is not in resources/ and has no coveredBy; add an Exam guide update line`,
          ),
        );
      }
    }
    return out;
  },
};
