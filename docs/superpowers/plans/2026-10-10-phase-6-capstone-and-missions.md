# Phase 6 Capstone and Missions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the product around the exam: one more live practice question per tested concept so R10 stands at 3, Missions 2 to 8 with the Mission 0 gate, plan fit, a live chip, cleanup and the next-day usage check, the one-time `Already done` action for Missions 0 and 1, the capstone (13 ADRs with live concept citations, self-grade, reference key points, one final grade, drift and a Markdown export), and, last, the accessibility sweep and visual baselines over every screen, built in parallel with Phase 4 without touching its files before it is done with them.

**Architecture:** Everything Phase 6 shows is still derived from the one event log and kv: the existing `mission` and `decision` events carry every step and grade, two new pure engine modules (`src/engine/missions.ts`, `src/engine/capstone.ts`) turn them into mission stages and decision stages, `deriveMemory` starts paying the mission and decision XP that `xp.ts` already defines, and `ENGINE_VERSION` moves to 6 while the storage schema stays at version 1.
Drafts and checklists live in kv (`adr-01` to `adr-13`, `missionTicks`, `plan`), so a reload or a backup round trip keeps them.
Content adds `content/project/brief.yaml` and 13 per-module key point files, checked by R1, R2, R5 to R9 through one shared loader and stamped by a key point critic pipeline of their own, and the build ships them as one lazy project chunk that only the Project screen loads.
The practice fan-out and the key point fan-out run as controller-run Workflow jobs in their own worktrees, and every task that touches a Phase 4 file starts only after the Phase 4 task that last edits it is on `master`.

**Tech Stack:** Node 24.21.0, pnpm 12.8.1, TypeScript 7.0.2, Vite 8.3.2, Preact 10.29.8 with @preact/signals 2.11.3, zod 4.6.5 (classic for content, `zod/mini` for events and backups), ts-fsrs 5.4.2 (imported only by `src/engine/srs.ts`), marked 18.0.14, yaml 2.9.1, Vitest 5.0.3, fast-check 4.10.2, Playwright 1.63.0 with @axe-core/playwright 4.13.0, Biome 2.5.15, IndexedDB, the Cache Storage and Service Worker APIs; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, sections 1.2, 2.3, 2.6 to 2.10, 3.2, 3.5, 3.10, 3.11, 4.6, 5.3, 6, 7.1 to 7.5, 8.1, 8.2, 8.4, 9, 10.1 (Phase 6 row), 10.2 and Appendix B.
**Target:** Merge by Friday, November 6, 2026 and release 0.7.0, after Phase 4's 0.6.0 of Saturday, October 31; go/no-go is Saturday, November 7 and the exam Saturday, November 14, and only fixes merge between them, so anything not on `master` by November 6 waits until after November 14; the accessibility sweep and visual baselines (Tasks 20 and 21) run after the Phase 4 and Phase 5 UI is in, after the exam.

---

## Conventions for every task

- Run every command from the repository root, `/Users/danielchahine/Programs/AWS Cloud Practitioner Essentials` (or your worktree of it under `<scratchpad>/p6/`), where `node --version` must print `v24.21.0`; in a fresh shell start with `eval "$(fnm env)"; fnm use`.
- Never edit or commit in the repository itself; work in your worktree, and only the controller merges into `master`.
- Never write the em dash character (U+2014) anywhere, and keep one sentence per line in every Markdown file outside code blocks and tables (rule R8 checks both).
- Commit messages are plain imperative sentences with a short body; never add a `Co-Authored-By` line (Dani's global instructions forbid agent co-author lines).
- Run `pnpm lint:fix` before each commit so Biome formats the code; the formatter has the last word.
- The pre-commit hook runs `pnpm check`, so a commit fails while any check fails; fix the cause rather than bypassing the hook, and never use `--no-verify`.
- Timing tests can fail by chance while the Phase 4 build loads the machine (the replay-cost case of `tests/property/grind.property.test.ts`, and the real-content cases of Phase 4's tests); when the only failure is such a case and it passes run alone, retry the commit once the load drops, and never skip, loosen or rewrite the Phase 4 test.
- Stage files by path, never with `git add -A` or `git add .`.
- Phase 4 coexistence: a task may edit a file that Phase 4 creates or edits only when the Phase 4 task named in its **Depends on:** line is on `master`; rebase onto `master` right before you start and again before you hand the task back, build on Phase 4's version of the file, and never rewrite a Phase 4 hunk; in `src/ui/base.css` write only under the Phase 6 anchors `/* Missions: flow */` and `/* Capstone */` (Task 20 excepted).
- The machine is shared with the Phase 4 build: run focused tests (`pnpm test <file>`, `pnpm exec playwright test <file>` with your worktree's `E2E_PORT`), run `pnpm build` when a task touches the bundle, and never run `pnpm verify` or the full e2e suite before Task 19.
- Never hand-edit generated files: `content/fingerprints/*` comes only from `pnpm content:fingerprint`, `content/exam/quotas.yaml` and `content/exam/forms.yaml` never change in this phase, the `verified` and `review` blocks of questions only from `pnpm content:stamp`, those of key points only from `node scripts/content/key-points.ts stamp` (the one exception is the key point writer's Fix mode, which sets a live key point that a `content:validate` finding names back to `status: draft` and deletes its `verified` block, as `agents/key-point-writer.md` says, because `stamp` keeps a live key point live and `demote` handles only evidence that left its note), and every `*.snapshot.json` and screenshot baseline only from its test (delete it and rerun the test to regenerate it).
- Course text stays outside the repo in `~/Library/Application Support/ccp-study/`; no file, fixture, test, agent prompt or agent output in the repo may contain it, and test fixtures use made-up bakery text.
- Practice questions, mission pages, the brief and the key points are original text, grounded by citing the source lesson (questions and key points) or the official AWS page (missions, in `sources` with `verified_on`), never copied.
- Writers never read the course source text, `content/fingerprints/`, `content/exam/` (except `content/exam/blueprint.yaml` for task text) or AWS exam questions, so new practice questions never reuse or paraphrase exam-pool items; checker agents read only their own batch file and never a keys file.
- Dani must never see exam-pool item text: plans, tool output, test output, agent returns, logs and commit bodies name exam items by id and count only, and exam end-to-end tests and screenshots run on synthetic forms served by `page.route`, with `trace`, `screenshot` and `video` off.
- Agent results and check batches live under `.results/` (git-ignored) and are never committed; merging a content branch unions its pass and failure files into the repo copy.
- Code under `src/engine/` is pure: it imports no Preact, signals, `src/app`, `src/ui` or `src/store` code, touches no DOM, storage, `crypto` or `globalThis`, and takes the current moment and the UTC offset as arguments; Biome enforces the boundary.
- Raw question, concept and key point ids appear only in the runner's report panel and in tool output, never elsewhere in the UI (spec 2.8); concepts show by display name.
- UI copy in this plan is exact: tests match it word for word, so change it only together with its test.
- New screens and forms load through `lazyScreen`; a task that touches the initial bundle runs `pnpm build` and states the initial JS size and headroom against the 50 KB budget.
- Every bug found while building gets `tests/regressions/YYYY-MM-DD-<slug>.test.ts` (or `.spec.ts` for browser-only bugs), written and failing before the fix (spec 9).

## File structure

Created in this phase (paths from the repo root):

| Path | Responsibility |
|---|---|
| `content/questions/NN-*/LL-*.yaml` (about 84 existing files, appended) | 429 new practice questions, one per tested concept at 2 live (Task 1) |
| `content/project/brief.yaml` | The cafe brief: title, 7 facts, 13 decisions with prompts and context, the rubric (Task 5) |
| `content/project/key-points/NN-<module-dir>.yaml` (13 files) | 4 to 6 reference key points per decision (Task 7) |
| `content/missions/mission-02-ec2-lifecycle.md` to `mission-08-estimate-and-review.md` (7 files) | Missions 2 to 8 (Task 13) |
| `schemas/project.ts` | Zod schemas for the brief, key points and their stamps (Task 4) |
| `schemas/project-view.ts` | Zod-free ADR headings, rubric and project chunk types shared by the build and the app (Task 8) |
| `scripts/content/lib/project.ts` | `projectOf(ctx)`, the loader every rule shares, and `keyPointHash` (Task 4) |
| `scripts/content/lib/key-point-checks.ts`, `scripts/content/key-points.ts` | The key point check pipeline and its CLI (Task 6) |
| `agents/key-point-writer.md`, `agents/key-point-critic.md` | The key point prompts, version 1 (Task 6) |
| `src/engine/capstone.ts`, `src/engine/plan.ts` | Decision records, stages, citations and drift; the `cafe-cloud-plan.md` builder (Task 8) |
| `src/engine/missions.ts` | Mission stages, the gate, plan fit, the live mission and mission safety (Task 9) |
| `src/app/adr-draft.ts`, `src/app/mission-records.ts` | Guards for ADR drafts, the plan record and mission ticks (Task 10) |
| `src/app/missions.ts`, `src/app/mission-copy.ts`, `src/app/screens/MissionFlow.tsx` | Mission signals; the lazy mission copy (`stageWord` among it); the lazy mission flow panel (Task 14) |
| `src/app/already-done.ts`, `src/app/screens/AlreadyDone.tsx` | The one-time Already done form and its events (Task 16) |
| `src/app/project.ts`, `src/app/download.ts`, `src/app/screens/Project.tsx` | Capstone copy and helpers, the text download helper, the lazy Project screen (Task 17) |
| `src/app/module-sections.ts`, `src/app/screens/ModuleSections.tsx` | The module page's Capstone and Missions row helpers and their lazy sections (Task 18) |
| `tests/unit/playwright-config.test.ts` | The `E2E_PORT` pin (Task 2) |
| `tests/unit/project-schema.test.ts`, `project-loader.test.ts`, `project-rules.test.ts`, `project-content.test.ts`, `key-point-checks.test.ts`, `key-point-agents.test.ts`, `project-chunk.test.ts` | Capstone content tests, with every key point rule case in `project-rules.test.ts` (Tasks 4 to 6, 11) |
| `tests/unit/capstone.test.ts`, `plan.test.ts`, `missions.test.ts` | Engine tests (Tasks 8, 9) |
| `tests/unit/adr-draft.test.ts`, `mission-records.test.ts`, `missions-content.test.ts`, `missions-app.test.ts`, `already-done.test.ts`, `record-at.test.ts`, `project-app.test.ts` | App and mission content tests (Tasks 10, 13, 14, 16, 17) |
| `tests/fixtures/content-root/content/project/brief.yaml`, `key-points/01-baking-basics.yaml` | The made-up bakery brief and key points (Task 4) |
| `tests/content/bad/r01-brief-twelve-decisions.yaml`, `r05-key-point-evidence.yaml`, `r08-key-point-two-sentences.yaml`, `r09-key-point-stamp.yaml`, `r02-key-point-id.yaml`, `r06-key-point-concept.yaml`, `r07-key-point-run.yaml`, `r08-retired-plan-in-mission.md` | Failing fixtures for the extended rules (Tasks 4, 11) |
| `tests/fixtures/journeys/missions-and-capstone.jsonl` and `.snapshot.json`, `tests/fixtures/backups/v1-capstone.json` and `v1-capstone.snapshot.json` | A journey that pins mission and decision XP, the first final and Architect; a schema 1 backup with mission and decision events and kv drafts that proves parse and migration (Task 12) |
| `tests/e2e/missions.spec.ts`, `already-done.spec.ts`, `capstone.spec.ts`, `project-helpers.ts`, `a11y.spec.ts`, `visual.spec.ts` and `tests/e2e/__screenshots__/` | End-to-end tests, the synthetic project chunk, the axe sweep and the visual baselines (Tasks 14 to 16, 18, 20, 21) |

Modified:

| Path | Change | Phase 4 task it follows |
|---|---|---|
| `playwright.config.ts` | `E2E_PORT` (Task 2); snapshot path and defaults (Task 21) | none |
| `content/missions/mission-00-guardrails.md`, `tests/e2e/reader.spec.ts` | The Plan status bullet points to the form, frontmatter unchanged; nine mission rows (Task 13); the `SCREENS` list (Task 20) | none |
| `scripts/content/lib/text.ts` | Exports `SENTENCE_BREAK` and `ABBREVIATIONS` for the copy pin (Task 8) | none |
| `scripts/content/rules/r01-schema.ts`, `r05-evidence.ts`, `r09-verified.ts` | Brief and key point findings (Task 4) | none |
| `scripts/content/rules/r08-style.ts` | Brief and key point strings (Task 4); retired plan names (Task 11) | none |
| `scripts/content/rules/r02-ids.ts`, `r06-references.ts` | Key point ids, unique concept names, key point concepts (Task 11) | 14 |
| `scripts/content/rules/r07-originality.ts`, `scripts/content/lib/style.ts`, `tests/unit/style.test.ts` | Key point and brief runs, `retiredPlanProblems` with `labStyleProblems` as its alias (Task 11); `practiceTarget` and its test (Task 3); Tasks 3 and 11 in either order | 2 (and 14 for Tasks 3 and 11) |
| `schemas/chunks.ts`, `scripts/content/build.ts`, `tests/unit/build.test.ts` | The project chunk and `ContentIndex.project` (Task 11); mission sections and steps (Task 14); either order | 14 |
| `tests/fixtures/index.ts`, `scripts/check-budgets.ts`, `scripts/content/validate.ts`, `tests/unit/sw-manifest.test.ts`, `tests/unit/r06.test.ts`, `schemas/project.ts` | `project: null`, the project chunk budget, `--demote` for key points, the key point concept cases, the `CRITERION_ORDER` import (Task 11) | 14 |
| `tests/fixtures/content-root/content/missions/mission-00-guardrails.md`, `tests/unit/home.test.ts` | A `## Steps` section with two H3s; the `MissionMeta` helper writes `sections` and `steps` (Task 14) | 14, 19 |
| `src/app/screens/MissionPage.tsx` | Sections and the mission flow (Task 14) | none |
| `src/app/screens/Screen.tsx` | The two mission screens load lazily (Task 14); the `project` and `decision` routes (Task 18) | 6, 17, 19 |
| `src/app/screens/MissionsPage.tsx`, `src/app/screens/TopBar.tsx` | States, lede and live chip (Task 14); the Already done panel (Task 16) | none |
| `src/store/kv.ts`, `tests/unit/migrations.test.ts`, `src/ui/base.css` | `plan`, `missionTicks`, `adrKey` and their pins; the two Phase 6 anchors, inserted before `/* Labs: shared and Sort */` (Task 10), with rules under `/* Missions: flow */` (Tasks 14 and 16) and `/* Capstone */` (Task 17) | 6, 7 |
| `src/engine/memory.ts`, `src/engine/replay.ts`, `src/engine/xp.ts`, `tests/property/arbitraries.ts`, `tests/fixtures/journeys/journeys.ts`, `tests/fixtures/journeys/content.ts`, `tests/unit/journeys.test.ts`, `memory.test.ts`, `badges.test.ts`, `anti-grind.test.ts`, `replay.test.ts` | Mission and decision XP, first final, the new journey, `ENGINE_VERSION` 6 (Task 12) | 18 (5 for `content.ts`) |
| `src/engine/next.ts`, `src/app/home.ts`, `src/app/memory.ts`, `tests/unit/next.test.ts`, `home.test.ts` | Mission safety in Next (Task 15) | 16, 19 |
| `src/app/progress.ts` | `recordAt` (Task 16) | 17 |
| `src/app/content.ts`, `src/app/screens/Progress.tsx`, `src/app/progress-lines.ts`, `tests/unit/progress-lines.test.ts` | `ensureProject`, the drift line and its pin, `downloadText` (Task 17) | none |
| `src/app/router.ts`, `nav.ts`, `keys.ts`, `keyboard.ts`, `shortcuts.ts`, `screens/ModulePage.tsx`, `tests/unit/router.test.ts`, `nav.test.ts`, `keys.test.ts`, `module.test.ts`, `tests/e2e/practice.spec.ts` | Capstone routes, `g c` and `g m`, Help rows, the lazy module Capstone and Missions sections, the backup round trip (Task 18) | 6, 8, 19 |
| `content/validate.yaml`, `scripts/content/lib/report.ts`, `agents/question-writer.md`, `tests/unit/agents.test.ts`, `tests/unit/r10.test.ts` | `practicePerConcept: 3`, `practiceTarget` in `homed()`, question writer version 4, the R10 case at 3 (Task 3) | 2, 3, 14 |
| `content/game/badges.yaml`, `tests/unit/game-content.test.ts`, `README.md`, the spec, `package.json` | Badges lose `arrives`, Phase 6 README sections and NOTE lines, version 0.7.0 (Task 19) | 20 |

## Task order and dependencies

- `master` is at 8ed213d or later, with Phase 4 Tasks 1 to 9, 12 to 14 and 16 to 19 and the Sort labs (0.5.0) merged, so every Phase 4 task a Phase 6 builder waits on is in except Task 20 (Task 19's gate); each builder checks the Phase 4 tasks its Depends line names against `git log master` before it starts.
- Tasks 1, 2, 4, 8 and 9 depend on nothing and start at once; Task 13 starts as soon as Task 2 is on `master` and stays on the `missions-app` branch.
- Task 5 needs Task 4; Task 6 needs Task 4; Task 7 starts its writers once Tasks 5 and 6 are on `master`.
- Task 10 needs Tasks 8 and 9 and Phase 4 Tasks 6 and 7; Task 11 needs Tasks 4, 6 and 8 and Phase 4 Task 14; Task 12 needs Tasks 8 and 9 and Phase 4 Task 18.
- Task 14 needs Tasks 2, 9, 10 and 13 and Phase 4 Tasks 14 and 19; Task 15 needs Tasks 9 and 14 and Phase 4 Tasks 16 and 19; Task 16 needs Tasks 10 and 14 and Phase 4 Task 17.
- Task 17 needs Tasks 8, 10 and 11; Task 18 needs Tasks 14 and 17 and Phase 4 Tasks 6, 8 and 19.
- Task 3 needs Task 1 merged and Phase 4 Tasks 2, 3 and 14; Task 19 needs Tasks 1 to 18 with both content branches merged, less any task the cut order drops, and Phase 4 Task 20; Task 20 needs Task 19 and the Phase 5 UI if Phase 5 has merged; Task 21 needs Task 20.
- Tasks that edit one file run in a fixed order: `r08-style.ts` and `project-rules.test.ts` Task 4 then 11; `style.ts` and `style.test.ts` Tasks 3 and 11 in either order; `schemas/chunks.ts`, `scripts/content/build.ts` and `build.test.ts` Tasks 11 and 14 in either order; `MissionsPage.tsx` and the `/* Missions: flow */` block Task 14 then 16; `tests/unit/home.test.ts` and `tests/e2e/missions.spec.ts` Task 14 then 15; `src/app/screens/Screen.tsx` Phase 4 Tasks 6, 17 and 19, then Task 14, then Task 18; `tests/e2e/reader.spec.ts` Task 13 then 20; `playwright.config.ts` Task 2 then 21.
- With "either order", the second task to land rebases onto the first; the hunks are disjoint except in `style.test.ts`, where both tasks change the import from `style.ts` and append a `describe` at the end, so that rebase keeps both sides: one import with every name and both `describe` blocks.
- Builders work in parallel git worktrees under `<scratchpad>/p6/`: `content-code` runs Tasks 2, 4, 5, 6, then 11 and 3; `engine` runs Tasks 8 and 9, then 12; `missions-app` runs Task 13, then 14, 15 and 16, and merges Tasks 13, 14 and 15 to `master` together; `capstone-app` runs Task 10, then 17 and 18; Tasks 19 to 21 run in a short-lived `gate` worktree.
- The initial JS budget is 50 KB and Phase 4 alone reached 49.5 KB at `master` 70b8990, so Tasks 14 to 18 already keep the mission screens, the mission copy and the module page sections lazy; if a build still reports `budget breach`, the builder stops and reports the figure, and the controller applies the next fallback in this order: move `project` and `ensureProject` from the eager `src/app/content.ts` into a module that only the lazy screens import (a few hundred bytes), then move any other Phase 6 code the build report shows in the initial chunk behind `lazyScreen`, and ask Dani before raising the budget.
- Phase 6 end-to-end runs set `E2E_PORT`: 4327 in `missions-app`, 4337 in `capstone-app`, 4347 in `gate` (Task 19 runs `E2E_PORT=4347 pnpm verify`); Phase 4 keeps 4317.
- The practice fan-out (Task 1) starts at once with the Workflow tool, in `<scratchpad>/p6/wt-questions` on branch `content/phase-6-questions`; its last top-up starts by Monday, October 19, it merges by Wednesday, October 21 through the serialized merge chain it shares with Phase 4's content branches, and Dani's fixes to needs-Dani drafts follow through `wt-questions-fix` until Wednesday, November 4.
- The key point fan-out (Task 7) runs in `<scratchpad>/p6/wt-key-points` on branch `content/phase-6-key-points` once Tasks 5 and 6 are on `master`, and merges by Wednesday, October 28.
- Merges union `.results` pass and failure files into the repo copy, and the controller applies the same union to Phase 4's incident copy-back, so merge order never drops passes.
- Dates (on `master` by): Tasks 2, 4, 8 and 9 Wednesday, October 14; Tasks 5 and 6 Saturday, October 17 (Task 13 done on its branch); Task 10 Monday, October 19; Task 1 Wednesday, October 21; Task 11 Friday, October 23; Task 17 Tuesday, October 27; Task 7 Wednesday, October 28; Tasks 12 and 14 done Friday, October 30; Tasks 15 and 16 done Monday, November 2; the missions unit (Tasks 13 to 15) and Task 18 Tuesday, November 3; Task 3 Wednesday, November 4; Task 19 releases 0.7.0 on Friday, November 6.
- If a task is not ready by Thursday, November 5, Task 19 leaves it out in this order: Tasks 18 and 17 (then Task 19 skips the key point report check and does not wait for Task 7), then 16, then the missions unit (Tasks 13, 14 and 15 together); Task 3 is cut if R10 at 3 is not met by Wednesday, November 4, and 0.7.0 ships with R10 at 2; a dropped task merges after November 14, never half wired.
- Phase 6 owns `ENGINE_VERSION` 6 and release 0.7.0; Phase 5 takes the next numbers and orders its shared-file edits after Phase 6 Tasks 18 and 19, or merges after November 14.
- The controller removes `wt-questions`, `wt-questions-fix` and `wt-key-points` with their branches in Task 19, after their merges; Dani deploys 0.7.0 with `pnpm site:deploy`.

---

## Task 1: Practice fan-out to 3 per concept (Workflow, controller-run)

**Depends on:** nothing; it starts at once, its last top-up starts by Monday, October 19, and it merges by Wednesday, October 21 through the serialized merge chain it shares with Phase 4's content branches, never while another merge is in flight.
**Covers:** P6-001, P6-003 to P6-022, P6-024.

**Files:**
- Modify: about 84 existing practice files `content/questions/NN-<module>/LL-<lesson>.yaml`, each gaining drafts at the end of its `questions` list (429 drafts, one per tested concept that has 2 live today, and no new file)
- Modify in place (the exam-close rewrites): `content/questions/05-networking/03-more-ways-to-connect-to-the-aws-cloud.yaml` (`q-9a2p4s`), `content/questions/05-networking/04-subnets-security-groups-and-network-access-control-lists.yaml` (`q-m2tdyx`), `content/questions/05-networking/06-global-networking.yaml` (`q-wdt2p1`), `content/questions/06-storage/01-introduction-to-storage.yaml` (`q-rzt6cy`), `content/questions/11-pricing-and-support/04-aws-support-plans.yaml` (`q-frzd72`), `content/questions/13-well-architected-solutions/02-aws-specialized-services.yaml` (`q-g02dpe`)
- Tool input, not repo files: `<scratchpad>/p6/phase6-qfanout.js` and the seven tools under `<scratchpad>/p6/tools/qfanout/` (`targets3.mts`, `batch-guard.mts`, `exam-guard.mts`, `pending.mts`, `rewrites.mts`, `drop.mts`, `stage.mts`)
- Test: the guards and `pending.mts` below, `pnpm --silent content:validate`, the scratch switch to `practicePerConcept: 3`, and `pnpm check`, through the pre-commit hook of every commit and by hand after each merge

This task is content, not code: the controller runs it with the Workflow tool in `<scratchpad>/p6/wt-questions` on branch `content/phase-6-questions`, and its agents write, check, stamp and commit the questions.
The branch writes only under `content/questions/**` and changes no code, test, prompt, config, README or `package.json`, so it touches no file Phase 4 creates or edits and starts at once.
Writers compute their need as `3 - open` per concept with the scratch tool `targets3.mts` and ignore the `need` field of `--homed`, which still counts to 2 until Task 3 switches the target after Phase 4 is done with the target code.
Writers never read the course source text, `content/fingerprints/`, `content/exam/` (except `content/exam/blueprint.yaml` for task text) or AWS exam questions, so a new question cannot reuse or paraphrase an exam-pool item; the exam guard, which prints ids and numbers only, is the second line of defence.
Writers meet R7 as the spec states it: no 9-word run, that is 4 consecutive hit 6-word shingles, against any module, plus the 8-word stem check against knowledge checks and assessment items; `content:validate --draft` runs both, and the 6-word wording of checklist line P6-018 is not the rule.
Dani never sees exam-pool text: every agent prompt forbids quoting question text, the guards print ids and numbers only, the workflow's log lines and return hold ids and counts only, and commit bodies hold ids and counts only.
Dani never sees a rewrite diff either, because its removed lines read close to exam stems; the commit bodies and the controller's report name the rewritten, restored and retired ids only.

The fan-out also rewrites the six live practice questions whose exam guard share is 0.25 or more against an exam-pool item: `q-frzd72`, `q-9a2p4s`, `q-g02dpe`, `q-m2tdyx`, `q-wdt2p1` and `q-rzt6cy`.
`q-frzd72` has a stem identical to exam item `q-yksteh`, which defeats the mocks; forms A to D are frozen, so the practice side changes, and the writer never sees the exam item.
A rewrite keeps the id, concept, task, note, level, type, the number of options and the correct option ids, raises `version`, appends `history: { version, change: rewrite, rescore: false }` and sets `status: draft`, so the check rounds stamp it again; an unchanged `correctKey` keeps R2's key-fix rule quiet.
All six are `single` or `multi`, so `correctKey` is the sorted list of correct option ids, which the rewrite keeps.
At commit time a rewrite that is not live again, whose `correctKey` differs from `master`'s, or that the exam guard still flags is restored from `master` byte for byte, except `q-frzd72`, which is retired instead when its concept keeps 2 or more other live items and no lab or incident cites it; restored and retired ids go on Dani's list, ids only.
A retired `q-frzd72` leaves its concept at 2 live, so the next top-up or the fix recipe writes its third question before Task 3.
Task 19's notes say, by id only, that exam item `q-yksteh` may be contaminated in its frozen form, because its practice twin was live since Phase 2, so Dani discounts it in mock results.

The worktree starts with a copy of `.results/checks` from the repository: without `failures.json` the 103 needs-Dani drafts become candidates again (measured), and the merge unions `passes.json` and `failures.json` into the repository copy, so neither this run's needs-Dani drafts nor Phase 4's incident passes are lost, whichever branch merges first.
Phase 4 never edits a real file under `content/questions/`, and its lab debriefs and incident steps only cite live practice ids, so adding drafts conflicts with nothing; the rewrite is the one place where a live id leaves `live` for a while, which Step 3 guards.
Seeds: check rounds 601, 602 and 603; top-ups 611 and 612, then 621 and 622; Dani-fix runs 631 and up, ten apart; Phase 4 uses 401 to 403 and 411.

Cost: a full round over 429 drafts deals about 3 x 429 / 10 = 129 checker batches (spec 2.7), about 172 with the cue round, grouped into about 22 checker agents of up to 8 batches, plus about 20% revisions; never more than about 30 agents run at once.
Wall-clock: writing takes about 1 to 1.5 hours, each check round about 45 to 60 minutes, so 3 rounds and up to 2 top-ups take about 6 to 8 hours of workflow time.

- [ ] **Step 1: Write the scratch tools**

The tools are tool input, not repo files, and need no tests; each runs under Node 24's type stripping as `node <tool> <worktree root> ...`, imports the worktree's own content scripts, and prints ids and numbers only.
Both guards and every tool that reads practice items keep only entries whose path starts with `content/questions/`, so Phase 4's incident steps never count as practice items and no agent is asked to edit a file outside `content/questions/`.
`SCRATCH` below is `/private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad`.

Create `$SCRATCH/p6/tools/qfanout/targets3.mts` (like `content:report --targets`, to 3 open per concept):

```ts
// Like `pnpm content:report --targets`, but to TARGET open practice questions per tested concept (ids and counts only).
// usage: node targets3.mts <root> [--module NN] [--note mNN/slug] [--target 3]
const [root, ...rest] = process.argv.slice(2);
const opt = (k: string) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
const TARGET = Number(opt('--target') ?? '3');
const { loadContext } = await import(`${root}/scripts/content/lib/context.ts`);
const { homed } = await import(`${root}/scripts/content/lib/report.ts`);
const ctx = loadContext(root);
const fileOf = new Map<string, string>();
for (const e of ctx.questions) {
  if (e.path.startsWith('content/questions/') && e.q.pool === 'practice' && e.noteId && !fileOf.has(e.noteId)) fileOf.set(e.noteId, e.path);
}
const out: any[] = [];
for (const note of ctx.notes) {
  if (note.kind !== 'lesson') continue;
  if (opt('--module') && note.id.slice(1, 3) !== opt('--module')) continue;
  if (opt('--note') && note.id !== opt('--note')) continue;
  const concepts = homed(ctx, note.id).concepts
    .map((c: any) => ({ id: c.id, live: c.live, open: c.open, need: Math.max(0, TARGET - c.open) }))
    .filter((c: any) => c.need > 0);
  if (concepts.length === 0) continue;
  const file = fileOf.get(note.id) ?? `content/questions/${note.path.replace(/^resources\//, '').replace(/\.md$/, '.yaml')}`;
  out.push({ note: note.id, file, need: concepts.reduce((n: number, c: any) => n + c.need, 0), concepts });
}
console.log(JSON.stringify(out, null, 2));
```

Create `$SCRATCH/p6/tools/qfanout/batch-guard.mts` (run right after every `prepare`):

```ts
// After `content:checks prepare`: fails when any batch holds a needs-Dani draft (attempts >= 3), a live item, an exam
// item or anything outside content/questions/ (an incident step). Prints ids and counts only.
// usage: node batch-guard.mts <root> [--allow <id,id,...>]   (--allow: needs-Dani drafts that Dani edited, for the fix recipe)
import { readdirSync, readFileSync } from 'node:fs';
const [root, flag, list] = process.argv.slice(2);
const allow = new Set(flag === '--allow' ? (list ?? '').split(',').filter(Boolean) : []);
const { loadContext } = await import(`${root}/scripts/content/lib/context.ts`);
const ctx = loadContext(root);
const byId = new Map(ctx.questions.filter((e: any) => e.path.startsWith('content/questions/')).map((e: any) => [e.q.id, e.q]));
const dir = `${root}/.results/checks/batches`;
let n = 0; const bad: string[] = [];
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  for (const item of JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).questions ?? []) {
    n++; const q: any = byId.get(item.id);
    if (!q || q.pool !== 'practice' || q.status !== 'draft' || ((q.review?.attempts ?? 0) >= 3 && !allow.has(item.id))) bad.push(`${f} ${item.id}`);
  }
}
for (const b of bad) console.log(`BAD ${b}`);
console.log(`batch-guard: ${n} items, ${bad.length} bad`);
process.exit(bad.length ? 1 : 0);
```

Create `$SCRATCH/p6/tools/qfanout/exam-guard.mts` (the overlap guard of P6-008, without exam text):

```ts
// Ids and numbers only: never prints question or exam text.
// Compares each practice item's stem and option text with every non-retired exam-pool item of the same module and
// prints FLAG when the 6-word shingle share is 0.25 or more or any 8-word run is shared.
// usage: node exam-guard.mts <root> [--live | --new | <idsFile>]
//   default: practice drafts that can still go live (attempts < 3); --live: live practice items; --new: practice items
//   that master's content/questions/ does not hold; idsFile: one qid per line
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const [root, which] = process.argv.slice(2);
const { loadContext } = await import(`${root}/scripts/content/lib/context.ts`);
const { questionTexts } = await import(`${root}/scripts/content/rules/r07-originality.ts`);
const { words } = await import(`${root}/scripts/content/lib/text.ts`);
const N = 6, RUN = 8;
const ctx = loadContext(root);
const grams = (q: any, n: number) => { const s = new Set<string>(); for (const t of questionTexts(q).stem) { const w = words(t); for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(' ')); } return s; };
const exam = ctx.questions.filter((e: any) => e.path.startsWith('content/exam/pool/') && e.q.pool === 'exam' && e.q.status !== 'retired');
const want = which && !which.startsWith('--') ? new Set(readFileSync(which, 'utf8').split('\n').filter(Boolean)) : null;
const inMaster = which === '--new'
  ? new Set(execFileSync('git', ['-C', root, 'grep', '-h', '-o', '-E', 'q-[0-9a-hjkmnp-tv-z]{6}', 'master', '--', 'content/questions'], { encoding: 'utf8' }).split('\n').filter(Boolean).map((l) => l.replace(/^master:/, '')))
  : null;
const picked = (q: any) =>
  want ? want.has(q.id)
  : which === '--live' ? q.status === 'live'
  : inMaster ? !inMaster.has(q.id) && q.status !== 'retired'
  : q.status === 'draft' && (q.review?.attempts ?? 0) < 3;
const prac = ctx.questions.filter((e: any) => e.path.startsWith('content/questions/') && e.q.pool === 'practice' && picked(e.q));
let flagged = 0, max = 0;
for (const p of prac) {
  const g = grams(p.q, N), r = grams(p.q, RUN);
  let best = 0, bestId = '', run = '';
  for (const x of exam) {
    if (x.module !== p.module) continue;
    const eg = grams(x.q, N); let hit = 0; for (const s of g) if (eg.has(s)) hit++;
    const share = g.size ? hit / g.size : 0;
    if (share > best) { best = share; bestId = x.q.id; }
    if (!run) { const er = grams(x.q, RUN); for (const s of r) if (er.has(s)) { run = x.q.id; break; } }
  }
  max = Math.max(max, best);
  if (best >= 0.25 || run) { flagged++; console.log(`FLAG ${p.q.id} m${String(p.module).padStart(2, '0')} share ${best.toFixed(2)} vs ${bestId}${run ? ` run8 vs ${run}` : ''}`); }
}
console.log(`exam-guard: ${prac.length} practice checked, ${flagged} flagged, max share ${max.toFixed(2)}`);
```

Create `$SCRATCH/p6/tools/qfanout/pending.mts` (what `prepare` would batch, and how much of it needs Dani):

```ts
// Ids-free count of practice items `content:checks prepare` would batch, and how many of them need Dani (must be 0).
// usage: node pending.mts <root>
const root = process.argv[2];
const { loadContext } = await import(`${root}/scripts/content/lib/context.ts`);
const c = await import(`${root}/scripts/content/lib/checks.ts`);
const ctx = loadContext(root);
const xs = c.candidates(ctx, [1,2,3,4,5,6,7,8,9,10,11,12,13], c.readPasses(root), c.readFailures(root), 'practice').filter((x: any) => x.needs.length > 0);
const dani = xs.filter((x: any) => x.entry.q.status === 'draft' && (x.entry.q.review?.attempts ?? 0) >= 3).length;
console.log(`pending: ${xs.length} practice items to check, ${dani} of them need Dani`);
process.exit(dani > 0 ? 1 : 0);
```

Create `$SCRATCH/p6/tools/qfanout/rewrites.mts` (checks the rewrites against `master`; with `--apply` keeps, restores or retires them):

```ts
// Ids and numbers only: checks the exam-close rewrites against master and, with --apply, keeps, restores or retires them.
// A rewrite stays only when it is live again, keeps master's correct key and is not in --flagged; any other is restored
// from master byte for byte, except the --retire id, which is restored and then retired when its concept keeps 2 or
// more other live practice items and no lab or incident cites it.
// usage: node rewrites.mts <root> <id,id,...> [--apply] [--flagged <id,id,...>] [--retire <id>]
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const [root, list, ...rest] = process.argv.slice(2);
const opt = (k: string) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] ?? '' : undefined; };
const APPLY = rest.includes('--apply');
const FLAGGED = new Set((opt('--flagged') ?? '').split(',').filter(Boolean));
const RETIRE = opt('--retire');
const YAML = createRequire(`${root}/package.json`)('yaml');
const { loadContext } = await import(`${root}/scripts/content/lib/context.ts`);
const { correctKey } = await import(`${root}/scripts/content/lib/hashes.ts`);
const { editQuestionFile } = await import(`${root}/scripts/content/lib/question-files.ts`);
const ctx = loadContext(root);
const practice = ctx.questions.filter((e: any) => e.path.startsWith('content/questions/') && e.q.pool === 'practice');

/** The whole lines of a file's item with this id, from its `- ` line to the end of its last value. */
function span(text: string, id: string): [number, number] {
  const seq = YAML.parseDocument(text).get('questions');
  for (const item of YAML.isSeq(seq) ? seq.items : []) {
    if (!YAML.isMap(item) || item.get('id') !== id || !item.range) continue;
    const start = text.lastIndexOf('\n', item.range[0] - 1) + 1;
    const nl = text.indexOf('\n', item.range[1] - 1);
    return [start, nl < 0 ? text.length : nl + 1];
  }
  throw new Error(`${id} is not in the file`);
}
const itemIn = (text: string, id: string): any =>
  (YAML.parse(text).questions ?? []).find((q: any) => q?.id === id);

function walk(dir: string): string[] {
  let names: string[] = [];
  try { names = readdirSync(`${root}/${dir}`); } catch { return []; }
  return names.flatMap((n) => statSync(`${root}/${dir}/${n}`).isDirectory() ? walk(`${dir}/${n}`) : [`${dir}/${n}`]);
}
const cites = [...walk('content/labs'), ...walk('content/incidents')].map((p) => readFileSync(`${root}/${p}`, 'utf8'));
function cited(id: string): boolean {
  if (cites.some((t) => new RegExp(`\\b${id}\\b`).test(t))) return true;
  try {
    execFileSync('git', ['-C', root, 'grep', '-q', '-w', id, 'master', '--', 'content/labs', 'content/incidents'], { stdio: 'ignore' });
    return true;
  } catch { return false; }
}

let kept = 0, restored = 0, retired = 0;
for (const id of list.split(',').filter(Boolean)) {
  const cur = practice.find((e: any) => e.q.id === id);
  if (!cur) { console.log(`REWRITE ${id} missing`); process.exitCode = 1; continue; }
  const masterText = execFileSync('git', ['-C', root, 'show', `master:${cur.path}`], { encoding: 'utf8' });
  const head = itemIn(masterText, id);
  const keySame = correctKey(cur.q) === correctKey(head);
  const isCited = cited(id);
  const others = practice.filter((e: any) => e.q.id !== id && e.q.status === 'live' && e.q.concept === cur.q.concept).length;
  console.log(`REWRITE ${id} m${String(cur.module).padStart(2, '0')} status ${cur.q.status} version ${cur.q.version} key ${keySame ? 'same' : 'changed'} cited ${isCited ? 'yes' : 'no'} others ${others}${FLAGGED.has(id) ? ' flagged' : ''}`);
  if (!APPLY) continue;
  if (cur.q.status === 'live' && keySame && !FLAGGED.has(id)) { kept++; continue; }
  const file = `${root}/${cur.path}`;
  let text = readFileSync(file, 'utf8');
  const [a, b] = span(text, id);
  const [c, d] = span(masterText, id);
  text = text.slice(0, a) + masterText.slice(c, d) + text.slice(b);
  if (id === RETIRE && others >= 2 && !isCited) {
    text = editQuestionFile(text, new Map([[id, { status: 'retired' }]]));
    retired++; console.log(`RETIRED ${id}`);
  } else {
    restored++; console.log(`RESTORED ${id}`);
  }
  writeFileSync(file, text);
}
console.log(APPLY ? `rewrites: ${kept} kept, ${restored} restored, ${retired} retired` : `rewrites: ${list.split(',').filter(Boolean).length} checked`);
```

Create `$SCRATCH/p6/tools/qfanout/drop.mts` (removes a new item that the commit run's guard still flags):

```ts
// Removes new practice items (ones master's file does not hold) by id, whole lines only; prints ids and counts only.
// usage: node drop.mts <root> <id,id,...>
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const [root, list = ''] = process.argv.slice(2);
const YAML = createRequire(`${root}/package.json`)('yaml');
const { loadContext } = await import(`${root}/scripts/content/lib/context.ts`);
const ctx = loadContext(root);
let dropped = 0;
for (const id of list.split(',').filter(Boolean)) {
  const e = ctx.questions.find((x: any) => x.path.startsWith('content/questions/') && x.q.id === id);
  if (!e) { console.log(`DROP ${id} missing`); process.exitCode = 1; continue; }
  let master = '';
  try { master = execFileSync('git', ['-C', root, 'show', `master:${e.path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch {}
  if (new RegExp(`\\bid: ${id}\\b`).test(master)) { console.log(`DROP ${id} refused: master holds it`); process.exitCode = 1; continue; }
  const file = `${root}/${e.path}`;
  const text = readFileSync(file, 'utf8');
  const seq = YAML.parseDocument(text).get('questions');
  const item = seq.items.find((x: any) => YAML.isMap(x) && x.get('id') === id);
  const start = text.lastIndexOf('\n', item.range[0] - 1) + 1;
  const nl = text.indexOf('\n', item.range[1] - 1);
  writeFileSync(file, text.slice(0, start) + text.slice(nl < 0 ? text.length : nl + 1));
  dropped++; console.log(`DROPPED ${id} m${String(e.module).padStart(2, '0')}`);
}
console.log(`drop: ${dropped} dropped`);
```

Create `$SCRATCH/p6/tools/qfanout/stage.mts` (stages a file by path with its rewrites held at `master`'s text, so a module commit and the rewrite commit stay apart without interactive staging):

```ts
// Stages one question file by path, with the listed items kept at master's text, so a file's new drafts and its
// rewrites land in separate commits without interactive staging (git hash-object -w, then git update-index).
// usage: node stage.mts <root> <path> [<id,id,...>]   (ids not in both copies are skipped)
// prints `staged <path> (<n> items held at master)`
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const [root, path, list = ''] = process.argv.slice(2);
const YAML = createRequire(`${root}/package.json`)('yaml');
const git = (args: string[], input?: string) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', input });
function span(text: string, id: string): [number, number] | null {
  const seq = YAML.parseDocument(text).get('questions');
  for (const item of YAML.isSeq(seq) ? seq.items : []) {
    if (!YAML.isMap(item) || item.get('id') !== id || !item.range) continue;
    const nl = text.indexOf('\n', item.range[1] - 1);
    return [text.lastIndexOf('\n', item.range[0] - 1) + 1, nl < 0 ? text.length : nl + 1];
  }
  return null;
}
let text = readFileSync(`${root}/${path}`, 'utf8');
const master = git(['show', `master:${path}`]);
let held = 0;
for (const id of list.split(',').filter(Boolean)) {
  const now = span(text, id), then = span(master, id);
  if (!now || !then) continue;
  text = text.slice(0, now[0]) + master.slice(then[0], then[1]) + text.slice(now[1]);
  held++;
}
const sha = git(['hash-object', '-w', '--stdin', `--path=${path}`], text).trim();
git(['update-index', '--add', '--cacheinfo', `100644,${sha},${path}`]);
console.log(`staged ${path} (${held} items held at master)`);
```

- [ ] **Step 2: Make the question worktree**

Run from any directory:

```bash
SCRATCH=/private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad
REPO="/Users/danielchahine/Programs/AWS Cloud Practitioner Essentials"
T="$SCRATCH/p6/tools/qfanout"
git -C "$REPO" worktree add -b content/phase-6-questions "$SCRATCH/p6/wt-questions" master
cd "$SCRATCH/p6/wt-questions"
eval "$(fnm env)"; fnm use
node --version
pnpm install --frozen-lockfile | tail -3
mkdir -p .results && cp -R "$REPO/.results/checks" .results/
pnpm --silent content:validate
pnpm --silent content:report --needs-dani | wc -l
node "$T/pending.mts" "$PWD"
```

Expected: `v24.21.0`; `content:validate: 13 rules, 0 findings`; `103`; `pending: 0 practice items to check, 0 of them need Dani`, which proves the `.results/checks` copy took (without it the same command prints `pending: 103 practice items to check, 103 of them need Dani` and exits 1).
Every later command of this task, up to Step 10, runs in this worktree.

- [ ] **Step 3: Pick the rewrites and keep cited ids out**

```bash
node "$T/exam-guard.mts" "$PWD" --live | awk '$1 == "FLAG" && $5 >= 0.25 { print $3, $2 }' | sort
IDS='q-frzd72|q-9a2p4s|q-g02dpe|q-m2tdyx|q-wdt2p1|q-rzt6cy'
git -C "$REPO" grep -h -o -w -E "$IDS" master -- content/labs content/incidents | sort -u
for d in "$SCRATCH"/p4/wt-*; do grep -rhowE "$IDS" "$d/content/labs" "$d/content/incidents" 2>/dev/null; done | sort -u
```

Expected: the first command prints the six lines `m05 q-9a2p4s`, `m05 q-m2tdyx`, `m05 q-wdt2p1`, `m06 q-rzt6cy`, `m11 q-frzd72` and `m13 q-g02dpe`; the two greps print nothing.
Phase 4's R6 and build reject a lab debrief question that is not live, so an id that either grep prints is left out of `rewrites` and goes on Dani's list, and the rewrite agent also skips any id that `rewrites.mts` reports as `cited yes`.
On day one the controller asks the Phase 4 controller to leave these six ids out of lab debrief picks and incident steps until this branch merges.
The `rewrites` argument of Step 5 is the first command's lines grouped by module, less any cited id: `{ "05": ["q-9a2p4s", "q-m2tdyx", "q-wdt2p1"], "06": ["q-rzt6cy"], "11": ["q-frzd72"], "13": ["q-g02dpe"] }`.

- [ ] **Step 4: Write the targets**

```bash
node "$T/targets3.mts" "$PWD" > .results/targets3.json
node -e "const t = JSON.parse(require('node:fs').readFileSync('.results/targets3.json', 'utf8')); console.log(t.length, t.reduce((n, x) => n + x.need, 0))"
```

Expected: `84 429`: 84 lesson notes, 429 drafts, per module `01:25, 02:50, 03:21, 04:11, 05:29, 06:50, 07:27, 08:43, 09:37, 10:44, 11:35, 12:39, 13:18`; every tested concept has 2 or 3 live and every draft today has 3 or more attempts, so open equals live and the need is exactly one draft per concept at 2 live.

- [ ] **Step 5: Run the write stage of the workflow**

Save this script as `$SCRATCH/p6/phase6-qfanout.js` and run it with the Workflow tool; it is tool input, not a repo file.
Its `args` are `{ "worktree": "<absolute path of $SCRATCH/p6/wt-questions>", "tools": "<absolute path of $SCRATCH/p6/tools/qfanout>", "rewrites": <the object of Step 3> }`.
Step 7 runs it again with `{ "worktree": ..., "tools": ..., "rewrites": ..., "commitOnly": true, "rounds": <the rounds of this run's return> }`, Step 8 with `{ ..., "topupOnly": true, "seeds": <an unused top-up seed pair> }`, and Step 11 with `{ "worktree": <the fix worktree>, "tools": ..., "checkOnly": true, "dani": [<edited ids>], "seed": 631 }`.

```js
export const meta = {
  name: 'phase6-qfanout',
  description: 'Phase 6 practice fan-out: rewrite the exam-close items, one writer per module to 3 open questions per concept, up to 3 check rounds and 2 top-ups; commits run separately',
  phases: [
    { title: 'Rewrite', detail: 'one writer per module with exam-close ids' },
    { title: 'Write', detail: 'one writer per module' },
    { title: 'Guard', detail: 'the exam guard, ids only' },
    { title: 'Prepare' },
    { title: 'Check', detail: 'checkers grouped by kind, up to 8 batches each' },
    { title: 'Stamp' },
    { title: 'Revise', detail: 'one writer per module' },
    { title: 'Top-up', detail: 'concepts still short of 3 open questions' },
    { title: 'Commit', detail: 'keep, restore or retire the rewrites, one commit per module, then the rewrite commit' },
  ],
}

const WT = args.worktree
const TOOLS = args.tools
const MODE = args.commitOnly === true ? 'commit' : args.checkOnly === true ? 'check' : args.topupOnly === true ? 'topup' : 'write'
const REWRITES = args.rewrites ?? {}
const REWRITE_IDS = Object.values(REWRITES).flat()
const DANI = args.dani ?? []
const SEED = args.seed ?? 631
const TOPUP_PAIR = args.seeds ?? []
const ROUNDS_SO_FAR = args.rounds ?? 0
const NODE = 'export PATH="/Users/danielchahine/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH";'
const LAST_TOPUP_DAY = '2026-10-19'
const ROUND_SEEDS = [601, 602, 603]
const TOPUP_SEEDS = [[611, 612], [621, 622]]
const RETIRE = 'q-frzd72'
const ALL_MODULES = '01,02,03,04,05,06,07,08,09,10,11,12,13'
const MODULES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
const pad2 = (n) => String(n).padStart(2, '0')
const HOOKS = `Start every shell command with: cd "${WT}" && ${NODE} Work only in this worktree, never in any other checkout. Stage files by path, never with git add -A or git add .; when git reports an index.lock, wait a few seconds and retry. Never use --no-verify. Never use the em dash. Never add a Co-Authored-By line. Never commit unless your task says so. Never quote a question's stem, options, whys, takeaway, evidence or a failure reason in your reply, a log line or a commit message: name questions by id and count only. Never open content/exam/ except content/exam/blueprint.yaml.`
const NEVER_READ = "Never read the course source text, ~/Library/Application Support/ccp-study/, content/fingerprints/, anything under content/exam/ except content/exam/blueprint.yaml, AWS exam questions, another module's question files, or .results/checks/keys.json."
const T3 = (m) => `node "${TOOLS}/targets3.mts" "${WT}" --module ${pad2(m)}`

if (!WT || !TOOLS) return { stopped: 'args.worktree and args.tools are required' }
if (MODE === 'commit' && args.rounds === undefined) return { stopped: 'a commitOnly run needs args.rounds from the first run' }
if (MODE === 'topup' && TOPUP_PAIR.length !== 2) return { stopped: 'a topupOnly run needs args.seeds, the unused top-up seed pair' }

const GUARD = {
  type: 'object',
  properties: { flags: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } },
  required: ['flags', 'summary'],
}
const REWRITE = {
  type: 'object',
  properties: { module: { type: 'integer' }, rewritten: { type: 'array', items: { type: 'string' } }, skipped: { type: 'array', items: { type: 'string' } } },
  required: ['module', 'rewritten', 'skipped'],
}
const WRITE = {
  type: 'object',
  properties: { module: { type: 'integer' }, drafts: { type: 'integer' }, concepts: { type: 'array', items: { type: 'string' } }, problems: { type: 'integer' }, style: { type: 'string' } },
  required: ['module', 'drafts', 'concepts', 'problems', 'style'],
}
const PREP = {
  type: 'object',
  properties: { batches: { type: 'array', items: { type: 'string' } }, guard: { type: 'string' } },
  required: ['batches', 'guard'],
}
const STAMP = {
  type: 'object',
  properties: {
    live: { type: 'integer' },
    draft: { type: 'integer' },
    revise: { type: 'array', items: { type: 'string' } },
    needsDani: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['live', 'draft', 'revise', 'needsDani', 'summary'],
}
const STATUS = {
  type: 'object',
  properties: {
    today: { type: 'string' },
    modules: { type: 'array', items: { type: 'integer' } },
    need: { type: 'integer' },
    pending: { type: 'string' },
    revise: { type: 'array', items: { type: 'string' } },
  },
  required: ['today', 'modules', 'need', 'pending', 'revise'],
}
const SETTLE = {
  type: 'object',
  properties: {
    dropped: { type: 'array', items: { type: 'string' } },
    kept: { type: 'array', items: { type: 'string' } },
    restored: { type: 'array', items: { type: 'string' } },
    retired: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['dropped', 'kept', 'restored', 'retired', 'summary'],
}
const COMMIT = {
  type: 'object',
  properties: { module: { type: 'integer' }, commit: { type: 'string' }, body: { type: 'string' } },
  required: ['module', 'commit', 'body'],
}
const FINAL = {
  type: 'object',
  properties: {
    counts: { type: 'string' },
    styles: { type: 'array', items: { type: 'string' } },
    needsDani: { type: 'array', items: { type: 'string' } },
    short: { type: 'array', items: { type: 'string' } },
    r10: { type: 'string' },
    status: { type: 'string' },
  },
  required: ['counts', 'styles', 'needsDani', 'short', 'r10', 'status'],
}

/** Groups `FLAG <id> m<NN> ...` lines by module number. */
function byModule(flags) {
  const out = {}
  for (const line of flags) {
    const [, id, m] = line.split(' ')
    if (id && m) (out[m.slice(1)] ??= []).push(id)
  }
  return out
}

/** Runs one exam-guard command and returns its FLAG lines and summary line; ids and numbers only. */
function guard(command, label) {
  return agent(`${HOOKS}
Run exactly: ${command}
Return its lines that start with FLAG, unchanged, as flags (ids and numbers only), and its last line as summary. Edit nothing.`, { label, phase: 'Guard', schema: GUARD, effort: 'low' })
}

/** One writer per module rewrites the listed live items, which read too close to exam items, from a new angle. */
function rewrite(groups, tag, extra) {
  return parallel(Object.entries(groups).map(([mod, ids]) => () => agent(`You are the question writer for Module ${+mod} of the CCP study site in the git worktree ${WT}.
Read agents/question-writer.md and content/STYLE.md in full.
First run \`node "${TOOLS}/rewrites.mts" "${WT}" ${ids.join(',')}\`; leave untouched every id whose line says \`cited yes\` and return it as skipped.
Each other id is a practice question that reads too close to other material; rewrite it from a new angle and a new cafe scenario, keeping the type, the number of options and the correct option ids.
Keep its id, concept, task, note and level; write a new stem, new option texts, new whys and a new takeaway, so that no run of 6 words of the old stem or options survives; evidence stays whole lines of the cited note.
${extra}
On the first rewrite of an id, set status: draft, raise version by 1 and append to history the entry { version: <new version>, change: rewrite, rescore: false }; on a later rewrite of the same id, keep its version and history as they are.
Leave its verified block as it is; content:stamp replaces it once the checks pass.
You never see the material it reads close to, and you must not look for it: never open content/exam/.
Loop on \`pnpm --silent content:validate --draft <file>\` for each file you touched until its last line ends with \`0 problems\`.
Edit only these questions. ${NEVER_READ}
${HOOKS}
Return the module number, the ids you rewrote and the ids you skipped.`, { label: `${tag}:m${mod}`, phase: 'Rewrite', schema: REWRITE })))
}

/** The rewrites are guarded right after they are written, up to 2 more rewrites, until no FLAG line is left. */
async function guardRewrites(ids) {
  const cmd = `printf '%s\\n' ${ids.join(' ')} > .results/rewrite-ids.txt && node "${TOOLS}/exam-guard.mts" "${WT}" .results/rewrite-ids.txt`
  for (let i = 1; i <= 2; i++) {
    const g = await guard(cmd, `guard:rewrite${i}`)
    log(`rewrite guard ${i}: ${g?.summary ?? 'no reply'}`)
    if (!g || g.flags.length === 0) return
    await rewrite(byModule(g.flags), `rewrite${i + 1}`, 'An earlier rewrite of this id still reads too close; take an angle and a scenario that neither the original nor that rewrite used.')
  }
  const last = await guard(cmd, 'guard:rewrite3')
  log(`rewrite guard 3: ${last?.summary ?? 'no reply'}; the commit run restores any rewrite still flagged`)
}

/** One writer per module: 3 - open drafts per tested concept, for every note targets3 lists, then the style line. */
function writer(m, tag, phaseName) {
  return agent(`You are the question writer for Module ${m} of the CCP study site in the git worktree ${WT}.
Read agents/question-writer.md and content/STYLE.md in full, and the "Cue round" section of agents/critic.md, then follow the writer prompt with one change: the practice target is 3 open questions per tested concept.
Run \`${T3(m)}\`; it lists each lesson note of Module ${m} whose concepts need drafts, its file, and per concept live, open and need (3 - open).
Work note by note: run \`pnpm --silent content:report --homed <note>\` for the concept details, ignore its need field (it still counts to 2), and write exactly the targets3 need for each listed concept.
Add your drafts to the end of the existing file and never change or remove any question already in it, drafts included; never reuse the stem, options or angle of a draft whose review.attempts is 3 or more, because those wait for Dani.
Each new draft tests its concept from an angle the file's other questions on that concept do not cover; most are single, with a multi or match where the note teaches a set or a pairing; write distractors that are true statements about AWS which do not answer the stem, parallel in grammar and length, so the cue round finds no tell or knowledge basis.
Get ids with \`pnpm --silent content:new-question N\`. Loop on \`pnpm --silent content:validate --draft <file>\` for every file you touched until its last line ends with \`0 problems\`.
Then run \`pnpm --silent content:report\` and keep the \`m${pad2(m)}:\` practice line within limits (multi at least 2, match at least 1, the correct option longest in at most 35% of singles, negative stems at most 5%) by editing only your new drafts.
End with \`${T3(m)}\`, which must print []. Write only files under content/questions/${pad2(m)}-*/. ${NEVER_READ}
${HOOKS}
Return the module number, the number of drafts you wrote, the concept ids that gained a draft, the problem count of your last --draft run and the final \`m${pad2(m)}:\` line, which holds counts only.`, { label: `${tag}:m${pad2(m)}`, phase: phaseName, schema: WRITE })
}

/** Guards the drafts that can still go live; a flagged draft gets a new angle from its module's writer, then one more guard. */
async function examGuard(tag) {
  for (let i = 1; i <= 2; i++) {
    const g = await guard(`node "${TOOLS}/exam-guard.mts" "${WT}"`, `guard:${tag}${i}`)
    log(`guard ${tag}${i}: ${g?.summary ?? 'no reply'}`)
    if (!g || g.flags.length === 0 || i === 2) return
    await parallel(Object.entries(byModule(g.flags)).map(([mod, ids]) => () => agent(`You are the question writer for Module ${+mod} of the CCP study site in the git worktree ${WT}.
Read agents/question-writer.md and content/STYLE.md in full.
These drafts read too close to other material: ${ids.join(', ')}. Rewrite each from a different angle and with a new cafe scenario, keeping its id, concept, task, note, type, number of options and correct option ids, its version and its history.
You never see the material they read close to, and you must not look for it: never open content/exam/.
Loop on \`pnpm --silent content:validate --draft <file>\` until its last line ends with \`0 problems\`. Edit only these drafts. ${NEVER_READ}
${HOOKS}
Return at most 3 lines: the ids you rewrote and the problem count of your last --draft run.`, { label: `guard-fix:${tag}${i}:m${mod}`, phase: 'Guard' })))
  }
}

/** One check round over every module's practice drafts: prepare, the batch guard, grouped checkers, grade and stamp. */
async function checkRound(seed, tag) {
  phase('Prepare')
  const allow = DANI.length > 0 ? ` --allow ${DANI.join(',')}` : ''
  const prep = await agent(`${HOOKS}
Run exactly: pnpm --silent content:checks prepare --modules ${ALL_MODULES} --seed ${seed}
Then run \`node "${TOOLS}/batch-guard.mts" "${WT}"${allow}\`; when it exits 1, return an empty batch list.
Return the batch paths prepare printed (the lines ending in .json), relative to the worktree root, and the guard's last line as guard. Do not edit any file.`, { label: `prepare:${tag}`, phase: 'Prepare', schema: PREP, effort: 'low' })
  const batches = prep?.batches ?? []
  log(`${tag}: ${batches.length} batches; ${prep?.guard ?? 'no guard line'}`)
  if (batches.length === 0) return null
  const kinds = {}
  for (const b of batches) {
    const k = b.split('/').pop().replace(/\.json$/, '').replace(/-\d+$/, '')
    ;(kinds[k] ??= []).push(b)
  }
  const groups = []
  for (const [kind, bs] of Object.entries(kinds)) for (let i = 0; i < bs.length; i += 8) groups.push({ kind, bs: bs.slice(i, i + 8) })
  phase('Check')
  await parallel(groups.map((g, gi) => () => {
    const file = g.kind.startsWith('critic') ? 'agents/critic.md' : `agents/${g.kind}.md`
    return agent(`You are a fresh checker for the CCP study site in the git worktree ${WT}.
Read ${file} first and follow it exactly; your kind is ${g.kind}${g.kind.startsWith('critic') ? ' (critic-cue-NN is the cue round, critic-NN the full round)' : ''}. A cue answer carries basis (tell, knowledge or guess) and, unless the basis is guess, a one-line reason.
Your batches, each judged on its own as the prompt says:
${g.bs.join('\n')}
For each batch <name>.json write .results/checks/answers/<name>.json and loop on \`pnpm --silent content:checks lint .results/checks/answers/<name>.json\` until it prints OK.
Read only what the prompt file allows. Never open .results/checks/keys.json, content/questions/, content/exam/, the notes or the course. Edit only your answer files.
${HOOKS}
Return one line per batch: OK and the answer count, or the last lint error.`, { label: `check:${tag}:${g.kind}#${gi}`, phase: 'Check' })
  }))
  phase('Stamp')
  const st = await agent(`${HOOKS}
Run \`pnpm --silent content:checks grade\`, then \`pnpm --silent content:stamp\`, then \`pnpm --silent content:report --needs-dani\`. Do not edit files and do not commit.
Count the practice questions by status with \`grep -hE '^ +status: (live|draft|retired)$' content/questions/*/*.yaml | sort | uniq -c\`.
Return live and draft from those counts, revise = the paths of the stamp's \`revise <path>\` lines, needsDani = the first word (the id) of each --needs-dani line (empty when it prints none), and summary = the grade summary line and the stamp summary line, joined by "; ".`, { label: `stamp:${tag}`, phase: 'Stamp', schema: STAMP, effort: 'low' })
  log(`${tag}: ${st?.live} live, ${st?.draft} draft, ${st?.needsDani?.length ?? 0} need Dani, ${st?.revise?.length ?? 0} files to revise`)
  return st
}

/** Revises the failed drafts below 3 attempts, one writer per module over that module's files. */
function revise(files, tag) {
  const mods = {}
  for (const f of files) (mods[f.split('/')[2].slice(0, 2)] ??= []).push(f)
  return parallel(Object.entries(mods).map(([mod, fs]) => () => agent(`You are the question writer for Module ${+mod} of the CCP study site in the git worktree ${WT}.
Read agents/question-writer.md and content/STYLE.md in full, then revise the failed drafts in these files as the prompt's "Revising after the checks" section says:
${fs.join('\n')}
Revise only drafts whose review.attempts is below 3, keep every id, concept, task and note, and never touch live items, retired items or drafts with 3 or more attempts.
For ${REWRITE_IDS.length > 0 ? REWRITE_IDS.join(', ') : 'any rewritten question'} also keep the type, the number of options, the correct option ids, the version and the history.
Fix the real cause named in review.lastFailure: a solve-closed failure needs a change to the stem, the option texts or the key; a cue failure with basis tell needs the tell removed; with basis knowledge the distractors become true statements about AWS that do not answer the stem; a critic failure needs what it names fixed.
Loop on \`pnpm --silent content:validate --draft <file>\` for each file until its last line ends with \`0 problems\`. Edit only these files. ${NEVER_READ}
${HOOKS}
Return at most 3 lines: the number of drafts you revised and the problem count of your last --draft run.`, { label: `revise:${tag}:m${mod}`, phase: 'Revise' })))
}

/** Rounds with the given seeds, revising after every round, the last included, so no failed draft waits unrevised. */
async function rounds(seeds, tag) {
  let n = 0
  for (const [i, seed] of seeds.entries()) {
    const st = await checkRound(seed, `${tag}${i + 1}`)
    if (!st) break
    n++
    if (st.revise.length === 0) break
    phase('Revise')
    await revise(st.revise, `${tag}${i + 1}`)
    await examGuard(`${tag}${i + 1}r`)
  }
  return n
}

/** Where the branch stands: today, the modules short of 3 open, the pending check count and the files to revise. */
function status(label) {
  return agent(`${HOOKS}
Run \`date +%F\` and return its output as today.
Run \`node "${TOOLS}/targets3.mts" "${WT}"\`; return as modules the module numbers of its note ids (mNN/...), without repeats, and as need the sum of its need fields.
Run \`node "${TOOLS}/pending.mts" "${WT}"\` and return its line as pending, whatever its exit code.
Run \`pnpm --silent content:stamp\` (with no new grades it only reports) and return as revise the paths of its \`revise <path>\` lines.
Do not edit any file.`, { label, phase: 'Top-up', schema: STATUS, effort: 'low' })
}

/** Writers for every module short of 3 open, then the guard and two check rounds on the given seeds. */
async function topUp(s, seeds, tag) {
  if (s.revise.length > 0) {
    phase('Revise')
    await revise(s.revise, `${tag}-pre`)
  }
  let concepts = []
  if (s.need > 0) {
    phase('Top-up')
    const written = await parallel(s.modules.map((m) => () => writer(m, tag, 'Top-up')))
    concepts = written.filter(Boolean).flatMap((w) => w.concepts)
    log(`${tag}: ${written.filter(Boolean).reduce((n, w) => n + w.drafts, 0)} drafts for ${concepts.length} concepts`)
    await examGuard(tag)
  }
  return { concepts, rounds: await rounds(seeds, `${tag}r`) }
}

/** The end state, ids and counts only, with the scratch switch to practicePerConcept: 3 restored before returning. */
function final(label) {
  return agent(`${HOOKS}
Do not edit or commit anything, except the scratch switch below.
Run \`grep -hE '^ +status: (live|draft|retired)$' content/questions/*/*.yaml | sort | uniq -c\` and return its counts on one line as counts.
Run \`pnpm --silent content:report\` and return its 13 practice lines (they start with m01: to m13:) as styles.
Run \`pnpm --silent content:report --needs-dani\` and return the first word (the id) of each line as needsDani.
Change \`practicePerConcept: 2\` to \`practicePerConcept: 3\` in content/validate.yaml, run \`pnpm --silent content:validate\`, return as short the concept id of each line that says "live practice question" and as r10 its last line, then restore the file with \`git checkout -- content/validate.yaml\`.
Return as status the output of \`git status --short\` with content/questions/ lines counted, not listed, as "<n> question files changed", plus any other line unchanged.`, { label, phase: 'Commit', schema: FINAL, effort: 'low' })
}

/** One commit per module, in module order, with the given rewrites held at master's text in the staged files. */
async function commitModules(held, roundCount) {
  const commits = []
  for (const m of MODULES) {
    const c = await agent(`${HOOKS}
Work on the current branch. When \`git status --short content/questions/${pad2(m)}-*/\` prints nothing, make no commit and return commit "none" and body "".
Run \`pnpm --silent content:validate\`; if it reports an R2 duplicate id in a new draft under content/questions/${pad2(m)}-*/, give that draft a fresh id from \`pnpm --silent content:new-question 1\` and run it again.
Stage each changed file under content/questions/${pad2(m)}-*/ by path with \`node "${TOOLS}/stage.mts" "${WT}" <path> ${held.length > 0 ? held.join(',') : '""'}\`, which holds the listed rewrites at master's text, so they land in the later rewrite commit.
Count the module's staged practice questions with \`git ls-files content/questions/${pad2(m)}-*/ | while read -r f; do git show ":$f"; done | grep -E '^ +status: (live|draft)$' | sort | uniq -c\`, and read its style line, the \`m${pad2(m)}:\` line of \`pnpm --silent content:report\`.
Commit with two -m flags: the subject "Add a third practice question per concept for Module ${m}" and the body "<live> live and <draft> draft practice questions; ${roundCount} check rounds; <style line>".
The pre-commit hook runs pnpm check; when it fails, fix the cause in this module's question files only, restage them the same way and commit again.
Return the module number, the commit hash (or "none") and the body you used.`, { label: `commit:m${pad2(m)}`, phase: 'Commit', schema: COMMIT, effort: 'low' })
    commits.push(c)
  }
  return commits
}

if (MODE === 'write') {
  if (REWRITE_IDS.length > 0) {
    phase('Rewrite')
    const done = await rewrite(REWRITES, 'rewrite1', '')
    const skipped = done.filter(Boolean).flatMap((r) => r.skipped)
    if (skipped.length > 0) log(`rewrites skipped because a lab or incident cites them: ${skipped.join(', ')}`)
    const rewritten = done.filter(Boolean).flatMap((r) => r.rewritten)
    if (rewritten.length > 0) await guardRewrites(rewritten)
  }
  phase('Write')
  const written = await parallel(MODULES.map((m) => () => writer(m, 'write', 'Write')))
  log(`write: ${written.filter(Boolean).reduce((n, w) => n + w.drafts, 0)} drafts; ${written.filter((w) => !w || w.problems > 0).length} modules with problems`)
  phase('Guard')
  await examGuard('w')
  let roundCount = await rounds(ROUND_SEEDS, 'r')
  for (const [t, seeds] of TOPUP_SEEDS.entries()) {
    const s = await status(`status:t${t + 1}`)
    if (!s) break
    log(`before top-up ${t + 1}: need ${s.need} in ${s.modules.length} modules; ${s.pending}; ${s.revise.length} files to revise`)
    if (s.need === 0 && s.revise.length === 0 && s.pending.startsWith('pending: 0 ')) break
    if (s.today > LAST_TOPUP_DAY) {
      log(`today is ${s.today}, after ${LAST_TOPUP_DAY}; no top-up starts`)
      break
    }
    roundCount += (await topUp(s, seeds, `topup${t + 1}`)).rounds
  }
  const end = await final('final')
  return { mode: MODE, rounds: roundCount, ...end }
}

if (MODE === 'topup') {
  const s = await status('status:topup')
  if (!s) return { stopped: 'no status' }
  if (s.today > LAST_TOPUP_DAY) return { stopped: `today is ${s.today}, after ${LAST_TOPUP_DAY}; no top-up starts` }
  const t = await topUp(s, TOPUP_PAIR, 'topup')
  phase('Commit')
  const c = await agent(`${HOOKS}
Work on the current branch. When \`git status --short content/questions/\` prints nothing, make no commit and return commit "none".
Run \`node "${TOOLS}/exam-guard.mts" "${WT}" --new\`; when it prints FLAG lines, run \`node "${TOOLS}/drop.mts" "${WT}" <their ids, comma separated>\`, because a new item that still reads close to an exam item never ships.
Run \`pnpm --silent content:validate\`; on an R2 duplicate id in a new draft, give it a fresh id from \`pnpm --silent content:new-question 1\` and run it again.
Stage every changed file under content/questions/ by path with \`git add <path>\`, one path at a time.
Count the staged practice questions with \`git ls-files content/questions/ | while read -r f; do git show ":$f"; done | grep -E '^ +status: (live|draft)$' | sort | uniq -c\`.
Commit with two -m flags: the subject "Top up the third practice question per concept" and the body "Concepts that gained a draft: ${t.concepts.length > 0 ? t.concepts.join(', ') : 'none'}; <live> live and <draft> draft practice questions; ${t.rounds} check rounds."
The pre-commit hook runs pnpm check; when it fails, fix the cause in the question files only and commit again.
Return module 0, the commit hash (or "none") and the body you used.`, { label: 'commit:topup', phase: 'Commit', schema: COMMIT, effort: 'low' })
  const end = await final('final:topup')
  return { mode: MODE, rounds: t.rounds, commit: c, ...end }
}

if (MODE === 'check') {
  const s = await status('status:check')
  if (s && s.revise.length > 0) {
    phase('Revise')
    await revise(s.revise, 'dani-pre')
  }
  const n = await rounds([SEED, SEED + 1, SEED + 2], 'd')
  phase('Commit')
  const c = await agent(`${HOOKS}
Work on the current branch. When \`git status --short content/questions/\` prints nothing, make no commit and return commit "none".
Run \`printf '%s\\n' ${DANI.join(' ')} > .results/dani-ids.txt && node "${TOOLS}/exam-guard.mts" "${WT}" .results/dani-ids.txt\`; when it prints a FLAG line, make no commit and return commit "none" and as body the flagged ids.
Stage every changed file under content/questions/ by path with \`git add <path>\`, one path at a time.
Count how many of ${DANI.length > 0 ? DANI.join(', ') : 'no ids'} are live now with \`grep -A2 -hE '^  - id: (${DANI.length > 0 ? DANI.join('|') : 'none'})$' content/questions/*/*.yaml | grep -c '^    status: live$'\`, and the staged practice questions with \`git ls-files content/questions/ | while read -r f; do git show ":$f"; done | grep -E '^ +status: (live|draft)$' | sort | uniq -c\`.
Commit with two -m flags: the subject "Check Dani's fixes to the third practice questions" and the body "<k> of ${DANI.length} fixed drafts live; <live> live and <draft> draft practice questions; ${n} check rounds."
The pre-commit hook runs pnpm check; when it fails, report the failing check by name and make no further change.
Return module 0, the commit hash (or "none") and the body you used.`, { label: 'commit:dani', phase: 'Commit', schema: COMMIT, effort: 'low' })
  const end = await final('final:check')
  return { mode: MODE, rounds: n, commit: c, ...end }
}

// MODE === 'commit': settle the new drafts and the rewrites, then one commit per module, then the rewrite commit.
phase('Commit')
const settle = await agent(`${HOOKS}
Run \`node "${TOOLS}/exam-guard.mts" "${WT}" --new\`; the ids of its FLAG lines are new items that still read too close to exam items.
Run \`node "${TOOLS}/drop.mts" "${WT}" <those ids, comma separated>\` when there are any, and return the ids it printed as DROPPED as dropped.
${REWRITE_IDS.length > 0 ? `Run \`printf '%s\\n' ${REWRITE_IDS.join(' ')} > .results/rewrite-ids.txt && node "${TOOLS}/exam-guard.mts" "${WT}" .results/rewrite-ids.txt\`; the ids of its FLAG lines are rewrites that still read too close.
Run \`node "${TOOLS}/rewrites.mts" "${WT}" ${REWRITE_IDS.join(',')} --apply --flagged <those ids, comma separated, or ""> --retire ${REWRITE_IDS.includes(RETIRE) ? RETIRE : '""'}\`.
Return as restored the ids of its RESTORED lines, as retired the ids of its RETIRED lines, and as kept every other id of ${REWRITE_IDS.join(', ')} whose REWRITE line does not say \`cited yes\`.` : 'There are no rewrites: return kept, restored and retired empty.'}
Then run \`pnpm --silent content:validate\` and return its last line as summary. Do not commit.`, { label: 'settle', phase: 'Commit', schema: SETTLE, effort: 'low' })
if (!settle) return { stopped: 'settle: no reply' }
log(`settle: ${settle.dropped.length} new items dropped; rewrites ${settle.kept.length} kept, ${settle.restored.length} restored, ${settle.retired.length} retired; ${settle.summary}`)
const held = [...settle.kept, ...settle.retired]
const commits = await commitModules(held, ROUNDS_SO_FAR)
let rewriteCommit = null
if (held.length > 0) {
  rewriteCommit = await agent(`${HOOKS}
Work on the current branch. When \`git status --short content/questions/\` prints nothing, make no commit and return commit "none".
Otherwise stage by path, with \`git add <path>\`, every file it lists; they hold only the rewrites now.
Commit with two -m flags: the subject "Rewrite the practice questions that read close to exam items" and the body "Rewritten: ${settle.kept.length > 0 ? settle.kept.join(', ') : 'none'}; restored: ${settle.restored.length > 0 ? settle.restored.join(', ') : 'none'}; retired: ${settle.retired.length > 0 ? settle.retired.join(', ') : 'none'}."
The pre-commit hook runs pnpm check; when it fails, report the failing check by name and make no further change.
Return module 0, the commit hash and the body you used.`, { label: 'commit:rewrites', phase: 'Commit', schema: COMMIT, effort: 'low' })
}
const end = await final('final:commit')
return { mode: MODE, settle, commits, rewriteCommit, ...end }
```

What each phase does:

- `Rewrite`: one writer per module with exam-close ids rewrites each from a new angle and a new cafe scenario, keeping the type, the number of options and the correct option ids, and never sees the exam item; the exam guard then runs on the rewrites alone and loops up to 2 more rewrites until it prints no `FLAG` line.
- `Write`: one writer per module in parallel writes `3 - open` drafts for every concept `targets3.mts` lists, loops on `--draft` until `0 problems`, keeps its `mNN:` practice line within the style limits by editing only its new drafts, and ends with `targets3.mts` printing `[]`.
- `Guard`: the exam guard on every draft that can still go live; a flagged draft gets a new angle from its module's writer, then one more guard; it runs again after every revision.
- Rounds 1 to 3 (seeds 601, 602 and 603): `prepare`, then `batch-guard.mts`, which stops the round when a batch holds a needs-Dani draft, a live item, an exam item or an incident step; checkers grouped by kind with up to 8 batches each; grade and stamp; then one reviser per module after every round, the last included, so no failed draft below 3 attempts waits unrevised.
- `Top-up`: up to 2 runs, each started only on or before Monday, October 19; a run starts when `targets3.mts` lists a concept again (its new draft reached 3 attempts), when a check is pending or when a draft waits for revision, and checks with seeds 611 and 612, then 621 and 622.
- The write stage commits nothing; its last agent switches `practicePerConcept` to 3 in a scratch edit, reports the short concept ids, and restores `content/validate.yaml`.
- `Commit` (Step 7): the exam guard on every item that `master` does not hold drops one still flagged (a new item, never live on `master`); `rewrites.mts` keeps, restores or retires each rewrite; one commit per module in module order with the kept and retired rewrites held at `master`'s text by `stage.mts`; then the rewrite commit, which runs after the module commits so a retired `q-frzd72` never drops its concept below R10's 2.

Expected return of the write stage: `{ mode: 'write', rounds: <n>, counts, styles, needsDani, short, r10, status }` with 13 `mNN:` style lines within limits, `short` empty or a few concept ids, `r10` `content:validate: 13 rules, 0 findings` or a finding count equal to the length of `short`, and `status` `<n> question files changed` with no other line.

- [ ] **Step 6: Check the write stage in the worktree**

```bash
git status --short | grep -vc '^ M content/questions/'
node "$T/targets3.mts" "$PWD"
node "$T/exam-guard.mts" "$PWD" | tail -1
node "$T/pending.mts" "$PWD"
pnpm --silent content:report | grep -E '^m[0-9]{2}:'
pnpm --silent content:report --needs-dani | wc -l
```

Expected: `0` (only question files changed); `[]` when every concept has 3 open; `exam-guard: <n> practice checked, 0 flagged, max share <x>` with `<x>` below 0.25; `pending: 0 practice items to check, 0 of them need Dani`; 13 style lines with multi at least 2, match at least 1, the correct option longest in at most 35% of singles (P6-024) and negative stems at most 5%; the needs-Dani count is 103 plus the new ones, whose ids go into the phase report for Dani.
When a check is still pending or a draft still waits for revision, Step 7 commits it as a draft all the same, and Step 8 checks it after the commits while a top-up seed pair is unused.
Step 8 never runs before Step 7, because its single commit would take in every module's drafts and the rewrites.

- [ ] **Step 7: Run the commit stage**

Run the same script with `{ "worktree": ..., "tools": ..., "rewrites": <the object of Step 3>, "commitOnly": true, "rounds": <rounds from Step 5> }`, then check:

```bash
git log --oneline master..HEAD
git diff --name-only master...HEAD | grep -vc '^content/questions/'
git status --short
pnpm --silent content:validate
node "$T/targets3.mts" "$PWD"
sed -i '' -e 's/practicePerConcept: 2/practicePerConcept: 3/' content/validate.yaml
pnpm --silent content:validate | tail -1
git checkout -- content/validate.yaml && git status --short content/validate.yaml
node "$T/exam-guard.mts" "$PWD" --live | awk '$1 == "FLAG" && $5 >= 0.25 { print $2 }'
```

Expected: 13 commits `Add a third practice question per concept for Module N`, N = 1 to 13, each with the body `<live> live and <draft> draft practice questions; <rounds> check rounds; <style line>`, then `Rewrite the practice questions that read close to exam items` with the body `Rewritten: <ids>; restored: <ids>; retired: <ids>.`; `0`, so the branch changes no file outside `content/questions/`, neither `content/concepts.yaml` nor anything under `content/exam/` (P6-021, P6-022); `git status --short` prints nothing; `content:validate: 13 rules, 0 findings`; `[]`; the scratch switch prints `content:validate: 13 rules, 0 findings`; the restore leaves no status line; the last command prints nothing, or only restored ids, which are on Dani's list.
When the scratch switch prints findings instead, each is `concept <id> has 2 live practice questions; it needs 3`, for a concept whose third draft needs Dani or was dropped, or whose `q-frzd72` was retired; Step 8 or the fix recipe of Step 11 closes them before Task 3.

- [ ] **Step 8: Top up after the commits, when a concept is short or a check is pending and a seed pair is left**

Only on or before Monday, October 19, and only with a top-up seed pair that Step 5 did not use (at most 2 top-ups in all), run the script with `{ "worktree": ..., "tools": ..., "topupOnly": true, "seeds": [621, 622] }` (or `[611, 612]` when Step 5 used none).
It revises any failed draft below 3 attempts, writes the drafts `targets3.mts` asks for, guards them, runs two check rounds with revisions, drops any new item that `exam-guard.mts --new` still flags, and commits once with `-m "Top up the third practice question per concept" -m "Concepts that gained a draft: <ids>; <live> live and <draft> draft practice questions; <rounds> check rounds."`.
Expected: one new commit and `git status --short` printing nothing; then repeat Step 7's checks from `pnpm --silent content:validate` on.
After October 19, a concept still short goes to Dani through the fix recipe of Step 11.

- [ ] **Step 9: Merge `master` into the branch and validate against Phase 4's content**

```bash
git merge --no-ff master -m "Merge master into the third practice question branch" -m "Brings in Phase 4's labs and incidents, so R2 and R7 check the new questions against them."
pnpm install --frozen-lockfile | tail -3
pnpm --silent content:validate
pnpm check 2>&1 | grep -E 'Test Files|^ +Tests '
```

Expected: the merge succeeds; a merge without conflicts runs no pre-commit hook, so the two checks after it are its gate; the validator prints `content:validate: 13 rules, 0 findings`, so no new id collides with an incident step (R2) and no new question shares a run with lab or incident text (R7); `pnpm check` ends with every test file passed, so no test that reads the real content (such as `tests/unit/build-real.test.ts`) breaks on the new questions.
On a finding, fix it in the question files only (an R2 duplicate gets a fresh id from `pnpm --silent content:new-question 1`; an R7 run on a draft gets a rewrite from its module's writer prompt), then commit with `-m "Fix practice questions that clash with Phase 4 content" -m "<n> ids renewed and <k> drafts rewritten: <ids>."`, staging each changed file by path; a live question that must change goes back to draft and through the fix recipe of Step 11.

- [ ] **Step 10: Merge into `master` and union the check results**

The controller runs this from the repository root through the serialized merge chain, never while another merge is in flight, by Wednesday, October 21:

```bash
cd "$REPO"
git merge --no-ff content/phase-6-questions -m "Merge the third practice question per concept" -m "Adds one practice question per tested concept in Modules 1 to 13, written, checked and stamped by the content workflow."
pnpm --silent content:validate
pnpm check 2>&1 | grep -E 'Test Files|^ +Tests '
node -e "const fs = require('node:fs'); const r = (p) => JSON.parse(fs.readFileSync(p, 'utf8')); const m = '.results/checks/passes.json'; fs.writeFileSync(m, JSON.stringify({ ...r(m), ...r(process.argv[1]) }, null, 2) + '\n')" "$SCRATCH/p6/wt-questions/.results/checks/passes.json"
node -e "const fs = require('node:fs'); const r = (p) => JSON.parse(fs.readFileSync(p, 'utf8')); const m = '.results/checks/failures.json'; const k = (f) => f.id + ' ' + f.check + ' ' + f.hash; const out = new Map(); for (const f of [...r(m), ...r(process.argv[1])]) { const o = out.get(k(f)); out.set(k(f), o ? { ...o, ...f, stamped: Boolean(o.stamped || f.stamped) } : f) } fs.writeFileSync(m, JSON.stringify([...out.values()], null, 2) + '\n')" "$SCRATCH/p6/wt-questions/.results/checks/failures.json"
node "$T/pending.mts" "$PWD"
git status --short
```

Expected: the merge succeeds (a merge without conflicts runs no pre-commit hook, so `pnpm check` runs by hand, P6-170); `content:validate: 13 rules, 0 findings`; `pnpm check` ends with every test file passed; the two unions print nothing; `pending: 0 practice items to check, 0 of them need Dani`; `git status --short` prints nothing (`.results/` is git-ignored).
Never run `content:checks prepare` in the repository: it wipes `.results/checks/batches` and `answers`; `pending.mts` already proves nothing is left to check, so no `content:stamp` runs here.
The controller applies the same union to Phase 4's copy-back of `.results/checks/passes.json` from its incident worktree, so the order of this merge and Phase 4's incident merge does not matter.
No `ENGINE_VERSION`, schema or `package.json` change follows: new live questions change only `contentVersion`, and the build ships them in the module chunks; Task 19's `pnpm build` reports the largest module chunk against the 120 KB budget (m06 was 47.8 KB before the fan-out).
The worktree and its branch stay until Task 19, which removes them.

- [ ] **Step 11: Check Dani's fixes to needs-Dani drafts (fix recipe, until Wednesday, November 4)**

Dani edits a needs-Dani draft (which changes its hashes, so the next `prepare` picks it up again); the controller applies the edits in a fix worktree, never in the repository:

```bash
git -C "$REPO" worktree add -b content/phase-6-questions-fix "$SCRATCH/p6/wt-questions-fix" master
cd "$SCRATCH/p6/wt-questions-fix"
eval "$(fnm env)"; fnm use
pnpm install --frozen-lockfile | tail -3
mkdir -p .results && cp -R "$REPO/.results/checks" .results/
```

Then the controller applies Dani's edits to the named drafts and runs the script with `{ "worktree": "<absolute path of $SCRATCH/p6/wt-questions-fix>", "tools": ..., "checkOnly": true, "dani": [<the edited ids>], "seed": 631 }`; the next fix run uses seed 641, then 651.
It revises any failed draft below 3 attempts, runs up to 3 check rounds in which `batch-guard.mts --allow` lets the edited needs-Dani drafts through, guards the edited ids, and commits once with `-m "Check Dani's fixes to the third practice questions" -m "<k> of <n> fixed drafts live; <live> live and <draft> draft practice questions; <rounds> check rounds."`.
Expected: one commit, `git status --short` printing nothing and `pnpm --silent content:validate` printing `content:validate: 13 rules, 0 findings`; the controller then merges `content/phase-6-questions-fix` into `master` as in Step 10 (subject `Merge Dani's fixes to the third practice questions`, the union taken from the fix worktree), and before the next fix run brings the worktree up to date with `git merge --ff-only master` and copies `.results/checks` again.
The recipe repeats until every concept has 3 live practice questions or until Wednesday, November 4, Task 3's deadline.

## Task 2: Let end-to-end runs pick their port

**Depends on:** nothing; it runs in the `content-code` worktree before Task 4 and is on `master` by Wednesday, October 14, so Task 13 can start the same day.
**Covers:** P6-170.

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/unit/playwright-config.test.ts`
- Test: `tests/unit/playwright-config.test.ts`, and one end-to-end test on port 4327

`vite preview --strictPort` on one fixed port makes two worktrees' end-to-end runs collide on the shared machine, so `E2E_PORT` moves the preview server and the base URL together.
Phase 6 end-to-end runs use 4327 in `missions-app`, 4337 in `capstone-app` and 4347 in `gate` (Task 19 runs `E2E_PORT=4347 pnpm verify`); Phase 4 keeps the default 4317.
A value that is not a whole port number from 1024 to 65535 stops the run with a clear message instead of starting a server on a wrong port.
The unit test loads the real config under each `E2E_PORT` with `vi.stubEnv` and `vi.resetModules`, so it pins the command and the URL without starting a browser.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/playwright-config.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

/** The Playwright config as it loads under the given E2E_PORT (undefined leaves it unset). */
async function configWith(port: string | undefined) {
  vi.resetModules();
  vi.stubEnv('E2E_PORT', port);
  const { default: config } = await import('../../playwright.config.ts');
  const server = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
  return { baseURL: config.use?.baseURL, command: server?.command, url: server?.url };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the end-to-end port', () => {
  it('stays on 4317 when E2E_PORT is unset', async () => {
    expect(await configWith(undefined)).toEqual({
      baseURL: 'http://localhost:4317',
      command: 'pnpm exec vite preview --port 4317 --strictPort',
      url: 'http://localhost:4317',
    });
  });

  it('moves the preview server and the base URL to E2E_PORT', async () => {
    expect(await configWith('4327')).toEqual({
      baseURL: 'http://localhost:4327',
      command: 'pnpm exec vite preview --port 4327 --strictPort',
      url: 'http://localhost:4327',
    });
  });

  it.each(['', 'abc', '80', '4327.5', '70000'])('refuses E2E_PORT %j', async (port) => {
    await expect(configWith(port)).rejects.toThrow(
      `E2E_PORT must be a whole number from 1024 to 65535, not '${port}'`,
    );
  });
});
```

- [ ] **Step 2: Run the test and see it fail**

```bash
pnpm test tests/unit/playwright-config.test.ts 2>&1 | grep -E 'Test Files|^ +Tests '
```

Expected: `Test Files  1 failed (1)` and `Tests  6 failed | 1 passed (7)`: only the 4317 case passes, because the config still ignores `E2E_PORT`.

- [ ] **Step 3: Read the port from `E2E_PORT`**

Replace `playwright.config.ts` with:

```ts
import { defineConfig, devices } from '@playwright/test';

/**
 * The tests' own port, so a `pnpm preview` left running on 4173 never blocks `pnpm verify` or `pnpm site:deploy`.
 * E2E_PORT moves it, so two worktrees on one machine can run end-to-end tests at the same time.
 */
const PORT = Number(process.env.E2E_PORT ?? 4317);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  throw new Error(`E2E_PORT must be a whole number from 1024 to 65535, not '${process.env.E2E_PORT}'`);
}
const BASE_URL = `http://localhost:${PORT}`;

/** End-to-end and accessibility tests against the production build, which `vite preview` serves with the site's CSP. */
export default defineConfig({
  testDir: 'tests',
  // Browser-only regression tests sit beside the Vitest ones as `.spec.ts` (tests/regressions/README.md).
  testMatch: ['e2e/**/*.spec.ts', 'regressions/**/*.spec.ts'],
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    // The production build registers a cache-first service worker; only tests/e2e/offline.spec.ts allows it.
    serviceWorkers: 'block',
  },
  webServer: {
    command: `pnpm exec vite preview --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } },
    },
  ],
});
```

- [ ] **Step 4: Run the test, the checks and one end-to-end test on 4327**

```bash
pnpm test tests/unit/playwright-config.test.ts 2>&1 | grep -E 'Test Files|^ +Tests '
pnpm typecheck
pnpm lint
pnpm build 2>&1 | tail -1
E2E_PORT=4327 pnpm exec playwright test tests/e2e/reader.spec.ts --project chromium-desktop -g "Home shows 13" 2>&1 | tail -3
```

Expected: `Test Files  1 passed (1)` and `Tests  7 passed (7)`; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`; the build ends with its `budgets:` line; the end-to-end run prints `1 passed`, served from port 4327.

- [ ] **Step 5: Commit**

```bash
pnpm lint:fix
git add playwright.config.ts tests/unit/playwright-config.test.ts
git commit -m "Let end-to-end runs pick their port" -m "E2E_PORT moves the preview server and base URL, so worktrees can run end-to-end tests at the same time without a port clash."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 3: Raise the practice target to 3 live questions per concept

**Depends on:** Task 1 merged with no concept short (after the fix recipe of Task 1 Step 11), and Phase 4 Tasks 2, 3 and 14 on `master` (they edit `style.ts`, `report.ts`, `draft.ts`, `content/validate.yaml`, `agents/question-writer.md` to version 3, `tests/unit/agents.test.ts` and `tests/unit/r10.test.ts`); deadline Wednesday, November 4, after which the task is cut, 0.7.0 ships with R10 at 2 and the third questions live, and the task lands after November 14.
**Covers:** P6-002, P6-023, P6-152 (the R10 part).

**Files:**
- Modify: `content/validate.yaml`, `scripts/content/lib/style.ts`, `scripts/content/lib/report.ts`, `agents/question-writer.md`
- Test: `tests/unit/style.test.ts`, `tests/unit/agents.test.ts`, `tests/unit/r10.test.ts`

R10 rises through `practiceTarget(ctx) = Math.max(2, ctx.config?.practicePerConcept ?? 0)` in `style.ts`, which replaces the constant `PER_CONCEPT_TARGET` in `coverageProblems()` and in `homed()` of `report.ts`, so `--homed`, `--targets`, `--draft` and R10 agree from now on.
The fixture config keeps `practicePerConcept: 0`, so every fixture test stays at 2 and only the new tests pin 3.
`agents/question-writer.md` goes to version 4 and says 3 where it said 2.
`tests/unit/style.test.ts` is also edited by Task 11 (`retiredPlanProblems`); both tasks change the import from `style.ts` and append a `describe` at the end of the file, so the second task to land rebases onto the first and keeps both sides: one import with every name and both `describe` blocks.
`README.md`'s sentence "Rule R10 keeps every tested concept at 2 or more live practice questions" moves to 3 in Task 19, which owns `README.md` in this phase, after Phase 4 Task 20's edits.
No `ENGINE_VERSION`, event schema or memory change follows, and the release number belongs to Task 19.
`targets3.mts` of Task 1 is no longer needed after this task: `pnpm --silent content:report --targets` counts to 3 itself.
Measured on `master` 057efe5 before the fan-out: with this task applied, `content:validate` prints `content:validate: 13 rules, 429 findings` and `--targets` lists 84 notes with a need of 429, which is why the task waits for Task 1.

- [ ] **Step 1: Check the prerequisites**

In the `content-code` worktree, rebase onto `master` and confirm the fan-out left no concept short:

```bash
git rebase master
git log --oneline master --grep "Merge the third practice question per concept" | wc -l
git log --oneline master --grep "Phase 4 Task 14" | wc -l
git log --oneline master --grep "Phase 4 Tasks 1 to 3" | wc -l
sed -i '' -e 's/practicePerConcept: 2/practicePerConcept: 3/' content/validate.yaml
pnpm --silent content:validate | tail -1
git checkout -- content/validate.yaml && git status --short content/validate.yaml
```

Expected: the rebase succeeds; each count is at least `1`; the scratch switch prints `content:validate: 13 rules, 0 findings`; the restore leaves no status line.
When the scratch switch prints `concept <id> has 2 live practice questions; it needs 3` lines instead, stop: those concepts go through Task 1's fix recipe first, and if they are not closed by Wednesday, November 4, this task is cut.
A cut task's report lists the concept ids of those lines, ids only, under `Concepts Task 3 could not raise to 3:`, which Task 19 copies into its notes for Dani.

- [ ] **Step 2: Write the failing tests**

In `tests/unit/style.test.ts`, add the import line `import { homed } from '../../scripts/content/lib/report.ts';` right before the import from `../../scripts/content/lib/style.ts`, add `practiceTarget` to that import, and add `replaceIn` to the import from `../fixtures/content-root.ts` (keep the names sorted; Biome formats the lists).
Task 11 adds `labStyleProblems` and `retiredPlanProblems` to the same import and is due on `master` by Friday, October 23, so it has most likely landed; with it in, the three imports read:

```ts
import { homed } from '../../scripts/content/lib/report.ts';
import {
  coverageProblems,
  isOpen,
  labStyleProblems,
  moduleStyle,
  practiceTarget,
  retiredPlanProblems,
  styleProblems,
} from '../../scripts/content/lib/style.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
```

Without Task 11, the style import lists `coverageProblems`, `isOpen`, `moduleStyle`, `practiceTarget` and `styleProblems` only.

and append at the end of the file:

```ts
describe('practiceTarget', () => {
  it('follows practicePerConcept and never asks for fewer than 2', () => {
    const config = { rules: ['R10' as const], examQuotas: false, blueprintTerms: false };
    expect(practiceTarget({ config: null })).toBe(2);
    expect(practiceTarget({ config: { ...config, practicePerConcept: 0 } })).toBe(2);
    expect(practiceTarget({ config: { ...config, practicePerConcept: 2 } })).toBe(2);
    expect(practiceTarget({ config: { ...config, practicePerConcept: 3 } })).toBe(3);
  });

  it('asks the draft check and the writers for 3 once practicePerConcept is 3', () => {
    const root = makeFixtureRoot();
    replaceIn(root, 'content/validate.yaml', 'practicePerConcept: 0', 'practicePerConcept: 3');
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(coverageProblems(FILE, ctx)).toEqual([
      'concept shared-kitchen has 1 question that can still go live; it needs 3',
      'concept per-minute-rental has 2 questions that can still go live; it needs 3',
    ]);
    expect(
      homed(ctx, 'm01/what-a-bakery-cloud-is').concepts.map((c) => ({
        id: c.id,
        open: c.open,
        need: c.need,
      })),
    ).toEqual([
      { id: 'shared-kitchen', open: 1, need: 2 },
      { id: 'per-minute-rental', open: 2, need: 1 },
    ]);
  });
});
```

In `tests/unit/r10.test.ts`, add this case inside `describe('R10 practice per concept', ...)`, right before `it('skips an untested concept', ...)`:

```ts
  it('asks for 3 once practicePerConcept is 3, so a concept with 2 live practice questions fails', () => {
    const two = contextWith({ practicePerConcept: 3 }, [singleQuestion({ status: 'live' })]);
    expect(messages(two)).toEqual([
      'content/concepts.yaml  concept shared-kitchen has 2 live practice questions; it needs 3',
      'content/concepts.yaml  concept per-minute-rental has 1 live practice question; it needs 3',
    ]);
    const three = contextWith({ practicePerConcept: 3 }, [
      singleQuestion({ status: 'live' }),
      singleQuestion({ id: 'q-4j6k8m', status: 'live' }),
    ]);
    expect(messages(three)).toEqual([
      'content/concepts.yaml  concept per-minute-rental has 1 live practice question; it needs 3',
    ]);
  });
```

In `tests/unit/agents.test.ts`, change the pin `'question-writer': 3,` to `'question-writer': 4,`, and in the test `points every writer at the style guide, and keeps checkers away from keys and notes`, right after the line ``expect(read('question-writer')).toContain('`need`');``, add:

```ts
    expect(read('question-writer')).toContain('3 open questions');
    expect(read('question-writer')).not.toMatch(/\b2 (?:open )?questions/);
```

- [ ] **Step 3: Run the tests and see them fail**

```bash
pnpm test tests/unit/style.test.ts tests/unit/agents.test.ts tests/unit/r10.test.ts 2>&1 | grep -E '×|Tests '
```

Expected: 4 failures: `question-writer names itself and carries a version` (version 3, not 4), `points every writer at the style guide, and keeps checkers away from keys and notes` (no `3 open questions`), `follows practicePerConcept and never asks for fewer than 2` (`practiceTarget is not a function`) and `asks the draft check and the writers for 3 once practicePerConcept is 3` (one problem at `it needs 2` instead of two at `it needs 3`).
The new R10 case passes at once, because R10 already reads `practicePerConcept` from the config; it pins that R10 fires at 3 for a concept with exactly 2 live practice questions (P6-023).

- [ ] **Step 4: Make the target follow the config**

In `scripts/content/lib/style.ts`, replace

```ts
/** Live practice questions per tested concept that the pilot and Phase 2's R10 aim for. */
export const PER_CONCEPT_TARGET = 2;
```

with

```ts
/**
 * Open practice questions per tested concept that the writers and the draft check aim for: R10's practicePerConcept,
 * never below the pilot's 2, so `--homed`, `--targets`, `--draft` and R10 always agree.
 */
export function practiceTarget(ctx: Pick<Context, 'config'>): number {
  return Math.max(2, ctx.config?.practicePerConcept ?? 0);
}
```

and replace `coverageProblems` with:

```ts
/** The tested concepts homed in a question file's note that still lack practiceTarget open questions there. */
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
  const target = practiceTarget(ctx);
  const problems: string[] = [];
  for (const c of ctx.concepts) {
    if (c.home !== noteId || c.tested === false) continue;
    const n = [c.id, ...(c.aliases ?? [])].reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
    if (n < target) {
      const noun = n === 1 ? 'question' : 'questions';
      problems.push(`concept ${c.id} has ${n} ${noun} that can still go live; it needs ${target}`);
    }
  }
  return problems;
}
```

In `scripts/content/lib/report.ts`, change the import `import { isOpen, moduleStyle, PER_CONCEPT_TARGET } from './style.ts';` to `import { isOpen, moduleStyle, practiceTarget } from './style.ts';`, change the doc comment `/** New drafts to write: PER_CONCEPT_TARGET minus open, never below 0. */` in `HomedConcepts` to `/** New drafts to write: practiceTarget minus open, never below 0. */`, and in `homed()` add the target right after `const opened = practiceCounts(ctx, isOpen);` and use it for `need`:

```ts
  const opened = practiceCounts(ctx, isOpen);
  const target = practiceTarget(ctx);
```

```ts
        need: Math.max(0, target - open),
```

In `agents/question-writer.md`, change `version: 3` to `version: 4`, and change the three lines that name the target:

```markdown
- `need` is how many new drafts the concept still needs to reach the practice target of 3 open questions.
```

```markdown
- In a new file that is 3 questions per concept; test each concept from different angles, with at least one cafe scenario per concept.
```

```markdown
It checks the schema, the answer counts, the whys, the evidence lines, the references, originality against the course, the mechanical style rules and that every listed concept has 3 questions that can still go live.
```

In `content/validate.yaml`, add the comment line `# Phase 6 raises practicePerConcept to 3.` right after `# Phase 4 adds R11.` and change `practicePerConcept: 2` to `practicePerConcept: 3`, so the file reads:

```yaml
# Active validator rules and R10 switches, raised phase by phase (spec 2.9).
# Phase 0: R1, R2, R6, R7, R8 and R13; Phase 1 adds R3, R4, R5 and R9; Phase 2 adds R10.
# Phase 3 adds R12 and examQuotas, once forms A to D are frozen; a rule once on stays on.
# Phase 4 adds R11.
# Phase 6 raises practicePerConcept to 3.
rules: [R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13]
practicePerConcept: 3
examQuotas: true
blueprintTerms: true
```

- [ ] **Step 5: Run the tests and the checks and see them pass**

```bash
pnpm test tests/unit/style.test.ts tests/unit/draft.test.ts tests/unit/coverage.test.ts tests/unit/agents.test.ts tests/unit/r10.test.ts 2>&1 | grep -E 'Test Files|^ +Tests '
pnpm test tests/content/bad.test.ts 2>&1 | grep -E 'Test Files|^ +Tests '
pnpm typecheck
pnpm lint
pnpm --silent content:validate
pnpm --silent content:report --targets
grep -rn "PER_CONCEPT_TARGET" scripts tests | wc -l
```

Expected: `Test Files  5 passed (5)` and `Tests  76 passed (76)` (on `master` 057efe5 to 8ed213d, or `Tests  77 passed (77)` once Task 11's `retiredPlanProblems` case is in `style.test.ts`); `Test Files  1 passed (1)` for the bad fixtures, so the R10 bad fixture still fires; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`; `content:validate: 13 rules, 0 findings`; `[]`; `0`.

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix
git add content/validate.yaml scripts/content/lib/style.ts scripts/content/lib/report.ts agents/question-writer.md tests/unit/style.test.ts tests/unit/agents.test.ts tests/unit/r10.test.ts
git commit -m "Raise the practice target to 3 live questions per concept" -m "R10 now needs 3 live practice questions per tested concept, and the writer target, the draft check and the question writer follow it."
```

Expected: the pre-commit hook runs `pnpm check`, whose `content:validate` now holds R10 at 3, and the commit succeeds.

---

## Task 4: Capstone schemas, the project loader and R1, R5, R8 and R9 for key points

**Depends on:** nothing; it starts at once in the `content-code` worktree, after Task 2.
**Covers:** P6-055, P6-056, P6-058, P6-061, P6-062, P6-064, P6-065.

**Files:**
- Create: `schemas/project.ts`, `scripts/content/lib/project.ts`
- Create: `tests/fixtures/content-root/content/project/brief.yaml`, `tests/fixtures/content-root/content/project/key-points/01-baking-basics.yaml`
- Create: `tests/content/bad/r01-brief-twelve-decisions.yaml`, `tests/content/bad/r05-key-point-evidence.yaml`, `tests/content/bad/r08-key-point-two-sentences.yaml`, `tests/content/bad/r09-key-point-stamp.yaml`
- Modify: `scripts/content/rules/r01-schema.ts`, `scripts/content/rules/r05-evidence.ts`, `scripts/content/rules/r08-style.ts`, `scripts/content/rules/r09-verified.ts`
- Test: `tests/unit/project-schema.test.ts`, `tests/unit/project-loader.test.ts`, `tests/unit/project-rules.test.ts`, `tests/content/bad.test.ts`

Design notes:
- No file of this task is one that Phase 4 creates or edits: `git log master -- scripts/content/rules/r01-schema.ts r05-evidence.ts r08-style.ts r09-verified.ts` shows only Phase 1 commits, and `tests/unit/r05.test.ts`, `r08.test.ts` and `r09.test.ts` stay untouched, because Phase 4 Task 14 appends to `r09.test.ts`; every key point rule case lives in the new `tests/unit/project-rules.test.ts`.
- `schemas/project.ts` is classic zod like every content schema; `CRITERION_IDS` is the score order of a decision's `scores` tuple, and Task 11 replaces it with an import of `CRITERION_ORDER` from `schemas/project-view.ts`, so one tuple remains; no test imports `CRITERION_IDS` (the schema test pins the literal order), so Task 11's rename touches `schemas/project.ts` alone.
- A key point id is `kp-NN-<slug>` whose `NN` must equal its file's `module`, so 13 writers in parallel can mint ids with no shared generator; a file holds 4 to 6 key points that are not retired, and a retired key point stays in its file so its id never disappears.
- `KeyPointVerified` is the key point stamp of spec 2.7: a `fullHash` over text, concepts and evidence and exactly one check, `critic@N`; the schema allows no other check, so R9 needs to compare only the hash.
- `projectOf(ctx)` in `scripts/content/lib/project.ts` is the loader every rule shares: it reads `content/project/` from `ctx.files`, memoizes the result per context in a `WeakMap`, and leaves `scripts/content/lib/context.ts` alone, because Phase 4 owns that file.
- The brief is optional to the loader, so a tree with no `content/project/` has no project findings; Task 5's `tests/unit/project-content.test.ts` requires the brief in the real repo.
- R1 findings carry the line of the deepest YAML node on the zod issue path, found through `LineCounter`, so a bad key point is reported at its own line; the loader also reports a key point file whose `module` differs from its name prefix, a second file for one module, and any other file under `content/project/`.
- `Project.strings` lists every string of the brief by field path (such as `decisions[0].prompt`) and each key point `text` by id, with its line, so R8 can report one sentence per string at the right line; this field is an addition to the brief's `Project` shape, made because YAML is not Markdown and R8 needs a line per string.
- R8's existing scan already reports a U+2014 on any line of any tracked file, the project YAML included, so the new R8 loop adds only the one-sentence check; the R8 test pins that an em dash in a key point is reported by that scan.
- `evidenceHolds(ctx, kp)` resolves each concept by id or alias to its home note and returns `true`, `false`, or `null` when no concept resolves; R5 reports only `false` on live key points, since R6 (Task 11) reports a concept that resolves to nothing, and Task 6's stamp, demote and draft check reuse it.
- R5 and R9 check live key points only and R1 and R8 every key point, as spec 2.9 scopes them by status.
- The fixture project is a made-up bakery: a 13-decision brief with the spec rubric, and one key point file with 4 key points on `shared-kitchen` and `per-minute-rental`, one of them live with a valid stamp (`fullHash` `54bf2496a4d7`); every test built on `makeFixtureRoot` now loads it, and the baseline of `tests/content/bad.test.ts` stays clean.
- In the prototype, the 38 test files that use `makeFixtureRoot` passed with the fixture project in place (364 tests).

- [ ] **Step 1: Add the fixture project**

Create `tests/fixtures/content-root/content/project/brief.yaml`:

```yaml
# Fixture capstone brief: a made-up bakery, for the content-check tests.
title: Move the bakery to the shared kitchen
facts:
  - id: growth
    text: The bakery runs one branch today and plans four branches by next spring.
  - id: peak
    text: Saturday queues are three times longer than weekday queues.
  - id: loyalty
    text: A stamp card gives regulars a free loaf after nine loaves.
  - id: archive
    text: Recipe cards and receipts fill two filing cabinets in the back room.
  - id: pos
    text: A till in the first branch records every sale on paper rolls.
  - id: staff
    text: One baker also looks after the ovens and the till.
  - id: budget
    text: Oven rental may not cost more than the flour bill.
decisions:
  - module: 1
    title: Ovens for the first branch
    prompt: Choose how the first branch borrows ovens from the shared kitchen.
    context:
      - The bakery runs one branch today.
      - Saturday queues are three times longer than weekday queues.
  - module: 2
    title: Proofing cabinets
    prompt: Choose how the bakery rents proofing cabinets for its dough.
    context:
      - Dough proofs for about an hour.
      - Oven rental may not cost more than the flour bill.
  - module: 3
    title: Delivery bikes
    prompt: Decide which deliveries the bakery hands to a courier service.
    context:
      - Regulars order loaves for the morning.
      - One baker also looks after the ovens and the till.
  - module: 4
    title: Second town
    prompt: Choose where the branch in the second town buys its flour.
    context:
      - The bakery plans four branches by next spring.
      - The second town sits across the river.
  - module: 5
    title: Kitchen doors
    prompt: Decide which doors of the shared kitchen stay locked at night.
    context:
      - Bakers arrive before dawn.
      - The back room holds the filing cabinets.
  - module: 6
    title: Filing cabinets
    prompt: Choose where old recipe cards and receipts are kept.
    context:
      - Recipe cards and receipts fill two filing cabinets.
      - Old receipts are rarely read.
  - module: 7
    title: Order book
    prompt: Choose how the bakery keeps its book of standing orders.
    context:
      - Regulars order the same loaves every week.
      - The till records every sale on paper rolls.
  - module: 8
    title: Sales tally
    prompt: Decide how the bakery counts which loaves sell on which day.
    context:
      - Saturday queues are three times longer than weekday queues.
      - The owner wants fewer unsold loaves.
  - module: 9
    title: Kitchen keys
    prompt: Decide who holds a key to the shared kitchen and the till.
    context:
      - One baker also looks after the ovens and the till.
      - New branches bring new bakers.
  - module: 10
    title: Oven log
    prompt: Choose how the bakery notices an oven that runs too hot.
    context:
      - Bakers arrive before dawn.
      - A burnt batch wastes a morning of flour.
  - module: 11
    title: Flour budget
    prompt: Decide how the bakery keeps oven rental under the flour bill.
    context:
      - Oven rental may not cost more than the flour bill.
      - Saturday rentals cost the most.
  - module: 12
    title: Moving the till
    prompt: Choose how the paper till rolls move into the shared kitchen ledger.
    context:
      - A till in the first branch records every sale on paper rolls.
      - The branch cannot close on a Saturday.
  - module: 13
    title: Bakery review
    prompt: Review the bakery plan and name the three changes that matter most.
    context:
      - The earlier choices describe the whole bakery.
      - One baker must be able to run it.
rubric:
  passTotal: 8
  criteria:
    - id: fit
      name: Fit
      levels:
        - Ignores the brief
        - Meets some constraints
        - Meets every main constraint
        - Also meets edge constraints and names the course-taught reason
    - id: grounding
      name: Grounding
      levels:
        - No course concepts, or wrong ones
        - 1 concept used correctly
        - 2 or more used correctly
        - Also compared against the rejected option
    - id: tradeoffs
      name: Trade-offs
      levels:
        - None
        - Names a cost or a limit
        - Adds a mitigation
        - Adds the cost or responsibility impact
    - id: cost
      name: Cost and responsibility
      levels:
        - Missing
        - Mentioned vaguely
        - Pricing model or responsibility split stated
        - Both stated, and they match earlier ADRs
```

Create `tests/fixtures/content-root/content/project/key-points/01-baking-basics.yaml`:

```yaml
# Fixture key points for decision 1 of the bakery brief.
module: 1
keyPoints:
  - id: kp-01-borrow-on-busy-days
    status: live
    text: The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.
    concepts: [shared-kitchen]
    evidence: Branches use ovens from one central kitchen when their queues grow.
    verified:
      fullHash: 54bf2496a4d7
      checks: [critic@1]
      on: "2026-10-10"
  - id: kp-01-pay-only-while-proofing
    status: draft
    text: Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.
    concepts: [per-minute-rental]
    evidence: Cabinets are billed only while dough proofs.
  - id: kp-01-give-capacity-back
    status: draft
    text: Quiet weekday mornings hand the borrowed ovens back to the shared kitchen.
    concepts: [shared-kitchen, per-minute-rental]
    evidence: Borrow capacity when busy and give it back when quiet.
  - id: kp-01-name-the-billing-term
    status: draft
    text: The plan uses the newer billing term that the bakery guide now prints.
    concepts: [per-minute-rental]
    evidence: The fixture guide names a newer billing term.
```

The live key point's `fullHash` is `hash12({ text, concepts, evidence })` of its three fields; if you change any of them, recompute it with `node -e "import('./scripts/content/lib/hashes.ts').then(({ hash12 }) => console.log(hash12({ text: '<text>', concepts: ['shared-kitchen'], evidence: '<evidence>' })))"`.

- [ ] **Step 2: Write the failing schema test**

Create `tests/unit/project-schema.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { Brief, KEY_POINT_ID, KeyPoint, KeyPointFile } from '../../schemas/project.ts';

const FIXTURE = resolve(import.meta.dirname, '..', 'fixtures', 'content-root', 'content', 'project');
const brief = (): Record<string, unknown> =>
  parse(readFileSync(join(FIXTURE, 'brief.yaml'), 'utf8')) as Record<string, unknown>;
const keyPoints = (): { module: number; keyPoints: Record<string, unknown>[] } =>
  parse(readFileSync(join(FIXTURE, 'key-points', '01-baking-basics.yaml'), 'utf8')) as {
    module: number;
    keyPoints: Record<string, unknown>[];
  };
const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }): string[] =>
  result.success ? [] : (result.error?.issues ?? []).map((i) => i.message);

describe('the brief schema', () => {
  it('accepts the fixture brief', () => {
    const parsed = Brief.parse(brief());
    expect(parsed.decisions.map((d) => d.module)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(parsed.rubric.criteria.map((c) => c.id)).toEqual(['fit', 'grounding', 'tradeoffs', 'cost']);
  });

  it('rejects 12 decisions', () => {
    const b = brief();
    b.decisions = (b.decisions as unknown[]).slice(0, 12);
    expect(Brief.safeParse(b).success).toBe(false);
  });

  it('rejects decisions out of module order', () => {
    const b = brief();
    const decisions = b.decisions as Record<string, unknown>[];
    [decisions[0], decisions[1]] = [
      decisions[1] as Record<string, unknown>,
      decisions[0] as Record<string, unknown>,
    ];
    expect(messages(Brief.safeParse(b))).toContain('decision 1 must be for Module 1');
  });

  it('rejects a repeated fact id', () => {
    const b = brief();
    const facts = b.facts as { id: string }[];
    (facts[1] as { id: string }).id = (facts[0] as { id: string }).id;
    expect(messages(Brief.safeParse(b))).toContain(
      `fact id ${(facts[0] as { id: string }).id} appears twice`,
    );
  });

  it('rejects a criterion out of order', () => {
    const b = brief();
    const criteria = (b.rubric as { criteria: unknown[] }).criteria;
    [criteria[0], criteria[1]] = [criteria[1], criteria[0]];
    expect(messages(Brief.safeParse(b))).toContain(
      'criteria must be fit, grounding, tradeoffs, cost in that order',
    );
  });

  it('rejects a pass total other than 8', () => {
    const b = brief();
    (b.rubric as { passTotal: number }).passTotal = 9;
    expect(Brief.safeParse(b).success).toBe(false);
  });
});

describe('the key point schemas', () => {
  it('accepts the fixture key point file', () => {
    const parsed = KeyPointFile.parse(keyPoints());
    expect(parsed.keyPoints.map((k) => k.status)).toEqual(['live', 'draft', 'draft', 'draft']);
  });

  it('takes ids of the form kp-NN-slug only', () => {
    expect(KEY_POINT_ID.test('kp-06-lifecycle-to-deep-archive')).toBe(true);
    for (const bad of ['kp-14-x', 'kp-6-x', 'kp-06-', 'kp-06-Upper', 'q-7k2m9p'])
      expect(KEY_POINT_ID.test(bad)).toBe(false);
  });

  it('rejects 3 key points that are not retired', () => {
    const f = keyPoints();
    f.keyPoints = f.keyPoints.slice(0, 3);
    expect(messages(KeyPointFile.safeParse(f))).toContain(
      'a key point file needs 4 to 6 key points that are not retired; it has 3',
    );
  });

  it('counts a retired key point toward neither bound', () => {
    const f = keyPoints();
    f.keyPoints = [...f.keyPoints.slice(0, 3), { ...f.keyPoints[3], status: 'retired' }];
    expect(KeyPointFile.safeParse(f).success).toBe(false);
    f.keyPoints = [...keyPoints().keyPoints, { ...f.keyPoints[3], id: 'kp-01-old-point', status: 'retired' }];
    expect(KeyPointFile.safeParse(f).success).toBe(true);
  });

  it('rejects kp-02-x in the Module 1 file', () => {
    const f = keyPoints();
    f.keyPoints = [...f.keyPoints, { ...f.keyPoints[1], id: 'kp-02-x' }];
    expect(messages(KeyPointFile.safeParse(f))).toContain('kp-02-x belongs to Module 2, not Module 1');
  });

  it('rejects a repeated id', () => {
    const f = keyPoints();
    f.keyPoints = [...f.keyPoints, { ...f.keyPoints[1] }];
    expect(messages(KeyPointFile.safeParse(f))).toContain(`${f.keyPoints[1]?.id} appears twice`);
  });

  it('stamps with exactly one critic check', () => {
    const live = keyPoints().keyPoints[0] as Record<string, unknown>;
    expect(KeyPoint.safeParse(live).success).toBe(true);
    const verified = live.verified as Record<string, unknown>;
    expect(
      KeyPoint.safeParse({ ...live, verified: { ...verified, checks: ['critic@1', 'critic@2'] } }).success,
    ).toBe(false);
    expect(
      KeyPoint.safeParse({ ...live, verified: { ...verified, checks: ['solve-closed@1'] } }).success,
    ).toBe(false);
    expect(KeyPoint.safeParse({ ...live, verified: { ...verified, keyHash: 'abcdefabcdef' } }).success).toBe(
      false,
    );
  });

  it('takes 1 to 3 concepts and one evidence line', () => {
    const live = keyPoints().keyPoints[0] as Record<string, unknown>;
    expect(KeyPoint.safeParse({ ...live, concepts: [] }).success).toBe(false);
    expect(KeyPoint.safeParse({ ...live, concepts: ['a', 'b', 'c', 'd'] }).success).toBe(false);
    expect(KeyPoint.safeParse({ ...live, evidence: ['a line'] }).success).toBe(false);
  });
});
```

Run: `pnpm test tests/unit/project-schema.test.ts 2>&1 | grep -E "^Error|Test Files|Tests "`

Expected: FAIL with `Error: Cannot find module '../../schemas/project.ts'` and `Test Files  1 failed (1)`.

- [ ] **Step 3: Write the schemas**

Create `schemas/project.ts`:

```ts
import { z } from 'zod';
import { ConceptId, IsoDate, ModuleNumber, Slug } from './common.ts';
import { Review } from './question.ts';

/**
 * The capstone content (spec 6): the brief in content/project/brief.yaml and one key point file per decision in
 * content/project/key-points/NN-<module-dir>.yaml.
 */

/** A key point id: `kp-`, the two-digit module of its file and a kebab-case slug, like kp-06-lifecycle-to-deep-archive. */
export const KEY_POINT_ID = /^kp-(0[1-9]|1[0-3])-[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Rubric criterion ids in score order; a decision's `scores` tuple follows this order. */
export const CRITERION_IDS = ['fit', 'grounding', 'tradeoffs', 'cost'] as const;

const Level = z.string().min(1).max(120);

export const Fact = z.strictObject({ id: Slug, text: z.string().min(10).max(300) });
export type Fact = z.infer<typeof Fact>;

export const BriefDecision = z.strictObject({
  module: ModuleNumber,
  title: z.string().min(3).max(60),
  prompt: z.string().min(20).max(300),
  context: z.array(z.string().min(10).max(300)).min(2).max(4),
});
export type BriefDecision = z.infer<typeof BriefDecision>;

export const Criterion = z.strictObject({
  id: z.enum(CRITERION_IDS),
  name: z.string().min(1),
  levels: z.tuple([Level, Level, Level, Level]),
});
export type Criterion = z.infer<typeof Criterion>;

export const Rubric = z
  .strictObject({
    passTotal: z.literal(8),
    criteria: z.tuple([Criterion, Criterion, Criterion, Criterion]),
  })
  .refine((r) => r.criteria.map((c) => c.id).join() === CRITERION_IDS.join(), {
    message: `criteria must be ${CRITERION_IDS.join(', ')} in that order`,
    path: ['criteria'],
  });
export type Rubric = z.infer<typeof Rubric>;

export const Brief = z
  .strictObject({
    title: z.string().min(1).max(80),
    facts: z.array(Fact).length(7),
    decisions: z.array(BriefDecision).length(13),
    rubric: Rubric,
  })
  .superRefine((b, ctx) => {
    for (const [i, d] of b.decisions.entries()) {
      if (d.module !== i + 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['decisions', i, 'module'],
          message: `decision ${i + 1} must be for Module ${i + 1}`,
        });
      }
    }
    const seen = new Set<string>();
    for (const [i, f] of b.facts.entries()) {
      if (seen.has(f.id)) {
        ctx.addIssue({ code: 'custom', path: ['facts', i, 'id'], message: `fact id ${f.id} appears twice` });
      }
      seen.add(f.id);
    }
  });
export type Brief = z.infer<typeof Brief>;

/** The stamp of a key point: its fullHash over text, concepts and evidence, and its one agent check, critic (spec 2.7). */
export const KeyPointVerified = z.strictObject({
  fullHash: z.string().regex(/^[0-9a-f]{12}$/, 'must be 12 hex characters'),
  checks: z.tuple([z.string().regex(/^critic@[1-9]\d*$/, 'must look like critic@1')]),
  on: IsoDate,
});
export type KeyPointVerified = z.infer<typeof KeyPointVerified>;

export const KeyPointStatus = z.enum(['draft', 'live', 'retired']);

export const KeyPoint = z.strictObject({
  id: z.string().regex(KEY_POINT_ID, 'must look like kp-06-lifecycle-to-deep-archive'),
  status: KeyPointStatus,
  text: z.string().min(20).max(300),
  concepts: z.array(ConceptId).min(1).max(3),
  evidence: z.string().min(1).max(400),
  verified: KeyPointVerified.optional(),
  review: Review.optional(),
});
export type KeyPoint = z.infer<typeof KeyPoint>;

/** Key points that are not retired: a file holds 4 to 6 of them (spec 6, 4 to 6 per decision). */
export const MIN_KEY_POINTS = 4;
export const MAX_KEY_POINTS = 6;

export const KeyPointFile = z
  .strictObject({ module: ModuleNumber, keyPoints: z.array(KeyPoint) })
  .superRefine((f, ctx) => {
    const open = f.keyPoints.filter((k) => k.status !== 'retired').length;
    if (open < MIN_KEY_POINTS || open > MAX_KEY_POINTS) {
      ctx.addIssue({
        code: 'custom',
        path: ['keyPoints'],
        message: `a key point file needs ${MIN_KEY_POINTS} to ${MAX_KEY_POINTS} key points that are not retired; it has ${open}`,
      });
    }
    const seen = new Set<string>();
    for (const [i, k] of f.keyPoints.entries()) {
      if (seen.has(k.id))
        ctx.addIssue({ code: 'custom', path: ['keyPoints', i, 'id'], message: `${k.id} appears twice` });
      seen.add(k.id);
      const owner = Number(KEY_POINT_ID.exec(k.id)?.[1]);
      if (owner !== f.module) {
        ctx.addIssue({
          code: 'custom',
          path: ['keyPoints', i, 'id'],
          message: `${k.id} belongs to Module ${owner}, not Module ${f.module}`,
        });
      }
    }
  });
export type KeyPointFile = z.infer<typeof KeyPointFile>;
```

Run: `pnpm test tests/unit/project-schema.test.ts 2>&1 | tail -5`

Expected: `Test Files  1 passed (1)` and `Tests  14 passed (14)`.

- [ ] **Step 4: Write the failing loader test**

Create `tests/unit/project-loader.test.ts`:

```ts
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { hash12 } from '../../scripts/content/lib/hashes.ts';
import { BRIEF_FILE, keyPointHash, projectOf } from '../../scripts/content/lib/project.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const KEY_POINTS = 'content/project/key-points/01-baking-basics.yaml';

function project(edit?: (root: string) => void) {
  const root = makeFixtureRoot();
  edit?.(root);
  return projectOf(loadContext(root, { today: FIXTURE_TODAY }));
}
const errors = (edit: (root: string) => void): string[] =>
  project(edit).errors.map((f) => `${f.rule} ${f.file}:${f.line ?? '-'} ${f.message}`);

describe('projectOf', () => {
  it('loads the fixture brief and key points with no errors', () => {
    const p = project();
    expect(p.errors).toEqual([]);
    expect(p.brief?.title).toBe('Move the bakery to the shared kitchen');
    expect(p.brief?.decisions).toHaveLength(13);
    expect(p.keyPoints.map((e) => [e.kp.id, e.module, e.index, e.line])).toEqual([
      ['kp-01-borrow-on-busy-days', 1, 0, 4],
      ['kp-01-pay-only-while-proofing', 1, 1, 13],
      ['kp-01-give-capacity-back', 1, 2, 18],
      ['kp-01-name-the-billing-term', 1, 3, 23],
    ]);
    expect(p.keyPoints.every((e) => e.path === KEY_POINTS)).toBe(true);
  });

  it('lists every brief string and key point text with its line', () => {
    const p = project();
    expect(p.strings).toContainEqual({
      path: BRIEF_FILE,
      line: 2,
      field: 'title',
      text: 'Move the bakery to the shared kitchen',
    });
    expect(p.strings).toContainEqual({
      path: BRIEF_FILE,
      line: 23,
      field: 'decisions[0].context[0]',
      text: 'The bakery runs one branch today.',
    });
    expect(p.strings).toContainEqual({
      path: KEY_POINTS,
      line: 6,
      field: 'kp-01-borrow-on-busy-days',
      text: 'The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.',
    });
    expect(p.strings.filter((s) => s.path === KEY_POINTS)).toHaveLength(4);
  });

  it('loads once per context', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(projectOf(ctx)).toBe(projectOf(ctx));
  });

  it('treats a missing brief as no project', () => {
    const p = project((root) => rmSync(join(root, 'content', 'project'), { recursive: true }));
    expect(p).toEqual({ brief: null, keyPoints: [], strings: [], errors: [] });
  });

  it('reports a YAML error at its line', () => {
    expect(errors((root) => replaceIn(root, KEY_POINTS, 'module: 1', 'module: [1'))).toEqual([
      expect.stringMatching(/^R1 content\/project\/key-points\/01-baking-basics\.yaml:\d+ YAML: /),
    ]);
  });

  it('reports a schema error at the line of its key point', () => {
    expect(errors((root) => replaceIn(root, KEY_POINTS, 'status: draft', 'status: ready'))).toEqual([
      `R1 ${KEY_POINTS}:14 keyPoints.1.status: Invalid option: expected one of "draft"|"live"|"retired"`,
    ]);
  });

  it('reports a brief with 12 decisions at the decisions list', () => {
    const found = errors((root) => {
      const file = join(root, BRIEF_FILE);
      writeFileSync(file, readFileSync(file, 'utf8').replace(/ {2}- module: 13\n[\s\S]*?(?=rubric:)/, ''));
    });
    expect(found).toEqual([
      `R1 ${BRIEF_FILE}:19 decisions: Too small: expected array to have exactly 13 items`,
    ]);
  });

  it('reports a file whose name prefix differs from its module', () => {
    expect(errors((root) => replaceIn(root, KEY_POINTS, 'module: 1', 'module: 2'))).toEqual([
      `R1 ${KEY_POINTS}:2 module 2 must match the file name prefix 01`,
    ]);
  });

  it('reports a second file for one module and a stray file', () => {
    const found = errors((root) => {
      writeFileSync(join(root, 'content/project/key-points/01-again.yaml'), 'module: 1\nkeyPoints: []\n');
      writeFileSync(join(root, 'content/project/notes.md'), '# Notes\n');
    });
    expect(found).toContainEqual(
      expect.stringMatching(
        /^R1 content\/project\/key-points\/01-[a-z-]+\.yaml:- a second key point file for Module 1; keep one file per module$/,
      ),
    );
    expect(found).toContain(
      'R1 content/project/notes.md:- content/project holds brief.yaml and key-points/NN-module-dir.yaml files only',
    );
  });
});

describe('keyPointHash', () => {
  it('hashes text, concepts and evidence only', () => {
    const kp = project().keyPoints[0]?.kp;
    if (kp === undefined) throw new Error('no fixture key point');
    expect(keyPointHash(kp)).toBe(hash12({ text: kp.text, concepts: kp.concepts, evidence: kp.evidence }));
    expect(keyPointHash(kp)).toBe(kp.verified?.fullHash);
    expect(keyPointHash({ ...kp, concepts: ['per-minute-rental'] })).not.toBe(kp.verified?.fullHash);
  });
});
```

Run: `pnpm test tests/unit/project-loader.test.ts 2>&1 | grep -E "^Error|Test Files|Tests "`

Expected: FAIL with `Error: Cannot find module '../../scripts/content/lib/project.ts'` and `Test Files  1 failed (1)`.

- [ ] **Step 5: Write the loader**

Create `scripts/content/lib/project.ts`:

```ts
/**
 * The capstone project loader (spec 6): content/project/brief.yaml and the per-module key point files, read once per
 * context and shared by every rule that checks them. The brief is optional here, so a tree with no project has no
 * project findings; tests/unit/project-content.test.ts requires it in the real repo.
 */
import { type Document, isMap, isNode, isScalar, isSeq, LineCounter, parseDocument } from 'yaml';
import type { z } from 'zod';
import { Brief, type KeyPoint, KeyPointFile } from '../../../schemas/project.ts';
import type { Context, Finding } from './context.ts';
import { evidenceForm, noteLines } from './evidence.ts';
import { hash12 } from './hashes.ts';

export const PROJECT_DIR = 'content/project';
export const BRIEF_FILE = 'content/project/brief.yaml';
export const KEY_POINT_FILE = /^content\/project\/key-points\/(\d{2})-[a-z0-9-]+\.yaml$/;

/** One key point with where it sits: its file, the 1-based line of its list item and its index in the list. */
export interface KeyPointEntry {
  path: string;
  line: number;
  index: number;
  module: number;
  kp: KeyPoint;
}

/** One string of the project as R8 reads it: every brief string by field path, and each key point text by id. */
export interface ProjectString {
  path: string;
  line: number;
  field: string;
  text: string;
}

export interface Project {
  brief: Brief | null;
  keyPoints: readonly KeyPointEntry[];
  strings: readonly ProjectString[];
  errors: readonly Finding[];
}

const cache = new WeakMap<Context, Project>();

/** The fullHash a key point's stamp binds: the text, concepts and evidence the critic saw (spec 2.7). */
export function keyPointHash(kp: Pick<KeyPoint, 'text' | 'concepts' | 'evidence'>): string {
  return hash12({ text: kp.text, concepts: kp.concepts, evidence: kp.evidence });
}

/** The 1-based line of the deepest node on `path` that the document holds, or of the document start. */
function lineAt(doc: Document.Parsed, counter: LineCounter, path: readonly PropertyKey[]): number {
  for (let n = path.length; n >= 0; n--) {
    const node = n === 0 ? doc.contents : doc.getIn(path.slice(0, n), true);
    if (isNode(node) && node.range) return counter.linePos(node.range[0]).line;
  }
  return 1;
}

/** Every string scalar under `node`, labelled with its field path, such as decisions[0].context[1]. */
function stringsOf(
  node: unknown,
  field: string,
  path: string,
  counter: LineCounter,
  out: ProjectString[],
): void {
  if (isMap(node)) {
    for (const pair of node.items) {
      const key = isScalar(pair.key) ? String(pair.key.value) : '?';
      stringsOf(pair.value, field === '' ? key : `${field}.${key}`, path, counter, out);
    }
  } else if (isSeq(node)) {
    for (const [i, item] of node.items.entries()) stringsOf(item, `${field}[${i}]`, path, counter, out);
  } else if (isScalar(node) && typeof node.value === 'string' && node.range) {
    out.push({ path, line: counter.linePos(node.range[0]).line, field, text: node.value });
  }
}

/** A parsed project file: its YAML document and the line counter that maps its offsets to lines. */
interface ParsedYaml {
  doc: Document.Parsed;
  counter: LineCounter;
}

/** Parses one YAML file of the project; null on a YAML error, which it reports at its line. */
function parseFile(path: string, text: string, errors: Finding[]): ParsedYaml | null {
  const counter = new LineCounter();
  const doc = parseDocument(text, { lineCounter: counter });
  const [yamlError] = doc.errors;
  if (yamlError === undefined) return { doc, counter };
  const line = counter.linePos(yamlError.pos[0]).line;
  errors.push({ rule: 'R1', file: path, line, message: `YAML: ${yamlError.message}` });
  return null;
}

/** Checks a parsed file against its schema, reporting each issue at the line of the deepest node on its path. */
function check<T>(path: string, file: ParsedYaml, schema: z.ZodType<T>, errors: Finding[]): T | null {
  const parsed = schema.safeParse(file.doc.toJS());
  if (parsed.success) return parsed.data;
  for (const issue of parsed.error.issues) {
    const where = issue.path.map(String).join('.') || '(root)';
    const line = lineAt(file.doc, file.counter, issue.path);
    errors.push({ rule: 'R1', file: path, line, message: `${where}: ${issue.message}` });
  }
  return null;
}

/** The project of a context, loaded on first use: the brief, every key point with its line, the strings, R1 findings. */
export function projectOf(ctx: Context): Project {
  const hit = cache.get(ctx);
  if (hit !== undefined) return hit;
  const errors: Finding[] = [];
  const strings: ProjectString[] = [];
  const keyPoints: KeyPointEntry[] = [];
  const modules = new Set<number>();
  let brief: Brief | null = null;
  for (const path of ctx.files) {
    if (!path.startsWith(`${PROJECT_DIR}/`)) continue;
    const text = ctx.read(path);
    if (text === null) continue;
    if (path === BRIEF_FILE) {
      const file = parseFile(path, text, errors);
      if (file === null) continue;
      brief = check(path, file, Brief, errors);
      if (brief !== null) stringsOf(file.doc.contents, '', path, file.counter, strings);
      continue;
    }
    const match = KEY_POINT_FILE.exec(path);
    if (match === null) {
      errors.push({
        rule: 'R1',
        file: path,
        message: 'content/project holds brief.yaml and key-points/NN-module-dir.yaml files only',
      });
      continue;
    }
    const prefix = Number(match[1]);
    if (modules.has(prefix)) {
      errors.push({
        rule: 'R1',
        file: path,
        message: `a second key point file for Module ${prefix}; keep one file per module`,
      });
      continue;
    }
    modules.add(prefix);
    const file = parseFile(path, text, errors);
    if (file === null) continue;
    const declared = file.doc.get('module');
    if (typeof declared === 'number' && declared !== prefix) {
      errors.push({
        rule: 'R1',
        file: path,
        line: lineAt(file.doc, file.counter, ['module']),
        message: `module ${declared} must match the file name prefix ${match[1]}`,
      });
      continue;
    }
    const data = check(path, file, KeyPointFile, errors);
    if (data === null) continue;
    for (const [index, kp] of data.keyPoints.entries()) {
      const line = lineAt(file.doc, file.counter, ['keyPoints', index]);
      keyPoints.push({ path, line, index, module: prefix, kp });
      strings.push({
        path,
        line: lineAt(file.doc, file.counter, ['keyPoints', index, 'text']),
        field: kp.id,
        text: kp.text,
      });
    }
  }
  const project: Project = { brief, keyPoints, strings, errors };
  cache.set(ctx, project);
  return project;
}

/**
 * Whether a key point's evidence is a whole line of the home note of one of its concepts, each concept found by id or
 * alias (spec 2.9, R5); null when none of its concepts resolves to a loaded note, which R6 reports.
 */
export function evidenceHolds(ctx: Context, kp: Pick<KeyPoint, 'concepts' | 'evidence'>): boolean | null {
  const form = evidenceForm(kp.evidence);
  let found = false;
  for (const id of kp.concepts) {
    const concept = ctx.concepts.find((c) => c.id === id || (c.aliases ?? []).includes(id));
    const note = concept === undefined ? undefined : ctx.notes.find((n) => n.id === concept.home);
    if (note === undefined) continue;
    found = true;
    if (noteLines(note).has(form)) return true;
  }
  return found ? false : null;
}
```

Run: `pnpm test tests/unit/project-loader.test.ts 2>&1 | tail -5`

Expected: `Test Files  1 passed (1)` and `Tests  10 passed (10)`.

- [ ] **Step 6: Write the failing rule tests and bad fixtures**

Create `tests/unit/project-rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { RuleId } from '../../schemas/validate-config.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const BRIEF = 'content/project/brief.yaml';
const KEY_POINTS = 'content/project/key-points/01-baking-basics.yaml';
const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const LIVE_EVIDENCE = 'evidence: Branches use ovens from one central kitchen when their queues grow.';

/** One rule's findings as `<line> <message>` after edits to fixture files, each edit `[file, from, to]`. */
function run(rule: RuleId, edits: [string, string, string][] = []): string[] {
  const root = makeFixtureRoot();
  for (const [file, from, to] of edits) replaceIn(root, file, from, to);
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  return runRules(ctx, [rule]).findings.map((f) => `${f.file}:${f.line ?? '-'} ${f.message}`);
}

describe('the project in R1', () => {
  it('passes the fixture brief and key points', () => {
    expect(run('R1')).toEqual([]);
  });

  it('reports a brief with a decision out of order', () => {
    expect(run('R1', [[BRIEF, '  - module: 2\n', '  - module: 3\n']])).toContain(
      `${BRIEF}:25 decisions.1.module: decision 2 must be for Module 2`,
    );
  });

  it('reports a key point id from another module', () => {
    expect(run('R1', [[KEY_POINTS, 'id: kp-01-give-capacity-back', 'id: kp-02-give-capacity-back']])).toEqual(
      [`${KEY_POINTS}:18 keyPoints.2.id: kp-02-give-capacity-back belongs to Module 2, not Module 1`],
    );
  });
});

describe('key point evidence in R5', () => {
  it('passes the live fixture key point', () => {
    expect(run('R5')).toEqual([]);
  });

  it('reports a live key point whose evidence is not a whole line of a concept home note', () => {
    expect(run('R5', [[KEY_POINTS, LIVE_EVIDENCE, `${LIVE_EVIDENCE.slice(0, -1)} fast.`]])).toEqual([
      `${KEY_POINTS}:4 kp-01-borrow-on-busy-days: evidence is not a whole line of the home note of any of its concepts`,
    ]);
  });

  it('follows the note when a cited line changes', () => {
    expect(
      run('R5', [
        [
          LESSON,
          '- Branches use ovens from one central kitchen',
          '- Branches borrow ovens from one central kitchen',
        ],
      ]).filter((f) => f.startsWith(KEY_POINTS)),
    ).toEqual([
      `${KEY_POINTS}:4 kp-01-borrow-on-busy-days: evidence is not a whole line of the home note of any of its concepts`,
    ]);
  });

  it('skips drafts', () => {
    expect(
      run('R5', [
        [KEY_POINTS, 'evidence: Cabinets are billed only while dough proofs.', 'evidence: Not in the note.'],
      ]),
    ).toEqual([]);
  });

  it('resolves a concept by its alias', () => {
    expect(
      run('R5', [
        ['content/concepts.yaml', '  tasks: ["1.1"]\n', '  tasks: ["1.1"]\n  aliases: [central-ovens]\n'],
        [
          KEY_POINTS,
          'concepts: [shared-kitchen]\n    evidence: Branches',
          'concepts: [central-ovens]\n    evidence: Branches',
        ],
      ]),
    ).toEqual([]);
  });
});

describe('project strings in R8', () => {
  it('passes the fixture brief and key points', () => {
    expect(run('R8')).toEqual([]);
  });

  it('reports a key point text with two sentences', () => {
    expect(run('R8', [[KEY_POINTS, 'that idles all week.', 'that idles all week. It saves money.']])).toEqual(
      [`${KEY_POINTS}:6 kp-01-borrow-on-busy-days: one sentence per string`],
    );
  });

  it('reports a brief prompt with two sentences by its field', () => {
    expect(run('R8', [[BRIEF, 'from the shared kitchen.', 'from the shared kitchen. Say why.']])).toEqual([
      `${BRIEF}:21 decisions[0].prompt: one sentence per string`,
    ]);
  });

  it('reports an em dash in a key point through the whole-file scan', () => {
    expect(
      run('R8', [
        [KEY_POINTS, 'on Saturdays instead', `on Saturdays ${String.fromCharCode(0x2014)} instead`],
      ]),
    ).toEqual([`${KEY_POINTS}:6 em dash (U+2014); use a plain hyphen`]);
  });
});

describe('key point stamps in R9', () => {
  it('passes the stamped live fixture key point and skips drafts', () => {
    expect(run('R9')).toEqual([]);
  });

  it('reports a live key point with no stamp', () => {
    expect(
      run('R9', [
        [KEY_POINTS, '    status: draft\n    text: Proofing', '    status: live\n    text: Proofing'],
      ]),
    ).toEqual([
      `${KEY_POINTS}:13 kp-01-pay-only-while-proofing: live but not verified; run the key point checks and node scripts/content/key-points.ts stamp`,
    ]);
  });

  it('reports a live key point whose text changed after its stamp', () => {
    expect(run('R9', [[KEY_POINTS, 'idles all week.', 'idles every week.']])).toEqual([
      `${KEY_POINTS}:4 kp-01-borrow-on-busy-days: verified at another hash; its text, concepts or evidence changed after the critic, so re-check and re-stamp it`,
    ]);
  });
});
```

Create `tests/content/bad/r01-brief-twelve-decisions.yaml`:

```yaml
# fixture-target: content/project/brief.yaml
# R1: the brief needs 13 decisions, one per module; this one stops at 12.
title: Move the bakery to the shared kitchen
facts:
  - id: growth
    text: The bakery runs one branch today and plans four branches by next spring.
  - id: peak
    text: Saturday queues are three times longer than weekday queues.
  - id: loyalty
    text: A stamp card gives regulars a free loaf after nine loaves.
  - id: archive
    text: Recipe cards and receipts fill two filing cabinets in the back room.
  - id: pos
    text: A till in the first branch records every sale on paper rolls.
  - id: staff
    text: One baker also looks after the ovens and the till.
  - id: budget
    text: Oven rental may not cost more than the flour bill.
decisions:
  - module: 1
    title: Ovens for the first branch
    prompt: Choose how the first branch borrows ovens from the shared kitchen.
    context:
      - The bakery runs one branch today.
      - Saturday queues are three times longer than weekday queues.
  - module: 2
    title: Proofing cabinets
    prompt: Choose how the bakery rents proofing cabinets for its dough.
    context:
      - Dough proofs for about an hour.
      - Oven rental may not cost more than the flour bill.
  - module: 3
    title: Delivery bikes
    prompt: Decide which deliveries the bakery hands to a courier service.
    context:
      - Regulars order loaves for the morning.
      - One baker also looks after the ovens and the till.
  - module: 4
    title: Second town
    prompt: Choose where the branch in the second town buys its flour.
    context:
      - The bakery plans four branches by next spring.
      - The second town sits across the river.
  - module: 5
    title: Kitchen doors
    prompt: Decide which doors of the shared kitchen stay locked at night.
    context:
      - Bakers arrive before dawn.
      - The back room holds the filing cabinets.
  - module: 6
    title: Filing cabinets
    prompt: Choose where old recipe cards and receipts are kept.
    context:
      - Recipe cards and receipts fill two filing cabinets.
      - Old receipts are rarely read.
  - module: 7
    title: Order book
    prompt: Choose how the bakery keeps its book of standing orders.
    context:
      - Regulars order the same loaves every week.
      - The till records every sale on paper rolls.
  - module: 8
    title: Sales tally
    prompt: Decide how the bakery counts which loaves sell on which day.
    context:
      - Saturday queues are three times longer than weekday queues.
      - The owner wants fewer unsold loaves.
  - module: 9
    title: Kitchen keys
    prompt: Decide who holds a key to the shared kitchen and the till.
    context:
      - One baker also looks after the ovens and the till.
      - New branches bring new bakers.
  - module: 10
    title: Oven log
    prompt: Choose how the bakery notices an oven that runs too hot.
    context:
      - Bakers arrive before dawn.
      - A burnt batch wastes a morning of flour.
  - module: 11
    title: Flour budget
    prompt: Decide how the bakery keeps oven rental under the flour bill.
    context:
      - Oven rental may not cost more than the flour bill.
      - Saturday rentals cost the most.
  - module: 12
    title: Moving the till
    prompt: Choose how the paper till rolls move into the shared kitchen ledger.
    context:
      - A till in the first branch records every sale on paper rolls.
      - The branch cannot close on a Saturday.
rubric:
  passTotal: 8
  criteria:
    - id: fit
      name: Fit
      levels:
        - Ignores the brief
        - Meets some constraints
        - Meets every main constraint
        - Also meets edge constraints and names the course-taught reason
    - id: grounding
      name: Grounding
      levels:
        - No course concepts, or wrong ones
        - 1 concept used correctly
        - 2 or more used correctly
        - Also compared against the rejected option
    - id: tradeoffs
      name: Trade-offs
      levels:
        - None
        - Names a cost or a limit
        - Adds a mitigation
        - Adds the cost or responsibility impact
    - id: cost
      name: Cost and responsibility
      levels:
        - Missing
        - Mentioned vaguely
        - Pricing model or responsibility split stated
        - Both stated, and they match earlier ADRs
```

Create `tests/content/bad/r05-key-point-evidence.yaml`:

```yaml
# fixture-target: content/project/key-points/01-baking-basics.yaml
# R5: the live key point cites a line its concept's home note does not hold.
module: 1
keyPoints:
  - id: kp-01-borrow-on-busy-days
    status: live
    text: The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.
    concepts: [shared-kitchen]
    evidence: Branches buy a second oven when their queues grow.
    verified:
      fullHash: 54bf2496a4d7
      checks: [critic@1]
      on: "2026-10-10"
  - id: kp-01-pay-only-while-proofing
    status: draft
    text: Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.
    concepts: [per-minute-rental]
    evidence: Cabinets are billed only while dough proofs.
  - id: kp-01-give-capacity-back
    status: draft
    text: Quiet weekday mornings hand the borrowed ovens back to the shared kitchen.
    concepts: [shared-kitchen, per-minute-rental]
    evidence: Borrow capacity when busy and give it back when quiet.
  - id: kp-01-name-the-billing-term
    status: draft
    text: The plan uses the newer billing term that the bakery guide now prints.
    concepts: [per-minute-rental]
    evidence: The fixture guide names a newer billing term.
```

Create `tests/content/bad/r08-key-point-two-sentences.yaml`:

```yaml
# fixture-target: content/project/key-points/01-baking-basics.yaml
# R8: a key point text holds two sentences.
module: 1
keyPoints:
  - id: kp-01-borrow-on-busy-days
    status: live
    text: The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.
    concepts: [shared-kitchen]
    evidence: Branches use ovens from one central kitchen when their queues grow.
    verified:
      fullHash: 54bf2496a4d7
      checks: [critic@1]
      on: "2026-10-10"
  - id: kp-01-pay-only-while-proofing
    status: draft
    text: Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.
    concepts: [per-minute-rental]
    evidence: Cabinets are billed only while dough proofs.
  - id: kp-01-give-capacity-back
    status: draft
    text: Quiet weekday mornings hand the borrowed ovens back. The shared kitchen lends them to another branch.
    concepts: [shared-kitchen, per-minute-rental]
    evidence: Borrow capacity when busy and give it back when quiet.
  - id: kp-01-name-the-billing-term
    status: draft
    text: The plan uses the newer billing term that the bakery guide now prints.
    concepts: [per-minute-rental]
    evidence: The fixture guide names a newer billing term.
```

Create `tests/content/bad/r09-key-point-stamp.yaml`:

```yaml
# fixture-target: content/project/key-points/01-baking-basics.yaml
# R9: the live key point's text changed after its stamp.
module: 1
keyPoints:
  - id: kp-01-borrow-on-busy-days
    status: live
    text: The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that sits idle all week.
    concepts: [shared-kitchen]
    evidence: Branches use ovens from one central kitchen when their queues grow.
    verified:
      fullHash: 54bf2496a4d7
      checks: [critic@1]
      on: "2026-10-10"
  - id: kp-01-pay-only-while-proofing
    status: draft
    text: Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.
    concepts: [per-minute-rental]
    evidence: Cabinets are billed only while dough proofs.
  - id: kp-01-give-capacity-back
    status: draft
    text: Quiet weekday mornings hand the borrowed ovens back to the shared kitchen.
    concepts: [shared-kitchen, per-minute-rental]
    evidence: Borrow capacity when busy and give it back when quiet.
  - id: kp-01-name-the-billing-term
    status: draft
    text: The plan uses the newer billing term that the bakery guide now prints.
    concepts: [per-minute-rental]
    evidence: The fixture guide names a newer billing term.
```

Run: `pnpm test tests/unit/project-rules.test.ts tests/content/bad.test.ts 2>&1 | grep -E "Test Files|Tests "`

Expected: `Test Files  2 failed (2)` and `Tests  12 failed | 32 passed (44)`: the 8 rule cases that need a finding and the 4 new bad fixtures fail, while the cases that expect no finding already pass.

- [ ] **Step 7: Check the project in R1, R5, R8 and R9**

Replace `scripts/content/rules/r01-schema.ts` with:

```ts
import { projectOf } from '../lib/project.ts';
import type { Rule } from './rule.ts';

/** R1 Schema: every content file parses and matches its zod schema; the loaders collect these findings. */
export const r01: Rule = {
  id: 'R1',
  title: 'Schema',
  run: (ctx) => [...ctx.loadErrors, ...projectOf(ctx).errors],
};
```

Replace `scripts/content/rules/r05-evidence.ts` with:

```ts
import type { Finding } from '../lib/context.ts';
import { evidenceForm, noteLines } from '../lib/evidence.ts';
import { evidenceHolds, projectOf } from '../lib/project.ts';
import { finding, type Rule } from './rule.ts';

/**
 * R5 Evidence: each evidence line of a live question is a whole line of its cited note, and the evidence line of a live
 * key point is a whole line of the home note of one of its concepts, compared case-sensitively.
 */
export const r05: Rule = {
  id: 'R5',
  title: 'Evidence',
  run(ctx) {
    const out: Finding[] = [];
    const cache = new Map<string, Map<string, number>>();
    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status !== 'live') continue;
      // R6 reports a note that does not exist.
      const note = ctx.notes.find((n) => n.id === q.note);
      if (note === undefined) continue;
      const lines = cache.get(note.id) ?? noteLines(note);
      cache.set(note.id, lines);
      for (const line of q.evidence) {
        if (!lines.has(evidenceForm(line))) {
          out.push(
            finding(
              'R5',
              entry.path,
              `${q.id}: evidence is not a whole line of ${q.note}: "${line}"`,
              entry.line,
            ),
          );
        }
      }
    }
    for (const { path, line, kp } of projectOf(ctx).keyPoints) {
      // R6 reports a concept that resolves to no note, so only a definite miss is an R5 finding.
      if (kp.status !== 'live' || evidenceHolds(ctx, kp) !== false) continue;
      out.push(
        finding(
          'R5',
          path,
          `${kp.id}: evidence is not a whole line of the home note of any of its concepts`,
          line,
        ),
      );
    }
    return out;
  },
};
```

Replace `scripts/content/rules/r08-style.ts` with:

```ts
import type { Finding, Note } from '../lib/context.ts';
import { projectOf } from '../lib/project.ts';
import { emDashLines, multiSentenceLines } from '../lib/text.ts';
import { finding, type Rule } from './rule.ts';

const LESSON_KEYS = ['module', 'lesson', 'slug', 'title', 'source', 'concepts'];
const MODULE_KEYS = ['module', 'slug', 'title', 'source', 'lessons', 'assessment_questions'];
const LESSON_REQUIRED = ['Objectives', 'Notes', 'Key takeaways', 'Terms'];
const LESSON_ORDER = ['Objectives', 'Notes', 'Visuals', 'Key takeaways', 'Scenarios', 'Terms'];
const MODULE_ORDER = [
  'What this module covers',
  'Lessons',
  'Key takeaways',
  'What the assessment focuses on',
  'Summary',
  'Further reading',
];
const BINARY = /\.(?:png|jpe?g|gif|ico|webp|woff2?|pdf|zip)$/i;

/**
 * R8 Markdown style: no em dash anywhere, one sentence per line in Markdown, one sentence per brief string and key point
 * text, and the note structure of lint_notes.py.
 */
export const r08: Rule = {
  id: 'R8',
  title: 'Markdown style',
  run(ctx) {
    const out: Finding[] = [];
    for (const file of ctx.files) {
      if (file.startsWith('tests/content/bad/') || BINARY.test(file)) continue;
      const text = ctx.read(file);
      if (text === null) continue;
      for (const line of emDashLines(text))
        out.push(finding('R8', file, 'em dash (U+2014); use a plain hyphen', line));
      if (!file.endsWith('.md')) continue;
      for (const line of multiSentenceLines(text))
        out.push(finding('R8', file, 'more than one sentence on this line', line));
    }
    for (const s of projectOf(ctx).strings) {
      if (multiSentenceLines(s.text.replaceAll('\n', ' ')).length > 0)
        out.push(finding('R8', s.path, `${s.field}: one sentence per string`, s.line));
    }
    for (const note of ctx.notes) out.push(...structure(note));
    return out;
  },
};

function structure(note: Note): Finding[] {
  const out: Finding[] = [];
  const keys = note.kind === 'lesson' ? LESSON_KEYS : MODULE_KEYS;
  for (const key of keys) {
    if (!note.keys.includes(key)) out.push(finding('R8', note.path, `frontmatter is missing '${key}'`, 1));
  }
  const order = note.kind === 'lesson' ? LESSON_ORDER : MODULE_ORDER;
  const required = note.kind === 'lesson' ? LESSON_REQUIRED : MODULE_ORDER;
  const sections = note.headings.filter((h) => h.depth === 2);
  const names = sections.map((h) => h.text);
  for (const name of required) {
    if (!names.includes(name)) out.push(finding('R8', note.path, `missing section '## ${name}'`));
  }
  for (const h of sections) {
    if (!order.includes(h.text))
      out.push(finding('R8', note.path, `unexpected section '## ${h.text}'`, h.line));
  }
  const known = names.filter((name) => order.includes(name));
  const sorted = [...known].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (known.join('|') !== sorted.join('|')) {
    out.push(finding('R8', note.path, `sections out of order: ${known.join(', ')}`));
  }
  return out;
}
```

Replace `scripts/content/rules/r09-verified.ts` with:

```ts
import { CHECK_NAMES } from '../../../schemas/question.ts';
import type { Finding } from '../lib/context.ts';
import { fullHash, keyHash } from '../lib/hashes.ts';
import { keyPointHash, projectOf } from '../lib/project.ts';
import { finding, type Rule } from './rule.ts';

/**
 * R9 Verified: a live question carries a stamp from pnpm content:stamp at its current hashes, naming all three checks,
 * and a live key point carries a stamp from the key point stamp at its current fullHash (its schema allows only critic).
 */
export const r09: Rule = {
  id: 'R9',
  title: 'Verified',
  run(ctx) {
    const out: Finding[] = [];
    for (const entry of ctx.questions) {
      const { q } = entry;
      if (q.status !== 'live') continue;
      const report = (message: string): void => {
        out.push(finding('R9', entry.path, `${q.id}: ${message}`, entry.line));
      };
      const { verified } = q;
      if (verified === undefined) {
        report('live but not verified; run the checks and pnpm content:stamp');
        continue;
      }
      if (verified.keyHash !== keyHash(q) || verified.fullHash !== fullHash(q)) {
        report('verified at other hashes; its text changed after the checks, so re-check and re-stamp it');
      }
      const names = verified.checks.map((check) => check.split('@')[0] ?? '').sort();
      if (names.join(',') !== [...CHECK_NAMES].sort().join(',')) {
        report('verified checks must name solve-closed, solve-notes and critic');
      }
    }
    for (const { path, line, kp } of projectOf(ctx).keyPoints) {
      if (kp.status !== 'live') continue;
      if (kp.verified === undefined) {
        out.push(
          finding(
            'R9',
            path,
            `${kp.id}: live but not verified; run the key point checks and node scripts/content/key-points.ts stamp`,
            line,
          ),
        );
      } else if (kp.verified.fullHash !== keyPointHash(kp)) {
        out.push(
          finding(
            'R9',
            path,
            `${kp.id}: verified at another hash; its text, concepts or evidence changed after the critic, so re-check and re-stamp it`,
            line,
          ),
        );
      }
    }
    return out;
  },
};
```

Run:

```bash
pnpm test tests/unit/project-schema.test.ts tests/unit/project-loader.test.ts tests/unit/project-rules.test.ts tests/unit/r05.test.ts tests/unit/r08.test.ts tests/unit/r09.test.ts tests/content/bad.test.ts 2>&1 | grep -E "Test Files|Tests "
pnpm --silent content:validate
```

Expected: `Test Files  7 passed (7)` and `Tests  80 passed (80)`, then `content:validate: 13 rules, 0 findings`, since the real repo has no `content/project/` yet.

- [ ] **Step 8: Typecheck and lint**

Run: `pnpm lint:fix && pnpm typecheck && pnpm lint`

Expected: `tsc --noEmit` prints nothing and Biome prints `No fixes applied.`

- [ ] **Step 9: Commit**

```bash
git add schemas/project.ts scripts/content/lib/project.ts scripts/content/rules/r01-schema.ts scripts/content/rules/r05-evidence.ts scripts/content/rules/r08-style.ts scripts/content/rules/r09-verified.ts tests/fixtures/content-root/content/project/brief.yaml tests/fixtures/content-root/content/project/key-points/01-baking-basics.yaml tests/content/bad/r01-brief-twelve-decisions.yaml tests/content/bad/r05-key-point-evidence.yaml tests/content/bad/r08-key-point-two-sentences.yaml tests/content/bad/r09-key-point-stamp.yaml tests/unit/project-schema.test.ts tests/unit/project-loader.test.ts tests/unit/project-rules.test.ts
git commit -m "Add the capstone schemas and check key points in R1, R5, R8 and R9" -m "The brief and the per-module key point files get zod schemas and a loader the rules share; key point evidence, style and stamps are checked like questions."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 5: The capstone brief

**Depends on:** Task 4.
**Covers:** P6-025 to P6-039, P6-048 to P6-054.

**Files:**
- Create: `content/project/brief.yaml`
- Test: `tests/unit/project-content.test.ts`

Design notes:
- The brief is our own fiction (spec 6): its 7 facts carry the spec's numbers, its 13 prompts are original one-sentence rewrites of the decision table, and its 2 to 4 `context` sentences per decision are drawn from the facts and prefill the ADR `Context` heading (P6-048).
- The brief lists no course options per decision, because the rubric, not a hint list, grades the options (P6-049).
- The rubric's criterion names and 16 level texts are spec text, copied word for word, and `passTotal` is 8.
- One agent writes this file at a time (spec 2.7), and key points live in Task 7's per-module files, a deliberate deviation from spec 1.2 that Task 19 records.
- Every string is one sentence with no em dash, so R8 passes and the export of Task 8 can print each one on its own line; decision 11 asks for a Support plan by its current name, and no string names a retired plan.
- No sentence comes from the course: the implementer writes from spec lines 896 to 944 only, and Task 11's R7 later checks every brief string for a 9-word run against every module.

- [ ] **Step 1: Write the failing content test**

Create `tests/unit/project-content.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { Brief } from '../../schemas/project.ts';
import { emDashLines, multiSentenceLines } from '../../scripts/content/lib/text.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const text = readFileSync(join(ROOT, 'content', 'project', 'brief.yaml'), 'utf8');
const brief = Brief.parse(parse(text));

/** Every string the brief holds, depth first. */
function stringsIn(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(stringsIn);
  return [];
}

describe('the capstone brief (spec 6)', () => {
  it('is titled after the spec', () => {
    expect(brief.title).toBe('Move the cafe to the cloud');
  });

  it('holds the 13 decisions in module order with their card titles', () => {
    expect(brief.decisions.map((d) => `${d.module} ${d.title}`)).toEqual([
      '1 Deployment model and shared responsibility',
      '2 Compute for online ordering',
      '3 Serverless and containers',
      '4 Regions, edge and repeatable infrastructure',
      '5 Network layout and shop connections',
      '6 Storage classes and lifecycle',
      '7 Databases and caching',
      '8 Analytics and an AI feature',
      '9 Identity, encryption and edge protection',
      '10 Monitoring, audit and governance',
      '11 Cost, budgets and Support plan',
      '12 Migration strategies and data transfer',
      '13 Well-Architected review',
    ]);
  });

  it('carries every number of the spec brief in its facts', () => {
    const facts = new Map(brief.facts.map((f) => [f.id, f.text] as const));
    expect([...facts.keys()]).toEqual(['growth', 'peak', 'loyalty', 'archive', 'pos', 'staff', 'budget']);
    expect(facts.get('growth')).toContain('12');
    expect(facts.get('growth')).toContain('abroad');
    for (const n of ['10 times', '07:00', '09:00']) expect(facts.get('peak')).toContain(n);
    for (const n of ['2 TB', '7 years']) expect(facts.get('archive')).toContain(n);
    expect(facts.get('budget')).toContain('$300');
  });

  it('holds the spec rubric word for word', () => {
    expect(brief.rubric.passTotal).toBe(8);
    expect(brief.rubric.criteria.map((c) => [c.id, c.name, ...c.levels])).toEqual([
      [
        'fit',
        'Fit',
        'Ignores the brief',
        'Meets some constraints',
        'Meets every main constraint',
        'Also meets edge constraints and names the course-taught reason',
      ],
      [
        'grounding',
        'Grounding',
        'No course concepts, or wrong ones',
        '1 concept used correctly',
        '2 or more used correctly',
        'Also compared against the rejected option',
      ],
      [
        'tradeoffs',
        'Trade-offs',
        'None',
        'Names a cost or a limit',
        'Adds a mitigation',
        'Adds the cost or responsibility impact',
      ],
      [
        'cost',
        'Cost and responsibility',
        'Missing',
        'Mentioned vaguely',
        'Pricing model or responsibility split stated',
        'Both stated, and they match earlier ADRs',
      ],
    ]);
  });

  it('keeps every string to one sentence with no em dash', () => {
    const bad = stringsIn(brief).filter((s) => emDashLines(s).length > 0 || multiSentenceLines(s).length > 0);
    expect(bad).toEqual([]);
    expect(emDashLines(text)).toEqual([]);
  });

  it('uses only the exam guide current Support plan names', () => {
    const old = /\bDeveloper Support\b|\bBusiness Support\b(?!\+)|\bEnterprise On-Ramp\b/;
    expect(stringsIn(brief).filter((s) => old.test(s))).toEqual([]);
  });
});
```

Run: `pnpm test tests/unit/project-content.test.ts 2>&1 | grep -E "^Error|Test Files|Tests "`

Expected: FAIL with `Error: ENOENT: no such file or directory, open '.../content/project/brief.yaml'` and `Test Files  1 failed (1)`.

- [ ] **Step 2: Write the brief**

Create `content/project/brief.yaml`:

```yaml
# The capstone brief (spec 6): our own fiction, with the 13 decision prompts, their prefilled context and the rubric.
# Key points live in content/project/key-points/, one file per decision.
title: Move the cafe to the cloud
facts:
  - id: growth
    text: The cafe runs one shop today and plans 12 shops within 2 years, one of them abroad where customer data must stay in that country.
  - id: peak
    text: Online orders climb to 10 times the usual rate between 07:00 and 09:00 each morning.
  - id: loyalty
    text: A loyalty app lets regulars collect stamps and order ahead from their phones.
  - id: archive
    text: The cafe keeps 2 TB of receipts and product photos and must hold them for 7 years.
  - id: pos
    text: A point-of-sale server in the back office of the first shop records every sale.
  - id: staff
    text: One part-time IT person looks after every system the cafe runs.
  - id: budget
    text: The whole cloud bill must stay under a cap of $300 per month.
decisions:
  - module: 1
    title: Deployment model and shared responsibility
    prompt: Choose a deployment model for the cafe, name the 3 cloud benefits that matter most to it, and say where the shared responsibility line falls.
    context:
      - The cafe runs one shop today and plans 12 shops within 2 years.
      - One part-time IT person looks after every system, so less hands-on upkeep matters.
      - The whole cloud bill must stay under a cap of $300 per month.
  - module: 2
    title: Compute for online ordering
    prompt: Pick the compute for online ordering, covering the instance family, the purchase option, scaling, load balancing and queueing.
    context:
      - Online orders climb to 10 times the usual rate between 07:00 and 09:00 each morning.
      - An order that arrives during the morning rush must never be lost.
      - The whole cloud bill must stay under a cap of $300 per month.
  - module: 3
    title: Serverless and containers
    prompt: Decide which parts of the cafe's software become serverless or run in containers, and explain why.
    context:
      - The loyalty app and online ordering see short, sharp bursts of use.
      - One part-time IT person has little time to patch and update servers.
  - module: 4
    title: Regions, edge and repeatable infrastructure
    prompt: Choose a Region for the shop abroad, a way to deliver content from the edge, and a way to build the same infrastructure again for each new shop.
    context:
      - One of the 12 planned shops is abroad, and its customer data must stay in that country.
      - Customers open the loyalty app wherever they happen to be.
      - Each new shop should get the same setup without manual steps.
  - module: 5
    title: Network layout and shop connections
    prompt: Lay out the virtual network, set the stance for security groups and network access control lists, and choose how the shops connect to it.
    context:
      - The point-of-sale server in the back office must reach the cloud safely.
      - The cafe will grow from one shop to 12 shops within 2 years.
      - The ordering servers face the internet while the databases must not.
  - module: 6
    title: Storage classes and lifecycle
    prompt: Choose storage classes and lifecycle rules for receipts, product images and point-of-sale backups.
    context:
      - The cafe keeps 2 TB of receipts and product photos and must hold them for 7 years.
      - Old receipts are rarely opened once a year has passed.
      - The whole cloud bill must stay under a cap of $300 per month.
  - module: 7
    title: Databases and caching
    prompt: Pick a database for each workload of the cafe and decide where caching helps.
    context:
      - Every sale from the point-of-sale server needs a reliable record.
      - The loyalty app reads the same menu and stamp balances many times each morning.
      - Online orders climb to 10 times the usual rate between 07:00 and 09:00.
  - module: 8
    title: Analytics and an AI feature
    prompt: Design one analytics pipeline over the cafe's sales and add one AI feature that helps customers or staff.
    context:
      - Sales from every shop and from the loyalty app pile up each day.
      - The owners want to know which items sell at which hour.
      - One part-time IT person cannot run a large data platform.
  - module: 9
    title: Identity, encryption and edge protection
    prompt: Set up identities and root user protection, choose how data is encrypted, and protect the ordering site at the edge.
    context:
      - The part-time IT person and every shop manager need some access, but not the same access.
      - Receipts and loyalty records hold customer details.
      - The ordering site faces the internet during the morning rush.
  - module: 10
    title: Monitoring, audit and governance
    prompt: Choose how the cafe monitors its systems, keeps an audit trail, structures its accounts and gathers compliance evidence.
    context:
      - The part-time IT person must hear about a problem before customers do.
      - The shop abroad brings its own rules for customer data.
      - The cafe will run 12 shops within 2 years.
  - module: 11
    title: Cost, budgets and Support plan
    prompt: Estimate the monthly cost, set budgets and alerts, and pick a Support plan by its current name.
    context:
      - The whole cloud bill must stay under a cap of $300 per month.
      - The part-time IT person needs help quickly when something breaks.
      - Spending grows each time the cafe opens a new shop.
  - module: 12
    title: Migration strategies and data transfer
    prompt: Choose a migration strategy for each existing system and a method to move the cafe's data.
    context:
      - The point-of-sale server in the back office holds every sale so far.
      - The cafe keeps 2 TB of receipts and product photos.
      - The shops cannot close for long while their systems move.
  - module: 13
    title: Well-Architected review
    prompt: Review the whole design against the six Well-Architected pillars and name the top 3 fixes.
    context:
      - The earlier decisions now describe the cafe's whole design.
      - One part-time IT person must be able to run what the plan builds.
      - The whole cloud bill must stay under a cap of $300 per month.
rubric:
  passTotal: 8
  criteria:
    - id: fit
      name: Fit
      levels:
        - Ignores the brief
        - Meets some constraints
        - Meets every main constraint
        - Also meets edge constraints and names the course-taught reason
    - id: grounding
      name: Grounding
      levels:
        - No course concepts, or wrong ones
        - 1 concept used correctly
        - 2 or more used correctly
        - Also compared against the rejected option
    - id: tradeoffs
      name: Trade-offs
      levels:
        - None
        - Names a cost or a limit
        - Adds a mitigation
        - Adds the cost or responsibility impact
    - id: cost
      name: Cost and responsibility
      levels:
        - Missing
        - Mentioned vaguely
        - Pricing model or responsibility split stated
        - Both stated, and they match earlier ADRs
```

Run:

```bash
pnpm test tests/unit/project-content.test.ts 2>&1 | grep -E "Test Files|Tests "
pnpm --silent content:validate
```

Expected: `Test Files  1 passed (1)` and `Tests  6 passed (6)`, then `content:validate: 13 rules, 0 findings`.

- [ ] **Step 3: Commit**

```bash
git add content/project/brief.yaml tests/unit/project-content.test.ts
git commit -m "Add the capstone brief" -m "The cafe brief, its 13 decision prompts with prefilled context and the rubric, in content/project/brief.yaml."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 6: The key point writer, critic and check pipeline

**Depends on:** Task 4.
**Covers:** P6-042, P6-043, P6-044, P6-045, P6-046, P6-047, P6-066.

**Files:**
- Create: `agents/key-point-writer.md`, `agents/key-point-critic.md`
- Create: `scripts/content/lib/key-point-checks.ts`, `scripts/content/key-points.ts`
- Test: `tests/unit/key-point-checks.test.ts`, `tests/unit/key-point-agents.test.ts`

Design notes:
- Key points get their own prompts and pipeline, a deliberate deviation from spec 2.7, which has `question-writer` write them: Phase 4 Task 14 takes `agents/question-writer.md` to version 3 and owns `scripts/content/lib/checks.ts`, and a separate prompt leaves the running question fan-out's `critic@1` stamps untouched; Task 19 records it.
- The only agent check is `critic` (spec 2.7), so the stamp writes `checks: [ critic@N ]` with `N` the version of `agents/key-point-critic.md`; the pass key is `<id> critic@<N> <fullHash>`, so a new critic version re-checks every key point that is not stamped.
- `agentVersion` mirrors `checkVersion` of `checks.ts`, whose `name` parameter takes only the three question checks, and `KpFailure` is `Failure` without its `check`; the pipeline imports only `NEEDS_DANI_ATTEMPTS` and `PassLog` from `checks.ts` and edits nothing there.
- `prepareKeyPoints` writes `.results/key-points/prepared.json` with the hash each batched key point had when it was prepared, and `gradeKeyPoints` records passes at that hash, so a key point edited after `prepare` is never stamped on a verdict about its old text.
- `lintKpAnswers` returns `OK` or the first problem, so the critic loops on one fix at a time; `gradeKeyPoints` grades only answer files that lint `OK`, and it takes an optional `today` (an addition to the brief's signature) so tests can pin the pass date.
- The stamp never promotes a key point whose evidence fails `evidenceHolds`, so a pass on a key point with a wrong evidence line cannot make R5 fail; a draft's new failure adds one attempt to its `review` block once, and a draft at 3 attempts leaves the loop and is listed for Dani, like questions (`NEEDS_DANI_ATTEMPTS`).
- `demoteKeyPoints` moves a live key point whose evidence left its note back to draft, drops its stamp and records the reason; Task 11 wires it into `pnpm content:validate --demote` (P6-066).
- `draftProblems` and the CLI's `draft <file>` command are additions to the brief's command list: a writer needs one loop that applies R1, R5 and R8 to its drafts, because R5 checks live key points only.
- `editKeyPointFile` is the key point twin of `editQuestionFile` (which Phase 4 Task 14 edits): it splices only the edited keys, so comments and every other line stay byte for byte, and writes the checks list in flow style, `[ critic@1 ]`, as the question stamp does.
- The writer reads the decision, the facts, the concepts that `key-points.ts concepts --module NN` lists, their home notes and `content/STYLE.md`'s `## Numbers` and `## Current names`, and never the course, the fingerprints, the exam pool or `.results/`; `STYLE.md` is not edited, because Phase 4 owns it until its Task 14.
- The critic opens only its batch files, `STYLE.md` and its answer files, judges each key point on four checks (`accurate`, `grounded`, `fitsBrief`, `currentNames`), and a key point passes only when all four hold; one agent may judge up to 8 batches in turn, as the Phase 3 checkers did.
- The CLI prints key point ids and counts only, never a key point's text or a failure reason; key points are not exam items, so Dani may read them in their files, but tool output stays terse.

- [ ] **Step 1: Write the failing pipeline test**

Create `tests/unit/key-point-checks.test.ts`:

```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import {
  agentVersion,
  demoteKeyPoints,
  draftProblems,
  editKeyPointFile,
  gradeKeyPoints,
  KP_RESULTS_DIR,
  type KpBatch,
  keyPointReport,
  kpCandidates,
  lintKpAnswers,
  moduleConcepts,
  prepareKeyPoints,
  readKpFailures,
  readKpPasses,
  stampKeyPoints,
} from '../../scripts/content/lib/key-point-checks.ts';
import { keyPointHash, projectOf } from '../../scripts/content/lib/project.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';

const KEY_POINTS = 'content/project/key-points/01-baking-basics.yaml';
const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const LIVE = 'kp-01-borrow-on-busy-days';
const PROOFING = 'kp-01-pay-only-while-proofing';
const CAPACITY = 'kp-01-give-capacity-back';
const BILLING = 'kp-01-name-the-billing-term';
const DRAFTS = [PROOFING, CAPACITY, BILLING];
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** A fixture root with the key point critic prompt at version 1. */
function fixtureRoot(): string {
  const root = makeFixtureRoot();
  mkdirSync(join(root, 'agents'), { recursive: true });
  writeFileSync(
    join(root, 'agents', 'key-point-critic.md'),
    '---\nname: key-point-critic\nversion: 1\n---\n\n# Key point critic\n',
  );
  return root;
}
const ctxOf = (root: string): Context => loadContext(root, { today: FIXTURE_TODAY });
const hashOf = (root: string, id: string): string => {
  const entry = projectOf(ctxOf(root)).keyPoints.find((e) => e.kp.id === id);
  if (entry === undefined) throw new Error(`${id} is not in the fixture`);
  return keyPointHash(entry.kp);
};
const results = (root: string, ...parts: string[]): string => join(root, KP_RESULTS_DIR, ...parts);
const writeJson = (path: string, value: unknown): void => {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** Writes a key point file for one module holding `count` drafts that cite the fixture note. */
function writeDrafts(root: string, module: number, count: number): void {
  const lines = [`module: ${module}`, 'keyPoints:'];
  for (let i = 1; i <= count; i++) {
    lines.push(
      `  - id: kp-${pad2(module)}-point-${i}`,
      '    status: draft',
      `    text: Draft key point ${i} keeps decision ${module} of the bakery plan grounded.`,
      '    concepts: [shared-kitchen]',
      '    evidence: Branches use ovens from one central kitchen when their queues grow.',
    );
  }
  writeFileSync(
    join(root, `content/project/key-points/${pad2(module)}-module-${module}.yaml`),
    `${lines.join('\n')}\n`,
  );
}

/** Answers every key point of a prepared batch, failing the ids in `fail` on accuracy. */
function answer(root: string, batch: string, fail: readonly string[] = []): string {
  const file = results(root, 'batches', `${batch}.json`);
  const { keyPoints } = JSON.parse(readFileSync(file, 'utf8')) as KpBatch;
  const answers = keyPoints.map(({ id }) => ({
    id,
    accurate: !fail.includes(id),
    grounded: true,
    fitsBrief: true,
    currentNames: true,
    problems: fail.includes(id) ? ['The text overstates the saving.'] : [],
  }));
  const out = results(root, 'answers', `${batch}.json`);
  writeJson(out, { batch, answers });
  return out;
}

/** The key point maps of the fixture file by id. */
const keyPointsIn = (root: string): Map<string, Record<string, unknown>> =>
  new Map(
    (
      parse(readFileSync(join(root, KEY_POINTS), 'utf8')) as { keyPoints: Record<string, unknown>[] }
    ).keyPoints.map((k) => [k.id as string, k] as const),
  );

describe('kpCandidates', () => {
  it('takes the drafts and skips the live key point stamped at its hash', () => {
    const root = fixtureRoot();
    expect(kpCandidates(ctxOf(root), {}, []).map((e) => e.kp.id)).toEqual(DRAFTS);
  });

  it('takes a live key point whose text changed after its stamp', () => {
    const root = fixtureRoot();
    replaceIn(root, KEY_POINTS, 'idles all week.', 'idles every week.');
    expect(kpCandidates(ctxOf(root), {}, []).map((e) => e.kp.id)).toEqual([LIVE, ...DRAFTS]);
  });

  it('skips retired items, 3 attempts, a failure at the current hash and a pass at the current hash', () => {
    const root = fixtureRoot();
    replaceIn(
      root,
      KEY_POINTS,
      '    evidence: Borrow capacity when busy and give it back when quiet.\n',
      '    evidence: Borrow capacity when busy and give it back when quiet.\n    review:\n      attempts: 3\n      lastFailure: "critic: vague"\n  - id: kp-01-old-point\n    status: retired\n    text: An old point that the bakery plan no longer needs at all.\n    concepts: [shared-kitchen]\n    evidence: Branches use ovens from one central kitchen when their queues grow.\n',
    );
    const failures = [{ id: PROOFING, hash: hashOf(root, PROOFING), reason: 'too vague' }];
    const passes = { [`${BILLING} critic@1 ${hashOf(root, BILLING)}`]: FIXTURE_TODAY };
    expect(kpCandidates(ctxOf(root), passes, failures)).toEqual([]);
    expect(kpCandidates(ctxOf(root), {}, []).map((e) => e.kp.id)).toEqual([PROOFING, BILLING]);
  });
});

describe('prepareKeyPoints', () => {
  it('deals the candidates into batches of at most 10 with their decision, the facts and concept names', () => {
    const root = fixtureRoot();
    for (const m of [2, 3, 4]) writeDrafts(root, m, 6);
    const paths = prepareKeyPoints(ctxOf(root), 701);
    expect(paths).toEqual([1, 2, 3].map((n) => `${KP_RESULTS_DIR}/batches/kp-critic-0${n}.json`));
    const batches = paths.map((p) => JSON.parse(readFileSync(join(root, p), 'utf8')) as KpBatch);
    expect(batches.map((b) => b.keyPoints.length)).toEqual([10, 10, 1]);
    const all = batches.flatMap((b) => b.keyPoints);
    expect(new Set(all.map((k) => k.id)).size).toBe(21);
    const proofing = all.find((k) => k.id === PROOFING);
    expect(proofing).toEqual({
      id: PROOFING,
      module: 1,
      decision: {
        title: 'Ovens for the first branch',
        prompt: 'Choose how the first branch borrows ovens from the shared kitchen.',
        context: [
          'The bakery runs one branch today.',
          'Saturday queues are three times longer than weekday queues.',
        ],
      },
      facts: expect.arrayContaining(['One baker also looks after the ovens and the till.']),
      text: 'Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.',
      concepts: [{ id: 'per-minute-rental', name: 'Per-minute rental' }],
      evidence: 'Cabinets are billed only while dough proofs.',
    });
    expect(proofing?.facts).toHaveLength(7);
    expect(all.find((k) => k.id === 'kp-03-point-2')?.decision.title).toBe('Delivery bikes');
    const prepared = JSON.parse(readFileSync(results(root, 'prepared.json'), 'utf8')) as Record<
      string,
      Record<string, string>
    >;
    expect(prepared['kp-critic-03']).toEqual({
      [batches[2]?.keyPoints[0]?.id ?? '']: expect.stringMatching(/^[0-9a-f]{12}$/),
    });
  });

  it('orders batches by the seed and wipes old batches and answers', () => {
    const root = fixtureRoot();
    for (const m of [2, 3]) writeDrafts(root, m, 6);
    const read = (): string[] =>
      prepareKeyPoints(ctxOf(root), 702).map((p) => readFileSync(join(root, p), 'utf8'));
    writeJson(results(root, 'answers', 'kp-critic-09.json'), { batch: 'kp-critic-09', answers: [] });
    const first = read();
    expect(read()).toEqual(first);
    expect(existsSync(results(root, 'answers', 'kp-critic-09.json'))).toBe(false);
  });

  it('refuses to prepare without a brief', () => {
    const root = fixtureRoot();
    replaceIn(root, 'content/project/brief.yaml', 'passTotal: 8', 'passTotal: 9');
    expect(() => prepareKeyPoints(ctxOf(root), 703)).toThrow(
      'content/project/brief.yaml is missing or fails R1; fix it before preparing key point batches',
    );
  });
});

describe('lintKpAnswers', () => {
  it('prints OK for a complete answer file', () => {
    const root = fixtureRoot();
    prepareKeyPoints(ctxOf(root), 701);
    expect(lintKpAnswers(root, answer(root, 'kp-critic-01', [CAPACITY]))).toBe('OK');
  });

  it('names the first problem', () => {
    const root = fixtureRoot();
    prepareKeyPoints(ctxOf(root), 701);
    const file = results(root, 'answers', 'kp-critic-01.json');
    const yes = { accurate: true, grounded: true, fitsBrief: true, currentNames: true, problems: [] };
    const lint = (answers: unknown[], batch = 'kp-critic-01', at = file): string => {
      writeJson(at, { batch, answers });
      return lintKpAnswers(root, at);
    };
    expect(
      lint([
        { id: PROOFING, ...yes },
        { id: CAPACITY, ...yes },
      ]),
    ).toBe(`kp-critic-01: no answer for ${BILLING}`);
    expect(lint([{ id: PROOFING, ...yes, grounded: false }])).toBe(
      `kp-critic-01: ${PROOFING}: name each problem in problems when a check is false`,
    );
    expect(lint([{ id: 'kp-01-nope', ...yes }])).toBe('kp-critic-01: kp-01-nope is not in this batch');
    expect(
      lint([
        { id: PROOFING, ...yes },
        { id: PROOFING, ...yes },
      ]),
    ).toBe(`kp-critic-01: ${PROOFING} is answered twice`);
    expect(lint([{ id: PROOFING, ...yes, solid: true }])).toBe(
      `kp-critic-01: answer 1: (root): Unrecognized key: "solid"`,
    );
    expect(lint([], 'kp-critic-07')).toBe(`${file}: batch 'kp-critic-07' was not prepared`);
    expect(lint([], 'kp-critic-01', results(root, 'answers', 'other.json'))).toBe(
      `${results(root, 'answers', 'other.json')}: answers to kp-critic-01 belong in kp-critic-01.json`,
    );
  });
});

describe('gradeKeyPoints and stampKeyPoints', () => {
  it('stamps passes live and records a failure in the review block once', () => {
    const root = fixtureRoot();
    prepareKeyPoints(ctxOf(root), 701);
    answer(root, 'kp-critic-01', [CAPACITY]);
    expect(gradeKeyPoints(root, FIXTURE_TODAY)).toEqual({ passed: 2, failed: 1 });
    expect(readKpPasses(root)).toEqual({
      [`${PROOFING} critic@1 ${hashOf(root, PROOFING)}`]: FIXTURE_TODAY,
      [`${BILLING} critic@1 ${hashOf(root, BILLING)}`]: FIXTURE_TODAY,
    });
    expect(readKpFailures(root)).toEqual([
      { id: CAPACITY, hash: hashOf(root, CAPACITY), reason: 'The text overstates the saving.' },
    ]);
    expect(stampKeyPoints(ctxOf(root), FIXTURE_TODAY)).toEqual({
      live: 3,
      revise: [KEY_POINTS],
      needsDani: [],
    });
    const kps = keyPointsIn(root);
    expect(kps.get(PROOFING)).toMatchObject({
      status: 'live',
      verified: { fullHash: hashOf(root, PROOFING), checks: ['critic@1'], on: FIXTURE_TODAY },
    });
    expect(kps.get(CAPACITY)).toMatchObject({
      status: 'draft',
      review: { attempts: 1, lastFailure: 'critic: The text overstates the saving.' },
    });
    expect(stampKeyPoints(ctxOf(root), FIXTURE_TODAY)).toEqual({
      live: 3,
      revise: [KEY_POINTS],
      needsDani: [],
    });
    expect(keyPointsIn(root).get(CAPACITY)).toMatchObject({ review: { attempts: 1 } });
    expect(runRules(ctxOf(root), ['R1', 'R5', 'R8', 'R9']).findings).toEqual([]);
  });

  it('lists a key point for Dani after its third failed round', () => {
    const root = fixtureRoot();
    replaceIn(
      root,
      KEY_POINTS,
      '    evidence: Borrow capacity when busy and give it back when quiet.\n',
      '    evidence: Borrow capacity when busy and give it back when quiet.\n    review:\n      attempts: 2\n      lastFailure: "critic: vague"\n',
    );
    prepareKeyPoints(ctxOf(root), 701);
    answer(root, 'kp-critic-01', [CAPACITY]);
    gradeKeyPoints(root, FIXTURE_TODAY);
    expect(stampKeyPoints(ctxOf(root), FIXTURE_TODAY)).toEqual({
      live: 3,
      revise: [],
      needsDani: [CAPACITY],
    });
    expect(kpCandidates(ctxOf(root), readKpPasses(root), readKpFailures(root))).toEqual([]);
  });

  it('never stamps a key point whose evidence is not in its home note', () => {
    const root = fixtureRoot();
    replaceIn(
      root,
      KEY_POINTS,
      'evidence: Cabinets are billed only while dough proofs.',
      'evidence: Cabinets are free.',
    );
    prepareKeyPoints(ctxOf(root), 701);
    answer(root, 'kp-critic-01');
    gradeKeyPoints(root, FIXTURE_TODAY);
    expect(stampKeyPoints(ctxOf(root), FIXTURE_TODAY).live).toBe(3);
    expect(keyPointsIn(root).get(PROOFING)?.status).toBe('draft');
  });
});

describe('demoteKeyPoints', () => {
  it('moves a live key point whose evidence left its note back to draft', () => {
    const root = fixtureRoot();
    replaceIn(
      root,
      LESSON,
      '- Branches use ovens from one central kitchen',
      '- Branches borrow ovens from one central kitchen',
    );
    expect(demoteKeyPoints(ctxOf(root))).toEqual([
      `demoted ${LIVE} (${KEY_POINTS}): its evidence no longer matches the home note of any of its concepts`,
    ]);
    const kp = keyPointsIn(root).get(LIVE);
    expect(kp).toMatchObject({
      status: 'draft',
      review: {
        attempts: 1,
        lastFailure:
          'evidence: the evidence line is no longer a whole line of the home note of any of its concepts',
      },
    });
    expect(kp?.verified).toBeUndefined();
    expect(demoteKeyPoints(ctxOf(root))).toEqual([]);
  });
});

describe('editKeyPointFile', () => {
  const text = readFileSync(join(import.meta.dirname, '..', 'fixtures', 'content-root', KEY_POINTS), 'utf8');

  it('splices only the edited keys and keeps comments and other key points byte for byte', () => {
    const out = editKeyPointFile(
      text,
      new Map([
        [
          PROOFING,
          { status: 'live', verified: { fullHash: 'abcdefabcdef', checks: ['critic@1'], on: '2026-10-11' } },
        ],
      ]),
    );
    expect(out).toBe(
      text
        .replace('    status: draft\n    text: Proofing', '    status: live\n    text: Proofing')
        .replace(
          '    evidence: Cabinets are billed only while dough proofs.\n',
          '    evidence: Cabinets are billed only while dough proofs.\n    verified:\n      fullHash: abcdefabcdef\n      checks: [ critic@1 ]\n      on: 2026-10-11\n',
        ),
    );
  });

  it('removes a key on null and throws on an unknown id', () => {
    const out = editKeyPointFile(text, new Map([[LIVE, { verified: null }]]));
    expect(out).toBe(text.replace(/ {4}verified:\n(?: {6}.*\n){3}/, ''));
    expect(() => editKeyPointFile(text, new Map([['kp-01-nope', { status: 'live' }]]))).toThrow(
      'kp-01-nope is not in this file',
    );
  });
});

describe('the key point report, module concepts and the draft check', () => {
  it('counts key points and lists modules under 4 live', () => {
    expect(keyPointReport(ctxOf(fixtureRoot()))).toEqual([
      'Key points: 1 live, 3 draft, 0 retired',
      'Modules under 4 live: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13',
    ]);
  });

  it('lists the tested concepts homed in a module', () => {
    const ctx = ctxOf(fixtureRoot());
    expect(moduleConcepts(ctx, 1)).toEqual([
      { id: 'shared-kitchen', name: 'Shared kitchen', home: 'm01/what-a-bakery-cloud-is' },
      { id: 'per-minute-rental', name: 'Per-minute rental', home: 'm01/what-a-bakery-cloud-is' },
    ]);
    expect(moduleConcepts(ctx, 2)).toEqual([]);
  });

  it('checks one file the way R1, R5 and R8 will, drafts included', () => {
    const root = fixtureRoot();
    expect(draftProblems(ctxOf(root), KEY_POINTS)).toEqual([]);
    replaceIn(
      root,
      KEY_POINTS,
      'evidence: Cabinets are billed only while dough proofs.',
      'evidence: Cabinets are free.',
    );
    replaceIn(root, KEY_POINTS, 'back to the shared kitchen.', 'back. The kitchen lends them on.');
    expect(draftProblems(ctxOf(root), KEY_POINTS)).toEqual([
      `${PROOFING}: evidence is not a whole line of the home note of any of its concepts`,
      `${CAPACITY}: one sentence per string`,
    ]);
    replaceIn(root, KEY_POINTS, 'status: draft', 'status: ready');
    expect(draftProblems(ctxOf(root), KEY_POINTS)).toEqual([
      '14: keyPoints.1.status: Invalid option: expected one of "draft"|"live"|"retired"',
    ]);
    expect(draftProblems(ctxOf(root), 'content/project/key-points/02-missing.yaml')).toEqual([
      'content/project/key-points/02-missing.yaml: no such key point file',
    ]);
  });

  it('reads the critic version from its prompt', () => {
    const root = fixtureRoot();
    expect(agentVersion(root, 'key-point-critic')).toBe(1);
    expect(() => agentVersion(root, 'key-point-writer')).toThrow(
      'agents/key-point-writer.md needs a frontmatter version, a whole number from 1',
    );
  });
});
```

Run: `pnpm test tests/unit/key-point-checks.test.ts 2>&1 | grep -E "^Error|Test Files|Tests "`

Expected: FAIL with `Error: Cannot find module '../../scripts/content/lib/key-point-checks.ts'` and `Test Files  1 failed (1)`.

- [ ] **Step 2: Write the pipeline**

Create `scripts/content/lib/key-point-checks.ts`:

```ts
/**
 * The key point check pipeline (spec 2.7 for the capstone key points): keyless batches for the key point critic, the
 * lint and grade of its answers, and the stamp that binds a pass to a key point's fullHash.
 * It mirrors scripts/content/lib/checks.ts, which serves the questions, so the question checks and their stamps stay
 * untouched. Everything lives under .results/key-points/ (git-ignored).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  Document,
  isMap,
  isScalar,
  isSeq,
  type Pair,
  parseDocument,
  parse as parseYaml,
  YAMLMap,
  YAMLSeq,
} from 'yaml';
import { z } from 'zod';
import { type KeyPointVerified, MIN_KEY_POINTS } from '../../../schemas/project.ts';
import type { Review } from '../../../schemas/question.ts';
import { mulberry32, shuffle } from '../../../src/engine/rng.ts';
import { NEEDS_DANI_ATTEMPTS, type PassLog } from './checks.ts';
import { type Context, localDate } from './context.ts';
import { splitFrontmatter } from './markdown.ts';
import { BRIEF_FILE, evidenceHolds, type KeyPointEntry, keyPointHash, projectOf } from './project.ts';
import { multiSentenceLines } from './text.ts';

export const KP_RESULTS_DIR = '.results/key-points';
export const KP_BATCH_SIZE = 10;
const CRITIC = 'key-point-critic';
const MODULES = Array.from({ length: 13 }, (_, i) => i + 1);
const EVIDENCE_MISS = 'evidence is not a whole line of the home note of any of its concepts';
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** One key point as the critic sees it: the decision it serves, the brief facts, its text, concepts and evidence. */
export interface KpItem {
  id: string;
  module: number;
  decision: { title: string; prompt: string; context: string[] };
  facts: string[];
  text: string;
  concepts: { id: string; name: string }[];
  evidence: string;
}

export interface KpBatch {
  batch: string;
  keyPoints: KpItem[];
}

/** The critic's verdict on one key point: four checks, and one short line per problem when any check is false. */
export const KpAnswer = z.strictObject({
  id: z.string(),
  accurate: z.boolean(),
  grounded: z.boolean(),
  fitsBrief: z.boolean(),
  currentNames: z.boolean(),
  problems: z.array(z.string()),
});
export type KpAnswer = z.infer<typeof KpAnswer>;
const KpAnswerFile = z.strictObject({ batch: z.string(), answers: z.array(z.unknown()) });

/** Each check of an answer with the reason a failure records when the critic names no problem. */
const FLAGS = [
  ['accurate', 'the critic found it wrong for the decision'],
  ['grounded', 'its evidence line does not support it'],
  ['fitsBrief', 'it does not fit the brief'],
  ['currentNames', 'it names a service or plan the exam no longer uses'],
] as const;

/** A failed critic check of one key point at one hash; `stamped` once the stamp has counted it in the review block. */
export interface KpFailure {
  id: string;
  hash: string;
  reason: string;
  stamped?: boolean;
}

const paths = (root: string) => {
  const dir = join(root, KP_RESULTS_DIR);
  return {
    dir,
    batches: join(dir, 'batches'),
    answers: join(dir, 'answers'),
    prepared: join(dir, 'prepared.json'),
    passes: join(dir, 'passes.json'),
    failures: join(dir, 'failures.json'),
  };
};

function readJsonFile<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

const writeJson = (path: string, value: unknown): void => {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

/** Passes keyed `<id> critic@<version> <fullHash>`, each with the ISO date of the pass. */
export const readKpPasses = (root: string): PassLog => readJsonFile<PassLog>(paths(root).passes, {});
export const readKpFailures = (root: string): KpFailure[] =>
  readJsonFile<KpFailure[]>(paths(root).failures, []);

/**
 * The prompt version of an agent, from the `version` frontmatter of agents/<file>.md.
 * A mirror of checkVersion in checks.ts, whose name parameter takes the three question checks only.
 */
export function agentVersion(root: string, file: string): number {
  const path = join(root, 'agents', `${file}.md`);
  const { yaml } = splitFrontmatter(existsSync(path) ? readFileSync(path, 'utf8') : '');
  const version = (parseYaml(yaml ?? '') as { version?: unknown } | null)?.version;
  if (!Number.isInteger(version) || (version as number) < 1) {
    throw new Error(`agents/${file}.md needs a frontmatter version, a whole number from 1`);
  }
  return version as number;
}

/** The highest critic version with a recorded pass for `id` at `hash`, or null. */
function passedVersion(passes: PassLog, id: string, hash: string): number | null {
  let best: number | null = null;
  for (const key of Object.keys(passes)) {
    const [kid, check, khash] = key.split(' ');
    if (kid !== id || khash !== hash || check?.startsWith('critic@') !== true) continue;
    const version = Number(check.slice('critic@'.length));
    if (best === null || version > best) best = version;
  }
  return best;
}

/**
 * Key points the critic still has to judge: drafts, and live items whose stamp no longer matches their hash. Retired
 * items, items with 3 or more attempts, items that failed at their current hash and items with a pass at their current
 * hash and the current critic version are skipped.
 */
export function kpCandidates(ctx: Context, passes: PassLog, failures: readonly KpFailure[]): KeyPointEntry[] {
  let version: number | null;
  try {
    version = agentVersion(ctx.root, CRITIC);
  } catch {
    version = null;
  }
  return projectOf(ctx).keyPoints.filter(({ kp }) => {
    if (kp.status === 'retired' || (kp.review?.attempts ?? 0) >= NEEDS_DANI_ATTEMPTS) return false;
    const hash = keyPointHash(kp);
    if (kp.verified?.fullHash === hash) return false;
    if (failures.some((f) => f.id === kp.id && f.hash === hash)) return false;
    return version === null || passes[`${kp.id} critic@${version} ${hash}`] === undefined;
  });
}

/**
 * Writes the critic batches: every candidate in an order fixed by the seed, at most KP_BATCH_SIZE per batch, and
 * prepared.json with the hash each judged key point is bound to. Old batches and answers are wiped first.
 * Returns the batch paths relative to the root.
 */
export function prepareKeyPoints(ctx: Context, seed: number): string[] {
  const p = paths(ctx.root);
  const { brief } = projectOf(ctx);
  if (brief === null) {
    throw new Error(`${BRIEF_FILE} is missing or fails R1; fix it before preparing key point batches`);
  }
  rmSync(p.batches, { recursive: true, force: true });
  rmSync(p.answers, { recursive: true, force: true });
  mkdirSync(p.batches, { recursive: true });
  mkdirSync(p.answers, { recursive: true });
  const names = new Map<string, string>();
  for (const c of ctx.concepts) {
    names.set(c.id, c.name);
    for (const alias of c.aliases ?? []) names.set(alias, c.name);
  }
  const facts = brief.facts.map((f) => f.text);
  const cands = shuffle(
    kpCandidates(ctx, readKpPasses(ctx.root), readKpFailures(ctx.root)),
    mulberry32(seed),
  );
  const prepared: Record<string, Record<string, string>> = {};
  const out: string[] = [];
  for (let start = 0; start < cands.length; start += KP_BATCH_SIZE) {
    const batch = `kp-critic-${pad2(start / KP_BATCH_SIZE + 1)}`;
    const items = cands.slice(start, start + KP_BATCH_SIZE);
    prepared[batch] = Object.fromEntries(items.map(({ kp }) => [kp.id, keyPointHash(kp)]));
    const keyPoints: KpItem[] = items.map(({ module, kp }) => {
      const d = brief.decisions[module - 1];
      return {
        id: kp.id,
        module,
        decision: { title: d?.title ?? '', prompt: d?.prompt ?? '', context: d?.context ?? [] },
        facts,
        text: kp.text,
        concepts: kp.concepts.map((id) => ({ id, name: names.get(id) ?? id })),
        evidence: kp.evidence,
      };
    });
    const rel = `${KP_RESULTS_DIR}/batches/${batch}.json`;
    writeJson(join(ctx.root, rel), { batch, keyPoints } satisfies KpBatch);
    out.push(rel);
  }
  writeJson(p.prepared, prepared);
  return out;
}

const issueText = (issue: z.core.$ZodIssue): string =>
  `${issue.path.join('.') || '(root)'}: ${issue.message}`;

/** Lints one critic answer file against its batch: `OK`, or the first problem to fix. */
export function lintKpAnswers(root: string, file: string): string {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return `${file}: not JSON: ${error instanceof Error ? error.message : String(error)}`;
  }
  const outer = KpAnswerFile.safeParse(data);
  if (!outer.success) return `${file}: ${issueText(outer.error.issues[0] as z.core.$ZodIssue)}`;
  const { batch, answers } = outer.data;
  const p = paths(root);
  const ids = readJsonFile<Record<string, Record<string, string>>>(p.prepared, {})[batch];
  if (ids === undefined || !existsSync(join(p.batches, `${batch}.json`)))
    return `${file}: batch '${batch}' was not prepared`;
  if (basename(file) !== `${batch}.json`) return `${file}: answers to ${batch} belong in ${batch}.json`;
  const seen = new Set<string>();
  for (const [i, raw] of answers.entries()) {
    const parsed = KpAnswer.safeParse(raw);
    if (!parsed.success)
      return `${batch}: answer ${i + 1}: ${issueText(parsed.error.issues[0] as z.core.$ZodIssue)}`;
    const a = parsed.data;
    if (!(a.id in ids)) return `${batch}: ${a.id} is not in this batch`;
    if (seen.has(a.id)) return `${batch}: ${a.id} is answered twice`;
    seen.add(a.id);
    if (FLAGS.some(([flag]) => !a[flag]) && a.problems.length === 0) {
      return `${batch}: ${a.id}: name each problem in problems when a check is false`;
    }
  }
  const missing = Object.keys(ids).find((id) => !seen.has(id));
  return missing === undefined ? 'OK' : `${batch}: no answer for ${missing}`;
}

/**
 * Grades every prepared batch whose answer file lints OK: a key point passes when all four checks hold, and the pass is
 * recorded at the hash it was prepared with; any false check records a failure, once per id and hash.
 */
export function gradeKeyPoints(root: string, today = localDate()): { passed: number; failed: number } {
  const p = paths(root);
  const prepared = readJsonFile<Record<string, Record<string, string>>>(p.prepared, {});
  const version = agentVersion(root, CRITIC);
  const passes = readKpPasses(root);
  const failures = readKpFailures(root);
  let passed = 0;
  let failed = 0;
  for (const [batch, ids] of Object.entries(prepared)) {
    const file = join(p.answers, `${batch}.json`);
    if (!existsSync(file) || lintKpAnswers(root, file) !== 'OK') continue;
    const { answers } = JSON.parse(readFileSync(file, 'utf8')) as { answers: unknown[] };
    for (const raw of answers) {
      const a = KpAnswer.parse(raw);
      const hash = ids[a.id] ?? '';
      const flag = FLAGS.find(([name]) => !a[name]);
      if (flag === undefined) {
        passes[`${a.id} critic@${version} ${hash}`] = today;
        passed += 1;
        continue;
      }
      failed += 1;
      if (!failures.some((f) => f.id === a.id && f.hash === hash)) {
        failures.push({ id: a.id, hash, reason: a.problems.length > 0 ? a.problems.join(' ') : flag[1] });
      }
    }
  }
  mkdirSync(p.dir, { recursive: true });
  writeJson(p.passes, passes);
  writeJson(p.failures, failures);
  return { passed, failed };
}

/** The fields only the key point tools write; `null` removes the key. */
export type KeyPointEdit = {
  status?: 'draft' | 'live';
  verified?: KeyPointVerified | null;
  review?: Review | null;
};

const EDIT_KEYS = ['status', 'verified', 'review'] as const;

function parseKeyPoints(text: string): Document.Parsed {
  const doc = parseDocument(text);
  if (doc.errors.length > 0) throw new Error(`YAML: ${doc.errors[0]?.message ?? 'parse error'}`);
  return doc;
}

function itemsById(doc: Document.Parsed): Map<string, YAMLMap> {
  const seq = doc.get('keyPoints');
  const out = new Map<string, YAMLMap>();
  for (const item of isSeq(seq) ? seq.items : []) {
    const id = isMap(item) ? item.get('id') : undefined;
    if (typeof id === 'string' && item instanceof YAMLMap) out.set(id, item);
  }
  return out;
}

const lineStart = (text: string, pos: number): number => text.lastIndexOf('\n', pos - 1) + 1;

function lineEnd(text: string, pos: number): number {
  if (pos > 0 && text[pos - 1] === '\n') return pos;
  const nl = text.indexOf('\n', pos);
  return nl === -1 ? text.length : nl + 1;
}

/** One `key: value` entry in block style at the given indent, with a `verified` block's checks in flow style. */
function renderKey(key: string, value: unknown, indent: number): string {
  const doc = new Document({ [key]: value });
  const checks = doc.getIn([key, 'checks'], true);
  if (checks instanceof YAMLSeq) checks.flow = true;
  return doc
    .toString({ lineWidth: 0 })
    .split('\n')
    .map((line) => (line === '' ? line : `${' '.repeat(indent)}${line}`))
    .join('\n');
}

function spanOf(text: string, pair: Pair): [number, number] {
  const key = pair.key as { range?: [number, number, number] } | null;
  const value = pair.value as { range?: [number, number, number] } | null;
  const start = key?.range?.[0];
  const end = value?.range?.[1] ?? key?.range?.[1];
  if (start === undefined || end === undefined) throw new Error('YAML: a key without a source range');
  return [lineStart(text, start), lineEnd(text, end)];
}

function editKey(text: string, id: string, key: (typeof EDIT_KEYS)[number], value: unknown): string {
  const item = itemsById(parseKeyPoints(text)).get(id);
  if (item === undefined) throw new Error(`${id} is not in this file`);
  const first = item.items[0];
  if (first === undefined) throw new Error(`${id} has no keys`);
  const keyStart = (first.key as { range?: [number, number, number] } | null)?.range?.[0] ?? 0;
  const indent = keyStart - lineStart(text, keyStart);
  const pair = item.items.find((p) => isScalar(p.key) && p.key.value === key);
  if (pair !== undefined) {
    const [start, end] = spanOf(text, pair);
    return text.slice(0, start) + (value === null ? '' : renderKey(key, value, indent)) + text.slice(end);
  }
  if (value === null) return text;
  const at = spanOf(text, item.items[item.items.length - 1] as Pair)[1];
  const lead = at > 0 && text[at - 1] !== '\n' ? '\n' : '';
  return text.slice(0, at) + lead + renderKey(key, value, indent) + text.slice(at);
}

/**
 * Applies edits to the key points of one file by id, splicing only the edited keys so comments, key order and every
 * other line stay byte for byte, like editQuestionFile. Throws on an id that is not in the file.
 */
export function editKeyPointFile(text: string, edits: ReadonlyMap<string, KeyPointEdit>): string {
  const ids = itemsById(parseKeyPoints(text));
  for (const id of edits.keys()) if (!ids.has(id)) throw new Error(`${id} is not in this file`);
  let out = text;
  for (const [id, edit] of edits) {
    for (const key of EDIT_KEYS) {
      const value = edit[key];
      if (value !== undefined) out = editKey(out, id, key, value);
    }
  }
  parseKeyPoints(out);
  return out;
}

/** Writes per-file edits back through editKeyPointFile. */
function writeEdits(ctx: Context, edits: ReadonlyMap<string, ReadonlyMap<string, KeyPointEdit>>): void {
  for (const [path, byId] of edits)
    writeFileSync(join(ctx.root, path), editKeyPointFile(ctx.read(path) ?? '', byId));
}

/**
 * Stamps every key point with a critic pass at its current hash whose evidence holds: `status: live` and
 * `verified { fullHash, checks: [critic@N], on }`. A new failure at a draft's current hash adds one attempt to its
 * review block; a draft at NEEDS_DANI_ATTEMPTS leaves the loop and is listed for Dani.
 */
export function stampKeyPoints(
  ctx: Context,
  today = localDate(),
): { live: number; revise: string[]; needsDani: string[] } {
  const passes = readKpPasses(ctx.root);
  const failures = readKpFailures(ctx.root);
  const edits = new Map<string, Map<string, KeyPointEdit>>();
  const edit = (path: string, id: string, e: KeyPointEdit): void => {
    edits.set(path, (edits.get(path) ?? new Map()).set(id, e));
  };
  let live = 0;
  const revise = new Set<string>();
  const needsDani: string[] = [];
  for (const { path, kp } of projectOf(ctx).keyPoints) {
    if (kp.status === 'retired') continue;
    const hash = keyPointHash(kp);
    const stamped =
      kp.verified?.fullHash === hash ? Number(kp.verified.checks[0].slice('critic@'.length)) : null;
    const version = passedVersion(passes, kp.id, hash) ?? stamped;
    if (version !== null && evidenceHolds(ctx, kp) === true) {
      const checks: [string] = [`critic@${version}`];
      const valid =
        kp.status === 'live' &&
        kp.review === undefined &&
        kp.verified?.fullHash === hash &&
        kp.verified.checks[0] === checks[0];
      if (!valid)
        edit(path, kp.id, { status: 'live', verified: { fullHash: hash, checks, on: today }, review: null });
      live += 1;
      continue;
    }
    if (kp.status === 'live') {
      live += 1;
      continue;
    }
    const current = failures.filter((f) => f.id === kp.id && f.hash === hash);
    const fresh = current.filter((f) => f.stamped !== true);
    let attempts = kp.review?.attempts ?? 0;
    if (fresh.length > 0) {
      attempts += 1;
      edit(path, kp.id, { review: { attempts, lastFailure: `critic: ${fresh[0]?.reason ?? ''}` } });
      for (const f of fresh) f.stamped = true;
    }
    if (attempts >= NEEDS_DANI_ATTEMPTS) needsDani.push(kp.id);
    else if (current.length > 0) revise.add(path);
  }
  writeEdits(ctx, edits);
  if (existsSync(paths(ctx.root).failures)) writeJson(paths(ctx.root).failures, failures);
  return { live, revise: [...revise].sort(), needsDani };
}

/** Moves each live key point whose evidence left the home notes of its concepts back to draft, with the reason. */
export function demoteKeyPoints(ctx: Context): string[] {
  const edits = new Map<string, Map<string, KeyPointEdit>>();
  const log: string[] = [];
  for (const { path, kp } of projectOf(ctx).keyPoints) {
    if (kp.status !== 'live' || evidenceHolds(ctx, kp) !== false) continue;
    const review = {
      attempts: kp.review?.attempts ?? 1,
      lastFailure:
        'evidence: the evidence line is no longer a whole line of the home note of any of its concepts',
    };
    edits.set(path, (edits.get(path) ?? new Map()).set(kp.id, { status: 'draft', verified: null, review }));
    log.push(
      `demoted ${kp.id} (${path}): its evidence no longer matches the home note of any of its concepts`,
    );
  }
  writeEdits(ctx, edits);
  return log;
}

/** The key point counts by status, then the modules whose decision has fewer than 4 live key points. */
export function keyPointReport(ctx: Context): string[] {
  const { keyPoints } = projectOf(ctx);
  const count = (status: string): number => keyPoints.filter((e) => e.kp.status === status).length;
  const under = MODULES.filter(
    (m) => keyPoints.filter((e) => e.module === m && e.kp.status === 'live').length < MIN_KEY_POINTS,
  );
  return [
    `Key points: ${count('live')} live, ${count('draft')} draft, ${count('retired')} retired`,
    `Modules under ${MIN_KEY_POINTS} live: ${under.length === 0 ? 'none' : under.map(pad2).join(', ')}`,
  ];
}

/** The tested concepts whose home note is in one module, the writer's starting list. */
export function moduleConcepts(ctx: Context, module: number): { id: string; name: string; home: string }[] {
  return ctx.concepts
    .filter((c) => c.tested !== false && c.home.startsWith(`m${pad2(module)}/`))
    .map((c) => ({ id: c.id, name: c.name, home: c.home }));
}

/**
 * Every problem of one key point file as R1, R5 and R8 will see it, applying R5 to drafts too, so a writer can loop
 * until it holds none: R1 findings as `<line>: <message>`, then `<id>: <problem>` per key point.
 */
export function draftProblems(ctx: Context, file: string): string[] {
  if (!ctx.files.includes(file)) return [`${file}: no such key point file`];
  const project = projectOf(ctx);
  const out = project.errors.filter((f) => f.file === file).map((f) => `${f.line ?? 1}: ${f.message}`);
  for (const { path, kp } of project.keyPoints) {
    if (path !== file || kp.status === 'retired') continue;
    if (evidenceHolds(ctx, kp) !== true) out.push(`${kp.id}: ${EVIDENCE_MISS}`);
    if (multiSentenceLines(kp.text.replaceAll('\n', ' ')).length > 0)
      out.push(`${kp.id}: one sentence per string`);
  }
  return out;
}
```

Run: `pnpm test tests/unit/key-point-checks.test.ts 2>&1 | grep -E "Test Files|Tests "`

Expected: `Test Files  1 passed (1)` and `Tests  18 passed (18)`; the test writes its own critic prompt into the fixture root, so it needs no file under `agents/`.

- [ ] **Step 3: Write the failing prompt test**

Create `tests/unit/key-point-agents.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { agentVersion } from '../../scripts/content/lib/key-point-checks.ts';
import { splitFrontmatter } from '../../scripts/content/lib/markdown.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const read = (name: string): string => readFileSync(join(ROOT, 'agents', `${name}.md`), 'utf8');

describe('the key point prompts', () => {
  it.each(['key-point-writer', 'key-point-critic'])('%s names itself and carries version 1', (name) => {
    const { yaml, body } = splitFrontmatter(read(name));
    expect(parse(yaml ?? '')).toEqual({ name, version: 1 });
    expect(body).toMatch(/^\n?# /);
    expect(body).not.toContain(String.fromCharCode(0x2014));
  });

  it('gives the critic a version the stamp can read', () => {
    expect(agentVersion(ROOT, 'key-point-critic')).toBe(1);
  });

  it('points the writer at the brief, its concepts, the style rules and its draft check, and away from the exam', () => {
    const writer = read('key-point-writer');
    for (const text of [
      'content/project/brief.yaml',
      'key-points.ts concepts --module NN',
      'content/STYLE.md',
      '## Numbers',
      '## Current names',
      'key-points.ts draft',
      'Never read',
      'content/exam/',
      'content/fingerprints/',
      '.results/',
    ]) {
      expect(writer).toContain(text);
    }
  });

  it('keeps the critic to its batch, its four checks and its lint loop', () => {
    const critic = read('key-point-critic');
    for (const text of [
      '.results/key-points/batches/',
      '.results/key-points/answers/',
      'content/STYLE.md',
      'Never open',
      '`accurate`',
      '`grounded`',
      '`fitsBrief`',
      '`currentNames`',
      'key-points.ts lint',
    ]) {
      expect(critic).toContain(text);
    }
  });
});
```

Run: `pnpm test tests/unit/key-point-agents.test.ts 2>&1 | grep -E "Test Files|Tests "`

Expected: `Test Files  1 failed (1)` and `Tests  5 failed (5)`, each on `ENOENT` for a prompt file or on `agents/key-point-critic.md needs a frontmatter version, a whole number from 1`.

- [ ] **Step 4: Write the two prompts**

Create `agents/key-point-writer.md`:

````markdown
---
name: key-point-writer
version: 1
---

# Key point writer

You write the reference key points of one capstone decision into one file, which your task names: `content/project/key-points/NN-<module-dir>.yaml` (spec 6).
A key point is one thing a strong answer to the decision contains; Dani ticks the ones his ADR covered after he grades it himself.

## Read first

- `content/project/brief.yaml`: its `facts` and the entry of `decisions` for your module, with its `title`, `prompt` and `context`.
- The output of `node scripts/content/key-points.ts concepts --module NN`: the tested concepts homed in your module, one per line with its id, name and home note.
- The home note of every concept you cite, and its entry in `content/concepts.yaml`; a home such as `m06/introduction-to-storage` is the note `resources/06-storage/01-introduction-to-storage.md`, and a concept homed in another module is fine when the decision needs it.
- `content/STYLE.md`, its `## Numbers` and `## Current names` sections above all.

Never read the course source text, `~/Library/Application Support/ccp-study/`, `content/fingerprints/`, anything under `content/exam/`, AWS exam questions or anything under `.results/`.

## Write

- Keep 4 to 6 key points in the file that are not retired, and write 5 when the file is new.
- A new file starts with the comment line `# Reference key points for decision N: <title>.`, then `module: N` and `keyPoints:`.
- Each key point is a list item with `id`, `status: draft`, `text`, `concepts` and `evidence`, in that order.
- `id` is `kp-NN-<slug>`, where `NN` is your module and the slug is 2 to 5 kebab-case words that name the point; never reuse an id the file already holds, retired ones included.
- `text` is one original sentence of 20 to 300 characters that says what a good decision does for the cafe and why.
- `concepts` lists 1 to 3 concept ids from `content/concepts.yaml` that the sentence relies on.
- `evidence` is one whole line copied exactly from the home note of one of those concepts, without its list marker, and it supports the sentence.
- Spread the key points over the parts of the decision prompt, so that together they cover all of it.
- Use the exam guide's current names only, and never name Developer Support, Business Support or Enterprise On-Ramp Support.
- Use a number only when your evidence line states it, written the same way.
- Never copy a sentence of a note, a question or the brief into `text`; the evidence line is the only copied text.

A made-up bakery example of one item:

```yaml
  - id: kp-01-borrow-on-busy-days
    status: draft
    text: The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.
    concepts: [shared-kitchen]
    evidence: Branches use ovens from one central kitchen when their queues grow.
```

## Revise

When your task asks for a revision, each draft with a `review` block failed the critic for the reason in `review.lastFailure`.
Rewrite its `text`, `concepts` or `evidence` to fix that reason, and keep its `id`, its `status: draft` and its `review` block as they are.
Never touch a key point that is `live` or `retired`, or a draft whose `review.attempts` is 3 or more.

## Top up

When your task asks for a top-up, the file has fewer than 4 live key points.
Revise its failed drafts first, as the Revise section says.
Then set `status: retired` on each draft whose `review.attempts` is 3 or more, keeping it in the file with its id, and add new drafts until the file holds 5 key points that are not retired.

## Fix

When your task lists `pnpm content:validate` findings for your file, fix each one.
Set each live key point that a finding names back to `status: draft` and delete its `verified` block, then change its `text`, `concepts` or `evidence` until the finding is gone.
Never change or remove an id, because a live or retired id must never disappear.

## Check

Loop on `node scripts/content/key-points.ts draft <your file>` until its last line ends with `0 problems`.
Write no other file, and never commit.
Return the file, the number of drafts you wrote or revised and the problem count of your last draft run.
````

Create `agents/key-point-critic.md`:

````markdown
---
name: key-point-critic
version: 1
---

# Key point critic

You judge batches of capstone reference key points (spec 6) for a study site, and no writer of a key point ever judges it.
Your task names your batch files, each `.results/key-points/batches/kp-critic-NN.json`; judge them one at a time and write one answer file per batch.

Never open any file but your batch files, `content/STYLE.md` and your answer files.
Never read a key point file, a note, the brief, the course or `.results/key-points/prepared.json`.

Each key point shows its `decision` (the title, prompt and context of the capstone decision it serves), the 7 brief `facts`, its `text`, its `concepts` with their display names and its `evidence` line.
Read `content/STYLE.md` in full first, its `## Numbers` and `## Current names` sections above all.

Judge each key point on its own and answer four questions about it:

- `accurate`: is the text correct about AWS, and is it something a strong answer to this decision contains?
- `grounded`: does the evidence line support the text, does it state every number the text uses, and do the listed concepts fit the text?
- `fitsBrief`: does the text fit the cafe's facts and the decision's context, in one sentence?
- `currentNames`: does the text use the exam guide's current names only, never Developer Support, Business Support or Enterprise On-Ramp Support?

List each problem you find in `problems`, one short line each that a writer can act on; leave the list empty when all four hold.

Write `.results/key-points/answers/kp-critic-NN.json`:

```json
{
  "batch": "kp-critic-01",
  "answers": [
    {
      "id": "kp-06-lifecycle-to-archive",
      "accurate": true,
      "grounded": false,
      "fitsBrief": true,
      "currentNames": true,
      "problems": ["The text says 90 days, but the evidence line states no number of days."]
    }
  ]
}
```

Answer every key point of a batch exactly once.
Run `node scripts/content/key-points.ts lint <your answer file>` for each answer file and fix it until it prints `OK`.
````

Run: `pnpm test tests/unit/key-point-checks.test.ts tests/unit/key-point-agents.test.ts 2>&1 | grep -E "Test Files|Tests "`

Expected: `Test Files  2 passed (2)` and `Tests  23 passed (23)`.

- [ ] **Step 5: Write the CLI**

Create `scripts/content/key-points.ts`:

```ts
/**
 * node scripts/content/key-points.ts <command>: the capstone key point pipeline (spec 6 and 2.7).
 *   concepts --module NN   the tested concepts homed in one module: id, name and home note, tab-separated
 *   draft <file>           every R1, R5 and R8 problem of one key point file, drafts included, then the count
 *   prepare [--seed N]     write the critic batches for every key point that needs the critic
 *   lint <answers file>    check one critic answer file against its batch until it prints OK
 *   grade                  grade every answer file and record the passes and failures
 *   stamp                  stamp passes live and count new failures in review blocks
 *   demote                 move live key points whose evidence left their notes back to draft
 *   report                 the counts by status and the modules under 4 live key points
 *   needs-dani             the key points with 3 or more failed rounds
 * Output names key points by id and counts only.
 */
import { resolve } from 'node:path';
import { NEEDS_DANI_ATTEMPTS } from './lib/checks.ts';
import { loadContext } from './lib/context.ts';
import {
  demoteKeyPoints,
  draftProblems,
  gradeKeyPoints,
  keyPointReport,
  lintKpAnswers,
  moduleConcepts,
  prepareKeyPoints,
  stampKeyPoints,
} from './lib/key-point-checks.ts';
import { projectOf } from './lib/project.ts';

const root = resolve(import.meta.dirname, '..', '..');
const [command, ...rest] = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const at = rest.indexOf(name);
  return at < 0 ? undefined : rest[at + 1];
};
const fail = (message: string): never => {
  console.error(`key-points: ${message}`);
  process.exit(1);
};

switch (command) {
  case 'concepts': {
    const module = Number(option('--module') ?? fail('concepts needs --module NN'));
    if (!Number.isInteger(module) || module < 1 || module > 13)
      fail('--module is a module number from 01 to 13');
    for (const c of moduleConcepts(loadContext(root), module)) console.log(`${c.id}\t${c.name}\t${c.home}`);
    break;
  }
  case 'draft': {
    const file = rest[0] ?? fail('draft needs a key point file');
    const problems = draftProblems(loadContext(root), file);
    for (const problem of problems) console.log(problem);
    console.log(`draft ${file}: ${problems.length} problems`);
    break;
  }
  case 'prepare': {
    const seed = Number(option('--seed') ?? '1');
    if (!Number.isInteger(seed)) fail('--seed must be a whole number');
    const paths = prepareKeyPoints(loadContext(root), seed);
    for (const path of paths) console.log(path);
    console.log(`prepared ${paths.length} batches`);
    break;
  }
  case 'lint': {
    const file = rest[0] ?? fail('lint needs an answers file');
    const result = lintKpAnswers(root, resolve(file));
    if (result !== 'OK') fail(result);
    console.log('OK');
    break;
  }
  case 'grade': {
    const { passed, failed } = gradeKeyPoints(root);
    console.log(`graded ${passed + failed} key points: ${passed} passed, ${failed} failed`);
    break;
  }
  case 'stamp': {
    const { live, revise, needsDani } = stampKeyPoints(loadContext(root));
    for (const path of revise) console.log(`revise ${path}`);
    for (const id of needsDani) console.log(`needs Dani ${id}`);
    console.log(`stamp: ${live} live, ${revise.length} files to revise, ${needsDani.length} need Dani`);
    break;
  }
  case 'demote': {
    const log = demoteKeyPoints(loadContext(root));
    for (const line of log) console.log(line);
    console.log(`demoted ${log.length} key points`);
    break;
  }
  case 'report': {
    for (const line of keyPointReport(loadContext(root))) console.log(line);
    break;
  }
  case 'needs-dani': {
    const stuck = projectOf(loadContext(root)).keyPoints.filter(
      (e) => e.kp.status === 'draft' && (e.kp.review?.attempts ?? 0) >= NEEDS_DANI_ATTEMPTS,
    );
    for (const e of stuck) console.log(`${e.kp.id} (${e.path}) attempts ${e.kp.review?.attempts ?? 0}`);
    console.log(`${stuck.length} key points need Dani`);
    break;
  }
  default:
    fail(
      'usage: node scripts/content/key-points.ts concepts --module NN | draft <file> | prepare [--seed N] | lint <answers file> | grade | stamp | demote | report | needs-dani',
    );
}
```

Run:

```bash
node scripts/content/key-points.ts report
node scripts/content/key-points.ts concepts --module 13 | wc -l
node scripts/content/key-points.ts prepare --seed 1
node scripts/content/key-points.ts needs-dani
node scripts/content/key-points.ts bogus; echo "exit $?"
rm -rf .results/key-points
```

Expected, in order: `Key points: 0 live, 0 draft, 0 retired` and `Modules under 4 live: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13`; `18` (the tested concepts homed in Module 13 on `master` 057efe5; a later registry may differ); `prepared 0 batches`; `0 key points need Dani`; the `key-points: usage: ...` line and `exit 1`.

- [ ] **Step 6: Typecheck, lint and validate**

Run: `pnpm lint:fix && pnpm typecheck && pnpm lint && pnpm --silent content:validate`

Expected: `tsc --noEmit` prints nothing, Biome prints `No fixes applied.`, and `content:validate: 13 rules, 0 findings`, which also shows that R8 accepts both prompts.

- [ ] **Step 7: Commit**

```bash
git add agents/key-point-writer.md agents/key-point-critic.md scripts/content/lib/key-point-checks.ts scripts/content/key-points.ts tests/unit/key-point-checks.test.ts tests/unit/key-point-agents.test.ts
git commit -m "Add the key point writer, critic and check pipeline" -m "Key points get their own writer and critic prompts and a prepare, grade and stamp pipeline under .results/key-points, so the question checks stay untouched."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 7: Key point fan-out (Workflow, controller-run)

**Depends on:** Tasks 5 and 6 on `master`; Step 5 also needs Task 11 on `master`.
**Covers:** P6-040, P6-041, P6-046.

**Files:**
- Create, one key point file per module, each named after its module folder in `content/questions/`:
  - `content/project/key-points/01-introduction-to-the-cloud.yaml`, `02-compute-in-the-cloud.yaml`, `03-exploring-compute-services.yaml`, `04-going-global.yaml`, `05-networking.yaml`, `06-storage.yaml`, `07-databases.yaml`
  - `content/project/key-points/08-ai-ml-and-data-analytics.yaml`, `09-security.yaml`, `10-monitoring-compliance-and-governance.yaml`, `11-pricing-and-support.yaml`, `12-migrating-to-the-aws-cloud.yaml`, `13-well-architected-solutions.yaml`
- Test: `node scripts/content/key-points.ts report` (`Modules under 4 live: none`), `pnpm --silent content:validate` at 0 findings after `master` is merged in, and `pnpm check` through the pre-commit hook of every commit

This task is content, not code: the controller runs it with the Workflow tool, and its agents write, check, stamp and commit the key points.
It runs in its own worktree, `<scratchpad>/p6/wt-key-points`, on branch `content/phase-6-key-points`, and merges by Wednesday, October 28.
Each key point is original text that cites one whole line of a concept's home note as its evidence, so the course stays the base of every key point (spec 2.3) while no course text enters the repo.
Writers and critics never read the exam pool, so no key point can echo an exam item, and agents return ids and counts only.
The workflow's seeds are 701 to 703 for the check rounds and 711 and 712 for the top-up (721 to 723, 731 and 732 in the check stage), in the 701-and-up range this phase keeps for key points.
`.results/key-points/` stays in the worktree until Step 6 unions its `passes.json` and `failures.json` into the repository copy.

- [ ] **Step 1: Make the key point worktree**

Run from the repository root, with `$SCRATCH` set to the controller's scratchpad directory:

```bash
git worktree add -b content/phase-6-key-points "$SCRATCH/p6/wt-key-points" master
cd "$SCRATCH/p6/wt-key-points"
export PATH="/Users/danielchahine/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH"
node --version
pnpm install --frozen-lockfile | tail -3
git log --oneline -3 -- content/project/brief.yaml scripts/content/key-points.ts
node scripts/content/key-points.ts report
```

Expected: `v24.21.0`; the log lists Task 6's `Add the key point writer, critic and check pipeline` and Task 5's `Add the capstone brief`; the report prints `Key points: 0 live, 0 draft, 0 retired` and `Modules under 4 live: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13`.
Every agent below works only in this worktree, and every later command of this task runs in it.

- [ ] **Step 2: Run the write stage of the workflow**

Run this script with the Workflow tool; it is tool input, not a repo file, and a copy sits at `<scratchpad>/p6/phase6-key-points.js`.
Its `args` are `{ "worktree": "<absolute path of $SCRATCH/p6/wt-key-points>", "stage": "write" }`.
The write stage writes the 13 files in parallel, runs up to 3 critic rounds with a revision between rounds, tops up the modules still under 4 live key points with one more round pair, and commits each module.
Step 4 and Step 5 run it again with `{ "worktree": ..., "stage": "check" }`, which first fixes the files that `pnpm content:validate` names and then runs the same rounds, top-up and commits with the check-stage seeds.

```js
export const meta = {
  name: 'phase6-key-points',
  description: 'Phase 6 capstone key points: one writer per module file, critic rounds with grade, stamp and revise, a top-up for modules under 4 live, one commit per module',
  phases: [
    { title: 'Write', detail: 'one key point writer per module file' },
    { title: 'Fix', detail: 'check stage only: one writer per file with validator findings' },
    { title: 'Prepare' },
    { title: 'Check', detail: 'critics grouped up to 8 batches each' },
    { title: 'Stamp', detail: 'grade, then stamp' },
    { title: 'Revise', detail: 'one writer per module file to revise' },
    { title: 'Top-up', detail: 'fresh drafts for modules under 4 live' },
    { title: 'Commit', detail: 'one commit per module, in module order' },
  ],
}

const WT = args.worktree
const STAGE = args.stage ?? 'write'
const NODE = 'export PATH="/Users/danielchahine/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH";'
const ROUND_SEEDS = STAGE === 'write' ? [701, 702, 703] : [721, 722, 723]
const TOPUP_SEEDS = STAGE === 'write' ? [711, 712] : [731, 732]
const GROUP = 8
const MODULE_DIRS = [
  '01-introduction-to-the-cloud',
  '02-compute-in-the-cloud',
  '03-exploring-compute-services',
  '04-going-global',
  '05-networking',
  '06-storage',
  '07-databases',
  '08-ai-ml-and-data-analytics',
  '09-security',
  '10-monitoring-compliance-and-governance',
  '11-pricing-and-support',
  '12-migrating-to-the-aws-cloud',
  '13-well-architected-solutions',
]
const MODULES = MODULE_DIRS.map((_, i) => i + 1)
const pad2 = (n) => String(n).padStart(2, '0')
const fileOf = (m) => `content/project/key-points/${MODULE_DIRS[m - 1]}.yaml`
const HOOKS = `Start every shell command with: cd "${WT}" && ${NODE} Work only in this worktree, never in any other checkout. Stage files by path, never with git add -A or git add .; when git reports an index.lock, wait a few seconds and retry. Never use --no-verify. Never use the em dash. Never add a Co-Authored-By line. Never commit unless your task says so. Name key points by id and count only in your reply.`
const NEVER_READ = 'Never read the course source text, ~/Library/Application Support/ccp-study/, content/fingerprints/, anything under content/exam/, AWS exam questions, or anything under .results/ that your task does not name.'

if (!WT) return { stopped: 'args.worktree is missing' }
if (!['write', 'check'].includes(STAGE)) return { stopped: `unknown stage ${STAGE}` }

const WRITE = {
  type: 'object',
  properties: { file: { type: 'string' }, written: { type: 'integer' }, problems: { type: 'integer' } },
  required: ['file', 'written', 'problems'],
}
const PREP = { type: 'object', properties: { batches: { type: 'array', items: { type: 'string' } } }, required: ['batches'] }
const CRITIC = {
  type: 'object',
  properties: { answers: { type: 'array', items: { type: 'string' } }, ok: { type: 'boolean' } },
  required: ['answers', 'ok'],
}
const STAMP = {
  type: 'object',
  properties: {
    live: { type: 'integer' },
    revise: { type: 'array', items: { type: 'string' } },
    needsDani: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['live', 'revise', 'needsDani', 'summary'],
}
const REPORT = {
  type: 'object',
  properties: { lines: { type: 'array', items: { type: 'string' } }, under: { type: 'array', items: { type: 'integer' } } },
  required: ['lines', 'under'],
}
const FINDINGS = {
  type: 'object',
  properties: { files: { type: 'array', items: { type: 'object' } }, last: { type: 'string' } },
  required: ['files', 'last'],
}
const COMMIT = {
  type: 'object',
  properties: { module: { type: 'integer' }, commit: { type: 'string' }, body: { type: 'string' } },
  required: ['module', 'commit', 'body'],
}
const FINAL = {
  type: 'object',
  properties: { report: { type: 'array', items: { type: 'string' } }, needsDani: { type: 'string' }, validate: { type: 'string' } },
  required: ['report', 'needsDani', 'validate'],
}

/** One key point writer for one module file; `task` says what to do, as a section of agents/key-point-writer.md. */
function writer(m, task, label, phaseName) {
  return agent(`You are the key point writer for capstone decision ${m} of the CCP study site in the git worktree ${WT}.
Read agents/key-point-writer.md and content/STYLE.md in full, then follow the prompt exactly.
Your file is ${fileOf(m)} and your module number is ${pad2(m)}.
${task}
Loop on \`node scripts/content/key-points.ts draft ${fileOf(m)}\` until its last line ends with \`0 problems\`.
Write no other file. ${NEVER_READ}
${HOOKS}
Return the file, the number of drafts you wrote or revised, and the problem count of your last draft run.`, { label, phase: phaseName, schema: WRITE })
}

const WRITE_TASK = (m) => `When ${fileOf(m)} already exists, return written 0 and change nothing. Otherwise write the reference key points of decision ${m} into it as a new file, as the Write section says.`
const REVISE_TASK = 'Revise the drafts of your file that failed the critic, as the Revise section says.'
const TOPUP_TASK = 'Top up your file, as the Top up section says.'
let rounds = 0

/** One critic round: prepare with the seed, critics over groups of up to 8 batches, then grade and stamp. */
async function checkRound(seed, tag) {
  phase('Prepare')
  const prep = await agent(`${HOOKS}
Run \`node scripts/content/key-points.ts prepare --seed ${seed}\`.
Return the batch paths it printed (the lines ending in .json), relative to the worktree root. Do not edit any file. If it fails, return an empty list.`, { label: `prepare:${tag}`, phase: 'Prepare', schema: PREP, effort: 'low' })
  const batches = prep?.batches ?? []
  log(`${tag}: ${batches.length} batches`)
  if (batches.length === 0) return null
  rounds += 1
  const groups = []
  for (let i = 0; i < batches.length; i += GROUP) groups.push(batches.slice(i, i + GROUP))
  phase('Check')
  await parallel(groups.map((g, gi) => () => agent(`You are a fresh key point critic for the CCP study site in the git worktree ${WT}.
Read agents/key-point-critic.md in full and follow it exactly for each of these batch files, one answer file per batch:
${g.join('\n')}
Never open a key point file, a note, content/project/brief.yaml or .results/key-points/prepared.json. ${NEVER_READ}
${HOOKS}
Return the answer files you wrote, and ok true when every one of them printed OK on its last lint.`, { label: `critic:${tag}:${gi + 1}`, phase: 'Check', schema: CRITIC })))
  phase('Stamp')
  const st = await agent(`${HOOKS}
Run \`node scripts/content/key-points.ts grade\`, then \`node scripts/content/key-points.ts stamp\`. Do not edit any file yourself.
Return live from the stamp summary line, revise = the paths of its \`revise <path>\` lines, needsDani = the ids of its \`needs Dani <id>\` lines, and summary = the grade line and the stamp summary line joined by "; ".`, { label: `stamp:${tag}`, phase: 'Stamp', schema: STAMP, effort: 'low' })
  log(`${tag}: ${st?.summary ?? 'no stamp reply'}`)
  return st
}

/** Check rounds with revisions between them; the last round revises nothing, so every draft it leaves was judged. */
async function roundsOf(seeds, tag) {
  for (const [i, seed] of seeds.entries()) {
    const st = await checkRound(seed, `${tag}${i + 1}`)
    if (st === null || st.revise.length === 0 || i === seeds.length - 1) return
    phase('Revise')
    const modules = MODULES.filter((m) => st.revise.includes(fileOf(m)))
    await parallel(modules.map((m) => () => writer(m, REVISE_TASK, `revise:${tag}${i + 1}:m${pad2(m)}`, 'Revise')))
  }
}

function report(label) {
  return agent(`${HOOKS}
Run \`node scripts/content/key-points.ts report\` and return its two lines as lines, and the module numbers its \`Modules under 4 live:\` line lists as under (empty for none). Do not edit any file.`, { label, phase: 'Top-up', schema: REPORT, effort: 'low' })
}

if (STAGE === 'write') {
  phase('Write')
  const written = await parallel(MODULES.map((m) => () => writer(m, WRITE_TASK(m), `write:m${pad2(m)}`, 'Write')))
  log(`write: ${written.filter(Boolean).reduce((n, w) => n + w.written, 0)} drafts in ${written.filter((w) => w && w.written > 0).length} files; ${written.filter((w) => !w || w.problems > 0).length} files with problems`)
} else {
  phase('Fix')
  const found = await agent(`${HOOKS}
Run \`pnpm --silent content:validate\`. Return as files one entry { file, findings } per file under content/project/key-points/ that its findings name, where findings is the list of that file's finding lines, and as last its last line. Do not edit any file.`, { label: 'findings', phase: 'Fix', schema: FINDINGS, effort: 'low' })
  log(`fix: ${found?.last ?? 'no reply'}`)
  const fixes = (found?.files ?? []).filter((f) => MODULES.some((m) => fileOf(m) === f.file))
  await parallel(fixes.map((f) => () => {
    const m = MODULES.find((n) => fileOf(n) === f.file)
    return writer(m, `Fix these pnpm content:validate findings for your file, as the Fix section says:\n${f.findings.join('\n')}`, `fix:m${pad2(m)}`, 'Fix')
  }))
}

await roundsOf(ROUND_SEEDS, STAGE === 'write' ? 'r' : 'c')

phase('Top-up')
const before = await report('report:top-up')
const short = before?.under ?? []
log(`top-up: ${short.length} modules under 4 live`)
if (short.length > 0) {
  await parallel(short.map((m) => () => writer(m, TOPUP_TASK, `top-up:m${pad2(m)}`, 'Top-up')))
  await roundsOf(TOPUP_SEEDS, STAGE === 'write' ? 't' : 'u')
}

phase('Commit')
const commits = []
for (const m of MODULES) {
  const c = await agent(`${HOOKS}
Work on branch content/phase-6-key-points. When \`git status --short ${fileOf(m)}\` prints nothing, make no commit and return commit "none".
Otherwise count the file's key points with \`grep -cE '^    status: live$' ${fileOf(m)}\` and \`grep -cE '^    status: draft$' ${fileOf(m)}\`, run \`pnpm lint:fix\`, stage only ${fileOf(m)} by path, and commit with \`git commit -m "Add the capstone key points for Module ${m}" -m "<live> live and <draft> draft key points; ${rounds} check rounds."\`, filling in the two counts.
If the pre-commit hook fails, fix only what it reports in ${fileOf(m)} and commit again; never bypass the hook.
Return the module number, the commit hash (or "none") and the body you used.`, { label: `commit:m${pad2(m)}`, phase: 'Commit', schema: COMMIT, effort: 'low' })
  if (c) commits.push(`m${pad2(m)} ${c.commit}: ${c.body}`)
}

const final = await agent(`${HOOKS}
Run \`node scripts/content/key-points.ts report\` and return its two lines as report.
Run \`node scripts/content/key-points.ts needs-dani\` and return its last line as needsDani.
Run \`pnpm --silent content:validate\` and return its last line as validate. Do not edit any file.`, { label: 'final', phase: 'Commit', schema: FINAL, effort: 'low' })

return { stage: STAGE, rounds, commits, report: final?.report ?? [], needsDani: final?.needsDani ?? '', validate: final?.validate ?? '' }
```

Expected return of the write stage: `{ stage: 'write', rounds: <1 to 5>, commits: [...], report: [...], needsDani: '...', validate: '...' }` with 13 `mNN <hash>: <live> live and <draft> draft key points; <rounds> check rounds.` lines in `commits`, a report whose second line is `Modules under 4 live: none`, and `validate` reading `content:validate: 13 rules, 0 findings`.
The log holds counts only: `write: <n> drafts in 13 files; 0 files with problems`, one `<tag>: <n> batches` and one grade and stamp summary per round, and `top-up: <n> modules under 4 live`.

- [ ] **Step 3: Check the result in the worktree**

```bash
node scripts/content/key-points.ts report
node scripts/content/key-points.ts needs-dani
cat content/project/key-points/*.yaml | grep -cE '^    status: (live|draft)$'
git log --oneline master..HEAD | grep -c 'Add the capstone key points for Module'
pnpm --silent content:validate
```

Expected: `Modules under 4 live: none` on the report's second line, between 52 and 78 key points that are not retired in all (4 to 6 per file), 13 commits, and `content:validate: 13 rules, 0 findings`.
`needs-dani` may list a few drafts; they do not block the merge as long as each module has at least 4 live key points.

- [ ] **Step 4: When a module is still under 4 live, run the check stage or ask Dani**

When Step 3's report lists a module and today is Monday, October 26 or earlier, run the script again with `{ "worktree": ..., "stage": "check" }`, then repeat Step 3.
After October 26, or when the check stage still leaves a module short, show Dani the output of `node scripts/content/key-points.ts needs-dani` (key points are not exam items, so he may read their text in the files); he rewrites or retires those drafts by hand, the check stage runs once more, and Step 3 is repeated.
A module that is still short on Wednesday, October 28 merges with what it has, and Task 19 reports it, because Task 19 checks that every module has at least 4 live key points.

- [ ] **Step 5: Merge `master` into the branch once Task 11 is on `master`**

Task 11 adds key point ids to R2, key point concepts to R6 and key point and brief text to R7, so a live key point can only be proven clean against those rules after it lands.

```bash
git log --oneline -1 master --grep="Check key points in R2, R6 and R7 and ship the project chunk"
git merge --no-edit master
pnpm --silent content:validate
```

Expected: the first line is Task 11's commit `Check key points in R2, R6 and R7 and ship the project chunk` (when it prints nothing, Task 11 is not on `master` yet, so wait), the merge succeeds with no conflict because no other branch touches `content/project/key-points/`, and the validator prints `content:validate: 13 rules, 0 findings`.
When it prints findings in `content/project/key-points/`, run the script with `{ "worktree": ..., "stage": "check" }`, whose Fix phase hands each file's findings to its writer, and repeat this step until it prints 0 findings.

- [ ] **Step 6: Merge into `master` and union the check results (controller)**

Run from the repository root, with `$REPO` set to it and `$SCRATCH` set as in Step 1, while no other merge is in flight:

```bash
git merge --no-ff content/phase-6-key-points -m "Merge the capstone key points" -m "Adds 4 to 6 reference key points per capstone decision, written, checked by the critic and stamped."
node -e "
const fs = require('node:fs');
const [from, to] = process.argv.slice(1);
const read = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
fs.mkdirSync(to, { recursive: true });
const passes = { ...read(to + '/passes.json', {}), ...read(from + '/passes.json', {}) };
fs.writeFileSync(to + '/passes.json', JSON.stringify(passes, null, 2) + '\n');
const failures = read(to + '/failures.json', []);
for (const f of read(from + '/failures.json', [])) if (!failures.some((o) => o.id === f.id && o.hash === f.hash)) failures.push(f);
fs.writeFileSync(to + '/failures.json', JSON.stringify(failures, null, 2) + '\n');
console.log('passes', Object.keys(passes).length, 'failures', failures.length);
" "$SCRATCH/p6/wt-key-points/.results/key-points" "$REPO/.results/key-points"
node scripts/content/key-points.ts report
pnpm --silent content:validate
```

Expected: the merge commit is made with the hook's `pnpm check` passing, the union prints `passes <n> failures <m>` (counts only), the report's second line is `Modules under 4 live: none`, and the validator prints `content:validate: 13 rules, 0 findings`.
The union keeps every pass and failure from both copies, so a later `prepare` in the repository never re-batches a key point that already failed at its hash; Task 19 removes the worktree and its branch.

---

## Task 8: The capstone engine and the plan export

**Depends on:** nothing (starts at once in the `engine` worktree).

**Covers:** P6-070, P6-072, P6-073, P6-074, P6-080 (engine read), P6-081, P6-086, P6-088, P6-089, P6-090, P6-091.

**Files:**
- Create: `schemas/project-view.ts`, `src/engine/capstone.ts`, `src/engine/plan.ts`, `tests/unit/capstone.test.ts`, `tests/unit/plan.test.ts`
- Modify: `scripts/content/lib/text.ts` (exports `ABBREVIATIONS` and `SENTENCE_BREAK`; no Phase 4 task edits this file)
- Test: `tests/unit/capstone.test.ts`, `tests/unit/plan.test.ts`, `tests/unit/text.test.ts`

Design notes:
- `schemas/project-view.ts` is zod-free, like `schemas/ids.ts`, because `src/engine` imports it and the app's initial bundle must never pull in zod; Task 11 makes `schemas/project.ts` import `CRITERION_ORDER` from it, so one criterion tuple remains.
- `decisionsOf` reads `decision` events in id order and keeps, per module, the first `self` and the first `final` that follows a `self`; a second final, a final with no self before it and a later self change nothing, which is the rule Task 12 puts into `deriveMemory` (spec 6 allows one re-grade).
- Key point ids in a `final` are copied as written, so an id the content no longer has (retired, or a key point from an old backup) stays in the record and never throws (spec 8.4).
- `decisionStage` gives `done` to a module with a counted final and `self` to one with only a self-grade, whatever the dates; otherwise `locked` until every lesson of the module is read, `waiting` through the exam's study day, and `open` from `openDay(examDate)`, the study day after it, so with the booked exam the decisions open on Sunday, November 15 and a moved exam moves them (spec 10.1, Phase 6 row).
- Citations are stored as `[[concept-id]]` and shown as `[[Display Name]]`: `toStored` maps a name (any case), an id or an alias to the canonical id and leaves an unknown token as typed; `toShown` maps an id or alias to the current name, so a renamed concept follows; `citedText` gives plain names for the export; `citationsOf` counts distinct canonical ids and lists unknown tokens by the text Dani typed, skipping blank ones.
- `canSelfGrade` needs every heading non-empty and at least `MIN_CITATIONS` (2) distinct known concepts in Why (spec 6).
- `planMarkdown` builds `cafe-cloud-plan.md`: `# <title>`, the summary table `| Module | Decision | Self | Final |` with the first sentence of each Decision (or `Not written yet`) and totals as `7/12` (or `-`), then `## Decision N: <title>` with the six headings as `###`, each body one sentence per line, or `Not written yet.` when empty.
- `oneSentencePerLine` turns every em dash, with the spaces around it, into ` - `, then splits each line exactly where `multiSentenceLines` would object, using copies of `SENTENCE_BREAK` and `ABBREVIATIONS` (`src` cannot import `scripts`, and a test pins the copies equal); a list marker stays on the first sentence and later sentences take its width as indent; links, inline code and bare URLs are never split, and a URL ends before trailing punctuation, so `https://calculator.aws/#/estimate?id=abc1.` still splits after the link; table rows and blank lines pass through, and runs of blank lines collapse to one.
- In the summary table `|` is escaped as `\|`; links stay verbatim everywhere, so the Pricing Calculator link that Mission 8 asks for survives the export.
- The engine never sees the clock: callers pass `today` and `examDate` (`memory.examDate`, else `TARGET_EXAM_DATE`).

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/capstone.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import type { AdrText } from '../../schemas/project-view.ts';
import {
  type ConceptName,
  canSelfGrade,
  citationsOf,
  citedText,
  decisionDrift,
  decisionStage,
  decisionsOf,
  driftOf,
  MIN_CITATIONS,
  openDay,
  scoreTotal,
  toShown,
  toStored,
} from '../../src/engine/capstone.ts';
import { timelineOf } from '../fixtures/events.ts';

function grade(
  module: number,
  stage: 'self' | 'final',
  scores: [number, number, number, number],
  keyPoints?: string[],
): NewEvent {
  return { t: 'decision', module, stage, scores, ...(keyPoints === undefined ? {} : { keyPoints }) };
}

const CONCEPTS: ConceptName[] = [
  { id: 'shared-kitchen', name: 'Shared kitchen', aliases: ['communal-kitchen'] },
  { id: 'per-minute-rental', name: 'Per-minute rental', aliases: [] },
  { id: 'oven-zones', name: 'Oven zones', aliases: [] },
];

const WRITTEN: AdrText = {
  context: 'The bakery opens a second shop.',
  options: 'Rent a shared kitchen.\nBuild our own kitchen.',
  decision: 'Rent a shared kitchen.',
  why: 'A [[shared-kitchen]] scales with orders and [[per-minute-rental]] keeps costs low.',
  tradeoffs: 'Peak hours are busy; we book early.',
  cost: 'We pay per minute.',
};

describe('decisionsOf', () => {
  it('keeps the first self and the first final after it, by event id', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', grade(2, 'final', [3, 3, 3, 3])],
      ['2026-11-15T10:00:00.000Z', grade(2, 'self', [1, 2, 2, 1])],
      ['2026-11-15T11:00:00.000Z', grade(2, 'self', [3, 3, 3, 3])],
      ['2026-11-15T12:00:00.000Z', grade(2, 'final', [2, 2, 2, 2], ['kp-02-burst'])],
      ['2026-11-16T12:00:00.000Z', grade(2, 'final', [0, 0, 0, 0])],
    ]);
    const record = decisionsOf([...log].reverse()).get(2);
    expect(record?.self).toEqual({ scores: [1, 2, 2, 1], at: '2026-11-15T10:00:00.000Z', day: '2026-11-15' });
    expect(record?.final).toEqual({
      scores: [2, 2, 2, 2],
      keyPoints: ['kp-02-burst'],
      at: '2026-11-15T12:00:00.000Z',
      day: '2026-11-15',
    });
  });

  it('ignores a final with no self before it', () => {
    const log = timelineOf([['2026-11-15T09:00:00.000Z', grade(4, 'final', [3, 3, 3, 3])]]);
    expect(decisionsOf(log).get(4)).toBeUndefined();
  });

  it('keeps key point ids it does not know', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', grade(1, 'self', [1, 1, 1, 1])],
      ['2026-11-15T09:05:00.000Z', grade(1, 'final', [2, 2, 2, 2], ['kp-01-gone', 'not-an-id'])],
    ]);
    expect(decisionsOf(log).get(1)?.final?.keyPoints).toEqual(['kp-01-gone', 'not-an-id']);
  });

  it('reads only decision events', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', { t: 'lesson.done', note: 'm01/what-a-bakery-cloud-is' }],
      ['2026-11-15T09:05:00.000Z', { t: 'mission', mission: 'mission-00', step: 'start' }],
    ]);
    expect(decisionsOf(log).size).toBe(0);
  });
});

describe('drift', () => {
  it('is final total minus self total, and null until both exist', () => {
    expect(scoreTotal([1, 2, 3, 0])).toBe(6);
    const self = { scores: [1, 1, 2, 2] as const, at: '', day: '' };
    expect(decisionDrift({ self, final: null })).toBeNull();
    expect(decisionDrift({ self, final: { ...self, scores: [2, 2, 2, 3], keyPoints: [] } })).toBe(3);
  });

  it('sums only decisions with both grades', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', grade(1, 'self', [1, 1, 1, 1])],
      ['2026-11-15T09:05:00.000Z', grade(1, 'final', [2, 2, 1, 1])],
      ['2026-11-15T10:00:00.000Z', grade(2, 'self', [3, 3, 3, 3])],
      ['2026-11-15T10:05:00.000Z', grade(2, 'final', [2, 3, 3, 3])],
      ['2026-11-15T11:00:00.000Z', grade(3, 'self', [0, 0, 0, 0])],
    ]);
    expect(driftOf(decisionsOf(log))).toEqual({ decisions: 2, total: 1 });
    expect(driftOf(new Map())).toEqual({ decisions: 0, total: 0 });
  });
});

describe('decisionStage', () => {
  const base = { lessonsRead: true, examDate: '2026-11-14', record: undefined };

  it('waits through the exam day and opens the study day after it', () => {
    expect(openDay('2026-11-14')).toBe('2026-11-15');
    expect(decisionStage({ ...base, today: '2026-11-14' })).toBe('waiting');
    expect(decisionStage({ ...base, today: '2026-11-15' })).toBe('open');
  });

  it('stays locked until the module is read', () => {
    expect(decisionStage({ ...base, lessonsRead: false, today: '2026-11-20' })).toBe('locked');
    expect(decisionStage({ ...base, lessonsRead: false, today: '2026-10-20' })).toBe('locked');
  });

  it('moves the opening with the exam date', () => {
    expect(decisionStage({ ...base, examDate: '2026-11-28', today: '2026-11-15' })).toBe('waiting');
    expect(decisionStage({ ...base, examDate: '2026-11-28', today: '2026-11-29' })).toBe('open');
  });

  it('keeps a graded decision self or done when the exam moves later', () => {
    const log = timelineOf([
      ['2026-11-15T09:00:00.000Z', grade(5, 'self', [2, 2, 2, 2])],
      ['2026-11-15T10:00:00.000Z', grade(6, 'self', [2, 2, 2, 2])],
      ['2026-11-15T10:05:00.000Z', grade(6, 'final', [3, 2, 2, 2])],
    ]);
    const decisions = decisionsOf(log);
    const later = { lessonsRead: false, today: '2026-11-15', examDate: '2026-12-12' };
    expect(decisionStage({ ...later, record: decisions.get(5) })).toBe('self');
    expect(decisionStage({ ...later, record: decisions.get(6) })).toBe('done');
  });
});

describe('citations', () => {
  it('counts distinct canonical ids, an alias once with its concept', () => {
    const stored = 'See [[shared-kitchen]], [[communal-kitchen]] and [[per-minute-rental]].';
    expect(citationsOf(stored, CONCEPTS)).toEqual({
      ids: ['shared-kitchen', 'per-minute-rental'],
      unknown: [],
    });
  });

  it('lists unknown tokens by the text typed and never throws', () => {
    const stored =
      'Both [[Flour silo]] and [[flour-silo]] and [[Flour silo]] and [[ ]] and [[shared-kitchen]].';
    expect(citationsOf(stored, CONCEPTS)).toEqual({
      ids: ['shared-kitchen'],
      unknown: ['Flour silo', 'flour-silo'],
    });
    expect(citationsOf('a half [[token and [[]] here', CONCEPTS)).toEqual({ ids: [], unknown: [] });
  });

  it('round-trips display names through stored ids, and follows a rename', () => {
    const shown = 'Pick [[Shared kitchen]] over [[oven zones]]; keep [[Flour silo]].';
    const stored = toStored(shown, CONCEPTS);
    expect(stored).toBe('Pick [[shared-kitchen]] over [[oven-zones]]; keep [[Flour silo]].');
    expect(toShown(stored, CONCEPTS)).toBe(
      'Pick [[Shared kitchen]] over [[Oven zones]]; keep [[Flour silo]].',
    );
    const renamed = CONCEPTS.map((c) => (c.id === 'shared-kitchen' ? { ...c, name: 'Kitchen share' } : c));
    expect(toShown(stored, renamed)).toBe('Pick [[Kitchen share]] over [[Oven zones]]; keep [[Flour silo]].');
    expect(toShown('Old [[communal-kitchen]].', CONCEPTS)).toBe('Old [[Shared kitchen]].');
  });

  it('reads citations as plain names for the export', () => {
    expect(citedText('A [[shared-kitchen]] and [[Flour silo]].', CONCEPTS)).toBe(
      'A Shared kitchen and Flour silo.',
    );
  });
});

describe('canSelfGrade', () => {
  it('needs every heading and two distinct known citations in Why', () => {
    expect(MIN_CITATIONS).toBe(2);
    expect(canSelfGrade(WRITTEN, CONCEPTS)).toBe(true);
    expect(canSelfGrade({ ...WRITTEN, cost: '  ' }, CONCEPTS)).toBe(false);
    expect(canSelfGrade({ ...WRITTEN, why: '[[shared-kitchen]] and [[communal-kitchen]].' }, CONCEPTS)).toBe(
      false,
    );
    expect(canSelfGrade({ ...WRITTEN, why: '[[shared-kitchen]] and [[Flour silo]].' }, CONCEPTS)).toBe(false);
  });
});
```

Create `tests/unit/plan.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { AdrText, ProjectChunk } from '../../schemas/project-view.ts';
import {
  emDashLines,
  multiSentenceLines,
  ABBREVIATIONS as SCRIPT_ABBREVIATIONS,
  SENTENCE_BREAK as SCRIPT_SENTENCE_BREAK,
} from '../../scripts/content/lib/text.ts';
import { type ConceptName, decisionsOf } from '../../src/engine/capstone.ts';
import {
  ABBREVIATIONS,
  oneSentencePerLine,
  PLAN_FILE,
  planMarkdown,
  SENTENCE_BREAK,
} from '../../src/engine/plan.ts';
import { timelineOf } from '../fixtures/events.ts';

const CONCEPTS: ConceptName[] = [
  { id: 'shared-kitchen', name: 'Shared kitchen', aliases: [] },
  { id: 'per-minute-rental', name: 'Per-minute rental', aliases: [] },
];

const RUBRIC: ProjectChunk['rubric'] = {
  passTotal: 8,
  criteria: [
    { id: 'fit', name: 'Fit', levels: ['a', 'b', 'c', 'd'] },
    { id: 'grounding', name: 'Grounding', levels: ['a', 'b', 'c', 'd'] },
    { id: 'tradeoffs', name: 'Trade-offs', levels: ['a', 'b', 'c', 'd'] },
    { id: 'cost', name: 'Cost and responsibility', levels: ['a', 'b', 'c', 'd'] },
  ],
};

const PROJECT: ProjectChunk = {
  title: 'Move the bakery to the cloud',
  facts: ['The bakery has two shops.'],
  rubric: RUBRIC,
  decisions: [
    { module: 1, title: 'Kitchen model', prompt: 'Pick a kitchen model.', context: [], keyPoints: [] },
    { module: 2, title: 'Oven rental', prompt: 'Pick how to rent ovens.', context: [], keyPoints: [] },
  ],
};

const DRAFT: AdrText = {
  context: 'The bakery opens a second shop. Mornings are busy.',
  options: '- Rent a [[shared-kitchen]]. It is ready now.\n- Build our own kitchen.',
  decision: 'Rent a shared kitchen | by the hour. We review it in May.',
  why: 'A [[shared-kitchen]] scales\u2014and [[per-minute-rental]] keeps costs low, e.g. at night. See https://calculator.aws/#/estimate?id=abc1 for details.',
  tradeoffs: 'Peak hours are busy. We book early.',
  cost: 'Estimate: https://calculator.aws/#/estimate?id=abc1. We pay per minute.',
};

describe('the export', () => {
  it('copies the sentence rule of scripts/content/lib/text.ts exactly', () => {
    expect(ABBREVIATIONS).toEqual(SCRIPT_ABBREVIATIONS);
    expect(SENTENCE_BREAK.source).toBe(SCRIPT_SENTENCE_BREAK.source);
    expect(SENTENCE_BREAK.flags).toBe(SCRIPT_SENTENCE_BREAK.flags);
  });

  it('splits sentences, replaces em dashes and keeps list markers, abbreviations and links', () => {
    expect(oneSentencePerLine('One. Two!  Three? four.')).toBe('One.\nTwo!\nThree? four.');
    expect(oneSentencePerLine('Fast\u2014cheap \u2014 good.')).toBe('Fast - cheap - good.');
    expect(oneSentencePerLine('Use e.g. Lambda. Then stop.')).toBe('Use e.g. Lambda.\nThen stop.');
    expect(oneSentencePerLine('1. Tag it. Then check.')).toBe('1. Tag it.\n   Then check.');
    expect(oneSentencePerLine('See [the A. Guide](https://x.example/a.b). Next.')).toBe(
      'See [the A. Guide](https://x.example/a.b).\nNext.',
    );
    expect(oneSentencePerLine('A\r\n\r\n\r\n\r\nB')).toBe('A\n\nB');
  });

  it('builds one sentence per line with no em dash, escaped cells and links kept', () => {
    const decisions = decisionsOf(
      timelineOf([
        ['2026-11-15T09:00:00.000Z', { t: 'decision', module: 1, stage: 'self', scores: [2, 2, 1, 2] }],
        [
          '2026-11-15T09:10:00.000Z',
          { t: 'decision', module: 1, stage: 'final', scores: [2, 3, 2, 2], keyPoints: [] },
        ],
      ]),
    );
    const text = planMarkdown({
      project: PROJECT,
      drafts: new Map([[1, DRAFT]]),
      decisions,
      concepts: CONCEPTS,
    });
    expect(PLAN_FILE).toBe('cafe-cloud-plan.md');
    expect(multiSentenceLines(text)).toEqual([]);
    expect(emDashLines(text)).toEqual([]);
    expect(text).toContain('https://calculator.aws/#/estimate?id=abc1');
    expect(text).toBe(
      [
        '# Move the bakery to the cloud',
        '',
        '| Module | Decision | Self | Final |',
        '|---|---|---|---|',
        '| 1 | Rent a shared kitchen \\| by the hour. | 7/12 | 9/12 |',
        '| 2 | Not written yet | - | - |',
        '',
        '## Decision 1: Kitchen model',
        '',
        '### Context',
        '',
        'The bakery opens a second shop.',
        'Mornings are busy.',
        '',
        '### Options considered',
        '',
        '- Rent a Shared kitchen.',
        '  It is ready now.',
        '- Build our own kitchen.',
        '',
        '### Decision',
        '',
        'Rent a shared kitchen | by the hour.',
        'We review it in May.',
        '',
        '### Why',
        '',
        'A Shared kitchen scales - and Per-minute rental keeps costs low, e.g. at night.',
        'See https://calculator.aws/#/estimate?id=abc1 for details.',
        '',
        '### Trade-offs and mitigation',
        '',
        'Peak hours are busy.',
        'We book early.',
        '',
        '### Cost note',
        '',
        'Estimate: https://calculator.aws/#/estimate?id=abc1.',
        'We pay per minute.',
        '',
        '## Decision 2: Oven rental',
        '',
        '### Context',
        '',
        'Not written yet.',
        '',
        '### Options considered',
        '',
        'Not written yet.',
        '',
        '### Decision',
        '',
        'Not written yet.',
        '',
        '### Why',
        '',
        'Not written yet.',
        '',
        '### Trade-offs and mitigation',
        '',
        'Not written yet.',
        '',
        '### Cost note',
        '',
        'Not written yet.',
        '',
      ].join('\n'),
    );
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/capstone.test.ts tests/unit/plan.test.ts 2>&1 | grep -E "Error:|Test Files"
```

Expected: `Error: Cannot find module '../../src/engine/capstone.ts'` for both files and `Test Files  2 failed (2)`.

- [ ] **Step 3: Export the sentence rule from `scripts/content/lib/text.ts`**

In `scripts/content/lib/text.ts`, replace `const ABBREVIATIONS = [` with these two lines:

```ts
/** Exported with `SENTENCE_BREAK` so `tests/unit/plan.test.ts` pins the copies in `src/engine/plan.ts` to them. */
export const ABBREVIATIONS = [
```

Then replace `const SENTENCE_BREAK = ` with `export const SENTENCE_BREAK = ` (the regex itself does not change):

```bash
perl -pi -e 's/^const SENTENCE_BREAK = /export const SENTENCE_BREAK = /' scripts/content/lib/text.ts
grep -n "^export const \(ABBREVIATIONS\|SENTENCE_BREAK\)" scripts/content/lib/text.ts
```

Expected: two lines, `15:export const ABBREVIATIONS = [` and `30:export const SENTENCE_BREAK = /(\S+)[.!?]["')\]]*\s+(?=[A-Z0-9"'([])/g;`.

- [ ] **Step 4: Write the shared view types and the two engine modules**

Create `schemas/project-view.ts`:

```ts
/**
 * Zod-free capstone shapes shared by the build, the engine and the app (spec 6).
 * `src/engine` imports this file, so it must never import zod; `schemas/project.ts` validates the YAML.
 */

/** The six ADR headings, in editor and export order (spec 6). */
export const ADR_HEADINGS = [
  'Context',
  'Options considered',
  'Decision',
  'Why',
  'Trade-offs and mitigation',
  'Cost note',
] as const;

/** The draft field behind each heading, in the same order. */
export const ADR_FIELDS = ['context', 'options', 'decision', 'why', 'tradeoffs', 'cost'] as const;
export type AdrField = (typeof ADR_FIELDS)[number];

/** The text of one ADR, citations stored as `[[concept-id]]`. */
export type AdrText = Record<AdrField, string>;

/** Rubric criteria in score order: a `decision` event's `scores` tuple follows it. */
export const CRITERION_ORDER = ['fit', 'grounding', 'tradeoffs', 'cost'] as const;
export type CriterionId = (typeof CRITERION_ORDER)[number];

export interface RubricView {
  passTotal: number;
  criteria: { id: CriterionId; name: string; levels: readonly [string, string, string, string] }[];
}

/** A live reference key point with the note line that grounds it and where to read it. */
export interface KeyPointView {
  id: string;
  text: string;
  concepts: string[];
  read: { route: string; text: string };
}

export interface DecisionView {
  module: number;
  title: string;
  prompt: string;
  context: string[];
  keyPoints: KeyPointView[];
}

/** The lazy project chunk: the brief, the rubric and the live key points, loaded only by the Project screen. */
export interface ProjectChunk {
  title: string;
  facts: string[];
  rubric: RubricView;
  decisions: DecisionView[];
}
```

Create `src/engine/capstone.ts`:

```ts
import type { StudyEvent } from '../../schemas/events.ts';
import { ADR_FIELDS, type AdrText } from '../../schemas/project-view.ts';
import { addDays } from './day.ts';

/**
 * The capstone (spec 6), derived from `decision` events: one self-grade and one final re-grade per module.
 * The first `self` counts, then the first `final` after it; any later grade changes nothing,
 * so XP, drift and Architect all read the same two grades.
 */

/** Rubric scores in `CRITERION_ORDER`: fit, grounding, trade-offs, cost and responsibility. */
export type Scores = readonly [number, number, number, number];

interface Grade {
  scores: Scores;
  at: string;
  day: string;
}

export interface DecisionRecord {
  self: Grade | null;
  /** Key point ids are kept as written, even ones the content no longer has (spec 8.4). */
  final: (Grade & { keyPoints: readonly string[] }) | null;
}

type DecisionEvent = Extract<StudyEvent, { t: 'decision' }>;

/** The counted self and final grade of each module that has one, read in id order. */
export function decisionsOf(events: readonly StudyEvent[]): ReadonlyMap<number, DecisionRecord> {
  const sorted = events
    .filter((e): e is DecisionEvent => e.t === 'decision')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const out = new Map<number, DecisionRecord>();
  for (const e of sorted) {
    const record = out.get(e.module) ?? { self: null, final: null };
    const grade: Grade = { scores: [...e.scores], at: e.at, day: e.day };
    if (e.stage === 'self' && record.self === null) out.set(e.module, { ...record, self: grade });
    if (e.stage === 'final' && record.self !== null && record.final === null) {
      out.set(e.module, { ...record, final: { ...grade, keyPoints: [...(e.keyPoints ?? [])] } });
    }
  }
  return out;
}

export function scoreTotal(scores: readonly number[]): number {
  return scores.reduce((sum, s) => sum + s, 0);
}

/** Final total minus self total, or null until both grades exist (spec 6). */
export function decisionDrift(d: DecisionRecord): number | null {
  if (d.self === null || d.final === null) return null;
  return scoreTotal(d.final.scores) - scoreTotal(d.self.scores);
}

/** How many decisions have both grades, and the sum of their drift. */
export function driftOf(decisions: ReadonlyMap<number, DecisionRecord>): {
  decisions: number;
  total: number;
} {
  let count = 0;
  let total = 0;
  for (const d of decisions.values()) {
    const drift = decisionDrift(d);
    if (drift === null) continue;
    count++;
    total += drift;
  }
  return { decisions: count, total };
}

/** `locked` until the module is read, `waiting` until the study day after the exam, then `open`; grades win. */
export type DecisionStage = 'locked' | 'waiting' | 'open' | 'self' | 'done';

export function decisionStage(args: {
  lessonsRead: boolean;
  today: string;
  examDate: string;
  record: DecisionRecord | undefined;
}): DecisionStage {
  if (args.record?.final != null) return 'done';
  if (args.record?.self != null) return 'self';
  if (!args.lessonsRead) return 'locked';
  return args.today < openDay(args.examDate) ? 'waiting' : 'open';
}

/** The study day decisions open: the day after the exam (spec 10.1, Phase 6 row). */
export function openDay(examDate: string): string {
  return addDays(examDate, 1);
}

/** The fewest distinct concepts the Why section cites before the self-grade opens (spec 6). */
export const MIN_CITATIONS = 2;

export interface ConceptName {
  id: string;
  name: string;
  /** Old ids that now mean this concept. */
  aliases: readonly string[];
}

const TOKEN = /\[\[([^[\]\n]+)\]\]/g;

function byIdOrAlias(token: string, concepts: readonly ConceptName[]): ConceptName | undefined {
  return concepts.find((c) => c.id === token) ?? concepts.find((c) => c.aliases.includes(token));
}

function byName(token: string, concepts: readonly ConceptName[]): ConceptName | undefined {
  const name = token.toLowerCase();
  return concepts.find((c) => c.name.toLowerCase() === name);
}

/** Distinct canonical ids cited as `[[id]]` (aliases resolve), and the distinct tokens that name no concept. */
export function citationsOf(
  stored: string,
  concepts: readonly ConceptName[],
): { ids: string[]; unknown: string[] } {
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const match of stored.matchAll(TOKEN)) {
    const token = (match[1] ?? '').trim();
    if (token === '') continue;
    const concept = byIdOrAlias(token, concepts);
    const list = concept === undefined ? unknown : ids;
    const value = concept === undefined ? token : concept.id;
    if (!list.includes(value)) list.push(value);
  }
  return { ids, unknown };
}

/** Editor text to stored text: `[[Display Name]]` becomes `[[concept-id]]`; a token naming no concept stays as typed. */
export function toStored(shown: string, concepts: readonly ConceptName[]): string {
  return shown.replace(TOKEN, (whole, inner: string) => {
    const token = inner.trim();
    const concept = byName(token, concepts) ?? byIdOrAlias(token, concepts);
    return concept === undefined ? whole : `[[${concept.id}]]`;
  });
}

/** Stored text to editor text: `[[concept-id]]` (or an alias) becomes `[[Current Name]]`, so a rename follows. */
export function toShown(stored: string, concepts: readonly ConceptName[]): string {
  return stored.replace(TOKEN, (whole, inner: string) => {
    const concept = byIdOrAlias(inner.trim(), concepts);
    return concept === undefined ? whole : `[[${concept.name}]]`;
  });
}

/** Stored text for reading: each citation becomes its plain display name, an unknown one its typed text. */
export function citedText(stored: string, concepts: readonly ConceptName[]): string {
  return stored.replace(TOKEN, (_whole, inner: string) => {
    const token = inner.trim();
    return byIdOrAlias(token, concepts)?.name ?? token;
  });
}

/** Every heading written and at least `MIN_CITATIONS` distinct known concepts cited in Why. */
export function canSelfGrade(text: AdrText, concepts: readonly ConceptName[]): boolean {
  if (ADR_FIELDS.some((field) => text[field].trim() === '')) return false;
  return citationsOf(text.why, concepts).ids.length >= MIN_CITATIONS;
}
```

Create `src/engine/plan.ts`:

```ts
import { ADR_FIELDS, ADR_HEADINGS, type AdrText, type ProjectChunk } from '../../schemas/project-view.ts';
import { type ConceptName, citedText, type DecisionRecord, scoreTotal } from './capstone.ts';

/**
 * The capstone export (spec 6): `cafe-cloud-plan.md`, a summary table and the 13 ADRs,
 * one sentence per line with no em dashes, whatever Dani typed.
 */

export const PLAN_FILE = 'cafe-cloud-plan.md';

/**
 * Copies of `ABBREVIATIONS` and `SENTENCE_BREAK` in `scripts/content/lib/text.ts`, which `src` cannot import;
 * `tests/unit/plan.test.ts` pins them equal, so the export splits exactly where rule R8 would object.
 */
export const ABBREVIATIONS = [
  'e.g.',
  'i.e.',
  'etc.',
  'vs.',
  'U.S.',
  'Inc.',
  'Mr.',
  'Ms.',
  'Dr.',
  'No.',
  'approx.',
  'a.m.',
  'p.m.',
];
export const SENTENCE_BREAK = /(\S+)[.!?]["')\]]*\s+(?=[A-Z0-9"'([])/g;

const EM_DASH = /\s*\u2014\s*/g;
const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
/** Links, inline code and bare URLs are never split inside. */
const PROTECTED = /\[[^\]]*\]\([^)]*\)|`[^`]*`|https?:\/\/\S*[^\s.,;:!?'")\]]/g;
const NOT_WRITTEN = 'Not written yet';

function protectedRanges(line: string): [number, number][] {
  return [...line.matchAll(PROTECTED)].map((m) => [m.index, m.index + m[0].length]);
}

function splitLine(line: string): string[] {
  const marker = LIST_MARKER.exec(line)?.[0] ?? '';
  const body = line.slice(marker.length);
  const keep = protectedRanges(body);
  const pieces: string[] = [];
  let start = 0;
  for (const match of body.matchAll(SENTENCE_BREAK)) {
    const head = match[1] ?? '';
    const stop = match.index + head.length;
    const word = head + (body[stop] ?? '');
    if (ABBREVIATIONS.some((a) => word.endsWith(a)) || /^[A-Z]$/.test(head)) continue;
    if (keep.some(([from, to]) => stop >= from && stop < to)) continue;
    const end = match.index + match[0].length;
    pieces.push(body.slice(start, end).trimEnd());
    start = end;
  }
  pieces.push(body.slice(start).trimEnd());
  const indent = ' '.repeat(marker.length);
  return pieces.filter((p) => p !== '').map((p, i) => (i === 0 ? marker : indent) + p);
}

/** Dani's text with em dashes as ` - ` and each sentence on its own line; blank lines and table rows stay. */
export function oneSentencePerLine(text: string): string {
  return text
    .replaceAll('\r\n', '\n')
    .replace(EM_DASH, ' - ')
    .split('\n')
    .flatMap((line) =>
      line.trim() === '' || line.trimStart().startsWith('|') ? [line.trim()] : splitLine(line),
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cell(text: string): string {
  return text.replaceAll('|', '\\|');
}

function scoreCell(record: DecisionRecord | undefined, stage: 'self' | 'final'): string {
  const grade = record?.[stage];
  return grade == null ? '-' : `${scoreTotal(grade.scores)}/12`;
}

/** The whole `cafe-cloud-plan.md`: title, summary table, then one section per decision with the six ADR headings. */
export function planMarkdown(args: {
  project: ProjectChunk;
  drafts: ReadonlyMap<number, AdrText>;
  decisions: ReadonlyMap<number, DecisionRecord>;
  concepts: readonly ConceptName[];
}): string {
  const prose = (stored: string) => oneSentencePerLine(citedText(stored, args.concepts));
  const lines = [`# ${args.project.title}`, '', '| Module | Decision | Self | Final |', '|---|---|---|---|'];
  for (const d of args.project.decisions) {
    const chosen = prose(args.drafts.get(d.module)?.decision ?? '').split('\n')[0] ?? '';
    const record = args.decisions.get(d.module);
    lines.push(
      `| ${d.module} | ${cell(chosen === '' ? NOT_WRITTEN : chosen)} | ${scoreCell(record, 'self')} | ${scoreCell(record, 'final')} |`,
    );
  }
  for (const d of args.project.decisions) {
    lines.push('', `## Decision ${d.module}: ${d.title}`);
    const draft = args.drafts.get(d.module);
    ADR_FIELDS.forEach((field, i) => {
      const body = prose(draft?.[field] ?? '');
      lines.push('', `### ${ADR_HEADINGS[i]}`, '', body === '' ? `${NOT_WRITTEN}.` : body);
    });
  }
  return `${lines.join('\n')}\n`;
}
```

- [ ] **Step 5: Run the tests and the checks and see them pass**

```bash
pnpm test tests/unit/capstone.test.ts tests/unit/plan.test.ts tests/unit/text.test.ts 2>&1 | tail -5
pnpm typecheck
pnpm lint
```

Expected: `Test Files  3 passed (3)`, with the 15 tests of `capstone.test.ts` and the 3 of `plan.test.ts` among them; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`, which also confirms that neither engine file imports app, store or UI code.

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix
git add schemas/project-view.ts src/engine/capstone.ts src/engine/plan.ts scripts/content/lib/text.ts tests/unit/capstone.test.ts tests/unit/plan.test.ts
git commit -m "Add the capstone engine and the plan export" -m "Pure helpers read decision events, open decisions after the exam, check concept citations, compute drift and build cafe-cloud-plan.md one sentence per line."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 9: The mission engine

**Depends on:** nothing (starts at once in the `engine` worktree, after Task 8).

**Covers:** P6-112, P6-115, P6-119 (logic), P6-123 (logic), P6-124 (logic), P6-125, P6-126, P6-131, P6-137.

**Files:**
- Create: `src/engine/missions.ts`, `tests/unit/missions.test.ts`
- Test: `tests/unit/missions.test.ts`

Design notes:
- The log always wins: the gate and plan fit only choose between `locked`, `not-on-plan` and `ready` for a mission with no open attempt, so a started mission keeps its stage, its chip and its cleanup when Dani later unticks a service or imports a log from before the plan existed (spec 5.3 rules 1 and 2).
- `stepMission` is the one reader of mission events, exported so Task 12's memory replay pays XP by the same rules: a `start` opens the first attempt, or a retry after a cleanup with no Verify, and any other later `start` is ignored; inside an attempt only the first event of each step counts.
- Verify counts only before cleanup (the flow never offers it after), so "verified before cleaned" is simply `attempt.verified !== null`.
- A usage check counts only on a later study day than the cleanup (the kept mission: than Verify), and one on the same day is ignored rather than recorded, so it can never block the real check the next day.
- A non-kept attempt ends at its usage check: with Verify the mission is `closed`, without it the mission is `ready` again; the gate (`GATE_MISSION`, Mission 0) closes on its first Verify; the kept Mission 1 closes on a later-day usage check after Verify; a closed mission never restarts, and nothing after `closed` counts.
- Gate and kept missions are `started` from Start until Verify and are never `live`, `overdue` or `cleaned`; a `cleaned` event on them is ignored, so Mission 1 can never yield a cleanup.
- A non-kept attempt is `live` from Start, `overdue` once `now - start` exceeds `maxLiveHours` hours (`DEFAULT_LIVE_HOURS`, 2, when the frontmatter has none), and `cleaned` from its cleanup until the usage check; `liveMs` comes from `now` alone, so an e2e test can move `page.clock` past the limit (P6-137).
- `missing` lists the mission's services that `plan.services` does not mark `true`; a service the plan does not name counts as not offered, and with no plan record every service is missing; the gate never has missing services, because its form is what records the plan.
- `usageFrom` is the study day after the open attempt's cleanup (kept: after Verify); `missionSafety` returns the lowest-numbered overdue cleanup, else the lowest-numbered usage check whose `usageFrom` is today or earlier.
- `planServices` is the sorted union of every non-gate mission's `services`, the plan-fit list of Mission 0's form.
- `missionStatuses` takes `tz` like every engine helper that takes the clock, but days come from the events' own `day`, so `tz` changes nothing today.
- Unknown mission ids in the log are ignored here, since the statuses follow the shipped missions.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/missions.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and see it fail**

```bash
pnpm test tests/unit/missions.test.ts 2>&1 | grep -E "Error:|Test Files"
```

Expected: `Error: Cannot find module '../../src/engine/missions.ts'` and `Test Files  1 failed (1)`.

- [ ] **Step 3: Write the mission engine**

Create `src/engine/missions.ts`:

```ts
import type { StudyEvent } from '../../schemas/events.ts';
import { addDays } from './day.ts';

/**
 * Mission state (spec 5.3), derived from `mission` events, the `plan` record and the clock.
 * The log always wins: the gate and plan fit only choose between `locked`, `not-on-plan` and `ready`
 * for a mission with no open attempt, so a started mission keeps its chip and its cleanup.
 */

/** Mission 0 locks every other mission until it has a `verified` event (spec 5.3 rule 1). */
export const GATE_MISSION = 'mission-00';
/** Spec 5.3 rule 6's default; the schema makes cleaned-up missions write it out. */
export const DEFAULT_LIVE_HOURS = 2;
const HOUR_MS = 3_600_000;

/** What the engine needs of a mission page's frontmatter. */
export interface MissionRef {
  id: string;
  n: number;
  keep: boolean;
  gate: boolean;
  maxLiveHours: number | null;
  services: readonly string[];
}

/** The kv `plan` record that Mission 0's Plan status form writes (spec 8.1). */
export interface PlanRecord {
  plan: 'free' | 'paid';
  credits: number;
  endsOn: string;
  /** Service name to whether the plan offers it; a service missing here counts as not offered. */
  services: Readonly<Record<string, boolean>>;
  recordedAt: string;
}

export type MissionStep = Extract<StudyEvent, { t: 'mission' }>['step'];

export interface StepAt {
  at: string;
  day: string;
}

/** One try at a mission, opened by `start`; only the first event of each step counts. */
export interface MissionAttempt {
  start: StepAt;
  verified: StepAt | null;
  cleaned: StepAt | null;
  usageOk: (StepAt & { credits: number | null }) | null;
}

export interface MissionLog {
  attempts: readonly MissionAttempt[];
  /** When the mission closed for good; nothing after it counts. */
  closed: StepAt | null;
}

export type MissionEvent = Extract<StudyEvent, { t: 'mission' }>;

/** A mission log while it is read, one event at a time; `missionLogOf` and the memory replay both grow one. */
export interface OpenMissionLog {
  attempts: MissionAttempt[];
  closed: StepAt | null;
}

/** Whether an attempt is over: a non-kept attempt ends with its later-day usage check. */
function attemptOver(a: MissionAttempt): boolean {
  return a.usageOk !== null;
}

/**
 * Applies one event of mission `m` to its log: a `start` opens the first attempt, or a retry after a cleanup with no
 * Verify; Verify counts only before cleanup; a usage check counts only on a later study day than the cleanup (the
 * kept mission: than Verify); the gate closes on Verify, any other mission on the usage check of a verified attempt.
 */
export function stepMission(m: MissionRef, log: OpenMissionLog, e: MissionEvent): void {
  if (log.closed !== null) return;
  const step: StepAt = { at: e.at, day: e.day };
  const current = log.attempts.at(-1);
  if (e.step === 'start') {
    const retry = current !== undefined && current.cleaned !== null && current.verified === null;
    if (current === undefined || retry) {
      log.attempts.push({ start: step, verified: null, cleaned: null, usageOk: null });
    }
    return;
  }
  if (current === undefined || attemptOver(current)) return;
  if (e.step === 'verified') {
    if (current.verified !== null || current.cleaned !== null) return;
    current.verified = step;
    if (m.gate) log.closed = step;
    return;
  }
  if (e.step === 'cleaned') {
    if (!m.keep && !m.gate && current.cleaned === null) current.cleaned = step;
    return;
  }
  if (m.gate) return;
  const after = m.keep ? current.verified : current.cleaned;
  if (after === null || e.day <= after.day) return;
  current.usageOk = { ...step, credits: e.credits ?? null };
  if (current.verified !== null) log.closed = step;
}

/** Each known mission's attempts and close, from events in id order; unknown mission ids are ignored. */
export function missionLogOf(
  events: readonly StudyEvent[],
  missions: readonly MissionRef[],
): ReadonlyMap<string, MissionLog> {
  const refs = new Map(missions.map((m) => [m.id, m]));
  const logs = new Map<string, OpenMissionLog>();
  const sorted = events
    .filter((e): e is MissionEvent => e.t === 'mission')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const e of sorted) {
    const m = refs.get(e.mission);
    if (m === undefined) continue;
    const log = logs.get(m.id) ?? { attempts: [], closed: null };
    logs.set(m.id, log);
    stepMission(m, log, e);
  }
  return logs;
}

export type MissionStage =
  | 'locked'
  | 'not-on-plan'
  | 'ready'
  | 'started'
  | 'live'
  | 'overdue'
  | 'cleaned'
  | 'verified'
  | 'closed';

export interface MissionStatus {
  id: string;
  n: number;
  stage: MissionStage;
  /** Services of this mission that the plan does not offer; always empty for the gate. */
  missing: readonly string[];
  /** Time since `start` while live or overdue, else null. */
  liveMs: number | null;
  /** The first study day the usage check is offered, while it waits. */
  usageFrom: string | null;
  closedDay: string | null;
}

const NO_LOG: MissionLog = { attempts: [], closed: null };

function statusOf(
  m: MissionRef,
  log: MissionLog,
  gatePassed: boolean,
  plan: PlanRecord | null,
  now: Date,
): MissionStatus {
  const missing = m.gate ? [] : m.services.filter((s) => plan?.services[s] !== true);
  const base = { id: m.id, n: m.n, missing, liveMs: null, usageFrom: null, closedDay: null };
  if (log.closed !== null) return { ...base, stage: 'closed', closedDay: log.closed.day };
  const open = log.attempts.at(-1);
  if (open !== undefined && !attemptOver(open)) {
    if (m.gate) return { ...base, stage: 'started' };
    if (m.keep) {
      if (open.verified === null) return { ...base, stage: 'started' };
      return { ...base, stage: 'verified', usageFrom: addDays(open.verified.day, 1) };
    }
    if (open.cleaned !== null) return { ...base, stage: 'cleaned', usageFrom: addDays(open.cleaned.day, 1) };
    const liveMs = now.getTime() - Date.parse(open.start.at);
    const limit = (m.maxLiveHours ?? DEFAULT_LIVE_HOURS) * HOUR_MS;
    return { ...base, stage: liveMs > limit ? 'overdue' : 'live', liveMs };
  }
  if (!m.gate && !gatePassed) return { ...base, stage: 'locked' };
  return { ...base, stage: missing.length > 0 ? 'not-on-plan' : 'ready' };
}

/**
 * Every mission's stage, in the order given. Days come from the events' own `day`, so `tz` (minutes east of UTC,
 * as every engine helper that takes the clock receives it) changes nothing today.
 */
export function missionStatuses(args: {
  missions: readonly MissionRef[];
  log: ReadonlyMap<string, MissionLog>;
  plan: PlanRecord | null;
  now: Date;
  tz: number;
}): MissionStatus[] {
  const gatePassed = args.log.get(GATE_MISSION)?.closed != null;
  return args.missions.map((m) => statusOf(m, args.log.get(m.id) ?? NO_LOG, gatePassed, args.plan, args.now));
}

/** The plan-fit list: the sorted union of every non-gate mission's services. */
export function planServices(missions: readonly MissionRef[]): string[] {
  return [...new Set(missions.filter((m) => !m.gate).flatMap((m) => m.services))].sort();
}

function lowest(statuses: readonly MissionStatus[]): MissionStatus | null {
  return [...statuses].sort((a, b) => a.n - b.n)[0] ?? null;
}

/** The live (or overdue) mission the top bar chip shows, lowest number first. */
export function liveMission(statuses: readonly MissionStatus[]): MissionStatus | null {
  return lowest(statuses.filter((s) => s.stage === 'live' || s.stage === 'overdue'));
}

export type MissionSafety = { kind: 'cleanup' | 'usage'; mission: string; n: number };

/** Next's mission entry (spec 4.6): an overdue cleanup first, then a usage check that is due today. */
export function missionSafety(statuses: readonly MissionStatus[], today: string): MissionSafety | null {
  const overdue = lowest(statuses.filter((s) => s.stage === 'overdue'));
  if (overdue !== null) return { kind: 'cleanup', mission: overdue.id, n: overdue.n };
  const usage = lowest(statuses.filter((s) => s.usageFrom !== null && today >= s.usageFrom));
  return usage === null ? null : { kind: 'usage', mission: usage.id, n: usage.n };
}
```

- [ ] **Step 4: Run the test and the checks and see them pass**

```bash
pnpm test tests/unit/missions.test.ts 2>&1 | tail -4
pnpm typecheck
pnpm lint
```

Expected: `Test Files  1 passed (1)` and `Tests  14 passed (14)`; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`.

- [ ] **Step 5: Commit**

```bash
pnpm lint:fix
git add src/engine/missions.ts tests/unit/missions.test.ts
git commit -m "Add the mission state engine" -m "A pure module turns mission events, the plan record and the clock into each mission's stage, the live mission and the mission safety action."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 10: Phase 6 kv keys, draft guards and style anchors

**Depends on:** Tasks 8 and 9; Phase 4 Task 6 (the last Phase 4 edit of `src/store/kv.ts` and `tests/unit/migrations.test.ts`, which appends `labDrafts`) and Phase 4 Task 7 (the `base.css` anchors).
Rebase onto `master` first and check `grep -n "labDrafts: 'labDrafts'," src/store/kv.ts` and `grep -n "^/\* Labs: shared and Sort \*/" src/ui/base.css` each print one line.

**Covers:** P6-075, P6-114, P6-117, P6-175.

**Files:**
- Create: `src/app/adr-draft.ts`, `src/app/mission-records.ts`, `tests/unit/adr-draft.test.ts`, `tests/unit/mission-records.test.ts`
- Modify: `src/store/kv.ts`, `tests/unit/migrations.test.ts`, `src/ui/base.css`
- Test: `tests/unit/adr-draft.test.ts`, `tests/unit/mission-records.test.ts`, `tests/unit/migrations.test.ts`, `tests/unit/backup.test.ts`

Design notes:
- ADR drafts live in 13 kv keys, `adr-01` to `adr-13` (`adrKey(module)`), because an import keeps the newer `updatedAt` per key (spec 8.3): one record for all 13 would drop a module typed on another device.
- `plan` (`PlanRecord` from Task 9) and `missionTicks` (`Record<missionId, string[]>`) are one record each, like Phase 4's `labDrafts`: Mission 0's form and the Already done form write the plan, and the mission flow writes the ticks.
- kv values stay `unknown` in the backup schema, so no schema or migration changes; the guards check every value read back from kv, a backup or another device, and never throw.
- `adrDraftOf` keeps tick ids the content no longer has (spec 8.4), drops unknown fields and rejects a draft missing any of the six texts; `emptyAdrDraft` prefills Context with the brief's context sentences, one per line (spec 6).
- `planOf` accepts only `free` or `paid`, a finite credit balance of 0 or more, an `endsOn` day, a parseable `recordedAt` and a `services` map of booleans; `withTick` returns a copy and drops a mission left with no ticks.
- The two new `base.css` anchors go right before `/* Labs: shared and Sort */`, so `/* Lightning */` stays the last anchor of the file for Phase 4 Task 19; afterwards Task 14 writes only under `/* Missions: flow */` and Tasks 17 and 18 only under `/* Capstone */`.
- Nothing here enters the initial bundle yet: the guards are imported by the lazy screens of Tasks 14, 16 and 17.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/adr-draft.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { adrDraftOf, emptyAdrDraft } from '../../src/app/adr-draft.ts';

describe('ADR drafts', () => {
  it('starts with the brief context one sentence per line and nothing else written', () => {
    expect(emptyAdrDraft(['The bakery opens a second shop.', 'Mornings are busy.'])).toEqual({
      v: 1,
      context: 'The bakery opens a second shop.\nMornings are busy.',
      options: '',
      decision: '',
      why: '',
      tradeoffs: '',
      cost: '',
      ticks: [],
    });
  });

  it('accepts a round-tripped draft and keeps tick ids it does not know', () => {
    const draft = {
      ...emptyAdrDraft(['A shop.']),
      why: '[[shared-kitchen]]',
      ticks: ['kp-01-gone', 'kp-01-live'],
    };
    expect(adrDraftOf(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  });

  it('drops extra fields and rejects wrong shapes', () => {
    const draft = emptyAdrDraft(['A shop.']);
    expect(adrDraftOf({ ...draft, extra: 1 })).toEqual(draft);
    expect(adrDraftOf(null)).toBeNull();
    expect(adrDraftOf('text')).toBeNull();
    expect(adrDraftOf([draft])).toBeNull();
    expect(adrDraftOf({ ...draft, v: 2 })).toBeNull();
    expect(adrDraftOf({ ...draft, why: 3 })).toBeNull();
    expect(adrDraftOf({ ...draft, ticks: 'kp-01-a' })).toBeNull();
    expect(adrDraftOf({ ...draft, ticks: [1] })).toBeNull();
    const { cost: _cost, ...noCost } = draft;
    expect(adrDraftOf(noCost)).toBeNull();
  });
});
```

Create `tests/unit/mission-records.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { planOf, ticksOf, withTick } from '../../src/app/mission-records.ts';
import type { PlanRecord } from '../../src/engine/missions.ts';

const PLAN: PlanRecord = {
  plan: 'free',
  credits: 140,
  endsOn: '2027-04-10',
  services: { 'Amazon S3': true, 'Amazon VPC': false },
  recordedAt: '2026-10-10T09:00:00.000Z',
};

describe('planOf', () => {
  it('accepts a round-tripped plan record', () => {
    expect(planOf(JSON.parse(JSON.stringify(PLAN)))).toEqual(PLAN);
    expect(planOf({ ...PLAN, plan: 'paid', credits: 0, services: {} })).toEqual({
      ...PLAN,
      plan: 'paid',
      credits: 0,
      services: {},
    });
  });

  it('rejects wrong shapes', () => {
    expect(planOf(null)).toBeNull();
    expect(planOf([PLAN])).toBeNull();
    expect(planOf({ ...PLAN, plan: 'business' })).toBeNull();
    expect(planOf({ ...PLAN, credits: -1 })).toBeNull();
    expect(planOf({ ...PLAN, credits: '140' })).toBeNull();
    expect(planOf({ ...PLAN, credits: Number.NaN })).toBeNull();
    expect(planOf({ ...PLAN, endsOn: 'April' })).toBeNull();
    expect(planOf({ ...PLAN, recordedAt: 'soon' })).toBeNull();
    expect(planOf({ ...PLAN, services: { 'Amazon S3': 'yes' } })).toBeNull();
    expect(planOf({ ...PLAN, services: ['Amazon S3'] })).toBeNull();
  });
});

describe('mission ticks', () => {
  it('reads ticks and drops malformed entries', () => {
    expect(ticksOf({ 'mission-00': ['budget', 'mfa'], 'mission-03': 'bucket', 'mission-04': [1] })).toEqual({
      'mission-00': ['budget', 'mfa'],
    });
    expect(ticksOf(null)).toEqual({});
    expect(ticksOf(['mission-00'])).toEqual({});
  });

  it('ticks and unticks one step without touching the input', () => {
    const before = { 'mission-00': ['budget'] };
    const ticked = withTick(before, 'mission-00', 'mfa', true);
    expect(ticked).toEqual({ 'mission-00': ['budget', 'mfa'] });
    expect(before).toEqual({ 'mission-00': ['budget'] });
    expect(withTick(ticked, 'mission-00', 'mfa', true)).toEqual({ 'mission-00': ['budget', 'mfa'] });
    expect(withTick(ticked, 'mission-03', 'bucket', true)).toEqual({
      'mission-00': ['budget', 'mfa'],
      'mission-03': ['bucket'],
    });
    expect(withTick(before, 'mission-00', 'budget', false)).toEqual({});
  });
});
```

In `tests/unit/migrations.test.ts`, change the kv import to:

```ts
import { ADR_KEY_PREFIX, adrKey, KV_KEYS } from '../../src/store/kv.ts';
```

and, in `describe('KV_KEYS', ...)`, replace the end of the pinned object and the describe's closing lines, from `      labDrafts: 'labDrafts',` to the end of the describe, with:

```ts
      labDrafts: 'labDrafts',
      plan: 'plan',
      missionTicks: 'missionTicks',
    });
  });

  it('gives each module its own ADR draft key', () => {
    expect(ADR_KEY_PREFIX).toBe('adr-');
    expect([1, 3, 13].map(adrKey)).toEqual(['adr-01', 'adr-03', 'adr-13']);
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/adr-draft.test.ts tests/unit/mission-records.test.ts tests/unit/migrations.test.ts 2>&1 | grep -E "Error:|AssertionError|Test Files"
```

Expected: `Cannot find module '../../src/app/adr-draft.ts'` and `Cannot find module '../../src/app/mission-records.ts'`, the `KV_KEYS` pin failing with `expected { lastExportAt: 'lastExportAt', …(8) } to deeply equal { lastExportAt: 'lastExportAt', …(10) }`, `expected undefined to be 'adr-'`, and `Test Files  3 failed (3)`.

- [ ] **Step 3: Add the keys to `src/store/kv.ts`**

In the doc comment above `KV_KEYS`, replace the line ` * `labDrafts` holds `Record<lab id, { rev, actions, hints }>` for unfinished labs.` and the ` */` after it with:

```ts
 * `labDrafts` holds `Record<lab id, { rev, actions, hints }>` for unfinished labs.
 * `plan` is the plan status that Mission 0 or the Already done form records, `{ plan, credits, endsOn, services,
 * recordedAt }`, and `missionTicks` maps each mission id to its ticked step ids (spec 5.3, 8.1).
 * The capstone ADR drafts live under `adr-01` to `adr-13` (`adrKey`), one key per module, so an import that keeps
 * the newer `updatedAt` per key never drops a module typed on another device (spec 6, 8.3).
 */
```

Then replace `  labDrafts: 'labDrafts',` and the `} as const;` after it with:

```ts
  labDrafts: 'labDrafts',
  plan: 'plan',
  missionTicks: 'missionTicks',
} as const;

/** The prefix of the 13 ADR draft keys. */
export const ADR_KEY_PREFIX = 'adr-';

/** The kv key of one module's ADR draft: `adr-01` to `adr-13`. */
export function adrKey(module: number): string {
  return `${ADR_KEY_PREFIX}${String(module).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Write the guards**

Create `src/app/adr-draft.ts`:

```ts
import { ADR_FIELDS, type AdrText } from '../../schemas/project-view.ts';

/**
 * One capstone ADR draft (spec 6), kept in kv under `adrKey(module)`: the six headings, citations stored as
 * `[[concept-id]]`, and the key point ids ticked after the reveal, held here until the final grade.
 * Text stays editable after grading; the grades live in `decision` events and never change.
 */
export interface AdrDraft extends AdrText {
  v: 1;
  ticks: string[];
}

/** A new draft whose Context holds the brief's context sentences, one per line. */
export function emptyAdrDraft(context: readonly string[]): AdrDraft {
  return {
    v: 1,
    context: context.join('\n'),
    options: '',
    decision: '',
    why: '',
    tradeoffs: '',
    cost: '',
    ticks: [],
  };
}

/** The draft in a kv value, or null when it is not one; tick ids the content no longer has are kept. Never throws. */
export function adrDraftOf(value: unknown): AdrDraft | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.v !== 1 || !Array.isArray(v.ticks) || !v.ticks.every((t) => typeof t === 'string')) return null;
  if (!ADR_FIELDS.every((field) => typeof v[field] === 'string')) return null;
  const text = Object.fromEntries(ADR_FIELDS.map((field) => [field, v[field] as string])) as AdrText;
  return { v: 1, ...text, ticks: [...(v.ticks as string[])] };
}
```

Create `src/app/mission-records.ts`:

```ts
import type { PlanRecord } from '../engine/missions.ts';

/**
 * Guards for the two mission kv records (spec 5.3, 8.1): `plan`, the plan status, and `missionTicks`,
 * each mission's ticked step ids. A value from an old backup or another device is checked, never trusted.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The plan record in a kv value, or null when it is malformed. Never throws. */
export function planOf(value: unknown): PlanRecord | null {
  if (!isRecord(value)) return null;
  const { plan, credits, endsOn, services, recordedAt } = value;
  if (plan !== 'free' && plan !== 'paid') return null;
  if (typeof credits !== 'number' || !Number.isFinite(credits) || credits < 0) return null;
  if (typeof endsOn !== 'string' || !DAY.test(endsOn)) return null;
  if (typeof recordedAt !== 'string' || Number.isNaN(Date.parse(recordedAt))) return null;
  if (!isRecord(services) || !Object.values(services).every((on) => typeof on === 'boolean')) return null;
  return { plan, credits, endsOn, services: { ...(services as Record<string, boolean>) }, recordedAt };
}

/** Each mission's ticked step ids, dropping malformed entries. Never throws. */
export function ticksOf(value: unknown): Readonly<Record<string, readonly string[]>> {
  if (!isRecord(value)) return {};
  const out: Record<string, string[]> = {};
  for (const [mission, steps] of Object.entries(value)) {
    if (Array.isArray(steps) && steps.every((s) => typeof s === 'string')) out[mission] = [...steps];
  }
  return out;
}

/** A copy of `ticks` with `step` of `mission` ticked or unticked; a mission left with no ticks drops out. */
export function withTick(
  ticks: Readonly<Record<string, readonly string[]>>,
  mission: string,
  step: string,
  on: boolean,
): Record<string, string[]> {
  const out: Record<string, string[]> = Object.fromEntries(
    Object.entries(ticks).map(([m, steps]) => [m, [...steps]]),
  );
  const steps = (out[mission] ?? []).filter((s) => s !== step);
  if (on) steps.push(step);
  if (steps.length === 0) delete out[mission];
  else out[mission] = steps;
  return out;
}
```

- [ ] **Step 5: Add the two Phase 6 anchors to `src/ui/base.css`**

```bash
perl -0pi -e 's{^/\* Labs: shared and Sort \*/$}{/* Missions: flow */\n\n/* Capstone */\n\n/* Labs: shared and Sort */}m' src/ui/base.css
grep -n "^/\* \(Missions: flow\|Capstone\|Labs: shared and Sort\|Lightning\) \*/" src/ui/base.css
```

Expected: four lines in this order, `/* Missions: flow */`, `/* Capstone */` two lines below it, `/* Labs: shared and Sort */` two lines below that, and `/* Lightning */` last.

- [ ] **Step 6: Run the tests and the checks and see them pass**

```bash
pnpm test tests/unit/adr-draft.test.ts tests/unit/mission-records.test.ts tests/unit/migrations.test.ts tests/unit/backup.test.ts 2>&1 | tail -4
pnpm typecheck
pnpm lint
```

Expected: `Test Files  4 passed (4)`, with the 3 tests of `adr-draft.test.ts`, the 4 of `mission-records.test.ts` and the new `gives each module its own ADR draft key` among them, and `backup.test.ts` unchanged (kv values stay `unknown`); `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`.

- [ ] **Step 7: Commit**

```bash
pnpm lint:fix
git add src/store/kv.ts tests/unit/migrations.test.ts src/ui/base.css src/app/adr-draft.ts src/app/mission-records.ts tests/unit/adr-draft.test.ts tests/unit/mission-records.test.ts
git commit -m "Add kv keys and guards for ADR drafts, mission ticks and the plan" -m "ADR drafts get one kv key per module, missions get a ticks record and the plan record, and base.css gains the Missions and Capstone anchors."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 11: Key points in the content pipeline, and the project chunk

**Depends on:** Tasks 4, 6 and 8; Phase 4 Task 14 (the last Phase 4 edit of `r02-ids.ts`, `r06-references.ts`, `schemas/chunks.ts`, `scripts/content/build.ts`, `scripts/content/validate.ts`, `tests/fixtures/index.ts`, `tests/unit/build.test.ts` and `tests/unit/r06.test.ts`; Phase 4 Task 2 edits `r07-originality.ts` and `style.ts` before it).
Task 3 also edits `scripts/content/lib/style.ts` and `tests/unit/style.test.ts`, and Task 14 also edits `schemas/chunks.ts`, `scripts/content/build.ts` and `tests/unit/build.test.ts`; whichever of them lands second rebases onto the first.
The `style.ts`, `chunks.ts`, `build.ts` and `build.test.ts` hunks are disjoint; in `style.test.ts` both tasks edit the import from `style.ts` and append a `describe` at the end of the file, so on that rebase keep both sides: one import with every name and both `describe` blocks.

**Covers:** P6-047, P6-057, P6-059, P6-060, P6-066 (validate hook), P6-176, P6-177.

**Files:**
- Create: `tests/unit/project-chunk.test.ts`, `tests/content/bad/r02-key-point-id.yaml`, `tests/content/bad/r06-key-point-concept.yaml`, `tests/content/bad/r07-key-point-run.yaml`, `tests/content/bad/r08-retired-plan-in-mission.md`
- Modify: `scripts/content/lib/style.ts`, `scripts/content/rules/r02-ids.ts`, `scripts/content/rules/r06-references.ts`, `scripts/content/rules/r07-originality.ts`, `scripts/content/rules/r08-style.ts`, `schemas/project.ts`, `schemas/chunks.ts`, `scripts/content/build.ts`, `scripts/content/validate.ts`, `scripts/check-budgets.ts`, `tests/fixtures/index.ts`, `tests/unit/sw-manifest.test.ts`, `tests/unit/project-rules.test.ts`, `tests/unit/style.test.ts`, `tests/unit/build.test.ts`, `tests/unit/r06.test.ts`
- Test: `tests/unit/project-rules.test.ts`, `tests/unit/project-chunk.test.ts`, `tests/unit/style.test.ts`, `tests/unit/r02.test.ts`, `tests/unit/r06.test.ts`, `tests/unit/r07.test.ts`, `tests/unit/r08.test.ts`, `tests/unit/build.test.ts`, `tests/unit/build-real.test.ts`, `tests/unit/sw-manifest.test.ts`, `tests/content/bad.test.ts`

Names this task uses from Task 4 (`scripts/content/lib/project.ts`): `projectOf(ctx): Project` with `Project { brief: Brief | null; keyPoints: readonly KeyPointEntry[]; strings: readonly ProjectString[]; errors }`, `KeyPointEntry { path; line; index; module; kp }`, `ProjectString { path; line; field; text }` (every brief string by field path, like `decisions[0].prompt`, and each key point text by id), `BRIEF_FILE` and `KEY_POINT_FILE`; from Task 6 (`scripts/content/lib/key-point-checks.ts`): `demoteKeyPoints(ctx: Context): string[]`; from Task 8: `ProjectChunk`, `KeyPointView` and `CRITERION_ORDER` in `schemas/project-view.ts`; and the Task 4 fixture tree (`content/project/brief.yaml` and `key-points/01-baking-basics.yaml` under `tests/fixtures/content-root/`, with the live `kp-01-borrow-on-busy-days` and three drafts) and the `run(rule, edits)` helper, `BRIEF` and `KEY_POINTS` of `tests/unit/project-rules.test.ts`.

Design notes:
- R2 claims every key point id with the other id kinds, so a concept alias or any other id can never shadow a key point; ids never collide between key point files, since the loader takes one file per module and each id carries its module.
- R2 keeps concept display names unique, case-insensitively, with `concept name '<name>' is used by <a> and <b>`, because the ADR editor maps a typed name back to one id (Task 8's `toStored`); the real registry passes today (`pnpm --silent content:validate` stays at 0 findings).
- R2 also keeps every live or retired key point of HEAD: decision events store the ids Dani ticked, so a key point leaves only as `status: retired`; drafts may go, and a key point file that does not parse is R1's finding, not a key point that is gone.
- R6 checks that every non-retired key point concept is registered (aliases resolve) and tested, like lab and incident concepts.
- R7 runs the 9-word no-run check over live key point text and every brief string, like lab text; drafts are left to the critic, as for questions.
- R8 reports a retired Support plan name (Developer Support, Business Support without the plus, Enterprise On-Ramp) in any brief string, key point text or mission page line, through `retiredPlanProblems`, the old body of `labStyleProblems`, which stays as an alias so one matcher remains (spec 1.2: the capstone uses exam-current names).
- The build emits the project as one lazy chunk, `content/project.<hash8>.json`, only when a brief exists, with the brief, the rubric and each decision's live key points; each key point's `read` link points at the section of the first concept home note that holds its evidence line, as a question's does, and its concepts are canonical ids; `ContentIndex.project` holds the path or `null`.
- Only the Project screen loads the chunk (Task 17), so no other screen can show a key point before the self-grade (P6-177); it never reads the exam pool, which a test pins.
- `scripts/check-budgets.ts` budgets the chunk like a module chunk (120 KB gzipped), allows 0 or 1, and checks the service worker precaches it; `scripts/lib/sw-manifest.ts` already lists every build file, so it needs no change.
- `content:validate --demote` also runs `demoteKeyPoints` on a fresh context, so the note-edit workflow of spec 8.4 sends a stale key point back to draft; its behaviour is tested in Task 6, and this task proves the wiring on the real repo.
- `schemas/project.ts` drops its own `CRITERION_IDS` for the `CRITERION_ORDER` import, so the zod schema and the app read one tuple.
- The brief named the R2 bad fixture `r02-key-point-gone.yaml`, but `tests/content/bad.test.ts` builds a fixture root with no HEAD, so a "gone" case cannot fire there; `r02-key-point-id.yaml` (an alias that takes a key point id) fires R2, and the HEAD case is tested in `project-rules.test.ts` with a stubbed `head`.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/project-rules.test.ts` (created by Task 4), add these imports at the top and change the `context.ts` import to bring in the `Context` type:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
```

```ts
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
```

Then append to the end of the file:

```ts
const CONCEPTS = 'content/concepts.yaml';
const MISSION = 'content/missions/mission-00-guardrails.md';
const COPIED = 'Bakers rent proofing cabinets by the minute and hand them back once the dough has risen.';
const COPIED_RUN = 'bakers rent proofing cabinets by the minute and hand them back once the dough has risen';

/** R2 findings with the fixture key point file, as `headEdit` makes it, in HEAD, after `edits` to the working tree. */
function r02WithHead(headEdit: (text: string) => string, edits: [string, string, string][]): string[] {
  const root = makeFixtureRoot();
  const headText = headEdit(readFileSync(join(root, KEY_POINTS), 'utf8'));
  for (const [file, from, to] of edits) replaceIn(root, file, from, to);
  const ctx: Context = {
    ...loadContext(root, { today: FIXTURE_TODAY }),
    head: (path) => (path === KEY_POINTS ? headText : null),
    headPaths: (prefix) => (KEY_POINTS.startsWith(prefix) ? [KEY_POINTS] : []),
  };
  return runRules(ctx, ['R2']).findings.map((f) => `${f.file}:${f.line ?? '-'} ${f.message}`);
}

describe('key point ids and concept names in R2', () => {
  it('passes the fixture', () => {
    expect(run('R2')).toEqual([]);
  });

  it('claims key point ids with every other id', () => {
    expect(
      run('R2', [
        [CONCEPTS, '  confusableWith: [shared-kitchen]\n', '  aliases: [kp-01-borrow-on-busy-days]\n'],
      ]),
    ).toEqual([
      `${KEY_POINTS}:- id 'kp-01-borrow-on-busy-days' (key point) is already used by alias of per-minute-rental in ${CONCEPTS}`,
    ]);
  });

  it('keeps concept display names unique, whatever their case', () => {
    expect(run('R2', [[CONCEPTS, 'name: Per-minute rental', 'name: shared KITCHEN']])).toEqual([
      `${CONCEPTS}:- concept name 'shared KITCHEN' is used by shared-kitchen and per-minute-rental`,
    ]);
  });

  it('keeps a live or retired key point of HEAD and lets a draft go', () => {
    const renameLive: [string, string, string] = [
      KEY_POINTS,
      'id: kp-01-borrow-on-busy-days',
      'id: kp-01-borrow-on-fairs',
    ];
    expect(r02WithHead((text) => text, [renameLive])).toEqual([
      `${KEY_POINTS}:- key point 'kp-01-borrow-on-busy-days' is live or retired in HEAD but is gone; retire it in place with status: retired`,
    ]);
    const retiredInHead = (text: string) =>
      text.replace(
        'id: kp-01-give-capacity-back\n    status: draft',
        'id: kp-01-give-capacity-back\n    status: retired',
      );
    const renameDraft: [string, string, string] = [
      KEY_POINTS,
      'id: kp-01-give-capacity-back',
      'id: kp-01-hand-ovens-back',
    ];
    expect(r02WithHead((text) => text, [renameDraft])).toEqual([]);
    expect(r02WithHead(retiredInHead, [renameDraft])).toEqual([
      `${KEY_POINTS}:- key point 'kp-01-give-capacity-back' is live or retired in HEAD but is gone; retire it in place with status: retired`,
    ]);
  });
});

describe('key point concepts in R6', () => {
  it('passes the fixture', () => {
    expect(run('R6')).toEqual([]);
  });

  it('reports a key point concept that is not registered or not tested', () => {
    const rye: [string, string, string] = [
      KEY_POINTS,
      'concepts: [per-minute-rental]\n    evidence: Cabinets',
      'concepts: [rye-bread]\n    evidence: Cabinets',
    ];
    expect(run('R6', [rye])).toEqual([
      `${KEY_POINTS}:13 kp-01-pay-only-while-proofing: concept 'rye-bread' is not registered`,
    ]);
  });

  it('resolves a key point concept by its alias', () => {
    expect(
      run('R6', [
        [CONCEPTS, '  anchor: shared-kitchen\n', '  anchor: shared-kitchen\n  aliases: [communal-kitchen]\n'],
        [
          KEY_POINTS,
          'concepts: [shared-kitchen, per-minute-rental]',
          'concepts: [communal-kitchen, per-minute-rental]',
        ],
      ]),
    ).toEqual([]);
  });
});

describe('key point and brief text in R7', () => {
  it('passes the fixture', () => {
    expect(run('R7')).toEqual([]);
  });

  it('reports a live key point that copies a 9-word run from the course, and skips drafts', () => {
    const live: [string, string, string] = [
      KEY_POINTS,
      'The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.',
      COPIED,
    ];
    expect(run('R7', [live])).toEqual([
      `${KEY_POINTS}:4 kp-01-borrow-on-busy-days copies a 9-word run from the course: "${COPIED_RUN}"`,
    ]);
    const draft: [string, string, string] = [
      KEY_POINTS,
      'Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.',
      COPIED,
    ];
    expect(run('R7', [draft])).toEqual([]);
  });

  it('reports a brief string that copies a 9-word run from the course', () => {
    const copied: [string, string, string] = [BRIEF, 'Dough proofs for about an hour.', COPIED];
    expect(run('R7', [copied])).toEqual([
      `${BRIEF}:29 decisions[1].context[0] copies a 9-word run from the course: "${COPIED_RUN}"`,
    ]);
  });
});

describe('retired Support plan names in R8', () => {
  it('reports one in a key point, the brief and a mission page', () => {
    expect(
      run('R8', [
        [KEY_POINTS, 'the newer billing term', 'the Developer Support term'],
        [BRIEF, 'from the shared kitchen.', 'from the shared kitchen with Business Support.'],
        [
          MISSION,
          'Set up a budget before anything else.',
          'Set up a budget before anything else.\nSkip Enterprise On-Ramp here.',
        ],
      ]),
    ).toEqual([
      `${MISSION}:18 retired Support plan name in 'Skip Enterprise On-Ramp here.'`,
      `${BRIEF}:21 decisions[0].prompt: retired Support plan name in 'Choose how the first branch borrows ovens from the shared kitchen with Business Support.'`,
      `${KEY_POINTS}:25 kp-01-name-the-billing-term: retired Support plan name in 'The plan uses the Developer Support term that the bakery guide now prints.'`,
    ]);
  });

  it('accepts Business Support+', () => {
    expect(run('R8', [[KEY_POINTS, 'the newer billing term', 'the Business Support+ term']])).toEqual([]);
  });
});
```

Create `tests/unit/project-chunk.test.ts`:

```ts
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentIndex } from '../../schemas/chunks.ts';
import type { ProjectChunk } from '../../schemas/project-view.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { FIXTURE_TODAY, makeFixtureRoot, replaceIn } from '../fixtures/content-root.ts';
import { singleQuestion, writePool } from '../fixtures/questions.ts';

const KEY_POINTS = 'content/project/key-points/01-baking-basics.yaml';

function build(root = makeFixtureRoot()) {
  const built = buildContent(loadContext(root, { today: FIXTURE_TODAY }));
  const index = JSON.parse(built.files.get(built.indexFile) ?? 'null') as ContentIndex;
  const file = index.project === null ? undefined : built.files.get(index.project);
  return { built, index, file, project: file === undefined ? null : (JSON.parse(file) as ProjectChunk) };
}

describe('the project chunk', () => {
  it('ships the brief, the rubric and only live key points with their read links', () => {
    const { index, project } = build();
    expect(index.project).toMatch(/^content\/project\.[0-9a-f]{8}\.json$/);
    expect(project?.title).toBe('Move the bakery to the shared kitchen');
    expect(project?.facts).toHaveLength(7);
    expect(project?.rubric.passTotal).toBe(8);
    expect(project?.rubric.criteria.map((c) => c.id)).toEqual(['fit', 'grounding', 'tradeoffs', 'cost']);
    expect(project?.decisions.map((d) => d.module)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(project?.decisions[0]?.keyPoints).toEqual([
      {
        id: 'kp-01-borrow-on-busy-days',
        text: 'The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.',
        concepts: ['shared-kitchen'],
        read: {
          route: '#/m/01/l/what-a-bakery-cloud-is/shared-kitchen',
          text: 'Branches use ovens from one central kitchen when their queues grow.',
        },
      },
    ]);
    expect(project?.decisions.slice(1).every((d) => d.keyPoints.length === 0)).toBe(true);
  });

  it('holds no draft key point and no exam-pool text', () => {
    const root = makeFixtureRoot();
    const exam = singleQuestion({ id: 'q-9d4r6t', pool: 'exam', status: 'live' });
    writePool(root, [exam]);
    const { file } = build(root);
    expect(file).not.toContain('kp-01-pay-only-while-proofing');
    expect(file).not.toContain(exam.stem);
    expect(file).not.toContain('q-9d4r6t');
  });

  it('changes its name when a key point changes, and is null with no brief', () => {
    const before = build().index.project;
    const root = makeFixtureRoot();
    replaceIn(root, KEY_POINTS, 'on Saturdays instead', 'on market days instead');
    expect(build(root).index.project).not.toBe(before);
    const bare = makeFixtureRoot();
    rmSync(join(bare, 'content/project'), { recursive: true });
    const { index, built } = build(bare);
    expect(index.project).toBeNull();
    expect([...built.files.keys()].some((name) => name.startsWith('content/project.'))).toBe(false);
  });
});
```

In `tests/unit/style.test.ts`, add `labStyleProblems` and `retiredPlanProblems` to the import from `../../scripts/content/lib/style.ts` (keep the names sorted; Biome formats the list), and append:

```ts
describe('retiredPlanProblems', () => {
  it('names each text with a retired Support plan, and labStyleProblems is the same matcher', () => {
    const texts = [
      'Pick Developer Support for tests.',
      'Business Support+ answers in an hour.',
      'Business Support answers in a day.',
      'Enterprise On-Ramp adds a pool of managers.',
      'Enterprise Support adds a TAM.',
    ];
    expect(retiredPlanProblems(texts)).toEqual([
      "retired Support plan name in 'Pick Developer Support for tests.'",
      "retired Support plan name in 'Business Support answers in a day.'",
      "retired Support plan name in 'Enterprise On-Ramp adds a pool of managers.'",
    ]);
    expect(labStyleProblems(texts)).toEqual(retiredPlanProblems(texts));
  });
});
```

Create the four bad fixtures.
`tests/content/bad/r02-key-point-id.yaml`:

```yaml
# fixture-target: content/concepts.yaml
# R2: a concept alias takes the id of the live fixture key point.
- id: shared-kitchen
  name: Shared kitchen
  home: m01/what-a-bakery-cloud-is
  anchor: shared-kitchen
  tasks: ["1.1"]
- id: per-minute-rental
  name: Per-minute rental
  home: m01/what-a-bakery-cloud-is
  anchor: paying-by-the-minute
  tasks: ["4.1"]
  aliases: [kp-01-borrow-on-busy-days]
```

`tests/content/bad/r06-key-point-concept.yaml`:

```yaml
# fixture-target: content/project/key-points/01-baking-basics.yaml
# R6: a key point cites a concept the registry does not have.
module: 1
keyPoints:
  - id: kp-01-borrow-on-busy-days
    status: live
    text: The first branch borrows shared kitchen ovens on Saturdays instead of buying an oven that idles all week.
    concepts: [shared-kitchen]
    evidence: Branches use ovens from one central kitchen when their queues grow.
    verified:
      fullHash: 54bf2496a4d7
      checks: [critic@1]
      on: "2026-10-10"
  - id: kp-01-pay-only-while-proofing
    status: draft
    text: Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.
    concepts: [rye-bread]
    evidence: Cabinets are billed only while dough proofs.
  - id: kp-01-give-capacity-back
    status: draft
    text: Quiet weekday mornings hand the borrowed ovens back to the shared kitchen.
    concepts: [shared-kitchen, per-minute-rental]
    evidence: Borrow capacity when busy and give it back when quiet.
  - id: kp-01-name-the-billing-term
    status: draft
    text: The plan uses the newer billing term that the bakery guide now prints.
    concepts: [per-minute-rental]
    evidence: The fixture guide names a newer billing term.
```

`tests/content/bad/r07-key-point-run.yaml`:

```yaml
# fixture-target: content/project/key-points/01-baking-basics.yaml
# R7: the live key point copies a 9-word run of the made-up course text.
module: 1
keyPoints:
  - id: kp-01-borrow-on-busy-days
    status: live
    text: Bakers rent proofing cabinets by the minute and hand them back once the dough has risen.
    concepts: [shared-kitchen]
    evidence: Branches use ovens from one central kitchen when their queues grow.
    verified:
      fullHash: 54bf2496a4d7
      checks: [critic@1]
      on: "2026-10-10"
  - id: kp-01-pay-only-while-proofing
    status: draft
    text: Proofing cabinets cost money only while the dough is rising, so an empty cabinet costs nothing.
    concepts: [per-minute-rental]
    evidence: Cabinets are billed only while dough proofs.
  - id: kp-01-give-capacity-back
    status: draft
    text: Quiet weekday mornings hand the borrowed ovens back to the shared kitchen.
    concepts: [shared-kitchen, per-minute-rental]
    evidence: Borrow capacity when busy and give it back when quiet.
  - id: kp-01-name-the-billing-term
    status: draft
    text: The plan uses the newer billing term that the bakery guide now prints.
    concepts: [per-minute-rental]
    evidence: The fixture guide names a newer billing term.
```

`tests/content/bad/r08-retired-plan-in-mission.md`:

````md
<!-- fixture-target: content/missions/mission-00-guardrails.md -->
---
id: mission-00
title: "Guardrails"
modules: [9, 11]
services: [AWS Budgets]
expectedCredits: "$0"
gate: true
keep: false
canUseCredits: []
leftovers: []
sources:
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html", verified_on: "2026-10-01" }
---

## Goal

Set up a budget before anything else.
Developer Support is not needed for this mission.
````

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/project-rules.test.ts tests/unit/project-chunk.test.ts tests/unit/style.test.ts tests/content/bad.test.ts 2>&1 | grep -E "×|Test Files"
```

Expected: the new `style.test.ts` case fails with `TypeError: retiredPlanProblems is not a function`; the three tests of `project-chunk.test.ts` fail because `index.project` is undefined; in `project-rules.test.ts` the R2 cases `claims key point ids with every other id`, `keeps concept display names unique, whatever their case` and `keeps a live or retired key point of HEAD and lets a draft go`, the R6 case `reports a key point concept that is not registered or not tested`, both R7 cases and the R8 case `reports one in a key point, the brief and a mission page` fail; the four bad fixture cases (`r02-key-point-id.yaml fires its rule`, and likewise `r06-key-point-concept.yaml`, `r07-key-point-run.yaml` and `r08-retired-plan-in-mission.md`) fail; `Test Files  4 failed (4)`; the baseline fixture tree still passes.

- [ ] **Step 3: One retired-plan matcher in `scripts/content/lib/style.ts`**

Replace the doc comment and body of `labStyleProblems` with:

```ts
/**
 * Text that names a retired Support plan, one problem per text, so labs, key points, the brief and mission pages use
 * the exam's current names (spec 1.2, 5).
 */
export function retiredPlanProblems(texts: readonly string[]): string[] {
  return texts.filter((text) => OLD_PLANS.test(text)).map((text) => `retired Support plan name in '${text}'`);
}

/** Lab text that names a retired Support plan (R11); the same matcher as `retiredPlanProblems`. */
export const labStyleProblems = retiredPlanProblems;
```

- [ ] **Step 4: Key point ids and concept names in R2**

In `scripts/content/rules/r02-ids.ts`, add the import after the `hashes.ts` import:

```ts
import { KEY_POINT_FILE, projectOf } from '../lib/project.ts';
```

Add this function right before the doc comment `/** The forms of a forms.yaml text that pass the schema; [] when it is missing or does not parse. */`:

```ts
/**
 * The id and status of every key point in a key point file text, tolerating items that fail the schema; null when the
 * file does not parse or has no `keyPoints` list (R1 reports both).
 */
function keyPointsIn(yamlText: string | null): { id: string; status: unknown }[] | null {
  if (yamlText === null) return null;
  let data: unknown;
  try {
    data = parseYaml(yamlText);
  } catch {
    return null;
  }
  const items =
    typeof data === 'object' && data !== null ? (data as Record<string, unknown>).keyPoints : undefined;
  if (!Array.isArray(items)) return null;
  return items.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return [];
    const { id, status } = item as { id?: unknown; status?: unknown };
    return typeof id === 'string' ? [{ id, status }] : [];
  });
}
```

In the doc comment of `r02`, replace its last line, `` * `frozen: true` (spec 2.9, 4.3, 4.5, 5.1). `` and the ` */` after it, with:

```ts
 * `frozen: true`; key point ids join the unique ids, and a live or retired key point in HEAD stays; concept display
 * names are unique, so the ADR editor maps a name back to one id (spec 2.9, 4.3, 4.5, 5.1, 6).
 */
```

Then, right after the line `    for (const entry of ctx.labs) claim(entry.lab.id, 'lab', entry.path);`, insert:

```ts
    for (const entry of projectOf(ctx).keyPoints) claim(entry.kp.id, 'key point', entry.path);

    // The ADR editor shows citations by name and stores ids, so two concepts may not share a name, whatever its case.
    const named = new Map<string, string>();
    for (const c of ctx.concepts) {
      const first = named.get(c.name.toLowerCase());
      if (first === undefined) named.set(c.name.toLowerCase(), c.id);
      else out.push(finding('R2', CONCEPTS_FILE, `concept name '${c.name}' is used by ${first} and ${c.id}`));
    }

    // A live or retired key point in HEAD stays, retired in place: decision events keep the ids Dani ticked.
    const keyPointIds = new Set<string>();
    const unreadableKeyPoints = new Set<string>();
    for (const path of ctx.files) {
      if (!KEY_POINT_FILE.test(path)) continue;
      const now = keyPointsIn(ctx.read(path));
      if (now === null) unreadableKeyPoints.add(path);
      for (const { id } of now ?? []) keyPointIds.add(id);
    }
    for (const path of ctx.headPaths('content/project/key-points/')) {
      if (unreadableKeyPoints.has(path)) continue;
      for (const { id, status } of keyPointsIn(ctx.head(path)) ?? []) {
        if ((status === 'live' || status === 'retired') && !keyPointIds.has(id)) {
          out.push(
            finding(
              'R2',
              path,
              `key point '${id}' is live or retired in HEAD but is gone; retire it in place with status: retired`,
            ),
          );
        }
      }
    }
```

- [ ] **Step 5: Key point concepts in R6**

In `scripts/content/rules/r06-references.ts`, add the import after the `markdown.ts` import:

```ts
import { projectOf } from '../lib/project.ts';
```

Replace the one-line doc comment of `r06` with:

```ts
/**
 * R6 References: note identity, relative links, concept tags, homes, anchors, confusables, mission ids, question
 * references and key point concepts all resolve.
 */
```

and insert, right before the rule's final `    return out;`:

```ts
    // Key points cite registered, tested concepts, each found by id or alias (spec 2.9 R6).
    for (const { path, line, kp } of projectOf(ctx).keyPoints) {
      if (kp.status === 'retired') continue;
      for (const id of kp.concepts) {
        const concept = ctx.concepts.find((c) => c.id === id || (c.aliases ?? []).includes(id));
        if (concept === undefined)
          out.push(finding('R6', path, `${kp.id}: concept '${id}' is not registered`, line));
        else if (concept.tested === false)
          out.push(finding('R6', path, `${kp.id}: concept '${id}' is marked tested: false`, line));
      }
    }
```

- [ ] **Step 6: Key point and brief text in R7, retired plan names in R8**

In `scripts/content/rules/r07-originality.ts`, add the import after the `labs.ts` import:

```ts
import { BRIEF_FILE, projectOf } from '../lib/project.ts';
```

and insert, right before the rule's final `    return out;` (after the lab loop):

```ts
    // Live key points and the brief get the no-run check too (spec 2.9 R7); a key point's line is its list item.
    const project = projectOf(ctx);
    for (const { path, line, kp } of project.keyPoints) {
      if (kp.status !== 'live') continue;
      for (const run of new Set(courseRuns(tokensOf(kp.text)))) {
        out.push(finding('R7', path, `${kp.id} copies a 9-word run from the course: "${run}"`, line));
      }
    }
    for (const s of project.strings) {
      if (s.path !== BRIEF_FILE) continue;
      for (const run of new Set(courseRuns(tokensOf(s.text)))) {
        out.push(finding('R7', s.path, `${s.field} copies a 9-word run from the course: "${run}"`, s.line));
      }
    }
```

In `scripts/content/rules/r08-style.ts`, add the import after the `project.ts` import:

```ts
import { retiredPlanProblems } from '../lib/style.ts';
```

Replace the doc comment of `r08` with:

```ts
/**
 * R8 Markdown style: no em dash anywhere, one sentence per line in Markdown, one sentence per brief string and key point
 * text, no retired Support plan name in the brief, a key point or a mission page, and the note structure of lint_notes.py.
 */
```

and, inside the loop over `projectOf(ctx).strings` that Task 4 added, add the two retired plan lines after its sentence check, then add the mission loop after it, so the two loops read:

```ts
    for (const s of projectOf(ctx).strings) {
      if (multiSentenceLines(s.text.replaceAll('\n', ' ')).length > 0)
        out.push(finding('R8', s.path, `${s.field}: one sentence per string`, s.line));
      for (const problem of retiredPlanProblems([s.text]))
        out.push(finding('R8', s.path, `${s.field}: ${problem}`, s.line));
    }
    for (const mission of ctx.missions) {
      mission.body.split('\n').forEach((line, i) => {
        for (const problem of retiredPlanProblems([line]))
          out.push(finding('R8', mission.path, problem, mission.bodyLine + i));
      });
    }
```

- [ ] **Step 7: One criterion tuple in `schemas/project.ts`**

```bash
perl -0pi -e 's{/\*\*[^\n]*\*/\n(?=export const CRITERION_IDS)}{}; s{export const CRITERION_IDS = \[[^\]]*\] as const;\n\n?}{}; s/CRITERION_IDS/CRITERION_ORDER/g; s{(import \{ Review \} from \x27\./question\.ts\x27;\n)}{import \{ CRITERION_ORDER \} from \x27./project-view.ts\x27;\n$1}' schemas/project.ts
grep -rn "CRITERION_IDS" schemas scripts src tests
grep -n "CRITERION_ORDER" schemas/project.ts
```

Expected: the first `grep` prints nothing; the second prints the import `import { CRITERION_ORDER } from './project-view.ts';` and the uses in `Criterion` and the `Rubric` refinement.

- [ ] **Step 8: The project chunk in the index and the build**

In `schemas/chunks.ts`, add the last field of `ContentIndex`, right after `incidents: IncidentMeta[];`:

```ts
  /** Path of the lazy project chunk (spec 6) from the site root, or null while there is no brief. */
  project: string | null;
```

In `tests/fixtures/index.ts`, add `'project'` to the `Pick` key list, `project: null,` after `incidents: [],`, and change the doc comment's first words to `/** The Phase 3, 4 and 6 index fields, empty,`.

In `scripts/content/build.ts`, add the imports (after the `concept.ts` type import and after the `labs.ts` import):

```ts
import type { KeyPointView, ProjectChunk } from '../../schemas/project-view.ts';
```

```ts
import { type KeyPointEntry, projectOf } from './lib/project.ts';
```

Insert this function right before the doc comment of `formChunks` (the `/**` line above ` * The mock forms (spec 4.3): one chunk per form, ...`), so it never lands between `buildContent` and its doc comment and stays clear of the spot above that doc comment where Task 14 adds `missionSteps`:

```ts
/**
 * The lazy project chunk (spec 6): the brief, the rubric and each decision's live key points with the note line that
 * grounds them, or null while there is no brief. Only the Project screen loads it, so no other screen shows a key point.
 */
function projectChunk(ctx: Context, notesById: ReadonlyMap<string, Note>): ProjectChunk | null {
  const { brief, keyPoints } = projectOf(ctx);
  if (brief === null) return null;
  const conceptOf = (id: string) => ctx.concepts.find((c) => c.id === id || (c.aliases ?? []).includes(id));
  const view = ({ kp }: KeyPointEntry): KeyPointView => {
    const evidence = evidenceForm(kp.evidence);
    for (const id of kp.concepts) {
      const note = notesById.get(conceptOf(id)?.home ?? '');
      const line = note === undefined ? undefined : noteLines(note).get(evidence);
      const section = note === undefined || line === undefined ? null : sectionAt(note, line);
      if (note === undefined || section === null) continue;
      const concepts = kp.concepts.map((c) => conceptOf(c)?.id ?? c);
      return {
        id: kp.id,
        text: kp.text,
        concepts,
        read: { route: `${routeOf(note)}/${section.slug}`, text: evidence },
      };
    }
    throw new Error(`${kp.id} cites a line no home note of its concepts has; run pnpm content:validate`);
  };
  return {
    title: brief.title,
    facts: brief.facts.map((f) => f.text),
    rubric: {
      passTotal: brief.rubric.passTotal,
      criteria: brief.rubric.criteria.map((c) => ({ id: c.id, name: c.name, levels: c.levels })),
    },
    decisions: brief.decisions.map((d) => ({
      module: d.module,
      title: d.title,
      prompt: d.prompt,
      context: d.context,
      keyPoints: keyPoints.filter((e) => e.module === d.module && e.kp.status === 'live').map(view),
    })),
  };
}
```

In `buildContent`, insert `  const project = projectChunk(ctx, notesById);` right before `  const body = {`, and add the last field of `body`, right after `    incidents,`:

```ts
    project: project === null ? null : emit('project', project),
```

- [ ] **Step 9: Budget the chunk, demote stale key points, list the chunk in the manifest test**

In `scripts/check-budgets.ts`, add after `const EXAM_CHUNK = ...;`:

```ts
const PROJECT_CHUNK = /^project\.[0-9a-f]{8}\.json$/;
```

add after `const largestExam = budgeted(examChunks);`:

```ts
const projectChunks = contentFiles.filter((name) => PROJECT_CHUNK.test(name)).map((name) => `content/${name}`);
if (projectChunks.length > 1) breaches.push(`dist/content holds ${projectChunks.length} project chunks, not 0 or 1`);
const largestProject = budgeted(projectChunks);
```

change the precache loop to `  for (const file of ['index.html', ...chunks, ...examChunks, ...projectChunks]) {`, and add this line to the `console.log` template right after its exam chunk line:

```ts
    `project chunk ${largestProject.name} ${kb(largestProject.size)} of ${kb(CHUNK_BUDGET)} across ${projectChunks.length}; ` +
```

In `scripts/content/validate.ts`, replace the `--demote` line of the header comment with:

```ts
 *   --demote        sets live questions and key points whose evidence left their note back to draft, then validates
 *                   as usual
```

add `import { demoteKeyPoints } from './lib/key-point-checks.ts';` after the `draft.ts` import, and make the `--demote` branch:

```ts
if (args.includes('--demote')) {
  for (const line of demote(loadContext(root))) console.log(line);
  for (const line of demoteKeyPoints(loadContext(root))) console.log(line);
}
```

In `tests/unit/sw-manifest.test.ts`, add `'content/project.5a6b7c8d.json',` to `BUILD` right after `'content/exam-a.0f1e2d3c.json',`, add `'/content/project.5a6b7c8d.json',` to the expected list right after `'/content/m02.2efa04cd.json',`, and rename the first test to `lists / first, then every build file sorted, exam forms and the project chunk included, without sw.js, deploys.json and source maps`.

- [ ] **Step 10: Update the two tests whose fixture now has a project**

The Task 4 fixture tree has a brief, so the fixture build writes one more file and R6 now reads three key points on `per-minute-rental`.
In `tests/unit/build.test.ts`, test `names every file by its content hash and records the index name`, change the expected file list to:

```ts
      [built.indexFile, index.modules[0]?.chunk, index.search, index.project].sort(),
```

In `tests/unit/r06.test.ts`, test `reports a question concept that is not registered or not tested`, insert after the line `"lab-m01-sort-the-bakes: concept 'per-minute-rental' is marked tested: false",`:

```ts
      "kp-01-pay-only-while-proofing: concept 'per-minute-rental' is marked tested: false",
      "kp-01-give-capacity-back: concept 'per-minute-rental' is marked tested: false",
      "kp-01-name-the-billing-term: concept 'per-minute-rental' is marked tested: false",
```

- [ ] **Step 11: Run the tests, the validator and the build and see them pass**

```bash
pnpm test tests/unit/r02.test.ts tests/unit/r06.test.ts tests/unit/r07.test.ts tests/unit/r08.test.ts tests/unit/project-rules.test.ts tests/unit/style.test.ts tests/unit/build.test.ts tests/unit/build-real.test.ts tests/unit/sw-manifest.test.ts tests/unit/project-chunk.test.ts tests/content/bad.test.ts 2>&1 | tail -5
pnpm typecheck
pnpm lint
pnpm --silent content:validate
pnpm --silent content:validate --demote | tail -1
pnpm build 2>&1 | grep -E "^budgets:"
```

Expected: `Test Files  11 passed (11)`, among them the 11 new cases of `project-rules.test.ts`, the 3 of `project-chunk.test.ts`, `retiredPlanProblems` in `style.test.ts`, and the four new bad fixtures each firing its rule while the baseline tree passes every rule; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`; both validator runs end with `content:validate: 13 rules, 0 findings` (no key point to demote, since Task 7's key points are not merged yet or all hold); the `budgets:` line holds `project chunk - 0.0 KB of 120.0 KB across 0` until Task 5's brief is on `master`, then `project chunk content/project.<hash8>.json` under 120 KB across 1, and the initial JS is unchanged.

- [ ] **Step 12: Commit**

```bash
pnpm lint:fix
git add scripts/content/lib/style.ts scripts/content/rules/r02-ids.ts scripts/content/rules/r06-references.ts scripts/content/rules/r07-originality.ts scripts/content/rules/r08-style.ts schemas/project.ts schemas/chunks.ts scripts/content/build.ts scripts/content/validate.ts scripts/check-budgets.ts tests/fixtures/index.ts tests/unit/sw-manifest.test.ts tests/unit/project-rules.test.ts tests/unit/project-chunk.test.ts tests/unit/style.test.ts tests/unit/build.test.ts tests/unit/r06.test.ts tests/content/bad/r02-key-point-id.yaml tests/content/bad/r06-key-point-concept.yaml tests/content/bad/r07-key-point-run.yaml tests/content/bad/r08-retired-plan-in-mission.md
git commit -m "Check key points in R2, R6 and R7 and ship the project chunk" -m "Key point ids, concepts and text join the id, reference and originality rules, content:validate --demote demotes stale key points, and the brief with live key points ships as a lazy project chunk."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 12: Mission and decision XP, and `ENGINE_VERSION` 6

**Depends on:** Tasks 8 and 9; Phase 4 Task 18 (the last Phase 4 edit of `src/engine/memory.ts`, `src/engine/replay.ts`, `tests/fixtures/journeys/journeys.ts`, `tests/unit/memory.test.ts`, `tests/unit/anti-grind.test.ts` and `tests/property/arbitraries.ts`, and the one that adds the `Version 5 also pays lightning XP ...` doc line).
Rebase onto `master` first and check `grep -n "export const ENGINE_VERSION = 5;" src/engine/replay.ts` prints one line and `git log master --oneline | grep -i lightning` shows Phase 4 Task 18.

**Covers:** P6-080, P6-083, P6-084, P6-085, P6-127, P6-128, P6-129 (engine), P6-165, P6-166, P6-167, P6-168, P6-169, P6-171.

**Files:**
- Create: `tests/fixtures/backups/v1-capstone.json`; generated by the tests: `tests/fixtures/backups/v1-capstone.snapshot.json`, `tests/fixtures/journeys/missions-and-capstone.jsonl`, `tests/fixtures/journeys/missions-and-capstone.snapshot.json`
- Modify: `src/engine/memory.ts`, `src/engine/replay.ts`, `src/engine/xp.ts`, `tests/property/arbitraries.ts`, `tests/fixtures/journeys/journeys.ts`, `tests/fixtures/journeys/content.ts`, `tests/unit/journeys.test.ts`, `tests/unit/memory.test.ts`, `tests/unit/badges.test.ts`, `tests/unit/anti-grind.test.ts`, `tests/unit/replay.test.ts`
- Test: the files above, `tests/unit/backups.test.ts` and `tests/property`

Design notes:
- `applyMission` reads mission events through Task 9's `stepMission`, the same reader the Missions screen uses, so XP pays exactly when a page shows `closed`: Mission 0 pays `XP.mission0` (50) on its first Verify, any other mission `XP.mission` (75) once, when it closes (a verified attempt's later-day usage check after cleanup; the kept Mission 1, a later-day usage check after Verify); an unverified attempt pays nothing, and a closed mission never pays again.
- The replay builds each `MissionRef` from the event: `gate` when the id is `GATE_MISSION`, `keep` from `content.keptMissions`; `MemoryContent` has no mission list, so an unknown mission id is read like any non-kept mission, as an unknown incident id already pays (`never throws on an unknown incident id and still pays it`).
- Leave No Trace keeps its built count: a mission with a usage check on a later day than its first cleanup counts, verified or not, because the badge rewards the cleanup habit.
- `applyDecision` counts a module's first `self` and the first `final` after it; that final pays `XP.decision` (20) plus `XP.decisionGood` (10) when its total is 8 or more, a zero criterion included (spec 3.2 reads "8/12 or more"), and only the first finals decide Architect, which still needs `decisionPasses` (total 8 or more and no zero, spec 3.10); a final with no self, a second final or a later self changes nothing (spec 6 allows one re-grade).
- Neither handler sets `completion` or `countedAnswer`, so mission and decision events never qualify a study day (spec 3.5), and each handles one event in constant time, so the replay cost tests hold.
- `ENGINE_VERSION` becomes 6 once, for mission XP, decision XP and the first-final rule together (spec 8.2); the existing journey and backup goldens do not change, because none of them holds a mission or decision event, which the run in Step 5 shows.
- The new `missions-and-capstone` journey pins all of it through `deriveMemory`: lesson 10, Mission 0 50, the kept Mission 1 75, Mission 3's unverified attempt 0 and its retry 75, decision 1 (total 8) 30, decision 2 (total 6) 20 and its re-grade 0, so `xp` is 260 and only the reading day qualifies; its `content.ts` entry also marks `mission-01` as kept, which changes no other journey.
- The brief left `tests/fixtures/journeys/content.ts` out of this task's files, but `JourneyName`, the journey clock and `keptMissions` live there, so this task edits it too (Phase 4 Task 5 was its last Phase 4 editor).
- `v1-capstone.json` is a schema 1 backup with mission and decision events, the `plan`, `missionTicks` and two `adr-NN` kv records; it proves such a backup parses and migrates, and its snapshot (through `derive`, which ignores mission and decision events) is written by the test on its first run.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/memory.test.ts` (it already imports `addDays`, `contentOf`, `deriveMemory`, `NewEvent` and `timelineOf`):

```ts
describe('mission and decision XP (spec 3.2)', () => {
  const PAID = contentOf([{ id: 'shared-kitchen', module: 1 }], new Map(), {
    keptMissions: new Set(['mission-01']),
  });
  type Log = readonly (readonly [string, NewEvent])[];
  const memoryOf = (log: Log) => deriveMemory(timelineOf(log), PAID);
  const step = (mission: string, s: 'start' | 'verified' | 'cleaned' | 'usage-ok'): NewEvent => ({
    t: 'mission',
    mission,
    step: s,
  });
  const grade = (
    module: number,
    stage: 'self' | 'final',
    scores: [number, number, number, number],
  ): NewEvent => ({
    t: 'decision',
    module,
    stage,
    scores,
  });

  it('pays Mission 0 its 50 once, on its first verified', () => {
    const events = timelineOf([
      ['2026-10-10T08:00:00Z', step('mission-00', 'start')],
      ['2026-10-10T08:30:00Z', step('mission-00', 'verified')],
      ['2026-10-10T09:00:00Z', step('mission-00', 'verified')],
      ['2026-10-11T09:00:00Z', step('mission-00', 'start')],
    ]);
    const m = deriveMemory(events, PAID);
    expect(m.xp).toBe(50);
    expect(m.xpByEvent.get(events[1]?.id ?? '')).toBe(50);
  });

  it('pays a cleaned-up mission 75 once, on a later-day usage check of a verified attempt', () => {
    const flow: Log = [
      ['2026-10-12T09:00:00Z', step('mission-03', 'start')],
      ['2026-10-12T09:30:00Z', step('mission-03', 'verified')],
      ['2026-10-12T10:00:00Z', step('mission-03', 'cleaned')],
      ['2026-10-12T20:00:00Z', step('mission-03', 'usage-ok')],
    ];
    expect(memoryOf(flow).xp).toBe(0);
    const closed: Log = [...flow, ['2026-10-13T09:00:00Z', step('mission-03', 'usage-ok')]];
    expect(memoryOf(closed).xp).toBe(75);
    expect(memoryOf(closed).xpByDay.get('2026-10-13')).toBe(75);
    const again: Log = [
      ...closed,
      ['2026-10-14T09:00:00Z', step('mission-03', 'start')],
      ['2026-10-14T09:30:00Z', step('mission-03', 'verified')],
      ['2026-10-14T10:00:00Z', step('mission-03', 'cleaned')],
      ['2026-10-15T09:00:00Z', step('mission-03', 'usage-ok')],
    ];
    expect(memoryOf(again).xp).toBe(75);
  });

  it('pays an unverified attempt nothing and its verified retry 75 once', () => {
    const first: Log = [
      ['2026-10-12T09:00:00Z', step('mission-07', 'start')],
      ['2026-10-12T09:40:00Z', step('mission-07', 'cleaned')],
      ['2026-10-13T09:00:00Z', step('mission-07', 'usage-ok')],
    ];
    expect(memoryOf(first).xp).toBe(0);
    const retry: Log = [
      ...first,
      ['2026-10-14T09:00:00Z', step('mission-07', 'start')],
      ['2026-10-14T09:20:00Z', step('mission-07', 'verified')],
      ['2026-10-14T09:30:00Z', step('mission-07', 'cleaned')],
      ['2026-10-15T09:00:00Z', step('mission-07', 'usage-ok')],
      ['2026-10-16T09:00:00Z', step('mission-07', 'usage-ok')],
    ];
    expect(memoryOf(retry).xp).toBe(75);
  });

  it('pays the kept Mission 1 its 75 after a later-day usage check', () => {
    const kept: Log = [
      ['2026-10-10T09:00:00Z', step('mission-01', 'start')],
      ['2026-10-10T10:00:00Z', step('mission-01', 'verified')],
      ['2026-10-10T20:00:00Z', step('mission-01', 'usage-ok')],
    ];
    expect(memoryOf(kept).xp).toBe(0);
    expect(memoryOf([...kept, ['2026-10-11T09:00:00Z', step('mission-01', 'usage-ok')]]).xp).toBe(75);
  });

  it('keeps Leave No Trace for cleanups checked the next day, verified or not', () => {
    const cleaned = (mission: string, day: string): Log => [
      [`${day}T09:00:00Z`, step(mission, 'start')],
      [`${day}T09:30:00Z`, step(mission, 'cleaned')],
      [`${addDays(day, 1)}T09:00:00Z`, step(mission, 'usage-ok')],
    ];
    const m = memoryOf([
      ...cleaned('mission-02', '2026-10-12'),
      ...cleaned('mission-03', '2026-10-14'),
      ...cleaned('mission-04', '2026-10-16'),
    ]);
    expect(m.xp).toBe(0);
    expect(m.badges.has('leave-no-trace')).toBe(true);
  });

  it('pays a decision 20, plus 10 when the first final totals 8 or more, a zero criterion included', () => {
    const m = memoryOf([
      ['2026-11-15T09:00:00Z', grade(1, 'self', [2, 2, 1, 1])],
      ['2026-11-15T09:30:00Z', grade(1, 'final', [3, 3, 2, 0])],
      ['2026-11-15T10:00:00Z', grade(2, 'self', [2, 2, 2, 2])],
      ['2026-11-15T10:30:00Z', grade(2, 'final', [2, 2, 2, 1])],
    ]);
    expect(m.xp).toBe(30 + 20);
  });

  it('pays nothing for a final with no self before it or for a second final', () => {
    const m = memoryOf([
      ['2026-11-15T09:00:00Z', grade(3, 'final', [3, 3, 3, 3])],
      ['2026-11-15T09:10:00Z', grade(3, 'self', [1, 1, 1, 1])],
      ['2026-11-15T09:20:00Z', grade(3, 'final', [1, 1, 1, 1])],
      ['2026-11-15T09:30:00Z', grade(3, 'final', [3, 3, 3, 3])],
      ['2026-11-15T09:40:00Z', grade(3, 'self', [3, 3, 3, 3])],
    ]);
    expect(m.xp).toBe(20);
  });

  it('never qualifies a day with mission and decision events alone', () => {
    const m = memoryOf([
      ['2026-10-10T08:00:00Z', step('mission-00', 'start')],
      ['2026-10-10T08:30:00Z', step('mission-00', 'verified')],
      ['2026-11-15T09:00:00Z', grade(1, 'self', [2, 2, 2, 2])],
      ['2026-11-15T09:30:00Z', grade(1, 'final', [2, 2, 2, 2])],
    ]);
    expect(m.xp).toBe(80);
    expect(m.qualifyingDays.size).toBe(0);
  });
});
```

Append to `tests/unit/anti-grind.test.ts` (it uses the file's `Log`, `memoryOf`, `at` and `NewEvent`):

```ts
describe('anti-grind audit (spec 3.11): missions and the capstone', () => {
  it('Re-grading a capstone decision pays once', () => {
    const grade = (stage: 'self' | 'final', scores: [number, number, number, number]): NewEvent => ({
      t: 'decision',
      module: 4,
      stage,
      scores,
    });
    const once: Log = [
      [at('2026-11-15', 9), grade('self', [1, 1, 1, 1])],
      [at('2026-11-15', 10), grade('final', [2, 2, 2, 2])],
    ];
    expect(memoryOf(once).xp).toBe(30);
    const regraded: Log = [
      ...once,
      [at('2026-11-16', 9), grade('final', [3, 3, 3, 3])],
      [at('2026-11-16', 10), grade('self', [3, 3, 3, 3])],
      [at('2026-11-16', 11), grade('final', [3, 3, 3, 3])],
    ];
    expect(memoryOf(regraded).xp).toBe(30);
  });

  it('Closing a mission twice pays once', () => {
    const run = (day: string, next: string): Log => [
      [at(day, 9), { t: 'mission', mission: 'mission-04', step: 'start' }],
      [at(day, 10), { t: 'mission', mission: 'mission-04', step: 'verified' }],
      [at(day, 11), { t: 'mission', mission: 'mission-04', step: 'cleaned' }],
      [at(next, 9), { t: 'mission', mission: 'mission-04', step: 'usage-ok', credits: 120 }],
    ];
    expect(memoryOf(run('2026-10-20', '2026-10-21')).xp).toBe(75);
    expect(memoryOf([...run('2026-10-20', '2026-10-21'), ...run('2026-10-22', '2026-10-23')]).xp).toBe(75);
  });
});
```

In `tests/unit/badges.test.ts`, replace the whole test `it('Architect: the latest final decision of all 13 modules passes', ...)` with:

```ts
  it('Architect: keeps the first final decision of each module', () => {
    const grade = (
      module: number,
      stage: 'self' | 'final',
      scores: [number, number, number, number],
      hour: number,
    ) => [at('2026-11-20', hour, module), { t: 'decision', module, stage, scores }] as const;
    const selfs = Array.from({ length: 13 }, (_, i) => grade(i + 1, 'self', [1, 1, 1, 1], 8));
    const passing = Array.from({ length: 13 }, (_, i) => grade(i + 1, 'final', [2, 2, 2, 2], 9));
    const log: Log = [
      [at('2026-11-19', 8), { t: 'decision', module: 13, stage: 'final', scores: [3, 3, 3, 0] }],
      ...selfs,
      ...passing,
    ];
    const { before, after, last } = crossing(log, BASIC, 'architect');
    expect(before).toBeUndefined();
    expect(after?.eventId).toBe(last.id);
    const regraded = timelineOf([...log, grade(2, 'final', [0, 0, 0, 0], 10)]);
    expect(deriveMemory(regraded, BASIC).badges.get('architect')).toEqual(after);
    const failedFirst = timelineOf([
      ...selfs,
      grade(1, 'final', [3, 3, 2, 0], 9),
      ...passing.slice(1),
      grade(1, 'final', [3, 3, 3, 3], 10),
    ]);
    expect(deriveMemory(failedFirst, BASIC).badges.has('architect')).toBe(false);
  });
```

In `tests/unit/replay.test.ts`, make the version test:

```ts
  it('has engine version 6', () => {
    expect(ENGINE_VERSION).toBe(6);
```

In `tests/fixtures/journeys/content.ts`, mark the kept mission by changing `    keptMissions: new Set(),` to the first block below, and replace the `JourneyName` type and the `NOW` record with the second:

```ts
    keptMissions: new Set(['mission-01']),
```

```ts
export type JourneyName =
  | 'first-week'
  | 'exam-crunch'
  | 'comeback-10-days'
  | 'hands-on-week'
  | 'missions-and-capstone';

const NOW: Record<JourneyName, string> = {
  'first-week': '2026-10-18T20:00:00.000Z',
  'exam-crunch': '2026-11-12T20:00:00.000Z',
  'comeback-10-days': '2026-10-27T12:00:00.000Z',
  'hands-on-week': '2026-10-23T20:00:00.000Z',
  'missions-and-capstone': '2026-11-16T20:00:00.000Z',
};
```

In `tests/fixtures/journeys/journeys.ts`, add these two methods to `Journey` right before `  events(): StudyEvent[] {`:

```ts
  /** One mission step, with the credits left when it is a usage check that names them. */
  mission(
    at: string,
    mission: string,
    step: 'start' | 'verified' | 'cleaned' | 'usage-ok',
    credits?: number,
  ): this {
    this.push(new Date(at), { t: 'mission', mission, step, ...(credits === undefined ? {} : { credits }) });
    return this;
  }

  /** One capstone grade of `module`, with the ticked key point ids on a final. */
  decision(
    at: string,
    module: number,
    stage: 'self' | 'final',
    scores: [number, number, number, number],
    keyPoints?: string[],
  ): this {
    this.push(new Date(at), {
      t: 'decision',
      module,
      stage,
      scores,
      ...(keyPoints === undefined ? {} : { keyPoints }),
    });
    return this;
  }
```

and append the builder to the end of the file:

```ts
/**
 * Missions and the capstone from Saturday, October 10: Module 1's first lesson and Mission 0 verified the same day,
 * the kept Mission 1 verified and checked the next day, Mission 3 cleaned up without Verify, checked, then retried
 * and closed, and two decisions graded on November 15 and 16, the second re-graded, which pays nothing.
 */
export function missionsAndCapstone(): StudyEvent[] {
  const j = new Journey();
  j.read('2026-10-10T08:00:00.000Z', lessonNote(1, 1));
  j.mission('2026-10-10T09:00:00.000Z', 'mission-00', 'start');
  j.mission('2026-10-10T10:00:00.000Z', 'mission-00', 'verified');
  j.mission('2026-10-11T09:00:00.000Z', 'mission-01', 'start');
  j.mission('2026-10-11T10:00:00.000Z', 'mission-01', 'verified');
  j.mission('2026-10-12T09:00:00.000Z', 'mission-01', 'usage-ok', 140);
  j.mission('2026-10-13T09:00:00.000Z', 'mission-03', 'start');
  j.mission('2026-10-13T09:40:00.000Z', 'mission-03', 'cleaned');
  j.mission('2026-10-14T09:00:00.000Z', 'mission-03', 'usage-ok', 139);
  j.mission('2026-10-15T09:00:00.000Z', 'mission-03', 'start');
  j.mission('2026-10-15T09:30:00.000Z', 'mission-03', 'verified');
  j.mission('2026-10-15T10:00:00.000Z', 'mission-03', 'cleaned');
  j.mission('2026-10-16T09:00:00.000Z', 'mission-03', 'usage-ok', 138);
  j.decision('2026-11-15T09:00:00.000Z', 1, 'self', [2, 2, 1, 2]);
  j.decision('2026-11-15T09:30:00.000Z', 1, 'final', [3, 2, 2, 1], ['kp-01-a', 'kp-01-gone']);
  j.decision('2026-11-16T09:00:00.000Z', 2, 'self', [2, 2, 2, 2]);
  j.decision('2026-11-16T09:30:00.000Z', 2, 'final', [2, 2, 2, 0]);
  j.decision('2026-11-16T10:00:00.000Z', 2, 'final', [3, 3, 3, 3]);
  return j.events();
}
```

In `tests/unit/journeys.test.ts`, add `missionsAndCapstone` to the import from `../fixtures/journeys/journeys.ts`, add `'missions-and-capstone': missionsAndCapstone,` as the last entry of `JOURNEYS`, and add this test as the last one of `describe('golden journeys', ...)`:

```ts
  it('missions-and-capstone pays each mission and decision once and qualifies only the reading day', () => {
    const { memory } = replay('missions-and-capstone');
    expect(memory.xp).toBe(10 + 50 + 75 + 75 + 30 + 20);
    expect([...memory.qualifyingDays]).toEqual(['2026-10-10']);
  });
```

In `tests/property/arbitraries.ts`, add the score arbitrary right before `const bodyArb`:

```ts
/** A rubric score of one criterion. */
const score = fc.integer({ min: 0, max: 3 });
```

and add the two bodies to `bodyArb`, right before the `flag` record:

```ts
  fc.record(
    {
      t: fc.constant('mission'),
      mission: fc.constantFrom('mission-00', 'mission-01', 'mission-03', 'mission-99'),
      step: fc.constantFrom('start', 'verified', 'cleaned', 'usage-ok'),
      credits: fc.integer({ min: 0, max: 200 }),
    },
    { requiredKeys: ['t', 'mission', 'step'] },
  ),
  fc.record(
    {
      t: fc.constant('decision'),
      module: fc.constantFrom(1, 2, 13),
      stage: fc.constantFrom('self', 'final'),
      scores: fc.tuple(score, score, score, score),
      keyPoints: fc.array(fc.constantFrom('kp-01-a', 'kp-02-gone'), { maxLength: 2 }),
    },
    { requiredKeys: ['t', 'module', 'stage', 'scores'] },
  ),
```

Create `tests/fixtures/backups/v1-capstone.json`:

```json
{
  "format": "ccp-study-backup",
  "schemaVersion": 1,
  "appVersion": "0.7.0",
  "contentVersion": "c-1b2c3d",
  "exportedAt": "2026-11-15T10:00:00.000Z",
  "events": [
    {
      "id": "01JD0000000000000000000001",
      "at": "2026-10-10T08:00:00.000Z",
      "tz": 60,
      "day": "2026-10-10",
      "t": "mission",
      "mission": "mission-00",
      "step": "start"
    },
    {
      "id": "01JD0000000000000000000002",
      "at": "2026-10-10T08:40:00.000Z",
      "tz": 60,
      "day": "2026-10-10",
      "t": "mission",
      "mission": "mission-00",
      "step": "verified"
    },
    {
      "id": "01JD0000000000000000000003",
      "at": "2026-10-12T09:00:00.000Z",
      "tz": 60,
      "day": "2026-10-12",
      "t": "mission",
      "mission": "mission-03",
      "step": "start"
    },
    {
      "id": "01JD0000000000000000000004",
      "at": "2026-10-12T09:50:00.000Z",
      "tz": 60,
      "day": "2026-10-12",
      "t": "mission",
      "mission": "mission-03",
      "step": "verified"
    },
    {
      "id": "01JD0000000000000000000005",
      "at": "2026-10-12T10:10:00.000Z",
      "tz": 60,
      "day": "2026-10-12",
      "t": "mission",
      "mission": "mission-03",
      "step": "cleaned"
    },
    {
      "id": "01JD0000000000000000000006",
      "at": "2026-10-13T08:00:00.000Z",
      "tz": 60,
      "day": "2026-10-13",
      "t": "mission",
      "mission": "mission-03",
      "step": "usage-ok",
      "credits": 137.5
    },
    {
      "id": "01JD0000000000000000000007",
      "at": "2026-11-15T09:00:00.000Z",
      "tz": 60,
      "day": "2026-11-15",
      "t": "decision",
      "module": 1,
      "stage": "self",
      "scores": [2, 2, 1, 2]
    },
    {
      "id": "01JD0000000000000000000008",
      "at": "2026-11-15T09:20:00.000Z",
      "tz": 60,
      "day": "2026-11-15",
      "t": "decision",
      "module": 1,
      "stage": "final",
      "scores": [3, 2, 2, 2],
      "keyPoints": ["kp-01-shared-kitchen", "kp-01-retired-one"]
    }
  ],
  "kv": {
    "lastExportAt": {
      "value": "2026-11-15T10:00:00.000Z",
      "updatedAt": "2026-11-15T10:00:00.000Z"
    },
    "plan": {
      "value": {
        "plan": "free",
        "credits": 140,
        "endsOn": "2027-04-10",
        "services": {
          "Amazon S3": true,
          "AWS Lambda": true,
          "Amazon CloudWatch Logs": true,
          "Amazon VPC": false
        },
        "recordedAt": "2026-10-10T08:30:00.000Z"
      },
      "updatedAt": "2026-10-10T08:30:00.000Z"
    },
    "missionTicks": {
      "value": {
        "mission-03": ["create-bucket", "upload-receipt"]
      },
      "updatedAt": "2026-10-12T09:40:00.000Z"
    },
    "adr-01": {
      "value": {
        "v": 1,
        "context": "The cafe has 3 shops.\nMornings are busy.",
        "options": "Rent shared compute.\nBuy servers.",
        "decision": "Rent shared compute.",
        "why": "[[cloud-computing]] and [[pay-as-you-go-pricing]] fit the brief.",
        "tradeoffs": "Less control; we read the shared responsibility model.",
        "cost": "We pay for what we use.",
        "ticks": ["kp-01-shared-kitchen"]
      },
      "updatedAt": "2026-11-15T09:25:00.000Z"
    },
    "adr-02": {
      "value": {
        "v": 1,
        "context": "Orders peak at 07:00.",
        "options": "",
        "decision": "",
        "why": "",
        "tradeoffs": "",
        "cost": "",
        "ticks": []
      },
      "updatedAt": "2026-11-15T09:40:00.000Z"
    }
  }
}
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/memory.test.ts tests/unit/badges.test.ts tests/unit/anti-grind.test.ts tests/unit/replay.test.ts tests/unit/journeys.test.ts 2>&1 | grep -E "×|Test Files"
```

Expected: `has engine version 6`, seven of the eight `mission and decision XP (spec 3.2)` cases (`keeps Leave No Trace for cleanups checked the next day, verified or not` passes already, since the badge keeps its built rule), `Re-grading a capstone decision pays once`, `Closing a mission twice pays once`, `Architect: keeps the first final decision of each module` and `missions-and-capstone pays each mission and decision once and qualifies only the reading day` fail (the journey's `.jsonl` and `.snapshot.json` are written by this first run, from the old rules), and `Test Files  5 failed (5)`.
Delete the two journey files this run wrote, so the next run writes them from the new rules:

```bash
rm tests/fixtures/journeys/missions-and-capstone.jsonl tests/fixtures/journeys/missions-and-capstone.snapshot.json
```

- [ ] **Step 3: Pay mission and decision XP in `src/engine/memory.ts`**

Add the imports, after the `bets.ts` import and before the `srs.ts` import:

```ts
import { scoreTotal } from './capstone.ts';
```

```ts
import { GATE_MISSION, type MissionRef, type OpenMissionLog, stepMission } from './missions.ts';
```

In `MemoryState`, make the doc comment of `xpByEvent`:

```ts
  /** Answer, lesson, lab, incident, exam, mission and decision events that earned XP, by event id; 0 is absent. */
```

In `replay`, replace the line `  const finalDecisions = new Map<number, readonly number[]>();` with:

```ts
  /** Each mission's attempts, read by the same rules as `src/engine/missions.ts`, so XP pays when the page closes. */
  const missionLogs = new Map<string, OpenMissionLog>();
  /** Modules with a counted self-grade; only a final after it counts (spec 6). */
  const selfDecisions = new Set<number>();
  /** The first final grade of each module, which pays XP and decides Architect. */
  const finalDecisions = new Map<number, readonly number[]>();
```

Replace `applyMission` and `applyDecision` with:

```ts
  const applyMission = (e: Extract<StudyEvent, { t: 'mission' }>) => {
    const log = missionLogs.get(e.mission) ?? { attempts: [], closed: null };
    missionLogs.set(e.mission, log);
    const ref: MissionRef = {
      id: e.mission,
      n: 0,
      keep: content.keptMissions.has(e.mission),
      gate: e.mission === GATE_MISSION,
      maxLiveHours: null,
      services: [],
    };
    const wasOpen = log.closed === null;
    stepMission(ref, log, e);
    if (wasOpen && log.closed !== null) earn(e, ref.gate ? XP.mission0 : XP.mission);
    if (e.step === 'cleaned' && !missionCleaned.has(e.mission)) missionCleaned.set(e.mission, e.day);
    if (e.step !== 'usage-ok' || content.keptMissions.has(e.mission)) return;
    const cleaned = missionCleaned.get(e.mission);
    if (cleaned === undefined || e.day <= cleaned) return;
    missionsClosed.add(e.mission);
    if (missionsClosed.size >= LEAVE_NO_TRACE) grant('leave-no-trace', e);
  };

  const applyDecision = (e: Extract<StudyEvent, { t: 'decision' }>) => {
    if (e.stage === 'self') {
      selfDecisions.add(e.module);
      return;
    }
    if (!selfDecisions.has(e.module) || finalDecisions.has(e.module)) return;
    finalDecisions.set(e.module, e.scores);
    earn(e, XP.decision + (scoreTotal(e.scores) >= ARCHITECT.minTotal ? XP.decisionGood : 0));
    const all = [...finalDecisions.values()];
    if (all.length >= ARCHITECT.decisions && all.every(decisionPasses)) grant('architect', e);
  };
```

- [ ] **Step 4: `ENGINE_VERSION` 6 and the XP doc comment**

```bash
perl -0pi -e 's{\n \*/\nexport const ENGINE_VERSION = 5;}{\n * Version 6 pays mission and capstone decision XP and keeps the first final grade per module.\n */\nexport const ENGINE_VERSION = 6;}' src/engine/replay.ts
grep -n -B2 "export const ENGINE_VERSION" src/engine/replay.ts
```

Expected: the three lines ``* Version 5 also pays lightning XP and makes a missed lightning concept due today through `review.now`.``, `* Version 6 pays mission and capstone decision XP and keeps the first final grade per module.` and `export const ENGINE_VERSION = 6;` with ` */` between the last two.

In `src/engine/xp.ts`, replace the doc comment above `export const XP` with:

```ts
/**
 * The XP table (spec 3.2). Every row pays: lessons, the bet, the effort bonus, lightning rounds, incidents, labs,
 * bosses, mocks, capstone decisions (on the first final grade) and missions (when they close), each once as spec 3.2 says.
 */
```

- [ ] **Step 5: Run the tests twice, write the new goldens and check the old ones**

```bash
pnpm test tests/unit/memory.test.ts tests/unit/badges.test.ts tests/unit/anti-grind.test.ts tests/unit/replay.test.ts tests/unit/journeys.test.ts tests/unit/backups.test.ts tests/property 2>&1 | tail -5
pnpm test tests/unit/journeys.test.ts tests/unit/backups.test.ts 2>&1 | tail -4
git status --short tests/fixtures
pnpm typecheck
pnpm lint
```

Expected: both runs pass (the first writes `missions-and-capstone.jsonl`, `missions-and-capstone.snapshot.json` and `v1-capstone.snapshot.json`, the second compares against them), the grind property and the replay cost test among them; `git status` lists exactly `M tests/fixtures/journeys/content.ts`, `M tests/fixtures/journeys/journeys.ts`, `?? tests/fixtures/backups/v1-capstone.json`, `?? tests/fixtures/backups/v1-capstone.snapshot.json`, `?? tests/fixtures/journeys/missions-and-capstone.jsonl` and `?? tests/fixtures/journeys/missions-and-capstone.snapshot.json`, so no existing journey or backup golden changed; the new snapshot's `xp` is 260 and its `qualifyingDays` holds only `2026-10-10`; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`.

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix
git add src/engine/memory.ts src/engine/replay.ts src/engine/xp.ts tests/property/arbitraries.ts tests/fixtures/journeys/journeys.ts tests/fixtures/journeys/content.ts tests/fixtures/journeys/missions-and-capstone.jsonl tests/fixtures/journeys/missions-and-capstone.snapshot.json tests/fixtures/backups/v1-capstone.json tests/fixtures/backups/v1-capstone.snapshot.json tests/unit/journeys.test.ts tests/unit/memory.test.ts tests/unit/badges.test.ts tests/unit/anti-grind.test.ts tests/unit/replay.test.ts
git commit -m "Pay mission and capstone decision XP" -m "Mission 0, closed missions and completed capstone decisions now pay their XP once, the first final grade per module counts, and ENGINE_VERSION moves to 6."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

---

## Task 13: Missions 2 to 8 and the Mission 0 plan list

**Files:**
- Create: `content/missions/mission-02-ec2-lifecycle.md`, `mission-03-upload-receipt.md`, `mission-04-loyalty-table.md`, `mission-05-least-privilege.md`, `mission-06-error-alarm.md`, `mission-07-two-tier-vpc.md`, `mission-08-estimate-and-review.md` (written by the Step 4 workflow), `tests/unit/missions-content.test.ts`
- Modify: `content/missions/mission-00-guardrails.md` (three bullets; the frontmatter does not change), `tests/e2e/reader.spec.ts` (the missions list test)
- Test: `tests/unit/missions-content.test.ts`, `tests/e2e/reader.spec.ts`, `pnpm --silent content:validate`

**Depends on:** Task 2 (the `E2E_PORT` of `playwright.config.ts`); no Phase 4 task, since no Phase 4 task touches `content/missions/` or `tests/e2e/reader.spec.ts`.
It runs in the `missions-app` worktree on its branch and merges to `master` only together with Tasks 14 and 15, never alone, because Missions 2 to 8 spend real money and must ship with the gate, the live chip and Next's cleanup entries.

**Covers:** P6-062 (missions), P6-063, P6-092 to P6-109.

Design notes:
- The seven files, their modules and services are the brief's decisions; the test pins them, so a writer can never drift from the plan-fit list.
- Every service is spelled the way the plan-fit list spells it, and that list is the sorted union of the `services` of every mission but Mission 0 (Task 9's `planServices`); Amazon CloudWatch reaches it through Mission 6 and AWS Identity and Access Management through Mission 5, spelled as Mission 0's frontmatter spells it.
- The frontmatter values other than `sources` are fixed in the Step 4 script; `maxLiveHours: 2` is written out because `schemas/mission.ts` requires it for a cleaned-up mission (spec 5.3 rule 6 says the default is 2), and Task 19 records that as a `(Phase 6)` NOTE.
- Mission 0's frontmatter stays as it is; its `### Plan status` step stops listing service names and points to the Plan status form that Task 14 puts after its steps, and its Leave-unknown and Verify bullets now speak of that form's ticks, because a list in prose would drift from the missions.
- Mission text is original and grounded in official AWS pages fetched the day it is written (`verified_on` that day, R13 checks the hosts and the 180 days); the writers never read course text, and a separate checker per mission re-reads every cited page and flags any unsupported fact or any copied run of 8 words or more.
- The writers are agents of a Workflow script the controller runs (tool input, not a repo file), one per mission in parallel, so the seven pages take about one writer's time; the builder reviews the result and commits.
- The test pins one phrase per shared cost-safety rule in every Never do section (P6-095 to P6-097), so a writer cannot drop a rule that Mission 0 states.
- R7 does not read missions, so originality rests on the checker; R8 checks one sentence per line and the em dash, and once Task 11 is on `master` it also reports any retired Support plan name (Developer Support, Business Support without the plus, Enterprise On-Ramp) on any mission line, which the writer rules of Step 4 already forbid; R1 checks the frontmatter; R2 and R6 check the ids.

- [ ] **Step 1: Write the failing content test**

Create `tests/unit/missions-content.test.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const missions = loadContext(ROOT).missions;

/** The plan-fit list (spec 5.3 rule 2): the union of every mission's services but Mission 0's, one spelling each. */
const PLAN_SERVICES = [
  'Amazon CloudFront',
  'Amazon CloudWatch',
  'Amazon CloudWatch Logs',
  'Amazon DynamoDB',
  'Amazon EC2',
  'Amazon S3',
  'Amazon SNS',
  'Amazon VPC',
  'AWS CloudFormation',
  'AWS CloudTrail',
  'AWS Identity and Access Management',
  'AWS Lambda',
  'AWS Pricing Calculator',
  'AWS Well-Architected Tool',
];

/** Missions 2 to 8 as decided: file, modules and services; each is cleaned up within 2 hours. */
const DECIDED = [
  {
    id: 'mission-02',
    file: 'mission-02-ec2-lifecycle.md',
    modules: [2, 6],
    services: ['Amazon EC2', 'Amazon VPC'],
  },
  {
    id: 'mission-03',
    file: 'mission-03-upload-receipt.md',
    modules: [3, 6, 10],
    services: ['Amazon S3', 'AWS Lambda', 'Amazon CloudWatch Logs'],
  },
  { id: 'mission-04', file: 'mission-04-loyalty-table.md', modules: [7], services: ['Amazon DynamoDB'] },
  {
    id: 'mission-05',
    file: 'mission-05-least-privilege.md',
    modules: [9, 10],
    services: ['AWS Identity and Access Management', 'AWS CloudTrail'],
  },
  {
    id: 'mission-06',
    file: 'mission-06-error-alarm.md',
    modules: [10],
    services: ['Amazon CloudWatch', 'Amazon SNS', 'AWS Lambda', 'Amazon CloudWatch Logs'],
  },
  { id: 'mission-07', file: 'mission-07-two-tier-vpc.md', modules: [5], services: ['Amazon VPC'] },
  {
    id: 'mission-08',
    file: 'mission-08-estimate-and-review.md',
    modules: [11, 13],
    services: ['AWS Pricing Calculator', 'AWS Well-Architected Tool'],
  },
];

const H2_ORDER = ['Goal', 'Before you start', 'Steps', 'Verify', 'Cleanup', 'Usage check', 'Never do'];

/** One phrase per shared cost-safety rule that every Never do section names (spec 5.3, S:853-858). */
const NEVER_DO = [
  'Paid plan',
  'Support plan',
  'NAT gateway',
  'Elastic IP',
  'Reserved Instances',
  'access keys',
  'organization',
  'Control Tower',
  'AWS Artifact',
  'Skill Builder',
];

/** The lines under one H2, up to the next H2. */
function section(body: string, title: string): string[] {
  const lines = body.split('\n');
  const start = lines.indexOf(`## ${title}`);
  if (start === -1) return [];
  const end = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

describe('Missions 0 to 8 (spec 5.3)', () => {
  it('ships Mission 0, Mission 1 and the seven cleaned-up missions, each in its decided file', () => {
    expect(missions.map((m) => m.path)).toEqual([
      'content/missions/mission-00-guardrails.md',
      'content/missions/mission-01-host-this-site.md',
      ...DECIDED.map((d) => `content/missions/${d.file}`),
    ]);
  });

  it('spells every later service the one way the plan-fit list does, Mission 0 included', () => {
    const later = new Set(missions.filter((m) => m.id !== 'mission-00').flatMap((m) => m.fm?.services ?? []));
    expect([...later].sort()).toEqual([...PLAN_SERVICES].sort());
    const gate = missions.find((m) => m.id === 'mission-00')?.fm?.services ?? [];
    expect(gate).toContain('AWS Identity and Access Management');
  });

  it("drops the service list from Mission 0's Plan status step and points to the form", () => {
    const gate = missions.find((m) => m.id === 'mission-00');
    const plan = section(gate?.body ?? '', 'Steps').join('\n');
    expect(plan).toContain('on the Plan status form below the steps');
    expect(plan).not.toContain('Amazon CloudFront');
    expect(gate?.fm?.services).toEqual([
      'AWS Identity and Access Management',
      'AWS Budgets',
      'AWS Billing and Cost Management',
    ]);
  });

  for (const d of DECIDED) {
    describe(d.id, () => {
      const m = missions.find((x) => x.id === d.id);
      const fm = m?.fm;
      const body = m?.body ?? '';

      it('has the decided frontmatter', () => {
        expect(fm?.id).toBe(d.id);
        expect(fm?.modules).toEqual(d.modules);
        expect(fm?.services).toEqual(d.services);
        expect(fm?.keep).toBe(false);
        expect(fm?.gate).toBeUndefined();
        expect(fm?.maxLiveHours).toBe(2);
        expect(fm?.expectedCredits.length).toBeGreaterThan(0);
      });

      it('has the H2 sections in order and at least one H3 step', () => {
        const h2 = body.split('\n').flatMap((line) => (line.startsWith('## ') ? [line.slice(3)] : []));
        expect(h2).toEqual(H2_ORDER);
        expect(section(body, 'Steps').filter((line) => line.startsWith('### ')).length).toBeGreaterThan(0);
      });

      it('tags its resources and ends Cleanup with the Tag Editor sweep', () => {
        expect(body).toContain(`ccp:mission=${d.id}`);
        const bullets = section(body, 'Cleanup').filter((line) => line.startsWith('- '));
        const last = bullets.at(-1) ?? '';
        expect(last).toContain('Tag Editor');
        expect(last).toContain('ccp:mission');
        for (const leftover of fm?.leftovers ?? [])
          expect(section(body, 'Cleanup').join('\n')).toContain(leftover);
      });

      it('names every shared rule under Never do', () => {
        const never = section(body, 'Never do').join('\n');
        for (const rule of NEVER_DO) expect(never).toContain(rule);
      });

      it('cites only official AWS pages', () => {
        expect(fm?.sources.length).toBeGreaterThan(0);
        for (const s of fm?.sources ?? []) {
          expect(['aws.amazon.com', 'docs.aws.amazon.com']).toContain(new URL(s.url).hostname);
        }
      });
    });
  }

  it("tells Mission 8's reader to paste the estimate link into decision 11's Cost note", () => {
    const body = missions.find((m) => m.id === 'mission-08')?.body ?? '';
    expect(section(body, 'Verify').join('\n')).toContain('decision 11');
    expect(body).toContain('Cost note');
  });

  it("states Mission 5's allow and deny matrix and draws Mission 7's network in a code block", () => {
    const five = missions.find((m) => m.id === 'mission-05')?.body ?? '';
    expect(five).toMatch(/\| *Action *\|.*\| *Expected *\|/);
    expect(five).toMatch(/denied/i);
    const seven = section(missions.find((m) => m.id === 'mission-07')?.body ?? '', 'Steps').join('\n');
    expect(seven).toMatch(/```text\n[\s\S]+\n```/);
  });
});
```

- [ ] **Step 2: Run the test and see it fail**

```bash
pnpm test tests/unit/missions-content.test.ts 2>&1 | tail -5
```

Expected: `Tests  40 failed (40)`: the file list, the plan-fit list, Mission 0's Plan status step, the Mission 5 and 7 shapes and every `mission-0N` case fail, because the seven files do not exist yet and Mission 0 still lists its services.

- [ ] **Step 3: Point Mission 0's Plan status step to the form**

In `content/missions/mission-00-guardrails.md`, replace these three bullets one for one, in order, and change nothing else: they are not adjacent, since the first two sit under `### Plan status` with one bullet between them and the third is the last bullet under `## Verify`, and each new bullet takes the place of the old one in the same position:

```markdown
- For each service a later mission uses, write down whether the free plan offers it: Amazon S3, Amazon CloudFront, AWS CloudFormation, Amazon EC2, AWS Lambda, Amazon CloudWatch Logs, Amazon DynamoDB, AWS IAM, AWS CloudTrail, Amazon SNS, Amazon VPC, AWS Pricing Calculator and AWS Well-Architected Tool.
- Mark a service you cannot confirm as unknown, and treat unknown as not offered until you confirm it.
- Your plan status record holds the plan, the credit balance, the end date and a yes, no or unknown for every service above.
```

with:

```markdown
- For each service a later mission uses, mark on the Plan status form below the steps whether the free plan offers it.
- Leave a service you cannot confirm unticked, because the form counts an unticked service as not offered until you confirm it.
- The Plan status form below the steps shows the day you saved your plan, credit balance and end date, with a tick for every service the free plan offers.
```

Run:

```bash
pnpm test tests/unit/missions-content.test.ts -t "Plan status" 2>&1 | grep -E 'Test Files|Tests '
```

Expected: `Tests  1 passed | 39 skipped (40)`.

- [ ] **Step 4: Run the mission writers**

The controller runs this script with the Workflow tool, with `args` `{ "worktree": "<absolute path of the missions-app worktree>" }`; it is tool input, not a repo file, and it never stages or commits.
It writes the seven files in parallel, has each checked by a fresh agent that reads only that file and its sources, revises each file once with its findings, and ends with one validate run.

```js
export const meta = {
  name: 'phase6-missions',
  description: 'Phase 6 Missions 2 to 8: one writer per mission grounded in official AWS pages, one fact checker per mission, one revision round, then one validate run',
  phases: [
    { title: 'Write', detail: 'one writer per mission' },
    { title: 'Check', detail: 'one fact checker per mission, reading only its file and its sources' },
    { title: 'Revise', detail: 'the writer of each mission with findings' },
    { title: 'Validate', detail: 'content:validate and the missions content test' },
  ],
}

const WT = args.worktree
const NODE = 'export PATH="/Users/danielchahine/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH";'
const HOOKS = `Start every shell command with: cd "${WT}" && ${NODE} Work only in this worktree, never in any other checkout. Never stage, commit or stash anything; the builder commits. Never use the em dash character. Never read the course source text, ~/Library/Application Support/ccp-study/, content/fingerprints/, content/exam/, content/questions/ or .results/.`

if (!WT) return { stopped: 'args.worktree is missing' }

/** Missions 2 to 8 as decided in the plan; the writer never changes these frontmatter values. */
const MISSIONS = [
  {
    n: '02',
    file: 'content/missions/mission-02-ec2-lifecycle.md',
    title: 'Launch, stop and terminate an EC2 instance',
    modules: [2, 6],
    services: ['Amazon EC2', 'Amazon VPC'],
    expectedCredits: 'a few cents; public IPv4 is charged by the hour',
    canUseCredits: ['EC2 instance hours beyond the free usage', 'public IPv4 address hours', 'EBS volume storage'],
    leftovers: ['the launch-wizard security group', 'any EBS volume left available after termination'],
    brief: `Launch one free-tier-eligible instance in the default VPC of the home Region, serve a tiny page from user data, connect with EC2 Instance Connect so no key pair is needed, stop and start it once to watch the public IPv4 address change, then terminate it and watch what happens to its root volume and to one extra small gp3 volume added at launch.
Guardrails: one instance only; an instance type the EC2 free tier page lists as eligible today; no Elastic IP; inbound HTTP 80 and SSH 22 from My IP only (or the Instance Connect range the docs name for SSH); terminate, never leave it stopped.
Verify: the instance's public DNS name or IP address serves the page over HTTP.
Cleanup order: terminate the instance, confirm the root volume is gone, delete any volume left available, delete the launch-wizard security group, then the Tag Editor sweep (note how long the docs say a terminated instance stays listed).
Usage check: Amazon EC2 (instances, and EC2-Other for EBS) and Amazon VPC (public IPv4) are back to the day before Start.
Pages to fetch: Get started with Amazon EC2; the EC2 free tier or free-tier-eligible instance types page; Run commands when you launch an instance with user data; Security group rules; Connect using EC2 Instance Connect; Stop and start instances; Terminate instances; Preserve data when an instance is terminated (DeleteOnTermination); Delete an Amazon EBS volume; the Amazon VPC pricing page (public IPv4 charges); Amazon EC2 On-Demand pricing.`,
  },
  {
    n: '03',
    file: 'content/missions/mission-03-upload-receipt.md',
    title: 'An S3 upload that logs a receipt through Lambda',
    modules: [3, 6, 10],
    services: ['Amazon S3', 'AWS Lambda', 'Amazon CloudWatch Logs'],
    expectedCredits: '$0 to a few cents',
    canUseCredits: ['Lambda invocations beyond the free usage', 'S3 storage and requests', 'log storage'],
    leftovers: ['/aws/lambda/<function> log group', 'execution role and its policy'],
    brief: `An upload to a new bucket triggers a Lambda function that writes one "receipt" line with the object key to its log.
Guardrails: Block Public Access stays on; the function only logs and never writes to the bucket, so it cannot loop on itself; one small test object; the console-created execution role keeps only the basic logging permissions; optionally set the log group's retention to 1 day.
Verify: a line with the object key appears in the function's log stream in CloudWatch Logs.
Cleanup order: delete the trigger and the function, delete the /aws/lambda/<function> log group, delete the execution role and its policy, empty and delete the bucket, then the Tag Editor sweep.
Usage check: AWS Lambda, Amazon S3 (compared with the day before Start, because Mission 1 keeps billing S3) and CloudWatch are back to baseline.
Pages to fetch: Tutorial: Using an Amazon S3 trigger to invoke a Lambda function (https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html); Defining Lambda function permissions with an execution role; Sending Lambda function logs to CloudWatch Logs; Lambda recursive loop detection; Emptying a bucket; Deleting a bucket; Working with log groups and log streams; AWS Lambda pricing; Amazon S3 pricing.`,
  },
  {
    n: '04',
    file: 'content/missions/mission-04-loyalty-table.md',
    title: 'A DynamoDB loyalty table on demand',
    modules: [7],
    services: ['Amazon DynamoDB'],
    expectedCredits: 'about $0',
    canUseCredits: ['on-demand read and write requests', 'table storage'],
    leftovers: [],
    brief: `Create a loyalty table for the cafe in on-demand capacity mode with the Standard table class, put a handful of small member items, and query one member by its partition key in the console or with aws dynamodb put-item and query --profile ccp-admin.
Guardrails: on-demand mode (check what the console picks by default and say how to choose on-demand); no global tables, DAX, streams, point-in-time recovery, backups or exports.
Verify: a query by one member's key returns that member's item.
Cleanup: delete the table, then the Tag Editor sweep.
Usage check: Amazon DynamoDB is back to the day before Start.
Pages to fetch: Getting started with DynamoDB; DynamoDB on-demand capacity mode; Tagging resources in DynamoDB; Deleting a table; Querying tables in DynamoDB; Amazon DynamoDB pricing.`,
  },
  {
    n: '05',
    file: 'content/missions/mission-05-least-privilege.md',
    title: 'A least-privilege role, tested and traced',
    modules: [9, 10],
    services: ['AWS Identity and Access Management', 'AWS CloudTrail'],
    expectedCredits: '$0',
    canUseCredits: [],
    leftovers: ['the role', 'its customer managed policy'],
    brief: `Create one role whose trust policy names only this account (or one service), with one customer managed policy scoped to one action set on one resource ARN and no * actions, test it in the IAM policy simulator against an allow and deny matrix, then find your own CreateRole, CreatePolicy and AttachRolePolicy calls in CloudTrail Event history filtered by the user name ccp-admin.
Guardrails: no access keys; no trail (Event history needs none); no * actions.
Write the matrix as a Markdown table whose header row is exactly | Action | Resource | Expected | with at least one allowed row and at least two denied rows (for example read of one bucket prefix allowed, write to it denied, read of another bucket denied).
Verify: every simulator row matches the matrix, including the denied ones.
Cleanup order: detach the policy, delete the policy, delete the role, then the Tag Editor sweep; check whether Tag Editor lists IAM roles and policies and say so, because the by-name deletion is the proof.
Usage check: no IAM or CloudTrail line above the day before Start.
Pages to fetch: Testing IAM policies with the IAM policy simulator; Create a role to delegate permissions to an AWS service (or to an IAM user); Policy evaluation logic; Security best practices in IAM; Tags for AWS Identity and Access Management resources; Working with CloudTrail Event history; AWS CloudTrail pricing; the Resource Groups Tag Editor supported resources page.`,
  },
  {
    n: '06',
    file: 'content/missions/mission-06-error-alarm.md',
    title: 'A CloudWatch alarm that emails on Lambda errors',
    modules: [10],
    services: ['Amazon CloudWatch', 'Amazon SNS', 'AWS Lambda', 'Amazon CloudWatch Logs'],
    expectedCredits: 'about $0',
    canUseCredits: [
      'the alarm beyond the free alarms',
      'SNS email deliveries beyond the free usage',
      'Lambda invocations',
      'log storage',
    ],
    leftovers: ['/aws/lambda/<function> log group', 'execution role and its policy', 'the SNS email subscription'],
    brief: `A throwaway Lambda function throws on demand from a console test event; one standard-resolution alarm on its Errors metric (threshold 1 or more, a period of 1 minute or more, missing data treated as not breaching) notifies one SNS topic with one confirmed email subscription to your own address.
Guardrails: one alarm, one topic, one subscription; no dashboards or other alarms; no high-resolution alarm.
Verify: after a forced error the alarm reaches ALARM and the email arrives.
Cleanup order: delete the alarm, delete the subscription, delete the topic, delete the function, the /aws/lambda/<function> log group and the execution role and its policy, then the Tag Editor sweep.
Usage check: CloudWatch, SNS and Lambda are back to the day before Start.
Pages to fetch: Create a CloudWatch alarm based on a static threshold; Using Amazon CloudWatch alarms (missing data, periods); Types of metrics for Lambda functions; Getting started with Amazon SNS; email notifications and subscription confirmation; Deleting an Amazon SNS subscription and topic; Testing Lambda functions in the console; Amazon CloudWatch pricing; Amazon SNS pricing.`,
  },
  {
    n: '07',
    file: 'content/missions/mission-07-two-tier-vpc.md',
    title: 'A two-tier VPC with no NAT gateway',
    modules: [5],
    services: ['Amazon VPC'],
    expectedCredits: '$0',
    canUseCredits: [],
    leftovers: [],
    brief: `Create a VPC with one public and one private subnet using the console's "VPC and more" with NAT gateways set to None and VPC endpoints set to None (check the wizard's defaults and say which to change), one internet gateway, a web security group that allows 80 and 443 from anywhere and an app security group that allows traffic only from the web group.
Guardrails: no instances, no Elastic IPs, no public IPv4 addresses, no NAT gateway.
Put an original ASCII diagram of the two subnets, their route tables and the internet gateway in a code block fenced with three backticks and the language text, inside the Steps section.
Verify: the public route table has 0.0.0.0/0 to the internet gateway plus the local route, the private route table has only the local route, and each subnet is associated as drawn.
Cleanup: delete the VPC (say what the console deletes with it, as the docs state), then the Tag Editor sweep.
Usage check: Amazon VPC is back to the day before Start.
Pages to fetch: Create a VPC; Subnets for your VPC; Configure route tables; Internet gateways; Control traffic to your AWS resources using security groups; NAT gateways (why this mission creates none); Amazon VPC pricing; Delete your VPC.`,
  },
  {
    n: '08',
    file: 'content/missions/mission-08-estimate-and-review.md',
    title: 'Estimate and review the cafe plan',
    modules: [11, 13],
    services: ['AWS Pricing Calculator', 'AWS Well-Architected Tool'],
    expectedCredits: '$0',
    canUseCredits: [],
    leftovers: ['the Well-Architected Tool workload'],
    brief: `Build an AWS Pricing Calculator estimate of the cafe plan from the capstone (spec 6), save it, and paste its link into decision 11's Cost note on the Project screen; then define a workload for the cafe in the AWS Well-Architected Tool in the home Region with the AWS Well-Architected Framework lens and answer one pillar's questions.
Guardrails: the public Pricing Calculator needs no sign-in, and a saved estimate link is public, so put no secrets in it; nothing billable is created.
Verify: the estimate link, which starts with https://calculator.aws/, is saved in decision 11's Cost note (the page's Verify button waits for it); say in the Verify section that capstone decisions open after the exam, so this Verify does too.
Cleanup: delete the Well-Architected Tool workload, then the Tag Editor sweep.
Usage check: still required to close the mission, even though nothing billable runs.
Pages to fetch: What is AWS Pricing Calculator; Generating, saving and sharing estimates; the AWS Well-Architected Tool user guide pages on defining a workload, lenses and deleting a workload; the AWS Well-Architected Framework.`,
  },
]

const yamlList = (items) => `[${items.map((x) => JSON.stringify(x)).join(', ')}]`
const frontOf = (m) => [
  '---',
  `id: mission-${m.n}`,
  `title: ${JSON.stringify(m.title)}`,
  `modules: [${m.modules.join(', ')}]`,
  `services: ${yamlList(m.services)}`,
  `expectedCredits: ${JSON.stringify(m.expectedCredits)}`,
  'keep: false',
  'maxLiveHours: 2',
  `canUseCredits: ${yamlList(m.canUseCredits)}`,
  `leftovers: ${yamlList(m.leftovers)}`,
  'sources:',
  '  - { url: "https://...", verified_on: "YYYY-MM-DD" }',
  '---',
].join('\n')

const RULES = `Shape (tests/unit/missions-content.test.ts checks it): the H2 headings are exactly Goal, Before you start, Steps, Verify, Cleanup, Usage check, Never do, in that order and no others; Steps holds one H3 per step and at least two; read content/missions/mission-00-guardrails.md and content/missions/mission-01-host-this-site.md first and match their Markdown shape and tone.
Before you start: sign in as ccp-admin, never the root user; use the home Region of Mission 0; run CLI commands with --profile ccp-admin; tag every taggable resource ccp:mission=mission-NN (with this mission's number) and name the tag in that exact form; say what can use credits and that the mission must be cleaned up within 2 hours of Start.
Verify: something Dani can observe (a page loads, a log line, a simulator verdict, a route table, a saved link), never "it should work".
Cleanup: delete every frontmatter leftover by its exact frontmatter text first, then the other resources in reverse dependency order; the last bullet of Cleanup is the Tag Editor search for the tag key ccp:mission in all Regions, which must return 0 results, and it names both Tag Editor and ccp:mission.
Usage check: on the next study day open Cost Explorer with daily granularity grouped by Service, compare each of this mission's services with the day before Start (not with zero), then note the remaining credit balance, which the page records with the usage button.
Never do: never upgrade to the Paid plan or change the Support plan; never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs, RDS or Aurora, EKS, Redshift, OpenSearch or SageMaker endpoints, Shield Advanced, Direct Connect, Route 53 domains or hosted zones, Reserved Instances, Savings Plans or Marketplace subscriptions; never create root access keys; never enable IAM Identity Center or join an organization; never set up an AWS Control Tower landing zone, join the AWS Partner Network, accept an AWS Artifact agreement such as the BAA, sign a Professional Services contract or Enterprise Agreement, or buy an AWS Skill Builder Team subscription, because each of these upgrades a free-plan account; add the mission's own never-dos; the test checks that Never do names Paid plan, Support plan, NAT gateway, Elastic IP, Reserved Instances, access keys, organization, Control Tower, AWS Artifact and Skill Builder.
Style: one sentence per line outside code blocks and tables; no em dash; plain words; no raw HTML; every code block fenced with three backticks and a language (text, bash or json); never name a retired Support plan (Developer Support, Business Support without the plus, Enterprise On-Ramp), because rule R8 reports those names on mission pages from Task 11 on, so say Support plan, Business Support+ or Enterprise Support instead.`

const GROUNDING = `Every fact about AWS behaviour, defaults, limits, prices or free usage enters the page only after you confirm it on an official page you fetched today with WebFetch; when a page contradicts the brief below, the page wins and you say so in your return.
Only pages on aws.amazon.com or docs.aws.amazon.com may be sources; find the exact URL of each named page there (WebSearch is fine for finding it), fetch it, and list it in sources with verified_on set to the output of \`date +%F\`.
A sentence about the free plan, its credits or upgrade triggers, AWS Budgets or AWS Artifact states only what the table under \`## Appendix B: Verified facts\` of docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md says, cites that row's official URL in sources, and stays in your own words.
Write every sentence in your own words: never copy a run of 8 or more words from a page, never paste a page's steps, and keep the page short (a Mission 0 sized page at most).`

const WRITE = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    sources: { type: 'integer' },
    contradictions: { type: 'array', items: { type: 'string' } },
    frontmatterIssues: { type: 'array', items: { type: 'string' } },
    validate: { type: 'string' },
    test: { type: 'string' },
  },
  required: ['file', 'sources', 'contradictions', 'frontmatterIssues', 'validate', 'test'],
}
const CHECK = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: { line: { type: 'integer' }, problem: { type: 'string' } },
        required: ['line', 'problem'],
      },
    },
  },
  required: ['file', 'findings'],
}
const FINAL = {
  type: 'object',
  properties: { validate: { type: 'string' }, test: { type: 'string' }, status: { type: 'string' } },
  required: ['validate', 'test', 'status'],
}

const LOOP = (m) => `Loop until both pass: \`pnpm --silent content:validate\` must print a last line that ends in \`0 findings\` (fix only findings in your file; report any other file's finding and leave it), and \`pnpm test tests/unit/missions-content.test.ts -t "mission-${m.n}"\` must pass.`

function writer(m) {
  return agent(`You write Mission ${Number(m.n)} of the CCP study site, a real-AWS exercise Dani does by hand in his own free-plan account, in the git worktree ${WT}.
Create ${m.file} and no other file.
Its frontmatter is fixed; copy it exactly, then replace the sources line with one line per official page you fetched:
\`\`\`yaml
${frontOf(m)}
\`\`\`
If a page shows a frontmatter value is wrong (a leftover named differently, a credit that cannot apply), keep the value and report it in frontmatterIssues; the builder decides.
The mission:
${m.brief}
${RULES}
${GROUNDING}
${LOOP(m)}
${HOOKS}
Return the file, the number of sources, every brief statement a page contradicted, every frontmatter issue, the last line of the validate run and the Tests line of the test run.`, { label: `write mission-${m.n}`, phase: 'Write', schema: WRITE })
}

function checker(m) {
  return agent(`You check ${m.file} in the git worktree ${WT}, a mission page of the CCP study site; read only that file and the pages its frontmatter sources list, which you fetch with WebFetch.
Report, with its line number, every line that states an AWS behaviour, default, limit, price or free-usage fact no fetched source supports; every line that copies a run of 8 or more words from a source; every taggable resource the page creates without the tag ccp:mission=mission-${m.n}; any frontmatter leftover the Cleanup section does not delete by name; a Cleanup that is not in reverse dependency order or does not end with the Tag Editor sweep for ccp:mission in all Regions; a Verify that is not observable; any step that creates something on the Never do list or could upgrade the account; any free-plan, AWS Budgets or AWS Artifact fact that disagrees with the table under \`## Appendix B: Verified facts\` of docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md, which you may read.
Never edit any file. ${HOOKS}
Return the file and the findings, or an empty list.`, { label: `check mission-${m.n}`, phase: 'Check', schema: CHECK })
}

function reviser(m, findings) {
  return agent(`You revise ${m.file} in the git worktree ${WT} after a fact check of Mission ${Number(m.n)}.
Fix each finding below by confirming the fact on an official page fetched today (and adding that page to sources with today's verified_on), rewording, or removing the line:
${findings.map((f) => `- line ${f.line}: ${f.problem}`).join('\n')}
Keep the frontmatter values other than sources exactly as they are.
${RULES}
${GROUNDING}
${LOOP(m)}
${HOOKS}
Return the file, the number of sources, contradictions, frontmatter issues, the last line of the validate run and the Tests line of the test run.`, { label: `revise mission-${m.n}`, phase: 'Revise', schema: WRITE })
}

// One pipeline, no barrier: each mission moves on to its check and its revision as soon as its own writer returns.
const results = await pipeline(
  MISSIONS,
  (_, m) => writer(m),
  (w, m) => {
    log(w ? `${m.file}: ${w.sources} sources; validate ${w.validate}; test ${w.test}` : `${m.file}: the writer returned nothing`)
    return checker(m).then((c) => ({ w, c }))
  },
  ({ w, c }, m) => {
    const findings = c?.findings ?? [{ line: 1, problem: 'the checker returned nothing; check the whole file again' }]
    const done = findings.length === 0 && w ? Promise.resolve(w) : reviser(m, findings)
    return done.then((r) => ({ c, r }))
  },
)

phase('Validate')
const final = await agent(`In the git worktree ${WT}, run \`pnpm --silent content:validate\`, \`pnpm test tests/unit/missions-content.test.ts 2>&1 | grep -E 'Tests '\` and \`git status --short content/missions\`, and return the last line of the first, the Tests line of the second and the status lines joined by "; ".
Never edit any file. ${HOOKS}`, { label: 'validate', phase: 'Validate', schema: FINAL })

return {
  missions: MISSIONS.map((m, i) => ({
    file: m.file,
    findings: results[i]?.c?.findings.length ?? null,
    contradictions: results[i]?.r?.contradictions ?? ['the reviser returned nothing'],
    frontmatterIssues: results[i]?.r?.frontmatterIssues ?? [],
  })),
  validate: final?.validate ?? 'not run',
  test: final?.test ?? 'not run',
  status: final?.status ?? 'not run',
}
```

Expected return: seven `missions` entries whose `contradictions` and `frontmatterIssues` lists the builder reads one by one, `validate` ending in `0 findings`, `test` reading `Tests  40 passed (40)`, and `status` listing the seven new files as `??` and nothing else.
A frontmatter issue means an official page disagrees with a decided value (for example a leftover that AWS names differently): change the value in both the mission file and the `DECIDED` table of the test only when the cited page proves it, and say so in the commit body.
A contradiction the writer already resolved in the page needs no action beyond reading the changed lines.

- [ ] **Step 5: Read the seven pages once**

```bash
for f in content/missions/mission-0[2-8]-*.md; do echo "== $f"; grep -nE '^## |^### |ccp:mission' "$f"; done
grep -c 'verified_on' content/missions/mission-0[2-8]-*.md
```

Expected: each file lists the seven H2s in order, at least two H3s under `## Steps`, a `ccp:mission=mission-0N` tag line and a last Cleanup bullet naming Tag Editor and `ccp:mission`; every file has at least 3 `verified_on` lines.
Read each page in full in the editor as Dani would: if a step could create something on the Never do list, upgrade the account or leave a resource running, fix the line by hand and rerun Step 6.

- [ ] **Step 6: Show nine rows on the missions list**

In `tests/e2e/reader.spec.ts`, replace the test `the missions list shows Missions 0 and 1`:

```ts
test('the missions list shows Missions 0 and 1', async ({ page }) => {
  await page.goto('/#/missions');
  const rows = page.locator('main a[href^="#/missions/"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Guardrails before anything else');
  await expect(rows.nth(1)).toContainText('Host this site on S3 and CloudFront');
});
```

with:

```ts
test('the missions list shows Missions 0 to 8 in order', async ({ page }) => {
  await page.goto('/#/missions');
  const rows = page.locator('main a.row[href^="#/missions/"]');
  await expect(rows).toHaveCount(9);
  await expect(rows.nth(0)).toContainText('Guardrails before anything else');
  await expect(rows.nth(1)).toContainText('Host this site on S3 and CloudFront');
  for (let n = 0; n <= 8; n++) {
    await expect(rows.nth(n)).toHaveAttribute('href', `#/missions/mission-${String(n).padStart(2, '0')}`);
  }
});
```

- [ ] **Step 7: Run the checks and see them pass**

```bash
pnpm --silent content:validate
pnpm test tests/unit/missions-content.test.ts tests/unit/context.test.ts tests/unit/build-real.test.ts 2>&1 | grep -E 'Test Files|Tests '
pnpm build 2>&1 | grep -o 'initial JS [0-9.]* KB of 50.0 KB'
E2E_PORT=4327 pnpm exec playwright test tests/e2e/reader.spec.ts -g "mission|Mission" 2>&1 | tail -3
pnpm typecheck
pnpm lint
```

Expected: `content:validate: 13 rules, 0 findings`; `Test Files  3 passed (3)` with no failed test; the initial JS unchanged from `master` (the missions ship only in the index and the search chunk); `10 passed` for the reader's mission tests in both projects (the list, the mission page facts, and the Missions, Mission 0 and Mission 1 axe views); `tsc --noEmit` prints nothing and Biome prints `No fixes applied.`

- [ ] **Step 8: Commit on the branch**

```bash
pnpm lint:fix
git add content/missions/mission-00-guardrails.md content/missions/mission-02-ec2-lifecycle.md content/missions/mission-03-upload-receipt.md content/missions/mission-04-loyalty-table.md content/missions/mission-05-least-privilege.md content/missions/mission-06-error-alarm.md content/missions/mission-07-two-tier-vpc.md content/missions/mission-08-estimate-and-review.md tests/unit/missions-content.test.ts tests/e2e/reader.spec.ts
git commit -m "Add Missions 2 to 8" -m "Seven cleaned-up missions with credit notes, tagged resources, observable Verify steps, cleanup by name and a Tag Editor sweep, and a next-day usage check, each grounded in official AWS pages; Mission 0's Plan status step points to its form."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds on the `missions-app` branch; nothing merges to `master` yet.

## Task 14: Mission sections, the missions screens and the live chip

**Files:**
- Create: `src/app/missions.ts`, `src/app/mission-copy.ts`, `src/app/screens/MissionFlow.tsx`, `tests/unit/missions-app.test.ts`, `tests/e2e/missions.spec.ts`
- Modify: `schemas/chunks.ts` (`MissionMeta`), `scripts/content/build.ts` (`missionSteps`, mission `sections` and `steps`), `tests/fixtures/content-root/content/missions/mission-00-guardrails.md`, `tests/unit/build.test.ts`, `tests/unit/home.test.ts` (its `MissionMeta` helper), `src/app/screens/MissionPage.tsx`, `src/app/screens/MissionsPage.tsx`, `src/app/screens/Screen.tsx` (the two mission screens load lazily), `src/app/screens/TopBar.tsx`, `src/ui/base.css` (under `/* Missions: flow */` only)
- Test: `tests/unit/missions-app.test.ts`, `tests/unit/build.test.ts`, `tests/unit/home.test.ts`, `tests/unit/r06.test.ts`, `tests/unit/context.test.ts`, `tests/e2e/missions.spec.ts`

**Depends on:** Tasks 2, 9, 10 and 13; Phase 4 Task 14 (the last Phase 4 edit of `schemas/chunks.ts`, `scripts/content/build.ts` and `tests/unit/build.test.ts`, already on `master` at 057efe5) and Phase 4 Task 19 (the last Phase 4 edit of `tests/unit/home.test.ts` and `src/app/screens/Screen.tsx`).
Rebase onto `master` before you start and confirm with `git log master --oneline` that Phase 4 Task 19's merge is there; Task 11 edits the same three build files in disjoint hunks, so whichever of Tasks 11 and 14 lands second rebases.
It uses these names from Task 9 (`src/engine/missions.ts`): `GATE_MISSION`, `MissionRef`, `PlanRecord`, `MissionStep`, `MissionStatus` (with `stage`, `missing`, `liveMs`, `usageFrom`, `closedDay`), `MissionLog` (with `attempts[].verified`), `missionLogOf`, `missionStatuses`, `planServices`, `liveMission`; and from Task 10: `KV_KEYS.plan`, `KV_KEYS.missionTicks`, `adrKey` (`src/store/kv.ts`), `planOf`, `ticksOf`, `withTick` (`src/app/mission-records.ts`), `adrDraftOf` (`src/app/adr-draft.ts`), and the empty `/* Missions: flow */` anchor in `src/ui/base.css`.

**Covers:** P6-110, P6-111, P6-113, P6-115, P6-116, P6-117, P6-118, P6-119, P6-120, P6-121, P6-122, P6-125, P6-140 (missions), P6-141 (missions), P6-148 (missions), P6-151.

Design notes:
- The build splits each mission into `sections` (one per H2, each holding its own heading, as `renderDoc` already returns them) and `steps` (the H3s under `## Steps`, from `renderDoc`'s `headings`), so the page places its controls after named sections and ticks defined boxes (spec 5.3 rule 1) without parsing HTML.
- Bundle: the top bar and Next need mission state on every screen, so `src/app/missions.ts` holds only the signals and the chip's two copy lines and stays in the initial bundle; every other line of copy and every form helper lives in `src/app/mission-copy.ts`, which only the mission screens import, and `Screen.tsx` now loads `MissionsPage` and `MissionPage` through `lazyScreen`, like the exam screens.
- The prototype measured the initial JS at 49.6 KB of 50 KB on `master` 057efe5 (48.7 KB) with this task and Tasks 9 and 10 (49.7 KB once Task 15 adds mission safety to Next); with everything mission-related eager it measured 51.1 KB, which is why the screens went lazy and the copy moved out (the brief's fallback order, applied up front).
- `MissionFlow` is a plain import of the lazy `MissionPage` chunk, so each slot renders at once and the page shows no `Loading` lines between its sections.
- Log stages win over the gate and plan fit (Task 9); the page offers Start only in `ready`, the ticks and Verify only while an open attempt has not passed Verify, `Cleaned up` while live or overdue, and the usage field in `cleaned` (kept: `verified`), enabled from `usageFrom`.
- Mission 0's Plan status form sits after its Steps section, both while started and once closed, so a later change of plan can be saved; it writes the kv `plan` record with every plan-fit service, ticked or not.
- Mission 8's Verify waits for a `https://calculator.aws/` link in decision 11's draft Cost note (kv `adr-11`), so it opens with the capstone after the exam.
- The chip replaces the top bar's `Missions` link while a mission is live, at every width (the phone rule hides only `.topbar-missions`), in `--live` amber on the white bar, with the word `live` in its text and an accessible name that spells out the time.
- Amber text on the page's grey falls under 4.5:1, so the `Live` and `Clean up now` stage words sit on a white pill; the list's amber stage word sits on the white rows.
- Starting a mission clears its old ticks, so a retry starts unticked.
- A usage check that closes nothing (an attempt that never passed Verify) announces `Usage check saved for Mission 3.` rather than `Mission 3 closed.`; this line and the two plan problems (`Enter the credits you have left.`, `Enter the date your plan ends.`) are copy the brief did not list.
- Rows carry `data-nav-item`, ready for `j` and `k`, but `keys.ts` moves only on Home and module pages, as spec 7.4's key table says, so Phase 6 (Task 18 included) leaves the missions list out of `j` and `k`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/missions-app.test.ts`:

```ts
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
```

In `tests/unit/build.test.ts`, import `missionSteps` with the other build exports:

```ts
import { buildContent, confusableLinks, missionSteps, readingMinutes } from '../../scripts/content/build.ts';
```

then replace the line

```ts
    expect(index.missions[0]?.html).toContain('<h2 id="goal">Goal</h2>');
```

with:

```ts
    expect(index.missions[0]?.sections.map((s) => s.id)).toEqual(['goal', 'steps']);
    expect(index.missions[0]?.sections[0]?.html).toContain('<h2 id="goal">Goal</h2>');
    expect(index.missions[0]?.sections[1]?.html).toContain('<h3 id="budget-first">Budget first</h3>');
    expect(index.missions[0]?.steps).toEqual([
      { id: 'budget-first', title: 'Budget first' },
      { id: 'alert-email', title: 'Alert email' },
    ]);
```

and add this case right before `it('writes a search chunk with a normalized entry per module, lesson, concept, term, mission and lab', () => {`:

```ts
  it("takes a mission's steps from the H3s under its Steps section only", () => {
    expect(
      missionSteps([
        { depth: 2, id: 'goal', text: 'Goal' },
        { depth: 3, id: 'not-a-step', text: 'Not a step' },
        { depth: 2, id: 'steps', text: 'Steps' },
        { depth: 3, id: 'make-the-bucket', text: 'Make the bucket' },
        { depth: 3, id: 'add-the-trigger', text: 'Add the trigger' },
        { depth: 2, id: 'verify', text: 'Verify' },
        { depth: 3, id: 'after', text: 'After' },
      ]),
    ).toEqual([
      { id: 'make-the-bucket', title: 'Make the bucket' },
      { id: 'add-the-trigger', title: 'Add the trigger' },
    ]);
  });
```

In `tests/unit/home.test.ts`, in the `mission` helper of the `memoryContentOf` describe (`const mission = (id: string, keep: boolean): MissionMeta => ({`), replace

```ts
      sources: [],
      html: '',
    });
```

with:

```ts
      sources: [],
      sections: [],
      steps: [],
    });
```

Append to `tests/fixtures/content-root/content/missions/mission-00-guardrails.md`:

```markdown

## Steps

### Budget first

Create one budget for the bakery account.

### Alert email

Add your email address to the budget.
```

Create `tests/e2e/missions.spec.ts`:

```ts
import { expect, type Page, test } from '@playwright/test';
import type { NewEvent } from '../../schemas/events.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
  seedKv,
} from './helpers.ts';

/** The mission tests run on 2026-10-20 at 09:00 UTC, the day after Mission 0 was verified in the seeded logs. */
const NOW = '2026-10-20T09:00:00.000Z';
const YESTERDAY = '2026-10-19T09:00:00.000Z';
const TOMORROW = '2026-10-21T09:00:00.000Z';
const HOME_TITLE = 'AWS Cloud Practitioner Essentials';

/** Every service of Missions 1 to 8, as the Plan status form lists them. */
const PLAN_SERVICES = [
  'Amazon CloudFront',
  'Amazon CloudWatch',
  'Amazon CloudWatch Logs',
  'Amazon DynamoDB',
  'Amazon EC2',
  'Amazon S3',
  'Amazon SNS',
  'Amazon VPC',
  'AWS CloudFormation',
  'AWS CloudTrail',
  'AWS Identity and Access Management',
  'AWS Lambda',
  'AWS Pricing Calculator',
  'AWS Well-Architected Tool',
];

const step = (mission: string, s: 'start' | 'verified' | 'cleaned' | 'usage-ok'): NewEvent =>
  s === 'usage-ok' ? { t: 'mission', mission, step: s, credits: 118.5 } : { t: 'mission', mission, step: s };

/** Mission 0 started and verified the day before. */
const GATE: (readonly [string, NewEvent])[] = [
  ['2026-10-19T08:00:00.000Z', step('mission-00', 'start')],
  [YESTERDAY, step('mission-00', 'verified')],
];

/** A saved plan with every service offered, except those in `without`. */
const plan = (without: readonly string[] = []) => ({
  plan: 'free',
  credits: 120,
  endsOn: '2027-04-10',
  services: Object.fromEntries(PLAN_SERVICES.map((s) => [s, !without.includes(s)])),
  recordedAt: YESTERDAY,
});

/** Opens Home, then stores the plan and the log, which the reload in `seedEvents` loads. */
async function seed(
  page: Page,
  log: readonly (readonly [string, NewEvent])[],
  kv: Record<string, unknown> = {},
) {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION, ...kv });
  await seedEvents(page, timelineOf(log));
}

const row = (page: Page, n: number) =>
  page.locator(`main a.row[href="#/missions/mission-${String(n).padStart(2, '0')}"]`);
const chip = (page: Page) => page.locator('.topbar-live');
const announced = (page: Page) => page.locator('main p[aria-live="polite"]');

/** Ticks every step of the open mission page. */
async function tickAll(page: Page): Promise<void> {
  const boxes = page.getByRole('checkbox', { name: /^Done: / });
  const count = await boxes.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) await boxes.nth(i).check();
}

failOnPageProblems();
// UTC keeps the study day and the 04:00 boundary the same on every machine.
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
});

test('Missions 2 to 8 show Locked until Mission 0 is verified', async ({ page }) => {
  await page.goto('/#/missions');
  await expect(h1(page, 'Missions')).toBeVisible();
  await expect(page.locator('main .lede')).toHaveText('Start with Mission 0: Guardrails.');
  await expect(row(page, 0).locator('.row-meta')).toHaveText('Ready');
  for (let n = 1; n <= 8; n++) await expect(row(page, n).locator('.row-meta')).toHaveText('Locked');
  await row(page, 3).click();
  await expect(page.getByText('Locked until Mission 0 is verified.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Mission 3' })).toHaveCount(0);
});

test('Mission 0 ticks, the plan status and Verify unlock Mission 2', async ({ page }) => {
  await page.goto('/#/missions/mission-00');
  await page.getByRole('button', { name: 'Start Mission 0' }).click();
  await expect(announced(page)).toHaveText('Mission 0 started.');
  const verify = page.getByRole('button', { name: 'Verify' });
  await expect(verify).toBeDisabled();
  await expect(page.getByText('Tick every step first.')).toBeVisible();
  await tickAll(page);
  await expect(page.getByText('Save your plan status first.')).toBeVisible();
  await page.getByRole('button', { name: 'Save plan status' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter the credits you have left.');
  await expect(page.getByRole('alert')).toContainText('Enter the date your plan ends.');
  await page.getByLabel('Free plan').check();
  await page.getByLabel('Credits left ($)').fill('120');
  await page.getByLabel('Plan ends on').fill('2027-04-10');
  const services = page.getByRole('group', { name: 'Services on your plan' });
  for (const name of PLAN_SERVICES) await services.getByLabel(name, { exact: true }).check();
  await page.getByRole('button', { name: 'Save plan status' }).click();
  await expect(page.getByText('Plan status saved on Tue 20 Oct.')).toBeVisible();
  await expect(verify).toBeEnabled();
  await verify.click();
  await expect(announced(page)).toHaveText('Mission 0 verified.');
  await expect(page.getByText('Closed on Tue 20 Oct.')).toBeVisible();
  await page.goto('/#/missions');
  await expect(page.locator('main .lede')).toHaveText(
    'Real AWS, done by hand in your own account, one mission at a time.',
  );
  await expect(row(page, 0).locator('.row-meta')).toHaveText('Closed');
  await expect(row(page, 2).locator('.row-meta')).toHaveText('Ready');
});

test('a service the plan lacks shows Not on your plan and no Start button', async ({ page }) => {
  await seed(page, GATE, { [KV_KEYS.plan]: plan(['AWS Lambda']) });
  await page.goto('/#/missions');
  await expect(row(page, 3).locator('.row-meta')).toHaveText('Not on your plan');
  await row(page, 3).click();
  await expect(page.getByText('Not on your plan: AWS Lambda.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Mission 3' })).toHaveCount(0);
});

test('Start Mission 3 shows the live chip, which counts up and leaves on cleanup', async ({ page }) => {
  await seed(page, GATE, { [KV_KEYS.plan]: plan() });
  await page.goto('/#/missions/mission-03');
  await page.getByRole('button', { name: 'Start Mission 3' }).click();
  await expect(announced(page)).toHaveText('Mission 3 started.');
  await expect(chip(page)).toHaveText('M3 live 0m');
  // The chip takes the Missions link's place at every width, phone included.
  await expect(chip(page)).toBeVisible();
  await expect(page.locator('.topbar-missions')).toHaveCount(0);
  await expect(chip(page)).toHaveAttribute('href', '#/missions/mission-03');
  await page.clock.fastForward('01:00:00');
  await expect(chip(page)).toHaveText('M3 live 1h');
  await expect(chip(page)).toHaveAccessibleName('Mission 3 has been live for 1 hour; open it');
  await page.getByRole('button', { name: 'Cleaned up' }).click();
  await expect(announced(page)).toHaveText('Mission 3 cleaned up.');
  await expect(chip(page)).toHaveCount(0);
  await expect(page.locator('.topbar-missions')).toHaveCount(1);
});

test('the usage check opens the next study day and closes a verified mission', async ({ page }) => {
  await seed(
    page,
    [
      ...GATE,
      ['2026-10-20T07:00:00.000Z', step('mission-03', 'start')],
      ['2026-10-20T07:30:00.000Z', step('mission-03', 'verified')],
      ['2026-10-20T08:00:00.000Z', step('mission-03', 'cleaned')],
    ],
    { [KV_KEYS.plan]: plan() },
  );
  await page.goto('/#/missions/mission-03');
  const usage = page.getByRole('button', { name: 'Usage is back to baseline' });
  await expect(usage).toBeDisabled();
  await expect(page.getByText('Check usage on Wed 21 Oct or later.')).toBeVisible();
  await page.clock.setSystemTime(new Date(TOMORROW));
  await page.reload();
  await expect(usage).toBeEnabled();
  await usage.click();
  await expect(page.getByRole('alert')).toHaveText('Enter the credits you have left.');
  await page.getByLabel('Credits left ($)').fill('118.5');
  await usage.click();
  await expect(announced(page)).toHaveText('Mission 3 closed.');
  await expect(page.getByText('Closed on Wed 21 Oct.')).toBeVisible();
});

test('Mission 3 cleaned up without Verify offers Start Mission 3 again after its usage check', async ({
  page,
}) => {
  await seed(
    page,
    [
      ...GATE,
      ['2026-10-19T10:00:00.000Z', step('mission-03', 'start')],
      ['2026-10-19T11:00:00.000Z', step('mission-03', 'cleaned')],
      ['2026-10-20T08:00:00.000Z', step('mission-03', 'usage-ok')],
    ],
    { [KV_KEYS.plan]: plan() },
  );
  await page.goto('/#/missions');
  await expect(row(page, 3).locator('.row-meta')).toHaveText('Ready');
  await row(page, 3).click();
  await expect(page.getByRole('button', { name: 'Start Mission 3' })).toBeVisible();
});

test('the kept Mission 1 never shows a chip', async ({ page }) => {
  await seed(page, [...GATE, ['2026-10-20T06:00:00.000Z', step('mission-01', 'start')]], {
    [KV_KEYS.plan]: plan(),
  });
  await page.goto('/#/missions/mission-01');
  await expect(page.locator('.stage-word')).toHaveText('Started');
  await page.clock.fastForward('03:00:00');
  await expect(chip(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cleaned up' })).toHaveCount(0);
});

test.describe('accessibility and layout', () => {
  test('the list, a locked page, a live page and the Mission 0 form have no axe violations', async ({
    page,
  }) => {
    await page.goto('/#/missions');
    await expect(row(page, 8)).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
    await page.goto('/#/missions/mission-02');
    await expect(page.getByText('Locked until Mission 0 is verified.')).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
    await page.goto('/#/missions/mission-00');
    await page.getByRole('button', { name: 'Start Mission 0' }).click();
    await expect(page.getByRole('button', { name: 'Save plan status' })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
  });

  test('a live mission page and its chip have no axe violations', async ({ page }) => {
    await seed(page, [...GATE, ['2026-10-20T08:30:00.000Z', step('mission-03', 'start')]], {
      [KV_KEYS.plan]: plan(),
    });
    await page.goto('/#/missions/mission-03');
    await expect(chip(page)).toHaveText('M3 live 30m');
    await expect(page.getByRole('button', { name: 'Verify' })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/missions-app.test.ts tests/unit/build.test.ts 2>&1 | grep -E 'FAIL|Tests '
```

Expected: `tests/unit/missions-app.test.ts` fails to load (`Error: Cannot find module '../../src/app/mission-copy.ts'`), and in `tests/unit/build.test.ts` the cases `indexes concepts, the glossary and missions with their routes` (`TypeError: Cannot read properties of undefined (reading 'map')`) and `takes a mission's steps from the H3s under its Steps section only` (`missionSteps is not a function`) fail.

```bash
pnpm build >/dev/null 2>&1 && E2E_PORT=4327 pnpm exec playwright test tests/e2e/missions.spec.ts -g "show Locked" --project chromium-desktop 2>&1 | grep -E '[0-9]+ (passed|failed)'
```

Expected: `1 failed`, because the list still opens with its read-only lede rather than `Start with Mission 0: Guardrails.` (and its rows show expected credits rather than `Locked`).

- [ ] **Step 3: Ship mission sections and steps**

In `schemas/chunks.ts`, in `MissionMeta`, replace

```ts
  sources: { url: string; verified_on: string }[];
  html: string;
}
```

with:

```ts
  sources: { url: string; verified_on: string }[];
  /** One section per H2, each with its own heading, so the page can put the mission flow after named sections. */
  sections: Section[];
  /** The H3 steps under `## Steps`, which the mission page ticks off (spec 5.3 rule 1). */
  steps: { id: string; title: string }[];
}
```

In `scripts/content/build.ts`, add `HeadingMeta,` to the type import from `../../schemas/chunks.ts` (right after `GlossaryItem,`), and add this function right before the doc comment `/** Renders the notes, glossary and missions of a loaded context into hashed JSON chunks (spec 2.10). */`:

```ts
/** A mission's steps: the H3 headings under its `## Steps` section, in order. */
export function missionSteps(headings: readonly HeadingMeta[]): MissionMeta['steps'] {
  const steps: MissionMeta['steps'] = [];
  let inSteps = false;
  for (const h of headings) {
    if (h.depth === 2) inSteps = h.id === 'steps';
    else if (inSteps) steps.push({ id: h.id, title: h.text });
  }
  return steps;
}
```

In the missions map of `buildContent`, replace

```ts
      const { sections } = renderDoc(mission.body, { path: mission.path, routes, terms: null });
```

with

```ts
      const { sections, headings } = renderDoc(mission.body, { path: mission.path, routes, terms: null });
```

and replace

```ts
        html: sections.map((s) => s.html).join(''),
      };
```

with:

```ts
        sections,
        steps: missionSteps(headings),
      };
```

Run:

```bash
pnpm test tests/unit/build.test.ts tests/unit/home.test.ts tests/unit/r06.test.ts tests/unit/context.test.ts 2>&1 | grep -E 'Test Files|Tests '
```

Expected: `Test Files  4 passed (4)` with no failed test (`build.test.ts` holds 30 cases on the prototype).

- [ ] **Step 4: Add the mission signals and the mission copy**

Create `src/app/missions.ts`:

```ts
/**
 * Mission state in signals (spec 5.3): each mission's stage from the log, the plan record and the minute clock, and
 * the top bar's live chip.
 * This module is in the initial bundle, because the top bar and Next read it; the screens' copy and helpers live in
 * `mission-copy.ts`, which only the lazy mission screens load.
 */
import { computed } from '@preact/signals';
import type { MissionMeta } from '../../schemas/chunks.ts';
import { tzOffset } from '../engine/day.ts';
import {
  liveMission,
  type MissionRef,
  type MissionStatus,
  missionLogOf,
  missionStatuses,
  type PlanRecord,
} from '../engine/missions.ts';
import { KV_KEYS } from '../store/kv.ts';
import { now } from './clock.ts';
import { index } from './content.ts';
import { planOf } from './mission-records.ts';
import { events, kvRecords } from './progress.ts';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** What the engine needs from a mission's index entry. */
export function refOf(m: MissionMeta): MissionRef {
  return {
    id: m.id,
    n: Number(m.id.slice('mission-'.length)),
    keep: m.keep,
    gate: m.gate,
    maxLiveHours: m.maxLiveHours,
    services: m.services,
  };
}

export const missionRefs = computed<MissionRef[]>(() => (index.value?.missions ?? []).map(refOf));

export const planRecord = computed<PlanRecord | null>(() => planOf(kvRecords.value[KV_KEYS.plan]?.value));

export const missionLogs = computed(() => missionLogOf(events.value, missionRefs.value));

/** Each mission's stage at the minute clock, so a live mission turns overdue without a timer of its own. */
export const statuses = computed<MissionStatus[]>(() => {
  const at = now.value;
  return missionStatuses({
    missions: missionRefs.value,
    log: missionLogs.value,
    plan: planRecord.value,
    now: at,
    tz: tzOffset(at),
  });
});

/** The amber top-bar chip while a cleaned-up mission is live (spec 5.3 rule 10); it links to the mission. */
export const liveChip = computed<{ label: string; href: string; aria: string } | null>(() => {
  const live = liveMission(statuses.value);
  if (live === null || live.liveMs === null) return null;
  return {
    label: liveLabel(live.n, live.liveMs),
    href: `#/missions/${live.id}`,
    aria: liveAria(live.n, live.liveMs),
  };
});

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** `M3 live 12m` under an hour, then `M3 live 1h` in whole hours; a clock a little behind the Start reads 0m. */
export function liveLabel(n: number, liveMs: number): string {
  const ms = Math.max(0, liveMs);
  return ms < HOUR_MS
    ? `M${n} live ${Math.floor(ms / MINUTE_MS)}m`
    : `M${n} live ${Math.floor(ms / HOUR_MS)}h`;
}

/** The chip's accessible name, which spells out the time and says where the link goes. */
export function liveAria(n: number, liveMs: number): string {
  const ms = Math.max(0, liveMs);
  const time =
    ms < HOUR_MS
      ? plural(Math.floor(ms / MINUTE_MS), 'minute', 'minutes')
      : plural(Math.floor(ms / HOUR_MS), 'hour', 'hours');
  return `Mission ${n} has been live for ${time}; open it`;
}
```

Create `src/app/mission-copy.ts`:

```ts
/** The mission screens' copy and helpers (spec 5.3, 7.5); only the lazy mission screens load this module. */
import { computed, signal } from '@preact/signals';
import type { MissionMeta } from '../../schemas/chunks.ts';
import { GATE_MISSION, type MissionStatus, type MissionStep, type PlanRecord } from '../engine/missions.ts';
import { KV_KEYS } from '../store/kv.ts';
import { adrDraftOf } from './adr-draft.ts';
import { examDateLabel } from './home.ts';
import { ticksOf } from './mission-records.ts';
import { kvRecords } from './progress.ts';

/** Mission 8's Verify waits for the estimate link in decision 11's Cost note (spec 5.3). */
export const ESTIMATE_MISSION = 'mission-08';
export const ESTIMATE_DECISION = 11;
export const CALCULATOR_LINK = 'https://calculator.aws/';

/** The ticked step ids of each mission, from kv `missionTicks`. */
export const missionTicks = computed(() => ticksOf(kvRecords.value[KV_KEYS.missionTicks]?.value));

/** The mission page's polite live region: what the last button did. */
export const missionAnnounce = signal('');

const STAGE_WORDS: Record<MissionStatus['stage'], string> = {
  locked: 'Locked',
  'not-on-plan': 'Not on your plan',
  ready: 'Ready',
  started: 'Started',
  live: 'Live',
  overdue: 'Clean up now',
  cleaned: 'Cleaned up',
  verified: 'Verified',
  closed: 'Closed',
};

export function stageWord(s: MissionStatus): string {
  return STAGE_WORDS[s.stage];
}

/** Why a mission cannot start: the gate, or the services the plan lacks. */
export function lockLine(s: MissionStatus): string | null {
  if (s.stage === 'locked') return 'Locked until Mission 0 is verified.';
  if (s.stage === 'not-on-plan') return `Not on your plan: ${s.missing.join(', ')}.`;
  return null;
}

const ANNOUNCED: Record<MissionStep, string> = {
  start: 'started',
  verified: 'verified',
  cleaned: 'cleaned up',
  'usage-ok': 'closed',
};

export function missionAnnouncement(n: number, step: MissionStep): string {
  return `Mission ${n} ${ANNOUNCED[step]}.`;
}

/** The announcement for a usage check that closes nothing, because its attempt never passed Verify. */
export function usageSavedLine(n: number): string {
  return `Usage check saved for Mission ${n}.`;
}

export function usageLine(from: string): string {
  return `Check usage on ${examDateLabel(from)} or later.`;
}

export function closedLine(day: string): string {
  return `Closed on ${examDateLabel(day)}.`;
}

/** The Plan status saved line; `day` is the study day of the record's `recordedAt`. */
export function savedLine(day: string): string {
  return `Plan status saved on ${examDateLabel(day)}.`;
}

/** The list's lede: the gate first (spec 7.5 empty state), then what missions are. */
export function listLede(list: readonly MissionStatus[]): string {
  const gate = list.find((s) => s.id === GATE_MISSION);
  return gate?.stage === 'closed'
    ? 'Real AWS, done by hand in your own account, one mission at a time.'
    : 'Start with Mission 0: Guardrails.';
}

export function startLabel(n: number): string {
  return `Start Mission ${n}`;
}

export function usageButtonLabel(keep: boolean): string {
  return keep ? 'Cost stays within the expected credits' : 'Usage is back to baseline';
}

/** The first thing Verify still waits for, or null when it can be pressed. */
export function verifyHint(args: {
  allTicked: boolean;
  needsPlan: boolean;
  planSaved: boolean;
  needsEstimate: boolean;
  estimateSaved: boolean;
}): string | null {
  if (!args.allTicked) return 'Tick every step first.';
  if (args.needsPlan && !args.planSaved) return 'Save your plan status first.';
  if (args.needsEstimate && !args.estimateSaved) return 'Save the estimate link in decision 11 first.';
  return null;
}

export function allTicked(steps: readonly { id: string }[], ticked: readonly string[]): boolean {
  return steps.every((s) => ticked.includes(s.id));
}

/** The ticks without one mission's, for a fresh attempt. */
export function ticksCleared(
  ticks: Readonly<Record<string, readonly string[]>>,
  mission: string,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [id, list] of Object.entries(ticks)) if (id !== mission) out[id] = [...list];
  return out;
}

/** True when a decision draft's Cost note holds a Pricing Calculator link. */
export function estimateSaved(draft: unknown): boolean {
  return adrDraftOf(draft)?.cost.includes(CALCULATOR_LINK) ?? false;
}

/** Where the mission flow puts its controls: after the section with this id, or nowhere. */
export type FlowSlot = 'start' | 'steps' | 'verify' | 'cleanup' | 'usage';

export function slotAfter(sectionId: string, m: Pick<MissionMeta, 'keep' | 'gate'>): FlowSlot | null {
  switch (sectionId) {
    case 'before-you-start':
      return 'start';
    case 'steps':
      return 'steps';
    case 'verify':
      return 'verify';
    case 'cleanup':
      return m.keep || m.gate ? null : 'cleanup';
    case 'usage-check':
      return m.keep || m.gate ? null : 'usage';
    case 'keep-it-running':
      return m.keep ? 'usage' : null;
    default:
      return null;
  }
}

/** The Plan status form as typed: numbers stay text until saved. */
export interface PlanDraft {
  plan: 'free' | 'paid';
  credits: string;
  endsOn: string;
  services: Record<string, boolean>;
}

/** The form's starting values: the saved record, else a free plan with every service unticked. */
export function planDraftOf(saved: PlanRecord | null, services: readonly string[]): PlanDraft {
  return {
    plan: saved?.plan ?? 'free',
    credits: saved === null ? '' : String(saved.credits),
    endsOn: saved?.endsOn ?? '',
    services: Object.fromEntries(services.map((s) => [s, saved?.services[s] === true])),
  };
}

const isAmount = (text: string): boolean =>
  text.trim() !== '' && Number.isFinite(Number(text)) && Number(text) >= 0;

export function planProblems(d: PlanDraft): string[] {
  const out: string[] = [];
  if (!isAmount(d.credits)) out.push('Enter the credits you have left.');
  if (d.plan === 'free' && d.endsOn === '') out.push('Enter the date your plan ends.');
  return out;
}

/** The kv `plan` record of a draft with no problems, stamped `at`. */
export function planRecordOf(d: PlanDraft, at: Date): PlanRecord {
  return {
    plan: d.plan,
    credits: Number(d.credits),
    endsOn: d.endsOn,
    services: { ...d.services },
    recordedAt: at.toISOString(),
  };
}

/** The credits typed into a usage field, or null when the field holds no amount. */
export function creditsOf(text: string): number | null {
  return isAmount(text) ? Number(text) : null;
}
```

Run:

```bash
pnpm test tests/unit/missions-app.test.ts 2>&1 | grep -E 'Test Files|Tests '
```

Expected: `Tests  12 passed (12)`.

- [ ] **Step 5: Add the mission flow**

Create `src/app/screens/MissionFlow.tsx`:

```tsx
/** The mission flow (spec 5.3), loaded on demand: Start, the step ticks, Verify, Cleaned up and the usage check. */
import { useState } from 'preact/hooks';
import type { MissionMeta } from '../../../schemas/chunks.ts';
import { studyDay } from '../../engine/day.ts';
import { GATE_MISSION, type MissionStatus, type MissionStep, planServices } from '../../engine/missions.ts';
import { adrKey, KV_KEYS } from '../../store/kv.ts';
import { now } from '../clock.ts';
import {
  allTicked,
  closedLine,
  creditsOf,
  ESTIMATE_DECISION,
  ESTIMATE_MISSION,
  estimateSaved,
  type FlowSlot,
  lockLine,
  missionAnnounce,
  missionAnnouncement,
  missionTicks,
  type PlanDraft,
  planDraftOf,
  planProblems,
  planRecordOf,
  savedLine,
  stageWord,
  startLabel,
  ticksCleared,
  usageButtonLabel,
  usageLine,
  usageSavedLine,
  verifyHint,
} from '../mission-copy.ts';
import { withTick } from '../mission-records.ts';
import { missionLogs, missionRefs, planRecord, statuses } from '../missions.ts';
import { kvRecords, record, writeKv } from '../progress.ts';

/** Records one mission step and announces it once the log shows it. */
function step(m: MissionMeta, n: number, s: MissionStep, credits?: number): void {
  void record(
    credits === undefined
      ? { t: 'mission', mission: m.id, step: s }
      : { t: 'mission', mission: m.id, step: s, credits },
  ).then(() => {
    const closed = statuses.peek().find((x) => x.id === m.id)?.stage === 'closed';
    missionAnnounce.value = s === 'usage-ok' && !closed ? usageSavedLine(n) : missionAnnouncement(n, s);
  });
}

/** True while an attempt is open and has not passed Verify, which is when steps tick and Verify shows. */
function verifying(m: MissionMeta, s: MissionStatus): boolean {
  if (s.stage !== 'started' && s.stage !== 'live' && s.stage !== 'overdue') return false;
  return missionLogs.value.get(m.id)?.attempts.at(-1)?.verified == null;
}

/** One slot of the mission flow, placed by the mission page after the section that `slot` names. */
export function MissionFlow({ mission, slot }: { mission: MissionMeta; slot: FlowSlot }) {
  const s = statuses.value.find((x) => x.id === mission.id);
  if (s === undefined) return null;
  switch (slot) {
    case 'start':
      return <StartSlot m={mission} s={s} />;
    case 'steps':
      return <StepsSlot m={mission} s={s} />;
    case 'verify':
      return verifying(mission, s) ? <VerifySlot m={mission} s={s} /> : null;
    case 'cleanup':
      return s.stage === 'live' || s.stage === 'overdue' ? (
        <div class="mission-flow">
          <button class="button" type="button" onClick={() => step(mission, s.n, 'cleaned')}>
            Cleaned up
          </button>
        </div>
      ) : null;
    case 'usage':
      return s.usageFrom !== null && (s.stage === 'cleaned' || s.stage === 'verified') ? (
        <UsageSlot m={mission} s={s} from={s.usageFrom} />
      ) : null;
  }
}

function StartSlot({ m, s }: { m: MissionMeta; s: MissionStatus }) {
  const lock = lockLine(s);
  return (
    <div class="mission-flow">
      <p class="mission-line">
        <span class={`stage-word stage-${s.stage}`}>{stageWord(s)}</span>
      </p>
      {lock !== null && <p class="muted mission-line">{lock}</p>}
      {s.stage === 'closed' && s.closedDay !== null && <p class="mission-line">{closedLine(s.closedDay)}</p>}
      {s.stage === 'ready' && (
        <button
          class="button"
          type="button"
          onClick={() => {
            void writeKv(KV_KEYS.missionTicks, ticksCleared(missionTicks.peek(), m.id));
            step(m, s.n, 'start');
          }}
        >
          {startLabel(s.n)}
        </button>
      )}
    </div>
  );
}

function StepsSlot({ m, s }: { m: MissionMeta; s: MissionStatus }) {
  const ticking = verifying(m, s) && m.steps.length > 0;
  const planForm = m.gate && (s.stage === 'started' || s.stage === 'closed');
  if (!ticking && !planForm) return null;
  const ticked = missionTicks.value[m.id] ?? [];
  return (
    <div class="mission-flow">
      {ticking && (
        <ul class="mission-ticks">
          {m.steps.map((st) => (
            <li key={st.id}>
              <label class="mission-tick">
                <input
                  type="checkbox"
                  checked={ticked.includes(st.id)}
                  onChange={(event) =>
                    void writeKv(
                      KV_KEYS.missionTicks,
                      withTick(missionTicks.peek(), m.id, st.id, event.currentTarget.checked),
                    )
                  }
                />
                Done: {st.title}
              </label>
            </li>
          ))}
        </ul>
      )}
      {planForm && <PlanForm />}
    </div>
  );
}

function VerifySlot({ m, s }: { m: MissionMeta; s: MissionStatus }) {
  const hint = verifyHint({
    allTicked: allTicked(m.steps, missionTicks.value[m.id] ?? []),
    needsPlan: m.id === GATE_MISSION,
    planSaved: planRecord.value !== null,
    needsEstimate: m.id === ESTIMATE_MISSION,
    estimateSaved: estimateSaved(kvRecords.value[adrKey(ESTIMATE_DECISION)]?.value),
  });
  const hintId = `${m.id}-verify-hint`;
  return (
    <div class="mission-flow">
      <button
        class="button"
        type="button"
        disabled={hint !== null}
        aria-describedby={hint === null ? undefined : hintId}
        onClick={() => step(m, s.n, 'verified')}
      >
        Verify
      </button>
      {hint !== null && (
        <p id={hintId} class="muted mission-line">
          {hint}
        </p>
      )}
    </div>
  );
}

function UsageSlot({ m, s, from }: { m: MissionMeta; s: MissionStatus; from: string }) {
  const [credits, setCredits] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const open = studyDay(now.value) >= from;
  return (
    <form
      class="mission-flow"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const amount = creditsOf(credits);
        if (amount === null) {
          setProblem('Enter the credits you have left.');
          return;
        }
        setProblem(null);
        step(m, s.n, 'usage-ok', amount);
      }}
    >
      <label class="date-field">
        Credits left ($)
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={credits}
          disabled={!open}
          onInput={(event) => setCredits(event.currentTarget.value)}
        />
      </label>
      <button class="button" type="submit" disabled={!open}>
        {usageButtonLabel(m.keep)}
      </button>
      {!open && <p class="muted mission-line">{usageLine(from)}</p>}
      {problem !== null && (
        <p class="mission-problem" role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}

/** The fields of the Plan status form, shared by Mission 0 and the Already done panel. */
export function PlanFields({ draft, onChange }: { draft: PlanDraft; onChange: (next: PlanDraft) => void }) {
  return (
    <fieldset class="plan-fields">
      <legend>Plan status</legend>
      <div class="plan-row">
        <label class="mission-tick">
          <input
            type="radio"
            name="plan"
            checked={draft.plan === 'free'}
            onChange={() => onChange({ ...draft, plan: 'free' })}
          />
          Free plan
        </label>
        <label class="mission-tick">
          <input
            type="radio"
            name="plan"
            checked={draft.plan === 'paid'}
            onChange={() => onChange({ ...draft, plan: 'paid' })}
          />
          Paid plan
        </label>
      </div>
      <div class="plan-row">
        <label class="date-field">
          Credits left ($)
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={draft.credits}
            onInput={(event) => onChange({ ...draft, credits: event.currentTarget.value })}
          />
        </label>
        <label class="date-field">
          Plan ends on
          <input
            type="date"
            value={draft.endsOn}
            onInput={(event) => onChange({ ...draft, endsOn: event.currentTarget.value })}
          />
        </label>
      </div>
      <fieldset class="plan-services">
        <legend>Services on your plan</legend>
        <ul class="mission-ticks">
          {Object.keys(draft.services).map((name) => (
            <li key={name}>
              <label class="mission-tick">
                <input
                  type="checkbox"
                  checked={draft.services[name] === true}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      services: { ...draft.services, [name]: event.currentTarget.checked },
                    })
                  }
                />
                {name}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </fieldset>
  );
}

/** Mission 0's Plan status form: it writes the kv `plan` record that plan fit reads (spec 5.3 rule 2, 8.1). */
function PlanForm() {
  const saved = planRecord.value;
  const [draft, setDraft] = useState<PlanDraft>(() => planDraftOf(saved, planServices(missionRefs.peek())));
  const [problems, setProblems] = useState<string[]>([]);
  return (
    <form
      class="plan-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const found = planProblems(draft);
        setProblems(found);
        if (found.length === 0) void writeKv(KV_KEYS.plan, planRecordOf(draft, new Date()));
      }}
    >
      <PlanFields draft={draft} onChange={setDraft} />
      {problems.length > 0 && (
        <ul class="mission-problem" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <button class="button" type="submit">
        Save plan status
      </button>
      {saved !== null && <p class="muted mission-line">{savedLine(studyDay(new Date(saved.recordedAt)))}</p>}
    </form>
  );
}
```

- [ ] **Step 6: Render the sections and the flow, list the states and show the chip**

Replace `src/app/screens/MissionPage.tsx` with:

```tsx
import { Fragment } from 'preact';
import { useEffect } from 'preact/hooks';
import type { ContentIndex, MissionMeta } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { missionAnnounce, slotAfter } from '../mission-copy.ts';
import { pad2 } from '../router.ts';
import { MissionFlow } from './MissionFlow.tsx';
import { NotFound } from './NotFound.tsx';

function lifetime(m: MissionMeta): string {
  if (m.keep) return 'Kept running';
  if (m.maxLiveHours !== null) return `Cleaned up within ${m.maxLiveHours} hours`;
  return 'No live resources';
}

/** The URL with a line-break opportunity after each path slash, so a long one wraps at a path boundary. */
function breakable(url: string) {
  let at = 0;
  return url.split(/(?<=[^/]\/)(?=[^/])/).map((part) => {
    const start = at;
    at += part.length;
    return (
      <Fragment key={start}>
        {start > 0 && <wbr />}
        {part}
      </Fragment>
    );
  });
}

/** Mission `#/missions/mission-NN`: the facts box, the steps and the sources they were checked against. */
export function MissionPage({ idx, id }: { idx: ContentIndex; id: string }) {
  const m = idx.missions.find((x) => x.id === id);
  useTitle(m?.title ?? 'Not found');
  // biome-ignore lint/correctness/useExhaustiveDependencies: the line belongs to one mission, so it clears when another opens
  useEffect(() => {
    missionAnnounce.value = '';
  }, [id]);
  if (m === undefined) return <NotFound hash={`#/missions/${id}`} />;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: 'Missions', href: '#/missions' },
          { label: m.title, href: `#/missions/${m.id}` },
        ]}
      />
      <h1>{m.title}</h1>
      <dl class="facts">
        <dt>Modules</dt>
        <dd>
          {m.modules.map((n, i) => (
            <span key={n}>
              {i > 0 && ', '}
              <a href={`#/m/${pad2(n)}`}>Module {n}</a>
            </span>
          ))}
        </dd>
        <dt>Services</dt>
        <dd>{m.services.join(', ')}</dd>
        <dt>Expected credits</dt>
        <dd>{m.expectedCredits}</dd>
        <dt>Time limit</dt>
        <dd>{lifetime(m)}</dd>
        <dt>Can use credits</dt>
        <dd>{m.canUseCredits.length === 0 ? 'Nothing' : m.canUseCredits.join(', ')}</dd>
      </dl>
      {m.sections.map((section) => {
        const slot = slotAfter(section.id, m);
        return (
          <Fragment key={section.id}>
            <Html className="prose" html={section.html} />
            {slot !== null && <MissionFlow mission={m} slot={slot} />}
          </Fragment>
        );
      })}
      <p class="visually-hidden" aria-live="polite">
        {missionAnnounce.value}
      </p>
      <h2>Sources</h2>
      <ul class="sources">
        {m.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} rel="noopener noreferrer" target="_blank">
              {breakable(s.url)}
            </a>{' '}
            <span class="muted">checked {s.verified_on}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
```

Replace `src/app/screens/MissionsPage.tsx` with:

```tsx
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { listLede, stageWord } from '../mission-copy.ts';
import { statuses } from '../missions.ts';
import { storeReady } from '../progress.ts';

/** Missions `#/missions` (spec 5.3, 7.3): every mission with its lock, plan-fit, live or done state. */
export function MissionsPage({ idx }: { idx: ContentIndex }) {
  useTitle('Missions');
  const ready = storeReady.value;
  const byId = new Map(statuses.value.map((s) => [s.id, s] as const));
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: 'Missions', href: '#/missions' },
        ]}
      />
      <h1>Missions</h1>
      <p class="muted lede">{listLede(statuses.value)}</p>
      <ul class="rows">
        {idx.missions.map((m) => {
          const s = ready ? byId.get(m.id) : undefined;
          const live = s?.stage === 'live' || s?.stage === 'overdue';
          return (
            <li key={m.id}>
              <a class={live ? 'row row-live' : 'row'} href={`#/missions/${m.id}`} data-nav-item>
                <span class="row-n">{Number(m.id.slice('mission-'.length))}</span>
                <span class="row-title">{m.title}</span>
                <span class="row-meta">{s === undefined ? m.expectedCredits : stageWord(s)}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
```

In `src/app/screens/Screen.tsx`, delete the two imports

```tsx
import { MissionPage } from './MissionPage.tsx';
import { MissionsPage } from './MissionsPage.tsx';
```

add right after the line `const LabScreen = lazyScreen(() => import('./Lab.tsx').then((m) => m.Lab));`:

```tsx
// The mission screens and their flow load on first use too; the top bar's live chip is all missions add up front.
const MissionsScreen = lazyScreen(() => import('./MissionsPage.tsx').then((m) => m.MissionsPage));
const MissionScreen = lazyScreen(() => import('./MissionPage.tsx').then((m) => m.MissionPage));
```

and in the `switch`, replace `return <MissionsPage idx={idx} />;` with `return <MissionsScreen idx={idx} />;` and `return <MissionPage idx={idx} id={route.id} />;` with `return <MissionScreen idx={idx} id={route.id} />;`.

In `src/app/screens/TopBar.tsx`, add the import

```tsx
import { liveChip } from '../missions.ts';
```

right after `import { memory, queue, rank, ranks, streak } from '../memory.ts';`; in `SiteBar`, add `const chip = liveChip.value;` right after `const flash = useXpFlash(xp);`, and replace

```tsx
        <a class="topbar-missions" href="#/missions">
          Missions
        </a>
```

with:

```tsx
        {chip === null ? (
          <a class="topbar-missions" href="#/missions">
            Missions
          </a>
        ) : (
          <a class="topbar-live" href={chip.href} aria-label={chip.aria}>
            <span class="live-pill">{chip.label}</span>
          </a>
        )}
```

- [ ] **Step 7: Style the flow and the chip**

In `src/ui/base.css`, replace the empty anchor line `/* Missions: flow */` (Task 10) with:

```css
/* Missions: flow */
/* The live chip (spec 5.3 rule 10): amber, and the word `live` says it too; it takes the Missions link's place. */
.topbar .topbar-live {
  font-weight: 600;
  color: var(--live);
  white-space: nowrap;
}

.live-pill {
  padding: 2px 10px;
  font-size: 0.875rem;
  border: 1px solid var(--live);
  border-radius: 999px;
}

.row-live .row-meta {
  font-weight: 600;
  color: var(--live);
}

/* The mission flow sits between the mission's own sections: a stage line, buttons and short forms. */
.mission-flow {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin: 12px 0 24px;
}

.mission-line {
  margin: 0;
}

.stage-word {
  font-weight: 600;
}

/* On the page's grey, amber text needs the pane behind it to keep its 4.5:1 contrast. */
.stage-live,
.stage-overdue {
  padding: 0 8px;
  color: var(--live);
  background: var(--pane);
  border: 1px solid var(--live);
  border-radius: 999px;
}

.mission-ticks {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mission-tick {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
}

.mission-tick input {
  flex: none;
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--active);
}

.plan-form {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.plan-fields,
.plan-services {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.plan-fields legend,
.plan-services legend {
  padding: 0;
  font-weight: 600;
}

.plan-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 4px 0 8px;
}

.mission-problem {
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--bad);
}
```

- [ ] **Step 8: Run the unit tests, the checks and the build**

```bash
pnpm test tests/unit/missions-app.test.ts tests/unit/build.test.ts tests/unit/home.test.ts tests/unit/r06.test.ts tests/unit/context.test.ts tests/unit/lazy.test.ts tests/unit/topbar.test.ts 2>&1 | grep -E 'Test Files|Tests '
pnpm typecheck
pnpm lint
pnpm build 2>&1 | grep -o 'initial JS [0-9.]* KB of 50.0 KB\|budget breach.*'
```

Expected: `Test Files  7 passed (7)` with no failed test; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`; `initial JS 49.6 KB of 50.0 KB` on the prototype over `master` 057efe5, and at most 50.0 KB after Phase 4 Tasks 17 and 19; report the measured number and the headroom.
If the build breaches the budget after Phase 4 Task 19, stop and report the number to the controller before trimming anything, since the brief's next fallback (lazy module page sections) belongs to Task 18.

- [ ] **Step 9: Run the end-to-end tests and see them pass**

```bash
E2E_PORT=4327 pnpm exec playwright test tests/e2e/missions.spec.ts tests/e2e/reader.spec.ts -g "issions|Mission|accessibility" 2>&1 | tail -3
```

Expected: `44 passed` on the prototype, with none failed: 18 from `missions.spec.ts` (nine tests in `chromium-desktop` and `webkit-mobile`) and 26 from the reader's mission and accessibility tests.

- [ ] **Step 10: Commit on the branch**

```bash
pnpm lint:fix
git add schemas/chunks.ts scripts/content/build.ts tests/fixtures/content-root/content/missions/mission-00-guardrails.md tests/unit/build.test.ts tests/unit/home.test.ts src/app/missions.ts src/app/mission-copy.ts src/app/screens/MissionFlow.tsx src/app/screens/MissionPage.tsx src/app/screens/MissionsPage.tsx src/app/screens/Screen.tsx src/app/screens/TopBar.tsx src/ui/base.css tests/unit/missions-app.test.ts tests/e2e/missions.spec.ts
git commit -m "Track missions with a gate, plan fit, a live chip and cleanup" -m "Missions ship their sections and steps, mission pages gain steps to tick, Start, Verify, Cleanup and the usage check, the list shows each mission's state, and the top bar shows an amber chip while a mission is live."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds on the `missions-app` branch.

## Task 15: Mission safety in Next

**Files:**
- Modify: `src/engine/next.ts`, `src/app/home.ts` (`nextLabel`), `src/app/memory.ts` (`nextUp`), `tests/unit/next.test.ts`, `tests/unit/home.test.ts`, `tests/e2e/missions.spec.ts`
- Test: `tests/unit/next.test.ts`, `tests/unit/home.test.ts`, `tests/e2e/missions.spec.ts`

**Depends on:** Tasks 9 and 14; Phase 4 Task 16 (the last Phase 4 edit of `src/engine/next.ts` and `tests/unit/next.test.ts`, on `master` at 057efe5) and Phase 4 Task 19 (the last Phase 4 edit of `src/app/home.ts`, `src/app/memory.ts` and `tests/unit/home.test.ts`).
It uses `MissionSafety`, `missionSafety`, `missionLogOf`, `missionStatuses` and `MissionRef` from Task 9 and `statuses` from Task 14.
After this task the controller merges Tasks 13, 14 and 15 from `missions-app` to `master` together, by Tuesday, November 3.

**Covers:** P6-123, P6-124, P6-130, P6-159.

Design notes:
- `NextInput.safety` takes `missionSafety(statuses, today)` as it is, so the engine's rule (cleanup first, then the usage check, lowest mission first; the kept Mission 1 never cleans up) lives in one place, Task 9.
- Safety ranks right after Resume and before Reviews (spec 4.6 item 2): a session already open finishes first, and a live mission past its time limit beats everything else.
- Both actions link to the mission page; Clean up counts about 10 minutes and the usage check about 5 (`CLEANUP_MINUTES`, `USAGE_MINUTES`).
- The label is `Clean up M3` or `Check usage for M3`, with the mission number unpadded as in the chip.
- `statuses` reads the same minute clock as `nextUp`, so Next turns into Clean up within a minute of the limit, with no timer of its own.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/next.test.ts`, add this import right before `import { mockDeadline } from '../../src/engine/mock.ts';`, where Biome's import order puts `missions.ts`:

```ts
import {
  type MissionRef,
  type MissionSafety,
  missionLogOf,
  missionSafety,
  missionStatuses,
} from '../../src/engine/missions.ts';
```

add `safety: null,` to `inputOf` right after `tz: 0,`, and append at the end of the file:

```ts
describe('mission safety in Next (spec 4.6 item 2, 5.3 rules 10 to 12)', () => {
  const MISSIONS: MissionRef[] = [
    { id: 'mission-00', n: 0, keep: false, gate: true, maxLiveHours: null, services: ['AWS Budgets'] },
    { id: 'mission-01', n: 1, keep: true, gate: false, maxLiveHours: null, services: ['Amazon S3'] },
    { id: 'mission-03', n: 3, keep: false, gate: false, maxLiveHours: 2, services: ['Amazon S3'] },
  ];
  const PLAN = {
    plan: 'free' as const,
    credits: 120,
    endsOn: '2027-04-10',
    services: { 'Amazon S3': true },
    recordedAt: '2026-10-09T09:00:00.000Z',
  };
  const step = (mission: string, s: 'start' | 'verified' | 'cleaned' | 'usage-ok'): NewEvent => ({
    t: 'mission',
    mission,
    step: s,
  });
  const GATE = [
    [at('2026-10-09', 8), step('mission-00', 'start')],
    [at('2026-10-09', 9), step('mission-00', 'verified')],
  ] as const;
  /** The safety action of a mission log read at `now` (UTC, offset 0). */
  const safetyAt = (log: readonly (readonly [string, NewEvent])[], now: string): MissionSafety | null => {
    const statuses = missionStatuses({
      missions: MISSIONS,
      log: missionLogOf(timelineOf([...GATE, ...log]), MISSIONS),
      plan: PLAN,
      now: new Date(now),
      tz: 0,
    });
    return missionSafety(statuses, now.slice(0, 10));
  };
  const CLEANUP: MissionSafety = { kind: 'cleanup', mission: 'mission-03', n: 3 };

  it('turns a live mission past its 2 hours into Clean up, ahead of reviews and behind Resume', () => {
    const live = [[at('2026-10-10', 9), step('mission-03', 'start')]] as const;
    expect(safetyAt(live, at('2026-10-10', 11))).toBeNull();
    expect(safetyAt(live, at('2026-10-10', 11, 1))).toEqual(CLEANUP);
    const queue = queueOf(['a', 'b']);
    expect(nextAction(inputOf([], { queue, safety: CLEANUP }))).toEqual({
      kind: 'cleanup',
      mission: 'mission-03',
      n: 3,
    });
    const open = [
      [at('2026-10-10', 9), done(KITCHEN.note)],
      [at('2026-10-10', 9, 1), startOf(SID, 'check', ['q-a', 'q-b'], KITCHEN.note)],
    ] as const;
    expect(nextAction(inputOf(open, { queue, safety: CLEANUP })).kind).toBe('resume');
  });

  it('asks for the usage check from the day after cleanup until it is done', () => {
    const cleaned = [
      [at('2026-10-10', 9), step('mission-03', 'start')],
      [at('2026-10-10', 9, 30), step('mission-03', 'verified')],
      [at('2026-10-10', 10), step('mission-03', 'cleaned')],
    ] as const;
    expect(safetyAt(cleaned, at('2026-10-10', 20))).toBeNull();
    const usage = safetyAt(cleaned, at('2026-10-11', 9));
    expect(usage).toEqual({ kind: 'usage', mission: 'mission-03', n: 3 });
    expect(nextAction(inputOf([], { queue: queueOf(['a']), safety: usage }))).toEqual({
      kind: 'usage',
      mission: 'mission-03',
      n: 3,
    });
    expect(
      safetyAt([...cleaned, [at('2026-10-11', 9), step('mission-03', 'usage-ok')]], at('2026-10-11', 10)),
    ).toBeNull();
  });

  it('never asks the kept Mission 1 to clean up, and asks for its usage check the day after Verify', () => {
    const started = [[at('2026-10-10', 9), step('mission-01', 'start')]] as const;
    expect(safetyAt(started, at('2026-10-10', 23))).toBeNull();
    const verified = [...started, [at('2026-10-10', 10), step('mission-01', 'verified')]] as const;
    expect(safetyAt(verified, at('2026-10-10', 23))).toBeNull();
    expect(safetyAt(verified, at('2026-10-11', 9))).toEqual({ kind: 'usage', mission: 'mission-01', n: 1 });
  });

  it('gives Clean up about 10 minutes and the usage check about 5', () => {
    expect(nextMinutes({ kind: 'cleanup', mission: 'mission-03', n: 3 })).toBe(10);
    expect(nextMinutes({ kind: 'usage', mission: 'mission-03', n: 3 })).toBe(5);
  });
});
```

In `tests/unit/home.test.ts`, add this case to the `nextLabel` describe, right before `it('has no link and no time when done for today', () => {`:

```ts
  it('sends mission cleanup and the usage check to the mission page', () => {
    expect(nextLabel({ kind: 'cleanup', mission: 'mission-03', n: 3 }, IDX, NOW)).toEqual({
      label: 'Clean up M3',
      href: '#/missions/mission-03',
      minutes: 10,
    });
    expect(nextLabel({ kind: 'usage', mission: 'mission-01', n: 1 }, IDX, NOW)).toEqual({
      label: 'Check usage for M1',
      href: '#/missions/mission-01',
      minutes: 5,
    });
  });
```

Append to `tests/e2e/missions.spec.ts`:

```ts
test.describe('Next (spec 9 e2e 7)', () => {
  const nextLink = (page: Page) => page.locator('a.next[data-next]');

  test('a live mission past its 2 hours turns Next into Clean up, and Enter opens it', async ({ page }) => {
    await seed(page, [...GATE, ['2026-10-20T08:55:00.000Z', step('mission-03', 'start')]], {
      [KV_KEYS.plan]: plan(),
    });
    await expect(nextLink(page)).not.toContainText('Clean up');
    await page.clock.fastForward('02:06:00');
    await expect(nextLink(page).locator('.next-label')).toHaveText('Clean up M3');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/missions\/mission-03$/);
    await expect(page.getByRole('button', { name: 'Cleaned up' })).toBeVisible();
  });

  test('the day after cleanup Next asks for the usage check', async ({ page }) => {
    await seed(
      page,
      [
        ...GATE,
        ['2026-10-20T07:00:00.000Z', step('mission-03', 'start')],
        ['2026-10-20T08:00:00.000Z', step('mission-03', 'cleaned')],
      ],
      { [KV_KEYS.plan]: plan() },
    );
    await expect(nextLink(page)).toBeVisible();
    await expect(nextLink(page)).not.toContainText('Check usage');
    await page.clock.setSystemTime(new Date(TOMORROW));
    await page.reload();
    await expect(nextLink(page).locator('.next-label')).toHaveText('Check usage for M3');
  });

  test('the kept Mission 1 never turns Next into Clean up', async ({ page }) => {
    await seed(page, [...GATE, ['2026-10-20T06:00:00.000Z', step('mission-01', 'start')]], {
      [KV_KEYS.plan]: plan(),
    });
    await page.clock.fastForward('04:00:00');
    await expect(nextLink(page)).toBeVisible();
    await expect(nextLink(page)).not.toContainText('Clean up');
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm typecheck 2>&1 | grep -c 'error TS'
pnpm test tests/unit/next.test.ts tests/unit/home.test.ts 2>&1 | grep -E '×|Tests '
```

Expected: a count above 0, from `tests/unit/next.test.ts` (`safety` is not a field of `NextInput`) and `tests/unit/home.test.ts` (the `cleanup` and `usage` kinds); Vitest, which does not type-check, fails `turns a live mission past its 2 hours into Clean up, ahead of reviews and behind Resume` (Next gives `review`), `asks for the usage check from the day after cleanup until it is done`, `gives Clean up about 10 minutes and the usage check about 5` and `sends mission cleanup and the usage check to the mission page`.

- [ ] **Step 3: Put mission safety into the engine's Next**

In `src/engine/next.ts`:
- add `import type { MissionSafety } from './missions.ts';` right before `import { mockHistory, nextForm } from './mock.ts';`, where Biome's import order puts it;
- replace the doc line ` * Mission safety waits for missions (Phase 6).` with ` * Mission safety (a live mission past its time limit, then the next-day usage check) comes right after Resume.`;
- in `NextInput`, add after `tz: number;`:

```ts
  /** The mission cleanup or usage check that is due, from `missionSafety` (spec 5.3 rules 10 and 11). */
  safety: MissionSafety | null;
```

- in `NextAction`, add after `| { kind: 'resume'; session: SessionState; left: number }`:

```ts
  | { kind: 'cleanup'; mission: string; n: number }
  | { kind: 'usage'; mission: string; n: number }
```

- in `nextAction`, add `if (input.safety) return { ...input.safety };` right after `if (resume) return { kind: 'resume', ...resume };`;
- right before the doc comment `/** The time estimate in whole minutes: 30 seconds per review or check item, a lesson's own minutes. */`, add:

```ts
/** About 10 minutes to delete a mission's resources by name and sweep Tag Editor, 5 to read Cost Explorer. */
export const CLEANUP_MINUTES = 10;
export const USAGE_MINUTES = 5;
```

- in `nextMinutes`, add after the `resume` case:

```ts
    case 'cleanup':
      return CLEANUP_MINUTES;
    case 'usage':
      return USAGE_MINUTES;
```

- [ ] **Step 4: Label it on Home and feed it from the mission state**

In `src/app/home.ts`, in `nextLabel`, add these cases right before `case 'review':`:

```ts
    case 'cleanup':
      return {
        label: `Clean up M${action.n}`,
        href: toHash({ kind: 'mission', id: action.mission }),
        minutes,
      };
    case 'usage':
      return {
        label: `Check usage for M${action.n}`,
        href: toHash({ kind: 'mission', id: action.mission }),
        minutes,
      };
```

In `src/app/memory.ts`, add `import { missionSafety } from '../engine/missions.ts';` right before the import from `'../engine/mock.ts'` (Biome sorts `missions.ts` before `mock.ts`), add `import { statuses } from './missions.ts';` right after the import from `'./home.ts'`, and in `nextUp` add the last field of the `nextAction` argument, right after `tz: tzOffset(at),`:

```ts
    safety: missionSafety(statuses.value, studyDay(at)),
```

- [ ] **Step 5: Run the tests, the checks and the build**

```bash
pnpm test tests/unit/next.test.ts tests/unit/home.test.ts tests/unit/next-ready.test.ts tests/unit/watch-ranks.test.ts 2>&1 | grep -E 'Test Files|Tests '
pnpm typecheck
pnpm lint
pnpm build 2>&1 | grep -o 'initial JS [0-9.]* KB of 50.0 KB\|budget breach.*'
E2E_PORT=4327 pnpm exec playwright test tests/e2e/missions.spec.ts 2>&1 | tail -3
```

Expected: `Test Files  4 passed (4)` with no failed test; `tsc --noEmit` prints nothing; `No fixes applied.`; `initial JS 49.7 KB of 50.0 KB` on the prototype (report the measured number and headroom); `24 passed` for `missions.spec.ts`.

- [ ] **Step 6: Commit on the branch**

```bash
pnpm lint:fix
git add src/engine/next.ts src/app/home.ts src/app/memory.ts tests/unit/next.test.ts tests/unit/home.test.ts tests/e2e/missions.spec.ts
git commit -m "Put mission cleanup and the usage check into Next" -m "A mission past its time limit turns Next into Clean up, and the day after cleanup Next asks for the usage check; the kept Mission 1 never asks for cleanup."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds; the controller then merges `missions-app` (Tasks 13, 14 and 15) into `master` with the subject `Merge Phase 6 Tasks 13 to 15: Missions 2 to 8, the mission flow and mission safety in Next`.

## Task 16: The Already done action

**Files:**
- Create: `src/app/already-done.ts`, `src/app/screens/AlreadyDone.tsx`, `tests/unit/already-done.test.ts`, `tests/unit/record-at.test.ts`, `tests/e2e/already-done.spec.ts`
- Modify: `src/app/progress.ts` (`recordAt`), `src/app/screens/MissionsPage.tsx` (the panel), `src/ui/base.css` (under `/* Missions: flow */` only)
- Test: `tests/unit/already-done.test.ts`, `tests/unit/record-at.test.ts`, `tests/e2e/already-done.spec.ts`

**Depends on:** Tasks 10 and 14 (and Task 15, since it runs after it in `missions-app`); Phase 4 Task 17 (the last Phase 4 edit of `src/app/progress.ts`).
It uses `GATE_MISSION`, `PlanRecord` and `planServices` from Task 9, `KV_KEYS.plan` from Task 10, and `PlanFields`, `PlanDraft`, `planDraftOf`, `planProblems`, `planRecordOf` and `missionRefs` from Task 14.

**Covers:** P6-132, P6-133, P6-134, P6-135, P6-163.

Design notes:
- The panel shows while the log has no `mission` event at all, which survives a backup round trip with no kv flag, and disappears for good once it records (or once Dani presses any mission button).
- It asks for the Mission 0 finish date, optionally Mission 1 with its Verify date, its usage check date and the credits left that day, and the plan status, because without the plan record plan fit would lock every later mission (spec 5.3 rule 2).
- Each event is dated 12:00 local on its day, inside its study day whatever the 04:00 boundary; with no usage date, Mission 1 stays `Verified` and Next asks `Check usage for M1` from the next study day.
- `recordAt` sorts the items stably by date and takes ids from a fresh `monotonicUlid()` at those dates, because the shared `ulid` clamps an earlier time to the last one it saw and would sort a back-dated event after today's; Mission 1 may have been done before Mission 0, so the form never forces an order.
- `MissionsPage` is already a lazy chunk (Task 14), so the panel is a plain import of it and adds nothing to the initial bundle; only `recordAt` joins `progress.ts`.
- The plan problems come from `planProblems` (Task 14), so the two forms say the same thing.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/record-at.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import type { NewEvent } from '../../schemas/events.ts';
import { events, recordAt } from '../../src/app/progress.ts';

const step = (mission: string, s: 'start' | 'verified' | 'usage-ok'): NewEvent => ({
  t: 'mission',
  mission,
  step: s,
});
/** Local dates, so the study day reads the same in every zone the tests run in. */
const local = (day: number, hour: number, minute = 0): Date => new Date(2026, 9, day, hour, minute);

afterEach(() => {
  events.value = [];
});

describe('recordAt (spec 8.1 Already done)', () => {
  it('stamps each event with its own date and study day, and ids that sort by date', async () => {
    const added = await recordAt([
      [step('mission-01', 'start'), local(15, 12)],
      [step('mission-00', 'start'), local(12, 12)],
      [step('mission-00', 'verified'), local(12, 12)],
      [step('mission-01', 'usage-ok'), local(16, 3, 30)],
    ]);
    expect(added.map((e) => (e.t === 'mission' ? `${e.mission} ${e.step}` : e.t))).toEqual([
      'mission-00 start',
      'mission-00 verified',
      'mission-01 start',
      'mission-01 usage-ok',
    ]);
    expect(added.map((e) => e.day)).toEqual(['2026-10-12', '2026-10-12', '2026-10-15', '2026-10-15']);
    expect(added.map((e) => e.at)).toEqual([
      local(12, 12).toISOString(),
      local(12, 12).toISOString(),
      local(15, 12).toISOString(),
      local(16, 3, 30).toISOString(),
    ]);
    const ids = added.map((e) => e.id);
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(4);
    expect(events.value).toEqual(added);
  });

  it('never clamps a later call to the time of an earlier one, so its earlier date sorts first', async () => {
    const [later] = await recordAt([[step('mission-03', 'start'), local(20, 9)]]);
    const [earlier] = await recordAt([[step('mission-00', 'start'), local(12, 12)]]);
    expect((earlier?.id ?? '') < (later?.id ?? '')).toBe(true);
  });
});
```

Create `tests/unit/already-done.test.ts`:

```ts
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
```

Create `tests/e2e/already-done.spec.ts`:

```ts
import { expect, type Page, test } from '@playwright/test';
import { expectNoAxeViolations, expectNoSidewaysScroll, failOnPageProblems, h1 } from './helpers.ts';

/** 2026-10-20 at 09:00 UTC, a week after the missions Dani did by hand. */
const NOW = '2026-10-20T09:00:00.000Z';

const panel = (page: Page) => page.getByRole('region', { name: 'Done some missions already?' });
const row = (page: Page, n: number) =>
  page.locator(`main a.row[href="#/missions/mission-${String(n).padStart(2, '0')}"]`);

failOnPageProblems();
// UTC keeps the study day and the 04:00 boundary the same on every machine.
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(NOW) });
  await page.goto('/#/missions');
  await expect(h1(page, 'Missions')).toBeVisible();
});

test('Already done names what is missing or wrong, and records nothing until it is right', async ({
  page,
}) => {
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  const alert = panel(page).getByRole('alert');
  await expect(alert).toContainText('Enter the date you finished Mission 0.');
  await expect(alert).toContainText('Enter the credits you have left.');
  await panel(page).getByLabel('Mission 0 finished on').fill('2026-10-21');
  await panel(page).getByLabel('Mission 1 is done too').check();
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  await expect(alert).toContainText('Enter the day you verified Mission 1.');
  await expect(alert).toContainText('Dates cannot be in the future.');
  await panel(page).getByLabel('Mission 1 verified on').fill('2026-10-13');
  await panel(page).getByLabel('Mission 1 usage checked on').fill('2026-10-13');
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  await expect(alert).toContainText('The usage check comes after the day you verified Mission 1.');
  await expect(row(page, 0).locator('.row-meta')).toHaveText('Ready');
});

test('Already done records both missions on their days with the plan, once', async ({ page }) => {
  await expect(panel(page)).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await panel(page).getByLabel('Mission 0 finished on').fill('2026-10-12');
  await panel(page).getByLabel('Mission 1 is done too').check();
  await panel(page).getByLabel('Mission 1 verified on').fill('2026-10-13');
  await panel(page).getByLabel('Mission 1 usage checked on').fill('2026-10-14');
  await panel(page).getByLabel('Credits left that day ($)').fill('119.5');
  await panel(page).getByLabel('Credits left ($)', { exact: true }).fill('119');
  await panel(page).getByLabel('Plan ends on').fill('2027-04-10');
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  const services = panel(page).getByRole('group', { name: 'Services on your plan' });
  const boxes = services.getByRole('checkbox');
  for (let i = 0; i < (await boxes.count()); i++) await boxes.nth(i).check();
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(row(page, 0).locator('.row-meta')).toHaveText('Closed');
  await expect(row(page, 1).locator('.row-meta')).toHaveText('Closed');
  await expect(row(page, 2).locator('.row-meta')).toHaveText('Ready');
  await page.reload();
  await expect(row(page, 2).locator('.row-meta')).toHaveText('Ready');
  await expect(panel(page)).toHaveCount(0);
  await row(page, 0).click();
  await expect(page.getByText('Closed on Mon 12 Oct.')).toBeVisible();
  await page.goto('/#/missions/mission-01');
  await expect(page.getByText('Closed on Wed 14 Oct.')).toBeVisible();
});

test('Already done without a usage date leaves Mission 1 verified, and Next asks for its usage check', async ({
  page,
}) => {
  await panel(page).getByLabel('Mission 0 finished on').fill('2026-10-12');
  await panel(page).getByLabel('Mission 1 is done too').check();
  await panel(page).getByLabel('Mission 1 verified on').fill('2026-10-13');
  await panel(page).getByLabel('Credits left ($)', { exact: true }).fill('120');
  await panel(page).getByLabel('Plan ends on').fill('2027-04-10');
  await panel(page).getByRole('button', { name: 'Record them' }).click();
  await expect(row(page, 1).locator('.row-meta')).toHaveText('Verified');
  await expect(row(page, 2).locator('.row-meta')).toHaveText('Not on your plan');
  await page.goto('/');
  await expect(page.locator('a.next[data-next] .next-label')).toHaveText('Check usage for M1');
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/record-at.test.ts tests/unit/already-done.test.ts 2>&1 | grep -E 'FAIL|Error|Tests '
```

Expected: both files fail: `record-at.test.ts` with `TypeError: recordAt is not a function` and `already-done.test.ts` with `Error: Cannot find module '../../src/app/already-done.ts'`.

```bash
pnpm build >/dev/null 2>&1 && E2E_PORT=4327 pnpm exec playwright test tests/e2e/already-done.spec.ts --project chromium-desktop 2>&1 | grep -E '[0-9]+ (passed|failed)'
```

Expected: `3 failed`, because the Missions list has no Already done panel yet.

- [ ] **Step 3: Record events at their own dates**

In `src/app/progress.ts`, replace `import { ulid } from '../store/ulid.ts';` with `import { monotonicUlid, ulid } from '../store/ulid.ts';` and add this function right before the doc comment `/** Sets one kv value, stamped with `now`. */`:

```ts
/**
 * Records events that happened earlier, each at its own date (the Already done action, spec 8.1): it sorts them by
 * date first, keeping the given order for equal dates, and takes their ids from a fresh ULID generator at those dates,
 * so they sort into the log by date whatever order they came in; they reach IndexedDB in one transaction.
 */
export async function recordAt(items: readonly (readonly [NewEvent, Date])[]): Promise<StudyEvent[]> {
  const next = monotonicUlid();
  const added = [...items]
    .sort((a, b) => a[1].getTime() - b[1].getTime())
    .map(
      ([e, date]) =>
        ({
          ...e,
          id: next(date.getTime()),
          at: date.toISOString(),
          tz: tzOffset(date),
          day: studyDay(date),
        }) as StudyEvent,
    );
  show(added);
  if (db !== null) {
    try {
      await putEvents(db, added);
    } catch {
      failed();
    }
  }
  return added;
}
```

- [ ] **Step 4: Add the Already done helpers and panel**

Create `src/app/already-done.ts`:

```ts
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
```

Create `src/app/screens/AlreadyDone.tsx`:

```tsx
/** The one-time Already done panel on the Missions list (spec 8.1), shown while the log has no mission event. */
import { useState } from 'preact/hooks';
import { studyDay } from '../../engine/day.ts';
import { planServices } from '../../engine/missions.ts';
import { KV_KEYS } from '../../store/kv.ts';
import { type AlreadyDoneForm, alreadyDoneEvents, alreadyDoneProblems } from '../already-done.ts';
import { type PlanDraft, planDraftOf, planProblems, planRecordOf } from '../mission-copy.ts';
import { missionRefs } from '../missions.ts';
import { recordAt, writeKv } from '../progress.ts';
import { PlanFields } from './MissionFlow.tsx';

/** One labelled date field. */
function DateField({
  label,
  value,
  onInput,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
}) {
  return (
    <label class="date-field">
      {label}
      <input type="date" value={value} onInput={(event) => onInput(event.currentTarget.value)} />
    </label>
  );
}

export function AlreadyDone() {
  const [mission0, setMission0] = useState('');
  const [mission1, setMission1] = useState(false);
  const [verified1, setVerified1] = useState('');
  const [usage1, setUsage1] = useState('');
  const [credits1, setCredits1] = useState('');
  const [plan, setPlan] = useState<PlanDraft>(() => planDraftOf(null, planServices(missionRefs.peek())));
  const [problems, setProblems] = useState<string[]>([]);
  return (
    <section class="already-done" aria-labelledby="already-done-title">
      <h2 id="already-done-title">Done some missions already?</h2>
      <p class="muted mission-line">
        Record the missions you finished by hand before this page could track them; this shows only once.
      </p>
      <form
        class="plan-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const at = new Date();
          const form: AlreadyDoneForm = {
            mission0,
            mission1,
            verified1,
            usage1,
            credits1,
            plan: planRecordOf(plan, at),
          };
          const found = [...alreadyDoneProblems(form, studyDay(at)), ...planProblems(plan)];
          setProblems(found);
          if (found.length > 0) return;
          void writeKv(KV_KEYS.plan, form.plan, at);
          void recordAt(alreadyDoneEvents(form));
        }}
      >
        <DateField label="Mission 0 finished on" value={mission0} onInput={setMission0} />
        <label class="mission-tick">
          <input
            type="checkbox"
            checked={mission1}
            onChange={(event) => setMission1(event.currentTarget.checked)}
          />
          Mission 1 is done too
        </label>
        {mission1 && (
          <div class="plan-row">
            <DateField label="Mission 1 verified on" value={verified1} onInput={setVerified1} />
            <DateField label="Mission 1 usage checked on" value={usage1} onInput={setUsage1} />
            <label class="date-field">
              Credits left that day ($)
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={credits1}
                onInput={(event) => setCredits1(event.currentTarget.value)}
              />
            </label>
          </div>
        )}
        <PlanFields draft={plan} onChange={setPlan} />
        {problems.length > 0 && (
          <ul class="mission-problem" role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        <button class="button" type="submit">
          Record them
        </button>
      </form>
    </section>
  );
}
```

In `src/app/screens/MissionsPage.tsx`, replace `import { storeReady } from '../progress.ts';` with:

```tsx
import { events, storeReady } from '../progress.ts';
import { AlreadyDone } from './AlreadyDone.tsx';
```

and add the panel right after the lede:

```tsx
      <p class="muted lede">{listLede(statuses.value)}</p>
      {ready && !events.value.some((e) => e.t === 'mission') && <AlreadyDone />}
```

In `src/ui/base.css`, under `/* Missions: flow */`, add right before the rule `.mission-problem {`:

```css
/* The one-time Already done panel sits on its own pane above the list. */
.already-done {
  margin: 0 0 24px;
  padding: 12px 16px 16px;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.already-done h2 {
  margin: 0 0 4px;
}
```

- [ ] **Step 5: Run the tests, the checks and the build**

```bash
pnpm test tests/unit/record-at.test.ts tests/unit/already-done.test.ts tests/unit/missions-app.test.ts 2>&1 | grep -E 'Test Files|Tests '
pnpm typecheck
pnpm lint
pnpm build 2>&1 | grep -o 'initial JS [0-9.]* KB of 50.0 KB\|budget breach.*'
E2E_PORT=4327 pnpm exec playwright test tests/e2e/already-done.spec.ts tests/e2e/missions.spec.ts 2>&1 | tail -3
```

Expected: `Test Files  3 passed (3)` and `Tests  21 passed (21)`; `tsc --noEmit` prints nothing; `No fixes applied.`; `initial JS 49.7 KB of 50.0 KB` on the prototype (report the measured number and headroom); `30 passed` (three Already done tests and twelve mission tests, in both projects).

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix
git add src/app/progress.ts src/app/already-done.ts src/app/screens/AlreadyDone.tsx src/app/screens/MissionsPage.tsx src/ui/base.css tests/unit/already-done.test.ts tests/unit/record-at.test.ts tests/e2e/already-done.spec.ts
git commit -m "Add the one-time Already done action for Missions 0 and 1" -m "Missions done by hand are recorded once with the dates Dani enters, together with the plan status, so the gate and plan fit reflect them."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds; Task 16 is done on the branch by Monday, November 2 and merges to `master` on its own right after Tasks 13 to 15 land on Tuesday, November 3.

---

## Task 17: The capstone screen, drift and export

**Depends on:** Phase 6 Tasks 8 (`schemas/project-view.ts`, `src/engine/capstone.ts`, `src/engine/plan.ts`), 10 (`adrKey` in `src/store/kv.ts`, `src/app/adr-draft.ts`, the `/* Capstone */` anchor in `src/ui/base.css`) and 11 (`ContentIndex.project`); no Phase 4 task, because `src/app/content.ts`, `src/app/screens/Progress.tsx` and `src/app/progress-lines.ts` are files Phase 4 never edits.

**Covers:** P6-067 (screen), P6-071, P6-072, P6-073, P6-076, P6-077, P6-078, P6-079, P6-082, P6-088, P6-091, P6-139, P6-140 (capstone), P6-149, P6-150, P6-151.

**Files:**
- Create: `src/app/project.ts`, `src/app/download.ts`, `src/app/screens/Project.tsx`, `tests/unit/project-app.test.ts`
- Modify: `src/app/content.ts`, `src/app/screens/Progress.tsx`, `src/app/progress-lines.ts`, `src/ui/base.css` (under `/* Capstone */` only), `tests/unit/progress-lines.test.ts`
- Test: `tests/unit/project-app.test.ts`, `tests/unit/progress-lines.test.ts`

Design notes:
- The screen is `export function Project({ idx, module }: { idx: ContentIndex; module: number | null })`: `module === null` is `#/project` (the brief, 13 cards, the rubric and Export), a number is `#/project/NN` (the editor of one decision); Task 18 registers it as a lazy screen and adds both routes, so until then nothing imports it and the initial bundle does not change.
- A decision's stage is `decisionStage({ lessonsRead, today, examDate, record })` from Task 8, with `lessonsRead = bosses.value.get(n)?.unlocked === true` (read only, so `src/app/memory.ts` is not edited), `today = studyDay(now.value)`, `examDate = memory.value?.examDate ?? TARGET_EXAM_DATE` and `record = decisionsOf(events.value).get(n)`.
- The waiting line formats `openDay(examDate)` with `examDateLabel`, so the booked exam gives `Opens after your exam, on Sun 15 Nov.` and a moved exam moves it.
- `cardLine` takes `draft: boolean` beside the brief's `module`, `open`, `self` and `final`, because `Draft saved` and `Not started` differ only in whether `adr-NN` holds a draft; the brief's signature cannot tell them apart, so this task adds the field.
- The editor keeps two copies of the six texts: what Dani typed, with citations as `[[Display Name]]`, in component state, and the draft with `[[concept-id]]` from `toStored`, which is what kv stores; the textareas never show a value rewritten by the mapping, so the caret never jumps while he types.
- A draft opens from `adrDraftOf(kvRecords.value[adrKey(n)]?.value)`, else `emptyAdrDraft(decision.context)`, which prefills Context from the brief; the draft is written with `writeKv(adrKey(n), draft)` 500 ms after the last change (`DRAFT_SAVE_MS`), and the pending write is flushed when the editor unmounts and before each grade is recorded.
- Engine helpers get `textOf(draft)`, the six texts alone, so a helper that walks its argument never meets the draft's `v` or `ticks`.
- Typing `[[` in Why opens a listbox of at most 8 concept names from `suggestions`; ArrowDown and ArrowUp move, Enter picks, Escape closes, and a mouse pick uses `mousedown` with `preventDefault`, so the textarea keeps focus.
- The list follows the palette's pattern (`div` with `role="listbox"`, `div` options with `tabIndex={-1}`), because Biome rejects interactive roles on `ul` and `li`; the textarea takes `aria-autocomplete="list"`, and `aria-controls` and `aria-activedescendant` only while the list is open, since a textarea may not take the combobox role.
- A pick sets the textarea's value and caret at once, not in a later frame: in the prototype a caret set in `requestAnimationFrame` raced the next keystrokes in WebKit and put `, ` after the following words, and Task 18's end-to-end test types straight after each pick to pin it.
- The citation lines sit in a polite live region under Why and count `citationsOf(draft.why, concepts)`, so they match `canSelfGrade`, which needs at least 2 valid citations in Why (spec 6: Why holds at least 2 concept citations).
- Grading uses four fieldsets of four radios each, reusing the runner's `.options`, `.option`, `.option-n` and `.option-text` styles, with `.chosen` on the picked level so the choice shows by the radio and a bar, never by colour alone; the save button stays disabled until every criterion has a level.
- `Save self-grade` shows only at the `open` stage and only when `canSelfGrade` holds (otherwise the gate line shows in its place); `Save final grade` shows only at the `self` stage, prefilled with the self scores; the `done` stage shows no grade form, so the UI never offers a second self or final grade.
- The reveal is an inline panel (no dialog, spec 7.1) that appears only from the `self` stage on: each live key point shows its text, a `Concepts: <names>` line, its evidence line as a quote and `Read in notes`, which sets `highlight` to the quote and follows the key point's lesson route, as the runner's `Read in notes` does.
- `KeyPointView.concepts` holds concept ids (Task 11 copies them from the key point files), and the reveal maps them to display names and drops any id the index no longer holds, so a raw id never shows (spec 2.8).
- Ticks live in the draft until the final grade, which records `liveTicks(decision, draft.ticks)`; tick ids the chunk does not hold stay in the draft and are skipped by the reveal, and at the `done` stage the ticks come from the final record and show as disabled checkboxes.
- After the self-grade, focus moves to the `Reference key points` heading; after the final grade, to the status line; a polite live region says `Self-grade saved: 7 of 12.` or `Final grade saved: 9 of 12. Drift +2.` (spec 7.5).
- Export builds the text with Task 8's `planMarkdown` from the chunk, every stored draft, `decisionsOf(events.value)` and the registry, and saves it as `PLAN_FILE` through the new `downloadText`, which the backup export now uses too.
- `ensureProject()` mirrors `ensureExamForm`: one fetch at a time, the chunk kept in the `project` signal, null for a build without a brief or a failed fetch (which a later call retries), and never `loadError`; the screen shows the lazy screen's `LAZY_ERROR` line when the fetch fails.
- A build without `content/project/brief.yaml` has `index.project === null`, and the screen then says `The capstone brief is not in this build yet.`
- Progress gains a `Capstone` heading and the drift line from `driftLine(driftOf(decisionsOf(events.value)))`; `signed` lives in `src/app/project.ts`, and `src/app/progress-lines.ts` imports it, which is safe for the bundle because only the lazy Progress chunk imports `progress-lines.ts`.
- New copy beyond the brief, pinned by the tests: `PROJECT_HEADINGS` (`The brief`, `Decisions`, `Rubric`, `Self-grade`, `Final grade`), `NO_PROJECT`, and `passLine(8)` (`A decision passes at 8 of 12 or more, with no criterion at 0.`).
- The rubric on `#/project` is a list per criterion rather than a table, so the 375 px layout never scrolls sideways.
- Names this task relies on from Phase 6 Task 8: `ADR_FIELDS`, `ADR_HEADINGS`, `AdrField`, `AdrText`, `DecisionView`, `ProjectChunk`, `RubricView`, `ConceptName`, `Scores`, `DecisionRecord`, `DecisionStage`, `decisionStage`, `decisionsOf`, `driftOf`, `openDay`, `scoreTotal`, `citationsOf`, `toStored`, `toShown`, `canSelfGrade`, `PLAN_FILE`, `planMarkdown`; from Task 10: `adrKey`, `AdrDraft`, `adrDraftOf`, `emptyAdrDraft`; from Task 11: `ContentIndex.project`.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/project-app.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ConceptMeta } from '../../schemas/chunks.ts';
import type { DecisionView } from '../../schemas/project-view.ts';
import {
  cardLine,
  citationLine,
  conceptNames,
  decisionHref,
  EXPORT_PLAN,
  GRADE_GATE,
  gradeAnnouncement,
  insertCitation,
  liveTicks,
  NO_PROJECT,
  openCitation,
  PROJECT_HEADINGS,
  PROJECT_LEDE,
  passLine,
  READ_IN_NOTES,
  REVEAL_HEADING,
  revealRows,
  SAVE_FINAL,
  SAVE_SELF,
  SUGGESTION_LIMIT,
  signed,
  suggestions,
  TICK_LABEL,
  tickKeyPoint,
} from '../../src/app/project.ts';

/** Made-up bakery concepts, in the shape of the content index. */
const concept = (id: string, name: string, aliases: string[] = []): ConceptMeta => ({
  id,
  name,
  home: 'm01/what-a-bakery-cloud-is',
  anchor: 'ovens',
  tested: true,
  tasks: ['1.1'],
  confusableWith: [],
  aliases,
  splitFrom: null,
});
const CONCEPTS = conceptNames([
  concept('hired-oven', 'Hired oven', ['rented-oven']),
  concept('oven-timer', 'Oven timer'),
  concept('shared-kitchen', 'Shared kitchen'),
  concept('per-minute-rental', 'Per-minute rental'),
  concept('dough-proofing', 'Dough proofing'),
  concept('flour-store', 'Flour store'),
  concept('jam-shelf', 'Jam shelf'),
  concept('bread-van', 'Bread van'),
  concept('cake-stand', 'Cake stand'),
  concept('apron-rack', 'Apron rack'),
]);

const DECISION: DecisionView = {
  module: 3,
  title: 'Ovens for the morning rush',
  prompt: 'Choose how the bakery runs its ovens.',
  context: ['The bakery bakes for twelve shops.'],
  keyPoints: [
    {
      id: 'kp-03-hire-ovens',
      text: 'Hire ovens by the minute for the morning rush.',
      concepts: ['hired-oven', 'per-minute-rental'],
      read: { route: '#/m/01/l/what-a-bakery-cloud-is/ovens', text: 'A hired oven is paid by the minute.' },
    },
    {
      id: 'kp-03-share-kitchen',
      text: 'Share one kitchen between the shops.',
      concepts: ['shared-kitchen', 'gone-concept'],
      read: { route: '#/m/01/l/what-a-bakery-cloud-is/kitchen', text: 'One kitchen serves every shop.' },
    },
  ],
};
const NAMES = new Map(CONCEPTS.map((c) => [c.id, c.name] as const));

describe('capstone copy', () => {
  it('pins the fixed lines word for word', () => {
    expect(PROJECT_LEDE).toBe(
      'Thirteen decisions, one per module, each a short ADR graded against the rubric.',
    );
    expect(GRADE_GATE).toBe('Fill in every heading and cite at least 2 concepts before you grade.');
    expect([SAVE_SELF, SAVE_FINAL, EXPORT_PLAN]).toEqual([
      'Save self-grade',
      'Save final grade',
      'Export the plan',
    ]);
    expect([REVEAL_HEADING, TICK_LABEL, READ_IN_NOTES]).toEqual([
      'Reference key points',
      'I covered this',
      'Read in notes',
    ]);
    expect(PROJECT_HEADINGS).toEqual({
      brief: 'The brief',
      decisions: 'Decisions',
      rubric: 'Rubric',
      self: 'Self-grade',
      final: 'Final grade',
    });
    expect(NO_PROJECT).toBe('The capstone brief is not in this build yet.');
    expect(passLine(8)).toBe('A decision passes at 8 of 12 or more, with no criterion at 0.');
    expect(decisionHref(3)).toBe('#/project/03');
    expect(decisionHref(13)).toBe('#/project/13');
  });

  it('writes a card line for every stage', () => {
    const base = { module: 3, open: 'Sun 15 Nov', draft: false, self: null, final: null };
    expect(cardLine('locked', base)).toBe('Opens after you read every lesson of Module 3.');
    expect(cardLine('waiting', base)).toBe('Opens after your exam, on Sun 15 Nov.');
    expect(cardLine('open', base)).toBe('Not started');
    expect(cardLine('open', { ...base, draft: true })).toBe('Draft saved');
    expect(cardLine('self', { ...base, draft: true, self: 7 })).toBe(
      'Self-graded 7/12; reveal the key points',
    );
    expect(cardLine('done', { ...base, self: 7, final: 9 })).toBe('Final 9/12, drift +2');
    expect(cardLine('done', { ...base, self: 9, final: 7 })).toBe('Final 7/12, drift -2');
    expect(cardLine('done', { ...base, self: 8, final: 8 })).toBe('Final 8/12, drift 0');
  });

  it('signs a drift with a plain hyphen for minus', () => {
    expect([signed(2), signed(0), signed(-3)]).toEqual(['+2', '0', '-3']);
  });

  it('counts citations and names every unknown token as typed', () => {
    expect(citationLine({ ids: [], unknown: [] })).toEqual([
      'Cite at least 2 concepts, as [[Concept name]].',
    ]);
    expect(citationLine({ ids: ['hired-oven'], unknown: [] })).toEqual(['1 concept cited; cite at least 2.']);
    expect(citationLine({ ids: ['hired-oven', 'oven-timer'], unknown: ['Bread oven'] })).toEqual([
      '2 concepts cited.',
      'Not a concept: Bread oven.',
    ]);
    expect(citationLine({ ids: ['a', 'b', 'c'], unknown: ['x', 'y'] })).toEqual([
      '3 concepts cited.',
      'Not a concept: x.',
      'Not a concept: y.',
    ]);
  });

  it('announces each saved grade', () => {
    expect(gradeAnnouncement('self', 7, null)).toBe('Self-grade saved: 7 of 12.');
    expect(gradeAnnouncement('final', 9, 2)).toBe('Final grade saved: 9 of 12. Drift +2.');
    expect(gradeAnnouncement('final', 6, -1)).toBe('Final grade saved: 6 of 12. Drift -1.');
  });
});

describe('concept suggestions', () => {
  it('ranks title prefixes before word prefixes and caps the list at 8', () => {
    expect(suggestions('ov', CONCEPTS).map((c) => c.name)).toEqual(['Oven timer', 'Hired oven']);
    expect(suggestions('tim', CONCEPTS).map((c) => c.name)).toEqual(['Oven timer']);
    const ovens = conceptNames(Array.from({ length: 10 }, (_, i) => concept(`oven-${i}`, `Oven ${i}`)));
    expect(suggestions('oven', ovens)).toHaveLength(SUGGESTION_LIMIT);
    expect(SUGGESTION_LIMIT).toBe(8);
  });

  it('finds a concept by an alias it keeps from a rename', () => {
    expect(suggestions('rented', CONCEPTS).map((c) => c.id)).toEqual(['hired-oven']);
  });

  it('lists the first 8 names alphabetically for an empty query', () => {
    expect(suggestions('', CONCEPTS).map((c) => c.name)).toEqual([
      'Apron rack',
      'Bread van',
      'Cake stand',
      'Dough proofing',
      'Flour store',
      'Hired oven',
      'Jam shelf',
      'Oven timer',
    ]);
  });

  it('finds the open [[ before the caret and inserts the picked name', () => {
    const text = 'We pick [[ov because mornings peak.';
    const open = openCitation(text, 'We pick [[ov'.length);
    expect(open).toEqual({ start: 8, query: 'ov' });
    expect(openCitation('Done [[Oven timer]] here', 24)).toBeNull();
    expect(openCitation('No token here', 5)).toBeNull();
    expect(openCitation('[[a\nb', 5)).toBeNull();
    if (open === null) throw new Error('expected an open citation');
    expect(insertCitation(text, 'We pick [[ov'.length, open, 'Oven timer')).toEqual({
      text: 'We pick [[Oven timer]] because mornings peak.',
      caret: 'We pick [[Oven timer]]'.length,
    });
    expect(insertCitation('A [[ov]] b', 6, { start: 2, query: 'ov' }, 'Oven timer')).toEqual({
      text: 'A [[Oven timer]] b',
      caret: 16,
    });
  });
});

describe('the reveal', () => {
  it('shows each live key point with its concept names and its evidence quote, never a raw id', () => {
    expect(revealRows(DECISION, ['kp-03-share-kitchen'], NAMES)).toEqual([
      {
        id: 'kp-03-hire-ovens',
        text: 'Hire ovens by the minute for the morning rush.',
        concepts: 'Concepts: Hired oven, Per-minute rental',
        quote: 'A hired oven is paid by the minute.',
        route: '#/m/01/l/what-a-bakery-cloud-is/ovens',
        ticked: false,
      },
      {
        id: 'kp-03-share-kitchen',
        text: 'Share one kitchen between the shops.',
        concepts: 'Concepts: Shared kitchen',
        quote: 'One kitchen serves every shop.',
        route: '#/m/01/l/what-a-bakery-cloud-is/kitchen',
        ticked: true,
      },
    ]);
  });

  it('skips a ticked key point id it does not know without throwing, and keeps it in the draft', () => {
    const ticks = ['kp-03-retired', 'kp-03-hire-ovens'];
    expect(revealRows(DECISION, ticks, NAMES).map((r) => r.ticked)).toEqual([true, false]);
    expect(liveTicks(DECISION, ticks)).toEqual(['kp-03-hire-ovens']);
    expect(tickKeyPoint(ticks, 'kp-03-share-kitchen', true)).toEqual([
      'kp-03-retired',
      'kp-03-hire-ovens',
      'kp-03-share-kitchen',
    ]);
    expect(tickKeyPoint(ticks, 'kp-03-hire-ovens', false)).toEqual(['kp-03-retired']);
    expect(tickKeyPoint(ticks, 'kp-03-hire-ovens', true)).toEqual(ticks);
  });

  it('gives final ticks in key point order', () => {
    expect(liveTicks(DECISION, ['kp-03-share-kitchen', 'kp-03-hire-ovens'])).toEqual([
      'kp-03-hire-ovens',
      'kp-03-share-kitchen',
    ]);
  });
});
```

In `tests/unit/progress-lines.test.ts`, add `driftLine` to the import list from `../../src/app/progress-lines.ts`, right after `domainValue,`:

```ts
  domainValue,
  driftLine,
```

Then add this case at the end of the `describe('Progress lines', ...)` block, right before its closing `});`:

```ts
  it('writes the capstone drift line, final minus self', () => {
    expect(driftLine({ decisions: 0, total: 0 })).toBe('Capstone drift: no final grades yet.');
    expect(driftLine({ decisions: 3, total: 2 })).toBe(
      'Capstone drift: +2 over 3 decisions (final minus self).',
    );
    expect(driftLine({ decisions: 1, total: -1 })).toBe(
      'Capstone drift: -1 over 1 decision (final minus self).',
    );
    expect(driftLine({ decisions: 2, total: 0 })).toBe(
      'Capstone drift: 0 over 2 decisions (final minus self).',
    );
  });
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/project-app.test.ts tests/unit/progress-lines.test.ts 2>&1 | grep -E "FAIL|Error|Test Files|Tests "
```

Expected: `Test Files  2 failed (2)`, with `Error: Cannot find module '../../src/app/project.ts'` for `project-app.test.ts` and `TypeError: driftLine is not a function` for the new case of `progress-lines.test.ts`.

- [ ] **Step 3: Add the capstone copy and helpers, and the drift line**

Create `src/app/project.ts`:

```ts
/** Pure copy and helpers for the capstone screen (spec 6), so the tests run without a browser. */
import type { ConceptMeta, SearchEntry } from '../../schemas/chunks.ts';
import type { DecisionView } from '../../schemas/project-view.ts';
import type { ConceptName, DecisionStage } from '../engine/capstone.ts';
import { pad2 } from './router.ts';
import { normalize, rank } from './search.ts';

export const PROJECT_LEDE = 'Thirteen decisions, one per module, each a short ADR graded against the rubric.';
export const GRADE_GATE = 'Fill in every heading and cite at least 2 concepts before you grade.';
export const SAVE_SELF = 'Save self-grade';
export const SAVE_FINAL = 'Save final grade';
export const EXPORT_PLAN = 'Export the plan';
export const REVEAL_HEADING = 'Reference key points';
export const TICK_LABEL = 'I covered this';
export const READ_IN_NOTES = 'Read in notes';
/** Shown when the build has no `content/project/brief.yaml`, so the index names no project chunk. */
export const NO_PROJECT = 'The capstone brief is not in this build yet.';
export const PROJECT_HEADINGS = {
  brief: 'The brief',
  decisions: 'Decisions',
  rubric: 'Rubric',
  self: 'Self-grade',
  final: 'Final grade',
} as const;
/** The most concept names the `[[` list offers at once. */
export const SUGGESTION_LIMIT = 8;
/** How long the editor waits after the last keystroke before it writes the draft to kv. */
export const DRAFT_SAVE_MS = 500;

/** The pass rule under the rubric (spec 6: a total of 8 or more and no criterion at 0). */
export function passLine(passTotal: number): string {
  return `A decision passes at ${passTotal} of 12 or more, with no criterion at 0.`;
}

/** The editor of one decision; the router reads the same `#/project/NN` (Task 18). */
export function decisionHref(module: number): string {
  return `#/project/${pad2(module)}`;
}

/** The registry as the citation helpers read it: id, display name and the old ids that still resolve. */
export function conceptNames(concepts: readonly ConceptMeta[]): ConceptName[] {
  return concepts.map((c) => ({ id: c.id, name: c.name, aliases: c.aliases }));
}

/** A drift or score difference with its sign: `+2`, `0`, `-3`, with a plain hyphen for minus. */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

/** One decision card's status line; `open` is the opening day as `examDateLabel` writes it. */
export function cardLine(
  stage: DecisionStage,
  args: { module: number; open: string; draft: boolean; self: number | null; final: number | null },
): string {
  switch (stage) {
    case 'locked':
      return `Opens after you read every lesson of Module ${args.module}.`;
    case 'waiting':
      return `Opens after your exam, on ${args.open}.`;
    case 'open':
      return args.draft ? 'Draft saved' : 'Not started';
    case 'self':
      return `Self-graded ${args.self ?? 0}/12; reveal the key points`;
    case 'done': {
      const final = args.final ?? 0;
      return `Final ${final}/12, drift ${signed(final - (args.self ?? 0))}`;
    }
  }
}

/** The live lines under Why: the count of distinct concepts cited, then one line per token that names no concept. */
export function citationLine(c: { ids: readonly string[]; unknown: readonly string[] }): string[] {
  const n = c.ids.length;
  const head =
    n === 0
      ? 'Cite at least 2 concepts, as [[Concept name]].'
      : n === 1
        ? '1 concept cited; cite at least 2.'
        : `${n} concepts cited.`;
  return [head, ...c.unknown.map((token) => `Not a concept: ${token}.`)];
}

/** What the polite live region says once a grade is stored. */
export function gradeAnnouncement(stage: 'self' | 'final', total: number, drift: number | null): string {
  return stage === 'self'
    ? `Self-grade saved: ${total} of 12.`
    : `Final grade saved: ${total} of 12. Drift ${signed(drift ?? 0)}.`;
}

/**
 * The concept names the `[[` list offers, best first, at most `SUGGESTION_LIMIT`: each concept goes through the
 * palette's `rank` as a concept entry whose text holds its name and old ids; an empty query lists names alphabetically,
 * because `rank` returns only modules for it.
 */
export function suggestions(query: string, concepts: readonly ConceptName[]): ConceptName[] {
  if (normalize(query) === '') {
    return [...concepts].sort((a, b) => a.name.localeCompare(b.name)).slice(0, SUGGESTION_LIMIT);
  }
  const byId = new Map(concepts.map((c) => [c.id, c] as const));
  const entries: SearchEntry[] = concepts.map((c) => ({
    kind: 'concept',
    title: c.name,
    detail: '',
    route: c.id,
    text: normalize([c.name, ...c.aliases].join(' ')),
  }));
  const out: ConceptName[] = [];
  for (const entry of rank(entries, query)) {
    const c = byId.get(entry.route);
    if (c !== undefined) out.push(c);
    if (out.length === SUGGESTION_LIMIT) break;
  }
  return out;
}

/** A `[[` before the caret that no `]]`, `[` or line break has closed yet, and what was typed after it. */
export interface OpenCitation {
  start: number;
  query: string;
}

export function openCitation(text: string, caret: number): OpenCitation | null {
  const before = text.slice(0, caret);
  const start = before.lastIndexOf('[[');
  if (start === -1) return null;
  const query = before.slice(start + 2);
  return /[[\]\n]/.test(query) ? null : { start, query };
}

/** Replaces the open `[[query` (and a `]]` right after the caret) with `[[Name]]` and puts the caret after it. */
export function insertCitation(
  text: string,
  caret: number,
  open: OpenCitation,
  name: string,
): { text: string; caret: number } {
  const after = text.slice(caret);
  const token = `[[${name}]]`;
  return {
    text: text.slice(0, open.start) + token + (after.startsWith(']]') ? after.slice(2) : after),
    caret: open.start + token.length,
  };
}

/** One key point as the reveal shows it: display names only, the evidence line as a quote, and the tick. */
export interface RevealRow {
  id: string;
  text: string;
  /** `Concepts: <names>`, or '' when none of its concepts is in the registry any more. */
  concepts: string;
  quote: string;
  route: string;
  ticked: boolean;
}

/** The decision's live key points in order; ticks of ids the chunk does not hold are skipped, never shown or thrown on. */
export function revealRows(
  decision: DecisionView,
  ticks: readonly string[],
  names: ReadonlyMap<string, string>,
): RevealRow[] {
  return decision.keyPoints.map((kp) => {
    const shown = kp.concepts.flatMap((id) => {
      const name = names.get(id);
      return name === undefined ? [] : [name];
    });
    return {
      id: kp.id,
      text: kp.text,
      concepts: shown.length === 0 ? '' : `Concepts: ${shown.join(', ')}`,
      quote: kp.read.text,
      route: kp.read.route,
      ticked: ticks.includes(kp.id),
    };
  });
}

/** The ticked ids that are live key points of this decision, in key point order, for the `final` event. */
export function liveTicks(decision: DecisionView, ticks: readonly string[]): string[] {
  return decision.keyPoints.filter((kp) => ticks.includes(kp.id)).map((kp) => kp.id);
}

/** Ticks or unticks one key point; ids the chunk no longer holds stay in the draft. */
export function tickKeyPoint(ticks: readonly string[], id: string, on: boolean): string[] {
  if (on) return ticks.includes(id) ? [...ticks] : [...ticks, id];
  return ticks.filter((t) => t !== id);
}
```

In `src/app/progress-lines.ts`, import `signed` right after the `examDateLabel` import:

```ts
import { examDateLabel } from './home.ts';
import { signed } from './project.ts';
```

Then append at the end of the file:

```ts

/** The capstone drift of spec 6: final total minus self total, summed over the decisions with both grades. */
export function driftLine(d: { decisions: number; total: number }): string {
  if (d.decisions === 0) return 'Capstone drift: no final grades yet.';
  return `Capstone drift: ${signed(d.total)} over ${d.decisions === 1 ? '1 decision' : `${d.decisions} decisions`} (final minus self).`;
}
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
pnpm test tests/unit/project-app.test.ts tests/unit/progress-lines.test.ts 2>&1 | tail -3
```

Expected: `Test Files  2 passed (2)` and `Tests  23 passed (23)` (12 in `project-app.test.ts`, 11 in `progress-lines.test.ts`, counted at `master` 057efe5).

- [ ] **Step 5: Add the download helper, the project loader and the Progress drift line**

Create `src/app/download.ts`:

```ts
/** Hands the browser a text file to save, as the backup export and the capstone plan export do. */
export function downloadText(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
```

In `src/app/content.ts`, import the chunk type right after the `../../schemas/chunks.ts` import block:

```ts
import type { ProjectChunk } from '../../schemas/project-view.ts';
```

Add the signal right after the `examForms` signal:

```ts
/** The capstone brief and live key points, once the Project screen or a module page has asked for them. */
export const project = signal<ProjectChunk | null>(null);
```

Then append at the end of the file:

```ts

let projectLoad: Promise<ProjectChunk | null> | null = null;

/**
 * Loads the project chunk at most once (spec 6); only the Project screen and the module page's Capstone row ask for
 * it, so no other screen holds the key points before a self-grade. It resolves to null when the build has no brief or
 * the fetch fails, which a later call retries, and it never sets `loadError`.
 */
export function ensureProject(): Promise<ProjectChunk | null> {
  if (project.value !== null) return Promise.resolve(project.value);
  const name = index.value?.project ?? null;
  if (name === null) return Promise.resolve(null);
  if (projectLoad !== null) return projectLoad;
  const load = fetch(name)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<ProjectChunk>;
    })
    .then((chunk) => {
      project.value = chunk;
      return chunk;
    })
    .catch(() => null)
    .finally(() => {
      projectLoad = null;
    });
  projectLoad = load;
  return load;
}
```

In `src/app/screens/Progress.tsx`, add three imports, each in its sorted place:

```ts
import { decisionsOf, driftOf } from '../../engine/capstone.ts';
import { downloadText } from '../download.ts';
import { driftLine } from '../progress-lines.ts';
```

In `exportBackup`, replace the eight lines from `const url = URL.createObjectURL(` to `setTimeout(() => URL.revokeObjectURL(url), 0);` with:

```ts
  downloadText(backupFileName(now), JSON.stringify(backup), 'application/json');
```

Then, in `Progress()`, add the drift section right after `<MockHistory />`:

```tsx
        <MockHistory />
        <h3>Capstone</h3>
        <p class="muted drift-line">{driftLine(driftOf(decisionsOf(events.value)))}</p>
```

- [ ] **Step 6: Add the Project screen and its styles**

Create `src/app/screens/Project.tsx`:

```tsx
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import {
  ADR_FIELDS,
  ADR_HEADINGS,
  type AdrField,
  type AdrText,
  type DecisionView,
  type ProjectChunk,
  type RubricView,
} from '../../../schemas/project-view.ts';
import {
  type ConceptName,
  canSelfGrade,
  citationsOf,
  type DecisionRecord,
  type DecisionStage,
  decisionStage,
  decisionsOf,
  openDay,
  type Scores,
  scoreTotal,
  toShown,
  toStored,
} from '../../engine/capstone.ts';
import { studyDay } from '../../engine/day.ts';
import { PLAN_FILE, planMarkdown } from '../../engine/plan.ts';
import { adrKey } from '../../store/kv.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { type AdrDraft, adrDraftOf, emptyAdrDraft } from '../adr-draft.ts';
import { now } from '../clock.ts';
import { TARGET_EXAM_DATE } from '../config.ts';
import { ensureProject, project } from '../content.ts';
import { downloadText } from '../download.ts';
import { examDateLabel } from '../home.ts';
import { bosses, memory } from '../memory.ts';
import { events, kvRecords, record, storeReady, writeKv } from '../progress.ts';
import {
  cardLine,
  citationLine,
  conceptNames,
  DRAFT_SAVE_MS,
  decisionHref,
  EXPORT_PLAN,
  GRADE_GATE,
  gradeAnnouncement,
  insertCitation,
  liveTicks,
  NO_PROJECT,
  type OpenCitation,
  openCitation,
  PROJECT_HEADINGS,
  PROJECT_LEDE,
  passLine,
  READ_IN_NOTES,
  REVEAL_HEADING,
  revealRows,
  SAVE_FINAL,
  SAVE_SELF,
  suggestions,
  TICK_LABEL,
  tickKeyPoint,
} from '../project.ts';
import { highlight } from '../state.ts';
import { LAZY_ERROR } from './Lazy.tsx';
import { NotFound } from './NotFound.tsx';

const CAPSTONE_CRUMBS = [
  { label: 'Home', href: '#/' },
  { label: 'Capstone', href: '#/project' },
];

/** The study day after the exam (the stored exam date, else the target), as the card and the editor say it. */
const examDateNow = (): string => memory.value?.examDate ?? TARGET_EXAM_DATE;

const mapText = (text: AdrText, f: (value: string) => string): AdrText => ({
  context: f(text.context),
  options: f(text.options),
  decision: f(text.decision),
  why: f(text.why),
  tradeoffs: f(text.tradeoffs),
  cost: f(text.cost),
});

/** The six ADR texts alone, without a draft's `v` and ticks. */
const textOf = (draft: AdrText): AdrText => mapText(draft, (t) => t);

/** One decision's stage from the log, the lessons read, today and the exam date (spec 6 and 10.1). */
function stageOf(module: number, rec: DecisionRecord | undefined): DecisionStage {
  return decisionStage({
    lessonsRead: bosses.value.get(module)?.unlocked === true,
    today: studyDay(now.value),
    examDate: examDateNow(),
    record: rec,
  });
}

function storedDraft(module: number): AdrDraft | null {
  return adrDraftOf(kvRecords.value[adrKey(module)]?.value);
}

function lineFor(module: number, stage: DecisionStage, rec: DecisionRecord | undefined): string {
  return cardLine(stage, {
    module,
    open: examDateLabel(openDay(examDateNow())),
    draft: storedDraft(module) !== null,
    self: rec?.self ? scoreTotal(rec.self.scores) : null,
    final: rec?.final ? scoreTotal(rec.final.scores) : null,
  });
}

/**
 * The capstone (spec 6): `#/project` lists the brief, the 13 decision cards, the rubric and Export; `#/project/NN`
 * is the ADR editor of one decision with its self-grade, the key point reveal and the one final grade.
 */
export function Project({ idx, module }: { idx: ContentIndex; module: number | null }) {
  const [failed, setFailed] = useState(false);
  const chunk = project.value;
  const decision = module === null ? undefined : chunk?.decisions.find((d) => d.module === module);
  useTitle(
    module === null
      ? 'Capstone'
      : decision === undefined
        ? `Decision ${module}`
        : `Decision ${module}: ${decision.title}`,
  );
  useEffect(() => {
    if (idx.project === null) return;
    void ensureProject().then((loaded) => setFailed(loaded === null));
  }, [idx]);
  if (idx.project === null) {
    return (
      <>
        <Breadcrumbs items={CAPSTONE_CRUMBS} />
        <h1>Capstone</h1>
        <p class="muted">{NO_PROJECT}</p>
      </>
    );
  }
  if (chunk === null) return failed ? <p role="alert">{LAZY_ERROR}</p> : <p class="muted">Loading</p>;
  if (!storeReady.value) return <p class="muted">Loading</p>;
  if (module === null) return <Overview idx={idx} chunk={chunk} />;
  if (decision === undefined) return <NotFound hash={decisionHref(module)} />;
  return <Editor key={module} idx={idx} rubric={chunk.rubric} decision={decision} />;
}

/** `#/project`: the brief, every decision card with its status line, the rubric and the plan export. */
function Overview({ idx, chunk }: { idx: ContentIndex; chunk: ProjectChunk }) {
  const decisions = decisionsOf(events.value);
  const exportPlan = (): void => {
    const drafts = new Map<number, AdrText>();
    for (const d of chunk.decisions) {
      const draft = storedDraft(d.module);
      if (draft !== null) drafts.set(d.module, textOf(draft));
    }
    const text = planMarkdown({ project: chunk, drafts, decisions, concepts: conceptNames(idx.concepts) });
    downloadText(PLAN_FILE, text, 'text/markdown');
  };
  return (
    <>
      <Breadcrumbs items={CAPSTONE_CRUMBS} />
      <h1>{chunk.title}</h1>
      <p class="muted lede">{PROJECT_LEDE}</p>
      <h2>{PROJECT_HEADINGS.brief}</h2>
      <ul class="brief-facts">
        {chunk.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
      <h2>{PROJECT_HEADINGS.decisions}</h2>
      <ul class="rows decision-rows">
        {chunk.decisions.map((d) => {
          const rec = decisions.get(d.module);
          return (
            <li key={d.module}>
              <a class="row" href={decisionHref(d.module)}>
                <span class="row-n">{d.module}</span>
                <span class="row-title">{d.title}</span>
                <span class="row-meta">{lineFor(d.module, stageOf(d.module, rec), rec)}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <h2>{PROJECT_HEADINGS.rubric}</h2>
      <Rubric rubric={chunk.rubric} />
      <p class="sheet-actions">
        <button class="button" type="button" onClick={exportPlan}>
          {EXPORT_PLAN}
        </button>
      </p>
    </>
  );
}

/** The rubric as a list per criterion, which never scrolls sideways on a phone. */
function Rubric({ rubric }: { rubric: RubricView }) {
  return (
    <>
      {rubric.criteria.map((c) => (
        <section key={c.id} class="rubric-criterion" aria-labelledby={`rubric-${c.id}`}>
          <h3 id={`rubric-${c.id}`}>{c.name}</h3>
          <ul class="rubric-levels">
            {c.levels.map((text, level) => (
              <li key={text} class="rubric-level">
                <span class="rubric-score">{level}</span> {text}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p class="muted">{passLine(rubric.passTotal)}</p>
    </>
  );
}

/** `#/project/NN`: the six ADR headings, the live citation check, then the grades and the reveal as inline panels. */
function Editor({
  idx,
  rubric,
  decision,
}: {
  idx: ContentIndex;
  rubric: RubricView;
  decision: DecisionView;
}) {
  const m = decision.module;
  const concepts = useMemo(() => conceptNames(idx.concepts), [idx]);
  const names = useMemo(() => new Map(idx.concepts.map((c) => [c.id, c.name] as const)), [idx]);
  const [draft, setDraft] = useState<AdrDraft>(() => storedDraft(m) ?? emptyAdrDraft(decision.context));
  // The text as typed, with citations by display name; the draft holds the same text with concept ids.
  const [shown, setShown] = useState<AdrText>(() => mapText(draft, (t) => toShown(t, concepts)));
  const [announce, setAnnounce] = useState('');
  const pending = useRef<AdrDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flush = useRef((): void => {
    clearTimeout(timer.current);
    if (pending.current !== null) void writeKv(adrKey(m), pending.current);
    pending.current = null;
  }).current;
  useEffect(() => flush, [flush]);

  const rec = decisionsOf(events.value).get(m);
  const stage = stageOf(m, rec);
  const previous = useRef(stage);
  useEffect(() => {
    if (previous.current === stage) return;
    previous.current = stage;
    document.getElementById(stage === 'self' ? 'reveal-title' : 'decision-status')?.focus();
  }, [stage]);

  const save = (next: AdrDraft): void => {
    setDraft(next);
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, DRAFT_SAVE_MS);
  };
  const edit = (field: AdrField, value: string): void => {
    setShown({ ...shown, [field]: value });
    save({ ...draft, [field]: toStored(value, concepts) });
  };

  const saveSelf = async (scores: Scores): Promise<void> => {
    flush();
    await record({
      t: 'decision',
      module: m,
      stage: 'self',
      scores: [scores[0], scores[1], scores[2], scores[3]],
    });
    setAnnounce(gradeAnnouncement('self', scoreTotal(scores), null));
  };
  const saveFinal = async (scores: Scores): Promise<void> => {
    flush();
    const self = rec?.self?.scores ?? scores;
    await record({
      t: 'decision',
      module: m,
      stage: 'final',
      scores: [scores[0], scores[1], scores[2], scores[3]],
      keyPoints: liveTicks(decision, draft.ticks),
    });
    setAnnounce(gradeAnnouncement('final', scoreTotal(scores), scoreTotal(scores) - scoreTotal(self)));
  };

  const editable = stage === 'open' || stage === 'self' || stage === 'done';
  const ticks = stage === 'done' ? (rec?.final?.keyPoints ?? []) : draft.ticks;
  return (
    <>
      <Breadcrumbs
        items={[...CAPSTONE_CRUMBS, { label: `Decision ${m}: ${decision.title}`, href: decisionHref(m) }]}
      />
      <h1>
        Decision {m}: {decision.title}
      </h1>
      <p class="lede">{decision.prompt}</p>
      <p id="decision-status" class="muted decision-status" tabIndex={-1}>
        {lineFor(m, stage, rec)}
      </p>
      {editable && (
        <form class="adr" onSubmit={(event) => event.preventDefault()}>
          {ADR_FIELDS.map((field, i) =>
            field === 'why' ? (
              <WhyField
                key={field}
                label={ADR_HEADINGS[i] ?? ''}
                value={shown.why}
                stored={draft.why}
                concepts={concepts}
                onEdit={(value) => edit('why', value)}
              />
            ) : (
              <div key={field} class="adr-field">
                <label for={`adr-${field}`}>{ADR_HEADINGS[i]}</label>
                <textarea
                  id={`adr-${field}`}
                  rows={field === 'context' ? 4 : 3}
                  value={shown[field]}
                  onInput={(event) => edit(field, event.currentTarget.value)}
                />
              </div>
            ),
          )}
        </form>
      )}
      {stage === 'open' && (
        <Grade
          id="self"
          heading={PROJECT_HEADINGS.self}
          rubric={rubric}
          initial={null}
          ready={canSelfGrade(textOf(draft), concepts)}
          button={SAVE_SELF}
          onSave={saveSelf}
        />
      )}
      {(stage === 'self' || stage === 'done') && (
        <section class="reveal" aria-labelledby="reveal-title">
          <h2 id="reveal-title" tabIndex={-1}>
            {REVEAL_HEADING}
          </h2>
          <ul class="key-points">
            {revealRows(decision, ticks, names).map((row) => (
              <li key={row.id} class="key-point">
                <p id={`kp-${row.id}`} class="key-point-text">
                  {row.text}
                </p>
                {row.concepts !== '' && <p class="muted key-point-text">{row.concepts}</p>}
                <blockquote class="key-point-quote">{row.quote}</blockquote>
                <p class="key-point-actions">
                  <label class="key-point-tick">
                    <input
                      type="checkbox"
                      checked={row.ticked}
                      disabled={stage === 'done'}
                      aria-describedby={`kp-${row.id}`}
                      onChange={(event) =>
                        save({
                          ...draft,
                          ticks: tickKeyPoint(draft.ticks, row.id, event.currentTarget.checked),
                        })
                      }
                    />
                    {TICK_LABEL}
                  </label>
                  <a
                    href={row.route}
                    onClick={() => {
                      highlight.value = row.quote;
                    }}
                  >
                    {READ_IN_NOTES}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {stage === 'self' && rec?.self && (
        <Grade
          id="final"
          heading={PROJECT_HEADINGS.final}
          rubric={rubric}
          initial={rec.self.scores}
          ready={true}
          button={SAVE_FINAL}
          onSave={saveFinal}
        />
      )}
      <p class="visually-hidden" aria-live="polite">
        {announce}
      </p>
    </>
  );
}

/** The Why heading: citations by display name, a `[[` list of concept names, and the live citation lines. */
function WhyField({
  label,
  value,
  stored,
  concepts,
  onEdit,
}: {
  label: string;
  value: string;
  stored: string;
  concepts: readonly ConceptName[];
  onEdit: (value: string) => void;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState<OpenCitation | null>(null);
  const [active, setActive] = useState(0);
  const options = open === null ? [] : suggestions(open.query, concepts);
  const listed = options.length > 0;

  const track = (el: HTMLTextAreaElement): void => {
    setOpen(openCitation(el.value, el.selectionStart));
    setActive(0);
  };
  const pick = (c: ConceptName): void => {
    const el = area.current;
    if (el === null || open === null) return;
    const next = insertCitation(el.value, el.selectionStart, open, c.name);
    // Set the text and the caret now, not in a later frame: keys typed right after a pick must land after the name.
    el.value = next.text;
    el.setSelectionRange(next.caret, next.caret);
    onEdit(next.text);
    setOpen(null);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (!listed) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + options.length) % options.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const c = options[active];
      if (c !== undefined) pick(c);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(null);
    }
  };

  return (
    <div class="adr-field">
      <label for="adr-why">{label}</label>
      <textarea
        id="adr-why"
        ref={area}
        rows={4}
        value={value}
        aria-autocomplete="list"
        aria-controls={listed ? 'why-options' : undefined}
        aria-activedescendant={listed ? `why-option-${active}` : undefined}
        aria-describedby="why-citations"
        onInput={(event) => {
          onEdit(event.currentTarget.value);
          track(event.currentTarget);
        }}
        onClick={(event) => track(event.currentTarget)}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(null)}
      />
      {listed && (
        <div id="why-options" class="suggestions" role="listbox" aria-label="Concepts">
          {options.map((c, i) => (
            <div
              key={c.id}
              id={`why-option-${i}`}
              class="suggestion"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              onMouseDown={(event) => {
                event.preventDefault();
                pick(c);
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}
      <div id="why-citations" class="citation-lines" aria-live="polite">
        {citationLine(citationsOf(stored, concepts)).map((line) => (
          <p key={line} class="citation-line">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Four criteria as fieldsets of four radios with their level text; the save button waits for every criterion. */
function Grade({
  id,
  heading,
  rubric,
  initial,
  ready,
  button,
  onSave,
}: {
  id: 'self' | 'final';
  heading: string;
  rubric: RubricView;
  initial: Scores | null;
  ready: boolean;
  button: string;
  onSave: (scores: Scores) => Promise<void>;
}) {
  const [picks, setPicks] = useState<readonly (number | null)[]>(() =>
    initial === null ? [null, null, null, null] : [...initial],
  );
  const [busy, setBusy] = useState(false);
  const [a, b, c, d] = picks;
  const scores: Scores | null = a != null && b != null && c != null && d != null ? [a, b, c, d] : null;
  return (
    <section class="grade" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{heading}</h2>
      {rubric.criteria.map((criterion, i) => (
        <fieldset key={criterion.id} class="criterion">
          <legend>{criterion.name}</legend>
          <div class="options">
            {criterion.levels.map((text, level) => (
              <label key={text} class={picks[i] === level ? 'option chosen' : 'option'}>
                <input
                  type="radio"
                  name={`${id}-${criterion.id}`}
                  value={level}
                  checked={picks[i] === level}
                  onChange={() => setPicks(picks.map((p, j) => (j === i ? level : p)))}
                />
                <span class="option-n">{level}</span>
                <span class="option-text">{text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {ready ? (
        <p>
          <button
            class="button"
            type="button"
            disabled={scores === null || busy}
            onClick={() => {
              if (scores === null) return;
              setBusy(true);
              void onSave(scores).finally(() => setBusy(false));
            }}
          >
            {button}
          </button>
        </p>
      ) : (
        <p class="muted">{GRADE_GATE}</p>
      )}
    </section>
  );
}
```

In `src/ui/base.css`, insert these rules right under the `/* Capstone */` anchor line that Task 10 added (and above the next anchor):

```css
.brief-facts {
  margin: 0 0 24px;
  padding-left: 1.5em;
}

.decision-status:focus {
  outline: none;
}

.rubric-criterion h3 {
  margin: 16px 0 4px;
}

.rubric-levels {
  margin: 0;
  padding: 0;
  list-style: none;
}

.rubric-level {
  display: flex;
  gap: 8px;
}

.rubric-score {
  flex: none;
  min-width: 1.5ch;
  font-weight: 600;
  color: var(--muted);
}

.adr {
  display: grid;
  gap: 16px;
  margin: 16px 0 24px;
}

.adr-field {
  position: relative;
  display: grid;
  gap: 4px;
}

.adr-field label {
  font-weight: 600;
}

.adr-field textarea {
  width: 100%;
  min-height: 88px;
  padding: 8px;
  font: inherit;
  line-height: 1.6;
  color: var(--text);
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 6px;
  resize: vertical;
}

.suggestions {
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--pane);
  border: 1px solid var(--active);
  border-radius: 6px;
}

.suggestion {
  min-height: 44px;
  padding: 10px 12px;
  cursor: pointer;
}

.suggestion[aria-selected="true"] {
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--active);
}

.citation-line {
  margin: 0;
  color: var(--muted);
}

.grade {
  margin: 24px 0;
}

.criterion {
  margin: 16px 0;
  padding: 0;
  border: 0;
}

.criterion legend {
  margin-bottom: 8px;
  padding: 0;
  font-weight: 600;
}

.key-points {
  margin: 0;
  padding: 0;
  list-style: none;
}

.key-point {
  padding: 12px 0;
  border-top: 1px solid var(--line);
}

.key-point-text {
  margin: 0 0 4px;
}

.key-point-quote {
  margin: 8px 0;
  padding-left: 12px;
  color: var(--muted);
  border-left: 3px solid var(--line);
}

.key-point-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 24px;
}

.key-point-tick,
.key-point-actions a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}

.key-point-tick input {
  width: 18px;
  height: 18px;
  margin: 0;
  accent-color: var(--active);
}

.drift-line {
  margin: 0;
}
```

- [ ] **Step 7: Run the checks and the build**

```bash
pnpm test tests/unit/project-app.test.ts tests/unit/progress-lines.test.ts 2>&1 | tail -3
pnpm typecheck
pnpm lint
pnpm build 2>&1 | grep '^budgets'
```

Expected: `Test Files  2 passed (2)`; `tsc --noEmit` prints nothing; Biome prints `No fixes applied.` with no `noDescendingSpecificity` warning (every new rule is a single class, a class with an attribute or `:focus`, or a class with one element type under it, and no new selector repeats an earlier one); `budgets: initial JS ...` stays within 0.1 KB of the figure before this task, because only `ensureProject` and the `project` signal join the initial bundle and nothing imports `Project.tsx` until Task 18.

- [ ] **Step 8: Commit**

```bash
pnpm lint:fix
git add src/app/project.ts src/app/download.ts src/app/screens/Project.tsx src/app/content.ts src/app/screens/Progress.tsx src/app/progress-lines.ts src/ui/base.css tests/unit/project-app.test.ts tests/unit/progress-lines.test.ts
git commit -m "Add the capstone screen with self-grade, reveal, final grade and export" -m "Each decision opens as a six-heading ADR with live concept citations, then self-grade, the key point reveal and one final grade; Progress shows the drift and the plan exports as Markdown."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 18: Capstone routes, keys, module rows and the capstone e2e

**Depends on:** Phase 6 Tasks 14 (`statuses` in `src/app/missions.ts`, `stageWord` in the lazy `src/app/mission-copy.ts`, `MissionStatus` from Task 9) and 17; Phase 4 Tasks 6 (`keys.ts`, `keyboard.ts`, `shortcuts.ts`, `KeyContext.labHolding`), 8 (`ModulePage.tsx` with its Labs section) and 19 (the last Phase 4 edit of `router.ts`, `nav.ts` and `Screen.tsx`, after Task 17's incident route); rebase onto `master` right before you start and build on Phase 4's version of each file.

**Covers:** P6-067, P6-068, P6-069, P6-136, P6-157, P6-162, P6-174, P6-184.

**Files:**
- Create: `src/app/module-sections.ts`, `src/app/screens/ModuleSections.tsx`, `tests/e2e/project-helpers.ts`, `tests/e2e/capstone.spec.ts`
- Modify: `src/app/router.ts`, `src/app/nav.ts`, `src/app/screens/Screen.tsx`, `src/app/keys.ts`, `src/app/keyboard.ts`, `src/app/shortcuts.ts`, `src/app/screens/ModulePage.tsx`, `tests/unit/router.test.ts`, `tests/unit/nav.test.ts`, `tests/unit/keys.test.ts`, `tests/unit/module.test.ts`, `tests/e2e/practice.spec.ts`
- Test: the four unit files above, `tests/e2e/capstone.spec.ts`, `tests/e2e/practice.spec.ts`

Design notes:
- Routes: `#/project` is `{ kind: 'project' }` and `#/project/NN` (NN from `01` to `13`) is `{ kind: 'decision'; module: number }`; Escape goes decision to project to Home through `up()`; `toHash` and `up()` are exhaustive switches, so TypeScript fails until both kinds are handled.
- Every router, nav and Screen edit is anchored on lines that Phase 4 Tasks 17 and 19 leave in place (the `not-found` member and cases, the `/s/mock` fixed path, the `mock` case of `up()`, the `IncidentScreen` line), so the hunks land after Phase 4's `incident` and `lightning` cases and after Task 14's two lazy mission screens without touching them.
- `g c` opens `#/project` and `g m` the current module; under `case 'c'` a pending `g` wins before the lesson check, so `c` alone on a lesson still opens Check yourself; during a boss or mock `examCommand` answers first, so both stay off there.
- `KeyContext.currentModule` comes from `moduleOfNote(currentLesson.value)`, which reads the `mNN/` prefix of the note id the lesson page writes to kv, else 1.
- On a runner match question `c` is also a pairing key and the runner's listener does not read `gPending`; `g c` there navigates away, so the pairing it also makes is discarded with the session screen and nothing is recorded.
- Help gains `g then c: Capstone` and `g then m: Current module` right after `g then p: Progress`; the eight `Lab:` rows stay last, so Phase 4's Help test is unchanged.
- The module page's `Capstone` and `Missions` sections sit after Labs and before Boss, as decided, but they render from a new lazy `ModuleSections.tsx`, and their pure row helpers live in a new `src/app/module-sections.ts` instead of `src/app/module.ts`.
- Reason for that deviation from the brief's file list: in the prototype (master 057efe5 with Tasks 8 to 14 stubbed) the sections in `ModulePage.tsx` and the helpers in `module.ts` took the initial JS from 48.7 KB to 50.1 KB, over the 50 KB budget, while the lazy file and the separate helper file give 49.1 KB; the brief's fallback order already moves these sections behind `lazyScreen` first.
- The Capstone row loads the project chunk through `ensureProject()` for the decision title, shows `Decision N: <title>` with one stage word (`Locked`, `After your exam`, `Open`, `Self-graded`, `Graded`) and never renders a key point; a build without a brief shows no Capstone section.
- That makes the module page the second caller of `ensureProject()`, a deliberate deviation from the brief's "loaded only by the Project screen": only the chunk holds the decision titles, and the brief's reason still holds, because the row never renders a key point.
- The Missions rows list each mission whose `modules` include the module, in index order, with `stageWord(status)` from Task 14's lazy `src/app/mission-copy.ts` (safe here, because `ModuleSections.tsx` is lazy too) and the mission number; `missionRows` takes `Pick<MissionMeta, 'id' | 'title' | 'modules'>`, so Task 14's change to `MissionMeta` (no `html`, new `sections` and `steps`) does not touch its test.
- Task 18 adds no rule under `/* Capstone */`: the module page rows reuse `.rows` and `.row`, and the brief's base.css entry for this task needs nothing.
- The end-to-end test serves a made-up project through `useSyntheticProject` in the new `tests/e2e/project-helpers.ts`, which patches `index.project` in the `**/content/index.*.json` route and answers every `**/content/project.*.json` request, as `useSyntheticExam` does; its key points cite the first four tested concepts of each module, so real display names show, and its text is bakery text.
- The clock is installed at `2026-11-15T09:00:00.000Z`, the first study day after the booked exam, with `timezoneId: 'UTC'`; the waiting test uses `E2E_NOW` (`2026-10-20T09:00:00.000Z`).
- The keyboard-only test uses Tab (Alt+Tab in WebKit, as `labs.spec.ts` does), the arrow keys in radio groups, Space on checkboxes and Enter on buttons and the concept list, and types straight after each pick of the list.
- The export check reads the downloaded `cafe-cloud-plan.md` and runs the scripts' own `multiSentenceLines` and `emDashLines` on it.
- `practice.spec.ts`'s backup round trip seeds `adr-03`, `missionTicks` and `plan` before the export and reads them back from IndexedDB after the Merge import, so a wiped browser keeps ADR drafts, mission ticks and the plan record (P6-157).
- Phase 6 end-to-end runs in the `capstone-app` worktree use `E2E_PORT=4337` (Task 2).
- `pnpm build` must report the initial JS under 50 KB, with the figure and the headroom in the task report.
- The headroom is thin: Phase 4 alone already reached 49.5 KB at `master` 70b8990, so if the build reports `budget breach`, stop and report the figure to the controller, who applies the brief's fallback order across Tasks 14 to 18, rather than moving code inside this task.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/router.test.ts`:

```ts
describe('the capstone routes', () => {
  it('reads #/project and #/project/NN, and nothing else under #/project', () => {
    expect(parseHash('#/project')).toEqual({ kind: 'project' });
    expect(parseHash('#/project/03')).toEqual({ kind: 'decision', module: 3 });
    expect(parseHash('#/project/13')).toEqual({ kind: 'decision', module: 13 });
    for (const hash of ['#/project/3', '#/project/00', '#/project/14', '#/project/03/x', '#/project/']) {
      expect(parseHash(hash)).toEqual({ kind: 'not-found', hash });
    }
  });

  it('writes them back, so every capstone route round-trips', () => {
    const routes: Route[] = [
      { kind: 'project' },
      { kind: 'decision', module: 1 },
      { kind: 'decision', module: 13 },
    ];
    expect(routes.map(toHash)).toEqual(['#/project', '#/project/01', '#/project/13']);
    for (const r of routes) expect(parseHash(toHash(r))).toEqual(r);
  });
});
```

Append to `tests/unit/nav.test.ts`:

```ts
describe('up from the capstone', () => {
  it('goes from a decision to the project, and from the project to Home', () => {
    expect(up({ kind: 'decision', module: 3 })).toEqual({ kind: 'project' });
    expect(up({ kind: 'project' })).toEqual({ kind: 'home' });
  });
});
```

In `tests/unit/keys.test.ts`, replace the `../../src/app/keys.ts` import with:

```ts
import {
  type KeyCommand,
  type KeyContext,
  type KeyInput,
  keyCommand,
  keyStep,
  moduleOfNote,
} from '../../src/app/keys.ts';
```

Add `currentModule: 1,` to the `ctx` helper, right after `labHolding: false,`:

```ts
  labHolding: false,
  currentModule: 1,
  ...more,
```

Then append:

```ts
describe('the capstone and current module keys', () => {
  it('opens the capstone with g then c, and the current module with g then m', () => {
    expect(keyCommand(key('c'), ctx({ gAt: 9_500 }))).toEqual({ kind: 'navigate', hash: '#/project' });
    expect(keyCommand(key('M'), ctx({ gAt: 9_500, currentModule: 7 }))).toEqual({
      kind: 'navigate',
      hash: '#/m/07',
    });
    expect(keyCommand(key('c'), ctx({ gAt: 8_000 }))).toBeNull();
    expect(keyCommand(key('m'), ctx())).toBeNull();
  });

  it('lets a pending g win over the lesson check, and keeps c alone for the check', () => {
    expect(keyCommand(key('c'), ctx({ route: LESSON_A, gAt: 9_500 }))).toEqual({
      kind: 'navigate',
      hash: '#/project',
    });
    expect(keyCommand(key('c'), ctx({ route: LESSON_A }))).toEqual({
      kind: 'navigate',
      hash: '#/s/check/m01/a',
    });
  });

  it('keeps g c and g m off during an exam and while typing', () => {
    expect(keyCommand(key('c'), ctx({ gAt: 9_500, exam: true }))).toBeNull();
    expect(keyCommand(key('m'), ctx({ gAt: 9_500, exam: true }))).toBeNull();
    expect(keyCommand(key('c', { typing: true }), ctx({ gAt: 9_500 }))).toBeNull();
  });

  it('reads the current module from the note id of the lesson last opened, else Module 1', () => {
    expect(moduleOfNote('m07/amazon-vpc')).toBe(7);
    expect(moduleOfNote('m13/well-architected')).toBe(13);
    expect(moduleOfNote(null)).toBe(1);
    expect(moduleOfNote('m14/nothing')).toBe(1);
  });

  it('lists g c and g m in Help right after g p, word for word', () => {
    const rows = SHORTCUTS.map((s) => `${s.keys.join(` ${s.joiner} `)}: ${s.action}`);
    expect(rows.slice(2, 7)).toEqual([
      'g then h: Home',
      'g then r: Review',
      'g then p: Progress',
      'g then c: Capstone',
      'g then m: Current module',
    ]);
  });
});
```

In `tests/unit/module.test.ts`, change the chunks import to `import type { LabMeta, MissionMeta } from '../../schemas/chunks.ts';`, and add these imports right after the `../../src/app/module.ts` import block and among the engine type imports:

```ts
import {
  capstoneRow,
  DECISION_STAGE_WORDS,
  missionRows,
  NO_MISSIONS,
} from '../../src/app/module-sections.ts';
import type { MissionStatus } from '../../src/engine/missions.ts';
```

Then append:

```ts
describe('capstoneRow', () => {
  it('names the decision and links its editor, with one word per stage', () => {
    expect(capstoneRow(3, 'open', 'Ovens for the morning rush')).toEqual({
      label: 'Decision 3: Ovens for the morning rush',
      meta: 'Open',
      href: '#/project/03',
    });
    expect(DECISION_STAGE_WORDS).toEqual({
      locked: 'Locked',
      waiting: 'After your exam',
      open: 'Open',
      self: 'Self-graded',
      done: 'Graded',
    });
  });
});

describe('missionRows', () => {
  const mission = (
    id: string,
    title: string,
    modules: number[],
  ): Pick<MissionMeta, 'id' | 'title' | 'modules'> => ({
    id,
    title,
    modules,
  });
  const status = (id: string, stage: MissionStatus['stage']): MissionStatus => ({
    id,
    n: Number(id.slice('mission-'.length)),
    stage,
    missing: [],
    liveMs: null,
    usageFrom: null,
    closedDay: null,
  });
  const MISSIONS = [
    mission('mission-00', 'Set the bakery budget', [1, 2]),
    mission('mission-03', 'Upload a bakery receipt', [6]),
    mission('mission-07', 'Two counters, one kitchen', [5, 6]),
  ];
  const STATUSES = [
    status('mission-00', 'closed'),
    status('mission-03', 'live'),
    status('mission-07', 'locked'),
  ];

  it('lists the missions whose modules name this module, in index order, each with its status', () => {
    expect(missionRows(6, STATUSES, { missions: MISSIONS })).toEqual([
      {
        id: 'mission-03',
        n: 3,
        title: 'Upload a bakery receipt',
        href: '#/missions/mission-03',
        status: STATUSES[1],
      },
      {
        id: 'mission-07',
        n: 7,
        title: 'Two counters, one kitchen',
        href: '#/missions/mission-07',
        status: STATUSES[2],
      },
    ]);
  });

  it('skips a mission with no status yet, and says when no mission uses the module', () => {
    expect(missionRows(2, [], { missions: MISSIONS })).toEqual([]);
    expect(missionRows(9, STATUSES, { missions: MISSIONS })).toEqual([]);
    expect(NO_MISSIONS).toBe('No missions for this module.');
  });
});
```

Create `tests/e2e/project-helpers.ts`:

```ts
/** Helpers for the capstone end-to-end tests; the project chunk they serve is made-up bakery text. */
import type { Page } from '@playwright/test';
import type { ConceptMeta, ContentIndex } from '../../schemas/chunks.ts';
import type { ProjectChunk } from '../../schemas/project-view.ts';
import { SCHEMA_VERSION } from '../../schemas/version.ts';
import { DB_NAME, STORES } from '../../src/store/idb.ts';

/** The file name the patched index gives the project chunk; any `content/project.*.json` request gets the chunk. */
export const SYNTHETIC_PROJECT_FILE = 'content/project.e2e00000.json';
export const SYNTHETIC_PROJECT_TITLE = 'Move the bakery to the cloud';
export const SYNTHETIC_CONTEXT = [
  'The bakery bakes for twelve shops.',
  'Mornings bring ten times the usual orders.',
];
/** Live key points per synthetic decision. */
export const KEY_POINTS_PER_DECISION = 4;

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * A made-up brief: 13 decisions titled `Bakery decision N`, each with four key points on the first four tested
 * concepts homed in module N, linking to their real lesson anchors, so the reveal shows real display names.
 */
export function syntheticProject(concepts: readonly ConceptMeta[]): ProjectChunk {
  const levels = ['Missing', 'Weak', 'Good', 'Strong'] as const;
  return {
    title: SYNTHETIC_PROJECT_TITLE,
    facts: ['The bakery has twelve shops and one kitchen.', 'Its cloud budget is $300 a month.'],
    rubric: {
      passTotal: 8,
      criteria: [
        { id: 'fit', name: 'Fit', levels },
        { id: 'grounding', name: 'Grounding', levels },
        { id: 'tradeoffs', name: 'Trade-offs', levels },
        { id: 'cost', name: 'Cost and responsibility', levels },
      ],
    },
    decisions: Array.from({ length: 13 }, (_, i) => {
      const module = i + 1;
      const homed = concepts.filter((c) => c.tested && c.home.startsWith(`m${pad2(module)}/`));
      return {
        module,
        title: `Bakery decision ${module}`,
        prompt: `Choose how the bakery handles step ${module} of its move.`,
        context: SYNTHETIC_CONTEXT,
        keyPoints: homed.slice(0, KEY_POINTS_PER_DECISION).map((c, k) => ({
          id: `kp-${pad2(module)}-e2e-${k + 1}`,
          text: `Bakery point ${k + 1} of decision ${module} keeps the ovens honest.`,
          concepts: [c.id],
          read: {
            route: `#/m/${pad2(module)}/l/${c.home.slice(4)}/${c.anchor}`,
            text: `Made-up evidence line ${k + 1} for decision ${module}.`,
          },
        })),
      };
    }),
  };
}

/**
 * Serves the made-up project in place of the real one, as `useSyntheticExam` does for the exam: the index names the
 * synthetic chunk file, and every project chunk request gets the synthetic chunk, so no real key point is fetched.
 */
export async function useSyntheticProject(page: Page): Promise<void> {
  let chunk: ProjectChunk | null = null;
  await page.route('**/content/index.*.json', async (route) => {
    const response = await route.fetch();
    const index = (await response.json()) as ContentIndex;
    chunk = syntheticProject(index.concepts);
    await route.fulfill({ response, json: { ...index, project: SYNTHETIC_PROJECT_FILE } });
  });
  await page.route('**/content/project.*.json', async (route) => {
    if (chunk === null) await route.fulfill({ status: 404, body: '' });
    else await route.fulfill({ json: chunk });
  });
}

/** Reads kv values straight from the page's IndexedDB, by key; a missing key reads as undefined. */
export async function readKv(page: Page, keys: readonly string[]): Promise<Record<string, unknown>> {
  return page.evaluate(
    async ({ name, version, store, list }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open(name, version);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const out: Record<string, unknown> = {};
      for (const key of list) {
        const row = await new Promise<{ value: unknown } | undefined>((resolve, reject) => {
          const request = db.transaction(store, 'readonly').objectStore(store).get(key);
          request.onsuccess = () => resolve(request.result as { value: unknown } | undefined);
          request.onerror = () => reject(request.error);
        });
        out[key] = row?.value;
      }
      db.close();
      return out;
    },
    { name: DB_NAME, version: SCHEMA_VERSION, store: STORES.kv, list: [...keys] },
  );
}
```

Create `tests/e2e/capstone.spec.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { expect, type Locator, type Page, test } from '@playwright/test';
import type { NewEvent } from '../../schemas/events.ts';
import { emDashLines, multiSentenceLines } from '../../scripts/content/lib/text.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';
import { HOME_TITLE } from './exam-helpers.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
  seedKv,
} from './helpers.ts';
import {
  KEY_POINTS_PER_DECISION,
  SYNTHETIC_CONTEXT,
  SYNTHETIC_PROJECT_TITLE,
  useSyntheticProject,
} from './project-helpers.ts';
import { lessonsOf } from './questions.ts';

failOnPageProblems();
// UTC keeps the study day the same on every machine.
test.use({ timezoneId: 'UTC' });

test.beforeEach(async ({ page }) => {
  await useSyntheticProject(page);
});

/** The first study day after the booked exam of Saturday, November 14, when decisions open. */
const AFTER_EXAM = '2026-11-15T09:00:00.000Z';
const EDITOR = 'Decision 3: Bakery decision 3';
const card = (page: Page): Locator => page.locator('a.row[href="#/project/03"]');
const announcement = (page: Page): Locator => page.locator('p.visually-hidden[aria-live="polite"]');

/**
 * Opens the app at `at` with the synthetic project, Module 3's first `read` lessons read (`-1` is all but the last),
 * and `more` events after them.
 */
async function setUp(
  page: Page,
  at: string,
  read: number | 'all',
  more: readonly NewEvent[] = [],
): Promise<void> {
  await page.clock.install({ time: new Date(at) });
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  const lessons = await lessonsOf(page, 3);
  const slugs = read === 'all' ? lessons : lessons.slice(0, read);
  const start = Date.parse(at) - 86_400_000;
  const items: [string, NewEvent][] = [
    ...slugs.map((slug): NewEvent => ({ t: 'lesson.done', note: `m03/${slug}` })),
    ...more,
  ].map((e, i) => [new Date(start + i * 1000).toISOString(), e]);
  await seedEvents(page, timelineOf(items));
  await expect(h1(page, HOME_TITLE)).toBeVisible();
}

/** Presses Tab (Alt+Tab in WebKit, which otherwise skips links and buttons) until `target` has focus. */
async function tabTo(page: Page, target: Locator, key: string): Promise<void> {
  for (let i = 0; i < 80; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  throw new Error('Tab never reached the target');
}

/** Picks a level on one criterion of a grade panel by keyboard: Tab into the group, then the arrow keys. */
async function gradeByKeys(
  page: Page,
  panel: Locator,
  criterion: string,
  level: number,
  tab: string,
): Promise<void> {
  const radios = panel.getByRole('group', { name: criterion, exact: true }).getByRole('radio');
  const checked = await radios.evaluateAll((els) => els.findIndex((el) => (el as HTMLInputElement).checked));
  await tabTo(page, radios.nth(Math.max(checked, 0)), tab);
  if (checked === -1) await page.keyboard.press('Space');
  const from = Math.max(checked, 0);
  for (let i = from; i < level; i++) await page.keyboard.press('ArrowRight');
  await expect(radios.nth(level)).toBeChecked();
}

/** Types `[[query` into Why, then moves down the concept list to `name` and picks it with Enter. */
async function cite(page: Page, query: string, name: string): Promise<void> {
  await page.keyboard.type(`[[${query}`);
  const option = page.getByRole('option', { name, exact: true });
  await expect(option).toBeVisible();
  for (let i = 0; i < 8 && (await option.getAttribute('aria-selected')) !== 'true'; i++) {
    await page.keyboard.press('ArrowDown');
  }
  await expect(option).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('listbox', { name: 'Concepts' })).toHaveCount(0);
}

test('a decision opens once every lesson of its module is read, and only after the exam', async ({
  page,
}) => {
  await setUp(page, AFTER_EXAM, -1);
  await page.goto('/#/project');
  await expect(h1(page, SYNTHETIC_PROJECT_TITLE)).toBeVisible();
  await expect(
    page.getByText('Thirteen decisions, one per module, each a short ADR graded against the rubric.'),
  ).toBeVisible();
  await expect(card(page)).toContainText('Opens after you read every lesson of Module 3.');

  const last = (await lessonsOf(page, 3)).at(-1);
  const at = new Date(Date.parse(AFTER_EXAM) - 60_000).toISOString();
  await seedEvents(page, timelineOf([[at, { t: 'lesson.done', note: `m03/${last}` }]]));
  await expect(card(page)).toContainText('Not started');
  await page.goto('/#/m/03');
  const row = page.locator('a.row[href="#/project/03"]');
  await expect(row).toContainText('Decision 3: Bakery decision 3');
  await expect(row).toContainText('Open');
});

test('a read decision waits for the day after the exam', async ({ page }) => {
  await setUp(page, E2E_NOW, 'all');
  await page.goto('/#/project');
  await expect(card(page)).toContainText('Opens after your exam, on Sun 15 Nov.');
  await page.goto('/#/project/03');
  await expect(h1(page, EDITOR)).toBeVisible();
  await expect(page.locator('#decision-status')).toHaveText('Opens after your exam, on Sun 15 Nov.');
  await expect(page.getByRole('textbox')).toHaveCount(0);
});

test('a decision is written, self-graded, revealed, ticked, graded once and exported, by keyboard alone', async ({
  page,
  browserName,
}) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await setUp(page, AFTER_EXAM, 'all');
  await page.locator('h1').click();
  await page.keyboard.press('g');
  await page.keyboard.press('c');
  await expect(h1(page, SYNTHETIC_PROJECT_TITLE)).toBeVisible();
  await tabTo(page, card(page), tab);
  await page.keyboard.press('Enter');
  await expect(h1(page, EDITOR)).toBeVisible();

  await expect(page.getByLabel('Context', { exact: true })).toHaveValue(SYNTHETIC_CONTEXT.join('\n'));
  const fields: [string, string][] = [
    ['Options considered', 'Hire ovens by the minute.\nBuy two ovens outright.'],
    ['Decision', 'Hire ovens by the minute for the morning rush.'],
  ];
  for (const [label, text] of fields) {
    await tabTo(page, page.getByLabel(label, { exact: true }), tab);
    await page.keyboard.type(text);
  }
  await tabTo(page, page.getByLabel('Why', { exact: true }), tab);
  await expect(page.locator('#why-citations')).toHaveText('Cite at least 2 concepts, as [[Concept name]].');
  await page.keyboard.type('Rented ovens follow the rush, like ');
  await cite(page, 'Lam', 'AWS Lambda');
  await expect(page.locator('#why-citations')).toHaveText('1 concept cited; cite at least 2.');
  await page.keyboard.type(' and ');
  await cite(page, 'Farg', 'AWS Fargate');
  await page.keyboard.type(', not [[Bread oven]].');
  await expect(page.locator('#why-citations p')).toHaveText([
    '2 concepts cited.',
    'Not a concept: Bread oven.',
  ]);
  await expect(page.getByLabel('Why', { exact: true })).toHaveValue(
    'Rented ovens follow the rush, like [[AWS Lambda]] and [[AWS Fargate]], not [[Bread oven]].',
  );
  await expect(
    page.getByText('Fill in every heading and cite at least 2 concepts before you grade.'),
  ).toBeVisible();
  for (const [label, text] of [
    [
      'Trade-offs and mitigation',
      'Per-minute ovens cost more per hour, so the night bake stays on owned ovens.',
    ],
    ['Cost note', 'The rush costs about $40 a month, checked at https://calculator.aws/ today.'],
  ] as const) {
    await tabTo(page, page.getByLabel(label, { exact: true }), tab);
    await page.keyboard.type(text);
  }

  const self = page.getByRole('region', { name: 'Self-grade' });
  for (const [criterion, level] of [
    ['Fit', 2],
    ['Grounding', 2],
    ['Trade-offs', 1],
    ['Cost and responsibility', 2],
  ] as const) {
    await gradeByKeys(page, self, criterion, level, tab);
  }
  await tabTo(page, page.getByRole('button', { name: 'Save self-grade', exact: true }), tab);
  await page.keyboard.press('Enter');
  await expect(announcement(page)).toHaveText('Self-grade saved: 7 of 12.');
  await expect(page.getByRole('heading', { name: 'Reference key points' })).toBeFocused();
  await expect(page.locator('#decision-status')).toHaveText('Self-graded 7/12; reveal the key points');
  await expect(page.locator('.key-point')).toHaveCount(KEY_POINTS_PER_DECISION);
  await expect(page.locator('.key-point').first()).toContainText('Made-up evidence line 1 for decision 3.');
  await expect(page.locator('.key-point').first()).toContainText(/Concepts: \S/);
  await expect(page.getByRole('button', { name: 'Save self-grade' })).toHaveCount(0);

  const ticks = page.getByRole('checkbox', { name: 'I covered this' });
  for (const i of [0, 1]) {
    await tabTo(page, ticks.nth(i), tab);
    await page.keyboard.press('Space');
    await expect(ticks.nth(i)).toBeChecked();
  }

  const final = page.getByRole('region', { name: 'Final grade' });
  await expect(
    final.getByRole('group', { name: 'Fit', exact: true }).getByRole('radio').nth(2),
  ).toBeChecked();
  await gradeByKeys(page, final, 'Fit', 3, tab);
  await gradeByKeys(page, final, 'Grounding', 3, tab);
  await tabTo(page, page.getByRole('button', { name: 'Save final grade', exact: true }), tab);
  await page.keyboard.press('Enter');
  await expect(announcement(page)).toHaveText('Final grade saved: 9 of 12. Drift +2.');
  await expect(page.locator('#decision-status')).toHaveText('Final 9/12, drift +2');
  await expect(page.getByRole('button', { name: /^Save/ })).toHaveCount(0);
  await expect(ticks.nth(0)).toBeChecked();
  await expect(ticks.nth(0)).toBeDisabled();

  await page.keyboard.press('Escape');
  await expect(h1(page, SYNTHETIC_PROJECT_TITLE)).toBeVisible();
  await expect(card(page)).toContainText('Final 9/12, drift +2');
  await page.keyboard.press('g');
  await page.keyboard.press('p');
  const sheet = page.getByRole('dialog', { name: 'Progress' });
  await expect(sheet).toContainText('Capstone drift: +2 over 1 decision (final minus self).');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);

  await tabTo(page, page.getByRole('button', { name: 'Export the plan', exact: true }), tab);
  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')]);
  expect(download.suggestedFilename()).toBe('cafe-cloud-plan.md');
  const text = await readFile(await download.path(), 'utf8');
  expect(text.startsWith(`# ${SYNTHETIC_PROJECT_TITLE}\n`)).toBe(true);
  expect(text).toContain('## Decision 3: Bakery decision 3');
  expect(text).toContain('7/12');
  expect(text).toContain('9/12');
  expect(text).toContain('AWS Lambda');
  expect(text).toContain('https://calculator.aws/');
  expect(text).not.toContain('[[aws-lambda]]');
  expect(multiSentenceLines(text)).toEqual([]);
  expect(emDashLines(text)).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
});

test.describe('accessibility and layout', () => {
  test('the cards, the editor with its rubric, the concept list and the reveal have no axe violations', async ({
    page,
  }) => {
    await setUp(page, AFTER_EXAM, 'all');
    await page.goto('/#/project');
    await expect(card(page)).toContainText('Not started');
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);

    await page.goto('/#/project/03');
    await expect(page.getByRole('region', { name: 'Self-grade' })).toBeVisible();
    await page.getByLabel('Why', { exact: true }).fill('');
    await page.getByLabel('Why', { exact: true }).pressSequentially('[[Lam');
    await expect(page.getByRole('listbox', { name: 'Concepts' })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
  });

  test('the reveal and the final grade have no axe violations', async ({ page }) => {
    await setUp(page, AFTER_EXAM, 'all', [{ t: 'decision', module: 3, stage: 'self', scores: [2, 2, 1, 2] }]);
    await page.goto('/#/project/03');
    await expect(page.locator('.key-point')).toHaveCount(KEY_POINTS_PER_DECISION);
    await expect(page.getByRole('region', { name: 'Final grade' })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoSidewaysScroll(page);
  });
});
```

In `tests/e2e/practice.spec.ts`, replace the `./helpers.ts` import with these three lines:

```ts
import { adrKey, KV_KEYS } from '../../src/store/kv.ts';
import { expectNoAxeViolations, expectNoSidewaysScroll, failOnPageProblems, h1, seedKv } from './helpers.ts';
import { readKv } from './project-helpers.ts';
```

Put this constant right above `test('a backup exports, survives a wiped browser and imports once', ...)`:

```ts
/** An ADR draft, mission ticks and a plan record, which a backup must carry through a wiped browser (spec 8.1). */
const PHASE_6_KV: Readonly<Record<string, unknown>> = {
  [adrKey(3)]: {
    v: 1,
    context: 'The bakery bakes for twelve shops.',
    options: 'Hire ovens by the minute.',
    decision: 'Hire ovens by the minute.',
    why: 'They follow the rush, like [[aws-lambda]] and [[aws-fargate]].',
    tradeoffs: 'Hired ovens cost more per hour.',
    cost: 'About $40 a month.',
    ticks: ['kp-03-retired'],
  },
  [KV_KEYS.missionTicks]: { 'mission-00': ['budget', 'mfa'] },
  [KV_KEYS.plan]: {
    plan: 'free',
    credits: 120,
    endsOn: '2027-04-01',
    services: { 'AWS Lambda': true },
    recordedAt: '2026-10-10T09:00:00.000Z',
  },
};
```

In that test, add two lines right after `await finishByClicking(page, questions);`:

```ts
  await finishByClicking(page, questions);
  await seedKv(page, PHASE_6_KV);
  await page.reload();
```

And add one line right after the first `await expect(sheet.locator('.progress-summary')).toHaveText(summary);`, the one that follows `Imported. ${count} new events.`:

```ts
  await expect(sheet.locator('.progress-summary')).toHaveText(summary);
  expect(await readKv(page, Object.keys(PHASE_6_KV))).toEqual(PHASE_6_KV);
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/router.test.ts tests/unit/nav.test.ts tests/unit/keys.test.ts tests/unit/module.test.ts 2>&1 | grep -E "FAIL|Error|Test Files"
pnpm build 2>&1 | grep '^budgets'
E2E_PORT=4337 pnpm exec playwright test tests/e2e/capstone.spec.ts --project chromium-desktop 2>&1 | tail -8
```

Expected: `Test Files  4 failed (4)`: two router cases (`#/project` reads as not-found), the nav case, four keys cases (among them `TypeError: moduleOfNote is not a function` and the Help rows), and `module.test.ts` with `Error: Cannot find module '../../src/app/module-sections.ts'`; the build passes; all 5 capstone tests fail, each at its first look at `#/project` or `#/project/03`, which still render Not found (`expect(locator).toBeVisible() failed`, `toContainText` failed, or `toHaveCount` failed for the key points).

- [ ] **Step 3: Add the capstone routes**

In `src/app/router.ts`, add two members to the `Route` union right before its `not-found` member:

```ts
  | { kind: 'project' }
  | { kind: 'decision'; module: number }
  | { kind: 'not-found'; hash: string };
```

Add the path pattern right above `export function pad2(`:

```ts
/** One capstone decision's ADR editor (spec 6); `#/project` alone lists all 13. */
const DECISION_PATH = new RegExp(`^/project/${MODULE}$`);
```

In `parseHash`, add the fixed path right after the `/s/mock` line, and the decision match right before the final `return { kind: 'not-found', hash };`:

```ts
  if (path === '/s/mock') return { kind: 'mocks' };
  if (path === '/project') return { kind: 'project' };
```

```ts
  const decision = DECISION_PATH.exec(path);
  if (decision) return { kind: 'decision', module: Number(decision[1]) };
  return { kind: 'not-found', hash };
```

In `toHash`, add two cases right before `case 'not-found':`:

```ts
    case 'project':
      return '#/project';
    case 'decision':
      return `#/project/${pad2(route.module)}`;
```

In `src/app/nav.ts`, add two cases to `up()` right after the `mock` case:

```ts
    case 'mock':
      return { kind: 'mocks' };
    case 'project':
      return { kind: 'home' };
    case 'decision':
      return { kind: 'project' };
```

In `src/app/screens/Screen.tsx`, add the lazy screen right after the `IncidentScreen` line (`const IncidentScreen = lazyScreen(() => import('./Incident.tsx').then((m) => m.Incident));`, the last lazy screen once Task 14 has put its two mission screens after `LabScreen`):

```tsx
// The capstone, its editor and the plan export load on first use too (spec 6).
const ProjectScreen = lazyScreen(() => import('./Project.tsx').then((m) => m.Project));
```

And two cases right before `case 'not-found':`:

```tsx
    case 'project':
      return <ProjectScreen idx={idx} module={null} />;
    case 'decision':
      return <ProjectScreen idx={idx} module={route.module} />;
```

- [ ] **Step 4: Add `g c`, `g m` and their Help rows**

In `src/app/keys.ts`, add the field at the end of `KeyContext`, right after `labHolding: boolean;`:

```ts
  /** The module of the lesson last opened, else 1; `g m` opens it. */
  currentModule: number;
```

Add the note reader right above the `gPending` arrow function (`/** True when \`g\` was the previous key ...`):

```ts
const NOTE_MODULE = /^m(0[1-9]|1[0-3])\//;

/** The module of a lesson note id (`m07/amazon-vpc` is 7), or Module 1 without one. */
export function moduleOfNote(note: string | null): number {
  const match = note === null ? null : NOTE_MODULE.exec(note);
  return match === null ? 1 : Number(match[1]);
}
```

In `keyCommand`, make the first line under `case 'c':` the pending `g` check, and add `case 'm':` right before `case 'Escape': {`:

```ts
    case 'c':
      // A pending `g` wins, so `g c` opens the capstone even on a lesson, where `c` alone opens the check.
      if (gPending(input, ctx)) return { kind: 'navigate', hash: toHash({ kind: 'project' }) };
      return ctx.route.kind === 'lesson'
```

```ts
    case 'm':
      return gPending(input, ctx)
        ? { kind: 'navigate', hash: toHash({ kind: 'module', module: ctx.currentModule }) }
        : null;
    case 'Escape': {
```

In `src/app/keyboard.ts`, change two imports and fill the new field right after `labHolding: labHolding.value,`:

```ts
import { G_WINDOW_MS, keyStep, moduleOfNote } from './keys.ts';
import { currentLesson, nextUp } from './memory.ts';
```

```ts
          labHolding: labHolding.value,
          currentModule: moduleOfNote(currentLesson.value),
```

In `src/app/shortcuts.ts`, add two rows right after the `g`, `p` row:

```ts
  { keys: ['g', 'p'], joiner: 'then', action: 'Progress' },
  { keys: ['g', 'c'], joiner: 'then', action: 'Capstone' },
  { keys: ['g', 'm'], joiner: 'then', action: 'Current module' },
```

- [ ] **Step 5: Add the module page's Capstone and Missions sections**

Create `src/app/module-sections.ts`:

```ts
/**
 * Pure rows for the module page's Capstone and Missions sections (spec 7.3), in their own file so the lazy
 * `ModuleSections` screen carries them and the initial bundle does not.
 */
import type { MissionMeta } from '../../schemas/chunks.ts';
import type { DecisionStage } from '../engine/capstone.ts';
import type { MissionStatus } from '../engine/missions.ts';
import { toHash } from './router.ts';

/** The module page's word for each capstone decision stage (spec 7.3); the Project screen gives the full line. */
export const DECISION_STAGE_WORDS: Readonly<Record<DecisionStage, string>> = {
  locked: 'Locked',
  waiting: 'After your exam',
  open: 'Open',
  self: 'Self-graded',
  done: 'Graded',
};

export interface CapstoneRow {
  label: string;
  meta: string;
  href: string;
}

/** The module's capstone decision as one row that opens its editor. */
export function capstoneRow(module: number, stage: DecisionStage, title: string): CapstoneRow {
  return {
    label: `Decision ${module}: ${title}`,
    meta: DECISION_STAGE_WORDS[stage],
    href: toHash({ kind: 'decision', module }),
  };
}

export interface MissionRow {
  id: string;
  n: number;
  title: string;
  href: string;
  status: MissionStatus;
}

export const NO_MISSIONS = 'No missions for this module.';

/** The missions whose `modules` list this module, in index order, each with its status (spec 5.3 and 7.3). */
export function missionRows(
  module: number,
  statuses: readonly MissionStatus[],
  idx: { missions: readonly Pick<MissionMeta, 'id' | 'title' | 'modules'>[] },
): MissionRow[] {
  return idx.missions.flatMap((m) => {
    const status = statuses.find((s) => s.id === m.id);
    if (status === undefined || !m.modules.includes(module)) return [];
    return [{ id: m.id, n: status.n, title: m.title, href: toHash({ kind: 'mission', id: m.id }), status }];
  });
}
```

Create `src/app/screens/ModuleSections.tsx`:

```tsx
import { useEffect } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { decisionStage, decisionsOf } from '../../engine/capstone.ts';
import { studyDay } from '../../engine/day.ts';
import { now } from '../clock.ts';
import { TARGET_EXAM_DATE } from '../config.ts';
import { ensureProject, project } from '../content.ts';
import { bosses, memory } from '../memory.ts';
import { stageWord } from '../mission-copy.ts';
import { statuses } from '../missions.ts';
import { capstoneRow, missionRows, NO_MISSIONS } from '../module-sections.ts';
import { events, storeReady } from '../progress.ts';

/** The module page's Capstone and Missions sections (spec 7.3), after Labs and before Boss. */
export function ModuleSections({ idx, module }: { idx: ContentIndex; module: number }) {
  return (
    <>
      <Capstone idx={idx} module={module} />
      <Missions idx={idx} module={module} />
    </>
  );
}

/**
 * The module's capstone decision (spec 6) as one row with its stage word; its title comes from the project chunk,
 * which this page loads but never shows the key points of.
 */
function Capstone({ idx, module }: { idx: ContentIndex; module: number }) {
  useEffect(() => {
    if (idx.project !== null) void ensureProject();
  }, [idx]);
  if (idx.project === null) return null;
  const title = project.value?.decisions.find((d) => d.module === module)?.title;
  const m = storeReady.value ? memory.value : null;
  const row =
    title === undefined || m === null
      ? null
      : capstoneRow(
          module,
          decisionStage({
            lessonsRead: bosses.value.get(module)?.unlocked === true,
            today: studyDay(now.value),
            examDate: m.examDate ?? TARGET_EXAM_DATE,
            record: decisionsOf(events.value).get(module),
          }),
          title,
        );
  return (
    <>
      <h2>Capstone</h2>
      {row === null ? (
        <p class="muted">Loading</p>
      ) : (
        <ul class="rows">
          <li>
            <a class="row" href={row.href} data-nav-item>
              <span class="row-title">{row.label}</span>
              <span class="row-meta">{row.meta}</span>
            </a>
          </li>
        </ul>
      )}
    </>
  );
}

/** The missions that use this module (spec 5.3), each with its state word. */
function Missions({ idx, module }: { idx: ContentIndex; module: number }) {
  const rows = missionRows(module, statuses.value, idx);
  return (
    <>
      <h2>Missions</h2>
      {rows.length === 0 ? (
        <p class="muted">{NO_MISSIONS}</p>
      ) : (
        <ul class="rows">
          {rows.map((row) => (
            <li key={row.id}>
              <a class="row" href={row.href} data-nav-item>
                <span class="row-n">{row.n}</span>
                <span class="row-title">{row.title}</span>
                <span class="row-meta">{stageWord(row.status)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

In `src/app/screens/ModulePage.tsx`, import `lazyScreen` right after the `quizAvailability` import, declare the lazy sections right above the `ModulePage` doc comment, and render them right after Phase 4's `<Labs ... />`:

```tsx
import { quizAvailability } from '../runner.ts';
import { lazyScreen } from './Lazy.tsx';
```

```tsx
// The Capstone and Missions sections load on first use, so the capstone and mission helpers stay out of the initial bundle.
const ModuleSections = lazyScreen(() => import('./ModuleSections.tsx').then((m) => m.ModuleSections));
```

```tsx
      <Labs idx={idx} module={module} done={labsDone} />
      <ModuleSections idx={idx} module={module} />
      <h2>Boss</h2>
```

- [ ] **Step 6: Run the unit tests and the checks**

```bash
pnpm test tests/unit/router.test.ts tests/unit/nav.test.ts tests/unit/keys.test.ts tests/unit/module.test.ts 2>&1 | tail -3
pnpm typecheck
pnpm lint
```

Expected: `Test Files  4 passed (4)` (71 tests at `master` 057efe5: router 25, nav 8, keys 24, module 14, plus the router and nav cases Phase 4 Tasks 17 and 19 add); `tsc --noEmit` prints nothing; Biome prints `No fixes applied.`

- [ ] **Step 7: Build, then run the end-to-end tests and see them pass**

```bash
pnpm build 2>&1 | grep '^budgets'
E2E_PORT=4337 pnpm exec playwright test tests/e2e/capstone.spec.ts tests/e2e/practice.spec.ts 2>&1 | tail -3
```

Expected: `budgets: initial JS 49.x KB of 50.0 KB` with no `budget breach` line (the prototype measured 49.1 KB on `master` 057efe5 and 49.9 KB on `master` 70b8990, after Phase 4 Task 18, each 0.4 KB above the same tree without Tasks 17 and 18; report the figure and the headroom); `38 passed` at `master` 057efe5: `capstone.spec.ts` passes all 5 tests in both projects (10) and `practice.spec.ts` its 14 in both (28), with no failures, in about a minute.

- [ ] **Step 8: Commit**

```bash
pnpm lint:fix
git add src/app/router.ts src/app/nav.ts src/app/screens/Screen.tsx src/app/keys.ts src/app/keyboard.ts src/app/shortcuts.ts src/app/module-sections.ts src/app/screens/ModuleSections.tsx src/app/screens/ModulePage.tsx tests/unit/router.test.ts tests/unit/nav.test.ts tests/unit/keys.test.ts tests/unit/module.test.ts tests/e2e/project-helpers.ts tests/e2e/capstone.spec.ts tests/e2e/practice.spec.ts
git commit -m "Open the capstone from #/project, g c and each module page" -m "The capstone gets its routes, the g c and g m keys and Help rows, and module pages list their decision and missions; end-to-end tests cover the whole decision flow."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

---

## Task 19: The Phase 6 gate (0.7.0)

**Depends on:** Tasks 1 to 18 on `master`, with the Task 1 branch (and any `wt-questions-fix` branch) and the Task 7 branch merged, less any task the cut order dropped (with Tasks 17 and 18 cut it does not wait for Task 7); Phase 4 Task 20 (`badges.yaml`, `game-content.test.ts`, `README.md`, the spec and `package.json` at 0.6.0).
**Covers:** P6-087, P6-129, P6-152, P6-153, P6-154, P6-155, P6-156, P6-160, P6-161, P6-170, P6-172, P6-173, P6-178, P6-179, P6-180.

**Files:**
- Modify: `content/game/badges.yaml`, `tests/unit/game-content.test.ts`, `README.md`, `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, `package.json`
- Test: `tests/unit/game-content.test.ts`, `pnpm verify`

Design notes:
- The gate closes spec 10.1's Phase 6 row: `content/validate.yaml` holds `practicePerConcept: 3` (Task 3), `pnpm content:validate` reports 0 findings, and `pnpm verify` passes with both Playwright projects green.
- It runs in a short-lived `gate` worktree at `<scratchpad>/p6/gate` on `master`, with `E2E_PORT=4347`, after Phase 4's 0.6.0 of Saturday, October 31, and it is the last feature merge before the go/no-go of Saturday, November 7.
- Leave No Trace and Architect lose `arrives` because their screens ship; Lab Complete keeps `arrives: labs`, since its 26 core labs need Phase 5.
- The new badge test derives both facts from the build and the router instead of trusting the YAML: Leave No Trace is earnable when at least `LEAVE_NO_TRACE` (3) missions are neither the gate nor kept, and Architect when `#/project` parses to a screen and the project chunk holds `ARCHITECT.decisions` (13) decisions.
- That test builds the real content inside `it`, which took over 6 seconds on the shared machine, past Vitest's 5-second default, so it carries a 30-second timeout.
- `tests/unit/progress-lines.test.ts` stays as it is: its badge lines build their own badge objects (such as `Architect · arrives with the capstone`) instead of reading `badges.yaml`, and the `arrives` kinds `missions` and `capstone` stay in `BadgeView` for any later badge.
- `ENGINE_VERSION` is already 6 from Task 12, so Dani sees `Rules updated, progress recalculated.` once, with this release; the release is 0.7.0, and Phase 5 takes 7 and 0.8.0.
- The spec gets one `- NOTE: ... (Phase 6).` line for each of the 8 deviations in the brief's table, right before the heading that closes the section it qualifies, after any Phase 4 note already there.
- Exam item text never appears: the deploy check prints counts, and the notes for Dani name items by id only.

- [ ] **Step 1: Confirm the prerequisites and remove the content worktrees**

Write the commit subjects the gate needs to a scratch file, then list any that `master` lacks:

```bash
SP=/private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad/p6
cat > "$SP/gate-subjects.txt" <<'EOF'
Release Phase 4 Labs I as 0.6.0
Let end-to-end runs pick their port
Raise the practice target to 3 live questions per concept
Add the capstone schemas and check key points in R1, R5, R8 and R9
Add the capstone brief
Add the key point writer, critic and check pipeline
Add the capstone engine and the plan export
Add the mission state engine
Add kv keys and guards for ADR drafts, mission ticks and the plan
Check key points in R2, R6 and R7 and ship the project chunk
Pay mission and capstone decision XP
Add Missions 2 to 8
Track missions with a gate, plan fit, a live chip and cleanup
Put mission cleanup and the usage check into Next
Add the one-time Already done action for Missions 0 and 1
Add the capstone screen with self-grade, reveal, final grade and export
Open the capstone from #/project, g c and each module page
Merge the third practice question per concept
Merge the capstone key points
EOF
git log master --format=%s | sort -u > "$SP/gate-log.txt"
grep -vxF -f "$SP/gate-log.txt" "$SP/gate-subjects.txt"
```

Expected: no output.
Each subject the `grep` prints is a task that is not on `master`: if it is one the controller cut by Thursday, November 5 (Tasks 18 and 17, which also drop the wait for Task 7 and its merge, then 16, then 13, 14 and 15 together, or Task 3 after Wednesday, November 4), go on and apply the cut notes in Steps 2 to 6; for any other subject, stop, because the gate waits for that merge.

Then remove the Phase 6 content worktrees and their branches; `git branch -d` refuses a branch that is not merged, which is the check:

```bash
for w in wt-questions wt-questions-fix wt-key-points; do
  if [ -d "$SP/$w" ]; then git worktree remove --force "$SP/$w"; fi
done
for b in content/phase-6-questions content/phase-6-questions-fix content/phase-6-key-points; do
  if git show-ref --quiet "refs/heads/$b"; then git branch -d "$b"; fi
done
git worktree list | grep -cE 'wt-questions|wt-key-points'
```

Expected: one `Deleted branch` line per branch that existed (two, or three when Dani's fixes ran); the last command prints `0`.
If `git branch -d` says a branch is not fully merged, stop: its merge through the controller's chain has not landed.
With Tasks 17 and 18 cut and Task 7 not merged, leave `wt-key-points` and its branch out of both loops, so they wait for after November 14, expect one fewer `Deleted branch` line, and the last command prints `1`.

- [ ] **Step 2: Write the failing badge test**

In `tests/unit/game-content.test.ts`, Phase 4 Task 20 already imports `ContentIndex`, `buildContent`, `loadContext`, `CORE_LABS_PER_MODULE` and `HANDS_ON_MODULES`.
Add these imports after the existing ones, and widen the `src/engine/badges.ts` import to `{ ARCHITECT, CORE_LABS_PER_MODULE, HANDS_ON_MODULES, LEAVE_NO_TRACE }`:

```ts
import type { ProjectChunk } from '../../schemas/project-view.ts';
import { parseHash } from '../../src/app/router.ts';
```

Replace the test `marks the badges that wait for labs, missions and the capstone` with:

```ts
  it('marks the badges that wait for labs, missions and the capstone', () => {
    expect(badges.filter((b) => b.arrives !== undefined).map((b) => [b.id, b.arrives])).toEqual([
      ['lab-complete', 'labs'],
    ]);
  });

  it('shows Leave No Trace and Architect as earnable exactly when the missions and the capstone ship', () => {
    const built = buildContent(loadContext(ROOT));
    const index = JSON.parse(built.files.get(built.indexFile) ?? 'null') as ContentIndex;
    const closable = index.missions.filter((m) => !m.gate && !m.keep).length;
    const leaveNoTrace = badges.find((b) => b.id === 'leave-no-trace');
    expect(leaveNoTrace?.arrives === undefined).toBe(closable >= LEAVE_NO_TRACE);
    const project =
      index.project === null
        ? null
        : (JSON.parse(built.files.get(index.project) ?? 'null') as ProjectChunk | null);
    const screen = parseHash('#/project').kind !== 'not-found';
    const architect = badges.find((b) => b.id === 'architect');
    expect(architect?.arrives === undefined).toBe(
      screen && project?.decisions.length === ARCHITECT.decisions,
    );
  }, 30_000);
```

```bash
pnpm lint:fix
pnpm vitest run tests/unit/game-content.test.ts
```

Expected: FAIL in both tests: the first still finds `['leave-no-trace', 'missions']` and `['architect', 'capstone']`, and the second gets `false` where it expects `true`, since 7 cleaned-up missions and the 13-decision capstone ship.
With the missions unit cut, the second test's first assertion passes as it is; with Tasks 17 and 18 cut, its second assertion does.
If Phase 4 Task 20 kept `arrives: labs` on Hands On after its own cut, keep `['hands-on', 'labs'],` as the first entry of the first test's list here too.

- [ ] **Step 3: Leave No Trace and Architect arrive**

In `content/game/badges.yaml`, delete the line `  arrives: missions` under `- id: leave-no-trace` and the line `  arrives: capstone` under `- id: architect`; keep `  arrives: labs` under `- id: lab-complete`.

```bash
pnpm vitest run tests/unit/game-content.test.ts
```

Expected: every test in the file passes.
If the cut dropped the missions unit, keep `arrives: missions` and put `['leave-no-trace', 'missions'],` back as the second entry of the first test's list; if it dropped Tasks 17 and 18, keep `arrives: capstone` and put `['architect', 'capstone'],` back as the last entry.

- [ ] **Step 4: Check the exit criteria**

```bash
grep -E '^practicePerConcept: 3$' content/validate.yaml
grep -n 'export const ENGINE_VERSION = 6;' src/engine/replay.ts
pnpm --silent content:validate
pnpm --silent content:report --targets
node scripts/content/key-points.ts report | grep '^Modules under 4 live:'
pnpm vitest run tests/content
```

Expected: the first `grep` prints `practicePerConcept: 3`; the second prints the `ENGINE_VERSION` line; `content:validate: 13 rules, 0 findings`; `[]`; `Modules under 4 live: none`; `tests/content` passes.
If Task 3 was cut, the first `grep` prints nothing and the target check runs at 2, so 0.7.0 ships with R10 at 2 and the third questions live, and Step 6 leaves the README's R10 line at 2.
If Tasks 17 and 18 were cut, skip the key point report: the gate does not wait for Task 7.

- [ ] **Step 5: Record the Phase 6 deviations in the spec**

In `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, insert each block below right before the heading named, followed by a blank line; where Phase 4 already put a note before the same heading, the Phase 6 block goes after it, right above the heading.

Before `### 1.3 Git and checks`:

```markdown
- NOTE: the reference key points live in 13 files `content/project/key-points/NN-<module-dir>.yaml`, one per decision, beside `brief.yaml`, so 13 writers work in parallel and the brief stays a one-agent file (Phase 6).
```

Before `### 2.8 How notes and questions reference each other`:

```markdown
- NOTE: key points have their own prompts, `agents/key-point-writer.md` and `agents/key-point-critic.md`, and their own pipeline `node scripts/content/key-points.ts`, whose stamp names the check `critic@<version>` (Phase 6).
```

Before `### 3.11 Anti-grind audit (one test per row)`:

```markdown
- NOTE: per module, only the first `self` grade and the first `final` grade after it count, so decision XP pays once and a later final moves neither the XP nor Architect (Phase 6).
```

Before `## 6 Capstone: "Move the cafe to the cloud"`:

```markdown
- NOTE: every mission that is cleaned up writes `maxLiveHours: 2` in its frontmatter, because the mission schema requires the field (Phase 6).
- NOTE: the plan-fit service list is the sorted union of `services` over every mission but Mission 0, and Mission 0's Plan status form ticks each one, so the list never drifts from the missions (Phase 6).
```

Before `### 7.3 Screens`:

```markdown
- NOTE: while a mission is live, its `M3 live 1h` chip takes the place of the top bar's `Missions` link and opens the mission page, not Progress (Phase 6).
```

Before `### 7.4 Keyboard`:

```markdown
- NOTE: each decision also has its own route `#/project/NN`, which the module page links to and Escape leaves for `#/project` (Phase 6).
```

Before `### 8.2 Versions and migration`:

```markdown
- NOTE: the `Already done` events also take their ids from the dates Dani enters, sorted by date first, so they sort into the log on those days (Phase 6).
```

```bash
perl -CSD -ne 'print "$ARGV:$.: em dash\n" if /\x{2014}/; close ARGV if eof' docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
grep -c '(Phase 6)\.$' docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
```

Expected: `perl` prints nothing; the count is `8`, one per row of the brief's deviation table, in the `NOTE: ... (Phase 4).` form that Phases 3 and 4 use.
A cut task keeps its notes out, and since the cut order is cumulative the count drops to 7 without Tasks 17 and 18 (no `#/project/NN` note), to 6 without Task 16 as well (no `Already done` note), and to 3 without the missions unit as well (no `maxLiveHours`, plan-fit or live chip note).

- [ ] **Step 6: Document Phase 6 in the README**

In `README.md`, insert these two sections right before `## Course text stays out`, after Phase 4's `## Incidents and lightning`:

```markdown
## Missions

Missions are real AWS exercises you do by hand in your own account, listed at `#/missions` and kept in `content/missions/`.
Mission 0: Guardrails comes first, and its Plan status form records your plan, your credits, the day the plan ends and the services it offers.
Every other mission stays `Locked` until Mission 0 is verified, and a mission that needs a service your plan does not offer shows `Not on your plan`.
A mission page walks you through Start, the steps you tick, Verify, `Cleaned up` and, from the next study day, the usage check, which closes the mission.
While a mission is live, the top bar shows an amber chip such as `M3 live 12m` in place of the `Missions` link, and past the mission's time limit Next turns into `Clean up M3`.
From the study day after cleanup, Next asks `Check usage for M3` until you confirm the usage is back to baseline; the kept Mission 1 never asks for cleanup.
Mission 0 pays 50 XP on its first Verify, and every other mission pays 75 XP once, when it closes; three missions cleaned up and checked for usage on a later day earn Leave No Trace.
If you finished Missions 0 or 1 before this page could track them, the missions list offers `Done some missions already?` once, while the log holds no mission event, and records them with the dates you enter.

## Capstone

The capstone at `#/project` holds 13 decisions for the cafe in `content/project/brief.yaml`, one per module, each written as a short ADR with six headings.
A decision opens once every lesson of its module is read and the exam is behind you, so with the exam on November 14 the first one opens on Sunday, November 15.
Cite concepts as `[[Concept name]]`; typing `[[` suggests names, and you need at least 2 distinct concepts and every heading filled before you grade.
You grade yourself against the rubric first, then the app reveals 4 to 6 reference key points with their evidence lines, you tick the ones you covered, and you grade once more.
The final grade pays 20 XP, plus 10 when it totals 8 or more, once per decision, and Progress shows the drift between your final and self grades.
`Export the plan` downloads `cafe-cloud-plan.md`, one sentence per line, with a summary table and the 13 ADRs.
The reference key points live in `content/project/key-points/`, one file per module, written and checked by `node scripts/content/key-points.ts` with the prompts `agents/key-point-writer.md` and `agents/key-point-critic.md`.
Honor system: never open `content/project/` or a `project.<hash>.json` chunk before you have self-graded a decision.
```

In the `## Questions` section, change `Rule R10 keeps every tested concept at 2 or more` to `Rule R10 keeps every tested concept at 3 or more`, unless Task 3 was cut.
A cut task drops its section: without the missions unit leave out `## Missions`; without Task 16 delete its last sentence; without Tasks 17 and 18 leave out `## Capstone`.

```bash
python3 -I /private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad/r8check.py README.md
grep -n '^## ' README.md | tail -5
```

Expected: `r8check.py` prints nothing; the last five headings are `## Configure and Simulate labs`, `## Incidents and lightning`, `## Missions`, `## Capstone` and `## Course text stays out`.

- [ ] **Step 7: Bump the version**

In `package.json`, change `"version": "0.6.0"` to `"version": "0.7.0"`.

```bash
grep '"version"' package.json
```

Expected: `  "version": "0.7.0",`; backups exported from now on carry `appVersion` 0.7.0 (spec 8.3).

- [ ] **Step 8: Run the full gate**

The full gate runs once Phase 4 has finished building, so it owns the machine; Phase 6 uses its own port.

```bash
perl -CSD -ne 'print "$ARGV:$.: em dash\n" if /\x{2014}/; close ARGV if eof' README.md docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md content/game/badges.yaml
E2E_PORT=4347 pnpm verify 2>&1 | tail -15
```

Expected: `perl` prints nothing; `pnpm verify` runs `pnpm check` (13 rules at 0 findings, every unit and property test), the build with its `budgets:` line (initial JS under 50 KB gzipped, the project chunk and every module chunk under 120 KB), and every end-to-end test on `chromium-desktop` and `webkit-mobile`, the new `missions.spec.ts`, `already-done.spec.ts` and `capstone.spec.ts` among them, and exits 0.
A failure here is fixed in its own commit with a regression test under `tests/regressions/` before the release commit (spec 9).

- [ ] **Step 9: Commit**

```bash
pnpm lint:fix
git add package.json content/game/badges.yaml tests/unit/game-content.test.ts README.md docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
git commit -m "Release 0.7.0 with the capstone and Missions 2 to 8" -m "Missions and the capstone ship, the badges they unlock lose their arrives lines, R10 stands at 3 per concept, and the README and spec record Phase 6's deviations."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.
The controller merges the gate branch to `master` by Friday, November 6; if it cannot, the release waits until after Saturday, November 14, because only fixes merge between the go/no-go and the exam.

- [ ] **Step 10: Notes for Dani**

The task report ends with these lines, which name exam items by id only:

```text
Notes for Dani (ids only):
- Exam item q-yksteh may read familiar in its frozen form, because a practice twin was live since Phase 2; discount it in mock results.
- Practice questions rewritten in Task 1: <ids from the Task 1 rewrite commit body>.
- Rewrites restored from master: <ids from the same body, or none>.
- Practice questions retired: <q-frzd72, or none>.
- Concepts Task 3 could not raise to 3: <ids from Task 3's report, or none>.
```

The controller fills the angle-bracket parts from the commit bodies of Task 1's rewrite commit and Task 3's report, which hold ids only, and never from a diff.

- [ ] **Step 11: Deploy and confirm the release is on the site**

The controller asks Dani to run `pnpm site:deploy` once the gate is on `master`, by Friday, November 6.
Its last line reads `site:deploy: done, ` followed by the site's address.
Export that address as `SITE` and run this; it prints counts only:

```bash
node --input-type=module -e '
const site = process.env.SITE;
const html = await (await fetch(site)).text();
const name = html.match(/<meta name="ccp-content" content="([^"]+)"/)?.[1] ?? "";
const index = await (await fetch(new URL(name, site))).json();
console.log(`missions ${index.missions.length} project ${index.project === null ? "no" : "yes"}`);
'
```

Expected: `missions 9 project yes`, or `missions 2` when the missions unit was cut.

## Task 20: The accessibility sweep

**Depends on:** Task 19 on `master`; the Phase 5 UI if it has merged; runs after Saturday, November 14, unless the Phase 5 UI is already in and the gate ran by November 6.
**Covers:** P6-138, P6-139, P6-140, P6-141, P6-142, P6-148.

**Files:**
- Create: `tests/e2e/a11y.spec.ts`
- Modify: `tests/e2e/reader.spec.ts`; `src/ui/base.css` and the screens named by any failure of Step 4, each with a regression test under `tests/regressions/`
- Test: `tests/e2e/a11y.spec.ts`, `tests/e2e/reader.spec.ts`

Design notes:
- `VIEWS` maps every `Route['kind']` to the views that show it, so `pnpm typecheck` fails on a route kind with no view: a route Phase 5 adds, or a later one, cannot slip past the sweep.
- A view is one state that changes a screen's markup: first run and seeded progress on Home and the module page, the exam start, running, grid and submit states, Sort before and after a failed Check, each mission stage from `Locked` to waiting for its usage check, and a decision waiting, open and revealed.
- The views of `reader.spec.ts`'s `SCREENS` list (Home, Module 5, the Support plans lesson, the missions list, Missions 0 and 1, not-found and the mock list) move into `VIEWS`, so one list owns the sweep; the palette, term popover and help sheet scans stay in `reader.spec.ts`.
- States are seeded, never clicked through, except where the click is the state (Start, Check, the grid, the submit dialog): `seedKv` stamps `ENGINE_VERSION` so the Rules updated banner stays away, and missions read their services from the index the page loaded, so the plan record matches Task 13's missions.
- Exam views use the synthetic exam with `redact: true`, and the file turns off trace, screenshot and video, so no exam item text reaches test output (P6-142).
- The capstone views use `useSyntheticProject` (Task 18), so they never depend on the real key points; an open decision needs study day 2026-11-15, so those views install the clock at `2026-11-15T09:00:00.000Z`.
- A view marked `live` must hold a polite live region in `main`, which is where grade saves and mission steps announce (P6-139); the live chip, a lock line or a ticked key point carries a word, which the ready locators find by text (P6-140).
- The phone block runs on `webkit-mobile` at 360 px: the 4-5-4 hex map fits, runner options are full width and at least 44 px tall with Check and Sure in a sticky bar, and mission pages and the mock list scroll only down (P6-148).
- The running incident and lightning round keep the scans of Phase 4's own `incident.spec.ts` and `lightning.spec.ts`; this sweep covers their locked states, which every fresh browser shows.
- A prototype of this file on `master` ddcfce5, with the route kinds and views that exist there (Phase 4's Sort, Configure and Simulate labs and the locked incident among them, 55 passed and 5 skipped), found no violation and no sideways scroll, so the fixes Step 4 asks for are most likely in the lightning, Phase 5 and Phase 6 screens.
- It relies on `useSyntheticProject` (Task 18), `adrKey` and `KV_KEYS.plan` (Task 10), `MissionStep` (Task 9), the Phase 6 copy of Tasks 14, 16 and 17, and Phase 4's `syntheticConfigureLab`, `SYNTHETIC_CONFIGURE_LAB_ID`, `syntheticSimulateLab`, `SYNTHETIC_SIMULATE_LAB_ID` (Tasks 12 and 13), `INCIDENT_LOCKED` and `LIGHTNING_LOCKED` copy (Tasks 17 and 19) and the `incident` and `lightning` route kinds.

- [ ] **Step 1: Confirm the prerequisites**

```bash
git log master --format=%s | grep -cxF 'Release 0.7.0 with the capstone and Missions 2 to 8'
```

Expected: `1`.
Ask the controller whether the Phase 5 UI has merged; if it has, Step 3's typecheck names any route kind it added, and if it has not, the sweep runs now and Phase 5 adds its own views when it lands.

- [ ] **Step 2: Write the sweep**

Create `tests/e2e/a11y.spec.ts`:

```ts
/**
 * The accessibility sweep (spec 7.5, 9): every route kind, in each state that changes its markup, scanned by axe
 * with zero violations and checked for sideways scroll in both projects, then the phone rules at 360 px.
 * `VIEWS` is keyed by `Route['kind']`, so a new route kind fails the typecheck until it has a view here.
 */
import { expect, type Locator, type Page, test } from '@playwright/test';
import type { NewEvent } from '../../schemas/events.ts';
import type { Route } from '../../src/app/router.ts';
import type { MissionStep } from '../../src/engine/missions.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { adrKey, KV_KEYS } from '../../src/store/kv.ts';
import { timelineOf } from '../fixtures/events.ts';
import { E2E_NOW } from '../fixtures/ready-module.ts';
import { HOME_TITLE, readyModule, useSyntheticExam } from './exam-helpers.ts';
import {
  expectNoAxeViolations,
  expectNoSidewaysScroll,
  failOnPageProblems,
  h1,
  seedEvents,
  seedKv,
} from './helpers.ts';
import {
  SYNTHETIC_CONFIGURE_LAB_ID,
  SYNTHETIC_SIMULATE_LAB_ID,
  SYNTHETIC_SORT_LAB_ID,
  syntheticConfigureLab,
  syntheticSimulateLab,
  syntheticSortLab,
  useSyntheticLab,
} from './lab-helpers.ts';
import { useSyntheticProject } from './project-helpers.ts';

/** Exam screens show synthetic items only, and no trace, screenshot or video of them is kept. */
test.use({ timezoneId: 'UTC', trace: 'off', screenshot: 'off', video: 'off' });

failOnPageProblems();

interface View {
  name: string;
  /** Seeds what the view needs and opens it; the page clock is already installed. */
  open: (page: Page) => Promise<void>;
  /** A locator that shows once the view has settled. */
  ready: (page: Page) => Locator;
  /** The clock for this view, when it is not `E2E_NOW`. */
  now?: string;
  /** Exam screens: axe output names rules and node targets only, never node text. */
  redact?: true;
  /** Screens that announce grade saves or mission steps keep a polite live region in `main`. */
  live?: true;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const NOW_MS = Date.parse(E2E_NOW);
/** The study day after the target exam date, when decisions open. */
const DECISION_DAY = '2026-11-15T09:00:00.000Z';
const DECISION_MS = Date.parse(DECISION_DAY);
const iso = (ms: number): string => new Date(ms).toISOString();

function missionAt(ms: number, mission: string, step: MissionStep): readonly [string, NewEvent] {
  return [iso(ms), { t: 'mission', mission, step }];
}

/** Mission 0 started and verified three days ago, so every other mission is past the gate. */
const GATE: readonly (readonly [string, NewEvent])[] = [
  missionAt(NOW_MS - 3 * DAY_MS, 'mission-00', 'start'),
  missionAt(NOW_MS - 3 * DAY_MS + HOUR_MS, 'mission-00', 'verified'),
];

/** A Module 3 draft with every heading filled and two concepts cited. */
const DRAFT = {
  v: 1,
  context: 'The cafe takes orders online from one shop today.',
  options: 'Functions that run per order, or servers that run all day.',
  decision: 'Run order handling on [[aws-lambda]].',
  why: 'Orders arrive in bursts, and [[amazon-ec2]] would sit idle between them.',
  tradeoffs: 'A cold start can add a short delay to the first order of the morning.',
  cost: 'The cafe pays per request, which stays low at its order volume.',
  ticks: [],
};

/** Opens Home, stamps the engine version, writes the kv records and the events, and waits for Home again. */
async function seed(
  page: Page,
  items: readonly (readonly [string, NewEvent])[],
  kv: Readonly<Record<string, unknown>> = {},
): Promise<void> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION, ...kv });
  await seedEvents(page, timelineOf(items));
  await expect(h1(page, HOME_TITLE)).toBeVisible();
}

/** Opens a path. */
async function visit(page: Page, path: string): Promise<void> {
  await page.goto(path);
}

/** A plan record with every plan-fit service on except `off`, read from the index the page loaded. */
async function planRecord(page: Page, off: readonly string[]): Promise<Record<string, unknown>> {
  const services = await page.evaluate(async () => {
    const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content ?? '';
    const index = (await (await fetch(name)).json()) as { missions: { id: string; services: string[] }[] };
    return [...new Set(index.missions.filter((m) => m.id !== 'mission-00').flatMap((m) => m.services))];
  });
  return {
    plan: 'free',
    credits: 120,
    endsOn: '2027-04-01',
    services: Object.fromEntries(services.map((s) => [s, !off.includes(s)])),
    recordedAt: iso(NOW_MS - 3 * DAY_MS),
  };
}

/** Seeds Mission 0 as verified, a plan without the services in `off`, and the events in `items`. */
async function pastTheGate(
  page: Page,
  items: readonly (readonly [string, NewEvent])[],
  off: readonly string[] = [],
): Promise<void> {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seed(page, [...GATE, ...items], { [KV_KEYS.plan]: await planRecord(page, off) });
}

/** Starts Mock A; the caller serves the synthetic exam first. */
async function startMock(page: Page): Promise<void> {
  await visit(page, '/#/s/mock/a');
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  await expect(page.locator('section.exam #stem')).toBeFocused();
}

const VIEWS: Record<Route['kind'], readonly View[]> = {
  home: [
    { name: 'Home on the first run', open: (p) => visit(p, '/'), ready: (p) => h1(p, HOME_TITLE) },
    {
      name: 'Home with Module 3 ready for its boss',
      open: (p) => readyModule(p, 3),
      ready: (p) => p.locator('main a.hex .hex-dot').first(),
    },
  ],
  module: [
    {
      name: 'Module 5 before any lesson',
      open: (p) => visit(p, '/#/m/05'),
      ready: (p) => p.getByRole('heading', { level: 2, name: 'Key takeaways' }),
    },
    {
      name: 'Module 3 with its boss ready',
      open: async (p) => {
        await readyModule(p, 3);
        await visit(p, '/#/m/03');
      },
      ready: (p) => p.getByRole('link', { name: 'Start the boss (15 questions, 21 min)', exact: true }),
    },
  ],
  lesson: [
    {
      name: 'a lesson with an update line',
      open: (p) => visit(p, '/#/m/11/l/aws-support-plans'),
      ready: (p) => p.locator('li.update').first(),
    },
  ],
  missions: [
    {
      name: 'the missions list on the first run, with Already done',
      open: (p) => visit(p, '/#/missions'),
      ready: (p) => p.getByRole('heading', { name: 'Done some missions already?' }),
    },
    {
      name: 'the missions list past the gate, with Mission 3 overdue',
      open: async (p) => {
        await pastTheGate(p, [missionAt(NOW_MS - 3 * HOUR_MS, 'mission-03', 'start')]);
        await visit(p, '/#/missions');
      },
      ready: (p) =>
        p.getByText('Real AWS, done by hand in your own account, one mission at a time.', { exact: true }),
    },
  ],
  mission: [
    {
      name: 'Mission 0 before Start',
      open: (p) => visit(p, '/#/missions/mission-00'),
      ready: (p) => p.getByRole('button', { name: 'Start Mission 0', exact: true }),
    },
    {
      name: 'Mission 0 started, with its Plan status form',
      open: async (p) => {
        await visit(p, '/#/missions/mission-00');
        await p.getByRole('button', { name: 'Start Mission 0', exact: true }).click();
      },
      ready: (p) => p.getByRole('button', { name: 'Save plan status', exact: true }),
      live: true,
    },
    {
      name: 'Mission 1 verified, waiting for its usage check',
      open: async (p) => {
        await pastTheGate(p, [
          missionAt(NOW_MS - 2 * DAY_MS, 'mission-01', 'start'),
          missionAt(NOW_MS - 2 * DAY_MS + HOUR_MS, 'mission-01', 'verified'),
        ]);
        await visit(p, '/#/missions/mission-01');
      },
      ready: (p) => p.getByRole('button', { name: 'Cost stays within the expected credits', exact: true }),
    },
    {
      name: 'Mission 2 locked by the gate',
      open: (p) => visit(p, '/#/missions/mission-02'),
      ready: (p) => p.getByText('Locked until Mission 0 is verified.', { exact: true }),
    },
    {
      name: 'Mission 3 live, with the chip',
      open: async (p) => {
        await pastTheGate(p, [missionAt(NOW_MS - HOUR_MS / 2, 'mission-03', 'start')]);
        await visit(p, '/#/missions/mission-03');
      },
      ready: (p) => p.getByRole('button', { name: 'Cleaned up', exact: true }),
      live: true,
    },
    {
      name: 'Mission 3 cleaned up, waiting for its usage check',
      open: async (p) => {
        await pastTheGate(p, [
          missionAt(NOW_MS - DAY_MS - 2 * HOUR_MS, 'mission-03', 'start'),
          missionAt(NOW_MS - DAY_MS - HOUR_MS, 'mission-03', 'verified'),
          missionAt(NOW_MS - DAY_MS, 'mission-03', 'cleaned'),
        ]);
        await visit(p, '/#/missions/mission-03');
      },
      ready: (p) => p.getByRole('button', { name: 'Usage is back to baseline', exact: true }),
      live: true,
    },
    {
      name: 'Mission 4 not on the plan',
      open: async (p) => {
        await pastTheGate(p, [], ['Amazon DynamoDB']);
        await visit(p, '/#/missions/mission-04');
      },
      ready: (p) => p.getByText('Not on your plan: Amazon DynamoDB.', { exact: true }),
    },
  ],
  check: [
    {
      name: 'a lesson check',
      open: (p) => visit(p, '/#/s/check/m03/aws-lambda'),
      ready: (p) => p.locator('section.runner #stem'),
    },
  ],
  quiz: [
    {
      name: 'a module quiz',
      open: async (p) => {
        await readyModule(p, 3);
        await visit(p, '/#/s/quiz/m03');
      },
      ready: (p) => p.locator('section.runner #stem'),
    },
  ],
  review: [
    {
      name: 'the review with nothing due',
      open: (p) => visit(p, '/#/s/review'),
      ready: (p) => p.getByText('Nothing due.', { exact: true }),
    },
  ],
  boss: [
    {
      name: 'a boss start screen',
      open: async (p) => {
        await useSyntheticExam(p);
        await readyModule(p, 3);
        await visit(p, '/#/s/boss/m03');
      },
      ready: (p) => p.getByRole('button', { name: 'Start the boss', exact: true }),
      redact: true,
    },
    {
      name: 'a running boss',
      open: async (p) => {
        await useSyntheticExam(p);
        await readyModule(p, 3);
        await visit(p, '/#/s/boss/m03');
        await p.getByRole('button', { name: 'Start the boss', exact: true }).click();
      },
      ready: (p) => p.locator('section.exam #stem'),
      redact: true,
    },
  ],
  mocks: [{ name: 'the mock list', open: (p) => visit(p, '/#/s/mock'), ready: (p) => h1(p, 'Mock exams') }],
  mock: [
    {
      name: 'a mock start screen',
      open: async (p) => {
        await useSyntheticExam(p);
        await visit(p, '/#/s/mock/a');
      },
      ready: (p) => p.getByRole('button', { name: 'Start Mock A', exact: true }),
      redact: true,
    },
    {
      name: 'a running mock with the question grid open',
      open: async (p) => {
        await useSyntheticExam(p);
        await startMock(p);
        await p.keyboard.press('g');
      },
      ready: (p) => p.getByRole('navigation', { name: 'Questions' }),
      redact: true,
    },
    {
      name: 'a mock at its submit dialog',
      open: async (p) => {
        await useSyntheticExam(p);
        await startMock(p);
        await p.keyboard.press('Control+Enter');
      },
      ready: (p) => p.getByRole('heading', { name: 'Submit the exam?', exact: true }),
      redact: true,
    },
  ],
  focus: [
    {
      name: 'a focus quiz',
      open: async (p) => {
        await readyModule(p, 3);
        await visit(p, '/#/s/focus/m03');
      },
      ready: (p) => p.locator('section.runner #stem'),
    },
  ],
  results: [
    {
      name: 'mock results with the error review',
      open: async (p) => {
        await useSyntheticExam(p);
        await startMock(p);
        await p.keyboard.press('Control+Enter');
        await p.locator('dialog.confirm').getByRole('button', { name: 'Submit', exact: true }).click();
      },
      ready: (p) => p.locator('p.score-line'),
      redact: true,
    },
  ],
  lab: [
    {
      name: 'a Sort lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticSortLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_SORT_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'a Sort lab after a failed Check',
      open: async (p) => {
        await useSyntheticLab(p, syntheticSortLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_SORT_LAB_ID}`);
        await p.getByRole('button', { name: /^Check/ }).click();
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'a Configure lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticConfigureLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_CONFIGURE_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
    {
      name: 'a Simulate lab',
      open: async (p) => {
        await useSyntheticLab(p, syntheticSimulateLab);
        await visit(p, `/#/m/01/lab/${SYNTHETIC_SIMULATE_LAB_ID}`);
      },
      ready: (p) => p.getByRole('region', { name: 'Workspace' }),
    },
  ],
  incident: [
    {
      name: 'the incident before Module 2 is read',
      open: (p) => visit(p, '/#/s/incident'),
      ready: (p) => p.getByText('Starts after Module 2.', { exact: true }),
    },
  ],
  lightning: [
    {
      name: 'the lightning round before 20 concepts settle',
      open: (p) => visit(p, '/#/s/lightning'),
      ready: (p) => p.getByText('Opens after 20 concepts settle.', { exact: true }),
    },
  ],
  project: [
    {
      name: 'the capstone cards',
      open: async (p) => {
        await useSyntheticProject(p);
        await visit(p, '/#/project');
      },
      ready: (p) =>
        p.getByText('Thirteen decisions, one per module, each a short ADR graded against the rubric.', {
          exact: true,
        }),
    },
  ],
  decision: [
    {
      name: 'a decision waiting for the exam',
      open: async (p) => {
        await useSyntheticProject(p);
        await readyModule(p, 3);
        await visit(p, '/#/project/03');
      },
      ready: (p) => p.getByText('Opens after your exam, on Sun 15 Nov.', { exact: true }).first(),
    },
    {
      name: 'an open decision editor',
      now: DECISION_DAY,
      open: async (p) => {
        await useSyntheticProject(p);
        await readyModule(p, 3);
        await visit(p, '/#/project/03');
      },
      ready: (p) => p.getByRole('button', { name: 'Save self-grade', exact: true }),
      live: true,
    },
    {
      name: 'a self-graded decision with its key points revealed',
      now: DECISION_DAY,
      open: async (p) => {
        await useSyntheticProject(p);
        await seed(
          p,
          [[iso(DECISION_MS - HOUR_MS), { t: 'decision', module: 3, stage: 'self', scores: [2, 2, 1, 1] }]],
          { [adrKey(3)]: DRAFT },
        );
        await visit(p, '/#/project/03');
      },
      ready: (p) => p.getByRole('heading', { name: 'Reference key points' }),
      live: true,
    },
  ],
  'not-found': [
    {
      name: 'the not-found screen',
      open: (p) => visit(p, '/#/nowhere'),
      ready: (p) => h1(p, 'Page not found'),
    },
  ],
};

test.describe('every screen has no axe violations and no sideways scroll', () => {
  for (const [kind, views] of Object.entries(VIEWS)) {
    for (const view of views) {
      test(`${kind}: ${view.name}`, async ({ page }) => {
        await page.clock.install({ time: new Date(view.now ?? E2E_NOW) });
        await view.open(page);
        await expect(view.ready(page)).toBeVisible();
        if (view.live === true)
          await expect(page.locator('main [aria-live="polite"]').first()).toBeAttached();
        await expectNoAxeViolations(page, view.redact === true ? { redact: true } : {});
        await expectNoSidewaysScroll(page);
      });
    }
  }
});

test('Progress with the capstone drift line has no axe violations', async ({ page }) => {
  await page.clock.install({ time: new Date(DECISION_DAY) });
  await seed(page, [
    [iso(DECISION_MS - 2 * HOUR_MS), { t: 'decision', module: 3, stage: 'self', scores: [2, 2, 1, 1] }],
    [
      iso(DECISION_MS - HOUR_MS),
      { t: 'decision', module: 3, stage: 'final', scores: [2, 2, 2, 1], keyPoints: [] },
    ],
  ]);
  await page.keyboard.press('g');
  await page.keyboard.press('p');
  await expect(page.getByText(/^Capstone drift: \+1 over 1 decision/)).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test.describe('the phone layout at 360 px', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
    await page.setViewportSize({ width: 360, height: 740 });
    await page.clock.install({ time: new Date(E2E_NOW) });
  });

  test('the 4-5-4 hex map fits', async ({ page }) => {
    await visit(page, '/');
    const hexes = page.locator('main a.hex');
    await expect(hexes).toHaveCount(13);
    for (const hex of await hexes.all()) {
      const box = await hex.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
    }
    await expectNoSidewaysScroll(page);
  });

  test('runner options are full width and at least 44 px tall, with Check and Sure in a sticky bar', async ({
    page,
  }) => {
    await visit(page, '/#/s/check/m03/aws-lambda');
    const options = page.locator('section.runner fieldset.options').first();
    await expect(options).toBeVisible();
    const field = await options.boundingBox();
    for (const label of await options.locator('label.option').all()) {
      const box = await label.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual((field?.width ?? 0) - 2);
    }
    const bar = page.locator('.submit-bar');
    expect(await bar.evaluate((el) => getComputedStyle(el).position)).toMatch(/^(sticky|fixed)$/);
    await expect(bar.getByRole('button', { name: /^Check/ })).toBeInViewport();
    await expect(bar.getByRole('button', { name: /^Sure/ })).toBeInViewport();
    await expectNoSidewaysScroll(page);
  });

  for (const path of ['/#/missions/mission-00', '/#/missions/mission-03', '/#/s/mock']) {
    test(`${path} needs no sideways scroll`, async ({ page }) => {
      await visit(page, path);
      await expect(page.locator('main h1')).toBeVisible();
      await expectNoSidewaysScroll(page);
    });
  }
});
```

- [ ] **Step 3: Typecheck the coverage of every route kind**

```bash
pnpm lint:fix
pnpm typecheck
pnpm lint
```

Expected: `tsc --noEmit` prints nothing and Biome prints `No fixes applied.`
If Phase 5 added a route kind, `tsc` fails with `TS2741: Property '<kind>' is missing` (or `TS2739` naming several kinds): add one view per state of that screen to `VIEWS`, opened the way Phase 5's own end-to-end spec opens it, and run the three commands again.
Phase 5's Place, Trace and Investigate labs share the `lab` kind, so add one `lab` view per new engine with Phase 5's synthetic lab helper, beside the Configure and Simulate views.
Keep `startMock` free of `useSyntheticExam`: Biome's `useHookAtTopLevel` rule rejects a `use...` call inside a named function that is not a hook, so each view's own arrow function serves the exam.

- [ ] **Step 4: Move the reader's screen list into the sweep**

In `tests/e2e/reader.spec.ts`, delete the `SCREENS` constant and the `for (const view of SCREENS)` loop at the top of `test.describe('accessibility and layout', ...)`, keeping the palette, term popover and help sheet tests in that block, and drop `expectNoSidewaysScroll` from the `./helpers.ts` import, which leaves:

```ts
import { expectNoAxeViolations, failOnPageProblems, h1 } from './helpers.ts';
```

Every deleted view has a `VIEWS` entry that scans the same screen: `Home on the first run`, `Module 5 before any lesson`, `a lesson with an update line`, `the missions list on the first run, with Already done`, `Mission 0 before Start`, `Mission 1 verified, waiting for its usage check`, `the not-found screen` and `the mock list`.
The old fresh, locked Mission 1 view is a locked mission page, and `Mission 2 locked by the gate` covers that state.

```bash
pnpm lint
pnpm build 2>&1 | tail -1
E2E_PORT=4347 pnpm exec playwright test tests/e2e/a11y.spec.ts 2>&1 | tail -3
E2E_PORT=4347 pnpm exec playwright test tests/e2e/reader.spec.ts 2>&1 | tail -3
```

Expected: Biome prints `No fixes applied.`; the build prints its `budgets:` line; the sweep reports `79 passed` and `5 skipped` (36 views and the Progress test in both projects, and the five phone tests on `webkit-mobile` only), and `reader.spec.ts` passes.
Any other result goes to Step 5.

- [ ] **Step 5: Fix what the sweep finds, one regression test per bug**

For each failing test, in the order the run lists them:
1. Write `tests/regressions/YYYY-MM-DD-<slug>.spec.ts`, dated the day you find it, that opens the same view the same way, with `failOnPageProblems()` and the same `test.use` line, and asserts the one failing thing (the axe rule id with `expectNoAxeViolations`, the overflow with `expectNoSidewaysScroll`, or the box size); run it with `E2E_PORT=4347 pnpm exec playwright test tests/regressions/<file>` and see it fail for the reason the sweep gave.
2. Fix the cause in the screen or in `src/ui/base.css`, under the anchor of the screen it belongs to (this task may write under any anchor); a colour fix uses the tokens in `src/ui/tokens.css`, and `--live` stays for live AWS resources only.
3. Run `pnpm build 2>&1 | tail -1`, the regression test and the spec of the screen you changed, and see them pass, then commit the test and the fix together with the subject `Fix <what was wrong> on <screen>` and a body naming the axe rule or the measure.

Expected after the last fix: Step 4's two Playwright commands pass as stated there.

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix
git add tests/e2e/a11y.spec.ts tests/e2e/reader.spec.ts
git commit -m "Check every screen with axe at both widths" -m "The axe and sideways-scroll sweep now covers every screen and state, including labs, incidents, lightning, missions and the capstone, and fixes what it found."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

## Task 21: Visual baselines at 375 and 1280

**Depends on:** Task 20 on `master` (and so the Phase 4 and Phase 5 UI it swept).
**Covers:** P6-143, P6-144, P6-145, P6-146, P6-147.

**Files:**
- Create: `tests/e2e/visual.spec.ts`, `tests/e2e/__screenshots__/chromium-desktop/*.png` and `tests/e2e/__screenshots__/webkit-mobile/*.png` (7 each)
- Modify: `playwright.config.ts`
- Test: `tests/e2e/visual.spec.ts`

Design notes:
- Spec 9 asks for baselines of Home, the runner, the exam shell, results, a module page, a lesson with an update line and a lab at 375 and 1280 px; `webkit-mobile` (375 x 812) and `chromium-desktop` (1280 x 800) are those widths already.
- Real content moves with every content merge (Task 1, Task 3, Phase 5), so the pages are drawn from the bakery fixture tree instead: the spec builds it in the test process with `buildContent(loadContext(...))` and serves every `**/content/*.json` request from that build, which holds the index, the Module 1 chunk with its Sort lab, and the search chunk.
- The index is padded with 12 made-up modules of one empty lesson each, so Home shows the 4-5-4 hex map, and the synthetic exam over the fixture's tested concepts replaces `exam`, so the exam shell and results never touch the exam pool (P6-145); an unknown chunk is a 404, which `failOnPageProblems` turns into a failure.
- `page.clock.setFixedTime` at `E2E_NOW` (2026-10-20T09:00:00Z) keeps the exam timer at `90:00` and every date still, `timezoneId: 'UTC'` fixes the study day, and a `crypto.getRandomValues` stub through `page.addInitScript` makes session seeds, picks and option order repeat (P6-147).
- `readyModuleEvents` seeds Module 1 as read and quizzed three times, with `ENGINE_VERSION` stamped, so Home, the top bar and the module page show progress rather than a blank first run.
- The defaults `animations: 'disabled'`, `caret: 'hide'` and `maxDiffPixels: 100` live in `playwright.config.ts`, and the pointer moves to the corner before each shot, so no hover state reaches a baseline.
- Playwright applies `animations` and `caret` through an inline style, which WebKit refuses under the site's CSP and logs as a console error, so this one file sets `bypassCSP: true`; every other spec keeps the CSP, and `failOnPageProblems` still catches every other console error.
- `snapshotPathTemplate` drops Playwright's platform suffix, so there is one baseline per project; the baselines are drawn on Dani's Mac, the only machine that runs `pnpm verify`.
- Screenshots ship nothing, so the version stays 0.7.0.
- A prototype on `master` ddcfce5 wrote 14 baselines (about 860 KB), passed twice in a row without `--update-snapshots`, and failed with 67,406 differing pixels when a baseline was swapped for another page.

- [ ] **Step 1: Write the visual spec**

Create `tests/e2e/visual.spec.ts`:

```ts
/**
 * Visual baselines at 1280 px (chromium-desktop) and 375 px (webkit-mobile) (spec 9). Every page is drawn from
 * made-up content: the bakery fixture tree is built in the test process and served through `page.route`, padded to
 * 13 modules so Home shows the whole hex map, and the exam is the synthetic one. The clock, the time zone and
 * `crypto.getRandomValues` are fixed, so session seeds, option order and every date repeat on each run.
 */
import { fileURLToPath } from 'node:url';
import { expect, type Page, test } from '@playwright/test';
import type { ContentIndex, ModuleChunk, ModuleMeta } from '../../schemas/chunks.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { ENGINE_VERSION } from '../../src/engine/replay.ts';
import { KV_KEYS } from '../../src/store/kv.ts';
import { syntheticExam } from '../fixtures/exam-e2e.ts';
import { E2E_NOW, readyModuleEvents } from '../fixtures/ready-module.ts';
import { HOME_TITLE } from './exam-helpers.ts';
import { failOnPageProblems, h1, seedEvents, seedKv } from './helpers.ts';

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/content-root/', import.meta.url));
/** The fixture tree's own date (`FIXTURE_TODAY`), copied because `content-root.ts` imports Vitest. */
const FIXTURE_TODAY = '2026-10-10';
const MODULE_COUNT = 13;

/**
 * Exam screens show made-up items only, and nothing of them is kept beyond the run. The screenshot settings
 * (`animations`, `caret`) work through an inline style that WebKit refuses under the site's CSP, so this file
 * bypasses the CSP; every other spec still runs with it.
 */
test.use({ timezoneId: 'UTC', bypassCSP: true, trace: 'off', screenshot: 'off', video: 'off' });

failOnPageProblems();

/** The fixture build by file name, with the index padded to 13 modules and the synthetic exam in place. */
function syntheticSite(): Map<string, unknown> {
  const built = buildContent(loadContext(FIXTURE_ROOT, { today: FIXTURE_TODAY }));
  const files = new Map<string, unknown>();
  for (const [path, text] of built.files) files.set(path.slice(path.lastIndexOf('/') + 1), JSON.parse(text));
  const index = files.get(built.indexFile.slice(built.indexFile.lastIndexOf('/') + 1)) as ContentIndex;
  const first = index.modules[0];
  if (first === undefined) throw new Error('the fixture tree has no module');
  const padded: ModuleMeta[] = [first];
  for (let n = first.n + 1; n <= MODULE_COUNT; n += 1) {
    const nn = String(n).padStart(2, '0');
    padded.push({
      n,
      slug: `bakery-module-${n}`,
      title: `Module ${n}: Bakery Module ${n}`,
      short: `Bakery Module ${n}`,
      lessons: [
        {
          n: 1,
          slug: `bakery-lesson-${n}`,
          title: `Bakery Lesson ${n}`,
          concepts: [],
          minutes: 1,
          checkConcepts: 0,
        },
      ],
      chunk: `content/m${nn}.e2e00000.json`,
    });
  }
  const exam = syntheticExam(index.concepts.filter((c) => c.tested));
  for (const [file, chunk] of Object.entries(exam.chunks)) files.set(file, chunk);
  files.set('index', { ...index, modules: padded, exam: { forms: exam.forms, items: exam.items } });
  return files;
}

const SITE = syntheticSite();

/** Serves the synthetic site for every content request; an unknown chunk is a 404, which fails the test. */
async function useSyntheticSite(page: Page): Promise<void> {
  await page.route('**/content/*.json', async (route) => {
    const file = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    const json = SITE.get(file.startsWith('index.') ? 'index' : file);
    if (json === undefined) await route.fulfill({ status: 404, body: '' });
    else await route.fulfill({ json });
  });
}

/** Freezes the page clock and makes `crypto.getRandomValues` return the same bytes on every run. */
async function freeze(page: Page): Promise<void> {
  await page.clock.setFixedTime(new Date(E2E_NOW));
  await page.addInitScript(() => {
    let next = 0;
    crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (array === null) return array;
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = (next * 73 + 41) % 256;
        next += 1;
      }
      return array;
    };
  });
}

/** Module 1 read and quizzed three times, so Home, the top bar and the module page show progress. */
async function seedProgress(page: Page): Promise<void> {
  const chunk = [...SITE.values()].find(
    (v): v is ModuleChunk => typeof v === 'object' && v !== null && (v as ModuleChunk).module === 1,
  );
  if (chunk === undefined) throw new Error('the fixture build has no Module 1 chunk');
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await seedKv(page, { [KV_KEYS.engineVersion]: ENGINE_VERSION });
  await seedEvents(
    page,
    readyModuleEvents({
      module: 1,
      lessons: Object.keys(chunk.lessons),
      questions: chunk.questions,
      now: E2E_NOW,
    }),
  );
  await expect(h1(page, HOME_TITLE)).toBeVisible();
}

/** Moves the pointer off the page, so no hover state reaches the baseline, then compares the screenshot. */
async function expectShot(page: Page, name: string): Promise<void> {
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot(name);
}

test.beforeEach(async ({ page }) => {
  await freeze(page);
  await useSyntheticSite(page);
  await seedProgress(page);
});

test('Home', async ({ page }) => {
  await expect(page.locator('main a.hex')).toHaveCount(MODULE_COUNT);
  await expectShot(page, 'home.png');
});

test('the runner', async ({ page }) => {
  await page.goto('/#/s/check/m01/what-a-bakery-cloud-is');
  await expect(page.locator('section.runner #stem')).toBeFocused();
  await expectShot(page, 'runner.png');
});

test('the exam shell and its results', async ({ page }) => {
  await page.goto('/#/s/mock/a');
  await page.getByRole('button', { name: 'Start Mock A', exact: true }).click();
  await expect(page.locator('section.exam #stem')).toBeFocused();
  await expectShot(page, 'exam-shell.png');
  await page.keyboard.press('Control+Enter');
  const confirm = page.locator('dialog.confirm');
  await confirm.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page).toHaveURL(/#\/r\/[0-9A-Z]{26}$/);
  await expect(page.locator('p.score-line')).toBeVisible();
  await expectShot(page, 'results.png');
});

test('a module page', async ({ page }) => {
  await page.goto('/#/m/01');
  await expect(page.getByRole('heading', { level: 2, name: 'Concepts' })).toBeVisible();
  await expectShot(page, 'module.png');
});

test('a lesson with an update line', async ({ page }) => {
  await page.goto('/#/m/01/l/what-a-bakery-cloud-is');
  await expect(page.locator('li.update').first()).toBeVisible();
  await page.locator('li.update').first().scrollIntoViewIfNeeded();
  await expectShot(page, 'lesson-update.png');
});

test('a Sort lab', async ({ page }) => {
  await page.goto('/#/m/01/lab/lab-m01-sort-the-bakes');
  await expect(page.getByRole('region', { name: 'Workspace' })).toBeVisible();
  await expectShot(page, 'sort-lab.png');
});
```

- [ ] **Step 2: Run it and see it fail without baselines**

```bash
pnpm lint:fix
pnpm typecheck
pnpm build 2>&1 | tail -1
E2E_PORT=4347 pnpm exec playwright test tests/e2e/visual.spec.ts 2>&1 | tail -3
```

Expected: `tsc --noEmit` prints nothing; the build prints its `budgets:` line; `12 failed` (6 tests in 2 projects), each with `Error: A snapshot doesn't exist at .../tests/e2e/visual.spec.ts-snapshots/home-chromium-desktop-darwin.png, writing actual.` or its twin, since no baseline exists yet.
Those files land under Playwright's default path, so delete them before Step 3:

```bash
rm -rf tests/e2e/visual.spec.ts-snapshots test-results
```

- [ ] **Step 3: Point the snapshots at one folder per project and set the screenshot defaults**

In `playwright.config.ts`, insert these lines between the `testMatch` line and `forbidOnly: true,`:

```ts
  // One baseline per project, beside the tests: tests/e2e/__screenshots__/<project>/<name>.png (spec 9).
  snapshotPathTemplate: '{testDir}/e2e/__screenshots__/{projectName}/{arg}{ext}',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixels: 100 },
  },
```

```bash
pnpm lint
E2E_PORT=4347 pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots 2>&1 | tail -2
ls tests/e2e/__screenshots__/chromium-desktop tests/e2e/__screenshots__/webkit-mobile
```

Expected: Biome prints `No fixes applied.`; `12 passed`, with one `A snapshot doesn't exist ..., writing actual.` line per shot; each folder lists `exam-shell.png`, `home.png`, `lesson-update.png`, `module.png`, `results.png`, `runner.png` and `sort-lab.png`.

- [ ] **Step 4: Look at every baseline**

Open each of the 14 PNGs (the Read tool shows images) and check, at both widths:
- `home.png`: the top bar, `Review 2 concepts` as Next, 13 hexes in 4-5-4 rows with Module 1 filled and its boss dot, the exam date question, and no sideways overflow at 375 px.
- `runner.png`: `1 of 2`, the focused stem, full-width options, and `Check` and `Sure` in the sticky bar at 375 px.
- `exam-shell.png`: the focus bar `Mock A   1/65   90:00   Flag (f)   Grid (g)` (the key hints `(f)` and `(g)` show at 1280 px only), a `Made-up exam item` stem, four `Option` rows and no hover border.
- `results.png`: `Mock A results`, `Score 0/65 (0%)`, the domain bars and the first wrong item with its cause buttons.
- `module.png`, `lesson-update.png` and `sort-lab.png`: Baking Basics with `Mastery 87 · solid` and its Lessons, Concepts, Practice, Labs and Boss sections; the lesson with its `Exam guide update` line in view; the Sort lab with its cards, buckets and the Check and Reset bar.
If anything looks off (a clipped label, an overlap, text against the wrong background), fix it under Task 20's regression recipe before you go on, then delete the affected PNGs and rerun Step 3.

- [ ] **Step 5: Run it twice without updating**

```bash
E2E_PORT=4347 pnpm exec playwright test tests/e2e/visual.spec.ts 2>&1 | tail -1
E2E_PORT=4347 pnpm exec playwright test tests/e2e/visual.spec.ts 2>&1 | tail -1
```

Expected: `12 passed` both times, so the frozen clock, seed and content hold.

- [ ] **Step 6: Prove a baseline catches a change**

```bash
D=tests/e2e/__screenshots__/chromium-desktop
cp "$D/home.png" /private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad/p6/home.png
cp "$D/module.png" "$D/home.png"
E2E_PORT=4347 pnpm exec playwright test tests/e2e/visual.spec.ts --project chromium-desktop -g 'Home' 2>&1 | grep -m1 'pixels'
cp /private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad/p6/home.png "$D/home.png"
E2E_PORT=4347 pnpm exec playwright test tests/e2e/visual.spec.ts --project chromium-desktop -g 'Home' 2>&1 | tail -1
rm -rf test-results
```

Expected: the first run prints a line such as `67406 pixels (ratio 0.07 of all image pixels) are different.`; after the copy back, `1 passed`.

- [ ] **Step 7: Commit**

```bash
pnpm lint:fix
git add playwright.config.ts tests/e2e/visual.spec.ts tests/e2e/__screenshots__/{chromium-desktop,webkit-mobile}/{home,runner,exam-shell,results,module,lesson-update,sort-lab}.png
git commit -m "Add visual baselines at 375 and 1280 px" -m "Screenshots of Home, the runner, the exam shell, results, a module page, a lesson with an update line and a lab guard the layout at both widths."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds; `git status --short` prints nothing.
From now on a change that moves a pixel on these pages updates its baselines in the same commit: delete the affected PNGs, rerun Step 3's update command, and look at the new images as in Step 4.

---

## Self-review

### Spec coverage

| Spec 10.1, Phase 6 | Tasks |
|---|---|
| ADR editor per module with live concept-citation checks | 8 (citations), 10 (drafts), 17 (the editor) and 18 (routes and module rows) |
| Self-grade, reference reveal, re-grade with drift | 8 (stages and drift), 12 (XP and the first final), 17 (grading and reveal) and 18 (the e2e) |
| Markdown export | 8 (`planMarkdown`) and 17 (`Export the plan`) |
| `content/project/brief.yaml` and reference key points with verified blocks | 4 (schemas and rules), 5 (the brief), 6 (the key point pipeline), 7 (the fan-out) and 11 (R2, R6, R7 and the project chunk) |
| Missions 2 to 8 | 9 (stages, gate and plan fit), 12 (XP), 13 (content), 14 (screens and chip) and 15 (Next) |
| The one-time `Already done` action for Missions 0 and 1 | 16 |
| Accessibility and visual baselines | 14, 16 and 18 (each new screen), 20 (the sweep) and 21 (the baselines) |
| 3 live practice questions per tested concept | 1 (the fan-out) and 3 (R10 at 3) |
| Exit: all e2e green; R10 at 3 per concept | 19 |
| Capstone decisions unlocked earlier wait until after the exam | 8 (`decisionStage`) and 17 (the wait line) |

| Other spec sections Phase 6 implements | Tasks |
|---|---|
| 1.2 the `content/project/` layout | 4, 5 and 7 |
| 2.6 and 2.7 the third question per concept and the key point checks | 1, 3, 6 and 7 |
| 2.9 R1, R2, R5 to R9 for the brief and key points, R10 at 3 | 3, 4 and 11 |
| 2.10 the lazy project chunk and its budget | 11 |
| 3.2, 3.5 and 3.10 mission and decision XP, no streak days, Leave No Trace and Architect | 12 and 19 |
| 4.6 Next's mission safety | 15 |
| 5.3 the mission flow, gate, plan fit, live chip, cleanup and usage check | 9, 13, 14 and 15 |
| 6 the capstone | 4 to 8, 10, 11, 12, 17 and 18 |
| 7.2 to 7.5 the chip, routes, `g c` and `g m`, Help rows, mobile and accessibility | 14, 18, 20 and 21 |
| 8.1 and 8.2 `plan`, `missionTicks`, `adr-NN`, `recordAt` and `ENGINE_VERSION` 6 | 10, 12 and 16 |
| 9 regressions, journeys, e2e, axe on every screen and screenshots | 12, 14, 16, 18, 20 and 21 |
| 10.2 the calendar to the exam | the header's task order, 1, 3 and 19 |

Every checklist id in the requirements map (`P6-001` to `P6-186`) that is not left out on purpose maps to a task:

| Ids | Tasks |
|---|---|
| P6-001 | 1 |
| P6-002 | 3 |
| P6-003 to P6-022 | 1 |
| P6-023 | 3 |
| P6-024 | 1 |
| P6-025 to P6-039 | 5 |
| P6-040, P6-041 | 7 |
| P6-042 to P6-045 | 6 |
| P6-046 | 6, 7 |
| P6-047 | 6, 11 |
| P6-048 to P6-054 | 5 |
| P6-055, P6-056 | 4 |
| P6-057 | 11 |
| P6-058 | 4 |
| P6-059, P6-060 | 11 |
| P6-061 | 4 |
| P6-062 | 4, 13 |
| P6-063 | 13 |
| P6-064, P6-065 | 4 |
| P6-066 | 6, 11 |
| P6-067 | 17, 18 |
| P6-068, P6-069 | 18 |
| P6-070 | 8 |
| P6-071 | 17 |
| P6-072, P6-073 | 8, 17 |
| P6-074 | 8 |
| P6-075 | 10 |
| P6-076 to P6-079 | 17 |
| P6-080 | 8, 12 |
| P6-081 | 8 |
| P6-082 | 17 |
| P6-083 to P6-085 | 12 |
| P6-086 | 8 |
| P6-087 | 19 |
| P6-088 | 8, 17 |
| P6-089 | 8 |
| P6-090 | 8 |
| P6-091 | 8, 17 |
| P6-092 to P6-109 | 13 |
| P6-110, P6-111 | 14 |
| P6-112 | 9 |
| P6-113 | 14 |
| P6-114 | 10 |
| P6-115 | 9, 14 |
| P6-116 | 14 |
| P6-117 | 10, 14 |
| P6-118 | 14 |
| P6-119 | 9, 14 |
| P6-120 to P6-122 | 14 |
| P6-123, P6-124 | 9, 15 |
| P6-125 | 9, 14 |
| P6-126 | 9 |
| P6-127, P6-128 | 12 |
| P6-129 | 12, 19 |
| P6-130 | 15 |
| P6-131 | 9 |
| P6-132 to P6-135 | 16 |
| P6-136 | 18 |
| P6-137 | 9 |
| P6-138 | 20 |
| P6-139 | 17, 20 |
| P6-140 | 14, 17, 20 |
| P6-141 | 14, 20 |
| P6-142 | 20 |
| P6-143 to P6-147 | 21 |
| P6-148 | 14, 20 |
| P6-149, P6-150 | 17 |
| P6-151 | 14, 17 |
| P6-152 | 3, 19 |
| P6-153 to P6-156 | 19 |
| P6-157 | 18 |
| P6-158 | built (lesson and review offline) and OUT (the Sort lab offline is Phase 4 Task 11's `offline.spec.ts`, see P6-181) |
| P6-159 | 15 |
| P6-160, P6-161 | 19 |
| P6-162 | 18 |
| P6-163 | 16 |
| P6-164 | 1 to 21 (Conventions) |
| P6-165 to P6-169 | 12 |
| P6-170 | 2, 19 |
| P6-171 | 12 |
| P6-172, P6-173 | 19 |
| P6-174 | 18 |
| P6-175 | 10 |
| P6-176, P6-177 | 11 |
| P6-178 to P6-180 | 19 (and the header's task order) |
| P6-184 | 18 |

Left out on purpose: P6-181, P6-182 and P6-183 (Phase 4, Phase 5 and spec 10.3's open questions), P6-185 (the palette's actions kind, outside the Phase 6 row) and P6-186 (already built: Progress Diagnostics shows every version).
P6-158 is built for lessons and review, and the Sort lab offline case is Phase 4 Task 11's `offline.spec.ts`.

### Deliberate deviations

- Key points live in 13 per-module files beside `brief.yaml`, against spec 1.2, so 13 writers work in parallel and the brief stays a one-agent file (Tasks 4 to 7; Task 19 records the NOTE).
- Key points have their own writer, critic and pipeline instead of `question-writer`, against spec 2.7, because Phase 4 owns `agents/question-writer.md` and `scripts/content/lib/checks.ts` and the running question fan-out keeps its `critic@1` stamps (Task 6).
- The key point writer's Fix mode demotes a live key point that a `content:validate` finding names by hand (back to `status: draft`, its `verified` block deleted), the one exception to "stamps only from the tools", because `stamp` keeps a live key point live and `demote` handles only evidence that left its note; the next `stamp` needs a fresh critic pass at the new hash (Task 6 and the header's conventions).
- The first `self` and the first `final` after it count per module, so a later final moves neither XP nor Architect, against the built `applyDecision` that kept the last final (Tasks 8 and 12).
- Cleaned-up missions write `maxLiveHours: 2`, the default of spec 5.3, because the built schema requires it, and the plan-fit list is the union of the missions' `services` rather than a list in Mission 0's prose (Task 13).
- The live chip takes the `Missions` link's place and opens the mission page rather than Progress (spec 7.2), so cleanup is one click away and the top bar keeps four quiet items (Task 14).
- The two mission screens and the mission copy (`stageWord` among it, in `src/app/mission-copy.ts`) load lazily, and the module page's Capstone and Missions sections render from the lazy `ModuleSections.tsx` with helpers in `src/app/module-sections.ts` instead of `module.ts`, because the eager versions measured 50.1 to 51.1 KB against the 50 KB initial JS budget (Tasks 14 and 18).
- The module page is a second caller of `ensureProject()`, against the brief's "loaded only by the Project screen", because only the project chunk holds the decision titles; the chunk still loads only when a module page or the Project screen opens (Task 18).
- Each decision has its own route `#/project/NN`, beyond spec 7.3's `#/project`, so module page rows link to a decision and Escape returns to the list (Task 18).
- `Already done` events take their ids from the entered dates, sorted first, so replay keeps day order whatever order Dani enters them (Task 16).
- `j` and `k` stay on Home and module pages, as spec 7.4's key table says; the missions list rows carry `data-nav-item` but are reached by Tab (Tasks 14 and 18).
- Task 11 proves the `content:validate --demote` hook for key points on the real repository only, because `validate.ts` hard-codes the repository root; `demoteKeyPoints` itself is unit-tested in Task 6.
- Task 19's badge test derives when Leave No Trace and Architect arrive from the build and the router, so a cut task can never ship a badge without its screen.
- Task 20 moves `reader.spec.ts`'s `SCREENS` views into the new `VIEWS` table instead of adding the Project, decision, mission and Progress views to `SCREENS`, because those views need seeded events, kv records, a synthetic project and their own clock, which `SCREENS` (a path and a ready locator) cannot carry, and two lists would scan the same screens twice.
- Task 21 draws its pages from the bakery fixture build padded to 13 modules rather than a hand-written synthetic index and chunk, and its file sets `bypassCSP: true`, because WebKit refuses the inline style behind `animations: 'disabled'` and `caret: 'hide'` under the site's CSP.
- Known limits kept on purpose: if the project chunk fails to load, the module page's Capstone section shows its loading line until a later visit retries, while the Project screen shows the lazy error (Task 18); `oneSentencePerLine` in `plan.ts` does not split two sentences inside a Markdown link's text, splits inside a fenced code block, and turns a line that starts with a dash into a list item, which ADR prose does not hit (Task 8).

### Names used across tasks

- Content and schemas: `practiceTarget` (Task 3), `schemas/project.ts` with `Brief`, `KeyPoint`, `KeyPointFile`, `KEY_POINT_ID`, `MIN_KEY_POINTS`, `MAX_KEY_POINTS`, `PROJECT_DIR`, `BRIEF_FILE`, `KEY_POINT_FILE` (Task 4), `projectOf`, `keyPointHash`, `evidenceHolds` (Task 4), `editKeyPointFile`, `stampKeyPoints`, `demoteKeyPoints`, `keyPointReport` and the `key-points.ts` commands `concepts`, `draft`, `prepare`, `lint`, `grade`, `stamp`, `demote`, `report`, `needs-dani` (Task 6), `retiredPlanProblems` with `labStyleProblems` as its alias, `CRITERION_IDS`, `ContentIndex.project` and `PROJECT_CHUNK` (Task 11).
- Engine: `ADR_HEADINGS`, `ADR_FIELDS`, `CRITERION_ORDER`, `RubricView`, `KeyPointView`, `DecisionView`, `ProjectChunk` in `schemas/project-view.ts`, and `decisionsOf`, `DecisionRecord`, `decisionStage`, `DecisionStage`, `decisionDrift`, `driftOf`, `citationsOf`, `canSelfGrade`, `MIN_CITATIONS`, `planMarkdown`, `PLAN_FILE`, `oneSentencePerLine` (Task 8); `GATE_MISSION`, `DEFAULT_LIVE_HOURS`, `PlanRecord`, `MissionStep`, `MissionLog`, `missionLogOf`, `MissionStage`, `MissionStatus`, `missionStatuses`, `planServices`, `liveMission`, `MissionSafety`, `missionSafety` (Task 9); `ENGINE_VERSION` 6 and the journey `missionsAndCapstone` (Task 12).
- Store and app: `KV_KEYS.plan`, `KV_KEYS.missionTicks`, `ADR_KEY_PREFIX`, `adrKey`, `AdrDraft`, `adrDraftOf`, `planOf`, `ticksOf`, `withTick` and the `/* Missions: flow */` and `/* Capstone */` anchors (Task 10); `statuses`, `missionLogs`, `liveChip` in `src/app/missions.ts`, `stageWord` and the mission copy in `src/app/mission-copy.ts`, `MissionFlow`, `missionSteps` in `build.ts` and `MissionMeta.sections` and `.steps` (Task 14); the Next kinds `cleanup` and `usage`, `CLEANUP_MINUTES`, `USAGE_MINUTES` (Task 15); `recordAt`, `HOSTING_MISSION`, `AlreadyDone` (Task 16); `project`, `ensureProject`, `downloadText`, `driftLine`, `PROJECT_LEDE`, `GRADE_GATE`, `revealRows`, `openCitation`, `insertCitation` (Task 17); the `project` and `decision` route kinds, `KeyContext.currentModule`, `moduleOfNote`, `capstoneRow`, `missionRows`, `NO_MISSIONS`, `useSyntheticProject` (Task 18).
- Tests: `E2E_PORT` (Task 2), the bakery brief `Move the bakery to the shared kitchen` and its key points (Task 4), `VIEWS` (Task 20), `useSyntheticSite` and `expectShot` (Task 21).
- Phase 4 names Phase 6 uses: `labStyleProblems`, `OLD_PLANS`, `KV_KEYS.labDrafts`, the `/* Labs: shared and Sort */` to `/* Lightning */` anchors, `KeyContext.labHolding`, `SHORTCUTS` with its `Lab:` rows, the `lab`, `incident` and `lightning` route kinds, `IncidentScreen`, `ContentIndex.labs` and `.incidents`, `emptyIndexFields` with labs and incidents, `practiceCounts` without incident steps, `CORE_LABS_PER_MODULE`, `HANDS_ON_MODULES`, `useSyntheticLab`, `syntheticSortLab`, `syntheticConfigureLab`, `syntheticSimulateLab` and their ids, the copy `Starts after Module 2.` and `Opens after 20 concepts settle.`, the commit subject `Release Phase 4 Labs I as 0.6.0`, and `ENGINE_VERSION` 5 with its `Version 5 also pays lightning XP ...` doc line.
- Names from Phases 0 to 3: the `mission` and `decision` events of `schemas/events.ts`, `XP.decision`, `XP.decisionGood`, `XP.mission0`, `XP.mission`, `ARCHITECT`, `decisionPasses`, `LEAVE_NO_TRACE`, `applyMission`, `applyDecision`, `record`, `recordAll`, `writeKv`, `ensureExamForm` (the pattern for `ensureProject`), `TARGET_EXAM_DATE`, `loadContext`, `Context`, `editQuestionFile`, `courseRuns`, `multiSentenceLines`, `makeFixtureRoot`, `FIXTURE_TODAY`, `replaceIn`, `seedEvents`, `seedKv`, `expectNoAxeViolations`, `expectNoSidewaysScroll` and `useSyntheticExam`.
- The names files of each part list every name with its file, signature and task.

### Phase 4 coexistence

Phase 6 changes no event schema (`mission` and `decision` already exist), keeps `SCHEMA_VERSION` 1, and takes `ENGINE_VERSION` 6 and release 0.7.0 after Phase 4's 5, 0.5.0 and 0.6.0.
Every Phase 6 task that touches one of these files starts only once the Phase 4 task is on `master`, rebases onto it, builds on its version and never rewrites a Phase 4 hunk; at `master` 8ed213d every Phase 4 task below is in except Task 20.

| Shared file | Phase 4 task | Phase 6 task after it |
|---|---|---|
| `scripts/content/lib/style.ts`, `scripts/content/rules/r07-originality.ts`, `tests/unit/style.test.ts` | 2 (and 14) | 11 and 3, in either order, keeping both sides in `style.test.ts` |
| `content/validate.yaml`, `scripts/content/lib/report.ts`, `agents/question-writer.md`, `tests/unit/agents.test.ts`, `tests/unit/r10.test.ts` | 2, 3 and 14 | 3 |
| `scripts/content/rules/r02-ids.ts`, `r06-references.ts`, `scripts/content/validate.ts`, `scripts/check-budgets.ts`, `tests/fixtures/index.ts`, `tests/unit/sw-manifest.test.ts`, `tests/unit/r06.test.ts` | 14 | 11 |
| `schemas/chunks.ts`, `scripts/content/build.ts`, `tests/unit/build.test.ts` | 14 | 11 and 14, in either order |
| `src/store/kv.ts`, `tests/unit/migrations.test.ts` | 6 | 10 |
| `src/ui/base.css` | 7 (the lab anchors) | 10 (the Phase 6 anchors), then 14, 16 and 17 under their own anchors, and 20 anywhere |
| `src/engine/memory.ts`, `src/engine/replay.ts` (`ENGINE_VERSION`), `tests/fixtures/journeys/journeys.ts`, `tests/property/arbitraries.ts`, `tests/unit/memory.test.ts`, `tests/unit/anti-grind.test.ts` | 18 | 12 |
| `tests/fixtures/journeys/content.ts` | 5 | 12 |
| `src/engine/next.ts`, `tests/unit/next.test.ts` | 16 | 15 |
| `src/app/home.ts`, `src/app/memory.ts`, `tests/unit/home.test.ts` | 19 | 14 (`home.test.ts`), then 15 |
| `src/app/screens/Screen.tsx` | 6, 17 and 19 | 14, then 18 |
| `src/app/progress.ts` | 17 | 16 |
| `src/app/router.ts`, `src/app/nav.ts` | 6, 17 and 19 | 18 |
| `src/app/keys.ts`, `src/app/keyboard.ts`, `src/app/shortcuts.ts` (the Help rows) | 6 | 18 |
| `src/app/screens/ModulePage.tsx` | 8 | 18 |
| `content/game/badges.yaml`, `tests/unit/game-content.test.ts`, `README.md`, the spec, `package.json` (version) | 20 | 19 |
| `tests/e2e/reader.spec.ts`, `playwright.config.ts` | none | 13 then 20; 2 then 21 |

Phase 6 never edits `schemas/events.ts`, `src/app/screens/Home.tsx` or `Help.tsx`; Home changes only through `nextLabel` in `home.ts`, and Help only through the `SHORTCUTS` rows.
The practice fan-out (Task 1) and the key point fan-out (Task 7) run on content branches that merge through the serialized merge chain they share with Phase 4's content branches, and every merge unions the `.results` pass and failure files.

### Open risks for the controller

- The Task 1, Task 7 and Task 13 Workflow scripts were checked for syntax and control flow with stand-in agents only; their first real run is the first full test, so the controller watches the first round's output lines (`revise`, `needs Dani`, `draft ... 0 problems`) before letting the rounds run on.
- Task 1's cite check for the six exam-close rewrites reads Phase 4 lab and incident content; until the Phase 4 Configure, Simulate and incident branches merge, the ask to the Phase 4 controller to leave those six ids out of lab debrief picks is the only guard, and Task 1 Step 9 re-validates after each merge.
- Task 3's `content:validate` at 0 findings and `--targets` at `[]` hold only after Task 1 merges with no concept short (429 R10 findings before).
- Task 11 was proved without Task 5's real brief, so its R2, R7 and R8 checks and the one-chunk budget line on the real brief are first proven when Task 11 runs after Task 5.
- Task 12 was proved on the `memory.ts`, `replay.ts` and `journeys.ts` of `master` 057efe5; Phase 4 Task 18 is now on `master`, so its builder rebases and re-runs every step.
- Task 18's expected test counts (71 unit tests, 38 end-to-end passes) and Task 17's 23 tests were counted at `master` 057efe5; later Phase 4 tests raise them, so the builder reports the measured counts with no failure.
- Task 19 Steps 3 to 11 and the Phase 6 and lightning views of Task 20 ran only against stand-ins, because they need Tasks 9 to 18 and Phase 4 Task 20.
- The initial JS budget is the tightest constraint: the header's fallback order applies if any build reports `budget breach`.
- Phase 4's own timing and real-content tests (the replay-cost case of `tests/property/grind.property.test.ts`, and Phase 4 Task 20's Hands On case) can fail by chance on a loaded machine; Phase 6 retries and never edits them, and the Phase 4 controller owns their timeouts.
