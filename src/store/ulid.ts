/**
 * ULIDs for event ids: 10 Crockford base32 characters of milliseconds, then 16 random ones,
 * so ids sort by time as plain strings.
 * Within one millisecond the random part counts up, so ids stay strictly increasing.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_LEN = 10;

let lastNow = -1;
let lastTime = -1;
let lastRandom: number[] = [];

function encodeTime(now: number): string {
  let rest = now;
  let out = '';
  for (let i = 0; i < TIME_LEN; i++) {
    out = ALPHABET.charAt(rest % 32) + out;
    rest = Math.floor(rest / 32);
  }
  return out;
}

/** 80 random bits as 16 base32 digits. */
function randomDigits(random: (bytes: Uint8Array) => Uint8Array): number[] {
  const bytes = random(new Uint8Array(10));
  const digits: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      digits.push((buffer >> bits) & 31);
    }
    buffer &= (1 << bits) - 1;
  }
  return digits;
}

/** Adds one to the digits in place; false when every digit was 31 and the count wrapped. */
function increment(digits: number[]): boolean {
  for (let i = digits.length - 1; i >= 0; i--) {
    const digit = digits[i] ?? 0;
    if (digit < 31) {
      digits[i] = digit + 1;
      return true;
    }
    digits[i] = 0;
  }
  return false;
}

export function ulid(
  now: number = Date.now(),
  random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b as Uint8Array<ArrayBuffer>),
): string {
  if (now === lastNow) {
    // The 80-bit count wrapped: borrow the next millisecond rather than repeat an id.
    if (!increment(lastRandom)) lastTime += 1;
  } else {
    lastNow = now;
    lastTime = now;
    lastRandom = randomDigits(random);
  }
  return encodeTime(lastTime) + lastRandom.map((d) => ALPHABET.charAt(d)).join('');
}
