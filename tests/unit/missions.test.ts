import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import {
  DEFAULT_LIVE_HOURS,
  GATE_MISSION,
  liveMission,
  type MissionRef,
  type MissionStatus,
  type MissionStep,
  missionLogOf,
  missionSafety,
  missionStatuses,
  type PlanRecord,
  planServices,
} from '../../src/engine/missions.ts';
import { timelineOf } from '../fixtures/events.ts';

const M0: MissionRef = {
  id: 'mission-00',
  n: 0,
  keep: false,
  gate: true,
  maxLiveHours: null,
  services: ['AWS Budgets'],
};
const M1: MissionRef = {
  id: 'mission-01',
  n: 1,
  keep: true,
  gate: false,
  maxLiveHours: null,
  services: ['Amazon S3', 'Amazon CloudFront'],
};
const M3: MissionRef = {
  id: 'mission-03',
  n: 3,
  keep: false,
  gate: false,
  maxLiveHours: 2,
  services: ['Amazon S3', 'AWS Lambda', 'Amazon CloudWatch Logs'],
};
const M7: MissionRef = {
  id: 'mission-07',
  n: 7,
  keep: false,
  gate: false,
  maxLiveHours: 1,
  services: ['Amazon VPC'],
};
const MISSIONS = [M0, M1, M3, M7];

const PLAN: PlanRecord = {
  plan: 'free',
  credits: 140,
  endsOn: '2027-04-01',
  services: {
    'Amazon S3': true,
    'Amazon CloudFront': true,
    'AWS Lambda': true,
    'Amazon CloudWatch Logs': true,
    'Amazon VPC': true,
  },
  recordedAt: '2026-10-10T09:00:00.000Z',
};

function step(mission: string, s: MissionStep, credits?: number): NewEvent {
  return { t: 'mission', mission, step: s, ...(credits === undefined ? {} : { credits }) };
}

const GATE_DONE: [string, NewEvent][] = [
  ['2026-10-10T08:00:00.000Z', step('mission-00', 'start')],
  ['2026-10-10T08:30:00.000Z', step('mission-00', 'verified')],
];

function statusAt(
  items: readonly [string, NewEvent][],
  now: string,
  plan: PlanRecord | null = PLAN,
): Map<string, MissionStatus> {
  const log = missionLogOf(timelineOf(items), MISSIONS);
  const statuses = missionStatuses({ missions: MISSIONS, log, plan, now: new Date(now), tz: 0 });
  return new Map(statuses.map((s) => [s.id, s]));
}

describe('missionLogOf', () => {
  it('counts the first event of each step per attempt and ignores unknown missions', () => {
    const log = missionLogOf(
      timelineOf([
        ['2026-10-12T09:00:00.000Z', step('mission-03', 'start')],
        ['2026-10-12T09:10:00.000Z', step('mission-03', 'start')],
        ['2026-10-12T09:20:00.000Z', step('mission-03', 'verified')],
        ['2026-10-12T09:25:00.000Z', step('mission-03', 'verified')],
        ['2026-10-12T09:30:00.000Z', step('mission-03', 'cleaned')],
        ['2026-10-12T09:40:00.000Z', step('mission-99', 'start')],
      ]),
      MISSIONS,
    );
    expect(log.has('mission-99')).toBe(false);
    expect(log.get('mission-03')).toEqual({
      attempts: [
        {
          start: { at: '2026-10-12T09:00:00.000Z', day: '2026-10-12' },
          verified: { at: '2026-10-12T09:20:00.000Z', day: '2026-10-12' },
          cleaned: { at: '2026-10-12T09:30:00.000Z', day: '2026-10-12' },
          usageOk: null,
        },
      ],
      closed: null,
    });
  });

  it('keeps the credits of the usage check that closes a mission and nothing after it', () => {
    const log = missionLogOf(
      timelineOf([
        ['2026-10-12T09:00:00.000Z', step('mission-03', 'start')],
        ['2026-10-12T09:20:00.000Z', step('mission-03', 'verified')],
        ['2026-10-12T09:30:00.000Z', step('mission-03', 'cleaned')],
        ['2026-10-13T09:00:00.000Z', step('mission-03', 'usage-ok', 138.5)],
        ['2026-10-14T09:00:00.000Z', step('mission-03', 'start')],
      ]),
      MISSIONS,
    ).get('mission-03');
    expect(log?.attempts).toHaveLength(1);
    expect(log?.attempts[0]?.usageOk).toEqual({
      at: '2026-10-13T09:00:00.000Z',
      day: '2026-10-13',
      credits: 138.5,
    });
    expect(log?.closed).toEqual({ at: '2026-10-13T09:00:00.000Z', day: '2026-10-13' });
  });
});

describe('missionStatuses', () => {
  it('locks every other mission until Mission 0 is verified', () => {
    const s = statusAt([], '2026-10-10T09:00:00.000Z');
    expect([...s.values()].map((m) => [m.id, m.stage])).toEqual([
      ['mission-00', 'ready'],
      ['mission-01', 'locked'],
      ['mission-03', 'locked'],
      ['mission-07', 'locked'],
    ]);
    expect(GATE_MISSION).toBe('mission-00');
  });

  it('shows Mission 0 and Mission 1 started until Verify, and closes Mission 0 on its first verified', () => {
    const s = statusAt(
      [
        ['2026-10-10T08:00:00.000Z', step('mission-00', 'start')],
        ['2026-10-10T08:10:00.000Z', step('mission-01', 'start')],
      ],
      '2026-10-10T12:00:00.000Z',
    );
    expect(s.get('mission-00')?.stage).toBe('started');
    expect(s.get('mission-01')?.stage).toBe('started');
    const done = statusAt(GATE_DONE, '2026-10-11T12:00:00.000Z');
    expect(done.get('mission-00')).toMatchObject({ stage: 'closed', closedDay: '2026-10-10', missing: [] });
    expect(done.get('mission-03')?.stage).toBe('ready');
  });

  it('marks a mission not on the plan when a service is unticked or the plan is missing', () => {
    const unticked = { ...PLAN, services: { ...PLAN.services, 'AWS Lambda': false } };
    expect(statusAt(GATE_DONE, '2026-10-11T12:00:00.000Z', unticked).get('mission-03')).toMatchObject({
      stage: 'not-on-plan',
      missing: ['AWS Lambda'],
    });
    expect(statusAt(GATE_DONE, '2026-10-11T12:00:00.000Z', null).get('mission-03')).toMatchObject({
      stage: 'not-on-plan',
      missing: ['Amazon S3', 'AWS Lambda', 'Amazon CloudWatch Logs'],
    });
  });

  it('keeps a started mission live when the plan later lacks one of its services', () => {
    const items: [string, NewEvent][] = [
      ...GATE_DONE,
      ['2026-10-12T09:00:00.000Z', step('mission-03', 'start')],
    ];
    const unticked = { ...PLAN, services: { ...PLAN.services, 'AWS Lambda': false } };
    expect(statusAt(items, '2026-10-12T10:00:00.000Z', unticked).get('mission-03')).toMatchObject({
      stage: 'live',
      liveMs: 3_600_000,
      missing: ['AWS Lambda'],
    });
  });

  it('turns overdue past maxLiveHours, from now only', () => {
    const items: [string, NewEvent][] = [
      ...GATE_DONE,
      ['2026-10-12T09:00:00.000Z', step('mission-03', 'start')],
    ];
    expect(statusAt(items, '2026-10-12T11:00:00.000Z').get('mission-03')?.stage).toBe('live');
    expect(statusAt(items, '2026-10-12T11:00:01.000Z').get('mission-03')).toMatchObject({
      stage: 'overdue',
      liveMs: 2 * 3_600_000 + 1000,
    });
    expect(DEFAULT_LIVE_HOURS).toBe(2);
  });

  it('waits for a later-day usage check after cleanup, then closes a verified attempt', () => {
    const items: [string, NewEvent][] = [
      ...GATE_DONE,
      ['2026-10-12T09:00:00.000Z', step('mission-03', 'start')],
      ['2026-10-12T09:30:00.000Z', step('mission-03', 'verified')],
      ['2026-10-12T10:00:00.000Z', step('mission-03', 'cleaned')],
      ['2026-10-12T20:00:00.000Z', step('mission-03', 'usage-ok', 139)],
    ];
    expect(statusAt(items, '2026-10-12T21:00:00.000Z').get('mission-03')).toMatchObject({
      stage: 'cleaned',
      usageFrom: '2026-10-13',
      liveMs: null,
    });
    const closed: [string, NewEvent][] = [
      ...items,
      ['2026-10-13T09:00:00.000Z', step('mission-03', 'usage-ok', 138)],
    ];
    expect(statusAt(closed, '2026-10-13T10:00:00.000Z').get('mission-03')).toMatchObject({
      stage: 'closed',
      closedDay: '2026-10-13',
      usageFrom: null,
    });
  });

  it('makes an unverified attempt ready again after its usage check, and closes its verified retry', () => {
    const first: [string, NewEvent][] = [
      ...GATE_DONE,
      ['2026-10-12T09:00:00.000Z', step('mission-07', 'start')],
      ['2026-10-12T09:40:00.000Z', step('mission-07', 'cleaned')],
      ['2026-10-13T09:00:00.000Z', step('mission-07', 'usage-ok', 140)],
    ];
    expect(statusAt(first, '2026-10-13T10:00:00.000Z').get('mission-07')?.stage).toBe('ready');
    const retry: [string, NewEvent][] = [
      ...first,
      ['2026-10-14T09:00:00.000Z', step('mission-07', 'start')],
      ['2026-10-14T09:20:00.000Z', step('mission-07', 'verified')],
      ['2026-10-14T09:30:00.000Z', step('mission-07', 'cleaned')],
      ['2026-10-15T09:00:00.000Z', step('mission-07', 'usage-ok', 139)],
    ];
    const log = missionLogOf(timelineOf(retry), MISSIONS).get('mission-07');
    expect(log?.attempts).toHaveLength(2);
    expect(statusAt(retry, '2026-10-15T10:00:00.000Z').get('mission-07')?.stage).toBe('closed');
  });

  it('opens a retry from a start after an unverified cleanup, before its usage check', () => {
    const items: [string, NewEvent][] = [
      ...GATE_DONE,
      ['2026-10-12T09:00:00.000Z', step('mission-07', 'start')],
      ['2026-10-12T09:40:00.000Z', step('mission-07', 'cleaned')],
      ['2026-10-12T10:00:00.000Z', step('mission-07', 'start')],
    ];
    expect(statusAt(items, '2026-10-12T10:30:00.000Z').get('mission-07')).toMatchObject({
      stage: 'live',
      liveMs: 30 * 60_000,
    });
  });

  it('never makes the kept Mission 1 live, overdue or cleaned, and closes it after a later-day usage check', () => {
    const items: [string, NewEvent][] = [
      ...GATE_DONE,
      ['2026-10-10T09:00:00.000Z', step('mission-01', 'start')],
      ['2026-10-10T09:05:00.000Z', step('mission-01', 'cleaned')],
    ];
    expect(statusAt(items, '2026-10-12T09:00:00.000Z').get('mission-01')?.stage).toBe('started');
    const verified: [string, NewEvent][] = [
      ...items,
      ['2026-10-10T12:00:00.000Z', step('mission-01', 'verified')],
    ];
    expect(statusAt(verified, '2026-10-10T13:00:00.000Z').get('mission-01')).toMatchObject({
      stage: 'verified',
      usageFrom: '2026-10-11',
    });
    const sameDay: [string, NewEvent][] = [
      ...verified,
      ['2026-10-10T20:00:00.000Z', step('mission-01', 'usage-ok')],
    ];
    expect(statusAt(sameDay, '2026-10-10T21:00:00.000Z').get('mission-01')?.stage).toBe('verified');
    const closed: [string, NewEvent][] = [
      ...sameDay,
      ['2026-10-11T09:00:00.000Z', step('mission-01', 'usage-ok')],
    ];
    expect(statusAt(closed, '2026-10-11T10:00:00.000Z').get('mission-01')).toMatchObject({
      stage: 'closed',
      closedDay: '2026-10-11',
    });
  });
});

describe('liveMission and missionSafety', () => {
  const live: [string, NewEvent][] = [
    ...GATE_DONE,
    ['2026-10-10T09:00:00.000Z', step('mission-01', 'start')],
    ['2026-10-10T09:30:00.000Z', step('mission-01', 'verified')],
    ['2026-10-12T09:00:00.000Z', step('mission-07', 'start')],
    ['2026-10-12T09:10:00.000Z', step('mission-03', 'start')],
  ];

  it('shows the lowest live mission, never the kept or gate mission', () => {
    const s = [...statusAt(live, '2026-10-12T09:30:00.000Z').values()];
    expect(liveMission(s)?.id).toBe('mission-03');
    expect(liveMission([...statusAt(GATE_DONE, '2026-10-12T09:30:00.000Z').values()])).toBeNull();
  });

  it('puts an overdue cleanup before a due usage check, and Mission 1 only ever asks for usage', () => {
    const s = [...statusAt(live, '2026-10-12T10:30:00.000Z').values()];
    expect(missionSafety(s, '2026-10-12')).toEqual({ kind: 'cleanup', mission: 'mission-07', n: 7 });
    const calm = [...statusAt(live, '2026-10-12T09:30:00.000Z').values()];
    expect(missionSafety(calm, '2026-10-12')).toEqual({ kind: 'usage', mission: 'mission-01', n: 1 });
    expect(missionSafety(calm, '2026-10-10')).toBeNull();
    const m1Only = [...statusAt(live.slice(0, 4), '2026-10-20T09:00:00.000Z').values()].filter(
      (m) => m.id === 'mission-01',
    );
    expect(missionSafety(m1Only, '2026-10-20')).toEqual({ kind: 'usage', mission: 'mission-01', n: 1 });
  });
});

describe('planServices', () => {
  it('is the sorted union of every non-gate mission service', () => {
    expect(planServices(MISSIONS)).toEqual([
      'AWS Lambda',
      'Amazon CloudFront',
      'Amazon CloudWatch Logs',
      'Amazon S3',
      'Amazon VPC',
    ]);
  });
});
