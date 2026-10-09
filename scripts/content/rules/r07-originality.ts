import type { Question } from '../../../schemas/question.ts';
import { ALLOW_FILE, type Finding } from '../lib/context.ts';
import {
  correctedShare,
  hitsAgainst,
  runsAgainst,
  shareAgainst,
  shingleWindows,
} from '../lib/fingerprint.ts';
import { mask, stripMarkdown, words } from '../lib/text.ts';
import { finding, type Rule } from './rule.ts';

/** Largest corrected share of 6-word sequences a note may share with the course (spec 2.5). */
export const MAX_SHARE = 0.08;

/** The stem check: 3 consecutive hit shingles, an 8-word run, against one module's knowledge checks and assessment items. */
export const STEM_RUN = 3;
/** Largest pooled corrected share a live question's stem and option text may have against one module's items set. */
export const MAX_STEM_SHARE = 0.25;
/** The pooled share counts only from this many shingles on, since a few shingles make a share meaningless. */
export const MIN_STEM_SHINGLES = 8;

/**
 * A question's checked text, one segment per field so no shingle spans two fields: `stem` is the stem and each option
 * text, or each pair's left and right; `all` adds every why and the takeaway. Evidence lines are note lines, which R7
 * already checks as notes.
 */
export function questionTexts(q: Question): { stem: string[]; all: string[] } {
  const stem =
    q.type === 'match'
      ? [q.stem, ...q.pairs.flatMap((p) => [p.left, p.right])]
      : [q.stem, ...q.options.map((o) => o.text)];
  const whys = q.type === 'match' ? q.pairs.map((p) => p.why) : q.options.map((o) => o.why);
  return { stem, all: [...stem, ...whys, q.takeaway] };
}

/**
 * R7 Originality: against the committed fingerprints, notes have no copied 9-word run and at most 8% shared 6-word
 * sequences, and live questions have no 9-word run anywhere in the course and pass the stem check against each
 * module's knowledge checks and assessment items.
 */
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

    const prints = [...ctx.fingerprints.entries()].sort(([a], [b]) => a - b);
    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status !== 'live') continue;
      const report = (message: string): void => {
        out.push(finding('R7', entry.path, message, entry.line));
      };
      const texts = questionTexts(q);
      const all = texts.all.map(tokensOf);
      const stem = texts.stem.map(tokensOf);
      const copied = new Set(
        all.flatMap((tokens) => prints.flatMap(([, p]) => runsAgainst(tokens, [p.text, p.items]))),
      );
      for (const run of copied) report(`${q.id} copies a 9-word run from the course: "${run}"`);
      for (const [module, p] of prints) {
        const shared = new Set(stem.flatMap((tokens) => runsAgainst(tokens, [p.items], STEM_RUN)));
        for (const run of shared) {
          report(
            `${q.id} shares an 8-word run with a Module ${module} knowledge check or assessment item: "${run}"`,
          );
        }
        let hits = 0;
        let shingles = 0;
        for (const tokens of stem) {
          const flags = hitsAgainst(tokens, [p.items]);
          hits += flags.filter(Boolean).length;
          shingles += shingleWindows(tokens).filter((w) => w !== null).length;
        }
        const share = correctedShare(hits, shingles, [p.items]);
        if (shingles >= MIN_STEM_SHINGLES && share > MAX_STEM_SHARE) {
          report(
            `${q.id}: ${(share * 100).toFixed(1)}% of its stem and option text matches Module ${module}'s knowledge checks and assessment items (limit 25%)`,
          );
        }
      }
    }
    return out;
  },
};
