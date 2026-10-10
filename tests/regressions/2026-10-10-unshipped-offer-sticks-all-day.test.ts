import { describe, expect, it } from 'vitest';
import { incidentToday } from '../../src/engine/next.ts';
import { derive } from '../../src/engine/replay.ts';
import { timelineOf } from '../fixtures/events.ts';
import { at, incidentDoneOf, incidentOfferedOf } from '../fixtures/memory.ts';

// Today's incident was the first offer of the study day whatever the content shipped, so an offer whose incident a
// deploy or a backup import had dropped held all day: Home showed an empty title, the incident screen said Loading
// and no new offer was ever recorded. The day's incident is now its first offer that still ships (spec 4.5, 8.4).

const DAY = '2026-10-10';
const shipped = new Set(['inc-002', 'inc-007']);

describe('the day of an offer that no longer ships', () => {
  it('has no incident until a shipped one is offered, then has that one', () => {
    const stale = [[at(DAY, 9), incidentOfferedOf('inc-900')]] as const;
    expect(incidentToday(derive(timelineOf(stale), null), DAY, shipped)).toBeNull();
    const reoffered = [...stale, [at(DAY, 10), incidentOfferedOf('inc-007')]] as const;
    expect(incidentToday(derive(timelineOf(reoffered), null), DAY, shipped)).toEqual({
      incident: 'inc-007',
      done: false,
    });
    const solved = [...reoffered, [at(DAY, 11), incidentDoneOf('inc-007', true)]] as const;
    expect(incidentToday(derive(timelineOf(solved), null), DAY, shipped)).toEqual({
      incident: 'inc-007',
      done: true,
    });
  });

  it('keeps every offer of the day in log order, so an import never loses the shipped one', () => {
    const log = [
      [at(DAY, 9), incidentOfferedOf('inc-900')],
      [at(DAY, 10), incidentOfferedOf('inc-002')],
      [at(DAY, 11), incidentOfferedOf('inc-007')],
    ] as const;
    const p = derive(timelineOf(log), null);
    expect(p.incidentsOffered.get(DAY)).toEqual(['inc-900', 'inc-002', 'inc-007']);
    expect(incidentToday(p, DAY, shipped)?.incident).toBe('inc-002');
  });
});
