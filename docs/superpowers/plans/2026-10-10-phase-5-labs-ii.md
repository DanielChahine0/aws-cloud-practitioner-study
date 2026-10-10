# Phase 5 Labs II Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The full core lab catalog before November 14: the Place, Trace and Investigate engines with their 7 core labs, so 26 core labs are live across six engines and Lab Complete can be earned, then the 9 stretch labs (four Sort, two Simulate on two new fixed models, one Configure, one Trace, one Investigate), which the cut rule drops first, with every shipped lab replayed by R11 inside `pnpm check`.

**Architecture:** Each new engine is a pure reducer in `src/labs/<engine>/model.ts` behind Phase 4's contract (`init`, `reduce`, `check`, `hint`), registered in `src/labs/engines.ts` with its `settle` and `complete`, and its zod spec and action schemas live in a per-engine file beside `schemas/lab.ts`, which gathers them into `LAB_SCHEMAS`, so the validator, the build and R11 replay the new labs with the same code the app runs.
Place nests containers into slots and checks slot constraints and survival under every listed failure; Trace switches fixed candidate rules on and off and evaluates stateful security groups, stateless ordered network ACLs, and explicit deny over allow over implicit deny with SCPs intersecting identity policies; Investigate filters made-up records and checks exact answers chosen from options.
Nothing in `src/engine/` changes: `lab.done` is engine-agnostic, the core lab list comes from the index, and `ENGINE_VERSION` stays where Phase 4 left it.
Content reuses Phase 4's lab fan-out with two new waves, `p5core` and `p5stretch`, each in its own worktree, with a fresh critic per lab and the R11 replay gate.

**Tech Stack:** Node 24.21.0, pnpm 12.8.1, TypeScript 7.0.2, Vite 8.3.2, Preact 10.29.8 with @preact/signals 2.11.3, zod 4.6.5 (classic for content and lab schemas, `zod/mini` for events and backups), marked 18.0.14, yaml 2.9.1, Vitest 5.0.3, fast-check 4.10.2, Playwright 1.63.0 with @axe-core/playwright 4.13.0, Biome 2.5.15; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, sections 1.2, 2.3, 2.9 (R1, R2, R6, R7, R8, R11), 2.10, 3.2, 3.6, 4.6, 5 (5.1 and 5.2), 7.2 to 7.5, 8.1, 8.4, 9, 10.1 (Phase 5 row) and 10.2; the Phase 4 plan `docs/superpowers/plans/2026-10-10-phase-4-labs.md` is binding for every Phase 4 name.
**Target:** the Task 11 gate right after the wave `p5core` merge, at the latest Tuesday, November 3, 2026, with Dani's first deploy right after it; the wave `p5stretch` merge as a content-only follow-up with a hard cut of Wednesday, November 4 at 18:00 local; every Phase 5 merge by Friday, November 6, and Dani's last deploy by then; go/no-go on Saturday, November 7, after which nothing but fixes ships; exam on Saturday, November 14, 2026; anything not merged by November 6 waits until after November 14.

---

## Conventions for every task

- Run every command from the repository root, `/Users/danielchahine/Programs/AWS Cloud Practitioner Essentials` (or your worktree of it), where `node --version` must print `v24.21.0`; in a fresh shell start with `eval "$(fnm env)"; fnm use`, since `tests/unit/toolchain.test.ts` fails under any other Node.
- Three timing tests already on `master` (`tests/regressions/2026-10-10-exam-date-replay-cost.test.ts`, `tests/property/exam-date-fidelity.property.test.ts` and `tests/unit/forms.test.ts`) can pass Vitest's timeout while other agents load the machine; when one fails in a full run, rerun it alone before treating it as a failure, and report it.
- Never write the em dash character (U+2014) anywhere, and keep one sentence per line in every Markdown file outside code blocks and tables (rule R8 checks both).
- Commit messages are plain imperative sentences with a short body; never add a `Co-Authored-By` line (Dani's global instructions forbid agent co-author lines).
- Run `pnpm lint:fix` before each commit so Biome formats the code; the formatter has the last word.
- The pre-commit hook runs `pnpm check`, so a commit fails while any check fails; fix the cause rather than bypassing the hook, and never use `--no-verify`.
- Stage files by path, never with `git add -A` or `git add .`.
- Never hand-edit generated files: `content/fingerprints/*` comes only from `pnpm content:fingerprint`, `content/exam/quotas.yaml` and `content/exam/forms.yaml` never change in this phase, the `verified` and `review` blocks only from `pnpm content:stamp`, and every `*.snapshot.json` and journey `.jsonl` under `tests/fixtures/` only from its test helper.
- Course text stays outside the repo in `~/Library/Application Support/ccp-study/`; no file, fixture, test, agent prompt or agent output in the repo may contain it, and test fixtures use made-up bakery text.
- Lab text (titles, briefs, goals, hints, wrong-path mistakes, container, piece, rule, case, column, record, question and option text, debrief lines) is original, set in the cafe, and grounded by citing the source lesson in `notes`, never copied; R7 checks it.
- Labs and debriefs draw only from the live practice pool, never the exam pool; lab writers never read `content/exam/`, the course source text, `content/fingerprints/`, AWS exam questions or `.results/checks/keys.json`.
- Dani must never see exam-pool item text: plans, tool output, test output, agent returns, logs and commit bodies name exam items by id and count only.
- Prices in labs are "lab credits", a made-up unit, and any figure the notes do not state is called a lab value; never show a real AWS price; Regions, zones, accounts and IPs in labs are made up (documentation IP ranges, AWS documentation style account ids).
- Engine facts the notes do not state (network ACL rule order, reply ports, explicit deny over allow, SCPs intersecting identity policies, CloudFormation type names, CloudTrail management events) appear only as lab mechanics that the lab's brief states.
- Agent results and check batches live under `.results/` (git-ignored) and are never committed.
- Code under `src/engine/` and every `.ts` file under `src/labs/` is pure: it imports no Preact, signals, `src/app`, `src/ui`, `src/store` or zod code, touches no DOM, storage, `crypto` or `globalThis`, and takes the current moment, the UTC offset and any seed as arguments; Biome enforces the boundary, and the new `src/labs/place`, `src/labs/trace` and `src/labs/investigate` models fall under it automatically.
- Raw question, lab, rule, record and concept ids appear only in the runner's report panel and in tool output, never elsewhere in the UI (spec 2.8).
- UI copy in this plan is exact: tests match it word for word, so change it only together with its test.
- Every bug found while building gets `tests/regressions/YYYY-MM-DD-<slug>.test.ts`, written and failing before the fix (spec 9).
- The initial JS bundle has about 0.5 KB of headroom after Phase 4; engine models and views load only in the lazy `Lab` chunk; every task that touches code in the initial bundle runs `pnpm build`, states the measured size and headroom in its report, and stops and reports rather than raising the budget when the `budgets:` line passes 50.0 KB; Tasks 6, 7 and 8 also report the `Lab` chunk size; every Phase 5 merge reports the post-merge initial size and headroom to the Phase 6 controller, and when Phase 5 and Phase 6 together pass the budget, whichever lands second moves its own code to a lazy chunk.
- Phase 4 coexistence: Phase 4 is still being built on `master` while Phase 5 runs (on 2026-10-10 `master` is at 8ed213d with Phase 4 Tasks 1 to 9, 11 (the 0.5.0 release), 12 to 14 and 16 to 19, and wave S of Task 10; wave CS of Task 10, Task 15 and Task 20 are still to come); every Phase 5 edit to a file a Phase 4 task creates or modifies waits until the last Phase 4 task that touches it is on `master` (Phase 4 Task 13 for the lab files and Task 19 for `src/ui/base.css`, both merged; Task 20 for the badges, `package.json`, `README.md` and the spec; Tasks 6, 8 and 14, the owners of the other shared files, are merged), rebases on it, and builds on that result; new Phase 5 files depend only on Phase 4 Task 1's contract; Phase 5 never edits a Phase 4 worktree or branch, never merges into `master` ahead of a Phase 4 merge that is waiting in the serialized merge chain, and never blocks a Phase 4 release.
- Release freeze: no Phase 5 code merge lands in the 24 hours before Phase 4 Task 11 (0.5.0) or Phase 4 Task 20 (0.6.0) starts, until that release commit is on `master`; the Phase 4 gate controller may revert a Phase 5 merge that breaks its `pnpm verify`.
- `Labs:` line: Phase 4 pins its three-engine `Labs:` line at the wave CS final return (P4:8689), the Task 11 exit check (P4:8782) and the Task 20 exit check (P4:18497); for each, whichever runs second of it and Phase 5 Task 4 expects the line with `, place 0, trace 0, investigate 0` appended, and the controller tells the Phase 4 Task 10 controller and the Task 11 and Task 20 builders before Task 4 merges.
- Phase 6 coexistence: Phase 6 is planned in parallel and avoids lab files; the files both phases touch (`tests/unit/game-content.test.ts`, `package.json`, `README.md`, the spec, `src/app/shortcuts.ts`, `tests/unit/keys.test.ts`, `tests/unit/agents.test.ts`, `tests/unit/coverage.test.ts`, `schemas/chunks.ts`, `tests/fixtures/index.ts`, `src/app/screens/ModulePage.tsx`, `src/ui/base.css` and Phase 6 Task 21's visual baselines) are serialized at merge time, and whichever phase lands second rebases; Phase 6 captures lab, Help and module-page baselines only after Phase 5 Task 8 is on `master`, and if baselines exist already, the Phase 5 task that changes a screen updates only the affected snapshots and names them in its report; Phase 5 never edits `src/engine/**`, `tests/e2e/helpers.ts`, `playwright.config.ts` or any capstone or mission file.
- The machine is shared with Phase 4 builds and the Phase 6 plan: run focused tests (`pnpm test <file>`), never the full unit suite, the full e2e suite or `pnpm verify`, except that Task 11 and the wave `p5stretch` merge each run `pnpm verify` once, in a quiet window agreed with the Phase 4 and Phase 6 controllers.
- E2E lock: `playwright.config.ts` serves the preview on port 4317 with `--strictPort` and `reuseExistingServer: false`, so two e2e runs at once fail; every e2e run (`pnpm build && pnpm e2e tests/e2e/labs.spec.ts`, and each `pnpm verify`) first checks that `lsof -iTCP:4317 -sTCP:LISTEN` prints nothing, then runs inside `if mkdir <scratchpad>/e2e.lock; then ...; rmdir <scratchpad>/e2e.lock; else echo "e2e lock held"; fi`, so it takes the machine-wide lock (shared with the Phase 4 and Phase 6 controllers), frees it also when the run fails, and never removes a lock another run holds; when the lock is held, it waits with a background until-loop or the Monitor tool and retries (never a foreground sleep); nobody starts `vite preview` or `pnpm preview` on port 4317 outside the lock, since a server started from the main checkout without it has already failed Phase 5 prototype runs; a port-in-use failure means retry under the lock, never a test result.

## File structure

Created in this phase (paths from the repo root):

| Path | Responsibility |
|---|---|
| `schemas/lab-place.ts`, `schemas/lab-trace.ts`, `schemas/lab-investigate.ts` | Zod spec and action schemas of the three new engines (`PlaceSpec`, `PlaceAction`, `TraceSpec`, `TraceAction`, `InvestigateSpec`, `InvestigateAction`), gathered into `LAB_SCHEMAS` by `schemas/lab.ts` |
| `src/labs/place/model.ts`, `src/labs/place/View.tsx` | The Place reducer and checker (slots, constraints, reachability, survival), and its tap-to-select, tap-to-place view with failure buttons |
| `src/labs/trace/model.ts`, `src/labs/trace/View.tsx` | The Trace reducer and checker (`traceCase`, `inCidr`, `globMatch`), and its rule checkboxes and stepped test cases |
| `src/labs/investigate/model.ts`, `src/labs/investigate/View.tsx` | The Investigate reducer and checker (`visibleRecords`), and its listing, filters, records table and answer selects |
| `content/labs/NN-<module-dir>/<lab-slug>.yaml` (16 files) | The 3 Place, 2 Trace and 2 Investigate core labs, and the 9 stretch labs |
| `tests/fixtures/lab-place.ts`, `lab-trace.ts`, `lab-investigate.ts` | Made-up bakery specs and labs for each new engine |
| `tests/unit/lab-place.test.ts`, `lab-trace.test.ts`, `lab-investigate.test.ts`, `lab-texts.test.ts` | Schema rejections and checker tables per engine; the spec texts R7 reads |
| `tests/property/lab-place.property.test.ts`, `lab-trace.property.test.ts`, `lab-investigate.property.test.ts` | Reducers never throw, are deterministic and check purely; survival per failure, deny precedence and statefulness, filters never change checks |
| `tests/content/bad/r11-place-wrong-path-unfinished.yaml`, `r11-trace-start-passes.yaml`, `r11-investigate-wrong-path-unfinished.yaml` | Failing R11 fixtures for the new engines |

Modified:

| Path | Change |
|---|---|
| `package.json` | Version: the next minor after `master`'s when Task 11 runs |
| `schemas/ids.ts` | `LAB_ENGINES` gains `place`, `trace`, `investigate` |
| `schemas/lab.ts` | Imports the three engines' schemas into `LAB_SCHEMAS`; the Simulate block gains the `purchase` and `data-loss` models in `SIM_MODELS` and `SIM_CONSTANTS` |
| `schemas/chunks.ts` | `LabMeta.engine` becomes `LabEngineId` |
| `src/labs/engines.ts` | `ENGINES` entries for Place, Trace and Investigate |
| `src/labs/simulate/models.ts` | The `purchase` and `data-loss` models |
| `scripts/content/lib/labs.ts` | `placeTexts`, `traceTexts`, `investigateTexts` in `SPEC_TEXTS` (Phase 4's `simulateTexts` already reads the `purchase` workload labels) |
| `scripts/content/lib/report.ts` | The `Labs:` line lists every engine of `LAB_ENGINES` |
| `src/app/lab.ts`, `src/app/lab-keys.ts`, `src/app/shortcuts.ts` | `ENGINE_LABEL` for six engines and the Place, Trace and Investigate copy; `LabKeyState.engine` becomes `LabEngineId`, and Place admits the pick-up and place keys; two `Lab:` Help rows reworded for Sort and Place |
| `src/app/screens/Lab.tsx` | `Board` cases for `place`, `trace` and `investigate`; Place's held piece and slot keys |
| `src/app/module.ts`, `src/app/screens/ModulePage.tsx` | `LabRow.stretch` and the `Stretch` mark |
| `src/ui/base.css` | Anchors `/* Labs: Place */`, `/* Labs: Trace */`, `/* Labs: Investigate */` after the Simulate rules, and the rules under them |
| `agents/lab-writer.md`, `agents/lab-critic.md`, `content/STYLE.md` | Version 2: the tier from the task, Place, Trace and Investigate sections and criteria, model notes for the two new Simulate models; four STYLE H3s inside `## Labs` |
| `content/game/badges.yaml` | Lab Complete loses `arrives` only when 26 core labs are live at the gate |
| `tests/unit/lab-schema.test.ts`, `lab-sort.test.ts`, `r11.test.ts`, `coverage.test.ts`, `lab.test.ts`, `lab-keys.test.ts`, `keys.test.ts`, `module.test.ts`, `lab-simulate.test.ts`, `agents.test.ts`, `game-content.test.ts`, `tests/content/sim-labs.test.ts` | Follow the changes above |
| `tests/e2e/lab-helpers.ts`, `tests/e2e/labs.spec.ts` | Synthetic Place, Trace and Investigate labs served by `page.route`, and keyboard-only, tap, axe and 44 px tests for each |
| `README.md`, `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md` | Phase 5 usage; the recorded deviations as `(Phase 5)` NOTE lines |

## Task order and dependencies

- Every start is event-driven ("starts as soon as X is on `master`"); the dates below are latest-by deadlines only.
- Phase 4 Task 1 is on `master`, so Tasks 1, 2 and 3 (the Place, Trace and Investigate models) start at once in three worktrees, `<scratchpad>/p5/wt/place`, `<scratchpad>/p5/wt/trace` and `<scratchpad>/p5/wt/investigate`; they create new files only and merge in any order, at the latest by Wednesday, October 14.
- Task 4 (register the three engines) starts as soon as Tasks 1 to 3 are on `master` (Phase 4 Task 13, the last Phase 4 edit of the lab files, and Tasks 17 and 19, the last Phase 4 edits of `src/ui/base.css`, are merged already); at the latest Thursday, October 22.
- Task 5 (the `purchase` and `data-loss` Simulate models) can start now, since Phase 4 Task 13 is on `master`, and runs in parallel with Tasks 1 to 4; at the latest Thursday, October 22.
- Tasks 6, 7 and 8 (the Place, Trace and Investigate views) need Task 4 and their own model task; each view file is drafted in its engine's worktree, and the shared files (`src/app/lab.ts`, `tests/unit/lab.test.ts`, `src/app/screens/Lab.tsx`, `tests/e2e/lab-helpers.ts`, `tests/e2e/labs.spec.ts`) merge in the fixed order 6, 7, 8, at the latest by Saturday, October 24, Monday, October 26 and Tuesday, October 27.
- Task 9 (lab writer and critic version 2, STYLE) starts as soon as Tasks 4 and 5 are on `master`; at the latest Friday, October 23.
- Task 10 runs the content: both waves start their writers with the Workflow tool the day Task 9 is on `master`, each in its own worktree; wave `p5core` has its last rewrite on Sunday, November 1 and merges once Tasks 6, 7 and 8 are on `master` (at the latest Monday, November 2); wave `p5stretch` has its last rewrite on Tuesday, November 3 and merges after the Task 11 gate as a content-only follow-up, with a hard cut of Wednesday, November 4 at 18:00 local.
- Task 11 (the gate) runs right after the wave `p5core` merge, once Phase 4 Task 20 has released; at the latest Tuesday, November 3; Dani deploys after it and again after the wave `p5stretch` merge, by Friday, November 6.
- Tasks that edit one file run in a fixed order: `schemas/lab.ts` Tasks 4 and 5 in either order (different hunks, the second rebases); `src/app/lab.ts` and `tests/unit/lab.test.ts` Tasks 4, 6, 7, 8; `src/app/screens/Lab.tsx`, `tests/e2e/lab-helpers.ts` and `tests/e2e/labs.spec.ts` Tasks 6, 7, 8; `src/app/lab-keys.ts` Task 4 then 6 (`tests/unit/lab-keys.test.ts` has one editor, Task 6); every other file has one owner.
- `src/ui/base.css` needs no order among Phase 5 tasks: Task 4 inserts three empty anchors right after the Simulate rules and before `/* Incident */` (`/* Labs: Place */`, `/* Labs: Trace */`, `/* Labs: Investigate */`), and Tasks 6, 7 and 8 each write only under their own.
- Builders work in parallel git worktrees by engine: the Place worktree runs Task 1, then Task 4, then Task 6; the Trace worktree runs Task 2, then Task 7; the Investigate worktree runs Task 3, then Task 8; a fourth worktree `<scratchpad>/p5/wt/simulate` runs Task 5 and then Task 9; the controller runs Task 10 in `<scratchpad>/p5/wt-labs-core` and `<scratchpad>/p5/wt-labs-stretch`, and Task 11 on `master`.
- Dependency graph (Phase 4 tasks as P4-N):

```text
P4-1 ──┬── T1 Place model ──────┐
       ├── T2 Trace model ──────┼── T4 Register ──┬── T6 Place view ── T7 Trace view ── T8 Investigate view ──┐
       └── T3 Investigate model ┘        ▲        │                                                           │
P4-13, P4-17, P4-19 (merged) ────────────┤        │                                                           │
P4-13 ── T5 Simulate models (parallel with T4) ───┴── T9 Prompts v2 ── T10 writers, p5core and p5stretch      │
                                                                       T10 p5core merge (after T6 to T8) ◄────┘
P4-20 + T1..T9 + p5core merge ── T11 Gate ── T10 p5stretch merge (hard cut Wednesday, November 4, 18:00)
```

- The controller merges every Phase 5 branch into `master` through the one serialized merge chain it shares with Phase 4 and Phase 6, runs focused tests after each merge while other builds share the machine, and runs `pnpm verify` only in Task 11 and before the wave `p5stretch` merge, under the e2e lock.
- The 26-lab exit also needs Phase 4's five held Sort labs (`lab-m01-name-the-cloud-benefit`, `lab-m07-pick-the-database`, `lab-m10-which-tool`, `lab-m12-migration-strategy` and `lab-m13-specialized-service`, held by wave S and left out of 0.5.0); Phase 5 does not write them, so they ship only if Phase 4 recovers them before the Task 11 gate, and otherwise the gate takes its below-26 path, names them as missing core labs and leaves Lab Complete on `arrives`; the controller asks Dani by Friday, October 30 which of the two applies.
- Cut rule (spec 10.2): if time runs short, wave `p5stretch` is dropped first (at its hard cut, or earlier by Dani's call; Task 5 may then ship without its labs), then the whole of Phase 5 waits until after November 14; Phase 5 never delays Phase 4's 0.5.0 or 0.6.0.

---

## Task 1: The Place model

**Files:**
- Create: `schemas/lab-place.ts`, `src/labs/place/model.ts`, `tests/fixtures/lab-place.ts`, `tests/unit/lab-place.test.ts`, `tests/property/lab-place.property.test.ts`
- Test: `tests/unit/lab-place.test.ts`, `tests/property/lab-place.property.test.ts`

Builds on Phase 4 Task 1 (on `master`): `LabEngine`, `GoalResult`, `replayLab` and `allPass` from `src/labs/contract.ts`, `EngineEntry`, `AnyLabEngine` and `checkLab` from `src/labs/engines.ts`, `LabFile` from `schemas/lab.ts`, and the Biome purity override for `src/labs/**/*.ts`.
It creates new files only, so it starts at once in `<scratchpad>/p5/wt/place` on `p5/place`, never conflicts with Phase 4 or with Tasks 2 and 3, and merges at the latest by Wednesday, October 14.

Design notes:
- Place is spec 5.1's nested-containers board: a spec lists `containers` (Regions, zones, VPCs, subnets, a VPC edge, pipeline stages and at most one bench) linked by `parent`, the `pieces` Dani places, the `failures` Dani may preview, and `constraints` of four kinds, each tied to one goal.
- A container is a slot exactly when no other container names it as its parent; the bench is a top-level slot that takes the pieces Dani decides not to run, so a board with distractor pieces can still be finished, and R11 judges every wrong path on a finished board.
- `placeSlots` lists the slots depth-first with each container's children in spec order and the bench last, whatever order the spec lists its containers in; that one order drives the slot numbers on screen, the `1` to `0` keys and the rendered map, so the schema needs no listing-order rules.
- The four constraint kinds are `in` (every listed piece sits in or below one of the `within` containers), `survive` (under every listed failure, at least `min` listed pieces run outside the failed container), `public` (every listed piece is reachable from the internet) and `private` (every listed piece runs in a subnet and is not reachable).
- Reachable is exactly the VPC lesson: the piece's nearest subnet holds a running piece with role `public-route`, and that subnet's nearest VPC holds, outside every subnet, a running piece with role `internet-gateway`; so "gateway attached but no route" and "database in a public subnet" each fail for their own reason.
- `check` tests survival under every listed failure and never reads `state.failed`; the `fail` and `restore` actions only preview one failure on the board, so a board that survives only the zone Dani happened to toggle never passes, and R11's checks never depend on a preview.
- A goal's message counts constraints (`2 of 3 checks pass`, `1 of 1 check passes`), not pieces, because a `survive` constraint judges a set of pieces and gives no verdict per piece; this deviates from P5-027, the hint still names the failed zone (`Down when Oven Row A fails.`), and Task 11 records the deviation as a spec NOTE.
- The zod schemas live in `schemas/lab-place.ts`, which redeclares the goal-id rule as a local `GoalRef`, because `schemas/lab.ts` imports this file once Task 4 adds it to `LAB_SCHEMAS`, so importing `GoalId` from `schemas/lab.ts` would make an import cycle; the model imports its types with `import type` only.
- The state keeps the spec's piece, slot and failure ids, so `reduce` rejects an unknown id or a no-op on its own and returns the very same state object, as Phase 4's contract asks.
- `placeComplete` is true when no piece is left in the tray (the bench counts as placed); Task 4 registers `place: { engine: PLACE as unknown as AnyLabEngine, settle: [], complete: (spec, state) => placeComplete(spec as PlaceSpec, state as PlaceState) }`.
- `tests/fixtures/lab-place.ts` is the worked example for the Place engine: a made-up bakery with two oven rows, a VPC edge and a bench, whose solution and three wrong paths the unit, property and (in Task 4) R11 tests replay, and which Task 6's end-to-end tests serve as a synthetic lab; it holds no course text.
- `bakeryPlaceLab` returns a `PlaceLabFile`, which is `LabFile` with `engine: 'place'`, because `LAB_ENGINES` gains `place` only in Task 4 and `engine: 'place'` does not type-check as a `LabFile` before then; once Task 4 lands, every `PlaceLabFile` is assignable to `LabFile`, so Task 4's R11 tests pass it to `labProblems` without a cast.
- Covers P5-008, P5-012, P5-013, P5-014, P5-015, P5-016 (Place), P5-018 (Place), P5-020, P5-021 to P5-028, P5-084 (Place), P5-085 (Place), P5-086 (Place), P5-087 (Place).

- [ ] **Step 1: Write the failing tests**

Create `tests/fixtures/lab-place.ts`:

```ts
import type { LabFile } from '../../schemas/lab.ts';
import type { PlaceAction, PlaceSpec } from '../../schemas/lab-place.ts';

/** A made-up bakery Place board (the worked example for the Place engine); no course text. */
export const PLACE_SPEC: PlaceSpec = {
  containers: [
    { id: 'flourtown', label: 'Flourtown', kind: 'region' },
    { id: 'bakery-network', label: 'Bakery network', kind: 'vpc', parent: 'flourtown' },
    {
      id: 'bakery-edge',
      label: 'Network edge',
      kind: 'edge',
      parent: 'bakery-network',
      detail: 'Where the bakery network meets the street.',
    },
    { id: 'oven-row-a', label: 'Oven Row A', kind: 'az', parent: 'bakery-network' },
    { id: 'public-a', label: 'Public subnet A', kind: 'subnet', parent: 'oven-row-a' },
    { id: 'private-a', label: 'Private subnet A', kind: 'subnet', parent: 'oven-row-a' },
    { id: 'oven-row-b', label: 'Oven Row B', kind: 'az', parent: 'bakery-network' },
    { id: 'public-b', label: 'Public subnet B', kind: 'subnet', parent: 'oven-row-b' },
    { id: 'private-b', label: 'Private subnet B', kind: 'subnet', parent: 'oven-row-b' },
    { id: 'not-used', label: 'Not used', kind: 'bench' },
  ],
  pieces: [
    { id: 'front-one', label: 'First shop front', detail: 'Takes the online cake orders.' },
    { id: 'front-two', label: 'Second shop front', detail: 'Takes the same orders as the first.' },
    { id: 'recipes-one', label: 'Recipe store', detail: 'Holds the secret recipes.' },
    { id: 'recipes-two', label: 'Recipe store copy', detail: 'A standby copy of the recipe store.' },
    { id: 'gateway', label: 'Internet gateway', role: 'internet-gateway' },
    { id: 'route-a', label: 'Public route A', role: 'public-route' },
    { id: 'route-b', label: 'Public route B', role: 'public-route' },
    { id: 'mixer', label: 'Spare mixer', detail: 'Nothing on the board needs it.' },
  ],
  failures: ['oven-row-a', 'oven-row-b'],
  constraints: [
    { kind: 'public', goal: 'g1', pieces: ['front-one', 'front-two'] },
    { kind: 'private', goal: 'g2', pieces: ['recipes-one', 'recipes-two'] },
    { kind: 'survive', goal: 'g3', pieces: ['front-one', 'front-two'], min: 1 },
    { kind: 'survive', goal: 'g3', pieces: ['recipes-one', 'recipes-two'], min: 1 },
    { kind: 'in', goal: 'g3', pieces: ['mixer'], within: ['not-used'] },
  ],
};

const place = (piece: string, slot: string): PlaceAction => ({ t: 'place', piece, slot });

/** The solution: a gateway on the edge, a route and a shop front in each public subnet, a recipe store in each private one. */
export const PLACE_SOLUTION: PlaceAction[] = [
  place('gateway', 'bakery-edge'),
  place('route-a', 'public-a'),
  place('front-one', 'public-a'),
  place('recipes-one', 'private-a'),
  place('route-b', 'public-b'),
  place('front-two', 'public-b'),
  place('recipes-two', 'private-b'),
  place('mixer', 'not-used'),
];

/** The solution with some pieces moved: a finished board with one mistake. */
const moved = (...moves: PlaceAction[]): PlaceAction[] => [...PLACE_SOLUTION, ...moves];

/** A lab file on the Place engine; once Task 4 adds `place` to `LAB_ENGINES`, every `PlaceLabFile` is a `LabFile`. */
export type PlaceLabFile = Omit<LabFile, 'engine'> & { engine: 'place' };

/** A complete Place lab: keep the shop fronts open and the recipes private while one oven row is down. */
export function bakeryPlaceLab(over: Partial<PlaceLabFile> = {}): PlaceLabFile {
  return {
    id: 'lab-m01-bakery-ovens',
    module: 1,
    title: 'Keep the ovens baking',
    engine: 'place',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 8,
    brief:
      'The bakery runs two shop fronts and a recipe store in its own network. Customers reach a piece only through a public route in its subnet and a gateway on the network edge, and either oven row can go dark at any time.',
    spec: PLACE_SPEC,
    goals: [
      {
        id: 'g1',
        label: 'Customers reach both shop fronts',
        hint: 'A shop front needs a public route in its own subnet and a gateway on the network edge.',
      },
      {
        id: 'g2',
        label: 'The recipes stay private',
        hint: 'A recipe store belongs in a subnet that has no public route.',
      },
      {
        id: 'g3',
        label: 'One oven row can go dark',
        hint: 'Spread each pair over both oven rows, and leave what nobody needs on the bench.',
      },
    ],
    solution: PLACE_SOLUTION,
    wrongPaths: [
      {
        actions: moved(place('gateway', 'not-used')),
        failsGoal: 'g1',
        mistake: 'Leaves the internet gateway on the bench',
      },
      {
        actions: moved(place('recipes-one', 'public-a')),
        failsGoal: 'g2',
        mistake: 'Puts the recipe store in a public subnet',
      },
      {
        actions: moved(place('front-two', 'public-a')),
        failsGoal: 'g3',
        mistake: 'Runs both shop fronts in Oven Row A',
      },
    ],
    debrief: {
      lines: [
        'A shop front in each oven row keeps the orders coming when one row goes dark.',
        'A recipe store with no public route in its subnet stays out of reach from the street.',
      ],
      questions: ['q-b4k7m2', 'q-d9p4r6'],
    },
    ...over,
  };
}
```

Create `tests/unit/lab-place.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PlaceAction, PlaceSpec } from '../../schemas/lab-place.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { type AnyLabEngine, checkLab, type EngineEntry } from '../../src/labs/engines.ts';
import {
  isDown,
  PLACE,
  type PlaceState,
  placeComplete,
  placeGoals,
  placeSlots,
  reachable,
  running,
} from '../../src/labs/place/model.ts';
import { bakeryPlaceLab, PLACE_SOLUTION, PLACE_SPEC } from '../fixtures/lab-place.ts';

const issues = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => (result.error?.issues ?? []).map((i) => `${i.path.map(String).join('.')}: ${i.message}`);
const place = (piece: string, slot: string): PlaceAction => ({ t: 'place', piece, slot });
const play = (actions: readonly PlaceAction[], spec: PlaceSpec = PLACE_SPEC): PlaceState =>
  replayLab(PLACE, spec, actions as PlaceAction[]);
const messages = (actions: readonly PlaceAction[], spec: PlaceSpec = PLACE_SPEC): string[] =>
  PLACE.check(spec, play(actions, spec)).map((r) => `${r.goalId} ${r.pass ? 'pass' : 'fail'} ${r.message}`);
/** The fixture board with only these constraints, so one constraint can be judged alone. */
const only = (...constraints: PlaceSpec['constraints']): PlaceSpec => ({ ...PLACE_SPEC, constraints });
const passes = (spec: PlaceSpec, actions: readonly PlaceAction[]): boolean =>
  allPass(PLACE.check(spec, play(actions, spec)));
const [GATEWAY_ON_BENCH, RECIPES_IN_PUBLIC, FRONTS_IN_ONE_ROW] = bakeryPlaceLab().wrongPaths;

describe('Place spec schema (spec 5.1)', () => {
  it('accepts the bakery spec and its solution actions, and rejects junk actions', () => {
    expect(PlaceSpec.safeParse(PLACE_SPEC).success).toBe(true);
    expect(PLACE_SOLUTION.every((a) => PlaceAction.safeParse(a).success)).toBe(true);
    expect(PlaceAction.safeParse({ t: 'drag', piece: 'mixer' }).success).toBe(false);
    expect(issues(PlaceAction.safeParse({ t: 'place', piece: 'mixer' }))).toEqual([
      'slot: Invalid input: expected string, received undefined',
    ]);
  });

  it('defaults failures to none and survive to one running piece', () => {
    const { failures: _, ...rest } = PLACE_SPEC;
    const constraints = [{ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'] }];
    const parsed = PlaceSpec.parse({ ...rest, constraints });
    expect(parsed.failures).toEqual([]);
    expect(parsed.constraints).toEqual([
      { kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'], min: 1 },
    ]);
  });

  it('rejects repeated container and piece ids', () => {
    const copy = { id: 'private-b', label: 'Spare subnet', kind: 'subnet', parent: 'oven-row-b' } as const;
    expect(
      issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...PLACE_SPEC.containers, copy] })),
    ).toEqual(['containers.10.id: container private-b is used twice']);
    const pieces = [...PLACE_SPEC.pieces, { id: 'mixer', label: 'Mixer again' }];
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, pieces }))).toEqual([
      'pieces.8.id: piece mixer is used twice',
    ]);
  });

  it('rejects an unknown parent and a parent cycle', () => {
    const lost = PLACE_SPEC.containers.map((c) => (c.id === 'public-a' ? { ...c, parent: 'oven-row-c' } : c));
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: lost }))).toEqual([
      'containers.4.parent: names no container: oven-row-c',
    ]);
    const loop = PLACE_SPEC.containers.map((c) =>
      c.id === 'flourtown' ? { ...c, parent: 'bakery-network' } : c,
    );
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: loop }))).toEqual([
      'containers.0.parent: container flourtown is its own ancestor',
      'containers.1.parent: container bakery-network is its own ancestor',
    ]);
  });

  it('keeps one bench at the top that holds no container, and needs another slot', () => {
    const containers = PLACE_SPEC.containers;
    const shelf = { id: 'shelf', label: 'Shelf', kind: 'bench' } as const;
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...containers, shelf] }))).toEqual([
      'containers.10.kind: only one bench is allowed',
    ]);
    const hung = containers.map((c) => (c.kind === 'bench' ? { ...c, parent: 'flourtown' } : c));
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: hung }))).toEqual([
      'containers.9.parent: the bench cannot have a parent',
    ]);
    const drawer = { id: 'drawer', label: 'Drawer', kind: 'stage', parent: 'not-used' } as const;
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...containers, drawer] }))).toEqual([
      'containers.10.parent: the bench cannot hold containers',
    ]);
    const rows = [
      { id: 'oven-row-a', label: 'Oven Row A', kind: 'az', parent: 'oven-row-b' },
      { id: 'oven-row-b', label: 'Oven Row B', kind: 'az', parent: 'oven-row-a' },
      { id: 'not-used', label: 'Not used', kind: 'bench' },
    ];
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: rows }))).toEqual([
      'containers.0.parent: container oven-row-a is its own ancestor',
      'containers.1.parent: container oven-row-b is its own ancestor',
      'containers: needs a slot that is not the bench',
    ]);
  });

  it('rejects a subnet with no vpc above it', () => {
    const loose = { id: 'loose', label: 'Loose subnet', kind: 'subnet', parent: 'flourtown' } as const;
    expect(
      issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...PLACE_SPEC.containers, loose] })),
    ).toEqual(['containers.10: subnet loose needs a vpc above it']);
    const { parent: _, ...top } = loose;
    expect(
      issues(PlaceSpec.safeParse({ ...PLACE_SPEC, containers: [...PLACE_SPEC.containers, top] })),
    ).toEqual(['containers.10: subnet loose needs a vpc above it']);
  });

  it('rejects failures that name no container, repeat one or fail the bench', () => {
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, failures: ['oven-row-c'] }))).toEqual([
      'failures.0: names no container: oven-row-c',
    ]);
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, failures: ['oven-row-a', 'oven-row-a'] }))).toEqual([
      'failures.1: lists oven-row-a twice',
    ]);
    expect(issues(PlaceSpec.safeParse({ ...PLACE_SPEC, failures: ['not-used'] }))).toEqual([
      'failures.0: cannot fail the bench',
    ]);
  });

  it('rejects constraints that name no piece or container, repeat one, or ask for more than they list', () => {
    const pub = { kind: 'public', goal: 'g1' } as const;
    expect(issues(PlaceSpec.safeParse(only({ ...pub, pieces: ['front-one', 'front-three'] })))).toEqual([
      'constraints.0.pieces.1: names no piece: front-three',
    ]);
    expect(issues(PlaceSpec.safeParse(only({ ...pub, pieces: ['front-one', 'front-one'] })))).toEqual([
      'constraints.0.pieces.1: lists front-one twice',
    ]);
    const bin = { kind: 'in', goal: 'g1' } as const;
    expect(
      issues(PlaceSpec.safeParse(only({ ...bin, pieces: ['mixer'], within: ['not-used', 'shelf'] }))),
    ).toEqual(['constraints.0.within.1: names no container: shelf']);
    expect(
      issues(PlaceSpec.safeParse(only({ ...bin, pieces: ['mixer'], within: ['not-used', 'not-used'] }))),
    ).toEqual(['constraints.0.within.1: lists not-used twice']);
    const greedy = only({ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'], min: 3 });
    expect(issues(PlaceSpec.safeParse(greedy))).toEqual([
      'constraints.0.min: asks for 3 running but lists only 2',
    ]);
  });
});

describe('the Place checker (spec 5.1, 9)', () => {
  it('fails every goal on the starting board and passes every goal with the solution', () => {
    expect(messages([])).toEqual([
      'g1 fail 0 of 1 check passes',
      'g2 fail 0 of 1 check passes',
      'g3 fail 0 of 3 checks pass',
    ]);
    expect(messages(PLACE_SOLUTION)).toEqual([
      'g1 pass 1 of 1 check passes',
      'g2 pass 1 of 1 check passes',
      'g3 pass 3 of 3 checks pass',
    ]);
  });

  it('fails exactly the goal each wrong path names, on a finished board', () => {
    for (const path of [GATEWAY_ON_BENCH, RECIPES_IN_PUBLIC, FRONTS_IN_ONE_ROW]) {
      if (path === undefined) throw new Error('three wrong paths');
      const state = play(path.actions as PlaceAction[]);
      expect(placeComplete(PLACE_SPEC, state)).toBe(true);
      expect(
        PLACE.check(PLACE_SPEC, state)
          .filter((r) => !r.pass)
          .map((r) => r.goalId),
      ).toEqual([path.failsGoal]);
    }
  });

  it('numbers the slots depth-first with the bench last, whatever order the spec lists them in', () => {
    const slots = ['bakery-edge', 'public-a', 'private-a', 'public-b', 'private-b', 'not-used'];
    expect(placeSlots(PLACE_SPEC)).toEqual(slots);
    const byId = new Map(PLACE_SPEC.containers.map((c) => [c.id, c]));
    const breadthFirst = [
      'not-used',
      'flourtown',
      'bakery-network',
      'bakery-edge',
      'oven-row-a',
      'oven-row-b',
    ]
      .concat(['public-a', 'private-a', 'public-b', 'private-b'])
      .map((id) => byId.get(id))
      .filter((c) => c !== undefined);
    expect(placeSlots({ ...PLACE_SPEC, containers: breadthFirst })).toEqual(slots);
    expect(PLACE.init(PLACE_SPEC).slots).toEqual(slots);
  });

  it('lists goals in the order the constraints first name them', () => {
    const [g1, g2, g3a, g3b, g3c] = PLACE_SPEC.constraints;
    if (g1 === undefined || g2 === undefined || g3a === undefined || g3b === undefined || g3c === undefined)
      throw new Error('five constraints');
    expect(placeGoals(only(g3a, g1, g3b, g2, g3c))).toEqual(['g3', 'g1', 'g2']);
    expect(PLACE.check(only(g3a, g1, g3b, g2, g3c), play([])).map((r) => r.goalId)).toEqual([
      'g3',
      'g1',
      'g2',
    ]);
  });

  it('passes an in constraint below a listed container, never in a sibling, and on the bench only when named', () => {
    const inVpc = only({ kind: 'in', goal: 'g1', pieces: ['mixer'], within: ['bakery-network'] });
    const inRowB = only({ kind: 'in', goal: 'g1', pieces: ['mixer'], within: ['oven-row-b'] });
    const onBench = only({ kind: 'in', goal: 'g1', pieces: ['mixer'], within: ['not-used'] });
    expect(passes(inVpc, [place('mixer', 'public-a')])).toBe(true);
    expect(passes(inRowB, [place('mixer', 'public-a')])).toBe(false);
    expect(PLACE.hint(inRowB, play([place('mixer', 'public-a')], inRowB), 'g1')).toBe(
      'Spare mixer is not where this goal needs it.',
    );
    expect(passes(inVpc, [place('mixer', 'not-used')])).toBe(false);
    expect(passes(onBench, [place('mixer', 'not-used')])).toBe(true);
  });

  const fronts = only({ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'], min: 1 });
  const three = only({ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two', 'mixer'], min: 2 });
  it.each([
    ['both in Oven Row A', fronts, ['public-a', 'private-a'], 'Down when Oven Row A fails.'],
    ['both in Oven Row B', fronts, ['public-b', 'private-b'], 'Down when Oven Row B fails.'],
    ['one in each row', fronts, ['public-a', 'private-b'], 'Every check of this goal passes.'],
    ['one on the bench, one in Oven Row A', fronts, ['not-used', 'public-a'], 'Down when Oven Row A fails.'],
    [
      'min 2, two of three in Oven Row B',
      three,
      ['public-a', 'public-b', 'private-b'],
      'Down when Oven Row B fails.',
    ],
    [
      'min 2, one per row and one on the edge',
      three,
      ['public-a', 'public-b', 'bakery-edge'],
      'Every check of this goal passes.',
    ],
    ['min 2, two on the bench', three, ['not-used', 'not-used', 'public-a'], 'Too few of them are running.'],
  ])('survive with %s', (_, spec, slots, hint) => {
    const pieces = ['front-one', 'front-two', 'mixer'];
    const actions = slots.map((slot, i) => place(pieces[i] ?? '', slot));
    expect(PLACE.hint(spec, play(actions, spec), 'g1')).toBe(hint);
    expect(passes(spec, actions)).toBe(hint === 'Every check of this goal passes.');
  });

  it('counts running pieces only when no failure is listed', () => {
    const spec = {
      ...only({ kind: 'survive', goal: 'g1', pieces: ['front-one', 'front-two'], min: 2 }),
      failures: [],
    };
    expect(passes(spec, [place('front-one', 'public-a'), place('front-two', 'public-a')])).toBe(true);
    const benched = [place('front-one', 'public-a'), place('front-two', 'not-used')];
    expect(passes(spec, benched)).toBe(false);
    expect(PLACE.hint(spec, play(benched, spec), 'g1')).toBe('Too few of them are running.');
  });

  it('reaches a piece through a public route in its subnet and a gateway on the VPC edge', () => {
    const solved = play(PLACE_SOLUTION);
    expect(reachable(PLACE_SPEC, solved, 'front-one')).toBe(true);
    expect(reachable(PLACE_SPEC, solved, 'recipes-one')).toBe(false);
    const noRoute = play([...PLACE_SOLUTION, { t: 'unplace', piece: 'route-a' }]);
    expect(reachable(PLACE_SPEC, noRoute, 'front-one')).toBe(false);
    expect(reachable(PLACE_SPEC, noRoute, 'front-two')).toBe(true);
    expect(PLACE.hint(PLACE_SPEC, noRoute, 'g1')).toBe('Customers cannot reach First shop front.');
    const gatewayInSubnet = play([...PLACE_SOLUTION, place('gateway', 'public-a')]);
    expect(reachable(PLACE_SPEC, gatewayInSubnet, 'front-one')).toBe(false);
    expect(PLACE.hint(PLACE_SPEC, gatewayInSubnet, 'g1')).toBe('Customers cannot reach First shop front.');
  });

  it.each([
    ['in a public subnet', place('recipes-one', 'public-a'), 'The internet can reach Recipe store.'],
    ['on the bench', place('recipes-one', 'not-used'), 'Recipe store is not running.'],
    ['in the VPC edge slot', place('recipes-one', 'bakery-edge'), 'Recipe store is not in a subnet.'],
    ['in the tray', { t: 'unplace', piece: 'recipes-one' } as const, 'Recipe store is still in the tray.'],
  ])('fails private with the recipe store %s', (_, move, hint) => {
    const state = play([...PLACE_SOLUTION, move]);
    expect(PLACE.check(PLACE_SPEC, state).find((r) => r.goalId === 'g2')?.pass).toBe(false);
    expect(PLACE.hint(PLACE_SPEC, state, 'g2')).toBe(hint);
  });

  it('names the failed oven row and the stray piece in the hint, and says when a goal passes', () => {
    const rowA = play(FRONTS_IN_ONE_ROW?.actions as PlaceAction[]);
    expect(PLACE.hint(PLACE_SPEC, rowA, 'g3')).toBe('Down when Oven Row A fails.');
    const stray = play([...PLACE_SOLUTION, place('mixer', 'public-b')]);
    expect(PLACE.hint(PLACE_SPEC, stray, 'g3')).toBe('Spare mixer is not where this goal needs it.');
    expect(PLACE.hint(PLACE_SPEC, play(PLACE_SOLUTION), 'g1')).toBe('Every check of this goal passes.');
  });

  it('previews a failure without changing any check, and reset returns the starting board', () => {
    const solved = play(PLACE_SOLUTION);
    const down = PLACE.reduce(solved, { t: 'fail', container: 'oven-row-a' });
    expect(down.failed).toBe('oven-row-a');
    expect(isDown(PLACE_SPEC, 'public-a', 'oven-row-a')).toBe(true);
    expect(isDown(PLACE_SPEC, 'public-b', 'oven-row-a')).toBe(false);
    expect(PLACE.check(PLACE_SPEC, down)).toEqual(PLACE.check(PLACE_SPEC, solved));
    const back = PLACE.reduce(down, { t: 'restore' });
    expect(back.failed).toBeNull();
    expect(PLACE.check(PLACE_SPEC, back)).toEqual(PLACE.check(PLACE_SPEC, solved));
    expect(PLACE.reduce(down, { t: 'reset' })).toEqual(PLACE.init(PLACE_SPEC));
    const start = PLACE.init(PLACE_SPEC);
    expect(PLACE.reduce(start, { t: 'reset' })).toBe(start);
  });

  it('returns the very same state for unknown ids, non-failures, repeats and junk', () => {
    const state = play([place('mixer', 'not-used')]);
    const failed = PLACE.reduce(state, { t: 'fail', container: 'oven-row-b' });
    for (const junk of [
      place('rolling-pin', 'public-a'),
      place('front-one', 'oven-row-a'),
      place('mixer', 'not-used'),
      { t: 'unplace', piece: 'front-one' },
      { t: 'fail', container: 'public-a' },
      { t: 'fail', container: 'not-used' },
      { t: 'restore' },
      { t: 'knead' },
      null,
      'place',
      [place('front-one', 'public-a')],
    ]) {
      expect(PLACE.reduce(state, junk as PlaceAction)).toBe(state);
    }
    expect(PLACE.reduce(failed, { t: 'fail', container: 'oven-row-b' })).toBe(failed);
  });

  it('is complete only when no piece is left in the tray, the bench included', () => {
    expect(placeComplete(PLACE_SPEC, play(PLACE_SOLUTION.slice(0, -1)))).toBe(false);
    expect(placeComplete(PLACE_SPEC, play(PLACE_SOLUTION))).toBe(true);
    expect(running(PLACE_SPEC, play(PLACE_SOLUTION), 'mixer')).toBe(false);
    expect(running(PLACE_SPEC, play(PLACE_SOLUTION), 'gateway')).toBe(true);
  });

  it('checks the same through a registry entry built like the real one', () => {
    const entry: EngineEntry = {
      engine: PLACE as unknown as AnyLabEngine,
      settle: [],
      complete: (spec, state) => placeComplete(spec as PlaceSpec, state as PlaceState),
    };
    for (const actions of [[], PLACE_SOLUTION, FRONTS_IN_ONE_ROW?.actions as PlaceAction[]]) {
      const state = play(actions);
      expect(checkLab(entry, PLACE_SPEC, state)).toEqual(PLACE.check(PLACE_SPEC, state));
    }
    expect(entry.complete(PLACE_SPEC, play(PLACE_SOLUTION))).toBe(true);
  });
});
```

Create `tests/property/lab-place.property.test.ts`:

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { PlaceAction, PlaceSpec } from '../../schemas/lab-place.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { replayLab } from '../../src/labs/contract.ts';
import { PLACE, placeGoals, placeSlots } from '../../src/labs/place/model.ts';
import { PLACE_SPEC } from '../fixtures/lab-place.ts';

/** The Place reducer (spec 5.1, 9): any action sequence never throws, replays the same and checks purely. */
const RUNS = { seed: 20_261_031, numRuns: 200 };

const PIECES = PLACE_SPEC.pieces.map((p) => p.id);
const SLOTS = placeSlots(PLACE_SPEC);
const pieceArb = fc.constantFrom(...PIECES, 'rolling-pin', '');
const slotArb = fc.constantFrom(...SLOTS, 'oven-row-a', 'bakery-network', 'bread-van');
const failureArb = fc.constantFrom(...PLACE_SPEC.failures, 'public-a', 'not-used', 'bread-van');
const previewArb: fc.Arbitrary<PlaceAction> = fc.oneof(
  failureArb.map((container) => ({ t: 'fail', container }) as const),
  fc.constant({ t: 'restore' } as const),
);
const actionArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.record({ t: fc.constant('place'), piece: pieceArb, slot: slotArb }),
  fc.record({ t: fc.constant('unplace'), piece: pieceArb }),
  previewArb,
  fc.constant({ t: 'reset' }),
  fc.anything(),
);
/** Actions whose ids the spec does not know, or a failure the spec does not list. */
const rejectedArb: fc.Arbitrary<PlaceAction> = fc.oneof(
  fc.record({ t: fc.constant('place' as const), piece: fc.constantFrom('rolling-pin', ''), slot: slotArb }),
  fc.record({
    t: fc.constant('place' as const),
    piece: pieceArb,
    slot: fc.constantFrom('oven-row-a', 'bread-van'),
  }),
  fc.record({ t: fc.constant('unplace' as const), piece: fc.constantFrom('rolling-pin', '') }),
  fc.record({
    t: fc.constant('fail' as const),
    container: fc.constantFrom('public-a', 'not-used', 'bread-van'),
  }),
);
/** A board built by placing known pieces in known slots, or taking them back. */
const boardArb: fc.Arbitrary<PlaceAction[]> = fc
  .array(fc.record({ piece: fc.constantFrom(...PIECES), slot: fc.constantFrom(...SLOTS, null) }), {
    maxLength: 16,
  })
  .map((rows) =>
    rows.map(
      ({ piece, slot }): PlaceAction =>
        slot === null ? { t: 'unplace', piece } : { t: 'place', piece, slot },
    ),
  );
const play = (actions: readonly unknown[], spec: PlaceSpec = PLACE_SPEC) =>
  replayLab(PLACE, spec, actions as PlaceAction[]);
const parentOf = new Map(PLACE_SPEC.containers.map((c) => [c.id, c.parent]));
const kindOf = new Map(PLACE_SPEC.containers.map((c) => [c.id, c.kind]));
/** True when the slot is a subnet or has one above it, walked here without the model. */
function subnetAbove(slot: string): boolean {
  for (let at: string | undefined = slot; at !== undefined; at = parentOf.get(at))
    if (kindOf.get(at) === 'subnet') return true;
  return false;
}

describe('the Place reducer', () => {
  it('never throws, is deterministic and checks purely', () => {
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 40 }), (actions) => {
        const once = play(actions);
        const twice = play(actions);
        expect(toPlain(once)).toEqual(toPlain(twice));
        const before = toPlain(once);
        const first = PLACE.check(PLACE_SPEC, once);
        expect(PLACE.check(PLACE_SPEC, once)).toEqual(first);
        expect(toPlain(once)).toEqual(before);
        expect(first.map((r) => r.goalId)).toEqual(placeGoals(PLACE_SPEC));
      }),
      RUNS,
    );
  });

  it('rejected actions return the same state', () => {
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 20 }), rejectedArb, (actions, rejected) => {
        const state = play(actions);
        expect(PLACE.reduce(state, rejected)).toBe(state);
      }),
      RUNS,
    );
  });

  it('survival is the same whatever failure is previewed', () => {
    fc.assert(
      fc.property(boardArb, fc.nat(), previewArb, (board, at, preview) => {
        const cut = at % (board.length + 1);
        const previewed = [...board.slice(0, cut), preview, ...board.slice(cut)];
        expect(PLACE.check(PLACE_SPEC, play(previewed))).toEqual(PLACE.check(PLACE_SPEC, play(board)));
      }),
      RUNS,
    );
  });

  it('survival under every failure equals survival under each failure alone', () => {
    const survive: PlaceSpec['constraints'] = [
      ...PLACE_SPEC.constraints.filter((c) => c.kind === 'survive'),
      {
        kind: 'survive',
        goal: 'g1',
        pieces: ['front-one', 'front-two', 'recipes-one', 'recipes-two'],
        min: 2,
      },
    ];
    fc.assert(
      fc.property(boardArb, (board) => {
        for (const c of survive) {
          const alone: PlaceSpec = { ...PLACE_SPEC, constraints: [{ ...c, goal: 'g1' }] };
          const state = play(board, alone);
          const all = PLACE.check(alone, state)[0]?.pass;
          const each = alone.failures.every((f) => PLACE.check({ ...alone, failures: [f] }, state)[0]?.pass);
          expect(all).toBe(each);
        }
      }),
      RUNS,
    );
  });

  it('a passing private constraint has a subnet above each of its pieces', () => {
    fc.assert(
      fc.property(boardArb, fc.subarray(PIECES, { minLength: 1 }), (board, pieces) => {
        const spec: PlaceSpec = { ...PLACE_SPEC, constraints: [{ kind: 'private', goal: 'g1', pieces }] };
        const state = play(board, spec);
        if (PLACE.check(spec, state)[0]?.pass !== true) return;
        for (const piece of pieces) expect(subnetAbove(state.placed[piece] ?? '')).toBe(true);
      }),
      RUNS,
    );
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/lab-place.test.ts tests/property/lab-place.property.test.ts 2>&1 | grep -E "FAIL|Error:|Test Files"
```

Expected: `Test Files  2 failed (2)`, with `tests/unit/lab-place.test.ts` failing on `Error: Cannot find module '../../schemas/lab-place.ts' imported from .../tests/unit/lab-place.test.ts` and `tests/property/lab-place.property.test.ts` failing on `Error: Cannot find module '../../src/labs/place/model.ts' imported from .../tests/property/lab-place.property.test.ts`, since neither file exists yet.

- [ ] **Step 3: Add the Place spec and action schemas**

Create `schemas/lab-place.ts`:

```ts
import { z } from 'zod';
import { Slug } from './common.ts';

/** A goal reference, the same rule as `GoalId` in `schemas/lab.ts`, which imports this file. */
const GoalRef = z.string().regex(/^g[1-9]$/, 'must look like g1');
const Pieces = z.array(Slug).min(1).max(8);

/** Container kinds (spec 5.1): nested Regions, zones, VPCs and subnets, a VPC edge, pipeline stages and one bench. */
export const PLACE_KINDS = ['region', 'az', 'vpc', 'subnet', 'edge', 'stage', 'bench'] as const;
/** Piece roles the reachability rule reads: the gateway on the VPC edge and the route in a public subnet. */
export const PIECE_ROLES = ['internet-gateway', 'public-route'] as const;

type Issue = { path: (string | number)[]; message: string };

/** Every reference check of a Place spec, in the order the spec reads; each issue carries its path. */
function placeIssues(spec: {
  containers: readonly { id: string; kind: string; parent?: string | undefined }[];
  pieces: readonly { id: string }[];
  failures: readonly string[];
  constraints: readonly ({ kind: string; pieces: readonly string[] } & {
    within?: readonly string[];
    min?: number;
  })[];
}): Issue[] {
  const out: Issue[] = [];
  const byId = new Map<string, { id: string; kind: string; parent?: string | undefined }>();
  for (const [i, c] of spec.containers.entries()) {
    if (byId.has(c.id))
      out.push({ path: ['containers', i, 'id'], message: `container ${c.id} is used twice` });
    else byId.set(c.id, c);
  }
  const pieces = new Set<string>();
  for (const [i, p] of spec.pieces.entries()) {
    if (pieces.has(p.id)) out.push({ path: ['pieces', i, 'id'], message: `piece ${p.id} is used twice` });
    pieces.add(p.id);
  }
  const parents = new Set(spec.containers.flatMap((c) => (c.parent === undefined ? [] : [c.parent])));
  const bench = spec.containers.find((c) => c.kind === 'bench');
  let benches = 0;
  for (const [i, c] of spec.containers.entries()) {
    if (c.kind === 'bench') {
      benches += 1;
      if (benches > 1) out.push({ path: ['containers', i, 'kind'], message: 'only one bench is allowed' });
      if (c.parent !== undefined)
        out.push({ path: ['containers', i, 'parent'], message: 'the bench cannot have a parent' });
    }
    if (c.parent === undefined) {
      if (c.kind === 'subnet')
        out.push({ path: ['containers', i], message: `subnet ${c.id} needs a vpc above it` });
      continue;
    }
    if (!byId.has(c.parent)) {
      out.push({ path: ['containers', i, 'parent'], message: `names no container: ${c.parent}` });
      continue;
    }
    if (bench !== undefined && c.parent === bench.id && c.kind !== 'bench')
      out.push({ path: ['containers', i, 'parent'], message: 'the bench cannot hold containers' });
    const seen = new Set<string>();
    let up = byId.get(c.parent);
    let vpc = false;
    let cycle = false;
    while (up !== undefined && !seen.has(up.id)) {
      if (up.id === c.id) {
        cycle = true;
        break;
      }
      if (up.kind === 'vpc') vpc = true;
      seen.add(up.id);
      up = up.parent === undefined ? undefined : byId.get(up.parent);
    }
    if (cycle)
      out.push({ path: ['containers', i, 'parent'], message: `container ${c.id} is its own ancestor` });
    else if (c.kind === 'subnet' && !vpc)
      out.push({ path: ['containers', i], message: `subnet ${c.id} needs a vpc above it` });
  }
  if (!spec.containers.some((c) => c.kind !== 'bench' && !parents.has(c.id)))
    out.push({ path: ['containers'], message: 'needs a slot that is not the bench' });
  const list = (
    ids: readonly string[],
    where: (string | number)[],
    known: (id: string) => boolean,
    noun: string,
  ) => {
    const seen = new Set<string>();
    for (const [k, id] of ids.entries()) {
      if (!known(id)) out.push({ path: [...where, k], message: `names no ${noun}: ${id}` });
      else if (seen.has(id)) out.push({ path: [...where, k], message: `lists ${id} twice` });
      seen.add(id);
    }
  };
  list(spec.failures, ['failures'], (id) => byId.has(id), 'container');
  for (const [k, id] of spec.failures.entries())
    if (byId.get(id)?.kind === 'bench') out.push({ path: ['failures', k], message: 'cannot fail the bench' });
  for (const [i, c] of spec.constraints.entries()) {
    list(c.pieces, ['constraints', i, 'pieces'], (id) => pieces.has(id), 'piece');
    if (c.within !== undefined)
      list(c.within, ['constraints', i, 'within'], (id) => byId.has(id), 'container');
    if (c.min !== undefined && c.min > c.pieces.length)
      out.push({
        path: ['constraints', i, 'min'],
        message: `asks for ${c.min} running but lists only ${c.pieces.length}`,
      });
  }
  return out;
}

/** Place (spec 5.1): pieces go into the slots of nested containers; constraints judge where they sit and what survives. */
export const PlaceSpec = z
  .strictObject({
    containers: z
      .array(
        z.strictObject({
          id: Slug,
          label: z.string().min(2).max(40),
          kind: z.enum(PLACE_KINDS),
          parent: Slug.optional(),
          detail: z.string().max(80).optional(),
        }),
      )
      .min(2)
      .max(16),
    pieces: z
      .array(
        z.strictObject({
          id: Slug,
          label: z.string().min(2).max(40),
          role: z.enum(PIECE_ROLES).optional(),
          detail: z.string().max(80).optional(),
        }),
      )
      .min(2)
      .max(16),
    failures: z.array(Slug).max(6).default([]),
    constraints: z
      .array(
        z.discriminatedUnion('kind', [
          z.strictObject({
            kind: z.literal('in'),
            goal: GoalRef,
            pieces: Pieces,
            within: z.array(Slug).min(1).max(6),
          }),
          z.strictObject({
            kind: z.literal('survive'),
            goal: GoalRef,
            pieces: Pieces,
            min: z.int().min(1).max(8).default(1),
          }),
          z.strictObject({ kind: z.literal('public'), goal: GoalRef, pieces: Pieces }),
          z.strictObject({ kind: z.literal('private'), goal: GoalRef, pieces: Pieces }),
        ]),
      )
      .min(1)
      .max(12),
  })
  .superRefine((spec, ctx) => {
    for (const issue of placeIssues(spec)) ctx.addIssue({ code: 'custom', ...issue });
  });
export const PlaceAction = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('place'), piece: Slug, slot: Slug }),
  z.strictObject({ t: z.literal('unplace'), piece: Slug }),
  z.strictObject({ t: z.literal('fail'), container: Slug }),
  z.strictObject({ t: z.literal('restore') }),
  z.strictObject({ t: z.literal('reset') }),
]);
export type PlaceSpec = z.infer<typeof PlaceSpec>;
export type PlaceAction = z.infer<typeof PlaceAction>;
```

- [ ] **Step 4: Add the Place model**

Create `src/labs/place/model.ts`:

```ts
import type { PlaceAction, PlaceSpec } from '../../../schemas/lab-place.ts';
import type { GoalResult, LabEngine } from '../contract.ts';

/**
 * A Place board: the piece, slot and failure ids of its spec, where each placed piece sits (a piece not in `placed`
 * is in the tray), and the one failure the board previews; `check` never reads `failed`.
 */
export interface PlaceState {
  readonly pieces: readonly string[];
  readonly slots: readonly string[];
  readonly failures: readonly string[];
  readonly placed: Readonly<Record<string, string>>;
  readonly failed: string | null;
}

type Container = PlaceSpec['containers'][number];
type Constraint = PlaceSpec['constraints'][number];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const placedIn = (state: PlaceState, piece: string): string | undefined =>
  Object.hasOwn(state.placed, piece) ? state.placed[piece] : undefined;

const containerOf = (spec: PlaceSpec, id: string): Container | undefined =>
  spec.containers.find((c) => c.id === id);

const labelOf = (spec: PlaceSpec, piece: string): string =>
  spec.pieces.find((p) => p.id === piece)?.label ?? piece;

/** A container and every container above it, nearest first; it stops at a repeat, so it always ends. */
function lineage(spec: PlaceSpec, id: string): Container[] {
  const out: Container[] = [];
  const seen = new Set<string>();
  let at = containerOf(spec, id);
  while (at !== undefined && !seen.has(at.id)) {
    out.push(at);
    seen.add(at.id);
    at = at.parent === undefined ? undefined : containerOf(spec, at.parent);
  }
  return out;
}

/** The slots: containers that hold no container, depth-first with children in spec order, the bench last. */
export function placeSlots(spec: PlaceSpec): string[] {
  const out: string[] = [];
  const walk = (c: Container, seen: ReadonlySet<string>): void => {
    if (seen.has(c.id)) return;
    const children = spec.containers.filter((k) => k.parent === c.id);
    if (children.length === 0) out.push(c.id);
    for (const child of children) walk(child, new Set([...seen, c.id]));
  };
  for (const top of spec.containers)
    if (top.parent === undefined && top.kind !== 'bench') walk(top, new Set());
  const bench = spec.containers.find((c) => c.kind === 'bench');
  if (bench !== undefined) out.push(bench.id);
  return out;
}

/** Goal ids in the order the constraints first name them. */
export function placeGoals(spec: PlaceSpec): string[] {
  return [...new Set(spec.constraints.map((c) => c.goal))];
}

/** True when `slot` is the failed container or sits below it. */
export function isDown(spec: PlaceSpec, slot: string, failure: string): boolean {
  return lineage(spec, slot).some((c) => c.id === failure);
}

/** True when the piece sits in a slot other than the bench. */
export function running(spec: PlaceSpec, state: PlaceState, piece: string): boolean {
  const slot = placedIn(state, piece);
  return slot !== undefined && containerOf(spec, slot)?.kind !== 'bench';
}

const inSubnet = (spec: PlaceSpec, slot: string): boolean =>
  lineage(spec, slot).some((c) => c.kind === 'subnet');

/** True when a running piece with this role sits in a slot that `where` accepts. */
function anyRunning(
  spec: PlaceSpec,
  state: PlaceState,
  role: 'internet-gateway' | 'public-route',
  where: (slot: string) => boolean,
): boolean {
  return spec.pieces.some((p) => {
    const slot = placedIn(state, p.id);
    return p.role === role && slot !== undefined && running(spec, state, p.id) && where(slot);
  });
}

/**
 * True when the internet reaches the piece: its nearest subnet holds a running public route, and that subnet's
 * nearest VPC holds a running internet gateway outside every subnet.
 */
export function reachable(spec: PlaceSpec, state: PlaceState, piece: string): boolean {
  const slot = placedIn(state, piece);
  if (slot === undefined || !running(spec, state, piece)) return false;
  const line = lineage(spec, slot);
  const at = line.findIndex((c) => c.kind === 'subnet');
  const subnet = line[at];
  const vpc = line.slice(at + 1).find((c) => c.kind === 'vpc');
  if (subnet === undefined || vpc === undefined) return false;
  return (
    anyRunning(spec, state, 'public-route', (s) => isDown(spec, s, subnet.id)) &&
    anyRunning(spec, state, 'internet-gateway', (s) => isDown(spec, s, vpc.id) && !inSubnet(spec, s))
  );
}

/** How many of the listed pieces run outside the failed container (or at all, with no failure). */
function survivors(
  spec: PlaceSpec,
  state: PlaceState,
  pieces: readonly string[],
  failure: string | null,
): number {
  return pieces.filter((p) => {
    const slot = placedIn(state, p);
    return (
      slot !== undefined && running(spec, state, p) && (failure === null || !isDown(spec, slot, failure))
    );
  }).length;
}

function passes(spec: PlaceSpec, state: PlaceState, c: Constraint): boolean {
  switch (c.kind) {
    case 'in':
      return c.pieces.every((p) => {
        const slot = placedIn(state, p);
        return slot !== undefined && c.within.some((w) => isDown(spec, slot, w));
      });
    case 'survive': {
      const failures = spec.failures.length > 0 ? spec.failures : [null];
      return failures.every((f) => survivors(spec, state, c.pieces, f) >= c.min);
    }
    case 'public':
      return c.pieces.every((p) => running(spec, state, p) && reachable(spec, state, p));
    case 'private':
      return c.pieces.every((p) => {
        const slot = placedIn(state, p);
        return (
          slot !== undefined && running(spec, state, p) && inSubnet(spec, slot) && !reachable(spec, state, p)
        );
      });
  }
}

/** The one sentence that says why a failing constraint fails, about the board as it is now. */
function reason(spec: PlaceSpec, state: PlaceState, c: Constraint): string {
  const tray = c.pieces.find((p) => placedIn(state, p) === undefined);
  if (tray !== undefined) return `${labelOf(spec, tray)} is still in the tray.`;
  switch (c.kind) {
    case 'in': {
      const off = c.pieces.find((p) => !c.within.some((w) => isDown(spec, placedIn(state, p) ?? '', w)));
      return `${labelOf(spec, off ?? c.pieces[0] ?? '')} is not where this goal needs it.`;
    }
    case 'survive': {
      if (survivors(spec, state, c.pieces, null) < c.min || spec.failures.length === 0)
        return 'Too few of them are running.';
      const down = spec.failures.find((f) => survivors(spec, state, c.pieces, f) < c.min) ?? '';
      return `Down when ${containerOf(spec, down)?.label ?? down} fails.`;
    }
    case 'public': {
      const off = c.pieces.find((p) => !reachable(spec, state, p)) ?? c.pieces[0] ?? '';
      return `Customers cannot reach ${labelOf(spec, off)}.`;
    }
    case 'private': {
      const idle = c.pieces.find((p) => !running(spec, state, p));
      if (idle !== undefined) return `${labelOf(spec, idle)} is not running.`;
      const loose = c.pieces.find((p) => !inSubnet(spec, placedIn(state, p) ?? ''));
      if (loose !== undefined) return `${labelOf(spec, loose)} is not in a subnet.`;
      const open = c.pieces.find((p) => reachable(spec, state, p)) ?? c.pieces[0] ?? '';
      return `The internet can reach ${labelOf(spec, open)}.`;
    }
  }
}

export const PLACE: LabEngine<PlaceSpec, PlaceState, PlaceAction> = {
  init(spec) {
    return {
      pieces: spec.pieces.map((p) => p.id),
      slots: placeSlots(spec),
      failures: [...spec.failures],
      placed: {},
      failed: null,
    };
  },

  reduce(state, action) {
    const a: unknown = action;
    if (!isRecord(a)) return state;
    if (a.t === 'place') {
      const { piece, slot } = a;
      if (typeof piece !== 'string' || typeof slot !== 'string') return state;
      if (!state.pieces.includes(piece) || !state.slots.includes(slot)) return state;
      if (placedIn(state, piece) === slot) return state;
      return { ...state, placed: { ...state.placed, [piece]: slot } };
    }
    if (a.t === 'unplace') {
      const { piece } = a;
      if (typeof piece !== 'string' || placedIn(state, piece) === undefined) return state;
      const placed = { ...state.placed };
      delete placed[piece];
      return { ...state, placed };
    }
    if (a.t === 'fail') {
      const { container } = a;
      if (typeof container !== 'string' || !state.failures.includes(container) || state.failed === container)
        return state;
      return { ...state, failed: container };
    }
    if (a.t === 'restore') return state.failed === null ? state : { ...state, failed: null };
    if (a.t === 'reset')
      return Object.keys(state.placed).length === 0 && state.failed === null
        ? state
        : { ...state, placed: {}, failed: null };
    return state;
  },

  check(spec, state) {
    return placeGoals(spec).map((goalId): GoalResult => {
      const constraints = spec.constraints.filter((c) => c.goal === goalId);
      const ok = constraints.filter((c) => passes(spec, state, c)).length;
      const n = constraints.length;
      return {
        goalId,
        pass: ok === n,
        message: n === 1 ? `${ok} of 1 check passes` : `${ok} of ${n} checks pass`,
      };
    });
  },

  hint(spec, state, goalId) {
    const failing = spec.constraints.find((c) => c.goal === goalId && !passes(spec, state, c));
    return failing === undefined ? 'Every check of this goal passes.' : reason(spec, state, failing);
  },
};

/** A Place board is finished when no piece is left in the tray; the bench counts as placed. */
export function placeComplete(spec: PlaceSpec, state: PlaceState): boolean {
  return spec.pieces.every((p) => placedIn(state, p.id) !== undefined);
}
```

- [ ] **Step 5: Run the tests and see them pass**

```bash
pnpm test tests/unit/lab-place.test.ts tests/property/lab-place.property.test.ts
```

Expected: `Test Files  2 passed (2)` and `Tests  36 passed (36)` (31 in the unit file, counting each `it.each` row, and 5 properties).

- [ ] **Step 6: Run the type check and the linter**

```bash
pnpm typecheck
pnpm lint:fix
pnpm lint
```

Expected: `tsc --noEmit` prints nothing; Biome ends `No fixes applied.`, which also confirms that `src/labs/place/model.ts` keeps the purity rule (no zod, Preact, signals, `src/app`, `src/ui`, `src/store`, DOM, storage, `crypto` or `globalThis`).

- [ ] **Step 7: Commit**

```bash
git add schemas/lab-place.ts src/labs/place/model.ts tests/fixtures/lab-place.ts tests/unit/lab-place.test.ts tests/property/lab-place.property.test.ts
git commit -m "Add the Place lab model" -m "Containers, pieces, a bench and four constraint kinds, checked under every listed failure; not registered yet."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds; nothing outside the five new files changes, so the branch merges in any order with Tasks 2 and 3.

---

## Task 2: The Trace model

**Files:**
- Create: `schemas/lab-trace.ts`, `src/labs/trace/model.ts`, `tests/fixtures/lab-trace.ts`, `tests/unit/lab-trace.test.ts`, `tests/property/lab-trace.property.test.ts`
- Test: `tests/unit/lab-trace.test.ts`, `tests/property/lab-trace.property.test.ts`

Design notes:
- Follows Phase 4 Task 1 only (on `master`): it builds on `LabEngine`, `GoalResult`, `replayLab` and `allPass` (`src/labs/contract.ts`), `EngineEntry`, `AnyLabEngine` and `checkLab` (`src/labs/engines.ts`), `LabFile` (`schemas/lab.ts`), `Slug` (`schemas/common.ts`), `toPlain` (`src/engine/replay.ts`) and the Biome purity override for `src/labs/**/*.ts`.
- Every file is new, so this task runs in `<scratchpad>/p5/wt/trace` on `p5/trace` at once and merges in any order with Tasks 1 and 3; Task 4 registers the engine later.
- Trace has two kinds in one engine: `network` (one security group and one network ACL around one target) and `policy` (identity policies on principals and groups, and SCPs on an organization tree).
- Dani never types a rule: every rule and statement is a fixed candidate with a starting `on`, and the only actions are `toggle` and `reset`, so every solution, wrong path and draft replays by id.
- `TraceState` keeps each rule's starting value beside its current one, so `reduce` validates an id and `reset` restores the start without the spec, as the contract asks.
- An inbound network case runs the network ACL inbound, the security group inbound, the security group outbound on the reply (`stateful`: always allowed once the request was) and the network ACL outbound on the reply port (stateless); an outbound case mirrors it.
- Network ACL rules of one direction are checked by ascending number, the first enabled match decides, and no match is a denial by the final `*` rule; security group rules only allow, and no enabled match is `nomatch`; after the first denial every later hop is `skipped`.
- A policy case has one `scp` hop per org node from the root down to the principal's account and one `iam` hop; each hop is `deny` on an enabled matching Deny, else `allow` on an enabled matching Allow, else `nomatch`, and the case is allowed only when every hop allows it, so an explicit Deny wins, SCPs never grant and the implicit deny holds.
- Actions match their patterns ignoring letter case and resources match exactly, with `*` the only wildcard; `inCidr` and `globMatch` are exported so the tests and the property file pin them.
- The schema redeclares the goal-id rule as a local `GoalRef`, since importing `GoalId` from `schemas/lab.ts` would make an import cycle once Task 4 imports this file there.
- `tests/fixtures/lab-trace.ts` holds the one complete worked example per kind (`bakeryTraceLab` for `network`, `bakeryPolicyLab` for `policy`); their return type `TraceLabFile` is `LabFile` with `engine: 'trace'`, because `LabFile` itself admits `trace` only once Task 4 extends `LAB_ENGINES`, and it stays assignable to `LabFile` after that.
- The network fixture carries a tempting outbound security group rule for the reply ports (`sg-out-replies`, off): switching it on never helps a reply, which is the statefulness lesson, and it gives the property `security group outbound rules never change an inbound case` a rule that would change a case under a stateless security group.
- The hop list of a network case starts at the network ACL: the internet gateway and the route table are outside the Trace model (a Place lab teaches them), a deliberate narrowing of P5-032 that the brief decided.
- Covers P5-008, P5-012 to P5-015, P5-016 (Trace: `complete` is always true, written by Task 4), P5-018 (Trace), P5-020, P5-029 to P5-036, P5-038, P5-084 (Trace), P5-085 (Trace), P5-086 (Trace), P5-087 (Trace).

- [ ] **Step 1: Write the worked examples**

Create `tests/fixtures/lab-trace.ts`:

```ts
import type { LabFile } from '../../schemas/lab.ts';

/** Made-up bakery Trace labs, one per kind, the worked examples of the Trace engine; no course text. */

/** A lab file of the Trace engine; `LabFile` itself admits `trace` only once Task 4 registers the engine. */
export type TraceLabFile = Omit<LabFile, 'engine'> & { readonly engine: 'trace' };

const DEBRIEF: LabFile['debrief'] = {
  lines: [
    'A guard at the door remembers who came in, so the answer goes back out without a rule of its own.',
    'A gate list checks every crossing both ways, so the answer needs a rule of its own on the way out.',
  ],
  questions: ['q-b4k7m2', 'q-d9p4r6'],
};

/**
 * The order window of the bakery: one security group and one network ACL around one shop front. Customers must
 * reach the order page over HTTPS with the replies getting back out, a blocked range stays out, the office alone
 * logs in over SSH, and the window still fetches its daily menu.
 */
export const TRACE_NETWORK_SPEC = {
  kind: 'network',
  target: 'Order window',
  sg: {
    label: 'window-sg',
    rules: [
      { id: 'sg-https-all', dir: 'in', proto: 'tcp', from: 443, to: 443, cidr: '0.0.0.0/0', on: false },
      { id: 'sg-ssh-all', dir: 'in', proto: 'tcp', from: 22, to: 22, cidr: '0.0.0.0/0', on: false },
      { id: 'sg-ssh-office', dir: 'in', proto: 'tcp', from: 22, to: 22, cidr: '192.0.2.0/24', on: false },
      { id: 'sg-out-https', dir: 'out', proto: 'tcp', from: 443, to: 443, cidr: '0.0.0.0/0', on: true },
      { id: 'sg-out-replies', dir: 'out', proto: 'tcp', from: 1024, to: 65535, cidr: '0.0.0.0/0', on: false },
    ],
  },
  nacl: {
    label: 'front-acl',
    rules: [
      {
        id: 'acl-deny-blocked',
        n: 90,
        dir: 'in',
        proto: 'all',
        from: 0,
        to: 65535,
        cidr: '198.51.100.0/24',
        action: 'deny',
        on: true,
      },
      {
        id: 'acl-https-in',
        n: 100,
        dir: 'in',
        proto: 'tcp',
        from: 443,
        to: 443,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      },
      {
        id: 'acl-ssh-in',
        n: 110,
        dir: 'in',
        proto: 'tcp',
        from: 22,
        to: 22,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      },
      {
        id: 'acl-replies-in',
        n: 120,
        dir: 'in',
        proto: 'tcp',
        from: 1024,
        to: 65535,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      },
      {
        id: 'acl-replies-out',
        n: 100,
        dir: 'out',
        proto: 'tcp',
        from: 1024,
        to: 65535,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: false,
      },
      {
        id: 'acl-https-out',
        n: 110,
        dir: 'out',
        proto: 'tcp',
        from: 443,
        to: 443,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      },
    ],
  },
  cases: [
    {
      id: 'customer-order',
      goal: 'g1',
      label: 'A customer opens the order page',
      dir: 'in',
      proto: 'tcp',
      ip: '203.0.113.10',
      port: 443,
      reply: 49152,
      expect: 'allow',
    },
    {
      id: 'blocked-order',
      goal: 'g1',
      label: 'A blocked address opens the order page',
      dir: 'in',
      proto: 'tcp',
      ip: '198.51.100.7',
      port: 443,
      reply: 49152,
      expect: 'deny',
    },
    {
      id: 'daily-menu',
      goal: 'g1',
      label: 'The window fetches the daily menu',
      dir: 'out',
      proto: 'tcp',
      ip: '203.0.113.50',
      port: 443,
      reply: 51000,
      expect: 'allow',
    },
    {
      id: 'stranger-ssh',
      goal: 'g2',
      label: 'A stranger tries to log in over SSH',
      dir: 'in',
      proto: 'tcp',
      ip: '203.0.113.10',
      port: 22,
      reply: 50000,
      expect: 'deny',
    },
    {
      id: 'office-ssh',
      goal: 'g2',
      label: 'The bakery office logs in over SSH',
      dir: 'in',
      proto: 'tcp',
      ip: '192.0.2.15',
      port: 22,
      reply: 50000,
      expect: 'allow',
    },
  ],
} as const;

/**
 * The bakery group's keys: an org root, a Shops OU and the East shop account, each with an allow-all SCP, a
 * switched-off SCP Deny on oven deletes at the OU, and candidate identity statements for the Bakers group, of which
 * Mo is a member and Lu is not.
 */
export const TRACE_POLICY_SPEC = {
  kind: 'policy',
  principals: [
    { id: 'baker-mo', label: 'Mo the baker', groups: ['bakers'], account: 'shop-east' },
    { id: 'cashier-lu', label: 'Lu at the till', groups: [], account: 'shop-east' },
  ],
  groups: [{ id: 'bakers', label: 'Bakers' }],
  org: [
    { id: 'bakery-org', label: 'Bakery group' },
    { id: 'shops', label: 'Shops', parent: 'bakery-org' },
    { id: 'shop-east', label: 'East shop', parent: 'shops' },
  ],
  policies: [
    {
      id: 'root-all',
      label: 'Full access',
      kind: 'scp',
      attach: 'bakery-org',
      statements: [{ id: 'root-allow-all', effect: 'allow', actions: ['*'], resources: ['*'], on: true }],
    },
    {
      id: 'shops-all',
      label: 'Full access',
      kind: 'scp',
      attach: 'shops',
      statements: [{ id: 'shops-allow-all', effect: 'allow', actions: ['*'], resources: ['*'], on: true }],
    },
    {
      id: 'shops-guard',
      label: 'No oven deletes',
      kind: 'scp',
      attach: 'shops',
      statements: [
        { id: 'deny-oven-delete', effect: 'deny', actions: ['oven:Delete*'], resources: ['*'], on: false },
      ],
    },
    {
      id: 'east-all',
      label: 'Full access',
      kind: 'scp',
      attach: 'shop-east',
      statements: [{ id: 'east-allow-all', effect: 'allow', actions: ['*'], resources: ['*'], on: true }],
    },
    {
      id: 'bakers-policy',
      label: 'Bakers policy',
      kind: 'iam',
      attach: 'bakers',
      statements: [
        {
          id: 'read-recipes',
          effect: 'allow',
          actions: ['recipes:Get*'],
          resources: ['recipes/*'],
          on: false,
        },
        {
          id: 'bake-ovens',
          effect: 'allow',
          actions: ['oven:StartBake', 'oven:StopBake'],
          resources: ['oven/*'],
          on: false,
        },
        { id: 'all-ovens', effect: 'allow', actions: ['oven:*'], resources: ['*'], on: false },
      ],
    },
    {
      id: 'till-policy',
      label: 'Till policy',
      kind: 'iam',
      attach: 'cashier-lu',
      statements: [
        { id: 'open-till', effect: 'allow', actions: ['till:Open'], resources: ['till/front'], on: true },
      ],
    },
  ],
  cases: [
    {
      id: 'mo-recipes',
      goal: 'g1',
      label: 'Mo reads the rye recipe',
      principal: 'baker-mo',
      action: 'recipes:GetRecipe',
      resource: 'recipes/rye.txt',
      expect: 'allow',
    },
    {
      id: 'mo-bakes',
      goal: 'g1',
      label: 'Mo starts a bake in the deck oven',
      principal: 'baker-mo',
      action: 'oven:StartBake',
      resource: 'oven/deck-1',
      expect: 'allow',
    },
    {
      id: 'mo-deletes',
      goal: 'g2',
      label: 'Mo deletes the deck oven',
      principal: 'baker-mo',
      action: 'oven:DeleteOven',
      resource: 'oven/deck-1',
      expect: 'deny',
    },
    {
      id: 'lu-recipes',
      goal: 'g2',
      label: 'Lu reads the rye recipe',
      principal: 'cashier-lu',
      action: 'recipes:GetRecipe',
      resource: 'recipes/rye.txt',
      expect: 'deny',
    },
  ],
} as const;

/** A complete network Trace lab: open the order window to customers and to the office alone. */
export function bakeryTraceLab(over: Partial<TraceLabFile> = {}): TraceLabFile {
  return {
    id: 'lab-m01-bakery-door',
    module: 1,
    title: 'Open the order window',
    engine: 'trace',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 6,
    brief:
      'Customers cannot reach the order window. Switch rules on and off until every test case gives its expected result. In this lab the network ACL checks its rules from the lowest number up, and a reply leaves on a port from 1024 to 65535.',
    spec: TRACE_NETWORK_SPEC,
    goals: [
      {
        id: 'g1',
        label: 'Customers can order through the window',
        hint: 'Follow the reply of an order on its way back out, past both the guard and the gate list.',
      },
      {
        id: 'g2',
        label: 'Only the office logs in',
        hint: 'SSH is for the bakery office, and the rest of the internet must stay out.',
      },
    ],
    solution: [
      { t: 'toggle', rule: 'sg-https-all', on: true },
      { t: 'toggle', rule: 'acl-replies-out', on: true },
      { t: 'toggle', rule: 'sg-ssh-office', on: true },
    ],
    wrongPaths: [
      {
        actions: [
          { t: 'toggle', rule: 'sg-https-all', on: true },
          { t: 'toggle', rule: 'sg-ssh-office', on: true },
        ],
        failsGoal: 'g1',
        mistake: 'Opened the window but left the replies no way out',
      },
      {
        actions: [
          { t: 'toggle', rule: 'sg-https-all', on: true },
          { t: 'toggle', rule: 'acl-replies-out', on: true },
          { t: 'toggle', rule: 'sg-ssh-all', on: true },
        ],
        failsGoal: 'g2',
        mistake: 'Opened SSH to the whole internet',
      },
    ],
    debrief: DEBRIEF,
    ...over,
  };
}

/** A complete policy Trace lab: give Mo the baker what a bake needs and nothing more. */
export function bakeryPolicyLab(over: Partial<TraceLabFile> = {}): TraceLabFile {
  return {
    id: 'lab-m01-bakery-keys',
    module: 1,
    title: 'Keys for the bakers',
    engine: 'trace',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 6,
    brief:
      'Mo joins the bakers. Switch statements on and off until every test case gives its expected result. In this lab a request passes only when every SCP from the root down and an identity policy allow it, and any Deny wins.',
    spec: TRACE_POLICY_SPEC,
    goals: [
      {
        id: 'g1',
        label: 'Mo can read recipes and bake',
        hint: 'A baker reads recipes and starts and stops bakes, through the group.',
      },
      {
        id: 'g2',
        label: 'Nothing more than the bake',
        hint: 'No oven is deleted, and the till staff never read the recipes.',
      },
    ],
    solution: [
      { t: 'toggle', rule: 'read-recipes', on: true },
      { t: 'toggle', rule: 'bake-ovens', on: true },
    ],
    wrongPaths: [
      {
        actions: [{ t: 'toggle', rule: 'read-recipes', on: true }],
        failsGoal: 'g1',
        mistake: 'Gave Mo the recipes but not the ovens',
      },
      {
        actions: [
          { t: 'toggle', rule: 'read-recipes', on: true },
          { t: 'toggle', rule: 'all-ovens', on: true },
        ],
        failsGoal: 'g2',
        mistake: 'Let Mo do anything to every oven',
      },
    ],
    debrief: DEBRIEF,
    ...over,
  };
}
```

- [ ] **Step 2: Write the failing unit tests**

Create `tests/unit/lab-trace.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  type NetworkTraceSpec,
  type PolicyTraceSpec,
  TraceAction,
  TraceSpec,
} from '../../schemas/lab-trace.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { type AnyLabEngine, checkLab, type EngineEntry } from '../../src/labs/engines.ts';
import {
  globMatch,
  inCidr,
  TRACE,
  type TraceState,
  traceCase,
  traceGoals,
} from '../../src/labs/trace/model.ts';
import {
  bakeryPolicyLab,
  bakeryTraceLab,
  TRACE_NETWORK_SPEC,
  TRACE_POLICY_SPEC,
} from '../fixtures/lab-trace.ts';

const NET = TraceSpec.parse(TRACE_NETWORK_SPEC) as NetworkTraceSpec;
const POL = TraceSpec.parse(TRACE_POLICY_SPEC) as PolicyTraceSpec;

type Toggle = { t: 'toggle'; rule: string; on: boolean };
const on = (rule: string): Toggle => ({ t: 'toggle', rule, on: true });
const off = (rule: string): Toggle => ({ t: 'toggle', rule, on: false });
const run = (spec: TraceSpec, actions: readonly unknown[]): TraceState =>
  replayLab(TRACE, spec, actions as TraceAction[]);
const words = (spec: TraceSpec, state: TraceState) =>
  TRACE.check(spec, state).map((r) => [r.goalId, r.pass, r.message]);
const result = (spec: TraceSpec, actions: readonly unknown[], caseId: string) =>
  traceCase(spec, run(spec, actions), caseId)?.result;
const hops = (spec: TraceSpec, actions: readonly unknown[], caseId: string) =>
  traceCase(spec, run(spec, actions), caseId)?.hops.map((h) => [h.at, h.reply, h.verdict, h.by]);
const hopsWithNode = (spec: TraceSpec, actions: readonly unknown[], caseId: string) =>
  traceCase(spec, run(spec, actions), caseId)?.hops.map((h) => [h.at, h.node, h.verdict, h.by]);

/** The messages a spec fails with. */
const problems = (spec: unknown): string[] => {
  const parsed = TraceSpec.safeParse(spec);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
};
const copy = <T>(value: T): T => structuredClone(value) as T;

describe('Trace spec schema (spec 5.1)', () => {
  it('accepts both fixture specs and fills the defaults', () => {
    expect(NET.kind).toBe('network');
    expect(POL.kind).toBe('policy');
    const bare = {
      kind: 'policy',
      principals: [{ id: 'cashier-lu', label: 'Lu at the till' }],
      policies: [
        {
          id: 'till-policy',
          label: 'Till policy',
          kind: 'iam',
          attach: 'cashier-lu',
          statements: [
            { id: 'open-till', effect: 'allow', actions: ['till:Open'], resources: ['till/front'], on: true },
          ],
        },
      ],
      cases: [
        {
          id: 'lu-till',
          goal: 'g1',
          label: 'Lu opens the till',
          principal: 'cashier-lu',
          action: 'till:Open',
          resource: 'till/front',
          expect: 'allow',
        },
      ],
    };
    expect(TraceSpec.parse(bare)).toMatchObject({ groups: [], org: [], principals: [{ groups: [] }] });
  });

  it.each([
    [
      'a rule id used by the security group and the network ACL',
      (s: NetworkTraceSpec) => {
        s.nacl.rules[0] = {
          ...s.nacl.rules[0],
          id: 'sg-https-all',
        } as NetworkTraceSpec['nacl']['rules'][number];
      },
      'rule sg-https-all is used twice',
    ],
    [
      'an inbound rule number used twice',
      (s: NetworkTraceSpec) => {
        (s.nacl.rules[1] as { n: number }).n = 90;
      },
      'rule number 90 is used twice inbound',
    ],
    [
      'an outbound rule number used twice',
      (s: NetworkTraceSpec) => {
        (s.nacl.rules[5] as { n: number }).n = 100;
      },
      'rule number 100 is used twice outbound',
    ],
    [
      'a port range that runs backwards',
      (s: NetworkTraceSpec) => {
        (s.sg.rules[0] as { from: number }).from = 444;
      },
      'from is above to',
    ],
    [
      'all traffic on one port',
      (s: NetworkTraceSpec) => {
        (s.nacl.rules[0] as { to: number }).to = 80;
      },
      'all traffic covers every port: use 0 to 65535',
    ],
    [
      'a case id used twice',
      (s: NetworkTraceSpec) => {
        (s.cases[1] as { id: string }).id = 'customer-order';
      },
      'case customer-order is used twice',
    ],
  ])('rejects %s', (_, edit, message) => {
    const spec = copy(NET);
    edit(spec);
    expect(problems(spec)).toContain(message);
  });

  it.each([
    [
      'a statement id used in two policies',
      (s: PolicyTraceSpec) => {
        (s.policies[4]?.statements[0] as { id: string }).id = 'open-till';
      },
      'rule open-till is used twice',
    ],
    [
      'a policy id used twice',
      (s: PolicyTraceSpec) => {
        (s.policies[5] as { id: string }).id = 'root-all';
      },
      'policy root-all is used twice',
    ],
    [
      'a principal id used twice',
      (s: PolicyTraceSpec) => {
        (s.principals[1] as { id: string }).id = 'baker-mo';
      },
      'principal baker-mo is used twice',
    ],
    [
      'a group id used twice',
      (s: PolicyTraceSpec) => {
        s.groups.push({ id: 'bakers', label: 'Bakers again' });
      },
      'group bakers is used twice',
    ],
    [
      'a node id used twice',
      (s: PolicyTraceSpec) => {
        s.org.push({ id: 'shops', label: 'Shops again', parent: 'bakery-org' });
      },
      'node shops is used twice',
    ],
    [
      'a principal in a missing group',
      (s: PolicyTraceSpec) => {
        (s.principals[0] as { groups: string[] }).groups.push('ovens');
      },
      'names no group: ovens',
    ],
    [
      'an identity policy on nobody',
      (s: PolicyTraceSpec) => {
        (s.policies[4] as { attach: string }).attach = 'bakerz';
      },
      'names no principal or group: bakerz',
    ],
    [
      'an SCP on a missing node',
      (s: PolicyTraceSpec) => {
        (s.policies[0] as { attach: string }).attach = 'west';
      },
      'names no organization node: west',
    ],
    [
      'a node under a missing parent',
      (s: PolicyTraceSpec) => {
        (s.org[1] as { parent?: string }).parent = 'west';
      },
      'names no organization node: west',
    ],
    [
      'an SCP without an org',
      (s: PolicyTraceSpec) => {
        s.org.length = 0;
        for (const p of s.principals) delete (p as { account?: string }).account;
      },
      'an SCP needs the org',
    ],
    [
      'two roots',
      (s: PolicyTraceSpec) => {
        delete (s.org[1] as { parent?: string }).parent;
      },
      'the org needs exactly one root',
    ],
    [
      'a node that is its own ancestor',
      (s: PolicyTraceSpec) => {
        (s.org[0] as { parent?: string }).parent = 'shop-east';
        s.org.push({ id: 'west', label: 'West group' });
        s.policies.push({
          id: 'west-all',
          label: 'Full access',
          kind: 'scp',
          attach: 'west',
          statements: [{ id: 'west-allow-all', effect: 'allow', actions: ['*'], resources: ['*'], on: true }],
        });
      },
      'node bakery-org is its own ancestor',
    ],
    [
      'an account that is not in the org',
      (s: PolicyTraceSpec) => {
        (s.principals[0] as { account?: string }).account = 'west';
      },
      'names no account: west',
    ],
    [
      'an account that holds other nodes',
      (s: PolicyTraceSpec) => {
        (s.principals[0] as { account?: string }).account = 'shops';
      },
      'names no account: shops',
    ],
    [
      'an account while the org is empty',
      (s: PolicyTraceSpec) => {
        s.org.length = 0;
        s.policies = s.policies.filter((p) => p.kind === 'iam');
      },
      'names no account: shop-east',
    ],
    [
      'a principal without an account',
      (s: PolicyTraceSpec) => {
        delete (s.principals[1] as { account?: string }).account;
      },
      'needs an account: cashier-lu',
    ],
    [
      'a case for a missing principal',
      (s: PolicyTraceSpec) => {
        (s.cases[0] as { principal: string }).principal = 'baker-jo';
      },
      'names no principal: baker-jo',
    ],
    [
      'a node with no SCP',
      (s: PolicyTraceSpec) => {
        s.policies = s.policies.filter((p) => p.id !== 'east-all');
      },
      'node shop-east has no SCP',
    ],
  ])('rejects %s', (_, edit, message) => {
    const spec = copy(POL);
    edit(spec);
    expect(problems(spec)).toContain(message);
  });

  it('rejects a bad address, a bad range, a bad action and a bad pattern with their messages', () => {
    const net = copy(NET) as unknown as { cases: { ip: string }[]; sg: { rules: { cidr: string }[] } };
    (net.cases[0] as { ip: string }).ip = '203.0.113.256';
    (net.sg.rules[0] as { cidr: string }).cidr = '0.0.0.0/33';
    expect(problems(net)).toEqual(['must look like 203.0.113.0/24', 'must look like 203.0.113.10']);
    const pol = copy(POL) as unknown as {
      cases: { action: string }[];
      policies: { statements: { resources: string[] }[] }[];
    };
    (pol.cases[0] as { action: string }).action = 'GetRecipe';
    (pol.policies[0]?.statements[0] as { resources: string[] }).resources = ['cafe menu'];
    expect(problems(pol)).toEqual([
      'must look like s3:GetObject or cafe-menu/*',
      'must look like s3:GetObject',
    ]);
  });

  it('accepts a toggle and a reset, and rejects an unknown action or a toggle without its value', () => {
    expect(TraceAction.parse({ t: 'toggle', rule: 'sg-https-all', on: true })).toEqual({
      t: 'toggle',
      rule: 'sg-https-all',
      on: true,
    });
    expect(TraceAction.parse({ t: 'reset' })).toEqual({ t: 'reset' });
    expect(TraceAction.safeParse({ t: 'add', rule: 'sg-https-all' }).success).toBe(false);
    expect(TraceAction.safeParse({ t: 'toggle', rule: 'sg-https-all' }).success).toBe(false);
  });
});

describe('the Trace checker (spec 5.1, 9)', () => {
  it.each([
    ['203.0.113.10', '0.0.0.0/0', true],
    ['203.0.113.10', '203.0.113.0/24', true],
    ['203.0.114.10', '203.0.113.0/24', false],
    ['192.0.2.15', '192.0.2.15/32', true],
    ['192.0.2.16', '192.0.2.15/32', false],
    ['255.255.255.255', '255.255.255.0/24', true],
    ['10.20.1.9', 'not a range', false],
  ])('inCidr(%s, %s) is %s', (ip, cidr, inside) => {
    expect(inCidr(ip, cidr)).toBe(inside);
  });

  it.each([
    ['*', 'anything:At/all', false, true],
    ['s3:*', 's3:GetObject', false, true],
    ['s3:*', 'ec2:RunInstances', false, false],
    ['cafe-menu/*', 'cafe-menu/a.json', false, true],
    ['cafe-menu/*', 'cafe-menu/', false, true],
    ['cafe-menu/*', 'cafe-payroll/a.json', false, false],
    ['oven:Delete*', 'oven:DeleteOven', false, true],
    ['s3:GetObject', 's3:getobject', true, true],
    ['s3:GetObject', 's3:getobject', false, false],
    ['Cafe-menu/*', 'cafe-menu/a.json', false, false],
    ['a*b*c', 'abc', false, true],
    ['a*b*c', 'aXbYbZc', false, true],
    ['a*b*c', 'aXbYc!', false, false],
  ])('globMatch(%s, %s, ignoreCase %s) is %s', (pattern, value, ignoreCase, match) => {
    expect(globMatch(pattern, value, ignoreCase)).toBe(match);
  });

  it('starts from every rule as the spec sets it and fails a goal', () => {
    const start = TRACE.init(NET);
    expect(start.start).toBe(start.on);
    expect(start.on).toEqual({
      'sg-https-all': false,
      'sg-ssh-all': false,
      'sg-ssh-office': false,
      'sg-out-https': true,
      'sg-out-replies': false,
      'acl-deny-blocked': true,
      'acl-https-in': true,
      'acl-ssh-in': true,
      'acl-replies-in': true,
      'acl-replies-out': false,
      'acl-https-out': true,
    });
    expect(words(NET, start)).toEqual([
      ['g1', false, '2 of 3 cases as expected'],
      ['g2', false, '1 of 2 cases as expected'],
    ]);
    expect(words(POL, TRACE.init(POL))).toEqual([
      ['g1', false, '0 of 2 cases as expected'],
      ['g2', true, '2 of 2 cases as expected'],
    ]);
    expect(traceGoals(NET)).toEqual(['g1', 'g2']);
  });

  it('passes every goal with the solution of either fixture, and each wrong path fails its goal', () => {
    for (const lab of [bakeryTraceLab(), bakeryPolicyLab()]) {
      const spec = TraceSpec.parse(lab.spec);
      expect(allPass(TRACE.check(spec, run(spec, lab.solution)))).toBe(true);
      for (const path of lab.wrongPaths) {
        const failed = TRACE.check(spec, run(spec, path.actions)).find((r) => r.goalId === path.failsGoal);
        expect(failed?.pass).toBe(false);
      }
    }
  });

  it('lets the reply of an allowed inbound request out of a security group with no outbound rule for it', () => {
    expect(
      hops(NET, [on('sg-https-all'), off('sg-out-https'), on('acl-replies-out')], 'customer-order'),
    ).toEqual([
      ['nacl-in', false, 'allow', 'acl-https-in'],
      ['sg-in', false, 'allow', 'sg-https-all'],
      ['sg-out', true, 'stateful', null],
      ['nacl-out', true, 'allow', 'acl-replies-out'],
    ]);
  });

  it('drops that reply at the network ACL until an outbound rule covers its port', () => {
    expect(hops(NET, [on('sg-https-all')], 'customer-order')).toEqual([
      ['nacl-in', false, 'allow', 'acl-https-in'],
      ['sg-in', false, 'allow', 'sg-https-all'],
      ['sg-out', true, 'stateful', null],
      ['nacl-out', true, 'deny', '*'],
    ]);
    expect(result(NET, [on('sg-https-all')], 'customer-order')).toBe('deny');
    // An outbound security group rule for the reply ports does not help: the network ACL still drops the reply.
    expect(result(NET, [on('sg-https-all'), on('sg-out-replies')], 'customer-order')).toBe('deny');
    expect(result(NET, [on('sg-https-all'), on('acl-replies-out')], 'customer-order')).toBe('allow');
  });

  it('mirrors both rules for an outbound request', () => {
    expect(hops(NET, [], 'daily-menu')).toEqual([
      ['sg-out', false, 'allow', 'sg-out-https'],
      ['nacl-out', false, 'allow', 'acl-https-out'],
      ['nacl-in', true, 'allow', 'acl-replies-in'],
      ['sg-in', true, 'stateful', null],
    ]);
    expect(hops(NET, [off('acl-replies-in')], 'daily-menu')).toEqual([
      ['sg-out', false, 'allow', 'sg-out-https'],
      ['nacl-out', false, 'allow', 'acl-https-out'],
      ['nacl-in', true, 'deny', '*'],
      ['sg-in', true, 'skipped', null],
    ]);
    expect(hops(NET, [off('sg-out-https')], 'daily-menu')).toEqual([
      ['sg-out', false, 'nomatch', null],
      ['nacl-out', false, 'skipped', null],
      ['nacl-in', true, 'skipped', null],
      ['sg-in', true, 'skipped', null],
    ]);
  });

  it('checks network ACL rules from the lowest number up and takes the first enabled match', () => {
    // Rule 90 denies the blocked range before rule 100 allows HTTPS.
    expect(hops(NET, [on('sg-https-all')], 'blocked-order')?.[0]).toEqual([
      'nacl-in',
      false,
      'deny',
      'acl-deny-blocked',
    ]);
    // Numbered after the allow, the same deny never decides.
    const later = copy(NET);
    (later.nacl.rules[0] as { n: number }).n = 130;
    expect(hops(later, [on('sg-https-all')], 'blocked-order')?.[0]).toEqual([
      'nacl-in',
      false,
      'allow',
      'acl-https-in',
    ]);
    // A disabled rule is skipped.
    expect(hops(NET, [on('sg-https-all'), off('acl-deny-blocked')], 'blocked-order')?.[0]).toEqual([
      'nacl-in',
      false,
      'allow',
      'acl-https-in',
    ]);
    // No enabled match falls to the final * rule, and every later hop is not reached.
    expect(hops(NET, [off('acl-ssh-in')], 'stranger-ssh')).toEqual([
      ['nacl-in', false, 'deny', '*'],
      ['sg-in', false, 'skipped', null],
      ['sg-out', true, 'skipped', null],
      ['nacl-out', true, 'skipped', null],
    ]);
  });

  it('lets an explicit Deny win over an Allow, in the same policy and in another one', () => {
    const same = copy(POL);
    same.policies[4]?.statements.push({
      id: 'no-deletes',
      effect: 'deny',
      actions: ['oven:Delete*'],
      resources: ['*'],
      on: true,
    });
    expect(hops(same, [on('all-ovens')], 'mo-deletes')?.at(-1)).toEqual(['iam', false, 'deny', 'no-deletes']);
    expect(result(same, [on('all-ovens')], 'mo-deletes')).toBe('deny');
    expect(result(POL, [on('all-ovens')], 'mo-deletes')).toBe('allow');
    expect(result(POL, [on('all-ovens'), on('deny-oven-delete')], 'mo-deletes')).toBe('deny');
    const user = copy(POL);
    user.policies.push({
      id: 'mo-limits',
      label: 'Limits for Mo',
      kind: 'iam',
      attach: 'baker-mo',
      statements: [
        {
          id: 'mo-no-deletes',
          effect: 'deny',
          actions: ['oven:DeleteOven'],
          resources: ['oven/*'],
          on: true,
        },
      ],
    });
    expect(result(user, [on('all-ovens')], 'mo-deletes')).toBe('deny');
  });

  it('lets an Allow beat the implicit deny, and calls no matching statement no match and a denial', () => {
    expect(hops(POL, [], 'mo-recipes')?.at(-1)).toEqual(['iam', false, 'nomatch', null]);
    expect(result(POL, [], 'mo-recipes')).toBe('deny');
    expect(hops(POL, [on('read-recipes')], 'mo-recipes')?.at(-1)).toEqual([
      'iam',
      false,
      'allow',
      'read-recipes',
    ]);
    expect(result(POL, [on('read-recipes')], 'mo-recipes')).toBe('allow');
  });

  it('intersects the SCPs with the identity policies, and an SCP Deny at the root beats everything', () => {
    expect(hopsWithNode(POL, [on('read-recipes')], 'mo-recipes')).toEqual([
      ['scp', 'bakery-org', 'allow', 'root-allow-all'],
      ['scp', 'shops', 'allow', 'shops-allow-all'],
      ['scp', 'shop-east', 'allow', 'east-allow-all'],
      ['iam', null, 'allow', 'read-recipes'],
    ]);
    // An identity Allow without an SCP Allow on every node is denied.
    expect(hopsWithNode(POL, [on('read-recipes'), off('east-allow-all')], 'mo-recipes')?.[2]).toEqual([
      'scp',
      'shop-east',
      'nomatch',
      null,
    ]);
    expect(result(POL, [on('read-recipes'), off('east-allow-all')], 'mo-recipes')).toBe('deny');
    // SCPs never grant on their own.
    expect(result(POL, [], 'mo-recipes')).toBe('deny');
    const root = copy(POL);
    root.policies[0]?.statements.push({
      id: 'root-no-ovens',
      effect: 'deny',
      actions: ['oven:*'],
      resources: ['*'],
      on: true,
    });
    expect(hopsWithNode(root, [on('all-ovens')], 'mo-bakes')).toEqual([
      ['scp', 'bakery-org', 'deny', 'root-no-ovens'],
      ['scp', 'shops', 'allow', 'shops-allow-all'],
      ['scp', 'shop-east', 'allow', 'east-allow-all'],
      ['iam', null, 'allow', 'all-ovens'],
    ]);
    expect(result(root, [on('all-ovens')], 'mo-bakes')).toBe('deny');
  });

  it("reaches a group's members only", () => {
    expect(result(POL, [on('read-recipes')], 'mo-recipes')).toBe('allow');
    expect(result(POL, [on('read-recipes')], 'lu-recipes')).toBe('deny');
  });

  it('matches actions ignoring letter case and resources exactly', () => {
    const lower = copy(POL);
    (lower.cases[0] as { action: string }).action = 'recipes:getrecipe';
    expect(result(lower, [on('read-recipes')], 'mo-recipes')).toBe('allow');
    (lower.cases[0] as { resource: string }).resource = 'Recipes/rye.txt';
    expect(result(lower, [on('read-recipes')], 'mo-recipes')).toBe('deny');
  });

  it('evaluates an identity-only spec with no org at all', () => {
    const plain = copy(POL);
    plain.org = [];
    plain.policies = plain.policies.filter((p) => p.kind === 'iam');
    for (const p of plain.principals) delete (p as { account?: string }).account;
    expect(problems(plain)).toEqual([]);
    expect(hops(plain, [on('read-recipes')], 'mo-recipes')).toEqual([
      ['iam', false, 'allow', 'read-recipes'],
    ]);
  });

  it('never skips a policy hop, and knows no unknown case', () => {
    for (const c of POL.cases)
      expect(traceCase(POL, TRACE.init(POL), c.id)?.hops.every((h) => h.verdict !== 'skipped')).toBe(true);
    expect(traceCase(NET, TRACE.init(NET), 'nobody')).toBeNull();
  });

  it('toggles one rule, and reset restores the start', () => {
    const start = TRACE.init(NET);
    const next = TRACE.reduce(start, on('sg-https-all'));
    expect(next.on['sg-https-all']).toBe(true);
    expect({ ...next.on, 'sg-https-all': false }).toEqual(start.on);
    expect(TRACE.reduce(next, { t: 'reset' })).toEqual(TRACE.init(NET));
    const back = TRACE.reduce(next, off('sg-https-all'));
    expect(TRACE.reduce(back, { t: 'reset' })).toBe(back);
  });

  it.each([
    ['a toggle to the value it has', { t: 'toggle', rule: 'sg-out-https', on: true }],
    ['an unknown rule', { t: 'toggle', rule: 'sg-ftp-all', on: true }],
    ['an inherited key', { t: 'toggle', rule: 'toString', on: true }],
    ['a toggle without a boolean', { t: 'toggle', rule: 'sg-https-all', on: 'yes' }],
    ['a reset at the start', { t: 'reset' }],
    ['an unknown action', { t: 'place', card: 'sg-https-all', bucket: 'on' }],
    ['a value that is not an object', 'toggle'],
    ['null', null],
  ])('ignores %s and returns the same state object', (_, action) => {
    const start = TRACE.init(NET);
    expect(TRACE.reduce(start, action as never)).toBe(start);
  });

  it('checks the same through an engine entry that settles nothing and is always complete', () => {
    const entry: EngineEntry = { engine: TRACE as unknown as AnyLabEngine, settle: [], complete: () => true };
    const state = run(NET, bakeryTraceLab().solution);
    expect(checkLab(entry, NET, state)).toEqual(TRACE.check(NET, state));
  });

  it('hints at the first case of the goal that gives the wrong result, in one sentence', () => {
    expect(TRACE.hint(NET, TRACE.init(NET), 'g1')).toBe(
      'A customer opens the order page: denied, but it should be allowed.',
    );
    expect(
      TRACE.hint(NET, run(NET, [on('sg-https-all'), on('acl-replies-out'), on('sg-ssh-all')]), 'g2'),
    ).toBe('A stranger tries to log in over SSH: allowed, but it should be denied.');
    expect(TRACE.hint(NET, run(NET, bakeryTraceLab().solution), 'g2')).toBe(
      'Every case of this goal gives the expected result.',
    );
  });
});
```

- [ ] **Step 3: Write the failing property tests**

Create `tests/property/lab-trace.property.test.ts`:

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { type NetworkTraceSpec, type PolicyTraceSpec, TraceSpec } from '../../schemas/lab-trace.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { replayLab } from '../../src/labs/contract.ts';
import {
  globMatch,
  inCidr,
  TRACE,
  type TraceState,
  traceCase,
  traceGoals,
} from '../../src/labs/trace/model.ts';
import { TRACE_NETWORK_SPEC, TRACE_POLICY_SPEC } from '../fixtures/lab-trace.ts';

/** The Trace reducer (spec 5.1, 9): any action sequence never throws, replays the same and checks purely. */
const RUNS = { seed: 20_261_031, numRuns: 200 };

const NET = TraceSpec.parse(TRACE_NETWORK_SPEC) as NetworkTraceSpec;
const POL = TraceSpec.parse(TRACE_POLICY_SPEC) as PolicyTraceSpec;
const NET_RULES = [...NET.sg.rules, ...NET.nacl.rules].map((r) => r.id);
const POL_RULES = POL.policies.flatMap((p) => p.statements.map((s) => s.id));

const actionArb = (ids: readonly string[]): fc.Arbitrary<unknown> =>
  fc.oneof(
    fc.record({
      t: fc.constant('toggle'),
      rule: fc.constantFrom(...ids, 'sg-ftp-all', 'toString'),
      on: fc.boolean(),
    }),
    fc.record({ t: fc.constant('toggle'), rule: fc.constantFrom(...ids), on: fc.anything() }),
    fc.constant({ t: 'reset' }),
    fc.anything(),
  );
/** Random on and off switches for every rule of a spec, as toggles. */
const flagsArb = (ids: readonly string[]) =>
  fc
    .tuple(...ids.map(() => fc.boolean()))
    .map((flags) => ids.map((rule, i) => ({ t: 'toggle', rule, on: flags[i] })));

const results = (spec: TraceSpec, state: TraceState) =>
  spec.cases.map((c) => traceCase(spec, state, c.id)?.result);

describe('the Trace reducer', () => {
  it('never throws, is deterministic and checks purely', () => {
    for (const [spec, ids] of [
      [NET, NET_RULES],
      [POL, POL_RULES],
    ] as const) {
      fc.assert(
        fc.property(fc.array(actionArb(ids), { maxLength: 30 }), (actions) => {
          const a = replayLab(TRACE, spec, actions as never[]);
          const b = replayLab(TRACE, spec, actions as never[]);
          expect(toPlain(a)).toEqual(toPlain(b));
          expect(TRACE.check(spec, a)).toEqual(TRACE.check(spec, b));
          expect(TRACE.check(spec, a).map((r) => r.goalId)).toEqual(traceGoals(spec));
          expect(Object.keys(a.on).sort()).toEqual([...ids].sort());
        }),
        RUNS,
      );
    }
  });

  it('rejected actions return the same state', () => {
    fc.assert(
      fc.property(
        flagsArb(NET_RULES),
        fc.oneof(
          fc.record({
            t: fc.constant('toggle'),
            rule: fc.string().filter((s) => !NET_RULES.includes(s)),
            on: fc.boolean(),
          }),
          fc.record({ t: fc.string().filter((t) => t !== 'toggle' && t !== 'reset') }),
          fc.oneof(fc.integer(), fc.string(), fc.constant(null), fc.constant(undefined)),
        ),
        (flags, junk) => {
          const state = replayLab(TRACE, NET, flags as never[]);
          expect(TRACE.reduce(state, junk as never)).toBe(state);
        },
      ),
      RUNS,
    );
  });

  it('an enabled matching Deny always wins', () => {
    const deny = POL.policies.flatMap((p) =>
      p.statements.filter((s) => s.effect === 'deny').map((s) => ({ p, s })),
    );
    /** The org nodes from an account up to the root. */
    const pathOf = (account: string | undefined): string[] => {
      const node = POL.org.find((n) => n.id === account);
      return node === undefined ? [] : [node.id, ...pathOf(node.parent)];
    };
    fc.assert(
      fc.property(flagsArb(POL_RULES), (flags) => {
        const state = replayLab(TRACE, POL, flags as never[]);
        for (const c of POL.cases) {
          const principal = POL.principals.find((p) => p.id === c.principal);
          const applies = deny.some(
            ({ p, s }) =>
              state.on[s.id] === true &&
              (p.kind === 'scp'
                ? pathOf(principal?.account).includes(p.attach)
                : p.attach === c.principal || (principal?.groups ?? []).includes(p.attach)) &&
              s.actions.some((a) => globMatch(a, c.action, true)) &&
              s.resources.some((r) => globMatch(r, c.resource)),
          );
          if (applies) expect(traceCase(POL, state, c.id)?.result).toBe('deny');
        }
      }),
      RUNS,
    );
  });

  it('an allowed policy case has every hop allowed', () => {
    fc.assert(
      fc.property(flagsArb(POL_RULES), (flags) => {
        const state = replayLab(TRACE, POL, flags as never[]);
        for (const c of POL.cases) {
          const run = traceCase(POL, state, c.id);
          if (run?.result === 'allow') expect(run.hops.every((h) => h.verdict === 'allow')).toBe(true);
        }
      }),
      RUNS,
    );
  });

  it('security group outbound rules never change an inbound case', () => {
    const outbound = NET.sg.rules.filter((r) => r.dir === 'out');
    const inbound = NET.cases.filter((c) => c.dir === 'in').map((c) => c.id);
    fc.assert(
      fc.property(flagsArb(NET_RULES), fc.constantFrom(...outbound), (flags, rule) => {
        const state = replayLab(TRACE, NET, flags as never[]);
        const flipped = TRACE.reduce(state, { t: 'toggle', rule: rule.id, on: !state.on[rule.id] });
        for (const id of inbound)
          expect(traceCase(NET, flipped, id)?.result).toBe(traceCase(NET, state, id)?.result);
      }),
      RUNS,
    );
  });

  it('network ACL rules that match no hop never change a case', () => {
    type Rule = NetworkTraceSpec['nacl']['rules'][number];
    type Case = NetworkTraceSpec['cases'][number];
    const covers = (r: Rule, c: Case, port: number) =>
      (r.proto === 'all' || r.proto === c.proto) && port >= r.from && port <= r.to && inCidr(c.ip, r.cidr);
    const touches = (r: Rule, c: Case) => (r.dir === c.dir ? covers(r, c, c.port) : covers(r, c, c.reply));
    fc.assert(
      fc.property(flagsArb(NET_RULES), fc.constantFrom(...NET.nacl.rules), (flags, rule) => {
        const state = replayLab(TRACE, NET, flags as never[]);
        const flipped = TRACE.reduce(state, { t: 'toggle', rule: rule.id, on: !state.on[rule.id] });
        const before = results(NET, state);
        const after = results(NET, flipped);
        NET.cases.forEach((c, i) => {
          if (!touches(rule, c)) expect(after[i]).toBe(before[i]);
        });
      }),
      RUNS,
    );
  });
});
```

- [ ] **Step 4: Run the tests and see them fail**

```bash
pnpm test tests/unit/lab-trace.test.ts tests/property/lab-trace.property.test.ts 2>&1 | grep -E "FAIL|Error:|Test Files" | head -6
```

Expected: both files fail with `Error: Cannot find module '../../schemas/lab-trace.ts' imported from .../tests/unit/lab-trace.test.ts` (and the same line for the property file), ending `Test Files  2 failed (2)`, since neither the schema nor the model exists yet.

- [ ] **Step 5: Add the Trace spec and action schemas**

Create `schemas/lab-trace.ts`:

```ts
import { z } from 'zod';
import { Slug } from './common.ts';

/**
 * The Trace engine's spec and action schemas (spec 5.1): fixed candidate rules that Dani switches on and off until
 * every test case gives its expected result. `schemas/lab.ts` gathers them into `LAB_SCHEMAS` (Task 4); this file
 * redeclares the goal-id rule, since importing it from `schemas/lab.ts` would make an import cycle.
 */
const GoalRef = z.string().regex(/^g[1-9]$/, 'must look like g1');

/** An IPv4 address in dotted form. */
export const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
/** An IPv4 range in CIDR form, `/0` to `/32`. */
export const CIDR =
  /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/(3[0-2]|[12]?\d)$/;

const Ip = z.string().regex(IPV4, 'must look like 203.0.113.10');
const Cidr = z.string().regex(CIDR, 'must look like 203.0.113.0/24');
const Port = z.int().min(0).max(65535);
const Name = z.string().min(2).max(40);
const CaseLabel = z.string().min(8).max(80);
const Dir = z.enum(['in', 'out']);
const Proto = z.enum(['tcp', 'udp', 'all']);
const Expect = z.enum(['allow', 'deny']);

const SgRule = z.strictObject({
  id: Slug,
  dir: Dir,
  proto: Proto,
  from: Port,
  to: Port,
  cidr: Cidr,
  on: z.boolean(),
});
const NaclRule = z.strictObject({
  id: Slug,
  n: z.int().min(1).max(32766),
  dir: Dir,
  proto: Proto,
  from: Port,
  to: Port,
  cidr: Cidr,
  action: z.enum(['allow', 'deny']),
  on: z.boolean(),
});
const NetCase = z.strictObject({
  id: Slug,
  goal: GoalRef,
  label: CaseLabel,
  dir: Dir,
  proto: z.enum(['tcp', 'udp']),
  ip: Ip,
  port: Port,
  reply: Port,
  expect: Expect,
});
const NetworkSpec = z.strictObject({
  kind: z.literal('network'),
  target: Name,
  sg: z.strictObject({ label: Name, rules: z.array(SgRule).max(12) }),
  nacl: z.strictObject({ label: Name, rules: z.array(NaclRule).max(12) }),
  cases: z.array(NetCase).min(1).max(8),
});

const Pattern = z.string().regex(/^[A-Za-z0-9*:/._-]{1,80}$/, 'must look like s3:GetObject or cafe-menu/*');
const Statement = z.strictObject({
  id: Slug,
  effect: z.enum(['allow', 'deny']),
  actions: z.array(Pattern).min(1).max(6),
  resources: z.array(Pattern).min(1).max(6),
  on: z.boolean(),
});
const Policy = z.strictObject({
  id: Slug,
  label: Name,
  kind: z.enum(['iam', 'scp']),
  attach: Slug,
  statements: z.array(Statement).min(1).max(6),
});
const Principal = z.strictObject({
  id: Slug,
  label: Name,
  groups: z.array(Slug).max(3).default([]),
  account: Slug.optional(),
});
const Group = z.strictObject({ id: Slug, label: Name });
const OrgNode = z.strictObject({ id: Slug, label: Name, parent: Slug.optional() });
const PolicyCase = z.strictObject({
  id: Slug,
  goal: GoalRef,
  label: CaseLabel,
  principal: Slug,
  action: z.string().regex(/^[a-z0-9-]+:[A-Za-z0-9]+$/, 'must look like s3:GetObject'),
  resource: z.string().regex(/^[A-Za-z0-9:/._-]{1,80}$/, 'must look like cafe-menu/today.json'),
  expect: Expect,
});
const PolicySpec = z.strictObject({
  kind: z.literal('policy'),
  principals: z.array(Principal).min(1).max(6),
  groups: z.array(Group).max(4).default([]),
  org: z.array(OrgNode).max(8).default([]),
  policies: z.array(Policy).min(1).max(8),
  cases: z.array(PolicyCase).min(1).max(8),
});

type Issue = (message: string, path: (string | number)[]) => void;
type Network = z.infer<typeof NetworkSpec>;
type Policies = z.infer<typeof PolicySpec>;

/** Reports every id that `items` lists twice, as `<kind> <id> is used twice`. */
function unique(
  items: readonly { id: string }[],
  kind: string,
  at: (i: number) => (string | number)[],
  say: Issue,
) {
  const seen = new Set<string>();
  items.forEach((item, i) => {
    if (seen.has(item.id)) say(`${kind} ${item.id} is used twice`, [...at(i), 'id']);
    seen.add(item.id);
  });
}

function checkNetwork(spec: Network, say: Issue): void {
  const rules = [
    ...spec.sg.rules.map((rule, i) => ({ rule, at: ['sg', 'rules', i] })),
    ...spec.nacl.rules.map((rule, i) => ({ rule, at: ['nacl', 'rules', i] })),
  ];
  unique(
    rules.map((r) => r.rule),
    'rule',
    (i) => rules[i]?.at ?? [],
    say,
  );
  for (const { rule, at } of rules) {
    if (rule.from > rule.to) say('from is above to', [...at, 'from']);
    if (rule.proto === 'all' && (rule.from !== 0 || rule.to !== 65535))
      say('all traffic covers every port: use 0 to 65535', [...at, 'proto']);
  }
  for (const dir of ['in', 'out'] as const) {
    const seen = new Set<number>();
    spec.nacl.rules.forEach((rule, i) => {
      if (rule.dir !== dir) return;
      if (seen.has(rule.n))
        say(`rule number ${rule.n} is used twice ${dir === 'in' ? 'inbound' : 'outbound'}`, [
          'nacl',
          'rules',
          i,
          'n',
        ]);
      seen.add(rule.n);
    });
  }
  unique(spec.cases, 'case', (i) => ['cases', i], say);
}

function checkPolicy(spec: Policies, say: Issue): void {
  unique(spec.policies, 'policy', (i) => ['policies', i], say);
  const statements = spec.policies.flatMap((p, i) =>
    p.statements.map((s, j) => ({ s, at: ['policies', i, 'statements', j] })),
  );
  unique(
    statements.map((x) => x.s),
    'rule',
    (i) => statements[i]?.at ?? [],
    say,
  );
  unique(spec.principals, 'principal', (i) => ['principals', i], say);
  unique(spec.groups, 'group', (i) => ['groups', i], say);
  unique(spec.org, 'node', (i) => ['org', i], say);
  unique(spec.cases, 'case', (i) => ['cases', i], say);

  const groups = new Set(spec.groups.map((g) => g.id));
  const principals = new Set(spec.principals.map((p) => p.id));
  const nodes = new Map(spec.org.map((n) => [n.id, n]));
  const parents = new Set(spec.org.flatMap((n) => (n.parent === undefined ? [] : [n.parent])));

  spec.principals.forEach((p, i) => {
    p.groups.forEach((g, j) => {
      if (!groups.has(g)) say(`names no group: ${g}`, ['principals', i, 'groups', j]);
    });
    if (p.account === undefined) {
      if (spec.org.length > 0) say(`needs an account: ${p.id}`, ['principals', i, 'account']);
    } else if (!nodes.has(p.account) || parents.has(p.account)) {
      say(`names no account: ${p.account}`, ['principals', i, 'account']);
    }
  });

  spec.policies.forEach((p, i) => {
    if (p.kind === 'iam') {
      if (!principals.has(p.attach) && !groups.has(p.attach))
        say(`names no principal or group: ${p.attach}`, ['policies', i, 'attach']);
    } else if (spec.org.length === 0) {
      say('an SCP needs the org', ['policies', i, 'attach']);
    } else if (!nodes.has(p.attach)) {
      say(`names no organization node: ${p.attach}`, ['policies', i, 'attach']);
    }
  });

  if (spec.org.length > 0) {
    if (spec.org.filter((n) => n.parent === undefined).length !== 1)
      say('the org needs exactly one root', ['org']);
    const covered = new Set(spec.policies.filter((p) => p.kind === 'scp').map((p) => p.attach));
    spec.org.forEach((node, i) => {
      if (node.parent !== undefined && !nodes.has(node.parent))
        say(`names no organization node: ${node.parent}`, ['org', i, 'parent']);
      let up = node.parent;
      for (let steps = 0; up !== undefined && steps <= spec.org.length; steps++) {
        if (up === node.id) {
          say(`node ${node.id} is its own ancestor`, ['org', i, 'parent']);
          break;
        }
        up = nodes.get(up)?.parent;
      }
      if (!covered.has(node.id)) say(`node ${node.id} has no SCP`, ['org', i]);
    });
  }

  spec.cases.forEach((c, i) => {
    if (!principals.has(c.principal)) say(`names no principal: ${c.principal}`, ['cases', i, 'principal']);
  });
}

export const TraceSpec = z.discriminatedUnion('kind', [NetworkSpec, PolicySpec]).superRefine((spec, ctx) => {
  const say: Issue = (message, path) => ctx.addIssue({ code: 'custom', message, path });
  if (spec.kind === 'network') checkNetwork(spec, say);
  else checkPolicy(spec, say);
});

export const TraceAction = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('toggle'), rule: Slug, on: z.boolean() }),
  z.strictObject({ t: z.literal('reset') }),
]);

export type TraceSpec = z.infer<typeof TraceSpec>;
export type TraceAction = z.infer<typeof TraceAction>;
export type NetworkTraceSpec = Extract<TraceSpec, { kind: 'network' }>;
export type PolicyTraceSpec = Extract<TraceSpec, { kind: 'policy' }>;
```

- [ ] **Step 6: Add the Trace model**

Create `src/labs/trace/model.ts`:

```ts
import type {
  NetworkTraceSpec,
  PolicyTraceSpec,
  TraceAction,
  TraceSpec,
} from '../../../schemas/lab-trace.ts';
import type { GoalResult, LabEngine } from '../contract.ts';

/**
 * The Trace engine (spec 5.1): fixed candidate rules, each on or off. `start` keeps every rule's starting value, so
 * `reduce` validates a rule id and `reset` restores the start without the spec.
 */
export interface TraceState {
  readonly start: Readonly<Record<string, boolean>>;
  readonly on: Readonly<Record<string, boolean>>;
}

export type HopVerdict = 'allow' | 'deny' | 'nomatch' | 'stateful' | 'skipped';

/** One check a request or its reply passes through. */
export interface TraceHop {
  readonly at: 'nacl-in' | 'sg-in' | 'sg-out' | 'nacl-out' | 'scp' | 'iam';
  /** The org node id of an `scp` hop, else null. */
  readonly node: string | null;
  /** True on the reply leg of a network case. */
  readonly reply: boolean;
  readonly verdict: HopVerdict;
  /** The deciding rule or statement id, `*` for the network ACL's final rule, else null. */
  readonly by: string | null;
}

export interface TraceRun {
  readonly result: 'allow' | 'deny';
  readonly hops: readonly TraceHop[];
}

type NaclRule = NetworkTraceSpec['nacl']['rules'][number];
type SgRule = NetworkTraceSpec['sg']['rules'][number];
type NetCase = NetworkTraceSpec['cases'][number];
type PolicyCase = PolicyTraceSpec['cases'][number];
type Statement = PolicyTraceSpec['policies'][number]['statements'][number];

/** Every rule or statement id of a spec with its starting value. */
function initial(spec: TraceSpec): TraceState {
  const rules =
    spec.kind === 'network'
      ? [...spec.sg.rules, ...spec.nacl.rules]
      : spec.policies.flatMap((p) => p.statements);
  const start = Object.fromEntries(rules.map((r) => [r.id, r.on]));
  return { start, on: start };
}

const sameFlags = (a: Readonly<Record<string, boolean>>, b: Readonly<Record<string, boolean>>): boolean =>
  Object.keys(a).every((id) => a[id] === b[id]);

/** The IPv4 address as an unsigned 32-bit number, or null when it is not one. */
function ipNumber(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || Number(part) > 255) return null;
    n = n * 256 + Number(part);
  }
  return n;
}

/** True when `ip` lies in `cidr`, by a 32-bit mask compare; `/0` matches every address. */
export function inCidr(ip: string, cidr: string): boolean {
  const [base = '', bitsText = ''] = cidr.split('/');
  const bits = /^\d{1,2}$/.test(bitsText) ? Number(bitsText) : -1;
  const a = ipNumber(ip);
  const b = ipNumber(base);
  if (a === null || b === null || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const shift = 32 - bits;
  return Math.floor(a / 2 ** shift) === Math.floor(b / 2 ** shift);
}

/** True when `value` matches `pattern`, where `*` stands for any run of characters, possibly empty. */
export function globMatch(pattern: string, value: string, ignoreCase = false): boolean {
  const p = ignoreCase ? pattern.toLowerCase() : pattern;
  const v = ignoreCase ? value.toLowerCase() : value;
  let pi = 0;
  let vi = 0;
  let star = -1;
  let mark = 0;
  while (vi < v.length) {
    if (pi < p.length && p[pi] !== '*' && p[pi] === v[vi]) {
      pi++;
      vi++;
    } else if (pi < p.length && p[pi] === '*') {
      star = pi++;
      mark = vi;
    } else if (star >= 0) {
      pi = star + 1;
      vi = ++mark;
    } else {
      return false;
    }
  }
  while (pi < p.length && p[pi] === '*') pi++;
  return pi === p.length;
}

/** Goal ids in the order the cases first name them. */
export function traceGoals(spec: TraceSpec): string[] {
  return [...new Set(spec.cases.map((c) => c.goal))];
}

const isOn = (state: TraceState, id: string): boolean => state.on[id] === true;

const covers = (rule: SgRule | NaclRule, c: NetCase, port: number): boolean =>
  (rule.proto === 'all' || rule.proto === c.proto) &&
  port >= rule.from &&
  port <= rule.to &&
  inCidr(c.ip, rule.cidr);

/** A network ACL hop: enabled rules of that direction by ascending number, the first match decides, else `*`. */
function naclHop(
  spec: NetworkTraceSpec,
  state: TraceState,
  c: NetCase,
  dir: 'in' | 'out',
  reply: boolean,
): TraceHop {
  const port = reply ? c.reply : c.port;
  const hit = spec.nacl.rules
    .filter((r) => r.dir === dir && isOn(state, r.id))
    .sort((a, b) => a.n - b.n)
    .find((r) => covers(r, c, port));
  const at = dir === 'in' ? 'nacl-in' : 'nacl-out';
  return hit === undefined
    ? { at, node: null, reply, verdict: 'deny', by: '*' }
    : { at, node: null, reply, verdict: hit.action, by: hit.id };
}

/** A security group hop: a request needs an enabled allow; the reply of an allowed request always passes. */
function sgHop(
  spec: NetworkTraceSpec,
  state: TraceState,
  c: NetCase,
  dir: 'in' | 'out',
  reply: boolean,
): TraceHop {
  const at = dir === 'in' ? 'sg-in' : 'sg-out';
  if (reply) return { at, node: null, reply, verdict: 'stateful', by: null };
  const hit = spec.sg.rules.find((r) => r.dir === dir && isOn(state, r.id) && covers(r, c, c.port));
  return hit === undefined
    ? { at, node: null, reply, verdict: 'nomatch', by: null }
    : { at, node: null, reply, verdict: 'allow', by: hit.id };
}

function networkRun(spec: NetworkTraceSpec, state: TraceState, c: NetCase): TraceRun {
  const back = c.dir === 'in' ? 'out' : 'in';
  const legs: (() => TraceHop)[] =
    c.dir === 'in'
      ? [
          () => naclHop(spec, state, c, 'in', false),
          () => sgHop(spec, state, c, 'in', false),
          () => sgHop(spec, state, c, back, true),
          () => naclHop(spec, state, c, back, true),
        ]
      : [
          () => sgHop(spec, state, c, 'out', false),
          () => naclHop(spec, state, c, 'out', false),
          () => naclHop(spec, state, c, back, true),
          () => sgHop(spec, state, c, back, true),
        ];
  const hops: TraceHop[] = [];
  let dropped = false;
  for (const leg of legs) {
    const hop = leg();
    if (dropped) {
      hops.push({ ...hop, verdict: 'skipped', by: null });
      continue;
    }
    hops.push(hop);
    if (hop.verdict === 'deny' || hop.verdict === 'nomatch') dropped = true;
  }
  return { result: dropped ? 'deny' : 'allow', hops };
}

/** Deny on an enabled matching Deny, else allow on an enabled matching Allow, else no match. */
function judge(
  statements: readonly Statement[],
  state: TraceState,
  c: PolicyCase,
): Pick<TraceHop, 'verdict' | 'by'> {
  const matching = statements.filter(
    (s) =>
      isOn(state, s.id) &&
      s.actions.some((a) => globMatch(a, c.action, true)) &&
      s.resources.some((r) => globMatch(r, c.resource)),
  );
  const deny = matching.find((s) => s.effect === 'deny');
  if (deny !== undefined) return { verdict: 'deny', by: deny.id };
  const allow = matching.find((s) => s.effect === 'allow');
  return allow === undefined ? { verdict: 'nomatch', by: null } : { verdict: 'allow', by: allow.id };
}

/** The org node ids from the root down to `account`; empty without an org. */
function orgPath(spec: PolicyTraceSpec, account: string | undefined): string[] {
  const path: string[] = [];
  let id = account;
  while (id !== undefined && path.length <= spec.org.length) {
    const node = spec.org.find((n) => n.id === id);
    if (node === undefined || path.includes(node.id)) break;
    path.unshift(node.id);
    id = node.parent;
  }
  return path;
}

function policyRun(spec: PolicyTraceSpec, state: TraceState, c: PolicyCase): TraceRun | null {
  const principal = spec.principals.find((p) => p.id === c.principal);
  if (principal === undefined) return null;
  const scps = orgPath(spec, principal.account).map(
    (node): TraceHop => ({
      at: 'scp',
      node,
      reply: false,
      ...judge(
        spec.policies.filter((p) => p.kind === 'scp' && p.attach === node).flatMap((p) => p.statements),
        state,
        c,
      ),
    }),
  );
  const holders = new Set([principal.id, ...principal.groups]);
  const iam: TraceHop = {
    at: 'iam',
    node: null,
    reply: false,
    ...judge(
      spec.policies.filter((p) => p.kind === 'iam' && holders.has(p.attach)).flatMap((p) => p.statements),
      state,
      c,
    ),
  };
  const hops = [...scps, iam];
  return { result: hops.every((h) => h.verdict === 'allow') ? 'allow' : 'deny', hops };
}

/** Steps one test case through its hops with the rules as they are now; null for a case the spec does not hold. */
export function traceCase(spec: TraceSpec, state: TraceState, caseId: string): TraceRun | null {
  if (spec.kind === 'network') {
    const c = spec.cases.find((x) => x.id === caseId);
    return c === undefined ? null : networkRun(spec, state, c);
  }
  const c = spec.cases.find((x) => x.id === caseId);
  return c === undefined ? null : policyRun(spec, state, c);
}

/** The cases of a goal whose result differs from the expected one, in spec order. */
function misses(spec: TraceSpec, state: TraceState, goalId: string) {
  const cases: readonly (NetCase | PolicyCase)[] = spec.cases;
  return cases
    .filter((c) => c.goal === goalId)
    .map((c) => ({ c, result: traceCase(spec, state, c.id)?.result ?? 'deny' }))
    .filter(({ c, result }) => result !== c.expect);
}

export const TRACE: LabEngine<TraceSpec, TraceState, TraceAction> = {
  init: initial,

  reduce(state, action) {
    if (typeof action !== 'object' || action === null) return state;
    const a = action as { t?: unknown; rule?: unknown; on?: unknown };
    if (a.t === 'reset') return sameFlags(state.on, state.start) ? state : { ...state, on: state.start };
    if (a.t !== 'toggle' || typeof a.rule !== 'string' || typeof a.on !== 'boolean') return state;
    if (!Object.hasOwn(state.on, a.rule) || state.on[a.rule] === a.on) return state;
    return { ...state, on: { ...state.on, [a.rule]: a.on } };
  },

  check(spec, state): GoalResult[] {
    return traceGoals(spec).map((goalId) => {
      const total = spec.cases.filter((c) => c.goal === goalId).length;
      const right = total - misses(spec, state, goalId).length;
      return { goalId, pass: right === total, message: `${right} of ${total} cases as expected` };
    });
  },

  hint(spec, state, goalId) {
    const first = misses(spec, state, goalId)[0];
    if (first === undefined) return 'Every case of this goal gives the expected result.';
    return first.result === 'allow'
      ? `${first.c.label}: allowed, but it should be denied.`
      : `${first.c.label}: denied, but it should be allowed.`;
  },
};
```

- [ ] **Step 7: Run the tests, the type check and the linter and see them pass**

```bash
pnpm test tests/unit/lab-trace.test.ts tests/property/lab-trace.property.test.ts 2>&1 | grep -E "FAIL|Test Files|Tests "
pnpm typecheck
pnpm lint:fix
pnpm lint 2>&1 | tail -2
```

Expected: `Test Files  2 passed (2)` and `Tests  77 passed (77)` (71 unit tests, 6 properties); `tsc --noEmit` prints nothing more; Biome ends `No fixes applied.` on the second run, which also confirms `src/labs/trace/model.ts` keeps the purity rule (no zod, UI, store or DOM imports).
Never run the whole unit suite by hand on the shared machine; the pre-commit hook runs `pnpm check` once.

- [ ] **Step 8: Commit**

```bash
git add schemas/lab-trace.ts src/labs/trace/model.ts tests/fixtures/lab-trace.ts tests/unit/lab-trace.test.ts tests/property/lab-trace.property.test.ts
git commit -m "Add the Trace lab model" -m "Stateful security groups, stateless ordered network ACLs, and explicit deny over allow over implicit deny with SCPs; not registered yet."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds; nothing outside the five new files changes, so the branch merges in any order with Tasks 1 and 3.

---

## Task 3: The Investigate model

**Files:**
- Create: `schemas/lab-investigate.ts`, `src/labs/investigate/model.ts`, `tests/fixtures/lab-investigate.ts`, `tests/unit/lab-investigate.test.ts`, `tests/property/lab-investigate.property.test.ts`
- Modify: nothing (the engine is registered by Task 4)
- Test: `tests/unit/lab-investigate.test.ts`, `tests/property/lab-investigate.property.test.ts`

Builds on: Phase 4 Task 1 only (`Slug` in `schemas/common.ts`, `LabFile` in `schemas/lab.ts`, `GoalResult`, `LabEngine`, `replayLab` and `allPass` in `src/labs/contract.ts`, `AnyLabEngine`, `EngineEntry` and `checkLab` in `src/labs/engines.ts`, `toPlain` in `src/engine/replay.ts`), all on `master`.
It runs in the worktree `<scratchpad>/p5/wt/investigate` on the branch `p5/investigate`, creates new files only, and merges in any order with Tasks 1 and 2, at the latest on Wednesday, October 14.

Design notes:
- Investigate is spec 5.1's "filter fictional CloudTrail events, metrics or findings, then answer": a spec holds a `source` caption, an optional `listing` (up to 40 plain lines, such as a template), `columns` (some marked `filter: true`), `records` whose `cells` name every column, and 1 to 8 `questions`, each in one goal, with 2 to 8 options and one `answer` option id.
- Answers are option ids chosen from a list, so "exact" has one meaning, the keyboard needs no typing, and R11 can replay every solution and wrong path; a goal passes when every one of its answers equals its key.
- Filters narrow the records shown and never change a check: `check` reads `answers` only, and a property test proves it for any mix of filters and answers.
- The state keeps each filter column's distinct values and each question's option ids beside the filters and answers, so `reduce` rejects an unknown column, a value of another column, an unknown question or an option of another question on its own and returns the very same state object, as the contract asks; a repeated filter, a repeated answer, an `unfilter` with no filter on and a `reset` of a fresh board are no-ops and return the same object too.
- No action clears one answer: an answer can change but never go back to unanswered, so a finished board stays finished; `reset` clears filters and answers together.
- `investigateComplete` is true when every question has an answer, which is what makes R11 reject a wrong path that leaves a question open (Task 4 registers it as the engine's `complete`); `settle` is empty, because nothing runs before a check.
- Goals come back in the order the questions first name them, the contract's first-mention order, so R11's `goals do not match the spec` check works for Investigate unchanged.
- The zod schemas live in their own file beside `schemas/lab.ts`, which Task 4 imports into `LAB_SCHEMAS`; the file redeclares the goal-id rule as a local `GoalRef`, because importing `GoalId` from `schemas/lab.ts` would make an import cycle once `schemas/lab.ts` imports this file.
- Times in a record are written in UTC with the `UTC` suffix, and the brief says so (P5-043), so a `when` question has one exact answer; the fixture shows the form.
- A listing-only spec (the Module 4 template stretch lab) has no columns and no records; `needs records or a listing` rejects a spec with neither, `records need columns` rejects records with no columns (and then skips the per-cell checks, so that one mistake gives one message), and `a filter column needs records` rejects a filter with nothing to filter.
- The model is pure: it imports only types (`import type`), and the Phase 4 Biome override on `src/labs/**/*.ts` already bans zod, Preact, signals, `src/app`, `src/ui`, `src/store` and the DOM globals there.
- `LabFile['engine']` names `investigate` only once Task 4 widens `LAB_ENGINES`, so the fixture exports `InvestigateLabFile`, `LabFile` with `engine: 'investigate'`, which is assignable to `LabFile` from Task 4 on; Task 4's R11 tests pass `bakeryInvestigateLab()` where a `LabFile` is expected.
- The fixture `bakeryInvestigateLab` (a made-up bakery pantry ledger, no course text, debrief `q-b4k7m2` and `q-d9p4r6`) is the worked example of the engine: the unit, property and R11 tests run on it, Task 8's synthetic end-to-end lab ships its spec, and Task 9's writer prompt points to it.
- Covers P5-008, P5-012 (the model half), P5-013, P5-014, P5-015, P5-016 (Investigate), P5-018 (Investigate), P5-020, P5-039 to P5-045, P5-084, P5-085, P5-086 and P5-087, each for Investigate.

- [ ] **Step 1: Write the worked example as the test fixture**

Create `tests/fixtures/lab-investigate.ts`:

```ts
import type { LabFile } from '../../schemas/lab.ts';
import type { InvestigateSpec } from '../../schemas/lab-investigate.ts';

/** Made-up bakery Investigate specs and a whole lab (spec 5.1); no course text. */

/**
 * A lab file of the Investigate engine: `LabFile['engine']` names `investigate` only once Phase 5 Task 4 adds it to
 * `LAB_ENGINES`, and this type is assignable to `LabFile` from then on.
 */
export type InvestigateLabFile = Omit<LabFile, 'engine'> & { engine: 'investigate' };

/** The pantry ledger of one made-up morning: 8 records, 3 filter columns, 3 questions in 2 goals. */
export const INVESTIGATE_SPEC: InvestigateSpec = {
  source: 'Pantry ledger, Flourtown bakery, 14 March, times in UTC',
  columns: [
    { id: 'time', label: 'Time', filter: false },
    { id: 'who', label: 'Who', filter: true },
    { id: 'event', label: 'Event', filter: true },
    { id: 'item', label: 'Item', filter: false },
    { id: 'result', label: 'Result', filter: true },
  ],
  records: [
    {
      id: 'r1',
      cells: { time: '06:02 UTC', who: 'Mara', event: 'Open pantry', item: 'Front door', result: 'Done' },
    },
    {
      id: 'r2',
      cells: { time: '06:15 UTC', who: 'Mara', event: 'Take out', item: 'Rye flour', result: 'Done' },
    },
    {
      id: 'r3',
      cells: { time: '06:40 UTC', who: 'Tobin', event: 'Open pantry', item: 'Front door', result: 'Done' },
    },
    {
      id: 'r4',
      cells: {
        time: '07:05 UTC',
        who: 'Tobin',
        event: 'Throw away',
        item: 'Sourdough starter',
        result: 'Refused',
      },
    },
    {
      id: 'r5',
      cells: { time: '07:30 UTC', who: 'Ines', event: 'Open pantry', item: 'Back door', result: 'Done' },
    },
    {
      id: 'r6',
      cells: {
        time: '07:32 UTC',
        who: 'Ines',
        event: 'Throw away',
        item: 'Sourdough starter',
        result: 'Done',
      },
    },
    {
      id: 'r7',
      cells: { time: '08:10 UTC', who: 'Mara', event: 'Take out', item: 'Butter', result: 'Done' },
    },
    {
      id: 'r8',
      cells: { time: '08:45 UTC', who: 'Tobin', event: 'Count stock', item: 'Starter jar', result: 'Done' },
    },
  ],
  questions: [
    {
      id: 'who',
      goal: 'g1',
      prompt: 'Who threw the sourdough starter away?',
      options: [
        { id: 'mara', label: 'Mara' },
        { id: 'tobin', label: 'Tobin' },
        { id: 'ines', label: 'Ines' },
      ],
      answer: 'ines',
    },
    {
      id: 'what',
      goal: 'g1',
      prompt: 'Which event took the starter out of the pantry for good?',
      options: [
        { id: 'take-out', label: 'Take out' },
        { id: 'throw-away', label: 'Throw away' },
        { id: 'count-stock', label: 'Count stock' },
      ],
      answer: 'throw-away',
    },
    {
      id: 'when',
      goal: 'g2',
      prompt: 'When did the starter leave the pantry?',
      options: [
        { id: 'at-0705', label: '07:05 UTC' },
        { id: 'at-0732', label: '07:32 UTC' },
        { id: 'at-0845', label: '08:45 UTC' },
      ],
      answer: 'at-0732',
    },
  ],
};

/** A recipe card read as a listing: no records, no columns, one question. */
export const INVESTIGATE_LISTING_SPEC: InvestigateSpec = {
  source: 'Recipe card for the Saturday rolls',
  listing: {
    label: 'Recipe card',
    lines: [
      'recipe: saturday-rolls',
      'makes: 40 rolls',
      'flour: 5 kg',
      'water: 3 litres',
      'yeast: 50 g',
      'salt: 100 g',
      'proof: 2 hours',
      'bake: 20 minutes at 220 degrees',
    ],
  },
  columns: [],
  records: [],
  questions: [
    {
      id: 'proof',
      goal: 'g1',
      prompt: 'How long does the dough proof?',
      options: [
        { id: 'twenty-minutes', label: '20 minutes' },
        { id: 'two-hours', label: '2 hours' },
        { id: 'five-hours', label: '5 hours' },
      ],
      answer: 'two-hours',
    },
  ],
};

/** A complete Investigate lab on the pantry ledger: a solution, one wrong path per goal, the fixture debrief. */
export function bakeryInvestigateLab(over: Partial<InvestigateLabFile> = {}): InvestigateLabFile {
  return {
    id: 'lab-m01-bakery-ledger',
    module: 1,
    title: 'Who threw away the starter?',
    engine: 'investigate',
    tier: 'core',
    status: 'live',
    rev: 1,
    concepts: ['shared-kitchen', 'per-minute-rental'],
    notes: ['m01/what-a-bakery-cloud-is'],
    minutes: 5,
    brief:
      'The sourdough starter is gone from the bakery pantry. Filter the pantry ledger, then answer who threw the starter away, how, and when. Every time in the ledger is in UTC.',
    spec: INVESTIGATE_SPEC,
    goals: [
      {
        id: 'g1',
        label: 'Name who threw the starter away, and how',
        hint: 'A refused event changes nothing in the pantry; only an event that is done removes the starter.',
      },
      {
        id: 'g2',
        label: 'Pin down when the starter left',
        hint: 'Every time in this ledger is in UTC; read the time of the event that worked.',
      },
    ],
    solution: [
      { t: 'filter', column: 'event', value: 'Throw away' },
      { t: 'answer', question: 'who', option: 'ines' },
      { t: 'answer', question: 'what', option: 'throw-away' },
      { t: 'answer', question: 'when', option: 'at-0732' },
    ],
    wrongPaths: [
      {
        actions: [
          { t: 'answer', question: 'who', option: 'tobin' },
          { t: 'answer', question: 'what', option: 'throw-away' },
          { t: 'answer', question: 'when', option: 'at-0732' },
        ],
        failsGoal: 'g1',
        mistake: 'Blames the first person who tried, though that try was refused',
      },
      {
        actions: [
          { t: 'answer', question: 'who', option: 'ines' },
          { t: 'answer', question: 'what', option: 'throw-away' },
          { t: 'answer', question: 'when', option: 'at-0705' },
        ],
        failsGoal: 'g2',
        mistake: 'Takes the time of the refused try for the time of the loss',
      },
    ],
    debrief: {
      lines: [
        'A ledger that records every try, refused or done, tells you who acted, what they did and when.',
        'Filtering narrows what you read; the answer still comes from the one record that worked.',
      ],
      questions: ['q-b4k7m2', 'q-d9p4r6'],
    },
    ...over,
  };
}
```

- [ ] **Step 2: Write the failing unit tests**

Create `tests/unit/lab-investigate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { InvestigateAction, InvestigateSpec } from '../../schemas/lab-investigate.ts';
import { allPass, replayLab } from '../../src/labs/contract.ts';
import { type AnyLabEngine, checkLab, type EngineEntry } from '../../src/labs/engines.ts';
import {
  filterValues,
  INVESTIGATE,
  type InvestigateState,
  investigateComplete,
  investigateGoals,
  visibleRecords,
} from '../../src/labs/investigate/model.ts';
import {
  bakeryInvestigateLab,
  INVESTIGATE_LISTING_SPEC,
  INVESTIGATE_SPEC,
} from '../fixtures/lab-investigate.ts';

const lab = bakeryInvestigateLab();
const spec = InvestigateSpec.parse(lab.spec);
const run = (actions: readonly unknown[]): InvestigateState =>
  replayLab(INVESTIGATE, spec, actions as never[]);
const words = (state: InvestigateState) =>
  INVESTIGATE.check(spec, state).map((r) => [r.goalId, r.pass, r.message]);
const shown = (actions: readonly unknown[]): string[] => visibleRecords(spec, run(actions)).map((r) => r.id);
const answer = (question: string, option: string) => ({ t: 'answer', question, option });
const filter = (column: string, value: string) => ({ t: 'filter', column, value });

/** The one element a fixture list must have at `i`. */
function at<T>(list: readonly T[], i: number): T {
  const item = list[i];
  if (item === undefined) throw new Error(`the fixture has no element ${i}`);
  return item;
}

/** Every issue of a spec as `path: message`, or none when it parses. */
function issues(value: unknown): string[] {
  const r = InvestigateSpec.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
}

describe('Investigate spec schema (spec 5.1)', () => {
  it('accepts the pantry ledger and the recipe card listing', () => {
    expect(issues(INVESTIGATE_SPEC)).toEqual([]);
    expect(issues(INVESTIGATE_LISTING_SPEC)).toEqual([]);
  });

  it('defaults a column to no filter and a listing to no columns or records', () => {
    const { columns, records, ...bare } = INVESTIGATE_LISTING_SPEC;
    const parsed = InvestigateSpec.parse(bare);
    expect([parsed.columns, parsed.records]).toEqual([[], []]);
    const plain = InvestigateSpec.parse({
      ...INVESTIGATE_SPEC,
      columns: INVESTIGATE_SPEC.columns.map(({ filter, ...c }) => c),
    });
    expect(plain.columns.every((c) => c.filter === false)).toBe(true);
  });

  const r1 = at(INVESTIGATE_SPEC.records, 0);
  const otherRecords = INVESTIGATE_SPEC.records.slice(1);
  const who = at(INVESTIGATE_SPEC.questions, 0);
  const otherQuestions = INVESTIGATE_SPEC.questions.slice(1);
  const { listing: _listing, ...listingless } = INVESTIGATE_LISTING_SPEC;
  const { item: _item, ...cellsWithoutItem } = r1.cells;

  it.each([
    ['nothing to read', listingless, ': needs records or a listing'],
    ['records without columns', { ...INVESTIGATE_SPEC, columns: [] }, 'columns: records need columns'],
    [
      'a repeated column',
      { ...INVESTIGATE_SPEC, columns: [...INVESTIGATE_SPEC.columns, { id: 'who', label: 'Who again' }] },
      'columns.5.id: column who is used twice',
    ],
    [
      'a repeated record',
      { ...INVESTIGATE_SPEC, records: [...INVESTIGATE_SPEC.records, r1] },
      'records.8.id: record r1 is used twice',
    ],
    [
      'a record without a cell for a column',
      { ...INVESTIGATE_SPEC, records: [{ ...r1, cells: cellsWithoutItem }, ...otherRecords] },
      'records.0.cells: record r1 has no cell for column item',
    ],
    [
      'a cell of no column',
      {
        ...INVESTIGATE_SPEC,
        records: [{ ...r1, cells: { ...r1.cells, oven: 'Deck oven' } }, ...otherRecords],
      },
      'records.0.cells.oven: names no column: oven',
    ],
    [
      'a repeated question',
      { ...INVESTIGATE_SPEC, questions: [...INVESTIGATE_SPEC.questions, who] },
      'questions.3.id: question who is used twice',
    ],
    [
      'a repeated option',
      {
        ...INVESTIGATE_SPEC,
        questions: [
          { ...who, options: [...who.options, { id: 'mara', label: 'Mara again' }] },
          ...otherQuestions,
        ],
      },
      'questions.0.options.3.id: option mara is used twice',
    ],
    [
      'an answer that is not an option',
      { ...INVESTIGATE_SPEC, questions: [{ ...who, answer: 'olek' }, ...otherQuestions] },
      'questions.0.answer: names no option: olek',
    ],
    [
      'a filter column with no records',
      { ...INVESTIGATE_LISTING_SPEC, columns: [{ id: 'step', label: 'Step', filter: true }] },
      'columns.0.filter: a filter column needs records',
    ],
  ])('rejects %s with its message and path', (_, value, issue) => {
    expect(issues(value)).toEqual([issue]);
  });

  it('parses filter, unfilter, answer and reset actions only', () => {
    expect(InvestigateAction.safeParse(filter('who', 'Ines')).success).toBe(true);
    expect(InvestigateAction.safeParse({ t: 'unfilter', column: 'who' }).success).toBe(true);
    expect(InvestigateAction.safeParse(answer('who', 'ines')).success).toBe(true);
    expect(InvestigateAction.safeParse({ t: 'reset' }).success).toBe(true);
    expect(InvestigateAction.safeParse(filter('who', '')).success).toBe(false);
    expect(InvestigateAction.safeParse({ t: 'clear' }).success).toBe(false);
  });
});

describe('the Investigate checker (spec 5.1, 9)', () => {
  it('starts with no filter and no answer, knows each filter value and fails every goal', () => {
    const start = INVESTIGATE.init(spec);
    expect(start.filterable).toEqual({
      who: ['Mara', 'Tobin', 'Ines'],
      event: ['Open pantry', 'Take out', 'Throw away', 'Count stock'],
      result: ['Done', 'Refused'],
    });
    expect([start.filters, start.answers]).toEqual([{}, {}]);
    expect(investigateGoals(spec)).toEqual(['g1', 'g2']);
    expect(words(start)).toEqual([
      ['g1', false, '0 of 2 right'],
      ['g2', false, '0 of 1 right'],
    ]);
    expect(visibleRecords(spec, start)).toEqual(spec.records);
  });

  it('passes every goal with the solution, and each wrong path fails only its goal', () => {
    expect(words(run(lab.solution))).toEqual([
      ['g1', true, '2 of 2 right'],
      ['g2', true, '1 of 1 right'],
    ]);
    for (const path of lab.wrongPaths) {
      const state = run(path.actions);
      expect(investigateComplete(spec, state)).toBe(true);
      const failed = INVESTIGATE.check(spec, state).filter((r) => !r.pass);
      expect(failed.map((r) => r.goalId)).toEqual([path.failsGoal]);
    }
  });

  it('lists the distinct values of a column in first-seen order', () => {
    expect(filterValues(spec, 'event')).toEqual(['Open pantry', 'Take out', 'Throw away', 'Count stock']);
    expect(filterValues(spec, 'oven')).toEqual([]);
  });

  it.each([
    ['one filter', [filter('who', 'Tobin')], ['r3', 'r4', 'r8']],
    ['two filters', [filter('who', 'Tobin'), filter('event', 'Throw away')], ['r4']],
    [
      'a filter then unfilter',
      [filter('who', 'Tobin'), filter('event', 'Throw away'), { t: 'unfilter', column: 'who' }],
      ['r4', 'r6'],
    ],
    ['a changed filter value', [filter('who', 'Tobin'), filter('who', 'Ines')], ['r5', 'r6']],
    ['a filter that leaves no record', [filter('who', 'Mara'), filter('result', 'Refused')], []],
  ])('shows the records of %s', (_, actions, ids) => {
    expect(shown(actions)).toEqual(ids);
  });

  it.each([
    ['a value of another column', filter('who', 'Throw away')],
    ['a column without a filter', filter('time', '06:02 UTC')],
    ['an unknown column', filter('oven', 'Mara')],
    ['an unfilter with no filter on', { t: 'unfilter', column: 'who' }],
    ['an unknown question', answer('why', 'ines')],
    ['an option of another question', answer('who', 'throw-away')],
    ['a reset of a fresh board', { t: 'reset' }],
    ['an unknown action', { t: 'place', card: 'who', bucket: 'ines' }],
    ['a value that is not an object', 'answer'],
    ['null', null],
  ])('ignores %s and returns the same state object', (_, action) => {
    const start = INVESTIGATE.init(spec);
    expect(INVESTIGATE.reduce(start, action as never)).toBe(start);
  });

  it('returns the same state object for a filter or an answer that changes nothing', () => {
    const filtered = run([filter('who', 'Ines')]);
    expect(INVESTIGATE.reduce(filtered, filter('who', 'Ines') as never)).toBe(filtered);
    const answered = run([answer('who', 'ines')]);
    expect(INVESTIGATE.reduce(answered, answer('who', 'ines') as never)).toBe(answered);
  });

  it('checks exact answers: a wrong when fails only its goal, and changing it back passes again', () => {
    const right = [answer('who', 'ines'), answer('what', 'throw-away'), answer('when', 'at-0732')];
    expect(words(run([...right, answer('when', 'at-0705')]))).toEqual([
      ['g1', true, '2 of 2 right'],
      ['g2', false, '0 of 1 right'],
    ]);
    expect(
      allPass(INVESTIGATE.check(spec, run([...right, answer('when', 'at-0705'), answer('when', 'at-0732')]))),
    ).toBe(true);
    expect(words(run([answer('who', 'mara'), answer('what', 'throw-away')]))).toEqual([
      ['g1', false, '1 of 2 right'],
      ['g2', false, '0 of 1 right'],
    ]);
  });

  it('never changes a check because of the filters', () => {
    const answers = [answer('who', 'tobin'), answer('when', 'at-0732')];
    const filters = [filter('who', 'Mara'), filter('result', 'Refused'), { t: 'unfilter', column: 'who' }];
    expect(INVESTIGATE.check(spec, run([...filters, ...answers]))).toEqual(
      INVESTIGATE.check(spec, run(answers)),
    );
    expect(INVESTIGATE.check(spec, run([...answers, ...filters]))).toEqual(
      INVESTIGATE.check(spec, run(answers)),
    );
  });

  it('is complete only once every question has an answer', () => {
    expect(investigateComplete(spec, INVESTIGATE.init(spec))).toBe(false);
    expect(investigateComplete(spec, run([answer('who', 'ines'), answer('what', 'take-out')]))).toBe(false);
    expect(investigateComplete(spec, run(at(lab.wrongPaths, 0).actions))).toBe(true);
  });

  it('reset clears every filter and answer', () => {
    expect(run([...lab.solution, { t: 'reset' }])).toEqual(INVESTIGATE.init(spec));
  });

  it('checks the same through a registry entry built like Task 4 adds it', () => {
    const entry: EngineEntry = {
      engine: INVESTIGATE as unknown as AnyLabEngine,
      settle: [],
      complete: (s, state) => investigateComplete(s as InvestigateSpec, state as InvestigateState),
    };
    const state = run(at(lab.wrongPaths, 1).actions);
    expect(checkLab(entry, spec, state)).toEqual(INVESTIGATE.check(spec, state));
    expect(entry.complete(spec, INVESTIGATE.init(spec))).toBe(false);
  });

  it('reads a listing with no records and checks its one question', () => {
    const listing = InvestigateSpec.parse(INVESTIGATE_LISTING_SPEC);
    const start = INVESTIGATE.init(listing);
    expect(start.filterable).toEqual({});
    expect(visibleRecords(listing, start)).toEqual([]);
    const done = INVESTIGATE.reduce(start, answer('proof', 'two-hours') as never);
    expect(INVESTIGATE.check(listing, done)).toEqual([{ goalId: 'g1', pass: true, message: '1 of 1 right' }]);
  });

  it('hints in one sentence about the answers of a goal', () => {
    const start = INVESTIGATE.init(spec);
    expect(INVESTIGATE.hint(spec, start, 'g1')).toBe('2 questions still unanswered.');
    expect(INVESTIGATE.hint(spec, start, 'g2')).toBe('1 question still unanswered.');
    expect(INVESTIGATE.hint(spec, run([answer('who', 'tobin')]), 'g1')).toBe(
      '1 question still unanswered and 1 answer wrong.',
    );
    expect(INVESTIGATE.hint(spec, run([answer('who', 'tobin'), answer('what', 'take-out')]), 'g1')).toBe(
      '2 answers wrong.',
    );
    expect(INVESTIGATE.hint(spec, run(lab.solution), 'g1')).toBe('Every answer of this goal is right.');
  });
});
```

- [ ] **Step 3: Write the failing property tests**

Create `tests/property/lab-investigate.property.test.ts` (its own `RUNS`, with Phase 4's seed and run count, because `tests/property/labs.property.test.ts` does not export its copy):

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { InvestigateSpec } from '../../schemas/lab-investigate.ts';
import { toPlain } from '../../src/engine/replay.ts';
import { replayLab } from '../../src/labs/contract.ts';
import { INVESTIGATE, investigateGoals, visibleRecords } from '../../src/labs/investigate/model.ts';
import { INVESTIGATE_SPEC } from '../fixtures/lab-investigate.ts';

/** The Investigate reducer (spec 5.1, 9): any action sequence never throws, replays the same and checks purely. */
const RUNS = { seed: 20_261_031, numRuns: 200 };

const SPEC = InvestigateSpec.parse(INVESTIGATE_SPEC);
const columnArb = fc.constantFrom(...SPEC.columns.map((c) => c.id), 'oven', '');
const valueArb = fc.constantFrom(...new Set(SPEC.records.flatMap((r) => Object.values(r.cells))), 'Olek', '');
const questionArb = fc.constantFrom(...SPEC.questions.map((q) => q.id), 'why', '');
const optionArb = fc.constantFrom(...SPEC.questions.flatMap((q) => q.options.map((o) => o.id)), 'olek', '');
const filterArb = fc.oneof(
  fc.record({ t: fc.constant('filter'), column: columnArb, value: valueArb }),
  fc.record({ t: fc.constant('unfilter'), column: columnArb }),
);
const answerArb = fc.record({ t: fc.constant('answer'), question: questionArb, option: optionArb });
const actionArb: fc.Arbitrary<unknown> = fc.oneof(
  filterArb,
  answerArb,
  fc.constant({ t: 'reset' }),
  fc.anything(),
);
const run = (actions: readonly unknown[]) => replayLab(INVESTIGATE, SPEC, actions as never[]);

describe('the Investigate reducer', () => {
  it('never throws, is deterministic and checks purely', () => {
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 40 }), (actions) => {
        const once = run(actions);
        const twice = run(actions);
        expect(toPlain(once)).toEqual(toPlain(twice));
        const before = toPlain(once);
        const first = INVESTIGATE.check(SPEC, once);
        expect(INVESTIGATE.check(SPEC, once)).toEqual(first);
        expect(toPlain(once)).toEqual(before);
        expect(first.map((r) => r.goalId)).toEqual(investigateGoals(SPEC));
      }),
      RUNS,
    );
  });

  it('rejected actions return the same state', () => {
    const unknown = fc.oneof(
      fc.record({ t: fc.constant('filter'), column: fc.constantFrom('oven', 'time'), value: valueArb }),
      fc.record({
        t: fc.constant('filter'),
        column: fc.constantFrom('who', 'event'),
        value: fc.constant('Olek'),
      }),
      fc.record({ t: fc.constant('unfilter'), column: fc.constantFrom('oven', '') }),
      fc.record({ t: fc.constant('answer'), question: fc.constantFrom('why', ''), option: optionArb }),
      fc.record({ t: fc.constant('answer'), question: questionArb, option: fc.constantFrom('olek', '') }),
      fc.anything().filter((a) => typeof a !== 'object' || a === null),
    );
    fc.assert(
      fc.property(fc.array(actionArb, { maxLength: 20 }), unknown, (actions, junk) => {
        const state = run(actions);
        expect(INVESTIGATE.reduce(state, junk as never)).toBe(state);
      }),
      RUNS,
    );
  });

  it('filters never change a check', () => {
    const answersArb = fc.array(fc.oneof(answerArb, fc.constant({ t: 'reset' })), { maxLength: 12 });
    fc.assert(
      fc.property(
        answersArb,
        fc.array(fc.tuple(fc.nat(12), filterArb), { maxLength: 12 }),
        (answers, filters) => {
          const mixed: unknown[] = [...answers];
          for (const [at, f] of filters) mixed.splice(Math.min(at, mixed.length), 0, f);
          expect(INVESTIGATE.check(SPEC, run(mixed))).toEqual(INVESTIGATE.check(SPEC, run(answers)));
        },
      ),
      RUNS,
    );
  });

  it('every visible record matches every active filter and visibleRecords is a subsequence of records', () => {
    fc.assert(
      fc.property(fc.array(fc.oneof(filterArb, actionArb), { maxLength: 30 }), (actions) => {
        const state = run(actions);
        const shown = visibleRecords(SPEC, state);
        for (const record of shown) {
          for (const [column, value] of Object.entries(state.filters))
            expect(record.cells[column]).toBe(value);
        }
        const order = shown.map((r) => SPEC.records.indexOf(r));
        expect(order.every((i, n) => i >= 0 && i > (order[n - 1] ?? -1))).toBe(true);
        const hidden = SPEC.records.filter((r) => !shown.includes(r));
        for (const record of hidden) {
          expect(
            Object.entries(state.filters).some(([column, value]) => record.cells[column] !== value),
          ).toBe(true);
        }
      }),
      RUNS,
    );
  });
});
```

- [ ] **Step 4: Run the tests and see them fail**

```bash
pnpm test tests/unit/lab-investigate.test.ts tests/property/lab-investigate.property.test.ts 2>&1 | grep -E "FAIL|Error:|Test Files"
```

Expected:

```text
 FAIL  tests/property/lab-investigate.property.test.ts [ tests/property/lab-investigate.property.test.ts ]
Error: Cannot find module '../../schemas/lab-investigate.ts' imported from .../tests/property/lab-investigate.property.test.ts
 FAIL  tests/unit/lab-investigate.test.ts [ tests/unit/lab-investigate.test.ts ]
Error: Cannot find module '../../schemas/lab-investigate.ts' imported from .../tests/unit/lab-investigate.test.ts
 Test Files  2 failed (2)
```

- [ ] **Step 5: Add the Investigate spec and action schemas**

Create `schemas/lab-investigate.ts`:

```ts
/** The Investigate lab spec and actions (spec 5.1): filter made-up records, read a listing, choose exact answers. */
import { z } from 'zod';
import { Slug } from './common.ts';

/** A goal reference, the same rule as `GoalId` in `schemas/lab.ts`, which imports this file. */
const GoalRef = z.string().regex(/^g[1-9]$/, 'must look like g1');

const Column = z.strictObject({
  id: Slug,
  label: z.string().min(2).max(30),
  filter: z.boolean().default(false),
});
const RecordRow = z.strictObject({ id: Slug, cells: z.record(Slug, z.string().min(1).max(120)) });
const Option = z.strictObject({ id: Slug, label: z.string().min(1).max(80) });
const Question = z.strictObject({
  id: Slug,
  goal: GoalRef,
  prompt: z.string().min(8).max(160),
  options: z.array(Option).min(2).max(8),
  answer: Slug,
});

/** The index of every entry whose id an earlier entry already used. */
function repeats(ids: readonly string[]): number[] {
  return ids.flatMap((id, i) => (ids.indexOf(id) === i ? [] : [i]));
}

export const InvestigateSpec = z
  .strictObject({
    /** The records' caption, for example `Trail log, cafe account, 14 March, times in UTC`. */
    source: z.string().min(2).max(80),
    listing: z
      .strictObject({ label: z.string().min(2).max(60), lines: z.array(z.string().max(100)).min(1).max(40) })
      .optional(),
    columns: z.array(Column).max(8).default([]),
    records: z.array(RecordRow).max(30).default([]),
    questions: z.array(Question).min(1).max(8),
  })
  .superRefine((spec, ctx) => {
    const issue = (path: (string | number)[], message: string): void => {
      ctx.addIssue({ code: 'custom', path, message });
    };
    if (spec.records.length === 0 && spec.listing === undefined) issue([], 'needs records or a listing');
    const columns = spec.columns.map((c) => c.id);
    for (const i of repeats(columns)) issue(['columns', i, 'id'], `column ${columns[i]} is used twice`);
    spec.columns.forEach((c, i) => {
      if (c.filter && spec.records.length === 0)
        issue(['columns', i, 'filter'], 'a filter column needs records');
    });
    if (spec.records.length > 0 && columns.length === 0) issue(['columns'], 'records need columns');
    const records = spec.records.map((r) => r.id);
    for (const i of repeats(records)) issue(['records', i, 'id'], `record ${records[i]} is used twice`);
    if (columns.length > 0) {
      spec.records.forEach((r, i) => {
        for (const column of new Set(columns)) {
          if (!Object.hasOwn(r.cells, column))
            issue(['records', i, 'cells'], `record ${r.id} has no cell for column ${column}`);
        }
        for (const key of Object.keys(r.cells)) {
          if (!columns.includes(key)) issue(['records', i, 'cells', key], `names no column: ${key}`);
        }
      });
    }
    const questions = spec.questions.map((q) => q.id);
    for (const i of repeats(questions))
      issue(['questions', i, 'id'], `question ${questions[i]} is used twice`);
    spec.questions.forEach((q, i) => {
      const options = q.options.map((o) => o.id);
      for (const j of repeats(options))
        issue(['questions', i, 'options', j, 'id'], `option ${options[j]} is used twice`);
      if (!options.includes(q.answer)) issue(['questions', i, 'answer'], `names no option: ${q.answer}`);
    });
  });
export type InvestigateSpec = z.infer<typeof InvestigateSpec>;

export const InvestigateAction = z.discriminatedUnion('t', [
  z.strictObject({ t: z.literal('filter'), column: Slug, value: z.string().min(1).max(120) }),
  z.strictObject({ t: z.literal('unfilter'), column: Slug }),
  z.strictObject({ t: z.literal('answer'), question: Slug, option: Slug }),
  z.strictObject({ t: z.literal('reset') }),
]);
export type InvestigateAction = z.infer<typeof InvestigateAction>;
```

- [ ] **Step 6: Add the Investigate model**

Create `src/labs/investigate/model.ts`:

```ts
import type { InvestigateAction, InvestigateSpec } from '../../../schemas/lab-investigate.ts';
import type { GoalResult, LabEngine } from '../contract.ts';

/** What Dani has filtered and answered; the spec's filter values and option ids ride along so `reduce` validates alone. */
export interface InvestigateState {
  /** Each filter column's distinct values, in first-seen record order. */
  readonly filterable: Readonly<Record<string, readonly string[]>>;
  /** Each question's option ids. */
  readonly options: Readonly<Record<string, readonly string[]>>;
  /** The active filters: column id to the one value shown. */
  readonly filters: Readonly<Record<string, string>>;
  /** The chosen answers: question id to option id. */
  readonly answers: Readonly<Record<string, string>>;
}

type Question = InvestigateSpec['questions'][number];

/** The distinct values of one column across the records, in first-seen order; none for an unknown column. */
export function filterValues(spec: InvestigateSpec, column: string): string[] {
  const values = spec.records.flatMap((r) => {
    const value = Object.hasOwn(r.cells, column) ? r.cells[column] : undefined;
    return value === undefined ? [] : [value];
  });
  return [...new Set(values)];
}

/** Goal ids in the order the questions first name them. */
export function investigateGoals(spec: InvestigateSpec): string[] {
  return [...new Set(spec.questions.map((q) => q.goal))];
}

/** The records every active filter lets through, in spec order; filters never change a check. */
export function visibleRecords(spec: InvestigateSpec, state: InvestigateState): InvestigateSpec['records'] {
  const active = Object.entries(state.filters);
  return spec.records.filter((r) => active.every(([column, value]) => r.cells[column] === value));
}

/** An Investigate board is finished when every question has an answer. */
export function investigateComplete(spec: InvestigateSpec, state: InvestigateState): boolean {
  return spec.questions.every((q) => Object.hasOwn(state.answers, q.id));
}

const answerOf = (state: InvestigateState, q: Question): string | undefined =>
  Object.hasOwn(state.answers, q.id) ? state.answers[q.id] : undefined;

const plural = (n: number, word: string, what: string): string => `${n} ${word}${n === 1 ? '' : 's'} ${what}`;

function initial(spec: InvestigateSpec): InvestigateState {
  return {
    filterable: Object.fromEntries(
      spec.columns.filter((c) => c.filter).map((c) => [c.id, filterValues(spec, c.id)]),
    ),
    options: Object.fromEntries(spec.questions.map((q) => [q.id, q.options.map((o) => o.id)])),
    filters: {},
    answers: {},
  };
}

export const INVESTIGATE: LabEngine<InvestigateSpec, InvestigateState, InvestigateAction> = {
  init: initial,

  reduce(state, action) {
    if (typeof action !== 'object' || action === null) return state;
    const a = action as {
      t?: unknown;
      column?: unknown;
      value?: unknown;
      question?: unknown;
      option?: unknown;
    };
    switch (a.t) {
      case 'filter': {
        if (typeof a.column !== 'string' || typeof a.value !== 'string') return state;
        const values = Object.hasOwn(state.filterable, a.column) ? state.filterable[a.column] : undefined;
        if (values === undefined || !values.includes(a.value)) return state;
        if (Object.hasOwn(state.filters, a.column) && state.filters[a.column] === a.value) return state;
        return { ...state, filters: { ...state.filters, [a.column]: a.value } };
      }
      case 'unfilter': {
        if (typeof a.column !== 'string' || !Object.hasOwn(state.filters, a.column)) return state;
        const { [a.column]: _gone, ...filters } = state.filters;
        return { ...state, filters };
      }
      case 'answer': {
        if (typeof a.question !== 'string' || typeof a.option !== 'string') return state;
        const options = Object.hasOwn(state.options, a.question) ? state.options[a.question] : undefined;
        if (options === undefined || !options.includes(a.option)) return state;
        if (Object.hasOwn(state.answers, a.question) && state.answers[a.question] === a.option) return state;
        return { ...state, answers: { ...state.answers, [a.question]: a.option } };
      }
      case 'reset':
        if (Object.keys(state.filters).length === 0 && Object.keys(state.answers).length === 0) return state;
        return { ...state, filters: {}, answers: {} };
      default:
        return state;
    }
  },

  check(spec, state): GoalResult[] {
    return investigateGoals(spec).map((goalId) => {
      const questions = spec.questions.filter((q) => q.goal === goalId);
      const right = questions.filter((q) => answerOf(state, q) === q.answer).length;
      return { goalId, pass: right === questions.length, message: `${right} of ${questions.length} right` };
    });
  },

  hint(spec, state, goalId) {
    const questions = spec.questions.filter((q) => q.goal === goalId);
    const open = questions.filter((q) => answerOf(state, q) === undefined).length;
    const wrong = questions.filter((q) => {
      const chosen = answerOf(state, q);
      return chosen !== undefined && chosen !== q.answer;
    }).length;
    const parts = [
      ...(open > 0 ? [plural(open, 'question', 'still unanswered')] : []),
      ...(wrong > 0 ? [plural(wrong, 'answer', 'wrong')] : []),
    ];
    if (parts.length === 0) return 'Every answer of this goal is right.';
    const sentence = parts.join(' and ');
    return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
  },
};
```

- [ ] **Step 7: Run the tests and see them pass**

```bash
pnpm test tests/unit/lab-investigate.test.ts tests/property/lab-investigate.property.test.ts 2>&1 | grep -E "FAIL|Test Files|Tests "
```

Expected:

```text
 Test Files  2 passed (2)
      Tests  43 passed (43)
```

That is 39 tests in `tests/unit/lab-investigate.test.ts` (the `it.each` tables count one test per row) and 4 in `tests/property/lab-investigate.property.test.ts`.

- [ ] **Step 8: Type-check and lint**

```bash
pnpm lint:fix
pnpm typecheck
pnpm lint
```

Expected: `pnpm typecheck` prints `$ tsc --noEmit` and nothing else; `pnpm lint` ends with `No fixes applied.`, which also confirms that `src/labs/investigate/model.ts` keeps the purity rule.
Never run the whole unit suite here; the shared machine runs focused tests only, and the pre-commit hook runs `pnpm check` once.

- [ ] **Step 9: Commit**

```bash
git add schemas/lab-investigate.ts src/labs/investigate/model.ts tests/fixtures/lab-investigate.ts tests/unit/lab-investigate.test.ts tests/property/lab-investigate.property.test.ts
git commit -m "Add the Investigate lab model" -m "Filterable records, an optional listing and exact answers chosen from options; not registered yet."
```

Expected: the pre-commit hook's `pnpm check` passes and the commit succeeds; the report names the commit and states that no file outside the five above changed.

---

## Task 4: Register Place, Trace and Investigate

**Files:**
- Create: `tests/unit/lab-texts.test.ts`, `tests/content/bad/r11-place-wrong-path-unfinished.yaml`, `tests/content/bad/r11-trace-start-passes.yaml`, `tests/content/bad/r11-investigate-wrong-path-unfinished.yaml`
- Modify: `schemas/ids.ts`, `schemas/lab.ts` (the imports, the doc comment and `LAB_SCHEMAS` only), `schemas/chunks.ts`, `src/labs/engines.ts`, `scripts/content/lib/labs.ts`, `scripts/content/lib/report.ts`, `src/app/lab.ts`, `src/app/lab-keys.ts`, `src/app/module.ts`, `src/app/screens/ModulePage.tsx`, `src/ui/base.css` (three empty anchors only)
- Test: `tests/unit/lab-texts.test.ts`, `tests/unit/r11.test.ts`, `tests/unit/lab-schema.test.ts`, `tests/unit/lab-sort.test.ts`, `tests/unit/coverage.test.ts`, `tests/unit/lab.test.ts`, `tests/unit/module.test.ts`, `tests/content/bad.test.ts` (unchanged; it runs the three new fixtures)

Design notes:
- Follows Phase 5 Tasks 1 to 3 and Phase 4 Task 13 on `master` (Phase 4 Tasks 6, 8 and 14, which own `src/app/lab-keys.ts`, `src/app/module.ts`, `schemas/chunks.ts` and `scripts/content/lib/report.ts`, are merged already); Phase 4 Task 13 (ddcfce5), the last Phase 4 edit of the lab files, and Tasks 17 and 19 (7f08f76, 8ed213d), the last Phase 4 edits of `src/ui/base.css`, are on `master` too, so the three anchors sit between the last Simulate rule and `/* Incident */`, above Task 17's incident rules and Task 19's `/* Lightning */` rules.
- It runs in the Place worktree `<scratchpad>/p5/wt/place` after rebasing on `master`, and it is the one commit that widens `LAB_ENGINES` together with every list typed over it, so `tsc` never sees a half-widened registry (overlap map section 6).
- `LAB_ENGINES` appends `place`, `trace` and `investigate`, so every Phase 4 expectation keeps its prefix, and that order drives the `Labs:` report line, `ENGINE_LABEL`, the fan-out and every per-engine listing.
- `LAB_SCHEMAS` takes the three engines' schemas from their own files (Tasks 1 to 3), and the `schemas/lab.ts` doc comment names those files as the other homes of lab zod schemas; Task 11 records that as a spec NOTE.
- `ENGINES` gains the three entries Tasks 1 to 3 define: Place is complete when no piece is left in the tray, Trace is always complete (any set of rules is a finished board), Investigate is complete when every question has an answer; none of them settles anything, so `checkLab` equals the engine's own `check` (P5-017).
- The build ships a live lab's spec through `LAB_SCHEMAS[lab.engine]` and leaves out its `solution` and `wrongPaths` for any engine (Phase 4 Task 4), so the three `LAB_SCHEMAS` entries are all a Place, Trace or Investigate lab needs to ship in its module chunk with its answer keys (P5-044, P5-058).
- `placeTexts`, `traceTexts` and `investigateTexts` return every string Dani reads in a spec, so R7's course check and the retired Support plan check read the new labs (P5-054); each parses first and returns `[]` for a spec that does not parse, as Phase 4's `configureTexts` and `simulateTexts` do.
- `LabMeta.engine` and `LabKeyState.engine` become `LabEngineId`, so a later engine never widens another literal union; `labKey` keeps its behaviour, and Task 6 changes its gate for Place.
- `ENGINE_LABEL` covers all six engines (`satisfies Record<LabEngineId, string>`), and `checkLabel` stays `Check` for the three new engines (P5-064), because only Simulate runs something before it checks.
- The module page marks a stretch lab with a `Stretch` mark before its minutes (`LabRow.stretch`), so Dani sees which labs count toward Lab Complete and Hands On (P5-075); the change touches the initial bundle, so the build reports its size.
- Phase 4 Task 1 uses `place` as its example of an engine that does not exist, in `tests/unit/lab-schema.test.ts` and `tests/unit/lab-sort.test.ts`; this task switches both to `deploy`, an engine that will never ship, and keeps their test titles.
- The three bad fixtures target the fixture Sort lab's file, so each takes its id `lab-m01-sort-the-bakes`; they are written once by a throwaway `.results/r11-p5-fixtures.ts`, as Phase 4 Task 2 wrote its five.
- The `Labs:` line rule (Task dependencies) applies: Phase 4 pins its three-engine line at the wave CS final return (P4:8689), the Task 11 exit check (P4:8782) and the Task 20 exit check (P4:18497), and Step 9 names which of them have already run.
- No lab uses the new engines yet, no event changes and `ENGINE_VERSION` stays where Phase 4 left it (P5-010).
- Covers P5-007, P5-010, P5-016, P5-017, P5-019, P5-044, P5-050, P5-051, P5-054 (spec texts), P5-057, P5-058, P5-063, P5-064, P5-066 (type), P5-072 (anchors), P5-073, P5-075, P5-086.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/lab-texts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  investigateTexts,
  labTexts,
  placeTexts,
  SPEC_TEXTS,
  traceTexts,
} from '../../scripts/content/lib/labs.ts';
import {
  bakeryInvestigateLab,
  INVESTIGATE_LISTING_SPEC,
  INVESTIGATE_SPEC,
} from '../fixtures/lab-investigate.ts';
import { bakeryPlaceLab, PLACE_SPEC } from '../fixtures/lab-place.ts';
import {
  bakeryPolicyLab,
  bakeryTraceLab,
  TRACE_NETWORK_SPEC,
  TRACE_POLICY_SPEC,
} from '../fixtures/lab-trace.ts';

/** Drops the empty strings an optional field leaves behind. */
const present = (texts: readonly (string | undefined)[]): string[] =>
  texts.filter((t): t is string => t !== undefined && t !== '');

describe('lab texts for R7 (spec 2.9)', () => {
  it('reads every container and piece of a Place spec, labels and details', () => {
    expect(placeTexts(PLACE_SPEC)).toEqual(
      present([
        ...PLACE_SPEC.containers.flatMap((c) => [c.label, c.detail]),
        ...PLACE_SPEC.pieces.flatMap((p) => [p.label, p.detail]),
      ]),
    );
    expect(placeTexts(PLACE_SPEC)).toEqual(
      expect.arrayContaining(['Flourtown', 'Network edge', 'Not used', 'Internet gateway', 'Spare mixer']),
    );
  });

  it('reads the target, the rule sets and the cases of a network Trace spec', () => {
    expect(traceTexts(TRACE_NETWORK_SPEC)).toEqual([
      'Order window',
      'window-sg',
      'front-acl',
      ...TRACE_NETWORK_SPEC.cases.map((c) => c.label),
    ]);
  });

  it('reads the policies, principals, groups, nodes and cases of a policy Trace spec', () => {
    expect(traceTexts(TRACE_POLICY_SPEC)).toEqual([
      ...TRACE_POLICY_SPEC.policies.map((p) => p.label),
      ...TRACE_POLICY_SPEC.principals.map((p) => p.label),
      ...TRACE_POLICY_SPEC.groups.map((g) => g.label),
      ...TRACE_POLICY_SPEC.org.map((n) => n.label),
      ...TRACE_POLICY_SPEC.cases.map((c) => c.label),
    ]);
  });

  it('reads the source, columns, every cell, the questions and their options of an Investigate spec', () => {
    expect(investigateTexts(INVESTIGATE_SPEC)).toEqual([
      INVESTIGATE_SPEC.source,
      ...INVESTIGATE_SPEC.columns.map((c) => c.label),
      ...INVESTIGATE_SPEC.records.flatMap((r) => INVESTIGATE_SPEC.columns.map((c) => r.cells[c.id] ?? '')),
      ...INVESTIGATE_SPEC.questions.flatMap((q) => [q.prompt, ...q.options.map((o) => o.label)]),
    ]);
  });

  it('reads the listing of an Investigate spec, line by line, without its blank lines', () => {
    const listing = INVESTIGATE_LISTING_SPEC.listing;
    if (listing === undefined) throw new Error('the listing fixture has a listing');
    expect(investigateTexts(INVESTIGATE_LISTING_SPEC)).toEqual([
      INVESTIGATE_LISTING_SPEC.source,
      listing.label,
      ...present(listing.lines),
      ...INVESTIGATE_LISTING_SPEC.questions.flatMap((q) => [q.prompt, ...q.options.map((o) => o.label)]),
    ]);
  });

  it('reads nothing from a spec that does not parse', () => {
    for (const junk of [
      undefined,
      null,
      7,
      {},
      { kind: 'network' },
      { containers: [] },
      { source: 'Ledger' },
    ]) {
      expect(placeTexts(junk)).toEqual([]);
      expect(traceTexts(junk)).toEqual([]);
      expect(investigateTexts(junk)).toEqual([]);
    }
  });

  it('gives each new engine its texts in SPEC_TEXTS, so labTexts reads them', () => {
    expect(SPEC_TEXTS.place).toBe(placeTexts);
    expect(SPEC_TEXTS.trace).toBe(traceTexts);
    expect(SPEC_TEXTS.investigate).toBe(investigateTexts);
    const cases: [ReturnType<typeof labTexts>, string[]][] = [
      [labTexts(bakeryPlaceLab()), placeTexts(PLACE_SPEC)],
      [labTexts(bakeryTraceLab()), traceTexts(TRACE_NETWORK_SPEC)],
      [labTexts(bakeryPolicyLab()), traceTexts(TRACE_POLICY_SPEC)],
      [labTexts(bakeryInvestigateLab()), investigateTexts(INVESTIGATE_SPEC)],
    ];
    for (const [texts, spec] of cases) {
      expect(spec.length).toBeGreaterThan(0);
      expect(texts).toEqual(expect.arrayContaining(spec));
    }
  });
});
```

In `tests/unit/r11.test.ts` (Phase 4 Tasks 2, 12 and 13), the import block becomes:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LabFile, SortAction, SortSpec } from '../../schemas/lab.ts';
import type { NetworkTraceSpec } from '../../schemas/lab-trace.ts';
import { type LabEntry, loadContext } from '../../scripts/content/lib/context.ts';
import { labProblems, r11 } from '../../scripts/content/rules/r11-labs.ts';
import { replayLab } from '../../src/labs/contract.ts';
import type { AnyLabEngine, EngineEntry } from '../../src/labs/engines.ts';
import { SORT, type SortState } from '../../src/labs/sort/model.ts';
import { TRACE } from '../../src/labs/trace/model.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';
import { bakeryInvestigateLab } from '../fixtures/lab-investigate.ts';
import { bakeryPlaceLab, PLACE_SOLUTION } from '../fixtures/lab-place.ts';
import { bakeryConfigureLab, bakerySimulateLab } from '../fixtures/lab-specs.ts';
import { bakeryPolicyLab, bakeryTraceLab } from '../fixtures/lab-trace.ts';
import { bakeryLab, dropFixtureLab, writeLab } from '../fixtures/labs.ts';
```

Append to `tests/unit/r11.test.ts`:

```ts
describe('R11 for Place, Trace and Investigate (spec 2.9)', () => {
  it('replays the four bakery labs of the new engines without a problem', () => {
    for (const lab of [bakeryPlaceLab(), bakeryTraceLab(), bakeryPolicyLab(), bakeryInvestigateLab()])
      expect(labProblems(labEntryOf(lab))).toEqual([]);
  });

  it('reports a Place wrong path that leaves a piece in the tray', () => {
    const lab = bakeryPlaceLab();
    const [first, ...rest] = lab.wrongPaths;
    if (first === undefined) throw new Error('the Place lab has wrong paths');
    const wrongPaths = [{ ...first, actions: PLACE_SOLUTION.slice(1) }, ...rest];
    expect(labProblems(labEntryOf({ ...lab, wrongPaths }))).toEqual([
      `lab-m01-bakery-ovens: wrongPaths[0] (${first.mistake}) leaves the board unfinished`,
    ]);
  });

  it('reports a Trace spec whose rules already meet every goal at the start', () => {
    const lab = bakeryTraceLab();
    const spec = lab.spec as NetworkTraceSpec;
    const solved = replayLab(TRACE, spec, lab.solution as Parameters<typeof TRACE.reduce>[1][]).on;
    const on = <R extends { id: string; on: boolean }>(r: R): R => ({ ...r, on: solved[r.id] ?? r.on });
    const start = {
      ...spec,
      sg: { ...spec.sg, rules: spec.sg.rules.map(on) },
      nacl: { ...spec.nacl, rules: spec.nacl.rules.map(on) },
    };
    expect(labProblems(labEntryOf({ ...lab, spec: start }))).toContain(
      'lab-m01-bakery-door: the starting state already meets every goal',
    );
  });

  it('reports an Investigate wrong path that leaves a question unanswered', () => {
    const lab = bakeryInvestigateLab();
    const [first, ...rest] = lab.wrongPaths;
    if (first === undefined) throw new Error('the Investigate lab has wrong paths');
    const wrongPaths = [{ ...first, actions: first.actions.slice(0, -1) }, ...rest];
    expect(labProblems(labEntryOf({ ...lab, wrongPaths }))).toEqual([
      `lab-m01-bakery-ledger: wrongPaths[0] (${first.mistake}) leaves the board unfinished`,
    ]);
  });

  it('reports a bad spec of each new engine at its path', () => {
    const place = bakeryPlaceLab();
    const placeSpec = place.spec as { pieces: { id: string }[] };
    const pieces = placeSpec.pieces.map((p, i) => (i === 1 ? { ...p, id: placeSpec.pieces[0]?.id } : p));
    expect(labProblems(labEntryOf({ ...place, spec: { ...placeSpec, pieces } }))[0]).toBe(
      `lab-m01-bakery-ovens: spec: pieces.1.id: piece ${placeSpec.pieces[0]?.id} is used twice`,
    );
    const trace = bakeryTraceLab();
    const traceSpec = trace.spec as NetworkTraceSpec;
    const cases = traceSpec.cases.map((c, i) => (i === 1 ? { ...c, id: traceSpec.cases[0]?.id } : c));
    expect(labProblems(labEntryOf({ ...trace, spec: { ...traceSpec, cases } }))[0]).toBe(
      `lab-m01-bakery-door: spec: cases.1.id: case ${traceSpec.cases[0]?.id} is used twice`,
    );
    const ledger = bakeryInvestigateLab();
    const ledgerSpec = ledger.spec as { questions: { id: string; answer: string }[] };
    const questions = ledgerSpec.questions.map((q, i) => (i === 0 ? { ...q, answer: 'nobody' } : q));
    expect(labProblems(labEntryOf({ ...ledger, spec: { ...ledgerSpec, questions } }))[0]).toBe(
      'lab-m01-bakery-ledger: spec: questions.0.answer: names no option: nobody',
    );
  });

  it('reports a bad action of each new engine at its path', () => {
    const place = bakeryPlaceLab();
    expect(
      labProblems(
        labEntryOf({ ...place, solution: [{ t: 'place', piece: 'Gateway', slot: 'bakery-edge' }] }),
      ),
    ).toEqual(['lab-m01-bakery-ovens: solution[0].piece: must be kebab-case']);
    const trace = bakeryTraceLab();
    expect(
      labProblems(labEntryOf({ ...trace, solution: [{ t: 'toggle', rule: 'Web Rule', on: true }] })),
    ).toEqual(['lab-m01-bakery-door: solution[0].rule: must be kebab-case']);
    const ledger = bakeryInvestigateLab();
    expect(
      labProblems(labEntryOf({ ...ledger, solution: [{ t: 'answer', question: 'who', option: 'Ines' }] })),
    ).toEqual(['lab-m01-bakery-ledger: solution[0].option: must be kebab-case']);
  });
});
```

In `tests/unit/lab-schema.test.ts` (Phase 4 Task 1), replace the test `it('rejects an engine that does not exist')` with these two tests, inside `describe('lab file schema (spec 5.1)')`:

```ts
  it('rejects an engine that does not exist', () => {
    expect(paths(LabFile.safeParse({ ...bakeryLab(), engine: 'deploy' }))).toEqual(['engine']);
  });

  it.each(['place', 'trace', 'investigate'])('accepts the %s engine and has its schemas', (engine) => {
    expect(LabFile.safeParse({ ...bakeryLab(), engine }).success).toBe(true);
    expect(Object.keys(LAB_SCHEMAS[engine as keyof typeof LAB_SCHEMAS] ?? {})).toEqual(['spec', 'action']);
  });
```

In `tests/unit/lab-sort.test.ts` (Phase 4 Task 1), change `expect(engineOf('place')).toBeNull();` to `expect(engineOf('deploy')).toBeNull();`, and add this test right above `it('says what is left for a goal in one sentence')`:

```ts
  it('registers Place, Trace and Investigate', () => {
    expect(engineOf('place')).toBe(ENGINES.place);
    expect(engineOf('trace')).toBe(ENGINES.trace);
    expect(engineOf('investigate')).toBe(ENGINES.investigate);
    expect(ENGINES.place?.settle).toEqual([]);
    expect(ENGINES.trace?.settle).toEqual([]);
    expect(ENGINES.investigate?.settle).toEqual([]);
  });
```

In `tests/unit/coverage.test.ts` (Phase 4 Tasks 3 and 14), both expected `Labs:` lines become:

```ts
      'Labs: 1 live (1 core, 0 stretch); sort 1, configure 0, simulate 0, place 0, trace 0, investigate 0',
```

In `tests/unit/lab.test.ts` (Phase 4 Tasks 7, 12 and 13), replace the first four `expect` lines of `it('names the engines and says how long a lab takes')` with:

```ts
    expect(ENGINE_LABEL).toEqual({
      sort: 'Sort',
      configure: 'Configure',
      simulate: 'Simulate',
      place: 'Place',
      trace: 'Trace',
      investigate: 'Investigate',
    });
    expect(labLede('sort', 6)).toBe('Sort lab, about 6 minutes');
    expect(labLede('configure', 8)).toBe('Configure lab, about 8 minutes');
    expect(labLede('simulate', 1)).toBe('Simulate lab, about 1 minute');
    expect(labLede('place', 8)).toBe('Place lab, about 8 minutes');
    expect(labLede('trace', 10)).toBe('Trace lab, about 10 minutes');
    expect(labLede('investigate', 1)).toBe('Investigate lab, about 1 minute');
```

and add these lines at the end of `it('names the check button by engine')`:

```ts
    expect(checkLabel('place')).toBe('Check');
    expect(checkLabel('trace')).toBe('Check');
    expect(checkLabel('investigate')).toBe('Check');
```

In `tests/unit/module.test.ts` (Phase 4 Task 8), the `lab` helper of `describe('labRows')` takes a tier:

```ts
  const lab = (
    id: string,
    module: number,
    engine: LabMeta['engine'],
    title: string,
    minutes: number,
    tier: LabMeta['tier'] = 'core',
  ): LabMeta => ({
    id,
    module,
    engine,
    tier,
    rev: 1,
    title,
    minutes,
  });
```

Add `stretch: false,` after the `engine:` line of both expected rows in `it('lists the module labs in index order with their engine, minutes, link and done mark')`, and add this test right above `it('gives a module without labs no rows and says so')`:

```ts
  it('marks a stretch lab and names the Phase 5 engines', () => {
    const labs = [
      lab('lab-m05-two-loaves-two-ovens', 5, 'place', 'Two loaves, two ovens', 8),
      lab('lab-m05-open-the-side-door', 5, 'trace', 'Open the side door', 10, 'stretch'),
      lab('lab-m05-who-took-the-rye', 5, 'investigate', 'Who took the rye?', 7, 'stretch'),
    ];
    expect(labRows({ labs }, 5, new Set()).map((r) => [r.engine, r.stretch])).toEqual([
      ['Place', false],
      ['Trace', true],
      ['Investigate', true],
    ]);
  });
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm vitest run tests/unit/lab-texts.test.ts tests/unit/r11.test.ts tests/unit/lab-schema.test.ts tests/unit/lab-sort.test.ts tests/unit/coverage.test.ts tests/unit/lab.test.ts tests/unit/module.test.ts 2>&1 | grep -E "FAIL|Error:|Tests " | head -12
```

Expected: `Tests  22 failed | 74 passed (96)`; the seven `lab-texts.test.ts` tests fail with `TypeError: placeTexts is not a function` (or `traceTexts`, `investigateTexts`), the six new R11 tests fail with `AssertionError` lines because R11 answers `lab-m01-bakery-ovens: engine place is not available yet` (and the same for `trace` and `investigate`), the three `accepts the ... engine` tests and `registers Place, Trace and Investigate` fail because the engines are not registered, the two `report` tests fail on the `Labs:` line, `names the engines` fails on `ENGINE_LABEL`, and both `labRows` tests fail on the missing `stretch`.

- [ ] **Step 3: Widen the engine list and see the type check name every list typed over it**

In `schemas/ids.ts`, replace the `LAB_ENGINES` doc comment and line with:

```ts
/** The lab engines (spec 5.1): Sort, Configure and Simulate since Phase 4; Place, Trace and Investigate since Phase 5. */
export const LAB_ENGINES = ['sort', 'configure', 'simulate', 'place', 'trace', 'investigate'] as const;
```

```bash
pnpm typecheck 2>&1 | grep "error TS" | cut -c1-120
```

Expected: errors at `scripts/content/build.ts` (`Type '"configure" | "investigate" | "place" | "simulate" | "sort" | "trace"' is not assignable to type '"configure" | "simulate" | "sort"'`, the `LabMeta` it writes), at `src/app/lab.ts` (`TS7053`, `ENGINE_LABEL` indexed by the wider id), in `tests/unit/lab-texts.test.ts` for the three text functions `scripts/content/lib/labs.ts` does not export yet, and in `tests/unit/module.test.ts` (`'place'`, `'trace'` and `'investigate'` passed as `LabMeta['engine']`, and the missing `stretch` on `LabRow`).
`LabKeyState.engine` raises no error, since nothing yet passes it a new engine, but Step 4 types it by `LabEngineId` all the same, so Task 6 can.

- [ ] **Step 4: Type every engine list by `LabEngineId`**

In `schemas/chunks.ts` (Phase 4 Task 4), import the id type under the file's doc comment and type `LabMeta.engine` by it:

```ts
/** Types of the JSON chunks that scripts/content/build.ts writes and the app reads (spec 2.10). */
import type { LabEngineId } from './ids.ts';
```

```ts
  engine: LabEngineId;
```

In `src/app/lab-keys.ts` (Phase 4 Task 6), the head of the file and `LabKeyState.engine` become:

```ts
/** The lab's keys (spec 7.4), pure so the tests run without a browser. */
import type { LabEngineId } from '../../schemas/ids.ts';
import type { RunnerKeyInput } from './runner-keys.ts';
```

```ts
  engine: LabEngineId;
```

In `src/app/lab.ts` (Phase 4 Tasks 7, 12 and 13), replace `ENGINE_LABEL` with:

```ts
export const ENGINE_LABEL = {
  sort: 'Sort',
  configure: 'Configure',
  simulate: 'Simulate',
  place: 'Place',
  trace: 'Trace',
  investigate: 'Investigate',
} as const satisfies Record<LabEngineId, string>;
```

In `scripts/content/lib/report.ts` (Phase 4 Tasks 3 and 14), the `schemas/ids.ts` import becomes `import { type DomainIdValue, LAB_ENGINES } from '../../../schemas/ids.ts';`, and the `Labs:` line builds its engine part from `LAB_ENGINES`:

```ts
    `Labs: ${labs.length} live (${labsBy((l) => l.tier, 'core')} core, ${labsBy((l) => l.tier, 'stretch')} stretch); ${LAB_ENGINES.map((e) => `${e} ${labsBy((l) => l.engine, e)}`).join(', ')}`,
```

- [ ] **Step 5: Register the three engines' schemas and models**

In `schemas/lab.ts` (Phase 4 Tasks 1, 12 and 13), add the three sibling imports beside `./ids.ts` (Biome sorts them between `./ids.ts` and `./question.ts`):

```ts
import { InvestigateAction, InvestigateSpec } from './lab-investigate.ts';
import { PlaceAction, PlaceSpec } from './lab-place.ts';
import { TraceAction, TraceSpec } from './lab-trace.ts';
```

replace the file's doc comment with:

```ts
/**
 * Lab files (spec 5.1): the envelope every engine shares, and each engine's spec and actions. This file and its
 * per-engine siblings (schemas/lab-place.ts, schemas/lab-trace.ts, schemas/lab-investigate.ts) are the only home of
 * lab zod schemas; `src/labs` models import the inferred types with `import type`, so zod never reaches the app bundle.
 */
```

and add the three entries after `simulate` in `LAB_SCHEMAS`:

```ts
  place: { spec: PlaceSpec, action: PlaceAction },
  trace: { spec: TraceSpec, action: TraceAction },
  investigate: { spec: InvestigateSpec, action: InvestigateAction },
```

Replace `src/labs/engines.ts` (Phase 4 Tasks 1, 12 and 13) with:

```ts
import type { LabEngineId } from '../../schemas/ids.ts';
import type { SortSpec } from '../../schemas/lab.ts';
import type { InvestigateSpec } from '../../schemas/lab-investigate.ts';
import type { PlaceSpec } from '../../schemas/lab-place.ts';
import { CONFIGURE } from './configure/model.ts';
import type { GoalResult, LabEngine } from './contract.ts';
import { INVESTIGATE, type InvestigateState, investigateComplete } from './investigate/model.ts';
import { PLACE, type PlaceState, placeComplete } from './place/model.ts';
import { SIMULATE } from './simulate/model.ts';
import { SORT, type SortState, sortComplete } from './sort/model.ts';
import { TRACE } from './trace/model.ts';

export type AnyLabEngine = LabEngine<unknown, unknown, unknown>;

/**
 * One engine as the lab screen and R11 use it: `settle` is the actions applied before any check (Simulate runs its
 * model; the other engines need none), and `complete` says the board is finished, so a wrong path is judged by its
 * mistake and not by an unfinished board.
 */
export interface EngineEntry {
  readonly engine: AnyLabEngine;
  readonly settle: readonly unknown[];
  readonly complete: (spec: unknown, state: unknown) => boolean;
}

export const ENGINES: Readonly<Partial<Record<LabEngineId, EngineEntry>>> = {
  sort: {
    engine: SORT as unknown as AnyLabEngine,
    settle: [],
    complete: (spec, state) => sortComplete(spec as SortSpec, state as SortState),
  },
  configure: { engine: CONFIGURE as unknown as AnyLabEngine, settle: [], complete: () => true },
  simulate: { engine: SIMULATE as unknown as AnyLabEngine, settle: [{ t: 'run' }], complete: () => true },
  place: {
    engine: PLACE as unknown as AnyLabEngine,
    settle: [],
    complete: (spec, state) => placeComplete(spec as PlaceSpec, state as PlaceState),
  },
  // Any set of rules is a finished board.
  trace: { engine: TRACE as unknown as AnyLabEngine, settle: [], complete: () => true },
  investigate: {
    engine: INVESTIGATE as unknown as AnyLabEngine,
    settle: [],
    complete: (spec, state) => investigateComplete(spec as InvestigateSpec, state as InvestigateState),
  },
};

/** The registry entry of an engine id, or null when this build does not ship that engine. */
export function engineOf(id: string): EngineEntry | null {
  return Object.hasOwn(ENGINES, id) ? (ENGINES[id as LabEngineId] ?? null) : null;
}

/** Checks a board the one way the screen and R11 do: the `settle` actions first, then the engine's check. */
export function checkLab(entry: EngineEntry, spec: unknown, state: unknown): GoalResult[] {
  const settled = entry.settle.reduce((s: unknown, action) => entry.engine.reduce(s, action), state);
  return entry.engine.check(spec, settled);
}
```

- [ ] **Step 6: Give R7 the Place, Trace and Investigate texts**

In `scripts/content/lib/labs.ts` (Phase 4 Tasks 2, 12 and 13), add the three schema imports under the `schemas/lab.ts` import:

```ts
import { InvestigateSpec } from '../../../schemas/lab-investigate.ts';
import { PlaceSpec } from '../../../schemas/lab-place.ts';
import { TraceSpec } from '../../../schemas/lab-trace.ts';
```

add these functions right above the `SPEC_TEXTS` doc comment:

```ts
/** Drops the empty strings an optional detail leaves behind. */
const present = (texts: readonly (string | undefined)[]): string[] =>
  texts.filter((t): t is string => t !== undefined && t !== '');

/** Container labels and details, then piece labels and details, of a Place spec. */
export function placeTexts(spec: unknown): string[] {
  const parsed = PlaceSpec.safeParse(spec);
  if (!parsed.success) return [];
  return present([
    ...parsed.data.containers.flatMap((c) => [c.label, c.detail]),
    ...parsed.data.pieces.flatMap((p) => [p.label, p.detail]),
  ]);
}

/**
 * A network Trace spec's target, security group and network ACL labels and case labels; a policy Trace spec's policy,
 * principal, group and organization node labels and case labels.
 */
export function traceTexts(spec: unknown): string[] {
  const parsed = TraceSpec.safeParse(spec);
  if (!parsed.success) return [];
  const s = parsed.data;
  const cases = s.cases.map((c) => c.label);
  if (s.kind === 'network') return [s.target, s.sg.label, s.nacl.label, ...cases];
  return [
    ...s.policies.map((p) => p.label),
    ...s.principals.map((p) => p.label),
    ...s.groups.map((g) => g.label),
    ...s.org.map((n) => n.label),
    ...cases,
  ];
}

/** An Investigate spec's source, listing, column labels, every cell, question prompts and option labels. */
export function investigateTexts(spec: unknown): string[] {
  const parsed = InvestigateSpec.safeParse(spec);
  if (!parsed.success) return [];
  const { source, listing, columns, records, questions } = parsed.data;
  return present([
    source,
    listing?.label,
    ...(listing?.lines ?? []),
    ...columns.map((c) => c.label),
    ...records.flatMap((r) => columns.map((c) => r.cells[c.id])),
    ...questions.flatMap((q) => [q.prompt, ...q.options.map((o) => o.label)]),
  ]);
}
```

and add the three entries after `simulate: simulateTexts,` in `SPEC_TEXTS`:

```ts
  place: placeTexts,
  trace: traceTexts,
  investigate: investigateTexts,
```

- [ ] **Step 7: Mark stretch labs on the module page, add the style anchors, and see the tests pass**

In `src/app/module.ts` (Phase 4 Task 8), `LabRow` gains `stretch` between `engine` and `done`:

```ts
  engine: string;
  /** A stretch lab (spec 5.2): it pays XP but counts toward neither Lab Complete nor Hands On. */
  stretch: boolean;
  done: boolean;
```

and `labRows` sets it between `engine` and `done`:

```ts
      engine: `${lab.engine[0]?.toUpperCase()}${lab.engine.slice(1)}`,
      stretch: lab.tier === 'stretch',
```

In `src/app/screens/ModulePage.tsx` (Phase 4 Task 8), the lab row's marks start with the `Stretch` mark:

```tsx
                <span class="row-meta row-marks">
                  {row.stretch && <span class="mark">Stretch</span>}
                  <span class="mark">{row.minutes} min</span>
```

In `src/ui/base.css`, insert the three empty anchors right after the last rule under `/* Labs: Simulate */` (today `.sim-swatch-2`) and before `/* Incident */`, one blank line between each; Tasks 6, 7 and 8 write only under their own anchor:

```css
.sim-swatch-2 {
  background: var(--muted);
}

/* Labs: Place */

/* Labs: Trace */

/* Labs: Investigate */

/* Incident */
```

```bash
pnpm vitest run tests/unit/lab-texts.test.ts tests/unit/r11.test.ts tests/unit/lab-schema.test.ts tests/unit/lab-sort.test.ts tests/unit/coverage.test.ts tests/unit/lab.test.ts tests/unit/module.test.ts tests/unit/lab-keys.test.ts 2>&1 | grep -E "FAIL|Test Files|Tests "
pnpm typecheck
```

Expected: `Test Files  8 passed (8)` with no `FAIL` line (the seven files hold 18 more tests than before this task: 7 in `lab-texts.test.ts`, 6 in `r11.test.ts`, 3 in `lab-schema.test.ts`, 1 each in `lab-sort.test.ts` and `module.test.ts`), and `tsc --noEmit` prints nothing.

- [ ] **Step 8: Write the three R11 bad fixtures**

Write them from the bakery labs of Tasks 1 to 3 with this one-off script, saved as `.results/r11-p5-fixtures.ts` (git-ignored), so each differs from a passing lab by exactly one mistake:

```ts
// One-off: writes the three Phase 5 R11 bad fixtures from the bakery labs, each one mistake away from passing.
import { writeFileSync } from 'node:fs';
import { stringify } from 'yaml';
import type { NetworkTraceSpec } from '../schemas/lab-trace.ts';
import { replayLab } from '../src/labs/contract.ts';
import { TRACE } from '../src/labs/trace/model.ts';
import { bakeryInvestigateLab } from '../tests/fixtures/lab-investigate.ts';
import { bakeryPlaceLab, PLACE_SOLUTION } from '../tests/fixtures/lab-place.ts';
import { bakeryTraceLab } from '../tests/fixtures/lab-trace.ts';

// The fixture target is the Sort lab's file, so each lab takes that file's id.
const id = 'lab-m01-sort-the-bakes';
const write = (name: string, why: string, value: unknown): void =>
  writeFileSync(
    `tests/content/bad/${name}`,
    `# fixture-target: content/labs/01-baking-basics/sort-the-bakes.yaml\n# ${why}\n${stringify(value)}`,
  );

const place = bakeryPlaceLab({ id });
const [gateway, ...placeRest] = place.wrongPaths;
if (gateway === undefined) throw new Error('the Place lab has wrong paths');
write(
  'r11-place-wrong-path-unfinished.yaml',
  'The first wrong path never places the internet gateway, so it fails only by leaving a piece in the tray.',
  { ...place, wrongPaths: [{ ...gateway, actions: PLACE_SOLUTION.slice(1) }, ...placeRest] },
);

const trace = bakeryTraceLab({ id });
const spec = trace.spec as NetworkTraceSpec;
const solved = replayLab(TRACE, spec, trace.solution as Parameters<typeof TRACE.reduce>[1][]).on;
const on = <R extends { id: string; on: boolean }>(r: R): R => ({ ...r, on: solved[r.id] ?? r.on });
write(
  'r11-trace-start-passes.yaml',
  'Every rule starts as the solution leaves it, so the starting state already meets every goal.',
  {
    ...trace,
    spec: { ...spec, sg: { ...spec.sg, rules: spec.sg.rules.map(on) }, nacl: { ...spec.nacl, rules: spec.nacl.rules.map(on) } },
  },
);

const ledger = bakeryInvestigateLab({ id });
const [who, ...ledgerRest] = ledger.wrongPaths;
if (who === undefined) throw new Error('the Investigate lab has wrong paths');
write(
  'r11-investigate-wrong-path-unfinished.yaml',
  'The first wrong path leaves the last question unanswered, so it fails only by being unfinished.',
  { ...ledger, wrongPaths: [{ ...who, actions: who.actions.slice(0, -1) }, ...ledgerRest] },
);
```

```bash
node .results/r11-p5-fixtures.ts
head -2 tests/content/bad/r11-trace-start-passes.yaml
pnpm vitest run tests/content 2>&1 | grep -E "FAIL|Test Files|Tests "
```

Expected: three new files under `tests/content/bad/`; the two lines `# fixture-target: content/labs/01-baking-basics/sort-the-bakes.yaml` and `# Every rule starts as the solution leaves it, so the starting state already meets every goal.`; and every `tests/content` file passing, with `bad.test.ts` running 3 more fixtures.
R11 reports, in order, `lab-m01-sort-the-bakes: wrongPaths[0] (Leaves the internet gateway on the bench) leaves the board unfinished`, `lab-m01-sort-the-bakes: the starting state already meets every goal` (followed by the first wrong path meeting `g1`, since the start is already the solution) and `lab-m01-sort-the-bakes: wrongPaths[0] (Blames the first person who tried, though that try was refused) leaves the board unfinished`; the mistakes are the Task 1 and Task 3 fixtures' own words.

- [ ] **Step 9: Check the content, the report and the bundle, then commit**

```bash
pnpm content:validate
pnpm --silent content:report | grep -E '^Labs: '
pnpm build 2>&1 | grep -E '^budgets:'
git log --oneline master | grep -E "Merge the Phase 4 Configure and Simulate labs|Release the Sort labs as 0.5.0|Release Phase 4 Labs I as 0.6.0"
pnpm lint:fix
git add schemas/ids.ts schemas/lab.ts schemas/chunks.ts src/labs/engines.ts scripts/content/lib/labs.ts scripts/content/lib/report.ts src/app/lab.ts src/app/lab-keys.ts src/app/module.ts src/app/screens/ModulePage.tsx src/ui/base.css tests/unit/lab-texts.test.ts tests/unit/r11.test.ts tests/unit/lab-schema.test.ts tests/unit/lab-sort.test.ts tests/unit/coverage.test.ts tests/unit/lab.test.ts tests/unit/module.test.ts tests/content/bad/r11-place-wrong-path-unfinished.yaml tests/content/bad/r11-trace-start-passes.yaml tests/content/bad/r11-investigate-wrong-path-unfinished.yaml
git commit -m "Register the Place, Trace and Investigate engines" -m "R11, the build, the report and the lab screen now know all six engines; no lab uses the new ones yet."
```

Expected: `content:validate: 13 rules, 0 findings`; the `Labs:` line ends with `, place 0, trace 0, investigate 0` (on the prototype, with no lab shipped, `Labs: 0 live (0 core, 0 stretch); sort 0, configure 0, simulate 0, place 0, trace 0, investigate 0`); the `budgets:` line keeps the initial JS under 50.0 KB (the prototype measured 49.2 KB, 0.8 KB of headroom, unchanged by this task, and a `Lab` chunk of 12.0 KB against 9.2 KB before it, because the three models now load with the registry); the pre-commit hook runs `pnpm check` and the commit succeeds.
The report gives the initial size, the headroom and the `Lab` chunk size for the Phase 6 controller, and says which of the three Phase 4 `Labs:` pins have already run.
The `git log` line sees a pin only once its merge or release commit is on `master`, so a wave CS whose final return (P4:8689) has run but whose merge has not shows as not run; the report therefore takes wave CS's state from the Phase 4 Task 10 controller, not from the log alone.
A pin whose commit the `git log` line lists ran before this task, so nothing reads its three-engine line again; a pin it does not list reads the line with `, place 0, trace 0, investigate 0` appended, as the controller told the Phase 4 builders before this merge.
When a Phase 6 visual baseline of the module page is on `master`, update only the affected snapshots through their helper and name them in the report.

---

## Task 5: The purchase and data-loss Simulate models

**Files:**
- Modify: `src/labs/simulate/models.ts`, `schemas/lab.ts` (the Simulate block and its models import only)
- Test: `tests/unit/lab-simulate.test.ts`, `tests/content/sim-labs.test.ts`

Design notes:
- Follows Phase 4 Task 13 on `master`, in the worktree `<scratchpad>/p5/wt/simulate` on `p5/simulate`; it runs in parallel with Task 4, and whichever of the two lands second rebases its own hunk of `schemas/lab.ts` (Task 4 edits the imports of the sibling files, the doc comment and `LAB_SCHEMAS`; this task edits the `models.ts` import, `SIM_MODELS` and `SIM_CONSTANTS`).
- The stretch labs Pay less for beans (Module 2) and Lose the instance (Module 6) need models no Phase 4 model fits, so two fixed models join the six (P5-046): `purchase` prices four workloads over six purchase options, and `data-loss` runs one instance's orders through a stop and a lost Availability Zone on an instance store or on EBS with snapshots.
- `purchase`: a workload on option `o` costs `rates[o] * hours * months`, except that a Reserved Instance or a Savings Plan bills the whole `termMonths`, whether the workload runs or not; `interrupted` counts Spot on a workload that cannot stop, and `unmet` counts a hardware need the option misses (a Dedicated Host meets a Dedicated Instance need too); an unknown option counts as On-Demand.
- `data-loss`: on EBS a snapshot is taken every `snapshotEvery` hours below `hours` (0 means never), the first one full and every later one incremental; the stop erases an instance store, so it loses `stopAt * perHour` orders, and the lost zone takes every order since the last snapshot at or before the loss (EBS) or since the stop (instance store); a snapshot due at the loss hour is taken first; snapshots never apply to the instance store.
- Every figure is a lab value and every price is in lab credits (P5-059); neither model has a chart (`series: []`), so the Simulate view's chart stays for `scaling` and `s3-lifecycle`, and the view needs no change.
- `metricInfo` labels every metric, and `cost.<workload id>` reuses `compute-cost`'s per-workload branch; `modelParams` gives one `choice` over the six options per workload, and `store` plus `snapshotEvery` (0 to 24) for `data-loss`, so the Phase 4 `SimulateSpec` refinement checks a writer's parameters against them unchanged.
- `simulateTexts` needs no change: Phase 4's version already returns the `label` of every object in every array of `constants`, so R7 reads the workload labels.
- `SIM_LABS` in `tests/content/sim-labs.test.ts` fixes both stretch labs' constants, parameters, solution, thresholds and wrong paths, as Phase 4 Task 13 fixed its six; the writers of wave `p5stretch` (Task 10) copy them exactly and write only the text.
- Every start fails a goal: Pay less for beans starts at a total of 18192 with one hardware need unmet; Lose the instance starts losing 800 orders at the stop and 1200 with the zone.
- `SimLab` gains `fixedIn` and `wave`, so Phase 4's six rows keep their titles word for word (`$id, as fixed in Task 13`, `is not shipped yet (wave CS writes it)`) and the two new rows read `as fixed in Phase 5 Task 5` and `is not shipped yet (wave p5stretch writes it)` until wave `p5stretch` writes them (P5-047).
- Covers P5-046, P5-047, P5-059, P5-L08 (model), P5-L12 (model).

The two stretch labs, fixed (checked after the implicit `run`):

| Lab | Solution and outcome | Wrong paths (goal, outcome) |
|---|---|---|
| `lab-m02-pay-less-for-beans` (`purchase`), goals g1 `total` max 20000 and `cost.roast-plan` max 100, g2 `interrupted` max 0, g3 `unmet` max 0 | `till` Reserved, `roast-plan` Spot, `loyalty` Dedicated Host: total 18921.6, interrupted 0, unmet 0 | the till on Spot (g2, interrupted 1, total 16329.6); the solution plus the promo on Reserved (g1, 23385.6); the loyalty software on a Dedicated Instance (g3, unmet 1); the till left On-Demand (g1, 22377.6); the roast left On-Demand (g1, `cost.roast-plan` 192, total 19056) |
| `lab-m06-lose-the-instance` (`data-loss`), goals g1 `stopLost` max 0, g2 `zoneLost` max 120, g3 `cost` max 40 | EBS with a snapshot every 6 hours: stopLost 0, zoneLost 80, snapshots 11, cost 30 | snapshots every 6 hours on the instance store (g1, stopLost 800, no snapshot); EBS with no snapshots (g2, zoneLost 2000); EBS with a snapshot every hour (g3, cost 90, 71 snapshots) |

- [ ] **Step 1: Write the failing tests**

In `tests/unit/lab-simulate.test.ts` (Phase 4 Task 13), the `models.ts` import becomes:

```ts
import {
  type BillConstants,
  type DataLossConstants,
  fmt,
  type LifecycleConstants,
  metricInfo,
  modelParams,
  NEVER,
  onlineDays,
  PURCHASE_OPTIONS,
  type PurchaseConstants,
  runModel,
  type SimValues,
  tiered,
} from '../../src/labs/simulate/models.ts';
```

Append to `tests/unit/lab-simulate.test.ts`:

```ts
/** Four made-up bakery jobs: two all year, one for a month, one that may stop; one needs its own hardware. */
const BAKES: PurchaseConstants = {
  workloads: [
    {
      id: 'oven',
      label: 'Oven controller',
      hours: 100,
      months: 12,
      interruptible: false,
      needs: 'dedicated-instance',
    },
    { id: 'batch', label: 'Batch planner', hours: 10, months: 2, interruptible: true, needs: 'none' },
    {
      id: 'vault',
      label: 'Recipe vault',
      hours: 100,
      months: 1,
      interruptible: false,
      needs: 'dedicated-host',
    },
    { id: 'promo', label: 'Promo page', hours: 100, months: 1, interruptible: false, needs: 'none' },
  ],
  rates: {
    'on-demand': 1,
    reserved: 0.5,
    'savings-plan': 0.6,
    spot: 0.2,
    'dedicated-instance': 1.5,
    'dedicated-host': 2,
  },
  termMonths: 12,
};
const everyWorkload = (option: string): SimValues =>
  Object.fromEntries(BAKES.workloads.map((w) => [w.id, option]));

describe('the purchase model', () => {
  it.each([
    ['on-demand', 1200, 20, 100, 1420, 0, 2],
    ['reserved', 600, 60, 600, 1860, 0, 2],
    ['savings-plan', 720, 72, 720, 2232, 0, 2],
    ['spot', 240, 4, 20, 284, 3, 2],
    ['dedicated-instance', 1800, 30, 150, 2130, 0, 1],
    ['dedicated-host', 2400, 40, 200, 2840, 0, 0],
  ] as const)(
    'prices every workload on %s, where a commitment bills the whole term',
    (option, oven, batch, month, total, interrupted, unmet) => {
      expect(runModel('purchase', BAKES, everyWorkload(option))).toEqual({
        metrics: {
          'cost.oven': oven,
          'cost.batch': batch,
          'cost.vault': month,
          'cost.promo': month,
          total,
          interrupted,
          unmet,
        },
        series: [],
      });
    },
  );

  it('counts an unknown or missing option as On-Demand', () => {
    const onDemand = runModel('purchase', BAKES, everyWorkload('on-demand'));
    expect(runModel('purchase', BAKES, {})).toEqual(onDemand);
    expect(runModel('purchase', BAKES, everyWorkload('cheapest'))).toEqual(onDemand);
  });

  it('counts Spot only on a job that cannot stop, and a hardware need only when the option misses it', () => {
    const mixed = { oven: 'dedicated-host', batch: 'spot', vault: 'dedicated-host', promo: 'spot' };
    expect(runModel('purchase', BAKES, mixed).metrics).toMatchObject({ interrupted: 1, unmet: 0 });
    expect(runModel('purchase', BAKES, { ...mixed, vault: 'dedicated-instance' }).metrics.unmet).toBe(1);
  });
});

/** Two days of orders on one instance: it stops at hour 10 and its zone fails at hour 30. */
const SHOP: DataLossConstants = {
  hours: 48,
  perHour: 10,
  stopAt: 10,
  zoneLossAt: 30,
  fullSnapshot: 5,
  incrementalSnapshot: 0.5,
};

describe('the data-loss model', () => {
  it.each([
    [0, 0, 0, 300],
    [1, 47, 28, 0],
    [6, 7, 8, 0],
    [12, 3, 6, 60],
    [24, 1, 5, 60],
  ] as const)(
    'on EBS every %i hours takes snapshots that keep the orders up to the last one before the zone fails',
    (every, snapshots, cost, zoneLost) => {
      expect(runModel('data-loss', SHOP, { store: 'ebs', snapshotEvery: every })).toEqual({
        metrics: { stopLost: 0, zoneLost, snapshots, cost },
        series: [],
      });
    },
  );

  it.each([0, 1, 6, 12, 24])(
    'on the instance store every %i hours loses the orders at the stop and after it, with no snapshot',
    (every) => {
      expect(runModel('data-loss', SHOP, { store: 'instance-store', snapshotEvery: every })).toEqual({
        metrics: { stopLost: 100, zoneLost: 200, snapshots: 0, cost: 0 },
        series: [],
      });
    },
  );
});

describe('the purchase and data-loss shapes', () => {
  it('gives one purchase choice per workload, and a store and a snapshot interval for data loss', () => {
    expect(modelParams('purchase', BAKES)).toEqual(
      ['oven', 'batch', 'vault', 'promo'].map((id) => ({
        id,
        kind: 'choice',
        options: [...PURCHASE_OPTIONS],
      })),
    );
    expect(PURCHASE_OPTIONS).toEqual([
      'on-demand',
      'reserved',
      'savings-plan',
      'spot',
      'dedicated-instance',
      'dedicated-host',
    ]);
    expect(modelParams('data-loss', SHOP)).toEqual([
      { id: 'store', kind: 'choice', options: ['instance-store', 'ebs'] },
      { id: 'snapshotEvery', kind: 'int', min: 0, max: 24 },
    ]);
  });

  it('labels every purchase and data-loss metric', () => {
    expect(metricInfo('purchase', 'total', BAKES)).toEqual({ label: 'Yearly cost', unit: 'lab credits' });
    expect(metricInfo('purchase', 'cost.vault', BAKES)).toEqual({
      label: 'Cost: Recipe vault',
      unit: 'lab credits',
    });
    expect(metricInfo('purchase', 'interrupted', BAKES)).toEqual({ label: 'Jobs Spot may stop', unit: '' });
    expect(metricInfo('purchase', 'unmet', BAKES)).toEqual({ label: 'Hardware needs not met', unit: '' });
    expect(metricInfo('purchase', 'cost.nothing', BAKES)).toBeNull();
    expect(metricInfo('data-loss', 'stopLost', SHOP)).toEqual({ label: 'Orders lost at the stop', unit: '' });
    expect(metricInfo('data-loss', 'zoneLost', SHOP)).toEqual({
      label: 'Orders lost with the zone',
      unit: '',
    });
    expect(metricInfo('data-loss', 'snapshots', SHOP)).toEqual({ label: 'Snapshots taken', unit: '' });
    expect(metricInfo('data-loss', 'cost', SHOP)).toEqual({ label: 'Snapshot cost', unit: 'lab credits' });
    expect(metricInfo('data-loss', 'cost.oven', SHOP)).toBeNull();
  });

  it('rejects a repeated workload id, a missing rate and a stop or zone loss out of order', () => {
    const issues = (model: 'purchase' | 'data-loss', c: unknown) =>
      SIM_CONSTANTS[model].safeParse(c).error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];
    expect(SIM_CONSTANTS.purchase.safeParse(BAKES).success).toBe(true);
    expect(issues('purchase', { ...BAKES, workloads: [BAKES.workloads[0], BAKES.workloads[0]] })).toEqual([
      "workloads.1.id: duplicate id 'oven'",
    ]);
    const { spot: _, ...noSpot } = BAKES.rates;
    expect(issues('purchase', { ...BAKES, rates: noSpot })).toHaveLength(1);
    expect(SIM_CONSTANTS['data-loss'].safeParse(SHOP).success).toBe(true);
    expect(issues('data-loss', { ...SHOP, stopAt: 30 })).toEqual([
      ': stopAt and zoneLossAt must fall in order inside hours',
    ]);
    expect(issues('data-loss', { ...SHOP, zoneLossAt: 48 })).toEqual([
      ': stopAt and zoneLossAt must fall in order inside hours',
    ]);
  });

  it('gives R7 every workload label of a purchase spec', () => {
    const beans = {
      model: 'purchase',
      constants: BAKES,
      params: BAKES.workloads.map((w) => ({
        kind: 'choice',
        id: w.id,
        label: `Buy ${w.label}`,
        options: PURCHASE_OPTIONS.map((o) => ({ id: o, label: o })),
        initial: 'on-demand',
      })),
      thresholds: [{ goal: 'g1', metric: 'total', max: 1000 }],
    };
    expect(SimulateSpec.safeParse(beans).success).toBe(true);
    expect(simulateTexts(beans)).toEqual(
      expect.arrayContaining(['Oven controller', 'Batch planner', 'Recipe vault', 'Promo page']),
    );
  });
});
```

In `tests/content/sim-labs.test.ts` (Phase 4 Task 13), the `models.ts` import becomes:

```ts
import {
  type BillConstants,
  type CacheConstants,
  type ComputeCostConstants,
  type DataLossConstants,
  type LifecycleConstants,
  PURCHASE_OPTIONS,
  type PurchaseConstants,
  runModel,
  type ScalingConstants,
  type SimModel,
  type SimValues,
  type TransferConstants,
} from '../../src/labs/simulate/models.ts';
```

Replace the file's doc comment with:

```ts
/**
 * The Simulate labs, fixed by Phase 4 Task 13 (six) and Phase 5 Task 5 (two): constants, parameters,
 * solution, thresholds and wrong paths. Writers copy them and write only the text; this test holds
 * every shipped lab to them, and its orderings hold the lessons the numbers teach.
 */
```

`SimLab` gains two fields after `id`:

```ts
interface SimLab {
  id: string;
  /** The task that fixed the numbers, as the test titles name it. */
  fixedIn: string;
  /** The content wave that writes the lab. */
  wave: string;
  model: SimModel;
```

Add `fixedIn: 'Task 13',` and `wave: 'CS',` after the `id:` line of each of the six Phase 4 rows of `SIM_LABS`, and add the new constants right above `const RUSH_FIX`:

```ts
const PURCHASE: PurchaseConstants = {
  workloads: [
    {
      id: 'till',
      label: 'Till and order server',
      hours: 720,
      months: 12,
      interruptible: false,
      needs: 'none',
    },
    {
      id: 'roast-plan',
      label: 'Weekend roast planning',
      hours: 16,
      months: 12,
      interruptible: true,
      needs: 'none',
    },
    { id: 'promo', label: 'Holiday promo site', hours: 720, months: 1, interruptible: false, needs: 'none' },
    {
      id: 'loyalty',
      label: 'Loyalty software',
      hours: 720,
      months: 12,
      interruptible: false,
      needs: 'dedicated-host',
    },
  ],
  rates: {
    'on-demand': 1,
    reserved: 0.6,
    'savings-plan': 0.65,
    spot: 0.3,
    'dedicated-instance': 1.2,
    'dedicated-host': 1.5,
  },
  termMonths: 12,
};
const BEANS_FIX = [set('till', 'reserved'), set('roast-plan', 'spot'), set('loyalty', 'dedicated-host')];
const DATA_LOSS: DataLossConstants = {
  hours: 72,
  perHour: 40,
  stopAt: 20,
  zoneLossAt: 50,
  fullSnapshot: 20,
  incrementalSnapshot: 1,
};
```

Append the two rows to `SIM_LABS`, after the `lab-m12-online-or-offline` row:

```ts
  {
    id: 'lab-m02-pay-less-for-beans',
    fixedIn: 'Phase 5 Task 5',
    wave: 'p5stretch',
    model: 'purchase',
    constants: PURCHASE,
    params: PURCHASE.workloads.map((w) => choice(w.id, [...PURCHASE_OPTIONS], 'on-demand')),
    thresholds: [
      { goal: 'g1', metric: 'total', max: 20000 },
      { goal: 'g1', metric: 'cost.roast-plan', max: 100 },
      { goal: 'g2', metric: 'interrupted', max: 0 },
      { goal: 'g3', metric: 'unmet', max: 0 },
    ],
    solution: BEANS_FIX,
    outcome: {
      'cost.till': 5184,
      'cost.roast-plan': 57.6,
      'cost.promo': 720,
      'cost.loyalty': 12960,
      total: 18921.6,
      interrupted: 0,
      unmet: 0,
    },
    wrongPaths: [
      {
        actions: [set('till', 'spot'), set('roast-plan', 'spot'), set('loyalty', 'dedicated-host')],
        failsGoal: 'g2',
        outcome: { interrupted: 1, total: 16329.6 },
      },
      { actions: [...BEANS_FIX, set('promo', 'reserved')], failsGoal: 'g1', outcome: { total: 23385.6 } },
      {
        actions: [set('till', 'reserved'), set('roast-plan', 'spot'), set('loyalty', 'dedicated-instance')],
        failsGoal: 'g3',
        outcome: { unmet: 1 },
      },
      {
        actions: [set('roast-plan', 'spot'), set('loyalty', 'dedicated-host')],
        failsGoal: 'g1',
        outcome: { total: 22377.6 },
      },
      {
        actions: [set('till', 'reserved'), set('loyalty', 'dedicated-host')],
        failsGoal: 'g1',
        outcome: { 'cost.roast-plan': 192, total: 19056 },
      },
    ],
  },
  {
    id: 'lab-m06-lose-the-instance',
    fixedIn: 'Phase 5 Task 5',
    wave: 'p5stretch',
    model: 'data-loss',
    constants: DATA_LOSS,
    params: [choice('store', ['instance-store', 'ebs'], 'instance-store'), int('snapshotEvery', 0, 24, 1, 0)],
    thresholds: [
      { goal: 'g1', metric: 'stopLost', max: 0 },
      { goal: 'g2', metric: 'zoneLost', max: 120 },
      { goal: 'g3', metric: 'cost', max: 40 },
    ],
    solution: [set('store', 'ebs'), set('snapshotEvery', 6)],
    outcome: { stopLost: 0, zoneLost: 80, snapshots: 11, cost: 30 },
    wrongPaths: [
      { actions: [set('snapshotEvery', 6)], failsGoal: 'g1', outcome: { stopLost: 800, snapshots: 0 } },
      { actions: [set('store', 'ebs')], failsGoal: 'g2', outcome: { zoneLost: 2000 } },
      {
        actions: [set('store', 'ebs'), set('snapshotEvery', 1)],
        failsGoal: 'g3',
        outcome: { cost: 90, snapshots: 71 },
      },
    ],
  },
```

The two `describe.each` titles take the row's fields, so Phase 4's titles stay word for word:

```ts
describe.each(SIM_LABS)('$id, as fixed in $fixedIn', (lab) => {
```

```ts
    it(`is not shipped yet (wave ${lab.wave} writes it)`, () => {
```

Add these tests at the end of `describe('the orderings the lessons rest on')`, after the `Online or offline transfer` test and before the describe's closing `});`:

```ts
  const beans = (values: SimValues) => runModel('purchase', PURCHASE, values).metrics;
  const each = (workload: string) =>
    Object.fromEntries(PURCHASE_OPTIONS.map((o) => [o, beans({ [workload]: o })[`cost.${workload}`]]));

  it('Pay less for beans: a commitment beats On-Demand for the all-year till, and On-Demand beats one for the one-month promo', () => {
    expect(each('till')).toMatchObject({ reserved: 5184, 'savings-plan': 5616, 'on-demand': 8640 });
    expect(each('promo')).toMatchObject({ 'on-demand': 720, reserved: 5184 });
  });

  it('Pay less for beans: Spot is the cheapest option for the roast batch, and only Spot stays under 100', () => {
    const roast = each('roast-plan');
    expect(roast).toMatchObject({ spot: 57.6, reserved: 115.2, 'savings-plan': 124.8, 'on-demand': 192 });
    expect(PURCHASE_OPTIONS.filter((o) => (roast[o] ?? 0) <= 100)).toEqual(['spot']);
  });

  const loss = (values: SimValues) => runModel('data-loss', DATA_LOSS, values).metrics;
  const EVERY = [0, 1, 6, 12, 24];

  it('Lose the instance: snapshots never protect the instance store', () => {
    for (let every = 0; every <= 24; every += 1) {
      expect(loss({ store: 'instance-store', snapshotEvery: every })).toMatchObject({
        stopLost: 800,
        snapshots: 0,
      });
    }
  });

  it('Lose the instance: on EBS more frequent snapshots never lose more orders and cost more', () => {
    const ebs = EVERY.map((every) => loss({ store: 'ebs', snapshotEvery: every }));
    expect(ebs.map((m) => m.zoneLost)).toEqual([2000, 0, 80, 80, 80]);
    expect(ebs.map((m) => m.cost)).toEqual([0, 90, 30, 24, 21]);
    expect(ebs.map((m) => m.stopLost)).toEqual([0, 0, 0, 0, 0]);
  });
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm vitest run tests/unit/lab-simulate.test.ts tests/content/sim-labs.test.ts 2>&1 | grep -E "FAIL|Error|Tests " | head -6
```

Expected: `tests/content/sim-labs.test.ts` fails to load with `TypeError: PURCHASE_OPTIONS is not iterable`, and `tests/unit/lab-simulate.test.ts` fails 21 tests, the purchase and data-loss tables with `AssertionError: expected undefined to deeply equal { metrics: { …(7) }, series: [] }`, because neither model exists yet.

- [ ] **Step 3: Add the two models**

In `src/labs/simulate/models.ts` (Phase 4 Task 13), replace the file's doc comment and `SimModel` with:

```ts
/**
 * The eight Simulate models (spec 5.1): six since Phase 4 Task 13, `purchase` and `data-loss` since
 * Phase 5 Task 5; pure, deterministic, no randomness.
 * Every money figure is in lab credits, a made-up unit; `schemas/lab.ts` validates the constants
 * with `SIM_CONSTANTS` before any of these functions sees them, so they only cast.
 */

export type SimModel =
  | 'scaling'
  | 'compute-cost'
  | 's3-lifecycle'
  | 'cache'
  | 'bill'
  | 'transfer'
  | 'purchase'
  | 'data-loss';
```

add the purchase and data-loss names right above `const CREDITS = 'lab credits';`:

```ts
/** The ways to buy compute that `purchase` compares (spec 5.2, Pay less for beans). */
export const PURCHASE_OPTIONS = [
  'on-demand',
  'reserved',
  'savings-plan',
  'spot',
  'dedicated-instance',
  'dedicated-host',
] as const;
export type PurchaseOption = (typeof PURCHASE_OPTIONS)[number];
export interface PurchaseWorkload {
  id: string;
  label: string;
  /** Hours it runs each month it runs. */
  hours: number;
  /** Months of the year it runs. */
  months: number;
  /** Whether it can stop and resume later, so Spot suits it. */
  interruptible: boolean;
  needs: 'none' | 'dedicated-instance' | 'dedicated-host';
}
export interface PurchaseConstants {
  workloads: PurchaseWorkload[];
  /** Lab credits per hour for each option. */
  rates: Readonly<Record<PurchaseOption, number>>;
  /** The months a Reserved Instance or a Savings Plan bills, whether the workload runs or not. */
  termMonths: number;
}
export interface DataLossConstants {
  hours: number;
  /** Orders written each hour. */
  perHour: number;
  /** The hour the instance stops, which erases an instance store. */
  stopAt: number;
  /** The hour the Availability Zone is lost, with every volume in it. */
  zoneLossAt: number;
  fullSnapshot: number;
  incrementalSnapshot: number;
}
```

add the two cases at the end of `modelParams`'s switch, after `transfer`:

```ts
    case 'purchase':
      return (constants as PurchaseConstants).workloads.map((w) => ({
        id: w.id,
        kind: 'choice',
        options: [...PURCHASE_OPTIONS],
      }));
    case 'data-loss':
      return [
        { id: 'store', kind: 'choice', options: ['instance-store', 'ebs'] },
        { id: 'snapshotEvery', kind: 'int', min: 0, max: 24 },
      ];
```

add the two models' metrics at the end of `metricInfo`'s `fixed` table, after `transfer`:

```ts
    purchase: {
      total: { label: 'Yearly cost', unit: CREDITS },
      interrupted: { label: 'Jobs Spot may stop', unit: '' },
      unmet: { label: 'Hardware needs not met', unit: '' },
    },
    'data-loss': {
      stopLost: { label: 'Orders lost at the stop', unit: '' },
      zoneLost: { label: 'Orders lost with the zone', unit: '' },
      snapshots: { label: 'Snapshots taken', unit: '' },
      cost: { label: 'Snapshot cost', unit: CREDITS },
    },
```

let the per-workload `cost.<id>` branch serve `purchase` too:

```ts
  if ((model === 'compute-cost' || model === 'purchase') && head === 'cost') {
    const w = (constants as ComputeCostConstants | PurchaseConstants).workloads.find((x) => x.id === id);
    return w === undefined ? null : { label: `Cost: ${w.label}`, unit: CREDITS };
  }
```

add the two models right above `/** Runs one model over validated constants and the parameter values on screen. */`:

```ts
const COMMITMENTS: ReadonlySet<string> = new Set(['reserved', 'savings-plan']);
const MEETS: Readonly<Record<PurchaseWorkload['needs'], readonly string[]>> = {
  none: PURCHASE_OPTIONS,
  'dedicated-instance': ['dedicated-instance', 'dedicated-host'],
  'dedicated-host': ['dedicated-host'],
};

function purchase(c: PurchaseConstants, v: SimValues): SimResult {
  const metrics: Record<string, number> = {};
  let total = 0;
  let interrupted = 0;
  let unmet = 0;
  for (const w of c.workloads) {
    const picked = str(v, w.id);
    const o: PurchaseOption = (PURCHASE_OPTIONS as readonly string[]).includes(picked)
      ? (picked as PurchaseOption)
      : 'on-demand';
    const cost = round2(c.rates[o] * w.hours * (COMMITMENTS.has(o) ? c.termMonths : w.months));
    metrics[`cost.${w.id}`] = cost;
    total += cost;
    if (o === 'spot' && !w.interruptible) interrupted += 1;
    if (!MEETS[w.needs].includes(o)) unmet += 1;
  }
  metrics.total = round2(total);
  metrics.interrupted = interrupted;
  metrics.unmet = unmet;
  return { metrics, series: [] };
}

function dataLoss(c: DataLossConstants, v: SimValues): SimResult {
  const ebs = str(v, 'store') === 'ebs';
  const every = num(v, 'snapshotEvery');
  const at: number[] = [];
  if (ebs && every > 0) for (let h = every; h < c.hours; h += every) at.push(h);
  // A snapshot due at the hour the zone fails is taken first.
  const last = at.filter((h) => h <= c.zoneLossAt).at(-1) ?? 0;
  return {
    metrics: {
      stopLost: ebs ? 0 : c.stopAt * c.perHour,
      zoneLost: (c.zoneLossAt - (ebs ? last : c.stopAt)) * c.perHour,
      snapshots: at.length,
      cost: at.length === 0 ? 0 : round2(c.fullSnapshot + (at.length - 1) * c.incrementalSnapshot),
    },
    series: [],
  };
}
```

and add their cases at the end of `runModel`'s switch, after `transfer`:

```ts
    case 'purchase':
      return purchase(constants as PurchaseConstants, values);
    case 'data-loss':
      return dataLoss(constants as DataLossConstants, values);
```

- [ ] **Step 4: Add the two models' constants to the schema**

In `schemas/lab.ts` (Phase 4 Task 13), the `models.ts` import becomes:

```ts
import { metricInfo, modelParams, type PurchaseOption, type SimModel } from '../src/labs/simulate/models.ts';
```

`SIM_MODELS` appends the two models:

```ts
export const SIM_MODELS = [
  'scaling',
  'compute-cost',
  's3-lifecycle',
  'cache',
  'bill',
  'transfer',
  'purchase',
  'data-loss',
] as const satisfies readonly SimModel[];
```

add the rate schema right under `const Named = { id: Slug, label: Label };`:

```ts
/** A purchase option's lab credits per hour. */
const Rate = z.number().positive();
```

and add the two entries at the end of `SIM_CONSTANTS`, after `transfer`:

```ts
  purchase: z
    .strictObject({
      workloads: z
        .array(
          z.strictObject({
            ...Named,
            hours: z.int().min(1).max(744),
            months: z.int().min(1).max(12),
            interruptible: z.boolean(),
            needs: z.enum(['none', 'dedicated-instance', 'dedicated-host']),
          }),
        )
        .min(2)
        .max(6),
      rates: z.strictObject({
        'on-demand': Rate,
        reserved: Rate,
        'savings-plan': Rate,
        spot: Rate,
        'dedicated-instance': Rate,
        'dedicated-host': Rate,
      } satisfies Record<PurchaseOption, z.ZodNumber>),
      termMonths: z.int().min(1).max(36),
    })
    .superRefine((c, ctx) => uniqueIds(c.workloads, ctx, ['workloads'])),
  'data-loss': z
    .strictObject({
      hours: z.int().min(24).max(168),
      perHour: z.int().min(1).max(1000),
      stopAt: z.int(),
      zoneLossAt: z.int(),
      fullSnapshot: z.number().min(0),
      incrementalSnapshot: z.number().min(0),
    })
    .refine((c) => 0 < c.stopAt && c.stopAt < c.zoneLossAt && c.zoneLossAt < c.hours, {
      message: 'stopAt and zoneLossAt must fall in order inside hours',
    }),
```

- [ ] **Step 5: Run the tests, the type check and the content check and see them pass**

```bash
pnpm vitest run tests/unit/lab-simulate.test.ts tests/content/sim-labs.test.ts 2>&1 | grep -E "FAIL|Test Files|Tests "
pnpm vitest run tests/content/sim-labs.test.ts --reporter=verbose 2>&1 | grep -E "p5stretch"
pnpm typecheck
pnpm content:validate
```

Expected: `Test Files  2 passed (2)` with 38 more tests than before this task (22 in `lab-simulate.test.ts`, 16 in `sim-labs.test.ts`; on the prototype `Tests  112 passed (112)`); the two lines `the shipped lab-m02-pay-less-for-beans > is not shipped yet (wave p5stretch writes it)` and `the shipped lab-m06-lose-the-instance > is not shipped yet (wave p5stretch writes it)`; `tsc --noEmit` prints nothing; `content:validate: 13 rules, 0 findings`.

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix
git add src/labs/simulate/models.ts schemas/lab.ts tests/unit/lab-simulate.test.ts tests/content/sim-labs.test.ts
git commit -m "Add the purchase and data-loss Simulate models" -m "Two more fixed models for the stretch labs Pay less for beans and Lose the instance, with their numbers pinned in SIM_LABS."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

---

## Task 6: The Place view, its keys and its end-to-end tests

**Files:**
- Create: `src/labs/place/View.tsx`
- Modify: `src/app/lab.ts`, `src/app/lab-keys.ts`, `src/app/shortcuts.ts`, `src/app/screens/Lab.tsx`, `src/ui/base.css` (under `/* Labs: Place */` only), `tests/e2e/lab-helpers.ts`, `tests/e2e/labs.spec.ts`
- Test: `tests/unit/lab.test.ts`, `tests/unit/lab-keys.test.ts`, `tests/unit/keys.test.ts`, `tests/e2e/labs.spec.ts`

Builds on Phase 5 Tasks 1 and 4 and on Phase 4 Task 13 on `master` (Phase 4 Tasks 6, 7, 9 and 12, which own the lab keys, the lab screen, the Sort e2e and the `Board` switch, are merged already).
Its `src/ui/base.css` rules go under Task 4's `/* Labs: Place */` anchor, which sits after the last Simulate rule and above Phase 4 Task 17's `/* Incident */` rules and Task 19's `/* Lightning */` rules below them (Tasks 17 and 19, the last Phase 4 tasks that edit that file, are merged already), so the edit follows them.
It runs in the Place worktree after Task 4, rebased on `master`, and it is the first of Tasks 6, 7 and 8 on the shared lab files (`src/app/lab.ts`, `tests/unit/lab.test.ts`, `src/app/screens/Lab.tsx`, `tests/e2e/lab-helpers.ts`, `tests/e2e/labs.spec.ts`); Task 7 rebases on it; at the latest Saturday, October 24.

Design notes:
- The Place view works like Sort's: tap a piece to pick it up, tap a slot to place it, tap the held piece to put it down; nothing needs dragging (WCAG 2.5.7), and the lab screen mirrors every tap with a key.
- The tray (`.place-tray`) and the map (`.place-map`) are two `data-lab-region` regions, so each is one tab stop and the arrow keys move within it; every tray piece, slot button and placed piece is a `data-lab-item` button with `tabIndex={-1}`, and Phase 4's roving code in `Lab.tsx` does the rest.
- The map nests one `<section class="place-box" data-kind>` per container in `placeSlots` order (depth-first, the bench last), so the slot numbers `1` to `9` and `0` run in sequence on screen and in DOM order, and slots past the tenth show no number but still take a held piece by tap or `Space`.
- A container that is not a slot shows its label in a `<p class="place-name">`, not a heading, so the lab page keeps its heading order (h1, then the h2s of Phase 4).
- The failure buttons sit in their own `<fieldset class="place-failures">` with the legend `Try a failure`; each is a native `aria-pressed` button reading `Oven Row A fails`, which dispatches `fail` or, when pressed again, `restore`; a previewed failure marks its container with a dashed border and the word `Down`, and every piece below it with `Down` too, so colour is never the only signal.
- Place reuses Sort's keys: `Space` on a focused tray piece or slot is the native button click (pick up, or place the held piece there), `1` to `9` and `0` place the held piece in the first ten slots, `Backspace` sends it back to the tray, `Escape` puts it down, and `Enter` anywhere on the board, slots and pieces included, checks; `labKey` admits `place` beside `sort`, and the `onControl` exclusion gains `.piece, .slot-target`.
- `Lab.tsx` replaces its Sort-only pick-up code with one module-private `holdBoard(lab)` that gives the Sort and Place boards' targets in key order, the labels for the announcements, the place and unplace actions, and the focus targets; Sort's behaviour does not change, and its Task 9 e2e tests still pass.
- `bucketCount` becomes `Math.min(10, targets.length)`, so a Place board with more than ten slots never offers a digit past `0`.
- A failure preview changes no check, so the screen announces it at once: `Oven Row A is down.` or `Oven Row A is back.`; placing and returning a piece reuse Phase 4's `placedLine` and `returnedLine`.
- Two Help rows change their words so they read for Sort and Place (`Lab: pick up a card or a piece`, `Lab: place it in that bucket or slot (0 is the tenth)`); the other six `Lab:` rows stay, and Phase 6's two new rows (`g` then `c` for `Capstone`, `g` then `m` for `Current module`) go right after the `g`, `p` row, away from these, with the two phases serialized at merge time.
- `checkLabel('place')` stays `Check` (Task 4 pins it).
- No raw id is rendered: ids live only in `data-piece`, `data-slot` and element ids.
- The styles sit under `/* Labs: Place */`, the anchor Task 4 inserted; they use the colour tokens only (`--surface`, `--pane`, `--line`, `--active`, `--muted`, `--text`, `--bad`) and the same fixed spacing as Sort's rules, since `base.css` has no spacing tokens; nested boxes alternate `--pane` and `--surface` so each level reads as one box, targets are at least 44 px tall, and the panes stack on a phone.
- The end-to-end tests serve Task 1's bakery lab as `SYNTHETIC_PLACE_LAB_ID` through Phase 4's `useSyntheticLab`; the keyboard run is spec 9 item 9's keyboard-only lab run for Place (P5-088).
- The axe test opens one goal's hint with a piece held and a failure previewed, so the Place hint sentence (`First shop front is still in the tray.`) is checked on screen and the open hint is part of the axe scan.
- The Place view rides in the lazy `Lab` chunk, imported only from `Lab.tsx`, so the initial bundle does not change; the report states the initial JS size, its headroom and the `Lab` chunk size.
- Covers P5-012, P5-021, P5-025, P5-027, P5-062, P5-065, P5-066, P5-067, P5-068 (Place), P5-069 to P5-073, P5-076, P5-078, P5-079, P5-083, P5-088, P5-089 (Place).

- [ ] **Step 1: Write the failing unit tests**

In `tests/unit/lab.test.ts` (Phase 4 Task 7, with Task 4's six-engine `ENGINE_LABEL` pin), add `backLine`, `DOWN_MARK`, `downLine`, `FAILURE_LEGEND`, `failureButton`, `PIECES_EMPTY` and `PIECES_LEGEND` to the import from `../../src/app/lab.ts`, so the import reads:

```ts
import {
  backLine,
  CREDITS_NOTE,
  checkLabel,
  DOWN_MARK,
  downLine,
  ENGINE_LABEL,
  FAILURE_LEGEND,
  failureButton,
  goalWord,
  hintLine,
  labCheckLine,
  labDoneLine,
  labLede,
  PIECES_EMPTY,
  PIECES_LEGEND,
  placedLine,
  RESET_ASK,
  returnedLine,
  SIM_IDLE,
  SIM_RESULTS,
  simChartLabel,
  TRAY_EMPTY,
} from '../../src/app/lab.ts';
```

and append at the end of the file:

```ts
describe('Place copy', () => {
  it('words the tray, the failure buttons and the down mark', () => {
    expect(PIECES_EMPTY).toBe('Every piece is placed.');
    expect(PIECES_LEGEND).toBe('Pieces');
    expect(FAILURE_LEGEND).toBe('Try a failure');
    expect(DOWN_MARK).toBe('Down');
    expect(failureButton('Oven Row A')).toBe('Oven Row A fails');
  });

  it('announces a placed piece, a returned piece and a failure preview', () => {
    expect(placedLine('First shop front', 'Public subnet A')).toBe(
      'Placed First shop front in Public subnet A.',
    );
    expect(returnedLine('First shop front')).toBe('First shop front is back in the tray.');
    expect(downLine('Oven Row A')).toBe('Oven Row A is down.');
    expect(backLine('Oven Row A')).toBe('Oven Row A is back.');
  });
});
```

In `tests/unit/lab-keys.test.ts` (Phase 4 Task 6), replace the head of `it('keeps the Sort keys to Sort labs')`:

```ts
  it('keeps the Sort keys to Sort labs', () => {
    for (const engine of ['configure', 'simulate'] as const) {
```

with three new tests and the widened engine loop:

```ts
  it('places a held piece in a Place lab with the same keys as a Sort lab', () => {
    const place = (more: Partial<LabKeyState> = {}) => state({ engine: 'place', bucketCount: 6, ...more });
    expect(labKey(key('6'), place({ holding: true }))).toEqual({ kind: 'place', bucket: 6 });
    expect(labKey(key('7'), place({ holding: true }))).toBeNull();
    expect(labKey(key('0'), place({ holding: true, bucketCount: 10 }))).toEqual({
      kind: 'place',
      bucket: 10,
    });
    expect(labKey(key('Backspace'), place({ holding: true }))).toEqual({ kind: 'unplace' });
    expect(labKey(key('Escape'), place({ holding: true }))).toEqual({ kind: 'drop' });
    expect(labKey(key('ArrowDown'), place({ inItems: true }))).toEqual({ kind: 'move', delta: 1 });
  });

  it('never takes Space, so the native click picks up or places', () => {
    for (const engine of ['sort', 'place'] as const) {
      expect(labKey(key(' '), state({ engine }))).toBeNull();
      expect(labKey(key(' '), state({ engine, holding: true, inItems: true }))).toBeNull();
    }
  });

  it('checks with Enter from a slot while a piece is held', () => {
    expect(labKey(key('Enter'), state({ engine: 'place', holding: true, inItems: true }))).toEqual({
      kind: 'check',
    });
  });

  it('keeps the pick-up keys to Sort and Place labs', () => {
    for (const engine of ['configure', 'simulate', 'trace', 'investigate'] as const) {
```

The last two new tests pin behaviour that already holds (`labKey` never takes `Space`, and `Enter` checks whenever `onControl` is false); the screen's `onControl` exclusion in Step 5 is what makes `Enter` on a slot reach them.

In `tests/unit/keys.test.ts` (Phase 4 Task 6), replace the two Sort rows of `lists the lab keys after the exam keys, in order and word for word`:

```ts
      'Space: Lab: pick up a card',
      '1 to 0: Lab: place it in that bucket (0 is the tenth)',
```

with:

```ts
      'Space: Lab: pick up a card or a piece',
      '1 to 0: Lab: place it in that bucket or slot (0 is the tenth)',
```

- [ ] **Step 2: Run the unit tests and see them fail**

```bash
pnpm test tests/unit/lab.test.ts tests/unit/lab-keys.test.ts tests/unit/keys.test.ts 2>&1 | grep -E "FAIL|AssertionError|TypeError|Test Files"
```

Expected: `Test Files  3 failed (3)` with four failing tests: `the Help sheet > lists the lab keys after the exam keys, in order and word for word` (`AssertionError: expected [ 'Tab: Lab: next region', …(7) ] to deeply equal [ 'Tab: Lab: next region', …(7) ]`), `labKey > places a held piece in a Place lab with the same keys as a Sort lab` (`AssertionError: expected null to deeply equal { kind: 'place', bucket: 6 }`), `Place copy > words the tray, the failure buttons and the down mark` (`AssertionError: expected undefined to be 'Every piece is placed.'`) and `Place copy > announces a placed piece, a returned piece and a failure preview` (`TypeError: downLine is not a function`).

- [ ] **Step 3: Add the Place copy, the Place keys and the reworded Help rows**

In `src/app/lab.ts` (Phase 4 Task 7), reword the two announcement comments, since they now serve Place too: `/** Announced when a card lands in a bucket. */` becomes `/** Announced when a card lands in a bucket or a piece in a slot. */`, and `/** Announced when a card goes back to the tray. */` becomes `/** Announced when a card or a piece goes back to the tray. */`.
Then insert, right above `/** The check button's words: Simulate runs the model before it checks (Task 13). */`:

```ts
/** The Place tray once every piece is in a slot or on the bench. */
export const PIECES_EMPTY = 'Every piece is placed.';
/** The Place tray's legend, read by screen readers. */
export const PIECES_LEGEND = 'Pieces';
/** The legend over the Place failure buttons. */
export const FAILURE_LEGEND = 'Try a failure';
/** The word on a failed container and on each piece below it, so colour is never the only signal (spec 7.6). */
export const DOWN_MARK = 'Down';

/** A Place failure button: `Oven Row A fails`. */
export function failureButton(label: string): string {
  return `${label} fails`;
}

/** Announced when a failure preview starts. */
export function downLine(label: string): string {
  return `${label} is down.`;
}

/** Announced when a failure preview ends. */
export function backLine(label: string): string {
  return `${label} is back.`;
}

```

In `src/app/lab-keys.ts` (Phase 4 Task 6, with Task 4's `engine: LabEngineId`), let Place through the pick-up keys and reword the two field comments that named Sort alone.
Replace:

```ts
  /** True while a Sort card is held. */
```

with:

```ts
  /** True while a Sort card or a Place piece is held. */
```

replace:

```ts
  /** True when focus is on a button, link or summary that answers Enter itself, other than a card or a bucket. */
```

with:

```ts
  /** True when focus is on a button, link or summary that answers Enter itself, other than a card, a piece or a target. */
```

and replace:

```ts
  if (state.engine !== 'sort') return null;
```

with:

```ts
  if (state.engine !== 'sort' && state.engine !== 'place') return null;
```

In `src/app/shortcuts.ts` (Phase 4 Task 6), replace the two rows:

```ts
  { keys: ['Space'], joiner: '', action: 'Lab: pick up a card' },
  { keys: ['1', '0'], joiner: 'to', action: 'Lab: place it in that bucket (0 is the tenth)' },
```

with:

```ts
  { keys: ['Space'], joiner: '', action: 'Lab: pick up a card or a piece' },
  { keys: ['1', '0'], joiner: 'to', action: 'Lab: place it in that bucket or slot (0 is the tenth)' },
```

- [ ] **Step 4: Run the unit tests and see them pass**

```bash
pnpm test tests/unit/lab.test.ts tests/unit/lab-keys.test.ts tests/unit/keys.test.ts
```

Expected: `Test Files  3 passed (3)` with no `FAIL` line.

- [ ] **Step 5: Add the Place view and plug it into the lab screen**

Create `src/labs/place/View.tsx`:

```tsx
import type { PlaceAction, PlaceSpec } from '../../../schemas/lab-place.ts';
import { DOWN_MARK, FAILURE_LEGEND, failureButton, PIECES_EMPTY, PIECES_LEGEND } from '../../app/lab.ts';
import { isDown, type PlaceState } from './model.ts';

export interface PlaceViewProps {
  spec: PlaceSpec;
  state: PlaceState;
  /** The piece picked up, or null. */
  held: string | null;
  onHold(piece: string | null): void;
  onAction(action: PlaceAction): void;
}

type Container = PlaceSpec['containers'][number];

/**
 * The Place board (spec 5.1): tap a piece to pick it up, then tap a slot to place it; tapping the held piece puts it
 * down. The map nests the containers in slot order, so the slot numbers run in sequence and the bench comes last.
 * The tray and the map are two regions, each one tab stop; the failure buttons preview one failure at a time and never
 * change a check. Nothing needs dragging (WCAG 2.5.7), and the lab screen mirrors every tap with a key.
 */
export function PlaceView({ spec, state, held, onHold, onAction }: PlaceViewProps) {
  const down = (slot: string): boolean => state.failed !== null && isDown(spec, slot, state.failed);
  const piece = (id: string, slot: string | null) => {
    const p = spec.pieces.find((x) => x.id === id);
    if (p === undefined) return null;
    return (
      <button
        key={p.id}
        type="button"
        class="piece"
        aria-pressed={held === p.id}
        data-lab-item
        data-piece={p.id}
        tabIndex={-1}
        onClick={() => onHold(held === p.id ? null : p.id)}
      >
        {p.label}
        {slot !== null && down(slot) && <span class="down-mark"> {DOWN_MARK}</span>}
        {slot === null && p.detail !== undefined && <span class="piece-detail">{p.detail}</span>}
      </button>
    );
  };
  const box = (c: Container) => {
    const children = spec.containers.filter((k) => k.parent === c.id);
    const n = state.slots.indexOf(c.id);
    const failedHere = state.failed === c.id;
    const mark = failedHere && <span class="down-mark"> {DOWN_MARK}</span>;
    const inside = state.pieces.filter((id) => state.placed[id] === c.id);
    return (
      <section
        key={c.id}
        class={failedHere ? 'place-box is-down' : 'place-box'}
        data-kind={c.kind}
        aria-labelledby={`place-${c.id}`}
      >
        {children.length === 0 ? (
          <button
            id={`place-${c.id}`}
            type="button"
            class="slot-target"
            data-lab-item
            data-slot={c.id}
            tabIndex={-1}
            onClick={() => {
              if (held !== null) onAction({ t: 'place', piece: held, slot: c.id });
            }}
          >
            {n >= 0 && n < 10 && (
              <span class="slot-n" aria-hidden="true">
                {n < 9 ? n + 1 : 0}
              </span>
            )}{' '}
            {c.label} <span class="slot-count">({inside.length})</span>
            {mark}
          </button>
        ) : (
          <p id={`place-${c.id}`} class="place-name">
            {c.label}
            {mark}
          </p>
        )}
        {c.detail !== undefined && <p class="muted place-detail">{c.detail}</p>}
        {children.length === 0 ? inside.map((id) => piece(id, c.id)) : children.map(box)}
      </section>
    );
  };
  const tops = spec.containers.filter((c) => c.parent === undefined && c.kind !== 'bench');
  const bench = spec.containers.find((c) => c.kind === 'bench');
  const tray = state.pieces.filter((id) => state.placed[id] === undefined);
  return (
    <>
      <fieldset class="place-tray" data-lab-region>
        <legend class="visually-hidden">{PIECES_LEGEND}</legend>
        {tray.length === 0 ? <p class="muted">{PIECES_EMPTY}</p> : tray.map((id) => piece(id, null))}
      </fieldset>
      <div class="place-map" data-lab-region>
        {tops.map(box)}
        {bench !== undefined && box(bench)}
      </div>
      {spec.failures.length > 0 && (
        <fieldset class="place-failures">
          <legend>{FAILURE_LEGEND}</legend>
          {spec.failures.map((id) => (
            <button
              key={id}
              type="button"
              class="button button-quiet lab-button"
              aria-pressed={state.failed === id}
              onClick={() => onAction(state.failed === id ? { t: 'restore' } : { t: 'fail', container: id })}
            >
              {failureButton(spec.containers.find((c) => c.id === id)?.label ?? '')}
            </button>
          ))}
        </fieldset>
      )}
    </>
  );
}
```

In `src/app/screens/Lab.tsx` (Phase 4 Tasks 7, 12 and 13), make these edits.

Add the Place imports beside the other lab imports:

```tsx
import type { PlaceAction, PlaceSpec } from '../../../schemas/lab-place.ts';
import { type PlaceState, placeSlots } from '../../labs/place/model.ts';
import { PlaceView } from '../../labs/place/View.tsx';
```

and add `backLine` and `downLine` to the import from `'../lab.ts'`, so it begins:

```tsx
import {
  backLine,
  CREDITS_NOTE,
  checkLabel,
  downLine,
  goalWord,
```

Replace the Sort-only pick-up code:

```tsx
  const sort = lab.engine === 'sort' ? (lab.spec as SortSpec) : null;

  const place = (card: string, bucket: string): void => {
    if (sort === null) return;
    dispatch({ t: 'place', card, bucket } satisfies SortAction);
    setHeld(null);
    const text = sort.cards.find((c) => c.id === card)?.text ?? '';
    const label = sort.buckets.find((b) => b.id === bucket)?.label ?? '';
    setAnnounce(placedLine(text, label));
  };
  const onSortAction = (action: SortAction): void => {
    if (action.t === 'place') place(action.card, action.bucket);
    else dispatch(action);
  };
```

with:

```tsx
  const hold = useMemo(() => holdBoard(lab), [lab]);

  const place = (item: string, target: string): void => {
    if (hold === null) return;
    dispatch(hold.place(item, target));
    setHeld(null);
    setAnnounce(placedLine(hold.itemLabel(item), hold.targetLabel(target)));
  };
  const onSortAction = (action: SortAction): void => {
    if (action.t === 'place') place(action.card, action.bucket);
    else dispatch(action);
  };
  // A failure preview changes no check, so it is announced at once: which container went down or came back.
  const onPlaceAction = (action: PlaceAction): void => {
    if (action.t === 'place') {
      place(action.piece, action.slot);
      return;
    }
    const spec = lab.spec as PlaceSpec;
    const labelOf = (id: string | null): string => spec.containers.find((c) => c.id === id)?.label ?? '';
    const was = (replayLab(engine, lab.spec, live.current.draft.actions) as PlaceState).failed;
    dispatch(action);
    if (action.t === 'fail') setAnnounce(downLine(labelOf(action.container)));
    if (action.t === 'restore') setAnnounce(backLine(labelOf(was)));
  };
  const onBoardAction = (action: unknown): void => {
    if (lab.engine === 'sort') onSortAction(action as SortAction);
    else if (lab.engine === 'place') onPlaceAction(action as PlaceAction);
    else dispatch(action);
  };
```

In `run(command)`, replace the `place` and `unplace` cases:

```tsx
      case 'place': {
        const bucket = sort?.buckets[command.bucket - 1];
        const card = live.current.held;
        if (card === null || bucket === undefined) break;
        place(card, bucket.id);
        // Sorting goes on from the tray's first card, or from the bucket once the tray is empty.
        requestAnimationFrame(() => {
          const next =
            board.current?.querySelector<HTMLElement>('.sort-tray [data-lab-item]') ??
            document.getElementById(`bucket-${bucket.id}`);
          next?.focus();
        });
        break;
      }
      case 'unplace': {
        const card = live.current.held;
        if (card === null || sort === null) break;
        dispatch({ t: 'unplace', card } satisfies SortAction);
        setHeld(null);
        setAnnounce(returnedLine(sort.cards.find((c) => c.id === card)?.text ?? ''));
        requestAnimationFrame(() =>
          board.current?.querySelector<HTMLElement>(`.sort-tray [data-card="${card}"]`)?.focus(),
        );
        break;
      }
```

with:

```tsx
      case 'place': {
        const target = hold?.targets[command.bucket - 1];
        const item = live.current.held;
        if (hold === null || item === null || target === undefined) break;
        place(item, target);
        // Placing goes on from the tray's first item, or from the target once the tray is empty.
        requestAnimationFrame(() => {
          const next =
            board.current?.querySelector<HTMLElement>(hold.trayItem()) ??
            document.getElementById(hold.targetId(target));
          next?.focus();
        });
        break;
      }
      case 'unplace': {
        const item = live.current.held;
        if (item === null || hold === null) break;
        dispatch(hold.unplace(item));
        setHeld(null);
        setAnnounce(returnedLine(hold.itemLabel(item)));
        requestAnimationFrame(() => board.current?.querySelector<HTMLElement>(hold.trayItem(item))?.focus());
        break;
      }
```

Replace the key shape:

```tsx
  const shape = { engine: lab.engine, buckets: sort?.buckets.length ?? 0 };
```

with:

```tsx
  const shape = { engine: lab.engine, buckets: Math.min(10, hold?.targets.length ?? 0) };
```

In the keydown handler, replace the `onControl` comment and test:

```tsx
          // A button, link or summary keeps Enter for its own action; a card, a bucket target, a select or a
          // checkbox does not, so Enter checks from them.
          onControl:
            element !== null &&
            element.closest('a, button, summary') !== null &&
            element.closest('.card, .bucket-target') === null,
```

with:

```tsx
          // A button, link or summary keeps Enter for its own action; a card, a piece, a bucket or slot target, a
          // select or a checkbox does not, so Enter checks from them.
          onControl:
            element !== null &&
            element.closest('a, button, summary') !== null &&
            element.closest('.card, .bucket-target, .piece, .slot-target') === null,
```

In the render, replace the board element:

```tsx
          <Board
            lab={lab}
            state={state}
            held={held}
            onHold={setHeld}
            onAction={lab.engine === 'sort' ? onSortAction : dispatch}
          />
```

with:

```tsx
          <Board lab={lab} state={state} held={held} onHold={setHeld} onAction={onBoardAction} />
```

In `Board`, add the Place case after `case 'simulate'`, and add `HoldBoard` and `holdBoard` right after `Board`, so the end of `Board` and the new code read:

```tsx
    case 'simulate':
      return (
        <SimulateView spec={lab.spec as SimulateSpec} state={state as SimulateState} onAction={onAction} />
      );
    case 'place':
      return (
        <PlaceView
          spec={lab.spec as PlaceSpec}
          state={state as PlaceState}
          held={held}
          onHold={onHold}
          onAction={onAction}
        />
      );
  }
}

/** A board where a held item goes into a target (Sort's cards and buckets, Place's pieces and slots). */
interface HoldBoard {
  /** The target ids in the order the digit keys number them. */
  readonly targets: readonly string[];
  itemLabel(item: string): string;
  targetLabel(target: string): string;
  place(item: string, target: string): unknown;
  unplace(item: string): unknown;
  /** The selector of an item in the tray, or of the tray's first item. */
  trayItem(item?: string): string;
  /** The element id of a target's button. */
  targetId(target: string): string;
}

/** The pick-up-and-place shape of a Sort or Place lab, or null for an engine without one. */
function holdBoard(lab: LabView): HoldBoard | null {
  switch (lab.engine) {
    case 'sort': {
      const spec = lab.spec as SortSpec;
      return {
        targets: spec.buckets.map((b) => b.id),
        itemLabel: (card) => spec.cards.find((c) => c.id === card)?.text ?? '',
        targetLabel: (bucket) => spec.buckets.find((b) => b.id === bucket)?.label ?? '',
        place: (card, bucket) => ({ t: 'place', card, bucket }) satisfies SortAction,
        unplace: (card) => ({ t: 'unplace', card }) satisfies SortAction,
        trayItem: (card) =>
          card === undefined ? '.sort-tray [data-lab-item]' : `.sort-tray [data-card="${card}"]`,
        targetId: (bucket) => `bucket-${bucket}`,
      };
    }
    case 'place': {
      const spec = lab.spec as PlaceSpec;
      return {
        targets: placeSlots(spec),
        itemLabel: (piece) => spec.pieces.find((p) => p.id === piece)?.label ?? '',
        targetLabel: (slot) => spec.containers.find((c) => c.id === slot)?.label ?? '',
        place: (piece, slot) => ({ t: 'place', piece, slot }) satisfies PlaceAction,
        unplace: (piece) => ({ t: 'unplace', piece }) satisfies PlaceAction,
        trayItem: (piece) =>
          piece === undefined ? '.place-tray [data-lab-item]' : `.place-tray [data-piece="${piece}"]`,
        targetId: (slot) => `place-${slot}`,
      };
    }
    default:
      return null;
  }
}
```

`SortSpec` and `SortAction` stay imported, since `Board` and `holdBoard` use them.

In `src/ui/base.css`, under the `/* Labs: Place */` anchor Task 4 inserted (and above `/* Labs: Trace */`), add:

```css
.place-tray {
  display: grid;
  gap: 8px;
  min-height: 44px;
  margin: 0;
  padding: 12px;
  background: var(--surface);
  border: 1px dashed var(--line);
  border-radius: 8px;
}

.piece {
  display: block;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  font: inherit;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.piece:hover,
.piece[aria-pressed="true"] {
  border-color: var(--active);
}

.piece[aria-pressed="true"] {
  box-shadow: inset 3px 0 0 var(--active);
}

.piece-detail {
  display: block;
  font-size: 0.875rem;
  color: var(--muted);
}

.place-map {
  display: grid;
  gap: 12px;
}

.place-box {
  display: grid;
  gap: 8px;
  align-content: start;
  min-width: 0;
  padding: 12px;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.place-box .place-box {
  background: var(--surface);
}

.place-box .place-box .place-box {
  background: var(--pane);
}

.place-box[data-kind="bench"] {
  border-style: dashed;
}

.place-box.is-down {
  border: 2px dashed var(--bad);
}

.place-name {
  margin: 0;
  font-weight: 600;
}

.place-detail {
  margin: 0;
  font-size: 0.875rem;
}

.slot-target {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 12px;
  font: inherit;
  font-weight: 600;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
}

.slot-target:hover {
  border-color: var(--active);
}

.slot-n {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  font-size: 0.875rem;
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 4px;
}

.slot-count {
  font-weight: 400;
  color: var(--muted);
}

.down-mark {
  font-weight: 600;
  color: var(--bad);
}

.place-failures {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.place-failures legend {
  padding: 0 4px;
  font-weight: 600;
}

.place-failures button[aria-pressed="true"] {
  border: 2px dashed var(--bad);
}
```

- [ ] **Step 6: Run the type check, the linter and the unit tests**

```bash
pnpm typecheck
pnpm lint:fix
pnpm lint
pnpm test tests/unit/lab.test.ts tests/unit/lab-keys.test.ts tests/unit/keys.test.ts tests/unit/lab-place.test.ts
```

Expected: `tsc --noEmit` prints nothing; Biome ends `No fixes applied.`; `Test Files  4 passed (4)` with no `FAIL` line.

- [ ] **Step 7: Write the Place end-to-end tests**

In `tests/e2e/lab-helpers.ts` (Phase 4 Tasks 9, 12 and 13), add `import { bakeryPlaceLab } from '../fixtures/lab-place.ts';` above the import of `../fixtures/lab-specs.ts`, and append:

```ts

export const SYNTHETIC_PLACE_LAB_ID = 'lab-m01-bakery-ovens';

/** The bakery Place lab of `tests/fixtures/lab-place.ts` as the build ships it, with `questions` as its debrief. */
export function syntheticPlaceLab(questions: QuestionView[]): LabView {
  const lab = bakeryPlaceLab();
  return {
    id: SYNTHETIC_PLACE_LAB_ID,
    module: 1,
    engine: 'place',
    tier: 'core',
    rev: 1,
    title: lab.title,
    minutes: lab.minutes,
    concepts: lab.concepts,
    brief: lab.brief,
    spec: lab.spec,
    goals: lab.goals,
    notes: notesOf(questions),
    debrief: { lines: lab.debrief.lines, questions: questions.slice(0, 2) },
    credits: false,
  };
}
```

In `tests/e2e/labs.spec.ts` (Phase 4 Tasks 9, 12 and 13), add `import { PLACE_SOLUTION } from '../fixtures/lab-place.ts';` above the import of `../fixtures/ready-module.ts`, add `SYNTHETIC_PLACE_LAB_ID` and `syntheticPlaceLab` to the import from `./lab-helpers.ts` (after `SYNTHETIC_CONFIGURE_LAB_ID` and after `syntheticConfigureLab`), and append at the end of the file:

```ts

const PLACE_URL = `/#/m/01/lab/${SYNTHETIC_PLACE_LAB_ID}`;
const PLACE_TITLE = 'Keep the ovens baking';
/** The fixture's solution as (piece, slot) pairs, in the order a tap run places them. */
const PLACE_TAPS = PLACE_SOLUTION.flatMap((a) => (a.t === 'place' ? [[a.piece, a.slot] as const] : []));
const piece = (page: Page, id: string): Locator => page.locator(`[data-piece="${id}"]`);
const slot = (page: Page, id: string): Locator => page.locator(`[data-slot="${id}"]`);
const pieceIn = (page: Page, slotId: string, pieceId: string): Locator =>
  page.locator(`section:has(> [data-slot="${slotId}"]) > [data-piece="${pieceId}"]`);
const failure = (page: Page, label: string): Locator => page.getByRole('button', { name: `${label} fails` });
const trayStop = (page: Page): Locator => page.locator('.place-tray [data-lab-item][tabindex="0"]');

const usePlaceLab = async (page: Page): Promise<void> => {
  await useLabAt(page, syntheticPlaceLab, PLACE_URL);
  await expect(h1(page, PLACE_TITLE)).toBeVisible();
};

/** Tabs into the Place tray with `key`, steps to a piece with the arrow keys and picks it up with Space. */
async function holdByKeys(page: Page, id: string, key: string): Promise<void> {
  await tabTo(page, trayStop(page), key);
  for (let i = 0; i < 16; i++) {
    if (await piece(page, id).evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('ArrowDown');
  }
  await expect(piece(page, id)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(piece(page, id)).toHaveAttribute('aria-pressed', 'true');
}

/** Places a piece by keys: pick it up in the tray, then press the slot's digit. */
async function placeByKeys(page: Page, id: string, digit: string, key: string): Promise<void> {
  await holdByKeys(page, id, key);
  await page.keyboard.press(digit);
  await expect(piece(page, id)).toHaveAttribute('aria-pressed', 'false');
  // The screen moves focus to the tray's first piece (or to the slot once the tray is empty) on the next frame, so
  // wait for it before the next key, or that key lands on the page and the late focus undoes it.
  await expect(page.locator('.place-tray [data-lab-item]:focus, .slot-target:focus')).toHaveCount(1);
}

test('a Place lab works by keyboard alone, previews a failure and records its completion', async ({
  page,
  browserName,
}) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  const back = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  await usePlaceLab(page);

  // Space picks a piece up in the tray, a digit places it, and focus goes back to the tray's first piece.
  await holdByKeys(page, 'front-one', tab);
  await page.keyboard.press('2');
  await expect(said(page, 'Placed First shop front in Public subnet A.')).toBeAttached();
  await expect(pieceIn(page, 'public-a', 'front-one')).toBeVisible();
  await expect(piece(page, 'front-two')).toBeFocused();

  // In the map, the arrow keys reach a placed piece; Space picks it up and Backspace sends it back to the tray.
  await page.keyboard.press(tab);
  await expect(slot(page, 'bakery-edge')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(piece(page, 'front-one')).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Backspace');
  await expect(said(page, 'First shop front is back in the tray.')).toBeAttached();
  await expect(piece(page, 'front-one')).toBeFocused();

  // Escape puts a held piece down without leaving the lab.
  await page.keyboard.press('Space');
  await expect(piece(page, 'front-one')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(piece(page, 'front-one')).toHaveAttribute('aria-pressed', 'false');
  await expect(h1(page, PLACE_TITLE)).toBeVisible();

  // With a piece held, Space on a focused slot places it there.
  await page.keyboard.press('Space');
  await page.keyboard.press(tab);
  await page.keyboard.press('ArrowDown');
  await expect(slot(page, 'public-a')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(said(page, 'Placed First shop front in Public subnet A.')).toBeAttached();
  await expect(pieceIn(page, 'public-a', 'front-one')).toBeVisible();

  // A failure button previews the failure in words, and a second press brings the zone back.
  await tabTo(page, failure(page, 'Oven Row A'), tab);
  await page.keyboard.press('Enter');
  await expect(said(page, 'Oven Row A is down.')).toBeAttached();
  await expect(failure(page, 'Oven Row A')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.place-box.is-down')).toContainText('Oven Row A Down');
  await expect(piece(page, 'front-one')).toContainText('Down');
  await page.keyboard.press('Enter');
  await expect(said(page, 'Oven Row A is back.')).toBeAttached();
  await expect(page.locator('.place-box.is-down')).toHaveCount(0);

  // The scripted partial board meets one goal; Enter on a slot checks it.
  await placeByKeys(page, 'front-two', '4', back);
  await placeByKeys(page, 'gateway', '1', tab);
  await placeByKeys(page, 'route-a', '2', tab);
  await placeByKeys(page, 'route-b', '4', tab);
  await page.keyboard.press(tab);
  await expect(page.locator('.slot-target:focus')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(said(page, '1 of 3 goals met.')).toBeAttached();

  // The draft survives a reload.
  await expect.poll(() => storedDraftActions(page, SYNTHETIC_PLACE_LAB_ID)).toBeGreaterThan(0);
  const stored = await storedDraftActions(page, SYNTHETIC_PLACE_LAB_ID);
  await page.reload();
  await expect(h1(page, PLACE_TITLE)).toBeVisible();
  expect(await storedDraftActions(page, SYNTHETIC_PLACE_LAB_ID)).toBe(stored);
  await expect(pieceIn(page, 'public-b', 'route-b')).toBeVisible();

  await placeByKeys(page, 'recipes-one', '3', tab);
  await placeByKeys(page, 'recipes-two', '5', tab);
  await placeByKeys(page, 'mixer', '6', tab);
  // With the tray empty, focus stays on the slot that took the last piece, where Enter checks.
  await expect(page.getByText('Every piece is placed.')).toBeVisible();
  await expect(slot(page, 'not-used')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(said(page, 'All 3 goals met. Plus 40 XP.')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
  await answerDebriefByKeys(page, SYNTHETIC_PLACE_LAB_ID);
  await expect(page.getByRole('link', { name: 'Back to Module 1' })).toBeVisible();
  await expect.poll(() => labDoneCount(page, SYNTHETIC_PLACE_LAB_ID)).toBe(1);
});

test('a Place lab has no axe violations and no sideways scroll', async ({ page }) => {
  await usePlaceLab(page);
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await piece(page, 'gateway').click();
  await expect(piece(page, 'gateway')).toHaveAttribute('aria-pressed', 'true');
  await failure(page, 'Oven Row A').click();
  await expect(said(page, 'Oven Row A is down.')).toBeAttached();
  // An opened hint adds the Place engine's sentence about the board now, and the held piece stays held.
  await page.getByRole('button', { name: 'Hint' }).first().click();
  await expect(page.locator('.lab-goals .hint')).toContainText('First shop front is still in the tray.');
  await expect(piece(page, 'gateway')).toHaveAttribute('aria-pressed', 'true');
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  for (const [id, target] of PLACE_TAPS) {
    if (id !== 'gateway') await piece(page, id).click();
    await slot(page, target).click();
    await expect(pieceIn(page, target, id)).toBeVisible();
  }
  await expect(piece(page, 'front-one')).toContainText('Down');
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);

  await checkButton(page).click();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
  await expect(page.locator('section.runner')).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test('a Place lab works by taps on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the tap run is checked on the phone project only');
  await usePlaceLab(page);
  await piece(page, 'front-one').tap();
  await slot(page, 'public-a').tap();
  await expect(said(page, 'Placed First shop front in Public subnet A.')).toBeAttached();
  await failure(page, 'Oven Row A').tap();
  await expect(said(page, 'Oven Row A is down.')).toBeAttached();
  await expect(piece(page, 'front-one')).toContainText('Down');
  for (const [id, target] of PLACE_TAPS.filter(([id]) => id !== 'front-one')) {
    await piece(page, id).tap();
    await slot(page, target).tap();
    await expect(pieceIn(page, target, id)).toBeVisible();
  }
  await checkButton(page).tap();
  await expect(said(page, 'All 3 goals met. Plus 40 XP.')).toBeAttached();
});

test('Place pieces, slots and failure buttons are at least 44 px tall on a phone', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await usePlaceLab(page);
  const targets = await page.locator('.place-tray .piece, .slot-target, .place-failures button').all();
  expect(targets.length).toBe(16);
  for (const target of targets) {
    expect((await target.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const board = await page.locator('.lab-board').boundingBox();
  const goals = await page.locator('.lab-goals').boundingBox();
  if (!board || !goals) throw new Error('the board or the goals have no box');
  expect(goals.y).toBeGreaterThanOrEqual(board.y + board.height);
  await expectNoSidewaysScroll(page);
});
```

The tests call the file's module-private `tabTo`, `said`, `checkButton`, `useLabAt` and `answerDebriefByKeys` directly.
`answerDebriefByKeys` reads the Sort lab's debrief through `labFor`, but `useLabAt` serves the index through the Place lab's route, whose `route.fetch()` bypasses the Sort route, so the Sort lab is not in that index (`Error: lab lab-m01-bakery-sort is not in the index`); give it the lab id as a parameter that defaults to the Sort lab, so the Phase 4 calls stay as they are.
Replace its head:

```ts
/** Answers the debrief by the Runner keys: digits (and letters in a match), Enter to check, Enter for Next. */
async function answerDebriefByKeys(page: Page): Promise<void> {
  const lab = await labFor(page, SYNTHETIC_SORT_LAB_ID);
```

with:

```ts
/**
 * Answers the debrief of the lab `id` by the Runner keys: digits (and letters in a match), Enter to check, Enter for
 * Next.
 */
async function answerDebriefByKeys(page: Page, id = SYNTHETIC_SORT_LAB_ID): Promise<void> {
  const lab = await labFor(page, id);
```

- [ ] **Step 8: Build and run the end-to-end tests under the e2e lock**

```bash
lsof -iTCP:4317 -sTCP:LISTEN
if mkdir <scratchpad>/e2e.lock; then pnpm build && pnpm e2e tests/e2e/labs.spec.ts; rc=$?; rmdir <scratchpad>/e2e.lock; echo "e2e exit $rc"; else echo "e2e lock held"; fi
```

Expected: `lsof` prints nothing and the `if` line takes the lock, frees it after the run, also when the run fails, and ends with `e2e exit 0` (when it prints `e2e lock held`, another run holds the lock and nothing ran, so this step never removes another run's lock: wait with a background until-loop or the Monitor tool and retry, never a foreground sleep); the build ends with its `budgets:` line, whose initial JS is the same as before this task (49.2 KB of 50.0 KB on the prototype, which ran on Phase 4 Task 13 with Task 4's registration), and whose `Lab` chunk grows to about 10.5 KB of 120.0 KB; Playwright lists every Phase 4 lab test and the 4 new Place tests as passed or skipped by project (the tap and 44 px tests run on `webkit-mobile` only), with no failure (on the prototype, with Phase 4 Tasks 9, 12 and 13: `7 skipped` and `23 passed`).
Report the measured initial JS size, its headroom and the `Lab` chunk size.

- [ ] **Step 9: Commit**

```bash
pnpm lint:fix
git add src/labs/place/View.tsx src/app/lab.ts src/app/lab-keys.ts src/app/shortcuts.ts src/app/screens/Lab.tsx src/ui/base.css tests/unit/lab.test.ts tests/unit/lab-keys.test.ts tests/unit/keys.test.ts tests/e2e/lab-helpers.ts tests/e2e/labs.spec.ts
git commit -m "Add the Place lab view" -m "Pick up a piece and place it in a slot by tap or by keys, and preview a failure; keyboard and axe tested."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.
If Phase 6 has captured visual baselines by then, update only the Help sheet snapshot (the two reworded rows) through its helper and name it in the report.

---

## Task 7: The Trace view and its end-to-end tests

**Files:**
- Create: `src/labs/trace/View.tsx`
- Modify: `src/app/lab.ts`, `src/app/screens/Lab.tsx`, `src/ui/base.css` (under `/* Labs: Trace */` only), `tests/e2e/lab-helpers.ts`, `tests/e2e/labs.spec.ts`
- Test: `tests/unit/lab.test.ts`, `tests/e2e/labs.spec.ts`

Design notes:
- Follows Phase 5 Tasks 2, 4 and 6: Task 4 has put `trace` in `LAB_ENGINES`, `LAB_SCHEMAS.trace`, `ENGINES.trace` (settles nothing, always complete), `ENGINE_LABEL.trace` (`Trace`) and the empty `/* Labs: Trace */` anchor on `master`, and Task 6 is the first of Tasks 6, 7 and 8 on the shared lab files, so this task rebases on Task 6 and Task 8 rebases on it.
- It builds on Phase 4 Task 7 (`src/app/lab.ts`, `LabBody`, `dispatch`, the `announce` live region), Task 9 (`useSyntheticLab`, `labFor`, `labDoneCount`, `storedDraftActions` and the module-private `tabTo`, `said`, `goal`, `checkButton` and `answerDebriefByKeys` of `tests/e2e/labs.spec.ts`), Task 12 (`checkLabel`, the `Board` switch and the module-private `notesOf`) and Task 13 (`case 'simulate'`, and the module-private `useLabAt(page, lab, url)` of `tests/e2e/labs.spec.ts`, which the Task 13 merge ddcfce5 put on `master` though the Phase 4 plan text does not name it), and on Task 6 of this phase (`onBoardAction` and `case 'place'` in `Lab.tsx`).
- Network kind: one fieldset for the security group and one for the network ACL (its rules sorted by direction, then number), each rule a native checkbox reading its rule as a sentence; policy kind: one fieldset per policy, legend `<policy label>, attached to <principal, group or node label>`, one checkbox per statement.
- Below the rules, a `Test cases` heading and one `<details>` per case: its summary reads the case label and `Result: <word>. Expected: <word>.` live, and opening it steps the case through its hops, one line each (`Network ACL, outbound (reply): Denied by the final * rule`); goals still read `Not checked` until Check.
- Results and hops always carry a word, and a case off its expected result also gets a dashed border, never colour alone; no rule, case, policy or node id is rendered.
- Native checkboxes and `details` keep the tab order and WCAG 2.5.7, so the view adds no `data-lab-region` and no keys: `Space` toggles a focused checkbox, `Enter` on a focused summary opens it (a summary counts as a control for `labKey`), and `Enter` on a checkbox checks, as on Configure's checkboxes.
- A toggle is announced by the rule's text: `Inbound TCP 443 from 0.0.0.0/0 is on.`; `traceRuleText` finds that text for any rule or statement id.
- The cases heading is an `h2`, a deviation from the brief's `h3`: the lab screen has no `h2` above the board (its `Goals` and `Debrief` headings are `h2`), so an `h3` would skip a heading level.
- `checkLabel('trace')` stays `Check` (Phase 4 Task 12's rule), pinned here once more.
- The view rides in the lazy `Lab` chunk; in the prototype on `master` plus Phase 4 Task 13, with Trace as the only Phase 5 engine registered, the `Lab` chunk grew from 10.0 KB to 11.0 KB and the initial JS stayed at 49.2 KB of 50.0 KB, so expect about 1 KB more on top of what Tasks 4 and 6 leave.
- The keyboard test runs in both projects and tabs with `Alt+Tab` in WebKit, as Phase 4 Task 9's Sort test does, since WebKit reaches checkboxes and summaries by Tab only with Option held.
- The keyboard test reloads the page after its first check: the draft holds the two switched rules (`storedDraftActions` is 2) and the board comes back with both on, so Trace actions replay from `labDrafts` like every other engine's (P5-083).
- The keyboard test answers the debrief with `answerDebriefByKeys(page, SYNTHETIC_TRACE_LAB_ID)`, the lab-id form Task 6 gives that helper: once `useLabAt` serves another synthetic lab, the Sort lab is no longer in the index, so the brief's bare `answerDebriefByKeys(page)` would fail with `lab lab-m01-bakery-sort is not in the index`.
- The axe test scans from the top of the page (`scanFromTop`): opening a case scrolls it into view, and axe then counts a checkbox under the sticky top bar as an 18 px target with no room around it (`target-size`), which the prototype reproduced in both projects; at the top of the page every checkbox sits in its 44 px `.option` row.
- Covers P5-007, P5-012, P5-029, P5-037, P5-062, P5-065, P5-068 (Trace), P5-069 to P5-073, P5-076, P5-078, P5-079, P5-083, P5-089 (Trace), P5-090 (Trace).

- [ ] **Step 1: Write the failing copy tests**

In `tests/unit/lab.test.ts`, add these imports (merging into the existing import from `../../src/app/lab.ts` and keeping Biome's sorted order):

```ts
import {
  type NetworkTraceSpec,
  type PolicyTraceSpec,
  type TraceAction,
  TraceSpec,
} from '../../schemas/lab-trace.ts';
import {
  CASES_HEADING,
  caseLine,
  checkLabel,
  HOP_WORD,
  hopLine,
  naclRuleText,
  policyLegend,
  RESULT_WORD,
  ruleOffLine,
  ruleOnLine,
  sgRuleText,
  statementText,
  traceRuleText,
} from '../../src/app/lab.ts';
import { replayLab } from '../../src/labs/contract.ts';
import { TRACE, traceCase } from '../../src/labs/trace/model.ts';
import { TRACE_NETWORK_SPEC, TRACE_POLICY_SPEC } from '../fixtures/lab-trace.ts';
```

Then append:

```ts
describe('Trace copy', () => {
  const net = TraceSpec.parse(TRACE_NETWORK_SPEC) as NetworkTraceSpec;
  const pol = TraceSpec.parse(TRACE_POLICY_SPEC) as PolicyTraceSpec;
  const lines = (spec: TraceSpec, actions: readonly unknown[], caseId: string): string[] =>
    traceCase(spec, replayLab(TRACE, spec, actions as TraceAction[]), caseId)?.hops.map((h) =>
      hopLine(spec, h),
    ) ?? [];

  it('names hop verdicts and case results in words, never colour alone', () => {
    expect(HOP_WORD).toEqual({
      allow: 'Allowed',
      deny: 'Denied',
      nomatch: 'No match',
      stateful: 'Allowed as a reply',
      skipped: 'Not reached',
    });
    expect(RESULT_WORD).toEqual({ allow: 'Allowed', deny: 'Denied' });
    expect(CASES_HEADING).toBe('Test cases');
    expect(caseLine('deny', 'allow')).toBe('Result: Denied. Expected: Allowed.');
    expect(caseLine('allow', 'allow')).toBe('Result: Allowed. Expected: Allowed.');
    expect(checkLabel('trace')).toBe('Check');
  });

  it('reads security group and network ACL rules as plain sentences', () => {
    expect(
      sgRuleText({ id: 'a', dir: 'in', proto: 'tcp', from: 443, to: 443, cidr: '0.0.0.0/0', on: true }),
    ).toBe('Inbound TCP 443 from 0.0.0.0/0');
    expect(
      sgRuleText({ id: 'b', dir: 'out', proto: 'all', from: 0, to: 65535, cidr: '10.20.0.0/16', on: true }),
    ).toBe('Outbound all traffic to 10.20.0.0/16');
    expect(
      sgRuleText({
        id: 'c',
        dir: 'in',
        proto: 'udp',
        from: 1024,
        to: 65535,
        cidr: '198.51.100.0/24',
        on: false,
      }),
    ).toBe('Inbound UDP 1024-65535 from 198.51.100.0/24');
    expect(
      naclRuleText({
        id: 'd',
        n: 100,
        dir: 'in',
        proto: 'tcp',
        from: 443,
        to: 443,
        cidr: '0.0.0.0/0',
        action: 'allow',
        on: true,
      }),
    ).toBe('Rule 100: allow inbound TCP 443 from 0.0.0.0/0');
    expect(
      naclRuleText({
        id: 'e',
        n: 90,
        dir: 'in',
        proto: 'all',
        from: 0,
        to: 65535,
        cidr: '198.51.100.0/24',
        action: 'deny',
        on: true,
      }),
    ).toBe('Rule 90: deny inbound all traffic from 198.51.100.0/24');
  });

  it('reads policy statements and where a policy is attached', () => {
    expect(
      statementText({
        id: 'a',
        effect: 'allow',
        actions: ['s3:GetObject'],
        resources: ['cafe-menu/*'],
        on: true,
      }),
    ).toBe('Allow s3:GetObject on cafe-menu/*');
    expect(
      statementText({ id: 'b', effect: 'deny', actions: ['s3:*', 'iam:*'], resources: ['*'], on: true }),
    ).toBe('Deny s3:*, iam:* on *');
    expect(pol.policies.map((p) => policyLegend(pol, p))).toEqual([
      'Full access, attached to Bakery group',
      'Full access, attached to Shops',
      'No oven deletes, attached to Shops',
      'Full access, attached to East shop',
      'Bakers policy, attached to Bakers',
      'Till policy, attached to Lu at the till',
    ]);
  });

  it('names each hop by its place, its word and the network ACL rule that decided it', () => {
    expect(lines(net, [], 'customer-order')).toEqual([
      'Network ACL, inbound: Allowed by rule 100',
      'Security group, inbound: No match',
      'Security group, outbound (reply): Not reached',
      'Network ACL, outbound (reply): Not reached',
    ]);
    expect(lines(net, [{ t: 'toggle', rule: 'sg-https-all', on: true }], 'customer-order')).toEqual([
      'Network ACL, inbound: Allowed by rule 100',
      'Security group, inbound: Allowed',
      'Security group, outbound (reply): Allowed as a reply',
      'Network ACL, outbound (reply): Denied by the final * rule',
    ]);
    expect(lines(net, [], 'blocked-order')[0]).toBe('Network ACL, inbound: Denied by rule 90');
    expect(lines(pol, [], 'mo-recipes')).toEqual([
      'SCP at Bakery group: Allowed',
      'SCP at Shops: Allowed',
      'SCP at East shop: Allowed',
      'IAM policies: No match',
    ]);
  });

  it('announces a switched rule by its text, never its id', () => {
    expect(traceRuleText(net, 'sg-https-all')).toBe('Inbound TCP 443 from 0.0.0.0/0');
    expect(traceRuleText(net, 'acl-replies-out')).toBe(
      'Rule 100: allow outbound TCP 1024-65535 to 0.0.0.0/0',
    );
    expect(traceRuleText(pol, 'read-recipes')).toBe('Allow recipes:Get* on recipes/*');
    expect(traceRuleText(net, 'read-recipes')).toBeNull();
    expect(ruleOnLine('Inbound TCP 443 from 0.0.0.0/0')).toBe('Inbound TCP 443 from 0.0.0.0/0 is on.');
    expect(ruleOffLine('Allow recipes:Get* on recipes/*')).toBe('Allow recipes:Get* on recipes/* is off.');
  });
});
```

- [ ] **Step 2: Run the copy tests and see them fail**

```bash
pnpm test tests/unit/lab.test.ts 2>&1 | grep -E "FAIL|Error|Tests " | head -8
```

Expected: the five `Trace copy` tests fail, the first with `AssertionError: expected undefined to deeply equal { allow: 'Allowed', …(4) }` and the others with `TypeError: ... is not a function` (`sgRuleText`, `statementText`, `hopLine`, `traceRuleText`), since `src/app/lab.ts` has no Trace copy yet; every earlier test in the file still passes.

- [ ] **Step 3: Add the Trace copy**

In `src/app/lab.ts`, add these type imports below the existing imports:

```ts
import type { NetworkTraceSpec, PolicyTraceSpec, TraceSpec } from '../../schemas/lab-trace.ts';
import type { TraceHop } from '../labs/trace/model.ts';
```

Then append to the end of the file:

```ts
/** A Trace hop's verdict in words, so colour is never the only signal (spec 7.6). */
export const HOP_WORD = {
  allow: 'Allowed',
  deny: 'Denied',
  nomatch: 'No match',
  stateful: 'Allowed as a reply',
  skipped: 'Not reached',
} as const;
export const RESULT_WORD = { allow: 'Allowed', deny: 'Denied' } as const;
export const CASES_HEADING = 'Test cases';

/** A test case's live result beside the one it should give. */
export const caseLine = (result: 'allow' | 'deny', expect: 'allow' | 'deny'): string =>
  `Result: ${RESULT_WORD[result]}. Expected: ${RESULT_WORD[expect]}.`;

type SgRule = NetworkTraceSpec['sg']['rules'][number];
type NaclRule = NetworkTraceSpec['nacl']['rules'][number];
type Statement = PolicyTraceSpec['policies'][number]['statements'][number];
type Policy = PolicyTraceSpec['policies'][number];

/** `TCP 443`, `UDP 1024-65535` or `all traffic`. */
function traffic(rule: SgRule | NaclRule): string {
  if (rule.proto === 'all') return 'all traffic';
  const ports = rule.from === rule.to ? `${rule.from}` : `${rule.from}-${rule.to}`;
  return `${rule.proto.toUpperCase()} ${ports}`;
}

const peer = (rule: SgRule | NaclRule): string => `${rule.dir === 'in' ? 'from' : 'to'} ${rule.cidr}`;

/** `Inbound TCP 443 from 0.0.0.0/0`. */
export function sgRuleText(rule: SgRule): string {
  return `${rule.dir === 'in' ? 'Inbound' : 'Outbound'} ${traffic(rule)} ${peer(rule)}`;
}

/** `Rule 100: allow inbound TCP 443 from 0.0.0.0/0`. */
export function naclRuleText(rule: NaclRule): string {
  return `Rule ${rule.n}: ${rule.action} ${rule.dir === 'in' ? 'inbound' : 'outbound'} ${traffic(rule)} ${peer(rule)}`;
}

/** `Allow s3:GetObject on cafe-menu/*`. */
export function statementText(statement: Statement): string {
  const effect = statement.effect === 'allow' ? 'Allow' : 'Deny';
  return `${effect} ${statement.actions.join(', ')} on ${statement.resources.join(', ')}`;
}

/** A policy's legend: `Bakers policy, attached to Bakers`, naming its principal, group or org node by label. */
export function policyLegend(spec: PolicyTraceSpec, policy: Policy): string {
  const holders = policy.kind === 'scp' ? spec.org : [...spec.principals, ...spec.groups];
  const holder = holders.find((h) => h.id === policy.attach)?.label ?? 'nothing';
  return `${policy.label}, attached to ${holder}`;
}

const HOP_PLACE = {
  'nacl-in': 'Network ACL, inbound',
  'nacl-out': 'Network ACL, outbound',
  'sg-in': 'Security group, inbound',
  'sg-out': 'Security group, outbound',
} as const;

/** One hop of a stepped case: `Network ACL, outbound (reply): Denied by the final * rule`. */
export function hopLine(spec: TraceSpec, hop: TraceHop): string {
  let place: string;
  if (hop.at === 'scp') {
    const node = spec.kind === 'policy' ? spec.org.find((n) => n.id === hop.node) : undefined;
    place = `SCP at ${node?.label ?? 'the organization'}`;
  } else if (hop.at === 'iam') {
    place = 'IAM policies';
  } else {
    place = `${HOP_PLACE[hop.at]}${hop.reply ? ' (reply)' : ''}`;
  }
  let by = '';
  if (hop.by === '*') by = ' by the final * rule';
  else if (spec.kind === 'network' && (hop.at === 'nacl-in' || hop.at === 'nacl-out')) {
    const rule = spec.nacl.rules.find((r) => r.id === hop.by);
    if (rule !== undefined) by = ` by rule ${rule.n}`;
  }
  return `${place}: ${HOP_WORD[hop.verdict]}${by}`;
}

/** The text of the rule or statement a toggle names, or null when the spec has none by that id. */
export function traceRuleText(spec: TraceSpec, id: string): string | null {
  if (spec.kind === 'network') {
    const sg = spec.sg.rules.find((r) => r.id === id);
    if (sg !== undefined) return sgRuleText(sg);
    const nacl = spec.nacl.rules.find((r) => r.id === id);
    return nacl === undefined ? null : naclRuleText(nacl);
  }
  const statement = spec.policies.flatMap((p) => p.statements).find((s) => s.id === id);
  return statement === undefined ? null : statementText(statement);
}

/** Announced when a Trace rule is switched. */
export const ruleOnLine = (text: string): string => `${text} is on.`;
export const ruleOffLine = (text: string): string => `${text} is off.`;
```

- [ ] **Step 4: Run the copy tests and see them pass**

```bash
pnpm test tests/unit/lab.test.ts 2>&1 | grep -E "FAIL|Test Files|Tests "
```

Expected: `Test Files  1 passed (1)`, the five `Trace copy` tests among the passes.

- [ ] **Step 5: Add the Trace view**

Create `src/labs/trace/View.tsx`:

```tsx
import type { TraceAction, TraceSpec } from '../../../schemas/lab-trace.ts';
import {
  CASES_HEADING,
  caseLine,
  hopLine,
  naclRuleText,
  policyLegend,
  sgRuleText,
  statementText,
} from '../../app/lab.ts';
import { type TraceState, traceCase } from './model.ts';

/**
 * Fixed candidate rules as native checkboxes, then every test case with its live result; each case opens to step
 * through its hops (spec 5.1). Native controls keep the tab order, so Trace adds no keys of its own.
 */
export function TraceView(props: {
  spec: TraceSpec;
  state: TraceState;
  onAction(action: TraceAction): void;
}) {
  const { spec, state, onAction } = props;
  const rule = (id: string, text: string) => {
    const on = state.on[id] === true;
    return (
      <label key={id} class={`option trace-rule${on ? ' chosen' : ''}`}>
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => onAction({ t: 'toggle', rule: id, on: event.currentTarget.checked })}
        />
        <span class="option-text">{text}</span>
      </label>
    );
  };
  return (
    <div class="trace">
      {spec.kind === 'network' ? (
        <>
          <fieldset class="trace-rules">
            <legend>{spec.sg.label}</legend>
            {spec.sg.rules.map((r) => rule(r.id, sgRuleText(r)))}
          </fieldset>
          <fieldset class="trace-rules">
            <legend>{spec.nacl.label}</legend>
            {[...spec.nacl.rules]
              .sort((a, b) => (a.dir === b.dir ? a.n - b.n : a.dir === 'in' ? -1 : 1))
              .map((r) => rule(r.id, naclRuleText(r)))}
          </fieldset>
        </>
      ) : (
        spec.policies.map((p) => (
          <fieldset key={p.id} class="trace-rules">
            <legend>{policyLegend(spec, p)}</legend>
            {p.statements.map((s) => rule(s.id, statementText(s)))}
          </fieldset>
        ))
      )}
      <h2 class="trace-cases-title">{CASES_HEADING}</h2>
      <ol class="trace-cases">
        {spec.cases.map((c) => {
          const run = traceCase(spec, state, c.id);
          if (run === null) return null;
          return (
            <li key={c.id} class={run.result === c.expect ? 'trace-case' : 'trace-case is-off'}>
              <details>
                <summary>
                  <span class="trace-case-label">{c.label}</span>{' '}
                  <span class="trace-case-result">{caseLine(run.result, c.expect)}</span>
                </summary>
                <ol class="trace-hops">
                  {run.hops.map((hop) => (
                    <li key={`${hop.at}-${hop.node ?? ''}-${hop.reply}`}>{hopLine(spec, hop)}</li>
                  ))}
                </ol>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
```

- [ ] **Step 6: Plug the view into the lab screen**

In `src/app/screens/Lab.tsx`, add the imports (each beside its Phase 4 and Task 6 neighbours, in Biome's order):

```tsx
import type { TraceAction, TraceSpec } from '../../../schemas/lab-trace.ts';
import type { TraceState } from '../../labs/trace/model.ts';
import { TraceView } from '../../labs/trace/View.tsx';
```

and add `ruleOffLine`, `ruleOnLine` and `traceRuleText` to the existing import from `'../lab.ts'`.

In `LabBody`, right above Task 6's `onBoardAction`, add:

```tsx
  /** A switched Trace rule is announced by its text, never its id. */
  const onTraceAction = (action: TraceAction): void => {
    dispatch(action);
    if (action.t !== 'toggle') return;
    const text = traceRuleText(lab.spec as TraceSpec, action.rule);
    if (text !== null) setAnnounce(action.on ? ruleOnLine(text) : ruleOffLine(text));
  };
```

In Task 6's `onBoardAction`, add the Trace branch right before its final `else dispatch(action);`, so the function reads:

```tsx
  const onBoardAction = (action: unknown): void => {
    if (lab.engine === 'sort') onSortAction(action as SortAction);
    else if (lab.engine === 'place') onPlaceAction(action as PlaceAction);
    else if (lab.engine === 'trace') onTraceAction(action as TraceAction);
    else dispatch(action);
  };
```

In the module-level `Board` switch, add this case right after Task 6's `case 'place'`:

```tsx
    case 'trace':
      return <TraceView spec={lab.spec as TraceSpec} state={state as TraceState} onAction={onAction} />;
```

- [ ] **Step 7: Style the Trace board**

In `src/ui/base.css`, write these rules under the `/* Labs: Trace */` anchor Task 4 inserted (between `/* Labs: Place */` and `/* Labs: Investigate */`), and nowhere else:

```css
.trace {
  display: grid;
  gap: 16px;
}

.trace-rules {
  display: grid;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.trace-rules legend {
  margin-bottom: 4px;
  padding: 0;
  font-weight: 600;
}

.trace-rule .option-text {
  overflow-wrap: anywhere;
}

.trace-cases-title {
  margin: 8px 0 0;
}

.trace-cases {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.trace-case details {
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

/* A case off its expected result gets a dashed border beside its words, never colour alone. */
.trace-case.is-off details {
  border-style: dashed;
  border-color: var(--active);
}

.trace-case summary {
  min-height: 44px;
  padding: 10px 16px;
  cursor: pointer;
  overflow-wrap: anywhere;
}

.trace-case summary:focus-visible {
  outline: 2px solid var(--active);
  outline-offset: 2px;
}

.trace-case-label {
  font-weight: 600;
}

.trace-case-result {
  color: var(--muted);
}

.trace-hops {
  margin: 0;
  padding: 0 16px 12px 40px;
  overflow-wrap: anywhere;
}
```

- [ ] **Step 8: Run the unit tests, the type check, the linter and the build**

```bash
pnpm test tests/unit/lab.test.ts tests/unit/lab-trace.test.ts 2>&1 | grep -E "FAIL|Test Files"
pnpm typecheck
pnpm lint:fix
pnpm build 2>&1 | grep -E "^budgets|assets/Lab-"
```

Expected: `Test Files  2 passed (2)`; `tsc --noEmit` prints nothing more; Biome ends without an error; the `budgets:` line shows the initial JS unchanged by this task (the Trace view and copy ride in the lazy `Lab` chunk; the prototype, with Trace as the only Phase 5 engine registered, measured `initial JS 49.2 KB of 50.0 KB` and `assets/Lab-<hash>.js 11.0 KB`, up from 10.0 KB), and the report states the measured initial size, its headroom and the `Lab` chunk size.
If the `budgets:` line passes 50.0 KB, stop and report rather than raising the budget.

- [ ] **Step 9: Write the Trace end-to-end tests**

In `tests/e2e/lab-helpers.ts`, add `import { bakeryPolicyLab, bakeryTraceLab, type TraceLabFile } from '../fixtures/lab-trace.ts';` beside the fixture imports, and append:

```ts
export const SYNTHETIC_TRACE_LAB_ID = 'lab-m01-bakery-door';
export const SYNTHETIC_POLICY_LAB_ID = 'lab-m01-bakery-keys';

/** A Trace fixture lab as the build ships it, with `questions` as its debrief. */
function traceView(lab: TraceLabFile, questions: QuestionView[]): LabView {
  return {
    id: lab.id,
    module: 1,
    engine: 'trace',
    tier: 'core',
    rev: 1,
    title: lab.title,
    minutes: lab.minutes,
    concepts: lab.concepts,
    brief: lab.brief,
    spec: lab.spec,
    goals: lab.goals,
    notes: notesOf(questions),
    debrief: { lines: lab.debrief.lines, questions: questions.slice(0, 2) },
    credits: false,
  };
}

/** The bakery order window of `tests/fixtures/lab-trace.ts`: a security group and a network ACL. */
export function syntheticTraceLab(questions: QuestionView[]): LabView {
  return traceView(bakeryTraceLab(), questions);
}

/** The bakery keys of `tests/fixtures/lab-trace.ts`: identity policies and SCPs on an org. */
export function syntheticPolicyLab(questions: QuestionView[]): LabView {
  return traceView(bakeryPolicyLab(), questions);
}
```

In `tests/e2e/labs.spec.ts`, add `SYNTHETIC_POLICY_LAB_ID`, `SYNTHETIC_TRACE_LAB_ID`, `syntheticPolicyLab` and `syntheticTraceLab` to the import from `./lab-helpers.ts`, and append:

```ts
const TRACE_URL = `/#/m/01/lab/${SYNTHETIC_TRACE_LAB_ID}`;
const POLICY_URL = `/#/m/01/lab/${SYNTHETIC_POLICY_LAB_ID}`;
const HTTPS_IN = 'Inbound TCP 443 from 0.0.0.0/0';
const SSH_OFFICE = 'Inbound TCP 22 from 192.0.2.0/24';
const REPLIES_OUT = 'Rule 100: allow outbound TCP 1024-65535 to 0.0.0.0/0';
const CUSTOMER = 'A customer opens the order page';
const rule = (page: Page, text: string): Locator => page.getByRole('checkbox', { name: text, exact: true });
const caseSummary = (page: Page, label: string): Locator => page.locator('summary', { hasText: label });
const hopsOf = (page: Page, label: string): Locator =>
  page.locator('li.trace-case', { has: caseSummary(page, label) }).locator('.trace-hops li');

/**
 * Scans the lab from the top of the page: opening a case scrolls it into view, and axe counts a checkbox that sits
 * under the sticky top bar as a target with no room around it, which says where the page is scrolled, not how the
 * board is built.
 */
async function scanFromTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
}

test('a Trace lab works by keyboard alone and steps a case through its hops', async ({
  page,
  browserName,
}) => {
  // WebKit tabs to checkboxes and summaries only with Option held, as on a Mac without full keyboard access.
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  const back = browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab';
  await useLabAt(page, syntheticTraceLab, TRACE_URL);
  await expect(h1(page, 'Open the order window')).toBeVisible();
  await expect(page.getByText('Trace lab, about 6 minutes')).toBeVisible();
  await tabTo(page, rule(page, HTTPS_IN), tab);
  await page.keyboard.press('Space');
  await expect(rule(page, HTTPS_IN)).toBeChecked();
  await expect(said(page, `${HTTPS_IN} is on.`)).toBeAttached();
  await tabTo(page, caseSummary(page, CUSTOMER), tab);
  await expect(caseSummary(page, CUSTOMER)).toContainText('Result: Denied. Expected: Allowed.');
  await page.keyboard.press('Enter');
  await expect(hopsOf(page, CUSTOMER)).toHaveText([
    'Network ACL, inbound: Allowed by rule 100',
    'Security group, inbound: Allowed',
    'Security group, outbound (reply): Allowed as a reply',
    'Network ACL, outbound (reply): Denied by the final * rule',
  ]);
  await tabTo(page, rule(page, REPLIES_OUT), back);
  await page.keyboard.press('Space');
  await expect(said(page, `${REPLIES_OUT} is on.`)).toBeAttached();
  await expect(caseSummary(page, CUSTOMER)).toContainText('Result: Allowed. Expected: Allowed.');
  await expect(hopsOf(page, CUSTOMER).last()).toHaveText(
    'Network ACL, outbound (reply): Allowed by rule 100',
  );
  await page.keyboard.press('Enter');
  await expect(page.getByText('1 of 2 goals met.', { exact: true })).toBeAttached();
  await expect(goal(page, 'Only the office logs in')).toContainText('Not met');
  // The draft keeps both switched rules across a reload.
  await expect.poll(() => storedDraftActions(page, SYNTHETIC_TRACE_LAB_ID)).toBe(2);
  await page.reload();
  await expect(h1(page, 'Open the order window')).toBeVisible();
  await expect(rule(page, HTTPS_IN)).toBeChecked();
  await expect(rule(page, REPLIES_OUT)).toBeChecked();
  await tabTo(page, rule(page, SSH_OFFICE), tab);
  await page.keyboard.press('Space');
  await expect(rule(page, SSH_OFFICE)).toBeChecked();
  await page.keyboard.press('Enter');
  await expect(page.getByText('All 2 goals met. Plus 40 XP.', { exact: true })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
  await answerDebriefByKeys(page, SYNTHETIC_TRACE_LAB_ID);
  expect(await labDoneCount(page, SYNTHETIC_TRACE_LAB_ID)).toBe(1);
});

test('Trace labs of both kinds have no axe violations and no sideways scroll', async ({ page }) => {
  await useLabAt(page, syntheticTraceLab, TRACE_URL);
  await expect(h1(page, 'Open the order window')).toBeVisible();
  await caseSummary(page, CUSTOMER).click();
  await expect(hopsOf(page, CUSTOMER)).toHaveCount(4);
  await scanFromTop(page);
  await checkButton(page).click();
  await expect(page.getByText('0 of 2 goals met.', { exact: true })).toBeAttached();
  await scanFromTop(page);

  await useLabAt(page, syntheticPolicyLab, POLICY_URL);
  await expect(h1(page, 'Keys for the bakers')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Bakers policy, attached to Bakers' })).toBeVisible();
  await caseSummary(page, 'Mo reads the rye recipe').click();
  await expect(hopsOf(page, 'Mo reads the rye recipe')).toHaveText([
    'SCP at Bakery group: Allowed',
    'SCP at Shops: Allowed',
    'SCP at East shop: Allowed',
    'IAM policies: No match',
  ]);
  await scanFromTop(page);
  await checkButton(page).click();
  await expect(page.getByText('1 of 2 goals met.', { exact: true })).toBeAttached();
  await scanFromTop(page);
});

test('a Trace lab works by taps on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useLabAt(page, syntheticPolicyLab, POLICY_URL);
  await expect(h1(page, 'Keys for the bakers')).toBeVisible();
  const recipes = 'Allow recipes:Get* on recipes/*';
  await rule(page, recipes).tap();
  await expect(said(page, `${recipes} is on.`)).toBeAttached();
  await caseSummary(page, 'Mo starts a bake in the deck oven').tap();
  await expect(hopsOf(page, 'Mo starts a bake in the deck oven').last()).toHaveText('IAM policies: No match');
  await rule(page, 'Allow oven:StartBake, oven:StopBake on oven/*').tap();
  await expect(hopsOf(page, 'Mo starts a bake in the deck oven').last()).toHaveText('IAM policies: Allowed');
  await checkButton(page).tap();
  await expect(page.getByText('All 2 goals met. Plus 40 XP.', { exact: true })).toBeAttached();
  expect(await labDoneCount(page, SYNTHETIC_POLICY_LAB_ID)).toBe(1);
});

test('Trace checkboxes and case summaries are at least 44 px tall on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useLabAt(page, syntheticTraceLab, TRACE_URL);
  await expect(h1(page, 'Open the order window')).toBeVisible();
  const targets = [
    ...(await page.locator('label.trace-rule').all()),
    ...(await page.locator('.trace-case summary').all()),
  ];
  expect(targets).toHaveLength(16);
  for (const target of targets) expect((await target.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expectNoSidewaysScroll(page);
});
```

The keyboard test ends with the module-private `answerDebriefByKeys(page, id)` in the form Task 6 leaves it (`id` defaults to `SYNTHETIC_SORT_LAB_ID`), passing `SYNTHETIC_TRACE_LAB_ID`, so it reads the debrief of the lab the page serves.

- [ ] **Step 10: Run the end-to-end tests under the lock and see them pass**

```bash
lsof -iTCP:4317 -sTCP:LISTEN
if mkdir <scratchpad>/e2e.lock; then pnpm build && pnpm e2e tests/e2e/labs.spec.ts; rc=$?; rmdir <scratchpad>/e2e.lock; echo "e2e exit $rc"; else echo "e2e lock held"; fi
```

Run it only when `lsof` prints nothing; the `if` line takes the lock and frees it after the run, also when the run fails, and when it prints `e2e lock held`, another run holds the lock and nothing ran, so wait with a background until-loop or the Monitor tool and retry, never a foreground sleep, and never remove a lock this task did not take.
Expected: Playwright lists every earlier lab test plus the four new ones as passed or skipped by project, ending with no failure: the keyboard and axe tests pass in `chromium-desktop` and `webkit-mobile`, and the tap and 44 px tests pass in `webkit-mobile` and are skipped in `chromium-desktop` (the four Trace tests alone, `pnpm e2e tests/e2e/labs.spec.ts -g Trace`, give `6 passed` and `2 skipped`).
A port-in-use failure means retry under the lock, never a test result.

- [ ] **Step 11: Commit**

```bash
pnpm lint:fix
git add src/labs/trace/View.tsx src/app/lab.ts src/app/screens/Lab.tsx src/ui/base.css tests/unit/lab.test.ts tests/e2e/lab-helpers.ts tests/e2e/labs.spec.ts
git commit -m "Add the Trace lab view" -m "Switch rules on and off and step each test case through its hops; keyboard and axe tested."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds; the report names the measured initial JS size, its headroom and the `Lab` chunk size, and, if Phase 6 baselines of the lab screen exist already, the affected snapshots it updated through their helper.

---

## Task 8: The Investigate view and its end-to-end tests

**Files:**
- Create: `src/labs/investigate/View.tsx`
- Modify: `src/app/lab.ts`, `src/app/screens/Lab.tsx`, `src/ui/base.css` (under `/* Labs: Investigate */` only), `tests/e2e/lab-helpers.ts`, `tests/e2e/labs.spec.ts`
- Test: `tests/unit/lab.test.ts`, `tests/e2e/labs.spec.ts`

Builds on: Phase 5 Task 3 (the model and the fixture), Task 4 (`investigate` in `LAB_ENGINES`, `LAB_SCHEMAS` and `ENGINES`, `ENGINE_LABEL.investigate`, `LabMeta.engine: LabEngineId` and the empty `/* Labs: Investigate */` anchor), Task 6 (`onBoardAction` in `Lab.tsx` and the `id` parameter of `answerDebriefByKeys`) and Task 7 (`case 'trace'` and the Trace branch of `onBoardAction`, the last change to the shared lab files before this one); Phase 4 Task 7 (`src/app/lab.ts`, `Lab.tsx`, `tests/unit/lab.test.ts`), Task 9 (`tests/e2e/lab-helpers.ts`, `tests/e2e/labs.spec.ts` with `tabTo`, `said`, `goal`, `checkButton` and `answerDebriefByKeys`), Task 12 (the `Board` switch and the module-private `notesOf` of `tests/e2e/lab-helpers.ts`) and Task 13 (the `simulate` case and `useLabAt(page, lab, url)`, the module-private helper of `tests/e2e/labs.spec.ts` that Task 13's merge put on `master`).
It runs in the worktree `<scratchpad>/p5/wt/investigate` after Task 3, drafting `View.tsx` as soon as Task 4 is on `master`, and rebases on Task 7 before it touches the shared files; it merges last of Tasks 6, 7 and 8, at the latest on Tuesday, October 27.

Design notes:
- The view is native controls in the page's tab order, like Configure: a listing (when the spec has one) in a focusable region, a `Filters` fieldset with one labelled select per filter column, the records table in a focusable region, and a `Questions` fieldset with one labelled select per question; Investigate adds no lab keys, so `Enter` in any select checks through Phase 4 Task 6's `labKey` (a select counts as typing, where only `Enter` is the lab's), and `h` and `r` work from anywhere else on the screen.
- A filter select's first option, `All`, dispatches `unfilter`; its other options dispatch `filter` with the cell value; its `value` is bound to the active filter, so a reload (the draft replays) shows the filters as they were.
- An answer select's `value` is bound to the stored answer; until the question has one, the select shows the disabled `Choose an answer` option, which is `hidden` once the question is answered and never dispatched, since no action clears an answer.
- `shownLine` sits under the filters in its own `aria-live="polite"` paragraph, so every filter change announces how many records show, and `NO_RECORDS` replaces the table when the filters let none through; filters never change a goal (Task 3).
- The listing and the records sit in `<section>` elements with an `aria-label` (the listing's label, and the spec's `source`) and `tabIndex={0}`, so they are named regions that scroll sideways inside themselves and the page never does on a phone (the same rule as the notes' `.table-scroll`); the brief's `role="region"` on a `div` is dropped, because Biome's `useSemanticElements` and `noRedundantRoles` ask for a plain `section`, and its `noNoninteractiveTabindex` is answered by a `biome-ignore` comment with the WCAG reason, as the repo does for its other justified exceptions.
- No raw lab, question, option, column or record id is rendered: ids appear only in `value`, `id` and `for` attributes (spec 2.8), and the keyboard test checks the screen text for them.
- `Board` gains the last of its six cases; Investigate actions go through the plain `dispatch`, which appends to the draft, because no Investigate action needs an announcement from the screen.
- The selects drop their native look under `/* Labs: Investigate */`, as the Simulate selects do, because WebKit otherwise keeps a native select below 44 px; the filters sit three to a row from 640 px and stack on a phone.
- The keyboard test picks options by typing their first letters on the focused select (`th` for `Throw away`, `07:3` for `07:32 UTC`), which both Chromium and WebKit match against the option labels without opening the menu; the arrow keys open the native menu on macOS in both, so the test never uses them on a select, and it runs in both projects (Phase 4's Configure and Simulate keyboard tests skip WebKit for letter keys; the typed-letter helper here works there).
- The brief's bare `answerDebriefByKeys(page)` reads the debrief questions of the Sort lab, but after `useLabAt` the index lists only the lab served last (`lab lab-m01-bakery-sort is not in the index`); Phase 5 Task 6 gives the helper an `id` parameter that defaults to the Sort lab, and the Investigate test passes its own id.
- The synthetic lab is `bakeryInvestigateLab` from Task 3 as the build ships it, with the chunk's first two live practice questions as its debrief, as Phase 4 Task 13's `syntheticSimulateLab` does for Simulate.
- Covers P5-012 (the view half), P5-039, P5-062, P5-065, P5-068, P5-069, P5-070, P5-071, P5-072, P5-073, P5-076, P5-078, P5-079, P5-083, P5-089 and P5-090, each for Investigate.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/lab.test.ts` (Phase 4 Task 7's file, as Tasks 4, 6 and 7 left it), merging `ALL_VALUES`, `CHOOSE_ANSWER`, `FILTERS_LEGEND`, `NO_RECORDS`, `QUESTIONS_LEGEND` and `shownLine` into its import from `'../../src/app/lab.ts'`, so each name is imported once:

```ts
describe('Investigate copy', () => {
  it('labels the filters, the questions and the records shown', () => {
    expect([FILTERS_LEGEND, ALL_VALUES, QUESTIONS_LEGEND, CHOOSE_ANSWER]).toEqual([
      'Filters',
      'All',
      'Questions',
      'Choose an answer',
    ]);
    expect(NO_RECORDS).toBe('No record matches these filters.');
    expect(shownLine(3, 8)).toBe('3 of 8 records shown.');
    expect(shownLine(0, 8)).toBe('0 of 8 records shown.');
    expect(checkLabel('investigate')).toBe('Check');
  });
});
```

In `tests/e2e/lab-helpers.ts` (Phase 4 Task 9's file), add `import { bakeryInvestigateLab } from '../fixtures/lab-investigate.ts';` beside its `bakerySimulateLab` import and append (it reuses the file's module-private `notesOf`):

```ts
export const SYNTHETIC_INVESTIGATE_LAB_ID = 'lab-m01-bakery-ledger';
export const SYNTHETIC_INVESTIGATE_TITLE = 'Who threw away the starter?';

/** The bakery pantry ledger lab of `tests/fixtures/lab-investigate.ts` as the build ships it. */
export function syntheticInvestigateLab(questions: QuestionView[]): LabView {
  const lab = bakeryInvestigateLab();
  return {
    id: SYNTHETIC_INVESTIGATE_LAB_ID,
    module: 1,
    engine: 'investigate',
    tier: 'core',
    rev: 1,
    title: SYNTHETIC_INVESTIGATE_TITLE,
    minutes: lab.minutes,
    concepts: lab.concepts,
    brief: lab.brief,
    spec: lab.spec,
    goals: lab.goals,
    notes: notesOf(questions),
    debrief: { lines: lab.debrief.lines, questions: questions.slice(0, 2) },
    credits: false,
  };
}
```

In `tests/e2e/labs.spec.ts`, add `SYNTHETIC_INVESTIGATE_LAB_ID`, `SYNTHETIC_INVESTIGATE_TITLE` and `syntheticInvestigateLab` to the import from `'./lab-helpers.ts'`.
Leave `answerDebriefByKeys` as Phase 5 Task 6 left it: Task 6, which merges before this task, gave it the lab whose debrief it answers, so its head already reads:

```ts
/**
 * Answers the debrief of the lab `id` by the Runner keys: digits (and letters in a match), Enter to check, Enter for
 * Next.
 */
async function answerDebriefByKeys(page: Page, id = SYNTHETIC_SORT_LAB_ID): Promise<void> {
  const lab = await labFor(page, id);
```

The Investigate keyboard test passes `SYNTHETIC_INVESTIGATE_LAB_ID` to it, because after `useLabAt` only the lab served last is in the index; the Sort test's `answerDebriefByKeys(page)` call stays as it is.
Then append:

```ts
const INVESTIGATE_URL = `/#/m/01/lab/${SYNTHETIC_INVESTIGATE_LAB_ID}`;
const LEDGER = 'Pantry ledger, Flourtown bakery, 14 March, times in UTC';
const WHO = 'Who threw the sourdough starter away?';
const WHAT = 'Which event took the starter out of the pantry for good?';
const WHEN = 'When did the starter leave the pantry?';
const useInvestigateLab = (page: Page): Promise<void> =>
  useLabAt(page, syntheticInvestigateLab, INVESTIGATE_URL);
const ledgerRows = (page: Page): Locator => page.getByRole('region', { name: LEDGER }).locator('tbody tr');
const select = (page: Page, label: string): Locator => page.getByLabel(label, { exact: true });

/**
 * Types the first letters of an option on the focused select, the way a keyboard user picks one; both browsers match
 * the typed letters against the option labels without opening the menu.
 */
async function typeToChoose(page: Page, target: Locator, letters: string, value: string): Promise<void> {
  await expect(target).toBeFocused();
  await page.keyboard.type(letters);
  await expect(target).toHaveValue(value);
}

test('an Investigate lab works by keyboard alone, filters its records and records its completion', async ({
  page,
  browserName,
}) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  await useInvestigateLab(page);
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  await expect(ledgerRows(page)).toHaveCount(8);

  // A filter narrows the records and says how many it shows; it never answers a question.
  await tabTo(page, select(page, 'Event'), tab);
  await typeToChoose(page, select(page, 'Event'), 'th', 'Throw away');
  await expect(said(page, '2 of 8 records shown.')).toBeAttached();
  await expect(ledgerRows(page)).toHaveCount(2);
  await page.keyboard.press(tab);
  await expect(select(page, 'Result')).toBeFocused();
  await typeToChoose(page, select(page, 'Result'), 'r', 'Refused');
  await expect(said(page, '1 of 8 records shown.')).toBeAttached();

  // Enter in a select checks the board on demand.
  await tabTo(page, select(page, WHO), tab);
  await typeToChoose(page, select(page, WHO), 'i', 'ines');
  await page.keyboard.press(tab);
  await typeToChoose(page, select(page, WHAT), 'th', 'throw-away');
  await page.keyboard.press('Enter');
  await expect(said(page, '1 of 2 goals met.')).toBeAttached();
  await expect(goal(page, 'Name who threw the starter away, and how')).toContainText('Met');
  await expect(goal(page, 'Pin down when the starter left')).toContainText('Not met');

  // The draft keeps every answer and filter across a reload.
  // Each typed letter that moves the select is a change the draft stores, and a reload replays them all.
  await expect.poll(() => storedDraftActions(page, SYNTHETIC_INVESTIGATE_LAB_ID)).toBeGreaterThan(0);
  await page.reload();
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  await expect(select(page, WHO)).toHaveValue('ines');
  await expect(select(page, WHAT)).toHaveValue('throw-away');
  await expect(select(page, 'Event')).toHaveValue('Throw away');
  await expect(page.getByText('1 of 8 records shown.', { exact: true })).toBeVisible();
  // Raw lab, question, option and record ids never show (spec 2.8).
  expect(await page.locator('.lab').innerText()).not.toMatch(
    /lab-m01-bakery-ledger|throw-away|at-0732|\br4\b/,
  );

  await tabTo(page, select(page, WHEN), tab);
  await typeToChoose(page, select(page, WHEN), '07:3', 'at-0732');
  await page.keyboard.press('Enter');
  await expect(said(page, 'All 2 goals met. Plus 40 XP.')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Debrief' })).toBeFocused();
  await answerDebriefByKeys(page, SYNTHETIC_INVESTIGATE_LAB_ID);
  await expect(page.getByRole('link', { name: 'Back to Module 1' })).toBeVisible();
  await expect.poll(() => labDoneCount(page, SYNTHETIC_INVESTIGATE_LAB_ID)).toBe(1);
});

test('an Investigate lab has no axe violations and no sideways scroll', async ({ page }) => {
  await useInvestigateLab(page);
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await select(page, 'Who').selectOption('Tobin');
  await expect(said(page, '3 of 8 records shown.')).toBeAttached();
  await select(page, 'Result').selectOption('Done');
  await select(page, 'Event').selectOption('Throw away');
  await expect(page.getByText('No record matches these filters.', { exact: true })).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
  await select(page, WHO).selectOption('mara');
  await checkButton(page).click();
  await expect(said(page, '0 of 2 goals met.')).toBeAttached();
  // A hint is free and reads the board as it is now.
  await page.getByRole('button', { name: 'Hint' }).first().click();
  await expect(
    page.getByText(
      'A refused event changes nothing in the pantry; only an event that is done removes the starter. 1 question still unanswered and 1 answer wrong.',
    ),
  ).toBeVisible();
  await expectNoAxeViolations(page);
  await expectNoSidewaysScroll(page);
});

test('an Investigate lab works by taps on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useInvestigateLab(page);
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  await select(page, 'Who').tap();
  await select(page, 'Who').selectOption('Ines');
  await expect(said(page, '2 of 8 records shown.')).toBeAttached();
  for (const [label, option] of [
    [WHO, 'Ines'],
    [WHAT, 'Throw away'],
    [WHEN, '07:32 UTC'],
  ] as const) {
    await select(page, label).tap();
    await select(page, label).selectOption({ label: option });
  }
  await checkButton(page).tap();
  await expect(said(page, 'All 2 goals met. Plus 40 XP.')).toBeAttached();
});

test('Investigate selects are at least 44 px tall on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-mobile', 'the phone layout runs on webkit-mobile only');
  await useInvestigateLab(page);
  await expect(h1(page, SYNTHETIC_INVESTIGATE_TITLE)).toBeVisible();
  const selects = await page.locator('.inv select').all();
  expect(selects).toHaveLength(6);
  for (const control of selects) {
    expect((await control.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await expectNoSidewaysScroll(page);
});
```

- [ ] **Step 2: Run the unit test and see it fail**

```bash
pnpm test tests/unit/lab.test.ts 2>&1 | grep -E "FAIL|AssertionError|Tests "
```

Expected:

```text
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  tests/unit/lab.test.ts > Investigate copy > labels the filters, the questions and the records shown
AssertionError: expected [ undefined, undefined, …(2) ] to deeply equal [ 'Filters', 'All', 'Questions', …(1) ]
      Tests  1 failed | <n> passed (<n + 1>)
```

Here `<n>` is the number of tests Tasks 4, 6 and 7 left in the file; only the new test fails.

- [ ] **Step 3: Run the end-to-end tests and see them fail**

Run under the machine-wide e2e lock: `lsof -iTCP:4317 -sTCP:LISTEN` must print nothing first, and the `if` line takes the lock with `mkdir`, frees it after the run, also when the run fails, and prints `e2e lock held` and runs nothing when another run holds it; then wait with a background until-loop or the Monitor tool and retry, and never remove a lock this task did not take.

```bash
if mkdir <scratchpad>/e2e.lock; then pnpm build && pnpm e2e tests/e2e/labs.spec.ts -g Investigate 2>&1 | grep -E "Expected|Received|Error:|failed|skipped"; rmdir <scratchpad>/e2e.lock; else echo "e2e lock held"; fi
```

Expected: the build passes (nothing imports the new copy yet), and Playwright ends with `6 failed` and `2 skipped`: the keyboard test fails in both projects with `Expected: 8` and `Received: 0` on the ledger rows, because `Board` renders nothing for `investigate` yet; the axe test fails in both with `locator.selectOption: Test timeout of 30000ms exceeded.`; on `webkit-mobile` the tap test times out on its first tap and the 44 px test fails `toHaveLength` with `Expected length: 6` and `Received length: 0`.
Remove the lock with `rmdir` also when the run fails.

- [ ] **Step 4: Add the Investigate copy**

Append to `src/app/lab.ts`:

```ts
/** The legend over an Investigate lab's filter selects. */
export const FILTERS_LEGEND = 'Filters';

/** A filter select's first option, which shows every value of its column. */
export const ALL_VALUES = 'All';

/** The legend over an Investigate lab's answer selects. */
export const QUESTIONS_LEGEND = 'Questions';

/** An answer select's first option until the question has an answer. */
export const CHOOSE_ANSWER = 'Choose an answer';

/** Shown in place of the records when the filters let none through. */
export const NO_RECORDS = 'No record matches these filters.';

/** Under the filters, and announced when they change: `3 of 8 records shown.`. */
export const shownLine = (shown: number, total: number): string => `${shown} of ${total} records shown.`;
```

- [ ] **Step 5: Add the Investigate view**

Create `src/labs/investigate/View.tsx`:

```tsx
import type { InvestigateAction, InvestigateSpec } from '../../../schemas/lab-investigate.ts';
import {
  ALL_VALUES,
  CHOOSE_ANSWER,
  FILTERS_LEGEND,
  NO_RECORDS,
  QUESTIONS_LEGEND,
  shownLine,
} from '../../app/lab.ts';
import { type InvestigateState, visibleRecords } from './model.ts';

/** A record of the state, read only when the key is its own, so an id such as `constructor` reads nothing. */
const own = (record: Readonly<Record<string, string>>, key: string): string | undefined =>
  Object.hasOwn(record, key) ? record[key] : undefined;

/**
 * Read made-up records and an optional listing, narrow the records with filters, then choose each answer (spec 5.1).
 * Native selects only, in the page's tab order; the listing and the records scroll inside focusable regions, so the
 * page never scrolls sideways on a phone.
 */
export function InvestigateView(props: {
  spec: InvestigateSpec;
  state: InvestigateState;
  onAction(action: InvestigateAction): void;
}) {
  const { spec, state, onAction } = props;
  const filters = spec.columns.filter((c) => c.filter);
  const shown = visibleRecords(spec, state);
  return (
    <div class="inv">
      {spec.listing !== undefined && (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the listing scrolls sideways on a phone, so the keyboard must reach it (WCAG 2.1.1)
        <section class="inv-listing" aria-label={spec.listing.label} tabIndex={0}>
          <pre>{spec.listing.lines.join('\n')}</pre>
        </section>
      )}
      {filters.length > 0 && (
        <fieldset class="inv-filters">
          <legend>{FILTERS_LEGEND}</legend>
          {filters.map((column) => {
            const id = `inv-filter-${column.id}`;
            return (
              <div key={column.id} class="inv-field">
                <label for={id}>{column.label}</label>
                <select
                  id={id}
                  value={own(state.filters, column.id) ?? ''}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    onAction(
                      value === ''
                        ? { t: 'unfilter', column: column.id }
                        : { t: 'filter', column: column.id, value },
                    );
                  }}
                >
                  <option value="">{ALL_VALUES}</option>
                  {(state.filterable[column.id] ?? []).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </fieldset>
      )}
      {spec.records.length > 0 && (
        <>
          <p class="muted inv-shown" aria-live="polite">
            {shownLine(shown.length, spec.records.length)}
          </p>
          {/* biome-ignore lint/a11y/noNoninteractiveTabindex: the records scroll sideways on a phone, so the keyboard must reach them (WCAG 2.1.1) */}
          <section class="inv-records" aria-label={spec.source} tabIndex={0}>
            {shown.length === 0 ? (
              <p class="muted inv-none">{NO_RECORDS}</p>
            ) : (
              <table>
                <caption>{spec.source}</caption>
                <thead>
                  <tr>
                    {spec.columns.map((column) => (
                      <th key={column.id} scope="col">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((record) => (
                    <tr key={record.id}>
                      {spec.columns.map((column) => (
                        <td key={column.id}>{own(record.cells, column.id)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
      <fieldset class="inv-questions">
        <legend>{QUESTIONS_LEGEND}</legend>
        {spec.questions.map((question) => {
          const id = `inv-question-${question.id}`;
          const chosen = own(state.answers, question.id);
          return (
            <div key={question.id} class="inv-field">
              <label for={id}>{question.prompt}</label>
              <select
                id={id}
                value={chosen ?? ''}
                onChange={(event) => {
                  const option = event.currentTarget.value;
                  if (option !== '') onAction({ t: 'answer', question: question.id, option });
                }}
              >
                <option value="" disabled hidden={chosen !== undefined}>
                  {CHOOSE_ANSWER}
                </option>
                {question.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
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
```

- [ ] **Step 6: Render it from the lab screen**

In `src/app/screens/Lab.tsx`, add these imports (Biome's `pnpm lint:fix` sorts them into place):

```tsx
import type { InvestigateSpec } from '../../../schemas/lab-investigate.ts';
import type { InvestigateState } from '../../labs/investigate/model.ts';
import { InvestigateView } from '../../labs/investigate/View.tsx';
```

and add this case to `Board`'s switch, after its last case (Task 7's `case 'trace'`), so the switch covers all six engines:

```tsx
    case 'investigate':
      return (
        <InvestigateView
          spec={lab.spec as InvestigateSpec}
          state={state as InvestigateState}
          onAction={onAction}
        />
      );
```

Leave `onBoardAction` in `LabBody` as Tasks 6 and 7 left it: its final `else dispatch(action);` already passes every Investigate action to the plain `dispatch`, because Investigate needs no announcement of its own.

- [ ] **Step 7: Add the Investigate styles**

In `src/ui/base.css`, under the `/* Labs: Investigate */` anchor that Task 4 inserted (between the Trace rules and `/* Incident */`) and nowhere else, add every rule below the anchor line here:

```css
/* Labs: Investigate */

.inv {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.inv-filters,
.inv-questions {
  display: grid;
  gap: 16px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.inv-filters legend,
.inv-questions legend {
  margin-bottom: 8px;
  padding: 0;
  font-weight: 600;
}

@media (min-width: 640px) {
  .inv-filters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.inv-field label {
  display: block;
  margin-bottom: 4px;
}

.inv-field select {
  width: 100%;
  max-width: 28rem;
  min-height: 44px;
  padding: 0 36px 0 12px;
  font: inherit;
  color: var(--text);
  background-color: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

/* As with the Simulate selects, WebKit keeps a native select at its own height, so this one drops its native look. */
.inv-field select {
  -webkit-appearance: none;
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--muted) 50%),
    linear-gradient(135deg, var(--muted) 50%, transparent 50%);
  background-position:
    calc(100% - 20px) 50%,
    calc(100% - 15px) 50%;
  background-size: 5px 5px;
  background-repeat: no-repeat;
}

.inv-field select:hover {
  border-color: var(--active);
}

.inv-shown {
  margin: 0;
}

/* The listing and the records scroll sideways inside their focusable regions, never the page. */
.inv-listing,
.inv-records {
  overflow-x: auto;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.inv-listing pre {
  margin: 0;
  padding: 12px;
  font-size: 0.875rem;
  line-height: 1.45;
  white-space: pre;
}

.inv-records table {
  width: 100%;
  min-width: 32rem;
  font-size: 0.875rem;
  border-collapse: collapse;
}

.inv-records caption {
  padding: 8px;
  font-weight: 600;
  text-align: left;
}

.inv-records th,
.inv-records td {
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
  border-top: 1px solid var(--line);
}

.inv-records th {
  font-weight: 600;
}

.inv-none {
  margin: 0;
  padding: 12px;
}
```

- [ ] **Step 8: Run the unit test, the type check and the linter and see them pass**

```bash
pnpm lint:fix
pnpm test tests/unit/lab.test.ts tests/unit/lab-investigate.test.ts 2>&1 | grep -E "FAIL|Test Files"
pnpm typecheck
pnpm lint
```

Expected: `Test Files  2 passed (2)`; `pnpm typecheck` prints `$ tsc --noEmit` and nothing else; `pnpm lint` ends with `No fixes applied.`.

- [ ] **Step 9: Run the end-to-end tests and see them pass**

Check the port and take the e2e lock as in Step 3:

```bash
pnpm build 2>&1 | grep '^budgets:'
if mkdir <scratchpad>/e2e.lock; then pnpm e2e tests/e2e/labs.spec.ts 2>&1 | grep -E "passed|failed|skipped"; rmdir <scratchpad>/e2e.lock; else echo "e2e lock held"; fi
```

Expected: the `budgets:` line passes, with the initial JS unchanged by this task, because the view and the copy load only in the lazy `Lab` chunk (the prototype measured `initial JS 49.2 KB of 50.0 KB` and a `Lab` chunk of 9.6 KB with Investigate as the only Phase 5 engine; report the measured initial size, its headroom and the `Lab` chunk size); Playwright prints a `passed` and a `skipped` count and no `failed` line, with the four Investigate tests passing in both projects except the two phone tests, which `chromium-desktop` skips.
Remove the lock with `rmdir` also when the run fails.

- [ ] **Step 10: Commit**

```bash
git add src/labs/investigate/View.tsx src/app/lab.ts src/app/screens/Lab.tsx src/ui/base.css tests/unit/lab.test.ts tests/e2e/lab-helpers.ts tests/e2e/labs.spec.ts
git commit -m "Add the Investigate lab view" -m "Filter the records, read the listing and choose each answer; keyboard and axe tested."
```

Expected: the pre-commit hook's `pnpm check` passes and the commit succeeds; the report states the initial JS size and headroom and the `Lab` chunk size for the Phase 6 controller, and names any visual baseline it updated (none exist before Phase 6 Task 21).

---

## Task 9: The lab writer and critic, version 2, and the STYLE sections

**Files:**
- Modify: `agents/lab-writer.md`, `agents/lab-critic.md`, `content/STYLE.md`
- Test: `tests/unit/agents.test.ts`

Design notes:
- Follows Phase 5 Task 4 (the three engines registered in `LAB_ENGINES`, `LAB_SCHEMAS` and `ENGINES`) and Phase 5 Task 5 (the `purchase` and `data-loss` models in `SIM_LABS`); the new test replays the prompt's examples through R11, so it needs Task 4 on `master`.
- It builds on Phase 4 Task 3 (`agents/lab-writer.md` and `agents/lab-critic.md` version 1, the STYLE `## Labs` section, the `VERSIONS` map of `tests/unit/agents.test.ts`), Phase 4 Task 12 (`## Configure labs`, `## Configure criteria`, `### Configure fields`) Phase 4 Task 13 (`## Simulate labs`, its model notes, `## Simulate criteria`, `### Simulate parameters`) and Phase 4 Task 14 (the STYLE `## Incidents` section the new H3s sit before, and its own `VERSIONS` change); all of them are on `master` before Tasks 4 and 5.
- Both prompts move to version 2, because every Phase 4 lab was written with version 1 and the writer's rules change: the tier and the file now come from the task row, not from a module folder (P5-093, P5-094).
- The writer's line 8, its coverage line, its `--lab-targets` input, its inputs line on the shapes and its `Write only` rule are replaced word for word; the coverage line is matched by its start, `This version of the prompt covers`, because Phase 4 Tasks 12 and 13 left it as Task 3 wrote it.
- Three engine sections follow the Simulate section, in `LAB_ENGINES` order: `## Place labs`, `## Trace labs` and `## Investigate labs`, each with the spec shape and actions from Phase 5 Tasks 1 to 3, the `minutes` rule, the engine-facts rule, complete bakery examples in YAML and one plan per real lab of that engine, core and stretch; a closing `## Stretch labs` section holds the same bar for stretch labs and one plan per stretch lab of Phase 4's engines.
- Each plan heading reads `### Module N: <Title>`, and Phase 4's two Configure plan headings move to the same form; the form `### <Title> (Module N)` would break R8 on the four question titles, since a `?` followed by ` (Module` reads as two sentences.
- The examples are complete labs in the made-up bakery world, with their own ids (`lab-m01-bakery-fronts`, `lab-m01-bakery-window`, `lab-m01-bakery-badges`, `lab-m01-bakery-starter`) so they never collide with the fixtures of Tasks 1 to 3 (`bakeryPlaceLab`, `bakeryTraceLab`, `bakeryPolicyLab`, `bakeryInvestigateLab`), which the prompt names as the unit tests' labs; the new test parses every example with `LabFile` and runs it through `labProblems` (Phase 4 Task 2), so an example that stops replaying under the real engines fails the test.
- The per-lab plans follow the Task 10 rows (id and file) and the engine-terms plans of the brief, with these fixes so every lab can pass R11: every goal has a wrong path (Build the sales pipeline gains Amazon EMR in the ingest stage for g1, Least privilege for the barista gains a broad menu Deny for g1, the Well-Architected review puts one pillar mistake in each of g1 and g2, and Who deleted the menu bucket?, What will this template create? and Does the SCP allow it? ask for a wrong path per goal), and in Why can't customers reach the menu? the network ACL lets SSH in from anywhere, since an office-only network ACL rule would deny the stranger before the security group and make the SSH-to-anyone wrong path pass g2.
- `## Place labs` says every `subnet` sits below a `vpc` and that a distractor kept off the board needs an `in` constraint within the bench; `## Trace labs` says every org node needs an allowing SCP, actions ignore letter case and resources match exactly, cases carry no conditions, and the management account is never modelled; `## Investigate labs` says filters match exact values only, times are in UTC with the `UTC` suffix (P5-043), and a lab has at most 8 questions and 5 goals.
- The critic gains `## Place criteria`, `## Trace criteria`, `## Investigate criteria` and `## Stretch criteria`, and keeps the six Phase 4 issue kinds; STYLE gains four H3s inside `## Labs`, after `### Simulate parameters` and before `## Incidents`.
- The never-read line of both prompts stays as Phase 4 Task 3 wrote it (P5-098): no lab writer or critic reads `content/exam/`, the course text, `content/fingerprints/`, AWS exam questions or `.results/checks/keys.json`, and the writer still returns ids only; a new test pins each of those five in the `Never read` line of both prompts, since Phase 4's test checks only that the line exists.
- Phase 6 also edits `VERSIONS` in `tests/unit/agents.test.ts` and appends to that file; whichever lands second rebases and keeps both changes.
- Covers P5-043 (the UTC rule), P5-048, P5-055, P5-056, P5-093, P5-094, P5-095, P5-096, P5-098, P5-099.

- [ ] **Step 1: Write the failing tests**

In `tests/unit/agents.test.ts` (Phase 4 Task 3), add these two imports among the others, so the import block reads as below (Biome keeps it sorted):

```ts
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { LabFile } from '../../schemas/lab.ts';
import { CHECK_NAMES } from '../../schemas/question.ts';
import { checkVersion } from '../../scripts/content/lib/checks.ts';
import { splitFrontmatter } from '../../scripts/content/lib/markdown.ts';
import { labProblems } from '../../scripts/content/rules/r11-labs.ts';
```

In `VERSIONS`, change the two lab prompt lines from 1 to 2:

```ts
  'lab-writer': 2,
  'lab-critic': 2,
```

Append to the end of the file:

```ts
/** The `## ` or `### ` section of a Markdown file that starts at `heading`, up to the next heading of that level or above. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n${heading}\n`);
  if (start === -1) return '';
  const body = text.slice(start + heading.length + 2);
  const level = heading.startsWith('### ') ? /^#{2,3} /m : /^## /m;
  const end = body.search(level);
  return end === -1 ? body : body.slice(0, end);
}

/** Every ```yaml block of a Markdown text, without its fence. */
const yamlBlocks = (text: string): string[] =>
  [...text.matchAll(/^```yaml\n([\s\S]*?)^```$/gm)].map((match) => match[1] ?? '');

/** Each lab the version 2 writer plans: its section, title, module, id and file (Phase 5 Task 10's rows). */
const PHASE_5_LABS = [
  [
    '## Place labs',
    'Survive an AZ outage',
    4,
    'lab-m04-survive-an-az-outage',
    '04-going-global/survive-an-az-outage.yaml',
  ],
  [
    '## Place labs',
    'Two tiers, two zones',
    5,
    'lab-m05-two-tiers-two-zones',
    '05-networking/two-tiers-two-zones.yaml',
  ],
  [
    '## Place labs',
    'Build the sales pipeline',
    8,
    'lab-m08-build-the-sales-pipeline',
    '08-ai-ml-and-data-analytics/build-the-sales-pipeline.yaml',
  ],
  [
    '## Trace labs',
    "Why can't customers reach the menu?",
    5,
    'lab-m05-reach-the-menu',
    '05-networking/reach-the-menu.yaml',
  ],
  [
    '## Trace labs',
    'Least privilege for the barista',
    9,
    'lab-m09-least-privilege-for-the-barista',
    '09-security/least-privilege-for-the-barista.yaml',
  ],
  [
    '## Trace labs',
    'Does the SCP allow it?',
    10,
    'lab-m10-does-the-scp-allow-it',
    '10-monitoring-compliance-and-governance/does-the-scp-allow-it.yaml',
  ],
  [
    '## Investigate labs',
    'Who deleted the menu bucket?',
    10,
    'lab-m10-who-deleted-the-menu-bucket',
    '10-monitoring-compliance-and-governance/who-deleted-the-menu-bucket.yaml',
  ],
  [
    '## Investigate labs',
    'Well-Architected review of the cafe',
    13,
    'lab-m13-well-architected-review',
    '13-well-architected-solutions/well-architected-review.yaml',
  ],
  [
    '## Investigate labs',
    'What will this template create?',
    4,
    'lab-m04-what-will-this-template-create',
    '04-going-global/what-will-this-template-create.yaml',
  ],
  [
    '## Stretch labs',
    'Pay less for beans',
    2,
    'lab-m02-pay-less-for-beans',
    '02-compute-in-the-cloud/pay-less-for-beans.yaml',
  ],
  [
    '## Stretch labs',
    'Queue, topic or event bus',
    2,
    'lab-m02-queue-topic-or-event-bus',
    '02-compute-in-the-cloud/queue-topic-or-event-bus.yaml',
  ],
  [
    '## Stretch labs',
    'Connect the shops',
    5,
    'lab-m05-connect-the-shops',
    '05-networking/connect-the-shops.yaml',
  ],
  [
    '## Stretch labs',
    'Lose the instance',
    6,
    'lab-m06-lose-the-instance',
    '06-storage/lose-the-instance.yaml',
  ],
  [
    '## Stretch labs',
    'Who manages what?',
    7,
    'lab-m07-who-manages-what',
    '07-databases/who-manages-what.yaml',
  ],
  [
    '## Stretch labs',
    'Lock the root user',
    9,
    'lab-m09-lock-the-root-user',
    '09-security/lock-the-root-user.yaml',
  ],
  [
    '## Stretch labs',
    'CAF perspectives',
    12,
    'lab-m12-caf-perspectives',
    '12-migrating-to-the-aws-cloud/caf-perspectives.yaml',
  ],
] as const;

describe('the lab writer and critic, version 2 (Phase 5)', () => {
  const writer = readFileSync(join(ROOT, 'agents', 'lab-writer.md'), 'utf8');
  const critic = readFileSync(join(ROOT, 'agents', 'lab-critic.md'), 'utf8');
  const style = readFileSync(join(ROOT, 'content', 'STYLE.md'), 'utf8');

  it('takes the tier and the file of each lab from the task, for all six engines', () => {
    expect(writer).toContain('the tier your task gives');
    expect(writer).toContain('each at exactly the path your task gives');
    expect(writer).not.toContain("Write only your module's folder");
    expect(writer).toContain(
      'This version of the prompt covers all six engines: Sort, Configure, Simulate, Place, Trace and Investigate.',
    );
  });

  it('points the writer and the critic at the per-engine schema files', () => {
    for (const prompt of [writer, critic]) expect(prompt).toContain('`schemas/lab-<engine>.ts`');
  });

  it('keeps the writer and the critic away from the exam pool, the course, the fingerprints and the keys', () => {
    for (const prompt of [writer, critic]) {
      const never = prompt.split('\n').find((line) => line.startsWith('Never read')) ?? '';
      for (const banned of [
        'the course source text',
        '`content/fingerprints/`',
        '`content/exam/`',
        'AWS exam questions',
        '`.results/checks/keys.json`',
      ])
        expect(never).toContain(banned);
    }
  });

  it('ends the writer with the three new engines, then the stretch labs', () => {
    const headings = writer.split('\n').filter((line) => line.startsWith('## '));
    expect(headings.slice(-4)).toEqual([
      '## Place labs',
      '## Trace labs',
      '## Investigate labs',
      '## Stretch labs',
    ]);
  });

  it.each([
    ['## Place labs', 'place', 1],
    ['## Trace labs', 'trace', 2],
    ['## Investigate labs', 'investigate', 1],
  ] as const)('%s shows complete bakery labs that R11 replays clean', (heading, engine, count) => {
    const blocks = yamlBlocks(section(writer, heading));
    expect(blocks).toHaveLength(count);
    for (const block of blocks) {
      const lab = LabFile.parse(parse(block));
      expect(lab.engine).toBe(engine);
      const slug = lab.id.replace(/^lab-m\d\d-/, '');
      expect(labProblems({ path: `agents/lab-writer.md#${slug}`, module: lab.module, slug, lab })).toEqual(
        [],
      );
    }
  });

  it('notes the two new Simulate models for the brief and the debrief', () => {
    const notes = section(writer, '### Model notes for the brief and the debrief');
    expect(notes).toContain('- `purchase` (Pay less for beans):');
    expect(notes).toContain('- `data-loss` (Lose the instance):');
  });

  it.each(PHASE_5_LABS)(
    '%s plans %s (Module %i) with its id and its file',
    (heading, title, module, id, file) => {
      const plan = section(section(writer, heading), `### Module ${module}: ${title}`);
      expect(plan).toContain(`\`${id}\``);
      expect(plan).toContain(`\`content/labs/${file}\``);
    },
  );

  it('gives the critic criteria for each new engine and for stretch labs, with the same six issue kinds', () => {
    const headings = critic.split('\n').filter((line) => line.startsWith('## '));
    expect(headings.slice(-4)).toEqual([
      '## Place criteria',
      '## Trace criteria',
      '## Investigate criteria',
      '## Stretch criteria',
    ]);
    expect(critic).toContain(
      '"kind": "grounding" | "wrongPath" | "alternatives" | "originality" | "style" | "debrief"',
    );
  });

  it('adds the four Phase 5 style rules inside ## Labs, after the Simulate rules and before ## Incidents', () => {
    const at = (heading: string): number => style.indexOf(`\n${heading}\n`);
    const order = [
      '### Simulate parameters',
      '### Place containers and pieces',
      '### Trace rules and cases',
      '### Investigate records and questions',
      '### Engine rules beyond the notes',
      '## Incidents',
    ].map(at);
    expect(order.every((index) => index > at('## Labs'))).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
```

- [ ] **Step 2: Run the tests and see them fail**

```bash
pnpm test tests/unit/agents.test.ts 2>&1 | grep -E "Tests  |AssertionError" | sed -n '1,2p;$p'
```

Expected: the first two lines are `AssertionError: expected { name: 'lab-writer', version: 1 } to deeply equal { name: 'lab-writer', version: 2 }` and the same for `lab-critic`, and the last is `Tests  27 failed | 12 passed (39)`, because the prompts are still version 1 and have no Phase 5 sections; the other failures include ``AssertionError: expected '' to contain '`lab-m04-survive-an-az-outage`'``, and the never-read test already passes, since it guards a line Phase 4 Task 3 wrote.

- [ ] **Step 3: Move both prompts to version 2 and replace the lines that change**

In `agents/lab-writer.md`, change the frontmatter line `version: 1` to `version: 2`, then replace each old line below with its new line, word for word:

```text
old: You write the core labs of one module, one YAML file per lab, into that module's folder under `content/labs/` (spec 5).
new: You write the labs your task names, core or stretch, one YAML file per lab, each at exactly the path your task gives under `content/labs/` (spec 5).

old (the line that starts "This version of the prompt covers"): This version of the prompt covers the Sort engine; the Configure and Simulate sections arrive with their engines.
new: This version of the prompt covers all six engines: Sort, Configure, Simulate, Place, Trace and Investigate.

old: - Your module's entry from `pnpm --silent content:report --lab-targets`, given in your task: `module`, the folder name `dir`, the lab ids already written (`labs`), and each tested concept homed in the module with its `name`, home `note`, `tasks` and its live practice questions (`practice`, ids and types only).
new: - The entries from `pnpm --silent content:report --lab-targets` given in your task, one for your lab's module and one for each other module that homes a concept your lab uses, each with `module`, the folder name `dir`, the lab ids already written (`labs`), and each tested concept homed there with its `name`, home `note`, `tasks` and its live practice questions (`practice`, ids and types only).

old: - `src/labs/contract.ts`, the engine's `src/labs/<engine>/model.ts`, and the lab shapes in `schemas/lab.ts`, so you know exactly how a board is checked.
new: - `src/labs/contract.ts`, the engine's `src/labs/<engine>/model.ts`, and the lab shapes in `schemas/lab.ts` and, for Place, Trace and Investigate, `schemas/lab-<engine>.ts`, so you know exactly how a board is checked.

old: - Write only your module's folder `content/labs/<dir>/`, one file per lab, with `tier: core`, `rev: 1` and `status: live`.
new: - Write only the files your task names, one file per lab, with the tier your task gives (`core` or `stretch`), `rev: 1` and `status: live`.

old: ### Launch the order server (Module 2)
new: ### Module 2: Launch the order server

old: ### Choose the Region (Module 4)
new: ### Module 4: Choose the Region
```

In `agents/lab-critic.md`, change `version: 1` to `version: 2`, and replace its third `## Inputs` bullet:

```text
old: - `src/labs/contract.ts`, the engine's `src/labs/<engine>/model.ts` and the lab shapes in `schemas/lab.ts`.
new: - `src/labs/contract.ts`, the engine's `src/labs/<engine>/model.ts` and the lab shapes in `schemas/lab.ts` and, for Place, Trace and Investigate, `schemas/lab-<engine>.ts`.
```

- [ ] **Step 4: Add the model notes of the two new Simulate models**

Append these two bullets to `### Model notes for the brief and the debrief` in `agents/lab-writer.md` (Phase 4 Task 13), right after its `transfer` bullet, which ends the file:

````markdown
- `purchase` (Pay less for beans): each workload costs its option's rate times its hours times its months, except that a Reserved Instance or a Savings Plan bills the whole term even for a one-month job; Spot is the cheapest option but may stop a job that cannot restart, and only a Dedicated Host meets a licence bound to a physical server, while a need for dedicated hardware alone is met by a Dedicated Instance or a Dedicated Host.
- `data-loss` (Lose the instance): a stop erases the instance store, so no snapshot protects it; Amazon EBS keeps its data through the stop, and when the zone is lost only the orders since the last snapshot are gone; the first snapshot is full and every later one is incremental, so frequent snapshots cost little.
````

- [ ] **Step 5: Append the Place, Trace, Investigate and stretch sections to the writer**

Append to the end of `agents/lab-writer.md`, after the bullets of Step 4:

````markdown
## Place labs

A Place spec is `containers`, `pieces`, `failures` and `constraints`; `PlaceSpec` in `schemas/lab-place.ts` is the shape, `src/labs/place/model.ts` is how a board is checked, and `bakeryPlaceLab` in `tests/fixtures/lab-place.ts` is the bakery lab the unit tests check.
Containers form a tree by `parent`, and a container is a slot exactly when no other container names it as its parent.
The kinds are `region`, `az`, `vpc`, `subnet`, `edge`, `stage` and `bench`, and one optional top-level `bench`, labelled for example `Not used`, takes the pieces a learner decides not to run.
The screen numbers the slots depth-first, each container's children in spec order, with the bench last, and the keys `1` to `0` follow that order.
Every `subnet` sits below a `vpc`, or the schema rejects it.
A piece has an `id`, a `label`, an optional `detail` and an optional `role`, either `internet-gateway` or `public-route`.
`failures` lists the containers that can fail, never the bench, and the checker tests every `survive` constraint under each listed failure in turn, whatever failure the screen previews.
Each constraint belongs to one goal, and a goal passes when all of its constraints pass:

- `in`: every listed piece sits in one of the `within` containers or below one, and the bench counts only when `within` names it.
- `survive`: under every listed failure, at least `min` of the listed pieces run outside the failed container, and with no failures listed at least `min` of them run.
- `public`: every listed piece runs and is reachable from the internet.
- `private`: every listed piece runs in a slot with a `subnet` at or above it, and is not reachable.

A piece runs when it is placed anywhere but the bench.
A piece is reachable when its nearest `subnet`, its slot or above, also holds a running `public-route` piece, and that subnet's nearest `vpc` holds a running `internet-gateway` piece in a slot outside every subnet.
A distractor that must stay off the board needs an `in` constraint within the bench, since a piece placed anywhere else breaks no other constraint.
Actions are `{ t: place, piece, slot }`, `{ t: unplace, piece }`, `{ t: fail, container }`, `{ t: restore }` and `{ t: reset }`; `fail` and `restore` only preview a failure and never change a check, so a solution or a wrong path needs only `place` actions.
The board is finished when no piece is left in the tray, so every wrong path places every piece, the distractors included.
Write `minutes` from 6 to 10.
The notes do not teach how this engine decides reachability or survival, so the brief states each rule a lab relies on, such as a load balancer slot spanning the zones, as how this lab works.

This complete example is another Place lab in the made-up bakery world of the test fixtures, and R11 replays it clean; your labs are set in the cafe instead.

```yaml
id: lab-m01-bakery-fronts
module: 1
title: Keep the bakery ordering
engine: place
tier: core
status: live
rev: 1
concepts: [shared-kitchen, per-minute-rental]
notes: [m01/what-a-bakery-cloud-is]
minutes: 8
brief: >-
  The bakery takes orders through two shop fronts and keeps its recipes in two stores, spread over Oven Row A and Oven Row B.
  Place each piece so customers reach the shop fronts, nobody outside reaches the recipes, and either oven row can fail.
  In this lab, a piece is reachable only from a subnet that holds a public route, in a network whose edge holds the internet gateway.
spec:
  containers:
    - { id: flourtown, label: Flourtown, kind: region }
    - { id: bakery-network, label: Bakery network, kind: vpc, parent: flourtown }
    - { id: bakery-edge, label: Network edge, kind: edge, parent: bakery-network, detail: Outside every subnet }
    - { id: oven-row-a, label: Oven Row A, kind: az, parent: bakery-network }
    - { id: public-a, label: Public subnet A, kind: subnet, parent: oven-row-a }
    - { id: private-a, label: Private subnet A, kind: subnet, parent: oven-row-a }
    - { id: oven-row-b, label: Oven Row B, kind: az, parent: bakery-network }
    - { id: public-b, label: Public subnet B, kind: subnet, parent: oven-row-b }
    - { id: private-b, label: Private subnet B, kind: subnet, parent: oven-row-b }
    - { id: not-used, label: Not used, kind: bench }
  pieces:
    - { id: front-one, label: First shop front }
    - { id: front-two, label: Second shop front }
    - { id: recipes-one, label: Recipe store }
    - { id: recipes-two, label: Recipe store copy }
    - { id: gateway, label: Internet gateway, role: internet-gateway }
    - { id: route-a, label: Public route A, role: public-route }
    - { id: route-b, label: Public route B, role: public-route }
    - { id: mixer, label: Spare mixer, detail: Nothing in the bakery needs it }
  failures: [oven-row-a, oven-row-b]
  constraints:
    - { kind: public, goal: g1, pieces: [front-one, front-two] }
    - { kind: private, goal: g2, pieces: [recipes-one, recipes-two] }
    - { kind: survive, goal: g3, pieces: [front-one, front-two], min: 1 }
    - { kind: survive, goal: g3, pieces: [recipes-one, recipes-two], min: 1 }
    - { kind: in, goal: g3, pieces: [mixer], within: [not-used] }
goals:
  - id: g1
    label: Customers reach both shop fronts
    hint: Ask what a customer's request needs on its way in, at the network edge and in the subnet.
  - id: g2
    label: Nobody outside reaches the recipe stores
    hint: Ask which subnets have a public route, and keep the recipes away from them.
  - id: g3
    label: Either oven row can fail, and nothing spare runs
    hint: Ask what still runs when one oven row goes dark, and whether anything placed has no job.
solution:
  - { t: place, piece: gateway, slot: bakery-edge }
  - { t: place, piece: route-a, slot: public-a }
  - { t: place, piece: front-one, slot: public-a }
  - { t: place, piece: recipes-one, slot: private-a }
  - { t: place, piece: route-b, slot: public-b }
  - { t: place, piece: front-two, slot: public-b }
  - { t: place, piece: recipes-two, slot: private-b }
  - { t: place, piece: mixer, slot: not-used }
wrongPaths:
  - mistake: Leaves the internet gateway unused, as if a public route were enough
    failsGoal: g1
    actions:
      - { t: place, piece: gateway, slot: not-used }
      - { t: place, piece: route-a, slot: public-a }
      - { t: place, piece: front-one, slot: public-a }
      - { t: place, piece: recipes-one, slot: private-a }
      - { t: place, piece: route-b, slot: public-b }
      - { t: place, piece: front-two, slot: public-b }
      - { t: place, piece: recipes-two, slot: private-b }
      - { t: place, piece: mixer, slot: not-used }
  - mistake: Puts a recipe store in a public subnet to keep it near the shop front
    failsGoal: g2
    actions:
      - { t: place, piece: gateway, slot: bakery-edge }
      - { t: place, piece: route-a, slot: public-a }
      - { t: place, piece: front-one, slot: public-a }
      - { t: place, piece: recipes-one, slot: public-a }
      - { t: place, piece: route-b, slot: public-b }
      - { t: place, piece: front-two, slot: public-b }
      - { t: place, piece: recipes-two, slot: private-b }
      - { t: place, piece: mixer, slot: not-used }
  - mistake: Puts both shop fronts in one oven row
    failsGoal: g3
    actions:
      - { t: place, piece: gateway, slot: bakery-edge }
      - { t: place, piece: route-a, slot: public-a }
      - { t: place, piece: front-one, slot: public-a }
      - { t: place, piece: recipes-one, slot: private-a }
      - { t: place, piece: route-b, slot: public-b }
      - { t: place, piece: front-two, slot: public-a }
      - { t: place, piece: recipes-two, slot: private-b }
      - { t: place, piece: mixer, slot: not-used }
debrief:
  lines:
    - A shop front is reachable only when its subnet routes to an internet gateway at the network edge.
    - A recipe store in a subnet with no public route stays out of reach from outside.
    - One copy of each piece in each oven row keeps the bakery open when either row fails.
  questions: [q-b4k7m2, q-d9p4r6]
```

### Module 4: Survive an AZ outage

Use the id `lab-m04-survive-an-az-outage` in `content/labs/04-going-global/survive-an-az-outage.yaml`.
Declare one `region` with a made-up name, holding a Region-wide `edge` slot for the load balancer and three `az` slots with made-up names, plus a bench.
The pieces are a load balancer, three web servers, the order data primary and its copy, and two distractors: a web server in another Region and one bigger single instance.
List the three zones in `failures` and no Region failure, since going multi-Region is one debrief line, not a goal.
Goal g1 has an `in` constraint for the load balancer within the Region-wide slot and a `survive` constraint for the web servers with `min: 2`; g2 has a `survive` constraint for the primary and the copy with `min: 1`; g3 has an `in` constraint for both distractors within the bench.
Wrong paths: every web server in one zone (g1), the copy in the primary's zone (g2), and the bigger instance in a zone (g3).
Cite `m01/introduction-to-aws-global-infrastructure`, `m04/diving-deeper-into-aws-global-infrastructure` and `m02/directing-traffic-with-elastic-load-balancing`.
The notes do not say that a load balancer spans the zones, so the brief states the Region-wide slot as how this lab works.

### Module 5: Two tiers, two zones

Use the id `lab-m05-two-tiers-two-zones` in `content/labs/05-networking/two-tiers-two-zones.yaml`.
Declare a `region` holding a `vpc`, an `edge` slot directly under the VPC, two `az` containers each with a public and a private `subnet` slot, and a bench.
Give the VPC and the subnets made-up address ranges in their labels or details, never the VPC demo's 10.0.0.0/16 or its names.
The pieces are two web servers, a database primary and its standby, an internet gateway (`role: internet-gateway`), two public route tables (`role: public-route`), and three bench distractors: a virtual private gateway, a NAT gateway and a route table with only the local route.
List the two zones in `failures`.
Goal g1 has a `public` constraint for the web servers; g2 has a `private` constraint for the databases; g3 has a `survive` constraint for the web servers and one for the databases, each with `min: 1`, and an `in` constraint for the distractors within the bench.
Wrong paths: the internet gateway placed while both public route tables sit on the bench (g1), a database in a public subnet (g2), and both web servers in one zone (g3).
Cite `m05/amazon-vpc-demo`, `m05/subnets-security-groups-and-network-access-control-lists`, `m05/organizing-aws-cloud-resources` and `m01/introduction-to-aws-global-infrastructure`.

### Module 8: Build the sales pipeline

Use the id `lab-m08-build-the-sales-pipeline` in `content/labs/08-ai-ml-and-data-analytics/build-the-sales-pipeline.yaml`.
Declare five top-level `stage` slots in this order, ingest, store, catalog, query and visualize, and a bench, with no failures.
The pieces are one right service per stage and distractors for the bench, such as Amazon OpenSearch Service and Amazon EMR.
The brief states the real-time till feed and the managers' dashboards that pin those choices.
Goal g1 has an `in` constraint for the ingest and store services within their stages; g2 one for AWS Glue Data Catalog and the query service within theirs; g3 one for Amazon Quick Sight within visualize and one for the distractors within the bench.
Wrong paths: Amazon EMR in the ingest stage with the streaming service on the bench, which misses the real-time till feed (g1), the Data Catalog in the query stage (g2), the Data Catalog on the bench (g2), and Amazon OpenSearch Service in visualize (g3).
Write Amazon Quick Sight with a space in every label, as the exam guide update line in `m08/data-pipelines-on-aws` names it, and tell a cafe sales story, never the lesson's own shop example.
Cite `m08/data-pipelines-on-aws`, `m08/data-analytics-and-ai-ml` and `m08/introduction-to-data-analytics`.

## Trace labs

A Trace spec has one of two kinds, `network` or `policy`; `TraceSpec` in `schemas/lab-trace.ts` is the shape, `traceCase` in `src/labs/trace/model.ts` is how each case is stepped, and `bakeryTraceLab` and `bakeryPolicyLab` in `tests/fixtures/lab-trace.ts` are the bakery labs the unit tests check.
The learner never types a rule: every rule or statement is a fixed candidate with its `on` value at the start, and the only actions are `{ t: toggle, rule, on }` and `{ t: reset }`.
A case names its goal, a label, the request, and the result it should get, `expect: allow` or `expect: deny`, and a goal passes when every one of its cases gets its expected result.
Any set of switches is a finished board, so a wrong path is just the toggles of its mistake.
Write `minutes` from 6 to 10.

A `network` spec puts one security group `sg` and one network ACL `nacl` around one `target` instance, each with up to 12 rules, and has up to 8 `cases`.
A security group rule is `{ id, dir, proto, from, to, cidr, on }` and only allows; a network ACL rule adds a rule number `n` and an `action` of `allow` or `deny`.
Use `proto: all` only with `from: 0` and `to: 65535`.
A network case is `{ id, goal, label, dir, proto, ip, port, reply, expect }`, where `port` is the request's port and `reply` the port its answer goes back to.
An inbound case is checked at the network ACL inbound, then the security group inbound, then its reply at the security group outbound, which always lets a reply out because security groups are stateful, and at the network ACL outbound on the `reply` port, because network ACLs are stateless.
An outbound case runs the security group outbound, the network ACL outbound, then the network ACL inbound on the reply port, and the security group inbound lets the reply in.
The network ACL tries its enabled rules of one direction from the lowest rule number up, the first match decides, and no match is denied by the final `*` rule; a security group with no enabled matching rule denies.
The first denial drops the packet, and the later steps are skipped.

A `policy` spec has `principals`, `groups`, an optional organization tree `org`, `policies` and `cases`.
A policy is `{ id, label, kind, attach, statements }`: an `iam` policy attaches to a principal or a group, and an `scp` policy attaches to an organization node.
A statement is `{ id, effect, actions, resources, on }`, where `*` matches any run of characters, actions match ignoring letter case and resources match exactly.
A policy case is `{ id, goal, label, principal, action, resource, expect }` and carries no conditions, so write a Region or any other limit into the action or the resource, or leave it out.
For each organization node from the root down to the principal's account, the enabled SCP statements there give a deny on a matching Deny, else an allow on a matching Allow, else no match; the principal's identity statements, its own and its groups', give the same three verdicts.
A case is denied when any step is a deny, since an explicit deny wins, and denied when any step has no match, since an SCP that does not allow an action blocks it and an identity with no Allow is denied by default; otherwise it is allowed.
Every organization node needs an SCP that allows the action, as the default full-access policy does, so give each node an allow-all statement (`*` on `*`) unless the lesson removes it; the schema rejects a node with no SCP.
Whenever the org is not empty, every principal names its member `account`, a node with no nodes below it.
The management account is not modelled: it is never an org node and never a case principal.

The notes teach few of these mechanics, so the brief states the ones a lab relies on as how this lab works: the network ACL rule order, the reply ports, explicit deny over allow, and SCPs intersecting identity policies.

This complete example is another `network` Trace lab in the made-up bakery world of the test fixtures, and R11 replays it clean; your labs are set in the cafe instead.

```yaml
id: lab-m01-bakery-window
module: 1
title: Open the order window
engine: trace
tier: core
status: live
rev: 1
concepts: [shared-kitchen, per-minute-rental]
notes: [m01/what-a-bakery-cloud-is]
minutes: 7
brief: >-
  Customers cannot order through the bakery's order window, and the bakers want SSH from their office only.
  Switch rules on or off until every case gets its expected result.
  In this lab, the network ACL tries its rules from the lowest number up and checks each reply again on its reply port, while the security group lets replies out on its own.
spec:
  kind: network
  target: Order window
  sg:
    label: window-sg
    rules:
      - { id: sg-https-any, dir: in, proto: tcp, from: 443, to: 443, cidr: 0.0.0.0/0, on: false }
      - { id: sg-ssh-any, dir: in, proto: tcp, from: 22, to: 22, cidr: 0.0.0.0/0, on: false }
      - { id: sg-ssh-office, dir: in, proto: tcp, from: 22, to: 22, cidr: 192.0.2.0/24, on: true }
  nacl:
    label: front-acl
    rules:
      - { id: acl-block-list, n: 90, dir: in, proto: all, from: 0, to: 65535, cidr: 198.51.100.0/24, action: deny, on: true }
      - { id: acl-https-in, n: 100, dir: in, proto: tcp, from: 443, to: 443, cidr: 0.0.0.0/0, action: allow, on: true }
      - { id: acl-ssh-in, n: 110, dir: in, proto: tcp, from: 22, to: 22, cidr: 0.0.0.0/0, action: allow, on: true }
      - { id: acl-replies-out, n: 100, dir: out, proto: tcp, from: 1024, to: 65535, cidr: 0.0.0.0/0, action: allow, on: false }
  cases:
    - { id: customer-https, goal: g1, label: A customer orders over HTTPS, dir: in, proto: tcp, ip: 203.0.113.10, port: 443, reply: 49152, expect: allow }
    - { id: blocked-https, goal: g1, label: A blocked address tries HTTPS, dir: in, proto: tcp, ip: 198.51.100.7, port: 443, reply: 50211, expect: deny }
    - { id: stranger-ssh, goal: g2, label: A stranger tries SSH, dir: in, proto: tcp, ip: 203.0.113.10, port: 22, reply: 50733, expect: deny }
    - { id: office-ssh, goal: g2, label: The office signs in over SSH, dir: in, proto: tcp, ip: 192.0.2.15, port: 22, reply: 51022, expect: allow }
goals:
  - id: g1
    label: Customers order, and the blocked address stays out
    hint: Follow a customer's order in and its answer back out, and ask which layer remembers the request.
  - id: g2
    label: SSH reaches the order window from the office only
    hint: Ask which layer guards this one instance, and keep it as narrow as the office.
solution:
  - { t: toggle, rule: sg-https-any, on: true }
  - { t: toggle, rule: acl-replies-out, on: true }
wrongPaths:
  - mistake: Opens the security group but forgets that the network ACL checks replies too
    failsGoal: g1
    actions:
      - { t: toggle, rule: sg-https-any, on: true }
  - mistake: Opens SSH to the whole internet to get the office in
    failsGoal: g2
    actions:
      - { t: toggle, rule: sg-https-any, on: true }
      - { t: toggle, rule: acl-replies-out, on: true }
      - { t: toggle, rule: sg-ssh-any, on: true }
debrief:
  lines:
    - The security group remembers a request it let in, so the reply leaves on its own.
    - The network ACL checks the reply again, so it needs an outbound rule for the reply ports.
    - The lowest-numbered matching network ACL rule decides, so the block list wins over the HTTPS rule.
  questions: [q-b4k7m2, q-d9p4r6]
```

This complete example is another `policy` Trace lab in the same made-up bakery world, and R11 replays it clean too.

```yaml
id: lab-m01-bakery-badges
module: 1
title: Keys for the bakers
engine: trace
tier: core
status: live
rev: 1
concepts: [shared-kitchen, per-minute-rental]
notes: [m01/what-a-bakery-cloud-is]
minutes: 7
brief: >-
  Baker Mo cannot read the recipe cards, and the owner wants the bakers kept away from the money ledger.
  Switch statements on or off until every case gets its expected result.
  In this lab, an explicit Deny beats any Allow, and an action needs an Allow from the SCPs at every level of the organization and from Mo's own policies.
spec:
  kind: policy
  principals:
    - { id: baker-mo, label: Baker Mo, groups: [bakers], account: shop-east }
  groups:
    - { id: bakers, label: Bakers }
  org:
    - { id: bakery-org, label: Bakery organization }
    - { id: shops, label: Shops, parent: bakery-org }
    - { id: shop-east, label: East shop account, parent: shops }
  policies:
    - id: root-full-access
      label: Full access at the root
      kind: scp
      attach: bakery-org
      statements:
        - { id: root-all, effect: allow, actions: ['*'], resources: ['*'], on: true }
    - id: shops-full-access
      label: Full access for the shops
      kind: scp
      attach: shops
      statements:
        - { id: shops-all, effect: allow, actions: ['*'], resources: ['*'], on: true }
    - id: east-full-access
      label: Full access for the east shop
      kind: scp
      attach: shop-east
      statements:
        - { id: east-all, effect: allow, actions: ['*'], resources: ['*'], on: true }
    - id: no-oven-deletes
      label: No oven deletes in the shops
      kind: scp
      attach: shops
      statements:
        - { id: deny-oven-delete, effect: deny, actions: ['oven:Delete*'], resources: ['*'], on: true }
    - id: bakers-policy
      label: Bakers policy
      kind: iam
      attach: bakers
      statements:
        - { id: start-ovens, effect: allow, actions: [oven:StartBake], resources: [oven/*], on: true }
        - { id: read-recipes, effect: allow, actions: [recipes:GetCard], resources: [recipe-box/*], on: false }
        - { id: everything, effect: allow, actions: ['*'], resources: ['*'], on: false }
  cases:
    - { id: mo-reads-card, goal: g1, label: Mo reads the rye recipe card, principal: baker-mo, action: recipes:GetCard, resource: recipe-box/rye.txt, expect: allow }
    - { id: mo-starts-bake, goal: g1, label: Mo starts the morning bake, principal: baker-mo, action: oven:StartBake, resource: oven/east-2, expect: allow }
    - { id: mo-deletes-oven, goal: g2, label: Mo deletes an old oven, principal: baker-mo, action: oven:DeleteOven, resource: oven/east-1, expect: deny }
    - { id: mo-reads-ledger, goal: g2, label: Mo opens the money ledger, principal: baker-mo, action: ledger:GetPage, resource: ledger/march, expect: deny }
goals:
  - id: g1
    label: Mo reads the recipes and runs the ovens
    hint: Ask which statement gives the bakers exactly the reading they need, and whether every level of the organization still allows it.
  - id: g2
    label: Mo cannot delete ovens or open the ledger
    hint: Ask what an identity is allowed when no statement mentions the action at all.
solution:
  - { t: toggle, rule: read-recipes, on: true }
wrongPaths:
  - mistake: Switches off the shops' full access to stop oven deletes, which blocks every action in the shops
    failsGoal: g1
    actions:
      - { t: toggle, rule: read-recipes, on: true }
      - { t: toggle, rule: shops-all, on: false }
  - mistake: Gives the bakers every action on everything instead of the one read
    failsGoal: g2
    actions:
      - { t: toggle, rule: everything, on: true }
debrief:
  lines:
    - An action passes only when the SCPs at every level and the identity's own policies all allow it.
    - With no matching statement, the default deny keeps Mo out of the ledger.
    - The Deny in the shops' SCP stops oven deletes even when an identity policy allows everything.
  questions: [q-b4k7m2, q-d9p4r6]
```

### Module 5: Why can't customers reach the menu?

Use the id `lab-m05-reach-the-menu` in `content/labs/05-networking/reach-the-menu.yaml`, a `network` spec.
Put one security group and one network ACL around the menu web server.
The candidate security group rules are inbound TCP 443 from 0.0.0.0/0 (off at the start), inbound TCP 22 from 0.0.0.0/0 (the tempting fix, off) and inbound TCP 22 from the office range.
The candidate network ACL rules are inbound allow 443, inbound allow 22 from 0.0.0.0/0, and outbound allow 1024 to 65535 (off at the start, the stateless trap).
The network ACL lets SSH in from anywhere on purpose, so the security group alone decides who gets SSH; an office-only network ACL rule would deny the stranger before the security group, hide the g2 mistake, and fail R11.
The cases, each with a reply port, are a customer on TCP 443 (`expect: allow`, g1), anyone on TCP 22 (`expect: deny`, g2) and the office on TCP 22 (`expect: allow`, g2).
Wrong paths: the security group fixed with no network ACL reply rule (g1), and SSH opened to 0.0.0.0/0 in the security group (g2).
Take the office range and the customer addresses from the documentation ranges.
Cite `m05/subnets-security-groups-and-network-access-control-lists` and `m05/amazon-vpc-demo`.
The notes give no rule numbers and no reply ports, so the brief states the rule order and the reply port range as how this lab works.

### Module 9: Least privilege for the barista

Use the id `lab-m09-least-privilege-for-the-barista` in `content/labs/09-security/least-privilege-for-the-barista.yaml`, a `policy` spec with no org.
The principals are a barista in a baristas group, and a manager.
The candidate statements are an allow for reading the menu objects (off at the start), an allow for everything in Amazon S3 on every resource (the tempting fix, off), a deny for deleting menu objects, a broad deny on every menu action (the over-strict fix, off), and an allow for the manager to update the menu.
The cases are the barista reading the menu (allow, g1), the manager updating it (allow, g1), the barista deleting a menu object (deny, g2) and the barista reading the payroll file (deny, g2).
Wrong paths: the broad menu deny switched on to stop deletes, which also blocks reading because an explicit deny wins (g1), and the Amazon S3-wide allow switched on (g2).
Attach the barista's statements to the group, as the lesson prefers groups, and write actions in the `s3:GetObject` style on cafe resources, never the note's own example bucket.
Cite `m09/preventing-unauthorized-access` and `m09/introduction-to-security-on-aws`.
The notes teach the default deny but not that an explicit deny beats an allow, so the brief states it as how this lab works.

### Module 10: Does the SCP allow it?

Use the id `lab-m10-does-the-scp-allow-it` in `content/labs/10-monitoring-compliance-and-governance/does-the-scp-allow-it.yaml`, a stretch `policy` spec.
Declare an org root, an OU `shops` with two accounts and an OU `lab` with one account, six nodes in all, with an allow-all SCP on each node unless the lesson replaces it with a narrower allow, plus the lesson's Deny.
Give each principal a member account and an identity policy; cases name member accounts only and carry no conditions, so a Region rule is written into the action or the resource, or dropped.
The management account is never an org node or a case principal.
Include a case the identity policy allows but an SCP does not, and a case the SCP Deny blocks.
Give every goal a wrong path, such as switching on an identity Allow and expecting it to pass an SCP that does not allow the action, or removing the Deny.
Cite `m10/aws-organizations` and `m09/preventing-unauthorized-access`.
The notes do not say that SCPs intersect identity policies or grant nothing on their own, so the brief states both as how this lab works.

## Investigate labs

An Investigate spec is a `source` caption, optional `columns` and `records`, an optional `listing`, and `questions`; `InvestigateSpec` in `schemas/lab-investigate.ts` is the shape, `src/labs/investigate/model.ts` is how answers are checked, and `bakeryInvestigateLab` in `tests/fixtures/lab-investigate.ts` is the bakery lab the unit tests check.
Records are rows of made-up evidence: each has an `id` and one cell per column, and a column with `filter: true` lets the learner narrow the rows to one value of it.
Filters match exact values only, so a time window is a column of exact values such as an hour, and filters never change a check.
A `listing` shows up to 40 plain lines of a made-up document, such as a template, under its `label`, and a lab may have a listing and no records.
Each question has a `goal`, a `prompt`, 2 to 8 `options` with ids and labels, and the `answer` option id, and a goal passes when every one of its questions holds its answer.
A lab has at most 8 questions and 5 goals.
Actions are `{ t: filter, column, value }`, `{ t: unfilter, column }`, `{ t: answer, question, option }` and `{ t: reset }`; the board is finished when every question has an answer, so every wrong path answers every question.
Write every time in UTC with the `UTC` suffix, and say in the brief that times are in UTC.
Make each answer unique and exact from the records or the listing: one option is right, and the evidence rules out every other.
Use only made-up people, IP addresses from the documentation ranges 192.0.2.0/24, 198.51.100.0/24 and 203.0.113.0/24, and documentation-style account ids such as 111122223333.
Write `minutes` from 5 to 10.
The notes do not say which events a trail log holds or what a template's type names are, so the brief states the ones a lab relies on as how this lab works.

This complete example is another Investigate lab in the made-up bakery world of the test fixtures, and R11 replays it clean; your labs are set in the cafe instead.

```yaml
id: lab-m01-bakery-starter
module: 1
title: Who emptied the starter jar?
engine: investigate
tier: core
status: live
rev: 1
concepts: [shared-kitchen, per-minute-rental]
notes: [m01/what-a-bakery-cloud-is]
minutes: 6
brief: >-
  The sourdough starter jar was found empty this morning, and the oven ledger recorded every action in the bakery.
  Filter the ledger and answer who emptied the jar, how and when.
  All times are in UTC.
spec:
  source: Oven ledger, harbour branch, 2 March, times in UTC
  columns:
    - { id: time, label: Time (UTC) }
    - { id: who, label: Who, filter: true }
    - { id: event, label: Event, filter: true }
    - { id: item, label: Item }
    - { id: result, label: Result, filter: true }
  records:
    - { id: r1, cells: { time: '05:58 UTC', who: baker-mo, event: SignIn, item: till, result: done } }
    - { id: r2, cells: { time: '06:05 UTC', who: baker-mo, event: ReadRecipe, item: rye-card, result: done } }
    - { id: r3, cells: { time: '06:40 UTC', who: helper-jo, event: SignIn, item: till, result: done } }
    - { id: r4, cells: { time: '06:52 UTC', who: helper-jo, event: EmptyJar, item: starter-jar, result: denied } }
    - { id: r5, cells: { time: '07:10 UTC', who: baker-mo, event: StartOven, item: oven-2, result: done } }
    - { id: r6, cells: { time: '07:31 UTC', who: owner-lu, event: SignIn, item: till, result: done } }
    - { id: r7, cells: { time: '07:45 UTC', who: owner-lu, event: EmptyJar, item: starter-jar, result: done } }
    - { id: r8, cells: { time: '08:02 UTC', who: baker-mo, event: ReadRecipe, item: starter-card, result: done } }
  questions:
    - id: who
      goal: g1
      prompt: Who emptied the starter jar?
      options:
        - { id: baker-mo, label: baker-mo }
        - { id: helper-jo, label: helper-jo }
        - { id: owner-lu, label: owner-lu }
      answer: owner-lu
    - id: what
      goal: g1
      prompt: Which event emptied the jar?
      options:
        - { id: start-oven, label: StartOven }
        - { id: empty-jar, label: EmptyJar }
        - { id: read-recipe, label: ReadRecipe }
      answer: empty-jar
    - id: when
      goal: g2
      prompt: When was the jar emptied?
      options:
        - { id: t0652, label: '06:52 UTC' }
        - { id: t0745, label: '07:45 UTC' }
        - { id: t0802, label: '08:02 UTC' }
      answer: t0745
goals:
  - id: g1
    label: Name who emptied the jar and how
    hint: Read the result of each attempt, since a denied attempt changed nothing.
  - id: g2
    label: Pin down when the jar was emptied
    hint: Take the time of the attempt that worked, not the first one you see.
solution:
  - { t: filter, column: event, value: EmptyJar }
  - { t: answer, question: who, option: owner-lu }
  - { t: answer, question: what, option: empty-jar }
  - { t: answer, question: when, option: t0745 }
wrongPaths:
  - mistake: Names the baker whose attempt was denied
    failsGoal: g1
    actions:
      - { t: answer, question: who, option: helper-jo }
      - { t: answer, question: what, option: empty-jar }
      - { t: answer, question: when, option: t0745 }
  - mistake: Takes the time of the denied attempt
    failsGoal: g2
    actions:
      - { t: answer, question: who, option: owner-lu }
      - { t: answer, question: what, option: empty-jar }
      - { t: answer, question: when, option: t0652 }
debrief:
  lines:
    - A ledger answers who, what and when only when you read each row's result as well.
    - A denied attempt is evidence of intent, not of the change itself.
  questions: [q-b4k7m2, q-d9p4r6]
```

### Module 10: Who deleted the menu bucket?

Use the id `lab-m10-who-deleted-the-menu-bucket` in `content/labs/10-monitoring-compliance-and-governance/who-deleted-the-menu-bucket.yaml`.
Write a trail log of 10 to 14 made-up management-event records on one day, in UTC, with columns such as time, hour, user, event, source IP and result, and no object-level rows.
Filter on exact values only: `hour`, `user`, `event` and `result`.
Ask who, what, when and from where, and optionally which service records this (AWS CloudTrail, not Amazon CloudWatch Logs), in at most 5 goals.
Include a denied delete attempt by another user as the red herring.
Give every goal a wrong path: the denied attempt's user as who, a wrong time, and Amazon CloudWatch Logs as the recorder when the lab asks which service records it.
Cite `m10/aws-cloudtrail`, `m10/amazon-cloudwatch` and `m06/amazon-simple-storage-service-amazon-s3`.
The notes say the event history keeps management events but not which events those are, so the brief states that this log holds management events such as a bucket delete as how this lab works.

### Module 13: Well-Architected review of the cafe

Use the id `lab-m13-well-architected-review` in `content/labs/13-well-architected-solutions/well-architected-review.yaml`.
Write exactly six findings as records, one per pillar, and state the framing of each rightsizing finding, capacity fit or spend, so it has one pillar.
Ask six "which pillar" questions, three in g1 and three in g2, and one or two fix questions in g3, 8 questions at most, with the six pillar names as option labels.
Wrong paths: Performance Efficiency for the spend finding in one of g1 and g2, Cost Optimization for the capacity-fit finding in the other, and a wrong fix (g3).
Cite `m13/aws-well-architected-framework` and `m13/introduction-to-well-architected-solutions`, and never reuse the lesson's worked example rows.

### Module 4: What will this template create?

Use the id `lab-m04-what-will-this-template-create` in `content/labs/04-going-global/what-will-this-template-create.yaml`, a stretch lab.
Write a `listing` of up to 40 lines of a made-up template, with a parameter that picks test or production, a few resources and an output, and no records.
Ask what the template creates: how many instances one environment gets, which port the security group opens, and what a second deployment in another Region creates.
Give every goal a wrong path, such as counting an instance only the other environment creates, or thinking a second deployment changes the first.
Cite `m04/infrastructure-and-automation`, plus `m02/introduction-to-amazon-ec2` and `m06/amazon-simple-storage-service-amazon-s3` when a question rests on them.
The notes teach no template syntax, so the brief states the type names the template uses, such as `AWS::EC2::Instance`, as how this lab works.

## Stretch labs

A stretch lab meets the same bar as a core lab: grounded in its notes, original, set in the cafe, with a wrong path for every goal and a debrief on its own concepts.
Only its `tier: stretch` differs, and the cut rule drops stretch labs before any core lab.
Sort and Configure stretch labs use those engines unchanged, as the Sort example and `## Configure labs` describe.
Simulate stretch labs copy every number from their row of `SIM_LABS` in `tests/content/sim-labs.test.ts`, as `## Simulate labs` says, and write only the text.
The stretch labs of Place, Trace and Investigate have their plans in those sections above.

### Module 2: Pay less for beans

Use the id `lab-m02-pay-less-for-beans` in `content/labs/02-compute-in-the-cloud/pay-less-for-beans.yaml`, with the `purchase` model.
Copy its row of `SIM_LABS`: four workloads (the till and order server, weekend roast planning, a holiday promo site and loyalty software licensed per physical server), the six purchase options as choices, and the goals on the yearly total with the cost of the roast planning, the jobs Spot may stop and the hardware needs.
Use the current names On-Demand Instances, Reserved Instances, Savings Plans, Spot Instances, Dedicated Instances and Dedicated Hosts.
Cite `m02/amazon-ec2-pricing`, including its exam guide update lines on Savings Plans and Reserved Instance flexibility.

### Module 2: Queue, topic or event bus

Use the id `lab-m02-queue-topic-or-event-bus` in `content/labs/02-compute-in-the-cloud/queue-topic-or-event-bus.yaml`.
Declare three buckets, Amazon SQS, Amazon SNS and Amazon EventBridge, and 8 to 12 cafe cards.
Order tickets held until a barista is free belong to the queue, one menu change sent to the app, the email list and the signage belongs to the topic, and events from many sources routed by rule belong to the event bus.
List an `also` bucket only where `m02/messaging-and-queuing` lets two services do the job.

### Module 5: Connect the shops

Use the id `lab-m05-connect-the-shops` in `content/labs/05-networking/connect-the-shops.yaml`.
Declare up to eight buckets from the connectivity lessons: AWS Client VPN, AWS Site-to-Site VPN, AWS Direct Connect, AWS PrivateLink, AWS Transit Gateway, internet gateway and NAT gateway.
Write cafe cards for them, such as a remote barista's laptop, a shop's office router, the roastery's steady private high-bandwidth link, many shop VPCs joined at one hub, private access to a supplier's service, and private instances fetching updates.
Name the two VPN services by their full names and never as one "AWS VPN", since no note carries an exam guide update line for that name.
Cite `m05/more-ways-to-connect-to-the-aws-cloud`, `m05/organizing-aws-cloud-resources` and `m05/global-architectures`.

### Module 6: Lose the instance

Use the id `lab-m06-lose-the-instance` in `content/labs/06-storage/lose-the-instance.yaml`, with the `data-loss` model.
Copy its row of `SIM_LABS`: the order store is a choice of instance store or Amazon EBS, snapshots run every so many hours, and the goals bound the orders lost at the planned stop, the orders lost with the zone and the snapshot cost.
Cite `m06/ec2-instance-store-and-amazon-elastic-block-store-amazon-ebs` and `m06/amazon-elastic-block-store-amazon-ebs-data-lifecycle`.

### Module 7: Who manages what?

Use the id `lab-m07-who-manages-what` in `content/labs/07-databases/who-manages-what.yaml`.
Declare three buckets, unmanaged, managed and fully managed, and 8 to 12 cards: a database on Amazon EC2, Amazon RDS, Amazon DynamoDB and AWS Lambda, plus duty cards for each, such as patching the database engine on an EC2 instance or writing the function code.
No card may claim that AWS does nothing for Amazon EC2, since AWS still runs the physical layer under it.
Cite `m03/introduction-to-serverless-computing`, `m07/introduction-to-databases`, `m07/nosql-database-services` and `m03/aws-lambda`.

### Module 9: Lock the root user

Use the id `lab-m09-lock-the-root-user` in `content/labs/09-security/lock-the-root-user.yaml`; it fits the Configure spec unchanged.
Declare a toggle for MFA on the root user, initially off, a select for root access keys (none, keep the existing one, create one for the command line), a select for daily sign-in (the root user, an IAM user in an admin group, AWS IAM Identity Center), a select for the root password, and a select for what the IAM password policy covers.
Goals: g1 root sign-in is protected, with MFA, a long unique password and a password policy that covers IAM users only; g2 no long-term root credentials exist; g3 daily work stays off the root user.
Wrong paths: MFA left off (g1), the root access key kept for the command line (g2), and daily sign-in as the root user (g3).
Cite `m09/preventing-unauthorized-access`, including its exam guide update lines on password policies and access keys.

### Module 12: CAF perspectives

Use the id `lab-m12-caf-perspectives` in `content/labs/12-migrating-to-the-aws-cloud/caf-perspectives.yaml`.
Declare six buckets, Business, People, Governance, Platform, Security and Operations, and two cafe migration tasks or roles per perspective, 12 cards in all.
A business analyst card may list Governance in `also`, since the note maps that role to both perspectives.
Cite `m12/aws-cloud-adoption-framework`.
````

- [ ] **Step 6: Append the critic's Place, Trace, Investigate and stretch criteria**

Append to the end of `agents/lab-critic.md`, after `## Simulate criteria` (Phase 4 Task 13):

````markdown
## Place criteria

Every constraint teaches the lesson the lab cites, and you name the note line, or the mechanic the brief states, behind each one.
Survival goals cover every failure the brief names, and `failures` lists exactly those containers.
The bench holds only the distractors, so no piece the lesson needs meets its goal from the bench.
Each distractor that must stay off the board has an `in` constraint within the bench, so placing it anywhere else fails a goal.
Each wrong path places every piece and fails its `failsGoal` because of the placement its `mistake` names.
Container and piece labels name the thing, never the verdict, and every Region and zone has a made-up name.

## Trace criteria

Step every case by hand through the semantics the brief states, hop by hop, and report any case whose `expect` contradicts them, or contradicts spec 5.1's order of explicit deny over allow over the implicit deny, as a `wrongPath` issue.
The candidate rules include the tempting wrong fix the lesson warns about, and a wrong path switches it on.
Every organization node carries an SCP, and no node or case is the management account.
The brief states, as how this lab works, each mechanic the lab relies on that the notes do not: the network ACL rule order, the reply ports, explicit deny over allow, and SCPs intersecting identity policies.
Every IP address comes from the documentation ranges, and every account id looks like 111122223333.

## Investigate criteria

Each answer is unique and exact from the records or the listing: answer every question from the evidence alone, and report any second defensible option as a `wrongPath` issue.
Every time is in UTC with the `UTC` suffix, and the brief says so.
The lab has at most 8 questions and 5 goals, and no prompt or option label gives its answer away.
No record holds a real account id, an IP address outside the documentation ranges, or a real person's name.
The brief states, as how this lab works, each mechanic the lab relies on that the notes do not, such as which events a trail log holds or the template's type names.

## Stretch criteria

Judge a stretch lab by the same bar as a core lab, and check that its `tier` is the one its row gives.
For a Sort, Configure or Simulate stretch lab, apply that engine's criteria above unchanged.
Report every issue with one of the six kinds in `## Return`.
````

- [ ] **Step 7: Add the four Phase 5 style rules**

In `content/STYLE.md`, insert this block inside `## Labs`, after the `### Simulate parameters` section (Phase 4 Task 13) and before `## Incidents` (Phase 4 Task 14), with one blank line before and after it:

````markdown
### Place containers and pieces

Label a container by the place it stands for and a piece by the thing it runs, never by the verdict.

- Good: `Harbour Zone B`, `Order database copy`.
- Bad: `Safe zone` names the verdict, and `Database (private)` gives the slot away.
- Name the bench `Not used`, and give every Region and zone a made-up name, never a real code.

### Trace rules and cases

A case label says who asks for what, and the expected result lives only in `expect`.

- Good: `A customer orders over HTTPS`.
- Bad: `Customer HTTPS should pass` gives the result away.
- Offer rules a learner could really choose, the tempting wrong fix included.

### Investigate records and questions

Records read like a real log or report, with made-up names and every time in UTC with the `UTC` suffix.

- Good: `09:42 UTC`, `barista-sam`, `203.0.113.24`.
- Bad: `9:42 in the morning`, a colleague's real name, or an address outside the documentation ranges.
- Write each question so the evidence leaves exactly one option right.

### Engine rules beyond the notes

When a lab relies on an engine rule the cited notes do not state, the brief states it as how this lab works, and no note is edited.

- Good: `In this lab, the network ACL tries its rules from the lowest number up.`
- Bad: a hint that says the lesson teaches rule numbers when no cited note does.
- This covers network ACL rule order, reply ports, explicit deny over allow, SCPs intersecting identity policies, CloudFormation type names and CloudTrail management events.
````

- [ ] **Step 8: Run the tests, the Markdown check and the content check, and see them pass**

```bash
pnpm test tests/unit/agents.test.ts 2>&1 | grep -E "FAIL|Tests "
python3 -I <scratchpad>/r8check.py agents/lab-writer.md agents/lab-critic.md content/STYLE.md
pnpm content:validate
pnpm typecheck
pnpm lint:fix
```

Expected: `Tests  39 passed (39)` and no `FAIL` line (more tests if Phase 6 has appended its own to this file); `r8check.py` prints nothing; `content:validate: 13 rules, 0 findings`; `tsc --noEmit` prints no error; Biome reports no change to the four files.
If a bakery example fails, the assertion names its R11 problem, such as `lab-m01-bakery-fronts: wrongPaths[2] (Puts both shop fronts in one oven row) meets g3, which it should fail`; fix the example, never the engine.

- [ ] **Step 9: Commit**

```bash
git add agents/lab-writer.md agents/lab-critic.md content/STYLE.md tests/unit/agents.test.ts
git commit -m "Teach the lab writers Place, Trace, Investigate and stretch labs" -m "Lab writer and lab critic move to version 2: the tier comes from the task, and each new engine has its shape, its rules and its criteria."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

---

## Task 10: The Phase 5 lab fan-out, waves `p5core` and `p5stretch`

**Files:**
- Create, wave `p5core` (the 7 core labs), one file per lab under `content/labs/`:
  - `04-going-global/survive-an-az-outage.yaml`, `05-networking/two-tiers-two-zones.yaml`, `08-ai-ml-and-data-analytics/build-the-sales-pipeline.yaml`
  - `05-networking/reach-the-menu.yaml`, `09-security/least-privilege-for-the-barista.yaml`
  - `10-monitoring-compliance-and-governance/who-deleted-the-menu-bucket.yaml`, `13-well-architected-solutions/well-architected-review.yaml`
- Create, wave `p5stretch` (the 9 stretch labs):
  - `02-compute-in-the-cloud/pay-less-for-beans.yaml`, `02-compute-in-the-cloud/queue-topic-or-event-bus.yaml`, `04-going-global/what-will-this-template-create.yaml`
  - `05-networking/connect-the-shops.yaml`, `06-storage/lose-the-instance.yaml`, `07-databases/who-manages-what.yaml`
  - `09-security/lock-the-root-user.yaml`, `10-monitoring-compliance-and-governance/does-the-scp-allow-it.yaml`, `12-migrating-to-the-aws-cloud/caf-perspectives.yaml`
- Create, outside the repo: `$SCRATCH/p5/phase5-labs.js` (the Workflow script, tool input, never committed); in each wave worktree the git-ignored `.results/lab-targets.json` and `.results/labs-content/<lab id>.md`
- Test: `pnpm --silent content:validate --draft <lab file>` per lab, `tests/content/labs-replay.test.ts` (one test per lab), `tests/content/sim-labs.test.ts` (the two stretch Simulate labs), and `pnpm check` through the pre-commit hook of every commit

This task is content, not code: the controller runs it with the Workflow tool, and its agents write, judge, replay and commit the lab files.
The plan does not hold the lab YAML.
The worked examples the writers follow are the complete made-up bakery labs that Task 9 prints as YAML in the `## Place labs`, `## Trace labs` and `## Investigate labs` sections of `agents/lab-writer.md`, beside one plan in engine terms per real lab: `lab-m01-bakery-fronts` (Place), `lab-m01-bakery-window` (Trace, network), `lab-m01-bakery-badges` (Trace, policy) and `lab-m01-bakery-starter` (Investigate), which Task 9's test replays under R11.
The prompt also names the unit tests' fixture labs, which keep their own ids: `bakeryPlaceLab` (`lab-m01-bakery-ovens`, Task 1, `tests/fixtures/lab-place.ts`), `bakeryTraceLab` (`lab-m01-bakery-door`) and `bakeryPolicyLab` (`lab-m01-bakery-keys`) (Task 2, `tests/fixtures/lab-trace.ts`), and `bakeryInvestigateLab` (`lab-m01-bakery-ledger`, Task 3, `tests/fixtures/lab-investigate.ts`).
The stretch Sort, Configure and Simulate labs follow Phase 4's examples (`bakeryLab`, `bakeryConfigureLab`, `bakerySimulateLab`), and each stretch Simulate lab copies its numbers from its `SIM_LABS` row (Task 5).

Design notes:
- The 16 labs and their binding id, file, engine, model, tier, wave and title live in the inner script's `ROWS`, with each lab's spec 5.2 scope and its `debriefModules`, the other modules that home the concepts the lab uses (from the labs-content map's debrief candidates).
- The script is Phase 4 Task 10's script with the changes listed in Step 4, so its phases, critic rounds, gate, sync and hooks behave exactly as they did for Phase 4.
- Both waves run one writer per lab, because the labs one module gets in a wave use different engines (Module 5's Place and Trace core labs, Module 2's Simulate and Sort stretch labs).
- Each writer gets the `--lab-targets` entry of its lab's own module first, then the entry of each module in `debriefModules`, so it can cite notes and pick live practice debrief ids for concepts homed elsewhere (for example `availability-zones`, homed in Module 1, for Survive an AZ outage); the script stops when a lab's own module has no entry.
- Each writer also reads its lab's section of the scout map `maps/labs-content.md`, which Step 3 splits into the worktree's git-ignored `.results/labs-content/<lab id>.md`, only for its grounding flags and note lines; where the map's id, file, filters, question count or org shape differs from the row or from the lab's plan in `agents/lab-writer.md`, the row and the plan win, and nothing in it is text to copy.
- The writer's tier comes from its row (`This lab has tier: core` or `stretch`), as the version 2 writer prompt of Task 9 expects; every lab keeps `rev: 1` through the revise rounds, because no lab is committed before its wave's Commit phase.
- Each round runs the critics, then the gate, and only then the revisers, so every lab that ships was approved and replayed in the same state.
- A lab ships only when approved and in `replayOk`; after three rounds, or once a round ends past its wave's last rewrite day (`p5core` Sunday, November 1; `p5stretch` Tuesday, November 3), a failing lab moves under `.results/labs/held/`, stays uncommitted and comes back as `{ lab, kinds }`.
- A held stretch lab is cut (spec 10.2, K13).
- A held core lab blocks the 26-lab exit: the controller reports it to Dani the same day, fixes it by hand from the critic's issues on Monday, November 2, has a fresh `lab-critic` judge the fixed file and runs its `--draft` check, and when it still fails, Task 11 takes its below-26 path.
- Commits are one per lab: `Add the Place lab for Module 4` for a core lab, `Add the stretch Sort lab for Module 2` for a stretch lab, each with the body `1 lab; its solution and its <W> wrong paths replay.`, where `W` comes from `grep -c 'failsGoal:'`.
- Wave `p5core` merges only once Tasks 6, 7 and 8 are on `master`, so no shipped lab lacks its view, and Task 11 runs right after that merge.
- Wave `p5stretch` merges after the Task 11 gate as a content-only follow-up, with no version bump, after one `pnpm verify` on the merged result, and only before its hard cut of Wednesday, November 4 at 18:00 local; a branch not merged by then waits until after November 14.
- The two waves run at the same time in their own worktrees, and wave `p5stretch` never waits for wave `p5core`.
- Labs and debriefs draw only on the live practice pool: `--lab-targets` lists practice ids and types only, `HOOKS` and `NEVER_READ_LAB` keep every agent away from the exam pool, the course text, the fingerprints and the check keys, and no agent quotes an exam item.
- Budget: wave `p5core` about 7 writers, 7 to 14 critics, 2 to 3 gates, about 4 revisers, 1 sync, 7 commits and 1 final, about 35 agents; wave `p5stretch` about 45.
- Covers P5-001 to P5-004, P5-011, P5-048 to P5-050, P5-052 to P5-056, P5-059 to P5-061, P5-094, P5-097 to P5-101 and P5-L01 to P5-L16.

- [ ] **Step 1: The outer stream for the controller's build script**

The controller runs Steps 2 to 9 from its own build script, as Phase 4 Task 10 Step 10 runs its waves; this stream uses that script's `agent`, `workflow`, `merge`, `section`, `merges`, `log`, `SCR`, `REPO` and `ENV`, and `g6`, `g7`, `g8`, `g9` and `g11` are its gates (made with its `gate()` helper) that resolve true when Tasks 6, 7, 8 and 9 and the Task 11 release commit are on `master`:

```js
const LABS5 = `${SCR}/p5/phase5-labs.js`
const LABS5_WT = { p5core: `${SCR}/p5/wt-labs-core`, p5stretch: `${SCR}/p5/wt-labs-stretch` }
const LAB5_SETUP = {
  type: 'object',
  properties: { worktree: { type: 'string' }, head: { type: 'string' }, targetsJson: { type: 'string' } },
  required: ['worktree', 'head', 'targetsJson'],
}

/** Runs Steps 2 and 3 of Phase 5 Task 10 for one wave and returns the parsed `--lab-targets` array, or a reason. */
async function lab5Setup(wave) {
  const setup = await agent(`You run Steps 2 and 3 of Phase 5 Task 10 of CCP Study for wave ${wave} only, with BR and WT set as Step 2 gives them for that wave (read ${section(10)}). $SCRATCH is ${SCR} and $REPO is ${REPO}. ${ENV}
Return the absolute worktree path, the last line of git log --oneline -1 in it, and the full JSON array from .results/lab-targets.json as one string (it holds concept, note and practice ids and types only).`,
    { label: `labs5:setup:${wave}`, phase: 'Labs', schema: LAB5_SETUP })
  if (!setup) return { why: `wave ${wave} setup failed` }
  try {
    return { worktree: setup.worktree, head: setup.head, targets: JSON.parse(setup.targetsJson) }
  } catch (e) {
    return { why: `wave ${wave} targets did not parse: ${String(e).slice(0, 120)}` }
  }
}

/** One wave: setup, the Workflow run, then its merge once `ready` resolves true. */
async function lab5Wave(wave, ready, mergeStep) {
  if (!(await g9.p)) return { ok: false, why: 'Task 9 not merged' }
  const setup = await lab5Setup(wave)
  if (setup.why) return { ok: false, why: setup.why }
  log(`Labs ${wave}: worktree at ${setup.head}`)
  const run = await workflow({ scriptPath: LABS5 }, { worktree: setup.worktree, wave, targets: setup.targets })
  if (!run || run.stopped) return { ok: false, why: run ? run.stopped : 'no return', run }
  if (run.held.length > 0) log(`Labs ${wave}: held ${run.held.map((h) => h.lab).join(', ')}; report to Dani today`)
  if (!(await ready())) return { ok: false, why: `wave ${wave} is not ready to merge`, run }
  const branch = wave === 'p5core' ? 'content/phase-5-labs-core' : 'content/phase-5-labs-stretch'
  merges[wave] = await merge(branch, LABS5_WT[wave], `the Phase 5 ${wave === 'p5core' ? 'core' : 'stretch'} labs`, `Run Step ${mergeStep} of ${section(10)} exactly, with <n> = ${run.shipped.length} and <m> = the number of modules those labs cover.`)
  return { ok: true, run }
}

const labsCore = lab5Wave('p5core', async () => (await g6.p) && (await g7.p) && (await g8.p), 7)
const labsStretch = lab5Wave('p5stretch', async () => g11.p, 9)
```

Expected: both streams start the day `g9` resolves and run their workflows at the same time; `labsCore` merges once Tasks 6 to 8 are on `master` and then Task 11 runs; `labsStretch` merges after the gate, unless Step 9's date check finds the cut has passed, in which case its merge reports the cut and merges nothing.

- [ ] **Step 2: Make the wave worktrees once Task 9 is on `master`**

Run from the repository root, with `$SCRATCH` set to the controller's scratchpad directory and `$REPO` to the repository root, once per wave with these two variables:

- wave `p5core`: `BR=content/phase-5-labs-core` and `WT="$SCRATCH/p5/wt-labs-core"`
- wave `p5stretch`: `BR=content/phase-5-labs-stretch` and `WT="$SCRATCH/p5/wt-labs-stretch"`

```bash
git -C "$REPO" log master --oneline --grep "^Teach the lab writers Place, Trace, Investigate and stretch labs$" | head -1
git -C "$REPO" worktree add -b "$BR" "$WT" master
cd "$WT"
export PATH="/Users/danielchahine/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH"
node --version
pnpm install --frozen-lockfile | tail -3
git log --oneline -1
```

Expected: the first line is Task 9's commit; `Preparing worktree (new branch '<BR>')`; `v24.21.0`; the install ends with `Done`; the last line is Task 9's commit or a later `master` commit.
Both waves start the day Task 9 lands, since every engine, model and prompt section any row needs is on `master` by then.
No `.results/checks` copy is needed, because labs have no stamp.
Every agent of a wave works only in its own worktree.

- [ ] **Step 3: Write the lab targets and the scout notes**

In each wave worktree:

```bash
mkdir -p .results/labs-content
pnpm --silent content:report --lab-targets > .results/lab-targets.json
node -e "const t=JSON.parse(require('node:fs').readFileSync('.results/lab-targets.json','utf8'));console.log(t.length, t.every((e)=>e.concepts.length>0), t.reduce((n,e)=>n+e.labs.length,0))"
node --input-type=module -e '
import { readFileSync, writeFileSync } from "node:fs";
const map = readFileSync(process.argv[1], "utf8");
// The map proposed a longer id for the Module 5 Trace lab; the row id wins.
const rename = { "lab-m05-why-cant-customers-reach-the-menu": "lab-m05-reach-the-menu" };
let n = 0;
for (const part of map.split(/^(?=### \d+\.\d+ lab-)/m).slice(1)) {
  const id = part.match(/^### \d+\.\d+ (lab-[a-z0-9-]+)/)[1];
  writeFileSync(`.results/labs-content/${rename[id] ?? id}.md`, part.split(/^## /m)[0]);
  n++;
}
console.log(n);
' "$SCRATCH/p5/maps/labs-content.md"
ls .results/labs-content | wc -l
```

Expected: `13 true 19`, then `16`, then `16`: 13 modules, each with concepts, and Phase 4's 19 labs (fewer after a Phase 4 cut, more once one wave has merged into `master`), then one scout file per Phase 5 lab, named by its row id.
The targets file holds concept ids, names, note ids, tasks and live practice ids with their types, never question text; the scout files hold note paths, line numbers, grounding flags and practice ids, never course or exam text.

- [ ] **Step 4: Run wave `p5core` with the Workflow tool**

Save this script as `$SCRATCH/p5/phase5-labs.js` (outside the repo; it is tool input, not a repo file) and run it with the Workflow tool, with `args` = `{ "worktree": "<absolute path of $SCRATCH/p5/wt-labs-core>", "wave": "p5core", "targets": <the JSON array in that worktree's .results/lab-targets.json> }`.

It is Phase 4 Task 10's script (`$SCRATCH/p4/phase4-labs.js`) with these changes and no others:

- `meta` names it `phase5-labs`, and its description and the Commit phase say one commit per lab.
- `ENGINES` defaults to all six engines, and the `WAVES` table gives each wave its branch and last rewrite day; an unknown wave stops the run.
- `ROWS` holds only the 16 Phase 5 rows, each with `tier`, `wave` and `debriefModules`; `ENGINE_NAME` gains Place, Trace and Investigate.
- Rows are filtered by wave and engine, and every entry holds one lab, keyed by the lab id, with `targets` (its own module first, then its `debriefModules` in module order); `pad2`, used only by Phase 4's per-module keys and commit labels, is gone.
- The writer reads the per-engine schema file of a new engine, gets its entries and its scout file, and writes the tier its row gives.
- The critic's prompt names the lab's tier, so the version 2 critic can check it against the row (Task 9's `## Stretch criteria`).
- The Commit phase commits one lab at a time, sorted by module and then id, with the subject `Add the <Engine> lab for Module N` or `Add the stretch <Engine> lab for Module N`, and `COMMIT` returns `lab` instead of `module`.

```js
export const meta = {
  name: 'phase5-labs',
  description: 'Phase 5 labs: one lab writer per lab, a fresh critic per lab, an R11 replay gate, revise, a sync with master, one commit per lab',
  phases: [
    { title: 'Write', detail: 'one lab writer per writer entry' },
    { title: 'Critic', detail: 'one fresh lab critic per open lab, each round' },
    { title: 'Gate', detail: 'R11 replay and the content tests, no edits' },
    { title: 'Revise', detail: 'one lab writer per entry with an open lab' },
    { title: 'Sync', detail: 'merge master, then pnpm check' },
    { title: 'Commit', detail: 'one commit per lab, in module order' },
  ],
}

const WT = args.worktree
const WAVE = args.wave
const ENGINES = args.engines ?? ['sort', 'configure', 'simulate', 'place', 'trace', 'investigate']
const TARGETS = args.targets ?? []
const NODE = 'export PATH="/Users/danielchahine/.local/share/fnm/node-versions/v24.21.0/installation/bin:$PATH";'
const HOOKS = `Start every shell command with: cd "${WT}" && ${NODE} Work only in this worktree, never in any other checkout. Stage files by path, never with git add -A or git add .; when git reports an index.lock, wait a few seconds and retry. Never use --no-verify. Never use the em dash. Never add a Co-Authored-By line. Never commit unless your task says so. Never quote an exam item's stem, options, whys, takeaway, evidence or a failure reason in your reply, a log line or a commit message: name exam items by id and count only.`
const NEVER_READ_LAB = 'Never read the course source text, ~/Library/Application Support/ccp-study/, content/fingerprints/, any file under content/exam/, AWS exam questions, or .results/checks/keys.json.'
const CRITIC_ROUNDS = 3
const WAVES = { p5core: { branch: 'content/phase-5-labs-core', lastRewrite: '2026-11-01' }, p5stretch: { branch: 'content/phase-5-labs-stretch', lastRewrite: '2026-11-03' } }
const LAST_REWRITE_DAY = WAVES[WAVE]?.lastRewrite
const BRANCH = WAVES[WAVE]?.branch
const ENGINE_NAME = { sort: 'Sort', configure: 'Configure', simulate: 'Simulate', place: 'Place', trace: 'Trace', investigate: 'Investigate' }

/** The 16 Phase 5 labs (spec 5.2): the 7 core labs of wave p5core and the 9 stretch labs of wave p5stretch; id, file, tier and title are binding, and R1 requires id = lab-mNN-<file slug>. */
const ROWS = [
  { id: 'lab-m04-survive-an-az-outage', module: 4, file: '04-going-global/survive-an-az-outage.yaml', engine: 'place', tier: 'core', wave: 'p5core', title: 'Survive an AZ outage', scope: 'web tier and order data across the zones of one Region; any single zone fails', debriefModules: [1, 2, 11] },
  { id: 'lab-m05-two-tiers-two-zones', module: 5, file: '05-networking/two-tiers-two-zones.yaml', engine: 'place', tier: 'core', wave: 'p5core', title: 'Two tiers, two zones', scope: 'public web tier, private database, internet gateway and route, two zones', debriefModules: [1, 4] },
  { id: 'lab-m08-build-the-sales-pipeline', module: 8, file: '08-ai-ml-and-data-analytics/build-the-sales-pipeline.yaml', engine: 'place', tier: 'core', wave: 'p5core', title: 'Build the sales pipeline', scope: 'ingest, store, catalog, query and visualize stages', debriefModules: [6] },
  { id: 'lab-m05-reach-the-menu', module: 5, file: '05-networking/reach-the-menu.yaml', engine: 'trace', tier: 'core', wave: 'p5core', title: "Why can't customers reach the menu?", scope: 'security group against network ACL', debriefModules: [1] },
  { id: 'lab-m09-least-privilege-for-the-barista', module: 9, file: '09-security/least-privilege-for-the-barista.yaml', engine: 'trace', tier: 'core', wave: 'p5core', title: 'Least privilege for the barista', scope: 'IAM policy statements, default deny, least privilege', debriefModules: [] },
  { id: 'lab-m10-who-deleted-the-menu-bucket', module: 10, file: '10-monitoring-compliance-and-governance/who-deleted-the-menu-bucket.yaml', engine: 'investigate', tier: 'core', wave: 'p5core', title: 'Who deleted the menu bucket?', scope: 'CloudTrail events: who, what, when, from where', debriefModules: [6] },
  { id: 'lab-m13-well-architected-review', module: 13, file: '13-well-architected-solutions/well-architected-review.yaml', engine: 'investigate', tier: 'core', wave: 'p5core', title: 'Well-Architected review of the cafe', scope: 'six findings to the six pillars, then a fix', debriefModules: [] },
  { id: 'lab-m02-pay-less-for-beans', module: 2, file: '02-compute-in-the-cloud/pay-less-for-beans.yaml', engine: 'simulate', model: 'purchase', tier: 'stretch', wave: 'p5stretch', title: 'Pay less for beans', scope: 'On-Demand, Reserved, Savings Plans, Spot, Dedicated for 4 workloads', debriefModules: [] },
  { id: 'lab-m02-queue-topic-or-event-bus', module: 2, file: '02-compute-in-the-cloud/queue-topic-or-event-bus.yaml', engine: 'sort', tier: 'stretch', wave: 'p5stretch', title: 'Queue, topic or event bus', scope: 'Amazon SQS, Amazon SNS, Amazon EventBridge', debriefModules: [] },
  { id: 'lab-m04-what-will-this-template-create', module: 4, file: '04-going-global/what-will-this-template-create.yaml', engine: 'investigate', tier: 'stretch', wave: 'p5stretch', title: 'What will this template create?', scope: 'read a made-up CloudFormation template', debriefModules: [2, 5, 6] },
  { id: 'lab-m05-connect-the-shops', module: 5, file: '05-networking/connect-the-shops.yaml', engine: 'sort', tier: 'stretch', wave: 'p5stretch', title: 'Connect the shops', scope: 'connectivity options from the lesson', debriefModules: [] },
  { id: 'lab-m06-lose-the-instance', module: 6, file: '06-storage/lose-the-instance.yaml', engine: 'simulate', model: 'data-loss', tier: 'stretch', wave: 'p5stretch', title: 'Lose the instance', scope: 'instance store against EBS snapshots', debriefModules: [] },
  { id: 'lab-m07-who-manages-what', module: 7, file: '07-databases/who-manages-what.yaml', engine: 'sort', tier: 'stretch', wave: 'p5stretch', title: 'Who manages what?', scope: 'unmanaged, managed, fully managed for EC2, RDS, DynamoDB, Lambda', debriefModules: [2, 3] },
  { id: 'lab-m09-lock-the-root-user', module: 9, file: '09-security/lock-the-root-user.yaml', engine: 'configure', tier: 'stretch', wave: 'p5stretch', title: 'Lock the root user', scope: 'MFA, no root access keys, daily work off root', debriefModules: [] },
  { id: 'lab-m10-does-the-scp-allow-it', module: 10, file: '10-monitoring-compliance-and-governance/does-the-scp-allow-it.yaml', engine: 'trace', tier: 'stretch', wave: 'p5stretch', title: 'Does the SCP allow it?', scope: 'SCPs on the root, an OU and an account intersected with IAM', debriefModules: [9] },
  { id: 'lab-m12-caf-perspectives', module: 12, file: '12-migrating-to-the-aws-cloud/caf-perspectives.yaml', engine: 'sort', tier: 'stretch', wave: 'p5stretch', title: 'CAF perspectives', scope: 'the six perspectives', debriefModules: [] },
]

if (!WT) return { stopped: 'args.worktree is missing' }
if (!Object.hasOwn(WAVES, WAVE)) return { stopped: `unknown wave ${WAVE}` }
if (TARGETS.length === 0) return { stopped: 'args.targets is empty: pass the JSON array of --lab-targets' }

const rows = ROWS.filter((r) => r.wave === WAVE && ENGINES.includes(r.engine))
// One writer per lab: the labs of one module in a wave use different engines.
const groups = rows.map((r) => [r])
const entries = groups.map((labs) => ({
  module: labs[0].module,
  key: labs[0].id,
  labs,
  // The lab's own module first, then each module that homes a concept the lab uses.
  targets: TARGETS.filter((t) => t.module === labs[0].module || labs[0].debriefModules.includes(t.module)).sort((a, b) => (a.module === labs[0].module ? -1 : b.module === labs[0].module ? 1 : a.module - b.module)),
}))
const missing = entries.filter((e) => !e.targets.some((t) => t.module === e.module)).map((e) => e.labs[0].id)
if (rows.length === 0) return { stopped: `no lab rows for wave ${WAVE} and engines ${ENGINES.join(', ')}` }
if (missing.length > 0) return { stopped: `--lab-targets has no entry for the module of ${missing.join(', ')}` }

const LABW = {
  type: 'object',
  properties: {
    module: { type: 'integer' },
    files: { type: 'array', items: { type: 'string' } },
    labs: { type: 'integer' },
    problems: { type: 'integer' },
  },
  required: ['module', 'files', 'labs', 'problems'],
}
const LABCRIT = {
  type: 'object',
  properties: {
    lab: { type: 'string' },
    approved: { type: 'boolean' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['grounding', 'wrongPath', 'alternatives', 'originality', 'style', 'debrief'] },
          where: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['kind', 'where', 'fix'],
      },
    },
  },
  required: ['lab', 'approved', 'issues'],
}
const GATE = {
  type: 'object',
  properties: {
    replayOk: { type: 'array', items: { type: 'string' } },
    replayFail: { type: 'array', items: { type: 'string' } },
    r11: { type: 'string' },
    today: { type: 'string' },
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: { lab: { type: 'string' }, problems: { type: 'array', items: { type: 'string' } } },
        required: ['lab', 'problems'],
      },
    },
  },
  required: ['replayOk', 'replayFail', 'r11', 'today', 'lines'],
}
const SYNC = {
  type: 'object',
  properties: { merged: { type: 'boolean' }, head: { type: 'string' }, check: { type: 'string' } },
  required: ['merged', 'head', 'check'],
}
const COMMIT = {
  type: 'object',
  properties: { lab: { type: 'string' }, commit: { type: 'string' }, body: { type: 'string' } },
  required: ['lab', 'commit', 'body'],
}
const FINAL = {
  type: 'object',
  properties: { labsLine: { type: 'string' }, validate: { type: 'string' } },
  required: ['labsLine', 'validate'],
}

const labLine = (r) =>
  `- ${r.id}: file content/labs/${r.file}, engine ${r.engine}${r.model ? ` (model ${r.model})` : ''}, title "${r.title}", spec 5.2 scope: ${r.scope}`
const simulateRule = (labs) =>
  labs.some((r) => r.engine === 'simulate')
    ? '\nFor a Simulate lab, copy its model, constants, parameter ids, kinds, ranges, steps, initials and option ids, thresholds, solution and wrong-path actions exactly from its row of SIM_LABS in tests/content/sim-labs.test.ts, as the Simulate labs section of agents/lab-writer.md says; write only the text (brief, goal labels and hints, mistakes, parameter labels, debrief), never change a number, and run `pnpm vitest run tests/content/sim-labs.test.ts` until it passes for your lab.'
    : ''

/** One lab writer for one entry; `revise` holds the open labs' critic issues and replay lines in revise mode. */
function writer(entry, revise, label, phaseName) {
  const mode = revise
    ? `You are in revise mode of agents/lab-writer.md. Fix only the issues below, keep each id and keep rev: 1 (no lab here has been committed yet), and touch no lab that is not listed:
${JSON.stringify(revise)}`
    : 'Write each lab below as its own new file at exactly its path.'
  return agent(`You are the lab writer for Module ${entry.module} of the CCP study site in the git worktree ${WT}.
Read agents/lab-writer.md and content/STYLE.md in full and follow the prompt exactly; read src/labs/contract.ts, schemas/lab.ts, src/labs/<engine>/model.ts and, for Place, Trace and Investigate, schemas/lab-<engine>.ts for each engine below.
Your labs (id, file, engine and title are binding):
${entry.labs.map(labLine).join('\n')}
Your entries of \`pnpm --silent content:report --lab-targets\` (your lab's module first, then each module that homes a concept your lab uses; concepts with their home notes, tasks and live practice ids and types) are:
${JSON.stringify(entry.targets)}
Read .results/labs-content/${entry.labs[0].id}.md, the scout notes for your lab, only for their grounding flags and note lines, never as text to copy; where its id, file, filters, question count or org shape differs from your row above or from your lab's plan in agents/lab-writer.md, the row and the plan win.
${mode}${simulateRule(entry.labs)}
This lab has tier: ${entry.labs[0].tier}, rev: 1 and status: live; its text is original, set in the cafe, and rests on lines of the notes it cites; it names Support plans only by their four current names; prices are lab credits and any figure the notes do not state is called a lab value.
Pick 2 to 3 debrief questions from the live practice ids your entries list for the lab's concepts, preferring single; you may open their practice files under content/questions/ to read their stems, and nothing else there.
Loop on \`pnpm --silent content:validate --draft content/labs/<file>\` for each of your files until its last line ends with \`0 problems\`.
Write no other file. ${NEVER_READ_LAB}
${HOOKS}
Return the module number, the files you wrote (paths from the repo root), the number of labs and the sum of the problem counts of your last --draft runs.`, { label, phase: phaseName, schema: LABW })
}

/** A fresh critic for one lab file; it never edits. */
function critic(r, round) {
  const sim = r.engine === 'simulate' ? `\nRun \`pnpm vitest run tests/content/sim-labs.test.ts\`: any failure for this lab, or any number that differs from its row of SIM_LABS there, is a wrongPath issue.` : ''
  return agent(`You are a fresh lab critic for one lab of the CCP study site in the git worktree ${WT}.
Read agents/lab-critic.md and content/STYLE.md in full and follow the prompt exactly.
Judge only content/labs/${r.file}: lab ${r.id}, engine ${r.engine}, tier ${r.tier}, title "${r.title}", spec 5.2 scope: ${r.scope}.${sim}
Run \`pnpm --silent content:validate --draft content/labs/${r.file}\` and read its R7 and R11 lines.
Never edit or create any file. ${NEVER_READ_LAB}
${HOOKS}
Return the lab id, approved true only when you found no issue, and every issue with its kind (grounding, wrongPath, alternatives, originality, style or debrief), where it is in the file, and the fix.`, { label: `critic:${round}:${r.id}`, phase: 'Critic', schema: LABCRIT })
}

/** The replay gate: runs the draft check per lab, the whole validator and the content tests; it never edits. */
function gate(round) {
  return agent(`${HOOKS}
Do not edit, create or commit anything.
For each of these files, run \`pnpm --silent content:validate --draft <file>\` and keep its output: ${rows.map((r) => `content/labs/${r.file}`).join(', ')}.
Then run \`pnpm --silent content:validate 2>&1 | tail -1\` and return that line as r11.
Then run \`pnpm vitest run tests/content 2>&1 | tail -30\`.
A lab is in replayOk when its file exists, its --draft run ends with \`0 problems\` and the test "<lab id> replays its solution and wrong paths" passed; every other lab of the list is in replayFail. Name labs by id only.
For each lab in replayFail, add to lines its id and the problem lines of its --draft run (they name lab, goal and question ids, never question text).
Return today as printed by \`date +%F\`.`, { label: `gate:${WAVE}${round}`, phase: 'Gate', schema: GATE, effort: 'low' })
}

phase('Write')
const written = await parallel(entries.map((e) => () => writer(e, null, `write:${e.key}`, 'Write')))
const writeProblems = written.filter((w) => !w || w.problems > 0).length
log(`write:${WAVE}: ${written.reduce((n, w) => n + (w?.labs ?? 0), 0)} labs from ${entries.length} writers; ${writeProblems} with problems`)

const approved = new Set()
const replayOk = new Set()
const kinds = new Map(rows.map((r) => [r.id, ['unjudged']]))
const issues = new Map()
let lastGate = null
for (let round = 1; round <= CRITIC_ROUNDS; round++) {
  const open = rows.filter((r) => !approved.has(r.id))
  phase('Critic')
  const verdicts = await parallel(open.map((r) => () => critic(r, round)))
  open.forEach((r, i) => {
    const v = verdicts[i]
    if (v && v.approved) {
      approved.add(r.id)
      issues.delete(r.id)
    } else {
      issues.set(r.id, v ? v.issues : [{ kind: 'style', where: 'whole file', fix: 'the critic returned nothing; judge again' }])
    }
  })

  phase('Gate')
  lastGate = await gate(round)
  if (!lastGate) return { stopped: `gate ${round} returned nothing`, wave: WAVE }
  replayOk.clear()
  for (const id of lastGate.replayOk) replayOk.add(id)
  for (const r of rows) {
    const k = new Set((issues.get(r.id) ?? []).map((i) => i.kind))
    if (!replayOk.has(r.id)) k.add('replay')
    kinds.set(r.id, [...k])
  }
  const failing = rows.filter((r) => !(approved.has(r.id) && replayOk.has(r.id)))
  log(`round ${round}: ${rows.length - failing.length}/${rows.length} labs approved and replaying`)
  if (failing.length === 0) break
  if (round === CRITIC_ROUNDS) break
  if (lastGate.today > LAST_REWRITE_DAY) {
    log(`past ${LAST_REWRITE_DAY}: no more rewrites`)
    break
  }

  phase('Revise')
  // A lab that replays but lost its approval, or never had it, goes back to the critic next round.
  for (const r of failing) approved.delete(r.id)
  const revising = entries.filter((e) => e.labs.some((r) => failing.includes(r)))
  await parallel(revising.map((e) => () => {
    const list = e.labs
      .filter((r) => failing.includes(r))
      .map((r) => ({
        lab: r.id,
        file: `content/labs/${r.file}`,
        issues: issues.get(r.id) ?? [],
        replay: lastGate.lines.find((l) => l.lab === r.id)?.problems ?? [],
      }))
    return writer(e, list, `revise:${round}:${e.key}`, 'Revise')
  }))
}

const shipped = rows.filter((r) => approved.has(r.id) && replayOk.has(r.id))
const held = rows.filter((r) => !shipped.includes(r)).map((r) => ({ lab: r.id, kinds: kinds.get(r.id) ?? [] }))
if (shipped.length === 0) return { wave: WAVE, shipped: [], held, stopped: 'no lab is approved and replaying' }

phase('Sync')
const heldFiles = rows.filter((r) => !shipped.includes(r)).map((r) => `content/labs/${r.file}`)
const sync = await agent(`${HOOKS}
You bring master into the lab branch ${BRANCH} in the worktree ${WT}, so the labs meet the current build, chunks and end-to-end helpers before they reach master.
${heldFiles.length > 0 ? `First move each of these held lab files, when it exists, under .results/labs/held/ with the same relative path (mkdir -p first), so the tree holds only the shipped labs: ${heldFiles.join(', ')}.` : 'No lab is held.'}
Run \`git -C "${WT}" merge --no-edit master\` (report "up to date" when nothing is new); on a conflict, run \`git merge --abort\` and return merged false with check "conflict".
Then run \`pnpm install --frozen-lockfile | tail -3\` and \`pnpm check 2>&1 | tail -30\`.
Return merged true, head = \`git rev-parse --short HEAD\`, and check = "pass" or the names of the failing checks with the failing lab ids (never their output).`, { label: `sync:${WAVE}`, phase: 'Sync', schema: SYNC, effort: 'low' })
if (!sync || !sync.merged || sync.check !== 'pass') {
  return { wave: WAVE, stopped: `sync: ${sync ? sync.check : 'no reply'}`, shipped: shipped.map((r) => r.id), held }
}

phase('Commit')
const commits = []
const byModuleThenId = (a, b) => a.module - b.module || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
for (const r of [...shipped].sort(byModuleThenId)) {
  const subject = `Add the ${r.tier === 'stretch' ? 'stretch ' : ''}${ENGINE_NAME[r.engine]} lab for Module ${r.module}`
  const c = await agent(`${HOOKS}
Work on branch ${BRANCH}. Commit exactly this lab file of Module ${r.module}, staged by path: content/labs/${r.file}.
Count its wrong paths with \`grep -c 'failsGoal:' content/labs/${r.file}\` as W.
Commit with two -m flags: the subject "${subject}" and the body "1 lab; its solution and its W wrong paths replay." with W filled in.
The pre-commit hook runs pnpm check, which replays every lab under R11; when it fails, edit nothing, run \`git restore --staged\` on this file, and return commit "failed" with the names of the failing checks and the failing lab ids as the body (never their output).
Return the lab id, the commit hash and the body you used.`, { label: `commit:${r.id}`, phase: 'Commit', schema: COMMIT, effort: 'low' })
  commits.push(c)
  // A lab edited after its critic approved it would ship unjudged, so a failing hook stops the wave instead.
  if (!c || c.commit === 'failed') {
    return { wave: WAVE, stopped: `commit: ${r.id} ${c ? c.body : 'no reply'}`, shipped: shipped.map((r) => r.id), held, commits }
  }
}

const final = await agent(`${HOOKS}
Do not edit or commit anything.
Return as labsLine the line of \`pnpm --silent content:report\` that starts with "Labs:", and as validate the last line of \`pnpm --silent content:validate\`.`, { label: `final:${WAVE}`, phase: 'Commit', schema: FINAL, effort: 'low' })

return {
  wave: WAVE,
  engines: ENGINES,
  shipped: shipped.map((r) => r.id),
  held,
  commits,
  labsLine: final ? final.labsLine : '',
  validate: final ? final.validate : '',
}
```

What each phase does:

- `Write`: one lab writer per lab in parallel, each reading `agents/lab-writer.md` and `content/STYLE.md` in full, its scout file for grounding flags only, writing only its own file and looping on `--draft` until `0 problems`.
- `Critic`: one fresh `lab-critic` per lab that is not yet approved, judging grounding, wrong paths, alternatives, originality, style and debrief fit by the version 2 criteria (Task 9), and never editing.
- `Gate`: one low-effort agent runs `--draft` per lab, the whole validator and `tests/content`, and returns which labs replay, the problem lines of the rest and today's date.
- `Revise`: one writer per open lab, in revise mode, with the critic's issues and the replay lines inlined; then the next round judges again, for at most 3 rounds and never past the wave's last rewrite day.
- `Sync`: held labs move under `.results/labs/held/`, `master` is merged in and `pnpm check` must pass.
- `Commit`: one commit per lab in module order, each through the pre-commit hook, then a final agent reads the `Labs:` line and the validator's last line.

Expected return: `{ wave: 'p5core', engines: [the six engines], shipped: [7 lab ids], held: [], commits: [7 entries], labsLine: 'Labs: 26 live (26 core, 0 stretch); sort 11, configure 2, simulate 6, place 3, trace 2, investigate 2', validate: 'content:validate: 13 rules, 0 findings' }`.
The `labsLine` counts Phase 4's live labs on `master` plus the labs this branch holds after Sync; a Phase 4 cut or a held lab lowers its own engine's count and the totals, and the controller names each one.
A non-empty `held` lists each dropped lab with the kinds of issue it still had; for a core lab, the controller follows the held-core design note above the same day.
A `stopped` return names the cause (a missing argument, an unknown wave, a missing targets entry, an empty gate, a failing sync or a failing commit hook).
When it stopped at Sync or Commit, the labs are written and judged: fix the cause in the worktree, run `pnpm check`, then commit each shipped lab that is not yet committed, by path, with the subject and body the Commit phase would use, and go on with Step 6; when the fix had to change a lab file, run a fresh `lab-critic` on that file first.
Otherwise fix the cause and run the script again with the same `args`; its writers start afresh and overwrite the files at their paths.

- [ ] **Step 5: Run wave `p5stretch` with the Workflow tool, at the same time**

Run the same script with `{ "worktree": "<absolute path of $SCRATCH/p5/wt-labs-stretch>", "wave": "p5stretch", "targets": <the JSON array in that worktree's .results/lab-targets.json> }`, in parallel with Step 4.

Expected return: `shipped` holds the 9 stretch lab ids, `held` is empty, and `commits` has, in this order, `Add the stretch Simulate lab for Module 2`, `Add the stretch Sort lab for Module 2`, `Add the stretch Investigate lab for Module 4`, `Add the stretch Sort lab for Module 5`, `Add the stretch Simulate lab for Module 6`, `Add the stretch Sort lab for Module 7`, `Add the stretch Configure lab for Module 9`, `Add the stretch Trace lab for Module 10` and `Add the stretch Sort lab for Module 12`.
Its `labsLine` reads `Labs: 28 live (19 core, 9 stretch); sort 15, configure 3, simulate 8, place 0, trace 1, investigate 1` when wave `p5core` was not on `master` at this wave's Sync, or `Labs: 35 live (26 core, 9 stretch); sort 15, configure 3, simulate 8, place 3, trace 3, investigate 3` when it was; `validate` reads `content:validate: 13 rules, 0 findings`.
A held stretch lab is cut: the controller names it to Dani the same day, and the rest of the wave ships.

- [ ] **Step 6: Check wave `p5core` in its worktree**

```bash
cd "$SCRATCH/p5/wt-labs-core"
git log --oneline master..HEAD
git status --short content/labs
pnpm --silent content:report | grep -E '^Labs:|^m[0-9]{2} labs:'
pnpm vitest run tests/content/labs-replay.test.ts 2>&1 | grep -E 'Tests |FAIL'
```

Expected: one `Add the <Engine> lab for Module N` commit per shipped core lab (7 when nothing is held) and the `Merge branch 'master'` commit from Sync when `master` had moved; `git status` prints nothing, because held labs sit under `.results/`; the `Labs:` line of Step 4 and thirteen `mNN labs: 2` lines; `Tests  27 passed (27)` (one test per lab plus `finds every lab file`), with no `FAIL` line.
Each Phase 4 or Phase 5 core lab missing from the branch lowers its module's line by one (a module with no lab prints no line) and the test count by one; the controller names each such lab, as for the `Labs:` line.

- [ ] **Step 7: Merge wave `p5core` into `master` once Tasks 6, 7 and 8 are on `master`**

Through the controller's serialized merge chain, in the main checkout on `master`, with `<n>` the shipped core lab count and `<m>` the number of modules they cover:

```bash
git log master --oneline --grep "^Add the Place lab view$" --grep "^Add the Trace lab view$" --grep "^Add the Investigate lab view$" | wc -l
git merge --no-ff content/phase-5-labs-core -m "Merge the Phase 5 core labs" -m "<n> core labs over <m> modules; every lab replays."
pnpm content:validate
pnpm --silent content:report | grep -E '^Labs: '
pnpm vitest run tests/content 2>&1 | grep -E 'Tests |FAIL'
pnpm build 2>&1 | grep -E '^budgets:'
```

Expected: `3`, so no shipped lab lacks its view (below 3, the merge waits); the merge commit with the pre-commit hook passing; `content:validate: 13 rules, 0 findings`; `Labs: 26 live (26 core, 0 stretch); sort 11, configure 2, simulate 6, place 3, trace 2, investigate 2` (or the lower counts, each missing lab named); `tests/content` passes with no `FAIL` line; the `budgets:` line shows the initial JS unchanged (labs ship in the module chunks) and every module chunk under 120 KB.
The controller sends the measured initial size and headroom to the Phase 6 controller, and runs Task 11 at once; `pnpm verify` runs there, so it does not run here.
The worktree stays until Task 11 Step 1.

- [ ] **Step 8: Check wave `p5stretch` in its worktree**

```bash
cd "$SCRATCH/p5/wt-labs-stretch"
git log --oneline master..HEAD
git status --short content/labs
pnpm --silent content:report | grep -E '^Labs:|^m[0-9]{2} labs:'
pnpm vitest run tests/content/labs-replay.test.ts tests/content/sim-labs.test.ts 2>&1 | grep -E 'Tests |FAIL'
```

Expected: one `Add the stretch <Engine> lab for Module N` commit per shipped stretch lab (9 when nothing is cut) and any `Merge branch 'master'` commit; `git status` prints nothing; the `Labs:` line of Step 5; per-module lines that add the stretch labs (`m02 labs: 4`, and 3 for Modules 4, 5, 6, 7, 9, 10 and 12 once wave `p5core` is in); the tests pass with no `FAIL` line (labs plus one in `labs-replay.test.ts`, and the eight Simulate outcomes in `sim-labs.test.ts`).

- [ ] **Step 9: Merge wave `p5stretch` after the Task 11 gate, or cut it**

In a quiet window agreed with the Phase 4 and Phase 6 controllers, first bring `master` into the branch and run the whole suite once on the merged result, under the machine-wide e2e lock:

```bash
date '+%F %H:%M'
git -C "$REPO" log master --oneline --grep "^Release Phase 5 Labs II as " | head -1
cd "$SCRATCH/p5/wt-labs-stretch"
git merge --no-edit master
pnpm install --frozen-lockfile | tail -3
lsof -iTCP:4317 -sTCP:LISTEN
if mkdir "$SCRATCH/e2e.lock"; then pnpm verify > .results/verify.log 2>&1; rc=$?; rmdir "$SCRATCH/e2e.lock"; tail -30 .results/verify.log; echo "verify exit $rc"; else echo "e2e lock held"; fi
```

Expected: a date and time before `2026-11-04 18:00`; Task 11's release commit; a clean merge (the branch adds only its own lab files); `lsof` prints nothing; `mkdir` succeeds; the log ends with the `budgets:` line (initial JS under 50 KB, every chunk under 120 KB) and the passing end-to-end summary, and the last line is `verify exit 0`.
When `mkdir` fails, the line prints `e2e lock held` and runs nothing, so another run's lock stays in place: run `until mkdir "$SCRATCH/e2e.lock" 2>/dev/null; do sleep 15; done; echo locked` in the background (or wait with the Monitor tool), never as a foreground sleep, and once it prints `locked`, run `pnpm verify` and the rest of that line by hand, ending with the `rmdir`; a port-in-use failure means the same wait and a rerun, never a test result.
When the date is past the cut, merge nothing: report to Dani that the stretch labs wait until after November 14, and leave the branch and the worktree as they are.

Then, through the serialized merge chain, in the main checkout on `master`, with `<n>` the shipped stretch lab count and `<m>` the number of modules they cover:

```bash
git merge --no-ff content/phase-5-labs-stretch -m "Merge the Phase 5 stretch labs" -m "<n> stretch labs over <m> modules; every lab replays."
pnpm --silent content:report | grep -E '^Labs: '
pnpm build 2>&1 | grep -E '^budgets:'
git worktree remove --force "$SCRATCH/p5/wt-labs-stretch"
git branch -d content/phase-5-labs-stretch
```

Expected: the merge commit with the pre-commit hook passing; `Labs: 35 live (26 core, 9 stretch); sort 15, configure 3, simulate 8, place 3, trace 3, investigate 3` (or the counts shipped); the `budgets:` line, whose initial size and headroom go to the Phase 6 controller; `Deleted branch content/phase-5-labs-stretch`.
This merge bumps no version and edits no README line, since the README names no lab counts.
Dani deploys again by Friday, November 6, and the controller runs Task 11 Step 11's check, which prints `labs 35 sort 15 configure 3 simulate 8 place 3 trace 3 investigate 3` (or the counts shipped).

---

## Task 11: The Phase 5 gate

**Files:**
- Modify: `content/game/badges.yaml` (on the 26-lab path only), `tests/unit/game-content.test.ts`, `README.md`, `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, `package.json` (`version`, the next minor after `master`'s)
- Test: `tests/unit/game-content.test.ts`, `pnpm content:validate`, `pnpm vitest run tests/content`, `pnpm verify`

Design notes:
- The gate closes spec 10.1's Phase 5 exit: 26 core labs live (11 Sort, 6 Simulate, 3 Place, 2 Configure, 2 Trace and 2 Investigate, spec 5.2), every shipped lab replays under R11 inside `pnpm check`, Lab Complete can be earned, and `pnpm verify` passes.
- It runs right after the wave `p5core` merge, once Phase 4 Task 20 has released 0.6.0 and Tasks 1 to 9 are on `master`, at the latest Tuesday, November 3; it never waits for wave `p5stretch`, which merges after it as content (Task 10 Step 9).
- `ENGINE_VERSION` does not change: `lab.done` is engine-agnostic, `coreLabs` comes from the index, and Lab Complete has counted `CORE_LABS` (26) since Phase 4 Task 5, so the badge needs only its `arrives: labs` line removed; Step 5 proves that no Phase 5 commit touched `src/engine/`.
- Lab Complete loses `arrives: labs` only when the live index holds 26 core labs.
- Below 26 (a core lab held in Task 10), the gate keeps `arrives: labs`, and the README and the 10.1 NOTE name each missing lab and say that Lab Complete waits until after November 14.
- The new badge test reads the real index the way Phase 4 Task 20's Hands On test does, so it passes on both paths and fails whenever the badge and the live core count disagree; on the 26-lab path it also pins every module at 2 core labs, so Hands On counts all 13 modules.
- Both real-content badge tests build the whole content, several seconds under the shared machine's load, so both take `HEAVY_TIMEOUT_MS` from `tests/fixtures/timeouts.ts`; in the prototype, Phase 4 Task 20's Hands On test ran past Vitest's 5 s default and timed out while other builds ran.
- The version is the next minor after `master`'s `package.json` when the gate runs: 0.7.0 after Phase 4's 0.6.0, or 0.8.0 if Phase 6 released 0.7.0 first; whichever gate runs second rebases on the other's edits to `game-content.test.ts`, the README, the spec and the version.
- Stretch labs pay lab XP like core labs, through Phase 4's `applyLab` (first completion only), and only core labs count toward Hands On and Lab Complete; the README and the 7.3 NOTE say so, and no code changes.
- The deviation from P5-027 (Place messages count checks, not pieces) and the other Phase 5 decisions that change spec text become `NOTE: ... (Phase 5).` lines beside that text, in the form Phases 3 and 4 use.
- Covers P5-001 to P5-006, P5-009, P5-010, P5-027 (the recorded deviation), P5-056, P5-058, P5-060, P5-074, P5-077, P5-080, P5-081, P5-082, P5-092, P5-102, P5-103 and P5-104.

- [ ] **Step 1: Confirm what the gate needs and remove the merged worktrees**

```bash
SP=/private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad/p5
git log master --oneline --grep "^Release Phase 4 Labs I as 0.6.0$" | head -1
git log master --format=%s | grep -cxE 'Add the (Place|Trace|Investigate) lab model|Register the Place, Trace and Investigate engines|Add the purchase and data-loss Simulate models|Add the (Place|Trace|Investigate) lab view|Teach the lab writers Place, Trace, Investigate and stretch labs'
for b in content/phase-5-labs-core p5/place p5/trace p5/investigate p5/simulate; do git branch --merged master --format='%(refname:short)' | grep -x "$b"; done
for w in wt-labs-core wt/place wt/trace wt/investigate wt/simulate; do git worktree remove --force "$SP/$w"; done
git branch -d content/phase-5-labs-core p5/place p5/trace p5/investigate p5/simulate
git worktree list | grep -cE 'p5/(wt-labs-core|wt/)'
```

Expected: the first line is Phase 4 Task 20's release commit; the count is `9` (Tasks 1 to 9); the loop prints the five branch names; the deletion prints five `Deleted branch` lines; the last command prints `0`.
If the release commit or a branch is missing, or the count is below 9, stop: the gate waits for the Phase 4 release, for that task, or for the wave `p5core` merge (Task 10 Step 7) in the serialized merge chain.
The `wt-labs-stretch` worktree stays until its merge or its cut (Task 10 Step 9).

- [ ] **Step 2: Read the live core count and take one path**

```bash
pnpm --silent content:report | grep -E '^Labs: '
grep -rlx 'tier: core' content/labs | xargs grep -hx 'id: lab-[a-z0-9-]*' | sed 's/^id: //' | sort
```

Expected on the 26-lab path: `Labs: 26 live (26 core, 0 stretch); sort 11, configure 2, simulate 6, place 3, trace 2, investigate 2`.
The core count `<c>` is the number in `(<c> core, ...)`, and the second command prints `<c>` lab ids, one per line.
At `<c>` = 26 (`CORE_LABS`), take the 26-lab path: Steps 3 to 11 as written.
Below 26, take the below-26 path: Step 3 as written, skip Step 4, and use the below-26 wording in Steps 6, 7 and 10; list the live core lab ids with the second command, and each of the seven `p5core` ids of Task 10's `ROWS` and Phase 4 Task 10's 19 ids that the list lacks is a missing core lab, named by the title of its row.

- [ ] **Step 3: Write the badge test**

In `tests/unit/game-content.test.ts`, change the badge constants import that Phase 4 Task 20 added and add the timeout import, so the two lines read:

```ts
import { CORE_LABS, CORE_LABS_PER_MODULE, HANDS_ON_MODULES } from '../../src/engine/badges.ts';
import { HEAVY_TIMEOUT_MS } from '../fixtures/timeouts.ts';
```

Give Phase 4 Task 20's Hands On test the heavy timeout by replacing its first line, `  it('shows Hands On as earnable exactly when 5 modules ship both core labs', () => {`, with:

```ts
  it('shows Hands On as earnable exactly when 5 modules ship both core labs', {
    timeout: HEAVY_TIMEOUT_MS,
  }, () => {
```

Add this test right after the Hands On test:

```ts
  it('shows Lab Complete as earnable exactly when 26 core labs are live', {
    timeout: HEAVY_TIMEOUT_MS,
  }, () => {
    const built = buildContent(loadContext(ROOT));
    const index = JSON.parse(built.files.get(built.indexFile) ?? 'null') as ContentIndex;
    const core = index.labs.filter((lab) => lab.tier === 'core');
    const coreCount = core.length;
    const labComplete = badges.find((b) => b.id === 'lab-complete');
    expect(labComplete).toBeDefined();
    expect(labComplete?.arrives === undefined).toBe(coreCount >= CORE_LABS);
    if (coreCount >= CORE_LABS) {
      const perModule = new Map<number, number>();
      for (const lab of core) perModule.set(lab.module, (perModule.get(lab.module) ?? 0) + 1);
      expect([...perModule.entries()].sort((a, b) => a[0] - b[0])).toEqual(
        Array.from({ length: CORE_LABS / CORE_LABS_PER_MODULE }, (_, i) => [i + 1, CORE_LABS_PER_MODULE]),
      );
    }
  });
```

On the 26-lab path, also drop the row `      ['lab-complete', 'labs'],` from the list in `marks the badges that wait for labs, missions and the capstone`, keeping whatever Phase 6 rows remain; before Phase 6's gate the test reads:

```ts
  it('marks the badges that wait for labs, missions and the capstone', () => {
    expect(badges.filter((b) => b.arrives !== undefined).map((b) => [b.id, b.arrives])).toEqual([
      ['leave-no-trace', 'missions'],
      ['architect', 'capstone'],
    ]);
  });
```

```bash
pnpm lint:fix
pnpm vitest run tests/unit/game-content.test.ts 2>&1 | grep -E '×|AssertionError|Tests '
```

Expected on the 26-lab path: FAIL in two tests, `marks the badges that wait for labs, missions and the capstone` (`expected [ [ 'lab-complete', 'labs' ], …(2) ] to deeply equal [ …(2) ]`) and `shows Lab Complete as earnable exactly when 26 core labs are live` (`expected false to be true`), since the badge still waits for labs; `Tests  2 failed | 6 passed (8)`, more when Phase 6 has added tests.
Expected on the below-26 path: every test passes, because `arrives: labs` stays and the core count is below 26.

- [ ] **Step 4: Lab Complete arrives (26-lab path only)**

In `content/game/badges.yaml`, delete the line `  arrives: labs` under `- id: lab-complete`, so the entry reads:

```yaml
- id: lab-complete
  name: Lab Complete
  rule: All 26 core labs completed.
```

```bash
pnpm vitest run tests/unit/game-content.test.ts 2>&1 | grep -E '×|Tests '
```

Expected: `Tests  8 passed (8)` (more when Phase 6 has added tests), with no `×` line.

- [ ] **Step 5: Check the exit criteria**

```bash
pnpm content:validate
pnpm --silent content:report | grep -E '^Labs: '
git log --format=%s master -- src/engine/ | grep -cxE 'Add the (Place|Trace|Investigate) lab (model|view)|Register the Place, Trace and Investigate engines|Add the purchase and data-loss Simulate models|Teach the lab writers Place, Trace, Investigate and stretch labs|Add the (stretch )?(Sort|Configure|Simulate|Place|Trace|Investigate) lab for Module [0-9]+|Merge the Phase 5 (core|stretch) labs|Merge Phase 5 Task [0-9]+: .*|Fix review findings for Phase 5 Task [0-9]+'
grep 'ENGINE_VERSION = ' src/engine/replay.ts
pnpm vitest run tests/content 2>&1 | grep -E 'Tests |FAIL'
```

Expected: `content:validate: 13 rules, 0 findings`; `Labs: 26 live (26 core, 0 stretch); sort 11, configure 2, simulate 6, place 3, trace 2, investigate 2`, or the lower counts with each missing lab named in the report; `0`, since no Phase 5 commit touches `src/engine/`; `export const ENGINE_VERSION = 5;`, or Phase 6's value when its gate came first, unchanged by Phase 5; `tests/content` passes with one replay test per shipped lab in `labs-replay.test.ts` and the Simulate outcomes in `sim-labs.test.ts`, with no `FAIL` line.

- [ ] **Step 6: Record the Phase 5 deviations in the spec**

In `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, insert each block below at the place named, followed by a blank line where it ends before a heading.

Before `### 5.2 Per-module labs` (after the engine table of 5.1, so the notes sit beside the contract and the Place, Trace and Investigate rows):

```markdown
- NOTE: the Place, Trace and Investigate zod schemas live in their own files, `schemas/lab-place.ts`, `schemas/lab-trace.ts` and `schemas/lab-investigate.ts`, which `schemas/lab.ts` gathers into `LAB_SCHEMAS` (Phase 5).
- NOTE: Place containers form a tree by `parent`, a container that no other container names as its parent is a slot, the slots are numbered depth-first in spec order with the optional bench last, and the board is complete when no piece is left in the tray (Phase 5).
- NOTE: Place checks four constraint kinds, `in`, `survive`, `public` and `private`, where `private` needs each piece in a subnet, or in a slot below one, and not reachable, and `survive` holds under every failure the spec lists, while the failure toggle only previews one failure on the board (Phase 5).
- NOTE: a Place goal's message counts checks, `<k> of <n> checks pass`, not pieces right, because a `survive` constraint judges a set of pieces and gives no verdict per piece; the `survive` hint still names the failed zone (Phase 5).
- NOTE: Trace edits rules by switching fixed candidate rules on and off; a `network` lab has one security group and one network ACL around one instance, and a `policy` lab has identity policies and an organization tree in which every node carries an SCP (Phase 5).
- NOTE: Trace matches actions ignoring letter case and resources exactly, with `*` as the only wildcard, models no management account, and shows each test case's result live while the goals wait for Check (Phase 5).
- NOTE: Investigate answers are option ids chosen from a list per question and checked exactly, filters match exact column values and never change a check, an optional listing shows a document such as a template, and every time is written in UTC (Phase 5).
```

Before `### 5.3 Real-AWS missions (optional, free plan)` (right after Phase 4's Simulate NOTE that starts `- NOTE: Simulate runs six fixed model functions`):

```markdown
- NOTE: Simulate now runs eight fixed models, with `purchase` for Pay less for beans and `data-loss` for Lose the instance, whose numbers are fixed in the same table as the other six (Phase 5).
```

Before `### 7.4 Keyboard`:

```markdown
- NOTE: the module page marks each stretch lab `Stretch` before its minutes, since Hands On and Lab Complete count core labs only, and a stretch lab pays XP like a core lab (Phase 5).
```

Right after the line `  9. **Keyboard only:** a run through the runner, the exam shell and a Place lab.` in section 9:

```markdown
     - NOTE: the keyboard-only runs cover a Place lab as well as a Sort, a Configure, a Simulate, a Trace and an Investigate lab (Phase 5).
```

Before `### 10.2 Study calendar for the November 14 exam`, with `<version>` the version of Step 8 and `<date>` today's date from `date +%F`, on the 26-lab path:

```markdown
- NOTE: Phase 5 was built before the exam by Dani's decision of 2026-10-10 and shipped as `<version>` on `<date>` with all 26 core labs; its stretch labs merge after that release as content only, and anything not merged by Friday, November 6 waits until after November 14 (Phase 5).
```

On the below-26 path, the same block reads, with `<c>` the core count and `<missing>` the titles of the missing core labs:

```markdown
- NOTE: Phase 5 was built before the exam by Dani's decision of 2026-10-10 and shipped as `<version>` on `<date>` with <c> core labs, without <missing>, so Lab Complete waits until after November 14; its stretch labs merge after that release as content only, and anything not merged by Friday, November 6 waits until after November 14 (Phase 5).
```

```bash
perl -CSD -ne 'print "$ARGV:$.: em dash\n" if /\x{2014}/; close ARGV if eof' docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
grep -c '(Phase 5)\.$' docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
python3 -I /private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad/r8check.py docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
```

Expected: `perl` prints nothing; the count is `11`; `r8check.py` prints nothing.

- [ ] **Step 7: Document Place, Trace and Investigate in the README**

In `README.md`, insert this section right before `## Course text stays out` (after Phase 4 Task 20's `## Incidents and lightning`):

```markdown
## Place, Trace and Investigate labs

Place labs nest pieces into containers, such as a Region with its zones, a VPC with its subnets, or the stages of a pipeline, and a bench holds the pieces you decide not to run.
Tap a piece, then its slot; by keyboard, `Space` picks a piece up or places the held piece in the focused slot, `1` to `9` and `0` place it in the first ten slots, `Backspace` sends it back to the tray and `Escape` puts it down.
The failure buttons preview one failure on the board, while Check tests the board under every failure the lab lists.
Trace labs switch fixed security group, network ACL, IAM and SCP rules on and off with checkboxes, and each test case shows its result live and opens to step its request through every hop.
Investigate labs filter made-up records, such as CloudTrail events or review findings, or read a listing such as a template, and each question takes one answer from its list.
In every lab, `Enter` checks the goals, `h` shows a hint and `r` asks before it resets the board.
Stretch labs carry a `Stretch` mark on the module page and pay XP like core labs, but only core labs count toward Hands On and Lab Complete.
```

On the below-26 path, add this line at the end of the section, with `<missing>` as in Step 6:

```markdown
Lab Complete waits until after November 14, because <missing> did not ship before the exam.
```

```bash
grep -n 'last feature release' README.md
python3 -I /private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad/r8check.py README.md
```

Expected: `grep` prints nothing, since Phase 4 Task 20's README text does not call 0.6.0 the last feature release; when it does print a line, add `Phase 5 shipped after it, by Dani's decision of 2026-10-10 to build the remaining labs before the exam.` on the line after it.
`r8check.py` prints nothing.

- [ ] **Step 8: Bump the version to the next minor**

```bash
node -e "const fs=require('node:fs');const t=fs.readFileSync('package.json','utf8');const v=JSON.parse(t).version;const [a,b]=v.split('.').map(Number);const n=a+'.'+(b+1)+'.0';fs.writeFileSync('package.json',t.replace('\"version\": \"'+v+'\"','\"version\": \"'+n+'\"'));console.log(v+' -> '+n)"
grep '"version"' package.json
```

Expected: `0.6.0 -> 0.7.0` and `  "version": "0.7.0",`, or `0.7.0 -> 0.8.0` and `  "version": "0.8.0",` when Phase 6 released 0.7.0 first; that version is `<version>` in Steps 6 and 10.

- [ ] **Step 9: Run the full gate**

In a quiet window agreed with the Phase 4 and Phase 6 controllers, under the machine-wide e2e lock:

```bash
perl -CSD -ne 'print "$ARGV:$.: em dash\n" if /\x{2014}/; close ARGV if eof' README.md docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md content/game/badges.yaml
python3 -I /private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad/r8check.py README.md
SCRATCH=/private/tmp/claude-501/-Users-danielchahine-Programs-AWS-Cloud-Practitioner-Essentials/52f9dc77-0be2-4c59-9dc4-f1b4d0ff8c62/scratchpad
lsof -iTCP:4317 -sTCP:LISTEN
mkdir -p .results
if mkdir "$SCRATCH/e2e.lock"; then pnpm verify > .results/verify.log 2>&1; rc=$?; rmdir "$SCRATCH/e2e.lock"; tail -30 .results/verify.log; echo "verify exit $rc"; else echo "e2e lock held"; fi
```

Expected: `perl`, `r8check.py` and `lsof` print nothing; `mkdir` succeeds (when the line prints `e2e lock held`, wait for the lock as Task 10 Step 9 says); `pnpm verify` runs `pnpm check` (13 rules, every lab replayed), the build with its `budgets:` line (initial JS under 50 KB gzipped, every module chunk with its labs under 120 KB) and every end-to-end test, the Place, Trace and Investigate lab tests among them, on `chromium-desktop` and `webkit-mobile`; the last line is `verify exit 0`.
The controller sends the measured initial size and headroom to the Phase 6 controller.

- [ ] **Step 10: Commit**

On the 26-lab path:

```bash
pnpm lint:fix
git add package.json content/game/badges.yaml tests/unit/game-content.test.ts README.md docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
git commit -m "Release Phase 5 Labs II as <version>" -m "26 core labs replay under R11 across six engines; Lab Complete can now be earned."
```

On the below-26 path, `content/game/badges.yaml` is unchanged:

```bash
pnpm lint:fix
git add package.json tests/unit/game-content.test.ts README.md docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
git commit -m "Release Phase 5 Labs II as <version>" -m "<c> core labs replay under R11 across six engines; Lab Complete waits until after November 14."
```

Expected: the pre-commit hook runs `pnpm check` and the commit succeeds.

- [ ] **Step 11: Deploy and confirm the labs are on the site**

The controller asks Dani to run `pnpm site:deploy` right after the gate, at the latest Tuesday, November 3.
Its last line reads `site:deploy: done, ` followed by the site's address.
Once it is up, export that address as `SITE` and run this; it prints counts only:

```bash
node --input-type=module -e '
const site = process.env.SITE;
const html = await (await fetch(site)).text();
const name = html.match(/<meta name="ccp-content" content="([^"]+)"/)?.[1] ?? "";
const index = await (await fetch(new URL(name, site))).json();
const by = (k) => index.labs.filter((l) => l.engine === k).length;
console.log(`labs ${index.labs.length} ${["sort", "configure", "simulate", "place", "trace", "investigate"].map((k) => `${k} ${by(k)}`).join(" ")}`);
'
```

Expected: `labs 26 sort 11 configure 2 simulate 6 place 3 trace 2 investigate 2` (or the cut counts), so all six engines work offline on Dani's phone.
After the wave `p5stretch` merge (Task 10 Step 9), Dani deploys again, by Friday, November 6, and the same command prints `labs 35 sort 15 configure 3 simulate 8 place 3 trace 3 investigate 3` (or the counts shipped).
Nothing but fixes ships after Saturday, November 7.

---

## Self-review

### Spec coverage

| Spec 10.1, Phase 5 | Tasks |
|---|---|
| The Place, Trace and Investigate engines (spec 5.1) | 1, 2 and 3 (models and schemas), 4 (registry, R11, build, report, lab screen), 6, 7 and 8 (views, keys and end-to-end tests) |
| Their 7 core labs (spec 5.2) | 9 (prompts with the per-lab plans) and 10 (wave `p5core`) |
| The 9 stretch labs, cut first | 5 (the `purchase` and `data-loss` models), 9, 10 (wave `p5stretch`, merged after the gate or cut) and 11 (never waits for them) |
| Exit: 26 core labs live | 10 (Step 7) and 11 |
| Every shipped lab replays under R11 inside `pnpm check` | 4 (the new engines in R11, the bad fixtures), 10 (the replay gate and the pre-commit hook) and 11 |
| Lab Complete can be earned | 11 |
| Built before the exam by Dani's decision of 2026-10-10 | the header's task order and 11 (the 10.1 NOTE) |

| Other spec sections Phase 5 implements | Tasks |
|---|---|
| 1.2 the `src/labs/<engine>/` layout | 1, 2, 3, 6, 7 and 8 |
| 2.3 current names in lab text | 9 and 10 |
| 2.9 R1, R2, R6, R7, R8 and R11 for the new labs | 4, 9, 10 and 11 |
| 2.10 labs in the module chunks and the index | 4 and 10 |
| 3.2 lab XP, stretch labs included | 11 (documented; Phase 4's `applyLab` pays them) |
| 3.10 Hands On and Lab Complete | 11 |
| 4.6 the Home lab extra picks among core labs | 11 (the new core labs join through the index; nothing changes) |
| 5.1 the contract, the engine table and the failure toggle | 1, 2, 3, 4, 6, 7 and 8 |
| 5.2 the per-module labs, core and stretch | 5, 9 and 10 |
| 7.2 to 7.5 the lab route, the module page's `Stretch` mark, lab keys, Help and accessibility | 4, 6, 7 and 8 |
| 8.1 and 8.4 drafts hold actions only and no `ENGINE_VERSION` bump | 4, 6, 7, 8 and 11 |
| 9 checker tables, property tests, failing R11 fixtures and the keyboard-only Place run | 1 to 8 and 11 |
| 10.2 the schedule to the exam and the cut order | 10 and 11 |

Every checklist id in the requirements map that is not left out on purpose maps to a task:

| Checklist ids | Tasks |
|---|---|
| P5-008, P5-013, P5-014, P5-015, P5-018, P5-020, P5-084, P5-085, P5-087 | 1, 2 and 3 |
| P5-016, P5-086 | 1, 2, 3 and 4 |
| P5-012 | 1, 2, 3, 6, 7 and 8 |
| P5-022, P5-023, P5-024, P5-026, P5-028 | 1 |
| P5-021, P5-025 | 1 and 6 |
| P5-027 | 1, 6 and 11 (the recorded deviation) |
| P5-030, P5-031, P5-032, P5-033, P5-034, P5-035, P5-036, P5-038 | 2 |
| P5-029 | 2 and 7 |
| P5-040, P5-041, P5-042, P5-045 | 3 |
| P5-044 | 3 and 4 |
| P5-039 | 3 and 8 |
| P5-043 | 3 and 9 |
| P5-017, P5-019, P5-051, P5-057, P5-063, P5-064, P5-075 | 4 |
| P5-010, P5-058 | 4 and 11 |
| P5-050, P5-054 | 4 and 10 |
| P5-066 | 4 and 6 |
| P5-072, P5-073 | 4, 6, 7 and 8 |
| P5-007 | 4, 5, 6, 7, 8 and 9 |
| P5-046, P5-047 | 5 |
| P5-059, P5-L08, P5-L12 | 5 and 10 |
| P5-067, P5-088 | 6 |
| P5-062, P5-065, P5-068, P5-069, P5-070, P5-071, P5-076, P5-078, P5-079, P5-083, P5-089 | 6, 7 and 8 |
| P5-037 | 7 |
| P5-090 | 7 and 8 |
| P5-093, P5-095, P5-096 | 9 |
| P5-048, P5-055, P5-094, P5-098, P5-099 | 9 and 10 |
| P5-056 | 9, 10 and 11 |
| P5-011, P5-049, P5-052, P5-053, P5-061, P5-097, P5-100, P5-101 | 10 |
| P5-L01, P5-L02, P5-L03, P5-L04, P5-L05, P5-L06, P5-L07, P5-L09, P5-L10, P5-L11, P5-L13, P5-L14, P5-L15, P5-L16 | 10 |
| P5-001, P5-002, P5-003, P5-004, P5-060 | 10 and 11 |
| P5-005, P5-006, P5-009, P5-074, P5-077, P5-080, P5-081, P5-082, P5-102, P5-103, P5-104 | 11 |
| P5-091 | 1 to 11 (the regression convention in the header) |
| P5-092 | 1 to 11 (focused tests) and 11 (`pnpm verify`) |

Left out on purpose: P5-O01 (the visual baseline of a lab), P5-O02 (the capstone, Missions 2 to 8, three questions per concept, accessibility and visual baselines), P5-O03 (the missions end-to-end test and the palette `actions` kind) and P5-O04 (`ENGINE_VERSION` 6 and every capstone, mission or `decision` file), all Phase 6.

### Deliberate deviations

- The zod spec and action schemas of Place, Trace and Investigate live in `schemas/lab-place.ts`, `schemas/lab-trace.ts` and `schemas/lab-investigate.ts`, gathered into `LAB_SCHEMAS` by `schemas/lab.ts`, because the model tasks start while Phase 4 still edits `schemas/lab.ts` (Tasks 1 to 4, and the spec NOTE in Task 11).
- The Phase 5 unit, property and fixture tests live in new per-engine files, each property file with its own copy of Phase 4's `RUNS` (Tasks 1 to 3).
- Place gains an optional `bench` container for the pieces left unused, derives its slot order depth-first with the bench last instead of refusing a listing order, and requires a `vpc` above every `subnet` (Task 1).
- A Place goal's message counts checks, not pieces, against P5-027, because a `survive` constraint judges a set of pieces (Tasks 1 and 6, and the spec NOTE in Task 11).
- Place checks survival under every listed failure, and its failure toggle only previews one (Tasks 1 and 6).
- Trace edits rules by switching fixed candidate rules on and off, models one security group and one network ACL per `network` lab, matches actions ignoring case, requires an SCP on every organization node and leaves out the management account (Task 2).
- Trace case results are live while the goals still wait for Check (Tasks 2 and 7).
- Investigate answers are option ids, its filters match exact values and never change a check, an optional listing gives the template lab its record kind, and every time is in UTC (Tasks 3 and 9).
- The Well-Architected review keeps the 5-goal maximum by grouping six pillar questions into two goals and the fix into a third (Tasks 9 and 10).
- Simulate gains two fixed models, `purchase` and `data-loss`, for the two stretch Simulate labs (Task 5).
- The `Labs:` report line is built from `LAB_ENGINES`, so Phase 4's three pinned three-engine lines gain `, place 0, trace 0, investigate 0` from whichever runs second (Task 4).
- `LabMeta.engine` and `LabKeyState.engine` become `LabEngineId` (Task 4).
- Two `Lab:` Help rows are reworded for Sort and Place (Task 6).
- The module page marks stretch labs `Stretch`, and stretch labs pay XP like core labs with no code change (Tasks 4 and 11).
- Engine facts the notes do not state appear only as lab mechanics that each lab's brief states, and no note is edited (Tasks 9 and 10).
- `ENGINE_VERSION` stays where `master` has it, and Task 11 proves no Phase 5 commit touches `src/engine/` (Task 11).
- The fan-out script changes a little more than the brief's list: `meta` names `phase5-labs` and one commit per lab, two stale comments follow the new grouping, `pad2` goes because nothing uses it any more, the writer prompt gains one line that points to its lab's scout file under `.results/labs-content/`, since the brief has writers read the labs-content map for grounding flags while the script gave them no path to it, and the critic prompt names the lab's tier, since Task 9's critic checks the tier its row gives and the script gave it no row (Task 10).
- Both real-content badge tests, Phase 4 Task 20's Hands On test included, take `HEAVY_TIMEOUT_MS`, because building the whole content ran past Vitest's 5 s default and timed out under the shared machine's load in the prototype (Task 11).
- The release version is the next minor after `master`'s at gate time, not a fixed number, because Phase 6 may release first (Task 11).

- The test fixtures of the new engines return `PlaceLabFile`, `TraceLabFile` and `InvestigateLabFile`, each `LabFile` with its own `engine`, because `LabFile` admits the new engines only once Task 4 widens `LAB_ENGINES`; from Task 4 on each is assignable to `LabFile` (Tasks 1 to 3).
- When too few pieces of a `survive` constraint run before any failure, its hint reads `Too few of them are running.` even when the lab lists failures, though the brief named that hint only for a `survive` with no failures; the unit table pins it (Task 1).
- The Phase 4 e2e helper `answerDebriefByKeys(page)` gains an `id` parameter that defaults to `SYNTHETIC_SORT_LAB_ID`, because `useLabAt` serves an index that holds only the lab served last; the Place, Trace and Investigate keyboard tests pass their own lab ids, and the Phase 4 calls stay as they are (Tasks 6, 7 and 8).
- The Place keyboard test waits for the focus to settle after each `requestAnimationFrame` focus move before it presses Tab, because the bare focus-then-Tab pattern raced on the prototype; Phase 4's Sort keyboard test keeps its pattern, which did not flake (Task 6).
- The Trace cases heading is an `h2`, not the brief's `h3`, because the lab screen has no `h2` above the board and an `h3` would skip a level; the Place and Investigate boards add no heading at all, so the screen's outline stays h1, then h2 (Tasks 6, 7 and 8).
- Task 7 pins `checkLabel('trace')` once more in its Trace copy test, after Task 4's engine-label test, on purpose; the two pins agree (Tasks 4 and 7).
- No Investigate e2e test presses the `h` or `r` lab keys, because both are engine-agnostic and Phase 4's Sort tests cover them, and a hint would lower the completion XP the keyboard test checks (Task 8).
- The writer prompt's worked examples are complete bakery labs with their own ids (`lab-m01-bakery-fronts`, `lab-m01-bakery-window`, `lab-m01-bakery-badges`, `lab-m01-bakery-starter`), close to the Task 1 to 3 fixtures but not copies of them, so a fixture change never breaks the prompt test, which replays each example under R11 (Task 9).
- The writer prompt's `## Stretch labs` holds a short plan for each of the 7 Sort, Configure and Simulate stretch labs as well as the bar they meet, and its test asserts them, so every stretch writer gets a plan as concrete as a core writer's (Task 9).
- Task 4's report takes wave CS's `Labs:` pin state from the Phase 4 Task 10 controller, because its `git log` check sees a pin only once its merge is on `master` (Task 4).
- Every e2e run takes the machine-wide lock with `if mkdir ...; then ...; rmdir ...; else echo "e2e lock held"; fi`, so a run never removes a lock another run holds (Tasks 6, 7, 8, 10 and 11).
- The plan prints the tasks in number order, so the Task 6, 7 and 8 views follow Tasks 4 and 5 though each was drafted beside its model task (the header's worktree list still pairs them by engine).

### Names used across tasks

- Ids and schemas: `LAB_ENGINES` (six engines), `LabEngineId`, `LabFile` (with `PlaceLabFile`, `TraceLabFile` and `InvestigateLabFile` until Task 4), `LabMeta.engine` as `LabEngineId`, `LAB_SCHEMAS`, `PLACE_KINDS`, `PIECE_ROLES`, `IPV4`, `CIDR`, `PlaceSpec`, `PlaceAction`, `TraceSpec`, `TraceAction`, `InvestigateSpec`, `InvestigateAction`, `SIM_MODELS` and `SIM_CONSTANTS` with `purchase` and `data-loss`, `PURCHASE_OPTIONS`, `PurchaseOption`, `PurchaseWorkload`, `PurchaseConstants`, `DataLossConstants`.
- Labs: `PLACE`, `placeSlots`, `placeGoals`, `placeComplete`, `reachable`, `TRACE`, `traceCase`, `inCidr`, `globMatch`, `traceGoals`, `TraceRun`, `TraceHop`, `INVESTIGATE`, `visibleRecords`, `filterValues`, `investigateGoals`, `investigateComplete`, `ENGINES` entries for the three engines, `checkLab`, `SimModel`, `runModel`, `SIM_LABS`, `placeTexts`, `traceTexts`, `investigateTexts`, `SPEC_TEXTS`, `labTexts`, `labProblems`, `r11`.
- App: `ENGINE_LABEL` for six engines, `checkLabel`, `labKey`, `LabKeyState`, `SHORTCUTS` with the two reworded `Lab:` rows, `LabRow.stretch`, `labRows`, `Board` cases `place`, `trace` and `investigate`, `PlaceView`, `TraceView`, `InvestigateView`, `onBoardAction`, `onPlaceAction`, `onTraceAction`, `DOWN_MARK`, `PIECES_LEGEND`, `FAILURE_LEGEND`, `CASES_HEADING`, `hopLine`, `caseLine`, `FILTERS_LEGEND`, `QUESTIONS_LEGEND`, `shownLine`.
- Engine: `ENGINE_VERSION` (unchanged), `CORE_LABS` (26), `CORE_LABS_PER_MODULE` (2), `HANDS_ON_MODULES` (5), `XP.lab`, `XP.labNoHints`, `weakestLab`.
- Tests and fixtures: `PLACE_SPEC`, `bakeryPlaceLab`, `TRACE_NETWORK_SPEC`, `TRACE_POLICY_SPEC`, `bakeryTraceLab`, `bakeryPolicyLab`, `INVESTIGATE_SPEC`, `INVESTIGATE_LISTING_SPEC`, `bakeryInvestigateLab`, `SYNTHETIC_PLACE_LAB_ID`, `SYNTHETIC_TRACE_LAB_ID`, `SYNTHETIC_POLICY_LAB_ID`, `SYNTHETIC_INVESTIGATE_LAB_ID`, `syntheticPlaceLab`, `syntheticTraceLab`, `syntheticPolicyLab`, `syntheticInvestigateLab`, `useSyntheticLab`, `useLabAt` (module-private, from Phase 4 Task 13), `answerDebriefByKeys(page, id = SYNTHETIC_SORT_LAB_ID)`, `SimLab.fixedIn`, `SimLab.wave`, `HEAVY_TIMEOUT_MS`, `buildContent`, `loadContext`.
- Content tooling: `$SCRATCH/p5/phase5-labs.js` with `WAVES`, `ROWS`, `ENGINE_NAME`, `COMMIT`, the waves `p5core` and `p5stretch`, the branches `content/phase-5-labs-core` and `content/phase-5-labs-stretch`, `pnpm --silent content:report --lab-targets`, `pnpm --silent content:validate --draft`.
- Prompts: `agents/lab-writer.md` and `agents/lab-critic.md` at `version: 2`, `VERSIONS` with both at 2, `PHASE_5_LABS`, the writer H2s `## Place labs`, `## Trace labs`, `## Investigate labs` and `## Stretch labs`, the critic's four matching criteria H2s, the plan headings `### Module N: <Title>`, and the STYLE H3s `### Place containers and pieces`, `### Trace rules and cases`, `### Investigate records and questions` and `### Engine rules beyond the notes`.
- The per-part names lists (defined, used from other tasks, used from Phase 4, checklist ids) were checked against the task texts; every name above is defined by the task the lists give, and every Phase 4 name matches `master` at 8ed213d or the Phase 4 plan.

### Phase 4 coexistence

Every Phase 5 edit to a file a Phase 4 task touches waits for that Phase 4 task on `master` and rebases on it; new Phase 5 files need only Phase 4 Task 1.

| Shared file | Last Phase 4 task to touch it | Phase 5 tasks after it |
|---|---|---|
| `schemas/ids.ts`, `tests/unit/lab-sort.test.ts` | Task 1 (merged) | 4 |
| `schemas/lab.ts`, `src/labs/engines.ts`, `scripts/content/lib/labs.ts`, `tests/unit/lab-schema.test.ts`, `tests/unit/r11.test.ts` | Task 13 (merged) | 4 (`schemas/lab.ts` also 5) |
| `src/labs/simulate/models.ts`, `tests/unit/lab-simulate.test.ts`, `tests/content/sim-labs.test.ts` | Task 13 (merged) | 5 |
| `src/app/lab.ts`, `tests/unit/lab.test.ts` | Task 13 (merged) | 4, 6, 7, 8 |
| `src/app/screens/Lab.tsx`, `tests/e2e/lab-helpers.ts`, `tests/e2e/labs.spec.ts` | Task 13 (merged) | 6, 7, 8 |
| `src/app/lab-keys.ts` | Task 6 (merged) | 4, 6 |
| `src/app/shortcuts.ts`, `tests/unit/lab-keys.test.ts`, `tests/unit/keys.test.ts` | Task 6 (merged) | 6 |
| `src/app/module.ts`, `src/app/screens/ModulePage.tsx`, `tests/unit/module.test.ts` | Task 8 (merged) | 4 |
| `schemas/chunks.ts`, `scripts/content/lib/report.ts`, `tests/unit/coverage.test.ts` | Task 14 (merged) | 4 |
| `src/ui/base.css` | Task 19 (merged) | 4, then 6, 7 and 8 under their own anchors |
| `agents/lab-writer.md`, `agents/lab-critic.md`, `content/STYLE.md` | Task 13 (merged) | 9 |
| `tests/unit/agents.test.ts` | Task 14 (merged) | 9 (Phase 6 also edits it; Task 9's exact red count holds only if it lands first) |
| `content/labs/**` | Task 10 (wave S merged; wave CS still to merge) | 10 (new files only; the waves merge through the shared merge chain) |
| `content/game/badges.yaml`, `tests/unit/game-content.test.ts`, `package.json`, `README.md`, the spec | Task 20 (0.6.0, still to come) | 11 |
| The `Labs:` line pins of wave CS, Task 11 and Task 20 | Task 10, Task 11 (run) and Task 20 | 4 (whichever runs second appends `, place 0, trace 0, investigate 0`) |
