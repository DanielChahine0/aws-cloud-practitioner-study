/**
 * The confidence bet (spec 3.1): Sure pays 10 or 0, Not sure pays 8 or 5.
 * Expected XP is `10p` for Sure and `5 + 3p` for Not sure, so Sure pays only above p = 5/7.
 */
export const BET = { sure: { right: 10, wrong: 0 }, notSure: { right: 8, wrong: 5 } } as const;

/** The probability of being right at which both buttons pay the same, about 71.4%. */
export const SURE_BREAKEVEN = 5 / 7;

export const SURE_HINT = 'Press Sure when you are more than 71% sure.';

/** The bet XP of one counted answer. */
export function betXp(correct: boolean, sure: boolean): number {
  const row = sure ? BET.sure : BET.notSure;
  return correct ? row.right : row.wrong;
}

/** The expected bet XP at a probability `p` of being right. */
export function expectedXp(p: number, sure: boolean): number {
  const row = sure ? BET.sure : BET.notSure;
  return p * row.right + (1 - p) * row.wrong;
}
