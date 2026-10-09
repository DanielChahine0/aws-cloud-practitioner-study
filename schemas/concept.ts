import { z } from 'zod';
import { ConceptId, NoteId, Slug, TaskId } from './common.ts';

/** One entry of content/concepts.yaml, the one concept registry (spec 2.4). */
export const Concept = z
  .strictObject({
    id: ConceptId,
    name: z.string().min(1),
    home: NoteId,
    anchor: Slug,
    tasks: z.array(TaskId),
    tested: z.boolean().optional(),
    confusableWith: z.array(ConceptId).max(3).optional(),
    aliases: z.array(ConceptId).optional(),
    splitFrom: ConceptId.optional(),
  })
  .refine((c) => c.tested === false || c.tasks.length > 0, {
    message: 'a tested concept needs at least one task',
    path: ['tasks'],
  });
export type Concept = z.infer<typeof Concept>;
