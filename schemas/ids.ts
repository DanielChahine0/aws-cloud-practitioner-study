/**
 * Zod-free id lists shared by the content schemas and the engine (spec 3.10, 4.3).
 * `src/engine` imports these arrays, so this file must never import zod.
 */

/** The four CLF-C02 domains, in blueprint order. */
export const DOMAIN_IDS = ['1', '2', '3', '4'] as const;
export type DomainIdValue = (typeof DOMAIN_IDS)[number];

/** The four frozen mock forms (spec 4.3). */
export const FORM_IDS = ['A', 'B', 'C', 'D'] as const;
export type FormIdValue = (typeof FORM_IDS)[number];

/** The 12 badges in spec 3.10 order. */
export const BADGE_IDS = [
  'first-brew',
  'clean-queue',
  'changed-my-mind',
  'long-memory',
  'well-calibrated',
  'hands-on',
  'lab-complete',
  'leave-no-trace',
  'full-dress-rehearsal',
  'pass-mark',
  'even-keel',
  'architect',
] as const;
export type BadgeIdValue = (typeof BADGE_IDS)[number];

/** The lab engines (spec 5.1): Sort, Configure and Simulate since Phase 4; Place, Trace and Investigate since Phase 5. */
export const LAB_ENGINES = ['sort', 'configure', 'simulate', 'place', 'trace', 'investigate'] as const;
export type LabEngineId = (typeof LAB_ENGINES)[number];

/** A lab id: `lab-mNN-<slug>`, where NN is the lab's module (spec 1.2). */
export const LAB_ID = /^lab-m(0[1-9]|1[0-3])-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** An incident id: `inc-NNN` (spec 1.2). */
export const INCIDENT_ID = /^inc-\d{3}$/;
