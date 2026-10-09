import type { Rule } from './rule.ts';

/** R1 Schema: every content file parses and matches its zod schema; the loader collects these findings. */
export const r01: Rule = {
  id: 'R1',
  title: 'Schema',
  run: (ctx) => [...ctx.loadErrors],
};
