import { afterEach, describe, expect, it } from 'vitest';
import type { ContentIndex, MissionMeta } from '../../schemas/chunks.ts';
import type { NewEvent } from '../../schemas/events.ts';
import { now } from '../../src/app/clock.ts';
import { index } from '../../src/app/content.ts';
import {
  allTicked,
  closedLine,
  creditsOf,
  estimateSaved,
  listLede,
  lockLine,
  missionAnnouncement,
  planDraftOf,
  planProblems,
  planRecordOf,
  savedLine,
  slotAfter,
  stageWord,
  startLabel,
  ticksCleared,
  usageButtonLabel,
  usageLine,
  usageSavedLine,
  verifyHint,
} from '../../src/app/mission-copy.ts';
import {
  liveAria,
  liveChip,
  liveLabel,
  missionRefs,
  planRecord,
  refOf,
  statuses,
} from '../../src/app/missions.ts';
import { events, kvRecords } from '../../src/app/progress.ts';
import type { MissionStatus, PlanRecord } from '../../src/engine/missions.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import { emptyIndexFields } from '../fixtures/index.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const mission = (id: string, extra: Partial<MissionMeta> = {}): MissionMeta => ({
  id,
  title: `Title of ${id}`,
  modules: [1],
  services: [],
  expectedCredits: '$0',
  gate: false,
  keep: false,
  maxLiveHours: 2,
  canUseCredits: [],
  leftovers: [],
  sources: [],
  sections: [],
  steps: [],
  ...extra,
});

const MISSIONS: MissionMeta[] = [
  mission('mission-00', { gate: true, maxLiveHours: null, services: ['AWS Budgets'] }),
  mission('mission-01', { keep: true, maxLiveHours: null, services: ['Amazon S3'] }),
  mission('mission-03', { services: ['Amazon S3', 'AWS Lambda'] }),
];
const IDX: ContentIndex = {
  contentVersion: 'test',
  modules: [],
  concepts: [],
  glossary: [],
  missions: MISSIONS,
  questionVersions: {},
  search: 'content/search.json',
  ...emptyIndexFields(),
};
const PLAN: PlanRecord = {
  plan: 'free',
  credits: 120,
  endsOn: '2027-04-10',
  services: { 'Amazon S3': true, 'AWS Lambda': true },
  recordedAt: '2026-10-10T09:00:00.000Z',
};
const status = (stage: MissionStatus['stage'], missing: string[] = []): MissionStatus => ({
  id: 'mission-03',
  n: 3,
  stage,
  missing,
  liveMs: null,
  usageFrom: null,
  closedDay: null,
});
const step = (s: 'start' | 'verified' | 'cleaned' | 'usage-ok', id = 'mission-03'): NewEvent => ({
  t: 'mission',
  mission: id,
  step: s,
});

afterEach(() => {
  index.value = null;
  events.value = [];
  kvRecords.value = {};
  now.value = new Date();
});

describe('mission copy (spec 5.3, 7.5)', () => {
  it('names every stage in words, so colour is never the only signal', () => {
    const stages: MissionStatus['stage'][] = [
      'locked',
      'not-on-plan',
      'ready',
      'started',
      'live',
      'overdue',
      'cleaned',
      'verified',
      'closed',
    ];
    expect(stages.map((s) => stageWord(status(s)))).toEqual([
      'Locked',
      'Not on your plan',
      'Ready',
      'Started',
      'Live',
      'Clean up now',
      'Cleaned up',
      'Verified',
      'Closed',
    ]);
  });

  it('counts the chip in minutes under an hour and in whole hours after', () => {
    expect(liveLabel(3, 12 * MINUTE + 59_000)).toBe('M3 live 12m');
    expect(liveLabel(3, HOUR)).toBe('M3 live 1h');
    expect(liveLabel(3, 2.5 * HOUR)).toBe('M3 live 2h');
    expect(liveLabel(3, -5_000)).toBe('M3 live 0m');
    expect(liveAria(3, HOUR)).toBe('Mission 3 has been live for 1 hour; open it');
    expect(liveAria(3, 3 * HOUR)).toBe('Mission 3 has been live for 3 hours; open it');
    expect(liveAria(3, MINUTE)).toBe('Mission 3 has been live for 1 minute; open it');
    expect(liveAria(3, 12 * MINUTE)).toBe('Mission 3 has been live for 12 minutes; open it');
  });

  it('says why a mission is locked', () => {
    expect(lockLine(status('locked'))).toBe('Locked until Mission 0 is verified.');
    expect(lockLine(status('not-on-plan', ['AWS Lambda', 'Amazon S3']))).toBe(
      'Not on your plan: AWS Lambda, Amazon S3.',
    );
    expect(lockLine(status('ready'))).toBeNull();
  });

  it('announces each step and dates each line with its weekday', () => {
    expect(missionAnnouncement(3, 'start')).toBe('Mission 3 started.');
    expect(missionAnnouncement(3, 'verified')).toBe('Mission 3 verified.');
    expect(missionAnnouncement(3, 'cleaned')).toBe('Mission 3 cleaned up.');
    expect(missionAnnouncement(3, 'usage-ok')).toBe('Mission 3 closed.');
    expect(usageSavedLine(3)).toBe('Usage check saved for Mission 3.');
    expect(usageLine('2026-11-01')).toBe('Check usage on Sun 1 Nov or later.');
    expect(closedLine('2026-10-31')).toBe('Closed on Sat 31 Oct.');
    expect(savedLine('2026-10-10')).toBe('Plan status saved on Sat 10 Oct.');
  });

  it('labels the buttons and leads the list with the gate until Mission 0 is verified', () => {
    expect(startLabel(3)).toBe('Start Mission 3');
    expect(usageButtonLabel(false)).toBe('Usage is back to baseline');
    expect(usageButtonLabel(true)).toBe('Cost stays within the expected credits');
    const gate = (stage: MissionStatus['stage']): MissionStatus => ({
      ...status(stage),
      id: 'mission-00',
      n: 0,
    });
    expect(listLede([gate('started')])).toBe('Start with Mission 0: Guardrails.');
    expect(listLede([])).toBe('Start with Mission 0: Guardrails.');
    expect(listLede([gate('closed')])).toBe(
      'Real AWS, done by hand in your own account, one mission at a time.',
    );
  });

  it('holds Verify for the ticks, then the plan, then the estimate link', () => {
    const all = {
      allTicked: true,
      needsPlan: true,
      planSaved: true,
      needsEstimate: true,
      estimateSaved: true,
    };
    expect(verifyHint({ ...all, allTicked: false, planSaved: false })).toBe('Tick every step first.');
    expect(verifyHint({ ...all, planSaved: false })).toBe('Save your plan status first.');
    expect(verifyHint({ ...all, estimateSaved: false })).toBe('Save the estimate link in decision 11 first.');
    expect(verifyHint({ ...all, needsPlan: false, planSaved: false })).toBeNull();
    expect(verifyHint(all)).toBeNull();
  });
});

describe('mission flow helpers', () => {
  it('places each control after its section, and only where the mission has it', () => {
    const cleaned = { keep: false, gate: false };
    expect(
      ['goal', 'before-you-start', 'steps', 'verify', 'cleanup', 'usage-check', 'never-do'].map((id) =>
        slotAfter(id, cleaned),
      ),
    ).toEqual([null, 'start', 'steps', 'verify', 'cleanup', 'usage', null]);
    expect(slotAfter('keep-it-running', { keep: true, gate: false })).toBe('usage');
    expect(slotAfter('cleanup', { keep: true, gate: false })).toBeNull();
    expect(slotAfter('usage-check', { keep: false, gate: true })).toBeNull();
    expect(slotAfter('keep-it-running', cleaned)).toBeNull();
  });

  it('checks the ticks, clears one mission and finds a calculator link in decision 11', () => {
    const steps = [{ id: 'a' }, { id: 'b' }];
    expect(allTicked(steps, ['b', 'a', 'zz'])).toBe(true);
    expect(allTicked(steps, ['a'])).toBe(false);
    expect(ticksCleared({ 'mission-03': ['a'], 'mission-04': ['b'] }, 'mission-03')).toEqual({
      'mission-04': ['b'],
    });
    const draft = {
      v: 1,
      context: '',
      options: '',
      decision: '',
      why: '',
      tradeoffs: '',
      cost: '',
      ticks: [],
    };
    expect(
      estimateSaved({ ...draft, cost: 'About $12 a month: https://calculator.aws/#/estimate?id=abc' }),
    ).toBe(true);
    expect(estimateSaved({ ...draft, cost: 'About $12 a month.' })).toBe(false);
    expect(estimateSaved(null)).toBe(false);
  });

  it('turns the Plan status form into the kv plan record and names what is missing', () => {
    const fresh = planDraftOf(null, ['Amazon S3', 'AWS Lambda']);
    expect(fresh).toEqual({
      plan: 'free',
      credits: '',
      endsOn: '',
      services: { 'Amazon S3': false, 'AWS Lambda': false },
    });
    expect(planProblems(fresh)).toEqual([
      'Enter the credits you have left.',
      'Enter the date your plan ends.',
    ]);
    expect(planProblems({ ...fresh, plan: 'paid', credits: '0' })).toEqual([]);
    expect(planProblems({ ...fresh, credits: '-1', endsOn: '2027-04-10' })).toEqual([
      'Enter the credits you have left.',
    ]);
    const saved = planRecordOf(
      {
        plan: 'free',
        credits: '120.50',
        endsOn: '2027-04-10',
        services: { 'Amazon S3': true, 'AWS Lambda': false },
      },
      new Date('2026-10-10T09:00:00.000Z'),
    );
    expect(saved).toEqual({
      plan: 'free',
      credits: 120.5,
      endsOn: '2027-04-10',
      services: { 'Amazon S3': true, 'AWS Lambda': false },
      recordedAt: '2026-10-10T09:00:00.000Z',
    });
    expect(planDraftOf(saved, ['Amazon S3', 'AWS Lambda', 'Amazon SNS'])).toEqual({
      plan: 'free',
      credits: '120.5',
      endsOn: '2027-04-10',
      services: { 'Amazon S3': true, 'AWS Lambda': false, 'Amazon SNS': false },
    });
    expect([creditsOf('118.5'), creditsOf(''), creditsOf('abc'), creditsOf('-2')]).toEqual([
      118.5,
      null,
      null,
      null,
    ]);
  });
});

describe('mission signals', () => {
  it('reads refs from the index and the plan from kv', () => {
    index.value = IDX;
    kvRecords.value = { [KV_KEYS.plan]: { value: PLAN, updatedAt: PLAN.recordedAt } };
    expect(missionRefs.value.map((r) => [r.id, r.n, r.gate, r.keep])).toEqual([
      ['mission-00', 0, true, false],
      ['mission-01', 1, false, true],
      ['mission-03', 3, false, false],
    ]);
    expect(refOf(MISSIONS[2] as MissionMeta).services).toEqual(['Amazon S3', 'AWS Lambda']);
    expect(planRecord.value).toEqual(PLAN);
  });

  it('shows the chip while Mission 3 is live, counts up with the clock and leaves on cleanup', () => {
    index.value = IDX;
    kvRecords.value = { [KV_KEYS.plan]: { value: PLAN, updatedAt: PLAN.recordedAt } };
    const log: [string, NewEvent][] = [
      ['2026-10-19T09:00:00.000Z', step('start', 'mission-00')],
      ['2026-10-19T09:30:00.000Z', step('verified', 'mission-00')],
      ['2026-10-20T09:00:00.000Z', step('start')],
    ];
    events.value = timelineOf(log);
    now.value = new Date('2026-10-20T09:12:00.000Z');
    expect(liveChip.value).toEqual({
      label: 'M3 live 12m',
      href: '#/missions/mission-03',
      aria: 'Mission 3 has been live for 12 minutes; open it',
    });
    now.value = new Date('2026-10-20T10:05:00.000Z');
    expect(liveChip.value?.label).toBe('M3 live 1h');
    expect(statuses.value.find((s) => s.id === 'mission-03')?.stage).toBe('live');
    events.value = timelineOf([...log, ['2026-10-20T10:06:00.000Z', step('cleaned')]]);
    expect(liveChip.value).toBeNull();
  });

  it('never shows a chip for the kept Mission 1 or the gate', () => {
    index.value = IDX;
    kvRecords.value = { [KV_KEYS.plan]: { value: PLAN, updatedAt: PLAN.recordedAt } };
    events.value = timelineOf([
      ['2026-10-19T09:00:00.000Z', step('start', 'mission-00')],
      ['2026-10-19T09:30:00.000Z', step('verified', 'mission-00')],
      ['2026-10-20T09:00:00.000Z', step('start', 'mission-01')],
    ]);
    now.value = new Date('2026-10-20T15:00:00.000Z');
    expect(statuses.value.map((s) => s.stage)).toEqual(['closed', 'started', 'ready']);
    expect(liveChip.value).toBeNull();
  });
});
