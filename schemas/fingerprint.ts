import { z } from 'zod';
import { ModuleNumber } from './common.ts';

/** One truncated-hash shingle set; `f` is its false-positive rate, count / 2^b (spec 2.5). */
export const PackedSet = z.strictObject({
  b: z.number().int().min(1).max(24),
  count: z.number().int().min(0),
  f: z.number().min(0).max(1),
  data: z.string(),
});
export type PackedSet = z.infer<typeof PackedSet>;

/** A knowledge check (kc-01, kc-02, ...) or assessment item (quiz-NN, by question number). */
export const ItemId = z.string().regex(/^(?:kc|quiz)-\d{2}$/, 'must look like kc-01 or quiz-01');

/**
 * content/fingerprints/mNN.json: the module's whole text as one set, plus the ids of its knowledge checks and assessment items.
 * Items carry no hashes, because a shingle stored in two sets could be tested twice (spec 2.5).
 */
export const FingerprintFile = z.strictObject({
  module: ModuleNumber,
  text: PackedSet,
  items: z.array(ItemId).refine((ids) => ids.every((id, i) => i === 0 || (ids[i - 1] ?? '') < id), {
    message: 'item ids must be sorted and unique',
  }),
});
export type FingerprintFile = z.infer<typeof FingerprintFile>;
