import { z } from 'zod';
import { ModuleNumber } from './common.ts';

/** One modulus-sized shingle set: each shingle maps to sha256 mod `range`, and `f`, count / range, is its false-positive rate (spec 2.5). */
export const PackedSet = z.strictObject({
  range: z
    .number()
    .int()
    .min(1)
    .max(2 ** 24),
  count: z.number().int().min(0),
  f: z.number().min(0).max(1),
  data: z.string(),
});
export type PackedSet = z.infer<typeof PackedSet>;

/** A knowledge check (kc-01, kc-02, ...) or assessment item (quiz-NN, by question number). */
export const ItemId = z.string().regex(/^(?:kc|quiz)-\d{2}$/, 'must look like kc-01 or quiz-01');

/** Other modules' numbers, sorted and unique. */
const ModuleList = z.array(ModuleNumber).refine((ms) => ms.every((m, i) => i === 0 || (ms[i - 1] ?? 0) < m), {
  message: 'module numbers must be sorted and unique',
});

/**
 * content/fingerprints/mNN.json: one module's two shingle sets and the ids of its knowledge checks and assessment items.
 * Every course shingle sits in exactly one of the 26 sets: a shingle inside any item goes to the `items` set of the
 * lowest module whose items hold it, and every other shingle to the `text` set of the lowest module that holds it,
 * so no guess can be tested twice (spec 2.5).
 * Because of that, some of a module's knowledge check and assessment item shingles sit in other modules' `items` sets:
 * `itemsFrom` names those modules, so the stem check sees a module's items whole without any shingle stored twice.
 */
export const FingerprintFile = z.strictObject({
  module: ModuleNumber,
  text: PackedSet,
  items: PackedSet,
  itemIds: z.array(ItemId).refine((ids) => ids.every((id, i) => i === 0 || (ids[i - 1] ?? '') < id), {
    message: 'item ids must be sorted and unique',
  }),
  itemsFrom: ModuleList,
});
export type FingerprintFile = z.infer<typeof FingerprintFile>;
