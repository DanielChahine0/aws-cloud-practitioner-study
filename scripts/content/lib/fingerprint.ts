import { createHash } from 'node:crypto';
import type { PackedSet } from '../../../schemas/fingerprint.ts';
import { MASK } from './text.ts';

export const SHINGLE = 6;
/** A 9-word copied run contains exactly 4 overlapping 6-word shingles (spec 2.5). */
export const RUN_SHINGLES = 4;
const TARGET_RATE = 0.01;

export interface HashSet {
  b: number;
  f: number;
  values: ReadonlySet<number>;
}

export interface Share {
  shingles: number;
  hits: number;
  share: number;
}

/** Bits per hash for a set of n shingles: the smallest b with n / 2^b at most 1%. */
export function bitsFor(n: number): number {
  return n <= 0 ? 1 : Math.ceil(Math.log2(n / TARGET_RATE));
}

/** The first b bits of the shingle's sha256. */
export function hashShingle(shingle: string, b: number): number {
  return createHash('sha256').update(shingle, 'utf8').digest().readUInt32BE(0) >>> (32 - b);
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

/** Packs sorted values as 3-byte big-endian integers in base64. */
export function pack(values: ReadonlySet<number>, b: number): PackedSet {
  const sorted = [...values].sort((x, y) => x - y);
  const buf = Buffer.alloc(sorted.length * 3);
  for (let i = 0; i < sorted.length; i++) buf.writeUIntBE(sorted[i] ?? 0, i * 3, 3);
  return { b, count: sorted.length, f: sorted.length / 2 ** b, data: buf.toString('base64') };
}

export function unpack(set: PackedSet): HashSet {
  const buf = Buffer.from(set.data, 'base64');
  if (buf.length !== set.count * 3)
    throw new Error(
      `packed set holds ${buf.length} bytes, not ${set.count * 3} for its count of ${set.count}`,
    );
  const values = new Set<number>();
  for (let i = 0; i < buf.length; i += 3) values.add(buf.readUIntBE(i, 3));
  return { b: set.b, f: set.f, values };
}

/** Hashes every distinct shingle of the tokens into one set. */
export function buildSet(tokens: readonly string[]): PackedSet {
  const distinct = new Set(shingleWindows(tokens).filter((s): s is string => s !== null));
  const b = bitsFor(distinct.size);
  if (b > 24) throw new Error(`${distinct.size} shingles need ${b} bits, but sets pack 24`);
  return pack(new Set([...distinct].map((s) => hashShingle(s, b))), b);
}

/** Runs of 4 or more consecutive hit shingles, returned as the words they cover. */
export function runsAgainst(tokens: readonly string[], set: HashSet): string[] {
  const hit = shingleWindows(tokens).map((w) => w !== null && set.values.has(hashShingle(w, set.b)));
  const runs: string[] = [];
  let i = 0;
  while (i < hit.length) {
    if (!hit[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < hit.length && hit[j]) j++;
    if (j - i >= RUN_SHINGLES) runs.push(tokens.slice(i, j - 1 + SHINGLE).join(' '));
    i = j;
  }
  return runs;
}

/** Share of unmasked shingles found in any of the sets, corrected for false positives: (hits / n - f) / (1 - f). */
export function shareAgainst(tokens: readonly string[], sets: readonly HashSet[]): Share {
  const windows = shingleWindows(tokens).filter((w): w is string => w !== null);
  const f = 1 - sets.reduce((keep, s) => keep * (1 - s.f), 1);
  const hits = windows.filter((w) => sets.some((s) => s.values.has(hashShingle(w, s.b)))).length;
  const raw = windows.length === 0 ? 0 : hits / windows.length;
  return { shingles: windows.length, hits, share: Math.max(0, (raw - f) / (1 - f)) };
}
