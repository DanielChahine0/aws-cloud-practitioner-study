import type { Mode, NewEvent, StudyEvent } from '../../../schemas/events.ts';
import { addDays } from '../../../src/engine/day.ts';
import { timelineOf } from '../events.ts';
import { conceptId, lessonConcepts, lessonNote, variantId } from './content.ts';

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
 * then a review of all 40 concepts every day to November 12, a few of them wrong.
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
