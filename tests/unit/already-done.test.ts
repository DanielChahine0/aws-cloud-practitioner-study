import { describe, expect, it } from 'vitest';
import { type AlreadyDoneForm, alreadyDoneEvents, alreadyDoneProblems } from '../../src/app/already-done.ts';

const TODAY = '2026-10-20';
const FORM: AlreadyDoneForm = {
  mission0: '2026-10-12',
  mission1: true,
  verified1: '2026-10-13',
  usage1: '2026-10-14',
  credits1: '119.5',
  plan: {
    plan: 'free',
    credits: 120,
    endsOn: '2027-04-10',
    services: { 'Amazon S3': true },
    recordedAt: '2026-10-20T09:00:00.000Z',
  },
};

/** Each event as `mission step credits` with its local date and hour, the same in every zone. */
const shown = (form: AlreadyDoneForm): string[] =>
  alreadyDoneEvents(form).map(([e, d]) => {
    const what =
      e.t === 'mission' ? `${e.mission} ${e.step}${e.credits === undefined ? '' : ` ${e.credits}`}` : e.t;
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return `${what} ${day} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

describe('alreadyDoneProblems (spec 8.1)', () => {
  it('accepts a full form and a form with Mission 0 alone', () => {
    expect(alreadyDoneProblems(FORM, TODAY)).toEqual([]);
    expect(alreadyDoneProblems({ ...FORM, mission1: false, verified1: '', usage1: '' }, TODAY)).toEqual([]);
    expect(alreadyDoneProblems({ ...FORM, usage1: '', credits1: '' }, TODAY)).toEqual([]);
  });

  it('asks for the Mission 0 date and, with Mission 1 ticked, its Verify date', () => {
    expect(alreadyDoneProblems({ ...FORM, mission0: '' }, TODAY)).toEqual([
      'Enter the date you finished Mission 0.',
    ]);
    expect(alreadyDoneProblems({ ...FORM, verified1: '', usage1: '' }, TODAY)).toEqual([
      'Enter the day you verified Mission 1.',
    ]);
  });

  it('puts the usage check after Verify and every date on or before today', () => {
    expect(alreadyDoneProblems({ ...FORM, usage1: '2026-10-13' }, TODAY)).toEqual([
      'The usage check comes after the day you verified Mission 1.',
    ]);
    expect(alreadyDoneProblems({ ...FORM, usage1: '2026-10-21' }, TODAY)).toEqual([
      'Dates cannot be in the future.',
    ]);
    expect(alreadyDoneProblems({ ...FORM, mission0: '2026-10-21', mission1: false }, TODAY)).toEqual([
      'Dates cannot be in the future.',
    ]);
    expect(alreadyDoneProblems({ ...FORM, mission0: '2026-10-20' }, TODAY)).toEqual([]);
  });

  it('ignores the Mission 1 fields while Mission 1 is not ticked', () => {
    expect(
      alreadyDoneProblems({ ...FORM, mission1: false, verified1: '', usage1: '2027-01-01' }, TODAY),
    ).toEqual([]);
  });
});

describe('alreadyDoneEvents (spec 8.1)', () => {
  it('writes both missions at noon on their days, with the credits on the usage check', () => {
    expect(shown(FORM)).toEqual([
      'mission-00 start 2026-10-12 12:00',
      'mission-00 verified 2026-10-12 12:00',
      'mission-01 start 2026-10-13 12:00',
      'mission-01 verified 2026-10-13 12:00',
      'mission-01 usage-ok 119.5 2026-10-14 12:00',
    ]);
  });

  it('writes no usage check without a usage date, and no credits without an amount', () => {
    expect(shown({ ...FORM, usage1: '', credits1: '' })).toEqual([
      'mission-00 start 2026-10-12 12:00',
      'mission-00 verified 2026-10-12 12:00',
      'mission-01 start 2026-10-13 12:00',
      'mission-01 verified 2026-10-13 12:00',
    ]);
    expect(shown({ ...FORM, credits1: '' }).at(-1)).toBe('mission-01 usage-ok 2026-10-14 12:00');
  });

  it('writes Mission 0 alone while Mission 1 is not ticked', () => {
    expect(shown({ ...FORM, mission1: false })).toEqual([
      'mission-00 start 2026-10-12 12:00',
      'mission-00 verified 2026-10-12 12:00',
    ]);
  });
});
