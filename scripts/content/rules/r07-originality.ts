import { ALLOW_FILE, type Finding } from '../lib/context.ts';
import { runsAgainst, shareAgainst } from '../lib/fingerprint.ts';
import { mask, stripMarkdown, words } from '../lib/text.ts';
import { finding, type Rule } from './rule.ts';

/** Largest corrected share of 6-word sequences a note may share with the course (spec 2.5). */
export const MAX_SHARE = 0.08;

/** R7 Originality: no copied 9-word run and at most 8% shared 6-word sequences, against the committed fingerprints. */
export const r07: Rule = {
  id: 'R7',
  title: 'Originality',
  run(ctx) {
    const out: Finding[] = [];
    if (ctx.allow.length === 0) {
      out.push(finding('R7', ALLOW_FILE, 'the allow list is missing or empty; run pnpm content:fingerprint'));
    }
    const tokensOf = (text: string): string[] => mask(words(stripMarkdown(text)), ctx.allow);
    const report = (file: string, runs: readonly string[], share: number): void => {
      for (const run of runs) {
        out.push(finding('R7', file, `copies a ${run.split(' ').length}-word run from the course: "${run}"`));
      }
      if (share > MAX_SHARE) {
        out.push(
          finding(
            'R7',
            file,
            `${(share * 100).toFixed(1)}% of its 6-word sequences come from the course (limit 8%)`,
          ),
        );
      }
    };

    for (const note of ctx.notes) {
      const prints = ctx.fingerprints.get(note.module);
      if (prints === undefined) {
        out.push(
          finding('R7', note.path, `no fingerprint for module ${note.module}; run pnpm content:fingerprint`),
        );
        continue;
      }
      const tokens = tokensOf(note.text);
      const sets = [prints.text, prints.items];
      report(note.path, runsAgainst(tokens, sets), shareAgainst(tokens, sets).share);
    }

    const modules = [...ctx.fingerprints.values()];
    const everySet = modules.flatMap((prints) => [prints.text, prints.items]);
    for (const doc of ctx.shared) {
      const tokens = tokensOf(doc.text);
      report(
        doc.path,
        modules.flatMap((prints) => runsAgainst(tokens, [prints.text, prints.items])),
        shareAgainst(tokens, everySet).share,
      );
    }
    return out;
  },
};
