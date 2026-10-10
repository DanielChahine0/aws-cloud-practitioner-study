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
 * incident on October 21, a day whose only completion is a lab (October 22) and a day of a rerun alone
 * (October 23), which does not qualify.
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
  return j.events();
}
