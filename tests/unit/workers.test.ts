import { describe, expect, it } from 'vitest';
import { workersFor } from '../../scripts/lib/workers.ts';

describe('workersFor', () => {
  it('leaves one core free on an idle machine', () => {
    expect(workersFor({ cores: 10, load: 0 })).toBe(9);
  });

  it('uses only the cores other work leaves idle', () => {
    expect(workersFor({ cores: 10, load: 6.4 })).toBe(4);
  });

  it('keeps one worker when the machine is saturated', () => {
    expect(workersFor({ cores: 10, load: 34 })).toBe(1);
  });

  it('never passes the cap', () => {
    expect(workersFor({ cores: 10, load: 0, cap: 5 })).toBe(5);
  });

  it('keeps one worker on a single-core machine', () => {
    expect(workersFor({ cores: 1, load: 0 })).toBe(1);
  });
});
