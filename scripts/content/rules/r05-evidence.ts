import type { Finding } from '../lib/context.ts';
import { evidenceForm, noteLines } from '../lib/evidence.ts';
import { evidenceHolds, projectOf } from '../lib/project.ts';
import { finding, type Rule } from './rule.ts';

/**
 * R5 Evidence: each evidence line of a live question is a whole line of its cited note, and the evidence line of a live
 * key point is a whole line of the home note of one of its concepts, compared case-sensitively.
 */
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
    for (const { path, line, kp } of projectOf(ctx).keyPoints) {
      // R6 reports a concept that resolves to no note, so only a definite miss is an R5 finding.
      if (kp.status !== 'live' || evidenceHolds(ctx, kp) !== false) continue;
      out.push(
        finding(
          'R5',
          path,
          `${kp.id}: evidence is not a whole line of the home note of any of its concepts`,
          line,
        ),
      );
    }
    return out;
  },
};
