import { z } from 'zod';

const ModuleNumber = z.number().int().min(1).max(13);

/** One truncated-hash shingle set; `f` is its false-positive rate, count / 2^b (spec 2.5). */
export const PackedSet = z.strictObject({
  b: z.number().int().min(1).max(24),
  count: z.number().int().min(0),
  f: z.number().min(0).max(1),
  data: z.string(),
});
export type PackedSet = z.infer<typeof PackedSet>;

/** content/fingerprints/mNN.json: the module's whole text, plus one set per knowledge check and assessment item. */
export const FingerprintFile = z.strictObject({
  module: ModuleNumber,
  text: PackedSet,
  items: z.record(z.string().regex(/^(?:kc|quiz)-\d{2}$/), PackedSet),
});
export type FingerprintFile = z.infer<typeof FingerprintFile>;
