import { DOMAIN_IDS, type DomainIdValue, FORM_IDS } from '../../schemas/ids.ts';
import { domainOf } from './quotas.ts';
import { type ExamResult, examsOf, type Progress, type SessionState, takenForms } from './replay.ts';
import { mulberry32, shuffle } from './rng.ts';

/**
 * The full mock (spec 4.3): a frozen form's live items in a seeded order, 90 minutes on the wall clock,
 * scored over the items it stored at the start; unanswered items count as wrong.
 * Only the first attempt of forms A to D is an unseen measurement; a remix (`src/engine/remix.ts`) never is.
 */
export const MOCK_MINUTES = 90;
/** Readiness reads first attempts submitted within this many days (spec 3.9). */
export const MOCK_WINDOW_DAYS = 21;
/** Unified Operations needs its latest mock at 80% within this many days (spec 3.4). */
export const RANK_MOCK_DAYS = 14;
export const FORMS = FORM_IDS;
/** The `form` of a remix mock's session events. */
export const REMIX = 'remix';

const isForm = (form: string | null): boolean => (FORMS as readonly string[]).includes(form ?? '');

/** The wall-clock deadline of a mock started at `start`, as an ISO time. */
export function mockDeadline(start: Date): string {
  return new Date(start.getTime() + MOCK_MINUTES * 60_000).toISOString();
}

/** The qids a mock stores at its start: the form's live items, in an order shuffled by the session seed. */
export function mockQids(form: readonly string[], live: ReadonlySet<string>, seed: number): string[] {
  return shuffle(
    form.filter((qid) => live.has(qid)),
    mulberry32(seed),
  );
}

/** One submitted mock: `percent` is the raw share right over the stored qids, and `day` the submit's study day. */
export interface MockAttempt {
  form: string;
  sid: string;
  percent: number;
  day: string;
  at: string;
  correct: number;
  total: number;
}

function attemptOf(result: ExamResult): MockAttempt {
  return {
    form: result.form ?? REMIX,
    sid: result.sid,
    percent: result.total === 0 ? 0 : result.correct / result.total,
    day: result.day,
    at: result.submittedAt,
    correct: result.correct,
    total: result.total,
  };
}

/** The first submitted session of each form A to D, in submit order; a remix never counts. */
export function firstAttempts(p: Progress): MockAttempt[] {
  const seen = new Set<string>();
  const out: MockAttempt[] = [];
  for (const result of examsOf(p, 'mock')) {
    if (result.form === null || !isForm(result.form) || seen.has(result.form)) continue;
    seen.add(result.form);
    out.push(attemptOf(result));
  }
  return out;
}

/** Every submitted mock, remixes included, newest first. */
export function mockHistory(p: Progress): MockAttempt[] {
  return examsOf(p, 'mock').map(attemptOf).reverse();
}

/** The first of forms A to D no mock has started yet, or null once all four are taken. */
export function nextForm(p: Progress): string | null {
  const taken = takenForms(p);
  return FORMS.find((form) => !taken.has(form)) ?? null;
}

/** A mock's score by domain, from its stored qids and first answers; `taskOf` maps each qid to its task. */
export function domainBars(
  result: ExamResult,
  session: SessionState,
  taskOf: ReadonlyMap<string, string>,
): { domain: DomainIdValue; correct: number; total: number }[] {
  if (result.sid !== session.sid) throw new Error(`result ${result.sid} is not session ${session.sid}`);
  const bars = DOMAIN_IDS.map((domain) => ({ domain, correct: 0, total: 0 }));
  for (const qid of session.qids) {
    const task = taskOf.get(qid);
    if (task === undefined) continue;
    const bar = bars.find((b) => b.domain === domainOf(task));
    if (bar === undefined) continue;
    bar.total++;
    if (session.answers.get(qid)?.correct === true) bar.correct++;
  }
  return bars;
}
