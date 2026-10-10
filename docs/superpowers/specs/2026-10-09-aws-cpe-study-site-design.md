# CCP Study: design spec for Dani's AWS Cloud Practitioner study site

This is the final design for a personal, static study site for the AWS Skill Builder course "AWS Cloud Practitioner Essentials" (13 modules) and the CLF-C02 exam.
It starts from the synthesized multi-agent design and applies every decision and simplification Dani approved on 2026-10-09.
External facts are listed with their sources in Appendix B, and course facts were checked against the course source text kept outside the repo.

## Status and decisions

- **Date:** 2026-10-09.
- **Status:** design approved by Dani in three parts on 2026-10-09, and the written spec approved the same day when he booked the exam and asked to start the implementation.

Decisions:

1. **Audience:** only Dani, on a fully static site with no backend, no accounts and no AI model at runtime; projects are self-graded against a rubric.
2. **Labs:** simulated in-browser labs by default, plus optional real-AWS missions on a new AWS free-plan account (credits, up to 6 months, a subset of services); every mission is designed to fit the free plan, and Mission 0 confirms plan fit per service and records the plan status.
3. **Gamification:** "clean progress" as specified in sections 3, 4 and 7, with no "Cafe analogy" note section and no promotion modal (a promotion is one dismissible line).
4. **Exam drift:** "Course + flagged updates", where the course stays the base and sourced, dated "Exam guide update" lines in notes are the single exception to course-only grounding; questions use the exam's current names.
5. **Ranks:** four ranks named after the current Support plans (Basic, Business Support+, Enterprise, Unified Operations), never taken away.
6. **Exam date:** booked for Saturday, November 14, 2026, with the go/no-go check on Saturday, November 7, when the exam is rescheduled if readiness is not Ready.
7. **Git:** a local repository only (on `master`, already holding the notes commit, no remote yet), and no validator rule compares against a remote branch.
8. **Course data:** lives in `~/Library/Application Support/ccp-study/` and never enters the repo; committed one-way fingerprints keep the originality check running in CI.
9. **Notes:** `resources/` holds own-words notes for every content lesson, written by a separate notes workflow in the format of `resources/README.md`, and the build counts them.
10. **Hosting:** a private S3 bucket behind CloudFront with Origin Access Control, in CloudFormation, deployed by Dani as Mission 1 on the default CloudFront domain.

Simplifications (removed from the synthesized design):

- Extraction is done, because all 13 modules were captured on 2026-10-09 through Dani's own Chrome, so there are no browser lanes, parallel Chrome profiles, copied login state, or login and lane scripts; re-extraction is a manual one-off (Appendix A).
- There are no id lock files and no verification ledgers, because each question carries its own `verified` block.
- There is no Rise block manifest and no `covers` list in note frontmatter, because note completeness was established by the notes workflow's fact-check pass.
- There is one concept registry, `content/concepts.yaml`.
- There are 13 validator rules instead of 25, switched on phase by phase in `content/validate.yaml`.

## 1 Stack and repo layout

**Decisions.**
The app is a Vite, Preact, strict TypeScript and `@preact/signals` static SPA with hash routing, four runtime dependencies and Markdown rendered at build time.
Scripts are TypeScript on Node 24 LTS, and the validator ports the thresholds and title masking of the Python pipeline tools without depending on them.
The repository is local only, a pre-commit hook runs the fast checks, and hosting is private S3 plus CloudFront deployed by Dani as Mission 1.

### 1.1 Stack

| Choice | Reason |
|---|---|
| Preact SPA, not Astro | One stateful learner session (top bar, queue, exam timer, labs) spans every screen; Astro islands would split that state and would still need a custom validator for rules that span files. |
| Hash routing (`#/m/03/l/aws-lambda`) | Works on a private bucket with no CloudFront Function, and works offline. |
| Markdown to HTML at build time | The bundle carries no Markdown parser. |
| Zod schemas as the single source of truth | Types come from `z.infer` and editor JSON Schemas from `z.toJSONSchema`; event and backup schemas are written in `zod/mini` so the app and the scripts share them, while content schemas may use classic Zod because they run only at build time. |
| `ts-fsrs` pinned to an exact version behind a wrapper | We do not maintain the algorithm, swapping it is a one-file change, and golden vectors lock its behaviour. |

| Dependency | Where | Purpose |
|---|---|---|
| `preact`, `@preact/signals` | runtime | UI and the reactive store |
| `ts-fsrs` (exact pin) | runtime | Scheduler and retrievability |
| `zod` (`zod/mini` at runtime, lazy-loaded) | build and runtime | Content schemas; validating backup imports |
| `vite`, `@preact/preset-vite`, `typescript` | dev | Build |
| `marked`, `yaml` | dev | Parsing notes and content at build time |
| `vitest`, `fast-check` | dev | Unit and property tests |
| `@playwright/test`, `@axe-core/playwright` | dev | End-to-end and accessibility tests |
| `@biomejs/biome` | dev | Lint and format |

- **Node:** Node 24 LTS, pinned in `.node-version` and `engines`; this Mac has Node 22, so Phase 0 starts with `fnm install 24`.
- **Budgets:** initial JS at most 50 KB gzipped, each module's content chunk at most 120 KB gzipped, system fonts only, and no third-party requests (the CSP enforces this).
- **Hand-written pieces:** an IndexedDB wrapper (about 80 lines), a hash router (about 40 lines) and a service worker (about 60 lines).
- **Strict TypeScript:** `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- **Engine boundary:** pure engine code under `src/engine/` may not import DOM or UI code, and a Biome rule enforces this.

### 1.2 Repo layout

```
/
  .githooks/pre-commit                # runs `pnpm check`; enabled once with `git config core.hooksPath .githooks`
  resources/                          # own-words notes from the notes workflow; source of truth for prose
    README.md  glossary.md  concepts.md
    NN-module-slug/README.md
    NN-module-slug/LL-lesson-slug.md
  content/
    validate.yaml                     # active validator rules and thresholds, raised phase by phase
    concepts.yaml                     # the one concept registry
    fingerprints/mNN.json             # one-way, modulus-sized hashes of the course's 6-word shingles
    fingerprints/allow.txt            # module and lesson titles plus official lists, masked before checks
    exam/blueprint.yaml               # domains, weights, 19 tasks, named terms, source URLs, verified_on
    exam/quotas.yaml                  # exam-pool targets per module x task, multi-response targets per domain
    exam/forms.yaml                   # forms A-D, frozen once committed
    exam/pool/NN-module-slug.yaml     # exam-pool (holdout) items; tool output shows their ids only
    questions/NN-module-slug/LL-lesson-slug.yaml   # practice-pool items
    labs/NN-module-slug/<lab-slug>.yaml
    incidents/inc-NNN.yaml
    missions/mission-NN-slug.md
    project/brief.yaml                # capstone brief, 13 prompts, reference key points, rubric
    game/ranks.yaml  game/badges.yaml
    STYLE.md                          # writing rules for question and lab agents
  agents/                             # versioned prompts (2.7)
  schemas/                            # zod schemas shared by scripts, app and tests
  scripts/content/                    # build validate stamp report fingerprint concepts quotas forms new-question
  src/
    app/ (router.ts, screens/)  ui/ (components, tokens.css)
    engine/ srs.ts bets.ts xp.ts level.ts streak.ts queue.ts mastery.ts readiness.ts
            ranks.ts badges.ts boss.ts mock.ts select.ts replay.ts rng.ts
    labs/ contract.ts + sort/ configure/ simulate/ place/ trace/ investigate/ (model.ts, View.tsx)
    store/ idb.ts events.ts kv.ts backup.ts migrations/
    sw.ts
  tests/ unit/ property/ content/bad/ fixtures/{journeys,backups}/ regressions/ e2e/
  infra/site.yaml                     # CloudFormation for Mission 1
  docs/superpowers/specs/             # this spec
```

- `NoteId` is derived, never stored: `mNN/<slug>` from a note's `module` and `slug` frontmatter, for example `m03/aws-lambda`.
- No file under the repo holds course text, and Appendix A is the only route by which course data changes.

### 1.3 Git and checks

- The repository is local on `master` with no remote, and it already holds the notes commit (`1e0149a`, the own-words notes for all 13 modules); Phase 0 adds the site scaffold.
- `pnpm check` is the fast gate: `tsc --noEmit`, Biome, `pnpm content:validate`, and unit and property tests.
- `pnpm verify` is the full gate: `pnpm check`, then the build with the size budget check, then the end-to-end tests.
- The pre-commit hook runs `pnpm check`, and `pnpm site:deploy` runs `pnpm verify` first.
- "CI" in this spec means these two local gates.
- The only rule that looks at history (rule 2) reads the local `HEAD` commit with `git show HEAD:<path>`, and it is skipped while `HEAD` has no content files.
- Nothing depends on a remote; if one is added later, a CI job would run rule 2 against `HEAD~1`, because there `HEAD` is the commit under test.

### 1.4 Hosting (Mission 1)

- `infra/site.yaml` creates a bucket with Block Public Access fully on, owner-enforced object ownership and SSE-S3 encryption, read only through CloudFront Origin Access Control.
- The distribution sets `DefaultRootObject: index.html`, so `/` serves the app instead of a 403 from the private bucket.
- A response headers policy sets `Content-Security-Policy: default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'`, plus HSTS and `X-Content-Type-Options: nosniff`.
- Hashed assets, including every `content/*.<hash>.json` chunk, get `Cache-Control: max-age=31536000, immutable`, while `index.html` and `sw.js`, the only unhashed files (2.10), get `no-cache`.
- The stack outputs `BucketName`, `DistributionId` and `SiteUrl`, and the site lives at the default `*.cloudfront.net` domain with no custom domain and no Route 53.
- `pnpm site:deploy` runs `pnpm verify` and then, with `AWS_PROFILE=ccp-admin` (the IAM admin user from Mission 0, signed in with `aws login`):
  1. **Hashed files:** `aws s3 sync` uploads them with no `--delete`.
  2. **Entry files:** `index.html` and `sw.js` are uploaded with `no-cache`.
  3. **Invalidation:** `/index.html`, `/` and `/sw.js`.
  4. **Prune:** hashed files that belong to neither this build nor the previous one are deleted, using a `deploys.json` manifest kept in the bucket, so a browser still holding the previous `index.html` can load its chunks.
- Deploy refuses to run on a failing tree or with uncommitted changes.

## 2 Content pipeline

**Decisions.**
Prose comes only from the own-words notes in `resources/`, and the course data stays outside the repo, reaching it only as one-way fingerprints.
Questions cite evidence lines that appear word for word in the notes, carry their own `verified` stamp bound to content hashes, and use the exam's current names.
One registry, `content/concepts.yaml`, maps note tags to concepts, and 13 validator rules, switched on phase by phase and each with a failing fixture, gate every commit.

### 2.1 Inputs and boundaries

| Input | Where | Enters the repo as |
|---|---|---|
| Raw course JSON for all 13 modules, plus `manifest.json` (captured 2026-10-09) | `~/Library/Application Support/ccp-study/raw/` | nothing |
| Readable course text, `module-NN.md` | `~/Library/Application Support/ccp-study/source/` (written by `render_source.py`) | `content/fingerprints/` only: modulus-sized shingle hashes, plus the titles and official lists that are masked (2.5) |
| Pipeline tools `render_source.py`, `overlap_check.py`, `lint_notes.py`, plus `allow.txt` | `~/Library/Application Support/ccp-study/pipeline/` | nothing; rules 7 and 8 port their thresholds and masking |
| Own-words notes, glossary and concept index | `resources/` | themselves |
| Official AWS pages | the web | URLs with a `verified_on` date, in "Exam guide update" lines, `blueprint.yaml` and missions |

- Scripts find the course data through `CCP_STUDY_HOME`, which defaults to `~/Library/Application Support/ccp-study`.
- Only `scripts/content/fingerprint.ts` reads it, and it refuses to write anywhere except `content/fingerprints/`.
- Nothing else in the build, the tests or CI needs the course data, so a fresh clone validates without it.

### 2.2 Notes

- The format is the one in `resources/README.md`, and the site pipeline adopts it unchanged.
- **Module README frontmatter:** `module`, `slug`, `title`, `source`, `lessons` and `assessment_questions`.
- **Module README sections, in order:** What this module covers, Lessons (grouped by the course's section dividers), Key takeaways, What the assessment focuses on, Summary, Further reading (links only, never tested).
- **Lesson frontmatter:** `module`, `lesson`, `slug`, `title`, `source` and `concepts` (a list of kebab-case tags).
- **Lesson sections, in order:** Objectives, Notes (H3 topic sections), Visuals (optional), Key takeaways, Scenarios (optional), Terms.
- **Shared files:** `resources/glossary.md` (every Terms entry, A to Z, with links to the defining lessons) and `resources/concepts.md` (the notes workflow's tag index).
- The notes workflow (writer, fact-checker, originality reviewer, fixer) produces these files, and its fact-check pass against the course source established that every content lesson is covered.
- The site pipeline does not re-prove block coverage, and this spec claims no note, tag or term counts: `pnpm content:report` prints them from the files.
- The site pipeline edits notes in two ways only: it adds "Exam guide update" lines (2.3), and it adds the matching concept tags to the note's `concepts` frontmatter.
- Every other note change goes through the notes workflow and its checks.
- When the notes workflow rewrites a lesson (Appendix A), it keeps every line starting with `- **Exam guide update**` and every frontmatter tag; rule 6 catches a dropped tag, and rule 10's blueprint-term check catches a dropped update line.

### 2.3 Exam drift: course plus flagged updates

- The course is the base for every note, question, lab and capstone key point.
- The single exception is an "Exam guide update" line, which records where the current CLF-C02 exam guide differs from the course.
- Each line is a bullet inside the relevant H3 under `## Notes`, so the note structure and `lint_notes.py` stay valid:

```markdown
- **Exam guide update** (verified_on 2026-10-09, [CLF-C02 Domain 4](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html)): The exam guide names four Support plans: Basic Support, AWS Business Support+, AWS Enterprise Support and AWS Unified Operations.
```

- **Format:** `- **Exam guide update** (verified_on YYYY-MM-DD, [title](https://...)): <one own-words sentence>`.
- **Source:** the link must point at `aws.amazon.com` or `docs.aws.amazon.com`, normally the exam guide or the Support plans page.
- **Freshness:** `verified_on` must be within 180 days of the build date (rule 13).
- **Reader:** the line renders under an "Exam guide update" label with its date and source link, visually separate from course content.
- **Naming policy:** questions, labs, the capstone and ranks use the exam's current names, so the course-only plan names (Developer, Business and Enterprise On-Ramp Support) never appear in a question, while the notes keep them as course content.

Known gaps found so far by an exact-phrase search of the course source text and the notes on 2026-10-09 (the coverage report below produces the full list):

| Task | Exam guide names | Course |
|---|---|---|
| 4.3 | Basic Support, AWS Business Support+, AWS Enterprise Support, AWS Unified Operations | Teaches Basic, Developer, Business, Enterprise On-Ramp and Enterprise, and says Developer, Business and Enterprise On-Ramp are discontinued on January 1, 2027 |
| 4.2 | AWS cost allocation tags; AWS Cost and Usage Report | Not found |
| 4.3 | AWS Prescriptive Guidance; system integrators (AWS Partner Network) | Not found |
| 2.4 | AWS Firewall Manager; AWS Security Center | Not found |
| 2.2 | Reporting with access reports | Not found |
| 2.3 | Access keys; password policies | Not found |
| 1.1 | Speed of deployment | Not found as a phrase |
| 1.3 | Database replication; CAF benefits named as reduced business risk, improved ESG performance, increased revenue and increased operational efficiency | Not found, except "operational efficiency" |
| 1.4 | Included licenses (against BYOL) | Not found |
| 3.5 | AWS VPN | Taught as Site-to-Site VPN and Client VPN |
| 3.7 | Amazon Quick Sight | Spelled "QuickSight" |

- `content/exam/blueprint.yaml` lists, per task statement, the `terms` the guide names as examples, copied from the domain pages with their URLs and `verified_on`.
- A term the course teaches under other wording, such as AWS VPN, may carry `coveredBy: <concept id>` instead of needing an update line.
- `pnpm content:report --coverage` prints, for each of the 19 tasks, its concepts, live practice items, exam items, and every blueprint term neither found in `resources/` (case-insensitive exact phrase) nor mapped by `coveredBy`.
- Each missing term becomes an update line in the note closest to its topic, registered as a concept whose `tasks` include that task, until the report lists no missing term (rule 10, from Phase 2).
- Module 11 keeps the course's five-plan list and its January 1, 2027 discontinuation notice as course content.
- It gains one update line naming the four current plans (the example above), plus two fact lines for each of Business Support+, Enterprise Support and Unified Operations, sourced from the Support plans page; these six sentences are the rank facts in 3.4.

### 2.4 Concept registry (`content/concepts.yaml`)

```yaml
- id: aws-lambda                     # kebab-case, global, never reused
  name: AWS Lambda                   # display name
  home: m03/aws-lambda               # note id; the home note must list this id in `concepts`
  anchor: what-lambda-is             # slug of an H3 under ## Notes in the home note
  tasks: ["3.3"]                     # required; at least 1 for a tested concept, [] only with tested: false
  confusableWith: [amazon-ec2, aws-fargate]   # optional, at most 3, one-sided
  aliases: []                        # optional: other note tags that mean this concept
- id: coffee-shop-analogy
  name: Coffee shop analogy
  home: m01/welcome-to-aws-cloud-practitioner-essentials
  anchor: coffee-shop-connections
  tasks: []
  tested: false                      # optional, default true; not scheduled, no coverage, not in mastery
```

- Every tag in any note's `concepts` list must be a registered `id` or an alias (rule 6).
- Every concept's home note must list its `id` in `concepts`, and its `anchor` must be an H3 in that note (rule 6).
- A tag listed in several notes has one home, and the other notes appear as "Also in" links built from the tags.
- `confusableWith` is written on one side only; the build makes it symmetric, caps it at 3, and uses it only for queue placement (3.7).
- A merge turns the old id into an alias of the surviving concept, and a split adds `splitFrom: <old id>` to each new concept so replay copies the card state (8.4).
- `tasks` is a required field, and a tested concept needs at least one task, so every tested concept counts toward readiness and its questions have a task to carry.
- `pnpm content:concepts --seed` adds an entry for every unregistered tag, with `home` set to the first note that lists it (module, then lesson order), `anchor` empty and `tasks` omitted, so rule 1 fails until the `registry-writer` agent fills them and Dani reviews the diff.
- The build reads tags from note frontmatter, not from `resources/concepts.md`, and the report warns when the two disagree.
- `C` below means the number of tested concepts, which the build prints.

### 2.5 Fingerprints (one-way originality data)

- `pnpm content:fingerprint` reads `source/module-NN.md` and writes `content/fingerprints/mNN.json` and `content/fingerprints/allow.txt`.
- **Tokens** follow `overlap_check.py` exactly: lowercase, then `[a-z0-9]+(?:['’][a-z]+)?`.
  - The source is tokenized as it is, without stripping Markdown.
  - Checked text (notes, questions, key points) is tokenized after stripping frontmatter, link targets, URLs and the characters `*`, `_`, backtick, `#`, `>` and `|`.
- **Modulus-sized sets:** each 6-word shingle is hashed with sha256, and the first 4 bytes as an unsigned integer, modulo `range`, are its value, where `range = floor(n / 0.005)` for a set of `n` distinct shingles.
  - Each set's false-positive rate `f = count / range` is therefore 0.5% (a hair below only where two shingles share a value), and the file stores `range`, `count` and `f`.
  - A module's `text` and `items` sets together give about 1%, the old upper bound, which per-set truncation to whole bits would have pushed to 1% to 2%.
  - The small range is what makes the sets one-way: with full-width hashes, anyone could start from a known phrase such as a lesson title and test every next word, and the course text would come back almost word for word.
  - At 0.5% per set, each next-word test across the course's about 5,500 distinct words passes about 27 wrong candidates, so the rebuild branches at every word and fails.
  - A unit test asserts `0.004 <= f <= 0.01` for every set.
- **One set per course shingle:** every distinct shingle of the whole course is stored in exactly one of 26 sets, a `text` and an `items` set per module.
  - A shingle that occurs inside any knowledge check or assessment item goes to the `items` set of the lowest-numbered module whose items hold it, split at the source's `[KNOWLEDGE CHECK ...]` and `[ASSESSMENT Qn ...]` markers.
  - Every other shingle goes to the `text` set of the lowest-numbered module that holds it.
  - A shingle stored in two sets would let a guess be tested twice, which cuts the false-positive rate from about 0.5% to about 0.0025% and breaks the one-way property; the rule also drops the cross-module copies that per-module sets stored.
  - `itemIds` lists the ids of the module's knowledge checks and assessment items (`kc-01`, `quiz-01` and so on).
  - `itemsFrom` lists the other modules whose `items` sets hold some of this module's item shingles, as module numbers only, so the stem check can read a module's items whole.
- The whole course comes to 135,093 shingles in 26 sets, packed as 3-byte values in base64, about 0.6 MB, with no text and no positions.
- **Masking:** `allow.txt` holds the phrases `overlap_check.py` masks, namely every module and lesson title from the source's title lines plus the official names and fixed lists in `pipeline/allow.txt` (such as the six Well-Architected pillars).
  - Titles are names that the notes already carry in their `title` frontmatter, not course prose.
  - Before shingling, rule 7 masks these phrases in the checked text exactly as `overlap_check.py` does, and skips every shingle that touches a masked word.
- **Runs:** a run of 9 or more copied words shows up as 4 or more consecutive shingles that all hit, because a 9-word run contains exactly 4 overlapping 6-word shingles.
  - This is a slightly stricter stand-in for the 9-gram test in `overlap_check.py`, because 4 consecutive hits can also come from overlapping phrases in different places of the source.
  - At `f` of about 1% for a module's two sets, 4 consecutive false hits occur with a chance of about 1e-8 per position.
- **Share:** the share is corrected for false positives: `share = (hits / shingles - f) / (1 - f)`.
- **Notes:** checked against their own module's `text` and `items` sets: no run, and a corrected share of at most 8%.
  - Under the one-set rule these two sets no longer hold every shingle of the module, so coverage is narrower than `overlap_check.py`, which reads the whole module source.
  - Measured on 2026-10-09, 0.1% (Module 1) to 4.1% (Module 10) of a module's distinct shingles sit in other modules' sets, and 14 notes show shorter exact runs than against their own source, though none comes near a limit.
  - Adding the sets of every module a note's module shares shingles with was tried and rejected: it joins phrases from different places into 17 false runs on notes that `overlap_check.py` passes, the problem the last bullet of this section describes.
  - `overlap_check.py`, which the notes workflow runs on changed lessons (Appendix A), stays the full-coverage check for notes.
- **Questions, incident steps and capstone key points:** no run against any one module's two sets, checked module by module across the whole course.
  - A run whose shingles the one-set rule split between two modules is not seen as one run, for the same reason as for notes; pooling sets would add false runs (2 on the 99 pilot questions).
  - **Stem check:** a live question's stem and option texts (or a match question's lefts and rights) may not share an 8-word run, 3 consecutive hit shingles, with any one module's knowledge checks and assessment items, read as the module's `items` set together with the `items` sets of its `itemsFrom` modules.
  - So a run the one-set rule split between two modules' `items` sets is still one run; each run is reported once, under the lowest module that shows it.
  - Their pooled corrected share against those sets may not exceed 25% when they hold at least 8 shingles; a module whose own `items` set has no hit leaves the share to the module that owns the hits.
  - The bar is closer than the 9-word run, because knowledge checks are the text a practice question is most likely to echo; at `f` of 0.5%, a false 3-run happens about once in 8 million positions, and with the up to 6 `items` sets of a module and its `itemsFrom` modules (`f` about 3%) about once in 37,000.
- **Checked on 2026-10-09** against the current notes:
  - With this masking and the Phase 0 truncated sets, every note passed (worst corrected share 3.8%, no run).
  - Checked again in Phase 1 with the modulus-sized sets and the one-set rule: every note passes (worst corrected share 3.6%, no run).
  - Without the masking, 5 notes fail on lesson and module titles, which `overlap_check.py` masks.
  - A whole-course run check would flag one Module 11 note on a phrase whose 4 shingles all occur in Module 2 but never as one 9-word run, which is why notes are checked against their own module only.

### 2.6 Question bank

| Type | Shape | Why | Pools and modes |
|---|---|---|---|
| `single` | 4 options, exactly 1 correct | The exam's multiple choice | All |
| `multi` | 5 or 6 options, `select` of 2 or 3, correct count equal to `select`, the "(Select TWO.)" suffix generated, scored all-or-nothing | The exam's multiple response | All |
| `match` | 3 to 5 unique left and right pairs | The course's matching checks; trains telling similar services apart | Practice pool only; never in bosses or mocks |

Sort, order and free recall are taught by labs, not by question types.

```yaml
# content/questions/03-exploring-compute-services/02-aws-lambda.yaml
questions:
  - id: q-7k2m9p              # "q-" + 6 random Crockford base32 characters
    version: 1                # +1 when the correct options change, with a history entry
    status: live              # draft | live | retired (tombstone, never deleted)
    type: single
    pool: practice            # practice | exam (holdout, mocks only, stored under content/exam/pool/)
    concept: aws-lambda       # the FSRS card
    note: m03/aws-lambda      # the cited note
    task: "3.3"
    level: 2                  # 1 recall, 2 apply, 3 discriminate
    stem: >-
      The cafe's loyalty app gets bursts of orders at 8 a.m. and almost none overnight.
      Which compute option avoids paying for the idle hours?
    options:
      - { id: a, text: AWS Lambda, correct: true, why: Lambda bills only for compute time used, so idle hours cost nothing. }
      - { id: b, text: Amazon EC2 On-Demand Instances, why: An instance bills while it is running, including the hours with no orders. }
      - { id: c, text: Amazon EC2 Reserved Instances, why: A reservation commits to steady use over a term, the opposite of this pattern. }
      - { id: d, text: Amazon Lightsail, why: Lightsail charges a set monthly price whether or not orders arrive. }
    evidence:
      - You pay for compute time only, per millisecond, priced by allocated memory.
    takeaway: Spiky, event-driven work with idle gaps points to Lambda's pay-per-use billing.
    history: []               # [{ version, change: key-fix | rewrite, rescore: true | false }]
    verified:
      keyHash: 3f9a1e0c7b2d   # hashes the question was verified at
      fullHash: 81b2d4aa90ce
      checks: [solve-closed@3, solve-notes@2, critic@4]   # check name @ prompt version
      on: 2026-10-12
```

```ts
// schemas/question.ts (excerpt)
const Qid = z.string().regex(/^q-[0-9a-hjkmnp-tv-z]{6}$/);
const Option = z.object({ id: z.enum(['a','b','c','d','e','f']), text: z.string().min(1).max(220),
  correct: z.boolean().default(false), why: z.string().min(20).max(400) });
const Verified = z.object({ keyHash: z.string().regex(/^[0-9a-f]{12}$/), fullHash: z.string().regex(/^[0-9a-f]{12}$/),
  checks: z.array(z.string().regex(/^(solve-closed|solve-notes|critic)@\d+$/)).length(3), on: IsoDate });
const Review = z.object({ attempts: z.number().int().min(1), lastFailure: z.string() });   // drafts only
const Base = z.object({ id: Qid, version: z.number().int().min(1), status: z.enum(['draft','live','retired']),
  pool: z.enum(['practice','exam']), concept: ConceptId, note: NoteId, task: TaskId,
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]), stem: z.string().min(20).max(600),
  evidence: z.array(z.string()).min(1).max(3), takeaway: z.string().max(160), history: z.array(History).default([]),
  verified: Verified.optional(), review: Review.optional() });
export const Question = z.discriminatedUnion('type', [
  Base.extend({ type: z.literal('single'), options: z.array(Option).length(4) }),
  Base.extend({ type: z.literal('multi'), select: z.union([z.literal(2), z.literal(3)]), options: z.array(Option).min(5).max(6) }),
  Base.extend({ type: z.literal('match'), pool: z.literal('practice'), pairs: z.array(Pair).min(3).max(5) }),
]).superRefine(checkCorrectCountsAndStamp);
```

**Pool targets:**
- **Practice pool:** at least 2 live questions per tested concept (`2C`) from Phase 2, and 3 per concept (`3C`) from Phase 6.
- **Exam pool:** 260 questions (4 forms of 65), split by domain as D1 64, D2 76, D3 88 and D4 32, with exactly 8 multi-response questions per form.
- The multi-response share (8 of 65) is our own choice, because AWS does not publish one, and it splits 2/2/3/1 by domain per form, so the pool holds 8, 8, 12 and 4.
- Exam-pool items live in `content/exam/pool/NN-module-slug.yaml`, apart from the practice files Dani reads, and validator and report output for them shows ids only.
- `pnpm content:quotas` writes `quotas.yaml` so the pool splits exactly into forms A-D:
  - Each task's pool target is 4 times its per-form count (4.3).
  - That target is split across modules in proportion to the module's tested concepts tagged with the task, by largest remainder, giving module x task cells.
  - The per-domain multi-response targets are 8, 8, 12 and 4.
  - No concept may hold more than 4 exam-pool items, one per form.
- **Incidents:** 48 incidents (4 for each of Modules 2 to 13), each with 2 to 4 `single` or `multi` steps that use the question schema, including its `verified` block.

### 2.7 Generation and verification

- **Agents** (`agents/<name>.md`, each prompt versioned):
  - `question-writer` writes questions, incident steps and capstone key points.
  - `lab-writer` writes labs.
  - `registry-writer` fills `anchor` and `tasks` in `concepts.yaml`.
  - `update-writer` writes "Exam guide update" lines for missing blueprint terms, with their source URLs.
  - `solve-closed`, `solve-notes` and `critic` run the checks below.
- **Writer inputs:** the cited note, the concept's registry entry, the blueprint task text, `STYLE.md` and the module's quota cells.
- Writers never see the course source text or AWS exam questions, so originality holds by construction and rule 7 proves it.
- Question batches run module by module, and an agent writes only under its module's `content/questions/NN-*/`, `content/exam/pool/NN-*.yaml` and `content/labs/NN-*/`, so module batches can run in parallel without shared files.
- Shared files (`concepts.yaml`, `quotas.yaml`, `forms.yaml`, incidents, the capstone brief) are edited by one agent at a time.
- Ids are random, so parallel batches need no coordination, and rule 2 catches the rare collision.

**`STYLE.md` rules** (checked by the critic agent):
- One concept per question.
- About 60% of stems are scenarios: practice stems use the cafe, and exam-pool stems use neutral businesses.
- Distractors come from the same category and name only services in `resources/glossary.md` or an "Exam guide update" line.
- Options are parallel in grammar and length, and in each module the correct option is the longest in at most 35% of `single` questions.
- No "all of the above", "none of the above", "both A and B" or letter references.
- Negative stems use a bold **NOT** and make up at most 5% of each module's questions.
- A number may appear only if the cited note states it.
- Names follow the exam guide (2.3).

| Check | Kind | Input | Pass condition | Bound to |
|---|---|---|---|---|
| `solve-closed` | fresh agent, no key, no notes | stem and shuffled options | Picks exactly the key and answers "no" to "is a second option defensible?" | `keyHash` |
| `solve-notes` | fresh agent, no key, given only the cited note's sections that hold the evidence lines, plus Key takeaways and Terms | stem and options | Picks the key and quotes the line that supports it | `fullHash` |
| `critic` | fresh agent with the key | options alone first, then the full question | Does not find the key from the options alone on a named basis (cue check), every distractor is wrong for its stated `why`, no clue words or length tell, the task tag fits, and `STYLE.md` holds | `fullHash` |

**Cue check:**
- The cue round guesses every non-match question from its options alone and names the basis of each guess: `tell` (length, grammar, a standout or repeated word, or an option more specific or hedged than the rest), `knowledge` (only the key is a true statement about AWS on its own, so the stem is not needed), or `guess` (nothing stands out).
- A `tell` or `knowledge` basis carries a one-line `reason`.
- A hit fails the question only when its basis is `tell` or `knowledge`, with the reason `the cue round found the key from the options alone (<basis>: <reason>)`, so the writer knows what to fix.
- A hit on a plain `guess` passes, because a forced guess lands on the key by luck about 25% of the time on a four-option `single` and says nothing about tells.
- The fix for a `knowledge` hit is distractors that are also true statements about AWS but do not answer the stem.

**Hashes:**
- `keyHash` is the first 12 hex characters of `sha256(canonicalJSON({type, stem, select, options[{id,text,correct}], pairs[{left,right}]}))`.
- `fullHash` also covers `why`, `evidence`, `takeaway`, `concept`, `task` and `note`.
- `solve-notes` is bound to `fullHash` because `note` and `evidence` decide which note sections it receives.
- A typo fix in a `why` line changes only `fullHash`, so `solve-notes` and `critic` re-run and `solve-closed` keeps its pass.
- Any edit to the stem, options or key changes both hashes, so all three checks re-run.
- A capstone key point carries a `fullHash` over its text, concepts and evidence, and its only agent check is `critic`.

**Stamping and lifecycle:**
- Checker agents return JSON results to a temp folder, and `pnpm content:stamp` writes the `verified` block only when every required check passed at the current hashes; the results are not committed.
- A question becomes `live` only with a matching `verified` block (rule 9).
- A failed check leaves the question `draft` with `review: { attempts, lastFailure }`, and a writer agent revises it.
- After 2 failed revisions, a practice item is listed by `pnpm content:report --needs-dani`.
- After 2 failed revisions, an exam-pool item is retired in place (`status: retired`, so rule 2 holds and the id is never reused) and a new one is generated, because Dani must never see holdout items before a mock.
- Agents check batches of at most 10 questions, at most 1 per concept, in shuffled order, answering each question independently in JSON.
  NOTE: "different lessons" is a soft rule that `makeBatches` follows when it can; a hard lesson rule can make a 26-batch deal impossible (Phase 3).
- A full pass costs about `3 x (2C + 260 + incident steps) / 10` agent runs, plus about 20% for revisions.

### 2.8 How notes and questions reference each other

- References are stored in one direction only: a question points to a concept, a note and evidence lines, and labs, incidents and capstone key points point to concepts.
- The build computes the reverse links (concept to questions, labs and notes).
- The reader shows "Check yourself (N)" at the end of each note and a recall dot beside each anchor H3.
- "Read in notes" (`o`) opens the note at the anchor and highlights the evidence line by exact text match.
- Glossary popovers attach at build time to the first use of each glossary term in a note, with no markup in the notes.
- Raw question and concept ids appear only in the report panel; everywhere else, including the capstone editor and reveal (6), concepts show by display name.

### 2.9 Validator rules (`pnpm content:validate`; any failure fails CI)

| Id | Rule |
|---|---|
| R1 Schema | Every content file parses and validates against its zod schema (questions, labs, incidents, missions, concepts, blueprint, quotas, forms, ranks, badges, brief). |
| R2 Ids | Ids match their patterns and are unique across questions, labs, incidents, missions and concepts; compared with the local `HEAD` commit, no id that is `live` or `retired` in `HEAD` has disappeared (drafts may be deleted, and retiring means `status: retired` in place), a question whose correct options changed has `version` one higher and a `key-fix` history entry, and a form marked `frozen: true` in `HEAD` is unchanged. |
| R3 Answer counts | `single` has exactly 1 correct of 4; `multi` has a correct count equal to `select` (2 or 3) among 5 or 6 options; `match` has unique lefts and rights and sits only in the practice pool. |
| R4 Explanations | Every option and pair has a `why`, and every question and incident step has 1 to 3 evidence lines and a takeaway. |
| R5 Evidence | Every evidence line equals one whole line of the cited note (for a capstone key point, of the home note of one of its concepts), compared after stripping list markers (`-`, `*`, `1.`, `1)`), `**` and link syntax, case-sensitive; for an "Exam guide update" line the evidence is the sentence after the colon, so refreshing `verified_on` never breaks it; in a table the evidence is one body cell, never a whole row or a header cell, because "Read in notes" highlights one rendered block. |
| R6 References | Concepts (through aliases), notes, task ids, lab and incident question refs, note links, and the links in `resources/glossary.md` and `resources/concepts.md` resolve; every note tag is a registered concept or alias; every concept's home note lists it and contains its anchor H3; a question's `task` is one of its concept's `tasks`; `confusableWith` targets exist, at most 3. |
| R7 Originality | Against the committed fingerprints, with the `allow.txt` phrases masked (2.5): notes have no run and a corrected share of at most 8% against their own module, and questions, incident steps and key points have no run against any module; live question stems and options also pass the stem check against each module's knowledge checks and assessment items (no 8-word run, at most 25% shared). |
| R8 Markdown style | No U+2014 in any tracked file except under `tests/content/bad/`; one sentence per line in all Markdown (the `lint_notes.py` regex and abbreviation list; code and tables exempt); note frontmatter keys and section order as in `lint_notes.py`. |
| R9 Verified stamp | Every live question, incident step and capstone key point has a `verified` block whose hashes equal its current hashes and whose `checks` name every required check (all three for questions and incident steps, `critic` for key points). |
| R10 Coverage | Driven by switches in `validate.yaml`: at least `practicePerConcept` live practice questions per tested concept; with `examQuotas`, every `quotas.yaml` module x task cell and multi-response target met by live exam-pool items and no concept with more than 4 exam-pool items; with `blueprintTerms`, every blueprint term found in `resources/` (case-insensitive exact phrase) or mapped by `coveredBy`. |
| R11 Labs replay | Each lab validates against its engine schema, its `solution` reaches every goal, its initial state fails at least one goal, and each `wrongPath` fails its named goal. |
| R12 Mock forms | Each form that is not frozen has 65 live exam-pool items with domain counts 16/19/22/8, the per-task counts of 4.3, multi-response items 2/2/3/1 by domain and no concept repeated; across all forms, frozen or not, no item sits in two forms. |
| R13 Sources | Every "Exam guide update" line, every `blueprint.yaml` task and every mission has a source URL on `aws.amazon.com` or `docs.aws.amazon.com` and a `verified_on` within 180 days, and each of a rank's two facts equals the sentence of a Module 11 update line. |

- **Scope by status:** R1, R2 and R8 apply to every item and file, R3 and R6 to drafts and live items, and R4, R5, R7 and R9 to live items only; R10 and R12 count live items only, so a retired item is checked by R1, R2 and R8 alone.
- **Demotion:** `pnpm content:validate --demote` sets live questions whose evidence no longer matches their note to `draft` and prints them, which is how a note edit lands (8.4).
- **Phase switches:** `content/validate.yaml` lists the active rules and the R10 switches (`practicePerConcept`: 0, 2 or 3; `examQuotas`; `blueprintTerms`).
  - A rule, once on, stays on, and the exit criteria in 10.1 give the set at each phase.
  - Phase 0 turns on R1, R2, R6, R7, R8 and R13; Phase 1 adds R3, R4, R5 and R9; Phase 2 adds R10 with 2 per concept and `blueprintTerms`; Phase 3 adds `examQuotas` and R12; Phase 4 adds R11; Phase 6 raises the practice target to 3.
- Each rule has a failing fixture at `tests/content/bad/rNN-*.{yaml,md}` that proves it fires, run with every rule and switch on.
- When a content bug teaches something new, the fix extends a rule and adds a fixture.
- The report (`pnpm content:report`) carries the soft checks: counts, coverage by task, `concepts.md` drift, `--needs-dani`, and the correct-longest share per module.

### 2.10 Build outputs

- `dist/content/index.<hash>.json` holds the modules, lesson metadata, the concept map, the blueprint, ranks, badges, the glossary, `contentVersion` and the hashed names of the other chunks.
- The build injects the index's hashed name into `index.html`, so `index.html` and `sw.js` are the only unhashed files (1.4).
- `dist/content/mNN.<hash>.json` holds lesson HTML, live practice questions, labs and the incidents whose first required module is NN.
- `dist/content/exam-a.<hash>.json` to `exam-d.<hash>.json` hold one frozen form each, as live items in form order; pool items that sit in no form never ship.
- A form's chunk loads only for its own mock until that form is taken, and from then on also for the learn screens and results, so taken items can join practice (section 4.3).
- The index lists form item ids, concepts, tasks and versions (`exam.items`), never their text.
- `dist/content/search.<hash>.json` is a prebuilt token index over notes, concepts and the glossary.
- A Vite plugin runs the content build and validation at start and on every file change, and shows errors in the Vite overlay.

## 3 Gamification mechanics

**Decisions.**
One FSRS model per concept drives the queue, hex decay and readiness, and XP comes only from learning events, capped at one counted answer per concept per day.
The confidence bet is the submit gesture, with two buttons and non-negative proper-scoring payoffs, and a wrong answer submitted as Sure becomes a misconception that is reviewed first.
Four ranks named after the current Support plans require bosses, mastery and unseen mocks, never XP, and they are never taken away.

### 3.1 Counted answers and the bet

A **counted answer** is the first answer of the study day to a concept in a lesson check, module quiz, focus quiz, review, incident or lab debrief, and it counts in one of two ways:
- When the concept was due when the session started, or is not yet in FSRS, it earns bet XP and makes the day's FSRS update.
- When the concept is in FSRS but not due, only a never-answered question counts, and it earns bet XP once with no FSRS update, so an early review never moves the schedule.

Boss and mock items are applied on submit with 0 XP per item, under the same one-update-per-concept-per-day rule:
- A wrong item applies Again.
- A correct item applies Hard (flagged) or Good (not flagged) only when the concept was due or is not yet in FSRS; the flag stands in for the bet (see Exam modes below).

Every other answer earns 0 XP and makes no FSRS update.
The one exception is that a later wrong answer on the same day still applies Again once.

| Button | Key | XP if right | XP if wrong | FSRS rating if right |
|---|---|---|---|---|
| Check (Not sure) | `Enter` | 8 | 5 | Hard |
| Sure | `Shift+Enter` | 10 | 0 | Good |

- Expected XP is `10p` for Sure and `5 + 3p` for Not sure, so Sure pays only when `p > 5/7`, about 71.4%.
- The hint reads `Press Sure when you are more than 71% sure.`
- A unit test asserts the 5/7 crossover.
- A wrong answer always rates Again, and Easy is never assigned, because picking among options overstates recall.
- **Misconception:**
  - A wrong answer submitted with Sure marks the concept as a misconception.
  - The concept goes first in the queue.
  - Its next feedback starts with `You were sure last time` and pins the explanation open.
  - The mark clears after a correct Sure answer on a different question at least 1 study day later.
- **Exam modes:** bosses and mocks have no bet buttons.
  - Flagging an item (`f`) counts as Not sure, so a correct flagged answer rates Hard and a correct unflagged answer rates Good.

### 3.2 XP

| Event | XP | Limit |
|---|---|---|
| Lesson completed (end of note reached and lesson check submitted, or end reached while the note has no live questions yet) | 10 | once per lesson |
| Counted answer | bet table | one per concept per day |
| Correct due review: effort bonus | `round(10 * (1 - R))`, where R is retrievability when shown | due concepts only |
| Lightning round | 1 per correct | first round each day, max 10 |
| Daily incident | 15 if every step is right on the first try, otherwise 8 | once per day |
| Simulated lab | 30, plus 10 with no hints | first completion only |
| Module boss passed | 100 | first pass only |
| Mock form A to D submitted | 150 | once per form |
| Capstone decision completed (self-grade, reveal, final grade) | 20, plus 10 if the final grade is 8/12 or more | once per module |
| Mission 0 | 50 | once |
| Mission closed (verified, cleaned up or kept, next-day usage check) | 75 | once per mission |

- The effort bonus depends only on correctness, not on the bet, so it leaves the 5/7 crossover unchanged.
- At due time R is about 0.90 (0.87 to 0.91 once a card has a success, 0.77 after a first Again), so the bonus is 1 (2 after Again), and an overdue concept at R = 0.70 that is still recalled earns 3.
- Retention is fixed at 0.90, and an early review never updates FSRS and pays only once per never-answered question, so neither can be used to farm XP.

Estimated total for an honest run of the whole course (it scales with the note and concept counts the build reports):

| Source | Calculation | XP |
|---|---|---|
| Lessons | one per lesson note x 10 | about 900 |
| First attempts | about 1,100 x 8.3 | about 9,100 |
| Due reviews | about 1,900 x 9.8 | about 18,600 |
| Labs, bosses, mocks | 26 x 35 + 13 x 100 + 4 x 150 | about 2,800 |
| Incidents, lightning, capstone, missions | | about 1,900 |
| **Total** | | **about 33,000 plus or minus 7,000** |

### 3.3 Levels

```
xpForLevel(L) = 50 * L * (L - 1)          // L2 100, L5 1,000, L10 4,500, L20 19,000, L25 30,000
level(xp)     = floor((1 + sqrt(1 + xp / 12.5)) / 2)
```

- At about 600 XP per day, Dani reaches L5 on day 2, L10 around day 8, and about L21 by exam day (36 days, about 21,600 XP); L24 would need about 770 XP per day.
- Levels show only as the 2 px line in the top bar and as a number in Progress, and they gate nothing.

### 3.4 Ranks (current Support plans; data in `content/game/ranks.yaml`)

| Rank | Unlock (every condition at the same moment) | Target for the November 14 exam |
|---|---|---|
| Basic | Start | day 0, October 9 |
| Business Support+ | 5 module bosses passed and 5 hexes at 60 or more | about day 17, October 26 (bosses ship October 24) |
| Enterprise | 13 bosses passed and 13 hexes at 60 or more | about day 26, November 4 |
| Unified Operations | 2 different unseen mock forms at 80% or more, the latest within 14 days, while readiness reads Ready | by day 29, November 7 (the go/no-go check) |

```yaml
# content/game/ranks.yaml
- { id: basic, name: Basic, short: Basic, requires: {} }
- id: business-support-plus
  name: Business Support+
  short: Business+
  requires: { bosses: 5, hexesAt60: 5 }
  facts:
    - AWS calls Business Support+ the minimum plan it recommends for production workloads.
    - With Business Support+, a business-critical or mission-critical system that is down gets a response in under 30 minutes.
- id: enterprise
  name: Enterprise
  short: Enterprise
  requires: { bosses: 13, hexesAt60: 13 }
  facts:
    - Enterprise Support includes a designated technical account manager.
    - With Enterprise Support, a business-critical or mission-critical system that is down gets a response in under 15 minutes.
- id: unified-operations
  name: Unified Operations
  short: Unified Ops
  requires: { unseenMocksAt80: 2, latestMockWithinDays: 14, ready: true }
  facts:
    - Unified Operations is the only plan that includes 24/7 workload monitoring.
    - With Unified Operations, an Incident Management Engineer responds in under 5 minutes when a business-critical or mission-critical system is down.
```

- A rank is never taken away: on promotion the app writes a `rank` event (8.1), and the shown rank is the highest one recorded or computed.
- So decay, a key-fix rescore (8.4) or an `ENGINE_VERSION` replay can never lower it, and decay shows only on the hexes.
- Home shows the next rank's requirements as one line, for example `Enterprise: 9/13 bosses, 8/13 hexes at 60`.
- A promotion shows as one dismissible line under the top bar: the plan name and its two facts.
- Dismissing it writes `rankSeen` to `kv`, and the line shows only while the rank is above `rankSeen`, so a reload or replay never brings it back.
- Each fact is the sentence of a Module 11 "Exam guide update" line, word for word, sourced from the Support plans page (rule 13, Appendix B).
- The course's five-plan list and its January 1, 2027 discontinuation notice stay in the Module 11 notes and never appear in rank text.

### 3.5 Streak

- A study day runs from 04:00 to 04:00 local time, and each event stores its `day` when it is written.
- A day qualifies when any one of these happens:
  - The due queue reaches 0, or the catch-up plan in 3.7 is finished.
  - A lesson, lab, incident, boss or mock is completed.
- Lightning rounds and rereading never qualify.
- Every 7 consecutive qualifying days earn 1 freeze, up to 2 banked.
- A freeze is spent automatically on a missed day, which then neither breaks nor extends the streak.
- When a streak breaks, the app shows `Streak reset. Longest: 18 days.` with no guilt copy and no notifications.
- Streaks pay no XP and apply no multiplier.

### 3.6 Spaced repetition: FSRS per concept

**Why FSRS for one learner:**
- FSRS gives an explicit recall probability `R(t)`, so one model feeds the queue, mastery and readiness.
- Its default parameters work from day 1, without personal data.
- SM-2 needs subjective 0 to 5 grades, suffers from "ease hell" and has no forgetting curve.
- Leitner boxes are coarse, and mastery and readiness would need a second, ad hoc decay model.

```ts
// src/engine/srs.ts (wrapper; the only file that imports ts-fsrs)
const f = fsrs(generatorParameters({ request_retention: 0.9, maximum_interval: 180,
                                     enable_fuzz: false, enable_short_term: false }));
export const rate = (correct: boolean, sure: boolean) => !correct ? Rating.Again : sure ? Rating.Good : Rating.Hard;
export const recall = (card: Card, at: Date) => f.get_retrievability(card, at, false);
```

- **Card unit:** the concept, not the question.
  - A review shows the concept's least recently seen live practice variant, with never-seen variants first.
  - It never shows the variant shown last time, and options are shuffled with a seeded PRNG (mulberry32).
- **Entry:** a concept enters FSRS with its first counted answer, normally in the lesson check.
- **Fuzz off:** fuzz is disabled so replays stay deterministic, and the exam cap spreads load in its place.
- **One update per day:** each concept gets one FSRS update per study day, plus at most one extra Again if it is answered wrong later the same day.
- **Relearn step:** after a wrong answer in a review, the concept comes back at least 5 items later in the same session with a different variant, logged as `relearn`, with 0 XP and no FSRS update.
- **Exam cap:** if an exam date is set and FSRS would schedule a concept after `examDay - 1`, the due date becomes `max(tomorrow, examDay - 1 - (fnv1a(conceptId) mod 7))`, which spreads the final reviews across the last week.
  - Replay always uses the current `examDate`, so setting or moving the date recomputes every capped due date.
- **Lightning:** lightning answers never update FSRS, and a miss writes `review.now`, which makes the concept due today.
- **Untested concepts** (`tested: false`) never enter FSRS.

### 3.7 Queue and daily load

1. **Due set:** every concept due before the next 04:00.
2. **Order:** misconceptions first, then the rest in ascending current R.
3. **Interleaving:** the queue picks the next item from a different module than the previous one when one exists within a look-ahead of 5.
4. **Confusable pairs:** if both members of a `confusableWith` pair are due within 2 days, the second is pulled to within 3 positions of the first.
5. **Chunks:** reviews come in chunks of 20, each ending with `Done for now`.
6. **Catch-up mode:** when more than 100 concepts are overdue, today's plan is the 60 with the lowest R, and Next stops suggesting new lessons until fewer than 100 remain.
7. **New-concept soft cap:** after 20 new concepts in a day, Next stops suggesting lessons, though Dani can still open them himself.

### 3.8 Module mastery (the 13 hexes)

```
g_c        = min(1, successDays_c / 2)            // correct counted answers on 2 different study days
m_c(t)     = R_c(t) * g_c                         // 0 if the concept was never answered
Mastery_m  = round(100 * mean over tested concepts homed in module m of m_c(now + 7 days))
```

- Decay comes from the forgetting curve itself, with no extra constant.
- The 7-day horizon asks "will you still know it next week".
- Approximate examples, with exact values fixed by golden tests:
  - One Good answer today gives about 0.81 recall at 7 days, so the concept counts about 0.40 until a second success day.
  - A module learned in one day therefore shows about 40.
  - Right after a spaced second success it shows about 90 (87 to 94 with the pinned `ts-fsrs`, depending on the ratings).
- Hex fill bands, in graphite at opacities .12, .30, .55 and .85:
  - 0 to 19: outline only.
  - 20 to 39 and 40 to 59: light fills.
  - 60 to 79: Solid.
  - 80 to 100: Mastered, which also needs the boss passed (without it the hex stays Solid).
- **Boss ready:** a dot shows on the hex when the module's lessons are read, mastery is 60 or more and the boss is not yet passed; the extras line (4.6) uses the same test.
- A passed boss adds a thin outer ring that never goes away.

### 3.9 Exam readiness

```
t*        = examDate if set and after today, else now + 7 days
Q_d       = mean over tested concepts tagged with a task in domain d of R_c(t*) * g_c      // unseen = 0
Memory    = 0.24*Q_1 + 0.30*Q_2 + 0.34*Q_3 + 0.12*Q_4
Mock      = mean raw % of the latest two first attempts of forms A-D within 21 days (or the one, if only one)
Readiness = Mock ? 0.5*Memory + 0.5*Mock : min(Memory, 0.70)
```

- **Ready** requires all of the following: Readiness of at least 0.80, the latest unseen mock at 80% or more within 21 days, and every `Q_d` at 0.70 or more.
- **Close** means Readiness of 0.65 or more, and **Building** covers everything below.
- Home shows one number from 0 to 100, its label, and a link to the weakest task statement with at least 3 concepts, which starts a 10-item focus quiz.
- Before 40 concepts have evidence, readiness shows "-".
- Without a mock, the label reads `capped until your first unseen mock`.
- The app shows raw percentages only and never a fake scaled score, because AWS publishes no mapping from raw to scaled scores.
- **No exam date yet:** readiness projects 7 days ahead, and the app asks for the date once, after the Module 1 lessons are read (7.5).
- **Go/no-go:** from `examDate - 7` to `examDate - 2`, while readiness is not Ready, Home shows one line such as `Exam Sat 14 Nov, readiness Close. Rescheduling closes 24 h before the appointment.`

### 3.10 Badges (12; no XP; shown in Progress and on the session-end line)

| Badge | Exact unlock rule |
|---|---|
| First Brew | First lesson check submitted |
| Clean Queue | Due queue reached 0 after at least 10 reviews, on 7 distinct study days |
| Changed My Mind | 5 distinct misconceptions cleared, each by the rule in 3.1 (a correct Sure answer on a different question at least 1 study day later) |
| Long Memory | 50 concepts with stability of 21 days or more |
| Well Calibrated | Over the last 150 counted answers, with at least 40 Sure and 40 Not sure: Sure accuracy at least 85% and Not sure accuracy at most 75% |
| Hands On | Every core lab in 5 modules completed |
| Lab Complete | All 26 core labs completed |
| Leave No Trace | 3 missions closed, each with cleanup and the next-day usage check confirmed (the kept Mission 1 does not count) |
| Full Dress Rehearsal | All 65 questions of an unseen form answered before the timer ran out |
| Pass Mark | An unseen form scored at 80% or more |
| Even Keel | 75% or more in every domain of one unseen form |
| Architect | All 13 capstone decisions with a final grade of 8/12 or more and no criterion at 0 |

### 3.11 Anti-grind audit (one test per row)

| Exploit | Blocked by |
|---|---|
| Re-answering the same concept | One counted answer per concept per day (property test) |
| Re-running quizzes | First attempt per question id only |
| Reviewing early | An early answer never updates FSRS and pays only once per never-answered question, and the effort bonus is about 0 at high R |
| Always pressing Sure | Proper payoffs, plus the misconception rule on scheduling |
| Failing on purpose | Sure pays 0 when wrong, and ranks, mastery and readiness all fall |
| Lightning spam | First round per day, capped at 10 XP, no FSRS update, no streak credit |
| Cramming a module | 7-day horizon and the 2-day success gate |
| Re-rolling a boss | 20 h cooldown, a new draw, XP only on the first pass |
| Peeking at mocks | Holdout pool in a separate lazy chunk, each form pays once, and remix mocks never count toward Ready or rank |

## 4 Modes

**Decisions.**
One runner serves every question mode, and boss and mock switch it into a focus mode that hides all gamification.
Modes unlock as they become relevant, and every day has an explicit "Done for today" finish line.
Mocks match CLF-C02: 65 questions in 90 minutes, a 16/19/22/8 domain split, all 65 scored, a wall-clock timer and no pause.

### 4.1 Mode table

| Mode | Source | Size and time | Feedback | FSRS | Unlocks |
|---|---|---|---|---|---|
| Notes reader | `resources/` | 1 lesson | n/a | no | always |
| Lesson check | practice pool, 1 variant per tested concept homed in the note | all homed concepts, untimed | instant, every option explained | yes | end of each note |
| Module quiz | practice pool for the module, unseen first, then lowest R | 12 | instant | yes | after 1 lesson of the module |
| Focus quiz | practice pool filtered to a task statement or concept list | 10 | instant | yes | readiness link, module page |
| Review | due concepts, per 3.7 | chunks of 20 | instant, plus relearn | yes | first concept learned |
| Lightning | `single` practice items for concepts with stability of at least 3 days | 90 s | summary at the end | no (a miss queues it for today) | 20 such concepts |
| Daily incident | incident bank | 1 per day, 2 to 4 steps | after each step | yes | all Module 2 lessons read |
| Module boss | practice pool, unseen variants | 15 questions in 21 min | at the end, then error review | on submit, 0 XP per item (3.1) | all lessons of the module read |
| Full mock | exam pool, forms A to D | 65 questions in 90 min | at the end, then error review | on submit, 0 XP per item (3.1) | always; suggested on Home after 7 bosses |

### 4.2 Module boss

- A boss draws 12 items from the module (at least 1 per lesson, weighted toward low R) and 3 from earlier modules' lowest-R concepts.
- The Module 1 boss draws all 15 from Module 1.
- Bosses use `single` and `multi` only.
- An item comes from variants never seen before, failing that from variants not seen in the last 7 days, and failing that from the least recently seen variant, so a draw never fails.
- The pass mark is 12/15 (80%), with a 20 h cooldown and a fresh draw after a fail.
- The 21 minutes match the real exam's 90/65 minutes per question.

### 4.3 Full mock

- Domain counts come from `65 x weights` by largest remainder: 15.6, 19.5, 22.1 and 7.8 become 16, 19, 22 and 8.
- Within a domain, items spread across task statements in proportion to their concept counts, by largest remainder, with at least 1 per task the notes cover; these per-form task counts drive the pool quotas (2.6).
- Each form has 8 multi-response items, 2/2/3/1 by domain, which is our own choice.
- No concept repeats within a form, and the forms share no items.
- `pnpm content:forms` builds forms A to D from the exam pool with a fixed seed into `content/exam/forms.yaml`, and each form gets `frozen: true` once committed, after which rule 2 forbids any edit.
- A frozen form skips items that are no longer live and is scored over the rest, and the results page says how many items were scored.
- v1 has exactly four forms; a contingency form E is an open question (11).
- All 65 items are scored, because imitating unscored items teaches nothing, and the results page says that the real exam has 15 unidentified unscored items.
- The timer runs on wall-clock time from `deadline` and survives reloads, and the mock cannot be paused.
- Unanswered items count as wrong.
- Exam controls: options (`1` to `6`), Flag (`f`), the navigator grid (`g`), previous and next (arrow keys), a review page, and submit with confirmation (`Ctrl+Enter`).
- After a form has been taken, its items join the practice variant pool for their concepts.
- After forms A to D are used up, "remix" mocks are built from seen items and give practice only.
- A leakage test proves that no learn-mode selector can return an item from an untaken form.

### 4.4 Error review (after every boss and mock)

- Wrong items that were not flagged come first, because they were confident errors.
- Each wrong item takes one tap to tag: Didn't know, Confused it with another, or Misread.
- "Changed right to wrong" is tagged automatically from the answer-change log.
- Progress shows the cause counts and whether changing answers has helped Dani so far.

### 4.5 Daily incident

- An `incident.offered` event is written on the first Home render of the day, so the pick stays stable all day.
- Eligible incidents are the unsolved ones whose required modules all have their lessons read.
- The pick maximizes `sum over required modules of (100 - Mastery_m)`, and ties are broken by `fnv1a(day)`.
- Missed days do not pile up into a backlog.

### 4.6 Next button, "Done for today" and Home lines

The Next button shows the first unmet item from this list:
1. **Resume** an exam or session that is in progress.
2. **Mission safety:** `Clean up M3` when a mission that is not kept has run past `maxLiveHours`, or `Check usage for M3` on the day after its cleanup (after Verify, for a kept mission).
3. **Reviews:** misconceptions plus due reviews (the next chunk of 20); met when the due queue is empty, or in catch-up mode when the catch-up plan is finished.
4. **Continue** the current lesson.
5. **Check yourself:** `Check yourself: Module 2 (6 concepts)` for read lessons that have gained live questions since they were read and are not yet checked, under the same cap and catch-up limits as item 6.
6. **Next lesson**, while under the new-concept cap and outside catch-up mode.

- When items 1 to 6 are all met, Home shows "Done for today".
- Beneath it, one optional line offers at most two extras, picked in this order: today's incident, a boss ready to take (the "boss ready" test in 3.8), a mock (7 bosses passed and none in the last 3 days), and a core lab for the weakest module.
- Home shows at most one reminder line, in this priority: the go/no-go line (3.9), the one-time exam date question (7.5), then the backup reminder (8.3).

## 5 Labs

**Decisions.**
Labs run on six reusable engines whose checkers are pure reducers, and CI replays each lab's stored solution and wrong paths to prove it can be solved and that its checks tell right from wrong.
26 core labs (2 per module) ship first, and 9 stretch labs can be cut, with prices shown as clearly labelled fictional "lab credits".
9 optional real-AWS missions run on Dani's new free-plan account, gated by Mission 0, tagged, cleaned up by name and swept with Tag Editor, and closed only after a next-day usage check against the pre-mission baseline; Mission 1 is kept running and closes without cleanup.

### 5.1 Engine contract

```ts
interface LabEngine<Spec, State, Action> {
  schema: ZodType<Spec>;
  init(spec: Spec): State;
  reduce(state: State, action: Action): State;          // pure; the UI only dispatches actions
  check(spec: Spec, state: State): GoalResult[];        // [{ goalId, pass, message }]
  hint(spec: Spec, state: State, goalId: string): string;
}
```

```yaml
# content/labs/05-networking/two-tiers-two-zones.yaml
id: lab-m05-two-tiers
module: 5
engine: place
tier: core                       # core | stretch
rev: 1                           # bumped on any edit; completions record it
concepts: [public-subnets, private-subnets, internet-gateway, route-tables]
minutes: 8
brief: The cafe's order site needs a web tier customers can reach and a database they cannot.
spec: { containers: [...], pieces: [...], constraints: [...] }
goals: [{ id: g1, label: Web tier spans two Availability Zones, hint: ... }]
solution: [ ... actions ... ]
wrongPaths: [{ actions: [ ... ], failsGoal: g2 }]
debrief: { lines: [ ... ], questions: [q-4m2x8c, q-9tq3vd] }
```

- Every interaction works by tap-to-select then tap-to-place, which the keyboard mirrors, so dragging is never required (WCAG 2.5.7).
- Hints are free, and a lab completed without hints earns the +10 XP.
- Labs do not update FSRS directly, but each debrief ends with 2 to 3 verified practice questions, and those are counted answers (3.1).
- Lab concepts must be registered concepts (rule 6), and card sets use the exam's current names (2.3).

| Engine | Interaction | Checker semantics |
|---|---|---|
| Sort | Place cards into buckets or ordered slots | Expected bucket or position per card, plus an allowed-alternatives list |
| Configure | A stripped-down console wizard of selects and toggles | Predicates on the resulting configuration |
| Simulate | Set parameters, run deterministic ticks, read an outcome chart; a one-tick run is the cost modeler | Thresholds on dropped orders, latency, data survival and monthly lab-credit cost |
| Place | Nested containers (Region, AZ, VPC, subnet) or pipeline stages, with failure toggles | Slot constraints and survival under the injected failure |
| Trace | Step a request through security groups, network ACLs, IAM and SCP rules, or edit rules until the test cases pass | Stateful security groups, stateless ordered network ACLs, and explicit deny over allow over implicit deny, with SCPs intersecting IAM |
| Investigate | Filter fictional CloudTrail events, metrics or findings and answer | Exact answers (who, what, when, which pillar) |

### 5.2 Per-module labs

| M | Core labs | Stretch labs |
|---|---|---|
| 1 | Sort: Who patches what? (customer or AWS duties as Module 1 teaches them, such as patching the operating system against securing the physical, network and hypervisor layers) - Sort: Name the cloud benefit in each cafe story (the six benefits Module 1 teaches) | |
| 2 | Configure: Launch the order server (instance family, purchase option, security group) - Simulate: Morning rush (Auto Scaling minimum, desired and maximum behind a load balancer over a 24 h order curve) | Simulate: Pay less for beans (On-Demand, Reserved, Savings Plans, Spot, Dedicated for 4 workloads) - Sort: Queue, topic or event bus (SQS, SNS, EventBridge) |
| 3 | Sort: Pick the compute (EC2, Lambda, ECS, EKS, Fargate, ECR, Beanstalk, Batch, Lightsail, Outposts) - Simulate: Bursty or steady (Lambda against an always-on instance, in lab credits) | |
| 4 | Configure: Choose the Region (compliance, proximity, feature availability, price) - Place: Survive an AZ outage | Investigate: What will this template create? |
| 5 | Place: Two tiers, two zones - Trace: Why can't customers reach the menu? (security group against network ACL) | Sort: Connect the shops (connectivity options from the lesson) |
| 6 | Sort: Block, file or object (instance store, EBS, S3, EFS, FSx, Storage Gateway) - Simulate: Receipts for 7 years (S3 classes and lifecycle over 365 days) | Simulate: Lose the instance (instance store against EBS snapshots) |
| 7 | Sort: Pick the database (the services in the Module 7 lessons) - Simulate: Cache the menu (hit rate against database load) | Sort: Who manages what? (the unmanaged, managed and fully managed categories Module 7 teaches, applied to EC2, RDS, DynamoDB and Lambda, as exam task 2.1 asks) |
| 8 | Sort: AI service per cafe task - Place: Build the sales pipeline (ingest, store, catalog, query, visualize) | |
| 9 | Trace: Least privilege for the barista - Sort: Which service raised this finding? | Configure: Lock the root user |
| 10 | Investigate: Who deleted the menu bucket? (CloudTrail) - Sort: CloudWatch, CloudTrail, Config, Trusted Advisor, Health or Artifact | Trace: Does the SCP allow it? |
| 11 | Simulate: The monthly bill (pricing mix, budget thresholds, consolidated billing tiers) - Sort: Which Support plan? (the four current plans, from the Module 11 update lines) | |
| 12 | Sort: A migration strategy for each cafe system (the seven strategies Module 12 teaches) - Simulate: Online or offline transfer, using `days = TB * 8e6 / (Mbps * 0.8) / 86400` against Snowball turnaround | Sort: CAF perspectives (the six Module 12 teaches) |
| 13 | Investigate: Well-Architected review of the cafe (findings to the six pillars, then a fix) - Sort: Specialized service per use case | |

Core labs by engine: Sort 11, Simulate 6, Place 3, Configure 2, Trace 2 and Investigate 2.

### 5.3 Real-AWS missions (optional, free plan)

**Account:** a new AWS account on the free plan, which gives credits (Appendix B), lasts up to 6 months, closes at 6 months or when the credits run out, and reaches only a subset of services that AWS does not list per service.

**Cost-safety rules** (stated in every mission's frontmatter and enforced by the UI flow):
1. **Mission 0 is a hard gate:** the other missions stay locked until every Mission 0 box is checked and its Verify holds.
   - Verify uses facts Dani can see: both budgets listed in the Budgets console, each with his email as a recipient in the Active status (verified, not Pending) and a Charge type filter that leaves out credits, root and admin MFA shown as enabled, and the plan status saved.
   - No alert email is awaited, because AWS sends an actual-cost alert only when a threshold is first reached, and forecast alerts start only after about 5 weeks of usage data (Appendix B).
2. **Plan fit:** each mission lists its `services`, and Mission 0 records for each one whether the free plan offers it, in the `kv` entry `plan` (8.1); a mission with any unavailable service shows `Not on your plan` and stays locked.
3. **Never upgrade:** no mission requires converting to the Paid plan, buying anything, or changing the Support plan.
4. **One home Region**, chosen in Mission 0, and never the root user.
5. **Tags:** every taggable resource is tagged `ccp:mission=<id>`, and Mission 1's kept site resources are tagged `ccp:keep=site` instead.
6. **Before Start**, the app shows the expected credit use, a "what can use credits" list and `maxLiveHours` (default 2).
7. **Never create:** NAT gateways; idle public IPv4 addresses or unattached Elastic IPs; RDS or Aurora, EKS, Redshift, OpenSearch or SageMaker endpoints; Shield Advanced or Direct Connect; Route 53 domains or hosted zones; Reserved Instance or Savings Plans purchases, Marketplace subscriptions; root access keys.
   - **Never upgrade by side effect:** never create or join an AWS organization, including the one that enabling IAM Identity Center creates; never set up an AWS Control Tower landing zone, join the AWS Partner Network, accept an AWS Artifact agreement such as the BAA (which designates the account as HIPAA compliant), sign a Professional Services contract or an Enterprise Agreement, or buy an AWS Skill Builder Team subscription, because each of these upgrades a free-plan account to the Paid plan (Appendix B).
8. **Verify** is an observable result: a URL loads, a log line appears, or the policy simulator returns "denied".
9. **Cleanup** goes in reverse dependency order and first deletes the mission's untagged leftovers by name, listed in its `leftovers` field.
   - Examples are the `/aws/lambda/<function>` log group that Lambda creates, an execution role and its policy, a detached EBS volume and an SNS subscription.
   - It ends with a Tag Editor search for `ccp:mission` across all Regions that must return 0; Tag Editor finds only tagged resources, so this search is the final sweep, not the proof.
10. **Live chip:** while a mission is live, the top bar shows an amber `M3 live 1h` chip, and past `maxLiveHours` the Next button becomes `Clean up M3`.
11. **Close:** the day after cleanup, Next becomes `Check usage for M3` until Dani confirms in Cost Explorer (daily, grouped by service) that the mission's services are back at their usage on the day before Start, and records the remaining credit balance; XP is paid only then.
    - Usage is compared with that baseline, not with zero, because the kept Mission 1 site keeps billing S3 and CloudFront.
12. **Kept missions:** a mission with `keep: true` (only Mission 1, the site) has no `maxLiveHours`, no live chip and no Clean up step.
    - Its Tag Editor check confirms that the `ccp:keep=site` resources exist, and it closes after Verify plus a next-day check that its cost stays within `expectedCredits`.
13. **Freshness:** each mission carries source URLs with `verified_on`, and validator rule R13 fails any check older than 180 days.

```yaml
# content/missions/mission-03-upload-receipt.md (frontmatter)
id: mission-03
modules: [3, 6, 10]
services: [Amazon S3, AWS Lambda, Amazon CloudWatch Logs]
expectedCredits: "$0 to a few cents"
keep: false                 # true only for Mission 1, whose site stays up
maxLiveHours: 2
canUseCredits: [Lambda invocations beyond the free usage, S3 storage and requests, log storage]
leftovers: ["/aws/lambda/<function> log group", "execution role and its policy"]
sources:
  - { url: "https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html", verified_on: 2026-10-09 }
```

| # | Mission | Modules | Creates | Expected credit use | Verify |
|---|---|---|---|---|---|
| 0 | Guardrails: root MFA; an IAM admin user `ccp-admin` with MFA, signed in for the CLI with `aws login --profile ccp-admin`; a zero-spend budget plus a $5 monthly budget, both cost budgets with a Charge type filter that leaves out credits so they track usage the credits pay for, alerting at 50/80/100% actual and 100% forecast; Free Tier usage alerts; home Region; the plan status recorded (plan, credit balance, end date, service fit per mission) | 9, 11 | budgets, IAM user | $0 | both budgets listed with Dani's email as an Active (verified) recipient and credits filtered out; root and admin MFA enabled; plan status saved |
| 1 | Host this site with private S3, CloudFront and OAC, using `infra/site.yaml` (kept: `keep: true`) | 4, 5, 6 | bucket, distribution | cents per month at most | direct S3 URL returns 403 and the CloudFront URL serves |
| 2 | Launch, connect to, stop and terminate an EC2 instance, and watch what happens to its EBS volume | 2, 6 | instance, volume, security group | low; public IPv4 is charged hourly | page served from the instance |
| 3 | An S3 upload triggers Lambda, which logs a "receipt" | 3, 6, 10 | function, bucket, log group | about $0 | log line in CloudWatch Logs |
| 4 | DynamoDB on-demand loyalty table: put and query items | 7 | table | about $0 | item returned by a query |
| 5 | Least-privilege role tested in the IAM policy simulator, then your own calls found in CloudTrail Event history | 9, 10 | role, policy | $0 | allow and deny matrix matches the brief |
| 6 | CloudWatch alarm with SNS email on Lambda errors | 10 | alarm, topic, subscription | about $0 | email received after a forced error |
| 7 | VPC with public and private subnets and security groups, with no NAT gateway | 5 | VPC and its parts | $0 | route tables match the diagram |
| 8 | Pricing Calculator estimate and Well-Architected Tool review of the capstone | 11, 13 | workload record | $0 | estimate link saved in decision 11 |

## 6 Capstone: "Move the cafe to the cloud"

**Decisions.**
The capstone is one Architecture Decision Record (ADR) per module, written in the app under fixed headings with concept citations checked live, and exported as one Markdown plan.
Dani grades himself against a fixed rubric, then sees the reference key points and re-grades once, and both grades are stored, with the gap shown as drift.
The reference key points go through the same evidence and originality checks as questions plus a critic check, and each carries a `verified` block (rule 9).

**Brief** (`content/project/brief.yaml`, our own fiction):
- One cafe today, growing to 12 shops in 2 years, one of them abroad (data residency).
- Online orders peak at 10 times the baseline between 07:00 and 09:00.
- A loyalty app.
- 2 TB of receipts and photos kept for 7 years.
- An on-premises POS server in the back office.
- One part-time IT person.
- A cap of $300 per month.

| M | Decision |
|---|---|
| 1 | Deployment model, the 3 cloud benefits that matter most, and where the shared-responsibility line falls |
| 2 | Compute for ordering: instance family, purchase option, scaling, load balancing and queueing |
| 3 | What becomes serverless or containerized, and why |
| 4 | Region for the shop abroad, edge delivery, and repeatable infrastructure |
| 5 | VPC layout, security group and network ACL stance, and how the shops connect |
| 6 | Storage classes and lifecycle for receipts, images and POS backups |
| 7 | Database for each workload, plus caching |
| 8 | One analytics pipeline and one AI feature |
| 9 | Identities, root protection, encryption and edge protection |
| 10 | Monitoring, audit trail, account structure and compliance evidence |
| 11 | Cost estimate, budgets and Support plan (current plan names) |
| 12 | A migration strategy for each system and the data transfer method |
| 13 | Well-Architected review across the six pillars, plus the top 3 fixes |

- **ADR headings:**
  - Context (prefilled from the brief).
  - Options considered (at least 2 that the course teaches).
  - Decision.
  - Why (at least 2 concept citations, inserted by display name with autocomplete, stored as `[[concept-id]]` underneath and checked live against the registry).
  - Trade-offs and mitigation.
  - Cost note.
- **Unlock:** each decision opens when its module's lessons are read.

**Rubric** (4 criteria scored 0 to 3; a pass is 8/12 or more with no criterion at 0):

| Criterion | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Fit | Ignores the brief | Meets some constraints | Meets every main constraint | Also meets edge constraints and names the course-taught reason |
| Grounding | No course concepts, or wrong ones | 1 concept used correctly | 2 or more used correctly | Also compared against the rejected option |
| Trade-offs | None | Names a cost or a limit | Adds a mitigation | Adds the cost or responsibility impact |
| Cost and responsibility | Missing | Mentioned vaguely | Pricing model or responsibility split stated | Both stated, and they match earlier ADRs |

**Grading flow:**
1. **Self-grade:** Dani scores his ADR against the rubric.
2. **Reveal:** the app shows 4 to 6 reference key points, each with its concepts' display names and an evidence line from the home note of one of those concepts (rule 5).
3. **Tick:** Dani ticks the key points he covered.
4. **Final grade:** Dani re-grades once.
5. **Drift:** both scores are stored, and Progress shows `final - self`.

**Export:** `cafe-cloud-plan.md`, one sentence per line with no em dashes, containing a one-line summary table and the 13 ADRs.

## 7 UI

**Decisions.**
Gamification lives only in a 44 px top bar with at most four quiet items and on Home, which has one Next button, the 13-hex map and one readiness line.
Levels, badges, calibration and settings sit in a Progress overlay, navigation uses Home, Module pages, breadcrumbs and a command palette, and there is no sidebar and no modal except exam submit: the report form, the reset confirmations and the import preview are inline panels.
Colour stays light and neutral, with graphite for the active state and colour only where it names a class of data.

### 7.1 Visual tokens

```css
:root {
  --surface: #f3f3f2;  --pane: #ffffff;  --line: #e3e3e1;
  --text: #1e1e1e;     --muted: #6a6a6a; --active: #2d2d2d;          /* graphite */
  --ok: #2f7d4a;       --bad: #b42318;                                 /* correctness, always with icon + word */
  --d1: #5b7083; --d2: #7a5c61; --d3: #5e7559; --d4: #8a7550;          /* exam domains, charts only */
  --live: #9a6700;                                                     /* live AWS resources only */
  --update: #5b6b7a;                                                   /* "Exam guide update" label and rule */
}
```

- No gradients, accent colour, confetti or mascots.
- Type uses the system font stack, 16/1.6 for notes, a reading column of at most 68ch and tabular figures.
- Motion is at most a 120 ms opacity change, and none under `prefers-reduced-motion`.
- v1 is light only, and the tokens are structured so a dark remap is one block later.

### 7.2 Top bar and Home

```
CCP                                      [M3 live 1h]   18 due   9d   Business Support+
=====================================================------------------------------- (2 px level line)

   Next: Review 18 concepts                                         ~9 min   [Enter]

        o o o o              Readiness 62  Close
       o o o o o             Weakest: 2.3 access management (focus quiz)
        o o o o              Enterprise: 9/13 bosses, 8/13 hexes at 60

   Optional today: Incident "07:42 morning rush"  |  Lab: Two tiers, two zones
```

- Clicking the due count starts Review, and every other item opens Progress.
- An XP gain shows as "+10" beside the line for 600 ms.
- A rank-up is one dismissible line under the bar (3.4).
- In focus mode (boss and mock), the bar becomes `Mock A   23/65   61:12   Flag (f)   Grid (g)`.

### 7.3 Screens

| Screen | Purpose | Elements |
|---|---|---|
| Home `#/` | Do the next right thing | Next button with an estimated time, the hex map (4-5-4 honeycomb, each hex a button labelled for example "Module 5 Networking, mastery 64, solid, boss passed"), one readiness line, one next-rank line, one optional-extras line, and at most one reminder line (4.6) |
| Module `#/m/05` | Everything for one hex | Mastery, lesson rows (read tick, check score), concepts sorted weakest first with next-due dates, labs, mission, boss (with cooldown), capstone decision |
| Lesson `#/m/05/l/<slug>` | Read, then prove it | Breadcrumb, note HTML, glossary popovers, labelled "Exam guide update" lines, recall dots beside anchor H3s, "Check yourself" at the end |
| Runner `#/s/<mode>/<scope>` | Every question mode | One header line (mode, progress), stem, options numbered 1 to 6, Check and Sure; after submitting: verdict, the chosen and correct options' whys expanded and the others collapsed, takeaway, "Read in notes", Next; end line `9/12 · +95 XP · 3 concepts back tomorrow` |
| Results `#/r/<sid>` | Turn errors into learning | Score, domain bars (exams), wrong items with confident errors first, cause tags |
| Lab `#/m/05/lab/<id>` | Hands-on | Brief, engine workspace, live goal checklist, Hint, Reset, debrief with questions |
| Missions `#/missions` | Real AWS | List with lock and plan-fit state; mission page with credit box, steps, Verify, Cleanup, usage check |
| Project `#/project` | Capstone | 13 decision cards, editor, rubric, reveal, Export |
| Progress (overlay, `g p`) | Depth on demand | Level and XP, today's XP, 14-day strip, streak and freezes, domain bars, calibration (Sure and Not sure accuracy), error causes, capstone drift, badges, mock history; settings: exam date, export, import (inline preview), reset (inline typed confirmation), content and engine versions |
| Palette (`/`, `Cmd+K`) | Find anything | Lessons, concepts, glossary, labs, actions |
| Help (`?`) | Shortcuts | One sheet |

### 7.4 Keyboard

Single-letter keys work only inside their context, ignore case, and are off while a text field has focus.

| Context | Keys |
|---|---|
| Global | `/` or `Cmd+K` palette, `?` help, `g h` Home, `g r` Review, `g m` current module, `g p` Progress, `g c` capstone, `Esc` close or back; during a boss or mock the `g` sequences, `/`, `Cmd+K` and `j`/`k` are off, `?` still opens Help, and `Esc` only closes an open sheet |
| Home and Module | `Enter` Next or open, `j`/`k` move |
| Lesson | `[` `]` previous or next lesson, `c` jump to the check |
| Runner | `1` to `6` choose (toggle in multi), `Enter` Check (Not sure), `Shift+Enter` Sure, `Enter` Next after feedback, `e` expand all whys (after feedback only), `o` open the note at the evidence, `!` report |
| Match (before feedback) | `1` to `5` pick a left item, `a` to `e` pair it, `Backspace` unpair |
| Exam | `1` to `6` choose (toggle in multi), arrow keys previous and next, `f` flag, `g` grid, `Ctrl+Enter` submit |
| Lab | `Tab` move between regions, arrow keys within a region, `Space` select, digits place, `Enter` check, `h` hint, `r` reset (inline confirmation) |

### 7.5 First run, empty states, mobile, accessibility

- **First run:**
  - Hexes are outlines and readiness shows "-".
  - Next reads `Start Module 1: Welcome to AWS Cloud Practitioner Essentials`.
  - One line reads `Progress lives in this browser. Import a backup`.
  - There is no tour.
- **Exam date question:** after the Module 1 lessons are read, Home shows once `No exam date yet. The plan targets Sat 14 Nov.` with a date field prefilled with that date and a dismiss control.
  - The date comes from `TARGET_EXAM_DATE` in `src/app/config.ts`, so the copy never drifts from the plan in 10.2.
  - Setting it writes a `settings` event; dismissing it writes `examAsk: dismissed` to `kv`, and the date stays editable in Progress.
- **Empty states:**
  - Review: `Nothing due. Next: 6 concepts in 5 h.`
  - Lightning: `Opens after 20 concepts settle.`
  - Incident: `Starts after Module 2.`
  - Mock: `4 exam forms. Best after about 7 bosses.`
  - Missions: `Start with Mission 0: Guardrails.`
- **Mobile:**
  - Single column, with the top bar reduced to `18 · 9d · Business+`.
  - The 4-5-4 hex map fits 360 px.
  - Options are full width and at least 44 px tall.
  - Check and Sure sit in a sticky bottom bar.
  - Lab panes stack vertically.
  - Mocks work on a phone.
- **Accessibility:**
  - WCAG 2.2 AA throughout, with focus moving to the stem on each new question.
  - `aria-live="polite"` announces results such as `Correct. Plus 10 XP`.
  - Colour is never the only signal, and every lab works fully by keyboard.

## 8 Persistence and data model

**Decisions.**
An append-only event log in IndexedDB is the only source of truth, and all derived state comes from a pure replay keyed by `ENGINE_VERSION` and `contentVersion`.
Backups are the log itself, and import merges by event id, so it is idempotent and syncs devices by hand.
Content changes never break history: ids are stable, a corrected key rescores or drops old answers for FSRS while XP stays as recorded, and unknown ids never throw.

### 8.1 Stores and events

IndexedDB database `ccp-study`:

| Store | Content | Source of truth |
|---|---|---|
| `events` | append-only facts keyed by ULID | yes |
| `kv` | ADR drafts, lab working state, `examSession` (the open boss or mock draft: picks, flags, changes, time per item and the current position; the seed, item order and `deadline` live on the `session` start event), `rankSeen` (the id of the rank whose promotion line was last dismissed), mission ticks, `plan` (`{ plan, credits, endsOn, services: Record<string, boolean>, recordedAt }`, from Mission 0), `examAsk`, `lastExportAt`, `currentLesson` (the lesson last opened, for Next), `engineVersion` (the engine whose "Rules updated" line was dismissed), `schemaVersion` (the storage version of the local log) and `preMigration` (the log and `kv` as they were before the last local migration); each value has `updatedAt` | yes |
| `cache` | derived snapshot keyed by `lastEventId:ENGINE_VERSION:contentVersion` | no |

```ts
type Base = { id: string /* ULID */; at: string /* UTC ISO */; tz: number /* offset, minutes */;
              day: string /* study day with a 04:00 boundary, stamped at write */ };
type Event = Base & (
  | { t: 'answer'; sid: string; mode: Mode; qid: string; qv: number; concept: string;
      picked: string[] | [string, string][]; correct: boolean; sure: boolean; flagged?: boolean;
      changes?: string[][]; ms: number; relearn?: boolean }
  | { t: 'session'; sid: string; mode: Mode; phase: 'start' | 'submit' | 'abandon';
      seed: number; form?: string; qids?: string[]; deadline?: string }
  | { t: 'lesson.done'; note: string }
  | { t: 'lab.done'; lab: string; rev: number; hints: number }
  | { t: 'incident.offered' | 'incident.done'; incident: string; firstTry?: boolean }
  | { t: 'review.now'; concept: string }
  | { t: 'cause'; sid: string; qid: string; cause: 'unknown' | 'confused' | 'misread' }
  | { t: 'mission'; mission: string; step: 'start' | 'verified' | 'cleaned' | 'usage-ok'; credits?: number }
  | { t: 'decision'; module: number; stage: 'self' | 'final'; scores: [number, number, number, number]; keyPoints?: string[] }
  | { t: 'flag'; qid: string; qv: number; reason: 'wrong-key' | 'ambiguous' | 'outdated' | 'typo' | 'other'; note?: string }
  | { t: 'settings'; patch: { examDate?: string | null } }
  | { t: 'rank'; rank: string }                      // written once per promotion
);
// derive(content, events, now) -> { xp, level, streak, freezes, cards, mastery, readiness, rank, badges, queue }
```

- XP, levels, FSRS cards, badges and freeze use are never stored, because they are always derived.
- A relearn answer in a review (3.6) carries `relearn: true`, so replay gives it 0 XP and no FSRS update.
- The flag is optional, so every older event and backup stays valid at schema version 1.
- Ranks are derived too, but each promotion also writes a `rank` event, and the shown rank is the highest one recorded or computed, so no rescore or replay can take it away (3.4).
- Missions done by hand before the missions screen exists are recorded by a one-time `Already done` action (Phase 6), which writes their `mission` events with the dates Dani enters as `at`.
- A mock session's `start` event stores its `qids`, so replay never depends on `forms.yaml`.
- About 15,000 events at about 180 bytes each come to about 2.7 MB.
- A full replay takes under 100 ms, and new events fold into the cached snapshot one by one.
- The app calls `navigator.storage.persist()` on the first answer and waits for the commit before showing Next.
- If a write fails, a banner reads `Progress can't be saved in this browser` next to an Export button.

### 8.2 Versions and migration

- `SCHEMA_VERSION` is an integer for the storage shape, and `src/store/migrations/NNN.ts` holds one pure `(vN) => vN+1` function per step.
- Migrations run when the app opens and on every import, and one pre-migration copy is kept in `kv`.
- `tests/fixtures/backups/vN.json` keeps every past schema forever, and each must import, migrate and replay to its recorded snapshot.
- Changing a formula bumps `ENGINE_VERSION`, which forces a full replay and shows one line: `Rules updated, progress recalculated.`
- `contentVersion` is the content build hash, and a change also triggers a replay.

### 8.3 Export and import

```json
{ "format": "ccp-study-backup", "schemaVersion": 1, "appVersion": "0.4.0", "contentVersion": "c-3f9a1e",
  "exportedAt": "2026-10-09T08:00:00Z", "events": [], "kv": {} }
```

- The export file is `ccp-study-backup-YYYY-MM-DD.json`, and it carries the `flag` events back to the content pipeline.
- Import parses the file, migrates it and validates it with `zod/mini`.
- It then shows a preview, for example `1,240 events from Sep 2 to Oct 9; this browser has 310`.
- Dani then chooses **Merge**, the default, or **Replace**, in that inline preview panel.
- Merge is a union by event id, so it is idempotent and works in either order, and for `kv` the newer `updatedAt` wins.
- Home shows a backup reminder line only when the last export is more than 7 days old and at least 50 events are new since then.

### 8.4 When content changes (resolved before the reducers run)

| Change | Rule |
|---|---|
| Typo or why-line edit, key unchanged | Same id and version; the hashes change, so the question is re-verified and re-stamped before it can stay live |
| Correct answer changed | `version + 1` with `history: {change: key-fix}`. Old answers are rescored against the new key for FSRS, mastery and readiness when the option ids are unchanged, and dropped otherwise. XP and badges keep the correctness recorded at the time, and ranks keep their `rank` events. A notice reads "1 question you answered was corrected." |
| Question retired | `status: retired` tombstone in place, never served again, id never reused, history still resolves |
| Concepts merged or renamed | The old id becomes an alias in `concepts.yaml`, and replay maps it to the surviving concept |
| Concept split | Each new concept carries `splitFrom`, and replay copies the old card state to each |
| Mock forms | Forms are frozen once committed and never edited (rule 2); a frozen form skips items that are no longer live and is scored over the rest, and session events keep their own `qids` |
| Unknown ids (an old backup against new content, or the reverse) | Kept, counted in diagnostics as "12 events refer to newer content", never thrown |
| Lab edited | Completions record the lab `rev`, and an edit never revokes one |
| Note edited by the notes workflow | `pnpm content:validate --demote` sets questions whose evidence lines no longer match to `draft`, so the live-only rules pass and the note edit can be committed; the drafts then go back through revision and re-verification |

## 9 Testing and quality

**Decisions.**
All game math is pure TypeScript with table-driven unit tests, property tests for the anti-grind and merge guarantees, and golden replay journeys.
Content quality is enforced by rules R1 to R13, each with a failing fixture, and every bug ships with a dated regression test written before the fix.
Playwright with `page.clock` covers multi-day journeys, axe runs on every screen, and screenshots are taken at 375 and 1280 px.

- **Unit tests (Vitest):**
  - `srs`: golden vectors against the pinned `ts-fsrs`, intervals ordered Again < Hard < Good, and the exam cap spread over 7 days and recomputed from the current `examDate` on replay.
  - Whole-day intervals make R at due vary for short intervals, so the vectors lock 0.881 after a first Good (3 days), 0.867 after a first Hard (2 days) and 0.766 after Again (1 day), and R at due is asserted at 0.90 plus or minus 0.01 only for intervals of 7 days or more below the 180-day cap.
  - `fingerprint`: every committed set has `0.004 <= f <= 0.01`, and masking matches `overlap_check.py` on fixture text.
  - `bets`: the payoff table and the 5/7 crossover.
  - `xp` and `level`: one row per table entry, and `level(xpForLevel(L)) = L` for L from 1 to 40.
  - `streak`: the 04:00 boundary, DST change days, travel across offsets, earning and spending freezes, and the 2-freeze cap.
  - `queue`: misconceptions first, no adjacent same-module items when avoidable, confusable pairs within 3 positions, catch-up at more than 100 overdue.
  - `select`: a variant never repeats the previous one, bosses never draw from the exam pool, and a boss draw still succeeds when every variant was seen within 7 days.
  - `mastery` and `readiness`: values stay within 0 to 1, values never rise without an event, unseen concepts count 0, the 0.70 cap applies without a mock, the 7-day projection applies without an exam date, and the Ready conditions hold.
  - NOTE: readiness may rise without a new event when a mock attempt leaves the 21-day window or every attempt does; the never-rise property holds for Memory and every `Q_d`, and for readiness on logs with no mock submit (Phase 3).
  - `ranks`: one fixture per rank that crosses its threshold by exactly one event, plus tests that a rank survives later decay, a key-fix rescore and an `ENGINE_VERSION` replay.
  - `badges`: one fixture per badge that crosses its threshold by exactly one event.
  - `mock`: exact 16/19/22/8 counts, the per-task counts, 8 multi-response items split 2/2/3/1, no repeated concept, `content:forms` either splits a pool that meets `quotas.yaml` into forms A-D or names the task or concept that blocks it, and the same seed always gives the same form.
  - `leakage`: no learn-mode selector ever returns an item from an untaken form.
  - Each lab engine: security group against network ACL statefulness, policy evaluation order, cost arithmetic, determinism.
- **Property tests (fast-check):**
  - Grind invariance: N correct answers to one concept in a day give the same XP and FSRS state as 1.
  - Adding wrong answers gives the same result as one extra Again.
  - Merge is idempotent and commutative, and `import(export(s))` derives the same state.
  - Replay is deterministic, and events with unknown ids are tolerated.
- **Golden journeys:**
  - `tests/fixtures/journeys/{first-week,exam-crunch,comeback-10-days}.jsonl` each have a committed derived snapshot.
  - An `ENGINE_VERSION` bump updates the snapshots in the same commit.
- **Content tests:** `pnpm content:validate` against `tests/content/bad/` with every rule and switch on (one fixture per rule must fail), plus replays of every lab's solution and wrong paths.
- **Regression rule:** every bug gets `tests/regressions/YYYY-MM-DD-<slug>.test.ts` holding the event log or content that reproduces it, written before the fix.
- **End-to-end (Playwright, Chromium and WebKit):**
  1. **First run:** read a lesson, then a lesson check with bets; the top bar shows XP.
  2. **Next day:** answer one lesson-check item wrong (Again, due the next day), advance the clock 1 day, the concept is due, answer it wrong again to see the relearn step, finish the queue, and the streak reads 2.
  3. **Boss timeout:** a boss with the clock fast-forwarded to timeout leads to results and the error review.
  4. **Mock reload:** a mock survives a reload with the correct remaining time.
  5. **Backup:** export, wipe storage, import with Merge, and the derived state is identical.
  6. **Offline:** after the first load, a lesson, a review and a Sort lab still work offline.
  7. **Missions:** the Mission 0 gate blocks the other missions, a live mission past `maxLiveHours` turns Next into `Clean up`, and the kept Mission 1 never does.
  8. **Exam date:** the question appears once after the Module 1 lessons, and with the clock at `examDate - 7` and readiness below Ready the go/no-go line shows.
  9. **Keyboard only:** a run through the runner, the exam shell and a Place lab.
- **Accessibility and visuals:**
  - axe-core runs on every screen with zero violations allowed.
  - `toHaveScreenshot` captures Home, the runner, the exam shell, results, a module page, a lesson with an update line and a lab at 375 and 1280 px.
- **CI order:** `pnpm check` runs `tsc --noEmit`, Biome, `content:validate`, and unit and property tests, and `pnpm verify` adds the build with the size budget check and the end-to-end tests.

## 10 Build order

**Decisions.**
Every phase ships something Dani uses that week, and the order follows the November 14 exam: reader first, then practice, the memory loop and exam measurement, with labs after.
Phases 0 to 3 are the exam-critical core, and if time runs short scope is cut in this order: Phase 6, then Phase 5, then Phase 4 down to its Sort labs.
Nothing but fixes ships between the go/no-go check on Saturday, November 7 and the exam.

### 10.1 Phases

| Phase | Target | Ships | Usable outcome | Exit criteria |
|---|---|---|---|---|
| 0 Spine | Sun Oct 11 | Node 24 pinned; site scaffold commit; pre-commit hook; `validate.yaml`; fingerprints and `allow.txt`; `concepts.yaml` seeded and completed; `blueprint.yaml` with all 19 tasks and their terms; rules R1, R2, R6, R7, R8 and R13; reader, palette, glossary, update-line rendering; Module 11 update lines; Missions 0 and 1 as read-only pages, done by hand | Read every note on a phone at the CloudFront URL | R1, R2, R6, R7, R8 and R13 on; every note passes R6, R7 and R8; the site serves through CloudFront |
| 1 Practice | Wed Oct 14 | Question schema, check pipeline, the R7 stem check (2.5) and `content:stamp` piloted on Modules 1 and 3; runner (single, multi, match); lesson checks; module quiz; event log; export and import; `content:report --coverage` and the update lines for every missing blueprint term | Practice Modules 1 and 3 with saved progress | R3, R4, R5 and R9 also on; every live pilot question passes them |
| 2 Memory loop | Mon Oct 19 | Questions for the other 11 modules; FSRS queue, bets, XP, level, streak, top bar; Home with Next (including "Check yourself"), hexes and "Done for today"; exam date question; offline service worker | The daily habit loop across the whole course | R10 on at 2 per concept with `blueprintTerms`, so the coverage report lists no missing term |
| 3 Exam | Sat Oct 24 | Exam pool under `content/exam/pool/`, quotas, and forms A-D frozen; bosses; mock with focus mode; error review; readiness and go/no-go line; ranks; badges; Progress overlay | Exam measurement and a go/no-go signal | R10 `examQuotas` and R12 on; the leakage test green |
| 4 Labs I | Sat Oct 31 | Lab contract and the Sort engine with its 11 core labs first, then Configure and Simulate (8 more); incidents; lightning | Hands-on practice offline | R11 on; every shipped lab replays |
| 5 Labs II | after the exam | Place, Trace and Investigate with their 7 core labs; stretch labs | The full core lab catalog | 26 core labs live |
| 6 Capstone and missions | after the exam, all of it; capstone decisions unlocked earlier wait until then | ADR editor, reference reveal, export; Missions 2-8 and the one-time `Already done` action for Missions 0 and 1; accessibility and visual baselines; 3 questions per concept | The complete product | All e2e green; R10 at 3 per concept |

- If the booked date moves, the targets move with it, and the cut order stays the same.

### 10.2 Study calendar for the November 14 exam

| Week | Dates | Study | Milestones |
|---|---|---|---|
| 1 | Oct 9-14 | Modules 1-3; lesson checks and quizzes for Modules 1 and 3 from Oct 14 | Exam booked for Sat Nov 14; Missions 0 and 1 |
| 2 | Oct 15-21 | Modules 4-7; daily reviews from Oct 19 | All modules have practice questions from Oct 19; "Check yourself" brings back the lessons read before their questions existed |
| 3 | Oct 22-28 | Modules 8-11 and daily reviews | Bosses ship Oct 24; bosses for Modules 1-7; Business Support+; form A Tue Oct 27 |
| 4 | Oct 29-Nov 4 | Modules 12-13; bosses for Modules 8-13 | Form B Sat Oct 31; form C Wed Nov 4; Enterprise (13 bosses) |
| 5 | Nov 5-11 | Reviews and focus quizzes on the weakest tasks | Go/no-go Sat Nov 7; form D Mon Nov 9 |
| 6 | Nov 12-14 | Reviews only | Exam Sat Nov 14 |

- Mocks are at least 3 days apart, matching the extras rule (4.6).
- Form D on November 9 keeps an unseen mock inside the 21-day readiness window (3.9) even if the exam moves by up to two weeks.
- **Go/no-go rule:** on Saturday, November 7, if readiness is not Ready, reschedule by one or two weeks; rescheduling is allowed up to 24 hours before the appointment and twice per appointment, and cancelling more than 24 hours ahead refunds the fee.

## 11 Risks and open questions

**Decisions.**
The biggest risks are drift between the course and the exam, the five-week window against build time, and the free-plan account closing with the hosted site on it.
Each risk has a mechanism already in this design, and the questions still open for Dani follow, each with a default.

| Id | Risk | Mitigation |
|---|---|---|
| K1 | The course teaches five Support plans and says three end on January 1, 2027, while the exam guide and the plans page list four different plans | Ranks and questions use the four current names; Module 11 update lines carry the current facts with sources; the course list stays as course content (2.3) |
| K2 | The exam reaches beyond the course (the known gaps in 2.3, such as Firewall Manager, access keys, cost allocation tags and system integrators, plus any the coverage report finds) | The coverage report per task statement, sourced update lines, and rule 10's blueprint-term check from Phase 2; rule 13 keeps the lines fresh |
| K3 | About `3C + 260` items times 3 agent checks is a large verification load | Hash-bound stamps make re-verification incremental, and 2 questions per concept come first |
| K4 | The course data in `~/Library/Application Support/ccp-study/` could be lost | Committed fingerprints keep R7 running without it; Dani includes the folder in his own Mac backups; re-extraction is Appendix A |
| K5 | Duplicate or near-duplicate tags across notes | One home per concept and aliases in `concepts.yaml`, enforced by R6 |
| K6 | Five weeks is short for building and studying at once | Phase 0 ships a usable reader in 2 days; the cut order is Phase 6, then 5, then 4 down to its Sort labs; only fixes ship between November 7 and the exam |
| K7 | Browser storage can be evicted, especially in Safari | `persist()`, the backup reminder, merge import and home-screen install |
| K8 | FSRS defaults were tuned on flashcards, not multiple choice | Easy is never used, Not sure rates Hard, variants rotate, and parameters can be fitted offline after about 1,000 reviews |
| K9 | Mock percentages are not AWS scaled scores | An 80% bar and raw percentages only |
| K10 | AWS costs and free plan rules change | Mission 0 gate and plan-fit check, the never-create list, the next-day usage check and the 180-day `verified_on` rule |
| K11 | The free-plan account closes at 6 months or when credits run out, taking the CloudFront site with it | Missions spend few credits; the app keeps working offline from the service worker, progress lives in local backups, AWS keeps the account's data for 90 days during which upgrading to the Paid plan restores it, and `infra/site.yaml` redeploys anywhere |
| K12 | S3 or CloudFront might not be on the free plan's service list | Mission 0 checks plan fit first; until Mission 1 can run, Dani uses `pnpm preview` locally |
| K13 | Lab scope | 26 core labs on 6 engines; stretch labs can be cut |
| K14 | The exam pool ships in the bundle and relies on the honor system | One lazy chunk per form, loaded only by its own mock until the form is taken, then by learn screens; exam end-to-end tests run on synthetic forms |

**Open questions for Dani:**
1. **Booking:** the exam is booked for Saturday, November 14, 2026; is it at a testing center or online proctored?
   - Default: the delivery mode does not change the app, and until the date is entered in the app, readiness projects 7 days ahead and the app asks once after Module 1.
2. **After the exam:** keep the site when the free-plan account closes?
   - Default: export a backup and let the account close.
   - If Dani wants it online, he can upgrade this account to the Paid plan within 90 days of the free plan ending, which restores the account and the site in place, or redeploy `infra/site.yaml` to another paid account; after 90 days AWS erases the account and its content.
3. **FSRS fitting:** fit personal parameters after about 1,000 reviews?
   - Default: no fitting before the exam.
4. **A late exam move:** if the exam moves more than two weeks past November 14, form D falls outside the 21-day readiness window and Ready cannot be reached.
   - Default: only then generate one form E of 65 new exam-pool items under the same quotas, which pays the mock XP once like A to D.

## Appendix A: Re-extracting course content

Extraction is done: all 13 modules were captured on 2026-10-09 through Dani's own Chrome.
Re-extraction is needed only if the course changes, and it is a manual one-off:
1. **Capture:** with Dani signed in to Skill Builder in his own Chrome, open the changed module and save the Rise course payload the player loads as `raw/module-NN.json`, keeping the previous file as `raw/module-NN.prev.json`.
2. **Validate:** check the saved payload's UTF-16 length against the in-page string, and update the module's entry in `raw/manifest.json` (`bytes`, `utf16_len`, lesson counts, `validation`).
3. **Render:** run `python3 -I pipeline/render_source.py raw source` from the `ccp-study` folder, and diff the new `source/module-NN.md` against the previous one to list changed lessons.
4. **Fingerprint:** run `pnpm content:fingerprint` in the repo and commit the changed `content/fingerprints/mNN.json` and `allow.txt`.
5. **Notes:** run the notes workflow on the changed lessons only, keeping every "Exam guide update" line and every frontmatter tag (2.2), then `lint_notes.py` and `overlap_check.py` on them.
6. **Validate:** run `pnpm content:validate --demote`; questions whose evidence lines changed become drafts and go back through writing and verification.

No step copies course data into the repo, and no step needs browser profiles, copied login state or parallel browsers.

## Appendix B: Verified facts

External facts, each checked on 2026-10-09:

| Fact | Source |
|---|---|
| CLF-C02 has 65 questions in 90 minutes, multiple choice or multiple response, costs 100 USD, and is delivered at a Pearson VUE testing center or online proctored | [AWS Certified Cloud Practitioner](https://aws.amazon.com/certification/certified-cloud-practitioner/) |
| 50 questions are scored and 15 are unscored, and the unscored ones are not identified | [CLF-C02 exam guide](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html) |
| Multiple choice has 1 correct response and 3 distractors; multiple response has 2 or more correct responses among 5 or more options | [CLF-C02 exam guide](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html) |
| Unanswered questions are scored as incorrect, and there is no penalty for guessing | [CLF-C02 exam guide](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html) |
| Scores are scaled from 100 to 1,000, 700 passes, and scoring is compensatory | [CLF-C02 exam guide](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html) |
| Domain weights are 24% Cloud Concepts, 30% Security and Compliance, 34% Cloud Technology and Services, 12% Billing, Pricing, and Support | [CLF-C02 exam guide](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html) |
| There are 19 task statements: 1.1-1.4, 2.1-2.4, 3.1-3.8 and 4.1-4.3 | [Domain 1](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html), [Domain 2](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html), [Domain 3](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html), [Domain 4](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html) |
| Task 4.3 names Basic Support, AWS Business Support+, AWS Enterprise Support and AWS Unified Operations, plus AWS Prescriptive Guidance, AWS Knowledge Center and AWS re:Post | [Domain 4](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html) |
| Task 4.2 names AWS cost allocation tags and the AWS Cost and Usage Report | [Domain 4](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html) |
| Task 2.4 names AWS WAF, AWS Firewall Manager, AWS Shield, Amazon GuardDuty and AWS Security Center; task 2.2 names reporting with access reports; task 2.3 names access keys, password policies and AWS IAM Identity Center; task 2.1 names Amazon RDS, AWS Lambda and Amazon EC2 as services where responsibilities shift | [Domain 2](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html) |
| Task 1.1 names speed of deployment; task 1.3 names the CAF benefits reduced business risk, improved ESG performance, increased revenue and increased operational efficiency, and database replication; task 1.4 names included licenses against BYOL | [Domain 1](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html) |
| Task 3.7 names Amazon SageMaker AI, Amazon Lex, Amazon Athena, Amazon Kinesis, AWS Glue and Amazon Quick Sight; task 3.5 names AWS VPN and AWS Direct Connect | [Domain 3](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html) |
| Task 4.3 names the AWS Partner Network role, including independent software vendors and system integrators | [Domain 4](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html) |
| The Support plans page lists Basic Support, included for all customers, and compares Business Support+, Enterprise Support and Unified Operations; it does not list Developer, Business or Enterprise On-Ramp | [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/) |
| Business Support+ is the "minimum recommended plan for production workloads", with a response under 30 minutes when a business- or mission-critical system is down (rank facts) | [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/) |
| Enterprise Support includes a designated Technical Account Manager, with a response under 15 minutes when a business- or mission-critical system is down (rank facts) | [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/) |
| Unified Operations is the only plan with 24/7 workload monitoring, and an Incident Management Engineer responds in under 5 minutes when a business- or mission-critical system is down (rank facts) | [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/) |
| A new Free Tier account gets $100 in credits at sign-up and can earn up to $100 more by exploring key services | [AWS Free Tier](https://aws.amazon.com/free/) |
| The free plan lasts up to 6 months, the account closes at 6 months or when the credits run out (whichever comes first), it covers select services only, and there are no charges unless the account converts to the Paid plan | [AWS Free Tier](https://aws.amazon.com/free/) |
| When the free plan ends, AWS suspends the account, keeps its data for 90 days during which an upgrade to the Paid plan restores access, and then erases the account and its content | [AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/) |
| On a free-plan account, creating an AWS organization, which enabling IAM Identity Center on a standalone account does, upgrades the account to the Paid plan and the free-plan credits expire at once | [Enable IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html) |
| A free-plan account upgrades to the Paid plan automatically if it joins AWS Organizations, sets up an AWS Control Tower landing zone, joins the AWS Partner Network, creates a Professional Services contract, enrolls in an Enterprise Agreement with AWS, buys an AWS Skill Builder Team subscription, or is designated as HIPAA or SEC compliant | [Choosing a plan](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html) |
| In AWS Artifact, an account reviews and accepts agreements such as the Business Associate Addendum (BAA) and designates an account that can legally process PHI | [Managing agreements in AWS Artifact](https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html) |
| AWS Budgets sends an actual-cost alert once per budget per period, when the threshold is first reached; forecast alerts need about 5 weeks of usage data; cost budgets can include or exclude credits | [Best practices for AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html) |
| A cost budget's Budget scope takes filters, including a Charge type filter whose values include Credit; its Advanced options choose the cost aggregation, where net unblended and net amortized costs apply credits | [Budget filters](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html), [Creating a cost budget](https://docs.aws.amazon.com/cost-management/latest/userguide/create-cost-budget.html) |
| AWS Budgets notifies only verified email recipients: the verification link expires 12 hours after it is sent and must be opened while signed in to the account, and each budget's detail page shows a recipient as Active, Pending, Active (legacy) or Inactive, with Resend verification for Pending | [Adding email recipients to a budget notification](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-email-recipients.html) |
| An exam can be rescheduled up to 24 hours before the appointment, and each appointment can be rescheduled twice | [AWS Certification policies, before testing](https://aws.amazon.com/certification/policies/before-testing/) |
| Cancelling more than 24 hours before the appointment refunds the fee; within 24 hours there is no refund | [AWS Certification policies, before testing](https://aws.amazon.com/certification/policies/before-testing/) |
| AWS documents a console tutorial in which an S3 upload triggers a Lambda function that writes to CloudWatch Logs (Mission 3) | [Tutorial: Using an Amazon S3 trigger to invoke a Lambda function](https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html) |
| November 14, 2026 is a Saturday, 36 days after October 9, 2026, and November 7, 2026 is the Saturday one week before | calendar arithmetic |

Course facts, checked against the course source text (`source/module-NN.md`, outside the repo) on 2026-10-09:

| Fact | Module |
|---|---|
| The course teaches five Support plans (Basic, Developer, Business, Enterprise On-Ramp, Enterprise) and states that Developer, Business and Enterprise On-Ramp Support will be discontinued on January 1, 2027 | 11 |
| The Well-Architected Framework has six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization and Sustainability | 13 |
| There are seven migration strategies: rehost, relocate, replatform, refactor, repurchase, retain and retire | 12 |
| The AWS CAF has six perspectives: Business, People, Governance, Platform, Security and Operations | 12 |
| The "Benefits of the AWS Cloud" lesson teaches six benefits | 1 |
| The course spells "QuickSight" and uses "SageMaker AI" and "Amazon Q" | 8 |
| No exact-phrase match for AWS Firewall Manager, AWS Security Center, access reports, access keys, password policies, cost allocation tags, AWS Cost and Usage Report, AWS Prescriptive Guidance, system integrators, speed of deployment, database replication, included licenses, AWS VPN, Business Support+ or Unified Operations (in the source text or the notes) | all |
| Module 1's shared responsibility lesson covers patching the operating system against AWS's duties for the physical, network and hypervisor layers, and names no specific service; Module 7 teaches the unmanaged, managed and fully managed categories for database services | 1, 7 |
| Knowledge checks and assessment items are marked `[KNOWLEDGE CHECK ...]` and `[ASSESSMENT Qn ...]` in the source text | all |
