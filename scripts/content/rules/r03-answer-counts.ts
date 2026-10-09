import type { Finding } from '../lib/context.ts';
import { finding, type Rule } from './rule.ts';

const norm = (text: string): string => text.trim().toLowerCase();
const LETTERS = 'abcdef';

function firstDuplicate(values: readonly string[]): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    const key = norm(value);
    if (seen.has(key)) return value;
    seen.add(key);
  }
  return null;
}

/** R3 Answer counts: correct counts, option ids and unique texts for drafts and live questions (spec 2.9). */
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
        const left = firstDuplicate(q.pairs.map((p) => p.left));
        if (left !== null) report(`two pairs share the left "${left}"`);
        const right = firstDuplicate(q.pairs.map((p) => p.right));
        if (right !== null) report(`two pairs share the right "${right}"`);
        if (q.pool !== 'practice') report('match questions belong to the practice pool only');
        continue;
      }
      const correct = q.options.filter((o) => o.correct).length;
      if (q.type === 'single' && correct !== 1)
        report(`single needs exactly 1 correct option of 4, has ${correct}`);
      if (q.type === 'multi' && correct !== q.select) {
        report(`multi needs exactly ${q.select} correct options, has ${correct}`);
      }
      if (q.options.some((o, i) => o.id !== LETTERS[i])) report('option ids must run a, b, c ... in order');
      const text = firstDuplicate(q.options.map((o) => o.text));
      if (text !== null) report(`two options share the text "${text}"`);
    }
    return out;
  },
};
