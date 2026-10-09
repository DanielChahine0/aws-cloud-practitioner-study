import type { Finding } from '../lib/context.ts';
import { finding, type Rule } from './rule.ts';

/** Shortest `why` R4 accepts, after trimming. */
export const MIN_WHY = 20;

/** R4 Explanations: a live question explains every option or pair, cites 1 to 3 evidence lines and has a takeaway. */
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
      const short = (why: string): boolean => why.trim().length < MIN_WHY;
      if (q.type === 'match') {
        for (const [i, pair] of q.pairs.entries()) {
          if (short(pair.why)) report(`pair ${i + 1} has no why of at least ${MIN_WHY} characters`);
        }
      } else {
        for (const option of q.options) {
          if (short(option.why)) report(`option ${option.id} has no why of at least ${MIN_WHY} characters`);
        }
      }
      if (q.evidence.length < 1 || q.evidence.length > 3) {
        report(`needs 1 to 3 evidence lines, has ${q.evidence.length}`);
      }
      if (q.takeaway.trim() === '') report('takeaway is blank');
    }
    return out;
  },
};
