import { describe, expect, it } from 'vitest';
import { BACKUP_FORMAT, Backup } from '../../schemas/backup.ts';
import { MODES, SCHEMA_VERSION, StudyEvent } from '../../schemas/events.ts';

const base = { id: '01JA2B3C4D5E6F7G8H9JKMNPQR', at: '2026-10-09T08:00:00.000Z', tz: 120, day: '2026-10-09' };

const VARIANTS: Record<string, Record<string, unknown>> = {
  answer: {
    t: 'answer',
    sid: '01JA2B3C4D5E6F7G8H9JKMNPQS',
    mode: 'check',
    qid: 'q-7k2m9p',
    qv: 1,
    concept: 'aws-lambda',
    picked: ['b'],
    correct: true,
    sure: false,
    ms: 5400,
  },
  'answer (match)': {
    t: 'answer',
    sid: '01JA2B3C4D5E6F7G8H9JKMNPQS',
    mode: 'quiz',
    qid: 'q-7k2m9q',
    qv: 2,
    concept: 'aws-lambda',
    picked: [
      ['l1', 'r2'],
      ['l2', 'r1'],
    ],
    correct: false,
    sure: true,
    flagged: true,
    changes: [['a'], ['b']],
    ms: 9000,
  },
  session: {
    t: 'session',
    sid: '01JA2B3C4D5E6F7G8H9JKMNPQS',
    mode: 'check',
    phase: 'start',
    seed: 4294967295,
    scope: 'm03/aws-lambda',
    qids: ['q-7k2m9p'],
  },
  'session (mock)': {
    t: 'session',
    sid: '01JA2B3C4D5E6F7G8H9JKMNPQS',
    mode: 'mock',
    phase: 'submit',
    seed: 1,
    form: 'A',
    deadline: '2026-10-09T09:30:00.000Z',
  },
  'lesson.done': { t: 'lesson.done', note: 'm03/aws-lambda' },
  'lab.done': { t: 'lab.done', lab: 'two-tiers-two-zones', rev: 1, hints: 0 },
  'incident.offered': { t: 'incident.offered', incident: 'the-cold-oven' },
  'incident.done': { t: 'incident.done', incident: 'the-cold-oven', firstTry: true },
  'review.now': { t: 'review.now', concept: 'aws-lambda' },
  cause: { t: 'cause', sid: '01JA2B3C4D5E6F7G8H9JKMNPQS', qid: 'q-7k2m9p', cause: 'misread' },
  mission: { t: 'mission', mission: 'mission-01-host-this-site', step: 'verified', credits: 100 },
  decision: { t: 'decision', module: 3, stage: 'final', scores: [1, 2, 3, 4], keyPoints: ['cost'] },
  flag: { t: 'flag', qid: 'q-7k2m9p', qv: 1, reason: 'typo', note: 'a typo in option b' },
  settings: { t: 'settings', patch: { examDate: null } },
  rank: { t: 'rank', rank: 'basic' },
};

describe('StudyEvent', () => {
  it('has schema version 1 and the spec modes', () => {
    expect(SCHEMA_VERSION).toBe(1);
    expect(MODES).toEqual(['check', 'quiz', 'focus', 'review', 'lightning', 'incident', 'boss', 'mock']);
  });

  for (const [name, variant] of Object.entries(VARIANTS)) {
    it(`parses a valid ${name} event`, () => {
      const result = StudyEvent.safeParse({ ...base, ...variant });
      expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
    });
  }

  it('rejects an event without a day', () => {
    const { day: _day, ...rest } = base;
    expect(StudyEvent.safeParse({ ...rest, t: 'lesson.done', note: 'm03/aws-lambda' }).success).toBe(false);
  });

  it('rejects a lowercase ULID', () => {
    const id = base.id.toLowerCase();
    expect(StudyEvent.safeParse({ ...base, id, t: 'lesson.done', note: 'm03/aws-lambda' }).success).toBe(
      false,
    );
  });

  it('rejects an unknown event type', () => {
    expect(StudyEvent.safeParse({ ...base, t: 'party', note: 'm03/aws-lambda' }).success).toBe(false);
  });

  it('accepts the relearn flag on an answer and rejects a flag that is not a boolean', () => {
    expect(StudyEvent.safeParse({ ...base, ...VARIANTS.answer, relearn: true }).success).toBe(true);
    expect(StudyEvent.safeParse({ ...base, ...VARIANTS.answer, relearn: false }).success).toBe(true);
    expect(StudyEvent.safeParse({ ...base, ...VARIANTS.answer, relearn: 'yes' }).success).toBe(false);
  });

  it('rejects a time with an offset instead of Z, and an unknown mode', () => {
    const at = '2026-10-09T10:00:00+02:00';
    expect(StudyEvent.safeParse({ ...base, at, t: 'lesson.done', note: 'm03/aws-lambda' }).success).toBe(
      false,
    );
    expect(StudyEvent.safeParse({ ...base, ...VARIANTS.answer, mode: 'cram' }).success).toBe(false);
  });
});

describe('Backup', () => {
  it('parses a backup with events and kv records', () => {
    const backup = {
      format: BACKUP_FORMAT,
      schemaVersion: 1,
      appVersion: '0.2.0',
      contentVersion: 'c-3f9a1e',
      exportedAt: '2026-10-09T08:00:00.000Z',
      events: [{ ...base, t: 'lesson.done', note: 'm03/aws-lambda' }],
      kv: { lastExportAt: { value: '2026-10-09T08:00:00.000Z', updatedAt: '2026-10-09T08:00:00.000Z' } },
    };
    expect(Backup.safeParse(backup).success).toBe(true);
    expect(Backup.safeParse({ ...backup, format: 'other' }).success).toBe(false);
    expect(Backup.safeParse({ ...backup, schemaVersion: 0 }).success).toBe(false);
  });
});
