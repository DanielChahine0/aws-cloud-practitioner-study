import type { Finding } from '../lib/context.ts';
import { evidenceForm, noteLines } from '../lib/evidence.ts';
import { finding, type Rule } from './rule.ts';

/** R5 Evidence: each evidence line of a live question is a whole line of its cited note, compared case-sensitively. */
export const r05: Rule = {
  id: 'R5',
  title: 'Evidence',
  run(ctx) {
    const out: Finding[] = [];
    const cache = new Map<string, Map<string, number>>();
    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status !== 'live') continue;
      // R6 reports a note that does not exist.
      const note = ctx.notes.find((n) => n.id === q.note);
      if (note === undefined) continue;
      const lines = cache.get(note.id) ?? noteLines(note);
      cache.set(note.id, lines);
      for (const line of q.evidence) {
        if (!lines.has(evidenceForm(line))) {
          out.push(
            finding(
              'R5',
              entry.path,
              `${q.id}: evidence is not a whole line of ${q.note}: "${line}"`,
              entry.line,
            ),
          );
        }
      }
    }
    return out;
  },
};
