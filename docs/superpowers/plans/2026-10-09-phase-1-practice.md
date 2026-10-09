# Phase 1 Practice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Dani practise Modules 1 and 3 with saved progress: a question schema with rules R3, R4, R5 and R9, the R7 stem check, an agent check pipeline with `pnpm content:stamp`, about 100 verified pilot questions, a runner for single, multi and match questions, lesson checks and the module quiz, an append-only event log with export and import, and `pnpm content:report --coverage` with an "Exam guide update" line for every blueprint term the notes miss.

**Architecture:** Questions live in `content/questions/NN-module/LL-lesson.yaml`, load into the same `Context` as the notes, and pass pure validator rules; checker agents answer keyless batches that a script grades, and `content:stamp` binds each pass to the question's content hashes.
The build ships live practice questions in each module chunk, and the app records every answer as an event in IndexedDB, from which a pure replay under `src/engine/` derives all progress.
Course text still never enters the repo: the fingerprints now store each course shingle in exactly one of 26 sets, which keeps them one-way while adding the stem check against knowledge checks and assessment items.

**Tech Stack:** Node 24.21.0, pnpm 12.8.1, TypeScript 7.0.2, Vite 8.3.2, Preact 10.29.8 with @preact/signals 2.11.3, zod 4.6.5 (classic for content, `zod/mini` for events and backups), marked 18.0.14, yaml 2.9.1, Vitest 5.0.3, fast-check 4.10.2, Playwright 1.63.0 with @axe-core/playwright 4.13.0, Biome 2.5.15, IndexedDB; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, sections 2.5 to 2.10, 3.1, 4.1, 7, 8, 9, 10.1 (Phase 1 row) and Appendix B.
**Target:** Wednesday, October 14, 2026, when lesson checks and quizzes for Modules 1 and 3 start (spec 10.2), for the exam on Saturday, November 14, 2026.

---

## Conventions for every task

- Run every command from the repository root, `/Users/danielchahine/Programs/AWS Cloud Practitioner Essentials`, where `node --version` must print `v24.21.0`.
- Never write the em dash character (U+2014) anywhere, and keep one sentence per line in every Markdown file outside code blocks and tables (rule R8 checks both).
- Commit messages are plain imperative sentences with a short body; never add a `Co-Authored-By` line (Dani's global instructions forbid agent co-author lines).
- Run `pnpm lint:fix` before each commit so Biome formats the code; the code in this plan follows Biome's style, but the formatter has the last word.
- The pre-commit hook runs `pnpm check`, so a commit fails while any check fails; fix the cause rather than bypassing the hook.
- Never hand-edit generated files: `content/fingerprints/*` comes only from `pnpm content:fingerprint`, the `verified` and `review` blocks of a question only from `pnpm content:stamp`, and `tests/fixtures/backups/v*.snapshot.json` only from its test helper.
- Course text stays outside the repo in `~/Library/Application Support/ccp-study/`; no file, fixture, test, agent prompt or agent output in the repo may contain it, and test fixtures use made-up bakery text.
- Question writers never read the course source text, `content/fingerprints/` or AWS exam questions; checker agents read only their own batch file and never `.results/checks/keys.json`.
- Agent results and check batches live under `.results/` (git-ignored) and are never committed.
- Code under `src/engine/` is pure: it imports no Preact, signals, `src/app`, `src/ui` or `src/store` code and touches no DOM or storage global; Biome enforces this from Task 15.
- Raw question ids appear only in the runner's report panel and in tool output, never elsewhere in the UI (spec 2.8).

## File structure

Created in this phase (paths from the repo root):

| Path | Responsibility |
|---|---|
| `schemas/question.ts` | The question schema (single, multi, match), `Verified`, `Review`, `History`, `CHECK_NAMES` |
| `schemas/events.ts`, `schemas/backup.ts` | `zod/mini` schemas of the event log and the backup file, loaded lazily by the app |
| `scripts/content/lib/hashes.ts` | `canonicalJson`, `keyHash`, `fullHash` and `correctKey` |
| `scripts/content/lib/evidence.ts` | Evidence-line normal form, a note's citable lines, and the section that holds a line |
| `scripts/content/rules/r03-answer-counts.ts`, `r04-explanations.ts`, `r05-evidence.ts`, `r09-verified.ts` | Rules R3, R4, R5 and R9 |
| `scripts/content/lib/qid.ts`, `scripts/content/new-question.ts` | Fresh question ids and `pnpm content:new-question` |
| `scripts/content/lib/style.ts`, `scripts/content/lib/draft.ts` | The mechanical style checks and the `--draft` view of a question file |
| `scripts/content/lib/question-files.ts` | Edits `status`, `verified` and `review` in a question file while keeping comments |
| `scripts/content/lib/checks.ts`, `scripts/content/checks.ts`, `scripts/content/stamp.ts` | Check batches, answer linting and grading, and `pnpm content:stamp` |
| `scripts/content/lib/coverage.ts`, `scripts/content/report.ts` | Blueprint-term search, coverage by task, and `pnpm content:report` |
| `scripts/content/lib/updates.ts`, `scripts/content/updates.ts` | Checking and applying update-writer results with `pnpm content:updates` |
| `content/STYLE.md` | Writing rules for question agents (spec 2.7) |
| `agents/question-writer.md`, `agents/solve-closed.md`, `agents/solve-notes.md`, `agents/critic.md`, `agents/update-writer.md` | Versioned agent prompts |
| `content/questions/01-introduction-to-the-cloud/*.yaml`, `content/questions/03-exploring-compute-services/*.yaml` | The pilot questions, one file per lesson note |
| `src/engine/rng.ts`, `src/engine/day.ts` | Seeded randomness and the 04:00 study day |
| `src/engine/replay.ts`, `src/engine/select.ts` | `derive` from the event log, and lesson check and quiz selection |
| `src/store/ulid.ts`, `src/store/idb.ts`, `src/store/events.ts`, `src/store/kv.ts` | Event ids and the IndexedDB stores |
| `src/store/backup.ts`, `src/store/migrations/index.ts` | Export, import, merge, preview, reminder, and schema migrations |
| `src/env.d.ts` | The `__APP_VERSION__` declaration |
| `src/app/progress.ts` | Progress signals, `initStore` and `record` |
| `src/app/runner.ts`, `src/app/runner-keys.ts` | The runner's pure answer logic and key mapping |
| `src/app/screens/Runner.tsx`, `src/app/screens/Progress.tsx` | The question runner and the Progress overlay |
| `tests/unit/hashes.test.ts`, `evidence.test.ts`, `r03.test.ts`, `r04.test.ts`, `r05.test.ts`, `r09.test.ts`, `fingerprint-files.test.ts` | Tests for the content rules and the shingle partition |
| `tests/unit/qid.test.ts`, `style.test.ts`, `question-files.test.ts`, `draft.test.ts`, `checks.test.ts`, `coverage.test.ts`, `updates.test.ts` | Tests for the generation pipeline |
| `tests/unit/rng.test.ts`, `day.test.ts`, `ulid.test.ts`, `events-schema.test.ts`, `migrations.test.ts`, `replay.test.ts`, `select.test.ts`, `backup.test.ts`, `backups.test.ts`, `runner.test.ts`, `runner-keys.test.ts` | Tests for the engine, the store and the runner logic |
| `tests/property/replay.property.test.ts`, `tests/property/backup.property.test.ts` | Property tests for replay order, unknown ids, merge and backup round trips |
| `tests/content/bad/r03-two-correct.yaml`, `r04-missing-why.yaml`, `r05-evidence-not-in-note.yaml`, `r07-copied-stem.yaml`, `r09-stale-stamp.yaml` | One failing fixture per new rule check |
| `tests/fixtures/content-root/content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml` | The fixture tree's questions, in made-up bakery text |
| `tests/fixtures/backups/v1.json`, `tests/fixtures/backups/v1.snapshot.json` | The schema 1 backup and its derived snapshot, kept forever |
| `tests/e2e/practice.spec.ts`, `tests/e2e/helpers.ts` | Practice and backup end-to-end tests, and the helpers shared with `reader.spec.ts` |

Modified:

| Path | Change |
|---|---|
| `schemas/fingerprint.ts`, `scripts/content/lib/fingerprint.ts`, `scripts/content/lib/fingerprint-files.ts`, `scripts/content/fingerprint.ts` | Modulus-sized sets and one set per course shingle (`text` and `items` per module, `itemIds`) |
| `content/fingerprints/m01.json` to `m13.json` | Regenerated by `pnpm content:fingerprint` |
| `scripts/content/lib/context.ts` | `QuestionEntry`, `ctx.questions`, `ctx.headPaths`, and both fingerprint sets in `ModulePrints` |
| `scripts/content/rules/index.ts`, `r02-ids.ts`, `r06-references.ts`, `r07-originality.ts` | The new rules in `RULES`; question ids, references, runs and the stem check |
| `scripts/content/validate.ts` | `--draft <file>` and `--demote` |
| `scripts/content/build.ts`, `schemas/chunks.ts` | Live questions in module chunks, `QuestionView`, `questionVersions` |
| `content/validate.yaml`, `tests/fixtures/content-root/content/validate.yaml` | R3, R4, R5 and R9 switched on |
| `content/concepts.yaml`, `content/exam/blueprint.yaml`, notes under `resources/` | Update-line concepts, `coveredBy` mappings, update lines and their concept tags (Task 13) |
| `src/app/router.ts`, `nav.ts`, `state.ts`, `keys.ts`, `App.tsx` | Check and quiz routes, the Progress overlay, `highlight`, `g p` and `c`, store start-up and the save-error banner |
| `src/app/screens/Screen.tsx`, `LessonPage.tsx`, `ModulePage.tsx`, `Home.tsx`, `Help.tsx` | Runner routes, "Check yourself", read and check marks, the module quiz, first-run and backup reminder lines, new shortcuts |
| `src/ui/base.css` | Runner, verdict, submit bar, report panel, evidence highlight and Progress styles, from the existing tokens |
| `biome.json` | The engine-boundary override for `src/engine/**` |
| `vite.config.ts`, `vitest.config.ts` | `__APP_VERSION__`, and the property tests in the test run |
| `package.json` | Version `0.2.0` and the `content:new-question`, `content:checks`, `content:stamp`, `content:report` and `content:updates` scripts |
| `README.md` | The new commands, questions, and progress and backups |
| `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md` | Section 2.5 and R7 in 2.9 describe the one-set rule, the modulus sizing and the stem check |
| `tests/fixtures/content-root.ts`, `tests/unit/schemas.test.ts`, `context.test.ts`, `r02.test.ts`, `r06.test.ts`, `r07.test.ts`, `fingerprint.test.ts`, `fingerprints-committed.test.ts`, `build.test.ts`, `build-real.test.ts`, `router.test.ts`, `nav.test.ts`, `keys.test.ts`, `tests/e2e/reader.spec.ts` | Follow the changes above |

---

## Task 1: Question schema and the question loader

**Files:**
- Create: `schemas/question.ts`, `tests/fixtures/content-root/content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml`
- Modify: `scripts/content/lib/context.ts`, `tests/unit/context.test.ts`, `tests/unit/schemas.test.ts`
- Test: `tests/unit/context.test.ts`, `tests/unit/schemas.test.ts`

- [ ] **Step 1: Read the design of this task**

- `schemas/question.ts` (classic zod; content runs at build time):
  - `QID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz'` (Crockford base32, lowercase), `Qid = z.string().regex(/^q-[0-9a-hjkmnp-tv-z]{6}$/, 'must look like q-7k2m9p')`.
  - `OptionId = z.enum(['a','b','c','d','e','f'])`; `Option = z.strictObject({ id: OptionId, text: z.string().min(1).max(220), correct: z.boolean().default(false), why: z.string().max(400) })`.
  - `Pair = z.strictObject({ left: z.string().min(1).max(80), right: z.string().min(1).max(160), why: z.string().max(400) })`.
  - `History = z.strictObject({ version: z.number().int().min(2), change: z.enum(['key-fix','rewrite']), rescore: z.boolean() })`.
  - `CHECK_NAMES = ['solve-closed','solve-notes','critic'] as const`, `CheckName`; `Verified = z.strictObject({ keyHash: z.string().regex(/^[0-9a-f]{12}$/), fullHash: same, checks: z.array(z.string().regex(/^(?:solve-closed|solve-notes|critic)@\d+$/)).length(3), on: IsoDate })`; `Review = z.strictObject({ attempts: z.number().int().min(1), lastFailure: z.string().min(1) })`.
  - `QuestionStatus = z.enum(['draft','live','retired'])`, `Pool = z.enum(['practice','exam'])`, `Level = z.union([z.literal(1), z.literal(2), z.literal(3)])`.
  - `Base = z.strictObject({ id: Qid, version: z.number().int().min(1), status: QuestionStatus, pool: Pool, concept: ConceptId, note: NoteId, task: TaskId, level: Level, stem: z.string().min(20).max(600), evidence: z.array(z.string().min(1)).max(3), takeaway: z.string().max(160), history: z.array(History).default([]), verified: Verified.optional(), review: Review.optional() })`.
  - `Question = z.discriminatedUnion('type', [Base.extend({ type: z.literal('single'), options: z.array(Option).length(4) }), Base.extend({ type: z.literal('multi'), select: z.union([z.literal(2), z.literal(3)]), options: z.array(Option).min(5).max(6) }), Base.extend({ type: z.literal('match'), pairs: z.array(Pair).min(3).max(5) })])`, with no `superRefine` (R3, R4 and R9 check the rest).
  - Types `Question`, `SingleQuestion`, `MultiQuestion`, `MatchQuestion` (`Extract<Question, { type: ... }>`), `Verified`, `Review`, `CheckName`.
  - `QuestionFile = z.strictObject({ questions: z.array(z.unknown()) })`: the loader validates the list's shape, then each item on its own, so one bad question never hides the others.
- `scripts/content/lib/context.ts` additions:
  - `QUESTIONS_DIR = 'content/questions'` and `const QUESTION = /^content\/questions\/(\d{2})-[a-z0-9-]+\/(\d{2})-([a-z0-9-]+)\.yaml$/`.
  - `export interface QuestionEntry { path: string; line: number; index: number; noteId: string; q: Question }`; `noteId` is `m${NN}/${slug}` from the path (the note the file belongs to); `line` is the 1-based line of the item, from `new LineCounter()` passed to `parseDocument(text, { lineCounter })` and `lineCounter.linePos(seq.items[i].range[0]).line`.
  - `Context` gains `questions: readonly QuestionEntry[]` (items that passed the schema, in file then item order) and `headPaths: (prefix: string) => string[]` (paths in `HEAD` under the prefix, from `git ls-tree -r --name-only HEAD -- <prefix>`; `[]` outside git or when `HEAD` has none).
  - R1 findings: YAML errors (`YAML: ...`), a file without a `questions` list, each failing item as `questions[i] (q-id or #i+1).<path>: <message>` with the item's line, and any other `.yaml` under `content/questions/` as `not a question file path (content/questions/NN-module/NN-lesson.yaml), so no rule checks it`.
- The fixture tree gains `tests/fixtures/content-root/content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml` with two drafts: a `single` on `shared-kitchen` (task `1.1`, level 2, a bakery scenario stem, four options with whys of at least 20 characters, evidence `Branches use ovens from one central kitchen when their queues grow.`, a takeaway) and a `match` on `per-minute-rental` (task `4.1`, three pairs about renting by the minute, evidence `Cabinets are billed only while dough proofs.`); no 6 consecutive words of either may appear in `tests/fixtures/source/module-01.md`.
- Tests: `tests/unit/schemas.test.ts` gains a `Question` block (a valid single, multi and match parse; a bad id, a `single` with 5 options, a `multi` with `select: 4`, a stem of 10 characters and a `verified` with 2 checks fail); `tests/unit/context.test.ts` gains: the fixture questions load with `noteId` `m01/what-a-bakery-cloud-is` and line numbers 2 and the line of the second item; a broken item becomes one R1 finding with its index and line while the other item still loads; a stray `content/questions/notes.yaml` gets the not-a-question-file finding.
- Commands: `pnpm test tests/unit/schemas.test.ts tests/unit/context.test.ts` fails then passes; `pnpm content:validate` prints `content:validate: 6 rules, 0 findings`.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/context.test.ts tests/unit/schemas.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `0885f0a`**

```bash
git show 0885f0a
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/context.test.ts tests/unit/schemas.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the question schema and load questions into the context" -m "Phase 1 Task 1; see the plan for the design."
```

## Task 2: Question hashes

**Files:**
- Create: `scripts/content/lib/hashes.ts`, `tests/unit/hashes.test.ts`
- Test: `tests/unit/hashes.test.ts`

- [ ] **Step 1: Read the design of this task**

- `scripts/content/lib/hashes.ts`:
  - `canonicalJson(value: unknown): string`: objects with keys sorted by code point, `undefined` members dropped, arrays in order, no whitespace, `JSON.stringify` for primitives.
  - `keyPayload(q: Question): unknown`: single `{ type, stem, options: [{ id, text, correct }] }`, multi adds `select`, match `{ type, stem, pairs: [{ left, right }] }`.
  - `fullPayload(q: Question): unknown`: `{ key: keyPayload(q), whys: options.map(({ id, why }) => ({ id, why })) or pairs.map(({ why }) => why), evidence, takeaway, concept, task, note }`.
  - `hash12(value: unknown): string` (first 12 hex of sha256 of `canonicalJson`), `keyHash(q)`, `fullHash(q)`.
  - `correctKey(q: Question): string`: single and multi, the sorted correct option ids joined by `,`; match, `canonicalJson(pairs.map(({ left, right }) => ({ left, right })))`.
- Tests `tests/unit/hashes.test.ts`: `canonicalJson({ b: 1, a: [{ d: 1, c: 2 }], u: undefined })` is `{"a":[{"c":2,"d":1}],"b":1}`; both hashes are 12 lowercase hex and stable across key order; a `why` edit changes `fullHash` only; a stem edit, an option text edit or moving `correct` changes both; an `evidence` or `note` edit changes `fullHash` only; `correctKey` ignores option text edits and changes when `correct` moves.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/hashes.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `3ad4637`**

```bash
git show 3ad4637
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/hashes.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the question hashes" -m "Phase 1 Task 2; see the plan for the design."
```

## Task 3: Rules R3 and R4

**Files:**
- Create: `scripts/content/rules/r03-answer-counts.ts`, `scripts/content/rules/r04-explanations.ts`, `tests/content/bad/r03-two-correct.yaml`, `tests/content/bad/r04-missing-why.yaml`, `tests/unit/r03.test.ts`, `tests/unit/r04.test.ts`
- Modify: `scripts/content/rules/index.ts`
- Test: `tests/unit/r03.test.ts`, `tests/unit/r04.test.ts`

- [ ] **Step 1: Read the design of this task**

- `scripts/content/rules/r03-answer-counts.ts` `r03` (applies to `draft` and `live`, skips `retired`), messages prefixed with the question id:
  - single: `single needs exactly 1 correct option of 4, has N`; multi: `multi needs exactly <select> correct options, has N`.
  - single and multi: option ids are `a`, `b`, `c` ... in order with no gap (`option ids must run a, b, c ... in order`), and option texts are unique after `trim().toLowerCase()` (`two options share the text "..."`).
  - match: lefts unique and rights unique, same comparison (`two pairs share the left "..."`), and `pool` is `practice` (`match questions belong to the practice pool only`).
- `scripts/content/rules/r04-explanations.ts` `r04` (live only): every option's and every pair's `why` has at least 20 characters after trim (`option b has no why of at least 20 characters`), `evidence` has 1 to 3 lines (`needs 1 to 3 evidence lines, has 0`), and `takeaway` is not blank.
- Both rules report with `finding(rule, entry.path, message, entry.line)` and are added to `RULES` in id order.
- Bad fixtures (first line `# fixture-target: content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml`): `tests/content/bad/r03-two-correct.yaml` (a draft single with two correct options), `tests/content/bad/r04-missing-why.yaml` (a live single whose option `c` has `why: ""`).
- Tests `tests/unit/r03.test.ts` and `tests/unit/r04.test.ts` against `makeFixtureRoot()` with `replaceIn`: each message above fires once; a retired question with two correct options passes R3; a draft with an empty why passes R4.
- `tests/content/bad.test.ts` needs no change: its coverage test now expects fixtures for R3 and R4, which this task adds.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/r03.test.ts tests/unit/r04.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `1807a21`**

```bash
git show 1807a21
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/r03.test.ts tests/unit/r04.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add rules R3 and R4 for answer counts and explanations" -m "Phase 1 Task 3; see the plan for the design."
```

## Task 4: Rule R5 and the evidence lines

**Files:**
- Create: `scripts/content/lib/evidence.ts`, `scripts/content/rules/r05-evidence.ts`, `tests/content/bad/r05-evidence-not-in-note.yaml`, `tests/unit/evidence.test.ts`, `tests/unit/r05.test.ts`
- Modify: `scripts/content/rules/index.ts`
- Test: `tests/unit/evidence.test.ts`, `tests/unit/r05.test.ts`

- [ ] **Step 1: Read the design of this task**

- `scripts/content/lib/evidence.ts`:
  - `evidenceForm(line: string): string`: trim, strip one list marker (`/^(?:[-*+]|\d+[.)])\s+/`), remove every `**`, replace `[text](url)` with `text`, trim again.
  - `noteLines(note: Note): Map<string, number>`: every body line outside code fences, as `parseUpdateLine(line.trim())?.sentence` (then `evidenceForm`) for an update line, else `evidenceForm(line)`, mapped to its 1-based file line; blank forms are skipped; the first line wins.
  - `sectionAt(note: Note, line: number): Heading | null`: the last H3 (or H2 when no H3 follows it) at or above that line.
- `scripts/content/rules/r05-evidence.ts` `r05` (live only): the cited note (`q.note`) must exist (else skip; R6 reports it), and each `evidenceForm(e)` must be a key of `noteLines(note)`; message `evidence is not a whole line of <noteId>: "<evidence>"`; comparison is case-sensitive (spec 2.9).
- Bad fixture `tests/content/bad/r05-evidence-not-in-note.yaml`: a live single whose evidence is `Branches use ovens from one central kitchen.` (a shortened line).
- Tests `tests/unit/evidence.test.ts`: `evidenceForm('- **Amazon S3** stores [objects](https://x).')` is `Amazon S3 stores objects.`; an update line yields its sentence only; lines inside a code fence are skipped; `sectionAt` finds `paying-by-the-minute` for the update line of the fixture lesson.
  `tests/unit/r05.test.ts`: the fixture evidence passes; a case change fails; the fixture update sentence `The fixture guide names a newer billing term.` passes, and still passes after its `verified_on` changes.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/evidence.test.ts tests/unit/r05.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `402d8a9`**

```bash
git show 402d8a9
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/evidence.test.ts tests/unit/r05.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add rule R5 for evidence lines" -m "Phase 1 Task 4; see the plan for the design."
```

## Task 5: Rule R9, and questions in R2 and R6

**Files:**
- Create: `scripts/content/rules/r09-verified.ts`, `tests/content/bad/r09-stale-stamp.yaml`, `tests/unit/r09.test.ts`
- Modify: `scripts/content/rules/index.ts`, `scripts/content/rules/r02-ids.ts`, `scripts/content/rules/r06-references.ts`, `tests/fixtures/content-root/content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml`, `tests/unit/context.test.ts`, `tests/unit/r02.test.ts`, `tests/unit/r03.test.ts`, `tests/unit/r04.test.ts`, `tests/unit/r06.test.ts`
- Test: `tests/unit/r09.test.ts`, `tests/unit/context.test.ts`, `tests/unit/r02.test.ts`, `tests/unit/r03.test.ts`, `tests/unit/r04.test.ts`, `tests/unit/r06.test.ts`

- [ ] **Step 1: Read the design of this task**

- `scripts/content/rules/r09-verified.ts` `r09` (live only): `verified` present (`live but not verified; run the checks and pnpm content:stamp`); `verified.keyHash === keyHash(q)` and `verified.fullHash === fullHash(q)` (`verified at other hashes; its text changed after the checks, so re-check and re-stamp it`); the check names (text before `@`) are exactly the three of `CHECK_NAMES` (`verified checks must name solve-closed, solve-notes and critic`).
- `r02` gains questions: each question id is claimed in the shared owner map as `question in <path>`; then for every path in `ctx.headPaths('content/questions/')`, the `HEAD` text from `ctx.head(path)` is parsed tolerantly (skip a file that fails YAML or `QuestionFile`, and any item that fails `Question`), and for each `HEAD` item with status `live` or `retired`:
  - its id must still exist in the working tree (`question '<id>' is live or retired in HEAD but is gone; retire it in place with status: retired`);
  - when the `HEAD` item is `live` and `correctKey` differs, the current item needs `version === head.version + 1` and a history entry `{ version: current.version, change: 'key-fix' }` (`the correct answer of '<id>' changed, so it needs version <n> and a key-fix history entry`).
- `r06` gains questions (drafts and live): `concept` is a registered id or alias (`concept '<id>' is not registered`), the concept is tested (`concept '<id>' is marked tested: false`), `note === entry.noteId` (`note <note> does not match the file it sits in`), the note is a lesson whose `concepts` list holds the concept or one of its aliases, resolved through the registry (`note <note> does not list concept <id>`), and `task` is one of the resolved concept's `tasks` (`task 3.4 is not one of <id>'s tasks (3.3)`).
- The fixture `single` becomes live in this task with a real stamp: compute its hashes with a one-line `node --input-type=module -e` script that loads the fixture with `loadContext` and prints `keyHash` and `fullHash`, then write `verified: { keyHash, fullHash, checks: [solve-closed@1, solve-notes@1, critic@1], on: "2026-10-10" }` and `status: live`; the baseline test proves it passes every rule.
- Bad fixture `tests/content/bad/r09-stale-stamp.yaml`: the live single with its stem edited after the stamp.
- Tests: `tests/unit/r09.test.ts` (fixture passes; a why edit fails with the other-hashes message; 2 checks fail the schema while 3 checks with `critic` twice fail R9); `tests/unit/r02.test.ts` gains a `withHead` variant that also overrides `headPaths` and `head` for a question file (a live id missing now, a retired id kept passes, a key change without the bump fails, with the bump and history passes, a deleted draft passes, a duplicate question id fails); `tests/unit/r06.test.ts` gains the five question messages.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/r09.test.ts tests/unit/context.test.ts tests/unit/r02.test.ts tests/unit/r03.test.ts tests/unit/r04.test.ts tests/unit/r06.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `2250328`**

```bash
git show 2250328
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/r09.test.ts tests/unit/context.test.ts tests/unit/r02.test.ts tests/unit/r03.test.ts tests/unit/r04.test.ts tests/unit/r06.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add rule R9 and check question ids and references" -m "Phase 1 Task 5; see the plan for the design."
```

## Task 6: One set per course shingle

**Files:**
- Create: `tests/unit/fingerprint-files.test.ts`
- Modify: `content/fingerprints/m01.json`, `content/fingerprints/m02.json`, `content/fingerprints/m03.json`, `content/fingerprints/m04.json`, `content/fingerprints/m05.json`, `content/fingerprints/m06.json`, `content/fingerprints/m07.json`, `content/fingerprints/m08.json`, `content/fingerprints/m09.json`, `content/fingerprints/m10.json`, `content/fingerprints/m11.json`, `content/fingerprints/m12.json`, `content/fingerprints/m13.json`, `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, and 13 more (`git show --stat` lists them)
- Test: `tests/unit/fingerprint-files.test.ts`, `tests/unit/context.test.ts`, `tests/unit/fingerprint.test.ts`, `tests/unit/fingerprints-committed.test.ts`, `tests/unit/r07.test.ts`, `tests/unit/schemas.test.ts`, `tests/unit/source.test.ts`

- [ ] **Step 1: Read the design of this task**

- `schemas/fingerprint.ts`: `PackedSet = z.strictObject({ range: z.number().int().min(1).max(2 ** 24), count: z.number().int().min(0), f: z.number().min(0).max(1), data: z.string() })` (replaces `b`); `FingerprintFile = z.strictObject({ module: ModuleNumber, text: PackedSet, items: PackedSet, itemIds: z.array(ItemId) })` with the sorted-unique refine moved to `itemIds`; update the doc comments to the one-set rule.
- `scripts/content/lib/fingerprint.ts`:
  - `TARGET_RATE = 0.005`; `rangeFor(n: number): number` is `n <= 0 ? 1 : Math.floor(n / TARGET_RATE)` (replaces `bitsFor`); `hashShingle(shingle: string, range: number): number` is `readUInt32BE(0) % range` of the sha256.
  - `HashSet { range: number; f: number; values: ReadonlySet<number> }`; `pack(values, range)` and `unpack(set)` keep the 3-byte base64 format.
  - `packShingles(shingles: ReadonlySet<string>): PackedSet` replaces `buildSet(tokens)`.
  - `hitsAgainst(tokens: readonly string[], sets: readonly HashSet[]): boolean[]` (one per window; a window hits when any set holds it; masked windows never hit).
  - `runsAgainst(tokens, sets: readonly HashSet[], minShingles = RUN_SHINGLES): string[]` (now takes a list and a minimum).
  - `shareAgainst(tokens, sets)` keeps its behaviour, with `hitsAgainst` inside.
- `scripts/content/lib/fingerprint-files.ts`:
  - `export interface ModuleShingles { text: Set<string>; items: Set<string> }`.
  - `partitionShingles(sources: ReadonlyMap<number, string>): Map<number, ModuleShingles>`: shingles from `shingleWindows(words(source))` and, per item, from `splitItems(source)` texts; first pass assigns every item shingle to the lowest module whose items hold it, second pass assigns every other shingle to the lowest module that holds it; every module key from 1 to the max present appears.
  - `fingerprintCourse(sources: ReadonlyMap<number, string>): FingerprintFile[]` (one per source module, in order, with `itemIds` sorted and checked unique as before) replaces `fingerprintModule`; `allowFile` stays.
- `scripts/content/fingerprint.ts` reads all 13 sources first, writes every file, and prints per module `m01: text 7405 (f 0.0050), items 2349 (f 0.0050), 8 knowledge checks, 5 assessment items`, then `total: 135093 shingles in 26 sets, 119 knowledge checks, 133 assessment items`.
- `context.ts`: `ModulePrints { text: HashSet; items: HashSet; itemIds: readonly string[] }`, loaded from both sets.
- `r07` keeps its Phase 0 behaviour with the new sets: a note is checked with `runsAgainst(tokens, [prints.text, prints.items])` and `shareAgainst(tokens, [prints.text, prints.items])`; a shared file with runs against each module's pair and the share against all 26 sets.
- `tests/fixtures/content-root.ts` writes `fingerprintCourse(new Map([[1, source]]))[0]`.
- Tests: `tests/unit/fingerprint.test.ts` (rangeFor keeps `f` in `[0.005, 0.0051)` for n from 100 to 20,000; `hashShingle` is below `range`; pack round trip; `packShingles` rate; `runsAgainst` with two sets finds a run whose shingles split across them; 8 words are no run at the default minimum and are a run at minimum 3); `tests/unit/fingerprint-files.test.ts` (new: two made-up bakery modules sharing a sentence, where module 2's knowledge check repeats a module 1 lesson sentence: every shingle sits in exactly one of the four sets, the union equals all shingles, the repeated sentence's shingles sit in module 2's `items` set because item placement wins, and the shared plain sentence sits in module 1's `text`); `tests/unit/fingerprints-committed.test.ts` (each module's `text` and `items` hold `0.004 <= f <= 0.01`; the counts sum to 135,093 over 26 sets; each file has exactly two `"data":` keys; `itemIds` total 119 knowledge checks and 133 assessment items).
- Data step: `pnpm content:fingerprint` (needs the course source at `CCP_STUDY_HOME`), then `git diff --stat content/fingerprints` shows the 13 module files changed and `allow.txt` unchanged.
- `pnpm content:validate` prints `content:validate: 6 rules, 0 findings` (measured: no run, worst corrected share 3.6%).
- Spec edit in `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md` section 2.5: replace the truncation bullets with the modulus sizing (`range = floor(n / 0.005)`, so `f` is 0.5% per set and about 1% for a module's two sets together), replace the `items` bullets with the one-set rule above, update the "about 137,000 shingles" line to 135,093 in 26 sets, and replace the "deferred to Phase 1" sub-bullet with the stem check of Task 7; R7's row in 2.9 drops "with a stem check to come in Phase 1" and names the stem check; keep one sentence per line.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/fingerprint-files.test.ts tests/unit/context.test.ts tests/unit/fingerprint.test.ts tests/unit/fingerprints-committed.test.ts tests/unit/r07.test.ts tests/unit/schemas.test.ts tests/unit/source.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `ec0f723`**

```bash
git show ec0f723
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/fingerprint-files.test.ts tests/unit/context.test.ts tests/unit/fingerprint.test.ts tests/unit/fingerprints-committed.test.ts tests/unit/r07.test.ts tests/unit/schemas.test.ts tests/unit/source.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Store each course shingle in exactly one set" -m "Phase 1 Task 6; see the plan for the design."
```

## Task 7: R7 for questions with the stem check, and the Phase 1 switches

**Files:**
- Create: `tests/content/bad/r07-copied-stem.yaml`
- Modify: `content/validate.yaml`, `scripts/content/rules/r07-originality.ts`, `tests/fixtures/content-root/content/validate.yaml`, `tests/unit/r07.test.ts`
- Test: `tests/unit/r07.test.ts`

- [ ] **Step 1: Read the design of this task**

- `scripts/content/rules/r07-originality.ts` additions:
  - `STEM_RUN = 3`, `MAX_STEM_SHARE = 0.25`, `MIN_STEM_SHINGLES = 8`.
  - `questionTexts(q: Question): { stem: string[]; all: string[] }`: `stem` is the stem followed by each option text (single and multi) or each pair's left and right (match), one segment each; `all` is `stem` plus every `why` and the takeaway; evidence lines are exempt because they are note lines, which R7 checks as notes.
  - For each live question, with `tokensOf` as today (strip Markdown, `words`, mask): every segment of `all` against every module's `[text, items]` with `runsAgainst` (a copied 9-word run anywhere in the course); then per module, the `stem` segments against `[items]` with `runsAgainst(tokens, [items], STEM_RUN)` and the pooled share over all stem segments (`hits` summed across segments, `f` of that one set, corrected as `shareAgainst` does) when the pooled shingle count is at least `MIN_STEM_SHINGLES`.
  - Messages: `q-xxxxxx copies a 9-word run from the course: "..."`, `q-xxxxxx shares an 8-word run with a Module N knowledge check or assessment item: "..."`, `q-xxxxxx: 31.0% of its stem and option text matches Module N's knowledge checks and assessment items (limit 25%)`.
- Bad fixture `tests/content/bad/r07-copied-stem.yaml`: a live single whose stem copies the fixture source's knowledge check question word for word.
- Tests in `tests/unit/r07.test.ts`: an 8-word phrase from the fixture knowledge check inside a live stem gives exactly the stem-check finding and no 9-word finding; the same 8 words taken from the fixture's lesson text (not an item) give no finding; a 9-word copy inside a `why` gives the run finding; a draft with a copied stem gives nothing.
- `content/validate.yaml`: second comment line `# Phase 0: R1, R2, R6, R7, R8 and R13; Phase 1 adds R3, R4, R5 and R9.`, `rules: [R1, R2, R3, R4, R5, R6, R7, R8, R9, R13]`; the fixture tree's `validate.yaml` gets the same rules with the comment `# Fixture switches: the Phase 1 rules.`.
- `pnpm content:validate` prints `content:validate: 10 rules, 0 findings`; `pnpm check` passes.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/r07.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `64cb067`**

```bash
git show 64cb067
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/r07.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the stem check and switch on the Phase 1 rules" -m "Phase 1 Task 7; see the plan for the design."
```

---

## Task 8: Draft checks, new ids and demotion

**Files:**
- Create: `schemas/question.ts`, `scripts/content/lib/draft.ts`, `scripts/content/lib/evidence.ts`, `scripts/content/lib/hashes.ts`, `scripts/content/lib/qid.ts`, `scripts/content/lib/question-files.ts`, `scripts/content/lib/style.ts`, `scripts/content/new-question.ts`, `scripts/content/rules/r03-answer-counts.ts`, `scripts/content/rules/r04-explanations.ts`, `scripts/content/rules/r05-evidence.ts`, `tests/fixtures/content-root/content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml`, `tests/fixtures/questions.ts`, `tests/unit/draft.test.ts`, and 3 more (`git show --stat` lists them)
- Modify: `package.json`, `scripts/content/lib/context.ts`, `scripts/content/validate.ts`
- Test: `tests/unit/draft.test.ts`, `tests/unit/qid.test.ts`, `tests/unit/question-files.test.ts`, `tests/unit/style.test.ts`

- [ ] **Step 1: Read the design of this task**

- `scripts/content/lib/qid.ts`: `newQid(taken: ReadonlySet<string>, random: (max: number) => number = randomInt): string` (6 characters of `QID_ALPHABET`, retried while taken); `scripts/content/new-question.ts` is `pnpm content:new-question [count]` (default 1, at most 200), printing that many fresh ids, one per line, none used in the working tree or in `HEAD` question files.
- `scripts/content/lib/style.ts` (the mechanical half of `content/STYLE.md`; the critic checks the rest):
  - `PER_CONCEPT_TARGET = 2`.
  - `styleProblems(q: Question, note: LessonNote | undefined): string[]`: `/\b(?:all|none) of the above\b/i`, `/\bboth [a-f] and [a-f]\b/i` and `/\b(?:option|answer|choice) [a-f]\b/i` in stem or option texts (`uses "all of the above"` and so on); a stem with the word `not` or `except` in any case must write it as `**NOT**` or `**EXCEPT**` (`a negative stem must write NOT in bold capitals`); every number token (`/\d[\d,.]*%?/g`, trailing `.` and `,` trimmed) in stem, options or pairs must occur in the note's text (`the number 99.99 is not in m03/aws-lambda`); `/\bDeveloper Support\b|\bBusiness Support\b(?!\+)|\bEnterprise On-Ramp\b/` anywhere (`names a Support plan the exam no longer uses`).
  - `moduleStyle(questions: readonly Question[]): { singles: number; correctLongest: number; negatives: number; total: number; byType: Record<'single' | 'multi' | 'match', number> }`, counting non-retired practice questions; `correctLongest` counts singles whose correct option is strictly the longest by characters.
  - `coverageProblems(file: string, ctx: Context): string[]`: each tested concept homed in the file's note has at least `PER_CONCEPT_TARGET` non-retired questions in that file (`concept aws-lambda has 1 question; it needs 2`).
- `scripts/content/lib/question-files.ts`: `QuestionEdit { status?: 'draft' | 'live'; verified?: Verified | null; review?: Review | null }` (`null` removes the key); `editQuestionFile(text: string, edits: ReadonlyMap<string, QuestionEdit>): string`, using `parseDocument`, `setIn`/`deleteIn` on the item found by `id`, the `checks` list in flow style, and `toString({ lineWidth: 0 })`, so comments and key order survive; throws on an unknown id.
- `scripts/content/validate.ts` gains two flags:
  - `--draft <file>`: loads the context, treats every non-retired question of that file as live with no `verified` (`asLive(ctx, file): Context`, exported from `scripts/content/lib/draft.ts`), runs R1, R3, R4, R5, R6 and R7, keeps findings for that file, adds `styleProblems` per question and `coverageProblems`, prints each problem, then `draft check <file>: N questions, M problems`, and exits 1 when M is above 0.
  - `--demote`: for every live question that fails R5, sets `status: draft` with `editQuestionFile`, prints `demoted q-xxxxxx (<path>): its evidence no longer matches <note>`, then runs the configured rules as usual (spec 2.9 and 8.4).
- `package.json` scripts: `"content:new-question": "node scripts/content/new-question.ts"`.
- Tests: `tests/unit/qid.test.ts` (alphabet only, never a taken id with a stubbed `random`), `tests/unit/style.test.ts` (each problem fires once; `**NOT**` passes; a number stated in the note passes), `tests/unit/question-files.test.ts` (a comment above an item survives an edit; `verified: null` removes the key; flow-style checks), `tests/unit/draft.test.ts` (on the fixture tree the draft match passes `--draft`; an empty why in a draft is reported only under `--draft`).

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/draft.test.ts tests/unit/qid.test.ts tests/unit/question-files.test.ts tests/unit/style.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `5c2d021`**

```bash
git show 5c2d021
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/draft.test.ts tests/unit/qid.test.ts tests/unit/question-files.test.ts tests/unit/style.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add draft checks, new question ids and demotion" -m "Phase 1 Task 8; see the plan for the design."
```

## Task 9: Check batches, grading and `pnpm content:stamp`

**Files:**
- Create: `scripts/content/checks.ts`, `scripts/content/lib/checks.ts`, `scripts/content/rules/r09-verified.ts`, `scripts/content/stamp.ts`, `tests/unit/checks.test.ts`
- Modify: `package.json`
- Test: `tests/unit/checks.test.ts`

- [ ] **Step 1: Read the design of this task**

- `scripts/content/lib/checks.ts`:
  - `RESULTS_DIR = '.results/checks'` with `batches/`, `answers/`, `keys.json`, `passes.json` and `failures.json`; `BATCH_SIZE = 10`.
  - `checkVersion(root: string, name: CheckName): number`, read from the `version` frontmatter of `agents/<name>.md`.
  - `Candidate { entry: QuestionEntry; keyHash: string; fullHash: string; needs: CheckName[] }` and `candidates(ctx: Context, modules: readonly number[], passes: PassLog): Candidate[]`: non-retired practice questions of those modules whose stamp is missing or stale; `needs` drops `solve-closed` when `verified.keyHash` or a recorded pass matches the current `keyHash`, and drops `solve-notes` or `critic` when a recorded pass matches the current `fullHash` and version.
  - `PassLog = Record<string, string>` keyed `<id> <check>@<version> <hash>` with the ISO date of the pass.
  - Batch kinds `solve-closed`, `solve-notes`, `critic-cue`, `critic`; `makeBatches(cands, kind, seed): Batch[]` deals candidates in an order fixed by `sha256(seed + ':' + id)`, at most 10 per batch, at most 1 per concept, and notes as varied as the deal allows; batch names `<kind>-NN`.
  - Payloads (option order shuffled by the same hash order, numbered from 1; match rights lettered from `a` in shuffled order): solve-closed `{ id, type, select?, stem, options: [{ n, text }] }` or `{ id, type: 'match', stem, lefts: [{ n, text }], rights: [{ letter, text }] }`; solve-notes adds `notes`, the Markdown of each H3 section that holds an evidence line plus the note's `## Key takeaways` and `## Terms` sections; critic-cue `{ id, type, select?, options }` with no stem (match questions skip the cue round and pass it); critic `{ id, type, stem, select?, options: [{ n, text, correct, why }] | pairs, evidence, takeaway, concept: { id, name }, task: { id, text }, note }`.
  - `keys.json` maps batch and id to `{ hash, order }`, where `order` lists option ids, or right indexes, by displayed number or letter.
  - Answer schemas (zod): `SolveClosedAnswer { id, picked: number[] | Record<string, string>, secondDefensible: boolean, reason: string }`, `SolveNotesAnswer { id, picked, quote: string }`, `CueAnswer { id, guess: number[] }`, `CriticAnswer { id, distractorsWrong: boolean, noTell: boolean, taskFits: boolean, styleHolds: boolean, problems: string[] }`; `AnswerFile { batch: string, answers: [...] }`.
  - `grade(root): { passes: number; failures: Failure[] }` with `Failure { id; check: CheckName; hash; reason }`: solve-closed passes when the mapped pick equals the key exactly (every left mapped to its own right for match) and `secondDefensible` is false; solve-notes when the pick equals the key and `evidenceForm(quote)` is a line of the given sections; critic when the cue guess (mapped) differs from the key and all four booleans hold; a batch with no answer file or an id with no answer fails with `no answer`; passes merge into `passes.json`.
- `scripts/content/checks.ts` is `pnpm content:checks <command>`:
  - `prepare --modules 01,03 [--seed N]`: clears `batches/` and `answers/`, writes the batches and `keys.json`, prints one line per batch path, then `prepared B batches for Q questions`.
  - `lint <answers file>`: `OK <file>: N answers` or the zod problems and exit 1, also when an id is not in that batch or one is missing.
  - `grade`: prints `FAIL q-xxxxxx <check>: <reason>` per failure, then `graded N answers: P passed, F failed`.
- `scripts/content/stamp.ts` is `pnpm content:stamp`: for each non-retired practice question with a pass for all three checks at the current hashes (from `passes.json` or a still-valid `verified`), writes `verified { keyHash, fullHash, checks: [solve-closed@v, solve-notes@v, critic@v], on: today }`, `status: live` and removes `review`; for each draft with a failure at its current hashes in `failures.json`, writes `review { attempts: old + 1 (1 when absent), lastFailure: '<check>: <reason>' }`; prints `stamp: N live, M drafts to revise, K need Dani`, where "need Dani" means `attempts >= 3` (2 failed revisions, spec 2.7).
- `package.json` scripts: `"content:checks": "node scripts/content/checks.ts"`, `"content:stamp": "node scripts/content/stamp.ts"`.
- Tests `tests/unit/checks.test.ts` on the fixture tree with a temp `.results`: batches never hold two questions of one concept or more than 10; a batch file never contains `correct`, `why` or the evidence except in critic batches; grading maps shuffled picks back (a right pick passes, a wrong one fails, `secondDefensible: true` fails); a `why` edit after a full pass needs only solve-notes and critic; stamp writes a `verified` block that R9 accepts and a `review` block that counts up.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/checks.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `bf5240c`**

```bash
git show bf5240c
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/checks.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the check batches, grading and content:stamp" -m "Phase 1 Task 9; see the plan for the design."
```

## Task 10: `pnpm content:report`

**Files:**
- Create: `scripts/content/lib/coverage.ts`, `scripts/content/lib/report.ts`, `scripts/content/report.ts`, `tests/unit/coverage.test.ts`
- Modify: `package.json`
- Test: `tests/unit/coverage.test.ts`

- [ ] **Step 1: Read the design of this task**

- `scripts/content/lib/coverage.ts`:
  - `resourcesText(ctx): string`: notes and shared files, each through `stripMarkdown`, lowercased, whitespace collapsed to one space, joined.
  - `phraseIn(text: string, phrase: string): boolean`: the phrase lowercased and whitespace collapsed, matched with `(?<![a-z0-9])` before and `(?![a-z0-9])` after, regex-escaped.
  - `TermStatus { task: TaskId; term: string; found: boolean; coveredBy: string | null }` and `blueprintTerms(ctx): TermStatus[]`; `missingTerms(ctx): TermStatus[]` (not found and no `coveredBy`; Phase 2's R10 reuses it).
  - `TaskCoverage { task: TaskId; text: string; concepts: number; live: number; exam: number; missing: string[] }` and `coverage(ctx): TaskCoverage[]` (tested concepts whose `tasks` include the task; live practice questions with that `task`; exam items 0 until Phase 3).
  - `conceptsMdDrift(ctx): string[]`: tags listed in `resources/concepts.md` (lines `` - `tag`: ... ``) against the lesson frontmatter tags, as `in concepts.md only: x` and `in frontmatter only: y`.
- `scripts/content/report.ts` is `pnpm content:report`:
  - no flag: counts (modules, lessons, glossary terms, concepts and tested concepts, questions by status, live by type), then one style line per module with questions, `m03: 44 practice (single 36, multi 5, match 3); correct option longest in 9 of 36 singles (25%); negative stems 1 (2%)`, then `concepts.md drift: N` with up to 10 lines.
  - `--coverage`: one line per task, `1.1 Understand the benefits of the AWS Cloud: concepts 14, live 6, exam 0, missing: speed of deployment`, then `missing terms: N`; with `--json`, prints `[{ "task", "term" }]` of the missing terms only.
  - `--needs-dani`: `q-xxxxxx m03/aws-lambda attempts 3: <lastFailure>` per practice draft with `attempts >= 3`, or `none`.
  - `--homed <noteId>`: JSON `{ note, title, concepts: [{ id, name, anchor, tasks: [{ id, text }], confusableWith: string[] }], existing: number }` for the tested concepts homed in that note, which the question writers read.
- `package.json` script `"content:report": "node scripts/content/report.ts"`.
- Tests `tests/unit/coverage.test.ts`: `phraseIn` matches across a line break and Markdown emphasis, and not inside a longer word (`AWS WAF` is not found in `AWS WAFV2`); a term with `coveredBy` is not missing; the fixture tree's report counts its two concepts and its questions.
- Run `pnpm content:report --coverage` on the real repo and paste the missing-term lines into the step as "about" output (expected, from spec 2.3 minus the 4.3 Support plans that Phase 0 added: speed of deployment; reduced business risk, improved ESG performance, increased revenue, database replication; included licenses; access reports; access keys, password policies; AWS Firewall Manager, AWS Security Center; AWS VPN; Amazon Quick Sight; AWS cost allocation tags, AWS Cost and Usage Report; AWS Prescriptive Guidance, system integrators, and any others the run lists).

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/coverage.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `1656e7b`**

```bash
git show 1656e7b
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/coverage.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add content:report with coverage by task" -m "Phase 1 Task 10; see the plan for the design."
```

## Task 11: Agent prompts and the style guide

**Files:**
- Create: `agents/critic.md`, `agents/question-writer.md`, `agents/solve-closed.md`, `agents/solve-notes.md`, `agents/update-writer.md`, `content/STYLE.md`, `tests/unit/agents.test.ts`
- Test: `tests/unit/agents.test.ts`

- [ ] **Step 1: Read the design of this task**

Write each file in full in the plan (4-backtick fences where a file holds a fenced block); frontmatter `name` and `version: 1` on every agent prompt.

- `content/STYLE.md`: the spec 2.7 `STYLE.md` rules, each as a short section with one good and one bad made-up cafe example: one concept per question; about 60% scenario stems, practice stems set in the cafe; distractors from the same category, naming only services in `resources/glossary.md` or an update line; parallel options, correct option the longest in at most 35% of a module's singles; no "all of the above", "none of the above", "both A and B" or letter references; negative stems with a bold **NOT**, at most 5% of a module; a number only when the cited note states it; the exam guide's current names (spec 2.3), never Developer, Business or Enterprise On-Ramp Support; plus the shapes (single 4 options, multi 5 or 6 with `select` 2 or 3 and the generated `(Select TWO.)` suffix never written in the stem, match 3 to 5 pairs), levels (1 recall, 2 apply, 3 discriminate), `why` lines that say why that option is right or wrong for this stem, evidence copied as whole note lines, and a takeaway under 160 characters.
- `agents/question-writer.md`: inputs (the note, `pnpm --silent content:report --homed <noteId>`, `content/STYLE.md`, `content/exam/blueprint.yaml`, the glossary); never read `~/Library/Application Support/ccp-study/`, AWS exam questions or `content/fingerprints/`; write only the one file `content/questions/NN-module/LL-lesson.yaml`; 2 questions per listed concept with different angles and at least one scenario; mix of types; ids from `pnpm --silent content:new-question N`; `status: draft`, `pool: practice`, `version: 1`, `history: []`, no `verified`; loop `pnpm --silent content:validate --draft <file>` until it ends with `0 problems`; when revising, read each draft's `review.lastFailure`, fix that cause, keep the id, and never touch a live question; a complete example question in the file format (the spec 2.6 Lambda example adapted to the schema).
- `agents/solve-closed.md`: you see a stem and numbered options and nothing else, never open any file but your batch; answer each question on its own; for multi pick exactly `select` numbers, for match map every left number to a letter; set `secondDefensible` true when a second option could also be defended for this stem; output shape and `pnpm --silent content:checks lint <file>` until OK.
- `agents/solve-notes.md`: the same, plus the `notes` text; pick only what the notes support and quote the one whole line that supports the pick, copied exactly.
- `agents/critic.md`: two rounds, each run by a fresh agent; Cue round: options only, guess the correct option from wording, length or grammar alone; Full round: with the key, judge `distractorsWrong` (each distractor is wrong for the reason its `why` gives), `noTell` (no clue word shared between stem and key, no length or grammar tell), `taskFits` (the task statement fits), `styleHolds` (`content/STYLE.md`), listing each problem in one line.
- `agents/update-writer.md`: inputs (one task statement and its missing terms from `pnpm --silent content:report --coverage --json`, the blueprint task text and URL, the notes); for each term decide: an update line in the H3 of the note closest to the topic, one own-words sentence that contains the exact term phrase, sourced from a page on `docs.aws.amazon.com` or `aws.amazon.com` fetched with WebFetch today (the task's domain page, or that service's own page), with `verified_on` from `date +%F`; or `coveredBy` only when the term is a grouping the notes teach under more specific names (AWS VPN taught as Site-to-Site VPN and Client VPN); a renamed service (Amazon Quick Sight, spelled QuickSight in the course) gets an update line naming the current name; one line may cover several terms of the task that fit one sentence; the concept for the line (new kebab-case id, exam spelling as the name, `tasks` led by this task, up to 3 `confusableWith`), or an existing concept homed in that note whose tasks include the task; never write course wording, never edit notes, `content/concepts.yaml` or the blueprint yourself; output `.results/updates/<task>.json` and loop `pnpm --silent content:updates --check <file>` until OK.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/agents.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `b4838d7`**

```bash
git show b4838d7
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/agents.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the question, checker and update-writer prompts and the style guide" -m "Phase 1 Task 11; see the plan for the design."
```

## Task 12: `pnpm content:updates`

**Files:**
- Create: `scripts/content/lib/updates.ts`, `scripts/content/updates.ts`, `tests/unit/updates.test.ts`
- Modify: `package.json`
- Test: `tests/unit/updates.test.ts`

- [ ] **Step 1: Read the design of this task**

- `scripts/content/lib/updates.ts`:
  - `UpdateResult = z.strictObject({ task: TaskId, updates: z.array(z.strictObject({ terms: z.array(z.string().min(2)).min(1), note: NoteId, anchor: Slug, sentence: z.string().min(20).max(300), title: z.string().min(1), url: HttpsUrl, verified_on: IsoDate, concept: z.strictObject({ id: ConceptId, name: z.string().min(1), tasks: z.array(TaskId).min(1).max(3), confusableWith: z.array(ConceptId).max(3).optional() }) })).default([]), coveredBy: z.array(z.strictObject({ term: z.string().min(2), concept: ConceptId, reason: z.string().min(1) })).default([]) })`.
  - `updateLineText(u): string` is `- **Exam guide update** (verified_on <date>, [<title>](<url>)): <sentence>`, and `parseUpdateLine` must read it back.
  - `checkUpdates(result: UpdateResult, ctx: Context): string[]`: every missing term of `result.task` (from `missingTerms`) is covered exactly once by an update's `terms` or a `coveredBy`, and nothing else is listed; each term occurs in its sentence (`phraseIn`); the note is a lesson and `anchor` is in `notesAnchors`; `sourceProblem(url, verified_on, ctx.today)` is null; the sentence has no em dash and `multiSentenceLines` finds nothing; the concept id is new (not an id or alias) with `tasks[0] === task`, or it is an existing tested concept homed in that note whose `tasks` include the task; `confusableWith` and `coveredBy` ids are registered and tested; no two updates in one result share a concept id.
  - `insertUpdateLine(noteText, anchor, line): string`: inserts the line after the last non-blank line of that H3's section (before the next heading); `addConceptTag(noteText, id): string`: appends `  - <id>` after the last item of the frontmatter `concepts:` list, unless present; `setCoveredBy(blueprintText, task, term, concept): string`: replaces that term string with `{ term, coveredBy }` through the `yaml` Document API, keeping comments.
  - `applyUpdates(root, results): string[]`: checks every result against the same starting context first and throws on any problem or on a concept id claimed by two results; then edits notes, appends the new registry entries (`{ id, name, home: note, anchor, tasks, confusableWith? }`) through `readConcepts`/`stringifyConcepts`, and edits the blueprint; returns one log line per change.
- `scripts/content/updates.ts` is `pnpm content:updates --check <file>` (`OK <file>: N update lines, M coveredBy` or the problems, exit 1) and `--apply <dir>` (every `*.json` sorted by name; prints the log, then `applied N update lines and M coveredBy mappings`).
- `package.json` script `"content:updates": "node scripts/content/updates.ts"`.
- Tests `tests/unit/updates.test.ts` on the fixture tree, with the fixture blueprint given one made-up missing term for task `1.1`: a valid result passes and applies (the line lands in the right H3, the tag is added once, the registry gains the entry, the term is no longer missing, every rule still passes); a sentence without the term, an unknown anchor, a stale date and a non-AWS URL each fail; `setCoveredBy` keeps the file's comments.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/updates.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `57ef886`**

```bash
git show 57ef886
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/updates.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add content:updates to apply exam guide update lines" -m "Phase 1 Task 12; see the plan for the design."
```

## Task 13: Update lines for every missing blueprint term (agent fan-out)

**Files:**
- Modify: `content/concepts.yaml`, `content/exam/blueprint.yaml`, `resources/01-introduction-to-the-cloud/03-benefits-of-the-aws-cloud.md`, `resources/02-compute-in-the-cloud/05-amazon-ec2-pricing.md`, `resources/03-exploring-compute-services/03-containers-and-orchestration-on-aws.md`, `resources/07-databases/01-introduction-to-databases.md`, `resources/07-databases/05-in-memory-caching-services.md`, `resources/08-ai-ml-and-data-analytics/07-data-pipelines-on-aws.md`, `resources/09-security/02-preventing-unauthorized-access.md`, `resources/09-security/03-protecting-networks-and-applications.md`, `resources/09-security/06-additional-security-resources.md`, `resources/10-monitoring-compliance-and-governance/08-governance.md`, `resources/11-pricing-and-support/02-aws-pricing-concepts.md`, `resources/11-pricing-and-support/03-aws-pricing-and-billing-services.md`, and 6 more (`git show --stat` lists them)

- [ ] **Step 1: Read the design of this task**

- Step: `pnpm content:report --coverage` and note the count; `mkdir -p .results/updates`.
- Step: run the workflow (show the script, Phase 0 Task 15 style; it is tool input, not a repo file): phase `List`, one agent runs `pnpm --silent content:report --coverage --json` in the repo and returns `{ missing: [{ task, term }] }` (schema); the script groups by task; phase `Write`, one `update-writer` agent per task in parallel, each told the repo path, to read `agents/update-writer.md` in full, its task id and terms (inline in the prompt), to read the blueprint task and search `resources/` for the closest notes, to fetch its sources with WebFetch, to write `.results/updates/<task>.json`, loop on `pnpm --silent content:updates --check .results/updates/<task>.json` until a line starting with `OK`, never edit any file outside `.results/updates/`, and return the OK line (schema `{ ok: string }`); the script returns `{ ok, tasks, lines }` and logs any task without an OK line.
- Expected: one OK line per task with missing terms; re-run a failed task's agent with the same prompt.
- Merge step: `pnpm content:updates --apply .results/updates` (expected `applied N update lines and M coveredBy mappings`), then `pnpm content:report --coverage | tail -1` prints `missing terms: 0`, then `pnpm content:validate` prints `content:validate: 10 rules, 0 findings` and `pnpm build` passes (new concepts must have valid homes and anchors).
- Review step: `git diff --stat` and `git diff resources content/exam` printed for the phase report, so Dani reads every new line.

- [ ] **Step 2: Do the work; the result as committed is `cf380bb`**

```bash
git show --stat cf380bb
pnpm check
```

Expected: `pnpm check` exits 0.

- [ ] **Step 3: Commit**

```bash
git commit -m "Add exam guide update lines for the missing blueprint terms" -m "Phase 1 Task 13; see the plan for the design."
```

## Task 14: Pilot questions for Modules 1 and 3 (agent fan-out)

**Files:**
- Create: `content/questions/01-introduction-to-the-cloud/01-welcome-to-aws-cloud-practitioner-essentials.yaml`, `content/questions/01-introduction-to-the-cloud/02-what-is-cloud-computing.yaml`, `content/questions/01-introduction-to-the-cloud/03-benefits-of-the-aws-cloud.yaml`, `content/questions/01-introduction-to-the-cloud/04-introduction-to-aws-global-infrastructure.yaml`, `content/questions/01-introduction-to-the-cloud/05-the-aws-shared-responsibility-model.yaml`, `content/questions/01-introduction-to-the-cloud/06-applying-cloud-concepts-to-real-life-use-cases.yaml`, `content/questions/03-exploring-compute-services/01-introduction-to-serverless-computing.yaml`, `content/questions/03-exploring-compute-services/02-aws-lambda.yaml`, `content/questions/03-exploring-compute-services/03-containers-and-orchestration-on-aws.yaml`, `content/questions/03-exploring-compute-services/04-additional-compute-services.yaml`

- [ ] **Step 1: Read the design of this task**

- Step: list the writer targets: every lesson note of Modules 1 and 3 that homes at least one tested concept (`pnpm --silent content:report --homed <noteId>` per lesson; expected 9 or 10 notes and about 49 concepts plus any Task 13 added).
- Step: run the workflow (show the script): constants `REPO`, `NOTES` (the noteId and the target file path for each), `MAX_ROUNDS = 3`.
  - Phase `Write`: one `question-writer` agent per note in parallel: read `agents/question-writer.md` and `content/STYLE.md`, run `pnpm --silent content:report --homed <noteId>`, write the target file with 2 drafts per listed concept, loop on `pnpm --silent content:validate --draft <file>` until `0 problems`, write nothing else, return `{ file, questions, problems: 0 }`.
  - Phase `Balance`: one agent per module runs `pnpm --silent content:report`, reads its module's style line, and when the module has fewer than 2 `multi`, no `match`, a correct-longest share above 35% or negatives above 5%, edits that module's draft files to fix it (each file still passing `--draft`), returning the final style line.
  - Loop `round` from 1 to `MAX_ROUNDS`: phase `Prepare`, one agent runs `pnpm --silent content:checks prepare --modules 01,03 --seed <round>` and returns `{ batches: string[] }` (the paths it printed); if empty, stop; phase `Check`, one fresh agent per batch in parallel, its prompt naming the prompt file by the batch kind (`critic-cue` and `critic` both read `agents/critic.md` and do the round their kind names), telling it to read only that batch file, never `keys.json`, question files or notes, to write `.results/checks/answers/<batch>.json`, and to loop on `pnpm --silent content:checks lint <file>` until OK; phase `Stamp`, one agent runs `pnpm --silent content:checks grade` then `pnpm --silent content:stamp` and returns `{ live, revise: string[] (files with drafts to revise), needsDani }`; if `revise` is empty, stop; phase `Revise`, one `question-writer` agent per file in parallel, revising only drafts with `review.attempts < 3`, keeping ids, looping on `--draft` until `0 problems`.
  - Return `{ rounds, live, needsDani }`.
- Expected: about 100 questions, at least 90% live after the rounds, and the rest listed by `pnpm content:report --needs-dani`.
- Verify: `pnpm content:validate` prints `content:validate: 10 rules, 0 findings`; `pnpm content:report` shows the style lines for `m01` and `m03` within the limits; `pnpm content:report --needs-dani` output goes into the phase report.

- [ ] **Step 2: Do the work; the result as committed is `edbbbcf`**

```bash
git show --stat edbbbcf
pnpm check
```

Expected: `pnpm check` exits 0.

- [ ] **Step 3: Commit**

```bash
git commit -m "Add the pilot questions for Modules 1 and 3" -m "Phase 1 Task 14; see the plan for the design."
```

---

## Task 15: The engine boundary, seeded randomness and the study day

**Files:**
- Create: `src/engine/day.ts`, `src/engine/rng.ts`, `tests/unit/day.test.ts`, `tests/unit/rng.test.ts`
- Modify: `biome.json`
- Test: `tests/unit/day.test.ts`, `tests/unit/rng.test.ts`

- [ ] **Step 1: Read the design of this task**

- `src/engine/rng.ts`: `mulberry32(seed: number): () => number` (values in `[0, 1)`), `fnv1a(text: string): number` (32-bit FNV-1a over UTF-16 code units, unsigned), `shuffle<T>(items: readonly T[], random: () => number): T[]` (Fisher-Yates on a copy), `seedFor(sessionSeed: number, qid: string): number` (`(sessionSeed ^ fnv1a(qid)) >>> 0`); the app draws session seeds with `crypto.getRandomValues` outside the engine (Task 20).
- `src/engine/day.ts`: `DAY_START_HOUR = 4`; `studyDay(at: Date): string`: copy the date, `setDate(getDate() - 1)` when `getHours() < 4`, format local `YYYY-MM-DD`; `tzOffset(at: Date): number` is `-at.getTimezoneOffset()`.
- `biome.json` gains an `overrides` entry for `src/engine/**` with `style.noRestrictedImports` (`paths` for `preact`, `preact/hooks`, `@preact/signals`; `patterns` `[{ group: ['**/app/**', '**/ui/**', '**/store/**'], message: 'src/engine is pure: it may not import UI, store or DOM code (spec 1.1)' }]`) and `style.noRestrictedGlobals` (`deniedGlobals` for `window`, `document`, `navigator`, `location`, `indexedDB`, `localStorage`, `sessionStorage`, `fetch`, each with the same message); the option shapes match `node_modules/@biomejs/biome/configuration_schema.json` (`paths` and `deniedGlobals` are objects, `patterns` an array of `{ group, message }`).
- Proof step: write `src/engine/canary.ts` importing `preact` and reading `document.title`, run `pnpm lint` and see both rules fire, delete it, run `pnpm lint` clean.
- Tests `tests/unit/rng.test.ts` (`fnv1a('')` is `0x811c9dc5`, `fnv1a('a')` is `0xe40c292c`; `mulberry32(42)` gives the same 5 values twice and all in range; `shuffle` returns a permutation, is stable for one seed and leaves its input alone) and `tests/unit/day.test.ts` (`new Date(2026, 9, 10, 3, 59)` is `2026-10-09`; `04:00` is `2026-10-10`; `new Date(2026, 10, 1, 2, 0)` is `2026-10-31`).

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/day.test.ts tests/unit/rng.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `746321d`**

```bash
git show 746321d
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/day.test.ts tests/unit/rng.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the engine boundary, seeded randomness and the study day" -m "Phase 1 Task 15; see the plan for the design."
```

## Task 16: Event schemas and the IndexedDB store

**Files:**
- Create: `schemas/backup.ts`, `schemas/events.ts`, `schemas/version.ts`, `src/store/events.ts`, `src/store/idb.ts`, `src/store/kv.ts`, `src/store/migrations/index.ts`, `src/store/ulid.ts`, `tests/unit/events-schema.test.ts`, `tests/unit/migrations.test.ts`, `tests/unit/ulid.test.ts`
- Test: `tests/unit/events-schema.test.ts`, `tests/unit/migrations.test.ts`, `tests/unit/ulid.test.ts`

- [ ] **Step 1: Read the design of this task**

- `schemas/events.ts` in `zod/mini` (`import * as z from 'zod/mini'`): `SCHEMA_VERSION = 1`; `MODES = ['check','quiz','focus','review','lightning','incident','boss','mock'] as const`, `Mode`; `Ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/`; base fields `id`, `at` (ISO date-time with `Z`), `tz` (integer), `day` (`YYYY-MM-DD`); `StudyEvent` is a discriminated union on `t` with every variant of spec 8.1, exactly as written there, except that `session` gains `scope?: string` and `incident.offered`/`incident.done` are two variants; `picked` is `string[]` or `[string, string][]` (match pairs as `[leftId, rightId]`, ids `l1`..`l5` and `r1`..`r5` by authored pair order); type `StudyEvent`, and `NewEvent` (a `StudyEvent` without `id`, `at`, `tz` and `day`, written with a distributive `Omit`).
- `schemas/backup.ts` in `zod/mini`: `BACKUP_FORMAT = 'ccp-study-backup'`; `KvRecord = { key, value: unknown, updatedAt }`; `Backup = { format: literal, schemaVersion: int >= 1, appVersion: string, contentVersion: string, exportedAt: string, events: array(StudyEvent), kv: record(string, { value: unknown, updatedAt: string }) }`.
- `src/store/ulid.ts`: `ulid(now = Date.now(), random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string`, Crockford base32, 10 time characters and 16 random ones, monotonic within one millisecond (the random part increments).
- `src/store/idb.ts`: `DB_NAME = 'ccp-study'`; `openDb(name = DB_NAME): Promise<IDBDatabase>` at version `SCHEMA_VERSION`, creating `events` (keyPath `id`), `kv` (keyPath `key`) and `cache` (keyPath `key`) in `onupgradeneeded`; `request<T>(r: IDBRequest<T>): Promise<T>`; `done(tx: IDBTransaction): Promise<void>` (resolves on `complete`, rejects on `error` and `abort`).
- `src/store/events.ts`: `appendEvent(db, e)`, `putEvents(db, events)`, `allEvents(db)` (sorted by id), `clearEvents(db)`.
- `src/store/kv.ts`: `KV_KEYS = { lastExportAt: 'lastExportAt' }`; `getKv(db, key)`, `setKv(db, key, value, now: Date)` (stamps `updatedAt`), `allKv(db): Promise<Record<string, { value; updatedAt }>>`, `putKv(db, records)`, `clearKv(db)`.
- `src/store/migrations/index.ts`: `export type Migration = (data: Record<string, unknown>) => Record<string, unknown>`; `MIGRATIONS: readonly Migration[] = []` (index i migrates schema i+1 to i+2); `migrate(data)`: reads `schemaVersion`, throws `This backup is from a newer version of the app (schema N); update the app first` above `SCHEMA_VERSION`, else applies the steps in order and sets `schemaVersion`.
- Tests: `tests/unit/ulid.test.ts` (26 characters of the alphabet, time order sorts lexically, 1,000 ids in one millisecond are strictly increasing), `tests/unit/events-schema.test.ts` (one valid event of each variant parses; a missing `day`, a lowercase ULID, an unknown `t` fail), `tests/unit/migrations.test.ts` (version 1 passes through; version 2 throws the message).
  IndexedDB code has no unit test (Node has no IndexedDB); the e2e tests of Task 24 cover it.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/events-schema.test.ts tests/unit/migrations.test.ts tests/unit/ulid.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `88f5036`**

```bash
git show 88f5036
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/events-schema.test.ts tests/unit/migrations.test.ts tests/unit/ulid.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the event schemas and the IndexedDB store" -m "Phase 1 Task 16; see the plan for the design."
```

## Task 17: Replay and question selection

**Files:**
- Create: `src/engine/replay.ts`, `src/engine/select.ts`, `tests/fixtures/events.ts`, `tests/property/arbitraries.ts`, `tests/property/replay.property.test.ts`, `tests/unit/replay.test.ts`, `tests/unit/select.test.ts`
- Modify: `vitest.config.ts`
- Test: `tests/property/replay.property.test.ts`, `tests/unit/replay.test.ts`, `tests/unit/select.test.ts`

- [ ] **Step 1: Read the design of this task**

- `src/engine/replay.ts`:
  - `ENGINE_VERSION = 1`.
  - `ContentRefs { questions: ReadonlyMap<string, number>; notes: ReadonlySet<string> }` (live question id to version, and lesson note ids).
  - `AnswerRecord { qid; qv; sid; mode: Mode; at; day; correct: boolean; sure: boolean; picked: StudyEvent picked type }`.
  - `SessionState { sid; mode: Mode; scope: string; seed: number; qids: readonly string[]; answers: ReadonlyMap<string, AnswerRecord>; startedAt: string; submittedAt: string | null; abandoned: boolean }`.
  - `Progress { eventCount: number; lessonsDone: ReadonlyMap<string, string>; answers: ReadonlyMap<string, readonly AnswerRecord[]>; lastShown: ReadonlyMap<string, string>; sessions: ReadonlyMap<string, SessionState>; checkScores: ReadonlyMap<string, { correct: number; total: number; at: string }>; flags: number; unknownEvents: number }`.
  - `derive(events: readonly StudyEvent[], refs: ContentRefs | null): Progress`: sorts a copy by `id`; `answer` appends to `answers` and to its session (first answer per qid per session only), sets `lastShown` for its concept; `session start` creates the state, `submit` sets `submittedAt` and, for mode `check`, `checkScores[scope]` (correct first answers over `qids.length`), `abandon` sets `abandoned`; `lesson.done` keeps the first `at` per note; `flag` counts; with refs, an answer whose qid is not in `refs.questions`, or a `lesson.done` whose note is not in `refs.notes`, counts in `unknownEvents` and is still kept; never throws on unknown ids.
  - `snapshotOf(p: Progress): unknown`: plain JSON with maps as sorted entry arrays, for golden files.
  - `openSession(p: Progress, mode: Mode, scope: string): SessionState | null`: the newest session of that mode and scope with no submit and no abandon.
- `src/engine/select.ts`:
  - `PoolQuestion { id: string; concept: string; note: string }`.
  - `selectCheck({ concepts, pool, progress, seed }): string[]`: for each concept in the given order (tested concepts homed in the note, in anchor order), its pool variants, minus `progress.lastShown.get(concept)` when another variant exists, ranked never-answered first, then by oldest last answer, ties broken by `shuffle(..., mulberry32(seed))` order; one id per concept with any variant.
  - `selectQuiz({ pool, progress, seed, size = QUIZ_SIZE }): string[]` with `QUIZ_SIZE = 12`: rank 0 never answered, rank 1 last answer wrong, rank 2 the rest; within a rank oldest last answer first, ties by the seeded shuffle; a first pass takes at most one per concept, a second pass fills up to `size`.
- Tests `tests/unit/replay.test.ts` (a check session of 3 with 2 correct gives `checkScores` 2/3; a second answer to the same qid in one session is ignored for the score; `openSession` finds the unfinished quiz and ignores a submitted one; an unknown qid counts once and does not throw), `tests/unit/select.test.ts` (one per concept in order; never repeats the last shown variant when another exists; unseen before seen; quiz caps at 12, spreads concepts first, puts last-wrong before last-right; the same seed gives the same list), and `tests/property/replay.property.test.ts` (fast-check: `derive` is the same for any permutation of the events; arbitrary unknown ids never throw).
- `vitest.config.ts` includes `tests/property/**/*.test.ts`.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/property/replay.property.test.ts tests/unit/replay.test.ts tests/unit/select.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `b76ee1f`**

```bash
git show b76ee1f
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/property/replay.property.test.ts tests/unit/replay.test.ts tests/unit/select.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the replay and question selection" -m "Phase 1 Task 17; see the plan for the design."
```

## Task 18: Backup export, import and merge

**Files:**
- Create: `src/env.d.ts`, `src/store/backup.ts`, `tests/fixtures/backups/v1.json`, `tests/fixtures/backups/v1.snapshot.json`, `tests/property/backup.property.test.ts`, `tests/unit/backup.test.ts`, `tests/unit/backups.test.ts`
- Modify: `biome.json`, `schemas/backup.ts`, `schemas/version.ts`, `vite.config.ts`, `vitest.config.ts`
- Test: `tests/property/backup.property.test.ts`, `tests/unit/backup.test.ts`, `tests/unit/backups.test.ts`

- [ ] **Step 1: Read the design of this task**

- `src/store/backup.ts`:
  - `BackupData` is the `Backup` type with events typed `StudyEvent[]`.
  - `makeBackup(events, kv, meta: { appVersion: string; contentVersion: string; now: Date }): BackupData` (`schemaVersion: SCHEMA_VERSION`).
  - `backupFileName(now: Date): string` is `ccp-study-backup-YYYY-MM-DD.json` by local date.
  - `mergeEvents(a, b): StudyEvent[]`: union by id, sorted by id, keeping `a`'s event on a clash.
  - `mergeKv(a, b)`: per key the record with the newer `updatedAt`, `a` on a tie.
  - `ImportPreview { events: number; from: string | null; to: string | null; local: number; added: number }` and `previewOf(backup, local: readonly StudyEvent[]): ImportPreview`; `previewLine(p): string` like `1,240 events from Sep 2 to Oct 9; this browser has 310` (`toLocaleString('en-US')` counts, `en-US` short month and day from `at`; `No events in this backup; this browser has 310` when empty).
  - `parseBackup(text: string): Promise<{ ok: true; data: BackupData } | { ok: false; error: string }>`: `JSON.parse` (error `This file is not JSON`), format check (`This file is not a CCP Study backup`), `migrate`, then `await import('../../schemas/backup.ts')` and `safeParse` (error `This backup does not match this app: <first issue>`).
  - `APP_VERSION` comes from Vite's `define` (`__APP_VERSION__`, the `package.json` version), declared in `src/env.d.ts`, with `vitest.config.ts` defining it too.
- Fixtures: `tests/fixtures/backups/v1.json` (hand-written: a lesson check session on `m01/what-a-bakery-cloud-is` with start, two answers and submit, one `lesson.done`, one `flag`, `kv.lastExportAt`) and `tests/fixtures/backups/v1.snapshot.json` (`snapshotOf(derive(events, null))`, written once by the test helper when missing and then committed).
- Tests: `tests/unit/backup.test.ts` (file name; preview line wording and the comma; `mergeKv` newer wins; `parseBackup` rejects non-JSON, a foreign format and schema 2), `tests/unit/backups.test.ts` (every `tests/fixtures/backups/v*.json` parses, migrates and derives to its `.snapshot.json`), `tests/property/backup.property.test.ts` (`mergeEvents` is idempotent, commutative on sets with unique ids, and associative; `derive(parseBackup(JSON.stringify(makeBackup(s))))` equals `derive(s)`).

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/property/backup.property.test.ts tests/unit/backup.test.ts tests/unit/backups.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `e09e85e`**

```bash
git show e09e85e
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/property/backup.property.test.ts tests/unit/backup.test.ts tests/unit/backups.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add backup export, import and merge" -m "Phase 1 Task 18; see the plan for the design."
```

## Task 19: Questions in the content chunks

**Files:**
- Create: `schemas/question.ts`, `scripts/content/lib/evidence.ts`, `tests/fixtures/content-root/content/questions/01-baking-basics/01-what-a-bakery-cloud-is.yaml`
- Modify: `schemas/chunks.ts`, `scripts/content/build.ts`, `scripts/content/lib/context.ts`, `tests/unit/build-real.test.ts`, `tests/unit/build.test.ts`
- Test: `tests/unit/build-real.test.ts`, `tests/unit/build.test.ts`

- [ ] **Step 1: Read the design of this task**

- `schemas/chunks.ts`: `OptionView { id: string; text: string; correct: boolean; why: string }`, `PairView { left: string; right: string; why: string }`, `QuestionView { id; version; type: 'single' | 'multi' | 'match'; concept; note; task; level: 1 | 2 | 3; stem; select: 2 | 3 | null; options: OptionView[]; pairs: PairView[]; takeaway; read: { route: string; text: string } }`; `ModuleChunk` gains `questions: QuestionView[]`; `ContentIndex` gains `questionVersions: Record<string, number>` (every live practice id to its version, for replay's unknown-id count).
- `scripts/content/build.ts`: each module chunk carries the live practice questions whose `noteId` is in that module, sorted by note order then id; a multi's stem gets the suffix ` (Select TWO.)` or ` (Select THREE.)`; `read.route` is `routeOf(note)` plus `/` and the slug of `sectionAt(note, line of the first evidence line)`, and `read.text` is that evidence line's form; drafts and retired items never ship.
- Tests: `tests/unit/build.test.ts` gains: the fixture's live single ships in `m01` with `read.route` `#/m/01/l/what-a-bakery-cloud-is/shared-kitchen`; the draft match does not ship until it is live; a multi gets its suffix; `questionVersions` lists the live id.
  `tests/unit/build-real.test.ts` keeps the 120 KB chunk budget, now with questions.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/build-real.test.ts tests/unit/build.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `d6662f3`**

```bash
git show d6662f3
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/build-real.test.ts tests/unit/build.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Ship live questions in the module chunks" -m "Phase 1 Task 19; see the plan for the design."
```

---

## Task 20: Routes, the progress store and recording events

**Files:**
- Create: `schemas/backup.ts`, `schemas/events.ts`, `src/app/progress.ts`, `src/engine/day.ts`, `src/engine/replay.ts`, `src/engine/rng.ts`, `src/engine/select.ts`, `src/env.d.ts`, `src/store/backup.ts`, `src/store/events.ts`, `src/store/idb.ts`, `src/store/kv.ts`, `src/store/migrations/index.ts`, `src/store/ulid.ts`
- Modify: `schemas/chunks.ts`, `scripts/content/build.ts`, `src/app/App.tsx`, `src/app/keyboard.ts`, `src/app/keys.ts`, `src/app/nav.ts`, `src/app/router.ts`, `src/app/screens/Help.tsx`, `src/app/state.ts`, `src/ui/base.css`, `tests/unit/keys.test.ts`, `tests/unit/nav.test.ts`, `tests/unit/router.test.ts`, `vite.config.ts`, and 1 more (`git show --stat` lists them)
- Test: `tests/unit/keys.test.ts`, `tests/unit/nav.test.ts`, `tests/unit/router.test.ts`

- [ ] **Step 1: Read the design of this task**

- `src/app/router.ts`: `Route` gains `{ kind: 'check'; module: number; slug: string }` (`#/s/check/m03/aws-lambda`) and `{ kind: 'quiz'; module: number }` (`#/s/quiz/m03`); `parseHash` and `toHash` handle both; `src/app/nav.ts` `up`: check to its lesson, quiz to its module; `src/app/state.ts` `Overlay` gains `'progress'`, and a `highlight` signal (`string | null`) for "Read in notes".
- `src/app/progress.ts`:
  - signals `events` (`readonly StudyEvent[]`), `kvRecords`, `storeReady` (boolean), `saveError` (`string | null`), and `progress = computed(() => derive(events.value, refs.value))`, where `refs` is computed from `index.value?.questionVersions` and the lesson notes of the index.
  - `initStore(): Promise<void>`: opens the db, loads events and kv; on failure sets `saveError` to `Progress can't be saved in this browser` and keeps an in-memory log.
  - `record(e: NewEvent, now = new Date()): Promise<StudyEvent>`: stamps `id` (`ulid`), `at`, `tz`, `day` (`studyDay`), adds it to `events` at once, then appends it; on the first `answer` ever it calls `navigator.storage?.persist?.()`; a failed write sets `saveError` and keeps the event in memory.
  - `newSessionSeed(): number` from `crypto.getRandomValues(new Uint32Array(1))`.
  - `replaceAll(backup)`, `mergeIn(backup)`: write through the store and reload the signals.
- `App.tsx` calls `initStore()` once next to `loadIndex()`, renders a `role="alert"` banner under the top bar while `saveError` is set (`Progress can't be saved in this browser` and an Export button that opens Progress), and adds a top-bar button `Progress` that opens the overlay.
- `src/app/keys.ts`: `g` then `p` opens Progress (`{ kind: 'progress' }`), `c` on a lesson route navigates to its check route; Help lists `g p Progress`, `c Check yourself`, and the runner keys of Task 21.
- Tests: `tests/unit/router.test.ts` (round trip of both new routes; `#/s/check/m14/x` is not found), `tests/unit/nav.test.ts` (`up` of both), `tests/unit/keys.test.ts` (`g p` and `c`).

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/keys.test.ts tests/unit/nav.test.ts tests/unit/router.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `e5064c6`**

```bash
git show e5064c6
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/keys.test.ts tests/unit/nav.test.ts tests/unit/router.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add practice routes and the progress store" -m "Phase 1 Task 20; see the plan for the design."
```

## Task 21: The runner

**Files:**
- Create: `schemas/schema-version.ts`, `src/app/runner-keys.ts`, `src/app/runner.ts`, `src/app/screens/Runner.tsx`, `tests/unit/runner-keys.test.ts`, `tests/unit/runner.test.ts`
- Modify: `schemas/events.ts`, `src/app/screens/Screen.tsx`, `src/store/backup.ts`, `src/store/idb.ts`, `src/store/migrations/index.ts`, `src/ui/base.css`
- Test: `tests/unit/runner-keys.test.ts`, `tests/unit/runner.test.ts`

- [ ] **Step 1: Read the design of this task**

- `src/app/runner.ts` (pure):
  - `Picked = string[] | [string, string][]`.
  - `displayOrder(q: QuestionView, seed: number): string[]`: option ids, or `r1`..`rN` for a match's rights, shuffled with `mulberry32(seedFor(seed, q.id))`; a match's lefts keep their authored order.
  - `canSubmit(q, picked)`: single 1 pick, multi exactly `select`, match every left paired.
  - `isCorrect(q, picked)`: the picked set equals the correct set; match, every `lN` paired with `rN`.
  - `endLine(correct, total)` is `9/12 correct`.
  - `modeLabel(mode)`: `Lesson check` or `Module quiz`.
- `src/app/runner-keys.ts` (pure): `RunnerCommand` (`choose n`, `pick-left n`, `pair letter`, `unpair`, `check`, `sure`, `next`, `expand`, `read`, `report`) and `runnerKey(input: KeyInput & { shift: boolean }, state: { type: 'single' | 'multi' | 'match'; answered: boolean; optionCount: number; leftCount: number; reportOpen: boolean }): RunnerCommand | null` per spec 7.4 (digits `1` to `6` choose or toggle; match `1` to `5` pick a left, `a` to `e` pair, `Backspace` unpair; `Enter` check before feedback and next after it; `Shift+Enter` sure; `e`, `o` and `!` after feedback only, `!` also before; nothing while typing or while the report panel is open).
- `src/app/screens/Runner.tsx` for both modes (`{ idx, mode, scope }`): loads the module chunk; resumes `openSession(progress, mode, scope)` with its `qids` minus any no longer shipped, else selects (`selectCheck` with the tested concepts homed in the note in anchor order, or `selectQuiz` over the module's questions), writes `session start { sid: ulid(), mode, scope, seed, qids }` and starts; an empty selection shows `No practice questions for this lesson yet.` or `No practice questions for this module yet.`; the first unanswered qid shows next.
  - Layout: breadcrumbs (Home, module, lesson for a check), an H1 `Lesson check: <lesson title>` or `Module quiz: <module short title>`, a muted line `2 of 5`, the stem in `<p id="stem" tabIndex={-1}>` focused on each new question, then a `<fieldset aria-labelledby="stem">` of native radio inputs (single) or checkboxes (multi) inside full-width labels at least 44 px tall, each prefixed with its number; match renders each left with its number and a native `<select>` of the lettered rights, with the keyboard shortcuts on top.
  - Submit bar (sticky at the bottom on narrow screens): `Check` (`Enter`) and `Sure` (`Shift+Enter`) buttons, disabled until `canSubmit`, and the hint `Press Sure when you are more than 71% sure.`.
  - On submit: write `answer { sid, mode, qid, qv, concept, picked, correct, sure, ms }`; show the verdict with an icon and a word (`Correct` in `--ok`, `Incorrect` in `--bad`), each option marked `Your answer` and `Correct answer` in text, the chosen and correct options' whys in open `<details>` and the others closed (`e` opens all), the takeaway, a `Read in notes` link (`o`) that sets `highlight` to `read.text` and goes to `read.route`, and a `Next` button (`Enter`) that receives focus; an `aria-live="polite"` region announces `Correct.` or `Incorrect.`.
  - After the last question: write `session submit`; for a check also `lesson.done` for the note when not yet done; show the end line in an `aria-live` region, and links `Back to the lesson` and `Next lesson` (check) or `Back to Module N` and `Another quiz` (quiz).
  - The report panel (`!` or a `Report a problem` button): inline under the question, never a modal; radios for `Wrong answer key`, `Ambiguous`, `Outdated`, `Typo`, `Other` (`wrong-key`, `ambiguous`, `outdated`, `typo`, `other`), an optional note, the raw question id (the one place it shows, spec 2.8), `Send` writes `flag { qid, qv, reason, note? }` and shows `Reported. It travels with your next backup.`.
- `Screen.tsx` routes `check` and `quiz` to `Runner`; `src/ui/base.css` gains the runner styles (options, verdict, submit bar, report panel) with tokens only, no new colours.
- Tests `tests/unit/runner.test.ts` (canSubmit and isCorrect per type, display order stable per seed and different per question) and `tests/unit/runner-keys.test.ts` (each key per state; Enter is check before feedback and next after; letters only in match).
- Verify by hand with `pnpm dev`: a Module 3 lesson check end to end on desktop and at 375 px.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/runner-keys.test.ts tests/unit/runner.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `2e834d8`**

```bash
git show 2e834d8
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/runner-keys.test.ts tests/unit/runner.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the question runner" -m "Phase 1 Task 21; see the plan for the design."
```

## Task 22: Lesson checks, the module quiz and "Read in notes"

**Files:**
- Modify: `src/app/runner.ts`, `src/app/screens/Home.tsx`, `src/app/screens/LessonPage.tsx`, `src/app/screens/ModulePage.tsx`, `src/app/screens/Runner.tsx`, `src/ui/base.css`, `tests/unit/runner.test.ts`
- Test: `tests/unit/runner.test.ts`

- [ ] **Step 1: Read the design of this task**

- `LessonPage`: after the note, a `section.check` with an H2 `Check yourself`: when N tested concepts homed in this note have live questions, a link `Check yourself (N)` to the check route and, after a submitted check, `Last check 4/5`; when N is 0, the muted line `No questions for this lesson yet.` and an end sentinel (an `IntersectionObserver` on an empty element after the note) that records `lesson.done` once when it scrolls into view (spec 3.2 lesson completion); a highlight effect: when `highlight` is set and the lesson is rendered, find the first `p`, `li`, `td` or `.update-text` under the note whose whitespace-collapsed `textContent` equals it, add class `evidence`, scroll it into view, and clear `highlight`.
- `ModulePage`: lesson rows gain `Read` (with a check-mark icon and the word) once done and `Check 4/5` after a submitted check; a `## Practice` section: `Start a module quiz` link to `#/s/quiz/mNN` once any lesson of the module is done and the chunk has live questions, else the muted line `Opens after you finish one lesson of this module.` or `No practice questions for this module yet.`.
- `Home`: the first-run line `Progress lives in this browser.` with a button `Import a backup` that opens Progress, shown while there are no events.
- `base.css`: `.evidence` (left border 3px `--active`, `--surface` background), `.check` section spacing.
- Tests: `tests/unit/keys.test.ts` already covers `c`; the screens are covered by Task 24.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/runner.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `8b40b5a`**

```bash
git show 8b40b5a
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/runner.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add lesson checks, the module quiz and Read in notes" -m "Phase 1 Task 22; see the plan for the design."
```

## Task 23: The Progress overlay: backup, diagnostics and the backup reminder

**Files:**
- Create: `src/app/screens/Progress.tsx`, `tests/unit/backup.test.ts`
- Modify: `src/app/App.tsx`, `src/app/screens/Home.tsx`, `src/ui/base.css`
- Test: `tests/unit/backup.test.ts`

- [ ] **Step 1: Read the design of this task**

- `src/app/screens/Progress.tsx`: `<dialog class="sheet">` opened with `showModal()`, `aria-labelledby` its H2 `Progress`, backdrop close via `closeOnBackdrop`, a Close button in `<form method="dialog">`.
  - A summary line `N answers, M lessons read` (counts from `progress`).
  - `Backup` section: `Export a backup` button that builds `makeBackup` with `allKv`, saves it through an `<a download>` with an object URL (revoked after the click), and sets `kv.lastExportAt`; the line `Last backup Oct 9` or `No backup yet`; an `Import a backup` file input (`accept="application/json,.json"`) whose file goes through `parseBackup`; an error shows in `role="alert"`; a valid file shows the inline preview panel: `previewLine`, then `Merge` (the default, focused), `Replace` and `Cancel`; `Replace` asks once more inline (`Replace all progress in this browser`) before it runs; a done import shows `Imported. 930 new events.` or `Replaced. This browser now has 1,240 events.`.
  - `Diagnostics`: `12 events refer to newer content` when `unknownEvents` is above 0.
  - `Versions`: `Content c-3f9a1e · Engine 1 · Storage 1 · App 0.2.0`.
- `Home` gains the backup reminder line (spec 8.3): when there are at least 50 events newer than `lastExportAt` (or than the first event, with no export yet) and the last export is more than 7 days old or missing, `Last backup 9 days ago.` or `No backup yet.` with an `Export a backup` button that opens Progress; at most one reminder line shows (spec 4.6), and the first-run line counts as none.
- `App.tsx` renders `Progress` when `overlay` is `'progress'`.
- Tests: `tests/unit/backup.test.ts` gains `reminderDue(events, lastExportAt, now): boolean` (exported from `src/store/backup.ts`) cases: 49 new events no, 50 new events and 8 days yes, 50 new events and 6 days no.

- [ ] **Step 2: Write the failing tests named above, run them and see them fail**

```bash
pnpm test tests/unit/backup.test.ts
```

Expected: FAIL, because the code under test does not exist yet.

- [ ] **Step 3: Implement the task; the complete code as built is commit `63b0f45`**

```bash
git show 63b0f45
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/backup.test.ts
pnpm check
```

Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git commit -m "Add the Progress overlay with export and import" -m "Phase 1 Task 23; see the plan for the design."
```

## Task 24: Practice end-to-end and accessibility tests

**Files:**
- Create: `tests/e2e/helpers.ts`, `tests/e2e/practice.spec.ts`
- Modify: `src/app/screens/Runner.tsx`, `src/store/idb.ts`, `tests/e2e/reader.spec.ts`

- [ ] **Step 1: Read the design of this task**

- `tests/e2e/practice.spec.ts` (same console-error `afterEach` and `expectNoAxeViolations` helper as `reader.spec.ts`; move both helpers to `tests/e2e/helpers.ts` and import them in both files):
  - A helper `chunkFor(page, module)` reads the `ccp-content` meta, fetches the index and the module chunk inside the page, and returns its `questions`, so a test can answer correctly by `data-qid` (the runner sets `data-qid` on the question element).
  - Lesson check: open `#/m/03/l/aws-lambda`, click `Check yourself`, answer the first question right with `Shift+Enter`, see `Correct`, both whys open, press `Enter`, answer the rest by clicking, see the end line `N/N correct`; reload `#/m/03` and see `Read` and `Check N/N` on the row.
  - A wrong answer shows `Incorrect` and marks the correct option in text.
  - Resume: start the Module 3 quiz, answer 2, reload, and see `3 of 12`.
  - Keyboard only: run every Module 3 lesson check twice with keys only (digits, letters, `Enter`), which shows every Module 3 question because unseen variants come first, and assert that single, multi and match questions all appeared.
  - Read in notes: after feedback, `o` lands on the lesson with one `.evidence` element whose text equals `read.text`.
  - Report: `!`, choose Typo, Send, see the confirmation.
  - Backup: answer one check, open Progress with `g` `p`, export (`page.waitForEvent('download')`), read the file and assert `format`, the event count and a `flag` event; delete the database (`indexedDB.deleteDatabase('ccp-study')` then reload), see the first-run line, import the file, see the preview line, press Merge, and see the same `Read` and `Check` marks and the same `N answers` line as before; importing the same file again adds 0 events.
  - Axe with zero violations on: the lesson with `Check yourself`, the runner before and after feedback (single and match), the end line, the module page with Practice, Progress with the import preview open.
  - At 375 px (the `webkit-mobile` project): no sideways scroll on the runner, and the submit bar stays in view.
- Run `pnpm build && pnpm e2e`; fix the app, never loosen a test.

- [ ] **Step 2: Do the work; the result as committed is `455d878`**

```bash
git show --stat 455d878
pnpm check
```

Expected: `pnpm check` exits 0.

- [ ] **Step 3: Commit**

```bash
git commit -m "Add end-to-end tests for practice and backups" -m "Phase 1 Task 24; see the plan for the design."
```

## Task 25: README, version and the Phase 1 gate

**Files:**
- Modify: `README.md`, `package.json`

- [ ] **Step 1: Read the design of this task**

- `package.json` version `0.2.0`.
- `README.md`: the Commands table gains `pnpm content:new-question`, `pnpm content:checks`, `pnpm content:stamp`, `pnpm content:report` and `pnpm content:updates`; a section "Questions" (where they live, draft to live through the checks and the stamp, `--draft` and `--demote`); a section "Progress and backups" (progress lives in this browser's IndexedDB; export from Progress, `g p`; import merges by event id).
- `pnpm verify` passes.
- Exit criteria (spec 10.1, Phase 1): `pnpm content:validate` prints `content:validate: 10 rules, 0 findings`; every live pilot question passes R3, R4, R5 and R9 (the same run); `pnpm content:report --coverage | tail -1` prints `missing terms: 0`; Dani deploys with `pnpm site:deploy` and practises Modules 1 and 3 on his phone with saved progress.

- [ ] **Step 2: Do the work; the result as committed is `beb366d`**

```bash
git show --stat beb366d
pnpm check
```

Expected: `pnpm check` exits 0.

- [ ] **Step 3: Commit**

```bash
git commit -m "Add the Phase 1 commands to the README" -m "Phase 1 Task 25; see the plan for the design."
```

---

## Self-review

This plan was assembled after the build from the phase brief, so each task's design is the brief's and its complete code is the commit named in its steps.

### Spec coverage

| Spec 10.1, Phase 1 | Tasks |
|---|---|
| Question schema | 1 and 2 |
| Check pipeline | 8, 9 and 11 |
| R7 stem check | 6 and 7 |
| `content:stamp` piloted on Modules 1 and 3 | 9 and 14 |
| The pilot, 2 questions per tested concept homed in Modules 1 and 3 | 14 |
| Runner with single, multi and match | 21 |
| Lesson checks | 17 (selection) and 22 |
| Module quiz | 17 (selection) and 22 |
| Event log | 15, 16, 17 and 20 |
| Export and import | 18 and 23 |
| `content:report --coverage` | 10 |
| Update lines for every missing blueprint term | 12 and 13 |
| Rules R3, R4, R5 and R9 | 3, 4 and 5, switched on in 7 |
| Usable outcome: practise Modules 1 and 3 with saved progress | 20 to 24, and the gate in 25 |
| Exit: every live pilot question passes R3, R4, R5 and R9 | 25 |

| Other spec sections Phase 1 implements | Tasks |
|---|---|
| 2.5 fingerprints and the stem check | 6 and 7 |
| 2.6 evidence lines | 4 and 22 |
| 2.7 generation and checks | 8, 9, 11 and 14 |
| 2.8 runner, "Read in notes" and reporting a problem | 21 and 22 |
| 4.1 lesson check and quiz selection | 17 |
| 7.4 runner keys | 20 and 21 |
| 7.5 touch targets, the sticky submit bar and phone layout | 21 and 24 |
| 8.1 to 8.3 event log, backup and the backup reminder | 16, 18 and 23 |

### Deliberate deviations

- Modulus-sized sets and the one-set-per-shingle rule replace Phase 0's truncated bits and a second per-item set (Task 6).
- `schemas/question.ts` checks shape only, with no `superRefine`; answer counts are R3, explanations R4 and the stamp R9 (Tasks 1, 3 and 5).
- Session events carry a `scope`, which spec 8.1 has no field for (Task 16).
- The event union is named `StudyEvent`, because `Event` is the DOM's type (Task 16).
- The module quiz orders by never answered, then last wrong, then least recently answered, as a stand-in for FSRS's lowest R (Task 17).
- The runner records Sure from day one without XP, FSRS or payoff numbers, which arrive in Phase 2 (Task 21).
- The `cache` store exists from schema version 1 but stays unused until Phase 2 (Task 16).
- `pnpm content:checks` is a command the spec's script list does not name, and the critic runs as two fresh agents, a cue round on the options alone and then a full round (Tasks 9 and 11).
- `pnpm content:stamp` promotes a question to `live` together with its `verified` block (Task 9).
- The Progress overlay holds only the backup, diagnostics and versions; levels and badges arrive in Phase 3 (Task 23).
- There is no `#/r/<sid>` results route yet; the end line closes a check or quiz (Task 21).
- "Read in notes" compares a list item by its own text without nested lists, and a table row in its Markdown form `| a | b |`, because an evidence line is one Markdown line (Task 22, after review).
- Next stays disabled until the answer's event is committed, and the submit bar is a direct child of the runner so it sticks on a phone after Check too (Task 21, after review).
- The keyboard e2e test runs as many rounds of lesson checks as the most variants of one concept in one note, since the pilot has 3 questions for one AWS Lambda concept (Task 24, after review).

### Gate status

The Phase 1 gate is open.
All 99 pilot questions are still `draft`, because `pnpm content:checks` and `pnpm content:stamp` have not run on them yet, so the module chunks ship no questions and the practice e2e tests fail.
`pnpm verify`, and with it `pnpm site:deploy`, passes only once the checks pass and the stamp sets the pilot live.

### Names used across tasks

- Schemas: `Qid`, `Question`, `SingleQuestion`, `MultiQuestion`, `MatchQuestion`, `Verified`, `Review`, `History`, `CHECK_NAMES`, `QuestionView`, `StudyEvent`, `NewEvent`.
- Content scripts: `QuestionEntry`, `ctx.questions`, `ctx.headPaths`, `canonicalJson`, `keyHash`, `fullHash`, `correctKey`, `evidenceForm`, `noteLines`, `sectionAt`, `editQuestionFile`, `QuestionEdit`, `stampQuestions`.
- Engine and store: `derive`, `openSession`, `SessionState`, `selectCheck`, `selectQuiz`, `mulberry32`, `seedFor`, `studyDay`, `ulid`, `appendEvent`, `makeBackup`, `parseBackup`, `previewLine`, `reminderDue`.
- App: `events`, `progress`, `storeReady`, `saveError`, `initStore`, `record`, `newSessionSeed`, `replaceAll`, `mergeIn`, `highlight`, `Picked`, `displayOrder`, `canSubmit`, `isCorrect`, `endLine`, `modeLabel`, `RunnerCommand`, `runnerKey`, `findEvidence`.

## Questions for Dani

1. Should pilot questions go live as soon as all three agent checks pass, or wait until you have read them?
   Default (the build uses it): they go live on the stamp; the phase report lists every pilot file for you to skim, and `!` in the runner flags any question you doubt, which travels with your next backup.
2. Is 2 questions per concept the right pilot size for Modules 1 and 3 (about 100 questions)?
   Default: yes, because it matches Phase 2's target, so Modules 1 and 3 are done for Phase 2 too.
