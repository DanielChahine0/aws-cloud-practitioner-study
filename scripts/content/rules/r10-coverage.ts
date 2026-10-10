import { BLUEPRINT_FILE, CONCEPTS_FILE, CONFIG_FILE, type Finding } from '../lib/context.ts';
import { missingTerms, practiceCounts } from '../lib/coverage.ts';
import { finding, type Rule } from './rule.ts';

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
    if (config.examQuotas) {
      out.push(finding('R10', CONFIG_FILE, 'examQuotas is on, but the exam pool arrives in Phase 3'));
    }
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
