/** The one-time Already done action (spec 8.1): Missions 0 and 1 done by hand, recorded with the dates Dani enters. */
import type { NewEvent } from '../../schemas/events.ts';
import { GATE_MISSION, type PlanRecord } from '../engine/missions.ts';

/** The kept mission that hosts this site (spec 5.3 Mission 1). */
export const HOSTING_MISSION = 'mission-01';

/** The form as typed: dates are `YYYY-MM-DD` or '', the credits are text until recorded. */
export interface AlreadyDoneForm {
  mission0: string;
  mission1: boolean;
  verified1: string;
  usage1: string;
  credits1: string;
  plan: PlanRecord;
}

/** What stops the form from being recorded, in the order the fields appear; `today` is the study day. */
export function alreadyDoneProblems(form: AlreadyDoneForm, today: string): string[] {
  const out: string[] = [];
  if (form.mission0 === '') out.push('Enter the date you finished Mission 0.');
  if (form.mission1 && form.verified1 === '') out.push('Enter the day you verified Mission 1.');
  if (form.mission1 && form.verified1 !== '' && form.usage1 !== '' && form.usage1 <= form.verified1) {
    out.push('The usage check comes after the day you verified Mission 1.');
  }
  const dates = [form.mission0, ...(form.mission1 ? [form.verified1, form.usage1] : [])];
  if (dates.some((d) => d !== '' && d > today)) out.push('Dates cannot be in the future.');
  return out;
}

/** Noon local time on a `YYYY-MM-DD` day, well inside its study day whatever the 04:00 boundary. */
const noon = (day: string): Date => new Date(`${day}T12:00:00`);

/**
 * The mission events of a form with no problems, each with the date it happened: Mission 0's start and Verify, and
 * with Mission 1 ticked its start and Verify, plus its usage check only when a usage date was entered.
 */
export function alreadyDoneEvents(form: AlreadyDoneForm): readonly (readonly [NewEvent, Date])[] {
  const gate = noon(form.mission0);
  const out: (readonly [NewEvent, Date])[] = [
    [{ t: 'mission', mission: GATE_MISSION, step: 'start' }, gate],
    [{ t: 'mission', mission: GATE_MISSION, step: 'verified' }, gate],
  ];
  if (!form.mission1) return out;
  const verified = noon(form.verified1);
  out.push([{ t: 'mission', mission: HOSTING_MISSION, step: 'start' }, verified]);
  out.push([{ t: 'mission', mission: HOSTING_MISSION, step: 'verified' }, verified]);
  if (form.usage1 !== '') {
    const credits = form.credits1.trim() === '' ? Number.NaN : Number(form.credits1);
    out.push([
      Number.isFinite(credits) && credits >= 0
        ? { t: 'mission', mission: HOSTING_MISSION, step: 'usage-ok', credits }
        : { t: 'mission', mission: HOSTING_MISSION, step: 'usage-ok' },
      noon(form.usage1),
    ]);
  }
  return out;
}
