import { CHECK_NAMES } from '../../../schemas/question.ts';
import type { Finding } from '../lib/context.ts';
import { fullHash, keyHash } from '../lib/hashes.ts';
import { finding, type Rule } from './rule.ts';

/** R9 Verified stamp: every live question carries a stamp at its current hashes naming all three checks (spec 2.9). */
export const r09: Rule = {
  id: 'R9',
  title: 'Verified stamp',
  run(ctx) {
    const out: Finding[] = [];
    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status !== 'live') continue;
      const report = (message: string): void => {
        out.push(finding('R9', entry.path, `${q.id}: ${message}`, entry.line));
      };
      const v = q.verified;
      if (v === undefined) {
        report('live but not verified; run the checks and pnpm content:stamp');
        continue;
      }
      if (v.keyHash !== keyHash(q) || v.fullHash !== fullHash(q)) {
        report('verified at other hashes; its text changed after the checks, so re-check and re-stamp it');
      }
      const names = v.checks.map((c) => c.slice(0, c.indexOf('@'))).sort();
      if (names.join() !== [...CHECK_NAMES].sort().join()) {
        report('verified checks must name solve-closed, solve-notes and critic');
      }
    }
    return out;
  },
};
