import { describe, expect, it } from 'vitest';
import { TraceSpec } from '../../schemas/lab-trace.ts';
import { TRACE_POLICY_SPEC } from '../fixtures/lab-trace.ts';

/**
 * The Trace schema checked principal ids and group ids for duplicates only within each list, but an identity policy
 * attaches to either by the same id, and the model gathers a principal's policies by its own id and its group ids.
 * So a principal named like a group passed the schema, and a policy meant for that principal alone reached every
 * member of the group: here Lu's till policy, once Lu is renamed `bakers`, would let Mo open the till.
 */
describe('a Trace spec whose principal shares an id with a group', () => {
  it('is rejected, so no policy meant for one reaches the other', () => {
    const spec = structuredClone(TRACE_POLICY_SPEC) as unknown as {
      principals: { id: string }[];
      policies: { id: string; attach: string }[];
      cases: { principal: string }[];
    };
    (spec.principals[1] as { id: string }).id = 'bakers';
    for (const p of spec.policies) if (p.attach === 'cashier-lu') p.attach = 'bakers';
    for (const c of spec.cases) if (c.principal === 'cashier-lu') c.principal = 'bakers';

    const parsed = TraceSpec.safeParse(spec);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.map((i) => [i.message, i.path])).toEqual([
      ['principal or group bakers is used twice', ['groups', 0, 'id']],
    ]);
  });
});
