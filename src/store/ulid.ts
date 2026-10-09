/** ULIDs for event ids: 10 Crockford base32 time characters and 16 random ones, so ids sort by time. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

let lastTime = -1;
let lastRandom: number[] = [];

function randomDigits(random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array): number[] {
  return [...random(new Uint8Array(16))].map((b) => b & 31);
}

/** Adds one to the random part; within one millisecond this keeps ids strictly increasing. */
function increment(digits: readonly number[]): number[] {
  const out = [...digits];
  for (let i = out.length - 1; i >= 0; i--) {
    const d = out[i] ?? 0;
    if (d < 31) {
      out[i] = d + 1;
      return out;
    }
    out[i] = 0;
  }
  throw new Error('ULID random part overflowed within one millisecond');
}

export function ulid(
  now = Date.now(),
  random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array = (b) => crypto.getRandomValues(b),
): string {
  lastRandom = now === lastTime ? increment(lastRandom) : randomDigits(random);
  lastTime = now;
  let time = '';
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = (ALPHABET[t % 32] ?? '0') + time;
    t = Math.floor(t / 32);
  }
  return time + lastRandom.map((d) => ALPHABET[d] ?? '0').join('');
}
