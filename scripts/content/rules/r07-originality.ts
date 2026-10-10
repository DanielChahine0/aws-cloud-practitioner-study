import type { Question } from '../../../schemas/question.ts';
import { ALLOW_FILE, type Finding, type ModulePrints } from '../lib/context.ts';
import {
  correctedShare,
  type HashSet,
  hitsAgainst,
  runsAgainst,
  shareAgainst,
  shingleWindows,
} from '../lib/fingerprint.ts';
import { labTexts } from '../lib/labs.ts';
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

/** Each run once, leaving out a run that a longer reported run contains. */
function maximalRuns(runs: Iterable<string>): string[] {
  const unique = [...new Set(runs)];
  return unique.filter((run) => !unique.some((other) => other !== run && ` ${other} `.includes(` ${run} `)));
}

/**
 * R7 Originality: against the committed fingerprints, notes have no copied 9-word run and at most 8% shared 6-word
 * sequences, and live questions have no 9-word run anywhere in the course and pass the stem check against each
 * module's knowledge checks and assessment items; live lab text has no 9-word run anywhere in the course. The
 * one-set rule stores some of a module's item shingles in other modules' `items` sets, so the stem check reads a
 * module's items set together with those (spec 2.5).
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
    /** Every set that holds a shingle of the module's knowledge checks and assessment items. */
    const itemSets = (p: ModulePrints): HashSet[] => [
      p.items,
      ...p.itemsFrom.flatMap((m) => ctx.fingerprints.get(m)?.items ?? []),
    ];

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

    const modules = [...ctx.fingerprints.entries()].sort(([a], [b]) => a - b);
    const everySet = modules.flatMap(([, prints]) => [prints.text, prints.items]);
    // Each module's two sets on their own, since pooling sets joins phrases from different places into false runs (spec 2.5).
    const courseRuns = (tokens: readonly string[]): string[] =>
      modules.flatMap(([, prints]) => runsAgainst(tokens, [prints.text, prints.items]));
    for (const doc of ctx.shared) {
      const tokens = tokensOf(doc.text);
      report(doc.path, courseRuns(tokens), shareAgainst(tokens, everySet).share);
    }

    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status !== 'live') continue;
      const report = (message: string): void => {
        out.push(finding('R7', entry.path, message, entry.line));
      };
      const texts = questionTexts(q);
      const all = texts.all.map(tokensOf);
      const stem = texts.stem.map(tokensOf);
      for (const run of new Set(all.flatMap(courseRuns))) {
        report(`${q.id} copies a 9-word run from the course: "${run}"`);
      }
      const stemRuns: { module: number; run: string }[] = [];
      const shares: string[] = [];
      for (const [module, p] of modules) {
        const sets = itemSets(p);
        for (const tokens of stem) {
          for (const run of runsAgainst(tokens, sets, STEM_RUN)) stemRuns.push({ module, run });
        }
        let hits = 0;
        let own = 0;
        let shingles = 0;
        for (const tokens of stem) {
          hits += hitsAgainst(tokens, sets).filter(Boolean).length;
          own += hitsAgainst(tokens, [p.items]).filter(Boolean).length;
          shingles += shingleWindows(tokens).filter((w) => w !== null).length;
        }
        // A share made only of borrowed hits belongs to the module that owns those sets, which reports it itself.
        const share = correctedShare(hits, shingles, sets);
        if (own > 0 && shingles >= MIN_STEM_SHINGLES && share > MAX_STEM_SHARE) {
          shares.push(
            `${q.id}: ${(share * 100).toFixed(1)}% of its stem and option text matches Module ${module}'s knowledge checks and assessment items (limit 25%)`,
          );
        }
      }
      const kept = new Set(maximalRuns(stemRuns.map((r) => r.run)));
      for (const { module, run } of stemRuns) {
        if (!kept.delete(run)) continue;
        report(
          `${q.id} shares an 8-word run with a Module ${module} knowledge check or assessment item: "${run}"`,
        );
      }
      for (const message of shares) report(message);
    }

    // Lab text gets the same no-run check as question text (a deliberate extension of spec R7: lab text is original).
    for (const { path, lab } of ctx.labs) {
      if (lab.status !== 'live') continue;
      for (const run of new Set(labTexts(lab).map(tokensOf).flatMap(courseRuns))) {
        out.push(finding('R7', path, `${lab.id} copies a 9-word run from the course: "${run}"`));
      }
    }
    return out;
  },
};
