import { describe, expect, it } from 'vitest';
import { INCIDENT_UNLOCK_MODULE, type IncidentRef, pickIncident } from '../../src/engine/incident.ts';
import { fnv1a } from '../../src/engine/rng.ts';

/** Made-up incidents: two on Module 2, one on Modules 3 and 2, one on Module 4. */
const INCIDENTS: readonly IncidentRef[] = [
  { id: 'inc-001', modules: [2] },
  { id: 'inc-002', modules: [2] },
  { id: 'inc-005', modules: [3, 2] },
  { id: 'inc-009', modules: [4] },
];

const readUpTo =
  (last: number) =>
  (module: number): boolean =>
    module <= last;

const pick = (over: Partial<Parameters<typeof pickIncident>[0]> = {}) =>
  pickIncident({
    incidents: INCIDENTS,
    solved: new Set(),
    lessonsRead: readUpTo(4),
    mastery: new Map([
      [2, 90],
      [3, 90],
      [4, 90],
    ]),
    day: '2026-10-20',
    ...over,
  });

/** Two days whose `fnv1a` parities differ, so a two-way tie picks a different incident on each. */
const DAY1 = '2026-10-20';
const DAY2 = '2026-10-21';

describe('pickIncident (spec 4.5)', () => {
  it('unlocks with Module 2', () => {
    expect(INCIDENT_UNLOCK_MODULE).toBe(2);
    expect(pick({ lessonsRead: readUpTo(1) })).toBeNull();
    expect(pick({ lessonsRead: (m) => m === 4 })).toBeNull();
  });

  it('skips an incident whose required modules are not all read', () => {
    const picked = pick({ lessonsRead: readUpTo(2), mastery: new Map([[2, 0]]) });
    expect(['inc-001', 'inc-002']).toContain(picked);
  });

  it('picks the incident over the weakest modules, summing 100 minus mastery over its modules', () => {
    expect(pick()).toBe('inc-005');
    expect(
      pick({
        mastery: new Map([
          [2, 90],
          [3, 90],
          [4, 0],
        ]),
      }),
    ).toBe('inc-009');
    expect(pick({ mastery: new Map() })).toBe('inc-005');
  });

  it('breaks a tie with fnv1a of the day, so the pick holds all day and changes with the day', () => {
    expect(fnv1a(DAY1) % 2).not.toBe(fnv1a(DAY2) % 2);
    const tied = { incidents: INCIDENTS.slice(0, 2), mastery: new Map([[2, 50]]) };
    const first = pick({ ...tied, day: DAY1 });
    expect(pick({ ...tied, day: DAY1 })).toBe(first);
    expect(first).toBe(['inc-001', 'inc-002'][fnv1a(DAY1) % 2]);
    expect(pick({ ...tied, day: DAY2 })).toBe(['inc-001', 'inc-002'][fnv1a(DAY2) % 2]);
    expect(pick({ ...tied, day: DAY2 })).not.toBe(first);
  });

  it('sorts tied ids before the tie-break, whatever the input order', () => {
    const forward = pick({ incidents: INCIDENTS.slice(0, 2), day: DAY1 });
    const backward = pick({ incidents: [...INCIDENTS.slice(0, 2)].reverse(), day: DAY1 });
    expect(backward).toBe(forward);
  });

  it('never returns a solved incident, and returns null once every eligible one is solved', () => {
    expect(pick({ solved: new Set(['inc-005']) })).not.toBe('inc-005');
    expect(pick({ solved: new Set(INCIDENTS.map((i) => i.id)) })).toBeNull();
  });

  it('leaves no backlog: a missed day changes nothing, so the next day offers one incident', () => {
    const tied = { incidents: INCIDENTS.slice(0, 2), mastery: new Map([[2, 50]]) };
    expect(typeof pick({ ...tied, day: DAY2 })).toBe('string');
    expect(pick({ ...tied, day: '2026-10-25' })).not.toBeNull();
  });
});
