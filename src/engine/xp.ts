/**
 * The XP table (spec 3.2). Every row pays: lessons, the bet, the effort bonus, lightning rounds, incidents, labs,
 * bosses, mocks, capstone decisions (on the first final grade) and missions (when they close), each once as spec 3.2 says.
 */
export const XP = {
  lesson: 10,
  lightningPerCorrect: 1,
  lightningDailyCap: 10,
  incidentPerfect: 15,
  incident: 8,
  lab: 30,
  labNoHints: 10,
  boss: 100,
  mock: 150,
  decision: 20,
  decisionGood: 10,
  mission0: 50,
  mission: 75,
} as const;

/** The effort bonus of a right answer on a due concept: `round(10 * (1 - R))`, R when the question showed. */
export function effortBonus(recallWhenShown: number): number {
  const r = Math.min(1, Math.max(0, recallWhenShown));
  return Math.round(10 * (1 - r));
}
