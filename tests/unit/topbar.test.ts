import { describe, expect, it } from 'vitest';
import {
  dueLabel,
  FLASH_MAX,
  RANK_ACTION,
  rankUpLine,
  rulesLine,
  streakLabel,
  xpGain,
} from '../../src/app/topbar.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';

describe('top bar labels', () => {
  it('starts each name with the visible text, then names the count in the singular for one', () => {
    expect(dueLabel(18)).toBe('18 due: 18 concepts, start a review');
    expect(dueLabel(1)).toBe('1 due: 1 concept, start a review');
    expect(streakLabel(9)).toBe('9d streak: 9 days, open Progress');
    expect(streakLabel(1)).toBe('1d streak: 1 day, open Progress');
  });
});

describe('xpGain', () => {
  it('flashes a gain only after the first value, and never for more than 200 at once', () => {
    expect(xpGain(null, 120)).toBeNull();
    expect(xpGain(120, 130)).toBe(10);
    expect(xpGain(130, 130)).toBeNull();
    expect(xpGain(130, 100)).toBeNull();
    expect(FLASH_MAX).toBe(200);
    expect(xpGain(100, 300)).toBe(200);
    expect(xpGain(100, 301)).toBeNull();
  });
});

describe('rulesLine', () => {
  it('shows the line once the store is ready, the engine changed and the log has events', () => {
    expect(rulesLine({ ready: true, stored: 1, events: 40 })).toBe('show');
    expect(rulesLine({ ready: true, stored: undefined, events: 40 })).toBe('show');
  });

  it('stamps the engine version silently on an empty log, and says nothing once it matches', () => {
    expect(rulesLine({ ready: true, stored: undefined, events: 0 })).toBe('stamp');
    expect(rulesLine({ ready: true, stored: ENGINE_VERSION, events: 40 })).toBe('none');
    expect(rulesLine({ ready: false, stored: undefined, events: 0 })).toBe('none');
  });
});

describe('the rank in the top bar', () => {
  it('reads what the button does after the visible plan name', () => {
    expect(RANK_ACTION).toBe('rank, open Progress');
  });

  it('writes the promotion line with the plan name and its two facts', () => {
    expect(
      rankUpLine({
        name: 'Business Support+',
        facts: ['Made-up fact one.', 'Made-up fact two.'],
      }),
    ).toBe('Business Support+: Made-up fact one. Made-up fact two.');
  });
});
