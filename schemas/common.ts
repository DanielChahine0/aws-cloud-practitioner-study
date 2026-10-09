import { z } from 'zod';

/** Shared building blocks for the content schemas (spec 2). */
export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case');
export const ConceptId = Slug;
export const NoteId = z
  .string()
  .regex(/^m(?:0[1-9]|1[0-3])\/[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must look like m03/aws-lambda');
export const ModuleNumber = z.number().int().min(1).max(13);
export const IsoDate = z.iso.date();
export const HttpsUrl = z.url({ protocol: /^https$/ });

export const TASK_IDS = [
  '1.1',
  '1.2',
  '1.3',
  '1.4',
  '2.1',
  '2.2',
  '2.3',
  '2.4',
  '3.1',
  '3.2',
  '3.3',
  '3.4',
  '3.5',
  '3.6',
  '3.7',
  '3.8',
  '4.1',
  '4.2',
  '4.3',
] as const;
export const TaskId = z.enum(TASK_IDS);
export type TaskId = z.infer<typeof TaskId>;
