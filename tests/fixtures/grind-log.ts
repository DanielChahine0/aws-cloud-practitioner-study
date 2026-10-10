import type { NewEvent } from '../../schemas/events.ts';
import { addDays } from '../../src/engine/day.ts';
import { SID } from './events.ts';
import { JOURNEY_CONTENT, variantId } from './journeys/content.ts';
import { answerOf } from './memory.ts';

/** A dated event, as `timelineOf` takes it. */
export type Item = readonly [string, NewEvent];

/** The first study day of the grind logs. */
export const GRIND_START = '2026-10-01';

/** The days of the long grind log, 150 events each. */
export const GRIND_DAYS = 100;

/** An ISO time `minute` minutes after 04:00 UTC on day `n` from the start, so it stays in that study day. */
export const timeOf = (n: number, minute: number): string =>
  new Date(Date.parse(`${addDays(GRIND_START, n)}T04:00:00.000Z`) + minute * 60_000).toISOString();

/**
 * The 15,000-event log of the replay cost budget (spec 8.1): 100 days over the 130 journey concepts, each day
 * a boss or mock of about 50 items and about 100 quiz and review answers, so a third of the answers are held.
 */
export function grindLog(): Item[] {
  const concepts = [...JOURNEY_CONTENT.concepts.keys()];
  const items: Item[] = [];
  for (let day = 0; day < GRIND_DAYS; day++) {
    const sid = `01JC${String(day).padStart(22, '0')}`;
    const mode = day % 2 === 0 ? 'boss' : 'mock';
    const examQids: string[] = [];
    const answers: Item[] = [];
    for (let n = 0; n < 148; n++) {
      const concept = concepts[(day * 37 + n) % concepts.length] as string;
      const qid = variantId(concept, n % 2 === 0 ? 'a' : 'b');
      const exam = n % 3 === 0;
      if (exam) examQids.push(qid);
      answers.push([
        timeOf(day, 5 + n * 5),
        answerOf({
          concept,
          qid,
          correct: (day + n) % 5 !== 0,
          sure: exam ? false : n % 3 !== 0,
          mode: exam ? mode : n % 4 === 1 ? 'quiz' : 'review',
          sid: exam ? sid : SID,
          ...(exam ? { flagged: n % 7 === 0 } : {}),
        }),
      ]);
    }
    const form = day % 8 === 1 ? 'A' : 'remix';
    items.push([
      timeOf(day, 0),
      {
        t: 'session',
        sid,
        mode,
        phase: 'start',
        seed: day,
        scope: mode === 'boss' ? `m${String((day % 13) + 1).padStart(2, '0')}` : 'a',
        qids: examQids,
        deadline: timeOf(day, 90),
        ...(mode === 'mock' ? { form } : {}),
      },
    ]);
    items.push(...answers, [timeOf(day, 745), { t: 'session', sid, mode, phase: 'submit', seed: day }]);
  }
  return items;
}
