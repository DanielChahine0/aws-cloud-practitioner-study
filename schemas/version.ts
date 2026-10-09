/**
 * The storage shape version (spec 8.2); a change needs a step in `src/store/migrations`.
 * It lives apart from `schemas/events.ts` so the app can open the database without loading `zod/mini`.
 */
export const SCHEMA_VERSION = 1;
