import { describe, expect, it } from 'vitest';
import { popoverPosition } from '../../src/ui/position.ts';

const VIEW = { width: 1280, height: 800, scrollX: 0, scrollY: 500 };
const BOX = { width: 300, height: 120 };

describe('popoverPosition', () => {
  it('opens below the term, at its left edge, in page coordinates', () => {
    expect(popoverPosition({ top: 200, bottom: 220, left: 400 }, BOX, VIEW)).toEqual({ top: 726, left: 400 });
  });

  it('keeps 16 px from the right and left edges of a phone screen', () => {
    const phone = { width: 375, height: 812, scrollX: 0, scrollY: 0 };
    expect(popoverPosition({ top: 300, bottom: 320, left: 200 }, BOX, phone).left).toBe(59);
    expect(popoverPosition({ top: 300, bottom: 320, left: 4 }, BOX, phone).left).toBe(16);
  });

  it('flips above the term when there is no room below', () => {
    expect(popoverPosition({ top: 700, bottom: 720, left: 400 }, BOX, VIEW).top).toBe(500 + 700 - 6 - 120);
  });

  it('stays below when there is no room above either, so it never hides under the top bar', () => {
    const short = { width: 1280, height: 200, scrollX: 0, scrollY: 0 };
    expect(popoverPosition({ top: 90, bottom: 110, left: 400 }, BOX, short).top).toBe(116);
  });
});
