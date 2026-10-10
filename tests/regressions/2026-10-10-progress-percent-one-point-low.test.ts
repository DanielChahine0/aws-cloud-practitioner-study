import { describe, expect, it } from 'vitest';
import { calibrationLine, mockLine } from '../../src/app/progress-lines.ts';
import { scoreOf } from '../../src/app/results.ts';

describe('Progress percentages floored after a division', () => {
  it('shows 29 of 50 Sure answers as 58%, not 57%', () => {
    expect(calibrationLine({ sure: { right: 29, total: 50 }, notSure: { right: 57, total: 100 } })).toBe(
      'Sure: 58% right (50) · Not sure: 57% right (100)',
    );
    expect(calibrationLine({ sure: { right: 87, total: 150 }, notSure: { right: 0, total: 0 } })).toBe(
      'Sure: 58% right (150) · Not sure: none yet',
    );
  });

  it('shows a mock with the same score as the results page', () => {
    const attempt = {
      form: 'remix',
      sid: 'S1',
      percent: 29 / 50,
      day: '2026-10-27',
      at: '2026-10-27T11:30:00.000Z',
      correct: 29,
      total: 50,
    };
    expect(mockLine(attempt)).toBe(`Remix · Tue 27 Oct · ${scoreOf(29, 50)}`);
    expect(mockLine(attempt)).toBe('Remix · Tue 27 Oct · 29/50 (58%)');
  });
});
