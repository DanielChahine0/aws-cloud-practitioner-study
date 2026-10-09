# CCP Study

CCP Study is Dani's personal static study site for the AWS Certified Cloud Practitioner exam (CLF-C02).
It serves the own-words notes in `resources/` as a reader with search, glossary popovers and dated "Exam guide update" lines, and practice, reviews and labs arrive phase by phase.
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
| `pnpm site:deploy` | Runs `pnpm verify`, then publishes `dist/` to the Mission 1 bucket and refreshes CloudFront |

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

## Course text stays out

The course text lives only in `~/Library/Application Support/ccp-study/`, outside this repository.
The only course-derived data here is the one-way fingerprints in `content/fingerprints/`, which `pnpm content:fingerprint` writes.
No file, fixture or test in the repo may hold course text, and test fixtures use made-up bakery text instead.
