import type { Mode, StudyEvent } from '../../schemas/events.ts';

/**
 * The pure replay (spec 8): every bit of progress is derived from the event log, never stored.
 * Changing what `derive` computes from the same events bumps `ENGINE_VERSION`.
 */
export const ENGINE_VERSION = 1;

type AnswerEvent = Extract<StudyEvent, { t: 'answer' }>;
type SessionEvent = Extract<StudyEvent, { t: 'session' }>;

/** What the shipped content knows: live question ids with their versions, and the lesson note ids. */
export interface ContentRefs {
  questions: ReadonlyMap<string, number>;
  notes: ReadonlySet<string>;
}

export interface AnswerRecord {
  qid: string;
  qv: number;
  sid: string;
  mode: Mode;
  at: string;
  day: string;
  correct: boolean;
  sure: boolean;
  picked: AnswerEvent['picked'];
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
  submittedAt: string | null;
  abandoned: boolean;
}

export interface CheckScore {
  correct: number;
  total: number;
  at: string;
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
  /** Events that refer to a question or note the shipped content does not have. */
  unknownEvents: number;
}

interface MutableSession extends SessionState {
  answers: Map<string, AnswerRecord>;
}

const byId = (a: StudyEvent, b: StudyEvent): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

function recordOf(e: AnswerEvent): AnswerRecord {
  return {
    qid: e.qid,
    qv: e.qv,
    sid: e.sid,
    mode: e.mode,
    at: e.at,
    day: e.day,
    correct: e.correct,
    sure: e.sure,
    picked: e.picked,
  };
}

function applySession(
  e: SessionEvent,
  sessions: Map<string, MutableSession>,
  scores: Map<string, CheckScore>,
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
      submittedAt: null,
      abandoned: false,
    });
    return;
  }
  const session = sessions.get(e.sid);
  if (!session) return;
  if (e.phase === 'abandon') {
    session.abandoned = true;
    return;
  }
  session.submittedAt = e.at;
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
        applySession(e, sessions, checkScores);
        break;
      case 'lesson.done':
        if (refs && !refs.notes.has(e.note)) unknownEvents++;
        if (!lessonsDone.has(e.note)) lessonsDone.set(e.note, e.at);
        break;
      case 'flag':
        flags++;
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
    unknownEvents,
  };
}

function plain(value: unknown): unknown {
  if (value instanceof Map) {
    return [...value.entries()]
      .sort(([a], [b]) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0))
      .map(([key, inner]) => [key, plain(inner)]);
  }
  if (value instanceof Set) return [...value].sort().map(plain);
  if (Array.isArray(value)) return value.map(plain);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = plain((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

/** Plain JSON of a progress state, with maps as sorted entry arrays, for golden snapshot files. */
export function snapshotOf(p: Progress): unknown {
  return plain(p);
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
