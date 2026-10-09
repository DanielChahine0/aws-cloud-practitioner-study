import type { Finding } from '../lib/context.ts';
import { evidenceForm, noteLines } from '../lib/evidence.ts';
import { finding, type Rule } from './rule.ts';

/** R5 Evidence: every evidence line of a live question is one whole line of its cited note, case-sensitive (spec 2.9). */
export const r05: Rule = {
  id: 'R5',
  title: 'Evidence',
  run(ctx) {
    const out: Finding[] = [];
    const notes = new Map(ctx.notes.map((note) => [note.id, note] as const));
    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status !== 'live') continue;
      const note = notes.get(q.note);
      if (note === undefined) continue;
      const lines = noteLines(note);
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
