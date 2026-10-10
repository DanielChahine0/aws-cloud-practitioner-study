import { buildForms, type FormItem, type FormTargets } from './forms.ts';
import { mulberry32, seedFor, shuffle } from './rng.ts';

/**
 * A remix mock (spec 4.3): once forms A to D are used up, one form built from items Dani has already seen,
 * to the same per-form targets; it is practice only and never counts toward Ready or a rank.
 * This file is the app's only importer of `buildForms`, so the form builder loads with the exam screens alone.
 */
export function remixQids(args: {
  items: readonly FormItem[];
  targets: FormTargets;
  seed: number;
}): string[] | null {
  const built = buildForms({ items: args.items, targets: args.targets, count: 1, seed: args.seed });
  if (!built.ok) return null;
  const [form] = built.forms;
  return form === undefined ? null : shuffle(form, mulberry32(seedFor(args.seed, 'remix')));
}
