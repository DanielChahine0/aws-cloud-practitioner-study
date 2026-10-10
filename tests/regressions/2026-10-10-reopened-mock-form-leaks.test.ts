import { describe, expect, it } from 'vitest';
import { derive, practiceForms } from '../../src/engine/replay.ts';
import { eventsOf, SID, SID2 } from '../fixtures/events.ts';
import { abandonOf, examStartOf, submitOf } from '../fixtures/memory.ts';

/**
 * `practiceForms` counted a form as closed as soon as any of its mocks was over, so with an abandoned Mock B and a
 * second Mock B still open in the log (an imported log can hold both), Form B joined the learn pool while its mock was
 * open, and a quiz could show its key (spec 4.3); the leakage property found it.
 */
const startB = (sid: string) =>
  examStartOf(sid, 'mock', [], { form: 'B', deadline: '2026-10-10T09:30:00.000Z' });

describe('practiceForms with two mocks of one form', () => {
  it('keeps a form out while any of its mocks is open', () => {
    expect(
      practiceForms(derive(eventsOf(startB(SID), abandonOf(SID, 'mock'), startB(SID2)), null)).has('B'),
    ).toBe(false);
  });

  it('lets the form in once every one of its mocks is over', () => {
    const log = eventsOf(startB(SID), abandonOf(SID, 'mock'), startB(SID2), submitOf(SID2, 'mock'));
    expect(practiceForms(derive(log, null)).has('B')).toBe(true);
  });
});
