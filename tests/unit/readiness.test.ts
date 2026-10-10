import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { addDays, DAY_MS, dayStartAt } from '../../src/engine/day.ts';
import {
  type ConceptMemory,
  deriveMemory,
  type MemoryContent,
  type MemoryState,
} from '../../src/engine/memory.ts';
import { firstAttempts, type MockAttempt } from '../../src/engine/mock.ts';
import {
  CLOSE,
  DOMAIN_FLOOR,
  DOMAIN_WEIGHTS,
  EVIDENCE_MIN,
  evidenceCount,
  goNoGo,
  NO_MOCK_CAP,
  PROJECT_DAYS,
  READY,
  type Readiness,
  readiness,
  readinessTarget,
  WEAKEST_MIN_CONCEPTS,
} from '../../src/engine/readiness.ts';
import { derive, toPlain } from '../../src/engine/replay.ts';
import { recall, review, type SrsCard } from '../../src/engine/srs.ts';
import { JOURNEY_CONTENT, journeyNow } from '../fixtures/journeys/content.ts';
import { examCrunch } from '../fixtures/journeys/journeys.ts';
import { type ConceptSpec, contentOf } from '../fixtures/memory.ts';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const TODAY = '2026-10-20';
const PLUS7 = new Date(NOW.getTime() + 7 * DAY_MS);

/** A card last reviewed at `at` with the given stability; a huge stability keeps recall at about 1. */
const cardAt = (at: Date, stability: number): SrsCard => ({ ...review(null, 'good', at), stability });
const STRONG = cardAt(NOW, 1_000_000);

/** A concept's memory with a card and `successDays` distinct success days (the gate is min(1, days / 2)). */
const memoryOfCard = (card: SrsCard | null, successDays = 2): ConceptMemory => ({
  card,
  enteredOn: card === null ? null : TODAY,
  lastAnswerDay: card === null ? null : TODAY,
  fsrsDay: card === null ? null : TODAY,
  fsrsRating: card === null ? null : 'good',
  extraAgainDay: null,
  successDays: Array.from({ length: successDays }, (_, i) => addDays(TODAY, -i)),
  misconception: null,
});

/** `count` tested concepts tagged with `task`, named `<prefix>-NN`. */
const conceptsFor = (prefix: string, task: string, count: number): ConceptSpec[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${String(i + 1).padStart(2, '0')}`,
    module: 1,
    tasks: [task],
  }));

/** Ten tested concepts per domain on tasks 1.1, 2.1, 3.1 and 4.1. */
const WORLD: ConceptSpec[] = [
  ...conceptsFor('d1', '1.1', 10),
  ...conceptsFor('d2', '2.1', 10),
  ...conceptsFor('d3', '3.1', 10),
  ...conceptsFor('d4', '4.1', 10),
];

/** A memory state over `content` whose concepts are exactly `entries`. */
function memoryWith(
  content: MemoryContent,
  entries: Iterable<readonly [string, ConceptMemory]>,
  examDate: string | null = null,
): MemoryState {
  return { ...deriveMemory([], content), concepts: new Map(entries), examDate };
}

/** Every listed concept strong, except the ids in `skip`. */
const strongAll = (specs: readonly ConceptSpec[], skip: ReadonlySet<string> = new Set()) =>
  specs.filter((s) => !skip.has(s.id)).map((s) => [s.id, memoryOfCard(STRONG)] as const);

const attempt = (form: string, day: string, percent: number): MockAttempt => ({
  form,
  sid: `01JA0000000000000000000M${form}0`,
  percent,
  day,
  at: `${day}T10:00:00.000Z`,
  correct: Math.round(percent * 100),
  total: 100,
});

function read(
  specs: readonly ConceptSpec[],
  args: {
    entries?: Iterable<readonly [string, ConceptMemory]>;
    attempts?: readonly MockAttempt[];
    now?: Date;
    examDate?: string | null;
  } = {},
): Readiness {
  const content = contentOf(specs);
  return readiness({
    memory: memoryWith(content, args.entries ?? strongAll(specs), args.examDate ?? null),
    content,
    attempts: args.attempts ?? [],
    now: args.now ?? NOW,
    tz: 0,
  });
}

describe('readiness constants (spec 3.9)', () => {
  it('weighs the domains 24, 30, 34 and 12 and keeps the spec thresholds', () => {
    expect(DOMAIN_WEIGHTS).toEqual({ '1': 0.24, '2': 0.3, '3': 0.34, '4': 0.12 });
    expect([EVIDENCE_MIN, NO_MOCK_CAP, READY, CLOSE, DOMAIN_FLOOR]).toEqual([40, 0.7, 0.8, 0.65, 0.7]);
    expect([WEAKEST_MIN_CONCEPTS, PROJECT_DAYS]).toEqual([3, 7]);
  });
});

describe('readiness', () => {
  it('stays within 0 and 1', () => {
    for (const r of [
      read(WORLD),
      read(WORLD, { entries: [] }),
      read(WORLD, { attempts: [attempt('A', TODAY, 1)] }),
      read(WORLD, { attempts: [attempt('A', TODAY, 0)], entries: [] }),
    ]) {
      for (const x of [r.memory, ...Object.values(r.domains), r.value ?? 0, r.mock ?? 0]) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(1);
      }
    }
  });

  it('counts an unseen concept as 0', () => {
    const specs = [...WORLD, ...conceptsFor('unseen', '1.2', 10)];
    const r = read(specs, { entries: strongAll(WORLD) });
    expect(r.domains['1']).toBeCloseTo(0.5, 5);
    expect(r.domains['2']).toBeCloseTo(1, 5);
  });

  it('caps at 0.70 without a mock', () => {
    const r = read(WORLD);
    expect(r.memory).toBeGreaterThan(0.99);
    expect(r.value).toBe(0.7);
    expect(r.capped).toBe(true);
    expect(r.mock).toBeNull();
    expect(r.label).toBe('Close');
  });

  it('projects 7 days ahead without an exam date', () => {
    expect(readinessTarget(null, NOW, 0)).toEqual(PLUS7);
    expect(readinessTarget(TODAY, NOW, 0)).toEqual(PLUS7);
    expect(readinessTarget('2026-10-19', NOW, 0)).toEqual(PLUS7);
    const weak = cardAt(NOW, 5);
    const entries = strongAll(WORLD, new Set(['d4-01']));
    const r = read(WORLD, { entries: [...entries, ['d4-01', memoryOfCard(weak)]] });
    expect(r.at).toBe(PLUS7.toISOString());
    expect(r.domains['4']).toBeCloseTo((9 * recall(STRONG, PLUS7) + recall(weak, PLUS7)) / 10, 12);
  });

  it('reads at the exam day when the date is set and later than today', () => {
    expect(readinessTarget('2026-11-14', NOW, 0)).toEqual(new Date('2026-11-14T04:00:00.000Z'));
    expect(readinessTarget('2026-11-14', NOW, 60)).toEqual(dayStartAt('2026-11-14', 60));
    const weak = cardAt(NOW, 5);
    const entries = strongAll(WORLD, new Set(['d4-01']));
    const r = read(WORLD, { entries: [...entries, ['d4-01', memoryOfCard(weak)]], examDate: '2026-11-14' });
    const exam = new Date('2026-11-14T04:00:00.000Z');
    expect(r.at).toBe(exam.toISOString());
    expect(r.domains['4']).toBeCloseTo((9 * recall(STRONG, exam) + recall(weak, exam)) / 10, 12);
  });

  it('averages the latest two first attempts within 21 days', () => {
    const attempts = [
      attempt('A', '2026-09-28', 0.2),
      attempt('B', '2026-10-01', 0.6),
      attempt('C', '2026-10-15', 0.9),
      attempt('D', '2026-10-18', 0.7),
    ];
    const r = read(WORLD, { attempts });
    expect(r.mock).toBeCloseTo(0.8, 12);
    expect(r.capped).toBe(false);
    expect(r.value).toBeCloseTo(0.5 * r.memory + 0.4, 12);
    expect(read(WORLD, { attempts: attempts.slice(0, 2) }).mock).toBeCloseTo(0.6, 12);
  });

  it('may rise when a low mock attempt ages out of the 21-day window', () => {
    const attempts = [attempt('A', '2026-10-01', 0.5), attempt('B', '2026-10-06', 0.9)];
    const before = read(WORLD, { attempts, now: new Date('2026-10-22T12:00:00.000Z') });
    const after = read(WORLD, { attempts, now: new Date('2026-10-23T12:00:00.000Z') });
    expect(before.mock).toBeCloseTo(0.7, 12);
    expect(after.mock).toBeCloseTo(0.9, 12);
    expect(after.value ?? 0).toBeGreaterThan(before.value ?? 0);
  });

  it('needs every domain at 0.70 for Ready', () => {
    const recent = [attempt('A', '2026-10-18', 0.9)];
    const base = WORLD.filter((s) => !s.id.startsWith('d4-'));
    const world = (strong: number): Readiness => {
      const d4 = conceptsFor('d4', '4.1', 100);
      const specs = [...base, ...d4];
      return read(specs, { attempts: recent, entries: strongAll([...base, ...d4.slice(0, strong)]) });
    };
    const low = world(69);
    expect(low.domains['4']).toBeLessThan(0.7);
    expect(low.value ?? 0).toBeGreaterThanOrEqual(0.8);
    expect(low.label).toBe('Close');
    const high = world(71);
    expect(high.domains['4']).toBeGreaterThanOrEqual(0.7);
    expect(high.label).toBe('Ready');
  });

  it('needs the latest unseen mock at 80% for Ready', () => {
    const lowLast = read(WORLD, {
      attempts: [attempt('A', '2026-10-10', 0.95), attempt('B', '2026-10-18', 0.79)],
    });
    expect(lowLast.value ?? 0).toBeGreaterThanOrEqual(0.8);
    expect(lowLast.label).toBe('Close');
    const highLast = read(WORLD, {
      attempts: [attempt('A', '2026-10-10', 0.79), attempt('B', '2026-10-18', 0.95)],
    });
    expect(highLast.label).toBe('Ready');
  });

  it('shows no number before 40 concepts have evidence', () => {
    const attempts = [attempt('A', TODAY, 1)];
    const few = read(WORLD, { attempts, entries: strongAll(WORLD, new Set(['d4-10'])) });
    expect(few.value).toBeNull();
    expect(few.label).toBe('Building');
    expect(few.memory).toBeGreaterThan(0.9);
    const content = contentOf(WORLD);
    expect(evidenceCount(memoryWith(content, strongAll(WORLD, new Set(['d4-10']))), content)).toBe(39);
    expect(read(WORLD, { attempts }).value).not.toBeNull();
  });

  it('picks the weakest task with at least 3 concepts', () => {
    const halfGate = (specs: readonly ConceptSpec[]) =>
      specs.map((s) => [s.id, memoryOfCard(STRONG, 1)] as const);
    const twoUnseen = conceptsFor('t12', '1.2', 2);
    const t23 = conceptsFor('t23', '2.3', 3);
    const t24 = conceptsFor('t24', '2.4', 3);
    const r = read([...WORLD, ...twoUnseen, ...t23, ...t24], {
      entries: [...strongAll(WORLD), ...halfGate(t23), ...halfGate(t24)],
    });
    expect(r.weakest?.task).toBe('2.3');
    expect(r.weakest?.value).toBeCloseTo(0.5, 5);
    expect(read(WORLD).weakest?.task).toBe('1.1');
  });

  it('reads the exam-crunch journey to its committed value', () => {
    const events = examCrunch();
    const now = journeyNow('exam-crunch');
    const memory = deriveMemory(events, JOURNEY_CONTENT);
    const r = readiness({
      memory,
      content: JOURNEY_CONTENT,
      attempts: firstAttempts(derive(events, null)),
      now,
      tz: 0,
    });
    expect(r.value).not.toBeNull();
    const path = fileURLToPath(new URL('../fixtures/journeys/exam-crunch.readiness.json', import.meta.url));
    const actual = `${JSON.stringify(toPlain({ shown: Math.floor(100 * (r.value ?? 0)), readiness: r }), null, 2)}\n`;
    if (!existsSync(path)) writeFileSync(path, actual);
    expect(actual).toBe(readFileSync(path, 'utf8'));
  });
});

describe('goNoGo', () => {
  const close = read(WORLD);
  const ready = read(WORLD, { attempts: [attempt('A', '2026-10-18', 0.9)] });

  it('shows from 7 to 2 days before the exam while readiness is not Ready', () => {
    expect(ready.label).toBe('Ready');
    const at = (today: string, r: Readiness = close) =>
      goNoGo({ examDate: '2026-11-14', today, readiness: r });
    expect(at('2026-11-07')).toBe(true);
    expect(at('2026-11-12')).toBe(true);
    expect(at('2026-11-06')).toBe(false);
    expect(at('2026-11-13')).toBe(false);
    expect(at('2026-11-09', ready)).toBe(false);
    expect(goNoGo({ examDate: null, today: '2026-11-07', readiness: close })).toBe(false);
  });
});
