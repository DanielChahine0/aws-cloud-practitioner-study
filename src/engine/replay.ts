/** Derives all progress from the event log (spec 8.1); pure, and never throws on ids it does not know. */
import type { Mode, StudyEvent } from '../../schemas/events.ts';

export const ENGINE_VERSION = 1;

type AnswerEvent = Extract<StudyEvent, { t: 'answer' }>;

/** What the content knows: live question ids with their versions, and the lesson note ids. */
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
  /** The first answer to each question in this session. */
  answers: ReadonlyMap<string, AnswerRecord>;
  startedAt: string;
  submittedAt: string | null;
  abandoned: boolean;
}

export interface Progress {
  eventCount: number;
  /** Lesson note id to the time it was first done. */
  lessonsDone: ReadonlyMap<string, string>;
  /** Question id to every answer to it, oldest first. */
  answers: ReadonlyMap<string, readonly AnswerRecord[]>;
  /** Concept id to the question last shown for it. */
  lastShown: ReadonlyMap<string, string>;
  sessions: ReadonlyMap<string, SessionState>;
  /** Lesson check scope to its latest submitted score. */
  checkScores: ReadonlyMap<string, { correct: number; total: number; at: string }>;
  flags: number;
  unknownEvents: number;
}

interface MutableSession extends Omit<SessionState, 'answers'> {
  answers: Map<string, AnswerRecord>;
}

export function derive(events: readonly StudyEvent[], refs: ContentRefs | null): Progress {
  const sorted = [...events].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const lessonsDone = new Map<string, string>();
  const answers = new Map<string, AnswerRecord[]>();
  const lastShown = new Map<string, string>();
  const sessions = new Map<string, MutableSession>();
  const checkScores = new Map<string, { correct: number; total: number; at: string }>();
  let flags = 0;
  let unknownEvents = 0;

  for (const e of sorted) {
    switch (e.t) {
      case 'answer': {
        if (refs !== null && !refs.questions.has(e.qid)) unknownEvents++;
        const record: AnswerRecord = {
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
        answers.set(e.qid, [...(answers.get(e.qid) ?? []), record]);
        lastShown.set(e.concept, e.qid);
        const session = sessions.get(e.sid);
        if (session !== undefined && !session.answers.has(e.qid)) session.answers.set(e.qid, record);
        break;
      }
      case 'session': {
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
          break;
        }
        const session = sessions.get(e.sid);
        if (session === undefined) break;
        if (e.phase === 'abandon') {
          session.abandoned = true;
          break;
        }
        session.submittedAt = e.at;
        if (session.mode === 'check') {
          const correct = [...session.answers.values()].filter((a) => a.correct).length;
          checkScores.set(session.scope, { correct, total: session.qids.length, at: e.at });
        }
        break;
      }
      case 'lesson.done':
        if (refs !== null && !refs.notes.has(e.note)) unknownEvents++;
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
    eventCount: sorted.length,
    lessonsDone,
    answers,
    lastShown,
    sessions,
    checkScores,
    flags,
    unknownEvents,
  };
}

const entries = <K, V>(m: ReadonlyMap<K, V>): [K, V][] =>
  [...m.entries()].sort(([a], [b]) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0));

/** Plain JSON of a `Progress`, with maps as sorted entry arrays, for golden files. */
export function snapshotOf(p: Progress): unknown {
  return {
    eventCount: p.eventCount,
    lessonsDone: entries(p.lessonsDone),
    answers: entries(p.answers),
    lastShown: entries(p.lastShown),
    sessions: entries(p.sessions).map(([sid, s]) => [sid, { ...s, answers: entries(s.answers) }]),
    checkScores: entries(p.checkScores),
    flags: p.flags,
    unknownEvents: p.unknownEvents,
  };
}

/** The newest session of that mode and scope that was neither submitted nor abandoned. */
export function openSession(p: Progress, mode: Mode, scope: string): SessionState | null {
  let found: SessionState | null = null;
  for (const s of p.sessions.values()) {
    if (s.mode !== mode || s.scope !== scope || s.submittedAt !== null || s.abandoned) continue;
    if (found === null || s.sid > found.sid) found = s;
  }
  return found;
}
