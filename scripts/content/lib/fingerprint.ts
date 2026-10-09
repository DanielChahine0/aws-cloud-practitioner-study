import { createHash } from 'node:crypto';
import type { PackedSet } from '../../../schemas/fingerprint.ts';
import { MASK } from './text.ts';

export const SHINGLE = 6;
/** A 9-word copied run contains exactly 4 overlapping 6-word shingles (spec 2.5). */
export const RUN_SHINGLES = 4;
/** Each set's false-positive rate: a set of n shingles hashes into floor(n / 0.005) values, so f is 0.5% and never below. */
export const TARGET_RATE = 0.005;
/** Packed values take 3 bytes, so a range may not pass 2^24. */
const MAX_RANGE = 2 ** 24;

export interface HashSet {
  range: number;
  f: number;
  values: ReadonlySet<number>;
}

export interface Share {
  shingles: number;
  hits: number;
  share: number;
}

/** The hash range for a set of n shingles: floor(n / 0.005), so n / range is 0.5% or a hair above. */
export function rangeFor(n: number): number {
  return n <= 0 ? 1 : Math.floor(n / TARGET_RATE);
}

/** The shingle's sha256, first 4 bytes as an unsigned integer, modulo the range. */
export function hashShingle(shingle: string, range: number): number {
  return createHash('sha256').update(shingle, 'utf8').digest().readUInt32BE(0) % range;
}

/** The shingle that starts at each position, or null where it touches a masked word. */
export function shingleWindows(tokens: readonly string[]): (string | null)[] {
  const out: (string | null)[] = [];
  for (let i = 0; i + SHINGLE <= tokens.length; i++) {
    const window = tokens.slice(i, i + SHINGLE);
    out.push(window.includes(MASK) ? null : window.join(' '));
  }
  return out;
}

/** Packs sorted values as 3-byte big-endian integers in base64; `f` is the share of the range the values fill. */
export function pack(values: ReadonlySet<number>, range: number): PackedSet {
  const sorted = [...values].sort((x, y) => x - y);
  const buf = Buffer.alloc(sorted.length * 3);
  for (let i = 0; i < sorted.length; i++) buf.writeUIntBE(sorted[i] ?? 0, i * 3, 3);
  return { range, count: sorted.length, f: sorted.length / range, data: buf.toString('base64') };
}

export function unpack(set: PackedSet): HashSet {
  const buf = Buffer.from(set.data, 'base64');
  if (buf.length !== set.count * 3)
    throw new Error(
      `packed set holds ${buf.length} bytes, not ${set.count * 3} for its count of ${set.count}`,
    );
  const values = new Set<number>();
  for (let i = 0; i < buf.length; i += 3) values.add(buf.readUIntBE(i, 3));
  return { range: set.range, f: set.f, values };
}

/** Hashes a set of distinct shingles into one packed set sized by rangeFor. */
export function packShingles(shingles: ReadonlySet<string>): PackedSet {
  const range = rangeFor(shingles.size);
  if (range > MAX_RANGE)
    throw new Error(`${shingles.size} shingles need a range of ${range}, but sets pack 2^24`);
  return pack(new Set([...shingles].map((s) => hashShingle(s, range))), range);
}

/** One flag per shingle window: true when any of the sets holds it; a masked window never hits. */
export function hitsAgainst(tokens: readonly string[], sets: readonly HashSet[]): boolean[] {
  return shingleWindows(tokens).map(
    (w) => w !== null && sets.some((set) => set.values.has(hashShingle(w, set.range))),
  );
}

/** Runs of at least `minShingles` consecutive hit shingles against any of the sets, returned as the words they cover. */
export function runsAgainst(
  tokens: readonly string[],
  sets: readonly HashSet[],
  minShingles = RUN_SHINGLES,
): string[] {
  const hit = hitsAgainst(tokens, sets);
  const runs: string[] = [];
  let i = 0;
  while (i < hit.length) {
    if (!hit[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < hit.length && hit[j]) j++;
    if (j - i >= minShingles) runs.push(tokens.slice(i, j - 1 + SHINGLE).join(' '));
    i = j;
  }
  return runs;
}

/** Share of unmasked shingles found in any of the sets, corrected for false positives: (hits / n - f) / (1 - f). */
export function shareAgainst(tokens: readonly string[], sets: readonly HashSet[]): Share {
  const windows = shingleWindows(tokens);
  const flags = hitsAgainst(tokens, sets);
  const shingles = windows.filter((w) => w !== null).length;
  const hits = flags.filter(Boolean).length;
  return { shingles, hits, share: correctedShare(hits, shingles, sets) };
}

/** (hits / n - f) / (1 - f), floored at 0, where f is the chance that any of the sets holds a random shingle. */
export function correctedShare(hits: number, shingles: number, sets: readonly HashSet[]): number {
  const f = 1 - sets.reduce((keep, s) => keep * (1 - s.f), 1);
  const raw = shingles === 0 ? 0 : hits / shingles;
  return Math.max(0, (raw - f) / (1 - f));
}
