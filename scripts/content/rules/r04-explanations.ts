import type { Finding } from '../lib/context.ts';
import { finding, type Rule } from './rule.ts';

const MIN_WHY = 20;

/** R4 Explanations: whys, 1 to 3 evidence lines and a takeaway on every live question (spec 2.9). */
export const r04: Rule = {
  id: 'R4',
  title: 'Explanations',
  run(ctx) {
    const out: Finding[] = [];
    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status !== 'live') continue;
      const report = (message: string): void => {
        out.push(finding('R4', entry.path, `${q.id}: ${message}`, entry.line));
      };
      if (q.type === 'match') {
        for (const [i, pair] of q.pairs.entries()) {
          if (pair.why.trim().length < MIN_WHY)
            report(`pair ${i + 1} has no why of at least ${MIN_WHY} characters`);
        }
      } else {
        for (const option of q.options) {
          if (option.why.trim().length < MIN_WHY) {
            report(`option ${option.id} has no why of at least ${MIN_WHY} characters`);
          }
        }
      }
      if (q.evidence.length < 1 || q.evidence.length > 3) {
        report(`needs 1 to 3 evidence lines, has ${q.evidence.length}`);
      }
      if (q.takeaway.trim() === '') report('needs a takeaway');
    }
    return out;
  },
};
