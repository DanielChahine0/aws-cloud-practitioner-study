# CCP Study

CCP Study is Dani's personal static study site for the AWS Certified Cloud Practitioner exam (CLF-C02).
It serves the own-words notes in `resources/` as a reader with search, glossary popovers and dated "Exam guide update" lines.
Lesson checks, module quizzes and daily reviews let Dani practise every module with saved progress, offline too, and labs arrive phase by phase.
The design is `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, and the implementation plans live in `docs/superpowers/plans/`.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Serves the site with live reload; a content error shows in the Vite overlay |
| `pnpm preview` | Serves the last `pnpm build` on port 4173 with the production Content-Security-Policy |
| `pnpm check` | The fast gate: typecheck, Biome, `pnpm content:validate` and the unit tests; the pre-commit hook runs it |
| `pnpm verify` | The full gate: `pnpm check`, then the build with its size budgets, then the end-to-end and accessibility tests |
| `pnpm content:validate` | Runs the validator rules switched on in `content/validate.yaml`; `--all` runs every implemented rule |
| `pnpm content:fingerprint` | Rebuilds `content/fingerprints/` from the course source outside the repo |
| `pnpm content:concepts` | Works on the concept registry: `--seed`, `--pending NN`, `--check <file>` and `--apply <dir>` |
| `pnpm content:new-question [count]` | Prints fresh question ids, none used in the working tree or in `HEAD` |
| `pnpm content:checks <command>` | Runs the agent checks: `prepare --modules 01,03` writes keyless batches, `lint <file>` checks an answer file, `grade` grades every answer |
| `pnpm content:stamp` | Stamps each question whose three checks passed at its current hashes and sets it live; failed drafts get a `review` block |
| `pnpm content:report` | Counts and style lines, labs included; `--coverage` lists coverage by task and missing blueprint terms, `--needs-dani` lists drafts that failed 3 check rounds, `--homed <note>` gives a note's concepts with their `live`, `open` and `need` counts, `--targets` lists the notes whose concepts still need drafts, and `--lab-targets` lists each module's concepts with their live practice ids for the lab writers |
| `pnpm content:updates` | Checks (`--check <file>`) and applies (`--apply <dir>`) the update-writer results for missing blueprint terms |
| `pnpm site:deploy` | Runs `pnpm verify`, then publishes `dist/` to the Mission 1 bucket and refreshes CloudFront |

## Questions

Practice questions live in `content/questions/NN-module/LL-lesson.yaml`, one file per lesson note, written by agents that follow `content/STYLE.md` and the prompts in `agents/`.
A question starts as a `draft`, and `pnpm content:validate --draft <file>` checks a draft file as if it were live, with the style checks on top.
Three checks then run on keyless batches: a closed-book solve, a solve from the notes, and a critic in two rounds.
`pnpm content:stamp` is the only way to `live`: it writes the `verified` block with the hashes the checks passed at, and rule R9 fails a live question whose text changed since.
When a note edit breaks a question's evidence line, `pnpm content:validate --demote` sets that question back to `draft` so it goes through the checks again.
Only live questions ship in the module chunks; drafts and retired questions never reach the site.
Rule R10 keeps every tested concept at 2 or more live practice questions and every blueprint term in `resources/` or mapped by `coveredBy`.
A draft that failed its checks three times waits for Dani, so `--targets` asks the writers for fresh drafts in its place.

## Daily reviews

Every tested concept you answer gets one FSRS memory card, and the review queue brings each concept back when its recall drops to about 90%.
Home's Next button picks what to do now: resume a session, review what is due, continue or check a lesson, start the next one, or stop at "Done for today".
Check and Sure are a bet: Sure pays 10 XP when right and 0 when wrong, while Check pays 8 or 5, so press Sure only when you are more than 71% sure.
A wrong answer in a review brings another variant of the concept back a few questions later, and a wrong Sure marks a misconception that leads the next day's queue.
XP, the level, the streak with its freezes and the 13 module hexes are all replayed from the event log, so a rule change recalculates them instead of losing them.

## Offline

After one visit, a service worker keeps the whole site, every module included, so reviews work without a network.
A new version downloads in the background and takes over on the next launch, so an open page never mixes two versions.

## Progress and backups

Progress lives in this browser's IndexedDB as an append-only event log, and everything shown, from check scores to read marks, is replayed from it.
Open Progress from the top bar or with `g p` to export a backup file, which also carries any problems reported with `!` back to the content pipeline.
Importing a backup shows a preview first, and Merge, the default, joins the two logs by event id, so importing the same file twice adds nothing.
Home reminds you to export once at least 50 events are new and the last export is more than 7 days old.

## Setup

1. Install the Node version pinned in `.node-version` with `fnm install`, and check that `node --version` prints `v24.21.0`.
2. Install pnpm for that Node with `npm install -g pnpm@12.8.1`.
3. Install the dependencies with `pnpm install`.
4. Install the test browsers with `pnpm exec playwright install chromium webkit`.
5. Turn on the pre-commit hook with `git config core.hooksPath .githooks`.

Then `pnpm verify` should pass on a clean checkout.

## Deploying

The site runs on a private S3 bucket behind CloudFront, created from `infra/site.yaml` in Mission 1 (`content/missions/mission-01-host-this-site.md`).
`pnpm site:deploy` refuses to run with uncommitted changes, and it reads the stack `ccp-study-site` with the AWS profile `ccp-admin` unless `CCP_STACK` or `AWS_PROFILE` say otherwise.

## Exams

The exam pool lives in `content/exam/pool/`, one file per module, written by `agents/exam-writer.md`, which never reads the practice questions.
`pnpm content:quotas` writes `content/exam/quotas.yaml` from the registry and the blueprint, and `pnpm content:forms` splits the live pool into forms A to D in `content/exam/forms.yaml`.
`pnpm content:forms --freeze` freezes the forms once the pool meets its quotas, and rule R12 then keeps them as they are.
The check rounds run over the pool with `--pool exam`, and every tool prints exam items by id and count only.
Honor system: never open `content/exam/` or an `exam-?.<hash>.json` chunk before you have taken that form.
Each module has a boss of 15 questions in 21 minutes, which opens once every lesson of the module is read; 12 right passes, and a new try waits 20 hours.
A mock is 65 questions in 90 minutes on a wall-clock timer that cannot pause, scored over its live items with raw percentages only.
Readiness blends memory and the latest unseen mocks, caps at 70 without a mock, and names the weakest task statement; from 7 to 2 days before the exam date, Home shows the go/no-go line while readiness is below Ready.
Ranks follow the Support plans in `content/game/ranks.yaml` and never drop, and the 12 badges in `content/game/badges.yaml` are derived from the log.
Rule R10 also checks the exam quotas (`examQuotas: true`), and rule R12 guards the frozen forms.

## Labs

Labs live in `content/labs/NN-module/<slug>.yaml`, one file per lab, with the id `lab-mNN-<slug>`, written by `agents/lab-writer.md` and judged by `agents/lab-critic.md`.
Each module page lists its labs in a Labs section between Practice and Boss, and the palette finds them by title.
A Sort lab is played by tapping a card, then its bucket; by keyboard, `Tab` moves between the tray, the buckets and the goal hints, the arrow keys move within one, `Space` picks a card up, `1` to `9` and `0` place it, `Backspace` sends it back and `Escape` puts it down.
Goals are checked only when you press Check or `Enter`, `h` shows a hint, and `r` asks before it resets the board.
Hints are free, but a lab finished without one pays 10 XP more; only a lab's first completion pays XP and counts for the streak, and every completion runs its 2 or 3 debrief questions.
Unfinished work stays in the browser, so a lab resumes after a reload, and labs work offline like the rest of the site.
`pnpm content:validate --draft <lab file>` checks one lab, and rule R11 replays every lab's solution and wrong paths on each commit.

## Configure and Simulate labs

Configure labs walk a short wizard of choices, and Check judges the finished setup against the goals.
Simulate labs set a few parameters, and `Enter` (or `Run and check`) runs the lab's fixed model before it checks the goals, so the goals always read the parameters on screen.
Every price in a lab is in lab credits, a made-up unit, never an AWS price.
The six Simulate labs take their constants, solutions and wrong paths from fixed tables, and `tests/content/sim-labs.test.ts` pins the outcome each lesson rests on.

## Incidents and lightning

Once every Module 2 lesson is read, Home offers one incident a day on the extras line, picked from the weakest read modules, and it stays the day's incident until 04:00.
An incident runs at `#/s/incident` as 2 to 4 practice steps with the bet buttons; solving it pays 15 XP when every step is right, else 8, once a day, and the day counts toward the streak.
Incidents live in `content/incidents/inc-NNN.yaml`; `pnpm --silent content:report --incident-targets` lists what each module still needs, and the check rounds run over their steps with `--pool incident`.
The lightning round at `#/s/lightning` opens once 20 concepts have settled (an FSRS stability of at least 3 days) and asks single practice items for 90 seconds, with a summary at the end.
Only the first round of a study day pays, 1 XP per right answer up to 10; lightning never moves a card or the streak, and every miss comes back in today's review.

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

## Course text stays out

The course text lives only in `~/Library/Application Support/ccp-study/`, outside this repository.
The only course-derived data here is the one-way fingerprints in `content/fingerprints/`, which `pnpm content:fingerprint` writes.
No file, fixture or test in the repo may hold course text, and test fixtures use made-up bakery text instead.
