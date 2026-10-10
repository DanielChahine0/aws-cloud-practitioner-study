# Phase 2 Memory Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn practice into a daily habit across the whole course: one FSRS card per tested concept with the exam cap, the confidence bet paying XP, levels, a streak with freezes, a review queue with relearn steps, a top bar, a Home with the Next button (including "Check yourself"), the 13 hexes and "Done for today", the one-time exam date question, an offline service worker, at least 2 live practice questions for every tested concept in all 13 modules, and rule R10 switched on at 2 per concept with `blueprintTerms`.

**Architecture:** Everything Phase 2 shows is derived, never stored: a new pure reducer `deriveMemory` under `src/engine/` replays the same event log Phase 1 writes into FSRS cards, counted answers, XP, misconceptions and qualifying days, and pure functions on top of it compute the queue, the streak, module mastery and the Next action for a given moment.
The app holds the log in signals as before and adds computed signals for memory, the queue and the Next action, driven by a minute clock; the only event change is an optional `relearn` flag on `answer`, so the storage schema stays at version 1.
Content follows the Phase 1 pipeline unchanged: per-lesson writer agents draft questions in a dedicated worktree, fresh checker agents verify them in rounds, `pnpm content:stamp` makes them live, and R10 turns on once every tested concept has 2 live questions.
A build-time plugin emits an unhashed `sw.js` that precaches the whole build, so the site works offline after one visit.

**Tech Stack:** Node 24.21.0, pnpm 12.8.1, TypeScript 7.0.2, Vite 8.3.2, Preact 10.29.8 with @preact/signals 2.11.3, zod 4.6.5 (classic for content, `zod/mini` for events and backups), ts-fsrs 5.4.2 (new, exact pin, imported only by `src/engine/srs.ts`), marked 18.0.14, yaml 2.9.1, Vitest 5.0.3, fast-check 4.10.2, Playwright 1.63.0 with @axe-core/playwright 4.13.0, Biome 2.5.15, IndexedDB, the Cache Storage and Service Worker APIs.

**Spec:** `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, sections 1.4, 2.3, 2.6, 2.7, 2.9 (R10), 2.10, 3.1 to 3.8, 3.11, 4.1, 4.6, 7.2 to 7.5, 8, 9 and 10.1 (Phase 2 row).
**Target:** Monday, October 19, 2026, when daily reviews start and every module has practice questions (spec 10.2), for the exam on Saturday, November 14, 2026.

---

## Conventions for every task

- Run every command from the repository root, `/Users/danielchahine/Programs/AWS Cloud Practitioner Essentials`, where `node --version` must print `v24.21.0`; in a fresh shell start with `eval "$(fnm env)"; fnm use`.
- Never write the em dash character (U+2014) anywhere, and keep one sentence per line in every Markdown file outside code blocks and tables (rule R8 checks both).
- Commit messages are plain imperative sentences with a short body; never add a `Co-Authored-By` line (Dani's global instructions forbid agent co-author lines).
- Run `pnpm lint:fix` before each commit so Biome formats the code; the code in this plan follows Biome's style, but the formatter has the last word.
- The pre-commit hook runs `pnpm check`, so a commit fails while any check fails; fix the cause rather than bypassing the hook, and never use `--no-verify`.
- Stage files by path, never with `git add -A` or `git add .`.
- Never hand-edit generated files: `content/fingerprints/*` comes only from `pnpm content:fingerprint`, the `verified` and `review` blocks of a question only from `pnpm content:stamp`, and every `*.snapshot.json` under `tests/fixtures/` only from its test helper (delete it and rerun the test to regenerate it).
- Course text stays outside the repo in `~/Library/Application Support/ccp-study/`; no file, fixture, test, agent prompt or agent output in the repo may contain it, and test fixtures use made-up bakery text.
- Question writers never read the course source text, `content/fingerprints/` or AWS exam questions; checker agents read only their own batch file and never `.results/checks/keys.json`.
- Agent results and check batches live under `.results/` (git-ignored) and are never committed.
- Code under `src/engine/` is pure: it imports no Preact, signals, `src/app`, `src/ui` or `src/store` code and touches no DOM, storage, `crypto` or `globalThis`; it takes the current moment and the UTC offset as arguments, and Biome enforces the boundary.
- `src/engine/srs.ts` is the only file that imports `ts-fsrs`.
- Raw question and concept ids appear only in the runner's report panel and in tool output, never elsewhere in the UI (spec 2.8).
- UI copy in this plan is exact: tests match it word for word, so change it only together with its test.

## File structure

Created in this phase (paths from the repo root):

| Path | Responsibility |
|---|---|
| `src/engine/srs.ts` | The ts-fsrs wrapper: `SrsCard`, `rate`, `review`, `recall` and the exam cap `capDue` |
| `src/engine/bets.ts`, `src/engine/xp.ts`, `src/engine/level.ts` | The bet payoffs and the 5/7 crossover, the XP table and the effort bonus, and levels |
| `src/engine/memory.ts` | `deriveMemory`: counted answers, one FSRS card per concept, misconceptions, XP, qualifying days, and the session summary |
| `src/engine/streak.ts` | The streak with freezes from the qualifying days |
| `src/engine/queue.ts` | The review queue: due set, order, interleaving, confusable pairs, chunks, catch-up and the new-concept cap |
| `src/engine/mastery.ts`, `src/engine/next.ts` | Module mastery and hex bands, and the Next action of spec 4.6 |
| `src/app/clock.ts`, `src/app/config.ts` | The minute clock signal, and `TARGET_EXAM_DATE` |
| `src/app/home.ts`, `src/app/memory.ts` | Pure Home helpers (memory content from the index, lesson refs, Next labels), and the memory, queue, streak, mastery and Next signals |
| `src/app/topbar.ts` | Pure top bar rules: the due and streak labels, the XP flash gain and the rules-updated line |
| `src/app/screens/TopBar.tsx`, `src/ui/HexMap.tsx` | The top bar with due count, streak, level line and XP flash, and the 4-5-4 hex map |
| `src/sw.ts`, `scripts/sw-plugin.ts`, `scripts/lib/sw-manifest.ts` | The service worker, the Vite plugin that emits `sw.js`, and its precache manifest |
| `scripts/content/rules/r10-coverage.ts` | Rule R10 with `practicePerConcept` and `blueprintTerms` |
| `tests/unit/srs.test.ts`, `bets.test.ts`, `xp.test.ts`, `level.test.ts`, `memory.test.ts`, `streak.test.ts`, `queue.test.ts`, `mastery.test.ts`, `next.test.ts` | Table-driven tests for the engine |
| `tests/unit/anti-grind.test.ts`, `tests/property/grind.property.test.ts` | One test per Phase 2 row of the anti-grind audit (spec 3.11), and the grind-invariance properties |
| `tests/unit/journeys.test.ts`, `tests/fixtures/journeys/content.ts`, `tests/fixtures/journeys/journeys.ts`, `tests/fixtures/journeys/{first-week,exam-crunch,comeback-10-days}.jsonl` and their `.snapshot.json` | Golden replay journeys with their made-up content and committed snapshots |
| `tests/fixtures/memory.ts` | Shared builders for the engine tests: made-up content, answers and session events |
| `tests/unit/home.test.ts`, `tests/unit/topbar.test.ts`, `tests/unit/sw-manifest.test.ts`, `tests/unit/r10.test.ts` | Tests for the Home helpers, the top bar rules, the precache manifest and R10 |
| `tests/fixtures/backups/v1-memory.json`, `tests/fixtures/backups/v1-memory.snapshot.json` | A schema 1 backup with reviews, a relearn answer and an exam date |
| `tests/content/bad/r10-missing-term.yaml` | The failing fixture for R10 |
| `tests/e2e/memory.spec.ts`, `tests/e2e/offline.spec.ts` | End-to-end tests for the memory loop and for offline use |
| `tests/e2e/questions.ts` | The question helpers the practice and memory tests share |
| `content/questions/02-*/*.yaml`, `content/questions/04-*/*.yaml` to `content/questions/13-*/*.yaml` | Practice questions for Modules 2 and 4 to 13, one file per lesson note that homes a tested concept |

Modified:

| Path | Change |
|---|---|
| `package.json`, `pnpm-lock.yaml` | `ts-fsrs` 5.4.2, version `0.3.0` |
| `biome.json` | Biome leaves the journey snapshots alone, as it does the backup snapshots |
| `schemas/events.ts` | `answer` gains the optional `relearn` flag |
| `schemas/chunks.ts`, `scripts/content/build.ts` | `ConceptMeta` gains `tasks`, symmetric `confusableWith`, `aliases` and `splitFrom`; `LessonMeta` gains `minutes` and `checkConcepts` |
| `src/engine/day.ts` | Offset-based study days, day starts and day arithmetic |
| `src/engine/replay.ts` | `ENGINE_VERSION` 2, `AnswerRecord` gains `id`, `concept` and `relearn`, and `toPlain` is exported |
| `src/engine/select.ts` | The module quiz orders by recall; relearn variants and review session items |
| `src/store/kv.ts`, `src/store/migrations/index.ts` | New kv keys, and `migrate` with injectable steps plus `migrateLocal` for the stored log |
| `scripts/content/rules/index.ts`, `content/validate.yaml`, `tests/fixtures/content-root/content/validate.yaml` | R10 in `RULES`, and the Phase 2 switches |
| `scripts/content/lib/coverage.ts` | `practiceCounts`, the practice questions per concept through aliases, shared by R10 and `--homed` |
| `scripts/content/lib/style.ts`, `scripts/content/lib/report.ts`, `scripts/content/report.ts`, `agents/question-writer.md` | Coverage counts live and revisable questions, `--homed` gives `live`, `open` and `need` per concept, `--targets` lists the notes to write, and the writer prompt writes `need` questions |
| `src/main.tsx`, `vite.config.ts`, `scripts/check-budgets.ts`, `playwright.config.ts` | Service worker registration, the plugin, the `sw.js` budget, and blocked service workers outside the offline test |
| `src/app/progress.ts`, `router.ts`, `nav.ts`, `keys.ts`, `keyboard.ts`, `runner.ts`, `App.tsx` | Local migration on open, the review route, `g r`, `Enter` and `j`/`k` on Home, the top bar and the one-time lines |
| `src/app/screens/Home.tsx`, `Runner.tsx`, `Progress.tsx`, `Screen.tsx`, `Help.tsx`, `LessonPage.tsx`, `ModulePage.tsx` | Home with Next and hexes, review with relearn, XP and misconceptions in the runner, level, streak and exam date in Progress, new shortcuts, the current lesson, and `j`/`k` targets on the module page |
| `src/ui/base.css` | Top bar items, level line, Next button, hexes and the review runner, from the existing tokens |
| `content/questions/01-introduction-to-the-cloud/*.yaml`, `content/questions/03-exploring-compute-services/*.yaml` | Top-up drafts for concepts with fewer than 2 live questions |
| `tests/fixtures/backups/v1.snapshot.json` | Regenerated for the new `AnswerRecord` fields |
| `tests/unit/day.test.ts`, `replay.test.ts`, `select.test.ts`, `events-schema.test.ts`, `migrations.test.ts`, `backups.test.ts`, `build.test.ts`, `router.test.ts`, `nav.test.ts`, `keys.test.ts`, `runner-keys.test.ts`, `runner.test.ts`, `style.test.ts`, `coverage.test.ts`, `draft.test.ts`, `agents.test.ts` | Follow the changes above |
| `tests/e2e/reader.spec.ts`, `tests/e2e/practice.spec.ts`, `tests/e2e/helpers.ts` | Home shows hexes, the practice tests read the new end line and sweep all 13 modules, and `seedEvents` writes a log into the page |
| `tests/fixtures/events.ts` | `timelineOf` for multi-day logs with real ULIDs and stamped study days |
| `README.md` | The memory loop, offline use, `--targets`, and the Phase 2 rules |
| `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md` | Section 8.1 names the `relearn` flag and the new kv keys |

## Task order and dependencies

- Tasks 1 and 2 depend on nothing; Task 3 needs Tasks 1 and 2; Task 4 needs Task 1; Tasks 5 and 6 need Task 3; Task 7 needs Tasks 3 and 5; Task 8 needs Tasks 3 to 7.
- Tasks 9, 10 and 11 depend on nothing in this phase.
- Task 12 needs Tasks 3, 4, 5, 7, 9 and 10; Task 13 needs Tasks 2 and 12; Task 14 needs Tasks 7 and 12; Task 15 needs Tasks 2, 3, 5, 6 and 12; Tasks 13, 14 and 15 run in that order, because they all edit `src/ui/base.css`.
- Task 16 depends on nothing; Task 17 needs Task 16 (`practiceCounts`); Task 18 needs Tasks 3 and 11 to 15; Task 19 needs Task 17 only; Task 20 needs every other task, with Task 19's branch merged.
- A few edits cross task lines on purpose, and the order above covers them: Task 6 passes `recall: () => 0` in `Runner.tsx` until Task 15 rewrites it; Task 9 gives the `LessonMeta` literals in `keys.test.ts` and `nav.test.ts` their new fields before Task 12 extends both files; Task 12 adds `control` to the runner's key input; Task 15 loosens the end-line parse in `practice.spec.ts`, and Task 18 makes it exact; Task 18 adds the offline review to Task 11's `offline.spec.ts`.
- Builders can work in parallel git worktrees: Tasks 1, 2, 9, 10, 11 and 16 start at once, Tasks 3 to 8 and Task 17 follow their prerequisites, Tasks 12 to 15 follow Tasks 1 to 10, and the controller starts the content fan-out (Task 19) as soon as Task 17 is on `master`, because it is the long pole.

---

## Task 1: Pin ts-fsrs, the SRS wrapper and study-day arithmetic

**Files:**
- Create: `src/engine/srs.ts`, `tests/unit/srs.test.ts`
- Modify: `package.json`, `pnpm-lock.yaml`, `src/engine/day.ts`, `tests/unit/day.test.ts`
- Test: `tests/unit/day.test.ts`, `tests/unit/srs.test.ts`

Design notes:
- Every engine function that needs "now" takes the moment and the offset (minutes east) as arguments, and replay uses each event's stamped `day` and `tz`, so the new day helpers do UTC arithmetic on the shifted time and never read the local zone.
- `src/engine/srs.ts` is the only file that imports `ts-fsrs`; cards are plain JSON with ISO times (`SrsCard`), converted to and from ts-fsrs's `Card` inside the file.
- ts-fsrs 5.4.2 caps Hard at `maximum_interval` but then keeps Good at least one day past Hard, so a mature card gets 181 days; `review` clamps the due to 180 days after the review, which the ten-review test pins.
- The golden numbers below were measured with ts-fsrs 5.4.2 from a new card at `2026-10-09T10:00:00Z`: a first Good is due in 3 days with stability 2.3065 and recall 0.8809 at due, a first Hard in 2 days with 0.8674, and a first Again in 1 day with 0.7662.
- Good reviews on their due dates run 3, 14, 57 and 180 days, with recall at due 0.8809, 0.8991, 0.8999 and 0.9058.
- `capDue` compares study days as `YYYY-MM-DD` strings, which sort like dates.

- [ ] **Step 1: Pin ts-fsrs**

```bash
pnpm add --save-exact ts-fsrs@5.4.2
```

Expected: the output ends with `+ ts-fsrs 5.4.2`, and `package.json` gains `"ts-fsrs": "5.4.2",` under `dependencies`, between `preact` and `zod`.

- [ ] **Step 2: Write the failing day tests**

Replace `tests/unit/day.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import {
  addDays,
  DAY_MS,
  DAY_START_HOUR,
  dayStartAt,
  daysBetween,
  nextDayStart,
  studyDay,
  studyDayAt,
  tzOffset,
} from '../../src/engine/day.ts';

describe('studyDay', () => {
  it('starts the study day at 04:00 local time', () => {
    expect(DAY_START_HOUR).toBe(4);
    expect(studyDay(new Date(2026, 9, 10, 3, 59))).toBe('2026-10-09');
    expect(studyDay(new Date(2026, 9, 10, 4, 0))).toBe('2026-10-10');
    expect(studyDay(new Date(2026, 9, 10, 23, 59))).toBe('2026-10-10');
  });

  it('crosses a month and a year boundary before 04:00', () => {
    expect(studyDay(new Date(2026, 10, 1, 2, 0))).toBe('2026-10-31');
    expect(studyDay(new Date(2027, 0, 1, 0, 30))).toBe('2026-12-31');
  });

  it('leaves its input alone', () => {
    const at = new Date(2026, 9, 10, 1, 0);
    studyDay(at);
    expect(at.getDate()).toBe(10);
  });
});

describe('tzOffset', () => {
  it('is minutes east of UTC', () => {
    const at = new Date(2026, 9, 10, 12, 0);
    expect(tzOffset(at)).toBe(0 - at.getTimezoneOffset());
  });
});

describe('studyDayAt', () => {
  it('reads the study day in the given offset, whatever zone runs the code', () => {
    expect(studyDayAt(new Date('2026-10-10T01:59:00Z'), 120)).toBe('2026-10-09');
    expect(studyDayAt(new Date('2026-10-10T02:00:00Z'), 120)).toBe('2026-10-10');
    expect(studyDayAt(new Date('2026-10-10T07:59:00Z'), -240)).toBe('2026-10-09');
    expect(studyDayAt(new Date('2026-10-10T08:00:00Z'), -240)).toBe('2026-10-10');
  });

  it('agrees with the local studyDay for every hour around both 2026 DST changes', () => {
    const zone = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      for (const [y, m, d] of [
        [2026, 10, 1],
        [2026, 2, 8],
      ] as const) {
        for (let hour = 0; hour < 24; hour++) {
          for (const minute of [0, 30, 59]) {
            const at = new Date(y, m, d, hour, minute);
            expect(studyDayAt(at, tzOffset(at))).toBe(studyDay(at));
          }
        }
      }
    } finally {
      if (zone === undefined) Reflect.deleteProperty(process.env, 'TZ');
      else process.env.TZ = zone;
    }
  });
});

describe('day arithmetic', () => {
  it('starts a study day at 04:00 in the given offset', () => {
    expect(dayStartAt('2026-10-10', 120).toISOString()).toBe('2026-10-10T02:00:00.000Z');
    expect(dayStartAt('2026-10-10', -240).toISOString()).toBe('2026-10-10T08:00:00.000Z');
    expect(dayStartAt('2026-10-10', 0).toISOString()).toBe('2026-10-10T04:00:00.000Z');
  });

  it('adds days across months and years in both directions', () => {
    expect(DAY_MS).toBe(86_400_000);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-10', 0)).toBe('2026-10-10');
    expect(addDays('2026-11-14', -7)).toBe('2026-11-07');
  });

  it('counts whole days between two study days', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3);
    expect(daysBetween('2026-11-02', '2026-10-30')).toBe(-3);
    expect(daysBetween('2026-10-10', '2026-10-10')).toBe(0);
  });

  it('finds the next 04:00 after a moment', () => {
    expect(nextDayStart(new Date('2026-10-10T01:59:00Z'), 120).toISOString()).toBe(
      '2026-10-10T02:00:00.000Z',
    );
    expect(nextDayStart(new Date('2026-10-10T02:00:00Z'), 120).toISOString()).toBe(
      '2026-10-11T02:00:00.000Z',
    );
  });
});
```

The DST test switches `process.env.TZ` to `America/New_York`, which Node applies at once, so it checks both 2026 changes on any machine, and it restores the zone in `finally`.

- [ ] **Step 3: Write the failing SRS tests**

Create `tests/unit/srs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addDays, DAY_MS, dayStartAt, studyDayAt } from '../../src/engine/day.ts';
import { fnv1a } from '../../src/engine/rng.ts';
import {
  capDue,
  type ExamCap,
  MAX_INTERVAL_DAYS,
  RETENTION,
  rate,
  recall,
  review,
  type SrsCard,
} from '../../src/engine/srs.ts';

const START = new Date('2026-10-09T10:00:00Z');
const daysUntilDue = (card: SrsCard, from: Date): number => (Date.parse(card.due) - from.getTime()) / DAY_MS;

describe('rate', () => {
  it('rates a wrong answer Again, a right Not sure Hard and a right Sure Good', () => {
    expect(rate(false, false)).toBe('again');
    expect(rate(false, true)).toBe('again');
    expect(rate(true, false)).toBe('hard');
    expect(rate(true, true)).toBe('good');
  });
});

describe('review and recall (golden vectors from ts-fsrs 5.4.2)', () => {
  it('uses retention 0.90 and a 180-day cap', () => {
    expect(RETENTION).toBe(0.9);
    expect(MAX_INTERVAL_DAYS).toBe(180);
  });

  it('schedules a first Good 3 days out with recall 0.881 at due', () => {
    const card = review(null, 'good', START);
    expect(card.due).toBe('2026-10-12T10:00:00.000Z');
    expect(card.stability).toBeCloseTo(2.3065, 4);
    expect(card.lastReview).toBe(START.toISOString());
    expect(card.reps).toBe(1);
    expect(card.lapses).toBe(0);
    expect(card.state).toBe(2);
    expect(recall(card, new Date(card.due))).toBeCloseTo(0.881, 3);
  });

  it('schedules a first Hard 2 days out with recall 0.867 at due', () => {
    const card = review(null, 'hard', START);
    expect(card.due).toBe('2026-10-11T10:00:00.000Z');
    expect(card.stability).toBeCloseTo(1.2931, 4);
    expect(recall(card, new Date(card.due))).toBeCloseTo(0.867, 3);
  });

  it('schedules a first Again 1 day out with recall 0.766 at due', () => {
    const card = review(null, 'again', START);
    expect(card.due).toBe('2026-10-10T10:00:00.000Z');
    expect(card.stability).toBeCloseTo(0.212, 3);
    expect(recall(card, new Date(card.due))).toBeCloseTo(0.766, 3);
  });

  it('orders the intervals Again < Hard < Good and recalls fully at the review itself', () => {
    const intervals = (['again', 'hard', 'good'] as const).map((r) =>
      daysUntilDue(review(null, r, START), START),
    );
    expect(intervals).toEqual([1, 2, 3]);
    expect(recall(review(null, 'good', START), START)).toBe(1);
  });

  it('keeps recall at due near 0.90 over ten Good reviews and never passes 180 days', () => {
    let card = review(null, 'good', START);
    let at = START;
    for (let i = 0; i < 10; i++) {
      const days = daysUntilDue(card, at);
      expect(days).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
      if (days >= 7 && days < MAX_INTERVAL_DAYS) {
        expect(Math.abs(recall(card, new Date(card.due)) - 0.9)).toBeLessThanOrEqual(0.01);
      }
      at = new Date(card.due);
      card = review(card, 'good', at);
    }
    expect(daysUntilDue(card, at)).toBe(MAX_INTERVAL_DAYS);
  });

  it('keeps a card plain JSON, so it survives a round trip', () => {
    const card = review(review(null, 'good', START), 'again', new Date('2026-10-12T10:00:00Z'));
    expect(JSON.parse(JSON.stringify(card))).toEqual(card);
    expect(card.lapses).toBe(1);
    expect(recall(card, new Date('2026-10-12T10:00:00Z'))).toBe(1);
  });

  it('clamps recall to [0, 1] even before the last review', () => {
    const card = review(null, 'good', START);
    const before = recall(card, new Date('2026-10-01T00:00:00Z'));
    expect(before).toBeGreaterThanOrEqual(0);
    expect(before).toBeLessThanOrEqual(1);
  });
});

describe('capDue', () => {
  const EXAM = '2026-11-14';
  const tz = 60;
  const cap = (concept: string, reviewDay: string, examDate: string | null = EXAM): ExamCap => ({
    concept,
    reviewDay,
    examDate,
    tz,
  });
  const at = (day: string, hour = 12): Date =>
    new Date(dayStartAt(day, tz).getTime() + (hour - 4) * 3_600_000);

  it('moves a due after the eve of the exam into the last week, spread by the concept id', () => {
    const due = capDue(at('2026-11-20'), cap('proof-box', '2026-11-02'));
    const spread = fnv1a('proof-box') % 7;
    expect(due.toISOString()).toBe(dayStartAt(addDays('2026-11-13', -spread), tz).toISOString());
  });

  it('leaves a due on or before the eve of the exam alone', () => {
    const early = at('2026-11-10');
    expect(capDue(early, cap('proof-box', '2026-11-02')).toISOString()).toBe(early.toISOString());
    const eve = at('2026-11-13', 23);
    expect(capDue(eve, cap('proof-box', '2026-11-02')).toISOString()).toBe(eve.toISOString());
  });

  it('never moves a due to the review day or before it', () => {
    for (const concept of ['proof-box', 'oven-rental', 'flour-delivery', 'display-case']) {
      const due = capDue(at('2026-12-01'), cap(concept, '2026-11-12'));
      expect(studyDayAt(due, tz)).toBe('2026-11-13');
    }
  });

  it('leaves the due alone without an exam date or on and after the exam day', () => {
    const late = at('2026-12-01');
    expect(capDue(late, cap('proof-box', '2026-11-02', null)).toISOString()).toBe(late.toISOString());
    expect(capDue(late, cap('proof-box', '2026-11-14')).toISOString()).toBe(late.toISOString());
    expect(capDue(late, cap('proof-box', '2026-11-20')).toISOString()).toBe(late.toISOString());
  });

  it('spreads 50 concepts over at least 5 days of the last week', () => {
    const days = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const due = capDue(at('2026-12-01'), cap(`bake-concept-${i}`, '2026-11-01'));
      const day = studyDayAt(due, tz);
      expect(day >= '2026-11-07' && day <= '2026-11-13').toBe(true);
      days.add(day);
    }
    expect(days.size).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 4: Run the tests and see them fail**

```bash
pnpm test tests/unit/day.test.ts tests/unit/srs.test.ts
```

Expected: FAIL; `day.test.ts` reports `6 failed | 4 passed` (the Phase 1 cases still pass, the new helpers are not functions yet), and `srs.test.ts` fails with `Cannot find module '../../src/engine/srs.ts'`.

- [ ] **Step 5: Add the offset-based day helpers**

Replace `src/engine/day.ts` with:

```ts
/** The study day starts at 04:00 local time, so a late-night session counts for the day before. */
export const DAY_START_HOUR = 4;

/** One day in milliseconds; study-day arithmetic runs on UTC dates, which have no DST. */
export const DAY_MS = 86_400_000;

const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;

const pad = (n: number, width = 2): string => String(n).padStart(width, '0');

/** The local study day of a moment, as `YYYY-MM-DD`. */
export function studyDay(at: Date): string {
  const day = new Date(at.getTime());
  if (day.getHours() < DAY_START_HOUR) day.setDate(day.getDate() - 1);
  return `${pad(day.getFullYear(), 4)}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}

/** The local offset from UTC in minutes, east positive. */
export function tzOffset(at: Date): number {
  return 0 - at.getTimezoneOffset();
}

/** `YYYY-MM-DD` of a UTC millisecond count. */
function utcDay(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Midnight UTC of a `YYYY-MM-DD` day, in milliseconds. */
function utcMidnight(day: string): number {
  return Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
}

/**
 * The study day of a moment in a given offset (minutes east), whatever zone runs the code.
 * Replay reads each event's stamped offset through this, so a log replays the same everywhere.
 */
export function studyDayAt(at: Date, tz: number): string {
  return utcDay(at.getTime() + tz * MINUTE_MS - DAY_START_HOUR * HOUR_MS);
}

/** The moment a study day starts (04:00) in a given offset. */
export function dayStartAt(day: string, tz: number): Date {
  return new Date(utcMidnight(day) + DAY_START_HOUR * HOUR_MS - tz * MINUTE_MS);
}

/** The study day `n` days after `day` (before it for a negative `n`). */
export function addDays(day: string, n: number): string {
  return utcDay(utcMidnight(day) + n * DAY_MS);
}

/** Whole days from `from` to `to`; negative when `to` comes first. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / DAY_MS);
}

/** The 04:00 that ends the study day holding `at`, in a given offset. */
export function nextDayStart(at: Date, tz: number): Date {
  return dayStartAt(addDays(studyDayAt(at, tz), 1), tz);
}
```

- [ ] **Step 6: Write the SRS wrapper**

Create `src/engine/srs.ts`:

```ts
import { type Card, createEmptyCard, fsrs, generatorParameters, Rating, type State } from 'ts-fsrs';
import { addDays, DAY_MS, dayStartAt, studyDayAt } from './day.ts';
import { fnv1a } from './rng.ts';

/**
 * The FSRS wrapper (spec 3.6), the only file that imports ts-fsrs.
 * Cards are plain JSON with ISO times, so replay state can be compared, snapshotted and cached.
 */

export const RETENTION = 0.9;
export const MAX_INTERVAL_DAYS = 180;

const scheduler = fsrs(
  generatorParameters({
    request_retention: RETENTION,
    maximum_interval: MAX_INTERVAL_DAYS,
    enable_fuzz: false,
    enable_short_term: false,
  }),
);

/** Easy is never assigned, because picking among options overstates recall (spec 3.1). */
export type SrsRating = 'again' | 'hard' | 'good';

export interface SrsCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** ts-fsrs `State`: 0 new, 1 learning, 2 review, 3 relearning. */
  state: 0 | 1 | 2 | 3;
  lastReview: string | null;
}

const GRADE = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good } as const;

function toCard(c: SrsCard): Card {
  const card: Card = {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsedDays,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as State,
  };
  if (c.lastReview !== null) card.last_review = new Date(c.lastReview);
  return card;
}

function fromCard(card: Card): SrsCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as SrsCard['state'],
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** The rating of a bet answer: wrong is Again, right and Sure is Good, right and Not sure is Hard. */
export function rate(correct: boolean, sure: boolean): SrsRating {
  if (!correct) return 'again';
  return sure ? 'good' : 'hard';
}

/**
 * One FSRS update at `at`; `null` starts a new card.
 * ts-fsrs keeps Good one day past a capped Hard, so the wrapper holds every interval to 180 days.
 */
export function review(card: SrsCard | null, rating: SrsRating, at: Date): SrsCard {
  const next = fromCard(scheduler.next(card ? toCard(card) : createEmptyCard(at), at, GRADE[rating]).card);
  const latest = at.getTime() + MAX_INTERVAL_DAYS * DAY_MS;
  if (Date.parse(next.due) <= latest) return next;
  return { ...next, due: new Date(latest).toISOString(), scheduledDays: MAX_INTERVAL_DAYS };
}

/** The probability of recall R at a moment, in [0, 1]. */
export function recall(card: SrsCard, at: Date): number {
  const r = scheduler.get_retrievability(toCard(card), at, false);
  return Math.min(1, Math.max(0, r));
}

/** What the exam cap needs: the concept, the review's study day and offset, and the current exam date. */
export interface ExamCap {
  concept: string;
  reviewDay: string;
  examDate: string | null;
  tz: number;
}

/**
 * The exam cap (spec 3.6): a due after the eve of the exam moves to 04:00 of a day in the last week,
 * `max(tomorrow, examDay - 1 - (fnv1a(concept) mod 7))`, which spreads the final reviews.
 */
export function capDue(due: Date, cap: ExamCap): Date {
  const { concept, reviewDay, examDate, tz } = cap;
  if (examDate === null || reviewDay >= examDate) return due;
  const eve = addDays(examDate, -1);
  if (studyDayAt(due, tz) <= eve) return due;
  const spread = addDays(eve, -(fnv1a(concept) % 7));
  const tomorrow = addDays(reviewDay, 1);
  return dayStartAt(spread > tomorrow ? spread : tomorrow, tz);
}
```

- [ ] **Step 7: Run the tests and the checks and see them pass**

```bash
pnpm test tests/unit/day.test.ts tests/unit/srs.test.ts
pnpm typecheck
pnpm lint
grep -rl "from 'ts-fsrs'" src
```

Expected: `Test Files  2 passed (2)` and `Tests  24 passed (24)`; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`; `grep` prints only `src/engine/srs.ts`.

- [ ] **Step 8: Commit**

```bash
pnpm lint:fix
git add package.json pnpm-lock.yaml src/engine/day.ts src/engine/srs.ts tests/unit/day.test.ts tests/unit/srs.test.ts
git commit -m "Pin ts-fsrs and add the SRS wrapper and study-day arithmetic" -m "ts-fsrs 5.4.2 is pinned exactly and imported only by src/engine/srs.ts, which keeps cards as plain JSON, holds intervals to 180 days and applies the exam cap. day.ts gains offset-based study days so replay never depends on the zone it runs in."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 2: Bets, XP and levels

**Files:**
- Create: `src/engine/bets.ts`, `src/engine/xp.ts`, `src/engine/level.ts`, `tests/unit/bets.test.ts`, `tests/unit/xp.test.ts`, `tests/unit/level.test.ts`
- Test: `tests/unit/bets.test.ts`, `tests/unit/xp.test.ts`, `tests/unit/level.test.ts`

Design notes:
- The bet table, the 5/7 crossover and the hint come from spec 3.1, the XP rows from spec 3.2, and the level curve from spec 3.3.
- Phase 2 pays only `XP.lesson`, the bet and the effort bonus; the other rows are defined now so later phases import one table.
- `level(xpForLevel(L))` is exact because `1 + xpForLevel(L) / 12.5` is the square `(2L - 1)^2`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/bets.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BET, betXp, expectedXp, SURE_BREAKEVEN, SURE_HINT } from '../../src/engine/bets.ts';

describe('the bet (spec 3.1)', () => {
  it('pays 10 or 0 for Sure and 8 or 5 for Not sure', () => {
    expect(BET).toEqual({ sure: { right: 10, wrong: 0 }, notSure: { right: 8, wrong: 5 } });
    expect(betXp(true, true)).toBe(10);
    expect(betXp(false, true)).toBe(0);
    expect(betXp(true, false)).toBe(8);
    expect(betXp(false, false)).toBe(5);
  });

  it('breaks even at p = 5/7', () => {
    expect(SURE_BREAKEVEN).toBe(5 / 7);
    expect(expectedXp(5 / 7, true)).toBeCloseTo(expectedXp(5 / 7, false), 12);
  });

  it('makes Not sure pay more at 71% and Sure pay more at 72%', () => {
    expect(expectedXp(0.71, false)).toBeGreaterThan(expectedXp(0.71, true));
    expect(expectedXp(0.72, true)).toBeGreaterThan(expectedXp(0.72, false));
  });

  it('gives a hint that names the crossover', () => {
    expect(Math.floor(SURE_BREAKEVEN * 100)).toBe(71);
    expect(SURE_HINT).toBe('Press Sure when you are more than 71% sure.');
    expect(SURE_HINT).toContain(`${Math.floor(SURE_BREAKEVEN * 100)}%`);
  });
});
```

Create `tests/unit/xp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { effortBonus, XP } from '../../src/engine/xp.ts';

describe('XP (spec 3.2)', () => {
  it('matches the spec table row by row', () => {
    expect(XP).toEqual({
      lesson: 10,
      lightningPerCorrect: 1,
      lightningDailyCap: 10,
      incidentPerfect: 15,
      incident: 8,
      lab: 30,
      labNoHints: 10,
      boss: 100,
      mock: 150,
      decision: 20,
      decisionGood: 10,
      mission0: 50,
      mission: 75,
    });
  });

  it('pays round(10 * (1 - R)) as the effort bonus', () => {
    expect(effortBonus(0.9)).toBe(1);
    expect(effortBonus(0.77)).toBe(2);
    expect(effortBonus(0.7)).toBe(3);
    expect(effortBonus(1)).toBe(0);
    expect(effortBonus(0.97)).toBe(0);
    expect(effortBonus(0)).toBe(10);
  });

  it('clamps R to [0, 1]', () => {
    expect(effortBonus(1.2)).toBe(0);
    expect(effortBonus(-0.1)).toBe(10);
  });
});
```

Create `tests/unit/level.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { level, levelProgress, xpForLevel } from '../../src/engine/level.ts';

describe('levels (spec 3.3)', () => {
  it('needs 50 * L * (L - 1) XP for level L', () => {
    expect([2, 5, 10, 20, 25].map(xpForLevel)).toEqual([100, 1_000, 4_500, 19_000, 30_000]);
    expect(xpForLevel(1)).toBe(0);
  });

  it('inverts xpForLevel exactly at every boundary up to level 40', () => {
    for (let L = 1; L <= 40; L++) {
      expect(level(xpForLevel(L))).toBe(L);
      if (L >= 2) expect(level(xpForLevel(L) - 1)).toBe(L - 1);
    }
  });

  it('starts at level 1 and never drops below it', () => {
    expect(level(0)).toBe(1);
    expect(level(-50)).toBe(1);
  });

  it('measures the way to the next level as a fraction in [0, 1)', () => {
    expect(levelProgress(450)).toBe(0.5);
    expect(levelProgress(0)).toBe(0);
    expect(levelProgress(100)).toBe(0);
    expect(levelProgress(99)).toBeCloseTo(0.99, 12);
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/bets.test.ts tests/unit/xp.test.ts tests/unit/level.test.ts
```

Expected: FAIL with `Cannot find module '../../src/engine/bets.ts'`, `'../../src/engine/xp.ts'` and `'../../src/engine/level.ts'`.

- [ ] **Step 3: Write the bet payoffs**

Create `src/engine/bets.ts`:

```ts
/**
 * The confidence bet (spec 3.1): Sure pays 10 or 0, Not sure pays 8 or 5.
 * Expected XP is `10p` for Sure and `5 + 3p` for Not sure, so Sure pays only above p = 5/7.
 */
export const BET = { sure: { right: 10, wrong: 0 }, notSure: { right: 8, wrong: 5 } } as const;

/** The probability of being right at which both buttons pay the same, about 71.4%. */
export const SURE_BREAKEVEN = 5 / 7;

export const SURE_HINT = 'Press Sure when you are more than 71% sure.';

/** The bet XP of one counted answer. */
export function betXp(correct: boolean, sure: boolean): number {
  const row = sure ? BET.sure : BET.notSure;
  return correct ? row.right : row.wrong;
}

/** The expected bet XP at a probability `p` of being right. */
export function expectedXp(p: number, sure: boolean): number {
  const row = sure ? BET.sure : BET.notSure;
  return p * row.right + (1 - p) * row.wrong;
}
```

- [ ] **Step 4: Write the XP table and the effort bonus**

Create `src/engine/xp.ts`:

```ts
/**
 * The XP table (spec 3.2). Phase 2 pays `lesson`, the bet and the effort bonus;
 * the other rows wait for the phases that add lightning rounds, incidents, labs, bosses, mocks,
 * capstone decisions and missions.
 */
export const XP = {
  lesson: 10,
  lightningPerCorrect: 1,
  lightningDailyCap: 10,
  incidentPerfect: 15,
  incident: 8,
  lab: 30,
  labNoHints: 10,
  boss: 100,
  mock: 150,
  decision: 20,
  decisionGood: 10,
  mission0: 50,
  mission: 75,
} as const;

/** The effort bonus of a right answer on a due concept: `round(10 * (1 - R))`, R when the question showed. */
export function effortBonus(recallWhenShown: number): number {
  const r = Math.min(1, Math.max(0, recallWhenShown));
  return Math.round(10 * (1 - r));
}
```

- [ ] **Step 5: Write the levels**

Create `src/engine/level.ts`:

```ts
/** Levels (spec 3.3): they show only as the top bar's 2 px line and a number in Progress, and gate nothing. */

/** The total XP at which level `level` starts. */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

/** The level for a total XP; 1 at 0 XP. */
export function level(xp: number): number {
  return Math.floor((1 + Math.sqrt(1 + Math.max(0, xp) / 12.5)) / 2);
}

/** How far a total XP is from the start of its level to the next, in [0, 1). */
export function levelProgress(xp: number): number {
  const current = level(xp);
  const from = xpForLevel(current);
  return (Math.max(0, xp) - from) / (xpForLevel(current + 1) - from);
}
```

- [ ] **Step 6: Run the tests and the checks and see them pass**

```bash
pnpm test tests/unit/bets.test.ts tests/unit/xp.test.ts tests/unit/level.test.ts
pnpm typecheck
pnpm lint
```

Expected: `Test Files  3 passed (3)` and `Tests  11 passed (11)`; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`.

- [ ] **Step 7: Commit**

```bash
pnpm lint:fix
git add src/engine/bets.ts src/engine/xp.ts src/engine/level.ts tests/unit/bets.test.ts tests/unit/xp.test.ts tests/unit/level.test.ts
git commit -m "Add the bet payoffs, the XP table and levels" -m "The bet pays 10 or 0 for Sure and 8 or 5 for Not sure, crossing over at 5/7. The XP table follows spec 3.2 with the effort bonus, and levels follow spec 3.3."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 3: The memory replay

**Files:**
- Create: `src/engine/memory.ts`, `tests/unit/memory.test.ts`
- Modify: `schemas/events.ts`, `src/engine/replay.ts`, `tests/fixtures/events.ts`, `tests/fixtures/backups/v1.snapshot.json` (regenerated, never hand-edited), `tests/unit/events-schema.test.ts`, `tests/unit/replay.test.ts`, `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`
- Test: `tests/unit/memory.test.ts`, `tests/unit/events-schema.test.ts`, `tests/unit/replay.test.ts`, `tests/unit/backups.test.ts`

Design notes (the rules of "Counted answers" in the brief, as built):
- `deriveMemory(events, content)` replays a copy of the log sorted by id; the exam date is the last `settings` event whose patch has `examDate`, applied to the whole replay.
- When an event's `day` differs from the previous event's, the previous day is closed and the new one opened; opening counts the tested concepts due at that event and, above `CATCH_UP_OVER`, stores the `CATCH_UP_PLAN` lowest-R ids (ties by id) in `catchUpPlans`.
- A counted answer is one in `COUNTING_MODES` whose concept resolves (through aliases) to a tested concept.
- The first non-relearn answer of the day to a concept is its candidate: with no card, or with a card due at its session's start (`isDue` at the `session start` event's time and offset, or the answer's own when the session has no start), it earns bet XP, plus the effort bonus at R when the question showed (`at - ms`) for a right answer on an existing card, and makes the day's FSRS update; otherwise it earns bet XP only for a never-answered question id and makes no update.
- A later answer that day earns 0, and the first later wrong one applies one extra Again only when the day's update was Hard or Good.
- A relearn answer earns 0 XP and makes no update, but it still updates the misconception mark.
- An answer whose `qv` is below the shipped version keeps its XP, makes no update, and counts in `staleAnswers`.
- Every new due goes through `capDue` with the answer's day and offset.
- A day qualifies when it holds a first `lesson.done` of a note, or a non-relearn counted answer and, at its close, no tested card is due before the next 04:00 (in the offset of the day's last event) or every concept of its catch-up plan was answered that day.
- Spec 2.4 removes a split concept's old id from the registry, so `resolveConcept` returns null for it; `deriveMemory` still keeps memory under an old id that some concept names in `splitFrom`, so the new concepts have a card to copy, both when first met and, after the last event, for those never answered.
  Old ids are not tested concepts of the content, so they never count toward due sets, qualifying days or catch-up plans.
- `ENGINE_VERSION` becomes 2 and `AnswerRecord` gains `id`, `concept` and `relearn`, so `tests/fixtures/backups/v1.snapshot.json` is regenerated in the same commit (spec 9), by deleting it and rerunning its test helper.

- [ ] **Step 1: Add `timelineOf` to the event fixtures**

Replace `tests/fixtures/events.ts` with:

```ts
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { studyDayAt } from '../../src/engine/day.ts';
import { monotonicUlid } from '../../src/store/ulid.ts';

/** Two valid session ULIDs for tests. */
export const SID = '01JA00000000000000000000S1';
export const SID2 = '01JA00000000000000000000S2';

/** Stamps events with increasing ULIDs one minute apart, so id order is time order. */
export function eventsOf(...items: NewEvent[]): StudyEvent[] {
  return items.map((item, i) => {
    const at = new Date(Date.UTC(2026, 9, 10, 8, i));
    return {
      ...item,
      id: `01JA${String(i).padStart(22, '0')}`,
      at: at.toISOString(),
      tz: 0,
      day: '2026-10-10',
    } as StudyEvent;
  });
}

/**
 * Stamps a multi-day log: each item is a UTC ISO time and an event, written in offset `tz`.
 * Ids are real ULIDs of those times with a zero random part, so they sort by time and repeat across runs,
 * and each event's `day` is its study day in that offset, as the store stamps it.
 */
export function timelineOf(items: readonly (readonly [string, NewEvent])[], tz = 0): StudyEvent[] {
  const next = monotonicUlid();
  const zero = (bytes: Uint8Array): Uint8Array => bytes.fill(0);
  return items.map(([iso, item]) => {
    const at = new Date(iso);
    return {
      ...item,
      id: next(at.getTime(), zero),
      at: at.toISOString(),
      tz,
      day: studyDayAt(at, tz),
    } as StudyEvent;
  });
}
```

- [ ] **Step 2: Write the failing schema and replay tests**

In `tests/unit/events-schema.test.ts`, insert this case right before `it('rejects a time with an offset instead of Z, and an unknown mode', () => {`:

```ts
  it('accepts the relearn flag on an answer and rejects a flag that is not a boolean', () => {
    expect(StudyEvent.safeParse({ ...base, ...VARIANTS.answer, relearn: true }).success).toBe(true);
    expect(StudyEvent.safeParse({ ...base, ...VARIANTS.answer, relearn: false }).success).toBe(true);
    expect(StudyEvent.safeParse({ ...base, ...VARIANTS.answer, relearn: 'yes' }).success).toBe(false);
  });
```

In `tests/unit/replay.test.ts`, replace the case `it('has engine version 1', ...)` with:

```ts
  it('has engine version 2', () => {
    expect(ENGINE_VERSION).toBe(2);
  });

  it('records the event id, the concept and the relearn flag of each answer', () => {
    const events = eventsOf(answer('q1', false, SID, 'shared-kitchen'), {
      ...answer('q2', true, SID, 'shared-kitchen'),
      relearn: true,
    } as NewEvent);
    const p = derive(events, null);
    expect(p.answers.get('q1')?.[0]).toMatchObject({
      id: events[0]?.id,
      concept: 'shared-kitchen',
      relearn: false,
    });
    expect(p.answers.get('q2')?.[0]).toMatchObject({
      id: events[1]?.id,
      concept: 'shared-kitchen',
      relearn: true,
    });
  });
```

- [ ] **Step 3: Write the failing memory tests**

Create `tests/unit/memory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Mode, NewEvent, StudyEvent } from '../../schemas/events.ts';
import { addDays, dayStartAt, studyDayAt } from '../../src/engine/day.ts';
import {
  CATCH_UP_OVER,
  CATCH_UP_PLAN,
  COUNTING_MODES,
  type ConceptInfo,
  deriveMemory,
  isDue,
  type MemoryContent,
  resolveConcept,
  sessionSummary,
} from '../../src/engine/memory.ts';
import { derive } from '../../src/engine/replay.ts';
import { fnv1a } from '../../src/engine/rng.ts';
import { recall, review, type SrsCard } from '../../src/engine/srs.ts';
import { effortBonus } from '../../src/engine/xp.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';

const SID3 = '01JA00000000000000000000S3';

const info = (module: number, tested = true, splitFrom: string | null = null): ConceptInfo => ({
  module,
  tested,
  confusableWith: [],
  splitFrom,
});

/** Made-up bakery content: 4 concepts in 2 modules, one untested, and one alias. */
const CONTENT: MemoryContent = {
  concepts: new Map([
    ['proof-box', info(1)],
    ['oven-rental', info(1)],
    ['flour-delivery', info(2)],
    ['display-case', info(2, false)],
  ]),
  aliases: new Map([['proofing-cabinet', 'proof-box']]),
  questionVersions: new Map([
    ['q-pb1', 1],
    ['q-pb2', 1],
    ['q-pb3', 1],
    ['q-or1', 1],
    ['q-or2', 2],
    ['q-fd1', 1],
    ['q-fd2', 1],
    ['q-dc1', 1],
  ]),
};

interface AnswerOptions {
  sid?: string;
  mode?: Mode;
  relearn?: boolean;
  qv?: number;
  ms?: number;
}

const answer = (
  qid: string,
  concept: string,
  correct: boolean,
  sure: boolean,
  options: AnswerOptions = {},
): NewEvent => ({
  t: 'answer',
  sid: options.sid ?? SID,
  mode: options.mode ?? 'check',
  qid,
  qv: options.qv ?? 1,
  concept,
  picked: ['a'],
  correct,
  sure,
  ms: options.ms ?? 4000,
  ...(options.relearn === undefined ? {} : { relearn: options.relearn }),
});

const start = (sid: string, mode: Mode = 'check'): NewEvent => ({
  t: 'session',
  sid,
  mode,
  phase: 'start',
  seed: 1,
  scope: 'test',
  qids: [],
});

const idOf = (events: readonly StudyEvent[], i: number): string => events[i]?.id ?? '';
const must = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) throw new Error('expected a value');
  return value;
};
const cardOf = (events: readonly StudyEvent[], concept = 'proof-box', content = CONTENT) =>
  deriveMemory(events, content).concepts.get(concept)?.card ?? null;

describe('resolveConcept and isDue', () => {
  it('resolves an alias, and returns null for untested and unknown concepts', () => {
    expect(resolveConcept(CONTENT, 'proof-box')).toBe('proof-box');
    expect(resolveConcept(CONTENT, 'proofing-cabinet')).toBe('proof-box');
    expect(resolveConcept(CONTENT, 'display-case')).toBeNull();
    expect(resolveConcept(CONTENT, 'mystery')).toBeNull();
  });

  it('counts a card as due until the 04:00 that ends its study day', () => {
    const card = review(null, 'good', new Date('2026-10-09T10:00:00Z'));
    expect(isDue(card, new Date('2026-10-12T03:59:00Z'), 0)).toBe(false);
    expect(isDue(card, new Date('2026-10-12T04:00:00Z'), 0)).toBe(true);
    expect(isDue(card, new Date('2026-10-11T23:00:00Z'), 360)).toBe(true);
  });

  it('counts the modes of spec 3.1 and no others', () => {
    expect([...COUNTING_MODES].sort()).toEqual(['check', 'focus', 'incident', 'quiz', 'review']);
    expect(CATCH_UP_OVER).toBe(100);
    expect(CATCH_UP_PLAN).toBe(60);
  });
});

describe('deriveMemory: counted answers and the bet', () => {
  it('pays 10 for a first Sure right answer and starts a card due 3 days later', () => {
    const events = timelineOf([
      ['2026-10-09T09:59:00Z', start(SID)],
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(10);
    expect(m.xpByEvent.get(idOf(events, 1))).toBe(10);
    expect(m.xpByDay.get('2026-10-09')).toBe(10);
    const cm = m.concepts.get('proof-box');
    expect(cm?.card?.due).toBe('2026-10-12T10:00:00.000Z');
    expect(cm?.enteredOn).toBe('2026-10-09');
    expect(cm?.fsrsRating).toBe('good');
    expect(cm?.successDays).toEqual(['2026-10-09']);
    expect(m.newByDay.get('2026-10-09')).toBe(1);
    expect(m.answered.has('q-pb1')).toBe(true);
  });

  it('pays 8 and rates Hard for Not sure right, and pays 5 with a due the next day for Not sure wrong', () => {
    const at = '2026-10-09T10:00:00Z';
    const right = deriveMemory(timelineOf([[at, answer('q-pb1', 'proof-box', true, false)]]), CONTENT);
    expect(right.xp).toBe(8);
    expect(right.concepts.get('proof-box')?.card).toEqual(review(null, 'hard', new Date(at)));
    const wrong = deriveMemory(timelineOf([[at, answer('q-pb1', 'proof-box', false, false)]]), CONTENT);
    expect(wrong.xp).toBe(5);
    expect(wrong.concepts.get('proof-box')?.card?.due).toBe('2026-10-10T10:00:00.000Z');
    expect(wrong.concepts.get('proof-box')?.successDays).toEqual([]);
  });

  it('pays 0 for a second answer the same day and leaves the card as it was', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', true, true)],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(10);
    expect(m.xpByEvent.has(idOf(events, 1))).toBe(false);
    expect(cardOf(events)).toEqual(cardOf(events.slice(0, 1)));
  });

  it('applies one extra Again for a later wrong answer after a Good, and only one', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', false, false)],
      ['2026-10-09T10:10:00Z', answer('q-pb3', 'proof-box', false, true)],
    ]);
    const good = must(cardOf(events.slice(0, 1)));
    const extra = cardOf(events.slice(0, 2));
    expect(extra).not.toEqual(good);
    expect(extra).toEqual(review(good, 'again', new Date('2026-10-09T10:05:00Z')));
    expect(cardOf(events)).toEqual(extra);
    expect(deriveMemory(events, CONTENT).xp).toBe(10);
  });

  it('applies no extra Again after a first answer of the day that was already Again', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', false, false)],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', false, false)],
    ]);
    expect(cardOf(events)).toEqual(cardOf(events.slice(0, 1)));
  });

  it('pays the bet plus an effort bonus of 1 on the due day', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-12T09:59:00Z', start(SID2, 'review')],
      ['2026-10-12T10:00:00Z', answer('q-pb2', 'proof-box', true, true, { sid: SID2, mode: 'review' })],
    ]);
    const first = must(cardOf(events.slice(0, 1)));
    const m = deriveMemory(events, CONTENT);
    expect(effortBonus(recall(first, new Date('2026-10-12T09:59:56Z')))).toBe(1);
    expect(m.xpByEvent.get(idOf(events, 2))).toBe(11);
    expect(m.xp).toBe(21);
    expect(m.concepts.get('proof-box')?.card).not.toEqual(first);
    expect(m.concepts.get('proof-box')?.successDays).toEqual(['2026-10-09', '2026-10-12']);
  });

  it('pays an early answer only for a never-answered question and leaves the card alone', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-10T10:00:00Z', answer('q-pb2', 'proof-box', true, true)],
      ['2026-10-11T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xpByEvent.get(idOf(events, 1))).toBe(10);
    expect(m.xpByEvent.has(idOf(events, 2))).toBe(false);
    expect(m.xp).toBe(20);
    expect(cardOf(events)).toEqual(cardOf(events.slice(0, 1)));
  });

  it("judges due at the session's start, so a session begun before 04:00 stays early", () => {
    const first: [string, NewEvent] = ['2026-10-09T00:30:00Z', answer('q-pb1', 'proof-box', true, true)];
    const before = cardOf(timelineOf([first]));
    expect(before?.due).toBe('2026-10-12T00:30:00.000Z');
    const early = timelineOf([
      first,
      ['2026-10-11T03:30:00Z', start(SID2, 'review')],
      ['2026-10-11T04:10:00Z', answer('q-pb2', 'proof-box', true, true, { sid: SID2, mode: 'review' })],
    ]);
    expect(early[2]?.day).toBe('2026-10-11');
    expect(cardOf(early)).toEqual(before);
    expect(deriveMemory(early, CONTENT).xpByEvent.get(idOf(early, 2))).toBe(10);
    const due = timelineOf([
      first,
      ['2026-10-11T04:05:00Z', start(SID2, 'review')],
      ['2026-10-11T04:10:00Z', answer('q-pb2', 'proof-box', true, true, { sid: SID2, mode: 'review' })],
    ]);
    expect(cardOf(due)).not.toEqual(before);
    expect(deriveMemory(due, CONTENT).xpByEvent.get(idOf(due, 2))).toBe(11);
  });
});

describe('deriveMemory: misconceptions and relearn answers', () => {
  it('marks a wrong Sure answer and clears it only with a right Sure on another question a day later', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', false, true)],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', true, true)],
      ['2026-10-10T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-11T10:00:00Z', answer('q-pb3', 'proof-box', true, true)],
    ]);
    const markAfter = (n: number) =>
      deriveMemory(events.slice(0, n), CONTENT).concepts.get('proof-box')?.misconception;
    const mark = { qid: 'q-pb1', day: '2026-10-09' };
    expect(markAfter(1)).toEqual(mark);
    expect(markAfter(2)).toEqual(mark);
    expect(markAfter(3)).toEqual(mark);
    expect(markAfter(4)).toBeNull();
    expect(deriveMemory(events.slice(0, 1), CONTENT).xp).toBe(0);
  });

  it('gives a relearn answer 0 XP and no update, while a wrong Sure relearn still marks', () => {
    const events = timelineOf([
      ['2026-10-09T09:59:00Z', start(SID, 'review')],
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, false, { mode: 'review' })],
      ['2026-10-09T10:05:00Z', answer('q-pb2', 'proof-box', false, true, { mode: 'review', relearn: true })],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(8);
    expect(m.xpByEvent.has(idOf(events, 2))).toBe(false);
    expect(cardOf(events)).toEqual(cardOf(events.slice(0, 2)));
    expect(m.concepts.get('proof-box')?.misconception).toEqual({ qid: 'q-pb2', day: '2026-10-09' });
  });
});

describe('deriveMemory: the exam cap', () => {
  const chain: [string, NewEvent][] = [
    ['2026-10-16T10:00:00Z', answer('q-fd1', 'flour-delivery', true, true)],
    ['2026-10-19T10:00:00Z', answer('q-fd2', 'flour-delivery', true, true)],
    ['2026-11-02T10:00:00Z', answer('q-fd1', 'flour-delivery', true, true)],
  ];
  const setExam = (examDate: string | null): NewEvent => ({ t: 'settings', patch: { examDate } });
  const spread = fnv1a('flour-delivery') % 7;

  it('moves a due after the eve of the exam into the last week', () => {
    const events = timelineOf([['2026-10-09T08:00:00Z', setExam('2026-11-14')], ...chain]);
    const m = deriveMemory(events, CONTENT);
    expect(m.examDate).toBe('2026-11-14');
    const due = m.concepts.get('flour-delivery')?.card?.due ?? '';
    expect(due).toBe(dayStartAt(addDays('2026-11-13', -spread), 0).toISOString());
    const day = studyDayAt(new Date(due), 0);
    expect(day >= '2026-11-07' && day <= '2026-11-13').toBe(true);
  });

  it('recomputes every capped due from the latest exam date', () => {
    const moved = timelineOf([
      ['2026-10-09T08:00:00Z', setExam('2026-11-14')],
      ...chain,
      ['2026-11-03T08:00:00Z', setExam('2026-11-28')],
    ]);
    expect(cardOf(moved, 'flour-delivery')?.due).toBe(
      dayStartAt(addDays('2026-11-27', -spread), 0).toISOString(),
    );
    const cleared = timelineOf([
      ['2026-10-09T08:00:00Z', setExam('2026-11-14')],
      ...chain,
      ['2026-11-03T08:00:00Z', setExam(null)],
    ]);
    const natural = chain.reduce<SrsCard | null>((card, [at]) => review(card, 'good', new Date(at)), null);
    expect(cardOf(cleared, 'flour-delivery')).toEqual(natural);
    expect(natural?.due).toBe('2026-12-29T10:00:00.000Z');
  });
});

describe('deriveMemory: lessons, aliases, unknown ids and stale versions', () => {
  it('pays 10 XP once per lesson note and makes its day qualify', () => {
    const done = (note: string): NewEvent => ({ t: 'lesson.done', note });
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', done('m01/proofing-at-scale')],
      ['2026-10-09T11:00:00Z', done('m01/renting-ovens')],
      ['2026-10-10T10:00:00Z', done('m01/proofing-at-scale')],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(20);
    expect(m.xpByEvent.has(idOf(events, 2))).toBe(false);
    expect([...m.qualifyingDays]).toEqual(['2026-10-09']);
  });

  it('updates the surviving concept for an alias and skips untested and unknown concepts', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proofing-cabinet', true, true)],
      ['2026-10-09T10:01:00Z', answer('q-dc1', 'display-case', true, true)],
      ['2026-10-09T10:02:00Z', answer('q-zz9', 'mystery', true, true)],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.concepts.get('proof-box')?.card).not.toBeNull();
    expect(m.concepts.has('proofing-cabinet')).toBe(false);
    expect(m.concepts.has('display-case')).toBe(false);
    expect(m.concepts.has('mystery')).toBe(false);
    expect(m.xp).toBe(10);
    expect([...m.answered].sort()).toEqual(['q-dc1', 'q-pb1', 'q-zz9']);
  });

  it('keeps the XP of an answer to an older question version but leaves it out of FSRS', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-or2', 'oven-rental', true, true, { qv: 1 })],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(10);
    expect(m.concepts.get('oven-rental')?.card ?? null).toBeNull();
    expect(m.staleAnswers).toBe(1);
    expect(m.newByDay.size).toBe(0);
  });

  it('never throws on answers outside the counting modes, and still records their questions', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true, { mode: 'lightning' })],
    ]);
    const m = deriveMemory(events, CONTENT);
    expect(m.xp).toBe(0);
    expect(m.concepts.size).toBe(0);
    expect(m.answered.has('q-pb1')).toBe(true);
  });
});

describe('deriveMemory: qualifying days and catch-up', () => {
  it('qualifies a day whose only due concept is answered', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-12T10:00:00Z', answer('q-pb2', 'proof-box', true, true)],
    ]);
    expect([...deriveMemory(events, CONTENT).qualifyingDays]).toEqual(['2026-10-09', '2026-10-12']);
  });

  it('does not qualify a day that leaves a due concept unanswered, or a day of lightning only', () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-09T10:01:00Z', answer('q-or1', 'oven-rental', true, true)],
      ['2026-10-10T10:00:00Z', answer('q-pb2', 'proof-box', true, true, { mode: 'lightning' })],
      ['2026-10-12T10:00:00Z', answer('q-pb2', 'proof-box', true, true)],
    ]);
    expect([...deriveMemory(events, CONTENT).qualifyingDays]).toEqual(['2026-10-09']);
  });

  it('plans the 60 lowest-R concepts when more than 100 are due, and qualifies the day once all 60 are answered', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `c-${String(i).padStart(3, '0')}`);
    const big: MemoryContent = {
      concepts: new Map(ids.map((id) => [id, info(1)])),
      aliases: new Map(),
      questionVersions: new Map(),
    };
    const firstDay = ids.map((id, i): [string, NewEvent] => [
      new Date(Date.UTC(2026, 9, 9, 8, 0, i)).toISOString(),
      answer(`q-${id}`, id, true, true),
    ]);
    const planDay = ids
      .slice(0, CATCH_UP_PLAN)
      .map((id, i): [string, NewEvent] => [
        new Date(Date.UTC(2026, 9, 12, 12, 1, i)).toISOString(),
        answer(`q-${id}-b`, id, true, true, { sid: SID2, mode: 'review' }),
      ]);
    const events = timelineOf([...firstDay, ['2026-10-12T12:00:00Z', start(SID2, 'review')], ...planDay]);
    const m = deriveMemory(events, big);
    expect(m.catchUpPlans.get('2026-10-12')).toEqual(ids.slice(0, CATCH_UP_PLAN));
    expect(m.qualifyingDays.has('2026-10-12')).toBe(true);
    const evening = new Date('2026-10-12T23:00:00Z');
    const stillDue = [...m.concepts.values()].filter((cm) => cm.card && isDue(cm.card, evening, 0));
    expect(stillDue).toHaveLength(41);
    const short = deriveMemory(events.slice(0, -1), big);
    expect(short.qualifyingDays.has('2026-10-12')).toBe(false);
  });
});

describe('deriveMemory: split concepts', () => {
  const SPLIT: MemoryContent = {
    concepts: new Map([
      ['rye-starter', info(1, true, 'old-starter')],
      ['wheat-starter', info(1, true, 'old-starter')],
    ]),
    aliases: new Map(),
    questionVersions: new Map(),
  };

  it("starts each new concept from the old concept's card", () => {
    const events = timelineOf([
      ['2026-10-09T10:00:00Z', answer('q-os1', 'old-starter', true, true)],
      ['2026-10-10T10:00:00Z', answer('q-rs1', 'rye-starter', true, true)],
    ]);
    const m = deriveMemory(events, SPLIT);
    const old = m.concepts.get('old-starter')?.card;
    expect(old?.due).toBe('2026-10-12T10:00:00.000Z');
    expect(m.concepts.get('rye-starter')?.card).toEqual(old);
    expect(m.concepts.get('rye-starter')?.enteredOn).toBe('2026-10-09');
    expect(m.concepts.get('wheat-starter')?.card).toEqual(old);
    expect(m.xpByEvent.get(idOf(events, 1))).toBe(10);
  });
});

describe('sessionSummary', () => {
  it('sums a 3-question review with 2 right and 1 wrong', () => {
    const events = timelineOf([
      ['2026-10-09T09:59:00Z', start(SID)],
      ['2026-10-09T10:00:00Z', answer('q-pb1', 'proof-box', true, true)],
      ['2026-10-09T10:01:00Z', answer('q-or1', 'oven-rental', true, true)],
      ['2026-10-09T10:02:00Z', answer('q-fd1', 'flour-delivery', true, true)],
      [
        '2026-10-12T10:09:00Z',
        {
          t: 'session',
          sid: SID3,
          mode: 'review',
          phase: 'start',
          seed: 2,
          scope: 'review',
          qids: ['q-pb2', 'q-or2', 'q-fd2'],
        },
      ],
      ['2026-10-12T10:10:00Z', answer('q-pb2', 'proof-box', true, true, { sid: SID3, mode: 'review' })],
      [
        '2026-10-12T10:11:00Z',
        answer('q-or2', 'oven-rental', true, true, { sid: SID3, mode: 'review', qv: 2 }),
      ],
      [
        '2026-10-12T10:12:00Z',
        answer('q-fd2', 'flour-delivery', false, false, { sid: SID3, mode: 'review' }),
      ],
    ]);
    const memory = deriveMemory(events, CONTENT);
    const session = must(derive(events, null).sessions.get(SID3));
    const summary = sessionSummary(session, memory, CONTENT, new Date('2026-10-12T10:13:00Z'), 0);
    const reviewXp = [5, 6, 7].reduce((sum, i) => sum + (memory.xpByEvent.get(idOf(events, i)) ?? 0), 0);
    expect(summary).toEqual({ correct: 2, total: 3, xp: reviewXp, backTomorrow: 1 });
    expect(reviewXp).toBe(27);
  });
});
```

- [ ] **Step 4: Run the tests and see them fail**

```bash
pnpm test tests/unit/memory.test.ts tests/unit/events-schema.test.ts tests/unit/replay.test.ts
```

Expected: FAIL; `memory.test.ts` fails with `Cannot find module '../../src/engine/memory.ts'`, and `Tests  3 failed` covers `accepts the relearn flag ...`, `has engine version 2` and `records the event id, the concept and the relearn flag of each answer`.

- [ ] **Step 5: Add the relearn flag to the answer event**

In `schemas/events.ts`, the `Answer` object ends with:

```ts
  ms: z.number().check(z.minimum(0)),
  /** A relearn step in a review (spec 3.6): 0 XP and no FSRS update. */
  relearn: z.optional(z.boolean()),
});
```

`SCHEMA_VERSION` stays 1, because an optional field leaves every stored event and backup valid.

- [ ] **Step 6: Bump the engine and widen `AnswerRecord`**

In `src/engine/replay.ts`, make these four edits.

Replace the header comment and the constant with:

```ts
/**
 * The pure replay (spec 8): every bit of progress is derived from the event log, never stored.
 * Changing what `derive` or `deriveMemory` computes from the same events bumps `ENGINE_VERSION`.
 * Version 2 adds XP and FSRS (`src/engine/memory.ts`) and the answer's id, concept and relearn flag.
 */
export const ENGINE_VERSION = 2;
```

Replace `AnswerRecord` with:

```ts
export interface AnswerRecord {
  /** The answer event's id, which keys its XP in `MemoryState.xpByEvent`. */
  id: string;
  qid: string;
  qv: number;
  sid: string;
  mode: Mode;
  at: string;
  day: string;
  correct: boolean;
  sure: boolean;
  picked: AnswerEvent['picked'];
  /** The concept id as written, before any alias is resolved. */
  concept: string;
  relearn: boolean;
}
```

Replace `recordOf` with:

```ts
function recordOf(e: AnswerEvent): AnswerRecord {
  return {
    id: e.id,
    qid: e.qid,
    qv: e.qv,
    sid: e.sid,
    mode: e.mode,
    at: e.at,
    day: e.day,
    correct: e.correct,
    sure: e.sure,
    picked: e.picked,
    concept: e.concept,
    relearn: e.relearn === true,
  };
}
```

Replace the private `plain` and `snapshotOf` with the exported `toPlain`, which Task 8's journeys use for their snapshots:

```ts
/** Plain JSON of any derived state: maps become sorted entry arrays, sets sorted arrays, keys sorted. */
export function toPlain(value: unknown): unknown {
  if (value instanceof Map) {
    return [...value.entries()]
      .sort(([a], [b]) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0))
      .map(([key, inner]) => [key, toPlain(inner)]);
  }
  if (value instanceof Set) return [...value].sort().map(toPlain);
  if (Array.isArray(value)) return value.map(toPlain);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = toPlain((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

/** Plain JSON of a progress state, with maps as sorted entry arrays, for golden snapshot files. */
export function snapshotOf(p: Progress): unknown {
  return toPlain(p);
}
```

- [ ] **Step 7: Write the memory replay**

Create `src/engine/memory.ts`:

```ts
import type { Mode, StudyEvent } from '../../schemas/events.ts';
import { betXp } from './bets.ts';
import { addDays, dayStartAt, nextDayStart, studyDayAt } from './day.ts';
import type { SessionState } from './replay.ts';
import { capDue, rate, recall, review, type SrsCard, type SrsRating } from './srs.ts';
import { effortBonus, XP } from './xp.ts';

/**
 * The memory replay (spec 3.1, 3.2, 3.5 and 3.6): one FSRS card per tested concept, XP, misconceptions
 * and qualifying days, all derived from the event log and the shipped content, never stored.
 * It sits beside `derive` because it needs the content, while `derive` must work without it.
 */

/** The modes whose answers count toward memory (spec 3.1); lightning, bosses and mocks do not, yet. */
export const COUNTING_MODES: ReadonlySet<Mode> = new Set<Mode>([
  'check',
  'quiz',
  'focus',
  'review',
  'incident',
]);

/** Catch-up (spec 3.7): above this many due concepts, a day's plan is the lowest-R `CATCH_UP_PLAN`. */
export const CATCH_UP_OVER = 100;
export const CATCH_UP_PLAN = 60;

export interface ConceptInfo {
  module: number;
  tested: boolean;
  confusableWith: readonly string[];
  splitFrom: string | null;
}

/** What the replay needs from the content index; `aliases` maps an alias to its surviving concept id. */
export interface MemoryContent {
  concepts: ReadonlyMap<string, ConceptInfo>;
  aliases: ReadonlyMap<string, string>;
  questionVersions: ReadonlyMap<string, number>;
}

export interface Misconception {
  qid: string;
  day: string;
}

export interface ConceptMemory {
  card: SrsCard | null;
  /** The study day of the concept's first FSRS update. */
  enteredOn: string | null;
  /** The study day of its latest non-relearn counted answer. */
  lastAnswerDay: string | null;
  /** The study day and rating of its latest day's FSRS update. */
  fsrsDay: string | null;
  fsrsRating: SrsRating | null;
  /** The study day an extra Again was applied, so a day applies at most one. */
  extraAgainDay: string | null;
  /** Study days with a right counted answer, oldest first. */
  successDays: readonly string[];
  misconception: Misconception | null;
}

export interface MemoryState {
  concepts: ReadonlyMap<string, ConceptMemory>;
  xp: number;
  /** Answer and lesson events that earned XP, by event id; events that earned 0 are absent. */
  xpByEvent: ReadonlyMap<string, number>;
  xpByDay: ReadonlyMap<string, number>;
  /** Every question id answered in any mode. */
  answered: ReadonlySet<string>;
  qualifyingDays: ReadonlySet<string>;
  /** Concepts that entered FSRS, by study day. */
  newByDay: ReadonlyMap<string, number>;
  /** The catch-up plan of each study day that opened with more than `CATCH_UP_OVER` due concepts. */
  catchUpPlans: ReadonlyMap<string, readonly string[]>;
  examDate: string | null;
  /** Counted answers to an older question version, kept for XP and left out of FSRS (spec 8.4). */
  staleAnswers: number;
}

interface MutableConcept extends ConceptMemory {
  successDays: string[];
}

type AnswerEvent = Extract<StudyEvent, { t: 'answer' }>;

const byId = (a: StudyEvent, b: StudyEvent): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const freshConcept = (): MutableConcept => ({
  card: null,
  enteredOn: null,
  lastAnswerDay: null,
  fsrsDay: null,
  fsrsRating: null,
  extraAgainDay: null,
  successDays: [],
  misconception: null,
});

/** The concept an id stands for: itself or its alias target, when that concept exists and is tested. */
export function resolveConcept(content: MemoryContent, id: string): string | null {
  const target = content.concepts.has(id) ? id : (content.aliases.get(id) ?? id);
  return content.concepts.get(target)?.tested === true ? target : null;
}

/** A card is due when its due time falls before the 04:00 that ends the study day of `at`. */
export function isDue(card: SrsCard, at: Date, tz: number): boolean {
  return Date.parse(card.due) < nextDayStart(at, tz).getTime();
}

/** The exam date of the last `settings` event that sets one (or clears it); replay uses it throughout. */
function examDateOf(sorted: readonly StudyEvent[]): string | null {
  let examDate: string | null = null;
  for (const e of sorted) {
    if (e.t === 'settings' && 'examDate' in e.patch) examDate = e.patch.examDate ?? null;
  }
  return examDate;
}

/** The ids with the lowest recall at `at`, ties by id. */
function lowestRecall(cards: readonly (readonly [string, SrsCard])[], at: Date, count: number): string[] {
  return cards
    .map(([id, card]) => ({ id, r: recall(card, at) }))
    .sort((a, b) => a.r - b.r || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, count)
    .map((x) => x.id);
}

/** Replays the log in id order into memory state; unknown ids are skipped, never thrown on (spec 8.4). */
export function deriveMemory(events: readonly StudyEvent[], content: MemoryContent): MemoryState {
  const sorted = [...events].sort(byId);
  const examDate = examDateOf(sorted);
  const splitSources = new Set<string>();
  for (const info of content.concepts.values()) if (info.splitFrom !== null) splitSources.add(info.splitFrom);

  const concepts = new Map<string, MutableConcept>();
  const xpByEvent = new Map<string, number>();
  const xpByDay = new Map<string, number>();
  const answered = new Set<string>();
  const qualifyingDays = new Set<string>();
  const newByDay = new Map<string, number>();
  const catchUpPlans = new Map<string, readonly string[]>();
  const starts = new Map<string, { at: string; tz: number }>();
  const lessons = new Set<string>();
  let xp = 0;
  let staleAnswers = 0;

  let day: string | null = null;
  let dayTz = 0;
  let completion = false;
  let countedAnswer = false;

  /** A memory key: a tested concept, or the old id of a split, whose card the new concepts copy. */
  const keyOf = (id: string): string | null => {
    const resolved = resolveConcept(content, id);
    if (resolved !== null) return resolved;
    return splitSources.has(id) && !content.concepts.has(id) ? id : null;
  };

  const testedCards = (): [string, SrsCard][] => {
    const out: [string, SrsCard][] = [];
    for (const [id, cm] of concepts) {
      if (cm.card !== null && content.concepts.get(id)?.tested === true) out.push([id, cm.card]);
    }
    return out;
  };

  const earn = (e: StudyEvent, amount: number) => {
    if (amount <= 0) return;
    xp += amount;
    xpByEvent.set(e.id, amount);
    xpByDay.set(e.day, (xpByDay.get(e.day) ?? 0) + amount);
  };

  const openDay = (e: StudyEvent) => {
    if (catchUpPlans.has(e.day)) return;
    const at = new Date(e.at);
    const due = testedCards().filter(([, card]) => isDue(card, at, e.tz));
    if (due.length > CATCH_UP_OVER) catchUpPlans.set(e.day, lowestRecall(due, at, CATCH_UP_PLAN));
  };

  const closeDay = () => {
    if (day === null) return;
    if (completion) {
      qualifyingDays.add(day);
      return;
    }
    if (!countedAnswer) return;
    const end = dayStartAt(addDays(day, 1), dayTz).getTime();
    const clear = testedCards().every(([, card]) => Date.parse(card.due) >= end);
    const today = day;
    const plan = catchUpPlans.get(today);
    const planDone = plan?.every((id) => concepts.get(id)?.lastAnswerDay === today) === true;
    if (clear || planDone) qualifyingDays.add(today);
  };

  const update = (cm: MutableConcept, key: string, rating: SrsRating, e: AnswerEvent) => {
    const next = review(cm.card, rating, new Date(e.at));
    const due = capDue(new Date(next.due), { concept: key, reviewDay: e.day, examDate, tz: e.tz });
    cm.card = { ...next, due: due.toISOString() };
  };

  const firstOfDay = (cm: MutableConcept, key: string, e: AnswerEvent, stale: boolean, isNew: boolean) => {
    const card = cm.card;
    const start = starts.get(e.sid) ?? { at: e.at, tz: e.tz };
    const dueAtStart = card === null || isDue(card, new Date(start.at), start.tz);
    if (dueAtStart) {
      const shown = new Date(Date.parse(e.at) - e.ms);
      const bonus = card !== null && e.correct ? effortBonus(recall(card, shown)) : 0;
      earn(e, betXp(e.correct, e.sure) + bonus);
      if (!stale) {
        const rating = rate(e.correct, e.sure);
        update(cm, key, rating, e);
        cm.fsrsDay = e.day;
        cm.fsrsRating = rating;
        if (card === null) {
          cm.enteredOn = e.day;
          newByDay.set(e.day, (newByDay.get(e.day) ?? 0) + 1);
        }
      }
    } else if (isNew) {
      earn(e, betXp(e.correct, e.sure));
    }
    if (e.correct && !cm.successDays.includes(e.day)) cm.successDays.push(e.day);
  };

  const laterAnswer = (cm: MutableConcept, key: string, e: AnswerEvent, stale: boolean) => {
    const extraAgain =
      !e.correct &&
      !stale &&
      cm.card !== null &&
      cm.fsrsDay === e.day &&
      cm.extraAgainDay !== e.day &&
      (cm.fsrsRating === 'hard' || cm.fsrsRating === 'good');
    if (!extraAgain) return;
    update(cm, key, 'again', e);
    cm.extraAgainDay = e.day;
  };

  const applyAnswer = (e: AnswerEvent) => {
    const key = keyOf(e.concept);
    const shipped = content.questionVersions.get(e.qid);
    const stale = shipped !== undefined && e.qv < shipped;
    const isNew = !answered.has(e.qid);
    if (!COUNTING_MODES.has(e.mode) || key === null) {
      answered.add(e.qid);
      return;
    }
    let cm = concepts.get(key);
    if (!cm) {
      cm = freshConcept();
      const from = content.concepts.get(key)?.splitFrom ?? null;
      const old = from === null ? undefined : concepts.get(from);
      if (old?.card) {
        cm.card = old.card;
        cm.enteredOn = old.enteredOn;
      }
      concepts.set(key, cm);
    }
    if (stale) staleAnswers++;
    if (e.relearn !== true) {
      countedAnswer = true;
      if (cm.lastAnswerDay !== e.day) firstOfDay(cm, key, e, stale, isNew);
      else laterAnswer(cm, key, e, stale);
      cm.lastAnswerDay = e.day;
    }
    const mark = cm.misconception;
    if (!e.correct && e.sure) cm.misconception = { qid: e.qid, day: e.day };
    else if (e.correct && e.sure && mark && mark.qid !== e.qid && e.day > mark.day) cm.misconception = null;
    answered.add(e.qid);
  };

  for (const e of sorted) {
    if (e.day !== day) {
      closeDay();
      day = e.day;
      completion = false;
      countedAnswer = false;
      openDay(e);
    }
    dayTz = e.tz;
    switch (e.t) {
      case 'session':
        if (e.phase === 'start') starts.set(e.sid, { at: e.at, tz: e.tz });
        break;
      case 'lesson.done':
        if (!lessons.has(e.note)) {
          lessons.add(e.note);
          earn(e, XP.lesson);
          completion = true;
        }
        break;
      case 'answer':
        applyAnswer(e);
        break;
      default:
        break;
    }
  }
  closeDay();

  for (const [id, info] of content.concepts) {
    if (info.splitFrom === null || concepts.has(id)) continue;
    const old = concepts.get(info.splitFrom);
    if (old?.card) concepts.set(id, { ...freshConcept(), card: old.card, enteredOn: old.enteredOn });
  }

  return {
    concepts,
    xp,
    xpByEvent,
    xpByDay,
    answered,
    qualifyingDays,
    newByDay,
    catchUpPlans,
    examDate,
    staleAnswers,
  };
}

export interface SessionSummary {
  correct: number;
  total: number;
  xp: number;
  /** Concepts of the session that fall due on the next study day. */
  backTomorrow: number;
}

/** The end line's numbers for one session, read at `now` in offset `tz`. */
export function sessionSummary(
  session: SessionState,
  memory: MemoryState,
  content: MemoryContent,
  now: Date,
  tz: number,
): SessionSummary {
  let correct = 0;
  let xp = 0;
  const touched = new Set<string>();
  for (const a of session.answers.values()) {
    if (a.correct && !a.relearn) correct++;
    xp += memory.xpByEvent.get(a.id) ?? 0;
    const key = resolveConcept(content, a.concept);
    if (key !== null) touched.add(key);
  }
  const from = nextDayStart(now, tz).getTime();
  const to = dayStartAt(addDays(studyDayAt(now, tz), 2), tz).getTime();
  let backTomorrow = 0;
  for (const id of touched) {
    const due = memory.concepts.get(id)?.card?.due;
    if (due === undefined) continue;
    const t = Date.parse(due);
    if (t >= from && t < to) backTomorrow++;
  }
  return { correct, total: session.qids.length, xp, backTomorrow };
}
```

- [ ] **Step 8: Run the tests and see them pass**

```bash
pnpm test tests/unit/memory.test.ts tests/unit/events-schema.test.ts tests/unit/replay.test.ts
```

Expected: `Test Files  3 passed (3)`, with `memory.test.ts` at `24 passed`.

- [ ] **Step 9: Regenerate the schema 1 backup snapshot**

```bash
pnpm test tests/unit/backups.test.ts
rm tests/fixtures/backups/v1.snapshot.json
pnpm test tests/unit/backups.test.ts
pnpm test tests/unit/backups.test.ts
git diff --stat tests/fixtures/backups/v1.snapshot.json
```

Expected: the first run fails on `v1.json parses, migrates and derives to its snapshot`, because each answer record now has `id`, `concept` and `relearn`; the next run writes the file and both later runs pass; `git diff --stat` prints `1 file changed, 12 insertions(+)`, and `git diff` shows only `"id"`, `"concept"` and `"relearn": false` lines added to the two answer records, under `answers` and under the session.

- [ ] **Step 10: Name the flag in the spec**

In `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md` section 8.1, the `answer` line of the `Event` type ends with `changes?: string[][]; ms: number; relearn?: boolean }`, and these two bullets follow the bullet `XP, levels, FSRS cards, badges and freeze use are never stored, because they are always derived.`:

````markdown
- A relearn answer in a review (3.6) carries `relearn: true`, so replay gives it 0 XP and no FSRS update.
- The flag is optional, so every older event and backup stays valid at schema version 1.
````

- [ ] **Step 11: Run every check**

```bash
pnpm typecheck
pnpm lint
pnpm test
```

Expected: `tsc --noEmit` prints nothing, Biome prints `No fixes applied.`, and every test file passes, including `tests/property/replay.property.test.ts` and `tests/property/backup.property.test.ts`, which compare `snapshotOf` on both sides.

- [ ] **Step 12: Commit**

```bash
pnpm lint:fix
git add schemas/events.ts src/engine/replay.ts src/engine/memory.ts tests/fixtures/events.ts tests/fixtures/backups/v1.snapshot.json tests/unit/memory.test.ts tests/unit/events-schema.test.ts tests/unit/replay.test.ts docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
git commit -m "Add the memory replay with counted answers and FSRS per concept" -m "deriveMemory replays the log into one FSRS card per tested concept, bet and lesson XP with the effort bonus, misconceptions, qualifying days and catch-up plans. The answer event gains an optional relearn flag, ENGINE_VERSION becomes 2 and the schema 1 backup snapshot is regenerated for the new answer fields."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 4: The streak with freezes

**Files:**
- Create: `src/engine/streak.ts`, `tests/unit/streak.test.ts`
- Test: `tests/unit/streak.test.ts`

Design notes:
- `streakOf` walks from the earliest qualifying day to `today` with `addDays`, so days are plain `YYYY-MM-DD` strings and a DST change or an offset change never splits two consecutive days.
- A qualifying day adds 1 and earns a freeze at each multiple of 7, up to 2 banked; a missed day before `today` spends a freeze while `current` is above 0, else resets `current` and keeps the banked freezes; `today` adds 1 only when it qualifies and is never a missed day; days after `today` are ignored.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/streak.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/engine/day.ts';
import { FREEZE_CAP, FREEZE_EVERY, streakOf } from '../../src/engine/streak.ts';

/** `count` consecutive study days starting at `from`. */
const run = (from: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => addDays(from, i));

describe('streakOf (spec 3.5)', () => {
  it('earns a freeze every 7 days and banks at most 2', () => {
    expect(FREEZE_EVERY).toBe(7);
    expect(FREEZE_CAP).toBe(2);
  });

  it('is all zeros without qualifying days', () => {
    expect(streakOf(new Set(), '2026-10-10')).toEqual({ current: 0, longest: 0, freezes: 0, frozenDays: [] });
  });

  it('keeps a streak ending yesterday while today is not done yet, and extends it once today qualifies', () => {
    const days = run('2026-10-07', 3);
    expect(streakOf(new Set(days), '2026-10-10')).toMatchObject({ current: 3, longest: 3 });
    expect(streakOf(new Set([...days, '2026-10-10']), '2026-10-10')).toMatchObject({
      current: 4,
      longest: 4,
    });
  });

  it('resets the current streak on a missed day without a freeze and keeps the longest', () => {
    const days = new Set([...run('2026-10-01', 3), '2026-10-05']);
    expect(streakOf(days, '2026-10-05')).toEqual({ current: 1, longest: 3, freezes: 0, frozenDays: [] });
  });

  it('spends a freeze on a missed eighth day, which neither breaks nor extends the streak', () => {
    const week = run('2026-10-01', 7);
    expect(streakOf(new Set(week), '2026-10-07')).toMatchObject({ current: 7, freezes: 1 });
    const frozen = streakOf(new Set(week), '2026-10-09');
    expect(frozen).toEqual({ current: 7, longest: 7, freezes: 0, frozenDays: ['2026-10-08'] });
    const resumed = streakOf(new Set([...week, '2026-10-09']), '2026-10-09');
    expect(resumed).toEqual({ current: 8, longest: 8, freezes: 0, frozenDays: ['2026-10-08'] });
  });

  it('ends 21 straight days with 2 freezes banked', () => {
    expect(streakOf(new Set(run('2026-10-01', 21)), '2026-10-21')).toEqual({
      current: 21,
      longest: 21,
      freezes: 2,
      frozenDays: [],
    });
  });

  it('breaks the streak on two missed days with one freeze', () => {
    const days = new Set([...run('2026-10-01', 7), '2026-10-10']);
    expect(streakOf(days, '2026-10-10')).toEqual({
      current: 1,
      longest: 7,
      freezes: 0,
      frozenDays: ['2026-10-08'],
    });
  });

  it('never counts today as missed and ignores days after today', () => {
    const days = new Set([...run('2026-10-01', 3), '2026-10-06']);
    expect(streakOf(days, '2026-10-04')).toMatchObject({ current: 3, longest: 3 });
  });

  it('counts the days around the DST change as three consecutive days', () => {
    const days = new Set(['2026-10-31', '2026-11-01', '2026-11-02']);
    expect(streakOf(days, '2026-11-02')).toMatchObject({ current: 3, longest: 3 });
  });

  it('treats days stamped in different offsets as plain strings', () => {
    expect(streakOf(new Set(['2026-10-10', '2026-10-11']), '2026-10-11')).toMatchObject({ current: 2 });
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/streak.test.ts
```

Expected: FAIL with `Cannot find module '../../src/engine/streak.ts'`.

- [ ] **Step 3: Write the streak**

Create `src/engine/streak.ts`:

```ts
import { addDays } from './day.ts';

/**
 * The streak (spec 3.5), derived from the qualifying study days.
 * Every 7th day of a streak earns a freeze, up to 2 banked, and a missed day spends one automatically,
 * so it neither breaks nor extends the streak. Streaks pay no XP.
 */
export const FREEZE_EVERY = 7;
export const FREEZE_CAP = 2;

export interface StreakState {
  current: number;
  longest: number;
  freezes: number;
  /** Missed days a freeze covered, oldest first. */
  frozenDays: readonly string[];
}

/** Walks from the earliest qualifying day to `today`; today counts when it qualifies and is never missed. */
export function streakOf(qualifying: ReadonlySet<string>, today: string): StreakState {
  const days = [...qualifying].filter((d) => d <= today).sort();
  const first = days[0];
  const state = { current: 0, longest: 0, freezes: 0, frozenDays: [] as string[] };
  if (first === undefined) return state;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    if (qualifying.has(day)) {
      state.current++;
      state.longest = Math.max(state.longest, state.current);
      if (state.current % FREEZE_EVERY === 0 && state.freezes < FREEZE_CAP) state.freezes++;
    } else if (day !== today) {
      if (state.current > 0 && state.freezes > 0) {
        state.freezes--;
        state.frozenDays.push(day);
      } else {
        state.current = 0;
      }
    }
  }
  return state;
}
```

- [ ] **Step 4: Run the tests and the checks and see them pass**

```bash
pnpm test tests/unit/streak.test.ts
pnpm typecheck
pnpm lint
```

Expected: `Tests  10 passed (10)`; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`.

- [ ] **Step 5: Commit**

```bash
pnpm lint:fix
git add src/engine/streak.ts tests/unit/streak.test.ts
git commit -m "Add the streak with freezes" -m "streakOf walks the qualifying study days up to today: every 7th day earns a freeze, up to 2 banked, a missed day spends one, and today never counts as missed."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

---

## Task 5: The review queue

**Files:**
- Create: `src/engine/queue.ts`, `tests/fixtures/memory.ts`, `tests/unit/queue.test.ts`
- Test: `tests/unit/queue.test.ts`

The queue is a pure function of the memory state, the content and the moment: it lists the concepts to review now, in order, and says whether new lessons may start.
`tests/fixtures/memory.ts` holds small builders for made-up content and events that Tasks 5 to 8 share, so each engine test reads as a short story of answers.
Cards always come from `deriveMemory` over `timelineOf` logs, never from hand-written card objects, so the tests follow the real FSRS numbers.

- [ ] **Step 1: Write the shared engine-test builders**

`tests/fixtures/memory.ts`:

```ts
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
}

/** Builds a `MemoryContent` from concept specs, with aliases pointing at their concept. */
export function contentOf(
  specs: readonly ConceptSpec[],
  questionVersions: ReadonlyMap<string, number> = new Map(),
): MemoryContent {
  const concepts = new Map<string, ConceptInfo>();
  const aliases = new Map<string, string>();
  for (const s of specs) {
    concepts.set(s.id, {
      module: s.module,
      tested: s.tested ?? true,
      confusableWith: s.confusableWith ?? [],
      splitFrom: s.splitFrom ?? null,
    });
    for (const alias of s.aliases ?? []) aliases.set(alias, s.id);
  }
  return { concepts, aliases, questionVersions };
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
}): NewEvent {
  const event: NewEvent = {
    t: 'answer',
    sid: args.sid ?? SID,
    mode: args.mode ?? 'check',
    qid: args.qid ?? `q-${args.concept}-1`,
    qv: args.qv ?? 1,
    concept: args.concept,
    picked: ['a'],
    correct: args.correct,
    sure: args.sure,
    ms: args.ms ?? 20_000,
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
```

- [ ] **Step 2: Write the failing queue test**

`tests/unit/queue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { addDays } from '../../src/engine/day.ts';
import { deriveMemory, isDue, type MemoryContent } from '../../src/engine/memory.ts';
import {
  CHUNK_SIZE,
  CONFUSABLE_DAYS,
  CONFUSABLE_GAP,
  ITEM_SECONDS,
  LOOKAHEAD,
  NEW_CONCEPT_CAP,
  reviewQueue,
} from '../../src/engine/queue.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, type ConceptSpec, contentOf } from '../fixtures/memory.ts';

const good = (concept: string): NewEvent => answerOf({ concept, correct: true, sure: true });
const queueAt = (content: MemoryContent, log: readonly (readonly [string, NewEvent])[], now: string) =>
  reviewQueue(deriveMemory(timelineOf(log), content), content, new Date(now), 0);

describe('queue constants', () => {
  it('match spec 3.6 and 3.7', () => {
    expect([CHUNK_SIZE, LOOKAHEAD, CONFUSABLE_DAYS, CONFUSABLE_GAP, NEW_CONCEPT_CAP, ITEM_SECONDS]).toEqual([
      20, 5, 2, 3, 20, 30,
    ]);
  });
});

describe('reviewQueue', () => {
  it('puts misconceptions first, even when they are not due', () => {
    const content = contentOf([
      { id: 'm-miss', module: 1 },
      { id: 'd-due', module: 2 },
    ]);
    const log = timelineOf([
      [at('2026-10-10'), answerOf({ concept: 'm-miss', correct: false, sure: true })],
      [at('2026-10-10', 11), answerOf({ concept: 'd-due', correct: false, sure: false })],
      [at('2026-10-11'), answerOf({ concept: 'm-miss', qid: 'q-m-miss-2', correct: true, sure: false })],
    ]);
    const memory = deriveMemory(log, content);
    const now = new Date(at('2026-10-12', 12));
    const card = memory.concepts.get('m-miss')?.card;
    if (!card) throw new Error('m-miss has no card');
    expect(isDue(card, now, 0)).toBe(false);
    const queue = reviewQueue(memory, content, now, 0);
    expect(queue.items).toEqual(['m-miss', 'd-due']);
    expect(queue.misconceptions).toBe(1);
    expect(queue.due).toBe(1);
  });

  it('drops a misconception from the queue once it was answered today', () => {
    const content = contentOf([{ id: 'm-miss', module: 1 }]);
    const queue = queueAt(
      content,
      [
        [at('2026-10-10'), answerOf({ concept: 'm-miss', correct: false, sure: true })],
        [at('2026-10-11'), answerOf({ concept: 'm-miss', qid: 'q-m-miss-2', correct: true, sure: false })],
      ],
      at('2026-10-11', 12),
    );
    expect(queue.items).toEqual([]);
    expect(queue.misconceptions).toBe(0);
  });

  it('orders due concepts by recall, lowest first', () => {
    const content = contentOf([
      { id: 'x1', module: 1 },
      { id: 'x2', module: 2 },
      { id: 'x3', module: 3 },
    ]);
    const queue = queueAt(
      content,
      [
        [at('2026-10-10'), good('x2')],
        [at('2026-10-11'), good('x1')],
        [at('2026-10-12'), good('x3')],
      ],
      at('2026-10-20'),
    );
    expect(queue.items).toEqual(['x2', 'x1', 'x3']);
    expect(queue.due).toBe(3);
    expect(queue.catchUp).toBe(false);
  });

  it('never puts two concepts of one module side by side while another module is within 5', () => {
    const specs: ConceptSpec[] = [
      { id: 'p1', module: 1 },
      { id: 'p2', module: 1 },
      { id: 'p3', module: 1 },
      { id: 'p4', module: 1 },
      { id: 'r1', module: 2 },
      { id: 'r2', module: 2 },
    ];
    const log = specs.map(({ id }, i) => [at(addDays('2026-10-01', i)), good(id)] as const);
    const queue = queueAt(contentOf(specs), log, at('2026-10-20'));
    expect(queue.items).toEqual(['p1', 'r1', 'p2', 'r2', 'p3', 'p4']);
  });

  it('takes the next item when no other module is within 5', () => {
    const specs: ConceptSpec[] = [
      ...['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => ({ id, module: 1 })),
      { id: 'r1', module: 2 },
    ];
    const log = specs.map(({ id }, i) => [at(addDays('2026-10-01', i)), good(id)] as const);
    const queue = queueAt(contentOf(specs), log, at('2026-10-20'));
    expect(queue.items).toEqual(['p1', 'p2', 'r1', 'p3', 'p4', 'p5', 'p6']);
  });

  it('brings a confusable pair due a day apart within 3 positions', () => {
    const fillers = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'];
    const content = contentOf([
      { id: 'a-pair', module: 1, confusableWith: ['z-pair'] },
      { id: 'z-pair', module: 2, confusableWith: ['a-pair'] },
      ...fillers.map((id, i) => ({ id, module: 3 + (i % 2) })),
    ]);
    const fillerLog = fillers.map((id, i) => [at('2026-10-01', 11 + i), good(id)] as const);
    const near = queueAt(
      content,
      [[at('2026-10-01'), good('a-pair')], ...fillerLog, [at('2026-10-02'), good('z-pair')]],
      at('2026-10-20'),
    );
    expect(near.items).toEqual(['a-pair', 'f1', 'f2', 'z-pair', 'f3', 'f4', 'f5', 'f6']);
    const far = queueAt(
      content,
      [[at('2026-10-01'), good('a-pair')], ...fillerLog, [at('2026-10-08'), good('z-pair')]],
      at('2026-10-20'),
    );
    expect(far.items.indexOf('z-pair') - far.items.indexOf('a-pair')).toBeGreaterThan(CONFUSABLE_GAP);
  });

  it('never lists an untested concept', () => {
    const tested = contentOf([
      { id: 'u1', module: 1 },
      { id: 't1', module: 2 },
    ]);
    const memory = deriveMemory(
      timelineOf([
        [at('2026-10-10'), good('u1')],
        [at('2026-10-10', 11), good('t1')],
      ]),
      tested,
    );
    const untested = contentOf([
      { id: 'u1', module: 1, tested: false },
      { id: 't1', module: 2 },
    ]);
    const queue = reviewQueue(memory, untested, new Date(at('2026-10-20')), 0);
    expect(queue.items).toEqual(['t1']);
    expect(queue.due).toBe(1);
  });

  it('plans a catch-up of the 60 lowest-recall concepts when more than 100 are due', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `k${String(i).padStart(3, '0')}`);
    const content = contentOf(ids.map((id, i) => ({ id, module: (i % 13) + 1 })));
    const day1 = ids.map(
      (id, i) =>
        [at('2026-10-10', 10, i % 60), answerOf({ concept: id, correct: false, sure: false })] as const,
    );
    const queue = queueAt(content, day1, at('2026-10-12', 12));
    expect(queue.due).toBe(101);
    expect(queue.catchUp).toBe(true);
    expect(queue.items).toHaveLength(60);
    expect([...queue.items].sort()).toEqual(ids.slice(0, 60));
    expect(queue.lessonsAllowed).toBe(false);

    const day2 = ids.slice(0, 60).map((id, i) => [at('2026-10-12', 9, i % 60), good(id)] as const);
    const after = queueAt(content, [...day1, ...day2], at('2026-10-12', 12));
    expect(after.catchUp).toBe(true);
    expect(after.items).toEqual([]);
    expect(after.due).toBe(41);
    expect(after.lessonsAllowed).toBe(true);
  });

  it('allows lessons until 20 concepts are new today', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `n${String(i).padStart(2, '0')}`);
    const content = contentOf(ids.map((id) => ({ id, module: 1 })));
    const log = ids.map((id, i) => [at('2026-10-10', 10, i), good(id)] as const);
    const nineteen = queueAt(content, log.slice(0, 19), at('2026-10-10', 12));
    expect(nineteen.newToday).toBe(19);
    expect(nineteen.lessonsAllowed).toBe(true);
    const twenty = queueAt(content, log, at('2026-10-10', 12));
    expect(twenty.newToday).toBe(20);
    expect(twenty.lessonsAllowed).toBe(false);
    const tomorrow = queueAt(content, log, at('2026-10-11', 12));
    expect(tomorrow.newToday).toBe(0);
    expect(tomorrow.lessonsAllowed).toBe(true);
  });

  it('says when the next concepts fall due once nothing is queued', () => {
    const content = contentOf([
      { id: 'n1', module: 1 },
      { id: 'n2', module: 2 },
      { id: 'n3', module: 3 },
    ]);
    expect(queueAt(content, [], at('2026-10-10', 12)).next).toBeNull();
    const queue = queueAt(
      content,
      [
        [at('2026-10-10'), answerOf({ concept: 'n1', correct: true, sure: false })],
        [at('2026-10-10', 11), answerOf({ concept: 'n2', correct: true, sure: false })],
        [at('2026-10-10', 12), good('n3')],
      ],
      at('2026-10-10', 15),
    );
    expect(queue.items).toEqual([]);
    expect(queue.due).toBe(0);
    expect(queue.next).toEqual({ count: 2, at: '2026-10-12T04:00:00.000Z' });
  });

  it('reads due and the next day start in the given offset', () => {
    const content = contentOf([{ id: 'o1', module: 1 }]);
    const log = timelineOf([['2026-10-10T08:00:00.000Z', good('o1')]], 120);
    const memory = deriveMemory(log, content);
    expect(memory.concepts.get('o1')?.card?.due).toBe('2026-10-13T08:00:00.000Z');
    expect(reviewQueue(memory, content, new Date('2026-10-13T01:59:00.000Z'), 120).items).toEqual([]);
    expect(reviewQueue(memory, content, new Date('2026-10-13T02:00:00.000Z'), 120).items).toEqual(['o1']);
    expect(reviewQueue(memory, content, new Date('2026-10-10T09:00:00.000Z'), 120).next).toEqual({
      count: 1,
      at: '2026-10-13T02:00:00.000Z',
    });
  });
});
```

- [ ] **Step 3: Run the test and see it fail**

```bash
pnpm test tests/unit/queue.test.ts
```

Expected: FAIL with `Error: Cannot find module '../../src/engine/queue.ts'`.

- [ ] **Step 4: Write the queue**

Steps 1 to 8 of the brief map to the code in order: the due set, the misconceptions, the catch-up plan, the order by recall, the module interleave, the confusable pairs, the counts, and `next`.
A misconception stays first even when it is not due, and drops out once it was answered today, because `lastAnswerDay` then equals today.

`src/engine/queue.ts`:

```ts
import { dayStartAt, daysBetween, nextDayStart, studyDayAt } from './day.ts';
import { CATCH_UP_OVER, CATCH_UP_PLAN, type MemoryContent, type MemoryState } from './memory.ts';
import { recall, type SrsCard } from './srs.ts';

/**
 * The review queue (spec 3.6 and 3.7): which concepts to review now, in which order,
 * and whether new lessons may start today.
 */
export const CHUNK_SIZE = 20;
export const LOOKAHEAD = 5;
export const CONFUSABLE_DAYS = 2;
export const CONFUSABLE_GAP = 3;
export const NEW_CONCEPT_CAP = 20;
export const ITEM_SECONDS = 30;

export interface ReviewQueue {
  /** Concept ids in review order. */
  items: readonly string[];
  /** Tested concepts due before the next 04:00. */
  due: number;
  misconceptions: number;
  catchUp: boolean;
  newToday: number;
  lessonsAllowed: boolean;
  /** When nothing is queued: how many concepts fall due on the next study day that has any, and its 04:00. */
  next: { count: number; at: string } | null;
}

interface Scored {
  id: string;
  r: number;
}

const byRecall = (a: Scored, b: Scored): number => a.r - b.r || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Takes the first of the next `LOOKAHEAD` items whose module differs from the last placed one. */
function interleave(ids: readonly string[], moduleOf: (id: string) => number): string[] {
  const rest = [...ids];
  const out: string[] = [];
  while (rest.length > 0) {
    const last = out.at(-1);
    let pick = 0;
    if (last !== undefined) {
      const window = Math.min(LOOKAHEAD, rest.length);
      for (let i = 0; i < window; i++) {
        if (moduleOf(rest[i] as string) !== moduleOf(last)) {
          pick = i;
          break;
        }
      }
    }
    out.push(...rest.splice(pick, 1));
  }
  return out;
}

/** Pulls a confusable partner up to `CONFUSABLE_GAP` positions after its pair when their dues are close. */
function pairUp(
  ids: readonly string[],
  partnersOf: (id: string) => readonly string[],
  dueDayOf: (id: string) => string | null,
): string[] {
  const out = [...ids];
  for (let i = 0; i < out.length; i++) {
    const a = out[i] as string;
    for (const b of partnersOf(a)) {
      const j = out.indexOf(b);
      const target = i + CONFUSABLE_GAP;
      if (j <= target) continue;
      const dayA = dueDayOf(a);
      const dayB = dueDayOf(b);
      if (dayA === null || dayB === null || Math.abs(daysBetween(dayA, dayB)) > CONFUSABLE_DAYS) continue;
      out.splice(j, 1);
      out.splice(target, 0, b);
    }
  }
  return out;
}

export function reviewQueue(memory: MemoryState, content: MemoryContent, now: Date, tz: number): ReviewQueue {
  const today = studyDayAt(now, tz);
  const horizon = nextDayStart(now, tz).getTime();
  const cards = new Map<string, SrsCard>();
  for (const [id, cm] of memory.concepts) {
    if (cm.card && content.concepts.get(id)?.tested) cards.set(id, cm.card);
  }
  const score = (id: string): Scored => {
    const card = cards.get(id);
    return { id, r: card ? recall(card, now) : 0 };
  };

  const dueSet: Scored[] = [];
  for (const [id, card] of cards) if (Date.parse(card.due) < horizon) dueSet.push(score(id));
  dueSet.sort(byRecall);

  const marked: Scored[] = [];
  for (const [id, cm] of memory.concepts) {
    if (cm.misconception && cm.lastAnswerDay !== today && content.concepts.get(id)?.tested)
      marked.push(score(id));
  }
  marked.sort(byRecall);

  let plan = memory.catchUpPlans.get(today);
  if (plan === undefined && dueSet.length > CATCH_UP_OVER)
    plan = dueSet.slice(0, CATCH_UP_PLAN).map((s) => s.id);
  const catchUp = plan !== undefined;
  const dueIds = new Set(dueSet.map((s) => s.id));
  const base = plan ? dueSet.filter((s) => plan.includes(s.id)) : dueSet;

  const markedIds = new Set(marked.map((s) => s.id));
  const ordered = [...marked.map((s) => s.id), ...base.filter((s) => !markedIds.has(s.id)).map((s) => s.id)];
  const moduleOf = (id: string) => content.concepts.get(id)?.module ?? 0;
  const dueDayOf = (id: string) => {
    const card = cards.get(id);
    return card ? studyDayAt(new Date(card.due), tz) : null;
  };
  const items = pairUp(
    interleave(ordered, moduleOf),
    (id) => content.concepts.get(id)?.confusableWith ?? [],
    dueDayOf,
  );

  const due = dueIds.size;
  const newToday = memory.newByDay.get(today) ?? 0;
  const lessonsAllowed = newToday < NEW_CONCEPT_CAP && !(catchUp && due >= CATCH_UP_OVER);

  let next: ReviewQueue['next'] = null;
  if (items.length === 0 && cards.size > 0) {
    let earliest: number | null = null;
    for (const card of cards.values()) {
      const t = Date.parse(card.due);
      if (t >= horizon && (earliest === null || t < earliest)) earliest = t;
    }
    if (earliest !== null) {
      const day = studyDayAt(new Date(earliest), tz);
      const start = dayStartAt(day, tz);
      const end = nextDayStart(start, tz).getTime();
      let count = 0;
      for (const card of cards.values()) if (Date.parse(card.due) < end) count++;
      next = { count, at: start.toISOString() };
    }
  }

  return { items, due, misconceptions: marked.length, catchUp, newToday, lessonsAllowed, next };
}
```

- [ ] **Step 5: Run the test and see it pass**

```bash
pnpm test tests/unit/queue.test.ts
pnpm typecheck
pnpm lint
```

Expected: `Tests  12 passed (12)`, and both other commands exit 0.

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix
git add src/engine/queue.ts tests/fixtures/memory.ts tests/unit/queue.test.ts
git commit -m "Add the review queue" -m "Phase 2 Task 5: misconceptions first, then due concepts by recall, interleaved by module with confusable pairs pulled together, a 60-concept catch-up above 100 due, the 20 new concepts a day cap, and when the next concepts fall due."
```

## Task 6: Selection by recall, relearn variants and review session items

**Files:**
- Modify: `src/engine/select.ts`, `tests/unit/select.test.ts`, `src/app/screens/Runner.tsx` (one line)
- Test: `tests/unit/select.test.ts`

The module quiz now orders the answered questions by their concept's current recall instead of by the last answer's verdict (spec 4.1).
`selectQuiz` takes `recall` as a required argument, so the one caller in `Runner.tsx` passes `() => 0` in this task; Task 15 owns `Runner.tsx` and replaces it with recall from the memory cards.
The existing quiz case "never answered first, then last wrong, then last right" becomes "never answered first, then by recall", because a wrong answer now matters through the recall it leaves; every other existing case keeps its expectation with a flat `recall`.
`sessionItems` rebuilds a session's item list from its recorded answers, so a reload lands on the same item, relearn steps included.

- [ ] **Step 1: Write the failing tests**

Replace `tests/unit/select.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { derive, type SessionState } from '../../src/engine/replay.ts';
import {
  type PoolQuestion,
  QUIZ_SIZE,
  RELEARN_GAP,
  relearnVariant,
  selectCheck,
  selectQuiz,
  sessionItems,
} from '../../src/engine/select.ts';
import { eventsOf, SID, SID2 } from '../fixtures/events.ts';

const q = (id: string, concept: string, note = 'm01/a'): PoolQuestion => ({ id, concept, note });
const answer = (pool: readonly PoolQuestion[], qid: string, correct: boolean): NewEvent => ({
  t: 'answer',
  sid: SID,
  mode: 'quiz',
  qid,
  qv: 1,
  concept: pool.find((p) => p.id === qid)?.concept ?? 'unknown',
  picked: ['a'],
  correct,
  sure: false,
  ms: 1000,
});

const POOL = [q('a1', 'a'), q('a2', 'a'), q('b1', 'b'), q('b2', 'b'), q('c1', 'c')];
const EMPTY = derive([], null);

describe('selectCheck', () => {
  it('takes one question per concept, in the given concept order', () => {
    const ids = selectCheck({ concepts: ['c', 'a', 'b', 'none'], pool: POOL, progress: EMPTY, seed: 1 });
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe('c1');
    expect(ids[1]?.startsWith('a')).toBe(true);
    expect(ids[2]?.startsWith('b')).toBe(true);
  });

  it('never repeats the last shown variant when another exists', () => {
    for (const shown of ['a1', 'a2']) {
      const progress = derive(eventsOf(answer(POOL, shown, true)), null);
      for (let seed = 0; seed < 20; seed++) {
        const [pick] = selectCheck({ concepts: ['a'], pool: POOL, progress, seed });
        expect(pick).not.toBe(shown);
      }
    }
    const progress = derive(eventsOf(answer(POOL, 'c1', true)), null);
    expect(selectCheck({ concepts: ['c'], pool: POOL, progress, seed: 1 })).toEqual(['c1']);
  });

  it('puts unseen variants before seen ones, then the oldest answer first', () => {
    const pool = [q('a1', 'a'), q('a2', 'a'), q('a3', 'a'), q('z', 'z')];
    // a1 answered first (oldest), a2 later, z last so the last shown of a is a2.
    const seen = derive(eventsOf(answer(pool, 'a1', true), answer(pool, 'a2', true)), null);
    for (let seed = 0; seed < 20; seed++) {
      expect(selectCheck({ concepts: ['a'], pool, progress: seen, seed })).toEqual(['a3']);
    }
    const allSeen = derive(
      eventsOf(answer(pool, 'a3', true), answer(pool, 'a1', true), answer(pool, 'a2', true)),
      null,
    );
    expect(selectCheck({ concepts: ['a'], pool, progress: allSeen, seed: 3 })).toEqual(['a3']);
  });

  it('gives the same list for the same seed', () => {
    const run = (seed: number) =>
      selectCheck({ concepts: ['a', 'b', 'c'], pool: POOL, progress: EMPTY, seed });
    expect(run(42)).toEqual(run(42));
    const seen = new Set(Array.from({ length: 30 }, (_, seed) => run(seed).join()));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('selectQuiz', () => {
  const big = Array.from({ length: 20 }, (_, i) => q(`q${String(i).padStart(2, '0')}`, `c${i % 8}`));
  const flat = () => 0.5;

  it('caps at 12 and spreads concepts before repeating one', () => {
    expect(QUIZ_SIZE).toBe(12);
    const ids = selectQuiz({ pool: big, progress: EMPTY, seed: 9, recall: flat });
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    const firstEight = ids.slice(0, 8).map((id) => big.find((p) => p.id === id)?.concept);
    expect(new Set(firstEight).size).toBe(8);
  });

  it('puts never answered first, then the answered ones by recall, lowest first', () => {
    const pool = [q('n', 'c1'), q('w', 'c2'), q('r', 'c3')];
    const progress = derive(eventsOf(answer(pool, 'w', false), answer(pool, 'r', true)), null);
    const recall = (concept: string) => (concept === 'c2' ? 0.4 : 0.95);
    for (let seed = 0; seed < 10; seed++) {
      expect(selectQuiz({ pool, progress, seed, recall })).toEqual(['n', 'w', 'r']);
    }
  });

  it('puts the concept with the lowest recall first once every question was answered', () => {
    const pool = [q('x', 'c1'), q('y', 'c2'), q('z', 'c3')];
    const progress = derive(
      eventsOf(answer(pool, 'x', true), answer(pool, 'y', true), answer(pool, 'z', true)),
      null,
    );
    const recall = (concept: string) => ({ c1: 0.9, c2: 0.95, c3: 0.6 })[concept] ?? 0;
    expect(selectQuiz({ pool, progress, seed: 4, recall })).toEqual(['z', 'x', 'y']);
  });

  it('keeps never answered ahead of the lowest recall', () => {
    const pool = [q('seen', 'low'), q('new', 'high')];
    const progress = derive(eventsOf(answer(pool, 'seen', false)), null);
    const recall = (concept: string) => (concept === 'low' ? 0 : 1);
    expect(selectQuiz({ pool, progress, seed: 1, recall })).toEqual(['new', 'seen']);
  });

  it('takes the oldest last answer first when recall ties', () => {
    const pool = [q('x', 'c1'), q('y', 'c2'), q('z', 'c3')];
    const progress = derive(
      eventsOf(
        answer(pool, 'x', false),
        answer(pool, 'z', true),
        answer(pool, 'y', true),
        answer(pool, 'x', true),
      ),
      null,
    );
    expect(selectQuiz({ pool, progress, seed: 1, recall: flat })).toEqual(['z', 'y', 'x']);
  });

  it('fills up to the size with a second pass when concepts run out', () => {
    const pool = [q('a1', 'a'), q('a2', 'a'), q('a3', 'a'), q('b1', 'b')];
    const ids = selectQuiz({ pool, progress: EMPTY, seed: 2, size: 3, recall: flat });
    expect(ids).toHaveLength(3);
    expect(ids.slice(0, 2).sort((x, y) => x.localeCompare(y))[1]).toBe('b1');
  });

  it('gives the same list for the same seed', () => {
    expect(selectQuiz({ pool: big, progress: EMPTY, seed: 5, recall: flat })).toEqual(
      selectQuiz({ pool: big, progress: EMPTY, seed: 5, recall: flat }),
    );
  });
});

describe('relearnVariant', () => {
  const pool = [q('a1', 'a'), q('a2', 'a'), q('a3', 'a'), q('b1', 'b')];

  it('never returns the question just answered', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const avoid of ['a1', 'a2', 'a3']) {
        const pick = relearnVariant({ concept: 'a', avoid, pool, seed });
        expect(pick).not.toBe(avoid);
        expect(pick?.startsWith('a')).toBe(true);
      }
    }
  });

  it('is null for a concept with one variant', () => {
    expect(relearnVariant({ concept: 'b', avoid: 'b1', pool, seed: 3 })).toBeNull();
    expect(relearnVariant({ concept: 'none', avoid: 'x', pool, seed: 3 })).toBeNull();
  });

  it('is stable for one seed whatever the pool order', () => {
    const reversed = [...pool].reverse();
    for (let seed = 0; seed < 10; seed++) {
      expect(relearnVariant({ concept: 'a', avoid: 'a1', pool: reversed, seed })).toBe(
        relearnVariant({ concept: 'a', avoid: 'a1', pool, seed }),
      );
    }
    const picks = new Set(
      Array.from({ length: 30 }, (_, seed) => relearnVariant({ concept: 'a', avoid: 'a1', pool, seed })),
    );
    expect(picks).toEqual(new Set(['a2', 'a3']));
  });
});

describe('sessionItems', () => {
  const qids = Array.from({ length: 10 }, (_, i) => `q${i}`);
  const conceptOf = (qid: string) => `c${qid.slice(1)}`;
  const reviewOf = (
    wrong: readonly string[],
    mode: 'review' | 'check' = 'review',
    concept = conceptOf,
  ): SessionState => {
    const start: NewEvent = { t: 'session', sid: SID2, mode, phase: 'start', seed: 1, scope: mode, qids };
    const answers: NewEvent[] = qids.map((qid) => ({
      t: 'answer',
      sid: SID2,
      mode,
      qid,
      qv: 1,
      concept: concept(qid),
      picked: ['a'],
      correct: !wrong.includes(qid),
      sure: false,
      ms: 1000,
    }));
    const session = derive(eventsOf(start, ...answers), null).sessions.get(SID2);
    if (!session) throw new Error('no session');
    return session;
  };
  const relearnFor = (qid: string) => `${qid}-again`;

  it('lists the session questions in order when every answer is right', () => {
    expect(sessionItems(reviewOf([]), relearnFor)).toEqual(qids.map((qid) => ({ qid, relearn: false })));
  });

  it('inserts a relearn item 5 places after a wrong answer at index 1', () => {
    expect(RELEARN_GAP).toBe(5);
    const items = sessionItems(reviewOf(['q1']), relearnFor);
    expect(items).toHaveLength(11);
    expect(items[6]).toEqual({ qid: 'q1-again', relearn: true });
    expect(items.filter((i) => i.relearn)).toHaveLength(1);
  });

  it('appends the relearn item for a wrong answer near the end', () => {
    const items = sessionItems(reviewOf(['q8']), relearnFor);
    expect(items.at(-1)).toEqual({ qid: 'q8-again', relearn: true });
    expect(items).toHaveLength(11);
  });

  it('inserts once per concept', () => {
    const items = sessionItems(
      reviewOf(['q1', 'q3'], 'review', () => 'same'),
      (qid) => `${qid}-again`,
    );
    expect(items.filter((i) => i.relearn)).toEqual([{ qid: 'q1-again', relearn: true }]);
  });

  it('skips a concept with no other variant, and a variant already in the list', () => {
    expect(sessionItems(reviewOf(['q1']), () => null).some((i) => i.relearn)).toBe(false);
    expect(sessionItems(reviewOf(['q1']), () => 'q4').some((i) => i.relearn)).toBe(false);
  });

  it('never inserts in a lesson check', () => {
    expect(sessionItems(reviewOf(['q1', 'q2'], 'check'), relearnFor).some((i) => i.relearn)).toBe(false);
  });

  it('keeps the relearn item once its own answer is in, so a reload resumes at the same item', () => {
    const base = reviewOf(['q1']);
    const items = sessionItems(base, relearnFor);
    const relearnAnswer = {
      ...(base.answers.get('q1') as NonNullable<ReturnType<typeof base.answers.get>>),
      qid: 'q1-again',
      relearn: true,
      correct: false,
    };
    const answered: SessionState = {
      ...base,
      answers: new Map([...base.answers, ['q1-again', relearnAnswer]]),
    };
    expect(sessionItems(answered, relearnFor)).toEqual(items);
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/select.test.ts
```

Expected: FAIL with `Tests  11 failed | 10 passed (21)`: `relearnVariant` and `sessionItems` do not exist yet, and the quiz still ranks by the last verdict.

- [ ] **Step 3: Rewrite the selection**

Replace `src/engine/select.ts` with:

```ts
import type { Progress, SessionState } from './replay.ts';
import { mulberry32, seedFor, shuffle } from './rng.ts';

/**
 * Question selection for lesson checks, the module quiz and review sessions.
 * The quiz orders by recall (spec 4.1): never answered first, then the lowest current recall of the concept.
 * A wrong review answer brings back another variant of its concept a few items later (spec 3.6).
 */
export const QUIZ_SIZE = 12;
export const RELEARN_GAP = 5;

export interface PoolQuestion {
  id: string;
  concept: string;
  note: string;
}

interface Ranked {
  q: PoolQuestion;
  rank: number;
  r: number;
  lastAt: string;
  tie: number;
}

/** Ranks the pool by `[rank, r]` from `keyOf`, then the oldest last answer, then the seeded shuffle. */
function ranked(
  pool: readonly PoolQuestion[],
  progress: Progress,
  seed: number,
  keyOf: (q: PoolQuestion, answered: boolean) => readonly [number, number],
): Ranked[] {
  const order = new Map(shuffle(pool, mulberry32(seed)).map((q, i) => [q.id, i]));
  return pool
    .map((q) => {
      const last = progress.answers.get(q.id)?.at(-1);
      const [rank, r] = keyOf(q, last !== undefined);
      return { q, rank, r, lastAt: last?.at ?? '', tie: order.get(q.id) ?? 0 };
    })
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.r - b.r ||
        (a.lastAt < b.lastAt ? -1 : a.lastAt > b.lastAt ? 1 : 0) ||
        a.tie - b.tie,
    );
}

/** One question per concept, in the given concept order, never the variant shown last when another exists. */
export function selectCheck(args: {
  concepts: readonly string[];
  pool: readonly PoolQuestion[];
  progress: Progress;
  seed: number;
}): string[] {
  const { concepts, pool, progress, seed } = args;
  const order = ranked(pool, progress, seed, (_q, answered) => [answered ? 1 : 0, 0]);
  const out: string[] = [];
  for (const concept of concepts) {
    const variants = order.filter((r) => r.q.concept === concept);
    const shown = progress.lastShown.get(concept);
    const fresh = variants.length > 1 ? variants.filter((r) => r.q.id !== shown) : variants;
    const pick = fresh[0];
    if (pick) out.push(pick.q.id);
  }
  return out;
}

/**
 * Up to `size` questions: never answered first, then by the concept's recall, lowest first;
 * one per concept first, then a second pass fills up in the same order.
 */
export function selectQuiz(args: {
  pool: readonly PoolQuestion[];
  progress: Progress;
  seed: number;
  size?: number;
  recall: (concept: string) => number;
}): string[] {
  const { pool, progress, seed, size = QUIZ_SIZE, recall } = args;
  const order = ranked(pool, progress, seed, (q, answered) => (answered ? [1, recall(q.concept)] : [0, 0]));
  const out: string[] = [];
  const taken = new Set<string>();
  const concepts = new Set<string>();
  for (const { q } of order) {
    if (out.length >= size) break;
    if (concepts.has(q.concept)) continue;
    concepts.add(q.concept);
    taken.add(q.id);
    out.push(q.id);
  }
  for (const { q } of order) {
    if (out.length >= size) break;
    if (taken.has(q.id)) continue;
    taken.add(q.id);
    out.push(q.id);
  }
  return out;
}

/** Another variant of the concept for a relearn step, seeded per concept; null when the concept has no other. */
export function relearnVariant(args: {
  concept: string;
  avoid: string;
  pool: readonly PoolQuestion[];
  seed: number;
}): string | null {
  const { concept, avoid, pool, seed } = args;
  const ids = pool
    .filter((q) => q.concept === concept && q.id !== avoid)
    .map((q) => q.id)
    .sort();
  return shuffle(ids, mulberry32(seedFor(seed, concept)))[0] ?? null;
}

export interface SessionItem {
  qid: string;
  relearn: boolean;
}

/**
 * The items of a session, rebuilt from its answers so a reload resumes at the same item.
 * In a review, the first wrong answer to a concept inserts one relearn item `RELEARN_GAP` items later, or at the end.
 */
export function sessionItems(
  session: SessionState,
  relearnFor: (qid: string, concept: string) => string | null,
): SessionItem[] {
  const items: SessionItem[] = session.qids.map((qid) => ({ qid, relearn: false }));
  if (session.mode !== 'review') return items;
  const relearned = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || item.relearn) continue;
    const answer = session.answers.get(item.qid);
    if (!answer || answer.correct || answer.relearn || relearned.has(answer.concept)) continue;
    const variant = relearnFor(item.qid, answer.concept);
    if (variant === null || items.some((x) => x.qid === variant)) continue;
    relearned.add(answer.concept);
    items.splice(Math.min(i + RELEARN_GAP, items.length), 0, { qid: variant, relearn: true });
  }
  return items;
}
```

In `src/app/screens/Runner.tsx`, pass a flat recall to the quiz until Task 15 wires the memory cards:

```tsx
      : selectQuiz({ pool, progress: progress.peek(), seed, recall: () => 0 });
```

This replaces the line `      : selectQuiz({ pool, progress: progress.peek(), seed });`.

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/select.test.ts
pnpm typecheck
pnpm lint
```

Expected: `Tests  21 passed (21)`, and both other commands exit 0.

- [ ] **Step 5: Commit**

```bash
pnpm lint:fix
git add src/engine/select.ts tests/unit/select.test.ts src/app/screens/Runner.tsx
git commit -m "Order the quiz by recall and add relearn steps for reviews" -m "Phase 2 Task 6: selectQuiz ranks answered questions by their concept's recall, relearnVariant picks another seeded variant, and sessionItems inserts one relearn item 5 places after a wrong review answer, once per concept."
```

## Task 7: Module mastery and the Next action

**Files:**
- Create: `src/engine/mastery.ts`, `src/engine/next.ts`, `tests/unit/mastery.test.ts`, `tests/unit/next.test.ts`
- Test: `tests/unit/mastery.test.ts`, `tests/unit/next.test.ts`

Mastery reads recall a week ahead and halves it until a concept has succeeded on two study days, so one day of cramming tops out near 40 (spec 3.8 and 3.11).
The numbers in the tests are ts-fsrs 5.4.2's: one Good gives recall 0.808 a week out, a Good then a Good on the due day gives 0.940, and a Hard then a Good gives 0.896.
`nextAction` takes the queue as computed by `reviewQueue`, and its tests build `ReviewQueue` values directly, so each rule of spec 4.6 is tested on its own.

- [ ] **Step 1: Write the failing mastery test**

`tests/unit/mastery.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { DAY_MS } from '../../src/engine/day.ts';
import {
  BAND_LABEL,
  conceptMastery,
  HORIZON_DAYS,
  hexBand,
  moduleMastery,
  successGate,
} from '../../src/engine/mastery.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { recall } from '../../src/engine/srs.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf } from '../fixtures/memory.ts';

const CONTENT = contentOf([
  { id: 'oven', module: 1 },
  { id: 'proofing', module: 2 },
  { id: 'crust', module: 2 },
  { id: 'menu', module: 2, tested: false },
  { id: 'flour', module: 3 },
]);
const good = (qid: string): NewEvent => answerOf({ concept: 'oven', qid, correct: true, sure: true });
const masteryAfter = (log: readonly (readonly [string, NewEvent])[], now: string) =>
  moduleMastery(deriveMemory(timelineOf(log), CONTENT), CONTENT, new Date(now));

describe('successGate and conceptMastery', () => {
  it('gates recall by success on two study days', () => {
    expect(HORIZON_DAYS).toBe(7);
    expect(successGate(undefined)).toBe(0);
    const memory = deriveMemory(timelineOf([[at('2026-10-10'), good('q-oven-1')]]), CONTENT);
    const cm = memory.concepts.get('oven');
    expect(successGate(cm)).toBe(0.5);
    const card = cm?.card;
    if (!card) throw new Error('oven has no card');
    const ahead = new Date(Date.parse(at('2026-10-17')));
    expect(conceptMastery(cm, ahead)).toBeCloseTo(recall(card, ahead) * 0.5, 12);
    expect(conceptMastery(undefined, ahead)).toBe(0);
  });
});

describe('moduleMastery', () => {
  it('gives 40 for one Good answer today: recall a week out of about 0.808, halved', () => {
    const mastery = masteryAfter([[at('2026-10-10'), good('q-oven-1')]], at('2026-10-10'));
    expect(mastery.get(1)).toBe(40);
  });

  it('gives 94 right after a second Good on the due day', () => {
    const mastery = masteryAfter(
      [
        [at('2026-10-10'), good('q-oven-1')],
        [at('2026-10-13'), good('q-oven-2')],
      ],
      at('2026-10-13'),
    );
    expect(mastery.get(1)).toBe(94);
  });

  it('gives 90 for a Hard, then a Good on the due day', () => {
    const mastery = masteryAfter(
      [
        [at('2026-10-10'), answerOf({ concept: 'oven', correct: true, sure: false })],
        [at('2026-10-12'), good('q-oven-2')],
      ],
      at('2026-10-12'),
    );
    expect(mastery.get(1)).toBe(90);
  });

  it('averages over the tested concepts only and gives 0 with no answers', () => {
    const mastery = masteryAfter(
      [[at('2026-10-10'), answerOf({ concept: 'proofing', correct: true, sure: true })]],
      at('2026-10-10'),
    );
    expect(mastery.get(2)).toBe(20);
    expect(mastery.get(1)).toBe(0);
    expect(mastery.get(3)).toBe(0);
    expect([...mastery.keys()]).toEqual([1, 2, 3]);
  });

  it('is never higher a day later with no new event', () => {
    const log = [
      [at('2026-10-10'), good('q-oven-1')],
      [at('2026-10-13'), good('q-oven-2')],
      [at('2026-10-13', 11), answerOf({ concept: 'crust', correct: false, sure: false })],
    ] as const;
    const memory = deriveMemory(timelineOf(log), CONTENT);
    let previous = moduleMastery(memory, CONTENT, new Date(at('2026-10-13', 12)));
    for (let day = 1; day <= 60; day++) {
      const now = new Date(Date.parse(at('2026-10-13', 12)) + day * DAY_MS);
      const mastery = moduleMastery(memory, CONTENT, now);
      for (const [module, value] of mastery) expect(value).toBeLessThanOrEqual(previous.get(module) ?? 0);
      previous = mastery;
    }
  });
});

describe('hexBand', () => {
  it('maps mastery to the bands of spec 3.8, with the top band only after a boss', () => {
    const cases: [number, string, string][] = [
      [0, 'outline', 'outline'],
      [19, 'outline', 'outline'],
      [20, 'faint', 'faint'],
      [39, 'faint', 'faint'],
      [40, 'light', 'light'],
      [59, 'light', 'light'],
      [60, 'solid', 'solid'],
      [79, 'solid', 'solid'],
      [80, 'solid', 'mastered'],
      [100, 'solid', 'mastered'],
    ];
    for (const [mastery, without, withBoss] of cases) {
      expect(hexBand(mastery, false)).toBe(without);
      expect(hexBand(mastery, true)).toBe(withBoss);
    }
  });

  it('labels each band in words', () => {
    expect(BAND_LABEL).toEqual({
      outline: 'not started',
      faint: 'started',
      light: 'learning',
      solid: 'solid',
      mastered: 'mastered',
    });
  });
});
```

- [ ] **Step 2: Write the failing Next test**

`tests/unit/next.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { type LessonRef, type NextInput, nextAction, nextMinutes } from '../../src/engine/next.ts';
import type { ReviewQueue } from '../../src/engine/queue.ts';
import { derive } from '../../src/engine/replay.ts';
import { SID, SID2, timelineOf } from '../fixtures/events.ts';
import { answerOf, at, startOf, submitOf } from '../fixtures/memory.ts';

const lesson = (module: number, slug: string, first: boolean, checkConcepts: number): LessonRef => ({
  note: `m${String(module).padStart(2, '0')}/${slug}`,
  module,
  slug,
  title: `Lesson ${slug}`,
  first,
  minutes: 6,
  checkConcepts,
});

const LESSONS: LessonRef[] = [
  lesson(1, 'welcome', true, 0),
  lesson(1, 'shared-kitchen', false, 2),
  lesson(2, 'ovens', true, 3),
  lesson(2, 'proofing', false, 2),
  lesson(3, 'flour', true, 1),
];
const [WELCOME, KITCHEN, OVENS, PROOFING, FLOUR] = LESSONS as [
  LessonRef,
  LessonRef,
  LessonRef,
  LessonRef,
  LessonRef,
];

const queueOf = (items: readonly string[], lessonsAllowed = true): ReviewQueue => ({
  items,
  due: items.length,
  misconceptions: 0,
  catchUp: false,
  newToday: 0,
  lessonsAllowed,
  next: null,
});

const done = (note: string): NewEvent => ({ t: 'lesson.done', note });

const inputOf = (
  log: readonly (readonly [string, NewEvent])[],
  overrides: Partial<NextInput> = {},
): NextInput => ({
  lessons: LESSONS,
  progress: derive(timelineOf(log), null),
  queue: queueOf([]),
  currentLesson: null,
  today: '2026-10-10',
  tz: 0,
  ...overrides,
});

describe('nextAction', () => {
  it('starts Module 1 on the first run', () => {
    expect(nextAction(inputOf([]))).toEqual({ kind: 'lesson', lesson: WELCOME });
  });

  it('takes each action ahead of the ones after it', () => {
    const openCheck = [
      [at('2026-10-10', 9), done(KITCHEN.note)],
      [at('2026-10-10', 9, 1), startOf(SID, 'check', ['q-a', 'q-b', 'q-c'], KITCHEN.note)],
      [at('2026-10-10', 9, 2), answerOf({ concept: 'a', qid: 'q-a', correct: true, sure: true })],
    ] as const;
    const all = { queue: queueOf(['a', 'b']), currentLesson: OVENS.note };
    const resume = nextAction(inputOf(openCheck, all));
    expect(resume.kind).toBe('resume');
    if (resume.kind === 'resume') {
      expect(resume.session.sid).toBe(SID);
      expect(resume.left).toBe(2);
    }

    const submitted = [...openCheck, [at('2026-10-10', 9, 3), submitOf(SID, 'check')] as const];
    expect(nextAction(inputOf(submitted, all))).toEqual({ kind: 'review', count: 2 });
    expect(nextAction(inputOf(submitted, { currentLesson: OVENS.note }))).toEqual({
      kind: 'continue',
      lesson: OVENS,
    });

    const readOnly = [[at('2026-10-10', 9), done(KITCHEN.note)]] as const;
    expect(nextAction(inputOf(readOnly))).toEqual({ kind: 'check', module: 1, concepts: 2, lesson: KITCHEN });
    expect(nextAction(inputOf(submitted))).toEqual({ kind: 'lesson', lesson: WELCOME });

    const everything = LESSONS.map((l, i) => [at('2026-10-10', 9, i), done(l.note)] as const);
    const checks = LESSONS.filter((l) => l.checkConcepts > 0).flatMap((l, i) => [
      [at('2026-10-10', 10, 2 * i), startOf(SID2, 'check', [], l.note)] as const,
      [at('2026-10-10', 10, 2 * i + 1), submitOf(SID2, 'check')] as const,
    ]);
    expect(nextAction(inputOf([...everything, ...checks]))).toEqual({ kind: 'done' });
  });

  it('caps the review at one chunk of 20', () => {
    const items = Array.from({ length: 31 }, (_, i) => `c${i}`);
    expect(nextAction(inputOf([], { queue: queueOf(items) }))).toEqual({ kind: 'review', count: 20 });
  });

  it('resumes a review started today but never one from an earlier study day', () => {
    const review = (day: string) =>
      [
        [at(day, 9), startOf(SID2, 'review', ['q-a', 'q-b'], 'review')],
        [
          at(day, 9, 1),
          answerOf({ concept: 'a', qid: 'q-a', mode: 'review', sid: SID2, correct: true, sure: true }),
        ],
      ] as const;
    const today = nextAction(inputOf(review('2026-10-10'), { queue: queueOf(['b']) }));
    expect(today.kind).toBe('resume');
    expect(nextAction(inputOf(review('2026-10-09'), { queue: queueOf(['b']) }))).toEqual({
      kind: 'review',
      count: 1,
    });
  });

  it('never resumes a session with every question answered, or one that was abandoned', () => {
    const answered = [
      [at('2026-10-10', 9), startOf(SID, 'quiz', ['q-a'], 'm01')],
      [
        at('2026-10-10', 9, 1),
        answerOf({ concept: 'a', qid: 'q-a', mode: 'quiz', correct: true, sure: true }),
      ],
    ] as const;
    expect(nextAction(inputOf(answered)).kind).toBe('lesson');
    const abandoned = [
      [at('2026-10-10', 9), startOf(SID, 'quiz', ['q-a'], 'm01')],
      [
        at('2026-10-10', 9, 1),
        { t: 'session', sid: SID, mode: 'quiz', phase: 'abandon', seed: 7 } as NewEvent,
      ],
    ] as const;
    expect(nextAction(inputOf(abandoned)).kind).toBe('lesson');
  });

  it('continues only a known lesson that is not done', () => {
    expect(nextAction(inputOf([], { currentLesson: PROOFING.note }))).toEqual({
      kind: 'continue',
      lesson: PROOFING,
    });
    expect(nextAction(inputOf([], { currentLesson: 'm09/unknown' }))).toEqual({
      kind: 'lesson',
      lesson: WELCOME,
    });
    const read = [[at('2026-10-10', 9), done(PROOFING.note)]] as const;
    expect(nextAction(inputOf(read, { currentLesson: PROOFING.note }))).toEqual({
      kind: 'check',
      module: 2,
      concepts: 2,
      lesson: PROOFING,
    });
  });

  it('offers Check yourself for read lessons that now have questions, in the earliest module, with its concept total', () => {
    const log = [
      [at('2026-10-10', 9), done(WELCOME.note)],
      [at('2026-10-10', 9, 1), done(OVENS.note)],
      [at('2026-10-10', 9, 2), done(PROOFING.note)],
      [at('2026-10-10', 9, 3), done(FLOUR.note)],
    ] as const;
    expect(nextAction(inputOf(log))).toEqual({ kind: 'check', module: 2, concepts: 5, lesson: OVENS });
  });

  it('gives way to Done for today when no lesson may start', () => {
    const read = [[at('2026-10-10', 9), done(KITCHEN.note)]] as const;
    expect(nextAction(inputOf(read, { queue: queueOf([], false) }))).toEqual({ kind: 'done' });
    expect(nextAction(inputOf([], { queue: queueOf([], false) }))).toEqual({ kind: 'done' });
    expect(nextAction(inputOf([], { queue: queueOf([], false), currentLesson: OVENS.note }))).toEqual({
      kind: 'continue',
      lesson: OVENS,
    });
  });
});

describe('nextMinutes', () => {
  it('counts 30 seconds per item, rounded up, and a lesson its own minutes', () => {
    expect(nextMinutes({ kind: 'review', count: 18 })).toBe(9);
    expect(nextMinutes({ kind: 'review', count: 1 })).toBe(1);
    expect(nextMinutes({ kind: 'check', module: 2, concepts: 5, lesson: OVENS })).toBe(3);
    expect(nextMinutes({ kind: 'lesson', lesson: WELCOME })).toBe(6);
    expect(nextMinutes({ kind: 'continue', lesson: OVENS })).toBe(6);
    expect(nextMinutes({ kind: 'done' })).toBeNull();
  });

  it('counts the questions left in a resumed session', () => {
    const progress = derive(
      timelineOf([[at('2026-10-10', 9), startOf(SID, 'quiz', ['a', 'b', 'c'], 'm01')]]),
      null,
    );
    const s = progress.sessions.get(SID);
    if (!s) throw new Error('no session');
    expect(nextMinutes({ kind: 'resume', session: s, left: 3 })).toBe(2);
  });
});
```

- [ ] **Step 3: Run the tests and see them fail**

```bash
pnpm test tests/unit/mastery.test.ts tests/unit/next.test.ts
```

Expected: FAIL in both files with `Cannot find module '../../src/engine/mastery.ts'` and `Cannot find module '../../src/engine/next.ts'`.

- [ ] **Step 4: Write mastery**

`src/engine/mastery.ts`:

```ts
import { DAY_MS } from './day.ts';
import type { ConceptMemory, MemoryContent, MemoryState } from './memory.ts';
import { recall } from './srs.ts';

/**
 * Module mastery (spec 3.8): the mean over a module's tested concepts of recall a week ahead,
 * gated by success on two different study days, so one day of cramming cannot fill a hex.
 */
export const HORIZON_DAYS = 7;

/** 0 with no success day, 0.5 with one, 1 with two or more. */
export function successGate(cm: ConceptMemory | undefined): number {
  return Math.min(1, (cm?.successDays.length ?? 0) / 2);
}

/** Recall at `at` times the success gate; 0 without a card. */
export function conceptMastery(cm: ConceptMemory | undefined, at: Date): number {
  if (!cm?.card) return 0;
  return recall(cm.card, at) * successGate(cm);
}

/** Mastery 0 to 100 per module that homes a tested concept, read `HORIZON_DAYS` after `now`. */
export function moduleMastery(
  memory: MemoryState,
  content: MemoryContent,
  now: Date,
): ReadonlyMap<number, number> {
  const ahead = new Date(now.getTime() + HORIZON_DAYS * DAY_MS);
  const sums = new Map<number, { total: number; count: number }>();
  for (const [id, info] of content.concepts) {
    if (!info.tested) continue;
    const sum = sums.get(info.module) ?? { total: 0, count: 0 };
    sum.total += conceptMastery(memory.concepts.get(id), ahead);
    sum.count += 1;
    sums.set(info.module, sum);
  }
  const out = new Map<number, number>();
  for (const [module, { total, count }] of [...sums].sort((a, b) => a[0] - b[0])) {
    out.set(module, Math.round((100 * total) / count));
  }
  return out;
}

export type HexBand = 'outline' | 'faint' | 'light' | 'solid' | 'mastered';

/** The hex band of a mastery value; the top band needs a passed boss, else it stays `solid`. */
export function hexBand(mastery: number, bossPassed: boolean): HexBand {
  if (mastery >= 80) return bossPassed ? 'mastered' : 'solid';
  if (mastery >= 60) return 'solid';
  if (mastery >= 40) return 'light';
  if (mastery >= 20) return 'faint';
  return 'outline';
}

export const BAND_LABEL: Record<HexBand, string> = {
  outline: 'not started',
  faint: 'started',
  light: 'learning',
  solid: 'solid',
  mastered: 'mastered',
};
```

- [ ] **Step 5: Write the Next action**

`src/engine/next.ts`:

```ts
import { studyDayAt } from './day.ts';
import { CHUNK_SIZE, ITEM_SECONDS, type ReviewQueue } from './queue.ts';
import type { Progress, SessionState } from './replay.ts';

/**
 * The Next action (spec 4.6): the one thing Home suggests, the first that applies.
 * Mission safety and the extras line wait for missions and incidents in later phases.
 */

/** A lesson in course order; `first` marks a module's first lesson. */
export interface LessonRef {
  note: string;
  module: number;
  slug: string;
  title: string;
  first: boolean;
  minutes: number;
  checkConcepts: number;
}

export interface NextInput {
  lessons: readonly LessonRef[];
  progress: Progress;
  queue: ReviewQueue;
  currentLesson: string | null;
  today: string;
  tz: number;
}

export type NextAction =
  | { kind: 'resume'; session: SessionState; left: number }
  | { kind: 'review'; count: number }
  | { kind: 'continue'; lesson: LessonRef }
  | { kind: 'check'; module: number; concepts: number; lesson: LessonRef }
  | { kind: 'lesson'; lesson: LessonRef }
  | { kind: 'done' };

const RESUMABLE = new Set(['check', 'quiz', 'review']);

/** The newest unfinished check, quiz or today's review that still has a question to answer. */
function resumable(input: NextInput): { session: SessionState; left: number } | null {
  let best: { session: SessionState; left: number } | null = null;
  for (const s of input.progress.sessions.values()) {
    if (!RESUMABLE.has(s.mode) || s.submittedAt !== null || s.abandoned) continue;
    if (s.mode === 'review' && studyDayAt(new Date(s.startedAt), input.tz) !== input.today) continue;
    const left = s.qids.filter((qid) => !s.answers.has(qid)).length;
    if (left === 0) continue;
    const newer =
      !best ||
      s.startedAt > best.session.startedAt ||
      (s.startedAt === best.session.startedAt && s.sid > best.session.sid);
    if (newer) best = { session: s, left };
  }
  return best;
}

export function nextAction(input: NextInput): NextAction {
  const { lessons, progress, queue, currentLesson } = input;
  const resume = resumable(input);
  if (resume) return { kind: 'resume', ...resume };
  if (queue.items.length > 0) return { kind: 'review', count: Math.min(queue.items.length, CHUNK_SIZE) };
  const current = lessons.find((l) => l.note === currentLesson);
  if (current && !progress.lessonsDone.has(current.note)) return { kind: 'continue', lesson: current };
  if (!queue.lessonsAllowed) return { kind: 'done' };
  const unchecked = lessons.filter(
    (l) => progress.lessonsDone.has(l.note) && l.checkConcepts > 0 && !progress.checkScores.has(l.note),
  );
  const first = unchecked[0];
  if (first) {
    const group = unchecked.filter((l) => l.module === first.module);
    const concepts = group.reduce((sum, l) => sum + l.checkConcepts, 0);
    return { kind: 'check', module: first.module, concepts, lesson: first };
  }
  const lesson = lessons.find((l) => !progress.lessonsDone.has(l.note));
  if (lesson) return { kind: 'lesson', lesson };
  return { kind: 'done' };
}

/** The time estimate in whole minutes: 30 seconds per review or check item, a lesson's own minutes. */
export function nextMinutes(action: NextAction): number | null {
  const items = (count: number) => Math.ceil((count * ITEM_SECONDS) / 60);
  switch (action.kind) {
    case 'resume':
      return items(action.left);
    case 'review':
      return items(action.count);
    case 'check':
      return items(action.concepts);
    case 'continue':
    case 'lesson':
      return action.lesson.minutes;
    case 'done':
      return null;
  }
}
```

- [ ] **Step 6: Run the tests and see them pass**

```bash
pnpm test tests/unit/mastery.test.ts tests/unit/next.test.ts
pnpm typecheck
pnpm lint
```

Expected: `Tests  18 passed (18)`, and both other commands exit 0.

- [ ] **Step 7: Commit**

```bash
pnpm lint:fix
git add src/engine/mastery.ts src/engine/next.ts tests/unit/mastery.test.ts tests/unit/next.test.ts
git commit -m "Add module mastery and the Next action" -m "Phase 2 Task 7: mastery is recall a week ahead gated by two success days, with the hex bands of spec 3.8; nextAction picks resume, reviews, continue, Check yourself, the next lesson or Done for today, with time estimates."
```

## Task 8: Anti-grind tests, grind properties, golden journeys and the v1-memory backup fixture

**Files:**
- Create: `tests/unit/anti-grind.test.ts`, `tests/property/grind.property.test.ts`, `tests/fixtures/journeys/content.ts`, `tests/fixtures/journeys/journeys.ts`, `tests/unit/journeys.test.ts`, `tests/fixtures/backups/v1-memory.json`
- Generated by the tests, then committed: `tests/fixtures/journeys/{first-week,exam-crunch,comeback-10-days}.jsonl`, `tests/fixtures/journeys/{first-week,exam-crunch,comeback-10-days}.snapshot.json`, `tests/fixtures/backups/v1-memory.snapshot.json`
- Modify: `biome.json`, `tests/unit/backups.test.ts`
- Test: all of the above

This task adds no engine code: it pins what Tasks 3 to 7 built, so the anti-grind and property tests pass on their first run.
Step 4 proves they bite by breaking the engine on purpose and watching them fail.
The journeys and the backup fixture follow the Phase 1 snapshot rule: a missing `.jsonl` or `.snapshot.json` is written once by its test, read by hand, and committed; after an `ENGINE_VERSION` bump, delete the snapshots and rerun the tests in the same commit (spec 9).
Biome would reformat the journey snapshots and break the byte comparison, so `biome.json` ignores them, as it already ignores the backup snapshots.

- [ ] **Step 1: Keep Biome off the journey snapshots**

In `biome.json`, the `files.includes` list ends:

```json
      "!tests/fixtures/backups/*.snapshot.json",
      "!tests/fixtures/journeys/*.snapshot.json"
```

This adds the second line and the comma before it.

- [ ] **Step 2: Write the anti-grind test**

One `it` per Phase 2 row of spec 3.11, named after the row; the three rows whose features arrive later are `it.todo` so the table stays visible.

`tests/unit/anti-grind.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { betXp, expectedXp, SURE_BREAKEVEN } from '../../src/engine/bets.ts';
import { moduleMastery } from '../../src/engine/mastery.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { reviewQueue } from '../../src/engine/queue.ts';
import { effortBonus } from '../../src/engine/xp.ts';
import { timelineOf } from '../fixtures/events.ts';
import { answerOf, at, contentOf } from '../fixtures/memory.ts';

/** One test per Phase 2 row of the anti-grind audit (spec 3.11), named after the row. */
const CONTENT = contentOf([
  { id: 'oven', module: 1 },
  { id: 'proofing', module: 1 },
  { id: 'crust', module: 2 },
  { id: 'flour', module: 3 },
  { id: 'yeast', module: 3 },
  { id: 'salt', module: 3 },
  { id: 'water', module: 3 },
]);
type Log = readonly (readonly [string, NewEvent])[];
const memoryOf = (log: Log) => deriveMemory(timelineOf(log), CONTENT);
const right = (concept: string, qid: string, mode: 'check' | 'quiz' = 'check') =>
  answerOf({ concept, qid, mode, correct: true, sure: true });

describe('anti-grind audit (spec 3.11)', () => {
  it('Re-answering the same concept', () => {
    const first: Log = [[at('2026-10-10'), right('oven', 'q-oven-1')]];
    const five: Log = [
      ...first,
      ...[2, 3, 4, 5].map((n) => [at('2026-10-10', 10 + n), right('oven', `q-oven-${n}`)] as const),
    ];
    const once = memoryOf(first);
    const grind = memoryOf(five);
    expect(grind.xp).toBe(once.xp);
    expect(grind.xp).toBe(10);
    expect(grind.concepts.get('oven')?.card).toEqual(once.concepts.get('oven')?.card);
  });

  it('Re-running quizzes', () => {
    const quiz = (day: string): Log =>
      ['oven', 'proofing', 'crust', 'flour'].map(
        (concept, i) => [at(day, 10, i), right(concept, `q-${concept}-1`, 'quiz')] as const,
      );
    const memory = memoryOf([...quiz('2026-10-10'), ...quiz('2026-10-11')]);
    expect(memory.xpByDay.get('2026-10-10')).toBe(40);
    expect(memory.xpByDay.get('2026-10-11')).toBeUndefined();
    expect(memory.concepts.get('oven')?.card).toEqual(
      memoryOf(quiz('2026-10-10')).concepts.get('oven')?.card,
    );
  });

  it('Reviewing early', () => {
    const learn: Log = [[at('2026-10-10'), right('oven', 'q-oven-1')]];
    const early: Log = [
      ...learn,
      [at('2026-10-11'), right('oven', 'q-oven-1')],
      [at('2026-10-11', 11), right('oven', 'q-oven-2')],
      [at('2026-10-12'), right('oven', 'q-oven-3')],
    ];
    const memory = memoryOf(early);
    expect(memory.concepts.get('oven')?.card).toEqual(memoryOf(learn).concepts.get('oven')?.card);
    expect(memory.xpByDay.get('2026-10-11')).toBeUndefined();
    expect(memory.xpByDay.get('2026-10-12')).toBe(10);
    expect(effortBonus(0.97)).toBe(0);
  });

  it('Always pressing Sure', () => {
    for (let p = 0; p < SURE_BREAKEVEN - 0.005; p += 0.01) {
      expect(expectedXp(p, true)).toBeLessThan(expectedXp(p, false));
    }
    expect(betXp(false, true)).toBe(0);
    const memory = memoryOf([
      [at('2026-10-10'), answerOf({ concept: 'crust', correct: false, sure: false })],
      [at('2026-10-10', 11), answerOf({ concept: 'oven', correct: false, sure: true })],
    ]);
    const queue = reviewQueue(memory, CONTENT, new Date(at('2026-10-11')), 0);
    expect(queue.items).toEqual(['oven', 'crust']);
    expect(queue.misconceptions).toBe(1);
  });

  it('Failing on purpose', () => {
    const log = (correct: boolean): Log => [
      [at('2026-10-10'), answerOf({ concept: 'oven', correct, sure: true })],
      [at('2026-10-10', 11), answerOf({ concept: 'proofing', correct, sure: true })],
    ];
    const failed = memoryOf(log(false));
    expect(failed.xp).toBe(0);
    expect(failed.xpByEvent.size).toBe(0);
    const now = new Date(at('2026-10-10', 12));
    const wrongMastery = moduleMastery(failed, CONTENT, now).get(1) ?? 0;
    const rightMastery = moduleMastery(memoryOf(log(true)), CONTENT, now).get(1) ?? 0;
    expect(wrongMastery).toBeLessThan(rightMastery);
  });

  it('Cramming a module', () => {
    const module3 = ['flour', 'yeast', 'salt', 'water'];
    const round = (day: string, hour: number, variant: number): Log =>
      module3.map((concept, i) => [at(day, hour, i), right(concept, `q-${concept}-${variant}`)] as const);
    const cram = [...round('2026-10-10', 9, 1), ...round('2026-10-10', 10, 2), ...round('2026-10-10', 11, 3)];
    const crammed = moduleMastery(memoryOf(cram), CONTENT, new Date(at('2026-10-10', 12)));
    expect(crammed.get(3)).toBeLessThanOrEqual(41);
    const spaced = [...cram, ...round('2026-10-13', 10, 4)];
    const later = moduleMastery(memoryOf(spaced), CONTENT, new Date(at('2026-10-13', 12)));
    expect(later.get(3)).toBeGreaterThanOrEqual(85);
  });

  it.todo('Lightning spam (lightning arrives in Phase 4)');
  it.todo('Re-rolling a boss (bosses arrive in Phase 3)');
  it.todo('Peeking at mocks (mocks arrive in Phase 3)');
});
```

- [ ] **Step 3: Write the grind properties and the replay cost check**

The timing check replays 15,000 answers over the 130 journey concepts; it takes about 45 ms on Node, so the 1,000 ms bound only catches a quadratic step.

`tests/property/grind.property.test.ts`:

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Mode, NewEvent, StudyEvent } from '../../schemas/events.ts';
import { addDays, DAY_MS } from '../../src/engine/day.ts';
import { moduleMastery } from '../../src/engine/mastery.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { timelineOf } from '../fixtures/events.ts';
import { JOURNEY_CONTENT, variantId } from '../fixtures/journeys/content.ts';
import { answerOf, contentOf } from '../fixtures/memory.ts';

/** Grind invariance (spec 3.1 and 3.11): extra answers never pay or schedule twice, whatever the log. */
const CONTENT = contentOf([
  { id: 'oven', module: 1, aliases: ['old-oven'] },
  { id: 'proofing', module: 1 },
  { id: 'crust', module: 2 },
  { id: 'menu', module: 2, tested: false },
]);
const CONCEPTS = ['oven', 'proofing', 'crust', 'menu', 'old-oven', 'ghost'];
const MODES: Mode[] = ['check', 'quiz', 'review', 'lightning'];
const START = '2026-10-01';

type Item = readonly [string, NewEvent];

/** An ISO time `minute` minutes after 04:00 UTC on day `n` from the start, so it stays in that study day. */
const timeOf = (n: number, minute: number): string =>
  new Date(Date.parse(`${addDays(START, n)}T04:00:00.000Z`) + minute * 60_000).toISOString();

const itemArb = (days: { min: number; max: number }): fc.Arbitrary<Item> =>
  fc.oneof(
    {
      weight: 8,
      arbitrary: fc
        .record({
          day: fc.integer(days),
          minute: fc.integer({ min: 0, max: 1_400 }),
          concept: fc.constantFrom(...CONCEPTS),
          variant: fc.integer({ min: 1, max: 3 }),
          correct: fc.boolean(),
          sure: fc.boolean(),
          mode: fc.constantFrom(...MODES),
          relearn: fc.boolean(),
        })
        .map(
          (s): Item => [
            timeOf(s.day, s.minute),
            answerOf({
              concept: s.concept,
              qid: `q-${s.concept}-${s.variant}`,
              correct: s.correct,
              sure: s.sure,
              mode: s.mode,
              relearn: s.relearn,
            }),
          ],
        ),
    },
    {
      weight: 1,
      arbitrary: fc
        .record({ day: fc.integer(days), note: fc.constantFrom('m01/a', 'm02/b') })
        .map((s): Item => [timeOf(s.day, 600), { t: 'lesson.done', note: s.note }]),
    },
    {
      weight: 1,
      arbitrary: fc
        .record({ day: fc.integer(days), date: fc.constantFrom('2026-10-20', '2026-11-14', null) })
        .map((s): Item => [timeOf(s.day, 5), { t: 'settings', patch: { examDate: s.date } }]),
    },
  );

const sortItems = (items: readonly Item[]): Item[] =>
  [...items].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

/** A log of up to 40 events over the first 20 days. */
const historyArb = fc.array(itemArb({ min: 0, max: 19 }), { maxLength: 40 }).map(sortItems);

/** Answers to one concept on day 25, after any history: the first one, then `extra` more. */
const burstArb = (correct: boolean) =>
  fc
    .record({
      concept: fc.constantFrom('oven', 'proofing', 'crust'),
      firstSure: fc.boolean(),
      extra: fc.array(fc.record({ variant: fc.integer({ min: 1, max: 3 }), sure: fc.boolean() }), {
        minLength: 1,
        maxLength: 4,
      }),
    })
    .map(({ concept, firstSure, extra }) => {
      const first: Item = [
        timeOf(25, 60),
        answerOf({ concept, qid: `q-${concept}-1`, correct: true, sure: firstSure }),
      ];
      const more = extra.map(
        (e, i): Item => [
          timeOf(25, 120 + i),
          answerOf({ concept, qid: `q-${concept}-${e.variant}`, correct, sure: e.sure }),
        ],
      );
      return { concept, first, more };
    });

describe('grind invariance', () => {
  it('gives one to five right answers to a concept on one day the XP and card of the first alone', () => {
    fc.assert(
      fc.property(historyArb, burstArb(true), (history, { concept, first, more }) => {
        const once = deriveMemory(timelineOf([...history, first]), CONTENT);
        const many = deriveMemory(timelineOf([...history, first, ...more]), CONTENT);
        expect(many.xp).toBe(once.xp);
        expect(many.concepts.get(concept)?.card).toEqual(once.concepts.get(concept)?.card);
      }),
    );
  });

  it('gives any number of wrong answers after the first answer of a day the card of exactly one', () => {
    fc.assert(
      fc.property(historyArb, burstArb(false), (history, { concept, first, more }) => {
        const one = deriveMemory(timelineOf([...history, first, ...more.slice(0, 1)]), CONTENT);
        const all = deriveMemory(timelineOf([...history, first, ...more]), CONTENT);
        expect(all.concepts.get(concept)?.card).toEqual(one.concepts.get(concept)?.card);
        expect(all.xp).toBe(one.xp);
      }),
    );
  });

  it('derives the same state for any order of the same events', () => {
    fc.assert(
      fc.property(
        historyArb.chain((items) => {
          const events = timelineOf(items);
          return fc.tuple(fc.constant(events), fc.shuffledSubarray(events, { minLength: events.length }));
        }),
        ([events, shuffled]) => {
          expect(toPlain(deriveMemory(shuffled, CONTENT))).toEqual(toPlain(deriveMemory(events, CONTENT)));
        },
      ),
    );
  });

  it('never throws on unknown concept and question ids', () => {
    const looseArb = fc.array(
      fc.record({
        minute: fc.integer({ min: 0, max: 30 * 1_440 }),
        concept: fc.string(),
        qid: fc.string(),
        qv: fc.integer({ min: 1, max: 3 }),
        correct: fc.boolean(),
        sure: fc.boolean(),
        mode: fc.constantFrom(...MODES),
      }),
      { maxLength: 30 },
    );
    fc.assert(
      fc.property(looseArb, (steps) => {
        const items = sortItems(
          steps.map(
            (s): Item => [
              timeOf(0, s.minute),
              answerOf({
                concept: s.concept,
                qid: s.qid,
                qv: s.qv,
                correct: s.correct,
                sure: s.sure,
                mode: s.mode,
              }),
            ],
          ),
        );
        expect(() => deriveMemory(timelineOf(items), CONTENT)).not.toThrow();
        expect(() => deriveMemory(timelineOf(items), JOURNEY_CONTENT)).not.toThrow();
      }),
    );
  });

  it('never raises module mastery as time passes with no new event', () => {
    fc.assert(
      fc.property(
        historyArb,
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 1, max: 200 }),
        (items, start, wait) => {
          const memory = deriveMemory(timelineOf(items), CONTENT);
          const t0 = Date.parse(timeOf(20, 0)) + start * DAY_MS;
          const before = moduleMastery(memory, CONTENT, new Date(t0));
          const after = moduleMastery(memory, CONTENT, new Date(t0 + wait * DAY_MS));
          for (const [module, value] of after) expect(value).toBeLessThanOrEqual(before.get(module) ?? 0);
        },
      ),
    );
  });
});

describe('replay cost', () => {
  it('replays a 15,000-event log in under a second', () => {
    const concepts = [...JOURNEY_CONTENT.concepts.keys()];
    const items: Item[] = [];
    for (let day = 0; day < 100; day++) {
      for (let n = 0; n < 150; n++) {
        const concept = concepts[(day * 37 + n) % concepts.length] as string;
        items.push([
          timeOf(day, n * 5),
          answerOf({
            concept,
            qid: variantId(concept, n % 2 === 0 ? 'a' : 'b'),
            correct: (day + n) % 5 !== 0,
            sure: n % 3 !== 0,
            mode: n % 4 === 0 ? 'quiz' : 'review',
          }),
        ]);
      }
    }
    const events: StudyEvent[] = timelineOf(items);
    expect(events).toHaveLength(15_000);
    const started = performance.now();
    const memory = deriveMemory(events, JOURNEY_CONTENT);
    const elapsed = performance.now() - started;
    expect(memory.concepts.size).toBe(130);
    expect(elapsed).toBeLessThan(1_000);
  });
});
```

- [ ] **Step 4: Run both files, then prove they bite**

```bash
pnpm test tests/unit/anti-grind.test.ts tests/property/grind.property.test.ts
```

Expected: `Tests  12 passed | 3 todo (15)`.

Then break `src/engine/memory.ts` three ways, one at a time, rerun the same command after each, and restore the file with `git checkout src/engine/memory.ts`:

1. Let a not-due first answer pay its bet even for a question answered before (drop the never-answered condition): "Re-running quizzes" and "Reviewing early" fail.
2. Treat every answer as the first of its day (drop the `lastAnswerDay !== day` condition): "Re-answering the same concept", "Reviewing early" and both grind properties fail.
3. Apply the extra Again on every later wrong answer (drop the `extraAgainDay !== day` condition): "gives any number of wrong answers after the first answer of a day the card of exactly one" fails.

Expected after the restore: `git status --short src/engine` prints nothing, and the command passes again.

- [ ] **Step 5: Write the failing journeys test**

`tests/unit/journeys.test.ts`:

```ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { StudyEvent } from '../../schemas/events.ts';
import { dayStartAt, studyDayAt } from '../../src/engine/day.ts';
import { moduleMastery } from '../../src/engine/mastery.ts';
import { deriveMemory } from '../../src/engine/memory.ts';
import { reviewQueue } from '../../src/engine/queue.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { streakOf } from '../../src/engine/streak.ts';
import { JOURNEY_CONTENT, type JourneyName, journeyNow } from '../fixtures/journeys/content.ts';
import { comebackTenDays, examCrunch, firstWeek } from '../fixtures/journeys/journeys.ts';

/**
 * Golden journeys (spec 9): each builder's log is committed as `<name>.jsonl`, and its replay at `journeyNow`
 * as `<name>.snapshot.json`; a missing file is written once by this test, then committed.
 */
const dir = fileURLToPath(new URL('../fixtures/journeys/', import.meta.url));

const JOURNEYS: Record<JourneyName, () => StudyEvent[]> = {
  'first-week': firstWeek,
  'exam-crunch': examCrunch,
  'comeback-10-days': comebackTenDays,
};

function replay(name: JourneyName) {
  const now = journeyNow(name);
  const events = JOURNEYS[name]();
  const memory = deriveMemory(events, JOURNEY_CONTENT);
  return {
    events,
    memory,
    streak: streakOf(memory.qualifyingDays, studyDayAt(now, 0)),
    queue: reviewQueue(memory, JOURNEY_CONTENT, now, 0),
    mastery: moduleMastery(memory, JOURNEY_CONTENT, now),
  };
}

/** Compares `actual` with a committed file, writing the file first when it is missing. */
function golden(file: string, actual: string): void {
  const path = join(dir, file);
  if (!existsSync(path)) writeFileSync(path, actual);
  expect(actual).toBe(readFileSync(path, 'utf8'));
}

describe('golden journeys', () => {
  for (const name of Object.keys(JOURNEYS) as JourneyName[]) {
    it(`${name} replays to its committed log and snapshot`, () => {
      const { events, memory, streak, queue, mastery } = replay(name);
      golden(`${name}.jsonl`, `${events.map((e) => JSON.stringify(e)).join('\n')}\n`);
      golden(
        `${name}.snapshot.json`,
        `${JSON.stringify(toPlain({ memory, streak, queue, mastery }), null, 2)}\n`,
      );
    });
  }

  it('first-week ends with a 7-day streak and one freeze', () => {
    const { streak, memory } = replay('first-week');
    expect(streak).toEqual({ current: 7, longest: 7, freezes: 1, frozenDays: [] });
    expect(memory.concepts.get('bake-01-03')?.misconception).toBeNull();
    expect(memory.xp).toBeGreaterThan(0);
  });

  it('exam-crunch leaves no concept due after November 13', () => {
    const { memory } = replay('exam-crunch');
    expect(memory.examDate).toBe('2026-11-14');
    const examDay = dayStartAt('2026-11-14', 0).getTime();
    const cards = [...memory.concepts.values()].flatMap((cm) => (cm.card ? [cm.card] : []));
    expect(cards).toHaveLength(40);
    for (const card of cards) expect(Date.parse(card.due)).toBeLessThan(examDay);
  });

  it('comeback-10-days opens a catch-up with the streak reset and the longest kept', () => {
    const { queue, streak, memory } = replay('comeback-10-days');
    expect(memory.concepts.size).toBe(120);
    expect(queue.catchUp).toBe(true);
    expect(queue.due).toBeGreaterThan(100);
    expect(queue.items.length).toBeLessThanOrEqual(60);
    expect(queue.lessonsAllowed).toBe(false);
    expect(memory.catchUpPlans.get('2026-10-27')).toHaveLength(60);
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(5);
  });
});
```

```bash
pnpm test tests/unit/journeys.test.ts
```

Expected: FAIL with `Cannot find module '../fixtures/journeys/content.ts'`.

- [ ] **Step 6: Write the journey content and builders**

The builders are static scripts, never driven by the engine, so a change in the engine shows up as a snapshot diff and never as a different log.
Every id is made up: `bake-01-01` to `bake-13-10`, lesson notes `m01/lesson-1`, and question variants `q-bake-01-01-a` and `-b`.

`tests/fixtures/journeys/content.ts`:

```ts
import type { ConceptInfo, MemoryContent } from '../../../src/engine/memory.ts';

/**
 * Made-up content for the golden journeys (spec 9): 13 modules of 10 bakery concepts,
 * each with two question variants, in two lessons of 5 concepts per module.
 */
export const JOURNEY_MODULES = 13;
export const CONCEPTS_PER_MODULE = 10;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** The concept id of a module and a 1-based index, `bake-03-07`. */
export function conceptId(module: number, index: number): string {
  return `bake-${pad2(module)}-${pad2(index)}`;
}

/** The question id of a concept's variant, `q-bake-03-07-a`. */
export function variantId(concept: string, variant: 'a' | 'b'): string {
  return `q-${concept}-${variant}`;
}

/** The lesson note of a module's first or second lesson, `m03/lesson-2`. */
export function lessonNote(module: number, lesson: 1 | 2): string {
  return `m${pad2(module)}/lesson-${lesson}`;
}

/** The 5 concepts a lesson homes: the first 5 of its module for lesson 1, the last 5 for lesson 2. */
export function lessonConcepts(module: number, lesson: 1 | 2): string[] {
  const from = lesson === 1 ? 1 : 6;
  return Array.from({ length: 5 }, (_, i) => conceptId(module, from + i));
}

const PAIRS: readonly (readonly [string, string])[] = [
  [conceptId(1, 1), conceptId(1, 2)],
  [conceptId(3, 4), conceptId(5, 4)],
  [conceptId(7, 1), conceptId(7, 9)],
];

function build(): MemoryContent {
  const concepts = new Map<string, ConceptInfo>();
  const questionVersions = new Map<string, number>();
  for (let module = 1; module <= JOURNEY_MODULES; module++) {
    for (let index = 1; index <= CONCEPTS_PER_MODULE; index++) {
      const id = conceptId(module, index);
      const partners = PAIRS.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : []));
      concepts.set(id, { module, tested: true, confusableWith: partners, splitFrom: null });
      questionVersions.set(variantId(id, 'a'), 1);
      questionVersions.set(variantId(id, 'b'), 1);
    }
  }
  return { concepts, aliases: new Map(), questionVersions };
}

export const JOURNEY_CONTENT: MemoryContent = build();

export type JourneyName = 'first-week' | 'exam-crunch' | 'comeback-10-days';

const NOW: Record<JourneyName, string> = {
  'first-week': '2026-10-18T20:00:00.000Z',
  'exam-crunch': '2026-11-12T20:00:00.000Z',
  'comeback-10-days': '2026-10-27T12:00:00.000Z',
};

/** The moment each journey is read at, in offset 0. */
export function journeyNow(name: JourneyName): Date {
  return new Date(NOW[name]);
}
```

`tests/fixtures/journeys/journeys.ts`:

```ts
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
```

- [ ] **Step 7: Run the journeys twice: write the golden files, then compare against them**

```bash
pnpm test tests/unit/journeys.test.ts
pnpm test tests/unit/journeys.test.ts
git status --short tests/fixtures/journeys
```

Expected: `Tests  6 passed (6)` both times, and `git status` lists the two builder files and six new golden files (`first-week.jsonl` about 90 lines, `exam-crunch.jsonl` about 515, `comeback-10-days.jsonl` about 146, and their `.snapshot.json`).
Read each snapshot's `streak` and `queue` before committing: `first-week` shows a streak of 7 with 1 freeze and 1 concept due; `exam-crunch` shows `examDate` `2026-11-14`, nothing due and `next` at `2026-11-13T04:00:00.000Z` for 40 concepts; `comeback-10-days` shows `catchUp` true, 110 due, 50 items left and a streak of 0 with `longest` 5.

- [ ] **Step 8: Add the memory backup fixture**

A schema 1 backup over two study days in offset 120: a lesson check with one wrong Sure, its submit and `lesson.done`, the exam date, then a review the next day with a wrong answer, a right one and a relearn answer, plus kv `lastExportAt` and `examAsk`.

`tests/fixtures/backups/v1-memory.json`:

```json
{
  "format": "ccp-study-backup",
  "schemaVersion": 1,
  "appVersion": "0.3.0",
  "contentVersion": "c-1d2e3f",
  "exportedAt": "2026-10-13T07:00:00.000Z",
  "events": [
    {
      "id": "01JB2M0000MEMEMEMEMEMEM001",
      "at": "2026-10-12T07:00:00.000Z",
      "tz": 120,
      "day": "2026-10-12",
      "t": "session",
      "sid": "01JB2M0000MEMEMEMEMEMEMS01",
      "mode": "check",
      "phase": "start",
      "seed": 2718281828,
      "scope": "m01/what-a-bakery-cloud-is",
      "qids": ["q-7k2m9p", "q-8n3p4r"]
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM002",
      "at": "2026-10-12T07:01:00.000Z",
      "tz": 120,
      "day": "2026-10-12",
      "t": "answer",
      "sid": "01JB2M0000MEMEMEMEMEMEMS01",
      "mode": "check",
      "qid": "q-7k2m9p",
      "qv": 1,
      "concept": "shared-kitchen",
      "picked": ["b"],
      "correct": true,
      "sure": true,
      "ms": 7600
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM003",
      "at": "2026-10-12T07:02:00.000Z",
      "tz": 120,
      "day": "2026-10-12",
      "t": "answer",
      "sid": "01JB2M0000MEMEMEMEMEMEMS01",
      "mode": "check",
      "qid": "q-8n3p4r",
      "qv": 1,
      "concept": "per-minute-rental",
      "picked": [["l1", "r2"], ["l2", "r1"], ["l3", "r3"]],
      "correct": false,
      "sure": true,
      "ms": 14100
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM004",
      "at": "2026-10-12T07:03:00.000Z",
      "tz": 120,
      "day": "2026-10-12",
      "t": "session",
      "sid": "01JB2M0000MEMEMEMEMEMEMS01",
      "mode": "check",
      "phase": "submit",
      "seed": 2718281828
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM005",
      "at": "2026-10-12T07:03:00.000Z",
      "tz": 120,
      "day": "2026-10-12",
      "t": "lesson.done",
      "note": "m01/what-a-bakery-cloud-is"
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM006",
      "at": "2026-10-12T07:05:00.000Z",
      "tz": 120,
      "day": "2026-10-12",
      "t": "settings",
      "patch": {
        "examDate": "2026-11-14"
      }
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM007",
      "at": "2026-10-13T06:30:00.000Z",
      "tz": 120,
      "day": "2026-10-13",
      "t": "session",
      "sid": "01JB2M0000MEMEMEMEMEMEMS02",
      "mode": "review",
      "phase": "start",
      "seed": 1618033988,
      "scope": "review",
      "qids": ["q-3m5n7q", "q-7k2m9p"]
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM008",
      "at": "2026-10-13T06:31:00.000Z",
      "tz": 120,
      "day": "2026-10-13",
      "t": "answer",
      "sid": "01JB2M0000MEMEMEMEMEMEMS02",
      "mode": "review",
      "qid": "q-3m5n7q",
      "qv": 1,
      "concept": "per-minute-rental",
      "picked": ["c"],
      "correct": false,
      "sure": false,
      "ms": 11800
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM009",
      "at": "2026-10-13T06:32:00.000Z",
      "tz": 120,
      "day": "2026-10-13",
      "t": "answer",
      "sid": "01JB2M0000MEMEMEMEMEMEMS02",
      "mode": "review",
      "qid": "q-7k2m9p",
      "qv": 1,
      "concept": "shared-kitchen",
      "picked": ["b"],
      "correct": true,
      "sure": true,
      "ms": 5200
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM010",
      "at": "2026-10-13T06:33:00.000Z",
      "tz": 120,
      "day": "2026-10-13",
      "t": "answer",
      "sid": "01JB2M0000MEMEMEMEMEMEMS02",
      "mode": "review",
      "qid": "q-8n3p4r",
      "qv": 1,
      "concept": "per-minute-rental",
      "picked": [["l1", "r1"], ["l2", "r2"], ["l3", "r3"]],
      "correct": true,
      "sure": false,
      "ms": 9900,
      "relearn": true
    },
    {
      "id": "01JB2M0000MEMEMEMEMEMEM011",
      "at": "2026-10-13T06:34:00.000Z",
      "tz": 120,
      "day": "2026-10-13",
      "t": "session",
      "sid": "01JB2M0000MEMEMEMEMEMEMS02",
      "mode": "review",
      "phase": "submit",
      "seed": 1618033988
    }
  ],
  "kv": {
    "lastExportAt": {
      "value": "2026-10-13T07:00:00.000Z",
      "updatedAt": "2026-10-13T07:00:00.000Z"
    },
    "examAsk": {
      "value": "dismissed",
      "updatedAt": "2026-10-12T07:04:00.000Z"
    }
  }
}
```

In `tests/unit/backups.test.ts`, widen the file pattern so every `vN-<name>.json` fixture is replayed too:

```ts
const files = readdirSync(dir).filter((f) => /^v\d+(?:-[a-z0-9-]+)?\.json$/.test(f));
```

This replaces the line `const files = readdirSync(dir).filter((f) => /^v\d+\.json$/.test(f));`.

```bash
pnpm test tests/unit/backups.test.ts
git status --short tests/fixtures/backups
```

Expected: `Tests  3 passed (3)`, and `git status` lists `v1-memory.json` and the new `v1-memory.snapshot.json`, whose `answers` entry for `q-8n3p4r` holds two records, the second with `"relearn": true` and `"mode": "review"`.

- [ ] **Step 9: Run the whole check**

```bash
pnpm check
```

Expected: exit 0, with the Vitest summary ending `3 todo`.

- [ ] **Step 10: Commit**

```bash
pnpm lint:fix
git add biome.json tests/unit/anti-grind.test.ts tests/property/grind.property.test.ts tests/unit/journeys.test.ts tests/fixtures/journeys tests/unit/backups.test.ts tests/fixtures/backups/v1-memory.json tests/fixtures/backups/v1-memory.snapshot.json
git commit -m "Add the anti-grind tests and the golden journeys" -m "Phase 2 Task 8: one test per Phase 2 row of spec 3.11, grind-invariance properties with a 15,000-event replay bound, three golden journeys with committed logs and snapshots, and a schema 1 backup that carries a review, a relearn answer and an exam date."
```

---

## Task 9: Concept links and lesson sizes in the content index

**Files:**
- Modify: `schemas/chunks.ts`, `scripts/content/build.ts`, `tests/unit/build.test.ts`, `tests/unit/keys.test.ts`, `tests/unit/nav.test.ts`
- Test: `tests/unit/build.test.ts`, `tests/unit/build-real.test.ts`

This task depends on nothing in Phase 2 and owns `schemas/chunks.ts` and `scripts/content/build.ts`.
`ConceptMeta` gains `tasks`, `confusableWith`, `aliases` and `splitFrom`, which the memory replay (Task 3) and the queue (Task 5) read through `memoryContentOf` (Task 12).
`LessonMeta` gains `minutes` and `checkConcepts`, which the Next action (Task 7) reads for its time estimates and for "Check yourself".
The build exports two pure helpers, `readingMinutes(body)` and `confusableLinks(concepts)`, so their rules have table tests of their own.
`tests/unit/keys.test.ts` and `tests/unit/nav.test.ts` build `LessonMeta` literals, so their `lesson` helpers gain the two new fields here, or `pnpm typecheck` fails; Task 12 later adds cases to both files and keeps these helpers.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/build.test.ts`, replace the import block and the constants above `MULTI` with:

```ts
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentIndex, ModuleChunk, SearchChunk } from '../../schemas/chunks.ts';
import type { Concept } from '../../schemas/concept.ts';
import { buildContent, confusableLinks, readingMinutes } from '../../scripts/content/build.ts';
import { CONCEPTS_FILE, loadContext } from '../../scripts/content/lib/context.ts';
import { normalize } from '../../src/app/search.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const LESSON_ROUTE = '#/m/01/l/what-a-bakery-cloud-is';
const QUESTIONS_FILE = 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml';
const LESSON_SLUG = 'what-a-bakery-cloud-is';
```

In the test `indexes concepts, the glossary and missions with their routes`, replace the `expect(index.concepts).toEqual([...])` call with:

```ts
    expect(index.concepts).toEqual([
      {
        id: 'shared-kitchen',
        name: 'Shared kitchen',
        home: 'm01/what-a-bakery-cloud-is',
        anchor: 'shared-kitchen',
        tested: true,
        tasks: ['1.1'],
        confusableWith: ['per-minute-rental'],
        aliases: [],
        splitFrom: null,
      },
      {
        id: 'per-minute-rental',
        name: 'Per-minute rental',
        home: 'm01/what-a-bakery-cloud-is',
        anchor: 'paying-by-the-minute',
        tested: true,
        tasks: ['4.1'],
        confusableWith: ['shared-kitchen'],
        aliases: [],
        splitFrom: null,
      },
    ]);
```

The fixture registry writes `confusableWith: [shared-kitchen]` on `per-minute-rental` only, so `shared-kitchen` gets its link from the other side.

Append to the end of `tests/unit/build.test.ts`:

```ts
describe('concept links and lesson sizes in the index', () => {
  const lessonOf = (index: ContentIndex) => index.modules[0]?.lessons.find((l) => l.slug === LESSON_SLUG);

  it('counts the reading minutes of each lesson and the concepts its check can ask about', () => {
    const lesson = lessonOf(build().index);
    expect(lesson?.minutes).toBe(1);
    expect(lesson?.checkConcepts).toBe(1);
    const root = makeFixtureRoot();
    replaceIn(root, QUESTIONS_FILE, 'status: draft', 'status: live');
    expect(lessonOf(build(root).index)?.checkConcepts).toBe(2);
  });

  it('counts a live question filed under an alias for the surviving concept', () => {
    const root = makeFixtureRoot();
    replaceIn(root, CONCEPTS_FILE, 'tasks: ["1.1"]', 'tasks: ["1.1"]\n  aliases: [central-oven]');
    replaceIn(root, QUESTIONS_FILE, 'concept: shared-kitchen', 'concept: central-oven');
    const { index } = build(root);
    expect(index.concepts[0]?.aliases).toEqual(['central-oven']);
    expect(lessonOf(index)?.checkConcepts).toBe(1);
  });

  it('never counts an untested concept, and copies splitFrom', () => {
    const root = makeFixtureRoot();
    replaceIn(root, CONCEPTS_FILE, 'tasks: ["1.1"]', 'tasks: ["1.1"]\n  tested: false');
    replaceIn(root, CONCEPTS_FILE, 'tasks: ["4.1"]', 'tasks: ["4.1"]\n  splitFrom: kitchen-rental');
    const { index } = build(root);
    expect(lessonOf(index)?.checkConcepts).toBe(0);
    expect(index.concepts.map((c) => [c.id, c.tested, c.splitFrom])).toEqual([
      ['shared-kitchen', false, null],
      ['per-minute-rental', true, 'kitchen-rental'],
    ]);
  });
});

describe('readingMinutes', () => {
  it('gives one minute per 200 words, rounded up, and at least one', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes('dough '.repeat(200))).toBe(1);
    expect(readingMinutes('dough '.repeat(201))).toBe(2);
    expect(readingMinutes('dough '.repeat(1000))).toBe(5);
  });

  it('counts the text of a link and not its target', () => {
    const link = '[proof](https://example.com/a/b/c/d/e/f/g) ';
    expect(readingMinutes(link.repeat(200))).toBe(1);
    expect(readingMinutes(`${link.repeat(200)}rise`)).toBe(2);
  });
});

describe('confusableLinks', () => {
  const concept = (id: string, confusableWith?: string[]): Concept => ({
    id,
    name: id,
    home: 'm01/what-a-bakery-cloud-is',
    anchor: id,
    tasks: ['1.1'],
    ...(confusableWith === undefined ? {} : { confusableWith }),
  });

  it('makes one-sided links symmetric, own list first, then registry order', () => {
    const links = confusableLinks([concept('rye', ['spelt']), concept('spelt'), concept('oat', ['rye'])]);
    expect(links.get('rye')).toEqual(['spelt', 'oat']);
    expect(links.get('spelt')).toEqual(['rye']);
    expect(links.get('oat')).toEqual(['rye']);
  });

  it('drops duplicates and self links and keeps at most 3', () => {
    const links = confusableLinks([
      concept('rye', ['spelt', 'rye']),
      concept('spelt', ['rye']),
      concept('oat', ['rye']),
      concept('barley', ['rye']),
      concept('millet', ['rye']),
    ]);
    expect(links.get('rye')).toEqual(['spelt', 'oat', 'barley']);
    expect(links.get('spelt')).toEqual(['rye']);
    expect(links.get('millet')).toEqual(['rye']);
  });

  it('gives an empty list to a concept nothing links', () => {
    expect(confusableLinks([concept('rye')]).get('rye')).toEqual([]);
  });
});
```

In `tests/unit/keys.test.ts`, replace the `lesson` helper with:

```ts
const lesson = (n: number, slug: string) => ({
  n,
  slug,
  title: slug,
  concepts: [],
  minutes: 1,
  checkConcepts: 0,
});
```

In `tests/unit/nav.test.ts`, replace the `lesson` helper with:

```ts
const lesson = (n: number, slug: string) => ({
  n,
  slug,
  title: `Title of ${slug}`,
  concepts: [],
  minutes: 1,
  checkConcepts: 0,
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/build.test.ts
```

Expected: FAIL with `9 failed | 10 passed (19)`: the concepts lack the new fields, the lessons lack `minutes` and `checkConcepts`, and `readingMinutes` and `confusableLinks` are not functions yet.

- [ ] **Step 3: Add the fields to the chunk types**

In `schemas/chunks.ts`, replace `LessonMeta` with:

```ts
export interface LessonMeta {
  n: number;
  slug: string;
  title: string;
  concepts: string[];
  /** Reading time: the note's words over 200, rounded up, at least 1 (spec 4.6). */
  minutes: number;
  /** Tested concepts homed in the lesson that have a live practice question, so its check asks this many. */
  checkConcepts: number;
}
```

and replace `ConceptMeta` with:

```ts
export interface ConceptMeta {
  id: string;
  name: string;
  home: string;
  anchor: string;
  tested: boolean;
  /** Blueprint task ids, copied from the registry. */
  tasks: string[];
  /** Symmetric and capped at 3 by the build (spec 2.4); the queue uses it for placement only (spec 3.7). */
  confusableWith: string[];
  /** Old ids that now mean this concept; replay resolves answers filed under them (spec 8.4). */
  aliases: string[];
  /** The old concept this one was split from; replay copies its card (spec 2.4). */
  splitFrom: string | null;
}
```

- [ ] **Step 4: Fill them in the build**

In `scripts/content/build.ts`, add two imports, so the import block reads:

```ts
import { createHash } from 'node:crypto';
import type {
  ConceptMeta,
  ContentIndex,
  GlossaryItem,
  LessonChunk,
  LessonMeta,
  MissionMeta,
  ModuleChunk,
  ModuleMeta,
  QuestionView,
  SearchChunk,
  SearchEntry,
} from '../../schemas/chunks.ts';
import type { Concept } from '../../schemas/concept.ts';
import { normalize } from '../../src/app/search.ts';
import {
  CONCEPTS_FILE,
  type Context,
  type LessonNote,
  type ModuleNote,
  type Note,
  type QuestionEntry,
} from './lib/context.ts';
import { evidenceForm, noteLines, sectionAt } from './lib/evidence.ts';
import { parseGlossary, termMatcher } from './lib/glossary.ts';
import { renderDoc, renderInline, routeOf } from './lib/render.ts';
import { stripMarkdown, words } from './lib/text.ts';
```

Insert the two helpers directly above `const sha256 = ...`:

```ts
const WORDS_PER_MINUTE = 200;
const MAX_CONFUSABLE = 3;

/** A lesson's reading time in whole minutes, at least 1 (spec 4.6). */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.ceil(words(stripMarkdown(body)).length / WORDS_PER_MINUTE));
}

/**
 * `confusableWith` made symmetric (spec 2.4): each concept's own list in order, then every concept that lists it,
 * in registry order, without itself or duplicates, the first 3 kept.
 */
export function confusableLinks(concepts: readonly Concept[]): Map<string, string[]> {
  const links = new Map<string, string[]>();
  for (const c of concepts) {
    const others = concepts.filter((o) => o.confusableWith?.includes(c.id)).map((o) => o.id);
    const unique = [...new Set([...(c.confusableWith ?? []), ...others])].filter((id) => id !== c.id);
    links.set(c.id, unique.slice(0, MAX_CONFUSABLE));
  }
  return links;
}
```

In `buildContent`, replace the line `const questionVersions: Record<string, number> = {};` with:

```ts
  const questionVersions: Record<string, number> = {};
  const aliasOf = new Map(ctx.concepts.flatMap((c) => (c.aliases ?? []).map((a) => [a, c.id] as const)));
  const practised = new Set(live.map(({ q }) => aliasOf.get(q.concept) ?? q.concept));
  const checkConceptsOf = (noteId: string): number =>
    ctx.concepts.filter((c) => c.home === noteId && c.tested !== false && practised.has(c.id)).length;
```

Replace the `lessons.push({ ... })` call with:

```ts
      lessons.push({
        n: note.number,
        slug: note.slugFromPath,
        title: note.fm.title,
        concepts: [...note.fm.concepts],
        minutes: readingMinutes(note.body),
        checkConcepts: checkConceptsOf(note.id),
      });
```

Replace the concepts block, from `const concepts: ConceptMeta[] = ctx.concepts.map((c) => {` to its closing `});`, with:

```ts
  const links = confusableLinks(ctx.concepts);
  const concepts: ConceptMeta[] = ctx.concepts.map((c) => {
    const home = notesById.get(c.home);
    if (home === undefined) throw new Error(`${CONCEPTS_FILE}: [${c.id}] home ${c.home} is not a note`);
    search.push({
      kind: 'concept',
      title: c.name,
      detail: home.kind === 'lesson' && home.fm !== null ? home.fm.title : home.id,
      route: `${routeOf(home)}/${c.anchor}`,
      text: normalize([c.name, ...(c.aliases ?? [])].join(' ')),
    });
    return {
      id: c.id,
      name: c.name,
      home: c.home,
      anchor: c.anchor,
      tested: c.tested !== false,
      tasks: [...c.tasks],
      confusableWith: links.get(c.id) ?? [],
      aliases: [...(c.aliases ?? [])],
      splitFrom: c.splitFrom ?? null,
    };
  });
```

- [ ] **Step 5: Run the tests and see them pass**

```bash
pnpm test tests/unit/build.test.ts tests/unit/build-real.test.ts
pnpm typecheck
pnpm check
```

Expected: `Tests  25 passed (25)` for the two files, `tsc --noEmit` prints nothing, and `pnpm check` exits 0.
`build-real.test.ts` still holds every chunk budget; on the real content the Module 1 lessons read about 2 to 4 minutes, `what-is-cloud-computing` has `checkConcepts` 6, Module 2 lessons have 0 until Task 19 makes their questions live, and about 289 of the 445 concepts carry a confusable link.

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix
git add schemas/chunks.ts scripts/content/build.ts tests/unit/build.test.ts tests/unit/keys.test.ts tests/unit/nav.test.ts
git commit -m "Add concept links and lesson sizes to the content index" -m "Concepts carry their tasks, aliases, splitFrom and a symmetric confusableWith capped at 3; lessons carry their reading minutes and the number of concepts their check can ask about."
```

## Task 10: The Phase 2 kv keys and local migrations

**Files:**
- Modify: `src/store/kv.ts`, `src/store/migrations/index.ts`, `tests/unit/migrations.test.ts`, `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`
- Test: `tests/unit/migrations.test.ts`

This task depends on nothing in Phase 2 and owns `src/store/kv.ts` and `src/store/migrations/index.ts`.
`migrate` takes its steps and target as arguments, so tests can prove a step without a real schema 2, and `migrateLocal` decides whether the browser's own log needs migrating when the app opens.
The app wiring (the `preMigration` copy, the rewrite and the `schemaVersion` stamp in `initStore`) lands in Task 12.
`migrateLocal` reuses `migrate`'s messages, so a log from a newer app throws `This backup is from a newer version of the app (schema N); update the app first`, the message Phase 1 already shows on import.

- [ ] **Step 1: Write the failing tests**

Replace `tests/unit/migrations.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { KV_KEYS } from '../../src/store/kv.ts';
import {
  type LocalData,
  MIGRATIONS,
  type Migration,
  migrate,
  migrateLocal,
} from '../../src/store/migrations/index.ts';

/** A made-up step from schema 1 to 2 that renames every answer's `ms` to `millis`. */
const renameMs: Migration = (data) => ({
  ...data,
  events: (data.events as Record<string, unknown>[]).map(({ ms, ...rest }) =>
    ms === undefined ? rest : { ...rest, millis: ms },
  ),
});

const LOCAL: LocalData = {
  events: [{ id: '01J9Z8Y7X6W5V4T3S2R1Q0P9N8', t: 'answer', ms: 4200 }],
  kv: { lastExportAt: { value: '2026-10-09T08:00:00.000Z', updatedAt: '2026-10-09T08:00:00.000Z' } },
};

describe('migrate', () => {
  it('has no steps yet', () => {
    expect(MIGRATIONS).toEqual([]);
  });

  it('passes schema 1 through unchanged', () => {
    const data = { format: 'ccp-study-backup', schemaVersion: 1, events: [], kv: {} };
    expect(migrate(data)).toEqual(data);
  });

  it('refuses a backup from a newer schema', () => {
    expect(() => migrate({ schemaVersion: 2 })).toThrow(
      'This backup is from a newer version of the app (schema 2); update the app first',
    );
  });

  it('refuses a missing or broken schema version', () => {
    expect(() => migrate({})).toThrow();
    expect(() => migrate({ schemaVersion: 0 })).toThrow();
    expect(() => migrate({ schemaVersion: '1' })).toThrow();
  });

  it('runs injected steps up to an injected target', () => {
    const out = migrate({ schemaVersion: 1, events: LOCAL.events, kv: {} }, [renameMs], 2);
    expect(out).toEqual({
      schemaVersion: 2,
      events: [{ id: '01J9Z8Y7X6W5V4T3S2R1Q0P9N8', t: 'answer', millis: 4200 }],
      kv: {},
    });
  });

  it('names the missing step when the steps stop short of the target', () => {
    expect(() => migrate({ schemaVersion: 1, events: [] }, [renameMs], 3)).toThrow(
      'No migration from schema 2',
    );
  });
});

describe('migrateLocal', () => {
  it('treats a log with no stored version as schema 1 and leaves it alone', () => {
    const out = migrateLocal(null, LOCAL);
    expect(out).toEqual({ from: 1, data: LOCAL, migrated: false });
    expect(out.data).toBe(LOCAL);
  });

  it('leaves a log at the current version alone', () => {
    expect(migrateLocal(1, LOCAL)).toEqual({ from: 1, data: LOCAL, migrated: false });
  });

  it('runs the steps from the stored version and returns the new log and kv', () => {
    expect(migrateLocal(1, LOCAL, [renameMs], 2)).toEqual({
      from: 1,
      data: {
        events: [{ id: '01J9Z8Y7X6W5V4T3S2R1Q0P9N8', t: 'answer', millis: 4200 }],
        kv: LOCAL.kv,
      },
      migrated: true,
    });
  });

  it('refuses a log written by a newer version of the app', () => {
    expect(() => migrateLocal(3, LOCAL)).toThrow(
      'This backup is from a newer version of the app (schema 3); update the app first',
    );
  });
});

describe('KV_KEYS', () => {
  it('names every key the app writes', () => {
    expect(KV_KEYS).toEqual({
      lastExportAt: 'lastExportAt',
      examAsk: 'examAsk',
      engineVersion: 'engineVersion',
      currentLesson: 'currentLesson',
      schemaVersion: 'schemaVersion',
      preMigration: 'preMigration',
    });
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/migrations.test.ts
```

Expected: FAIL with `7 failed | 4 passed (11)`: `migrateLocal is not a function`, the injected target is ignored, and `KV_KEYS` holds only `lastExportAt`.

- [ ] **Step 3: Add the kv keys**

In `src/store/kv.ts`, replace the `KV_KEYS` declaration and its comment with:

```ts
/**
 * Keyed records with `updatedAt` (spec 8.1), merged per key by the newer `updatedAt` on import.
 * `examAsk` is `'dismissed'` after Not now (spec 7.5); `engineVersion` is the `ENGINE_VERSION` whose
 * `Rules updated, progress recalculated.` line was dismissed (spec 8.2); `currentLesson` is the note id of the
 * lesson last opened, because reading writes no event (spec 4.6); `schemaVersion` is the storage version of the
 * local log, and `preMigration` holds `{ events, kv }` as they were before the last local migration (spec 8.2).
 */
export const KV_KEYS = {
  lastExportAt: 'lastExportAt',
  examAsk: 'examAsk',
  engineVersion: 'engineVersion',
  currentLesson: 'currentLesson',
  schemaVersion: 'schemaVersion',
  preMigration: 'preMigration',
} as const;
```

- [ ] **Step 4: Make the steps injectable and add `migrateLocal`**

Replace `src/store/migrations/index.ts` with:

```ts
import { SCHEMA_VERSION } from '../../../schemas/version.ts';
import type { KvRecords } from '../kv.ts';

/**
 * Schema migrations (spec 8.2): one pure step per storage version, run when the app opens and on every import.
 * `MIGRATIONS[i]` turns schema `i + 1` into schema `i + 2`; `tests/fixtures/backups/vN.json` keeps every past schema.
 */
export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: readonly Migration[] = [];

/** Runs the steps from `data.schemaVersion` up to `target`; tests inject made-up steps and targets. */
export function migrate(
  data: Record<string, unknown>,
  steps: readonly Migration[] = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): Record<string, unknown> {
  const from = data.schemaVersion;
  if (typeof from !== 'number' || !Number.isInteger(from) || from < 1) {
    throw new Error('This backup has no valid schema version');
  }
  if (from > target) {
    throw new Error(`This backup is from a newer version of the app (schema ${from}); update the app first`);
  }
  let out = data;
  for (let version = from; version < target; version++) {
    const step = steps[version - 1];
    if (!step) throw new Error(`No migration from schema ${version}`);
    out = step(out);
  }
  return { ...out, schemaVersion: target };
}

/** The browser's stored log and kv records, as the app reads them before replay. */
export interface LocalData {
  events: unknown[];
  kv: KvRecords;
}

/**
 * Migrates the browser's own data when the app opens (spec 8.2); `stored` is kv `schemaVersion`, and a log
 * written before the app stamped it (null) is schema 1. The caller keeps the pre-migration copy.
 */
export function migrateLocal(
  stored: number | null,
  data: LocalData,
  steps: readonly Migration[] = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): { from: number; data: LocalData; migrated: boolean } {
  const from = stored ?? 1;
  if (from === target) return { from, data, migrated: false };
  const out = migrate({ schemaVersion: from, events: data.events, kv: data.kv }, steps, target);
  return { from, data: { events: out.events as unknown[], kv: out.kv as KvRecords }, migrated: true };
}
```

`kv.ts` imports only types from `idb.ts`, and `migrations/index.ts` imports only the `KvRecords` type from `kv.ts`, so `parseBackup`'s dynamic import chain stays as small as before.

- [ ] **Step 5: Name the new keys in the spec**

In `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, section 8.1, replace the `kv` row of the stores table with:

```markdown
| `kv` | ADR drafts, lab working state, active exam session (seed, item order, `deadline`), mission ticks, `plan` (`{ plan, credits, endsOn, services: Record<string, boolean>, recordedAt }`, from Mission 0), `examAsk`, `rankSeen`, `lastExportAt`, `currentLesson` (the lesson last opened, for Next), `engineVersion` (the engine whose "Rules updated" line was dismissed), `schemaVersion` (the storage version of the local log) and `preMigration` (the log and `kv` as they were before the last local migration); each value has `updatedAt` | yes |
```

Section 8.2's bullet "Migrations run when the app opens and on every import, and one pre-migration copy is kept in `kv`." stays as it is, because `preMigration` is that copy.

- [ ] **Step 6: Run the tests and see them pass**

```bash
pnpm test tests/unit/migrations.test.ts tests/unit/backup.test.ts tests/unit/backups.test.ts
pnpm check
```

Expected: `Tests  30 passed (30)` for the three files (import still migrates through the defaults), and `pnpm check` exits 0.

- [ ] **Step 7: Commit**

```bash
pnpm lint:fix
git add src/store/kv.ts src/store/migrations/index.ts tests/unit/migrations.test.ts docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
git commit -m "Add the Phase 2 kv keys and local migrations" -m "KV_KEYS names examAsk, engineVersion, currentLesson, schemaVersion and preMigration; migrate takes injectable steps and a target, and migrateLocal decides whether the stored log needs migrating on open."
```

## Task 11: The offline service worker

**Files:**
- Create: `scripts/lib/sw-manifest.ts`, `scripts/sw-plugin.ts`, `src/sw.ts`, `tests/unit/sw-manifest.test.ts`, `tests/e2e/offline.spec.ts`
- Modify: `vite.config.ts`, `src/main.tsx`, `scripts/check-budgets.ts`, `playwright.config.ts`, `tests/e2e/helpers.ts`
- Test: `tests/unit/sw-manifest.test.ts`, `tests/e2e/offline.spec.ts`

This task depends on nothing in Phase 2 and owns `tests/e2e/helpers.ts` and `playwright.config.ts`.
`sw.js` precaches `/` and every build file, serves navigations network-first with the cached `/index.html` as the offline fallback, and serves everything else cache-first; it never calls `skipWaiting`, so a new version takes over on the next launch.
`scripts/site-deploy.ts` already uploads `sw.js` with `no-cache` and invalidates it (spec 1.4), and the CSP's `default-src 'self'` already allows a same-origin worker, so neither changes.
Four facts the prototype of this task found shape the code below:
- The minifier writes the placeholder string as a template literal (`` `__SW_MANIFEST__` ``), so `injectManifest` accepts single, double and back quotes.
- A `.ts` file with no `import` or `export` is a global script to TypeScript, where a function named `navigation` clashes with the DOM's `window.navigation`; `src/sw.ts` ends its header with `export {};`, which makes it a module for the type checker and emits nothing, so `dist/sw.js` stays one classic script.
- `vite preview` sends `Vary: Origin`, and the page's module script and stylesheet requests carry an `Origin` header that the precache requests lack, so the worker matches with `ignoreVary: true`; without it the page loads offline with no script and no styles.
- Playwright's WebKit fails every request under `context.setOffline(true)`, even the ones a service worker answers (`WebKit encountered an internal error`), although the worker registers and controls the page there; so the offline tests run in `chromium-desktop` and skip `webkit-mobile` with that reason.
The offline review case of spec 9 e2e 6 needs Next and the review route, which arrive in Tasks 12 to 15, so this task proves the same path with the module quiz, whose chunk is never loaded online, and Task 18 adds the review case to `tests/e2e/offline.spec.ts`.

- [ ] **Step 1: Write the failing manifest tests**

Create `tests/unit/sw-manifest.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { injectManifest, SW_PLACEHOLDER, swManifest } from '../../scripts/lib/sw-manifest.ts';

const BUILD = [
  'sw.js',
  'index.html',
  'content/m02.2efa04cd.json',
  'assets/index-BmD2kQ9x.js',
  'content/index.328894ee.json',
  'assets/index-BmD2kQ9x.js.map',
  'content/m01.bf78409a.json',
  'assets/index-C4f1aZ7e.css',
  'deploys.json',
];
const HTML = '<!doctype html><title>CCP Study</title>';

describe('swManifest', () => {
  it('lists / first, then every build file sorted, without sw.js, deploys.json and source maps', () => {
    expect(swManifest(BUILD, HTML).files).toEqual([
      '/',
      '/assets/index-BmD2kQ9x.js',
      '/assets/index-C4f1aZ7e.css',
      '/content/index.328894ee.json',
      '/content/m01.bf78409a.json',
      '/content/m02.2efa04cd.json',
      '/index.html',
    ]);
  });

  it('names the version after the file list and index.html', () => {
    const { version } = swManifest(BUILD, HTML);
    expect(version).toMatch(/^sw-[0-9a-f]{12}$/);
    expect(swManifest([...BUILD].reverse(), HTML).version).toBe(version);
    const renamed = BUILD.map((f) => (f === 'content/m02.2efa04cd.json' ? 'content/m02.0badc0de.json' : f));
    expect(swManifest(renamed, HTML).version).not.toBe(version);
    expect(swManifest(BUILD, `${HTML}\n`).version).not.toBe(version);
  });
});

describe('injectManifest', () => {
  const manifest = { version: 'sw-0123456789ab', files: ['/', '/index.html'] };
  const json = JSON.stringify(manifest);

  it('replaces the placeholder in single, double or back quotes with the manifest as JSON', () => {
    expect(injectManifest(`const m='${SW_PLACEHOLDER}';use(m);`, manifest)).toBe(`const m=${json};use(m);`);
    expect(injectManifest(`const m = "${SW_PLACEHOLDER}";`, manifest)).toBe(`const m = ${json};`);
    expect(injectManifest(`var{version:e,files:t}=\`${SW_PLACEHOLDER}\`,n=1;`, manifest)).toBe(
      `var{version:e,files:t}=${json},n=1;`,
    );
  });

  it('leaves a placeholder with mismatched quotes alone', () => {
    expect(() => injectManifest(`m='${SW_PLACEHOLDER}"`, manifest)).toThrow(
      'sw.js has no manifest placeholder',
    );
  });

  it('keeps dollar signs in file names as they are', () => {
    const odd = { version: 'sw-0123456789ab', files: ["/assets/a$'b.js"] };
    expect(injectManifest(`x('${SW_PLACEHOLDER}')`, odd)).toBe(`x(${JSON.stringify(odd)})`);
  });

  it('refuses code with no placeholder or with more than one', () => {
    expect(() => injectManifest('const m = {};', manifest)).toThrow('sw.js has no manifest placeholder');
    expect(() => injectManifest(`a('${SW_PLACEHOLDER}');b("${SW_PLACEHOLDER}")`, manifest)).toThrow(
      'sw.js has more than one manifest placeholder',
    );
  });
});
```

- [ ] **Step 2: Run them and see them fail**

```bash
pnpm test tests/unit/sw-manifest.test.ts
```

Expected: FAIL with `Cannot find module '../../scripts/lib/sw-manifest.ts'`.

- [ ] **Step 3: Write the manifest helpers**

Create `scripts/lib/sw-manifest.ts`:

```ts
import { createHash } from 'node:crypto';

/** The string `src/sw.ts` holds where the build writes the precache manifest. */
export const SW_PLACEHOLDER = '__SW_MANIFEST__';

/** What the service worker precaches, and the version that names its cache. */
export interface SwManifest {
  version: string;
  files: string[];
}

/** Build files the worker never caches: itself, the deploy log and source maps. */
const SKIPPED = new Set(['sw.js', 'deploys.json']);
/** The placeholder as a string literal in any quote style; the minifier writes it as a template literal. */
const PLACEHOLDER = new RegExp(`(['"\`])${SW_PLACEHOLDER}\\1`, 'g');

/**
 * The precache manifest of a build (spec 1.4): `/` first, then every build path from the site root, sorted;
 * the version changes whenever a file name or `index.html` changes, so each deploy gets a new cache.
 */
export function swManifest(files: readonly string[], indexHtml: string): SwManifest {
  const kept = files
    .filter((file) => !SKIPPED.has(file) && !file.endsWith('.map'))
    .map((file) => `/${file}`)
    .sort();
  const list = ['/', ...kept];
  const hash = createHash('sha256')
    .update(`${list.join('\n')}\n${indexHtml}`, 'utf8')
    .digest('hex');
  return { version: `sw-${hash.slice(0, 12)}`, files: list };
}

/** Writes the manifest over the one quoted placeholder in the built worker, in single, double or back quotes. */
export function injectManifest(code: string, manifest: SwManifest): string {
  const count = code.match(PLACEHOLDER)?.length ?? 0;
  if (count === 0) throw new Error('sw.js has no manifest placeholder');
  if (count > 1) throw new Error('sw.js has more than one manifest placeholder');
  const json = JSON.stringify(manifest);
  return code.replace(PLACEHOLDER, () => json);
}
```

The replacement is a function, so a `$` in a file name is never read as a replacement pattern.

- [ ] **Step 4: Run the manifest tests and see them pass**

```bash
pnpm test tests/unit/sw-manifest.test.ts
```

Expected: `Tests  6 passed (6)`.

- [ ] **Step 5: Block service workers in every other e2e test, and add `seedEvents`**

In `playwright.config.ts`, replace the `use` block with:

```ts
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // The production build registers a cache-first service worker; only tests/e2e/offline.spec.ts allows it.
    serviceWorkers: 'block',
  },
```

In `tests/e2e/helpers.ts`, replace the two import lines at the top with:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';
import type { StudyEvent } from '../../schemas/events.ts';
import { SCHEMA_VERSION } from '../../schemas/version.ts';
import { DB_NAME, STORES } from '../../src/store/idb.ts';
```

and append:

```ts
/**
 * Writes events into the page's IndexedDB log the way the app stores them, then reloads so the app replays them.
 * Call it after the first `page.goto`, so the database belongs to the site's origin.
 */
export async function seedEvents(page: Page, events: readonly StudyEvent[]): Promise<void> {
  await page.evaluate(
    async ({ name, version, stores, list }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name, version);
        open.onupgradeneeded = () => {
          if (!open.result.objectStoreNames.contains(stores.events)) {
            open.result.createObjectStore(stores.events, { keyPath: 'id' });
          }
          if (!open.result.objectStoreNames.contains(stores.kv)) {
            open.result.createObjectStore(stores.kv, { keyPath: 'key' });
          }
          if (!open.result.objectStoreNames.contains(stores.cache)) {
            open.result.createObjectStore(stores.cache, { keyPath: 'key' });
          }
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(stores.events, 'readwrite');
        for (const e of list) tx.objectStore(stores.events).put(e);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    },
    { name: DB_NAME, version: SCHEMA_VERSION, stores: STORES, list: [...events] },
  );
  await page.reload();
}
```

`idb.ts` and `version.ts` touch no browser global at import time, so the Node side of Playwright can import their constants; the function body runs in the page and gets them as arguments.
The app's own open connection is at the same version, so the seeding connection neither upgrades nor blocks it.

- [ ] **Step 6: Write the failing offline e2e test**

Create `tests/e2e/offline.spec.ts`:

```ts
import { expect, type Page, test } from '@playwright/test';
import { eventsOf } from '../fixtures/events.ts';
import { failOnPageProblems, h1, seedEvents } from './helpers.ts';

const HOME_TITLE = 'AWS Cloud Practitioner Essentials';

// The only file that runs under the service worker; playwright.config.ts blocks it everywhere else.
test.use({ serviceWorkers: 'allow' });

failOnPageProblems();

/** A module's lessons from the content index, read the way the app reads it. */
async function lessonsOf(page: Page, module: number): Promise<{ slug: string; title: string }[]> {
  return page.evaluate(async (n) => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as {
      modules: { n: number; lessons: { slug: string; title: string }[] }[];
    };
    return index.modules.find((m) => m.n === n)?.lessons ?? [];
  }, module);
}

/** Loads Home once online and waits until the service worker has precached the build and controls the page. */
async function installWorker(page: Page): Promise<void> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect(async () => {
    await page.reload();
    expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  }).toPass({ timeout: 15_000 });
}

test.beforeEach(({ browserName }) => {
  test.skip(
    browserName === 'webkit',
    "Playwright's WebKit offline mode fails even the requests a service worker answers, so offline use is tested in Chromium only",
  );
});

test('after one visit, Home and a lesson never opened online work offline', async ({ page, context }) => {
  await installWorker(page);
  const [lesson] = await lessonsOf(page, 7);
  if (lesson === undefined) throw new Error('Module 7 has no lessons');

  await context.setOffline(true);
  await page.reload();
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.goto(`/#/m/07/l/${lesson.slug}`);
  await expect(h1(page, lesson.title)).toBeVisible();
});

test('offline, a module quiz shows a question from a chunk never loaded online', async ({
  page,
  context,
}) => {
  await installWorker(page);
  await context.setOffline(true);
  await page.goto('/#/s/quiz/m03');
  await expect(page.locator('section.runner')).toBeVisible();
  await expect(page.locator('section.runner')).toHaveAttribute('data-qid', /^q-[0-9a-z]{6}$/);
});

test('offline, the app replays a seeded log', async ({ page, context }) => {
  await installWorker(page);
  const [lesson] = await lessonsOf(page, 7);
  if (lesson === undefined) throw new Error('Module 7 has no lessons');
  await seedEvents(page, eventsOf({ t: 'lesson.done', note: `m07/${lesson.slug}` }));

  await context.setOffline(true);
  await page.goto('/#/m/07');
  await expect(page.locator('a.row', { hasText: lesson.title })).toContainText('Read');
});
```

The first test reloads offline, which is a real navigation through the worker; the other two change only the hash, so their proof is that the Module 3 and Module 7 chunks, never fetched by the page online, come from the precache.

- [ ] **Step 7: Run it and see it fail**

```bash
pnpm build
pnpm e2e tests/e2e/offline.spec.ts
```

Expected: FAIL: `3 failed` in `chromium-desktop` with `page.evaluate: Test timeout of 30000ms exceeded` in `installWorker`, because no worker is registered and `navigator.serviceWorker.ready` never resolves; `3 skipped` in `webkit-mobile` with the reason above.

- [ ] **Step 8: Write the service worker**

Create `src/sw.ts`:

```ts
/**
 * The service worker (spec 1.4 and 9 e2e 6): precaches the whole build on install, so every lesson and every
 * module's questions work offline after one visit. Navigations go to the network first and fall back to the
 * cached `index.html`; everything else, all of it content-hashed, comes from the cache first. A new version
 * waits for the next launch (no `skipWaiting`), so an open page never mixes two builds.
 * The file imports nothing, so the build emits it as one classic script; `scripts/sw-plugin.ts` writes the
 * manifest over the placeholder string below.
 * The empty export makes the file a module for TypeScript, so its names stay out of the DOM's global scope.
 */

export {};

interface Manifest {
  version: string;
  files: string[];
}

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}

/** The parts of `ServiceWorkerGlobalScope` this file uses; the DOM lib the app compiles with has no worker types. */
interface WorkerScope {
  readonly location: { readonly origin: string };
  readonly clients: { claim(): Promise<void> };
  addEventListener(type: 'install' | 'activate', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
}

// Read once, so no minifier can copy the placeholder.
const MANIFEST = '__SW_MANIFEST__' as unknown as Manifest;
const { version, files } = MANIFEST;
const PREFIX = 'ccp-';
const CACHE = `${PREFIX}${version}`;
const scope = self as unknown as WorkerScope;
/**
 * `ignoreVary`: servers may send `Vary: Origin`, and the page's module script and stylesheet requests carry an
 * Origin header that the precache requests lack, so a Vary-aware match would miss them offline.
 */
const MATCH = { cacheName: CACHE, ignoreVary: true };

async function precache(): Promise<void> {
  const cache = await caches.open(CACHE);
  await cache.addAll(files);
}

async function dropOldCaches(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => name.startsWith(PREFIX) && name !== CACHE).map((name) => caches.delete(name)),
  );
  await scope.clients.claim();
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match('/index.html', MATCH)) ?? Response.error();
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  return (await caches.match(request, MATCH)) ?? fetch(request);
}

scope.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

scope.addEventListener('activate', (event) => {
  event.waitUntil(dropOldCaches());
});

scope.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== scope.location.origin) return;
  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request));
});
```

`clients.claim()` lets the first visit's page come under the worker without a second launch; it is not `skipWaiting`, so a later version still waits until every tab of the old one closes.

- [ ] **Step 9: Emit it from the build and register it**

Create `scripts/sw-plugin.ts`:

```ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';
import { injectManifest, swManifest } from './lib/sw-manifest.ts';

/** Every file under `dir`, as paths from it with `/` separators. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'));
}

/**
 * Emits `src/sw.ts` as the unhashed `sw.js` (spec 1.4 and 2.10), then, once every file is written, writes the
 * precache manifest of the whole build into it.
 */
export function swPlugin(root: string): Plugin {
  return {
    name: 'ccp-sw',
    apply: 'build',
    buildStart() {
      this.emitFile({ type: 'chunk', id: join(root, 'src', 'sw.ts'), fileName: 'sw.js' });
    },
    writeBundle({ dir }) {
      if (dir === undefined) this.error('the build has no output directory');
      const worker = join(dir, 'sw.js');
      const manifest = swManifest(filesUnder(dir), readFileSync(join(dir, 'index.html'), 'utf8'));
      writeFileSync(worker, injectManifest(readFileSync(worker, 'utf8'), manifest));
    },
  };
}
```

Replace `vite.config.ts` with:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content/vite-plugin.ts';
import { CSP } from './scripts/csp.ts';
import { swPlugin } from './scripts/sw-plugin.ts';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [preact(), contentPlugin(root), swPlugin(root)],
  build: { target: 'es2022', assetsInlineLimit: 0 },
  preview: { headers: { 'Content-Security-Policy': CSP } },
});
```

`writeBundle` runs after the content plugin's chunks and Vite's `index.html` are on disk, so the manifest lists them all; `apply: 'build'` keeps the worker out of `pnpm dev`.

In `src/main.tsx`, append after `render(<App />, root);`:

```tsx

// Production only: in dev, Vite serves unhashed modules that a cache-first worker would pin.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
```

A rejected registration (a private window, or Playwright's `serviceWorkers: 'block'`) leaves the site working online and logs nothing, so `failOnPageProblems` stays quiet in every other e2e file.

- [ ] **Step 10: Hold the worker to a budget**

Replace `scripts/check-budgets.ts` with:

```ts
/**
 * Fails the build when the initial JavaScript, a module's content chunk or the service worker exceeds its gzip
 * budget (spec 1.1), or when the worker does not precache the page and every module chunk (spec 1.4).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { SW_PLACEHOLDER } from './lib/sw-manifest.ts';

const KB = 1024;
const INITIAL_JS_BUDGET = 50 * KB;
const CHUNK_BUDGET = 120 * KB;
const SW_BUDGET = 4 * KB;
const MODULE_CHUNK = /^m\d{2}\.[0-9a-f]{8}\.json$/;

const dist = resolve(import.meta.dirname, '..', 'dist');
const gzipped = (file: string): number => gzipSync(readFileSync(join(dist, file)), { level: 9 }).length;
const kb = (bytes: number): string => `${(bytes / KB).toFixed(1)} KB`;
const breaches: string[] = [];

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const scripts = [
  ...new Set([...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map((m) => m[1] ?? '')),
];
const initialJs = scripts.reduce((total, file) => total + gzipped(file), 0);
if (scripts.length === 0) breaches.push('dist/index.html references no script under assets/');
if (initialJs > INITIAL_JS_BUDGET) {
  breaches.push(`initial JS is ${kb(initialJs)} gzipped, over ${kb(INITIAL_JS_BUDGET)}`);
}

const chunks = readdirSync(join(dist, 'content'))
  .filter((name) => MODULE_CHUNK.test(name))
  .sort();
if (chunks.length !== 13) breaches.push(`dist/content holds ${chunks.length} module chunks, not 13`);
let largest = { name: '-', size: 0 };
for (const name of chunks) {
  const size = gzipped(join('content', name));
  if (size > largest.size) largest = { name, size };
  if (size > CHUNK_BUDGET) breaches.push(`content/${name} is ${kb(size)} gzipped, over ${kb(CHUNK_BUDGET)}`);
}

let worker = 0;
if (existsSync(join(dist, 'sw.js'))) {
  const code = readFileSync(join(dist, 'sw.js'), 'utf8');
  worker = gzipped('sw.js');
  if (code.includes(SW_PLACEHOLDER)) breaches.push('dist/sw.js still holds the manifest placeholder');
  for (const file of ['index.html', ...chunks.map((name) => `content/${name}`)]) {
    if (!code.includes(`"/${file}"`)) breaches.push(`dist/sw.js does not precache /${file}`);
  }
  if (worker > SW_BUDGET) breaches.push(`sw.js is ${kb(worker)} gzipped, over ${kb(SW_BUDGET)}`);
} else {
  breaches.push('dist/sw.js is missing');
}

console.log(
  `budgets: initial JS ${kb(initialJs)} of ${kb(INITIAL_JS_BUDGET)} in ${scripts.length} script(s); ` +
    `largest module chunk ${largest.name} ${kb(largest.size)} of ${kb(CHUNK_BUDGET)} across ${chunks.length} chunks; ` +
    `sw.js ${kb(worker)} of ${kb(SW_BUDGET)}`,
);
for (const breach of breaches) console.error(`budget breach: ${breach}`);
process.exit(breaches.length > 0 ? 1 : 0);
```

- [ ] **Step 11: Build and check the worker**

```bash
pnpm typecheck
pnpm build
grep -c __SW_MANIFEST__ dist/sw.js
head -c 120 dist/sw.js; echo
```

Expected: `tsc --noEmit` prints nothing; the build's last line ends with `across 13 chunks; sw.js 0.7 KB of 4.0 KB`; `grep -c` prints `0`; and `dist/sw.js` starts with `var{version:e,files:t}={"version":"sw-` followed by 12 hex digits and `","files":["/","/assets/`.
`dist/index.html` gains no reference to `sw.js`, and the main script holds ``serviceWorker.register(`/sw.js`)``.

- [ ] **Step 12: Run the tests and see them pass**

```bash
pnpm e2e tests/e2e/offline.spec.ts
pnpm e2e
pnpm check
```

Expected: `3 passed` and `3 skipped` for `offline.spec.ts`; the whole e2e run passes with the offline file's 3 WebKit skips added to the existing ones, which shows that blocking the worker leaves `reader.spec.ts` and `practice.spec.ts` unchanged; and `pnpm check` exits 0.

- [ ] **Step 13: Commit**

```bash
pnpm lint:fix
git add scripts/lib/sw-manifest.ts scripts/sw-plugin.ts src/sw.ts src/main.tsx vite.config.ts scripts/check-budgets.ts playwright.config.ts tests/unit/sw-manifest.test.ts tests/e2e/helpers.ts tests/e2e/offline.spec.ts
git commit -m "Add the offline service worker" -m "The build emits an unhashed sw.js that precaches the whole site, serves navigations network-first with the cached index.html offline and everything else cache-first, and waits for the next launch to update; the budget check holds it under 4 KB, and seedEvents writes a log into the page for e2e tests."
```

---

## Task 12: Memory signals, the clock, the review route and Home keys

Depends on Tasks 3, 4, 5, 7, 9 and 10: it reads `deriveMemory`, `reviewQueue`, `streakOf`, `moduleMastery`, `nextAction` and `nextMinutes`, the new `ConceptMeta` and `LessonMeta` fields, the new kv keys and `migrateLocal`.
The app gains computed signals over the event log at a minute clock, a pure `src/app/home.ts` that turns the engine's results into Home's words, the `#/s/review` route, and the Home keys of spec 7.4 (`g r`, `Enter`, `j` and `k`).
`initStore` now brings the stored log to `SCHEMA_VERSION` with `migrateLocal`, keeps the old data under kv `preMigration` first, and stamps kv `schemaVersion` (spec 8.2).
`KeyInput` gains a required `control` flag, so the runner's key handler and `runner-keys.test.ts` pass it too; `Runner.tsx` changes only there in this task, and Task 15 rewrites the rest of it.

**Files:**
- Create: `src/app/config.ts`, `src/app/clock.ts`, `src/app/home.ts`, `src/app/memory.ts`, `tests/unit/home.test.ts`
- Modify: `src/app/progress.ts`, `src/app/router.ts`, `src/app/nav.ts`, `src/app/keys.ts`, `src/app/keyboard.ts`, `src/app/screens/ModulePage.tsx`, `src/app/screens/Help.tsx`, `src/app/screens/Runner.tsx`, `tests/unit/keys.test.ts`, `tests/unit/router.test.ts`, `tests/unit/nav.test.ts`, `tests/unit/runner-keys.test.ts`
- Test: `tests/unit/home.test.ts`, `tests/unit/keys.test.ts`, `tests/unit/router.test.ts`, `tests/unit/nav.test.ts`, `tests/unit/runner-keys.test.ts`

- [ ] **Step 1: Write the failing tests**

`home.test.ts` builds a made-up two-module bakery index, so no course text enters the repo.
`keys.test.ts` and `nav.test.ts` are shown whole, with the `minutes` and `checkConcepts` fields that Task 9 added to their lesson helpers.

Create `tests/unit/home.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import type { ConceptMeta, ContentIndex, LessonMeta } from '../../schemas/chunks.ts';
import {
  examAskDue,
  examDateLabel,
  hexLabel,
  lessonRefs,
  memoryContentOf,
  nextLabel,
  nothingDueLine,
  streakLine,
} from '../../src/app/home.ts';
import type { LessonRef } from '../../src/engine/next.ts';
import type { ReviewQueue } from '../../src/engine/queue.ts';
import type { SessionState } from '../../src/engine/replay.ts';

const lesson = (
  n: number,
  slug: string,
  title: string,
  minutes: number,
  checkConcepts: number,
): LessonMeta => ({
  n,
  slug,
  title,
  concepts: [],
  minutes,
  checkConcepts,
});

const concept = (id: string, home: string, more: Partial<ConceptMeta> = {}): ConceptMeta => ({
  id,
  name: `Name of ${id}`,
  home,
  anchor: id,
  tested: true,
  tasks: ['1.1'],
  confusableWith: [],
  aliases: [],
  splitFrom: null,
  ...more,
});

/** A made-up two-module bakery course. */
const IDX: ContentIndex = {
  contentVersion: 'test',
  modules: [
    {
      n: 1,
      slug: 'baking-basics',
      title: 'Module 1: Baking Basics',
      short: 'Baking Basics',
      chunk: 'content/m01.json',
      lessons: [
        lesson(1, 'welcome', 'Welcome to the Bakery', 3, 0),
        lesson(2, 'shared-ovens', 'Shared Ovens', 6, 2),
      ],
    },
    {
      n: 2,
      slug: 'proofing',
      title: 'Module 2: Proofing',
      short: 'Proofing',
      chunk: 'content/m02.json',
      lessons: [lesson(1, 'proofing-cabinets', 'Proofing Cabinets', 5, 3)],
    },
  ],
  concepts: [
    concept('shared-oven', 'm01/shared-ovens', { aliases: ['common-oven'], confusableWith: ['rented-oven'] }),
    concept('rented-oven', 'm01/shared-ovens', { confusableWith: ['shared-oven'] }),
    concept('bakery-history', 'm01/welcome', { tested: false, tasks: [] }),
    concept('proofing-cabinet', 'm02/proofing-cabinets', { splitFrom: 'shared-oven' }),
  ],
  glossary: [],
  missions: [],
  questionVersions: { 'q-aaaaaa': 1, 'q-bbbbbb': 2 },
  search: 'content/search.json',
};

const REFS = lessonRefs(IDX);
const ref = (note: string): LessonRef => {
  const found = REFS.find((r) => r.note === note);
  if (found === undefined) throw new Error(`no lesson ${note}`);
  return found;
};

const session = (mode: SessionState['mode'], scope: string): SessionState => ({
  sid: '01JQ0000000000000000000000',
  mode,
  scope,
  seed: 7,
  qids: ['q-aaaaaa', 'q-bbbbbb', 'q-cccccc'],
  answers: new Map(),
  startedAt: '2026-10-10T08:00:00.000Z',
  submittedAt: null,
  abandoned: false,
});

const QUEUE: ReviewQueue = {
  items: [],
  due: 0,
  misconceptions: 0,
  catchUp: false,
  newToday: 0,
  lessonsAllowed: true,
  next: null,
};
const NOW = new Date('2026-10-10T18:00:00.000Z');

describe('memoryContentOf', () => {
  it('reads each concept module from its home note and inverts the aliases', () => {
    const content = memoryContentOf(IDX);
    expect(content.concepts.get('shared-oven')).toEqual({
      module: 1,
      tested: true,
      confusableWith: ['rented-oven'],
      splitFrom: null,
    });
    expect(content.concepts.get('proofing-cabinet')).toEqual({
      module: 2,
      tested: true,
      confusableWith: [],
      splitFrom: 'shared-oven',
    });
    expect(content.concepts.get('bakery-history')?.tested).toBe(false);
    expect(content.aliases.get('common-oven')).toBe('shared-oven');
    expect(content.aliases.size).toBe(1);
    expect(content.questionVersions.get('q-bbbbbb')).toBe(2);
  });
});

describe('lessonRefs', () => {
  it('lists every lesson in course order and marks each module first lesson', () => {
    expect(REFS).toEqual([
      {
        note: 'm01/welcome',
        module: 1,
        slug: 'welcome',
        title: 'Welcome to the Bakery',
        first: true,
        minutes: 3,
        checkConcepts: 0,
      },
      {
        note: 'm01/shared-ovens',
        module: 1,
        slug: 'shared-ovens',
        title: 'Shared Ovens',
        first: false,
        minutes: 6,
        checkConcepts: 2,
      },
      {
        note: 'm02/proofing-cabinets',
        module: 2,
        slug: 'proofing-cabinets',
        title: 'Proofing Cabinets',
        first: true,
        minutes: 5,
        checkConcepts: 3,
      },
    ]);
  });
});

describe('nextLabel', () => {
  it('resumes a lesson check, a module quiz or a review with the questions left', () => {
    expect(
      nextLabel({ kind: 'resume', session: session('check', 'm01/shared-ovens'), left: 3 }, IDX),
    ).toEqual({
      label: 'Resume: Lesson check: Shared Ovens (3 left)',
      href: '#/s/check/m01/shared-ovens',
      minutes: 2,
    });
    expect(nextLabel({ kind: 'resume', session: session('quiz', 'm02'), left: 3 }, IDX)).toEqual({
      label: 'Resume: Module quiz: Proofing (3 left)',
      href: '#/s/quiz/m02',
      minutes: 2,
    });
    expect(nextLabel({ kind: 'resume', session: session('review', 'review'), left: 3 }, IDX)).toEqual({
      label: 'Resume: Review (3 left)',
      href: '#/s/review',
      minutes: 2,
    });
  });

  it('counts the concepts of a review, in the singular for one', () => {
    expect(nextLabel({ kind: 'review', count: 18 }, IDX)).toEqual({
      label: 'Review 18 concepts',
      href: '#/s/review',
      minutes: 9,
    });
    expect(nextLabel({ kind: 'review', count: 1 }, IDX)).toEqual({
      label: 'Review 1 concept',
      href: '#/s/review',
      minutes: 1,
    });
  });

  it('continues the current lesson with its reading time', () => {
    expect(nextLabel({ kind: 'continue', lesson: ref('m01/shared-ovens') }, IDX)).toEqual({
      label: 'Continue: Shared Ovens',
      href: '#/m/01/l/shared-ovens',
      minutes: 6,
    });
  });

  it('offers Check yourself for a module, opening its first unchecked lesson', () => {
    expect(
      nextLabel({ kind: 'check', module: 2, concepts: 6, lesson: ref('m02/proofing-cabinets') }, IDX),
    ).toEqual({
      label: 'Check yourself: Module 2 (6 concepts)',
      href: '#/s/check/m02/proofing-cabinets',
      minutes: 3,
    });
    expect(
      nextLabel({ kind: 'check', module: 2, concepts: 1, lesson: ref('m02/proofing-cabinets') }, IDX).label,
    ).toBe('Check yourself: Module 2 (1 concept)');
  });

  it('starts a module at its first lesson and otherwise names the next lesson', () => {
    expect(nextLabel({ kind: 'lesson', lesson: ref('m01/welcome') }, IDX)).toEqual({
      label: 'Start Module 1: Welcome to the Bakery',
      href: '#/m/01/l/welcome',
      minutes: 3,
    });
    expect(nextLabel({ kind: 'lesson', lesson: ref('m01/shared-ovens') }, IDX)).toEqual({
      label: 'Next lesson: Shared Ovens',
      href: '#/m/01/l/shared-ovens',
      minutes: 6,
    });
  });

  it('has no link and no time when done for today', () => {
    expect(nextLabel({ kind: 'done' }, IDX)).toEqual({ label: 'Done for today', href: null, minutes: null });
  });
});

describe('nothingDueLine', () => {
  const next = (count: number, at: string): ReviewQueue => ({ ...QUEUE, next: { count, at } });

  it('names the next reviews in hours rounded up, in minutes under an hour, and in days beyond 48 hours', () => {
    expect(nothingDueLine(next(6, '2026-10-10T22:30:00.000Z'), NOW)).toBe(
      'Nothing due. Next: 6 concepts in 5 h.',
    );
    expect(nothingDueLine(next(1, '2026-10-10T18:40:00.000Z'), NOW)).toBe(
      'Nothing due. Next: 1 concept in 40 min.',
    );
    expect(nothingDueLine(next(2, '2026-10-12T18:00:00.000Z'), NOW)).toBe(
      'Nothing due. Next: 2 concepts in 48 h.',
    );
    expect(nothingDueLine(next(6, '2026-10-13T04:00:00.000Z'), NOW)).toBe(
      'Nothing due. Next: 6 concepts in 3 days.',
    );
  });

  it('says only Nothing due without any card', () => {
    expect(nothingDueLine(QUEUE, NOW)).toBe('Nothing due.');
  });
});

describe('streakLine', () => {
  it('shows the longest streak only after a reset', () => {
    expect(streakLine({ current: 0, longest: 18, freezes: 0, frozenDays: [] })).toBe(
      'Streak reset. Longest: 18 days.',
    );
    expect(streakLine({ current: 0, longest: 1, freezes: 0, frozenDays: [] })).toBe(
      'Streak reset. Longest: 1 day.',
    );
    expect(streakLine({ current: 3, longest: 18, freezes: 1, frozenDays: [] })).toBeNull();
    expect(streakLine({ current: 0, longest: 0, freezes: 0, frozenDays: [] })).toBeNull();
  });
});

describe('labels', () => {
  it('writes the exam date with a short weekday and month, whatever the zone', () => {
    expect(examDateLabel('2026-11-14')).toBe('Sat 14 Nov');
    expect(examDateLabel('2027-01-04')).toBe('Mon 4 Jan');
  });

  it('labels a hex with its module, mastery and band', () => {
    expect(hexLabel(5, 'Networking', 64, 'solid')).toBe('Module 5 Networking, mastery 64, solid');
    expect(hexLabel(1, 'Baking Basics', 0, 'outline')).toBe('Module 1 Baking Basics, mastery 0, not started');
    expect(hexLabel(2, 'Proofing', 25, 'faint')).toBe('Module 2 Proofing, mastery 25, started');
  });
});

describe('examAskDue', () => {
  const allRead = new Map([
    ['m01/welcome', '2026-10-10T08:00:00.000Z'],
    ['m01/shared-ovens', '2026-10-10T09:00:00.000Z'],
  ]);

  it('asks once every Module 1 lesson is read, while no date is set and it was not dismissed', () => {
    expect(examAskDue({ idx: IDX, lessonsDone: allRead, examDate: null, examAsk: null })).toBe(true);
    expect(examAskDue({ idx: IDX, lessonsDone: allRead, examDate: null, examAsk: 'later' })).toBe(true);
  });

  it('waits for every Module 1 lesson', () => {
    const one = new Map([['m01/welcome', '2026-10-10T08:00:00.000Z']]);
    expect(examAskDue({ idx: IDX, lessonsDone: one, examDate: null, examAsk: null })).toBe(false);
    expect(examAskDue({ idx: IDX, lessonsDone: new Map(), examDate: null, examAsk: null })).toBe(false);
  });

  it('stays away once a date is set or the question was dismissed', () => {
    expect(examAskDue({ idx: IDX, lessonsDone: allRead, examDate: '2026-11-14', examAsk: null })).toBe(false);
    expect(examAskDue({ idx: IDX, lessonsDone: allRead, examDate: null, examAsk: 'dismissed' })).toBe(false);
  });
});
```

Replace the whole of `tests/unit/keys.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import type { ModuleMeta } from '../../schemas/chunks.ts';
import { type KeyCommand, type KeyContext, type KeyInput, keyCommand, keyStep } from '../../src/app/keys.ts';

const lesson = (n: number, slug: string) => ({
  n,
  slug,
  title: slug,
  concepts: [],
  minutes: 1,
  checkConcepts: 0,
});
const MODULES: ModuleMeta[] = [
  {
    n: 1,
    slug: 'one',
    title: 'Module 1: One',
    short: 'One',
    chunk: 'content/m01.json',
    lessons: [lesson(1, 'a')],
  },
  {
    n: 2,
    slug: 'two',
    title: 'Module 2: Two',
    short: 'Two',
    chunk: 'content/m02.json',
    lessons: [lesson(1, 'b')],
  },
];
const LESSON_A: KeyContext['route'] = { kind: 'lesson', module: 1, slug: 'a', anchor: null };

const key = (k: string, more: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  meta: false,
  ctrl: false,
  alt: false,
  typing: false,
  control: false,
  at: 10_000,
  ...more,
});
const ctx = (more: Partial<KeyContext> = {}): KeyContext => ({
  route: { kind: 'home' },
  modules: MODULES,
  overlayOpen: false,
  termOpen: false,
  gAt: null,
  ...more,
});

describe('keyCommand', () => {
  it('opens the palette with / or Cmd/Ctrl+K, and help with ?', () => {
    expect(keyCommand(key('/'), ctx())).toEqual({ kind: 'palette' });
    expect(keyCommand(key('k', { meta: true }), ctx())).toEqual({ kind: 'palette' });
    expect(keyCommand(key('K', { ctrl: true }), ctx({ overlayOpen: true }))).toEqual({ kind: 'palette' });
    expect(keyCommand(key('?'), ctx())).toEqual({ kind: 'help' });
  });

  it('leaves keys alone while a dialog is open, while typing, and with other modifiers', () => {
    expect(keyCommand(key('/'), ctx({ overlayOpen: true }))).toBeNull();
    expect(keyCommand(key('Escape'), ctx({ overlayOpen: true, termOpen: true }))).toBeNull();
    expect(keyCommand(key('/', { typing: true }), ctx())).toBeNull();
    expect(keyCommand(key(']', { alt: true }), ctx({ route: LESSON_A }))).toBeNull();
  });

  it('goes Home with g then h within a second, in either case', () => {
    expect(keyCommand(key('G'), ctx())).toEqual({ kind: 'g', at: 10_000 });
    expect(keyCommand(key('h'), ctx({ gAt: 9_200 }))).toEqual({ kind: 'navigate', hash: '#/' });
    expect(keyCommand(key('H'), ctx({ gAt: 8_900 }))).toBeNull();
    expect(keyCommand(key('h'), ctx())).toBeNull();
  });

  it('goes Home with g then Shift+H, whose Shift sends a keydown of its own first', () => {
    // The keydowns a browser sends, fed through keyStep the way keyboard.ts carries the pending g.
    const press = (...inputs: KeyInput[]): (KeyCommand | null)[] => {
      let gAt: number | null = null;
      return inputs.map((input) => {
        const step = keyStep(input, ctx({ gAt }));
        gAt = step.gAt;
        return step.command;
      });
    };
    expect(press(key('g', { at: 10_000 }), key('Shift', { at: 10_200 }), key('H', { at: 10_300 }))).toEqual([
      { kind: 'g', at: 10_000 },
      null,
      { kind: 'navigate', hash: '#/' },
    ]);
    expect(press(key('g', { at: 10_000 }), key('x', { at: 10_100 }), key('h', { at: 10_200 }))).toEqual([
      { kind: 'g', at: 10_000 },
      null,
      null,
    ]);
  });

  it('closes an open term popover before Escape goes up a level', () => {
    expect(keyCommand(key('Escape'), ctx({ route: LESSON_A, termOpen: true }))).toEqual({
      kind: 'close-term',
    });
    expect(keyCommand(key('Escape'), ctx({ route: LESSON_A }))).toEqual({ kind: 'navigate', hash: '#/m/01' });
    expect(keyCommand(key('Escape'), ctx())).toBeNull();
  });

  it('moves between lessons with [ and ], across modules, only on a lesson', () => {
    expect(keyCommand(key(']'), ctx({ route: LESSON_A }))).toEqual({ kind: 'navigate', hash: '#/m/02/l/b' });
    expect(keyCommand(key('['), ctx({ route: LESSON_A }))).toBeNull();
    expect(keyCommand(key(']'), ctx({ route: { kind: 'module', module: 1 } }))).toBeNull();
  });

  it('opens Progress with g then p, in either case', () => {
    expect(keyCommand(key('p'), ctx({ gAt: 9_500 }))).toEqual({ kind: 'progress' });
    expect(keyCommand(key('P'), ctx({ gAt: 9_500 }))).toEqual({ kind: 'progress' });
    expect(keyCommand(key('p'), ctx({ gAt: 8_000 }))).toBeNull();
    expect(keyCommand(key('p'), ctx())).toBeNull();
  });

  it('jumps from a lesson to its check with c, only on a lesson', () => {
    expect(keyCommand(key('c'), ctx({ route: LESSON_A }))).toEqual({
      kind: 'navigate',
      hash: '#/s/check/m01/a',
    });
    expect(keyCommand(key('C'), ctx({ route: LESSON_A }))).toEqual({
      kind: 'navigate',
      hash: '#/s/check/m01/a',
    });
    expect(keyCommand(key('c'), ctx({ route: { kind: 'module', module: 1 } }))).toBeNull();
    expect(keyCommand(key('c', { typing: true }), ctx({ route: LESSON_A }))).toBeNull();
  });

  it('opens Review with g then r, in either case', () => {
    expect(keyCommand(key('r'), ctx({ gAt: 9_500 }))).toEqual({ kind: 'navigate', hash: '#/s/review' });
    expect(keyCommand(key('R'), ctx({ gAt: 9_500, route: LESSON_A }))).toEqual({
      kind: 'navigate',
      hash: '#/s/review',
    });
    expect(keyCommand(key('r'), ctx({ gAt: 8_000 }))).toBeNull();
    expect(keyCommand(key('r'), ctx())).toBeNull();
  });

  it('follows Next with Enter on Home, unless a link, button or field has focus', () => {
    expect(keyCommand(key('Enter'), ctx())).toEqual({ kind: 'next' });
    expect(keyCommand(key('Enter', { control: true }), ctx())).toBeNull();
    expect(keyCommand(key('Enter', { typing: true, control: true }), ctx())).toBeNull();
    expect(keyCommand(key('Enter'), ctx({ route: { kind: 'module', module: 1 } }))).toBeNull();
    expect(keyCommand(key('Enter'), ctx({ route: LESSON_A }))).toBeNull();
  });

  it('moves with j and k on Home and module pages, even from a focused link', () => {
    expect(keyCommand(key('j'), ctx())).toEqual({ kind: 'move', delta: 1 });
    expect(keyCommand(key('K'), ctx())).toEqual({ kind: 'move', delta: -1 });
    expect(keyCommand(key('j', { control: true }), ctx({ route: { kind: 'module', module: 2 } }))).toEqual({
      kind: 'move',
      delta: 1,
    });
    expect(keyCommand(key('k'), ctx({ route: LESSON_A }))).toBeNull();
    expect(keyCommand(key('j'), ctx({ route: { kind: 'review' } }))).toBeNull();
    expect(keyCommand(key('j', { typing: true }), ctx())).toBeNull();
    expect(keyCommand(key('j'), ctx({ overlayOpen: true }))).toBeNull();
  });
});
```

In `tests/unit/router.test.ts`, replace:

```ts
    expect(parseHash('#/s/check/m03/aws-lambda')).toEqual({ kind: 'check', module: 3, slug: 'aws-lambda' });
    expect(parseHash('#/s/quiz/m13')).toEqual({ kind: 'quiz', module: 13 });
  });

```

with:

```ts
    expect(parseHash('#/s/check/m03/aws-lambda')).toEqual({ kind: 'check', module: 3, slug: 'aws-lambda' });
    expect(parseHash('#/s/quiz/m13')).toEqual({ kind: 'quiz', module: 13 });
    expect(parseHash('#/s/review')).toEqual({ kind: 'review' });
  });

```

In `tests/unit/router.test.ts`, replace:

```ts
      '#/s/quiz/03',
      '#/s/lightning/m03',
    ]) {
      expect(parseHash(hash)).toEqual({ kind: 'not-found', hash });
```

with:

```ts
      '#/s/quiz/03',
      '#/s/lightning/m03',
      '#/s/review/m03',
      '#/s/reviews',
    ]) {
      expect(parseHash(hash)).toEqual({ kind: 'not-found', hash });
```

In `tests/unit/router.test.ts`, replace:

```ts
    { kind: 'check', module: 3, slug: 'aws-lambda' },
    { kind: 'quiz', module: 3 },
    { kind: 'not-found', hash: '#/nowhere' },
  ];
```

with:

```ts
    { kind: 'check', module: 3, slug: 'aws-lambda' },
    { kind: 'quiz', module: 3 },
    { kind: 'review' },
    { kind: 'not-found', hash: '#/nowhere' },
  ];
```

In `tests/unit/router.test.ts`, replace:

```ts
    expect(toHash({ kind: 'check', module: 3, slug: 'aws-lambda' })).toBe('#/s/check/m03/aws-lambda');
    expect(toHash({ kind: 'quiz', module: 3 })).toBe('#/s/quiz/m03');
  });

```

with:

```ts
    expect(toHash({ kind: 'check', module: 3, slug: 'aws-lambda' })).toBe('#/s/check/m03/aws-lambda');
    expect(toHash({ kind: 'quiz', module: 3 })).toBe('#/s/quiz/m03');
    expect(toHash({ kind: 'review' })).toBe('#/s/review');
  });

```

Replace the whole of `tests/unit/nav.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import type { ModuleMeta } from '../../schemas/chunks.ts';
import { neighbors, up } from '../../src/app/nav.ts';

const lesson = (n: number, slug: string) => ({
  n,
  slug,
  title: `Title of ${slug}`,
  concepts: [],
  minutes: 1,
  checkConcepts: 0,
});
const MODULES: ModuleMeta[] = [
  {
    n: 1,
    slug: 'one',
    title: 'Module 1: One',
    short: 'One',
    chunk: 'content/m01.aaaaaaaa.json',
    lessons: [lesson(1, 'a'), lesson(2, 'b')],
  },
  {
    n: 2,
    slug: 'two',
    title: 'Module 2: Two',
    short: 'Two',
    chunk: 'content/m02.bbbbbbbb.json',
    lessons: [lesson(1, 'c')],
  },
];

describe('neighbors', () => {
  it('walks every lesson in order and crosses module boundaries', () => {
    expect(neighbors(MODULES, 1, 'a')).toEqual({
      prev: null,
      next: { module: 1, slug: 'b', title: 'Title of b' },
    });
    expect(neighbors(MODULES, 1, 'b')).toEqual({
      prev: { module: 1, slug: 'a', title: 'Title of a' },
      next: { module: 2, slug: 'c', title: 'Title of c' },
    });
    expect(neighbors(MODULES, 2, 'c')).toEqual({
      prev: { module: 1, slug: 'b', title: 'Title of b' },
      next: null,
    });
  });

  it('has no neighbors for an unknown lesson', () => {
    expect(neighbors(MODULES, 2, 'a')).toEqual({ prev: null, next: null });
  });
});

describe('up', () => {
  it('goes one level up from every route', () => {
    expect(up({ kind: 'lesson', module: 3, slug: 'aws-lambda', anchor: 'x' })).toEqual({
      kind: 'module',
      module: 3,
    });
    expect(up({ kind: 'module', module: 3 })).toEqual({ kind: 'home' });
    expect(up({ kind: 'mission', id: 'mission-00' })).toEqual({ kind: 'missions' });
    expect(up({ kind: 'missions' })).toEqual({ kind: 'home' });
    expect(up({ kind: 'not-found', hash: '#/x' })).toEqual({ kind: 'home' });
    expect(up({ kind: 'home' })).toBeNull();
  });

  it('goes from a lesson check to its lesson, and from a module quiz to its module', () => {
    expect(up({ kind: 'check', module: 3, slug: 'aws-lambda' })).toEqual({
      kind: 'lesson',
      module: 3,
      slug: 'aws-lambda',
      anchor: null,
    });
    expect(up({ kind: 'quiz', module: 3 })).toEqual({ kind: 'module', module: 3 });
  });

  it('goes from a review to Home', () => {
    expect(up({ kind: 'review' })).toEqual({ kind: 'home' });
  });
});
```

In `tests/unit/runner-keys.test.ts`, replace:

```ts
  shift: false,
  typing: false,
  at: 0,
  ...more,
```

with:

```ts
  shift: false,
  typing: false,
  control: false,
  at: 0,
  ...more,
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/home.test.ts tests/unit/keys.test.ts tests/unit/router.test.ts tests/unit/nav.test.ts
```

Expected: FAIL.
`home.test.ts` cannot load `../../src/app/home.ts`, and 7 tests fail in the other three files, for example `expected null to deeply equal { kind: 'next' }` and `expected { kind: 'not-found', …(1) } to deeply equal { kind: 'review' }`.

- [ ] **Step 3: Add the target exam date and the minute clock**

Create `src/app/config.ts` with:

```ts
/** The exam date the study plan targets (spec 7.5 and 10.2); the exam date question offers it. */
export const TARGET_EXAM_DATE = '2026-11-14';
```

Create `src/app/clock.ts` with:

```ts
import { signal } from '@preact/signals';

/** How often the clock ticks; due counts and "Done for today" move on the minute. */
export const CLOCK_MS = 60_000;

/** The current moment, for everything that depends on time: the queue, the streak, mastery and Next. */
export const now = signal(new Date());

/** Ticks `now` every minute and whenever the page becomes visible again; returns the cleanup. */
export function startClock(): () => void {
  const tick = (): void => {
    now.value = new Date();
  };
  const onVisible = (): void => {
    if (document.visibilityState === 'visible') tick();
  };
  const timer = setInterval(tick, CLOCK_MS);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
```

- [ ] **Step 4: Add the pure Home helpers**

`nextLabel` takes its minutes from Task 7's `nextMinutes`, so the time estimate has one source.
The labels follow spec 4.6 and 7.5 word for word, and the tests match them exactly.

Create `src/app/home.ts` with:

```ts
/** Pure helpers for Home and the top bar (spec 4.6 and 7.2), so the tests run without a browser. */
import type { ContentIndex } from '../../schemas/chunks.ts';
import { BAND_LABEL, type HexBand } from '../engine/mastery.ts';
import type { ConceptInfo, MemoryContent } from '../engine/memory.ts';
import { type LessonRef, type NextAction, nextMinutes } from '../engine/next.ts';
import type { ReviewQueue } from '../engine/queue.ts';
import type { StreakState } from '../engine/streak.ts';
import { pad2, toHash } from './router.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The module of a note id such as `m03/aws-lambda`. */
const moduleOf = (noteId: string): number => Number(noteId.slice(1, 3));

/** What the memory replay needs from the index: concepts with their module, aliases, and question versions. */
export function memoryContentOf(idx: ContentIndex): MemoryContent {
  const concepts = new Map<string, ConceptInfo>();
  const aliases = new Map<string, string>();
  for (const c of idx.concepts) {
    concepts.set(c.id, {
      module: moduleOf(c.home),
      tested: c.tested,
      confusableWith: c.confusableWith,
      splitFrom: c.splitFrom,
    });
    for (const alias of c.aliases) aliases.set(alias, c.id);
  }
  return { concepts, aliases, questionVersions: new Map(Object.entries(idx.questionVersions)) };
}

/** Every lesson in course order, as the Next action reads it. */
export function lessonRefs(idx: ContentIndex): LessonRef[] {
  return idx.modules.flatMap((m) =>
    m.lessons.map((l, i) => ({
      note: `m${pad2(m.n)}/${l.slug}`,
      module: m.n,
      slug: l.slug,
      title: l.title,
      first: i === 0,
      minutes: l.minutes,
      checkConcepts: l.checkConcepts,
    })),
  );
}

const lessonHash = (lesson: LessonRef): string =>
  toHash({ kind: 'lesson', module: lesson.module, slug: lesson.slug, anchor: null });

/** The title of the lesson a check scope such as `m03/aws-lambda` names. */
function lessonTitle(idx: ContentIndex, scope: string): string {
  const [module, slug] = scope.split('/');
  return (
    idx.modules.find((m) => `m${pad2(m.n)}` === module)?.lessons.find((l) => l.slug === slug)?.title ?? ''
  );
}

/** Where a session in progress lives, and what it is called. */
function resumeOf(action: Extract<NextAction, { kind: 'resume' }>, idx: ContentIndex): [string, string] {
  const { mode, scope } = action.session;
  if (mode === 'review') return ['Review', toHash({ kind: 'review' })];
  if (mode === 'check') {
    const [module = '', slug = ''] = scope.split('/');
    return [
      `Lesson check: ${lessonTitle(idx, scope)}`,
      toHash({ kind: 'check', module: Number(module.slice(1)), slug }),
    ];
  }
  const module = Number(scope.slice(1));
  return [
    `Module quiz: ${idx.modules.find((m) => m.n === module)?.short ?? ''}`,
    toHash({ kind: 'quiz', module }),
  ];
}

/** The Next button's words, link and time estimate (spec 4.6); `done` has neither link nor time. */
export function nextLabel(
  action: NextAction,
  idx: ContentIndex,
): { label: string; href: string | null; minutes: number | null } {
  const minutes = nextMinutes(action);
  switch (action.kind) {
    case 'resume': {
      const [what, href] = resumeOf(action, idx);
      return { label: `Resume: ${what} (${action.left} left)`, href, minutes };
    }
    case 'review':
      return {
        label: `Review ${plural(action.count, 'concept', 'concepts')}`,
        href: toHash({ kind: 'review' }),
        minutes,
      };
    case 'continue':
      return { label: `Continue: ${action.lesson.title}`, href: lessonHash(action.lesson), minutes };
    case 'check':
      return {
        label: `Check yourself: Module ${action.module} (${plural(action.concepts, 'concept', 'concepts')})`,
        href: toHash({ kind: 'check', module: action.lesson.module, slug: action.lesson.slug }),
        minutes,
      };
    case 'lesson':
      return {
        label: action.lesson.first
          ? `Start Module ${action.lesson.module}: ${action.lesson.title}`
          : `Next lesson: ${action.lesson.title}`,
        href: lessonHash(action.lesson),
        minutes,
      };
    case 'done':
      return { label: 'Done for today', href: null, minutes: null };
  }
}

/** The empty-queue line (spec 7.5): when the next reviews fall due, in minutes, hours or days. */
export function nothingDueLine(queue: ReviewQueue, now: Date): string {
  if (queue.next === null) return 'Nothing due.';
  const wait = Math.max(0, Date.parse(queue.next.at) - now.getTime());
  const when =
    wait < HOUR_MS
      ? `${Math.max(1, Math.ceil(wait / MINUTE_MS))} min`
      : wait <= 2 * DAY_MS
        ? `${Math.ceil(wait / HOUR_MS)} h`
        : `${Math.ceil(wait / DAY_MS)} days`;
  return `Nothing due. Next: ${plural(queue.next.count, 'concept', 'concepts')} in ${when}.`;
}

/** The one line after a broken streak (spec 3.5), with no guilt copy; null otherwise. */
export function streakLine(s: StreakState): string | null {
  if (s.current > 0 || s.longest === 0) return null;
  return `Streak reset. Longest: ${plural(s.longest, 'day', 'days')}.`;
}

/** `Sat 14 Nov` for `2026-11-14`, read in UTC so the zone never shifts the day. */
export function examDateLabel(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** The accessible name of a hex (spec 7.3). */
export function hexLabel(module: number, short: string, mastery: number, band: HexBand): string {
  return `Module ${module} ${short}, mastery ${mastery}, ${BAND_LABEL[band]}`;
}

/** The one-time exam date question (spec 7.5): every Module 1 lesson read, no date set, and not dismissed. */
export function examAskDue(args: {
  idx: ContentIndex;
  lessonsDone: ReadonlyMap<string, string>;
  examDate: string | null;
  examAsk: unknown;
}): boolean {
  const { idx, lessonsDone, examDate, examAsk } = args;
  if (examDate !== null || examAsk === 'dismissed') return false;
  const first = idx.modules.find((m) => m.n === 1);
  if (first === undefined || first.lessons.length === 0) return false;
  return first.lessons.every((l) => lessonsDone.has(`m01/${l.slug}`));
}
```

- [ ] **Step 5: Add the memory signals**

Each signal is null until the content index has loaded.
`nextUp` reads `currentLesson` from kv, because reading a lesson writes no event.

Create `src/app/memory.ts` with:

```ts
/** Phase 2's derived state as computed signals: replayed from the log, read at the minute clock (spec 3). */
import { computed } from '@preact/signals';
import { studyDay, tzOffset } from '../engine/day.ts';
import { moduleMastery } from '../engine/mastery.ts';
import { deriveMemory } from '../engine/memory.ts';
import { nextAction } from '../engine/next.ts';
import { reviewQueue } from '../engine/queue.ts';
import { streakOf } from '../engine/streak.ts';
import { KV_KEYS } from '../store/kv.ts';
import { now } from './clock.ts';
import { index } from './content.ts';
import { lessonRefs, memoryContentOf } from './home.ts';
import { events, kvRecords, progress } from './progress.ts';

export const memoryContent = computed(() => {
  const idx = index.value;
  return idx === null ? null : memoryContentOf(idx);
});

const lessons = computed(() => {
  const idx = index.value;
  return idx === null ? null : lessonRefs(idx);
});

export const memory = computed(() => {
  const content = memoryContent.value;
  return content === null ? null : deriveMemory(events.value, content);
});

export const queue = computed(() => {
  const m = memory.value;
  const content = memoryContent.value;
  if (m === null || content === null) return null;
  const at = now.value;
  return reviewQueue(m, content, at, tzOffset(at));
});

export const streak = computed(() => {
  const m = memory.value;
  return m === null ? null : streakOf(m.qualifyingDays, studyDay(now.value));
});

export const mastery = computed(() => {
  const m = memory.value;
  const content = memoryContent.value;
  return m === null || content === null ? null : moduleMastery(m, content, now.value);
});

/** The lesson note last opened, which the lesson page writes to kv because reading writes no event. */
export const currentLesson = computed(() => {
  const value = kvRecords.value[KV_KEYS.currentLesson]?.value;
  return typeof value === 'string' ? value : null;
});

/** `dismissed` once Not now was pressed on the exam date question. */
export const examAsk = computed(() => kvRecords.value[KV_KEYS.examAsk]?.value ?? null);

export const nextUp = computed(() => {
  const list = lessons.value;
  const q = queue.value;
  if (list === null || q === null) return null;
  const at = now.value;
  return nextAction({
    lessons: list,
    progress: progress.value,
    queue: q,
    currentLesson: currentLesson.value,
    today: studyDay(at),
    tz: tzOffset(at),
  });
});
```

- [ ] **Step 6: Add the review route**

In `src/app/router.ts`, replace:

```ts
  | { kind: 'check'; module: number; slug: string }
  | { kind: 'quiz'; module: number }
  | { kind: 'not-found'; hash: string };

```

with:

```ts
  | { kind: 'check'; module: number; slug: string }
  | { kind: 'quiz'; module: number }
  | { kind: 'review' }
  | { kind: 'not-found'; hash: string };

```

In `src/app/router.ts`, replace:

```ts
  if (path === '' || path === '/') return { kind: 'home' };
  if (path === '/missions') return { kind: 'missions' };
  const module = MODULE_PATH.exec(path);
  if (module) return { kind: 'module', module: Number(module[1]) };
```

with:

```ts
  if (path === '' || path === '/') return { kind: 'home' };
  if (path === '/missions') return { kind: 'missions' };
  if (path === '/s/review') return { kind: 'review' };
  const module = MODULE_PATH.exec(path);
  if (module) return { kind: 'module', module: Number(module[1]) };
```

In `src/app/router.ts`, replace:

```ts
    case 'quiz':
      return `#/s/quiz/m${pad2(route.module)}`;
    case 'not-found':
      return route.hash;
```

with:

```ts
    case 'quiz':
      return `#/s/quiz/m${pad2(route.module)}`;
    case 'review':
      return '#/s/review';
    case 'not-found':
      return route.hash;
```

In `src/app/nav.ts`, replace:

```ts
    case 'module':
    case 'missions':
    case 'not-found':
      return { kind: 'home' };
```

with:

```ts
    case 'module':
    case 'missions':
    case 'review':
    case 'not-found':
      return { kind: 'home' };
```

- [ ] **Step 7: Add the Home keys**

`Enter` on Home follows Next only while focus is not on a control, so a focused hex or link still opens itself.
`j` and `k` work from a focused link, because moving between links is their job, and they focus the first `[data-nav-item]` when none has focus.

In `src/app/keys.ts`, replace:

```ts
  /** True when the event comes from a text field. */
  typing: boolean;
  /** The event's timestamp in milliseconds. */
  at: number;
```

with:

```ts
  /** True when the event comes from a text field. */
  typing: boolean;
  /** True when focus is on a link, a button, a form field or a summary, which answer Enter themselves. */
  control: boolean;
  /** The event's timestamp in milliseconds. */
  at: number;
```

In `src/app/keys.ts`, replace:

```ts
  | { kind: 'close-term' }
  | { kind: 'g'; at: number }
  | { kind: 'navigate'; hash: string };

/** How long `g` waits for its second key. */
```

with:

```ts
  | { kind: 'close-term' }
  | { kind: 'g'; at: number }
  | { kind: 'navigate'; hash: string }
  /** Follow the Next button (`Enter` on Home). */
  | { kind: 'next' }
  /** Focus the next or previous `[data-nav-item]` (`j` and `k` on Home and module pages). */
  | { kind: 'move'; delta: 1 | -1 };

/** How long `g` waits for its second key. */
```

In `src/app/keys.ts`, replace:

```ts
    case 'p':
      return gPending(input, ctx) ? { kind: 'progress' } : null;
    case 'c':
      return ctx.route.kind === 'lesson'
```

with:

```ts
    case 'p':
      return gPending(input, ctx) ? { kind: 'progress' } : null;
    case 'r':
      return gPending(input, ctx) ? { kind: 'navigate', hash: toHash({ kind: 'review' }) } : null;
    case 'Enter':
      return ctx.route.kind === 'home' && !input.control ? { kind: 'next' } : null;
    case 'j':
    case 'k':
      return ctx.route.kind === 'home' || ctx.route.kind === 'module'
        ? { kind: 'move', delta: key === 'j' ? 1 : -1 }
        : null;
    case 'c':
      return ctx.route.kind === 'lesson'
```

Replace the whole of `src/app/keyboard.ts` with:

```ts
import { useEffect } from 'preact/hooks';
import { index } from './content.ts';
import { nextLabel } from './home.ts';
import { keyStep } from './keys.ts';
import { nextUp } from './memory.ts';
import { closeTerm, navigate, openTerm, overlay, route } from './state.ts';

/** Input types that take no typed text, so single-letter shortcuts stay on while one has focus. */
const NON_TEXT_INPUTS = new Set(['radio', 'checkbox', 'button', 'submit', 'reset', 'file', 'range', 'color']);

/** True when keys typed now would go into a text field, a text area or a select. */
export const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    (target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)));

/** True when focus is on an element that answers Enter itself: a link, a button, a form field or a summary. */
export const isControl = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('a, button, input, select, textarea, summary') !== null;

/** Follows the Next button, when it has somewhere to go. */
function followNext(): void {
  const idx = index.value;
  const action = nextUp.value;
  if (idx === null || action === null) return;
  const { href } = nextLabel(action, idx);
  if (href !== null) navigate(href);
}

/** Focuses the next or previous `[data-nav-item]`, clamped at both ends; with none focused, the first. */
function moveFocus(delta: 1 | -1): void {
  const items = [...document.querySelectorAll<HTMLElement>('[data-nav-item]')];
  if (items.length === 0) return;
  const active = document.activeElement;
  const at = active instanceof HTMLElement ? items.indexOf(active) : -1;
  const target = at === -1 ? 0 : Math.min(items.length - 1, Math.max(0, at + delta));
  items[target]?.focus();
}

/** The one window keydown listener for the global shortcuts (spec 7.4); dialogs handle their own keys. */
export function useKeyboard(): void {
  useEffect(() => {
    let gAt: number | null = null;
    const onKeyDown = (event: KeyboardEvent): void => {
      const step = keyStep(
        {
          key: event.key,
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          typing: isTyping(event.target),
          control: isControl(event.target),
          at: event.timeStamp,
        },
        {
          route: route.value,
          modules: index.value?.modules ?? [],
          overlayOpen: overlay.value !== null,
          termOpen: openTerm.value !== null,
          gAt,
        },
      );
      gAt = step.gAt;
      const command = step.command;
      if (command === null) return;
      event.preventDefault();
      switch (command.kind) {
        case 'palette':
          overlay.value = 'palette';
          break;
        case 'help':
          overlay.value = 'help';
          break;
        case 'progress':
          overlay.value = 'progress';
          break;
        case 'close-term':
          closeTerm();
          break;
        case 'navigate':
          navigate(command.hash);
          break;
        case 'next':
          followNext();
          break;
        case 'move':
          moveFocus(command.delta);
          break;
        case 'g':
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
```

- [ ] **Step 8: Migrate the stored log on open**

While `MIGRATIONS` is empty this only stamps kv `schemaVersion` with 1, once.
A future step first copies the old log and kv to kv `preMigration` with the old schema number, then rewrites both stores.

In `src/app/progress.ts`, replace:

```ts
import { computed, signal } from '@preact/signals';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { studyDay, tzOffset } from '../engine/day.ts';
import { type ContentRefs, derive } from '../engine/replay.ts';
```

with:

```ts
import { computed, signal } from '@preact/signals';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { SCHEMA_VERSION } from '../../schemas/version.ts';
import { studyDay, tzOffset } from '../engine/day.ts';
import { type ContentRefs, derive } from '../engine/replay.ts';
```

In `src/app/progress.ts`, replace:

```ts
import { allEvents, appendEvent, clearEvents, putEvents } from '../store/events.ts';
import { openDb } from '../store/idb.ts';
import { allKv, clearKv, type KvRecords, putKv, setKv } from '../store/kv.ts';
import { ulid } from '../store/ulid.ts';
import { index } from './content.ts';
```

with:

```ts
import { allEvents, appendEvent, clearEvents, putEvents } from '../store/events.ts';
import { openDb } from '../store/idb.ts';
import { allKv, clearKv, KV_KEYS, type KvRecords, putKv, setKv } from '../store/kv.ts';
import { migrateLocal } from '../store/migrations/index.ts';
import { ulid } from '../store/ulid.ts';
import { index } from './content.ts';
```

In `src/app/progress.ts`, replace:

```ts
};

/** Opens the database and loads the log and kv; on failure the app keeps working with an in-memory log. */
export async function initStore(): Promise<void> {
  if (started) return;
```

with:

```ts
};

/**
 * Brings a stored log and kv up to `SCHEMA_VERSION` (spec 8.2): a migration first keeps the old data under kv
 * `preMigration`, then rewrites both stores; kv `schemaVersion` is stamped whenever it differs.
 */
async function migrateStored(
  store: IDBDatabase,
  loaded: StudyEvent[],
  kv: KvRecords,
): Promise<{ events: StudyEvent[]; kv: KvRecords }> {
  const stored = kv[KV_KEYS.schemaVersion]?.value;
  const result = migrateLocal(typeof stored === 'number' ? stored : null, { events: loaded, kv });
  const now = new Date();
  let out = { events: loaded, kv };
  if (result.migrated) {
    const copy = await setKv(
      store,
      KV_KEYS.preMigration,
      { schemaVersion: result.from, events: loaded, kv },
      now,
    );
    // Migration steps return events in the current schema, which the app writes itself, as record() does.
    const migrated = result.data.events as StudyEvent[];
    const nextKv = {
      ...result.data.kv,
      [KV_KEYS.preMigration]: { value: copy.value, updatedAt: copy.updatedAt },
    };
    await clearEvents(store);
    await clearKv(store);
    await putEvents(store, migrated);
    await putKv(store, nextKv);
    out = { events: migrated, kv: nextKv };
  }
  if (out.kv[KV_KEYS.schemaVersion]?.value !== SCHEMA_VERSION) {
    const stamp = await setKv(store, KV_KEYS.schemaVersion, SCHEMA_VERSION, now);
    out = {
      ...out,
      kv: { ...out.kv, [KV_KEYS.schemaVersion]: { value: stamp.value, updatedAt: stamp.updatedAt } },
    };
  }
  return out;
}

/** Opens the database, migrates and loads the log and kv; on failure the app keeps working with an in-memory log. */
export async function initStore(): Promise<void> {
  if (started) return;
```

In `src/app/progress.ts`, replace:

```ts
    db = await openDb();
    const [loaded, kv] = await Promise.all([allEvents(db), allKv(db)]);
    events.value = mergeEvents(loaded, events.value);
    kvRecords.value = { ...kv, ...kvRecords.value };
  } catch {
    db = null;
```

with:

```ts
    db = await openDb();
    const [loaded, kv] = await Promise.all([allEvents(db), allKv(db)]);
    const current = await migrateStored(db, loaded, kv);
    events.value = mergeEvents(current.events, events.value);
    kvRecords.value = { ...current.kv, ...kvRecords.value };
  } catch {
    db = null;
```

- [ ] **Step 9: Mark the module rows, list the new keys, and pass `control` from the runner**

In `src/app/screens/ModulePage.tsx`, replace:

```tsx
          return (
            <li key={l.slug}>
              <a class="row" href={`#/m/${pad2(module)}/l/${l.slug}`}>
                <span class="row-n">{l.n}</span>
                <span class="row-title">{l.title}</span>
```

with:

```tsx
          return (
            <li key={l.slug}>
              <a class="row" href={`#/m/${pad2(module)}/l/${l.slug}`} data-nav-item>
                <span class="row-n">{l.n}</span>
                <span class="row-title">{l.title}</span>
```

In `src/app/screens/Help.tsx`, replace:

```tsx
  { keys: ['?'], joiner: '', action: 'This help' },
  { keys: ['g', 'h'], joiner: 'then', action: 'Home' },
  { keys: ['g', 'p'], joiner: 'then', action: 'Progress' },
  { keys: ['[', ']'], joiner: 'and', action: 'Previous or next lesson' },
  { keys: ['c'], joiner: '', action: 'Check yourself' },
```

with:

```tsx
  { keys: ['?'], joiner: '', action: 'This help' },
  { keys: ['g', 'h'], joiner: 'then', action: 'Home' },
  { keys: ['g', 'r'], joiner: 'then', action: 'Review' },
  { keys: ['g', 'p'], joiner: 'then', action: 'Progress' },
  { keys: ['Enter'], joiner: '', action: 'Next (Home)' },
  { keys: ['j', 'k'], joiner: 'and', action: 'Move (Home and Module)' },
  { keys: ['[', ']'], joiner: 'and', action: 'Previous or next lesson' },
  { keys: ['c'], joiner: '', action: 'Check yourself' },
```

In `src/app/screens/Runner.tsx`, replace:

```tsx
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, modules } from '../content.ts';
import { isTyping } from '../keyboard.ts';
import { neighbors } from '../nav.ts';
import { newSessionSeed, progress, record, storeReady } from '../progress.ts';
```

with:

```tsx
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, modules } from '../content.ts';
import { isControl, isTyping } from '../keyboard.ts';
import { neighbors } from '../nav.ts';
import { newSessionSeed, progress, record, storeReady } from '../progress.ts';
```

In `src/app/screens/Runner.tsx`, replace:

```tsx
          shift: event.shiftKey,
          typing: isTyping(target),
          select: target instanceof HTMLSelectElement,
          at: event.timeStamp,
```

with:

```tsx
          shift: event.shiftKey,
          typing: isTyping(target),
          control: isControl(target),
          select: target instanceof HTMLSelectElement,
          at: event.timeStamp,
```

- [ ] **Step 10: Run the tests and the checks and see them pass**

```bash
pnpm test tests/unit/home.test.ts tests/unit/keys.test.ts tests/unit/router.test.ts tests/unit/nav.test.ts tests/unit/runner-keys.test.ts
pnpm check
```

Expected: PASS (5 files), and `pnpm check` exits 0.

- [ ] **Step 11: Commit**

```bash
pnpm lint:fix
git add src/app/config.ts src/app/clock.ts src/app/home.ts src/app/memory.ts src/app/progress.ts src/app/router.ts src/app/nav.ts src/app/keys.ts src/app/keyboard.ts src/app/screens/ModulePage.tsx src/app/screens/Help.tsx src/app/screens/Runner.tsx tests/unit/home.test.ts tests/unit/keys.test.ts tests/unit/router.test.ts tests/unit/nav.test.ts tests/unit/runner-keys.test.ts
git commit -m "Add the memory signals, the review route and the Home keys" -m "Computed signals replay the log into memory, the queue, the streak, mastery and Next at a minute clock. The #/s/review route, g r, Enter and j/k arrive, and the stored log is migrated and stamped with its schema version on open."
```

## Task 13: The top bar and the one-time lines

Depends on Tasks 2, 4 and 12.
The top bar moves out of `App.tsx` into `TopBar.tsx` and gains, before Progress, the due count, the streak, the 2 px level line and the XP flash of spec 7.2; `App.tsx` starts the clock and shows `Rules updated, progress recalculated.` once after an engine change (spec 8.2).
The bar's rules live in a pure `src/app/topbar.ts`, so they have unit tests.
The due count is the queue's item count, misconceptions included, which is what a review started from it covers and what Next counts.
The flash shows at full contrast with no fade, so an axe scan in the middle of it never sees a faded text, and a jump above 200 XP (an import or a merge) never flashes.

**Files:**
- Create: `src/app/topbar.ts`, `src/app/screens/TopBar.tsx`, `tests/unit/topbar.test.ts`
- Modify: `src/app/App.tsx`, `src/ui/base.css`
- Test: `tests/unit/topbar.test.ts`, `tests/e2e/reader.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/topbar.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { dueLabel, FLASH_MAX, rulesLine, streakLabel, xpGain } from '../../src/app/topbar.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';

describe('top bar labels', () => {
  it('names the due count and the streak for screen readers, in the singular for one', () => {
    expect(dueLabel(18)).toBe('18 concepts due; start a review');
    expect(dueLabel(1)).toBe('1 concept due; start a review');
    expect(streakLabel(9)).toBe('Streak 9 days; open Progress');
    expect(streakLabel(1)).toBe('Streak 1 day; open Progress');
  });
});

describe('xpGain', () => {
  it('flashes a gain only after the first value, and never for more than 200 at once', () => {
    expect(xpGain(null, 120)).toBeNull();
    expect(xpGain(120, 130)).toBe(10);
    expect(xpGain(130, 130)).toBeNull();
    expect(xpGain(130, 100)).toBeNull();
    expect(FLASH_MAX).toBe(200);
    expect(xpGain(100, 300)).toBe(200);
    expect(xpGain(100, 301)).toBeNull();
  });
});

describe('rulesLine', () => {
  it('shows the line once the store is ready, the engine changed and the log has events', () => {
    expect(rulesLine({ ready: true, stored: 1, events: 40 })).toBe('show');
    expect(rulesLine({ ready: true, stored: undefined, events: 40 })).toBe('show');
  });

  it('stamps the engine version silently on an empty log, and says nothing once it matches', () => {
    expect(rulesLine({ ready: true, stored: undefined, events: 0 })).toBe('stamp');
    expect(rulesLine({ ready: true, stored: ENGINE_VERSION, events: 40 })).toBe('none');
    expect(rulesLine({ ready: false, stored: undefined, events: 0 })).toBe('none');
  });
});
```

- [ ] **Step 2: Run it and see it fail**

```bash
pnpm test tests/unit/topbar.test.ts
```

Expected: FAIL, because `../../src/app/topbar.ts` does not exist yet.

- [ ] **Step 3: Add the top bar rules**

Create `src/app/topbar.ts` with:

```ts
/** Pure rules of the top bar (spec 7.2) and the engine-change line (spec 8.2), so the tests run without a browser. */
import { ENGINE_VERSION } from '../engine/replay.ts';

/** How long an XP gain shows beside the level line. */
export const FLASH_MS = 600;
/** A larger jump comes from an import or a merge, not from one answer, so it never flashes. */
export const FLASH_MAX = 200;

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export function dueLabel(due: number): string {
  return `${plural(due, 'concept', 'concepts')} due; start a review`;
}

export function streakLabel(days: number): string {
  return `Streak ${plural(days, 'day', 'days')}; open Progress`;
}

/** The gain to flash when XP moves from `before` to `after`; null for the first value, no gain, or a jump. */
export function xpGain(before: number | null, after: number): number | null {
  if (before === null) return null;
  const gain = after - before;
  return gain > 0 && gain <= FLASH_MAX ? gain : null;
}

/**
 * `Rules updated, progress recalculated.` (spec 8.2): `show` when the engine changed since the log was last
 * replayed, `stamp` to record the version silently on an empty log, `none` otherwise.
 */
export function rulesLine(args: {
  ready: boolean;
  stored: unknown;
  events: number;
}): 'none' | 'show' | 'stamp' {
  if (!args.ready || args.stored === ENGINE_VERSION) return 'none';
  return args.events === 0 ? 'stamp' : 'show';
}
```

- [ ] **Step 4: Add the top bar**

The flash waits for the stored log, so the first XP value after a load never flashes.
Below 480 px the CSS of Step 6 hides the word `due` and shows the dot, so the items read `18 · 9d` (spec 7.5).

Create `src/app/screens/TopBar.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { levelProgress } from '../../engine/level.ts';
import { memory, queue, streak } from '../memory.ts';
import { storeReady } from '../progress.ts';
import { toHash } from '../router.ts';
import { navigate, overlay } from '../state.ts';
import { dueLabel, FLASH_MS, streakLabel, xpGain } from '../topbar.ts';

const openProgress = (): void => {
  overlay.value = 'progress';
};

/** Shows each XP gain for 600 ms; the first value after the log loads never flashes. */
function useXpFlash(xp: number | null): { gain: number; key: number } | null {
  const before = useRef<number | null>(null);
  const [flash, setFlash] = useState<{ gain: number; key: number } | null>(null);
  useEffect(() => {
    if (xp === null) return;
    const gain = xpGain(before.current, xp);
    before.current = xp;
    if (gain !== null) setFlash((shown) => ({ gain, key: (shown?.key ?? 0) + 1 }));
  }, [xp]);
  useEffect(() => {
    if (flash === null) return;
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [flash]);
  return flash;
}

/** The 44 px top bar (spec 7.2): the due count, the streak, Progress and Search, over the 2 px level line. */
export function TopBar() {
  const ready = storeReady.value;
  const due = ready ? (queue.value?.items.length ?? 0) : 0;
  const days = ready ? (streak.value?.current ?? 0) : 0;
  const xp = ready ? (memory.value?.xp ?? null) : null;
  const flash = useXpFlash(xp);
  return (
    <header class="topbar">
      <nav class="topbar-inner" aria-label="Site">
        <a class="brand" href="#/">
          CCP
        </a>
        <a href="#/missions">Missions</a>
        {(due > 0 || days > 0) && (
          <span class="topbar-stats">
            {due > 0 && (
              <button
                class="topbar-button"
                type="button"
                aria-label={dueLabel(due)}
                onClick={() => navigate(toHash({ kind: 'review' }))}
              >
                {due}
                <span class="topbar-word"> due</span>
              </button>
            )}
            {due > 0 && days > 0 && (
              <span class="topbar-sep" aria-hidden="true">
                ·
              </span>
            )}
            {days > 0 && (
              <button
                class="topbar-button"
                type="button"
                aria-label={streakLabel(days)}
                onClick={openProgress}
              >
                {days}d
              </button>
            )}
          </span>
        )}
        <button class="topbar-button" type="button" onClick={openProgress}>
          Progress
        </button>
        <button
          class="search"
          type="button"
          onClick={() => {
            overlay.value = 'palette';
          }}
        >
          Search <kbd>/</kbd>
        </button>
        {flash !== null && (
          <span key={flash.key} class="xp-flash" aria-hidden="true">
            +{flash.gain}
          </span>
        )}
      </nav>
      <div class="level-line" aria-hidden="true">
        <span class="level-fill" style={{ width: `${xp === null ? 0 : levelProgress(xp) * 100}%` }} />
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Render the top bar, start the clock and add the rules line**

With an empty log the engine version is written silently, so a first visit never shows the rules line.

Replace the whole of `src/app/App.tsx` with:

```tsx
import { useEffect } from 'preact/hooks';
import { ENGINE_VERSION } from '../engine/replay.ts';
import { KV_KEYS } from '../store/kv.ts';
import { startClock } from './clock.ts';
import { index, loadError, loadIndex } from './content.ts';
import { useKeyboard } from './keyboard.ts';
import { events, initStore, kvRecords, saveError, storeReady, writeKv } from './progress.ts';
import { Help } from './screens/Help.tsx';
import { Palette } from './screens/Palette.tsx';
import { Progress } from './screens/Progress.tsx';
import { Screen } from './screens/Screen.tsx';
import { TopBar } from './screens/TopBar.tsx';
import { overlay, route } from './state.ts';
import { rulesLine } from './topbar.ts';

/** The shell: the top bar, the screen for the route once the content index has loaded, and the open dialog. */
export function App() {
  useEffect(() => {
    loadIndex();
    void initStore();
    return startClock();
  }, []);
  useKeyboard();
  return (
    <>
      <TopBar />
      <SaveError />
      <RulesUpdated />
      <main id="main" class="page" tabIndex={-1}>
        <Body />
      </main>
      {overlay.value === 'palette' && <Palette />}
      {overlay.value === 'help' && <Help />}
      {overlay.value === 'progress' && <Progress />}
    </>
  );
}

const openProgress = (): void => {
  overlay.value = 'progress';
};

/** The banner of spec 8.1 while writes fail; the log still lives in memory, so an export saves it. */
function SaveError() {
  const message = saveError.value;
  if (message === null) return null;
  return (
    <div class="banner" role="alert">
      <span>{message}</span>
      <button class="button" type="button" onClick={openProgress}>
        Export
      </button>
    </div>
  );
}

const stampEngine = (): void => {
  void writeKv(KV_KEYS.engineVersion, ENGINE_VERSION);
};

/** The one line of spec 8.2 after `ENGINE_VERSION` changes; an empty log takes the new version silently. */
function RulesUpdated() {
  const state = rulesLine({
    ready: storeReady.value,
    stored: kvRecords.value[KV_KEYS.engineVersion]?.value,
    events: events.value.length,
  });
  useEffect(() => {
    if (state === 'stamp') stampEngine();
  }, [state]);
  if (state !== 'show') return null;
  return (
    <div class="banner banner-info" role="status">
      <span>Rules updated, progress recalculated.</span>
      <button class="link-button" type="button" onClick={stampEngine}>
        Dismiss
      </button>
    </div>
  );
}

function Body() {
  const error = loadError.value;
  const idx = index.value;
  if (error !== null) return <p role="alert">{error}</p>;
  if (idx === null) return <p class="muted">Loading</p>;
  return <Screen route={route.value} idx={idx} />;
}
```

- [ ] **Step 6: Style the top bar items**

`.topbar-inner` becomes the flash's positioning box, so the flash sits under the right end of the page column.

In `src/ui/base.css`, replace:

```css

.topbar-inner {
  display: flex;
  align-items: center;
```

with:

```css

.topbar-inner {
  position: relative;
  display: flex;
  align-items: center;
```

Append to the end of `src/ui/base.css`:

```css
/* Top bar items (spec 7.2): the due count and the streak, the 2 px level line and the XP flash. */
.topbar-stats {
  display: inline-flex;
  align-items: center;
  gap: 16px;
}

.topbar-sep {
  display: none;
  color: var(--muted);
}

.level-line {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 2px;
}

.level-fill {
  display: block;
  height: 100%;
  background: var(--active);
}

/* No fade: the flash shows at full contrast for its whole 600 ms. */
.xp-flash {
  position: absolute;
  top: calc(100% + 6px);
  right: 16px;
  padding: 0 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--active);
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.banner-info {
  box-shadow: inset 3px 0 0 var(--active);
}

/* On a phone the items read `18 · 9d` (spec 7.5). */
@media (max-width: 480px) {
  .topbar-inner {
    gap: 10px;
  }

  .topbar-stats {
    gap: 4px;
  }

  .topbar-word {
    display: none;
  }

  .topbar-sep {
    display: inline;
  }
}
```

- [ ] **Step 7: Run the tests and the checks and see them pass**

```bash
pnpm test tests/unit/topbar.test.ts
pnpm check
pnpm build && pnpm e2e tests/e2e/reader.spec.ts
```

Expected: PASS, `pnpm check` exits 0, and every reader test passes in both projects.

- [ ] **Step 8: Verify by hand at 1280 and 375 px**

Run `pnpm dev` and check each of these, fixing anything that looks off:
- A lesson check answered right with Sure shows `+10` under the right end of the bar for 600 ms, and the level line grows.
- With a concept due and a streak, the bar reads `1 due   1d` at 1280 px and `1 · 1d` at 375 px, with no sideways scroll.
- `1 due` opens `#/s/review`, and the streak opens Progress.
- With a Phase 1 log and no kv `engineVersion`, `Rules updated, progress recalculated.` shows under the bar, and Dismiss removes it for good (reload to check).

- [ ] **Step 9: Commit**

```bash
pnpm lint:fix
git add src/app/topbar.ts src/app/screens/TopBar.tsx src/app/App.tsx src/ui/base.css tests/unit/topbar.test.ts
git commit -m "Add the top bar with due count, streak and level" -m "TopBar shows the due count, the streak, the 2 px level line and a short XP flash, and App shows the rules-updated line once after an engine change."
```

## Task 14: Home with Next, the hexes and the exam date question

Depends on Tasks 7 and 12.
Home becomes the Next button with its time estimate, the streak reset line, the 4-5-4 hex map and at most one reminder line, in the order of spec 4.6; the 13-row module list goes, because every hex links to its module (spec 7.3).
Next waits for the stored log, so a returning reader never sees the first-run lesson flash past; with nothing left it reads `Done for today` over the `Nothing due.` line.
The exam date question shows once every Module 1 lesson is read (spec 7.5): Save writes a `settings` event and Not now writes kv `examAsk`.
The lesson page writes kv `currentLesson` on each open, which Next's `Continue` reads.
Hex numbers stay in `--text` up to the solid band, about 4.6:1 on the .55 fill, and turn `--pane` only for mastered, which needs a boss and so never shows in Phase 2.

**Files:**
- Create: `src/ui/HexMap.tsx`
- Modify: `src/app/screens/Home.tsx`, `src/app/screens/LessonPage.tsx`, `src/ui/base.css`, `tests/e2e/reader.spec.ts`
- Test: `tests/e2e/reader.spec.ts`, `tests/e2e/practice.spec.ts`

- [ ] **Step 1: Write the failing end-to-end test**

"Home lists the 13 modules" becomes "Home shows 13 module hexes".

In `tests/e2e/reader.spec.ts`, replace:

```ts
}

test('Home lists the 13 modules', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await expect(page.locator('main a[href^="#/m/"]')).toHaveCount(13);
  await expect(page.locator('main a[href="#/m/05"]')).toContainText('Networking');
});

```

with:

```ts
}

test('Home shows 13 module hexes', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await expect(page.locator('main a.hex')).toHaveCount(13);
  await expect(
    page.getByRole('link', { name: 'Module 5 Networking, mastery 0, not started' }),
  ).toHaveAttribute('href', '#/m/05');
  await expect(page.locator('main a[data-next]')).toContainText(
    'Start Module 1: Welcome to AWS Cloud Practitioner Essentials',
  );
});

```

- [ ] **Step 2: Run it and see it fail**

```bash
pnpm build && pnpm e2e tests/e2e/reader.spec.ts -g "Home shows 13 module hexes"
```

Expected: FAIL in both projects, because Home has no `a.hex` yet.

- [ ] **Step 3: Add the hex map**

Create `src/ui/HexMap.tsx` with:

```tsx
import { hexLabel } from '../app/home.ts';
import { pad2 } from '../app/router.ts';
import type { HexBand } from '../engine/mastery.ts';

export interface Hex {
  module: number;
  short: string;
  mastery: number;
  band: HexBand;
}

/** A pointy-top hexagon in a 100 by 115.47 box, inset by half its stroke. */
const HEXAGON = '50,2 98,29.7 98,85.8 50,113.5 2,85.8 2,29.7';
/** The honeycomb of spec 7.3: rows of 4, 5 and 4 modules. */
const ROWS = [4, 5, 4] as const;

/** The 13 module hexes (spec 3.8 and 7.3), filled in graphite by mastery band; each opens its module. */
export function HexMap({ hexes }: { hexes: readonly Hex[] }) {
  const rows: Hex[][] = [];
  let start = 0;
  for (const size of ROWS) {
    rows.push(hexes.slice(start, start + size));
    start += size;
  }
  return (
    <nav class="hexes" aria-label="Modules">
      {rows.map((row) => (
        <div key={row[0]?.module ?? 0} class="hex-row">
          {row.map((h) => (
            <a
              key={h.module}
              class={`hex hex-${h.band}`}
              href={`#/m/${pad2(h.module)}`}
              data-nav-item
              aria-label={hexLabel(h.module, h.short, h.mastery, h.band)}
            >
              <svg viewBox="0 0 100 115.47" aria-hidden="true" focusable="false">
                <polygon points={HEXAGON} />
              </svg>
              <span class="hex-n">{h.module}</span>
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Rewrite Home**

Replace the whole of `src/app/screens/Home.tsx` with:

```tsx
import { useState } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { hexBand } from '../../engine/mastery.ts';
import { reminderDue } from '../../store/backup.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { HexMap } from '../../ui/HexMap.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { TARGET_EXAM_DATE } from '../config.ts';
import { examAskDue, examDateLabel, nextLabel, nothingDueLine, streakLine } from '../home.ts';
import { examAsk, mastery, memory, nextUp, queue, streak } from '../memory.ts';
import { events, progress, record, storeReady, writeKv } from '../progress.ts';
import { overlay } from '../state.ts';
import { lastExportAt } from './Progress.tsx';

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Home `#/` (spec 7.2): the Next button, the streak reset line, the 13 hexes and at most one reminder line. */
export function Home({ idx }: { idx: ContentIndex }) {
  useTitle('Home');
  const byModule = mastery.value;
  const hexes = idx.modules.map((m) => {
    const value = byModule?.get(m.n) ?? 0;
    return { module: m.n, short: m.short, mastery: value, band: hexBand(value, false) };
  });
  return (
    <>
      <h1>AWS Cloud Practitioner Essentials</h1>
      <NextBlock idx={idx} />
      <StreakReset />
      <HexMap hexes={hexes} />
      <HomeLine idx={idx} />
      <p>
        <a href="#/missions">Missions: real AWS, done by hand</a>
      </p>
    </>
  );
}

/** The Next button (spec 4.6), or "Done for today" with when the next reviews fall due. */
function NextBlock({ idx }: { idx: ContentIndex }) {
  // Next waits for the stored log, so a returning reader never sees the first-run lesson flash past.
  const action = storeReady.value ? nextUp.value : null;
  if (action === null) return <div class="next-block" />;
  const { label, href, minutes } = nextLabel(action, idx);
  if (href === null) {
    const q = queue.value;
    return (
      <div class="next-block">
        <p class="next-done">{label}</p>
        {q !== null && <p class="muted">{nothingDueLine(q, now.value)}</p>}
      </div>
    );
  }
  return (
    <div class="next-block">
      <a class="next" href={href} data-next>
        <span class="next-label">{label}</span>
        <span class="next-meta">
          {minutes !== null && <span>~{minutes} min</span>}
          <kbd class="next-key">Enter</kbd>
        </span>
      </a>
    </div>
  );
}

function StreakReset() {
  const s = storeReady.value ? streak.value : null;
  const line = s === null ? null : streakLine(s);
  return line === null ? null : <p class="muted streak-line">{line}</p>;
}

const openProgress = (): void => {
  overlay.value = 'progress';
};

/** At most one line (spec 4.6): the exam date question, the backup reminder, or the first-run line. */
function HomeLine({ idx }: { idx: ContentIndex }) {
  if (!storeReady.value) return null;
  const examDate = memory.value?.examDate ?? null;
  if (examAskDue({ idx, lessonsDone: progress.value.lessonsDone, examDate, examAsk: examAsk.value })) {
    return <ExamQuestion />;
  }
  if (events.value.length === 0) {
    return (
      <p class="home-line">
        Progress lives in this browser.{' '}
        <button class="link-button" type="button" onClick={openProgress}>
          Import a backup
        </button>
      </p>
    );
  }
  const last = lastExportAt();
  const at = now.value;
  if (!reminderDue(events.value, last, at)) return null;
  const days = last === null ? 0 : Math.floor((at.getTime() - new Date(last).getTime()) / DAY_MS);
  return (
    <p class="home-line">
      {last === null ? 'No backup yet.' : `Last backup ${days} days ago.`}{' '}
      <button class="link-button" type="button" onClick={openProgress}>
        Export a backup
      </button>
    </p>
  );
}

/** The one-time exam date question (spec 7.5); Save writes a settings event, Not now a kv mark. */
function ExamQuestion() {
  const [date, setDate] = useState(TARGET_EXAM_DATE);
  const valid = ISO_DAY.test(date);
  return (
    <form
      class="home-line exam-ask"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) void record({ t: 'settings', patch: { examDate: date } });
      }}
    >
      <p class="exam-ask-question">No exam date yet. The plan targets {examDateLabel(TARGET_EXAM_DATE)}.</p>
      <div class="exam-ask-row">
        <label class="date-field">
          Exam date
          <input type="date" value={date} required onInput={(event) => setDate(event.currentTarget.value)} />
        </label>
        <button class="button" type="submit" disabled={!valid}>
          Save
        </button>
        <button class="link-button" type="button" onClick={() => void writeKv(KV_KEYS.examAsk, 'dismissed')}>
          Not now
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Remember the lesson being read**

In `src/app/screens/LessonPage.tsx`, replace:

```tsx
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import type { ContentIndex, ModuleChunk } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
```

with:

```tsx
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import type { ContentIndex, ModuleChunk } from '../../../schemas/chunks.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
```

In `src/app/screens/LessonPage.tsx`, replace:

```tsx
import { findEvidence } from '../evidence.ts';
import { neighbors } from '../nav.ts';
import { progress, record, storeReady } from '../progress.ts';
import { pad2 } from '../router.ts';
import { homedConcepts } from '../runner.ts';
```

with:

```tsx
import { findEvidence } from '../evidence.ts';
import { neighbors } from '../nav.ts';
import { progress, record, storeReady, writeKv } from '../progress.ts';
import { pad2 } from '../router.ts';
import { homedConcepts } from '../runner.ts';
```

In `src/app/screens/LessonPage.tsx`, replace:

```tsx
  useTitle(lessonMeta?.title ?? 'Not found');
  useEffect(() => ensureModule(module), [module]);

  // A layout effect, so the note opens at its anchor and its terms answer clicks from the first frame it shows.
```

with:

```tsx
  useTitle(lessonMeta?.title ?? 'Not found');
  useEffect(() => ensureModule(module), [module]);

  // The lesson being read, for Next's "Continue" (spec 4.6): reading writes no event, so kv keeps it, once per open.
  const known = lessonMeta !== undefined;
  const ready = storeReady.value;
  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    if (ready && known) void writeKv(KV_KEYS.currentLesson, `m${pad2(module)}/${slug}`);
  }, [ready, known, module, slug]);

  // A layout effect, so the note opens at its anchor and its terms answer clicks from the first frame it shows.
```

- [ ] **Step 6: Style Home**

The rows of the honeycomb nest by a quarter of a hex's height; 5 hexes of 56 px with 6 px gaps fit the 328 px column of a 360 px phone.
The reminder line loses the negative margin it had under the old subtitle.

In `src/ui/base.css`, replace:

```css

.home-line {
  margin: -8px 0 24px;
}

```

with:

```css

.home-line {
  margin: 0 0 16px;
}

```

Append to the end of `src/ui/base.css`:

```css
/* Home (spec 7.2): the Next button, the streak reset line, the hex map and the one reminder line. */
.next-block {
  min-height: 64px;
  margin: 16px 0;
}

.next {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
  min-height: 56px;
  padding: 12px 16px;
  color: var(--pane);
  text-decoration: none;
  background: var(--active);
  border-radius: 8px;
}

.next-label {
  font-size: 1.0625rem;
  font-weight: 600;
}

.next:hover .next-label {
  text-decoration: underline;
}

.next-meta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
}

.next-key {
  color: var(--pane);
  background: transparent;
  border-color: var(--muted);
}

.next-done {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.next-done + .muted {
  margin: 4px 0 0;
}

.streak-line {
  margin: -8px 0 16px;
}

.hexes {
  --hex: 56px;
  --hex-gap: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 24px 0;
}

.hex-row {
  display: flex;
  gap: var(--hex-gap);
}

/* Rows nest by a quarter of a hex's height, with the same gap between rows as within them. */
.hex-row + .hex-row {
  margin-top: calc(var(--hex) * -0.2887 + var(--hex-gap) * 0.866);
}

.hex {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--hex);
  height: calc(var(--hex) * 1.1547);
  color: var(--text);
  text-decoration: none;
}

.hex svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hex polygon {
  fill: var(--active);
  stroke: var(--muted);
  stroke-width: 2;
}

.hex-outline polygon {
  fill: none;
}

.hex-faint polygon {
  fill-opacity: 0.12;
}

.hex-light polygon {
  fill-opacity: 0.3;
}

.hex-solid polygon {
  fill-opacity: 0.55;
}

.hex-mastered polygon {
  fill-opacity: 0.85;
}

.hex-mastered {
  color: var(--pane);
}

.hex:hover polygon {
  stroke: var(--active);
  stroke-width: 4;
}

.hex-n {
  position: relative;
  font-size: 1.125rem;
  font-weight: 700;
}

.exam-ask-question {
  margin: 0 0 8px;
}

.exam-ask-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
}

.date-field {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.date-field input {
  min-height: 36px;
  padding: 0 8px;
  font: inherit;
  color: var(--text);
  background: var(--pane);
  border: 1px solid var(--muted);
  border-radius: 6px;
}

@media (min-width: 600px) {
  .hexes {
    --hex: 72px;
    --hex-gap: 8px;
  }
}

@media (hover: none) {
  .next-key {
    display: none;
  }
}
```

- [ ] **Step 7: Run the checks and the end-to-end tests and see them pass**

```bash
pnpm check
pnpm build && pnpm e2e tests/e2e/reader.spec.ts tests/e2e/practice.spec.ts
```

Expected: `pnpm check` exits 0, and every test passes in both projects, including Home's axe scan and sideways-scroll check.

- [ ] **Step 8: Verify by hand at 1280, 375 and 360 px**

Run `pnpm dev` and check each of these, fixing anything that looks off:
- A first run shows `Start Module 1: Welcome to AWS Cloud Practitioner Essentials` with `~4 min` and `Enter`, 13 outlined hexes in rows of 4, 5 and 4, and `Progress lives in this browser.`.
- `Enter` on Home opens that lesson; back on Home, Next reads `Continue: Welcome to AWS Cloud Practitioner Essentials`.
- `j` focuses hex 1, `j` again hex 2, `k` hex 1, and Tab from the Next button reaches the hexes in order.
- After every Module 1 lesson is read, the exam date question shows with `Sat 14 Nov` and the field set to `2026-11-14`; Save hides it for good, and on a fresh log Not now does too.
- No hex, line or field scrolls sideways at 360 px.

- [ ] **Step 9: Commit**

```bash
pnpm lint:fix
git add src/ui/HexMap.tsx src/app/screens/Home.tsx src/app/screens/LessonPage.tsx src/ui/base.css tests/e2e/reader.spec.ts
git commit -m "Add Home with the Next button, the hexes and the exam date question" -m "Home shows Next with its time estimate, the streak reset line, the 4-5-4 hex map and the one-time exam date question, and the lesson page remembers the lesson being read for Continue."
```

## Task 15: Reviews in the runner with relearn, XP and misconceptions, and Progress additions

Depends on Tasks 3, 6 and 12, and builds on the files Tasks 13 and 14 changed.
The runner splits into `ModuleRunner` (lesson checks and quizzes, as before apart from the quiz's recall order) and `ReviewRunner`, which share `Session`, `Question` and the end line.
`ReviewRunner` resumes a review started today, abandons an open one from an earlier study day, then loads the modules of the first 20 queue concepts and starts with `selectCheck` over them.
A resumed review whose questions sit in modules not loaded yet loads every module, and the index's `questionVersions` tells such a question apart from a retired one.
`Session` walks `sessionItems`, so a wrong review answer adds its relearn item 5 places later, a reload recomputes the same list, and the session submits once every item, relearn steps included, has an answer.
The live region reads `verdictAnnouncement` once the answer is stored, with the XP the replay gave that event; a concept that carried a misconception when its question showed opens the feedback with `You were sure last time` and every why open.
Every mode now ends with `endSummaryLine`, so `practice.spec.ts` reads the score with a pattern that allows the XP part.
Progress gains the level and streak lines and an Exam date section after Backup, so the dialog's first focus stays on Export; Clear also writes kv `examAsk`, so Home never asks again after a deliberate clear.

**Files:**
- Modify: `src/app/runner.ts`, `src/app/screens/Runner.tsx`, `src/app/screens/Screen.tsx`, `src/app/screens/Progress.tsx`, `src/ui/base.css`, `tests/unit/runner.test.ts`, `tests/e2e/practice.spec.ts`
- Test: `tests/unit/runner.test.ts`, `tests/e2e/practice.spec.ts`, `tests/e2e/reader.spec.ts`

- [ ] **Step 1: Write the failing tests**

`endLine` goes, replaced by `endSummaryLine`.

In `tests/unit/runner.test.ts`, replace:

```ts
  collapseSpace,
  displayOrder,
  endLine,
  isCorrect,
  modeLabel,
  quizAvailability,
} from '../../src/app/runner.ts';

```

with:

```ts
  collapseSpace,
  displayOrder,
  endSummaryLine,
  isCorrect,
  modeLabel,
  quizAvailability,
  verdictAnnouncement,
} from '../../src/app/runner.ts';

```

In `tests/unit/runner.test.ts`, replace:

```ts

describe('labels', () => {
  it('writes the end line and the mode names', () => {
    expect(endLine(9, 12)).toBe('9/12 correct');
    expect(modeLabel('check')).toBe('Lesson check');
    expect(modeLabel('quiz')).toBe('Module quiz');
  });
});
```

with:

```ts

describe('labels', () => {
  it('names the modes', () => {
    expect(modeLabel('check')).toBe('Lesson check');
    expect(modeLabel('quiz')).toBe('Module quiz');
    expect(modeLabel('review')).toBe('Review');
  });

  it('announces the verdict with the XP of the answer, and the verdict alone at 0 XP', () => {
    expect(verdictAnnouncement(true, 10)).toBe('Correct. Plus 10 XP');
    expect(verdictAnnouncement(false, 5)).toBe('Incorrect. Plus 5 XP');
    expect(verdictAnnouncement(true, 0)).toBe('Correct.');
    expect(verdictAnnouncement(false, 0)).toBe('Incorrect.');
  });

  it('writes the end line with XP and the concepts back tomorrow, leaving out each part at 0', () => {
    expect(endSummaryLine({ correct: 9, total: 12, xp: 95, backTomorrow: 3 })).toBe(
      '9/12 · +95 XP · 3 concepts back tomorrow',
    );
    expect(endSummaryLine({ correct: 9, total: 12, xp: 95, backTomorrow: 1 })).toBe(
      '9/12 · +95 XP · 1 concept back tomorrow',
    );
    expect(endSummaryLine({ correct: 4, total: 5, xp: 0, backTomorrow: 2 })).toBe(
      '4/5 · 2 concepts back tomorrow',
    );
    expect(endSummaryLine({ correct: 5, total: 5, xp: 50, backTomorrow: 0 })).toBe('5/5 · +50 XP');
    expect(endSummaryLine({ correct: 0, total: 3, xp: 0, backTomorrow: 0 })).toBe('0/3');
  });
});
```

- [ ] **Step 2: Run them and see them fail**

```bash
pnpm test tests/unit/runner.test.ts
```

Expected: FAIL, 3 tests in `labels`, because `verdictAnnouncement` and `endSummaryLine` do not exist and `modeLabel('review')` is `Module quiz`.

- [ ] **Step 3: Add the labels**

In `src/app/runner.ts`, replace:

```ts
import type { ContentIndex, ModuleChunk, QuestionView } from '../../schemas/chunks.ts';
import type { Mode } from '../../schemas/events.ts';
import { mulberry32, seedFor, shuffle } from '../engine/rng.ts';

```

with:

```ts
import type { ContentIndex, ModuleChunk, QuestionView } from '../../schemas/chunks.ts';
import type { Mode } from '../../schemas/events.ts';
import type { SessionSummary } from '../engine/memory.ts';
import { mulberry32, seedFor, shuffle } from '../engine/rng.ts';

```

In `src/app/runner.ts`, replace:

```ts
}

export function endLine(correct: number, total: number): string {
  return `${correct}/${total} correct`;
}

export function modeLabel(mode: Mode): string {
  return mode === 'check' ? 'Lesson check' : 'Module quiz';
}
```

with:

```ts
}

/** The end of a session (spec 7.3): `9/12 · +95 XP · 3 concepts back tomorrow`, leaving out each part at 0. */
export function endSummaryLine(s: SessionSummary): string {
  const parts = [`${s.correct}/${s.total}`];
  if (s.xp > 0) parts.push(`+${s.xp} XP`);
  if (s.backTomorrow > 0) {
    parts.push(`${s.backTomorrow} ${s.backTomorrow === 1 ? 'concept' : 'concepts'} back tomorrow`);
  }
  return parts.join(' · ');
}

/** What the live region reads after an answer (spec 7.5): `Correct. Plus 10 XP`, or the verdict alone at 0 XP. */
export function verdictAnnouncement(correct: boolean, xp: number): string {
  const verdict = correct ? 'Correct.' : 'Incorrect.';
  return xp > 0 ? `${verdict} Plus ${xp} XP` : verdict;
}

const MODE_LABELS: Record<Mode, string> = {
  check: 'Lesson check',
  quiz: 'Module quiz',
  focus: 'Focus quiz',
  review: 'Review',
  lightning: 'Lightning round',
  incident: 'Incident',
  boss: 'Boss',
  mock: 'Mock exam',
};

export function modeLabel(mode: Mode): string {
  return MODE_LABELS[mode];
}
```

- [ ] **Step 4: Route `#/s/review` to the runner**

In `src/app/screens/Screen.tsx`, replace:

```tsx
    case 'quiz':
      return <Runner key={route} idx={idx} mode="quiz" scope={`m${pad2(route.module)}`} />;
    case 'not-found':
      return <NotFound hash={route.hash} />;
```

with:

```tsx
    case 'quiz':
      return <Runner key={route} idx={idx} mode="quiz" scope={`m${pad2(route.module)}`} />;
    case 'review':
      return <Runner key={route} idx={idx} mode="review" scope="review" />;
    case 'not-found':
      return <NotFound hash={route.hash} />;
```

- [ ] **Step 5: Rewrite the runner**

The question, match, verdict and report parts keep their Phase 1 code; what changes is the session start, the item walk, the answer's `relearn` flag, the announcement, the misconception line, the hint and the end.

Replace the whole of `src/app/screens/Runner.tsx` with:

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ContentIndex, ModuleChunk, QuestionView } from '../../../schemas/chunks.ts';
import type { StudyEvent } from '../../../schemas/events.ts';
import { SURE_HINT } from '../../engine/bets.ts';
import { studyDayAt, tzOffset } from '../../engine/day.ts';
import { resolveConcept, sessionSummary } from '../../engine/memory.ts';
import { CHUNK_SIZE } from '../../engine/queue.ts';
import { openSession, type SessionState } from '../../engine/replay.ts';
import {
  type PoolQuestion,
  relearnVariant,
  selectCheck,
  selectQuiz,
  sessionItems,
} from '../../engine/select.ts';
import { recall } from '../../engine/srs.ts';
import { ulid } from '../../store/ulid.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { now } from '../clock.ts';
import { ensureModule, modules } from '../content.ts';
import { nothingDueLine } from '../home.ts';
import { isControl, isTyping } from '../keyboard.ts';
import { memory, memoryContent, queue } from '../memory.ts';
import { neighbors } from '../nav.ts';
import { newSessionSeed, progress, record, storeReady } from '../progress.ts';
import { pad2, toHash } from '../router.ts';
import {
  canSubmit,
  displayOrder,
  endSummaryLine,
  homedConcepts,
  isCorrect,
  leftId,
  modeLabel,
  type Picked,
  rightId,
  verdictAnnouncement,
} from '../runner.ts';
import { type RunnerCommand, runnerKey } from '../runner-keys.ts';
import { highlight, navigate, overlay } from '../state.ts';
import { NotFound } from './NotFound.tsx';

type RunnerMode = 'check' | 'quiz' | 'review';
type FlagReason = Extract<StudyEvent, { t: 'flag' }>['reason'];

interface Props {
  idx: ContentIndex;
  mode: RunnerMode;
  /** `m03/aws-lambda` for a lesson check, `m03` for a module quiz, `review` for a review. */
  scope: string;
}

interface Feedback {
  qid: string;
  picked: Picked;
  correct: boolean;
}

const LETTERS = 'abcde';
const REASONS: readonly { id: FlagReason; label: string }[] = [
  { id: 'wrong-key', label: 'Wrong answer key' },
  { id: 'ambiguous', label: 'Ambiguous' },
  { id: 'outdated', label: 'Outdated' },
  { id: 'typo', label: 'Typo' },
  { id: 'other', label: 'Other' },
];

/** The concept a question tests, as memory keys it (aliases resolved); the raw id when memory does not know it. */
function memoryConcept(concept: string): string {
  const content = memoryContent.peek();
  return (content === null ? null : resolveConcept(content, concept)) ?? concept;
}

/** The concept's recall now (spec 3.6), or 0 without a card, which ranks it first in a module quiz (spec 4.1). */
function conceptRecall(concept: string): number {
  const card = memory.peek()?.concepts.get(memoryConcept(concept))?.card ?? null;
  return card === null ? 0 : recall(card, now.peek());
}

/** True when the concept carries a misconception mark (spec 3.1) at this moment. */
function markedMisconception(concept: string): boolean {
  return (memory.peek()?.concepts.get(memoryConcept(concept))?.misconception ?? null) !== null;
}

/** The selection pool of some chunks, with each concept as memory keys it. */
function poolOf(chunks: readonly ModuleChunk[]): PoolQuestion[] {
  return chunks.flatMap((c) =>
    c.questions.map((q) => ({ id: q.id, concept: memoryConcept(q.concept), note: q.note })),
  );
}

/** Starts the session of this mode and scope, or finds the one in progress; null when nothing can be asked. */
function startOrResume(
  idx: ContentIndex,
  chunk: ModuleChunk,
  mode: 'check' | 'quiz',
  scope: string,
): string | null {
  const open = openSession(progress.peek(), mode, scope);
  if (open !== null) return open.sid;
  const seed = newSessionSeed();
  const pool = chunk.questions.map((q) => ({ id: q.id, concept: q.concept, note: q.note }));
  const slug = scope.split('/')[1] ?? '';
  const qids =
    mode === 'check'
      ? selectCheck({
          concepts: homedConcepts(idx, chunk, scope, slug),
          pool: pool.filter((q) => q.note === scope),
          progress: progress.peek(),
          seed,
        })
      : selectQuiz({ pool, progress: progress.peek(), seed, recall: conceptRecall });
  if (qids.length === 0) return null;
  const sid = ulid();
  void record({ t: 'session', sid, mode, phase: 'start', scope, seed, qids });
  return sid;
}

/** The runner `#/s/check/mNN/<slug>`, `#/s/quiz/mNN` and `#/s/review`: one question at a time, then the end line. */
export function Runner({ idx, mode, scope }: Props) {
  return mode === 'review' ? (
    <ReviewRunner idx={idx} />
  ) : (
    <ModuleRunner idx={idx} mode={mode} scope={scope} />
  );
}

function ModuleRunner({ idx, mode, scope }: { idx: ContentIndex; mode: 'check' | 'quiz'; scope: string }) {
  const module = Number(scope.slice(1, 3));
  const slug = mode === 'check' ? (scope.split('/')[1] ?? '') : null;
  const meta = idx.modules.find((m) => m.n === module);
  const lessonMeta = slug === null ? undefined : meta?.lessons.find((l) => l.slug === slug);
  const chunk = modules.value.get(module);
  const title =
    mode === 'check'
      ? `${modeLabel(mode)}: ${lessonMeta?.title ?? ''}`
      : `${modeLabel(mode)}: ${meta?.short ?? ''}`;
  useTitle(title);
  useEffect(() => ensureModule(module), [module]);

  const [sid, setSid] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const known = meta !== undefined && (mode === 'quiz' || lessonMeta !== undefined);
  // The session starts once the chunk and the stored log have loaded, so a session in progress is found.
  const startable = known && storeReady.value ? chunk : undefined;
  useEffect(() => {
    if (startable === undefined || sid !== null || empty) return;
    const started = startOrResume(idx, startable, mode, scope);
    if (started === null) setEmpty(true);
    else setSid(started);
  }, [startable, sid, empty, idx, mode, scope]);

  if (!known) return <NotFound hash={location.hash} />;

  const crumbs = [
    { label: 'Home', href: '#/' },
    { label: `Module ${module}: ${meta.short}`, href: `#/m/${pad2(module)}` },
    ...(lessonMeta === undefined
      ? []
      : [{ label: lessonMeta.title, href: `#/m/${pad2(module)}/l/${lessonMeta.slug}` }]),
    { label: modeLabel(mode), href: location.hash },
  ];
  const session = sid === null ? undefined : progress.value.sessions.get(sid);
  return (
    <>
      <Breadcrumbs items={crumbs} />
      <h1>{title}</h1>
      {empty ? (
        <p class="muted">
          {mode === 'check'
            ? 'No practice questions for this lesson yet.'
            : 'No practice questions for this module yet.'}
        </p>
      ) : chunk === undefined || session === undefined ? (
        <p class="muted">Loading</p>
      ) : (
        <Session
          idx={idx}
          shipped={new Map(chunk.questions.map((q) => [q.id, q] as const))}
          pool={[]}
          session={session}
          mode={mode}
          module={module}
          slug={slug}
        />
      )}
    </>
  );
}

/** The modules that home some concepts. */
function modulesOf(concepts: readonly string[]): number[] {
  const content = memoryContent.peek();
  const out = new Set<number>();
  for (const c of concepts) {
    const module = content?.concepts.get(c)?.module;
    if (module !== undefined) out.add(module);
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * The review `#/s/review` (spec 3.6 and 3.7): resumes today's review, or abandons one from an earlier study day
 * and starts on the first 20 queue concepts, one variant each, once their modules have loaded.
 */
function ReviewRunner({ idx }: { idx: ContentIndex }) {
  useTitle('Review');
  const [sid, setSid] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [wanted, setWanted] = useState<readonly string[] | null>(null);
  const ready = storeReady.value;
  const q = queue.value;
  const loaded = modules.value;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    if (!ready || q === null || sid !== null || empty || wanted !== null) return;
    const at = now.peek();
    const tz = tzOffset(at);
    const open = openSession(progress.peek(), 'review', 'review');
    if (open !== null) {
      if (studyDayAt(new Date(open.startedAt), tz) === studyDayAt(at, tz)) {
        setSid(open.sid);
        return;
      }
      void record({ t: 'session', sid: open.sid, mode: 'review', phase: 'abandon', seed: open.seed });
    }
    const concepts = q.items.slice(0, CHUNK_SIZE);
    if (concepts.length === 0) setEmpty(true);
    else setWanted(concepts);
  }, [ready, q, sid, empty, wanted]);

  useEffect(() => {
    if (wanted !== null) for (const n of modulesOf(wanted)) ensureModule(n);
  }, [wanted]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Biome takes a signal's value for a constant import; it changes, so it is a dependency
  useEffect(() => {
    if (wanted === null || sid !== null) return;
    const chunks = modulesOf(wanted).map((n) => loaded.get(n));
    if (chunks.some((c) => c === undefined)) return;
    const seed = newSessionSeed();
    const qids = selectCheck({
      concepts: wanted,
      pool: poolOf(chunks.filter((c): c is ModuleChunk => c !== undefined)),
      progress: progress.peek(),
      seed,
    });
    if (qids.length === 0) {
      setEmpty(true);
      return;
    }
    const started = ulid();
    void record({ t: 'session', sid: started, mode: 'review', phase: 'start', scope: 'review', seed, qids });
    setSid(started);
  }, [wanted, sid, loaded]);

  const session = sid === null ? undefined : progress.value.sessions.get(sid);
  const shipped = new Map([...loaded.values()].flatMap((c) => c.questions.map((x) => [x.id, x] as const)));
  // A resumed review can hold questions of modules not loaded yet; the index says which ids still ship.
  const missing = session?.qids.some((id) => id in idx.questionVersions && !shipped.has(id)) === true;
  useEffect(() => {
    if (missing) for (const m of idx.modules) ensureModule(m.n);
  }, [missing, idx]);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: modeLabel('review'), href: toHash({ kind: 'review' }) },
        ]}
      />
      <h1>{modeLabel('review')}</h1>
      {empty ? (
        <>
          <p class="muted">{q === null ? 'Nothing due.' : nothingDueLine(q, now.value)}</p>
          <p>
            <a href="#/">Back to Home</a>
          </p>
        </>
      ) : session === undefined || missing ? (
        <p class="muted">Loading</p>
      ) : (
        <Session
          idx={idx}
          shipped={shipped}
          pool={poolOf([...loaded.values()])}
          session={session}
          mode="review"
          module={null}
          slug={null}
        />
      )}
    </>
  );
}

interface SessionProps {
  idx: ContentIndex;
  /** Every loaded live question by id. */
  shipped: ReadonlyMap<string, QuestionView>;
  /** Where a review's relearn variants come from; empty for checks and quizzes. */
  pool: readonly PoolQuestion[];
  session: SessionState;
  mode: RunnerMode;
  module: number | null;
  slug: string | null;
}

function Session({ idx, shipped, pool, session, mode, module, slug }: SessionProps) {
  const items = sessionItems(session, (qid, concept) =>
    relearnVariant({ concept: memoryConcept(concept), avoid: qid, pool, seed: session.seed }),
  ).filter((item) => shipped.has(item.qid));
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const shown =
    feedback === null
      ? items.find((item) => !session.answers.has(item.qid))
      : items.find((item) => item.qid === feedback.qid);
  // Complete once every item has an answer; a wrong review answer adds its relearn item before this is read.
  const complete = items.every((item) => session.answers.has(item.qid));
  const submitted = useRef(session.submittedAt !== null);

  // Submits once every item has an answer: right after the last answer, or on resuming such a session.
  const finish = (): void => {
    if (submitted.current) return;
    submitted.current = true;
    void record({ t: 'session', sid: session.sid, mode, phase: 'submit', seed: session.seed });
    if (mode === 'check' && !progress.peek().lessonsDone.has(session.scope)) {
      void record({ t: 'lesson.done', note: session.scope });
    }
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    if (complete) finishRef.current();
  }, [complete]);

  if (shown === undefined)
    return <EndLine idx={idx} mode={mode} module={module} slug={slug} session={session} />;
  const q = shipped.get(shown.qid);
  if (q === undefined) return null;
  return (
    <Question
      key={q.id}
      q={q}
      session={session}
      mode={mode}
      relearn={shown.relearn}
      position={items.indexOf(shown) + 1}
      total={items.length}
      feedback={feedback}
      onAnswered={setFeedback}
      onNext={() => setFeedback(null)}
    />
  );
}

function EndLine({
  idx,
  mode,
  module,
  slug,
  session,
}: {
  idx: ContentIndex;
  mode: RunnerMode;
  module: number | null;
  slug: string | null;
  session: SessionState;
}) {
  const m = memory.value;
  const content = memoryContent.value;
  const at = now.value;
  const line =
    m === null || content === null
      ? ''
      : endSummaryLine(sessionSummary(session, m, content, at, tzOffset(at)));
  if (mode === 'review') {
    const more = (queue.value?.items.length ?? 0) > 0;
    return (
      <>
        <p class="end-line" aria-live="polite">
          {line}
        </p>
        <p class="review-done">Done for now.</p>
        <ul class="end-links">
          <li>
            <a href="#/">Back to Home</a>
          </li>
          {more && (
            <li>
              <a href={toHash({ kind: 'review' })}>Review more</a>
            </li>
          )}
        </ul>
      </>
    );
  }
  const next = slug === null || module === null ? null : neighbors(idx.modules, module, slug).next;
  return (
    <>
      <p class="end-line" aria-live="polite">
        {line}
      </p>
      <ul class="end-links">
        {mode === 'check' && slug !== null && module !== null ? (
          <>
            <li>
              <a href={`#/m/${pad2(module)}/l/${slug}`}>Back to the lesson</a>
            </li>
            {next !== null && (
              <li>
                <a href={`#/m/${pad2(next.module)}/l/${next.slug}`}>Next lesson</a>
              </li>
            )}
          </>
        ) : module !== null ? (
          <>
            <li>
              <a href={`#/m/${pad2(module)}`}>Back to Module {module}</a>
            </li>
            <li>
              <a href={`#/s/quiz/m${pad2(module)}`}>Another quiz</a>
            </li>
          </>
        ) : null}
      </ul>
    </>
  );
}

interface QuestionProps {
  q: QuestionView;
  session: SessionState;
  mode: RunnerMode;
  /** True for a review's relearn step (spec 3.6), which the answer event carries. */
  relearn: boolean;
  position: number;
  total: number;
  feedback: Feedback | null;
  onAnswered: (f: Feedback) => void;
  onNext: () => void;
}

function Question({
  q,
  session,
  mode,
  relearn,
  position,
  total,
  feedback,
  onAnswered,
  onNext,
}: QuestionProps) {
  const order = displayOrder(q, session.seed);
  const [choice, setChoice] = useState<string[]>([]);
  /** Match: left index to the right id it is paired with. */
  const [pairs, setPairs] = useState<ReadonlyMap<number, string>>(new Map());
  const [activeLeft, setActiveLeft] = useState(0);
  const [expandAll, setExpandAll] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  /** True once the answer's event is committed; Next waits for it (spec 8.1). */
  const [stored, setStored] = useState(false);
  /** The live region's words, with the XP the replay gave the stored answer. */
  const [announce, setAnnounce] = useState('');
  /** Whether the concept carried a misconception as the question showed (spec 3.1), so feedback can say so. */
  const [wasSure] = useState(() => markedMisconception(q.concept));
  const stem = useRef<HTMLParagraphElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const shownAt = useRef(Date.now());
  const answered = feedback !== null;

  const picked: Picked =
    q.type === 'match'
      ? [...pairs.entries()].sort(([a], [b]) => a - b).map(([l, r]): [string, string] => [leftId(l), r])
      : choice;
  const ready = canSubmit(q, picked);

  useLayoutEffect(() => {
    // Each question starts at the top of the page, with focus on its stem (spec 7.5).
    window.scrollTo(0, 0);
    stem.current?.focus({ preventScroll: true });
  }, []);

  const submit = (sure: boolean): void => {
    if (answered || !ready) return;
    const correct = isCorrect(q, picked);
    // The answer joins the log first, so a session submit that follows it scores this answer too.
    const saved = record({
      t: 'answer',
      sid: session.sid,
      mode,
      qid: q.id,
      qv: q.version,
      concept: q.concept,
      picked,
      correct,
      sure,
      ms: Date.now() - shownAt.current,
      ...(relearn ? { relearn: true } : {}),
    });
    onAnswered({ qid: q.id, picked, correct });
    // Next turns on and takes focus once the answer is stored (spec 8.1 waits for the commit before showing Next).
    // The page stays where the reader is, with the verdict under the stem; on a phone Next sits in the sticky bar.
    void saved.then((event) => {
      setStored(true);
      setAnnounce(verdictAnnouncement(correct, memory.peek()?.xpByEvent.get(event.id) ?? 0));
    });
  };

  useEffect(() => {
    if (stored) nextButton.current?.focus({ preventScroll: true });
  }, [stored]);

  const next = (): void => {
    if (stored) onNext();
  };

  const choose = (id: string): void => {
    if (answered) return;
    if (q.type === 'single') setChoice([id]);
    else setChoice((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  };

  const pair = (left: number, right: string | null): void => {
    setPairs((current) => {
      const next = new Map(current);
      for (const [l, r] of current) if (r === right && l !== left) next.delete(l);
      if (right === null) next.delete(left);
      else next.set(left, right);
      return next;
    });
  };

  const readInNotes = (): void => {
    highlight.value = q.read.text;
    navigate(q.read.route);
  };

  const run = (command: RunnerCommand): void => {
    switch (command.kind) {
      case 'choose': {
        const id = order[command.n - 1];
        if (id !== undefined) choose(id);
        break;
      }
      case 'pick-left':
        setActiveLeft(command.n - 1);
        break;
      case 'pair': {
        const right = order[LETTERS.indexOf(command.letter)];
        if (right === undefined) break;
        pair(activeLeft, right);
        const nextFree = q.pairs.findIndex((_, i) => i !== activeLeft && !pairs.has(i));
        if (nextFree !== -1) setActiveLeft(nextFree);
        break;
      }
      case 'unpair':
        pair(activeLeft, null);
        break;
      case 'check':
        submit(false);
        break;
      case 'sure':
        submit(true);
        break;
      case 'next':
        next();
        break;
      case 'expand':
        setExpandAll(true);
        break;
      case 'read':
        readInNotes();
        break;
      case 'report':
        setReportOpen(true);
        break;
    }
  };

  const runRef = useRef(run);
  runRef.current = run;
  const state = {
    type: q.type,
    answered,
    optionCount: q.options.length,
    leftCount: q.pairs.length,
    reportOpen,
  };
  const stateRef = useRef(state);
  stateRef.current = state;

  // A layout effect, so the keys work from the render that shows the question, before the next key press.
  useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || overlay.value !== null) return;
      const target = event.target;
      // A focused link, button or summary answers Enter itself, which keeps one action per key press.
      const native =
        event.key === 'Enter' &&
        !event.shiftKey &&
        target instanceof Element &&
        target.closest('a, button, summary') !== null;
      if (native) return;
      const command = runnerKey(
        {
          key: event.key,
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          typing: isTyping(target),
          control: isControl(target),
          select: target instanceof HTMLSelectElement,
          at: event.timeStamp,
        },
        stateRef.current,
      );
      if (command === null) return;
      event.preventDefault();
      runRef.current(command);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <section class="runner" data-qid={q.id} aria-labelledby="stem">
      <p class="muted runner-position">
        {position} of {total}
      </p>
      <p id="stem" class="stem" tabIndex={-1} ref={stem}>
        {q.stem}
      </p>
      {answered ? (
        <Review q={q} order={order} feedback={feedback} expandAll={expandAll} wasSure={wasSure} />
      ) : q.type === 'match' ? (
        <MatchForm
          q={q}
          order={order}
          pairs={pairs}
          activeLeft={activeLeft}
          onPair={pair}
          onFocusLeft={setActiveLeft}
        />
      ) : (
        <fieldset class="options" aria-labelledby="stem">
          {order.map((id, i) => {
            const option = q.options.find((o) => o.id === id);
            if (option === undefined) return null;
            return (
              <label key={id} class={`option${choice.includes(id) ? ' chosen' : ''}`}>
                <input
                  type={q.type === 'single' ? 'radio' : 'checkbox'}
                  name={`q-${q.id}`}
                  value={id}
                  checked={choice.includes(id)}
                  onChange={() => choose(id)}
                />
                <span class="option-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span class="option-text">{option.text}</span>
              </label>
            );
          })}
        </fieldset>
      )}
      <p class="visually-hidden" aria-live="polite">
        {announce}
      </p>
      {answered && (
        <div class="after">
          {q.takeaway !== '' && <p class="takeaway">{q.takeaway}</p>}
          <p>
            <a
              href={q.read.route}
              onClick={(event) => {
                event.preventDefault();
                readInNotes();
              }}
            >
              Read in notes
            </a>{' '}
            <kbd>o</kbd>
          </p>
        </div>
      )}
      {/* The bar is a child of the runner itself, so on a phone it sticks while any part of the question shows. */}
      {answered ? (
        <div class="submit-bar">
          <button ref={nextButton} class="button" type="button" disabled={!stored} onClick={next}>
            Next <kbd>Enter</kbd>
          </button>
        </div>
      ) : (
        <div class="submit-bar">
          <button class="button" type="button" disabled={!ready} onClick={() => submit(false)}>
            Check <kbd>Enter</kbd>
          </button>
          <button class="button" type="button" disabled={!ready} onClick={() => submit(true)}>
            Sure <kbd>Shift+Enter</kbd>
          </button>
          <span class="muted submit-hint">{SURE_HINT}</span>
        </div>
      )}
      {reportOpen ? (
        <Report q={q} onClose={() => setReportOpen(false)} />
      ) : (
        <p>
          <button class="link-button" type="button" onClick={() => setReportOpen(true)}>
            Report a problem
          </button>{' '}
          <kbd>!</kbd>
        </p>
      )}
    </section>
  );
}

function MatchForm({
  q,
  order,
  pairs,
  activeLeft,
  onPair,
  onFocusLeft,
}: {
  q: QuestionView;
  order: readonly string[];
  pairs: ReadonlyMap<number, string>;
  activeLeft: number;
  onPair: (left: number, right: string | null) => void;
  onFocusLeft: (left: number) => void;
}) {
  const rightText = (id: string): string => q.pairs[Number(id.slice(1)) - 1]?.right ?? '';
  return (
    <div class="match">
      <ol class="match-rights" aria-label="Answers to pair">
        {order.map((id, i) => (
          <li key={id} class="match-right">
            <span class="option-n">{LETTERS[i]}</span>
            <span>{rightText(id)}</span>
          </li>
        ))}
      </ol>
      <fieldset class="options" aria-labelledby="stem">
        {q.pairs.map((p, i) => {
          const selectId = `match-${q.id}-${i}`;
          return (
            <div key={p.left} class={`match-row${i === activeLeft ? ' active' : ''}`}>
              <label for={selectId}>
                <span class="option-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span class="option-text">{p.left}</span>
              </label>
              <select
                id={selectId}
                value={pairs.get(i) ?? ''}
                onFocus={() => onFocusLeft(i)}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  onPair(i, value === '' ? null : value);
                }}
              >
                <option value="">Choose a match</option>
                {order.map((id, k) => (
                  <option key={id} value={id}>
                    {LETTERS[k]}. {rightText(id)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}

function Verdict({ correct }: { correct: boolean }) {
  return (
    <p class={`verdict ${correct ? 'ok' : 'bad'}`}>
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" focusable="false">
        {correct ? (
          <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" />
        ) : (
          <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" />
        )}
      </svg>
      {correct ? 'Correct' : 'Incorrect'}
    </p>
  );
}

/** The first line of feedback for a concept answered wrong with Sure before (spec 3.1). */
function SureLastTime() {
  return <p class="misconception">You were sure last time</p>;
}

function Review({
  q,
  order,
  feedback,
  expandAll,
  wasSure,
}: {
  q: QuestionView;
  order: readonly string[];
  feedback: Feedback;
  expandAll: boolean;
  /** The concept carried a misconception as the question showed: say so first and pin every why open. */
  wasSure: boolean;
}) {
  if (q.type === 'match') {
    const chosen = new Map((feedback.picked as [string, string][]).map(([l, r]) => [l, r]));
    return (
      <>
        {wasSure && <SureLastTime />}
        <Verdict correct={feedback.correct} />
        <ul class="review">
          {q.pairs.map((p, i) => {
            const mine = chosen.get(leftId(i));
            const right = mine === rightId(i);
            const mineText = q.pairs[Number((mine ?? 'r0').slice(1)) - 1]?.right ?? '';
            return (
              <li key={p.left} class={`review-item ${right ? 'is-correct' : 'is-wrong'}`}>
                <p class="review-line">
                  <span class="option-n">{i + 1}</span>
                  <span class="option-text">
                    {p.left}: {p.right}
                  </span>
                </p>
                <p class="tags">
                  {right ? (
                    <span class="tag ok">Your answer, correct</span>
                  ) : (
                    <>
                      <span class="tag bad">Your answer: {mineText}</span>
                      <span class="tag ok">Correct answer: {p.right}</span>
                    </>
                  )}
                </p>
                <details open>
                  <summary>Why</summary>
                  <p>{p.why}</p>
                </details>
              </li>
            );
          })}
        </ul>
      </>
    );
  }
  const chosen = new Set(feedback.picked as string[]);
  return (
    <>
      {wasSure && <SureLastTime />}
      <Verdict correct={feedback.correct} />
      <ul class="review">
        {order.map((id, i) => {
          const option = q.options.find((o) => o.id === id);
          if (option === undefined) return null;
          const mine = chosen.has(id);
          return (
            <li
              key={id}
              class={`review-item${option.correct ? ' is-correct' : ''}${mine && !option.correct ? ' is-wrong' : ''}`}
            >
              <p class="review-line">
                <span class="option-n">{i + 1}</span>
                <span class="option-text">{option.text}</span>
              </p>
              {(mine || option.correct) && (
                <p class="tags">
                  {mine && <span class={`tag ${option.correct ? 'ok' : 'bad'}`}>Your answer</span>}
                  {option.correct && <span class="tag ok">Correct answer</span>}
                </p>
              )}
              <details open={expandAll || wasSure || mine || option.correct}>
                <summary>Why</summary>
                <p>{option.why}</p>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Report({ q, onClose }: { q: QuestionView; onClose: () => void }) {
  const [reason, setReason] = useState<FlagReason | null>(null);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    first.current?.focus();
  }, []);

  if (sent) {
    return (
      <p class="report-done" role="status">
        Reported. It travels with your next backup.
      </p>
    );
  }
  return (
    <form
      class="report"
      aria-labelledby="report-title"
      onSubmit={(event) => {
        event.preventDefault();
        if (reason === null) return;
        const text = note.trim();
        void record({ t: 'flag', qid: q.id, qv: q.version, reason, ...(text === '' ? {} : { note: text }) });
        setSent(true);
      }}
    >
      <h2 id="report-title">Report a problem</h2>
      <fieldset class="report-reasons">
        <legend>What is wrong?</legend>
        {REASONS.map((r, i) => (
          <label key={r.id}>
            <input
              ref={i === 0 ? first : null}
              type="radio"
              name="report-reason"
              value={r.id}
              checked={reason === r.id}
              onChange={() => setReason(r.id)}
            />
            {r.label}
          </label>
        ))}
      </fieldset>
      <label class="report-note">
        Note (optional)
        <textarea rows={3} value={note} onInput={(event) => setNote(event.currentTarget.value)} />
      </label>
      <p class="muted">Question {q.id}</p>
      <div class="report-actions">
        <button class="button" type="submit" disabled={reason === null}>
          Send
        </button>
        <button class="link-button" type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: Add the level, the streak and the exam date to Progress**

Replace the whole of `src/app/screens/Progress.tsx` with:

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { SCHEMA_VERSION } from '../../../schemas/version.ts';
import { studyDay } from '../../engine/day.ts';
import { level } from '../../engine/level.ts';
import { ENGINE_VERSION } from '../../engine/replay.ts';
import {
  APP_VERSION,
  type BackupData,
  backupFileName,
  makeBackup,
  parseBackup,
  previewLine,
  previewOf,
} from '../../store/backup.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { closeOnBackdrop } from '../../ui/backdrop.ts';
import { now } from '../clock.ts';
import { index } from '../content.ts';
import { memory, streak } from '../memory.ts';
import { events, kvRecords, mergeIn, progress, record, replaceAll, writeKv } from '../progress.ts';
import { overlay } from '../state.ts';

const count = (n: number): string => n.toLocaleString('en-US');
const plural = (n: number, one: string, many: string): string => `${count(n)} ${n === 1 ? one : many}`;
const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The time of the last export, from kv, or null. */
export function lastExportAt(): string | null {
  const value = kvRecords.value[KV_KEYS.lastExportAt]?.value;
  return typeof value === 'string' ? value : null;
}

/** Saves the whole log and kv as a backup file and remembers when (spec 8.3). */
async function exportBackup(): Promise<void> {
  const now = new Date();
  await writeKv(KV_KEYS.lastExportAt, now.toISOString(), now);
  const backup = makeBackup(events.value, kvRecords.value, {
    appVersion: APP_VERSION,
    contentVersion: index.value?.contentVersion ?? '',
    now,
  });
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(now);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

type ImportState =
  | { step: 'idle' }
  | { step: 'error'; message: string }
  | { step: 'preview'; data: BackupData; confirmReplace: boolean }
  | { step: 'done'; message: string };

/** The Progress overlay (`g p`): counts, backup export and import, diagnostics and versions. */
export function Progress() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<ImportState>({ step: 'idle' });

  useEffect(() => {
    const el = dialog.current;
    if (el !== null && !el.open) el.showModal();
  }, []);

  const p = progress.value;
  const answers = [...p.answers.values()].reduce((sum, list) => sum + list.length, 0);
  const last = lastExportAt();
  const contentVersion = index.value?.contentVersion ?? '-';

  return (
    <dialog
      ref={dialog}
      class="sheet"
      aria-labelledby="progress-title"
      onClose={() => {
        if (overlay.value === 'progress') overlay.value = null;
      }}
      onMouseDown={(event) => closeOnBackdrop(event.currentTarget, event)}
    >
      <div class="sheet-body">
        <h2 id="progress-title">Progress</h2>
        <p class="progress-summary">
          {plural(answers, 'answer', 'answers')}, {plural(p.lessonsDone.size, 'lesson', 'lessons')} read
        </p>
        <LevelAndStreak />

        <h3>Backup</h3>
        <p class="muted">{last === null ? 'No backup yet' : `Last backup ${shortDate(last)}`}</p>
        <p class="sheet-actions">
          <button class="button" type="button" onClick={() => void exportBackup()}>
            Export a backup
          </button>
        </p>
        <label class="file-label">
          Import a backup
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              input.value = '';
              if (file === undefined) return;
              void file
                .text()
                .then(parseBackup)
                .then((result) =>
                  setState(
                    result.ok
                      ? { step: 'preview', data: result.data, confirmReplace: false }
                      : { step: 'error', message: result.error },
                  ),
                );
            }}
          />
        </label>
        {state.step === 'error' && (
          <p class="import-error" role="alert">
            {state.message}
          </p>
        )}
        {state.step === 'preview' && (
          <ImportPreviewPanel
            data={state.data}
            confirmReplace={state.confirmReplace}
            onConfirmReplace={() => setState({ ...state, confirmReplace: true })}
            onCancel={() => setState({ step: 'idle' })}
            onMerge={() =>
              void mergeIn(state.data).then((added) =>
                setState({ step: 'done', message: `Imported. ${plural(added, 'new event', 'new events')}.` }),
              )
            }
            onReplace={() =>
              void replaceAll(state.data).then((total) =>
                setState({
                  step: 'done',
                  message: `Replaced. This browser now has ${plural(total, 'event', 'events')}.`,
                }),
              )
            }
          />
        )}
        {state.step === 'done' && (
          <p class="import-done" role="status">
            {state.message}
          </p>
        )}

        <ExamDate />

        <h3>Diagnostics</h3>
        <p class="muted">
          {p.unknownEvents > 0
            ? `${plural(p.unknownEvents, 'event refers', 'events refer')} to newer content`
            : 'Every event matches this content.'}
        </p>

        <h3>Versions</h3>
        <p class="muted">
          Content {contentVersion} · Engine {ENGINE_VERSION} · Storage {SCHEMA_VERSION} · App {APP_VERSION}
        </p>

        <form method="dialog">
          <button class="button" type="submit">
            Close
          </button>
        </form>
      </div>
    </dialog>
  );
}

/** Level, XP and today's XP, then the streak with its freezes (spec 3.3 and 3.5). */
function LevelAndStreak() {
  const m = memory.value;
  const s = streak.value;
  const today = studyDay(now.value);
  return (
    <>
      {m !== null && (
        <p class="progress-line">
          Level {level(m.xp)} · {count(m.xp)} XP · {count(m.xpByDay.get(today) ?? 0)} today
        </p>
      )}
      {s !== null && (
        <p class="progress-line">
          Streak {plural(s.current, 'day', 'days')} · {plural(s.freezes, 'freeze', 'freezes')} · longest{' '}
          {count(s.longest)}
        </p>
      )}
    </>
  );
}

/**
 * The exam date (spec 7.5), editable here at any time; each change is a `settings` event, so replay re-caps every due.
 * Clearing it also marks the Home question as answered, so Home never asks again.
 */
function ExamDate() {
  const current = memory.value?.examDate ?? null;
  const [date, setDate] = useState(current ?? '');
  useEffect(() => setDate(current ?? ''), [current]);
  const valid = ISO_DAY.test(date);
  return (
    <>
      <h3>Exam date</h3>
      {current === null && <p class="muted">No exam date set</p>}
      <form
        class="sheet-actions"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && date !== current) void record({ t: 'settings', patch: { examDate: date } });
        }}
      >
        <label class="date-field">
          Exam date
          <input type="date" value={date} onInput={(event) => setDate(event.currentTarget.value)} />
        </label>
        <button class="button" type="submit" disabled={!valid || date === current}>
          Save
        </button>
        {current !== null && (
          <button
            class="link-button"
            type="button"
            onClick={() => {
              void record({ t: 'settings', patch: { examDate: null } });
              void writeKv(KV_KEYS.examAsk, 'dismissed');
            }}
          >
            Clear
          </button>
        )}
      </form>
    </>
  );
}

function ImportPreviewPanel({
  data,
  confirmReplace,
  onConfirmReplace,
  onCancel,
  onMerge,
  onReplace,
}: {
  data: BackupData;
  confirmReplace: boolean;
  onConfirmReplace: () => void;
  onCancel: () => void;
  onMerge: () => void;
  onReplace: () => void;
}) {
  const merge = useRef<HTMLButtonElement>(null);
  const replace = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    (confirmReplace ? replace : merge).current?.focus();
  }, [confirmReplace]);
  return (
    <div class="import-preview">
      <p>{previewLine(previewOf(data, events.value))}</p>
      {confirmReplace ? (
        <p class="sheet-actions">
          <button ref={replace} class="button" type="button" onClick={onReplace}>
            Replace all progress in this browser
          </button>
          <button class="link-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        </p>
      ) : (
        <p class="sheet-actions">
          <button ref={merge} class="button" type="button" onClick={onMerge}>
            Merge
          </button>
          <button class="button button-quiet" type="button" onClick={onConfirmReplace}>
            Replace
          </button>
          <button class="link-button" type="button" onClick={onCancel}>
            Cancel
          </button>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Style the misconception line, the review end and the Progress lines**

Append to the end of `src/ui/base.css`:

```css
/* Reviews (spec 3.1 and 3.6): the misconception line and the end of a chunk. */
.misconception {
  margin: 0 0 4px;
  padding-left: 8px;
  font-weight: 600;
  border-left: 3px solid var(--bad);
}

.review-done {
  margin: 0 0 8px;
}

/* Progress: the level and streak lines under the summary. */
.progress-line {
  margin: 0 0 4px;
}
```

- [ ] **Step 8: Read the new end line in the practice tests**

In `tests/e2e/practice.spec.ts`, replace:

```ts
  await expect(page.locator('.verdict')).toHaveCount(0);
  const line = await finishByClicking(page, questions);
  const [correct, total] = (/^(\d+)\/(\d+) correct$/.exec(line) ?? []).slice(1);
  expect(correct).toBe(total);

```

with:

```ts
  await expect(page.locator('.verdict')).toHaveCount(0);
  const line = await finishByClicking(page, questions);
  const [correct, total] = (/^(\d+)\/(\d+)(?: · |$)/.exec(line) ?? []).slice(1);
  expect(correct).toBe(total);

```

- [ ] **Step 9: Run the tests and the checks and see them pass**

```bash
pnpm test tests/unit/runner.test.ts
pnpm check
pnpm build && pnpm e2e tests/e2e/reader.spec.ts tests/e2e/practice.spec.ts
```

Expected: PASS, `pnpm check` exits 0, and every end-to-end test passes in both projects.

- [ ] **Step 10: Verify by hand on desktop and at 375 px**

Run `pnpm dev` and check each of these, fixing anything that looks off:
- A Module 3 lesson check answered right with Sure: the live region (inspect `.runner [aria-live]`) reads `Correct. Plus 10 XP`, the bar flashes `+10`, and the end line reads like `5/5 · +50 XP`.
- In the same check, answer one question wrong with Sure, then move the page one day ahead with the snippet below in the console, and switch to another tab and back so the clock ticks.
- Home shows `1 due` and `Review 1 concept`; `Enter` starts the review, whose feedback opens with `You were sure last time` and every why open.
- Answer it wrong: when the concept has a second live variant, the position line reads `1 of 2` and that variant shows last; then the end reads `Done for now.` with `Back to Home`.
- Progress shows `Level`, `XP`, `today`, the streak line and the Exam date section; Save and Clear change the date, and `No exam date set` shows when it is empty.

The console snippet moves `Date` one day ahead for that page only; a reload ends it.

```js
const RealDate = Date;
const shift = 24 * 60 * 60 * 1000;
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length === 0 ? [RealDate.now() + shift] : args));
  }
  static now() {
    return RealDate.now() + shift;
  }
};
```

- [ ] **Step 11: Commit**

```bash
pnpm lint:fix
git add src/app/runner.ts src/app/screens/Runner.tsx src/app/screens/Screen.tsx src/app/screens/Progress.tsx src/ui/base.css tests/unit/runner.test.ts tests/e2e/practice.spec.ts
git commit -m "Add review sessions with relearn steps, XP and misconceptions to the runner" -m "Reviews start from the queue with relearn steps, each answer announces its XP, a misconception opens with its own line and every why, the end line adds XP and concepts back tomorrow, and Progress shows the level, the streak and the exam date."
```

---

## Task 16: Rule R10

**Files:**
- Create: `scripts/content/rules/r10-coverage.ts`, `tests/content/bad/r10-missing-term.yaml`, `tests/unit/r10.test.ts`
- Modify: `scripts/content/lib/coverage.ts`, `scripts/content/rules/index.ts`, `tests/fixtures/content-root/content/validate.yaml`
- Test: `tests/unit/r10.test.ts`, `tests/content/bad.test.ts`

R10 counts live practice questions only (spec 2.9 "Scope by status"), resolving a question tagged with an alias to the concept that lists it.
The count lives in `practiceCounts` in `scripts/content/lib/coverage.ts`, so Task 17's `--homed` counts with the same alias rule.
The fixture tree turns on `blueprintTerms` but keeps `practicePerConcept: 0`, because it holds one live question; `tests/unit/r10.test.ts` covers the per-concept count on contexts it builds.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/r10.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ValidateConfig } from '../../schemas/validate-config.ts';
import { type Context, loadContext, type QuestionEntry } from '../../scripts/content/lib/context.ts';
import { r10 } from '../../scripts/content/rules/r10-coverage.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { matchQuestion, QUESTION_FILE, singleQuestion } from '../fixtures/questions.ts';

const BLUEPRINT = 'content/exam/blueprint.yaml';
const OFF: ValidateConfig = {
  rules: ['R10'],
  practicePerConcept: 0,
  examQuotas: false,
  blueprintTerms: false,
};

/** The fixture tree's context with the R10 switches replaced and any extra questions appended. */
function contextWith(
  switches: Partial<ValidateConfig>,
  extra: readonly QuestionEntry['q'][] = [],
  root = makeFixtureRoot(),
): Context {
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  const added = extra.map(
    (q, i): QuestionEntry => ({
      path: QUESTION_FILE,
      line: 100 + i,
      index: ctx.questions.length + i,
      noteId: 'm01/what-a-bakery-cloud-is',
      q,
    }),
  );
  return { ...ctx, config: { ...OFF, ...switches }, questions: [...ctx.questions, ...added] };
}
const messages = (ctx: Context): string[] => r10.run(ctx).map((f) => `${f.file}  ${f.message}`);

describe('R10 practice per concept', () => {
  it('reports each tested concept below the target, counting live practice questions only', () => {
    expect(messages(contextWith({ practicePerConcept: 2 }))).toEqual([
      'content/concepts.yaml  concept shared-kitchen has 1 live practice question; it needs 2',
      'content/concepts.yaml  concept per-minute-rental has 0 live practice questions; it needs 2',
    ]);
  });

  it('clears a concept once it has enough live practice questions', () => {
    const ctx = contextWith({ practicePerConcept: 2 }, [singleQuestion({ status: 'live' })]);
    expect(messages(ctx)).toEqual([
      'content/concepts.yaml  concept per-minute-rental has 0 live practice questions; it needs 2',
    ]);
  });

  it('counts a question tagged with an alias for the concept that lists it', () => {
    const base = contextWith({ practicePerConcept: 2 }, [
      singleQuestion({ status: 'live' }),
      matchQuestion({ status: 'live', concept: 'minute-rental' }),
      matchQuestion({ id: 'q-4j6k8m', status: 'live', concept: 'minute-rental' }),
    ]);
    const concepts = base.concepts.map((c) =>
      c.id === 'per-minute-rental' ? { ...c, aliases: ['minute-rental'] } : c,
    );
    expect(messages({ ...base, concepts })).toEqual([]);
  });

  it('never counts drafts, retired questions or exam-pool questions', () => {
    const ctx = contextWith({ practicePerConcept: 2 }, [
      singleQuestion(),
      singleQuestion({ id: 'q-9r9r9r', status: 'retired' }),
      singleQuestion({ id: 'q-8p8p8p', status: 'live', pool: 'exam' }),
    ]);
    expect(messages(ctx)).toContain(
      'content/concepts.yaml  concept shared-kitchen has 1 live practice question; it needs 2',
    );
  });

  it('skips an untested concept', () => {
    const base = contextWith({ practicePerConcept: 2 });
    const concepts = base.concepts.map((c) => (c.id === 'per-minute-rental' ? { ...c, tested: false } : c));
    expect(messages({ ...base, concepts })).toEqual([
      'content/concepts.yaml  concept shared-kitchen has 1 live practice question; it needs 2',
    ]);
  });
});

describe('R10 blueprint terms', () => {
  it('reports a term the notes miss, and not one that a coveredBy maps', () => {
    const root = makeFixtureRoot();
    replaceIn(
      root,
      BLUEPRINT,
      'text: Fixture task statement 2.3, terms: []',
      'text: Fixture task statement 2.3, terms: ["access keys", { term: "oven pool", coveredBy: shared-kitchen }, "shared kitchen"]',
    );
    expect(messages(contextWith({ blueprintTerms: true }, [], root))).toEqual([
      'content/exam/blueprint.yaml  task 2.3 term "access keys" is not in resources/ and has no coveredBy; add an Exam guide update line',
    ]);
  });
});

describe('R10 exam quotas', () => {
  it('reports the switch, because the exam pool arrives in Phase 3', () => {
    expect(messages(contextWith({ examQuotas: true }))).toEqual([
      'content/validate.yaml  examQuotas is on, but the exam pool arrives in Phase 3',
    ]);
  });
});

describe('R10 switches', () => {
  it('reports nothing with every switch off, even with a missing term', () => {
    const root = makeFixtureRoot();
    replaceIn(
      root,
      BLUEPRINT,
      'text: Fixture task statement 1.1, terms: []',
      'text: Fixture task statement 1.1, terms: ["sourdough starter rotation"]',
    );
    expect(messages(contextWith({}, [], root))).toEqual([]);
  });

  it('reports nothing without a config, which R1 reports instead', () => {
    expect(r10.run({ ...contextWith({ practicePerConcept: 2 }), config: null })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and see it fail**

```bash
pnpm test tests/unit/r10.test.ts
```

Expected: FAIL with `Error: Cannot find module '../../scripts/content/rules/r10-coverage.ts'`.

- [ ] **Step 3: Add `practiceCounts` to the coverage library**

In `scripts/content/lib/coverage.ts`, add this import after the `TaskId` import:

```ts
import type { Question } from '../../../schemas/question.ts';
```

Then add this function directly above `export interface TaskCoverage {`:

```ts
/** Practice questions per concept id that pass `keep`, with a question tagged by an alias counted for the concept that lists it. */
export function practiceCounts(ctx: Context, keep: (q: Question) => boolean): Map<string, number> {
  const target = new Map<string, string>();
  for (const c of ctx.concepts) {
    for (const alias of c.aliases ?? []) target.set(alias, c.id);
  }
  const counts = new Map<string, number>();
  for (const { q } of ctx.questions) {
    if (q.pool !== 'practice' || !keep(q)) continue;
    const id = target.get(q.concept) ?? q.concept;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
```

- [ ] **Step 4: Write the rule**

Create `scripts/content/rules/r10-coverage.ts`:

```ts
import { BLUEPRINT_FILE, CONCEPTS_FILE, CONFIG_FILE, type Finding } from '../lib/context.ts';
import { missingTerms, practiceCounts } from '../lib/coverage.ts';
import { finding, type Rule } from './rule.ts';

/** R10 Coverage: the switches in content/validate.yaml set the practice count per concept, the exam quotas and the blueprint terms (spec 2.9). */
export const r10: Rule = {
  id: 'R10',
  title: 'Coverage',
  run(ctx) {
    const config = ctx.config;
    if (config === null) return [];
    const out: Finding[] = [];
    const target = config.practicePerConcept;
    if (target > 0) {
      const counts = practiceCounts(ctx, (q) => q.status === 'live');
      for (const c of ctx.concepts) {
        if (c.tested === false) continue;
        const n = counts.get(c.id) ?? 0;
        if (n >= target) continue;
        const noun = n === 1 ? 'question' : 'questions';
        out.push(
          finding('R10', CONCEPTS_FILE, `concept ${c.id} has ${n} live practice ${noun}; it needs ${target}`),
        );
      }
    }
    if (config.examQuotas) {
      out.push(finding('R10', CONFIG_FILE, 'examQuotas is on, but the exam pool arrives in Phase 3'));
    }
    if (config.blueprintTerms) {
      for (const t of missingTerms(ctx)) {
        out.push(
          finding(
            'R10',
            BLUEPRINT_FILE,
            `task ${t.task} term "${t.term}" is not in resources/ and has no coveredBy; add an Exam guide update line`,
          ),
        );
      }
    }
    return out;
  },
};
```

- [ ] **Step 5: Register R10 between R9 and R13**

In `scripts/content/rules/index.ts`, add the import after the `r09` import, and put `r10` into `RULES`:

```ts
import { r10 } from './r10-coverage.ts';
```

```ts
export const RULES: readonly Rule[] = [r01, r02, r03, r04, r05, r06, r07, r08, r09, r10, r13];
```

- [ ] **Step 6: See the bad-fixture test ask for an R10 fixture**

```bash
pnpm test tests/content/bad.test.ts
```

Expected: FAIL in `bad fixtures > cover every implemented rule`, because `R10` is implemented and no `tests/content/bad/r10-*` fixture exists yet.

- [ ] **Step 7: Switch the fixture tree to the Phase 2 rules and add the failing fixture**

Replace the whole of `tests/fixtures/content-root/content/validate.yaml` with:

```yaml
# Fixture switches: the Phase 2 rules; practicePerConcept stays 0 because the tree holds one live question.
rules: [R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R13]
practicePerConcept: 0
examQuotas: false
blueprintTerms: true
```

Create `tests/content/bad/r10-missing-term.yaml`, the fixture blueprint with task 1.1's terms set to a phrase no note holds:

```yaml
# fixture-target: content/exam/blueprint.yaml
# Fixture blueprint for the content-check tests.
exam: CLF-C02
guide: { url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html", verified_on: "2026-10-01" }
domains:
  - { id: "1", name: Cloud Concepts, weight: 24, url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html", verified_on: "2026-10-01" }
  - { id: "2", name: Security and Compliance, weight: 30, url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html", verified_on: "2026-10-01" }
  - { id: "3", name: Cloud Technology and Services, weight: 34, url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "4", name: "Billing, Pricing, and Support", weight: 12, url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html", verified_on: "2026-10-01" }
tasks:
  - { id: "1.1", text: Fixture task statement 1.1, terms: [sourdough starter rotation], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html", verified_on: "2026-10-01" }
  - { id: "1.2", text: Fixture task statement 1.2, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html", verified_on: "2026-10-01" }
  - { id: "1.3", text: Fixture task statement 1.3, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html", verified_on: "2026-10-01" }
  - { id: "1.4", text: Fixture task statement 1.4, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html", verified_on: "2026-10-01" }
  - { id: "2.1", text: Fixture task statement 2.1, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html", verified_on: "2026-10-01" }
  - { id: "2.2", text: Fixture task statement 2.2, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html", verified_on: "2026-10-01" }
  - { id: "2.3", text: Fixture task statement 2.3, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html", verified_on: "2026-10-01" }
  - { id: "2.4", text: Fixture task statement 2.4, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html", verified_on: "2026-10-01" }
  - { id: "3.1", text: Fixture task statement 3.1, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "3.2", text: Fixture task statement 3.2, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "3.3", text: Fixture task statement 3.3, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "3.4", text: Fixture task statement 3.4, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "3.5", text: Fixture task statement 3.5, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "3.6", text: Fixture task statement 3.6, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "3.7", text: Fixture task statement 3.7, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "3.8", text: Fixture task statement 3.8, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "4.1", text: Fixture task statement 4.1, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html", verified_on: "2026-10-01" }
  - { id: "4.2", text: Fixture task statement 4.2, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html", verified_on: "2026-10-01" }
  - { id: "4.3", text: Fixture task statement 4.3, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html", verified_on: "2026-10-01" }
```

- [ ] **Step 8: Run the tests and see them pass**

```bash
pnpm test tests/unit/r10.test.ts tests/content/bad.test.ts
pnpm --silent content:validate
pnpm check
```

Expected: `Tests  23 passed (23)`; `content:validate: 10 rules, 0 findings`, because the real `content/validate.yaml` switches R10 on only in Task 20; `pnpm check` exits 0.

- [ ] **Step 9: Commit**

```bash
pnpm lint:fix
git add scripts/content/lib/coverage.ts scripts/content/rules/r10-coverage.ts scripts/content/rules/index.ts tests/unit/r10.test.ts tests/content/bad/r10-missing-term.yaml tests/fixtures/content-root/content/validate.yaml
git commit -m "Add rule R10 for practice coverage and blueprint terms" -m "R10 counts live practice questions per tested concept through aliases, reports blueprint terms that resources/ misses, and refuses examQuotas until Phase 3. The fixture tree runs it with blueprintTerms on."
```

## Task 17: Open questions per concept and the notes to write

**Files:**
- Modify: `scripts/content/lib/style.ts`, `scripts/content/lib/report.ts`, `scripts/content/report.ts`, `agents/question-writer.md`
- Test: `tests/unit/style.test.ts`, `tests/unit/coverage.test.ts`, `tests/unit/draft.test.ts`, `tests/unit/agents.test.ts`

This task needs Task 16's `practiceCounts`.
A concept's open questions are its live ones plus its drafts with fewer than 3 failed check rounds, and a writer adds `need = max(0, 2 - open)` new drafts.
So the 6 Phase 1 drafts that wait for Dani stay drafts, and their concepts get fresh drafts that can take R10 to green.
`coverageProblems` keeps counting inside the one question file, as `--draft` always did, while `--homed` counts every practice question of the concept, as R10 does.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/style.test.ts`, change the two imports to:

```ts
import { coverageProblems, isOpen, moduleStyle, styleProblems } from '../../scripts/content/lib/style.ts';
```

```ts
import { matchQuestion, multiQuestion, singleQuestion, writeQuestions } from '../fixtures/questions.ts';
```

and replace the whole `describe('coverageProblems', ...)` block at the end of the file with:

```ts
describe('isOpen', () => {
  it('counts live questions and drafts below 3 review attempts, never retired ones', () => {
    const failed = (attempts: number) => ({ attempts, lastFailure: 'critic: a tell' });
    expect(isOpen(singleQuestion({ status: 'live' }))).toBe(true);
    expect(isOpen(singleQuestion())).toBe(true);
    expect(isOpen(singleQuestion({ review: failed(2) }))).toBe(true);
    expect(isOpen(singleQuestion({ review: failed(3) }))).toBe(false);
    expect(isOpen(singleQuestion({ status: 'retired' }))).toBe(false);
  });
});

describe('coverageProblems', () => {
  it('asks for 2 questions per concept homed in the note that can still go live', () => {
    const root = makeFixtureRoot();
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(coverageProblems(FILE, ctx)).toEqual([
      'concept shared-kitchen has 1 question that can still go live; it needs 2',
      'concept per-minute-rental has 1 question that can still go live; it needs 2',
    ]);
    writeFileSync(join(root, FILE), 'questions: []\n');
    expect(coverageProblems(FILE, loadContext(root, { today: FIXTURE_TODAY }))).toEqual([
      'concept shared-kitchen has 0 questions that can still go live; it needs 2',
      'concept per-minute-rental has 0 questions that can still go live; it needs 2',
    ]);
  });

  it('does not count a draft that needs Dani, and counts a live question and a fresh draft', () => {
    const root = makeFixtureRoot();
    writeQuestions(root, [
      singleQuestion({ status: 'live' }),
      singleQuestion({ id: 'q-4j6k8m', review: { attempts: 3, lastFailure: 'critic: a tell' } }),
      matchQuestion(),
      matchQuestion({ id: 'q-5m7n9p' }),
    ]);
    expect(coverageProblems(FILE, loadContext(root, { today: FIXTURE_TODAY }))).toEqual([
      'concept shared-kitchen has 1 question that can still go live; it needs 2',
    ]);
  });
});
```

In `tests/unit/draft.test.ts`, the first `draftCheck` test now expects the new wording:

```ts
    expect(problems).toEqual([
      `${QUESTION_FILE}  concept shared-kitchen has 1 question that can still go live; it needs 2`,
      `${QUESTION_FILE}  concept per-minute-rental has 1 question that can still go live; it needs 2`,
    ]);
```

In `tests/unit/coverage.test.ts`, change the first import to `import { rmSync, writeFileSync } from 'node:fs';`, and the report and fixture imports to:

```ts
import { homed, needsDani, report, targets } from '../../scripts/content/lib/report.ts';
```

```ts
import {
  matchQuestion,
  multiQuestion,
  QUESTION_FILE,
  singleQuestion,
  writeQuestions,
} from '../fixtures/questions.ts';
```

In the `describes the concepts homed in a note for the question writers` test, each concept gains its counts: add `live: 1, open: 1, need: 1` after `confusableWith: []` for `shared-kitchen`, and `live: 0, open: 1, need: 1` after `confusableWith: ['shared-kitchen']` for `per-minute-rental`.
Then append this block at the end of the file:

```ts
describe('open questions per concept', () => {
  it('leaves a draft that needs Dani out of open, so the writer adds a fresh one', () => {
    const root = makeFixtureRoot();
    writeQuestions(root, [
      singleQuestion({ status: 'live' }),
      singleQuestion({ id: 'q-4j6k8m', review: { attempts: 3, lastFailure: 'critic: a tell' } }),
      matchQuestion({ concept: 'minute-rental' }),
      matchQuestion({ id: 'q-5m7n9p', review: { attempts: 2, lastFailure: 'critic: a tell' } }),
    ]);
    replaceIn(
      root,
      'content/concepts.yaml',
      'confusableWith: [shared-kitchen]',
      'confusableWith: [shared-kitchen]\n  aliases: [minute-rental]',
    );
    const { concepts } = homed(load(root), 'm01/what-a-bakery-cloud-is');
    expect(concepts.map(({ id, live, open, need }) => ({ id, live, open, need }))).toEqual([
      { id: 'shared-kitchen', live: 1, open: 1, need: 1 },
      { id: 'per-minute-rental', live: 0, open: 2, need: 0 },
    ]);
  });

  it('lists the notes whose concepts need questions, with the file to write and how many', () => {
    const root = makeFixtureRoot();
    expect(targets(load(root))).toEqual([
      { note: 'm01/what-a-bakery-cloud-is', file: QUESTION_FILE, need: 2 },
    ]);
    writeQuestions(root, [
      singleQuestion({ status: 'live' }),
      multiQuestion(),
      matchQuestion(),
      matchQuestion({ id: 'q-5m7n9p' }),
    ]);
    expect(targets(load(root))).toEqual([]);
  });

  it('points a note without questions at the file its path maps to', () => {
    const root = makeFixtureRoot();
    rmSync(join(root, QUESTION_FILE));
    expect(targets(load(root))).toEqual([
      {
        note: 'm01/what-a-bakery-cloud-is',
        file: 'content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml',
        need: 4,
      },
    ]);
  });
});
```

Replace the top of `tests/unit/agents.test.ts`, from `const PROMPTS` to the end of the first `it.each`, so each prompt carries its own version:

```ts
/** Each prompt's current version; a new version of a prompt changes its line here. */
const VERSIONS: Record<string, number> = {
  'question-writer': 2,
  'solve-closed': 1,
  'solve-notes': 1,
  critic: 1,
  'update-writer': 1,
};
const PROMPTS = Object.keys(VERSIONS);

describe('agent prompts', () => {
  it.each(PROMPTS)('%s names itself and carries a version', (name) => {
    const { yaml, body } = splitFrontmatter(readFileSync(join(ROOT, 'agents', `${name}.md`), 'utf8'));
    expect(parse(yaml ?? '')).toEqual({ name, version: VERSIONS[name] });
    expect(body).toMatch(/^\n?# /);
  });
```

and in the last test, after the line that checks `content/STYLE.md` in the question writer, add:

```ts
    expect(read('question-writer')).toContain('`need`');
```

- [ ] **Step 2: Run them and see them fail**

```bash
pnpm test tests/unit/style.test.ts tests/unit/draft.test.ts tests/unit/coverage.test.ts tests/unit/agents.test.ts
```

Expected: FAIL with `TypeError: isOpen is not a function`, `TypeError: targets is not a function`, the old coverage wording in `draftCheck`, the missing counts in `homed`, and `question-writer` still at version 1.

- [ ] **Step 3: Count open questions in the style checks**

In `scripts/content/lib/style.ts`, add the import after the `Question` import:

```ts
import { NEEDS_DANI_ATTEMPTS } from './checks.ts';
```

Then replace `coverageProblems` and its comment with:

```ts
/** A question that is live or can still go live: a draft with fewer than NEEDS_DANI_ATTEMPTS failed check rounds. */
export function isOpen(q: Question): boolean {
  return q.status === 'live' || (q.status === 'draft' && (q.review?.attempts ?? 0) < NEEDS_DANI_ATTEMPTS);
}

/** The tested concepts homed in a question file's note that still lack PER_CONCEPT_TARGET open questions there. */
export function coverageProblems(file: string, ctx: Context): string[] {
  const match = /^content\/questions\/(\d{2})-[a-z0-9-]+\/\d{2}-([a-z0-9-]+)\.yaml$/.exec(file);
  if (match === null) return [`${file} is not a question file path`];
  const noteId = `m${match[1]}/${match[2]}`;
  const counts = new Map<string, number>();
  for (const entry of ctx.questions) {
    if (entry.path === file && isOpen(entry.q)) {
      counts.set(entry.q.concept, (counts.get(entry.q.concept) ?? 0) + 1);
    }
  }
  const problems: string[] = [];
  for (const c of ctx.concepts) {
    if (c.home !== noteId || c.tested === false) continue;
    const n = [c.id, ...(c.aliases ?? [])].reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
    if (n < PER_CONCEPT_TARGET) {
      const noun = n === 1 ? 'question' : 'questions';
      problems.push(
        `concept ${c.id} has ${n} ${noun} that can still go live; it needs ${PER_CONCEPT_TARGET}`,
      );
    }
  }
  return problems;
}
```

`checks.ts` imports neither `style.ts` nor `draft.ts`, so the new import makes no cycle.

- [ ] **Step 4: Add the counts to `--homed` and the target list**

In `scripts/content/lib/report.ts`, change three imports:

```ts
import { type Context, type LessonNote, questionFileOf } from './context.ts';
import { conceptsMdDrift, coverage, practiceCounts } from './coverage.ts';
```

```ts
import { isOpen, moduleStyle, PER_CONCEPT_TARGET } from './style.ts';
```

Then replace everything from `export interface HomedConcepts {` to the end of the file with:

```ts
export interface HomedConcepts {
  note: string;
  title: string;
  concepts: {
    id: string;
    name: string;
    anchor: string;
    tasks: { id: string; text: string }[];
    confusableWith: string[];
    /** Live practice questions on the concept, aliases included. */
    live: number;
    /** Live questions plus drafts that can still go live (fewer than 3 failed check rounds). */
    open: number;
    /** New drafts to write: PER_CONCEPT_TARGET minus open, never below 0. */
    need: number;
  }[];
  existing: number;
}

/** `--homed <noteId>`: the tested concepts homed in a lesson, in anchor order, which the question writers read. */
export function homed(ctx: Context, noteId: string): HomedConcepts {
  const note = ctx.notes.find((n): n is LessonNote => n.kind === 'lesson' && n.id === noteId);
  if (note === undefined) throw new Error(`${noteId} is not a lesson note`);
  const anchors = notesAnchors(note.headings);
  const taskText = new Map((ctx.blueprint?.tasks ?? []).map((t) => [t.id, t.text] as const));
  const live = practiceCounts(ctx, (q) => q.status === 'live');
  const opened = practiceCounts(ctx, isOpen);
  const concepts = ctx.concepts
    .filter((c) => c.home === noteId && c.tested !== false)
    .map((c, i) => ({ c, at: anchors.indexOf(c.anchor), i }))
    .sort((a, b) => a.at - b.at || a.i - b.i)
    .map(({ c }) => {
      const open = opened.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.name,
        anchor: c.anchor,
        tasks: c.tasks.map((id) => ({ id, text: taskText.get(id) ?? '' })),
        confusableWith: c.confusableWith ?? [],
        live: live.get(c.id) ?? 0,
        open,
        need: Math.max(0, PER_CONCEPT_TARGET - open),
      };
    });
  const existing = ctx.questions.filter((e) => e.noteId === noteId && e.q.status !== 'retired').length;
  return { note: noteId, title: note.fm?.title ?? note.slugFromPath, concepts, existing };
}

export interface Target {
  note: string;
  file: string;
  need: number;
}

/** `--targets`: the lesson notes whose homed concepts need new drafts, in course order, with the file to write and how many. */
export function targets(ctx: Context): Target[] {
  const out: Target[] = [];
  for (const note of ctx.notes) {
    if (note.kind !== 'lesson') continue;
    const need = homed(ctx, note.id).concepts.reduce((sum, c) => sum + c.need, 0);
    if (need === 0) continue;
    const file = ctx.questions.find((e) => e.noteId === note.id)?.path ?? questionFileOf(note.path);
    out.push({ note: note.id, file, need });
  }
  return out;
}
```

- [ ] **Step 5: Print the targets from `pnpm content:report --targets`**

In `scripts/content/report.ts`, the header comment's `--homed` line and a new `--targets` line read:

```ts
 *   --homed <noteId>     JSON of the tested concepts homed in a lesson, with live, open and need counts, for the question writers
 *   --targets            JSON of the lesson notes whose concepts need new drafts, with the file to write and how many
```

The report import gains `targets`:

```ts
import { coverageReport, homed, needsDani, report, targets } from './lib/report.ts';
```

and a new branch goes between the `--homed` branch and the `--coverage` branch:

```ts
} else if (args.includes('--targets')) {
  console.log(JSON.stringify(targets(ctx), null, 2));
```

- [ ] **Step 6: Write version 2 of the question-writer prompt**

Replace the whole of `agents/question-writer.md` with:

````markdown
---
name: question-writer
version: 2
---

# Question writer

You write the practice questions for one lesson note into one question file (spec 2.6 and 2.7).
Checker agents then verify each question, and `pnpm content:stamp` makes it live, so you only ever write drafts.
The file may be new, or it may already hold live questions and drafts from an earlier round; either way you write only what each concept still needs.

## Inputs

- Your note id `mNN/<slug>` and your target file `content/questions/NN-<module-slug>/LL-<slug>.yaml`, given in your task.
- The note itself: `resources/NN-<module-slug>/LL-<slug>.md`.
- The output of `pnpm --silent content:report --homed <noteId>`, run from the repository root: JSON with the note's `title`, each tested concept homed in it (`id`, `name`, `anchor`, `tasks` with their text, `confusableWith`, and the counts `live`, `open` and `need`), and `existing`, the number of questions the file already holds.
- `open` counts the concept's live questions plus its drafts that can still go live, which are the drafts with fewer than 3 failed check rounds (`review.attempts` below 3).
- `need` is how many new drafts the concept still needs to reach 2 open questions.
- `content/STYLE.md`, the rules every question follows; read it in full before you write.
- `content/exam/blueprint.yaml`, for the wording of each task statement.
- `resources/glossary.md`, the only services a distractor may name besides those in an "Exam guide update" line.

Never read `~/Library/Application Support/ccp-study/`, AWS exam questions or anything under `content/fingerprints/`.
Your questions must come from the note in your own words, so nothing can echo the course or the exam.

## What to write

- Write exactly `need` new questions for each concept the `--homed` output lists, and none for a concept whose `need` is 0.
- In a new file that is 2 questions per concept; test each concept from different angles, with at least one cafe scenario per concept.
- When the file already exists, add your questions to the end of its `questions` list.
- Never change or remove a `live` question, a `retired` question, or a draft whose `review.attempts` is 3 or more; those last wait for Dani.
- A new question must test its concept from an angle the file's other questions on that concept do not already cover.
- Mix the types across the file: mostly `single`, with a `multi` or a `match` where the note teaches a set or a pairing.
- Each question tests its own concept only, with `concept` set to that concept's id and `task` set to one of its `tasks`.
- Pick `level` 1, 2 or 3 by what the reader must do in that stem (`content/STYLE.md` defines them), never by the concept alone.
- Use level 3 only when the reader must choose between confusable services for a scenario that only one fits; a plain recall stem is level 1 even when its concept has `confusableWith` entries.
- Copy every `evidence` line as one whole line of the note, without its list marker; for an "Exam guide update" line, copy only the sentence after the colon.
- Get fresh ids with `pnpm --silent content:new-question N`, one per question, and never invent an id.
- Every new question starts with `version: 1`, `status: draft`, `pool: practice` and `history: []`, and has no `verified` or `review` block, because only the tools write those.

## The file format

The file holds one `questions` list.
This complete example shows a `single` question; a `multi` adds `select: 2` or `select: 3` and 5 or 6 options, and a `match` replaces `options` with `pairs` of `left`, `right` and `why`.

```yaml
questions:
  - id: q-7k2m9p
    version: 1
    status: draft
    type: single
    pool: practice
    concept: aws-lambda
    note: m03/aws-lambda
    task: "3.3"
    level: 2
    stem: >-
      The cafe's loyalty app gets bursts of orders at 8 a.m. and almost none overnight.
      Which compute option avoids paying for the idle hours?
    options:
      - id: a
        text: AWS Lambda
        correct: true
        why: Lambda bills only for the compute time that runs, so idle hours cost nothing.
      - id: b
        text: Amazon EC2 On-Demand Instances
        why: An instance bills while it is running, including the hours with no orders.
      - id: c
        text: Amazon EC2 Reserved Instances
        why: A reservation commits to steady use over a term, the opposite of this pattern.
      - id: d
        text: Amazon Lightsail
        why: Lightsail charges a set monthly price whether or not orders arrive.
    evidence:
      - You pay for compute time only, per millisecond, priced by allocated memory.
    takeaway: Spiky, event-driven work with idle gaps points to Lambda's pay-per-use billing.
    history: []
```

Use block style as above rather than one-line `{ ... }` maps, because a comma inside a flow map ends the value early.
Only the correct options carry `correct: true`.

## Checking your file

Run `pnpm --silent content:validate --draft <file>` and fix every problem it prints, until its last line ends with `0 problems`, then stop.
It checks the schema, the answer counts, the whys, the evidence lines, the references, originality against the course, the mechanical style rules and that every listed concept has 2 questions that can still go live.
Run `pnpm --silent content:report --homed <noteId>` once more at the end: every concept should show `need` 0.

## Revising after the checks

When your task says to revise, read each draft's `review.lastFailure`, which names the failed check and its reason.

- Fix that cause in the question, keep its `id`, and leave its `review` block for the tools to update.
- A `solve-closed` failure is tied to the stem, the option texts and which options are correct, so its fix must change at least one of them.
- An edit to only a `why`, the `evidence` or the `takeaway` leaves a `solve-closed` failure in place, and the question is never checked again.
- A cue failure, `the cue round found the key from the options alone (<basis>: <reason>)`, names what gave the key away without the stem.
- For a `tell` basis, remove the tell the reason names, such as a longer, hedged, more specific or repeated-word key.
- For a `knowledge` basis, rewrite the distractors as statements that are also true about AWS but do not answer the stem.
- Revise only drafts whose `review.attempts` is below 3, and never touch a `live` or `retired` question.
- Loop on `pnpm --silent content:validate --draft <file>` until it ends with `0 problems` again.

## Rules

- Write only your one target file, and never edit a note, `content/concepts.yaml`, another question file or anything under `.results/`.
- Never write course wording: if a phrase comes to mind as something you read in the course, say it differently.
- Follow `content/STYLE.md` in every question.
````

- [ ] **Step 7: Run the tests and see them pass**

```bash
pnpm test tests/unit/style.test.ts tests/unit/draft.test.ts tests/unit/coverage.test.ts tests/unit/agents.test.ts
pnpm check
```

Expected: every test passes and `pnpm check` exits 0.

- [ ] **Step 8: Run the target list on the real content**

```bash
pnpm --silent content:report --targets | head -11
pnpm --silent content:report --targets | node -e "const t = JSON.parse(require('node:fs').readFileSync(0, 'utf8')); console.log(t.length, t.reduce((n, x) => n + x.need, 0))"
pnpm --silent content:report --homed m01/welcome-to-aws-cloud-practitioner-essentials | grep -E '"(id|live|open|need)"'
```

Expected at commit `dbb5d3a` plus Tasks 16 and 17 (the numbers move only when questions or concepts change):

```text
[
  {
    "note": "m01/welcome-to-aws-cloud-practitioner-essentials",
    "file": "content/questions/01-introduction-to-the-cloud/01-welcome-to-aws-cloud-practitioner-essentials.yaml",
    "need": 4
  },
  {
    "note": "m01/introduction-to-aws-global-infrastructure",
    "file": "content/questions/01-introduction-to-the-cloud/04-introduction-to-aws-global-infrastructure.yaml",
    "need": 1
  },
77 794
```

That is 74 notes and 788 drafts in Modules 2 and 4 to 13, plus 3 notes and 6 drafts in Modules 1 and 3: `client-server-model`, `resource-provisioning`, `availability-zones` and `batch-computing` need 1 each, and `pay-as-you-go-pricing`, whose two drafts both wait for Dani, needs 2.
The `--homed` lines show `client-server-model` at live 1, open 1, need 1 and `pay-as-you-go-pricing` at live 0, open 0, need 2.

- [ ] **Step 9: Commit**

```bash
pnpm lint:fix
git add scripts/content/lib/style.ts scripts/content/lib/report.ts scripts/content/report.ts agents/question-writer.md tests/unit/style.test.ts tests/unit/draft.test.ts tests/unit/coverage.test.ts tests/unit/agents.test.ts
git commit -m "Count open questions per concept and list the notes to write" -m "A draft with 3 failed check rounds no longer counts toward a concept, --homed gives live, open and need per concept, --targets lists the notes with their files, and the question writer (version 2) writes only what each concept needs."
```

## Task 18: End-to-end tests for the memory loop

**Files:**
- Create: `tests/e2e/questions.ts`, `tests/e2e/memory.spec.ts`
- Modify: `tests/e2e/practice.spec.ts`, `tests/e2e/offline.spec.ts`
- Test: `tests/e2e/memory.spec.ts`, `tests/e2e/practice.spec.ts`, `tests/e2e/offline.spec.ts`

This task needs Tasks 11 to 15: `seedEvents` (Task 11), `timelineOf` (Task 3), and the copy of Tasks 12 to 15, which these tests match word for word.
Every memory test runs in UTC with Playwright's clock installed at 09:00 on Monday, October 12, 2026, so study days and the 04:00 boundary never depend on the machine.
Moving the clock with `page.clock.setSystemTime` survives a reload, which the prototype for this plan confirmed on both projects.
The end line of a session changes in Task 15 from `N/N correct` to `endSummaryLine`, so the practice test that reads it changes here too.
Task 11 proved offline use with a lesson and a module quiz, because reviews did not exist yet; this task adds the offline review that spec 9 e2e 6 asks for.

- [ ] **Step 1: Move the question helpers into their own module**

Create `tests/e2e/questions.ts` with the helpers `practice.spec.ts` defined, now exported for both spec files:

```ts
/** Helpers that read live questions from the built site and answer them, shared by the practice and memory tests. */
import { expect, type Page } from '@playwright/test';
import type { QuestionView } from '../../schemas/chunks.ts';

/** The live questions of a module, read the way the app reads them: the index named in the page, then the chunk. */
export async function chunkFor(page: Page, module: number): Promise<QuestionView[]> {
  return page.evaluate(async (n) => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as { modules: { n: number; chunk: string }[] };
    const chunk = index.modules.find((m) => m.n === n)?.chunk ?? '';
    return ((await (await fetch(chunk)).json()) as { questions: QuestionView[] }).questions;
  }, module);
}

/** The lesson slugs of a module, from the index. */
export async function lessonsOf(page: Page, module: number): Promise<string[]> {
  return page.evaluate(async (n) => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as {
      modules: { n: number; lessons: { slug: string }[] }[];
    };
    return index.modules.find((m) => m.n === n)?.lessons.map((l) => l.slug) ?? [];
  }, module);
}

/** The question on screen, found by the runner's `data-qid`. */
export async function shown(page: Page, questions: readonly QuestionView[]): Promise<QuestionView> {
  const runner = page.locator('section.runner');
  await expect(runner).toBeVisible();
  const qid = await runner.getAttribute('data-qid');
  const q = questions.find((x) => x.id === qid);
  if (q === undefined) throw new Error(`question ${qid} is not in the chunk`);
  return q;
}

/** Picks the right answer with the mouse; a match pairs each left with its own right. */
export async function pickRight(page: Page, q: QuestionView): Promise<void> {
  if (q.type === 'match') {
    for (const [i, pair] of q.pairs.entries()) {
      await page.getByRole('combobox', { name: pair.left, exact: true }).selectOption(`r${i + 1}`);
    }
    return;
  }
  const role = q.type === 'single' ? 'radio' : 'checkbox';
  for (const option of q.options.filter((o) => o.correct)) {
    await page.getByRole(role, { name: option.text, exact: true }).check();
  }
}

/** Picks a wrong answer with the mouse. */
export async function pickWrong(page: Page, q: QuestionView): Promise<void> {
  if (q.type === 'match') {
    for (const [i, pair] of q.pairs.entries()) {
      await page
        .getByRole('combobox', { name: pair.left, exact: true })
        .selectOption(`r${((i + 1) % q.pairs.length) + 1}`);
    }
    return;
  }
  const role = q.type === 'single' ? 'radio' : 'checkbox';
  const wrong = q.options.filter((o) => !o.correct).slice(0, q.select ?? 1);
  for (const option of wrong) await page.getByRole(role, { name: option.text, exact: true }).check();
}

/** Answers every question of the session on screen correctly by clicking; returns the end line. */
export async function finishByClicking(page: Page, questions: readonly QuestionView[]): Promise<string> {
  const end = page.locator('.end-line');
  for (;;) {
    await expect(page.locator('section.runner, .end-line').first()).toBeVisible();
    if (await end.isVisible()) return end.innerText();
    const q = await shown(page, questions);
    await pickRight(page, q);
    await page.getByRole('button', { name: /^Check/ }).click();
    await expect(page.locator('.verdict')).toHaveText('Correct');
    await page.getByRole('button', { name: /^Next/ }).click();
    await expect(page.locator('.verdict')).toHaveCount(0);
  }
}
```

- [ ] **Step 2: Point the practice tests at the shared helpers, the new end line and all 13 modules**

In `tests/e2e/practice.spec.ts`:

- Delete the six functions now in `tests/e2e/questions.ts`: `chunkFor`, `lessonsOf`, `shown`, `pickRight`, `pickWrong` and `finishByClicking`, with their doc comments.
- Add this import after the `./helpers.ts` import:

```ts
import { chunkFor, finishByClicking, lessonsOf, pickRight, pickWrong, shown } from './questions.ts';
```

- In `a lesson check runs end to end and marks the lesson on its module page`, the end line now has the form `5/5 · +42 XP`, so the parse that Task 15 loosened becomes exact:

```ts
  const [correct, total] = (/^(\d+)\/(\d+) · \+\d+ XP$/.exec(line) ?? []).slice(1);
```

- The evidence sweep covers every module; its title and loop become:

```ts
test('every live question of all 13 modules finds exactly one evidence line in its note', async ({
```

```ts
  for (let module = 1; module <= 13; module++) {
```

- [ ] **Step 3: Write the memory-loop tests**

Create `tests/e2e/memory.spec.ts`:

```ts
import { expect, type Page, test } from '@playwright/test';
import type { QuestionView } from '../../schemas/chunks.ts';
import type { NewEvent, StudyEvent } from '../../schemas/events.ts';
import { timelineOf } from '../fixtures/events.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
} from './helpers.ts';
import { chunkFor, lessonsOf, pickRight, pickWrong, shown } from './questions.ts';

/** Day 1 and day 2 of every memory test, at 09:00 UTC, well after the 04:00 day start. */
const DAY1 = '2026-10-12T09:00:00.000Z';
const DAY2 = '2026-10-13T09:00:00.000Z';
const FIRST_LESSON = 'Start Module 1: Welcome to AWS Cloud Practitioner Essentials';
const LAMBDA = 'aws-lambda';

failOnPageProblems();
// UTC keeps the study day and the 04:00 boundary the same on every machine.
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(DAY1) });
});

/** The Next link on Home. */
const nextLink = (page: Page) => page.locator('a.next[data-next]');

/** The runner's screen-reader verdict line. */
const announcement = (page: Page) => page.locator('section.runner [aria-live="polite"]');

/** Clicks Check or Sure and waits for the verdict. */
async function submit(page: Page, sure: boolean): Promise<void> {
  await page.getByRole('button', { name: sure ? /^Sure/ : /^Check/ }).click();
  await expect(page.locator('.verdict')).toBeVisible();
}

/** Presses Next after feedback and waits for the next question or the end. */
async function next(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Next/ }).click();
  await expect(page.locator('.verdict')).toHaveCount(0);
}

/**
 * Runs the AWS Lambda lesson check: the first question whose concept has another live variant is answered wrong
 * (with Sure when `sure`), every other one right with Check. Returns that question.
 */
async function lambdaCheckWithOneWrong(page: Page, sure: boolean): Promise<QuestionView> {
  await page.goto(`/#/m/03/l/${LAMBDA}`);
  await expect(h1(page, 'AWS Lambda')).toBeVisible();
  const questions = await chunkFor(page, 3);
  await page.goto(`/#/s/check/m03/${LAMBDA}`);
  const variants = (q: QuestionView): number => questions.filter((x) => x.concept === q.concept).length;
  let wrong: QuestionView | null = null;
  const end = page.locator('.end-line');
  for (;;) {
    await expect(page.locator('section.runner, .end-line').first()).toBeVisible();
    if (await end.isVisible()) break;
    const q = await shown(page, questions);
    if (wrong === null && variants(q) >= 2) {
      wrong = q;
      await pickWrong(page, q);
      await submit(page, sure);
    } else {
      await pickRight(page, q);
      await submit(page, false);
    }
    await next(page);
  }
  if (wrong === null) throw new Error('no AWS Lambda check question has a second variant');
  return wrong;
}

/** Moves the page's clock to day 2 and reloads Home. */
async function goToDay2(page: Page): Promise<void> {
  await page.clock.setSystemTime(new Date(DAY2));
  await page.goto('/');
  await page.reload();
  await expect(h1(page, 'AWS Cloud Practitioner Essentials')).toBeVisible();
}

/** The note ids of every lesson in the given modules, in course order. */
async function noteIds(page: Page, modules: readonly number[]): Promise<string[]> {
  const out: string[] = [];
  for (const m of modules) {
    for (const slug of await lessonsOf(page, m)) out.push(`m${String(m).padStart(2, '0')}/${slug}`);
  }
  return out;
}

/** A log on day 1 that reads every given lesson, one minute apart. */
function readAll(notes: readonly string[]): StudyEvent[] {
  const start = Date.parse(DAY1) - 60 * 60_000;
  return timelineOf(
    notes.map((note, i) => [new Date(start + i * 1000).toISOString(), { t: 'lesson.done', note }] as const),
  );
}

/** A session id for seeded logs: a valid ULID per index. */
const sidOf = (i: number): string => `01K7${String(i).padStart(22, '0')}`;

test('the first run shows the first lesson as Next, 13 hexes not started and the first-run line', async ({
  page,
}) => {
  await page.goto('/');
  await expect(nextLink(page)).toContainText(FIRST_LESSON);
  const hexes = page.locator('a[data-nav-item][href^="#/m/"]');
  await expect(hexes).toHaveCount(13);
  for (const hex of await hexes.all()) {
    await expect(hex).toHaveAttribute('aria-label', /^Module \d+ .+, mastery 0, not started$/);
  }
  await expect(page.locator('.home-line')).toContainText('Progress lives in this browser.');
  await expectNoSidewaysScroll(page);
  await expectNoAxeViolations(page);
});

test('a right Sure answer pays 10 XP, flashes in the top bar and adds up in the end line', async ({
  page,
}) => {
  await page.goto(`/#/m/03/l/${LAMBDA}`);
  await expect(h1(page, 'AWS Lambda')).toBeVisible();
  const questions = await chunkFor(page, 3);
  await page.goto(`/#/s/check/m03/${LAMBDA}`);
  await pickRight(page, await shown(page, questions));
  await submit(page, true);
  // The flash shows for 600 ms from the moment the answer joins the log, so it is checked first.
  await expect(page.getByText('+10', { exact: true })).toBeVisible();
  await expect(announcement(page)).toHaveText('Correct. Plus 10 XP');
  await next(page);
  const end = page.locator('.end-line');
  for (;;) {
    await expect(page.locator('section.runner, .end-line').first()).toBeVisible();
    if (await end.isVisible()) break;
    await pickRight(page, await shown(page, questions));
    await submit(page, false);
    await next(page);
  }
  await expect(end).toHaveText(/^(\d+)\/\1 · \+\d+ XP$/);
});

test('a wrong answer comes back the next day as a review with a relearn step, and the streak reaches 2', async ({
  page,
}) => {
  const wrong = await lambdaCheckWithOneWrong(page, false);
  const questions = await chunkFor(page, 3);
  await goToDay2(page);

  await expect(page.getByRole('button', { name: /^1 concepts? due; start a review$/ })).toBeVisible();
  await expect(nextLink(page)).toContainText('Review 1 concept');
  await expectNoSidewaysScroll(page);
  await expectNoAxeViolations(page);
  await page.locator('h1').click();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/s\/review$/);

  const first = await shown(page, questions);
  expect(first.concept).toBe(wrong.concept);
  await expect(page.locator('.runner-position')).toHaveText('1 of 1');
  await expectNoAxeViolations(page);
  await pickWrong(page, first);
  await submit(page, false);
  await expect(announcement(page)).toHaveText('Incorrect. Plus 5 XP');
  await expectNoAxeViolations(page);
  await next(page);

  const relearn = await shown(page, questions);
  expect(relearn.concept).toBe(first.concept);
  expect(relearn.id).not.toBe(first.id);
  await expect(page.locator('.runner-position')).toHaveText('2 of 2');
  await pickRight(page, relearn);
  await submit(page, false);
  await expect(announcement(page)).toHaveText('Correct.');
  await next(page);

  await expect(page.locator('.end-line')).toContainText('0/1 · +5 XP');
  await expect(page.getByText('Done for now.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to Home' }).click();
  await expect(page.getByRole('button', { name: 'Streak 2 days; open Progress' })).toContainText('2d');
  await expectNoAxeViolations(page);
});

test('a wrong Sure answer comes back the next day as a misconception with every why open', async ({
  page,
}) => {
  const wrong = await lambdaCheckWithOneWrong(page, true);
  const questions = await chunkFor(page, 3);
  await goToDay2(page);
  await nextLink(page).click();
  await expect(page).toHaveURL(/#\/s\/review$/);
  const q = await shown(page, questions);
  expect(q.concept).toBe(wrong.concept);
  await pickRight(page, q);
  await submit(page, false);
  await expect(page.getByText('You were sure last time')).toBeVisible();
  const whys = page.locator('.review details');
  expect(await whys.count()).toBeGreaterThan(0);
  await expect(page.locator('.review details:not([open])')).toHaveCount(0);
});

test.describe('the exam date question', () => {
  test('shows once Module 1 is read, and Save hides it for good', async ({ page }) => {
    await page.goto('/');
    await seedEvents(page, readAll(await noteIds(page, [1])));
    const question = page.getByText('No exam date yet. The plan targets Sat 14 Nov.');
    await expect(question).toBeVisible();
    await expect(page.getByLabel('Exam date')).toHaveValue('2026-11-14');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(question).toBeHidden();
    await page.reload();
    await expect(h1(page, 'AWS Cloud Practitioner Essentials')).toBeVisible();
    await expect(nextLink(page)).toBeVisible();
    await expect(question).toBeHidden();

    await page.locator('h1').click();
    await page.keyboard.press('g');
    await page.keyboard.press('p');
    const sheet = page.getByRole('dialog', { name: 'Progress' });
    await expect(sheet.getByRole('heading', { name: 'Exam date' })).toBeVisible();
    await expect(sheet.getByLabel('Exam date')).toHaveValue('2026-11-14');
    await expectNoAxeViolations(page);
  });

  test('Not now hides it for good', async ({ page }) => {
    await page.goto('/');
    await seedEvents(page, readAll(await noteIds(page, [1])));
    const question = page.getByText('No exam date yet. The plan targets Sat 14 Nov.');
    await expect(question).toBeVisible();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(question).toBeHidden();
    await page.reload();
    await expect(nextLink(page)).toBeVisible();
    await expect(question).toBeHidden();
  });
});

test('every lesson read and checked with nothing due shows Done for today', async ({ page }) => {
  await page.goto('/');
  const notes = await noteIds(page, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  const start = Date.parse(DAY1) - 3 * 60 * 60_000;
  const at = (i: number): string => new Date(start + i * 1000).toISOString();
  const items: (readonly [string, NewEvent])[] = [];
  for (const [i, note] of notes.entries()) {
    const sid = sidOf(i + 1);
    items.push([
      at(3 * i),
      { t: 'session', sid, mode: 'check', phase: 'start', seed: 1, scope: note, qids: [] },
    ]);
    items.push([at(3 * i + 1), { t: 'session', sid, mode: 'check', phase: 'submit', seed: 1 }]);
    items.push([at(3 * i + 2), { t: 'lesson.done', note }]);
  }
  items.push([at(3 * notes.length), { t: 'settings', patch: { examDate: '2026-11-14' } }]);
  await seedEvents(page, timelineOf(items));
  await expect(page.getByText('Done for today', { exact: true })).toBeVisible();
  await expect(page.getByText('Nothing due.', { exact: true })).toBeVisible();
  await expect(nextLink(page)).toHaveCount(0);
  await expectNoSidewaysScroll(page);
  await expectNoAxeViolations(page);
});

test('Enter follows Next, j and k move between hexes, and g r opens Review', async ({ page }) => {
  await page.goto('/');
  await expect(nextLink(page)).toContainText(FIRST_LESSON);
  await page.locator('h1').click();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/m\/01\/l\/welcome-to-aws-cloud-practitioner-essentials$/);

  await page.goto('/');
  await expect(nextLink(page)).toBeVisible();
  await page.locator('h1').click();
  await page.keyboard.press('j');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Module 1 /);
  await page.keyboard.press('j');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Module 2 /);
  await page.keyboard.press('k');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Module 1 /);
  await page.keyboard.press('k');
  await expect(page.locator(':focus')).toHaveAttribute('aria-label', /^Module 1 /);

  await page.keyboard.press('g');
  await page.keyboard.press('r');
  await expect(page).toHaveURL(/#\/s\/review$/);
  await expect(page.getByText('Nothing due.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to Home' })).toBeVisible();
});
```

- [ ] **Step 4: Add the offline review to the offline tests**

In `tests/e2e/offline.spec.ts`, replace:

```ts
import { expect, type Page, test } from '@playwright/test';
import { eventsOf } from '../fixtures/events.ts';
import { failOnPageProblems, h1, seedEvents } from './helpers.ts';
```

with:

```ts
import { expect, type Page, test } from '@playwright/test';
import type { NewEvent } from '../../schemas/events.ts';
import { eventsOf, timelineOf } from '../fixtures/events.ts';
import { failOnPageProblems, h1, seedEvents } from './helpers.ts';
import { chunkFor } from './questions.ts';
```

Append to the end of `tests/e2e/offline.spec.ts`:

```ts
test('offline, a review shows a concept that fell due', async ({ page, context }) => {
  await installWorker(page);
  const questions = await chunkFor(page, 3);
  const [q] = questions;
  if (q === undefined) throw new Error('Module 3 has no live questions');
  // A wrong Not sure answer three days ago rates Again, so the concept fell due two days ago in any zone.
  const ago = (minutes: number): string =>
    new Date(Date.now() - (3 * 24 * 60 - minutes) * 60_000).toISOString();
  const sid = `01K7${'0'.repeat(20)}RV`;
  const items: (readonly [string, NewEvent])[] = [
    [ago(0), { t: 'session', sid, mode: 'check', phase: 'start', seed: 1, scope: q.note, qids: [q.id] }],
    [
      ago(1),
      {
        t: 'answer',
        sid,
        mode: 'check',
        qid: q.id,
        qv: q.version,
        concept: q.concept,
        picked: ['z'],
        correct: false,
        sure: false,
        ms: 5000,
      },
    ],
    [ago(2), { t: 'session', sid, mode: 'check', phase: 'submit', seed: 1 }],
  ];
  await seedEvents(page, timelineOf(items));

  await context.setOffline(true);
  await page.goto('/#/s/review');
  const runner = page.locator('section.runner');
  await expect(runner).toBeVisible();
  const qid = await runner.getAttribute('data-qid');
  expect(questions.find((x) => x.id === qid)?.concept).toBe(q.concept);
});
```

The review loads the Module 3 chunk and starts its session with the network off, so the queue, the selection and the runner all work from the precache.

- [ ] **Step 5: Typecheck and lint the tests**

```bash
pnpm typecheck
pnpm lint
```

Expected: both exit 0.

- [ ] **Step 6: Run the memory-loop and offline tests against the build**

```bash
pnpm build
pnpm e2e tests/e2e/memory.spec.ts
pnpm e2e tests/e2e/offline.spec.ts
```

Expected: `16 passed` for `memory.spec.ts`, 8 tests on each of `chromium-desktop` and `webkit-mobile`; `4 passed` and `4 skipped` for `offline.spec.ts`, whose WebKit tests skip with Task 11's reason.
When a test fails, find the root cause in the app (Tasks 12 to 15) and fix it there with a unit test first; never loosen a test.

- [ ] **Step 7: Run the whole e2e suite except the 13-module sweep**

```bash
pnpm e2e --grep-invert "finds exactly one evidence line"
```

Expected: every test passes.
The sweep needs live questions in all 13 modules, so it passes only once Task 19's branch is merged, and Task 20 runs it as part of `pnpm verify`.

- [ ] **Step 8: Commit**

```bash
pnpm lint:fix
git add tests/e2e/questions.ts tests/e2e/memory.spec.ts tests/e2e/practice.spec.ts tests/e2e/offline.spec.ts
git commit -m "Add end-to-end tests for the memory loop" -m "First run, XP on a Sure answer, a next-day review with a relearn step and a streak of 2, a misconception, the exam date question, Done for today, the Home keys and a review offline, with axe on each screen. The practice tests share their helpers and sweep the evidence lines of all 13 modules."
```

## Task 19: Practice questions for Modules 2 and 4 to 13 (agent fan-out)

**Files:**
- Create, in Modules 2 and 4 to 13, one question file per lesson note that homes a tested concept (74 files at commit `dbb5d3a`):
  - `content/questions/02-compute-in-the-cloud/`: `01-introduction-to-amazon-ec2.yaml`, `02-amazon-ec2-instance-types.yaml`, `03-how-to-provision-aws-resources.yaml`, `04-demo-launching-an-amazon-ec2-instance.yaml`, `05-amazon-ec2-pricing.yaml`, `06-scaling-amazon-ec2.yaml`, `07-directing-traffic-with-elastic-load-balancing.yaml`, `08-messaging-and-queuing.yaml`
  - `content/questions/04-going-global/`: `02-choosing-aws-regions.yaml`, `03-diving-deeper-into-aws-global-infrastructure.yaml`, `04-infrastructure-and-automation.yaml`
  - `content/questions/05-networking/`: `01-introduction-to-networking.yaml`, `02-organizing-aws-cloud-resources.yaml`, `03-more-ways-to-connect-to-the-aws-cloud.yaml`, `04-subnets-security-groups-and-network-access-control-lists.yaml`, `05-amazon-vpc-demo.yaml`, `06-global-networking.yaml`, `07-global-architectures.yaml`
  - `content/questions/06-storage/`: `01-introduction-to-storage.yaml`, `02-ec2-instance-store-and-amazon-elastic-block-store-amazon-ebs.yaml`, `03-amazon-elastic-block-store-amazon-ebs-data-lifecycle.yaml`, `04-amazon-simple-storage-service-amazon-s3.yaml`, `05-amazon-s3-storage-classes-and-s3-lifecycle.yaml`, `06-amazon-s3-demonstration.yaml`, `07-amazon-elastic-file-system-amazon-efs.yaml`, `08-amazon-fsx.yaml`, `09-aws-storage-gateway.yaml`, `10-aws-elastic-disaster-recovery.yaml`, `11-comparing-storage-services.yaml`
  - `content/questions/07-databases/`: `01-introduction-to-databases.yaml`, `02-relational-database-services.yaml`, `03-nosql-database-services.yaml`, `04-aws-databases-demonstration.yaml`, `05-in-memory-caching-services.yaml`, `06-additional-database-services.yaml`
  - `content/questions/08-ai-ml-and-data-analytics/`: `01-introduction-to-ai-and-machine-learning.yaml`, `02-ai-ml-on-aws.yaml`, `03-aws-ai-ml-solutions.yaml`, `04-introduction-to-generative-ai-on-aws.yaml`, `05-aws-generative-ai-solutions.yaml`, `06-introduction-to-data-analytics.yaml`, `07-data-pipelines-on-aws.yaml`, `08-data-analytics-and-ai-ml.yaml`
  - `content/questions/09-security/`: `01-introduction-to-security-on-aws.yaml`, `02-preventing-unauthorized-access.yaml`, `03-protecting-networks-and-applications.yaml`, `04-protecting-data.yaml`, `05-detecting-and-responding-to-security-incidents.yaml`, `06-additional-security-resources.yaml`
  - `content/questions/10-monitoring-compliance-and-governance/`: `01-introduction-to-monitoring-compliance-and-governance-in-the-aws-cloud.yaml`, `02-introduction-to-monitoring.yaml`, `03-amazon-cloudwatch.yaml`, `04-aws-cloudtrail.yaml`, `05-compliance.yaml`, `06-auditing-aws-resources-for-compliance.yaml`, `07-aws-organizations.yaml`, `08-governance.yaml`, `09-aws-health.yaml`, `10-aws-trusted-advisor.yaml`
  - `content/questions/11-pricing-and-support/`: `02-aws-pricing-concepts.yaml`, `03-aws-pricing-and-billing-services.yaml`, `04-aws-support-plans.yaml`, `05-aws-marketplace-and-aws-partners.yaml`, `06-cost-optimization.yaml`
  - `content/questions/12-migrating-to-the-aws-cloud/`: `01-introduction-to-migration.yaml`, `02-aws-cloud-adoption-framework.yaml`, `03-seven-migration-strategies.yaml`, `04-migration-services-and-tools.yaml`, `05-database-migrations.yaml`, `06-transferring-data-online.yaml`, `07-transferring-data-offline.yaml`
  - `content/questions/13-well-architected-solutions/`: `01-introduction-to-well-architected-solutions.yaml`, `02-aws-specialized-services.yaml`, `03-aws-well-architected-framework.yaml`
- Modify: `content/questions/01-introduction-to-the-cloud/01-welcome-to-aws-cloud-practitioner-essentials.yaml`, `content/questions/01-introduction-to-the-cloud/04-introduction-to-aws-global-infrastructure.yaml`, `content/questions/03-exploring-compute-services/04-additional-compute-services.yaml`
- Test: R10 with 2 per concept on a scratch switch, `pnpm content:validate`, and the `pnpm content:report` style lines

The target list in Step 3 is the source of truth; when notes or concepts change before this task runs, its list replaces the one above.
This task needs only Task 17 on `master`, so the controller starts it right after Task 17 lands, in its own worktree, while the code builders work.

- [ ] **Step 1: Make the content worktree**

Run from the repository root, with `$SCRATCH` set to the controller's scratchpad directory:

```bash
git worktree add -b content/phase-2 "$SCRATCH/wt-content" master
cd "$SCRATCH/wt-content"
eval "$(fnm env)"; fnm use
pnpm install --frozen-lockfile
git log --oneline -1
```

Expected: the last line is Task 17's commit, `Count open questions per concept and list the notes to write`.
Every agent below works only in this worktree, and every later command of this task runs in it.

- [ ] **Step 2: Confirm no blueprint term is missing**

```bash
pnpm --silent content:report --coverage --json
```

Expected: `[]`.
When it lists terms, run the Phase 1 Task 13 update-writer fan-out in this worktree and apply its results before any question writer starts, because a new concept needs questions too.

- [ ] **Step 3: Write the target list**

```bash
mkdir -p .results
pnpm --silent content:report --targets > .results/targets.json
node -e "const t = JSON.parse(require('node:fs').readFileSync('.results/targets.json', 'utf8')); console.log(t.length, t.reduce((n, x) => n + x.need, 0))"
```

Expected: `77 794` at commit `dbb5d3a` plus Task 17.

- [ ] **Step 4: Run the content workflow**

Run this script with the Workflow tool; it is tool input, not a repo file.
Its `args` are `{ "worktree": "<absolute path of $SCRATCH/wt-content>", "targets": <the JSON array in .results/targets.json> }`.
With `{ "worktree": ..., "topupOnly": true }` it skips writing, balancing and the first rounds, and runs only the top-up, its rounds and the commits, which Step 6 uses.

```js
export const meta = {
  name: 'phase2-content',
  description: 'Phase 2 practice questions: one writer per lesson note, balance per module, up to 3 check rounds, top-ups, one commit per module',
  phases: [
    { title: 'Write', detail: 'one question writer per target note' },
    { title: 'Balance', detail: 'one agent per new module' },
    { title: 'Prepare' },
    { title: 'Check', detail: 'one fresh agent per batch' },
    { title: 'Stamp' },
    { title: 'Revise', detail: 'one writer per file' },
    { title: 'Top-up', detail: 'fresh drafts for concepts whose drafts need Dani' },
    { title: 'Commit', detail: 'one commit per module, in module order' },
  ],
}

const WT = args.worktree
const TARGETS = args.targets ?? []
const TOPUP_ONLY = args.topupOnly === true
const NODE = 'eval "$(fnm env)"; fnm use >/dev/null;'
const MAX_ROUNDS = 3
const TOPUP_ROUNDS = 2
const ALL_MODULES = '01,02,03,04,05,06,07,08,09,10,11,12,13'
const NEW_MODULES = [2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const pad2 = (n) => String(n).padStart(2, '0')
const HOOKS = `Start every shell command with: cd "${WT}" && ${NODE} Never use the em dash. Never add a Co-Authored-By line. Never use --no-verify. Never commit unless your task says so.`

if (!WT) return { stopped: 'args.worktree is missing' }
if (!TOPUP_ONLY && TARGETS.length === 0) return { stopped: 'args.targets is empty' }

const WRITE = {
  type: 'object',
  properties: { file: { type: 'string' }, written: { type: 'integer' }, problems: { type: 'integer' } },
  required: ['file', 'written', 'problems'],
}
const BALANCE = {
  type: 'object',
  properties: { module: { type: 'integer' }, line: { type: 'string' } },
  required: ['module', 'line'],
}
const PREP = { type: 'object', properties: { batches: { type: 'array', items: { type: 'string' } } }, required: ['batches'] }
const STAMP = {
  type: 'object',
  properties: {
    live: { type: 'integer' },
    draft: { type: 'integer' },
    revise: { type: 'array', items: { type: 'string' } },
    needsDani: { type: 'array', items: { type: 'string' } },
    cueBasis: { type: 'string' },
    gradeSummary: { type: 'string' },
  },
  required: ['live', 'draft', 'revise', 'needsDani', 'cueBasis', 'gradeSummary'],
}
const TARGETS_SCHEMA = {
  type: 'object',
  properties: {
    targets: {
      type: 'array',
      items: {
        type: 'object',
        properties: { note: { type: 'string' }, file: { type: 'string' }, need: { type: 'integer' } },
        required: ['note', 'file', 'need'],
      },
    },
  },
  required: ['targets'],
}
const COMMIT = {
  type: 'object',
  properties: { commit: { type: 'string' }, files: { type: 'integer' }, line: { type: 'string' } },
  required: ['commit', 'files', 'line'],
}
const FINAL = {
  type: 'object',
  properties: {
    live: { type: 'integer' },
    draft: { type: 'integer' },
    needsDani: { type: 'array', items: { type: 'string' } },
    styleLines: { type: 'array', items: { type: 'string' } },
    r10: { type: 'string' },
  },
  required: ['live', 'draft', 'needsDani', 'styleLines', 'r10'],
}

/** One question writer for one target note: writes `need` drafts per concept and loops on --draft. */
function writer(t, label, phaseName) {
  return agent(`You are the question writer for the CCP study site in the git worktree ${WT} (work only there, never in any other checkout).
Read agents/question-writer.md and content/STYLE.md in full, then follow the prompt exactly.
Your note is ${t.note} and your target file is ${t.file}; the note is resources/${t.file.replace(/^content\/questions\//, '').replace(/\.yaml$/, '.md')}.
Run \`pnpm --silent content:report --homed ${t.note}\` and write exactly \`need\` new drafts for each concept it lists, ${t.need} in all.
When the file exists, add your drafts to the end of its questions list and never touch its live questions or its drafts with review.attempts of 3 or more.
Get fresh ids with \`pnpm --silent content:new-question N\`.
Loop on \`pnpm --silent content:validate --draft ${t.file}\` until its last line ends with \`0 problems\`.
Write no other file. Never read ~/Library/Application Support/ccp-study/, content/fingerprints/, AWS exam questions or other question files.
${HOOKS}
Return the file, the number of drafts you wrote and the problem count of your last --draft run.`, { label, phase: phaseName, schema: WRITE })
}

/** Up to `max` check rounds over every module; returns one summary per round. */
async function checkRounds(max, seedBase, tag) {
  const rounds = []
  for (let round = 1; round <= max; round++) {
    const prep = await agent(`Run exactly: cd "${WT}" && ${NODE} pnpm --silent content:checks prepare --modules ${ALL_MODULES} --seed ${seedBase + round}
Return the batch paths it printed (the lines ending in .json), relative to the worktree root. Do not edit any file. If it fails, return an empty list.`, { label: `prepare:${tag}${round}`, phase: 'Prepare', schema: PREP, effort: 'low' })
    const batches = prep?.batches ?? []
    log(`${tag} round ${round}: ${batches.length} batches`)
    if (batches.length === 0) break
    await parallel(batches.map((b) => () => {
      const name = b.split('/').pop().replace(/\.json$/, '')
      const kind = name.replace(/-\d+$/, '')
      const file = kind.startsWith('critic') ? 'agents/critic.md' : `agents/${kind}.md`
      return agent(`You are a fresh checker for the CCP study site in the git worktree ${WT}. Your batch is \`${b}\` (kind \`${kind}\`).
Read \`${file}\` first and follow it exactly; for critic batches, do the round your batch name says (\`critic-cue-NN\` is the cue round, \`critic-NN\` the full round).
A cue answer carries \`basis\` (tell, knowledge or guess) and, unless the basis is guess, a one-line \`reason\`.
Read only what that prompt file allows. Never open .results/checks/keys.json, any file under content/questions/, the notes or the course. Edit only your answer file.
Write \`.results/checks/answers/${name}.json\`, then loop on \`cd "${WT}" && ${NODE} pnpm --silent content:checks lint .results/checks/answers/${name}.json\` until it prints OK.
Return one line: OK and the answer count, or the last lint error.`, { label: `check:${tag}${round}:${name}`, phase: 'Check' })
    }))
    const st = await agent(`Work in the git worktree ${WT}. Run \`${NODE} pnpm --silent content:checks grade\`, then \`pnpm --silent content:stamp\`, then \`pnpm --silent content:report\` and \`pnpm --silent content:report --needs-dani\`. Do not edit files and do not commit.
Count, over this round's .results/checks/answers/critic-cue-*.json, how many answers had each basis and how many of each hit the key (compare with .results/checks/keys.json, which you may read because you are the grader, not a checker); return it as cueBasis, one line.
Return the live and draft counts over all modules, revise = the paths from the stamp's \`revise <path>\` lines, needsDani = the ids \`--needs-dani\` lists (empty for \`none\`), gradeSummary = the grade summary line plus up to 12 FAIL lines.`, { label: `stamp:${tag}${round}`, phase: 'Stamp', schema: STAMP, effort: 'low' })
    rounds.push({ tag, round, batches: batches.length, ...st })
    log(`${tag} round ${round}: ${st?.live} live, ${st?.draft} draft, ${st?.needsDani?.length ?? 0} need Dani; cue ${st?.cueBasis}`)
    if (!st || st.revise.length === 0 || round === max) break
    await parallel(st.revise.map((f) => () => agent(`You are the question writer for the CCP study site in the git worktree ${WT}. Read agents/question-writer.md and content/STYLE.md in full, then revise the failed drafts in \`${f}\`.
Each failed draft's \`review.lastFailure\` names the failed check and its reason; revise only drafts whose review.attempts is below 3, keep every id, and never touch live questions or drafts with 3 attempts.
Fix the real cause, as the prompt's "Revising after the checks" section says: a solve-closed failure needs a change to the stem, the option texts or the key; a cue failure with basis "tell" needs the tell removed; with basis "knowledge" the distractors become true statements about AWS that do not answer the stem.
Loop on \`pnpm --silent content:validate --draft ${f}\` until it ends with \`0 problems\`. Edit only this file.
${HOOKS}
Return at most 5 lines.`, { label: `revise:${tag}${round}:${f.split('/').pop()}`, phase: 'Revise' })))
  }
  return rounds
}

const rounds = []
if (!TOPUP_ONLY) {
  phase('Write')
  const written = await parallel(TARGETS.map((t) => () => writer(t, `write:${t.note}`, 'Write')))
  const failed = written.filter((w) => !w || w.problems > 0)
  log(`Write: ${written.filter(Boolean).reduce((n, w) => n + w.written, 0)} drafts in ${TARGETS.length} files; ${failed.length} files with problems`)

  phase('Balance')
  const lines = await parallel(NEW_MODULES.map((m) => () => agent(`You balance the Module ${m} practice drafts of the CCP study site in the git worktree ${WT}. Read content/STYLE.md in full.
Run \`pnpm --silent content:report\` and read the line that starts with \`m${pad2(m)}:\`.
The module passes when it has at least 2 multi questions, at least 1 match question, the correct option longest in at most 35% of its singles, and negative stems in at most 5% of its questions.
When it does not pass, edit only drafts in content/questions/${pad2(m)}-*/ to fix it: turn a single into a multi or a match where the note teaches a set or a pairing, rebalance option lengths, or rewrite a negative stem as a positive one; keep every id, concept, task and evidence line.
After your edits, loop on \`pnpm --silent content:validate --draft <file>\` for every file you changed until each ends with \`0 problems\`, then run \`pnpm --silent content:report\` again.
${HOOKS}
Return the module number and its final style line.`, { label: `balance:m${pad2(m)}`, phase: 'Balance', schema: BALANCE })))
  for (const l of lines) if (l) log(l.line)

  rounds.push(...(await checkRounds(MAX_ROUNDS, 20, 'r')))
}

phase('Top-up')
const left = await agent(`Run exactly: cd "${WT}" && ${NODE} pnpm --silent content:report --targets
It prints a JSON list of { note, file, need }. Return it as targets, unchanged. Do not edit any file.`, { label: 'targets', phase: 'Top-up', schema: TARGETS_SCHEMA, effort: 'low' })
const topups = left?.targets ?? []
log(`Top-up: ${topups.length} notes, ${topups.reduce((n, t) => n + t.need, 0)} drafts`)
if (topups.length > 0) {
  await parallel(topups.map((t) => () => writer(t, `topup:${t.note}`, 'Top-up')))
  rounds.push(...(await checkRounds(TOPUP_ROUNDS, 30, 't')))
}

phase('Commit')
const commits = []
for (const m of NEW_MODULES) {
  const c = await agent(`Work in the git worktree ${WT} on branch content/phase-2.
Run \`pnpm --silent content:validate\`; if it reports an R2 duplicate id in a draft of content/questions/${pad2(m)}-*/, give that draft a fresh id from \`pnpm --silent content:new-question 1\` and run it again.
Stage every changed or new file under content/questions/${pad2(m)}-*/ by path (never git add -A or git add .), then commit with the subject "Add the practice questions for Module ${m}" and a body of one line per fact: the module's live and draft counts from \`pnpm --silent content:report\` (count its file entries), the number of check rounds (${rounds.length}), and the module's style line.
Use two -m flags. The pre-commit hook runs pnpm check; when it fails, fix the cause in this module's question files only and commit again.
${HOOKS}
Return the commit hash, the number of files committed and the module's style line.`, { label: `commit:m${pad2(m)}`, phase: 'Commit', schema: COMMIT, effort: 'low' })
  commits.push(c)
}
const topupCommit = await agent(`Work in the git worktree ${WT} on branch content/phase-2.
Stage every changed file under content/questions/01-*/ and content/questions/03-*/ by path, then commit with the subject "Top up Modules 1 and 3 to two live questions per concept" and a body naming the concepts that gained drafts and their live counts.
Use two -m flags. When nothing under those folders changed, make no commit and say so.
${HOOKS}
Return the commit hash (or "none"), the number of files committed and the m01 style line.`, { label: 'commit:topup', phase: 'Commit', schema: COMMIT, effort: 'low' })
commits.push(topupCommit)

const final = await agent(`Work in the git worktree ${WT}. Do not edit or commit anything.
Run \`${NODE} pnpm --silent content:report\` and \`pnpm --silent content:report --needs-dani\`.
Then switch R10 on in content/validate.yaml (add R10 to rules before R13, set practicePerConcept: 2 and blueprintTerms: true), run \`pnpm --silent content:validate\`, and restore the file with \`git checkout -- content/validate.yaml\`; confirm \`git status --short content/validate.yaml\` prints nothing.
Return the live and draft counts, the needs-Dani lines (empty for none), every style line, and the last line of the R10 run as r10.`, { label: 'final', phase: 'Commit', schema: FINAL, effort: 'low' })

return {
  rounds,
  live: final?.live,
  draft: final?.draft,
  needsDani: final?.needsDani,
  styleLines: final?.styleLines,
  r10: final?.r10,
  commits,
}
```

What each phase does:

- `Write`: one writer per target note in parallel, each writing exactly `need` drafts per concept from `--homed` and looping on `--draft` until `0 problems`.
- `Balance`: one agent per new module fixes a style line outside the limits (fewer than 2 `multi`, no `match`, the correct option longest in more than 35% of singles, or negative stems above 5%) by editing that module's drafts only.
- Rounds 1 to 3: keyless batches over all 13 modules, one fresh checker per batch, the cue round with its `basis`, then grade, stamp and revise; a round with nothing to revise ends the loop early.
- `Top-up`: `--targets` again lists every note whose concept lost drafts to 3 failed rounds, one writer adds fresh drafts, and up to 2 more rounds check them.
- `Commit`: one commit per module in module order, then one for the Module 1 and 3 top-ups, each through the pre-commit hook; the last agent switches R10 on in a scratch edit, runs the validator and restores the file.

Expected return: about 790 drafts written, `live` at least 95% of the questions in Modules 2 and 4 to 13 after the first 3 rounds, every style line within the limits, and `r10` reading `content:validate: 11 rules, 0 findings`.

- [ ] **Step 5: Check the result in the worktree**

```bash
git log --oneline master..HEAD
git status --short
pnpm --silent content:validate
pnpm --silent content:report
pnpm --silent content:report --needs-dani
pnpm --silent content:report --targets
```

Expected: 11 or 12 commits, `Add the practice questions for Module 2` to `Module 13` and `Top up Modules 1 and 3 to two live questions per concept`; a clean status; `content:validate: 10 rules, 0 findings`; a style line for every module within the limits; the needs-Dani list for the phase report; and `[]` from `--targets`.

Then switch R10 on in a scratch edit, run it, and restore the file:

```bash
sed -i '' -e 's/R9, R13/R9, R10, R13/' -e 's/practicePerConcept: 0/practicePerConcept: 2/' -e 's/blueprintTerms: false/blueprintTerms: true/' content/validate.yaml
pnpm --silent content:validate
git checkout -- content/validate.yaml
git status --short content/validate.yaml
```

Expected: `content:validate: 11 rules, 0 findings`, then no status line.

- [ ] **Step 6: When a concept still lacks 2 live questions, top up again**

When Step 5's R10 run reports `concept <id> has 1 live practice question; it needs 2`, `--targets` lists its note, because its drafts failed 3 rounds.
Run the workflow again with `{ "worktree": ..., "topupOnly": true }`, which writes fresh drafts for exactly those concepts, checks them in 2 rounds and commits per module, then repeat Step 5.
After two top-up runs, put any concept still short into the phase report for Dani instead of running more rounds.

- [ ] **Step 7: Merge the content branch**

Once the code tasks are merged into `master`, run from the repository root:

```bash
git merge --no-ff content/phase-2 -m "Merge the Phase 2 practice questions" -m "Practice questions for Modules 2 and 4 to 13 and top-ups for Modules 1 and 3, written, checked and stamped by the content workflow."
git worktree remove "$SCRATCH/wt-content"
git branch -d content/phase-2
pnpm --silent content:validate
```

Expected: the merge passes the pre-commit hook, the worktree and the branch are gone, and the validator prints `content:validate: 10 rules, 0 findings`.

## Task 20: Switch on R10 and the Phase 2 gate

**Files:**
- Modify: `content/validate.yaml`, `package.json`, `README.md`
- Test: `pnpm content:validate`, `pnpm content:report --coverage`, `pnpm verify`

This task needs every other task, with Task 19's branch merged.

- [ ] **Step 1: Switch R10 on at 2 per concept with `blueprintTerms`**

Replace the whole of `content/validate.yaml` with:

```yaml
# Active validator rules and R10 switches, raised phase by phase (spec 2.9).
# Phase 0: R1, R2, R6, R7, R8 and R13; Phase 1 adds R3, R4, R5 and R9; Phase 2 adds R10.
rules: [R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R13]
practicePerConcept: 2
examQuotas: false
blueprintTerms: true
```

```bash
pnpm --silent content:validate
pnpm --silent content:report --coverage | tail -1
```

Expected: `content:validate: 11 rules, 0 findings` and `missing terms: 0`.
A finding here means Task 19 left a concept short; go back to its Step 6 rather than lowering the switch.

- [ ] **Step 2: Set the version**

In `package.json`, change `"version": "0.2.0"` to `"version": "0.3.0"`.

- [ ] **Step 3: Describe Phase 2 in the README**

In `README.md`, replace the intro's third line with:

```markdown
Lesson checks, module quizzes and daily reviews let Dani practise every module with saved progress, offline too, and labs arrive phase by phase.
```

Replace the `pnpm content:report` row of the Commands table with:

```markdown
| `pnpm content:report` | Counts and style lines; `--coverage` lists coverage by task and missing blueprint terms, `--needs-dani` lists drafts that failed 3 check rounds, `--homed <note>` gives a note's concepts with their `live`, `open` and `need` counts, and `--targets` lists the notes whose concepts still need drafts |
```

At the end of the Questions section, after the line about drafts and retired questions never reaching the site, add:

```markdown
Rule R10 keeps every tested concept at 2 or more live practice questions and every blueprint term in `resources/` or mapped by `coveredBy`.
A draft that failed its checks three times waits for Dani, so `--targets` asks the writers for fresh drafts in its place.
```

Insert these two sections directly above `## Progress and backups`:

```markdown
## Daily reviews

Every tested concept you answer gets one FSRS memory card, and the review queue brings each concept back when its recall drops to about 90%.
Home's Next button picks what to do now: resume a session, review what is due, continue or check a lesson, start the next one, or stop at "Done for today".
Check and Sure are a bet: Sure pays 10 XP when right and 0 when wrong, while Check pays 8 or 5, so press Sure only when you are more than 71% sure.
A wrong answer in a review brings another variant of the concept back a few questions later, and a wrong Sure marks a misconception that leads the next day's queue.
XP, the level, the streak with its freezes and the 13 module hexes are all replayed from the event log, so a rule change recalculates them instead of losing them.

## Offline

After one visit, a service worker keeps the whole site, every module included, so reviews work without a network.
A new version downloads in the background and takes over on the next launch, so an open page never mixes two versions.
```

- [ ] **Step 4: Run the Phase 2 gate**

```bash
pnpm verify
```

Expected: `pnpm check` passes with R10 on; the build's `budgets:` line shows the largest module chunk under 120.0 KB across 13 chunks and `sw.js` under 4.0 KB; every e2e test passes on both projects, including `every live question of all 13 modules finds exactly one evidence line in its note` and the 8 memory-loop tests.

- [ ] **Step 5: Commit**

```bash
pnpm lint:fix
git add content/validate.yaml package.json README.md
git commit -m "Switch on R10 and add the Phase 2 commands to the README" -m "R10 now holds every tested concept at 2 live practice questions and every blueprint term in the notes or mapped. Version 0.3.0. The README describes daily reviews, offline use and --targets."
```

Exit criteria (spec 10.1, Phase 2):

- R10 is on at 2 per concept with `blueprintTerms`, and `pnpm content:validate` prints `content:validate: 11 rules, 0 findings`.
- `pnpm content:report --coverage | tail -1` prints `missing terms: 0`.
- `pnpm verify` passes.
- Dani deploys with `pnpm site:deploy` and runs his first daily review on Monday, October 19, 2026.

## Self-review

### Spec coverage

| Spec 10.1, Phase 2 | Tasks |
|---|---|
| Questions for the other 11 modules | 17 (targets and the writer prompt) and 19 |
| FSRS queue | 1 (the wrapper and the exam cap), 3 (cards per concept), 5 (the queue) and 6 (relearn steps) |
| Bets | 2, 3 and 15 |
| XP | 2, 3, 13 (the flash) and 15 |
| Level | 2, 13 (the level line) and 15 |
| Streak | 3 (qualifying days), 4, 13 and 15 |
| Top bar | 13 |
| Home with Next, including "Check yourself" | 7 (`nextAction`), 12 (labels and keys) and 14 |
| Hexes | 7 (mastery and bands) and 14 |
| "Done for today" | 7, 12 and 14 |
| Exam date question | 3 (the cap), 12 (`examAskDue`), 14 and 15 |
| Offline service worker | 11, and 18 (a review offline) |
| R10 with `blueprintTerms` | 16, switched on in 20 |
| Exit: the coverage report lists no missing term | 19 (Step 2) and 20 |
| Usable outcome: the daily habit loop across the whole course | 18 (end to end) and the gate in 20 |

| Other spec sections Phase 2 implements | Tasks |
|---|---|
| 2.9 R10 and the phase switches | 16 and 20 |
| 2.7 generation and checks for 11 more modules | 17 and 19 |
| 3.1 counted answers, the effort bonus and misconceptions | 3 and 15 |
| 3.2 the XP table and levels | 2 |
| 3.5 qualifying days, the streak and freezes | 3 and 4 |
| 3.6 FSRS, relearn steps and the exam cap | 1, 3, 6 and 15 |
| 3.7 the queue, interleaving, confusable pairs, catch-up and the new-concept cap | 5 |
| 3.8 module mastery and hex bands | 7 and 14 |
| 3.11 the anti-grind audit, Phase 2 rows | 8 |
| 4.1 the module quiz ordered by recall | 6 and 15 |
| 4.6 the Next action | 7, 12 and 14 |
| 7.2 to 7.5 Home, the top bar, keys and phone layout | 12, 13 and 14 |
| 8.1 the `relearn` flag and the kv keys, 8.4 local migrations | 3, 10 and 12 |
| 9 golden journeys, property tests and e2e | 8 and 18 |

### Deliberate deviations

- `deriveMemory` is a second reducer beside Phase 1's `derive`, because the memory replay needs the content while `derive` must replay backups without it (Task 3).
- `answer` gains an optional `relearn` flag and `SCHEMA_VERSION` stays 1, because an optional field leaves every stored event and backup valid (Task 3).
- An answer to an older question version keeps its XP and leaves FSRS alone instead of being rescored, until the first key-fix brings every key into the index (Task 3).
- No snapshot cache: the app replays the whole log on every change, inside spec 8.1's budget (Tasks 3 and 8).
- The extra Again of spec 3.1 is skipped when the day's rating is already Again, so one lapse never counts twice (Task 3).
- Readiness, ranks, the boss-ready dot, the focus quiz, mission safety and the extras line wait for their phases, so Next has six items and the top bar no rank (Tasks 7 and 13).
- The module page's mastery line and concept list and the lesson recall dots wait for Phase 3 (Task 14).
- "Continue the current lesson" reads the kv key `currentLesson`, because reading writes no event (Tasks 10, 12 and 14).
- The fixture tree runs R10 with `blueprintTerms: true` and `practicePerConcept: 0`, and `tests/unit/r10.test.ts` covers the count on contexts it builds (Task 16).
- `practiceCounts` lives in `scripts/content/lib/coverage.ts`, so R10 and `--homed` resolve aliases the same way (Tasks 16 and 17).
- Writers fill `need`, not 2: drafts that wait for Dani stay drafts and their concepts get fresh ones, so R10 can turn on (Task 17).
- The practice e2e helpers move to `tests/e2e/questions.ts`, and the practice test that parses the end line follows Task 15's new line (Task 18).
- Task 11 proves offline use with a lesson and a module quiz, and Task 18 adds the offline review once reviews exist (Tasks 11 and 18).
- The 13-module evidence sweep runs green only after the content merge, so Task 18 runs the suite without it and Task 20's `pnpm verify` runs it (Tasks 18 and 20).
- The content runs on branch `content/phase-2` in its own worktree and merges in Task 19's last step, so drafts never mix into the code builders' checks (Task 19).
- The content workflow takes the worktree, the targets and a `topupOnly` switch as `args`, so a short concept gets another top-up without rewriting the script (Task 19).

### Names used across tasks

- Engine: `DAY_MS`, `studyDayAt`, `dayStartAt`, `addDays`, `daysBetween`, `nextDayStart`, `SrsCard`, `SrsRating`, `rate`, `review`, `recall`, `ExamCap`, `capDue`, `BET`, `SURE_BREAKEVEN`, `SURE_HINT`, `betXp`, `expectedXp`, `XP`, `effortBonus`, `xpForLevel`, `level`, `levelProgress`.
- Memory: `COUNTING_MODES`, `CATCH_UP_OVER`, `CATCH_UP_PLAN`, `ConceptInfo`, `MemoryContent`, `Misconception`, `ConceptMemory`, `MemoryState`, `resolveConcept`, `isDue`, `deriveMemory`, `SessionSummary`, `sessionSummary`, `ENGINE_VERSION` 2, `toPlain`, `timelineOf`.
- Streak, queue and Next: `FREEZE_EVERY`, `FREEZE_CAP`, `StreakState`, `streakOf`, `CHUNK_SIZE`, `ITEM_SECONDS`, `ReviewQueue`, `reviewQueue`, `RELEARN_GAP`, `relearnVariant`, `SessionItem`, `sessionItems`, `successGate`, `conceptMastery`, `moduleMastery`, `HexBand`, `hexBand`, `BAND_LABEL`, `LessonRef`, `NextInput`, `NextAction`, `nextAction`, `nextMinutes`.
- Index, store and offline: `ConceptMeta.tasks`, `confusableWith`, `aliases`, `splitFrom`, `LessonMeta.minutes`, `checkConcepts`, `KV_KEYS.examAsk`, `engineVersion`, `currentLesson`, `schemaVersion`, `preMigration`, `LocalData`, `migrateLocal`, `SW_PLACEHOLDER`, `SwManifest`, `swManifest`, `injectManifest`, `swPlugin`, `seedEvents`.
- App: `TARGET_EXAM_DATE`, `now`, `startClock`, `memoryContentOf`, `lessonRefs`, `nextLabel`, `nothingDueLine`, `streakLine`, `examDateLabel`, `hexLabel`, `examAskDue`, `memory`, `queue`, `streak`, `mastery`, `nextUp`, `TopBar`, `HexMap`, `verdictAnnouncement`, `endSummaryLine`.
- Content: `r10`, `practiceCounts`, `isOpen`, `coverageProblems`, `HomedConcepts` with `live`, `open` and `need`, `Target`, `targets`, `pnpm content:report --targets`, `question-writer` version 2.
- End to end: `chunkFor`, `lessonsOf`, `shown`, `pickRight`, `pickWrong` and `finishByClicking` in `tests/e2e/questions.ts`.
