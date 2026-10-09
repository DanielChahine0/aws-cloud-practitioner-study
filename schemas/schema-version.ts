/**
 * The storage shape's version (spec 8.2), apart from schemas/events.ts so the app can read it without
 * pulling zod into the initial bundle; schemas/events.ts re-exports it.
 */
export const SCHEMA_VERSION = 1;
