import { z } from 'zod';

export const RULE_IDS = [
  'R1',
  'R2',
  'R3',
  'R4',
  'R5',
  'R6',
  'R7',
  'R8',
  'R9',
  'R10',
  'R11',
  'R12',
  'R13',
] as const;
export const RuleId = z.enum(RULE_IDS);
export type RuleId = z.infer<typeof RuleId>;

/** content/validate.yaml: the active validator rules and the R10 switches, raised phase by phase (spec 2.9). */
export const ValidateConfig = z.strictObject({
  rules: z.array(RuleId).min(1),
  practicePerConcept: z.union([z.literal(0), z.literal(2), z.literal(3)]),
  examQuotas: z.boolean(),
  blueprintTerms: z.boolean(),
});
export type ValidateConfig = z.infer<typeof ValidateConfig>;
