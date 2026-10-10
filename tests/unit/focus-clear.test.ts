import { describe, expect, it } from 'vitest';
import { scrollToClear } from '../../src/ui/focus-clear.ts';

const bar = { top: 721, bottom: 812 };

describe('scrollToClear', () => {
  it('leaves a control that ends well above the bar where it is', () => {
    expect(scrollToClear({ top: 600, bottom: 700 }, bar)).toBe(0);
  });

  it('scrolls a control under the bar up until it ends 8 px above the bar', () => {
    expect(scrollToClear({ top: 748, bottom: 796 }, bar)).toBe(83);
  });

  it('scrolls a control that only reaches into the bar', () => {
    expect(scrollToClear({ top: 692, bottom: 740 }, bar)).toBe(27);
  });

  it('never scrolls a tall control past the sticky top bar', () => {
    expect(scrollToClear({ top: 100, bottom: 800 }, bar)).toBe(48);
  });

  it('leaves a control below the bar to the browser', () => {
    expect(scrollToClear({ top: 820, bottom: 860 }, bar)).toBe(0);
  });
});
