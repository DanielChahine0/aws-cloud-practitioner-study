import type { Finding } from '../lib/context.ts';
import { finding, type Rule } from './rule.ts';

const OPTION_IDS = 'abcdef';
const same = (text: string): string => text.trim().toLowerCase();

/** The first text that repeats after trimming and lowercasing, or undefined. */
function repeated(texts: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const text of texts.map(same)) {
    if (seen.has(text)) return text;
    seen.add(text);
  }
  return undefined;
}

/** R3 Answer counts: the right number of correct options, ids in order, and no repeated option or pair text (drafts too). */
export const r03: Rule = {
  id: 'R3',
  title: 'Answer counts',
  run(ctx) {
    const out: Finding[] = [];
    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status === 'retired') continue;
      const report = (message: string): void => {
        out.push(finding('R3', entry.path, `${q.id}: ${message}`, entry.line));
      };
      if (q.type === 'match') {
        const left = repeated(q.pairs.map((p) => p.left));
        if (left !== undefined) report(`two pairs share the left "${left}"`);
        const right = repeated(q.pairs.map((p) => p.right));
        if (right !== undefined) report(`two pairs share the right "${right}"`);
        if (q.pool !== 'practice') report('match questions belong to the practice pool only');
        continue;
      }
      const correct = q.options.filter((o) => o.correct).length;
      if (q.type === 'single' && correct !== 1) {
        report(`single needs exactly 1 correct option of 4, has ${correct}`);
      }
      if (q.type === 'multi' && correct !== q.select) {
        report(`multi needs exactly ${q.select} correct options, has ${correct}`);
      }
      if (q.options.some((o, i) => o.id !== OPTION_IDS[i]))
        report('option ids must run a, b, c ... in order');
      const text = repeated(q.options.map((o) => o.text));
      if (text !== undefined) report(`two options share the text "${text}"`);
    }
    return out;
  },
};
