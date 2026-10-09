import { z } from 'zod';
import { ConceptId, ModuleNumber, Slug } from './common.ts';

/** Lesson note frontmatter, as resources/README.md defines it. */
export const LessonFrontmatter = z.strictObject({
  module: ModuleNumber,
  lesson: z.number().int().min(1),
  slug: Slug,
  title: z.string().min(1),
  source: z.string().min(1),
  concepts: z.array(ConceptId).min(1),
});
export type LessonFrontmatter = z.infer<typeof LessonFrontmatter>;

/** Module README frontmatter, as resources/README.md defines it. */
export const ModuleFrontmatter = z.strictObject({
  module: ModuleNumber,
  slug: Slug,
  title: z.string().min(1),
  source: z.string().min(1),
  lessons: z.number().int().min(1),
  assessment_questions: z.number().int().min(0),
});
export type ModuleFrontmatter = z.infer<typeof ModuleFrontmatter>;
