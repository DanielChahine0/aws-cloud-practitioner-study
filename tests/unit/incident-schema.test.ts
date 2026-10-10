import { describe, expect, it } from 'vitest';
import { IncidentFile, IncidentId } from '../../schemas/incident.ts';

/** A made-up bakery incident with two placeholder steps; the loader, not this schema, parses each step. */
const incident = (over: Record<string, unknown> = {}) => ({
  id: 'inc-005',
  title: 'The proofing cabinets ran all night',
  modules: [3, 2],
  concepts: ['proof-box'],
  brief: 'The morning bill shows proofing cabinets that ran all night with no dough inside them.',
  steps: [{ id: 'q-a1b2c3' }, { id: 'q-d4e5f6' }],
  ...over,
});

const messages = (data: unknown): string[] => {
  const parsed = IncidentFile.safeParse(data);
  return parsed.success ? [] : parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('IncidentFile (spec 2.6, 4.5)', () => {
  it('accepts an incident and defaults its status to live', () => {
    const parsed = IncidentFile.parse(incident());
    expect(parsed.status).toBe('live');
    expect(IncidentFile.parse(incident({ status: 'retired' })).status).toBe('retired');
  });

  it('takes ids like inc-007 only', () => {
    expect(IncidentId.safeParse('inc-007').success).toBe(true);
    expect(IncidentId.safeParse('inc-7').success).toBe(false);
    expect(messages(incident({ id: 'incident-7' }))).toEqual(['id: must look like inc-007']);
  });

  it('needs 2 to 4 steps', () => {
    expect(messages(incident({ steps: [{ id: 'q-a1b2c3' }] }))).toEqual([
      'steps: Too small: expected array to have >=2 items',
    ]);
    expect(messages(incident({ steps: Array.from({ length: 5 }, () => ({})) }))).toEqual([
      'steps: Too big: expected array to have <=4 items',
    ]);
  });

  it('rejects a later module that is not lower than the home module, and a repeated module', () => {
    expect(messages(incident({ modules: [3, 4] }))).toEqual([
      'modules.1: module 4 must be lower than the home module 3',
    ]);
    expect(messages(incident({ modules: [3, 3] }))).toEqual([
      'modules: modules must be distinct',
      'modules.1: module 3 must be lower than the home module 3',
    ]);
  });

  it('rejects unknown keys', () => {
    expect(messages(incident({ hint: 'look at the bill' }))).toEqual([': Unrecognized key: "hint"']);
  });
});
