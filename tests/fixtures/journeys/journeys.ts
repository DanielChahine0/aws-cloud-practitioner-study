import type { Mode, NewEvent, StudyEvent } from '../../../schemas/events.ts';
import { addDays } from '../../../src/engine/day.ts';
import { timelineOf } from '../events.ts';
import { conceptId, lessonConcepts, lessonNote, MOCK_A_ITEMS, variantId } from './content.ts';

/** How one exam item goes, by qid; right, unflagged and answered unless listed. */
interface ExamScript {
  wrong?: readonly string[];
  flagged?: readonly string[];
  blank?: readonly string[];
}

/** How one answer of a scripted session goes; right and Sure unless listed. */
interface Script {
  wrongSure?: readonly string[];
  wrong?: readonly string[];
  notSure?: readonly string[];
  variant?: 'a' | 'b';
}

type Item = readonly [string, NewEvent];

/** Builds timelines one minute per event from a start time, with session ids that count up. */
class Journey {
  private items: Item[] = [];
  private sessions = 0;

  private push(at: Date, event: NewEvent): Date {
    this.items.push([at.toISOString(), event]);
    return new Date(at.getTime() + 60_000);
  }

  read(at: string, note: string): this {
    this.push(new Date(at), { t: 'lesson.done', note });
    return this;
  }

  /** A lab completion with the hints opened during the run, at `rev` 1. */
  lab(at: string, id: string, hints: number): this {
    this.push(new Date(at), { t: 'lab.done', lab: id, rev: 1, hints });
    return this;
  }

  /** A lab's debrief: a `debrief` session scoped to the lab, one answer per concept, then the submit. */
  debrief(at: string, labId: string, concepts: readonly string[], script: Script = {}): this {
    return this.session(at, 'debrief', labId, concepts, script);
  }

  /**
   * Today's incident: the offer at `at`, a minute later the incident session with one step per concept (all right
   * when `firstTry`, else the last step wrong and not Sure), and the `incident.done` right after its submit.
   */
  incident(at: string, id: string, steps: readonly string[], firstTry: boolean): this {
    const start = this.push(new Date(at), { t: 'incident.offered', incident: id });
    const last = steps[steps.length - 1] ?? '';
    this.session(
      start.toISOString(),
      'incident',
      id,
      steps,
      firstTry ? {} : { wrong: [last], notSure: [last] },
    );
    const done = new Date(start.getTime() + (steps.length + 2) * 60_000);
    this.push(done, { t: 'incident.done', incident: id, firstTry });
    return this;
  }

  examDate(at: string, examDate: string | null): this {
    this.push(new Date(at), { t: 'settings', patch: { examDate } });
    return this;
  }

  /** A session start, one answer per concept and, unless `open`, a submit. */
  session(
    at: string,
    mode: Mode,
    scope: string,
    concepts: readonly string[],
    script: Script = {},
    open = false,
  ): this {
    this.sessions += 1;
    const sid = `01JB${String(this.sessions).padStart(22, '0')}`;
    const variant = script.variant ?? 'a';
    const qids = concepts.map((c) => variantId(c, variant));
    let t = this.push(new Date(at), {
      t: 'session',
      sid,
      mode,
      phase: 'start',
      seed: this.sessions,
      scope,
      qids,
    });
    for (const concept of concepts) {
      const wrongSure = script.wrongSure?.includes(concept) ?? false;
      const wrong = wrongSure || (script.wrong?.includes(concept) ?? false);
      t = this.push(t, {
        t: 'answer',
        sid,
        mode,
        qid: variantId(concept, variant),
        qv: 1,
        concept,
        picked: [wrong ? 'b' : 'a'],
        correct: !wrong,
        sure: wrongSure || !(script.notSure?.includes(concept) ?? false),
        ms: 20_000,
      });
    }
    if (!open) this.push(t, { t: 'session', sid, mode, phase: 'submit', seed: this.sessions });
    return this;
  }

  /**
   * A boss or mock: the start with its deadline at `at`, then, `submitAfter` minutes later, one answer per
   * `[qid, concept]` item a millisecond apart (as the app writes them at submit) and the submit.
   */
  exam(
    at: string,
    mode: 'boss' | 'mock',
    scope: string,
    form: string | null,
    items: readonly (readonly [string, string])[],
    script: ExamScript,
    minutes: number,
    submitAfter: number,
  ): this {
    this.sessions += 1;
    const sid = `01JB${String(this.sessions).padStart(22, '0')}`;
    const start = Date.parse(at);
    const deadline = new Date(start + minutes * 60_000).toISOString();
    this.items.push([
      new Date(start).toISOString(),
      {
        t: 'session',
        sid,
        mode,
        phase: 'start',
        seed: this.sessions,
        scope,
        qids: items.map(([qid]) => qid),
        deadline,
        ...(form === null ? {} : { form }),
      },
    ]);
    const end = start + submitAfter * 60_000;
    items.forEach(([qid, concept], i) => {
      const blank = script.blank?.includes(qid) ?? false;
      const wrong = blank || (script.wrong?.includes(qid) ?? false);
      this.items.push([
        new Date(end + i).toISOString(),
        {
          t: 'answer',
          sid,
          mode,
          qid,
          qv: 1,
          concept,
          picked: blank ? [] : [wrong ? 'b' : 'a'],
          correct: !wrong,
          sure: false,
          flagged: script.flagged?.includes(qid) ?? false,
          changes: [],
          ms: 0,
        },
      ]);
    });
    this.items.push([
      new Date(end + items.length).toISOString(),
      { t: 'session', sid, mode, phase: 'submit', seed: this.sessions },
    ]);
    return this;
  }

  /**
   * A lightning round at `at` (spec 4.1), as the screen writes it: the start with its 90 second deadline, one answer
   * per `[concept, correct]` five seconds apart on the concept's variant a, then at the end the submit and one
   * `review.now` per missed concept, a millisecond apart.
   */
  lightning(at: string, answers: readonly (readonly [string, boolean])[]): this {
    this.sessions += 1;
    const sid = `01JB${String(this.sessions).padStart(22, '0')}`;
    const start = Date.parse(at);
    const iso = (ms: number): string => new Date(ms).toISOString();
    this.items.push([
      iso(start),
      {
        t: 'session',
        sid,
        mode: 'lightning',
        phase: 'start',
        seed: this.sessions,
        scope: 'lightning',
        qids: answers.map(([concept]) => variantId(concept, 'a')),
        deadline: iso(start + 90_000),
      },
    ]);
    answers.forEach(([concept, correct], i) => {
      this.items.push([
        iso(start + (i + 1) * 5_000),
        {
          t: 'answer',
          sid,
          mode: 'lightning',
          qid: variantId(concept, 'a'),
          qv: 1,
          concept,
          picked: [correct ? 'a' : 'b'],
          correct,
          sure: false,
          ms: 5_000,
        },
      ]);
    });
    const end = start + (answers.length + 1) * 5_000;
    this.items.push([
      iso(end),
      { t: 'session', sid, mode: 'lightning', phase: 'submit', seed: this.sessions },
    ]);
    const missed = [...new Set(answers.filter(([, correct]) => !correct).map(([concept]) => concept))];
    missed.forEach((concept, i) => {
      this.items.push([iso(end + i + 1), { t: 'review.now', concept }]);
    });
    return this;
  }

  /** One mission step, with the credits left when it is a usage check that names them. */
  mission(
    at: string,
    mission: string,
    step: 'start' | 'verified' | 'cleaned' | 'usage-ok',
    credits?: number,
  ): this {
    this.push(new Date(at), { t: 'mission', mission, step, ...(credits === undefined ? {} : { credits }) });
    return this;
  }

  /** One capstone grade of `module`, with the ticked key point ids on a final. */
  decision(
    at: string,
    module: number,
    stage: 'self' | 'final',
    scores: [number, number, number, number],
    keyPoints?: string[],
  ): this {
    this.push(new Date(at), {
      t: 'decision',
      module,
      stage,
      scores,
      ...(keyPoints === undefined ? {} : { keyPoints }),
    });
    return this;
  }

  events(): StudyEvent[] {
    const sorted = [...this.items].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
    return timelineOf(sorted);
  }
}

const moduleConcepts = (module: number): string[] => [
  ...lessonConcepts(module, 1),
  ...lessonConcepts(module, 2),
];

/**
 * Seven days in a row from Monday, October 12: each day reads the first lesson of the next module and takes
 * its check, with one wrong Sure on day one, and reviews in the evening what fell due.
 */
export function firstWeek(): StudyEvent[] {
  const j = new Journey();
  for (let i = 0; i < 7; i++) {
    const day = addDays('2026-10-12', i);
    const module = i + 1;
    j.read(`${day}T09:00:00.000Z`, lessonNote(module, 1));
    j.session(`${day}T09:10:00.000Z`, 'check', lessonNote(module, 1), lessonConcepts(module, 1), {
      wrongSure: i === 0 ? [conceptId(1, 3)] : [],
      notSure: [conceptId(module, 5)],
    });
    const due: string[] = [];
    if (i === 1) due.push(conceptId(1, 3));
    if (i >= 3) due.push(...lessonConcepts(i - 2, 1).filter((c) => c !== conceptId(i - 2, 5)));
    if (i >= 2) due.push(conceptId(i - 1, 5));
    if (due.length > 0) j.session(`${day}T18:00:00.000Z`, 'review', 'review', due, { variant: 'b' });
  }
  return j.events();
}

/**
 * The exam date set to Saturday, November 14 on November 1, a check over Modules 1 to 4 that day,
 * then a review of all 40 concepts every day to November 12, a few of them wrong, with the Module 1 boss
 * on November 5 (13 of 15 right, one flagged) and Mock A on November 8 (65 items on the 40 concepts).
 */
export function examCrunch(): StudyEvent[] {
  const j = new Journey();
  j.examDate('2026-11-01T08:00:00.000Z', '2026-11-14');
  const concepts = [1, 2, 3, 4].flatMap(moduleConcepts);
  for (const module of [1, 2, 3, 4]) {
    j.read(`2026-11-01T0${module + 3}:00:00.000Z`, lessonNote(module, 1));
    j.session(
      `2026-11-01T0${module + 3}:10:00.000Z`,
      'check',
      lessonNote(module, 1),
      moduleConcepts(module),
      {
        notSure: [conceptId(module, 10)],
      },
    );
  }
  for (let k = 1; k <= 11; k++) {
    const day = addDays('2026-11-01', k);
    const wrong = concepts.filter((_, i) => (i + k) % 13 === 0);
    j.session(`${day}T18:00:00.000Z`, 'review', 'review', concepts, {
      variant: k % 2 === 0 ? 'a' : 'b',
      wrong,
    });
  }
  const m1 = moduleConcepts(1);
  const bossItems = [
    ...m1.map((c) => [variantId(c, 'b'), c] as const),
    ...m1.slice(0, 5).map((c) => [variantId(c, 'a'), c] as const),
  ];
  j.exam(
    '2026-11-05T12:00:00.000Z',
    'boss',
    'm01',
    null,
    bossItems,
    {
      wrong: [variantId(conceptId(1, 3), 'b'), variantId(conceptId(1, 7), 'b')],
      flagged: [variantId(conceptId(1, 5), 'a')],
    },
    21,
    18,
  );
  j.exam(
    '2026-11-08T09:00:00.000Z',
    'mock',
    'a',
    'A',
    MOCK_A_ITEMS,
    {
      wrong: MOCK_A_ITEMS.filter((_, i) => i % 6 === 5).map(([qid]) => qid),
      flagged: MOCK_A_ITEMS.filter((_, i) => i % 9 === 0).map(([qid]) => qid),
      blank: ['qx-a-65'],
    },
    90,
    80,
  );
  return j.events();
}

/**
 * 120 concepts learnt over five days from October 12, ten days missed, then a comeback on October 27
 * that answers only the first 10 concepts of its catch-up.
 */
export function comebackTenDays(): StudyEvent[] {
  const j = new Journey();
  const all = Array.from({ length: 12 }, (_, m) => moduleConcepts(m + 1)).flat();
  for (let i = 0; i < 5; i++) {
    const day = addDays('2026-10-12', i);
    const concepts = all.slice(24 * i, 24 * i + 24);
    const module = Math.floor((24 * i) / 10) + 1;
    j.read(`${day}T08:00:00.000Z`, lessonNote(module, 1));
    j.session(`${day}T08:10:00.000Z`, 'check', lessonNote(module, 1), concepts, {
      notSure: concepts.filter((_, n) => n % 6 === 0),
    });
  }
  j.session('2026-10-27T09:00:00.000Z', 'review', 'review', all.slice(0, 10), { variant: 'b' }, true);
  return j.events();
}

/**
 * Five days from Monday, October 19: Modules 1 to 3 read and checked, then each module's two core labs, each
 * followed by its debrief over two concepts; one lab with a hint, a rerun of a done lab on day two, a solved
 * incident on October 21, a day whose only completion is a lab (October 22), a lightning round with one miss on
 * October 22 and a day of a rerun alone (October 23), which does not qualify.
 */
export function handsOnWeek(): StudyEvent[] {
  const j = new Journey();
  for (let module = 1; module <= 3; module++) {
    const day = addDays('2026-10-19', module - 1);
    j.read(`${day}T08:00:00.000Z`, lessonNote(module, 1));
    j.read(`${day}T08:20:00.000Z`, lessonNote(module, 2));
    j.session(`${day}T08:40:00.000Z`, 'check', lessonNote(module, 1), lessonConcepts(module, 1));
  }
  j.lab('2026-10-19T10:00:00.000Z', 'lab-m01-a', 0);
  j.debrief('2026-10-19T10:01:00.000Z', 'lab-m01-a', [conceptId(1, 1), conceptId(1, 6)], {
    wrong: [conceptId(1, 6)],
  });
  j.lab('2026-10-20T10:00:00.000Z', 'lab-m01-b', 1);
  j.debrief('2026-10-20T10:01:00.000Z', 'lab-m01-b', [conceptId(1, 2), conceptId(1, 7)], {
    notSure: [conceptId(1, 7)],
  });
  j.lab('2026-10-20T11:00:00.000Z', 'lab-m01-a', 0);
  j.debrief('2026-10-20T11:01:00.000Z', 'lab-m01-a', [conceptId(1, 1), conceptId(1, 6)]);
  j.lab('2026-10-21T10:00:00.000Z', 'lab-m02-a', 0);
  j.debrief('2026-10-21T10:01:00.000Z', 'lab-m02-a', [conceptId(2, 1), conceptId(2, 6)]);
  j.lab('2026-10-21T11:00:00.000Z', 'lab-m02-b', 0);
  j.debrief('2026-10-21T11:01:00.000Z', 'lab-m02-b', [conceptId(2, 2), conceptId(2, 7)]);
  j.lab('2026-10-22T10:00:00.000Z', 'lab-m03-a', 2);
  j.lab('2026-10-23T10:00:00.000Z', 'lab-m02-a', 0);
  j.incident('2026-10-21T12:00:00.000Z', 'inc-001', [conceptId(2, 3), conceptId(2, 8)], true);
  j.lightning('2026-10-22T19:00:00.000Z', [
    [conceptId(1, 1), true],
    [conceptId(1, 2), false],
    [conceptId(1, 3), true],
  ]);
  return j.events();
}

/**
 * Missions and the capstone from Saturday, October 10: Module 1's first lesson and Mission 0 verified the same day,
 * the kept Mission 1 verified and checked the next day, Mission 3 cleaned up without Verify, checked, then retried
 * and closed, and two decisions graded on November 15 and 16, the second re-graded, which pays nothing.
 */
export function missionsAndCapstone(): StudyEvent[] {
  const j = new Journey();
  j.read('2026-10-10T08:00:00.000Z', lessonNote(1, 1));
  j.mission('2026-10-10T09:00:00.000Z', 'mission-00', 'start');
  j.mission('2026-10-10T10:00:00.000Z', 'mission-00', 'verified');
  j.mission('2026-10-11T09:00:00.000Z', 'mission-01', 'start');
  j.mission('2026-10-11T10:00:00.000Z', 'mission-01', 'verified');
  j.mission('2026-10-12T09:00:00.000Z', 'mission-01', 'usage-ok', 140);
  j.mission('2026-10-13T09:00:00.000Z', 'mission-03', 'start');
  j.mission('2026-10-13T09:40:00.000Z', 'mission-03', 'cleaned');
  j.mission('2026-10-14T09:00:00.000Z', 'mission-03', 'usage-ok', 139);
  j.mission('2026-10-15T09:00:00.000Z', 'mission-03', 'start');
  j.mission('2026-10-15T09:30:00.000Z', 'mission-03', 'verified');
  j.mission('2026-10-15T10:00:00.000Z', 'mission-03', 'cleaned');
  j.mission('2026-10-16T09:00:00.000Z', 'mission-03', 'usage-ok', 138);
  j.decision('2026-11-15T09:00:00.000Z', 1, 'self', [2, 2, 1, 2]);
  j.decision('2026-11-15T09:30:00.000Z', 1, 'final', [3, 2, 2, 1], ['kp-01-a', 'kp-01-gone']);
  j.decision('2026-11-16T09:00:00.000Z', 2, 'self', [2, 2, 2, 2]);
  j.decision('2026-11-16T09:30:00.000Z', 2, 'final', [2, 2, 2, 0]);
  j.decision('2026-11-16T10:00:00.000Z', 2, 'final', [3, 3, 3, 3]);
  return j.events();
}
