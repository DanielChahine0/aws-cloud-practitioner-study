import { CHECK_NAMES } from '../../../schemas/question.ts';
import type { Finding } from '../lib/context.ts';
import { fullHash, keyHash } from '../lib/hashes.ts';
import { finding, type Rule } from './rule.ts';

/** R9 Verified: a live question carries a stamp from pnpm content:stamp at its current hashes, naming all three checks. */
export const r09: Rule = {
  id: 'R9',
  title: 'Verified',
  run(ctx) {
    const out: Finding[] = [];
    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status !== 'live') continue;
      const report = (message: string): void => {
        out.push(finding('R9', entry.path, `${q.id}: ${message}`, entry.line));
      };
      const { verified } = q;
      if (verified === undefined) {
        report('live but not verified; run the checks and pnpm content:stamp');
        continue;
      }
      if (verified.keyHash !== keyHash(q) || verified.fullHash !== fullHash(q)) {
        report('verified at other hashes; its text changed after the checks, so re-check and re-stamp it');
      }
      const names = verified.checks.map((check) => check.split('@')[0] ?? '').sort();
      if (names.join(',') !== [...CHECK_NAMES].sort().join(',')) {
        report('verified checks must name solve-closed, solve-notes and critic');
      }
    }
    return out;
  },
};
