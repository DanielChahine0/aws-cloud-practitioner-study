import type { Mode, StudyEvent } from '../../schemas/events.ts';
import { FORM_IDS } from '../../schemas/ids.ts';

/**
 * The pure replay (spec 8): every bit of progress is derived from the event log, never stored.
 * Changing what `derive` or `deriveMemory` computes from the same events bumps `ENGINE_VERSION`.
 * Version 2 adds XP and FSRS (`src/engine/memory.ts`) and the answer's id, concept and relearn flag.
 * Version 3 applies boss and mock answers on submit, pays exam XP and qualifies exam days.
 * Version 4 judges past days with the exam date in force when they happened, keeps the schedule of the current
 * exam date, and counts the inherited card of a split concept not yet answered as due.
 * Version 5 pays lab XP, counts lab debriefs and gives Hands On per complete module, pays incident XP.
 * Version 5 also pays lightning XP and makes a missed lightning concept due today through `review.now`.
 * Version 6 pays mission and capstone decision XP and keeps the first final grade per module.
 */
export const ENGINE_VERSION = 6;

type AnswerEvent = Extract<StudyEvent, { t: 'answer' }>;
type SessionEvent = Extract<StudyEvent, { t: 'session' }>;

/** What the shipped content knows: live question ids with their versions, the lesson note ids, and the lab and incident ids. */
export interface ContentRefs {
  questions: ReadonlyMap<string, number>;
  notes: ReadonlySet<string>;
  labs: ReadonlySet<string>;
  incidents: ReadonlySet<string>;
}

/** A lab's first completion; a later `lab.done` of the same lab never replaces or revokes it (spec 8.4). */
export interface LabDone {
  at: string;
  day: string;
  rev: number;
  hints: number;
  eventId: string;
}

export interface AnswerRecord {
  /** The answer event's id, which keys its XP in `MemoryState.xpByEvent`. */
  id: string;
  qid: string;
  qv: number;
  sid: string;
  mode: Mode;
  at: string;
  day: string;
  correct: boolean;
  sure: boolean;
  picked: AnswerEvent['picked'];
  /** The concept id as written, before any alias is resolved. */
  concept: string;
  relearn: boolean;
  /** Flagged in a boss or mock, where the flag stands in for Not sure. */
  flagged: boolean;
  /** Every earlier pick of an exam item, oldest first, for error review. */
  changes: readonly string[][];
}

export interface SessionState {
  sid: string;
  mode: Mode;
  scope: string;
  seed: number;
  qids: readonly string[];
  /** The first answer per question in this session; later answers to the same question never count. */
  answers: ReadonlyMap<string, AnswerRecord>;
  startedAt: string;
  /** The study day stamped on the start event, which a lightning round's pay counts in (spec 3.2). */
  startDay: string;
  submittedAt: string | null;
  abandoned: boolean;
  /** A mock's form (`A` to `D` or `remix`), else null. */
  form: string | null;
  /** A boss or mock deadline, else null. */
  deadline: string | null;
  /** The id of the submit event that closed the session, which keys its exam XP. */
  submitId: string | null;
}

export interface CheckScore {
  correct: number;
  total: number;
  at: string;
}

export type Cause = 'unknown' | 'confused' | 'misread';

/** A submitted boss or mock; unanswered items count in `total` and never in `correct` (spec 4.3). */
export interface ExamResult {
  sid: string;
  mode: 'boss' | 'mock';
  /** The module (`m03`) of a boss; the session scope of a mock. */
  scope: string;
  form: string | null;
  correct: number;
  /** Items with a non-empty pick. */
  answered: number;
  total: number;
  startedAt: string;
  submittedAt: string;
  /** The study day of the submit event, which the mock window, readiness and ranks count in. */
  day: string;
  deadline: string | null;
  timedOut: boolean;
  submitId: string;
}

export interface Progress {
  eventCount: number;
  /** Lesson note id to the time it was first marked done. */
  lessonsDone: ReadonlyMap<string, string>;
  /** Question id to every answer, oldest first. */
  answers: ReadonlyMap<string, readonly AnswerRecord[]>;
  /** Concept id to the question id answered last for it. */
  lastShown: ReadonlyMap<string, string>;
  sessions: ReadonlyMap<string, SessionState>;
  /** Lesson check scope (`m03/aws-lambda`) to its latest submitted score. */
  checkScores: ReadonlyMap<string, CheckScore>;
  flags: number;
  /** Submitted boss and mock sessions by session id, in submit order. */
  exams: ReadonlyMap<string, ExamResult>;
  /** Error-review causes keyed `${sid} ${qid}`; the latest cause event wins. */
  causes: ReadonlyMap<string, Cause>;
  /** Rank ids recorded by `rank` events. */
  ranks: ReadonlySet<string>;
  /** Lab id to its first completion. */
  labsDone: ReadonlyMap<string, LabDone>;
  /**
   * Study day to every incident offered that day, once each in log order (spec 4.5). The day's incident is the first
   * that still ships, so an offer that a deploy or an import dropped gives way to a later one.
   */
  incidentsOffered: ReadonlyMap<string, readonly string[]>;
  /** Incident id to the study day of its first `incident.done`; a solved incident is never offered again. */
  incidentsDone: ReadonlyMap<string, string>;
  /** Events that refer to a question, note, lab or incident the shipped content does not have. */
  unknownEvents: number;
}

interface MutableSession extends SessionState {
  answers: Map<string, AnswerRecord>;
}

const byId = (a: StudyEvent, b: StudyEvent): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function recordOf(e: AnswerEvent): AnswerRecord {
  return {
    id: e.id,
    qid: e.qid,
    qv: e.qv,
    sid: e.sid,
    mode: e.mode,
    at: e.at,
    day: e.day,
    correct: e.correct,
    sure: e.sure,
    picked: e.picked,
    concept: e.concept,
    relearn: e.relearn === true,
    flagged: e.flagged === true,
    changes: e.changes ?? [],
  };
}

const isExamMode = (mode: Mode): mode is 'boss' | 'mock' => mode === 'boss' || mode === 'mock';

function examResultOf(session: MutableSession, mode: 'boss' | 'mock', e: SessionEvent): ExamResult {
  let correct = 0;
  let answered = 0;
  for (const qid of session.qids) {
    const a = session.answers.get(qid);
    if (a?.correct === true) correct++;
    if (a !== undefined && a.picked.length > 0) answered++;
  }
  return {
    sid: session.sid,
    mode,
    scope: session.scope,
    form: session.form,
    correct,
    answered,
    total: session.qids.length,
    startedAt: session.startedAt,
    submittedAt: e.at,
    day: e.day,
    deadline: session.deadline,
    timedOut: session.deadline !== null && Date.parse(e.at) >= Date.parse(session.deadline),
    submitId: e.id,
  };
}

function applySession(
  e: SessionEvent,
  sessions: Map<string, MutableSession>,
  scores: Map<string, CheckScore>,
  exams: Map<string, ExamResult>,
) {
  if (e.phase === 'start') {
    sessions.set(e.sid, {
      sid: e.sid,
      mode: e.mode,
      scope: e.scope ?? '',
      seed: e.seed,
      qids: e.qids ?? [],
      answers: new Map(),
      startedAt: e.at,
      startDay: e.day,
      submittedAt: null,
      abandoned: false,
      form: e.form ?? null,
      deadline: e.deadline ?? null,
      submitId: null,
    });
    return;
  }
  const session = sessions.get(e.sid);
  if (!session || session.submittedAt !== null || session.abandoned) return;
  if (e.phase === 'abandon') {
    session.abandoned = true;
    return;
  }
  session.submittedAt = e.at;
  session.submitId = e.id;
  if (isExamMode(session.mode)) exams.set(session.sid, examResultOf(session, session.mode, e));
  if (session.mode === 'check') {
    let correct = 0;
    for (const qid of session.qids) if (session.answers.get(qid)?.correct === true) correct++;
    scores.set(session.scope, { correct, total: session.qids.length, at: e.at });
  }
}

/** Replays the log in id order; unknown ids are counted and kept, never thrown on (spec 8.4). */
export function derive(events: readonly StudyEvent[], refs: ContentRefs | null): Progress {
  const lessonsDone = new Map<string, string>();
  const answers = new Map<string, AnswerRecord[]>();
  const lastShown = new Map<string, string>();
  const sessions = new Map<string, MutableSession>();
  const checkScores = new Map<string, CheckScore>();
  const exams = new Map<string, ExamResult>();
  const causes = new Map<string, Cause>();
  const ranks = new Set<string>();
  const labsDone = new Map<string, LabDone>();
  const incidentsOffered = new Map<string, string[]>();
  const incidentsDone = new Map<string, string>();
  let flags = 0;
  let unknownEvents = 0;

  for (const e of [...events].sort(byId)) {
    switch (e.t) {
      case 'answer': {
        if (refs && !refs.questions.has(e.qid)) unknownEvents++;
        const record = recordOf(e);
        const list = answers.get(e.qid);
        if (list) list.push(record);
        else answers.set(e.qid, [record]);
        lastShown.set(e.concept, e.qid);
        const session = sessions.get(e.sid);
        if (session && !session.answers.has(e.qid)) session.answers.set(e.qid, record);
        break;
      }
      case 'session':
        applySession(e, sessions, checkScores, exams);
        break;
      case 'lesson.done':
        if (refs && !refs.notes.has(e.note)) unknownEvents++;
        if (!lessonsDone.has(e.note)) lessonsDone.set(e.note, e.at);
        break;
      case 'flag':
        flags++;
        break;
      case 'cause':
        causes.set(`${e.sid} ${e.qid}`, e.cause);
        break;
      case 'rank':
        ranks.add(e.rank);
        break;
      case 'lab.done':
        if (refs && !refs.labs.has(e.lab)) unknownEvents++;
        if (!labsDone.has(e.lab))
          labsDone.set(e.lab, { at: e.at, day: e.day, rev: e.rev, hints: e.hints, eventId: e.id });
        break;
      case 'incident.offered': {
        if (refs && !refs.incidents.has(e.incident)) unknownEvents++;
        const offered = incidentsOffered.get(e.day);
        if (offered === undefined) incidentsOffered.set(e.day, [e.incident]);
        else if (!offered.includes(e.incident)) offered.push(e.incident);
        break;
      }
      case 'incident.done':
        if (refs && !refs.incidents.has(e.incident)) unknownEvents++;
        if (!incidentsDone.has(e.incident)) incidentsDone.set(e.incident, e.day);
        break;
      default:
        break;
    }
  }

  return {
    eventCount: events.length,
    lessonsDone,
    answers,
    lastShown,
    sessions,
    checkScores,
    flags,
    exams,
    causes,
    ranks,
    labsDone,
    incidentsOffered,
    incidentsDone,
    unknownEvents,
  };
}

const FORMS: ReadonlySet<string> = new Set(FORM_IDS);

/** The forms `A` to `D` of every started mock, submitted or not; a remix is never a form (spec 4.3). */
export function takenForms(p: Progress): ReadonlySet<string> {
  const taken = new Set<string>();
  for (const s of p.sessions.values()) {
    if (s.mode === 'mock' && s.form !== null && FORMS.has(s.form)) taken.add(s.form);
  }
  return taken;
}

/**
 * The forms `A` to `D` whose every mock is over, submitted or abandoned: only these may join practice (spec 4.3), so
 * no learn screen shows an item, its key or its explanation while a mock of its form is still open.
 */
export function practiceForms(p: Progress): ReadonlySet<string> {
  const closed = new Set<string>();
  const open = new Set<string>();
  for (const s of p.sessions.values()) {
    if (s.mode !== 'mock' || s.form === null || !FORMS.has(s.form)) continue;
    (s.submittedAt !== null || s.abandoned ? closed : open).add(s.form);
  }
  for (const form of open) closed.delete(form);
  return closed;
}

/** The submitted exams of one mode, and of one scope when given, in submit order. */
export function examsOf(p: Progress, mode: 'boss' | 'mock', scope?: string): ExamResult[] {
  return [...p.exams.values()].filter((r) => r.mode === mode && (scope === undefined || r.scope === scope));
}

/** Plain JSON of any derived state: maps become sorted entry arrays, sets sorted arrays, keys sorted. */
export function toPlain(value: unknown): unknown {
  if (value instanceof Map) {
    return [...value.entries()]
      .sort(([a], [b]) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0))
      .map(([key, inner]) => [key, toPlain(inner)]);
  }
  if (value instanceof Set) return [...value].sort().map(toPlain);
  if (Array.isArray(value)) return value.map(toPlain);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = toPlain((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

/** Plain JSON of a progress state, with maps as sorted entry arrays, for golden snapshot files. */
export function snapshotOf(p: Progress): unknown {
  return toPlain(p);
}

/** The newest session of that mode and scope that was neither submitted nor abandoned. */
export function openSession(p: Progress, mode: Mode, scope: string): SessionState | null {
  let best: SessionState | null = null;
  for (const s of p.sessions.values()) {
    if (s.mode !== mode || s.scope !== scope || s.submittedAt !== null || s.abandoned) continue;
    if (!best || s.startedAt > best.startedAt || (s.startedAt === best.startedAt && s.sid > best.sid))
      best = s;
  }
  return best;
}
