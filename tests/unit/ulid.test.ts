import { beforeEach, describe, expect, it } from 'vitest';
import { monotonicUlid } from '../../src/store/ulid.ts';

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const zeros = (bytes: Uint8Array) => bytes.fill(0);
const ones = (bytes: Uint8Array) => bytes.fill(255);

describe('ulid', () => {
  let ulid = monotonicUlid();
  beforeEach(() => {
    ulid = monotonicUlid();
  });

  it('is 26 characters of the Crockford alphabet', () => {
    for (let i = 0; i < 50; i++) expect(ulid()).toMatch(ULID);
  });

  it('encodes the time in its first 10 characters', () => {
    expect(ulid(0, zeros)).toBe('00000000000000000000000000');
    expect(ulid(1, zeros).slice(0, 10)).toBe('0000000001');
    expect(ulid(2 ** 48 - 1, zeros).slice(0, 10)).toBe('7ZZZZZZZZZ');
  });

  it('sorts lexically in time order', () => {
    const times = [1, 999, 1_000_000, Date.UTC(2026, 9, 9), Date.UTC(2026, 9, 10), Date.UTC(2099, 0, 1)];
    const ids = times.map((t) => ulid(t));
    expect([...ids].sort()).toEqual(ids);
  });

  it('is strictly increasing for 1,000 ids in one millisecond', () => {
    const now = Date.UTC(2026, 9, 9, 8);
    const ids = Array.from({ length: 1000 }, () => ulid(now));
    for (let i = 1; i < ids.length; i++) expect((ids[i] as string) > (ids[i - 1] as string)).toBe(true);
  });

  it('stays increasing when the clock steps back', () => {
    const base = Date.UTC(2026, 9, 9, 10);
    const first = ulid(base + 1000);
    const second = ulid(base + 999);
    const third = ulid(base + 500);
    expect(second > first).toBe(true);
    expect(third > second).toBe(true);
    expect(third.slice(0, 10)).toBe(first.slice(0, 10));
  });

  it('stays increasing when the random part would overflow', () => {
    const now = Date.UTC(2026, 9, 9, 9);
    const first = ulid(now, ones);
    const second = ulid(now, ones);
    expect(second > first).toBe(true);
    expect(second).toMatch(ULID);
  });
});
