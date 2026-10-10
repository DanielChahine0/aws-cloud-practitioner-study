import type { Mode, NewEvent } from '../../schemas/events.ts';
import type { ConceptInfo, MemoryContent } from '../../src/engine/memory.ts';
import { SID } from './events.ts';

/** One made-up concept for engine tests; untested only when `tested` is false. */
export interface ConceptSpec {
  id: string;
  module: number;
  tested?: boolean;
  confusableWith?: readonly string[];
  splitFrom?: string | null;
  aliases?: readonly string[];
  tasks?: readonly string[];
}

/** The Phase 3 extras of `MemoryContent`, empty unless a test sets them. */
export interface ContentExtras {
  examTasks?: ReadonlyMap<string, string>;
  coreLabs?: ReadonlyMap<number, readonly string[]>;
  keptMissions?: ReadonlySet<string>;
}

/** Builds a `MemoryContent` from concept specs, with aliases pointing at their concept. */
export function contentOf(
  specs: readonly ConceptSpec[],
  questionVersions: ReadonlyMap<string, number> = new Map(),
  extras: ContentExtras = {},
): MemoryContent {
  const concepts = new Map<string, ConceptInfo>();
  const aliases = new Map<string, string>();
  for (const s of specs) {
    concepts.set(s.id, {
      module: s.module,
      tested: s.tested ?? true,
      confusableWith: s.confusableWith ?? [],
      splitFrom: s.splitFrom ?? null,
      tasks: s.tasks ?? [],
    });
    for (const alias of s.aliases ?? []) aliases.set(alias, s.id);
  }
  return {
    concepts,
    aliases,
    questionVersions,
    examTasks: extras.examTasks ?? new Map(),
    coreLabs: extras.coreLabs ?? new Map(),
    keptMissions: extras.keptMissions ?? new Set(),
  };
}

/** An ISO time on a study day at a UTC hour, for logs written at offset 0. */
export function at(day: string, hour = 10, minute = 0): string {
  return `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

/** An answer event; the concept's first variant is `q-<concept>-1`. */
export function answerOf(args: {
  concept: string;
  correct: boolean;
  sure: boolean;
  qid?: string;
  mode?: Mode;
  sid?: string;
  relearn?: boolean;
  ms?: number;
  qv?: number;
  picked?: string[];
  flagged?: boolean;
  changes?: string[][];
}): NewEvent {
  const event: NewEvent = {
    t: 'answer',
    sid: args.sid ?? SID,
    mode: args.mode ?? 'check',
    qid: args.qid ?? `q-${args.concept}-1`,
    qv: args.qv ?? 1,
    concept: args.concept,
    picked: args.picked ?? ['a'],
    correct: args.correct,
    sure: args.sure,
    ms: args.ms ?? 20_000,
    ...(args.flagged === undefined ? {} : { flagged: args.flagged }),
    ...(args.changes === undefined ? {} : { changes: args.changes }),
  };
  return args.relearn === undefined ? event : { ...event, relearn: args.relearn };
}

/** A session start event over the given questions. */
export function startOf(sid: string, mode: Mode, qids: readonly string[], scope = ''): NewEvent {
  return { t: 'session', sid, mode, phase: 'start', seed: 7, scope, qids: [...qids] };
}

/** A session submit event. */
export function submitOf(sid: string, mode: Mode): NewEvent {
  return { t: 'session', sid, mode, phase: 'submit', seed: 7 };
}

/** A boss or mock start: the scope (`m03` for a boss), the form (`A` to `D` or `remix`) and the deadline. */
export function examStartOf(
  sid: string,
  mode: 'boss' | 'mock',
  qids: readonly string[],
  opts: { scope?: string; form?: string; deadline: string },
): NewEvent {
  return {
    t: 'session',
    sid,
    mode,
    phase: 'start',
    seed: 7,
    scope: opts.scope ?? '',
    qids: [...qids],
    deadline: opts.deadline,
    ...(opts.form === undefined ? {} : { form: opts.form }),
  };
}

/** A session abandon event. */
export function abandonOf(sid: string, mode: Mode): NewEvent {
  return { t: 'session', sid, mode, phase: 'abandon', seed: 7 };
}

/** An error-review cause for one item of a session. */
export function causeOf(sid: string, qid: string, cause: 'unknown' | 'confused' | 'misread'): NewEvent {
  return { t: 'cause', sid, qid, cause };
}

/** A recorded promotion. */
export function rankOf(rank: string): NewEvent {
  return { t: 'rank', rank };
}
