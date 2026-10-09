# Phase 0 (Spine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the spine of the CCP study site: the toolchain, the content validator with rules R1, R2, R6, R7, R8 and R13, the committed fingerprints, the completed concept registry and exam blueprint, and a static reader for every note, with search, glossary popovers, "Exam guide update" lines and read-only Missions 0 and 1, ready for Dani to deploy to CloudFront.

**Architecture:** A Vite, Preact and strict TypeScript SPA with hash routing reads JSON content chunks that a build-time pipeline renders from `resources/` and `content/`.
The same pipeline loads every content file into one `Context`, and the validator runs pure rules over it, each proven by a failing fixture.
The course text never enters the repo: the only course-derived data is one-way truncated shingle hashes in `content/fingerprints/`.

**Tech Stack:** Node 24.21.0, pnpm 12.8.1, TypeScript 7.0.2, Vite 8.3.2, Preact 10.29.8 with @preact/signals 2.11.3, zod 4.6.5, marked 18.0.14, yaml 2.9.1, Vitest 5.0.3, fast-check 4.10.2, Playwright 1.63.0 with @axe-core/playwright 4.13.0, Biome 2.5.15, AWS CloudFormation.

**Spec:** `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md`, sections 1, 2, 7 and 10.1 (Phase 0 row).
**Target:** Sunday, October 11, 2026, for the exam on Saturday, November 14, 2026.

---

## Conventions for every task

- Run every command from the repository root, `/Users/danielchahine/Programs/AWS Cloud Practitioner Essentials`.
  The shell's `fnm env --use-on-cd` hook selects Node 24 from `.node-version` once Task 1 has created it, so `node --version` must print `v24.21.0` before any `pnpm` command.
- Never write the em dash character (U+2014) anywhere, and keep one sentence per line in every Markdown file outside code blocks and tables (rule R8 checks both).
- Commit messages are plain imperative sentences with a short body; never add a `Co-Authored-By` line (Dani's global instructions forbid agent co-author lines).
- Run `pnpm lint:fix` before each commit so Biome formats the code; the code in this plan follows Biome's style, but the formatter has the last word.
- Never hand-edit generated files: `content/fingerprints/*` comes only from `pnpm content:fingerprint`.
- Course text stays outside the repo in `~/Library/Application Support/ccp-study/`; no file, fixture or test in the repo may contain it.
  Test fixtures use made-up bakery text instead.
- From Task 18 on, the pre-commit hook runs `pnpm check`, so a commit fails while any check fails; fix the cause rather than bypassing the hook.

## File structure

Created in this phase (paths from the repo root):

| Path | Responsibility |
|---|---|
| `.node-version`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `playwright.config.ts`, `vite.config.ts`, `index.html` | Toolchain and build configuration |
| `.githooks/pre-commit` | Runs `pnpm check` before every commit |
| `README.md` | How to set up, run and deploy the site |
| `schemas/common.ts` | Shared zod building blocks: slugs, note ids, task ids, dates, URLs |
| `schemas/note.ts`, `schemas/concept.ts`, `schemas/blueprint.ts`, `schemas/mission.ts`, `schemas/validate-config.ts`, `schemas/fingerprint.ts` | One zod schema per content file type |
| `schemas/chunks.ts` | TypeScript types of the JSON chunks the build writes and the app reads |
| `scripts/content/lib/text.ts` | Tokenizing, masking, code-fence detection and the sentence and em dash checks |
| `scripts/content/lib/fingerprint.ts` | Truncated shingle hashes: build, pack, unpack, runs and corrected share |
| `scripts/content/lib/source.ts` | Splits the course source text into knowledge checks and assessment items, and lists its titles |
| `scripts/content/lib/fingerprint-files.ts` | Builds one module's fingerprint file and the `allow.txt` text |
| `scripts/content/lib/markdown.ts` | Frontmatter split, headings, slugs and the anchors under `## Notes` |
| `scripts/content/lib/update-line.ts` | Parses "Exam guide update" lines |
| `scripts/content/lib/context.ts` | Loads every content file into one `Context`, collecting parse errors as R1 findings |
| `scripts/content/lib/glossary.ts` | Parses `resources/glossary.md` and builds the term matcher |
| `scripts/content/lib/registry.ts` | Seeds, merges and writes `content/concepts.yaml` |
| `scripts/content/lib/render.ts` | Renders Markdown to HTML sections with the site's rules |
| `scripts/content/rules/rule.ts`, `scripts/content/rules/index.ts` | The `Rule` type and `finding()`, and `RULES`, `runRules` and `formatFinding` |
| `scripts/content/rules/r01-schema.ts`, `r02-ids.ts`, `r06-references.ts`, `r07-originality.ts`, `r08-style.ts`, `r13-sources.ts` | One file per validator rule |
| `scripts/content/validate.ts`, `fingerprint.ts`, `concepts.ts` | The `pnpm content:*` command-line entry points |
| `scripts/content/build.ts` | Builds the JSON chunks from a `Context` |
| `scripts/content/vite-plugin.ts` | Runs build and validation inside Vite, in dev and in the build |
| `scripts/csp.ts` | The Content-Security-Policy string shared by CloudFront and `vite preview` |
| `scripts/check-budgets.ts` | Fails the build when bundles exceed their size budgets |
| `scripts/lib/deploy.ts`, `scripts/site-deploy.ts` | `pnpm site:deploy` and its pure pruning logic |
| `content/validate.yaml`, `content/concepts.yaml`, `content/exam/blueprint.yaml` | Validator switches, concept registry, exam blueprint |
| `content/fingerprints/m01.json` to `m13.json`, `allow.txt` | Generated originality data |
| `content/missions/mission-00-guardrails.md`, `mission-01-host-this-site.md` | Read-only mission pages |
| `agents/registry-writer.md` | Versioned prompt for the agents that complete the registry |
| `src/main.tsx` | Mounts the app and imports the CSS |
| `src/app/router.ts`, `src/app/nav.ts` | Hash routes, and the lesson order with the one-level-up target |
| `src/app/state.ts` | The route, overlay and term-popover signals, and the one `hashchange` listener |
| `src/app/content.ts` | Loads the content index, the module chunks and the search chunk |
| `src/app/search.ts` | Normalizes search text (the build imports it too) and ranks palette results |
| `src/app/keys.ts`, `src/app/keyboard.ts` | The pure key-to-command mapping and the one window keydown listener |
| `src/app/App.tsx` | The shell: top bar, the screen for the route, the open dialog |
| `src/app/screens/Screen.tsx`, `Home.tsx`, `ModulePage.tsx`, `LessonPage.tsx`, `MissionsPage.tsx`, `MissionPage.tsx`, `NotFound.tsx` | The route switch and the reader screens |
| `src/app/screens/Palette.tsx`, `src/app/screens/Help.tsx` | The search palette and the keyboard help sheet |
| `src/ui/tokens.css`, `src/ui/base.css`, `src/ui/favicon.svg` | The spec 7.1 tokens, the base styles and the tab icon |
| `src/ui/Html.tsx`, `src/ui/Breadcrumbs.tsx`, `src/ui/TermPopover.tsx`, `src/ui/useTitle.ts` | Shared components and the tab-title hook |
| `src/ui/position.ts`, `src/ui/tables.ts`, `src/ui/backdrop.ts` | Popover placement, focusable scrolling table regions and closing a dialog from its backdrop |
| `infra/site.yaml` | CloudFormation for Mission 1: private S3, CloudFront with OAC, security headers |
| `tests/unit/*.test.ts` | Unit and property tests |
| `tests/content/bad/rNN-*.{yaml,md}`, `tests/content/bad.test.ts` | One failing fixture per rule and the harness that proves each fires |
| `tests/fixtures/content-root/**`, `tests/fixtures/source/module-01.md`, `tests/fixtures/content-root.ts` | A tiny valid content tree with made-up text, and the helper that copies it to a temp dir |
| `tests/e2e/reader.spec.ts` | Playwright end-to-end and accessibility tests |

Modified: `.gitignore`, `biome.json` (Task 21 switches on the React rules), `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md` (Task 17 names the Mission 0 IAM admin in sections 1.4, 5.3 and Appendix B, and Task 8 splits any line R8 flags), and `resources/11-pricing-and-support/04-aws-support-plans.md` (update lines and three concept tags).

---

## Task 1: Toolchain

**Files:**
- Create: `.node-version`, `package.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `tests/unit/toolchain.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Install and pin Node 24**

```bash
fnm install 24.21.0
printf '24.21.0\n' > .node-version
```

Then, in a new shell command (the profile's fnm hook reads `.node-version`):

```bash
node --version
```

Expected: `v24.21.0`.
If it prints another version, run `fnm use` in the same command line before every command in this plan.

- [ ] **Step 2: Install pnpm for Node 24**

```bash
npm install -g pnpm@12.8.1 && pnpm --version
```

Expected: `12.8.1`.

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "ccp-study",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.8.1",
  "engines": {
    "node": ">=24.21.0 <25"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build && node scripts/check-budgets.ts",
    "preview": "vite preview --port 4173 --strictPort",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "test": "vitest run",
    "content:validate": "node scripts/content/validate.ts",
    "content:fingerprint": "node scripts/content/fingerprint.ts",
    "content:concepts": "node scripts/content/concepts.ts",
    "check": "pnpm typecheck && pnpm lint && pnpm content:validate && pnpm test",
    "e2e": "playwright test",
    "verify": "pnpm check && pnpm build && pnpm e2e",
    "site:deploy": "node scripts/site-deploy.ts"
  }
}
```

- [ ] **Step 4: Install the dependencies at exact versions**

```bash
pnpm add -E preact@10.29.8 @preact/signals@2.11.3 zod@4.6.5
pnpm add -D -E vite@8.3.2 @preact/preset-vite@2.10.6 @babel/core@7.29.7 typescript@7.0.2 marked@18.0.14 yaml@2.9.1 vitest@5.0.3 fast-check@4.10.2 @playwright/test@1.63.0 @axe-core/playwright@4.13.0 @biomejs/biome@2.5.15 @types/node@24.19.1
pnpm exec playwright install chromium webkit
```

Expected: `pnpm-lock.yaml` exists and `node_modules/.bin/tsc`, `vite`, `vitest`, `biome` and `playwright` exist.
If pnpm reports ignored build scripts, read which package asked; none of these packages needs one, so leave them ignored.

- [ ] **Step 5: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["es2023", "dom"],
    "module": "preserve",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "types": ["node", "vite/client"]
  },
  "include": ["src", "scripts", "schemas", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

`erasableSyntaxOnly` and `verbatimModuleSyntax` keep every `.ts` file runnable by Node 24's built-in type stripping, which is how the `scripts/` entry points run.

- [ ] **Step 6: Write `biome.json`**

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": ["**", "!resources", "!docs", "!content/fingerprints", "!tests/content/bad"]
  },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 110 },
  "javascript": { "formatter": { "quoteStyle": "single" } },
  "linter": {
    "rules": {
      "preset": "recommended",
      "correctness": { "useImportExtensions": "error" },
      "style": { "useImportType": "error" }
    }
  }
}
```

- [ ] **Step 7: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/content/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 8: Extend `.gitignore`**

Append these two lines to the existing file:

```
.results/
*.tsbuildinfo
```

`.results/` holds agent outputs such as the registry results in Task 15, which are never committed (spec 2.7).

- [ ] **Step 9: Write the toolchain test**

`tests/unit/toolchain.test.ts`:

```ts
import { expect, test } from 'vitest';

test('runs on Node 24, the version pinned in .node-version', () => {
  expect(process.versions.node.split('.')[0]).toBe('24');
});
```

- [ ] **Step 10: Run the three fast checks**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected: `tsc` prints nothing, Biome reports no errors, and Vitest reports `1 passed`.
If Biome reports a configuration error for `files.includes`, run `pnpm biome migrate --write` and re-run.

- [ ] **Step 11: Commit**

```bash
git add -A && git status --short
```

Expected staged files: `.gitignore`, `.node-version`, `biome.json`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vitest.config.ts`, `tests/unit/toolchain.test.ts` (plus `pnpm-workspace.yaml` if pnpm created one).

```bash
git commit -m "Add the site toolchain" -m "Node 24 pinned, pnpm, strict TypeScript, Biome and Vitest, with every dependency at an exact version."
```

---

## Task 2: Text utilities

These functions are the shared ground truth for originality (R7) and Markdown style (R8).
They port the tokenizer and masking of `overlap_check.py` and the sentence check of `lint_notes.py`, with two deliberate improvements: list markers are stripped before the sentence check, and code fences follow CommonMark, so a 4-backtick fence can hold a 3-backtick one.

**Files:**
- Create: `scripts/content/lib/text.ts`
- Test: `tests/unit/text.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  emDashLines,
  fencedLines,
  MASK,
  mask,
  multiSentenceLines,
  phrasesFrom,
  stripMarkdown,
  words,
} from '../../scripts/content/lib/text.ts';

describe('words', () => {
  it('lowercases and keeps apostrophe suffixes, like overlap_check.py', () => {
    expect(words("AWS's Lambda don’t run_fast 2026-10-09")).toEqual([
      "aws's",
      'lambda',
      'don’t',
      'run',
      'fast',
      '2026',
      '10',
      '09',
    ]);
  });
});

describe('stripMarkdown', () => {
  it('drops frontmatter, link targets, URLs and Markdown punctuation', () => {
    const text = '---\nmodule: 1\n---\n# Title\n- **Bold** [label](../x.md) https://docs.aws.amazon.com/x `code`';
    expect(words(stripMarkdown(text))).toEqual(['title', 'bold', 'label', 'code']);
  });
});

describe('phrasesFrom and mask', () => {
  it('skips comments, blanks and one-word lines, and sorts longest first', () => {
    expect(phrasesFrom(['# comment', '', 'Amazon EC2', 'Assessment', 'Amazon EC2 Auto Scaling'])).toEqual([
      ['amazon', 'ec2', 'auto', 'scaling'],
      ['amazon', 'ec2'],
    ]);
  });

  it('masks the longest phrase first', () => {
    const phrases = phrasesFrom(['Amazon EC2', 'Amazon EC2 Auto Scaling']);
    expect(mask(words('Use Amazon EC2 Auto Scaling with Amazon EC2'), phrases)).toEqual([
      'use',
      MASK,
      MASK,
      MASK,
      MASK,
      'with',
      MASK,
      MASK,
    ]);
  });
});

describe('fencedLines', () => {
  it('closes a fence only with at least as many of the same character', () => {
    const lines = ['a', '````md', '```json', '{}', '```', '````', 'b'];
    expect(fencedLines(lines)).toEqual([false, true, true, true, true, true, false]);
  });
});

describe('emDashLines', () => {
  it('reports 1-based line numbers', () => {
    expect(emDashLines('a\nb \u2014 c\nd')).toEqual([2]);
  });
});

describe('multiSentenceLines', () => {
  it('flags two sentences on a line and exempts abbreviations, initials, tables, code and list markers', () => {
    const md = [
      '---',
      'title: x',
      '---',
      '# Head',
      'One sentence. Two sentences.',
      'Use e.g. This is fine',
      'Ends with U.S. Government here',
      'Single J. Smith initial',
      '| a. B. | c |',
      '```',
      'Code. Here.',
      '```',
      '1. Item one.',
      'Version 1.2 works.',
      'Done! Next',
    ].join('\n');
    expect(multiSentenceLines(md)).toEqual([5, 15]);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

```bash
pnpm test tests/unit/text.test.ts
```

Expected: FAIL, because `scripts/content/lib/text.ts` does not exist.

- [ ] **Step 3: Implement `scripts/content/lib/text.ts`**

```ts
/**
 * Tokenizing, masking and line checks shared by the fingerprint script and rules R7 and R8.
 * `words`, `stripMarkdown` and `mask` match overlap_check.py, and `multiSentenceLines` matches
 * lint_notes.py, so the site's checks agree with the notes workflow's tools (spec 2.5 and 2.9).
 */

/** Stands in for a masked word, so no shingle that touches it can count as copied. */
export const MASK = '§';
const EM_DASH = '\u2014';
const WORD = /[a-z0-9]+(?:['’][a-z]+)?/g;
const ABBREVIATIONS = ['e.g.', 'i.e.', 'etc.', 'vs.', 'U.S.', 'Inc.', 'Mr.', 'Ms.', 'Dr.', 'No.', 'approx.', 'a.m.', 'p.m.'];
const SENTENCE_BREAK = /(\S+)[.!?]["')\]]*\s+(?=[A-Z0-9"'([])/g;
const LIST_MARKER = /^\s*(?:[-*+]|\d+[.)])\s+/;
const FENCE = /^\s*(`{3,}|~{3,})(.*)$/;
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

export function words(text: string): string[] {
  return text.toLowerCase().match(WORD) ?? [];
}

export function stripMarkdown(text: string): string {
  return text
    .replace(FRONTMATTER, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_`#>|]/g, ' ');
}

/** Turns allow-list lines into word sequences, longest first; comments, blanks and one-word phrases are skipped. */
export function phrasesFrom(lines: readonly string[]): string[][] {
  return lines
    .filter((line) => line.trim() !== '' && !line.startsWith('#'))
    .map(words)
    .filter((phrase) => phrase.length >= 2)
    .sort((a, b) => b.length - a.length);
}

/** Replaces every occurrence of an allowed phrase with MASK tokens, trying the longest phrase first. */
export function mask(tokens: readonly string[], phrases: readonly (readonly string[])[]): string[] {
  const out = [...tokens];
  let i = 0;
  while (i < out.length) {
    for (const phrase of phrases) {
      if (phrase.every((word, k) => out[i + k] === word)) {
        out.fill(MASK, i, i + phrase.length);
        i += phrase.length - 1;
        break;
      }
    }
    i += 1;
  }
  return out;
}

/** True for each line inside a fenced code block, fences included; a fence closes only with at least as many of the same character. */
export function fencedLines(lines: readonly string[]): boolean[] {
  const inside: boolean[] = [];
  let open: string | null = null;
  for (const line of lines) {
    const fence = FENCE.exec(line);
    const marker = fence?.[1] ?? '';
    if (open === null) {
      inside.push(fence !== null);
      if (fence !== null) open = marker;
      continue;
    }
    inside.push(true);
    const closes = fence !== null && marker[0] === open[0] && marker.length >= open.length && (fence[2] ?? '').trim() === '';
    if (closes) open = null;
  }
  return inside;
}

/** 1-based numbers of the lines that contain an em dash. */
export function emDashLines(text: string): number[] {
  return text.split('\n').flatMap((line, i) => (line.includes(EM_DASH) ? [i + 1] : []));
}

/** 1-based numbers of Markdown lines that hold more than one sentence; frontmatter, code blocks and table rows are exempt. */
export function multiSentenceLines(markdown: string): number[] {
  const lines = markdown.split('\n');
  const frontmatter = FRONTMATTER.exec(markdown);
  const start = frontmatter ? frontmatter[0].split('\n').length - 1 : 0;
  const code = fencedLines(lines);
  const bad: number[] = [];
  for (let n = start; n < lines.length; n++) {
    const line = lines[n] ?? '';
    if (code[n] || line.trimStart().startsWith('|')) continue;
    const prose = line
      .replace(LIST_MARKER, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/`[^`]*`/g, '');
    for (const match of prose.matchAll(SENTENCE_BREAK)) {
      const head = match[1] ?? '';
      const word = head + (prose[(match.index ?? 0) + head.length] ?? '');
      if (!ABBREVIATIONS.some((a) => word.endsWith(a)) && !/^[A-Z]$/.test(head)) {
        bad.push(n + 1);
        break;
      }
    }
  }
  return bad;
}
```

The source and the test write the em dash as the escape `'\u2014'`, so no tracked file holds the character itself and R8 stays clean on its own code from Task 8 on.

- [ ] **Step 4: Run the tests to see them pass**

```bash
pnpm test tests/unit/text.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/lib/text.ts tests/unit/text.test.ts
git commit -m "Add the shared text utilities for the content checks" -m "Tokenizing and masking match overlap_check.py and the sentence check matches lint_notes.py, so the site agrees with the notes workflow."
```

---

## Task 3: Fingerprint library

A fingerprint is a one-way set of truncated 6-word shingle hashes (spec 2.5).
Truncating each sha256 to `b` bits, with `b = ceil(log2(n / 0.01))`, keeps each set's false-positive rate `f` between 0.5% and 1%, which is what stops anyone rebuilding the course text from the sets.

**Files:**
- Create: `scripts/content/lib/fingerprint.ts`, `schemas/fingerprint.ts` (the `PackedSet` type is needed now; Task 4 adds the rest of the schemas)
- Test: `tests/unit/fingerprint.test.ts`

- [ ] **Step 1: Write the fingerprint schema**

`schemas/fingerprint.ts`:

```ts
import { z } from 'zod';

const ModuleNumber = z.number().int().min(1).max(13);

/** One truncated-hash shingle set; `f` is its false-positive rate, count / 2^b (spec 2.5). */
export const PackedSet = z.strictObject({
  b: z.number().int().min(1).max(24),
  count: z.number().int().min(0),
  f: z.number().min(0).max(1),
  data: z.string(),
});
export type PackedSet = z.infer<typeof PackedSet>;

/** content/fingerprints/mNN.json: the module's whole text, plus one set per knowledge check and assessment item. */
export const FingerprintFile = z.strictObject({
  module: ModuleNumber,
  text: PackedSet,
  items: z.record(z.string().regex(/^(?:kc|quiz)-\d{2}$/), PackedSet),
});
export type FingerprintFile = z.infer<typeof FingerprintFile>;
```

Task 4 moves `ModuleNumber` into `schemas/common.ts` and imports it here.

- [ ] **Step 2: Write the failing tests**

`tests/unit/fingerprint.test.ts`:

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  bitsFor,
  buildSet,
  hashShingle,
  pack,
  runsAgainst,
  shareAgainst,
  shingleWindows,
  unpack,
} from '../../scripts/content/lib/fingerprint.ts';
import { MASK, words } from '../../scripts/content/lib/text.ts';

const SOURCE = words(
  'Every branch borrows ovens from the shared kitchen whenever the morning queue grows, ' +
    'and bakers hand the proofing cabinets back once the dough has risen so nobody pays for idle shelves at night.',
);

describe('bitsFor', () => {
  it('keeps the false-positive rate above 0.5% and at most 1%', () => {
    for (const n of [1, 2, 7, 100, 1000, 10_485, 20_000]) {
      const rate = n / 2 ** bitsFor(n);
      expect(rate).toBeLessThanOrEqual(0.01);
      expect(rate).toBeGreaterThan(0.005);
    }
  });
});

describe('hashShingle', () => {
  it('always fits in b bits', () => {
    fc.assert(
      fc.property(fc.string(), fc.integer({ min: 1, max: 24 }), (s, b) => {
        const h = hashShingle(s, b);
        return Number.isInteger(h) && h >= 0 && h < 2 ** b;
      }),
    );
  });
});

describe('pack and unpack', () => {
  it('round-trip any set of 20-bit values', () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 0, max: 2 ** 20 - 1 })), (values) => {
        const set = unpack(pack(new Set(values), 20));
        return set.values.size === values.length && values.every((v) => set.values.has(v));
      }),
    );
  });
});

describe('shingleWindows', () => {
  it('yields one shingle per position and null where a masked word sits', () => {
    expect(shingleWindows(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual(['a b c d e f', 'b c d e f g']);
    expect(shingleWindows(['a', 'b', 'c', 'd', 'e', 'f', MASK])).toEqual(['a b c d e f', null]);
  });
});

describe('buildSet', () => {
  it('stores every distinct shingle with a rate in range', () => {
    const set = buildSet(SOURCE);
    expect(set.f).toBeGreaterThan(0.004);
    expect(set.f).toBeLessThanOrEqual(0.01);
    expect(set.count).toBeLessThanOrEqual(SOURCE.length - 5);
  });
});

describe('runsAgainst', () => {
  const set = unpack(buildSet(SOURCE));

  it('reports a copied run of 9 or more words as the words it covers', () => {
    const copied = SOURCE.slice(3, 15);
    const tokens = [...words('our own opening words here'), ...copied, ...words('and our own closing words')];
    expect(runsAgainst(tokens, set)).toEqual([copied.join(' ')]);
  });

  it('ignores a copied run of 8 words', () => {
    const tokens = [...words('our own opening words here'), ...SOURCE.slice(3, 11), ...words('and our own closing words')];
    expect(runsAgainst(tokens, set)).toEqual([]);
  });
});

describe('shareAgainst', () => {
  const set = unpack(buildSet(SOURCE));

  it('is about 1 for a full copy and near 0 for unrelated text', () => {
    expect(shareAgainst(SOURCE, [set]).share).toBeGreaterThan(0.95);
    const unrelated = words('Cloud storage keeps receipts safe for seven years while the shop sleeps and the till rests quietly');
    // A single false-positive hit among 13 shingles would read about 7%, so the bound allows one.
    expect(shareAgainst(unrelated, [set]).share).toBeLessThan(0.1);
  });

  it('skips masked shingles', () => {
    const tokens = [...SOURCE.slice(0, 6), MASK];
    expect(shareAgainst(tokens, [set]).shingles).toBe(1);
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

```bash
pnpm test tests/unit/fingerprint.test.ts
```

Expected: FAIL, because `scripts/content/lib/fingerprint.ts` does not exist.

- [ ] **Step 4: Implement `scripts/content/lib/fingerprint.ts`**

```ts
import { createHash } from 'node:crypto';
import type { PackedSet } from '../../../schemas/fingerprint.ts';
import { MASK } from './text.ts';

export const SHINGLE = 6;
/** A 9-word copied run contains exactly 4 overlapping 6-word shingles (spec 2.5). */
export const RUN_SHINGLES = 4;
const TARGET_RATE = 0.01;

export interface HashSet {
  b: number;
  f: number;
  values: ReadonlySet<number>;
}

export interface Share {
  shingles: number;
  hits: number;
  share: number;
}

/** Bits per hash for a set of n shingles: the smallest b with n / 2^b at most 1%. */
export function bitsFor(n: number): number {
  return n <= 0 ? 1 : Math.ceil(Math.log2(n / TARGET_RATE));
}

/** The first b bits of the shingle's sha256. */
export function hashShingle(shingle: string, b: number): number {
  return createHash('sha256').update(shingle, 'utf8').digest().readUInt32BE(0) >>> (32 - b);
}

/** The shingle that starts at each position, or null where it touches a masked word. */
export function shingleWindows(tokens: readonly string[]): (string | null)[] {
  const out: (string | null)[] = [];
  for (let i = 0; i + SHINGLE <= tokens.length; i++) {
    const window = tokens.slice(i, i + SHINGLE);
    out.push(window.includes(MASK) ? null : window.join(' '));
  }
  return out;
}

/** Packs sorted values as 3-byte big-endian integers in base64. */
export function pack(values: ReadonlySet<number>, b: number): PackedSet {
  const sorted = [...values].sort((x, y) => x - y);
  const buf = Buffer.alloc(sorted.length * 3);
  for (let i = 0; i < sorted.length; i++) buf.writeUIntBE(sorted[i] ?? 0, i * 3, 3);
  return { b, count: sorted.length, f: sorted.length / 2 ** b, data: buf.toString('base64') };
}

export function unpack(set: PackedSet): HashSet {
  const buf = Buffer.from(set.data, 'base64');
  if (buf.length !== set.count * 3) throw new Error(`packed set holds ${buf.length / 3} values, not ${set.count}`);
  const values = new Set<number>();
  for (let i = 0; i < buf.length; i += 3) values.add(buf.readUIntBE(i, 3));
  return { b: set.b, f: set.f, values };
}

/** Hashes every distinct shingle of the tokens into one set. */
export function buildSet(tokens: readonly string[]): PackedSet {
  const distinct = new Set(shingleWindows(tokens).filter((s): s is string => s !== null));
  const b = bitsFor(distinct.size);
  if (b > 24) throw new Error(`${distinct.size} shingles need ${b} bits, but sets pack 24`);
  return pack(new Set([...distinct].map((s) => hashShingle(s, b))), b);
}

/** Runs of 4 or more consecutive hit shingles, returned as the words they cover. */
export function runsAgainst(tokens: readonly string[], set: HashSet): string[] {
  const hit = shingleWindows(tokens).map((w) => w !== null && set.values.has(hashShingle(w, set.b)));
  const runs: string[] = [];
  let i = 0;
  while (i < hit.length) {
    if (!hit[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < hit.length && hit[j]) j++;
    if (j - i >= RUN_SHINGLES) runs.push(tokens.slice(i, j - 1 + SHINGLE).join(' '));
    i = j;
  }
  return runs;
}

/** Share of unmasked shingles found in any of the sets, corrected for false positives: (hits / n - f) / (1 - f). */
export function shareAgainst(tokens: readonly string[], sets: readonly HashSet[]): Share {
  const windows = shingleWindows(tokens).filter((w): w is string => w !== null);
  const f = 1 - sets.reduce((keep, s) => keep * (1 - s.f), 1);
  const hits = windows.filter((w) => sets.some((s) => s.values.has(hashShingle(w, s.b)))).length;
  const raw = windows.length === 0 ? 0 : hits / windows.length;
  return { shingles: windows.length, hits, share: Math.max(0, (raw - f) / (1 - f)) };
}
```

- [ ] **Step 5: Run the tests to see them pass**

```bash
pnpm test tests/unit/fingerprint.test.ts
```

Expected: PASS, 9 tests.
If the 8-word test reports a run, a false positive at a boundary is extending the copy: confirm by printing `shingleWindows` hits, then change the opening or closing words of the test text, never the rule.

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add schemas/fingerprint.ts scripts/content/lib/fingerprint.ts tests/unit/fingerprint.test.ts
git commit -m "Add one-way shingle fingerprints" -m "Truncated sha256 shingle sets with a 0.5% to 1% false-positive rate, plus run detection and a false-positive-corrected share (spec 2.5)."
```

---

## Task 4: Content schemas

**Files:**
- Create: `schemas/common.ts`, `schemas/note.ts`, `schemas/concept.ts`, `schemas/blueprint.ts`, `schemas/mission.ts`, `schemas/validate-config.ts`
- Modify: `schemas/fingerprint.ts` (import `ModuleNumber` from `common.ts`)
- Test: `tests/unit/schemas.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/schemas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Blueprint } from '../../schemas/blueprint.ts';
import { TASK_IDS } from '../../schemas/common.ts';
import { Concept } from '../../schemas/concept.ts';
import { MissionFrontmatter } from '../../schemas/mission.ts';
import { LessonFrontmatter } from '../../schemas/note.ts';
import { ValidateConfig } from '../../schemas/validate-config.ts';

const GUIDE_URL = 'https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html';
const DOMAINS = ['Cloud Concepts', 'Security and Compliance', 'Cloud Technology and Services', 'Billing, Pricing, and Support'];

function blueprint(weights = [24, 30, 34, 12], taskIds: readonly string[] = TASK_IDS) {
  return {
    exam: 'CLF-C02',
    guide: { url: GUIDE_URL, verified_on: '2026-10-09' },
    domains: DOMAINS.map((name, i) => ({ id: String(i + 1), name, weight: weights[i], url: GUIDE_URL, verified_on: '2026-10-09' })),
    tasks: taskIds.map((id) => ({
      id,
      text: `Fixture task ${id} statement`,
      terms: ['AWS Lambda', { term: 'AWS VPN', coveredBy: 'aws-site-to-site-vpn' }],
      url: GUIDE_URL,
      verified_on: '2026-10-09',
    })),
  };
}

const messages = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  (result.error?.issues ?? []).map((i) => `${i.path.map(String).join('.')}: ${i.message}`);

describe('Concept', () => {
  const valid = { id: 'aws-lambda', name: 'AWS Lambda', home: 'm03/aws-lambda', anchor: 'how-lambda-works', tasks: ['3.3'] };

  it('accepts a complete entry and an untested one without tasks', () => {
    expect(Concept.safeParse(valid).success).toBe(true);
    expect(Concept.safeParse({ ...valid, tasks: [], tested: false }).success).toBe(true);
  });

  it('rejects a seeded entry until its anchor and tasks are filled', () => {
    const seeded = Concept.safeParse({ id: 'aws-lambda', name: 'Aws lambda', home: 'm03/aws-lambda', anchor: '' });
    expect(messages(seeded).map((m) => m.split(':')[0])).toEqual(['anchor', 'tasks']);
  });

  it('rejects a tested concept with no task and more than 3 confusables', () => {
    expect(messages(Concept.safeParse({ ...valid, tasks: [] }))).toEqual(['tasks: a tested concept needs at least one task']);
    expect(Concept.safeParse({ ...valid, confusableWith: ['a', 'b', 'c', 'd'] }).success).toBe(false);
  });
});

describe('Blueprint', () => {
  it('accepts 4 domains summing to 100 and all 19 tasks', () => {
    expect(Blueprint.safeParse(blueprint()).success).toBe(true);
  });

  it('rejects weights that do not sum to 100', () => {
    expect(messages(Blueprint.safeParse(blueprint([25, 30, 34, 12])))).toEqual(['domains: domain weights sum to 101, not 100']);
  });

  it('rejects a repeated task that hides a missing one', () => {
    const ids = [...TASK_IDS.slice(0, 18), '1.1'];
    expect(messages(Blueprint.safeParse(blueprint(undefined, ids)))).toEqual(['tasks: task 4.3 is missing']);
  });
});

describe('MissionFrontmatter', () => {
  const gate = {
    id: 'mission-00',
    title: 'Guardrails',
    modules: [9, 11],
    services: ['AWS Budgets'],
    expectedCredits: '$0',
    gate: true,
    keep: false,
    canUseCredits: [],
    leftovers: [],
    sources: [{ url: GUIDE_URL, verified_on: '2026-10-09' }],
  };

  it('accepts a gate mission without maxLiveHours', () => {
    expect(MissionFrontmatter.safeParse(gate).success).toBe(true);
  });

  it('requires maxLiveHours only for missions that are cleaned up', () => {
    expect(messages(MissionFrontmatter.safeParse({ ...gate, gate: false }))).toEqual([
      'maxLiveHours: a mission that is cleaned up needs maxLiveHours',
    ]);
    expect(MissionFrontmatter.safeParse({ ...gate, gate: false, keep: true, maxLiveHours: 2 }).success).toBe(false);
  });

  it('rejects a plain-http source', () => {
    expect(MissionFrontmatter.safeParse({ ...gate, sources: [{ url: 'http://aws.amazon.com/', verified_on: '2026-10-09' }] }).success).toBe(false);
  });
});

describe('LessonFrontmatter and ValidateConfig', () => {
  it('rejects unknown keys and unknown rules', () => {
    const lesson = { module: 1, lesson: 2, slug: 'x', title: 'X', source: 'S', concepts: ['x'] };
    expect(LessonFrontmatter.safeParse(lesson).success).toBe(true);
    expect(LessonFrontmatter.safeParse({ ...lesson, covers: [] }).success).toBe(false);
    expect(ValidateConfig.safeParse({ rules: ['R1', 'R14'], practicePerConcept: 0, examQuotas: false, blueprintTerms: false }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

```bash
pnpm test tests/unit/schemas.test.ts
```

Expected: FAIL, because the schema modules do not exist.

- [ ] **Step 3: Write `schemas/common.ts`**

```ts
import { z } from 'zod';

/** Shared building blocks for the content schemas (spec 2). */
export const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case');
export const ConceptId = Slug;
export const NoteId = z.string().regex(/^m(?:0[1-9]|1[0-3])\/[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must look like m03/aws-lambda');
export const ModuleNumber = z.number().int().min(1).max(13);
export const IsoDate = z.iso.date();
export const HttpsUrl = z.url({ protocol: /^https$/ });

export const TASK_IDS = [
  '1.1', '1.2', '1.3', '1.4',
  '2.1', '2.2', '2.3', '2.4',
  '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8',
  '4.1', '4.2', '4.3',
] as const;
export const TaskId = z.enum(TASK_IDS);
export type TaskId = z.infer<typeof TaskId>;
```

- [ ] **Step 4: Write `schemas/note.ts`**

```ts
import { z } from 'zod';
import { ConceptId, ModuleNumber, Slug } from './common.ts';

/** Lesson note frontmatter, as resources/README.md defines it. */
export const LessonFrontmatter = z.strictObject({
  module: ModuleNumber,
  lesson: z.number().int().min(1),
  slug: Slug,
  title: z.string().min(1),
  source: z.string().min(1),
  concepts: z.array(ConceptId).min(1),
});
export type LessonFrontmatter = z.infer<typeof LessonFrontmatter>;

/** Module README frontmatter, as resources/README.md defines it. */
export const ModuleFrontmatter = z.strictObject({
  module: ModuleNumber,
  slug: Slug,
  title: z.string().min(1),
  source: z.string().min(1),
  lessons: z.number().int().min(1),
  assessment_questions: z.number().int().min(0),
});
export type ModuleFrontmatter = z.infer<typeof ModuleFrontmatter>;
```

- [ ] **Step 5: Write `schemas/concept.ts`**

```ts
import { z } from 'zod';
import { ConceptId, NoteId, Slug, TaskId } from './common.ts';

/** One entry of content/concepts.yaml, the one concept registry (spec 2.4). */
export const Concept = z
  .strictObject({
    id: ConceptId,
    name: z.string().min(1),
    home: NoteId,
    anchor: Slug,
    tasks: z.array(TaskId),
    tested: z.boolean().optional(),
    confusableWith: z.array(ConceptId).max(3).optional(),
    aliases: z.array(ConceptId).optional(),
    splitFrom: ConceptId.optional(),
  })
  .refine((c) => c.tested === false || c.tasks.length > 0, {
    message: 'a tested concept needs at least one task',
    path: ['tasks'],
  });
export type Concept = z.infer<typeof Concept>;
```

- [ ] **Step 6: Write `schemas/blueprint.ts`**

```ts
import { z } from 'zod';
import { ConceptId, HttpsUrl, IsoDate, TASK_IDS, TaskId } from './common.ts';

const Term = z.union([z.string().min(2), z.strictObject({ term: z.string().min(2), coveredBy: ConceptId })]);
export type BlueprintTerm = z.infer<typeof Term>;

/** content/exam/blueprint.yaml: the CLF-C02 domains and task statements, with the terms each task names (spec 2.3). */
export const Blueprint = z
  .strictObject({
    exam: z.literal('CLF-C02'),
    guide: z.strictObject({ url: HttpsUrl, verified_on: IsoDate }),
    domains: z
      .array(
        z.strictObject({
          id: z.enum(['1', '2', '3', '4']),
          name: z.string().min(1),
          weight: z.number().int().min(1).max(100),
          url: HttpsUrl,
          verified_on: IsoDate,
        }),
      )
      .length(4),
    tasks: z
      .array(
        z.strictObject({ id: TaskId, text: z.string().min(10), terms: z.array(Term), url: HttpsUrl, verified_on: IsoDate }),
      )
      .length(19),
  })
  .superRefine((b, ctx) => {
    const sum = b.domains.reduce((total, d) => total + d.weight, 0);
    if (sum !== 100) ctx.addIssue({ code: 'custom', path: ['domains'], message: `domain weights sum to ${sum}, not 100` });
    const ids = new Set(b.tasks.map((t) => t.id));
    for (const id of TASK_IDS) {
      if (!ids.has(id)) ctx.addIssue({ code: 'custom', path: ['tasks'], message: `task ${id} is missing` });
    }
  });
export type Blueprint = z.infer<typeof Blueprint>;
```

- [ ] **Step 7: Write `schemas/mission.ts`**

```ts
import { z } from 'zod';
import { HttpsUrl, IsoDate, ModuleNumber } from './common.ts';

/** Frontmatter of content/missions/mission-NN-slug.md (spec 5.3). */
export const MissionFrontmatter = z
  .strictObject({
    id: z.string().regex(/^mission-\d{2}$/),
    title: z.string().min(1),
    modules: z.array(ModuleNumber).min(1),
    services: z.array(z.string().min(1)).min(1),
    expectedCredits: z.string().min(1),
    gate: z.boolean().optional(),
    keep: z.boolean(),
    maxLiveHours: z.number().positive().optional(),
    canUseCredits: z.array(z.string().min(1)),
    leftovers: z.array(z.string().min(1)),
    sources: z.array(z.strictObject({ url: HttpsUrl, verified_on: IsoDate })).min(1),
  })
  .superRefine((m, ctx) => {
    const cleanedUp = !m.keep && m.gate !== true;
    if (cleanedUp && m.maxLiveHours === undefined) {
      ctx.addIssue({ code: 'custom', path: ['maxLiveHours'], message: 'a mission that is cleaned up needs maxLiveHours' });
    }
    if (!cleanedUp && m.maxLiveHours !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['maxLiveHours'], message: 'kept and gate missions have no maxLiveHours' });
    }
  });
export type MissionFrontmatter = z.infer<typeof MissionFrontmatter>;
```

- [ ] **Step 8: Write `schemas/validate-config.ts`**

```ts
import { z } from 'zod';

export const RULE_IDS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13'] as const;
export const RuleId = z.enum(RULE_IDS);
export type RuleId = z.infer<typeof RuleId>;

/** content/validate.yaml: the active validator rules and the R10 switches, raised phase by phase (spec 2.9). */
export const ValidateConfig = z.strictObject({
  rules: z.array(RuleId).min(1),
  practicePerConcept: z.union([z.literal(0), z.literal(2), z.literal(3)]),
  examQuotas: z.boolean(),
  blueprintTerms: z.boolean(),
});
export type ValidateConfig = z.infer<typeof ValidateConfig>;
```

- [ ] **Step 9: Point `schemas/fingerprint.ts` at the shared `ModuleNumber`**

Replace the line `const ModuleNumber = z.number().int().min(1).max(13);` with an import, so the file starts:

```ts
import { z } from 'zod';
import { ModuleNumber } from './common.ts';
```

- [ ] **Step 10: Run the tests to see them pass**

```bash
pnpm test tests/unit/schemas.test.ts tests/unit/fingerprint.test.ts
```

Expected: PASS.
If zod reports an issue in a different order or wording than a test expects, check the zod 4 behaviour in `node_modules/zod` before changing the test, and keep the test's intent (which field fails, and why).

- [ ] **Step 11: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add schemas tests/unit/schemas.test.ts
git commit -m "Add zod schemas for every content file" -m "Notes, concepts, blueprint, missions, validator switches and fingerprints, each strict so unknown keys fail."
```

---

## Task 5: Source splitting and the committed fingerprints

**Files:**
- Create: `scripts/content/lib/source.ts`, `scripts/content/lib/fingerprint-files.ts`, `scripts/content/fingerprint.ts`, `tests/fixtures/source/module-01.md`
- Create (generated): `content/fingerprints/m01.json` to `m13.json`, `content/fingerprints/allow.txt`
- Test: `tests/unit/source.test.ts`, `tests/unit/fingerprints-committed.test.ts`

- [ ] **Step 1: Write the made-up source fixture**

`tests/fixtures/source/module-01.md` imitates the format of `render_source.py` with invented bakery text, so tests never need the course:

```markdown
# Module 1: Baking Basics


## SECTION: Getting Started


### LESSON 1: What a Bakery Cloud Is (blocks)

[TEXT]
A bakery cloud lets every branch borrow ovens from a shared kitchen whenever the morning queue grows longer than usual.
Bakers rent proofing cabinets by the minute and hand them back once the dough has risen.

[KNOWLEDGE CHECK (multiple choice)]
Which feature lets a branch borrow ovens only during the busy morning hours?
- (CORRECT) Renting ovens from the shared kitchen by the minute
- (wrong) Buying a second oven for every branch

### LESSON 2: Assessment (quiz)

[ASSESSMENT Q1 (MULTIPLE_CHOICE)]
A branch wants to stop paying for proofing cabinets that sit empty overnight.
What should the branch do?
- (CORRECT) Hand the cabinets back after the dough rises
- (wrong) Sign a ten year cabinet lease
```

- [ ] **Step 2: Write the failing tests**

`tests/unit/source.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runsAgainst, unpack } from '../../scripts/content/lib/fingerprint.ts';
import { allowFile, fingerprintModule } from '../../scripts/content/lib/fingerprint-files.ts';
import { sourceTitles, splitItems } from '../../scripts/content/lib/source.ts';
import { words } from '../../scripts/content/lib/text.ts';
import { FingerprintFile } from '../../schemas/fingerprint.ts';

const source = readFileSync(fileURLToPath(new URL('../fixtures/source/module-01.md', import.meta.url)), 'utf8');

describe('splitItems', () => {
  it('cuts each knowledge check and assessment item at the next block or heading', () => {
    const items = splitItems(source);
    expect(items.map((i) => i.id)).toEqual(['kc-01', 'quiz-01']);
    expect(items[0]?.text).toBe(
      [
        'Which feature lets a branch borrow ovens only during the busy morning hours?',
        '- (CORRECT) Renting ovens from the shared kitchen by the minute',
        '- (wrong) Buying a second oven for every branch',
      ].join('\n'),
    );
    expect(items[1]?.text).toContain('Sign a ten year cabinet lease');
    expect(items[1]?.text).not.toContain('ASSESSMENT');
  });
});

describe('sourceTitles', () => {
  it('lists lesson titles, then the module title in full and without its prefix', () => {
    expect(sourceTitles(source)).toEqual(['What a Bakery Cloud Is', 'Assessment', 'Module 1: Baking Basics', 'Baking Basics']);
  });
});

describe('fingerprintModule', () => {
  it('fingerprints the whole text and each item, and finds a copied run', () => {
    const file = fingerprintModule(1, source);
    expect(FingerprintFile.parse(file)).toEqual(file);
    expect(Object.keys(file.items)).toEqual(['kc-01', 'quiz-01']);
    const copied = words('Bakers rent proofing cabinets by the minute and hand them back once the dough has risen');
    expect(runsAgainst(copied, unpack(file.text))).toHaveLength(1);
  });
});

describe('allowFile', () => {
  it('writes a generated header, the titles, then the pipeline phrases', () => {
    expect(allowFile([source], '# comment\nOperational excellence, security\n').split('\n')).toEqual([
      '# Generated by pnpm content:fingerprint from the course source; do not edit.',
      'What a Bakery Cloud Is',
      'Assessment',
      'Module 1: Baking Basics',
      'Baking Basics',
      'Operational excellence, security',
      '',
    ]);
  });
});
```

- [ ] **Step 3: Run the tests to see them fail**

```bash
pnpm test tests/unit/source.test.ts
```

Expected: FAIL, because `scripts/content/lib/source.ts` does not exist.

- [ ] **Step 4: Implement `scripts/content/lib/source.ts`**

```ts
/** Reads the course source text format that render_source.py writes outside the repo. */

const BLOCK_START =
  /^(?:\[(?:TEXT|INTERACTIVE|HEADING|SUBHEADING|ASSESSMENT Q\d+|KNOWLEDGE CHECK|IMAGE|VIDEO|TRANSCRIPT|CALLOUT|TABLE|NOTE|LIST|BUTTON)\b|#{1,3} )/;
const KNOWLEDGE_CHECK = /^\[KNOWLEDGE CHECK\b/;
const ASSESSMENT = /^\[ASSESSMENT Q(\d+)\b/;

export interface SourceItem {
  id: string;
  text: string;
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Knowledge checks (kc-01, kc-02, ...) and assessment items (quiz-NN, by question number), each cut at the next block or heading. */
export function splitItems(source: string): SourceItem[] {
  const items: SourceItem[] = [];
  let id: string | null = null;
  let lines: string[] = [];
  let checks = 0;
  const flush = (): void => {
    if (id !== null) items.push({ id, text: lines.join('\n').trim() });
    id = null;
    lines = [];
  };
  for (const line of source.split('\n')) {
    const quiz = ASSESSMENT.exec(line);
    if (KNOWLEDGE_CHECK.test(line)) {
      flush();
      checks += 1;
      id = `kc-${pad2(checks)}`;
    } else if (quiz) {
      flush();
      id = `quiz-${pad2(Number(quiz[1]))}`;
    } else if (BLOCK_START.test(line)) {
      flush();
    } else if (id !== null) {
      lines.push(line);
    }
  }
  flush();
  return items;
}

/** Lesson titles, then each module title in full and without its "Module N: " prefix, as overlap_check.py masks them. */
export function sourceTitles(source: string): string[] {
  const lessons = [...source.matchAll(/^### LESSON \d+: (.+) \((?:blocks|quiz)\)$/gm)].map((m) => m[1] ?? '');
  const modules = [...source.matchAll(/^# (Module \d+: (.+))$/gm)].flatMap((m) => [m[1] ?? '', m[2] ?? '']);
  return [...lessons, ...modules].filter((title) => title !== '');
}
```

- [ ] **Step 5: Implement `scripts/content/lib/fingerprint-files.ts`**

```ts
import type { FingerprintFile, PackedSet } from '../../../schemas/fingerprint.ts';
import { buildSet } from './fingerprint.ts';
import { sourceTitles, splitItems } from './source.ts';
import { words } from './text.ts';

/** One module's fingerprint file: the whole source text, plus one set per knowledge check and assessment item. */
export function fingerprintModule(module: number, source: string): FingerprintFile {
  const items: Record<string, PackedSet> = {};
  for (const item of splitItems(source)) items[item.id] = buildSet(words(item.text));
  return { module, text: buildSet(words(source)), items };
}

/** The text of content/fingerprints/allow.txt: every title from the sources, then the official phrases of pipeline/allow.txt. */
export function allowFile(sources: readonly string[], pipelineAllow: string): string {
  const titles = [...new Set(sources.flatMap(sourceTitles))];
  const phrases = pipelineAllow.split('\n').filter((line) => line.trim() !== '' && !line.startsWith('#'));
  return ['# Generated by pnpm content:fingerprint from the course source; do not edit.', ...titles, ...phrases, ''].join('\n');
}
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
pnpm test tests/unit/source.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 7: Write the command `scripts/content/fingerprint.ts`**

```ts
/** pnpm content:fingerprint: writes content/fingerprints/ from the course source outside the repo (spec 2.5). */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { allowFile, fingerprintModule } from './lib/fingerprint-files.ts';

const home = process.env.CCP_STUDY_HOME ?? join(homedir(), 'Library', 'Application Support', 'ccp-study');
const outDir = resolve(import.meta.dirname, '..', '..', 'content', 'fingerprints');
mkdirSync(outDir, { recursive: true });

const sources: string[] = [];
let checks = 0;
let quizzes = 0;
for (let module = 1; module <= 13; module++) {
  const nn = String(module).padStart(2, '0');
  const source = readFileSync(join(home, 'source', `module-${nn}.md`), 'utf8');
  const file = fingerprintModule(module, source);
  const ids = Object.keys(file.items);
  const kc = ids.filter((id) => id.startsWith('kc-')).length;
  checks += kc;
  quizzes += ids.length - kc;
  writeFileSync(join(outDir, `m${nn}.json`), `${JSON.stringify(file)}\n`);
  console.log(
    `m${nn}: ${file.text.count} shingles at ${file.text.b} bits (f ${file.text.f.toFixed(4)}), ${kc} knowledge checks, ${ids.length - kc} assessment items`,
  );
  sources.push(source);
}
writeFileSync(join(outDir, 'allow.txt'), allowFile(sources, readFileSync(join(home, 'pipeline', 'allow.txt'), 'utf8')));
console.log(`total: ${checks} knowledge checks, ${quizzes} assessment items`);
```

The script reads course data and writes only under `content/fingerprints/`, by construction.

- [ ] **Step 8: Generate the fingerprints**

```bash
pnpm content:fingerprint && du -sh content/fingerprints
```

Expected: 13 module lines, each with `f` between 0.0050 and 0.0100, then `total: 119 knowledge checks, 133 assessment items`, and a folder of about 0.6 to 0.8 MB.
If the totals differ, compare `grep -c '^\[KNOWLEDGE CHECK' source/module-NN.md` per module with the script's per-module counts before going on.

- [ ] **Step 9: Write the committed-files test**

`tests/unit/fingerprints-committed.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { unpack } from '../../scripts/content/lib/fingerprint.ts';
import { FingerprintFile } from '../../schemas/fingerprint.ts';

const dir = fileURLToPath(new URL('../../content/fingerprints/', import.meta.url));
const load = (m: number) =>
  FingerprintFile.parse(JSON.parse(readFileSync(join(dir, `m${String(m).padStart(2, '0')}.json`), 'utf8')));
const MODULES = Array.from({ length: 13 }, (_, i) => i + 1);

describe('committed fingerprints', () => {
  it.each(MODULES)('module %i keeps every set at 0.4% <= f <= 1%', (m) => {
    const file = load(m);
    expect(file.module).toBe(m);
    for (const set of [file.text, ...Object.values(file.items)]) {
      expect(set.f).toBeGreaterThanOrEqual(0.004);
      expect(set.f).toBeLessThanOrEqual(0.01);
      expect(unpack(set).values.size).toBe(set.count);
    }
  });

  it('cover 119 knowledge checks and 133 assessment items', () => {
    const ids = MODULES.flatMap((m) => Object.keys(load(m).items));
    expect(ids.filter((id) => id.startsWith('kc-'))).toHaveLength(119);
    expect(ids.filter((id) => id.startsWith('quiz-'))).toHaveLength(133);
  });

  it('ship an allow list that starts with the generated header', () => {
    const allow = readFileSync(join(dir, 'allow.txt'), 'utf8');
    expect(allow.startsWith('# Generated by pnpm content:fingerprint')).toBe(true);
    expect(allow).toContain('Module 11: Pricing and Support');
  });
});
```

- [ ] **Step 10: Run the tests to see them pass**

```bash
pnpm test tests/unit/fingerprints-committed.test.ts
```

Expected: PASS, 15 tests.

- [ ] **Step 11: Confirm no course text was committed by accident**

```bash
grep -c "" content/fingerprints/allow.txt && head -5 content/fingerprints/allow.txt
```

Expected: the header line, then titles and official phrases only, one per line, and no sentence of course prose.

- [ ] **Step 12: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/lib/source.ts scripts/content/lib/fingerprint-files.ts scripts/content/fingerprint.ts tests/fixtures/source tests/unit/source.test.ts tests/unit/fingerprints-committed.test.ts content/fingerprints
git commit -m "Add the course fingerprints" -m "One-way truncated shingle hashes for all 13 modules, 119 knowledge checks and 133 assessment items, plus the title allow list, so originality checks run without the course text."
```

---

## Task 6: Markdown helpers, the content loader and the fixture tree

**Files:**
- Create: `scripts/content/lib/markdown.ts`, `scripts/content/lib/update-line.ts`, `scripts/content/lib/context.ts`, `tests/fixtures/content-root.ts`, and the fixture tree under `tests/fixtures/content-root/`
- Test: `tests/unit/markdown.test.ts`, `tests/unit/context.test.ts`

- [ ] **Step 1: Write the failing Markdown tests**

`tests/unit/markdown.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { headingsOf, notesAnchors, slugify, splitFrontmatter } from '../../scripts/content/lib/markdown.ts';
import { parseUpdateLine } from '../../scripts/content/lib/update-line.ts';

describe('splitFrontmatter', () => {
  it('returns the YAML, the body and the body start line', () => {
    expect(splitFrontmatter('---\na: 1\n---\n# T\n')).toEqual({ yaml: 'a: 1', body: '# T\n', bodyLine: 4 });
    expect(splitFrontmatter('# T\n')).toEqual({ yaml: null, body: '# T\n', bodyLine: 1 });
  });
});

describe('slugify', () => {
  it('keeps letters, digits, spaces and hyphens', () => {
    expect(slugify('From Amazon.com to AWS')).toBe('from-amazoncom-to-aws');
    expect(slugify('  Plan  comparison ')).toBe('plan-comparison');
    expect(slugify('Amazon EC2 **Auto** Scaling')).toBe('amazon-ec2-auto-scaling');
  });
});

describe('headingsOf and notesAnchors', () => {
  const body = ['# Title', '## Objectives', '### Not an anchor', '## Notes', '### First topic', '```', '### Inside code', '```', '### Second topic', '## Terms'].join('\n');

  it('lists H2 and H3 outside code with file line numbers', () => {
    const headings = headingsOf(body, 10);
    expect(headings.map((h) => [h.depth, h.slug, h.line])).toEqual([
      [2, 'objectives', 11],
      [3, 'not-an-anchor', 12],
      [2, 'notes', 13],
      [3, 'first-topic', 14],
      [3, 'second-topic', 18],
      [2, 'terms', 19],
    ]);
  });

  it('takes anchors only from H3s under ## Notes', () => {
    expect(notesAnchors(headingsOf(body, 1))).toEqual(['first-topic', 'second-topic']);
  });
});

describe('parseUpdateLine', () => {
  it('reads the date, source and sentence, and rejects other shapes', () => {
    const line =
      '- **Exam guide update** (verified_on 2026-10-09, [CLF-C02 Domain 4](https://docs.aws.amazon.com/x.html)): The guide names four plans.';
    expect(parseUpdateLine(line)).toEqual({
      verifiedOn: '2026-10-09',
      title: 'CLF-C02 Domain 4',
      url: 'https://docs.aws.amazon.com/x.html',
      sentence: 'The guide names four plans.',
    });
    expect(parseUpdateLine('- **Exam guide update**: missing the date')).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

```bash
pnpm test tests/unit/markdown.test.ts
```

Expected: FAIL, because the modules do not exist.

- [ ] **Step 3: Implement `scripts/content/lib/markdown.ts`**

```ts
import { fencedLines } from './text.ts';

export interface Heading {
  depth: 2 | 3;
  text: string;
  slug: string;
  line: number;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n/;
const HEADING = /^(#{2,3}) (.+?)\s*$/;

/** Splits YAML frontmatter from the body; bodyLine is the 1-based file line where the body starts. */
export function splitFrontmatter(text: string): { yaml: string | null; body: string; bodyLine: number } {
  const match = FRONTMATTER.exec(text);
  if (!match) return { yaml: null, body: text, bodyLine: 1 };
  return { yaml: match[1] ?? '', body: text.slice(match[0].length), bodyLine: match[0].split('\n').length };
}

/** The anchor slug of a heading: lowercased, only letters, digits, spaces and hyphens kept, spaces turned into hyphens. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** H2 and H3 headings outside code blocks, with 1-based line numbers in the whole file. */
export function headingsOf(body: string, bodyLine: number): Heading[] {
  const lines = body.split('\n');
  const code = fencedLines(lines);
  const out: Heading[] = [];
  for (const [i, line] of lines.entries()) {
    const match = code[i] ? null : HEADING.exec(line);
    if (!match) continue;
    const text = (match[2] ?? '').replace(/[*`]/g, '');
    out.push({ depth: match[1] === '##' ? 2 : 3, text, slug: slugify(text), line: bodyLine + i });
  }
  return out;
}

/** Slugs of the H3 headings under "## Notes", the only places a concept anchor may point (spec 2.4). */
export function notesAnchors(headings: readonly Heading[]): string[] {
  const out: string[] = [];
  let inNotes = false;
  for (const heading of headings) {
    if (heading.depth === 2) inNotes = heading.text === 'Notes';
    else if (inNotes) out.push(heading.slug);
  }
  return out;
}
```

- [ ] **Step 4: Implement `scripts/content/lib/update-line.ts`**

```ts
/** "Exam guide update" lines: the one sourced exception to course-only notes (spec 2.3). */
export const UPDATE_PREFIX = '- **Exam guide update**';
const UPDATE_LINE =
  /^- \*\*Exam guide update\*\* \(verified_on (\d{4}-\d{2}-\d{2}), \[([^\]]+)\]\((https:\/\/[^)\s]+)\)\): (\S.*)$/;

export interface UpdateLine {
  verifiedOn: string;
  title: string;
  url: string;
  sentence: string;
}

export function parseUpdateLine(line: string): UpdateLine | null {
  const match = UPDATE_LINE.exec(line.trim());
  if (!match) return null;
  return { verifiedOn: match[1] ?? '', title: match[2] ?? '', url: match[3] ?? '', sentence: match[4] ?? '' };
}
```

- [ ] **Step 5: Run the Markdown tests to see them pass**

```bash
pnpm test tests/unit/markdown.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 6: Write the fixture tree**

Every file below is made-up content in the real formats; together they pass every rule.

`tests/fixtures/content-root/content/validate.yaml`:

```yaml
# Fixture switches: the Phase 0 rules.
rules: [R1, R2, R6, R7, R8, R13]
practicePerConcept: 0
examQuotas: false
blueprintTerms: false
```

`tests/fixtures/content-root/content/concepts.yaml`:

```yaml
# Fixture registry for the content-check tests.
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
  confusableWith: [shared-kitchen]
```

`tests/fixtures/content-root/content/exam/blueprint.yaml` (19 tasks with placeholder statements, all dated inside the 180-day window of the tests' fixed date, 2026-10-10):

```yaml
# Fixture blueprint for the content-check tests.
exam: CLF-C02
guide: { url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html", verified_on: "2026-10-01" }
domains:
  - { id: "1", name: Cloud Concepts, weight: 24, url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html", verified_on: "2026-10-01" }
  - { id: "2", name: Security and Compliance, weight: 30, url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html", verified_on: "2026-10-01" }
  - { id: "3", name: Cloud Technology and Services, weight: 34, url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html", verified_on: "2026-10-01" }
  - { id: "4", name: "Billing, Pricing, and Support", weight: 12, url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html", verified_on: "2026-10-01" }
tasks:
  - { id: "1.1", text: Fixture task statement 1.1, terms: [], url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html", verified_on: "2026-10-01" }
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

`tests/fixtures/content-root/content/missions/mission-00-guardrails.md`:

```markdown
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
```

`tests/fixtures/content-root/resources/README.md`:

```markdown
# Fixture notes

These notes exist only to test the content checks.

| # | Module | Lessons |
| --- | --- | --- |
| 1 | [Baking Basics](01-baking-basics/README.md) | 1 |
```

`tests/fixtures/content-root/resources/glossary.md`:

```markdown
# Glossary

Every term from the lessons' Terms sections, A to Z, with links to each lesson that defines it.

## S

- **Shared kitchen** ([Module 1, What a Bakery Cloud Is](01-baking-basics/01-what-a-bakery-cloud-is.md)): A pool of ovens that many branches use.
```

`tests/fixtures/content-root/resources/concepts.md`:

```markdown
# Concept index

Every concept tag from the lessons' frontmatter, A to Z, with links to each lesson that uses it.

## P

- `per-minute-rental`: [Module 1, What a Bakery Cloud Is](01-baking-basics/01-what-a-bakery-cloud-is.md)

## S

- `shared-kitchen`: [Module 1, What a Bakery Cloud Is](01-baking-basics/01-what-a-bakery-cloud-is.md)
```

`tests/fixtures/content-root/resources/01-baking-basics/README.md`:

```markdown
---
module: 1
slug: baking-basics
title: "Module 1: Baking Basics"
source: "Fixture course, Module 1: Baking Basics"
lessons: 1
assessment_questions: 1
---

# Module 1: Baking Basics

## What this module covers

This fixture module explains shared ovens.

## Lessons

1. **[What a Bakery Cloud Is](01-what-a-bakery-cloud-is.md)**: borrowing ovens and paying by the minute.

## Key takeaways

- Shared ovens cut idle cost.

## What the assessment focuses on

The assessment has 1 question.

## Summary

Borrowing beats buying for bursty baking.

## Further reading

- [AWS Cloud Practitioner exam guide](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html): the official guide.
```

`tests/fixtures/content-root/resources/01-baking-basics/01-what-a-bakery-cloud-is.md`:

```markdown
---
module: 1
lesson: 1
slug: what-a-bakery-cloud-is
title: "What a Bakery Cloud Is"
source: "Fixture course, Module 1: Baking Basics, lesson: What a Bakery Cloud Is"
concepts:
  - shared-kitchen
  - per-minute-rental
---

# What a Bakery Cloud Is

## Objectives

- Explain the shared kitchen idea.

## Notes

### Shared kitchen

- Branches use ovens from one central kitchen when their queues grow.

### Paying by the minute

- Cabinets are billed only while dough proofs.
- **Exam guide update** (verified_on 2026-10-01, [CLF-C02 Domain 1](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html)): The fixture guide names a newer billing term.

## Key takeaways

- Borrow capacity when busy and give it back when quiet.

## Terms

- **Shared kitchen**: a pool of ovens many branches use.
```

- [ ] **Step 7: Write the fixture helper `tests/fixtures/content-root.ts`**

```ts
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onTestFinished } from 'vitest';
import { allowFile, fingerprintModule } from '../../scripts/content/lib/fingerprint-files.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

/** Fixed date for every fixture-based test, so freshness checks never drift. */
export const FIXTURE_TODAY = '2026-10-10';

/** Copies the fixture tree to a fresh temp dir, writes fingerprints for its made-up source, and deletes the dir after the test. */
export function makeFixtureRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'ccp-fixture-'));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(here, 'content-root'), root, { recursive: true });
  const source = readFileSync(join(here, 'source', 'module-01.md'), 'utf8');
  const out = join(root, 'content', 'fingerprints');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'm01.json'), JSON.stringify(fingerprintModule(1, source)));
  writeFileSync(join(out, 'allow.txt'), allowFile([source], ''));
  return root;
}
```

- [ ] **Step 8: Write the failing loader tests**

`tests/unit/context.test.ts`:

```ts
import { unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

describe('loadContext', () => {
  it('loads the fixture tree with no errors', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(ctx.loadErrors).toEqual([]);
    expect(ctx.notes.map((n) => n.id)).toEqual(['m01', 'm01/what-a-bakery-cloud-is']);
    expect(ctx.concepts.map((c) => c.id)).toEqual(['shared-kitchen', 'per-minute-rental']);
    expect(ctx.blueprint?.tasks).toHaveLength(19);
    expect(ctx.missions.map((m) => m.id)).toEqual(['mission-00']);
    expect([...(ctx.fingerprints.get(1)?.items.keys() ?? [])]).toEqual(['kc-01', 'quiz-01']);
    expect(ctx.allow.length).toBeGreaterThan(0);
    expect(ctx.shared.map((s) => s.path)).toEqual(['resources/README.md', 'resources/concepts.md', 'resources/glossary.md']);
    expect(ctx.head('content/concepts.yaml')).toBeNull();
  });

  it('reports a missing required file as an R1 finding', () => {
    const root = makeFixtureRoot();
    unlinkSync(join(root, 'content', 'concepts.yaml'));
    expect(loadContext(root, { today: FIXTURE_TODAY }).loadErrors).toEqual([
      { rule: 'R1', file: 'content/concepts.yaml', message: 'required file is missing' },
    ]);
  });

  it('names the concept in schema errors and keeps the valid entries', () => {
    const root = makeFixtureRoot();
    writeFileSync(
      join(root, 'content', 'concepts.yaml'),
      '- id: half-done\n  name: Half done\n  home: m01/what-a-bakery-cloud-is\n  anchor: ""\n- id: shared-kitchen\n  name: Shared kitchen\n  home: m01/what-a-bakery-cloud-is\n  anchor: shared-kitchen\n  tasks: ["1.1"]\n',
    );
    const ctx = loadContext(root, { today: FIXTURE_TODAY });
    expect(ctx.loadErrors.map((f) => f.message.split(':')[0])).toEqual(['[half-done].anchor', '[half-done].tasks']);
    expect(ctx.concepts.map((c) => c.id)).toEqual(['shared-kitchen']);
  });
});
```

- [ ] **Step 9: Run them to see them fail**

```bash
pnpm test tests/unit/context.test.ts
```

Expected: FAIL, because `scripts/content/lib/context.ts` does not exist.

- [ ] **Step 10: Implement `scripts/content/lib/context.ts`**

```ts
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { Blueprint } from '../../../schemas/blueprint.ts';
import { Concept } from '../../../schemas/concept.ts';
import { FingerprintFile } from '../../../schemas/fingerprint.ts';
import { MissionFrontmatter } from '../../../schemas/mission.ts';
import { LessonFrontmatter, ModuleFrontmatter } from '../../../schemas/note.ts';
import { type RuleId, ValidateConfig } from '../../../schemas/validate-config.ts';
import { type HashSet, unpack } from './fingerprint.ts';
import { type Heading, headingsOf, splitFrontmatter } from './markdown.ts';
import { phrasesFrom } from './text.ts';

export interface Finding {
  rule: RuleId;
  file: string;
  line?: number;
  message: string;
}

interface NoteBase {
  path: string;
  id: string;
  module: number;
  number: number;
  slugFromPath: string;
  text: string;
  body: string;
  bodyLine: number;
  headings: Heading[];
  keys: string[];
}
export interface LessonNote extends NoteBase {
  kind: 'lesson';
  fm: LessonFrontmatter | null;
}
export interface ModuleNote extends NoteBase {
  kind: 'module';
  fm: ModuleFrontmatter | null;
}
export type Note = LessonNote | ModuleNote;

export interface Mission {
  path: string;
  id: string;
  fm: MissionFrontmatter | null;
  body: string;
  bodyLine: number;
}

export interface TextFile {
  path: string;
  text: string;
}

export interface ModulePrints {
  text: HashSet;
  items: ReadonlyMap<string, HashSet>;
}

/** Everything the rules and the build read, loaded once; parse and schema errors become R1 findings instead of exceptions. */
export interface Context {
  root: string;
  today: string;
  files: readonly string[];
  config: ValidateConfig | null;
  notes: readonly Note[];
  shared: readonly TextFile[];
  concepts: readonly Concept[];
  blueprint: Blueprint | null;
  missions: readonly Mission[];
  fingerprints: ReadonlyMap<number, ModulePrints>;
  allow: readonly (readonly string[])[];
  loadErrors: readonly Finding[];
  read: (path: string) => string | null;
  head: (path: string) => string | null;
}

export const CONFIG_FILE = 'content/validate.yaml';
export const CONCEPTS_FILE = 'content/concepts.yaml';
export const BLUEPRINT_FILE = 'content/exam/blueprint.yaml';
export const ALLOW_FILE = 'content/fingerprints/allow.txt';
const NOTE = /^resources\/(\d{2})-([a-z0-9-]+)\/(?:(\d{2})-([a-z0-9-]+)|README)\.md$/;
const SHARED = /^resources\/[^/]+\.md$/;
const MISSION = /^content\/missions\/(mission-\d{2})-[a-z0-9-]+\.md$/;
const PRINTS = /^content\/fingerprints\/m(\d{2})\.json$/;
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'test-results', 'playwright-report', 'coverage', '.results']);

type Issue = { readonly path: readonly PropertyKey[]; readonly message: string };
const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Today's date in the local time zone, as YYYY-MM-DD. */
export function localDate(date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Tracked and untracked-but-not-ignored files in a git repo; every file below root otherwise. */
function listFiles(root: string, isGit: boolean): string[] {
  if (isGit) {
    const out = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    return [...new Set(out.split('\0'))].filter((f) => f !== '' && existsSync(join(root, f))).sort();
  }
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const rel = dir === '' ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.isFile()) files.push(rel);
    }
  };
  walk('');
  return files.sort();
}

export function loadContext(root: string, options: { today?: string } = {}): Context {
  const errors: Finding[] = [];
  const isGit = existsSync(join(root, '.git'));
  const files = listFiles(root, isGit);
  const cache = new Map<string, string | null>();
  const fingerprints = new Map<number, ModulePrints>();

  const read = (path: string): string | null => {
    if (!cache.has(path)) {
      const full = join(root, path);
      cache.set(path, existsSync(full) && statSync(full).isFile() ? readFileSync(full, 'utf8') : null);
    }
    return cache.get(path) ?? null;
  };

  const schemaErrors = (file: string, issues: readonly Issue[], prefix = '', line?: number): void => {
    for (const issue of issues) {
      const where = [prefix, ...issue.path.map(String)].filter((p) => p !== '').join('.') || '(root)';
      errors.push({ rule: 'R1', file, ...(line === undefined ? {} : { line }), message: `${where}: ${issue.message}` });
    }
  };

  const yamlFile = (path: string): unknown => {
    const text = read(path);
    if (text === null) {
      errors.push({ rule: 'R1', file: path, message: 'required file is missing' });
      return undefined;
    }
    try {
      return parseYaml(text);
    } catch (error) {
      errors.push({ rule: 'R1', file: path, message: `YAML: ${errorText(error)}` });
      return undefined;
    }
  };

  const frontmatterOf = (path: string, text: string): { data: unknown; body: string; bodyLine: number } => {
    const { yaml, body, bodyLine } = splitFrontmatter(text);
    if (yaml === null) {
      errors.push({ rule: 'R1', file: path, line: 1, message: 'missing frontmatter' });
      return { data: undefined, body, bodyLine };
    }
    try {
      return { data: parseYaml(yaml), body, bodyLine };
    } catch (error) {
      errors.push({ rule: 'R1', file: path, line: 1, message: `frontmatter YAML: ${errorText(error)}` });
      return { data: undefined, body, bodyLine };
    }
  };

  const loadNote = (path: string, match: RegExpExecArray): Note => {
    const text = read(path) ?? '';
    const { data, body, bodyLine } = frontmatterOf(path, text);
    const base = {
      path,
      module: Number(match[1]),
      text,
      body,
      bodyLine,
      headings: headingsOf(body, bodyLine),
      keys: isRecord(data) ? Object.keys(data) : [],
    };
    const lessonSlug = match[4];
    if (lessonSlug !== undefined) {
      const parsed = data === undefined ? null : LessonFrontmatter.safeParse(data);
      if (parsed && !parsed.success) schemaErrors(path, parsed.error.issues, 'frontmatter', 1);
      return {
        ...base,
        kind: 'lesson',
        id: `m${match[1]}/${lessonSlug}`,
        number: Number(match[3]),
        slugFromPath: lessonSlug,
        fm: parsed?.success ? parsed.data : null,
      };
    }
    const parsed = data === undefined ? null : ModuleFrontmatter.safeParse(data);
    if (parsed && !parsed.success) schemaErrors(path, parsed.error.issues, 'frontmatter', 1);
    return {
      ...base,
      kind: 'module',
      id: `m${match[1]}`,
      number: 0,
      slugFromPath: match[2] ?? '',
      fm: parsed?.success ? parsed.data : null,
    };
  };

  const loadMission = (path: string, id: string): Mission => {
    const { data, body, bodyLine } = frontmatterOf(path, read(path) ?? '');
    const parsed = data === undefined ? null : MissionFrontmatter.safeParse(data);
    if (parsed && !parsed.success) schemaErrors(path, parsed.error.issues, 'frontmatter', 1);
    return { path, id, fm: parsed?.success ? parsed.data : null, body, bodyLine };
  };

  const loadPrints = (path: string, module: number): void => {
    let data: unknown;
    try {
      data = JSON.parse(read(path) ?? '');
    } catch (error) {
      errors.push({ rule: 'R1', file: path, message: `JSON: ${errorText(error)}` });
      return;
    }
    const parsed = FingerprintFile.safeParse(data);
    if (!parsed.success) {
      schemaErrors(path, parsed.error.issues);
      return;
    }
    if (parsed.data.module !== module) {
      errors.push({ rule: 'R1', file: path, message: `holds module ${parsed.data.module}, not ${module}` });
      return;
    }
    const items = new Map(Object.entries(parsed.data.items).map(([id, set]) => [id, unpack(set)] as const));
    fingerprints.set(module, { text: unpack(parsed.data.text), items });
  };

  let config: ValidateConfig | null = null;
  const configData = yamlFile(CONFIG_FILE);
  if (configData !== undefined) {
    const parsed = ValidateConfig.safeParse(configData);
    if (parsed.success) config = parsed.data;
    else schemaErrors(CONFIG_FILE, parsed.error.issues);
  }

  const concepts: Concept[] = [];
  const conceptData = yamlFile(CONCEPTS_FILE);
  if (conceptData !== undefined) {
    if (!Array.isArray(conceptData)) {
      errors.push({ rule: 'R1', file: CONCEPTS_FILE, message: 'must be a list of concepts' });
    } else {
      for (const [i, entry] of conceptData.entries()) {
        const parsed = Concept.safeParse(entry);
        if (parsed.success) concepts.push(parsed.data);
        else {
          const label = isRecord(entry) && typeof entry.id === 'string' ? `[${entry.id}]` : `[#${i + 1}]`;
          schemaErrors(CONCEPTS_FILE, parsed.error.issues, label);
        }
      }
    }
  }

  let blueprint: Blueprint | null = null;
  const blueprintData = yamlFile(BLUEPRINT_FILE);
  if (blueprintData !== undefined) {
    const parsed = Blueprint.safeParse(blueprintData);
    if (parsed.success) blueprint = parsed.data;
    else schemaErrors(BLUEPRINT_FILE, parsed.error.issues);
  }

  const notes: Note[] = [];
  const shared: TextFile[] = [];
  const missions: Mission[] = [];
  for (const path of files) {
    const note = NOTE.exec(path);
    if (note) {
      notes.push(loadNote(path, note));
      continue;
    }
    if (SHARED.test(path)) {
      shared.push({ path, text: read(path) ?? '' });
      continue;
    }
    const mission = MISSION.exec(path);
    if (mission) {
      missions.push(loadMission(path, mission[1] ?? ''));
      continue;
    }
    const prints = PRINTS.exec(path);
    if (prints) loadPrints(path, Number(prints[1]));
  }
  notes.sort((a, b) => a.module - b.module || a.number - b.number);

  const allowText = read(ALLOW_FILE);
  const head = (path: string): string | null => {
    if (!isGit) return null;
    const result = spawnSync('git', ['show', `HEAD:${path}`], { cwd: root, encoding: 'utf8' });
    return result.status === 0 ? result.stdout : null;
  };

  return {
    root,
    today: options.today ?? localDate(),
    files,
    config,
    notes,
    shared,
    concepts,
    blueprint,
    missions,
    fingerprints,
    allow: allowText === null ? [] : phrasesFrom(allowText.split('\n')),
    loadErrors: errors,
    read,
    head,
  };
}
```

- [ ] **Step 11: Run the tests to see them pass**

```bash
pnpm test tests/unit/context.test.ts tests/unit/markdown.test.ts
```

Expected: PASS.

- [ ] **Step 12: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/lib/markdown.ts scripts/content/lib/update-line.ts scripts/content/lib/context.ts tests/fixtures tests/unit/markdown.test.ts tests/unit/context.test.ts
git commit -m "Add the content loader and a made-up fixture tree" -m "loadContext reads notes, registry, blueprint, missions and fingerprints once and reports parse and schema errors as R1 findings."
```

---

## Task 7: Validator framework, rule R1 and the bad-fixture harness

Every rule is a pure function from the loaded `Context` to findings.
The harness copies the valid fixture tree, overlays one bad file named by the fixture's first line, and asserts that the fixture's rule fires (spec 2.9: each rule has a failing fixture).

**Files:**
- Create: `scripts/content/rules/rule.ts`, `scripts/content/rules/r01-schema.ts`, `scripts/content/rules/index.ts`, `scripts/content/validate.ts`, `tests/content/bad/r01-concept-without-tasks.yaml`
- Test: `tests/content/bad.test.ts`

- [ ] **Step 1: Write the first bad fixture**

`tests/content/bad/r01-concept-without-tasks.yaml` (the first line names the file it replaces in the fixture tree):

```yaml
# fixture-target: content/concepts.yaml
- id: shared-kitchen
  name: Shared kitchen
  home: m01/what-a-bakery-cloud-is
  anchor: shared-kitchen
- id: per-minute-rental
  name: Per-minute rental
  home: m01/what-a-bakery-cloud-is
  anchor: paying-by-the-minute
  tasks: ["4.1"]
```

- [ ] **Step 2: Write the failing harness**

`tests/content/bad.test.ts`:

```ts
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { RULES, runRules } from '../../scripts/content/rules/index.ts';
import { RuleId } from '../../schemas/validate-config.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const BAD = fileURLToPath(new URL('./bad/', import.meta.url));
const fixtures = readdirSync(BAD)
  .filter((name) => /^r\d{2}-[a-z0-9-]+\.(?:yaml|md)$/.test(name))
  .sort();
const ruleOf = (name: string): RuleId => RuleId.parse(`R${Number(name.slice(1, 3))}`);

describe('the baseline fixture tree', () => {
  it('passes every implemented rule', () => {
    const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
    expect(runRules(ctx, RULES.map((r) => r.id)).findings).toEqual([]);
  });
});

describe('bad fixtures', () => {
  it('cover every implemented rule', () => {
    expect([...new Set(fixtures.map(ruleOf))].sort()).toEqual(RULES.map((r) => r.id).sort());
  });

  it.each(fixtures)('%s fires its rule', (name) => {
    const [first = '', ...rest] = readFileSync(join(BAD, name), 'utf8').split('\n');
    const target = /fixture-target: (\S+)/.exec(first)?.[1];
    if (target === undefined) throw new Error(`${name}: the first line must name a fixture-target`);
    const root = makeFixtureRoot();
    mkdirSync(dirname(join(root, target)), { recursive: true });
    writeFileSync(join(root, target), rest.join('\n'));
    const rule = ruleOf(name);
    const { findings } = runRules(loadContext(root, { today: FIXTURE_TODAY }), [rule]);
    expect(findings.filter((f) => f.rule === rule).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

```bash
pnpm test tests/content/bad.test.ts
```

Expected: FAIL, because `scripts/content/rules/index.ts` does not exist.

- [ ] **Step 4: Write `scripts/content/rules/rule.ts`**

```ts
import type { RuleId } from '../../../schemas/validate-config.ts';
import type { Context, Finding } from '../lib/context.ts';

/** A validator rule: a pure function from the loaded content to its findings (spec 2.9). */
export interface Rule {
  id: RuleId;
  title: string;
  run: (ctx: Context) => Finding[];
}

/** Builds a finding, leaving `line` out when it is unknown. */
export function finding(rule: RuleId, file: string, message: string, line?: number): Finding {
  return line === undefined ? { rule, file, message } : { rule, file, line, message };
}
```

- [ ] **Step 5: Write `scripts/content/rules/r01-schema.ts`**

```ts
import type { Rule } from './rule.ts';

/** R1 Schema: every content file parses and matches its zod schema; the loader collects these findings. */
export const r01: Rule = {
  id: 'R1',
  title: 'Schema',
  run: (ctx) => [...ctx.loadErrors],
};
```

- [ ] **Step 6: Write `scripts/content/rules/index.ts`**

```ts
import type { RuleId } from '../../../schemas/validate-config.ts';
import type { Context, Finding } from '../lib/context.ts';
import { r01 } from './r01-schema.ts';
import type { Rule } from './rule.ts';

/** The implemented rules, in id order; each rule task in this phase adds its rule here. */
export const RULES: readonly Rule[] = [r01];

const rank = (id: RuleId): number => Number(id.slice(1));

/** Runs the given rules and reports any id that has no implementation yet. */
export function runRules(ctx: Context, ids: readonly RuleId[]): { findings: Finding[]; missing: RuleId[] } {
  const missing = ids.filter((id) => !RULES.some((rule) => rule.id === id));
  const findings = RULES.filter((rule) => ids.includes(rule.id)).flatMap((rule) => rule.run(ctx));
  findings.sort(
    (a, b) => rank(a.rule) - rank(b.rule) || a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0),
  );
  return { findings, missing };
}

export function formatFinding(f: Finding): string {
  return `${f.rule} ${f.file}${f.line === undefined ? '' : `:${f.line}`}  ${f.message}`;
}
```

- [ ] **Step 7: Write the command `scripts/content/validate.ts`**

```ts
/** pnpm content:validate [--all]: runs the rules switched on in content/validate.yaml, or every implemented rule with --all (spec 2.9). */
import { resolve } from 'node:path';
import { loadContext } from './lib/context.ts';
import { formatFinding, RULES, runRules } from './rules/index.ts';

const root = resolve(import.meta.dirname, '..', '..');
const ctx = loadContext(root);
const all = process.argv.includes('--all');

if (!all && ctx.config === null) {
  for (const f of ctx.loadErrors) console.error(formatFinding(f));
  console.error('content:validate: content/validate.yaml is missing or invalid');
  process.exit(1);
}

const ids = all ? RULES.map((rule) => rule.id) : (ctx.config?.rules ?? []);
const { findings, missing } = runRules(ctx, ids);
for (const id of missing) console.error(`content:validate: ${id} is switched on but not implemented yet`);
for (const f of findings) console.error(formatFinding(f));
console.log(`content:validate: ${ids.length} rules, ${findings.length} findings`);
process.exit(findings.length > 0 || missing.length > 0 ? 1 : 0);
```

- [ ] **Step 8: Run the harness to see it pass**

```bash
pnpm test tests/content/bad.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 9: Run the command on the real repo**

```bash
pnpm content:validate --all; echo "exit $?"
```

Expected: three R1 findings, `required file is missing` for `content/validate.yaml`, `content/concepts.yaml` and `content/exam/blueprint.yaml`, then `exit 1`.
Those files arrive in Tasks 13 to 18.

- [ ] **Step 10: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/rules scripts/content/validate.ts tests/content
git commit -m "Add the content validator with rule R1" -m "Rules are pure functions over the loaded content; a harness proves each one fires on its bad fixture."
```

---

## Task 8: Rule R8, Markdown style

R8 checks every tracked file for the em dash, every Markdown file for one sentence per line, and every note for its frontmatter keys and section order (spec 2.9).
The em dash check skips `tests/content/bad/`, which must be able to hold one.

**Files:**
- Create: `scripts/content/rules/r08-style.ts`, `tests/content/bad/r08-em-dash.md`
- Modify: `scripts/content/rules/index.ts`
- Test: `tests/unit/r08.test.ts`

- [ ] **Step 1: Write the bad fixture**

`tests/content/bad/r08-em-dash.md` is the baseline lesson with one em dash (U+2014) in a note line.
Create it with a script so the character is exact:

```bash
python3 - <<'EOF'
from pathlib import Path
base = Path('tests/fixtures/content-root/resources/01-baking-basics/01-what-a-bakery-cloud-is.md').read_text()
bad = base.replace('when their queues grow.', 'when their queues grow \u2014 even at night.')
assert bad != base
Path('tests/content/bad/r08-em-dash.md').write_text('<!-- fixture-target: resources/01-baking-basics/01-what-a-bakery-cloud-is.md -->\n' + bad)
EOF
```

- [ ] **Step 2: Write the failing unit test for the structure checks**

`tests/unit/r08.test.ts`:

```ts
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';

describe('R8 Markdown style', () => {
  it('reports missing keys, unknown sections, sections out of order and two sentences on a line', () => {
    const root = makeFixtureRoot();
    writeFileSync(
      join(root, LESSON),
      [
        '---',
        'module: 1',
        'lesson: 1',
        'slug: what-a-bakery-cloud-is',
        'title: "What a Bakery Cloud Is"',
        'concepts: [shared-kitchen, per-minute-rental]',
        '---',
        '',
        '# What a Bakery Cloud Is',
        '',
        '## Notes',
        '',
        '### Shared kitchen',
        '',
        '- Ovens are shared. Branches borrow them.',
        '',
        '### Paying by the minute',
        '',
        '## Objectives',
        '',
        '## Key takeaways',
        '',
        '## Extra',
        '',
        '## Terms',
        '',
      ].join('\n'),
    );
    const messages = runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R8']).findings.map(
      (f) => `${f.line ?? '-'} ${f.message}`,
    );
    // runRules sorts by file, then line, and a finding without a line sorts first.
    expect(messages).toEqual([
      '- sections out of order: Notes, Objectives, Key takeaways, Terms',
      "1 frontmatter is missing 'source'",
      '15 more than one sentence on this line',
      "23 unexpected section '## Extra'",
    ]);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

```bash
pnpm test tests/unit/r08.test.ts tests/content/bad.test.ts
```

Expected: FAIL; R8 is not implemented, and the harness reports the R8 fixture's rule as missing from `RULES`.

- [ ] **Step 4: Implement `scripts/content/rules/r08-style.ts`**

```ts
import type { Finding, Note } from '../lib/context.ts';
import { emDashLines, multiSentenceLines } from '../lib/text.ts';
import { finding, type Rule } from './rule.ts';

const LESSON_KEYS = ['module', 'lesson', 'slug', 'title', 'source', 'concepts'];
const MODULE_KEYS = ['module', 'slug', 'title', 'source', 'lessons', 'assessment_questions'];
const LESSON_REQUIRED = ['Objectives', 'Notes', 'Key takeaways', 'Terms'];
const LESSON_ORDER = ['Objectives', 'Notes', 'Visuals', 'Key takeaways', 'Scenarios', 'Terms'];
const MODULE_ORDER = ['What this module covers', 'Lessons', 'Key takeaways', 'What the assessment focuses on', 'Summary', 'Further reading'];
const BINARY = /\.(?:png|jpe?g|gif|ico|webp|woff2?|pdf|zip)$/i;

/** R8 Markdown style: no em dash anywhere, one sentence per line in Markdown, and the note structure of lint_notes.py. */
export const r08: Rule = {
  id: 'R8',
  title: 'Markdown style',
  run(ctx) {
    const out: Finding[] = [];
    for (const file of ctx.files) {
      if (file.startsWith('tests/content/bad/') || BINARY.test(file)) continue;
      const text = ctx.read(file);
      if (text === null) continue;
      for (const line of emDashLines(text)) out.push(finding('R8', file, 'em dash (U+2014); use a plain hyphen', line));
      if (!file.endsWith('.md')) continue;
      for (const line of multiSentenceLines(text)) out.push(finding('R8', file, 'more than one sentence on this line', line));
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
    if (!order.includes(h.text)) out.push(finding('R8', note.path, `unexpected section '## ${h.text}'`, h.line));
  }
  const known = names.filter((name) => order.includes(name));
  const sorted = [...known].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (known.join('|') !== sorted.join('|')) {
    out.push(finding('R8', note.path, `sections out of order: ${known.join(', ')}`));
  }
  return out;
}
```

- [ ] **Step 5: Register R8**

In `scripts/content/rules/index.ts`, add `import { r08 } from './r08-style.ts';` and change the list to:

```ts
export const RULES: readonly Rule[] = [r01, r08];
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
pnpm test tests/unit/r08.test.ts tests/content/bad.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run R8 on the real repo**

```bash
pnpm content:validate --all 2>&1 | grep '^R8' ; echo done
```

Expected: no R8 lines.
If R8 flags a line in `docs/` or `README.md`, split the sentences onto separate lines (the spec and this plan follow the rule; the fix is to the prose, never the rule).

- [ ] **Step 8: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/rules tests/content/bad/r08-em-dash.md tests/unit/r08.test.ts
git commit -m "Add rule R8 for Markdown style" -m "No em dash in any tracked file, one sentence per line in Markdown, and the lint_notes.py note structure."
```

---

## Task 9: Rule R6, references

**Files:**
- Create: `scripts/content/rules/r06-references.ts`, `tests/content/bad/r06-unregistered-tag.md`
- Modify: `scripts/content/rules/index.ts`
- Test: `tests/unit/r06.test.ts`

- [ ] **Step 1: Write the bad fixture**

```bash
python3 - <<'EOF'
from pathlib import Path
base = Path('tests/fixtures/content-root/resources/01-baking-basics/01-what-a-bakery-cloud-is.md').read_text()
bad = base.replace('  - per-minute-rental\n', '  - per-minute-rental\n  - sourdough-starter\n')
assert bad != base
Path('tests/content/bad/r06-unregistered-tag.md').write_text('<!-- fixture-target: resources/01-baking-basics/01-what-a-bakery-cloud-is.md -->\n' + bad)
EOF
```

- [ ] **Step 2: Write the failing unit tests**

`tests/unit/r06.test.ts`:

```ts
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const CONCEPTS = 'content/concepts.yaml';

function r06(edit: (root: string) => void): string[] {
  const root = makeFixtureRoot();
  edit(root);
  return runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R6']).findings.map((f) => f.message);
}

const replaceIn = (root: string, file: string, from: string, to: string): void => {
  const text = readFileSync(join(root, file), 'utf8');
  if (!text.includes(from)) throw new Error(`${file} does not contain ${from}`);
  writeFileSync(join(root, file), text.replace(from, to));
};

describe('R6 references', () => {
  it('reports a broken relative link', () => {
    expect(r06((root) => replaceIn(root, LESSON, 'dough proofs.', 'dough proofs, see [later](02-missing.md).'))).toEqual([
      'broken link 02-missing.md',
    ]);
  });

  it('reports an anchor that is not an H3 under ## Notes', () => {
    expect(r06((root) => replaceIn(root, CONCEPTS, 'anchor: shared-kitchen', 'anchor: objectives'))).toEqual([
      "[shared-kitchen] anchor 'objectives' is not an H3 under ## Notes in m01/what-a-bakery-cloud-is",
    ]);
  });

  it('reports a home note that does not list the concept, and a missing home note', () => {
    expect(r06((root) => replaceIn(root, LESSON, '  - shared-kitchen\n', ''))).toEqual([
      '[shared-kitchen] home note m01/what-a-bakery-cloud-is does not list it in concepts',
    ]);
    expect(r06((root) => replaceIn(root, CONCEPTS, 'home: m01/what-a-bakery-cloud-is\n  anchor: shared-kitchen', 'home: m01/nowhere\n  anchor: shared-kitchen'))).toEqual([
      '[shared-kitchen] home note m01/nowhere does not exist',
    ]);
  });

  it('reports frontmatter that disagrees with the file path', () => {
    expect(r06((root) => replaceIn(root, LESSON, 'slug: what-a-bakery-cloud-is', 'slug: bakery-cloud'))).toEqual([
      "frontmatter slug 'bakery-cloud' does not match the file name",
    ]);
  });

  it('reports a confusable that is not another registered concept', () => {
    expect(r06((root) => replaceIn(root, CONCEPTS, 'confusableWith: [shared-kitchen]', 'confusableWith: [per-minute-rental, rye-bread]'))).toEqual([
      "[per-minute-rental] confusableWith 'per-minute-rental' is not another registered concept",
      "[per-minute-rental] confusableWith 'rye-bread' is not another registered concept",
    ]);
  });
});
```

- [ ] **Step 3: Run them to see them fail**

```bash
pnpm test tests/unit/r06.test.ts tests/content/bad.test.ts
```

Expected: FAIL; R6 is not implemented.

- [ ] **Step 4: Implement `scripts/content/rules/r06-references.ts`**

```ts
import { posix } from 'node:path';
import { CONCEPTS_FILE, type Finding, type LessonNote } from '../lib/context.ts';
import { notesAnchors } from '../lib/markdown.ts';
import { fencedLines } from '../lib/text.ts';
import { finding, type Rule } from './rule.ts';

const LINK = /\]\(([^)#\s]+)(?:#[^)]*)?\)/g;
const EXTERNAL = /^(?:https?:|mailto:)/;

/** R6 References: note identity, relative links, concept tags, homes, anchors, confusables and mission ids all resolve. */
export const r06: Rule = {
  id: 'R6',
  title: 'References',
  run(ctx) {
    const out: Finding[] = [];

    for (const note of ctx.notes) {
      if (note.fm === null) continue;
      if (note.fm.module !== note.module) {
        out.push(finding('R6', note.path, `frontmatter module ${note.fm.module} does not match the folder`, 1));
      }
      if (note.fm.slug !== note.slugFromPath) {
        out.push(finding('R6', note.path, `frontmatter slug '${note.fm.slug}' does not match the file name`, 1));
      }
      if (note.kind === 'lesson' && note.fm !== null && note.fm.lesson !== note.number) {
        out.push(finding('R6', note.path, `frontmatter lesson ${note.fm.lesson} does not match the file number`, 1));
      }
    }

    const files = new Set(ctx.files);
    for (const doc of [...ctx.notes, ...ctx.shared]) {
      const lines = doc.text.split('\n');
      const code = fencedLines(lines);
      for (const [i, line] of lines.entries()) {
        if (code[i]) continue;
        for (const match of line.matchAll(LINK)) {
          const target = match[1] ?? '';
          if (EXTERNAL.test(target)) continue;
          const resolved = posix.normalize(posix.join(posix.dirname(doc.path), target));
          if (!files.has(resolved)) out.push(finding('R6', doc.path, `broken link ${target}`, i + 1));
        }
      }
    }

    const ids = new Set(ctx.concepts.map((c) => c.id));
    const aliases = new Set(ctx.concepts.flatMap((c) => c.aliases ?? []));
    const lessons = new Map<string, LessonNote>();
    for (const note of ctx.notes) if (note.kind === 'lesson') lessons.set(note.id, note);

    for (const note of lessons.values()) {
      for (const tag of note.fm?.concepts ?? []) {
        if (!ids.has(tag) && !aliases.has(tag)) {
          out.push(finding('R6', note.path, `concept tag '${tag}' is not registered in ${CONCEPTS_FILE}`, 1));
        }
      }
    }

    for (const c of ctx.concepts) {
      const home = lessons.get(c.home);
      if (home === undefined) {
        out.push(finding('R6', CONCEPTS_FILE, `[${c.id}] home note ${c.home} does not exist`));
        continue;
      }
      if (!home.fm?.concepts.includes(c.id)) {
        out.push(finding('R6', CONCEPTS_FILE, `[${c.id}] home note ${c.home} does not list it in concepts`));
      }
      if (!notesAnchors(home.headings).includes(c.anchor)) {
        out.push(finding('R6', CONCEPTS_FILE, `[${c.id}] anchor '${c.anchor}' is not an H3 under ## Notes in ${c.home}`));
      }
      for (const other of c.confusableWith ?? []) {
        if (other === c.id || !ids.has(other)) {
          out.push(finding('R6', CONCEPTS_FILE, `[${c.id}] confusableWith '${other}' is not another registered concept`));
        }
      }
    }

    for (const mission of ctx.missions) {
      if (mission.fm !== null && mission.fm.id !== mission.id) {
        out.push(finding('R6', mission.path, `id '${mission.fm.id}' does not match the file name`, 1));
      }
    }
    return out;
  },
};
```

- [ ] **Step 5: Register R6**

In `scripts/content/rules/index.ts`, import `r06` from `./r06-references.ts` and set:

```ts
export const RULES: readonly Rule[] = [r01, r06, r08];
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
pnpm test tests/unit/r06.test.ts tests/content/bad.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run R6 on the real repo**

```bash
pnpm content:validate --all 2>&1 | grep '^R6' | grep -v 'is not registered' ; echo done
```

Expected: no lines, so every link in `resources/` resolves; the "is not registered" findings disappear once Task 15 completes the registry.

- [ ] **Step 8: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/rules tests/content/bad/r06-unregistered-tag.md tests/unit/r06.test.ts
git commit -m "Add rule R6 for references" -m "Note identity, relative links, concept tags, homes, anchors and confusables must all resolve."
```

---

## Task 10: Rule R7, originality

Notes are checked against their own module's fingerprint, and the shared files (`resources/README.md`, `glossary.md`, `concepts.md`) against every module, with titles and official lists masked first (spec 2.5).
A copied run of 9 or more words, or a corrected share above 8%, fails.

**Files:**
- Create: `scripts/content/rules/r07-originality.ts`, `tests/content/bad/r07-copied-run.md`
- Modify: `scripts/content/rules/index.ts`
- Test: `tests/unit/r07.test.ts`

- [ ] **Step 1: Write the bad fixture**

The copied sentence comes from the made-up source in `tests/fixtures/source/module-01.md`.

```bash
python3 - <<'EOF'
from pathlib import Path
base = Path('tests/fixtures/content-root/resources/01-baking-basics/01-what-a-bakery-cloud-is.md').read_text()
bad = base.replace('- Cabinets are billed only while dough proofs.\n', '- Bakers rent proofing cabinets by the minute and hand them back once the dough has risen.\n')
assert bad != base
Path('tests/content/bad/r07-copied-run.md').write_text('<!-- fixture-target: resources/01-baking-basics/01-what-a-bakery-cloud-is.md -->\n' + bad)
EOF
```

- [ ] **Step 2: Write the failing unit test**

`tests/unit/r07.test.ts`:

```ts
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

describe('R7 originality', () => {
  it('checks shared files against the course too', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', 'glossary.md'),
      '- **Proofing cabinet** ([Module 1, What a Bakery Cloud Is](01-baking-basics/01-what-a-bakery-cloud-is.md)): Bakers rent proofing cabinets by the minute and hand them back once the dough has risen.\n',
    );
    const findings = runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R7']).findings;
    expect(findings.map((f) => f.file)).toContain('resources/glossary.md');
    expect(findings.some((f) => f.message.startsWith('copies a 16-word run'))).toBe(true);
  });

  it('masks titles, so a lesson title is never a copied run', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', '01-baking-basics', '01-what-a-bakery-cloud-is.md'),
      '\n- What a Bakery Cloud Is, Module 1: Baking Basics, and What a Bakery Cloud Is again.\n',
    );
    expect(runRules(loadContext(root, { today: FIXTURE_TODAY }), ['R7']).findings).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

```bash
pnpm test tests/unit/r07.test.ts tests/content/bad.test.ts
```

Expected: FAIL; R7 is not implemented.

- [ ] **Step 4: Implement `scripts/content/rules/r07-originality.ts`**

```ts
import { ALLOW_FILE, type Finding } from '../lib/context.ts';
import { runsAgainst, shareAgainst } from '../lib/fingerprint.ts';
import { mask, stripMarkdown, words } from '../lib/text.ts';
import { finding, type Rule } from './rule.ts';

/** Largest corrected share of 6-word sequences a note may share with the course (spec 2.5). */
export const MAX_SHARE = 0.08;

/** R7 Originality: no copied 9-word run and at most 8% shared 6-word sequences, against the committed fingerprints. */
export const r07: Rule = {
  id: 'R7',
  title: 'Originality',
  run(ctx) {
    const out: Finding[] = [];
    if (ctx.allow.length === 0) {
      out.push(finding('R7', ALLOW_FILE, 'the allow list is missing or empty; run pnpm content:fingerprint'));
    }
    const tokensOf = (text: string): string[] => mask(words(stripMarkdown(text)), ctx.allow);
    const report = (file: string, runs: readonly string[], share: number): void => {
      for (const run of runs) {
        out.push(finding('R7', file, `copies a ${run.split(' ').length}-word run from the course: "${run}"`));
      }
      if (share > MAX_SHARE) {
        out.push(finding('R7', file, `${(share * 100).toFixed(1)}% of its 6-word sequences come from the course (limit 8%)`));
      }
    };

    for (const note of ctx.notes) {
      const prints = ctx.fingerprints.get(note.module);
      if (prints === undefined) {
        out.push(finding('R7', note.path, `no fingerprint for module ${note.module}; run pnpm content:fingerprint`));
        continue;
      }
      const tokens = tokensOf(note.text);
      report(note.path, runsAgainst(tokens, prints.text), shareAgainst(tokens, [prints.text]).share);
    }

    const everyModule = [...ctx.fingerprints.values()].map((prints) => prints.text);
    for (const doc of ctx.shared) {
      const tokens = tokensOf(doc.text);
      report(
        doc.path,
        everyModule.flatMap((set) => runsAgainst(tokens, set)),
        shareAgainst(tokens, everyModule).share,
      );
    }
    return out;
  },
};
```

- [ ] **Step 5: Register R7**

In `scripts/content/rules/index.ts`, import `r07` from `./r07-originality.ts` and set:

```ts
export const RULES: readonly Rule[] = [r01, r06, r07, r08];
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
pnpm test tests/unit/r07.test.ts tests/content/bad.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run R7 on the real notes**

```bash
pnpm content:validate --all 2>&1 | grep '^R7' ; echo done
```

Expected: no R7 lines (the spec measured a worst corrected share of 3.8% and no run on 2026-10-09).
If R7 reports a run in a note, confirm it with the real 9-gram tool, `python3 -I "$HOME/Library/Application Support/ccp-study/pipeline/overlap_check.py" "$HOME/Library/Application Support/ccp-study/source/module-NN.md" <note>`; if that tool passes, the run is overlapping phrases from two places in the module, so reword the flagged phrase in the note through the notes workflow's rules (own words, one sentence per line) rather than weakening the rule.

- [ ] **Step 8: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/rules tests/content/bad/r07-copied-run.md tests/unit/r07.test.ts
git commit -m "Add rule R7 for originality" -m "Notes against their own module and shared files against every module, with titles masked, using only the committed fingerprints."
```

---

## Task 11: Rule R2, ids

Phase 0 has two kinds of id, concepts (with their aliases) and missions; questions, labs and incidents join R2 when their schemas arrive.
R2 also compares with the local `HEAD` commit: a concept id that `HEAD` has must still exist as an id or an alias (spec 2.4, a merge turns the old id into an alias).

**Files:**
- Create: `scripts/content/rules/r02-ids.ts`, `tests/content/bad/r02-duplicate-id.yaml`
- Modify: `scripts/content/rules/index.ts`
- Test: `tests/unit/r02.test.ts`

- [ ] **Step 1: Write the bad fixture**

`tests/content/bad/r02-duplicate-id.yaml`:

```yaml
# fixture-target: content/concepts.yaml
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
- id: shared-kitchen
  name: Shared kitchen again
  home: m01/what-a-bakery-cloud-is
  anchor: shared-kitchen
  tasks: ["1.1"]
```

- [ ] **Step 2: Write the failing unit test for the `HEAD` comparison**

`tests/unit/r02.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { runRules } from '../../scripts/content/rules/index.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

function withHead(headConcepts: string): Context {
  const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
  return { ...ctx, head: (path) => (path === 'content/concepts.yaml' ? headConcepts : null) };
}

describe('R2 against HEAD', () => {
  it('reports a concept id that HEAD has and the working tree lost', () => {
    const findings = runRules(withHead('- id: rye-bread\n  name: Rye\n- id: shared-kitchen\n'), ['R2']).findings;
    expect(findings.map((f) => f.message)).toEqual([
      "concept id 'rye-bread' exists in HEAD but is gone; keep it as an alias of the concept that replaced it",
    ]);
  });

  it('accepts an old id that survives as an alias', () => {
    const ctx = withHead('- id: per-minute-rental\n- id: shared-kitchen\n- id: shared-oven\n');
    const merged: Context = {
      ...ctx,
      concepts: ctx.concepts.map((c) => (c.id === 'shared-kitchen' ? { ...c, aliases: ['shared-oven'] } : c)),
      read: (path) => (path === 'content/concepts.yaml' ? '- id: per-minute-rental\n- id: shared-kitchen\n  aliases: [shared-oven]\n' : ctx.read(path)),
    };
    expect(runRules(merged, ['R2']).findings).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

```bash
pnpm test tests/unit/r02.test.ts tests/content/bad.test.ts
```

Expected: FAIL; R2 is not implemented.

- [ ] **Step 4: Implement `scripts/content/rules/r02-ids.ts`**

```ts
import { parse as parseYaml } from 'yaml';
import { CONCEPTS_FILE, type Finding } from '../lib/context.ts';
import { finding, type Rule } from './rule.ts';

/** Every concept id and alias in a concepts.yaml text, tolerating entries that fail the schema. */
export function conceptIdsIn(yamlText: string | null): string[] {
  if (yamlText === null) return [];
  let data: unknown;
  try {
    data = parseYaml(yamlText);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { id, aliases } = entry as { id?: unknown; aliases?: unknown };
    const own = typeof id === 'string' ? [id] : [];
    const more = Array.isArray(aliases) ? aliases.filter((a): a is string => typeof a === 'string') : [];
    return [...own, ...more];
  });
}

/** R2 Ids: ids are unique across concepts, aliases and missions, and no concept id in HEAD disappears. */
export const r02: Rule = {
  id: 'R2',
  title: 'Ids',
  run(ctx) {
    const out: Finding[] = [];
    const owner = new Map<string, string>();
    const claim = (id: string, what: string, file: string): void => {
      const previous = owner.get(id);
      if (previous === undefined) owner.set(id, `${what} in ${file}`);
      else out.push(finding('R2', file, `id '${id}' (${what}) is already used by ${previous}`));
    };
    for (const c of ctx.concepts) claim(c.id, 'concept', CONCEPTS_FILE);
    for (const c of ctx.concepts) for (const alias of c.aliases ?? []) claim(alias, `alias of ${c.id}`, CONCEPTS_FILE);
    for (const m of ctx.missions) claim(m.id, 'mission', m.path);

    const before = ctx.head(CONCEPTS_FILE);
    if (before !== null) {
      const now = new Set(conceptIdsIn(ctx.read(CONCEPTS_FILE)));
      for (const id of conceptIdsIn(before)) {
        if (!now.has(id)) {
          out.push(
            finding('R2', CONCEPTS_FILE, `concept id '${id}' exists in HEAD but is gone; keep it as an alias of the concept that replaced it`),
          );
        }
      }
    }
    return out;
  },
};
```

The working-tree side reads the raw file, so an entry that fails its schema (R1) does not also look deleted.

- [ ] **Step 5: Register R2**

In `scripts/content/rules/index.ts`, import `r02` from `./r02-ids.ts` and set:

```ts
export const RULES: readonly Rule[] = [r01, r02, r06, r07, r08];
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
pnpm test tests/unit/r02.test.ts tests/content/bad.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/rules tests/content/bad/r02-duplicate-id.yaml tests/unit/r02.test.ts
git commit -m "Add rule R2 for ids" -m "Unique ids across concepts, aliases and missions, and no concept id lost against the local HEAD commit."
```

---

## Task 12: Rule R13, sources

**Files:**
- Create: `scripts/content/rules/r13-sources.ts`, `tests/content/bad/r13-stale-update-line.md`
- Modify: `scripts/content/rules/index.ts`
- Test: `tests/unit/r13.test.ts`

- [ ] **Step 1: Write the bad fixture**

```bash
python3 - <<'EOF'
from pathlib import Path
base = Path('tests/fixtures/content-root/resources/01-baking-basics/01-what-a-bakery-cloud-is.md').read_text()
bad = base.replace('(verified_on 2026-10-01,', '(verified_on 2026-01-01,')
assert bad != base
Path('tests/content/bad/r13-stale-update-line.md').write_text('<!-- fixture-target: resources/01-baking-basics/01-what-a-bakery-cloud-is.md -->\n' + bad)
EOF
```

- [ ] **Step 2: Write the failing unit tests**

`tests/unit/r13.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sourceProblem } from '../../scripts/content/rules/r13-sources.ts';

const DOCS = 'https://docs.aws.amazon.com/x.html';

describe('sourceProblem', () => {
  it('accepts an AWS source checked 180 days ago or less', () => {
    expect(sourceProblem(DOCS, '2026-04-13', '2026-10-10')).toBeNull();
    expect(sourceProblem('https://aws.amazon.com/premiumsupport/plans/', '2026-10-10', '2026-10-10')).toBeNull();
  });

  it('rejects other hosts, stale or future dates, and non-URLs', () => {
    expect(sourceProblem('https://repost.aws/x', '2026-10-01', '2026-10-10')).toMatch(/not on aws.amazon.com/);
    expect(sourceProblem(DOCS, '2026-04-12', '2026-10-10')).toMatch(/181 days old/);
    expect(sourceProblem(DOCS, '2026-10-11', '2026-10-10')).toMatch(/in the future/);
    expect(sourceProblem('not a url', '2026-10-01', '2026-10-10')).toMatch(/is not a URL/);
  });
});
```

- [ ] **Step 3: Run them to see them fail**

```bash
pnpm test tests/unit/r13.test.ts tests/content/bad.test.ts
```

Expected: FAIL; R13 is not implemented.

- [ ] **Step 4: Implement `scripts/content/rules/r13-sources.ts`**

```ts
import { BLUEPRINT_FILE, type Finding } from '../lib/context.ts';
import { parseUpdateLine, UPDATE_PREFIX } from '../lib/update-line.ts';
import { finding, type Rule } from './rule.ts';

const HOSTS = new Set(['aws.amazon.com', 'docs.aws.amazon.com']);
/** A source must have been re-checked within this many days (spec 2.3). */
export const MAX_AGE_DAYS = 180;
const DAY_MS = 86_400_000;

/** Why a source fails R13, or null when it passes. */
export function sourceProblem(url: string, verifiedOn: string, today: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return `'${url}' is not a URL`;
  }
  if (!HOSTS.has(host)) return `source ${url} is not on aws.amazon.com or docs.aws.amazon.com`;
  const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${verifiedOn}T00:00:00Z`)) / DAY_MS;
  if (Number.isNaN(age)) return `verified_on '${verifiedOn}' is not a date`;
  if (age < 0) return `verified_on ${verifiedOn} is in the future`;
  if (age > MAX_AGE_DAYS) {
    return `verified_on ${verifiedOn} is ${age} days old (limit ${MAX_AGE_DAYS}); re-check the source and update the date`;
  }
  return null;
}

/** R13 Sources: every update line, blueprint entry and mission cites an AWS page re-checked within 180 days. */
export const r13: Rule = {
  id: 'R13',
  title: 'Sources',
  run(ctx) {
    const out: Finding[] = [];
    const check = (file: string, url: string, verifiedOn: string, line?: number): void => {
      const problem = sourceProblem(url, verifiedOn, ctx.today);
      if (problem !== null) out.push(finding('R13', file, problem, line));
    };

    for (const note of ctx.notes) {
      for (const [i, line] of note.text.split('\n').entries()) {
        if (!line.trimStart().startsWith(UPDATE_PREFIX)) continue;
        const update = parseUpdateLine(line);
        if (update === null) {
          out.push(
            finding('R13', note.path, 'malformed Exam guide update line; see spec 2.3 for the format', i + 1),
          );
        } else {
          check(note.path, update.url, update.verifiedOn, i + 1);
        }
      }
    }

    const blueprint = ctx.blueprint;
    if (blueprint !== null) {
      check(BLUEPRINT_FILE, blueprint.guide.url, blueprint.guide.verified_on);
      for (const d of blueprint.domains) check(BLUEPRINT_FILE, d.url, d.verified_on);
      for (const t of blueprint.tasks) check(BLUEPRINT_FILE, t.url, t.verified_on);
    }

    for (const mission of ctx.missions) {
      for (const source of mission.fm?.sources ?? []) check(mission.path, source.url, source.verified_on);
    }
    return out;
  },
};
```

Rank facts (spec 3.4) join R13 in Phase 3, when `content/game/ranks.yaml` exists.

- [ ] **Step 5: Register R13**

In `scripts/content/rules/index.ts`, import `r13` from `./r13-sources.ts` and set:

```ts
export const RULES: readonly Rule[] = [r01, r02, r06, r07, r08, r13];
```

- [ ] **Step 6: Run the whole suite**

```bash
pnpm test
```

Expected: PASS, including the harness's six fixture tests and its coverage test.

- [ ] **Step 7: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/rules tests/content/bad/r13-stale-update-line.md tests/unit/r13.test.ts
git commit -m "Add rule R13 for sources" -m "Update lines, blueprint entries and missions must cite aws.amazon.com or docs.aws.amazon.com, re-checked within 180 days."
```

---

## Task 13: Exam blueprint

`content/exam/blueprint.yaml` records the CLF-C02 domains, their weights and the 19 task statements, with the terms each task names (spec 2.3).
Rule R13 keeps its sources fresh, and from Phase 2 rule R10 checks that every term appears in the notes or is mapped with `coveredBy`.
No term carries `coveredBy` yet, because the coverage report that decides those mappings arrives in Phase 1.

**Files:**
- Create: `content/exam/blueprint.yaml`
- Test: `tests/unit/blueprint.test.ts`

- [ ] **Step 1: Write the failing test**

The test pins the domain weights and names and the terms that spec 2.3 and Appendix B single out.

`tests/unit/blueprint.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { Blueprint } from '../../schemas/blueprint.ts';

const file = fileURLToPath(new URL('../../content/exam/blueprint.yaml', import.meta.url));
const blueprint = Blueprint.parse(parse(readFileSync(file, 'utf8')));

/** Terms the current exam guide names that the course does not teach under these words (spec 2.3, Appendix B). */
const EXPECTED: Record<string, readonly string[]> = {
  '1.1': ['speed of deployment'],
  '1.3': [
    'reduced business risk',
    'improved ESG performance',
    'increased revenue',
    'increased operational efficiency',
    'database replication',
  ],
  '1.4': ['included licenses'],
  '2.1': ['Amazon RDS', 'AWS Lambda', 'Amazon EC2'],
  '2.2': ['access reports'],
  '2.3': ['access keys', 'password policies', 'AWS IAM Identity Center'],
  '2.4': ['AWS WAF', 'AWS Firewall Manager', 'AWS Shield', 'Amazon GuardDuty', 'AWS Security Center'],
  '3.5': ['AWS VPN', 'AWS Direct Connect'],
  '3.7': [
    'Amazon SageMaker AI',
    'Amazon Lex',
    'Amazon Athena',
    'Amazon Kinesis',
    'AWS Glue',
    'Amazon Quick Sight',
  ],
  '4.2': ['AWS cost allocation tags', 'AWS Cost and Usage Report'],
  '4.3': [
    'Basic Support',
    'AWS Business Support+',
    'AWS Enterprise Support',
    'AWS Unified Operations',
    'AWS Prescriptive Guidance',
    'AWS Knowledge Center',
    'AWS re:Post',
    'system integrators',
    'independent software vendors',
  ],
};

describe('the CLF-C02 blueprint', () => {
  it('has the four domains with their names and weights', () => {
    expect(blueprint.domains.map((d) => [d.id, d.name, d.weight])).toEqual([
      ['1', 'Cloud Concepts', 24],
      ['2', 'Security and Compliance', 30],
      ['3', 'Cloud Technology and Services', 34],
      ['4', 'Billing, Pricing, and Support', 12],
    ]);
  });

  it.each(Object.entries(EXPECTED))('task %s names the terms the exam guide lists', (id, phrases) => {
    const task = blueprint.tasks.find((t) => t.id === id);
    const terms = (task?.terms ?? []).map((t) => (typeof t === 'string' ? t : t.term).toLowerCase());
    for (const phrase of phrases) {
      expect(
        terms.some((term) => term.includes(phrase.toLowerCase())),
        `task ${id} has no term containing "${phrase}"`,
      ).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
pnpm test tests/unit/blueprint.test.ts
```

Expected: FAIL with `ENOENT: no such file or directory` for `content/exam/blueprint.yaml`.

- [ ] **Step 3: Fetch the exam guide pages**

Print today's date first; it is the fetch date and becomes every `verified_on`:

```bash
date +%F
```

Then fetch these five pages with WebFetch, asking for each task statement's title and its "Knowledge of" and "Skills in" lines word for word:

- https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html (domain names and weights under "Content Outline")
- https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html
- https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html
- https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html
- https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html

The file in Step 4 was written from these pages on 2026-10-09.
Compare each task's `text` and `terms` with what the pages say today, and change the file wherever a page differs, by these rules:

- `text` is the task statement's title without its "Task Statement N.N:" prefix, keeping its final period.
- `terms` holds every AWS service, feature, tool, program, plan or named concept that the task's "Knowledge of" and "Skills in" lines name, including those in parentheses or after "for example".
- Copy each term with the page's spelling and capitalization, one term per entry, and leave out generic phrases such as "Aspects of cloud economics" or "credential storage".
- The pages write nested parentheses as square brackets; write `Name [ABBR]` as `Name (ABBR)`, the glossary's form.
- When an abbreviation sits inside a phrase, write the short phrase: "improved environmental, social, and governance [ESG] performance" becomes `improved ESG performance`.
- Quote every id and date (`id: "1.1"`, `verified_on: "2026-10-09"`), so YAML never reads them as numbers.

- [ ] **Step 4: Write `content/exam/blueprint.yaml`**

```yaml
# The CLF-C02 exam blueprint: domains, weights and the 19 task statements, with the terms each task names (spec 2.3).
# Copied from the exam guide pages below; re-check them and refresh every verified_on at least every 180 days (rule R13).
# Each term is an AWS service, feature, tool, program, plan or named concept from the task's "Knowledge of" and "Skills in" lines, in the page's spelling.
exam: CLF-C02
guide:
  url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html"
  verified_on: "2026-10-09"
domains:
  - id: "1"
    name: Cloud Concepts
    weight: 24
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html"
    verified_on: "2026-10-09"
  - id: "2"
    name: Security and Compliance
    weight: 30
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html"
    verified_on: "2026-10-09"
  - id: "3"
    name: Cloud Technology and Services
    weight: 34
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html"
    verified_on: "2026-10-09"
  - id: "4"
    name: "Billing, Pricing, and Support"
    weight: 12
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html"
    verified_on: "2026-10-09"
tasks:
  - id: "1.1"
    text: Define the benefits of the AWS Cloud.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html"
    verified_on: "2026-10-09"
    terms:
      - global infrastructure
      - speed of deployment
      - global reach
      - high availability
      - elasticity
      - agility
  - id: "1.2"
    text: Identify design principles of the AWS Cloud.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html"
    verified_on: "2026-10-09"
    terms:
      - AWS Well-Architected Framework
      - operational excellence
      - security
      - reliability
      - performance efficiency
      - cost optimization
      - sustainability
  - id: "1.3"
    text: Understand the benefits of and strategies for migration to the AWS Cloud.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html"
    verified_on: "2026-10-09"
    terms:
      - AWS Cloud Adoption Framework (AWS CAF)
      - reduced business risk
      - improved ESG performance
      - increased revenue
      - increased operational efficiency
      - database replication
  - id: "1.4"
    text: Understand concepts of cloud economics.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain1.html"
    verified_on: "2026-10-09"
    terms:
      - fixed costs
      - variable costs
      - Bring Your Own License (BYOL)
      - included licenses
      - rightsizing
      - economies of scale
  - id: "2.1"
    text: Understand the AWS shared responsibility model.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html"
    verified_on: "2026-10-09"
    terms:
      - AWS shared responsibility model
      - Amazon RDS
      - AWS Lambda
      - Amazon EC2
  - id: "2.2"
    text: Understand AWS Cloud security, governance, and compliance concepts.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html"
    verified_on: "2026-10-09"
    terms:
      - encryption
      - AWS Artifact
      - AWS compliance
      - Amazon Inspector
      - AWS Security Hub
      - Amazon GuardDuty
      - AWS Shield
      - encryption in transit
      - encryption at rest
      - Amazon CloudWatch
      - AWS CloudTrail
      - AWS Config
      - access reports
  - id: "2.3"
    text: Identify AWS access management capabilities.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html"
    verified_on: "2026-10-09"
    terms:
      - AWS Identity and Access Management (IAM)
      - root user
      - principle of least privilege
      - AWS IAM Identity Center
      - access keys
      - password policies
      - AWS Secrets Manager
      - AWS Systems Manager
      - multi-factor authentication (MFA)
      - cross-account IAM roles
      - custom policies
      - managed policies
      - federated
  - id: "2.4"
    text: Identify components and resources for security.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain2.html"
    verified_on: "2026-10-09"
    terms:
      - AWS WAF
      - AWS Firewall Manager
      - AWS Shield
      - Amazon GuardDuty
      - AWS Marketplace
      - AWS Knowledge Center
      - AWS Security Center
      - AWS Security Blog
      - AWS Trusted Advisor
  - id: "3.1"
    text: Define methods of deploying and operating in the AWS Cloud.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html"
    verified_on: "2026-10-09"
    terms:
      - programmatic access
      - APIs
      - SDKs
      - CLI
      - AWS Management Console
      - infrastructure as code (IaC)
      - cloud
      - hybrid
      - on-premises
  - id: "3.2"
    text: Define the AWS global infrastructure.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html"
    verified_on: "2026-10-09"
    terms:
      - AWS Regions
      - Availability Zones
      - edge locations
      - high availability
      - single points of failure
      - disaster recovery
      - business continuity
      - low latency
      - data sovereignty
  - id: "3.3"
    text: Identify AWS compute services.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html"
    verified_on: "2026-10-09"
    terms:
      - Amazon EC2 instance types
      - compute optimized
      - storage optimized
      - Amazon Elastic Container Service (Amazon ECS)
      - Amazon Elastic Kubernetes Service (Amazon EKS)
      - AWS Fargate
      - AWS Lambda
      - auto scaling
      - elasticity
      - load balancers
  - id: "3.4"
    text: Identify AWS database services.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html"
    verified_on: "2026-10-09"
    terms:
      - EC2 hosted databases
      - AWS managed databases
      - relational databases
      - Amazon RDS
      - Amazon Aurora
      - NoSQL databases
      - Amazon DynamoDB
      - memory-based databases
      - Amazon ElastiCache
      - AWS Database Migration Service (AWS DMS)
      - AWS Schema Conversion Tool (AWS SCT)
  - id: "3.5"
    text: Identify AWS network services.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html"
    verified_on: "2026-10-09"
    terms:
      - VPC
      - subnets
      - gateways
      - network ACLs
      - security groups
      - Amazon Inspector
      - Amazon Route 53
      - AWS VPN
      - AWS Direct Connect
  - id: "3.6"
    text: Identify AWS storage services.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html"
    verified_on: "2026-10-09"
    terms:
      - object storage
      - Amazon S3 storage classes
      - block storage
      - Amazon Elastic Block Store (Amazon EBS)
      - instance store
      - Amazon Elastic File System (Amazon EFS)
      - Amazon FSx
      - AWS Storage Gateway
      - lifecycle policies
      - AWS Backup
  - id: "3.7"
    text: Identify AWS artificial intelligence and machine learning (AI/ML) services and analytics services.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html"
    verified_on: "2026-10-09"
    terms:
      - Amazon SageMaker AI
      - Amazon Lex
      - Amazon Athena
      - Amazon Kinesis
      - AWS Glue
      - Amazon Quick Sight
  - id: "3.8"
    text: Identify services from other in-scope AWS service categories.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain3.html"
    verified_on: "2026-10-09"
    terms:
      - Amazon EventBridge
      - Amazon Simple Notification Service (Amazon SNS)
      - Amazon Simple Queue Service (Amazon SQS)
      - Amazon Connect
      - Amazon Simple Email Service (Amazon SES)
      - AWS Support
      - AWS CodeBuild
      - AWS CodePipeline
      - AWS X-Ray
      - Amazon AppStream 2.0
      - Amazon WorkSpaces
      - Amazon WorkSpaces Secure Browser
      - AWS Amplify
      - AWS IoT Core
  - id: "4.1"
    text: Compare AWS pricing models.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html"
    verified_on: "2026-10-09"
    terms:
      - On-Demand Instances
      - Reserved Instances
      - Spot Instances
      - AWS Savings Plans
      - Dedicated Hosts
      - Dedicated Instances
      - Capacity Reservations
      - Reserved Instance flexibility
      - AWS Organizations
      - incoming data transfer costs
      - outgoing data transfer costs
  - id: "4.2"
    text: Understand resources for billing, budget, and cost management.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html"
    verified_on: "2026-10-09"
    terms:
      - AWS Organizations
      - AWS cost allocation tags
      - AWS Budgets
      - AWS Cost Explorer
      - AWS Pricing Calculator
      - consolidated billing
      - AWS Cost and Usage Report
  - id: "4.3"
    text: Identify AWS technical resources and AWS Support options.
    url: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html"
    verified_on: "2026-10-09"
    terms:
      - AWS Support plans
      - AWS Partner Network
      - independent software vendors
      - system integrators
      - AWS Support Center
      - AWS whitepapers
      - AWS Prescriptive Guidance
      - AWS Knowledge Center
      - AWS re:Post
      - Basic Support
      - AWS Business Support+
      - AWS Enterprise Support
      - AWS Unified Operations
      - AWS Trusted Advisor
      - AWS Health Dashboard
      - AWS Health API
      - AWS Trust and Safety team
      - AWS Partners
      - AWS Marketplace
      - partner training and certification
      - partner events
      - partner volume discounts
      - AWS Professional Services
      - AWS solutions architects
```

If `date +%F` printed a later day than 2026-10-09 in Step 3, stamp that day on every source, since you checked them today:

```bash
perl -pi -e "s/verified_on: \"2026-10-09\"/verified_on: \"$(date +%F)\"/" content/exam/blueprint.yaml
```

- [ ] **Step 5: Run the test and the validator**

```bash
pnpm test tests/unit/blueprint.test.ts
```

Expected: PASS, 12 tests.

```bash
pnpm content:validate --all 2>&1 | grep blueprint ; echo done
```

Expected: only `done`, so the file passes R1 (schema) and R13 (sources).

- [ ] **Step 6: Commit**

```bash
git add content/exam/blueprint.yaml tests/unit/blueprint.test.ts
git commit -m "Add the CLF-C02 exam blueprint" -m "Four domains weighted 24/30/34/12 and all 19 task statements with the terms each names, copied from the exam guide pages with their URLs and verified_on dates."
```

---

## Task 14: Registry library and `pnpm content:concepts`

The registry tools seed `content/concepts.yaml` from the note tags, hand each module's seeded entries to an agent, check what the agent returns, and merge it (spec 2.4).
The command always reads the raw file with `ctx.read(CONCEPTS_FILE)`, because `ctx.concepts` drops the seeded entries that still fail the schema.

**Files:**
- Create: `scripts/content/lib/glossary.ts`, `scripts/content/lib/registry.ts`, `scripts/content/concepts.ts`
- Test: `tests/unit/registry.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/registry.test.ts`:

```ts
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { CONCEPTS_FILE, type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { parseGlossary, termForms } from '../../scripts/content/lib/glossary.ts';
import {
  applyResults,
  checkResult,
  namesFromGlossary,
  pendingFor,
  type RawConcept,
  REGISTRY_HEADER,
  RegistryResult,
  readConcepts,
  seedEntries,
  stringifyConcepts,
} from '../../scripts/content/lib/registry.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const LESSON = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const HOME = 'm01/what-a-bakery-cloud-is';

/** The fixture tree with two extra tags on the lesson, one of them defined in the glossary, seeded into the registry. */
function seededFixture(): { ctx: Context; seeded: RawConcept[] } {
  const root = makeFixtureRoot();
  const lesson = readFileSync(join(root, LESSON), 'utf8');
  writeFileSync(
    join(root, LESSON),
    lesson.replace(
      '  - per-minute-rental\n',
      '  - per-minute-rental\n  - sourdough-starter\n  - rye-flour-blend\n',
    ),
  );
  appendFileSync(
    join(root, 'resources', 'glossary.md'),
    '- **Sourdough starter (levain)** ([Module 1, What a Bakery Cloud Is](01-baking-basics/01-what-a-bakery-cloud-is.md)): A live culture that leavens bread.\n',
  );
  const ctx = loadContext(root, { today: FIXTURE_TODAY });
  const names = namesFromGlossary(parseGlossary(ctx.read('resources/glossary.md') ?? ''));
  return { ctx, seeded: seedEntries(readConcepts(ctx.read(CONCEPTS_FILE)), ctx.notes, names) };
}

describe('parseGlossary and termForms', () => {
  it('reads every ref, even when a label holds parentheses, as a repo path', () => {
    const text = [
      '# Glossary',
      '',
      '## P',
      '',
      '- **Proofing cabinet (proofer)** ([Module 1, Ovens (and Racks) at Scale](01-baking-basics/02-ovens.md); [Module 2, Night Shifts](02-night-shifts/01-night-shifts.md)): A warm box where dough rises (slowly) before baking.',
    ].join('\n');
    expect(parseGlossary(text)).toEqual([
      {
        id: 'proofing-cabinet-proofer',
        term: 'Proofing cabinet (proofer)',
        definition: 'A warm box where dough rises (slowly) before baking.',
        refs: [
          { label: 'Module 1, Ovens (and Racks) at Scale', path: 'resources/01-baking-basics/02-ovens.md' },
          { label: 'Module 2, Night Shifts', path: 'resources/02-night-shifts/01-night-shifts.md' },
        ],
      },
    ]);
  });

  it('splits X (Y) terms and drops forms shorter than 3 characters', () => {
    expect(termForms('Proofing cabinet (proofer)')).toEqual([
      'Proofing cabinet (proofer)',
      'Proofing cabinet',
      'proofer',
    ]);
    expect(termForms('Oven zone (OZ)')).toEqual(['Oven zone (OZ)', 'Oven zone']);
    expect(termForms('Shared kitchen')).toEqual(['Shared kitchen']);
  });
});

describe('seedEntries and pendingFor', () => {
  it('seeds each unregistered tag once, named from the glossary or in sentence case', () => {
    const { ctx, seeded } = seededFixture();
    expect(seeded.map((c) => c.id)).toEqual([
      'shared-kitchen',
      'per-minute-rental',
      'sourdough-starter',
      'rye-flour-blend',
    ]);
    expect(seeded.slice(2)).toEqual([
      { id: 'sourdough-starter', name: 'Sourdough starter', home: HOME, anchor: '' },
      { id: 'rye-flour-blend', name: 'Rye flour blend', home: HOME, anchor: '' },
    ]);
    expect(seedEntries(seeded, ctx.notes, new Map())).toEqual(seeded);
  });

  it('lists the pending entries of a module with the notes that list each tag', () => {
    const { ctx, seeded } = seededFixture();
    expect(pendingFor(1, seeded, ctx.notes)).toEqual([
      { id: 'sourdough-starter', name: 'Sourdough starter', home: HOME, listedIn: [HOME] },
      { id: 'rye-flour-blend', name: 'Rye flour blend', home: HOME, listedIn: [HOME] },
    ]);
    expect(pendingFor(2, seeded, ctx.notes)).toEqual([]);
  });
});

describe('stringifyConcepts', () => {
  it('writes a header, a fixed key order and flow-style lists that parse back to the same entries', () => {
    const entries: RawConcept[] = [
      {
        aliases: ['shared-oven'],
        confusableWith: ['per-minute-rental'],
        tasks: ['1.1', '3.3'],
        anchor: 'shared-kitchen',
        home: HOME,
        name: 'Shared kitchen',
        id: 'shared-kitchen',
      },
      { id: 'bakery-mascot', name: 'Bakery mascot: Crumb', home: HOME, anchor: '', tasks: [], tested: false },
    ];
    const text = stringifyConcepts(entries);
    expect(text.split('\n')[0]).toBe(REGISTRY_HEADER);
    expect(parseYaml(text)).toEqual(entries);
    expect(Object.keys(parseYaml(text)[0])).toEqual([
      'id',
      'name',
      'home',
      'anchor',
      'tasks',
      'confusableWith',
      'aliases',
    ]);
    expect(text).toMatch(/^ +tasks: \[.*"1\.1".*\]$/m);
    expect(readConcepts(text)).toEqual(entries);
  });

  it('reads no file or a blank file as an empty registry, and rejects anything but a list', () => {
    expect(readConcepts(null)).toEqual([]);
    expect(readConcepts(`${REGISTRY_HEADER}\n`)).toEqual([]);
    expect(() => readConcepts('id: shared-kitchen\n')).toThrow('must be a YAML list');
  });
});

describe('checkResult', () => {
  const filled = { name: 'Sourdough starter', home: HOME, anchor: 'shared-kitchen', tasks: ['1.1'] };

  it('accepts a result that fills every pending entry of its module', () => {
    const { ctx, seeded } = seededFixture();
    const result = RegistryResult.parse({
      module: 1,
      concepts: [
        { id: 'sourdough-starter', ...filled, confusableWith: ['shared-kitchen'] },
        {
          id: 'rye-flour-blend',
          name: 'Rye flour blend',
          home: HOME,
          anchor: 'paying-by-the-minute',
          tasks: [],
          tested: false,
        },
      ],
      aliases: [{ alias: 'rye-flour-blend', of: 'sourdough-starter', reason: 'Both name the same culture.' }],
    });
    expect(checkResult(result, seeded, ctx.notes)).toEqual([]);
  });

  it('reports a wrong anchor, a home outside listedIn, and a missing or extra entry', () => {
    const { ctx, seeded } = seededFixture();
    const result = RegistryResult.parse({
      module: 1,
      concepts: [
        { id: 'sourdough-starter', ...filled, anchor: 'objectives' },
        { id: 'shared-kitchen', ...filled, name: 'Shared kitchen', home: 'm01/nowhere' },
      ],
    });
    expect(checkResult(result, seeded, ctx.notes)).toEqual([
      'rye-flour-blend is pending for module 1 but missing from the result',
      'shared-kitchen is not pending for module 1',
      "[sourdough-starter] anchor 'objectives' is not an H3 under ## Notes in m01/what-a-bakery-cloud-is",
      '[shared-kitchen] home m01/nowhere is not one of the notes that list it: m01/what-a-bakery-cloud-is',
    ]);
  });

  it('reports an unknown id in the alias-only result', () => {
    const { ctx, seeded } = seededFixture();
    const result = RegistryResult.parse({
      concepts: [],
      aliases: [{ alias: 'rye-bread', of: 'shared-kitchen', reason: 'x' }],
    });
    expect(checkResult(result, seeded, ctx.notes)).toEqual([
      "alias rye-bread of shared-kitchen: 'rye-bread' is not a registered concept",
    ]);
  });
});

describe('applyResults', () => {
  const entry = (id: string, extra: Partial<RawConcept> = {}): RawConcept => ({
    id,
    name: id,
    home: HOME,
    anchor: 'shared-kitchen',
    tasks: ['1.1'],
    ...extra,
  });

  it('fills an entry in place and keeps its aliases', () => {
    const entries = [
      entry('a'),
      { id: 'b', name: 'B', home: HOME, anchor: '', aliases: ['old-b'] },
      entry('c'),
    ];
    const result = RegistryResult.parse({
      module: 1,
      concepts: [
        {
          id: 'b',
          name: 'Bee',
          home: HOME,
          anchor: 'paying-by-the-minute',
          tasks: [],
          tested: false,
          confusableWith: [],
        },
      ],
    });
    expect(applyResults(entries, [result]).entries).toEqual([
      entry('a'),
      {
        id: 'b',
        name: 'Bee',
        home: HOME,
        anchor: 'paying-by-the-minute',
        tasks: [],
        tested: false,
        aliases: ['old-b'],
      },
      entry('c'),
    ]);
    const unknown = RegistryResult.parse({ concepts: [entry('zz')] });
    expect(() => applyResults(entries, [unknown])).toThrow('zz is not in content/concepts.yaml');
  });

  it('merges an alias chain a into b into c and rewrites the confusables that pointed at them', () => {
    const entries = [
      entry('a'),
      entry('b'),
      entry('c', { confusableWith: ['a'] }),
      entry('d', { confusableWith: ['a', 'b'] }),
    ];
    const result = RegistryResult.parse({
      concepts: [],
      aliases: [
        { alias: 'a', of: 'b', reason: 'same idea' },
        { alias: 'b', of: 'c', reason: 'same idea again' },
        { alias: 'a', of: 'c', reason: 'already merged' },
      ],
    });
    expect(applyResults(entries, [result])).toEqual({
      entries: [entry('c', { aliases: ['b', 'a'] }), entry('d', { confusableWith: ['c'] })],
      log: ['a is now an alias of b: same idea', 'b is now an alias of c: same idea again'],
    });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

```bash
pnpm test tests/unit/registry.test.ts
```

Expected: FAIL, because `scripts/content/lib/glossary.ts` and `scripts/content/lib/registry.ts` do not exist.

- [ ] **Step 3: Implement `scripts/content/lib/glossary.ts`**

Task 19 appends `termMatcher` to this file.

```ts
import { posix } from 'node:path';
import { slugify } from './markdown.ts';

/** One entry of resources/glossary.md; each ref path is repo-relative, like `resources/03-x/02-y.md`. */
export interface GlossaryEntry {
  id: string;
  term: string;
  definition: string;
  refs: { label: string; path: string }[];
}

/** `- **Term** ([label](link); [label](link)): definition`; the lazy refs group stops at the first "): ", so labels may hold parentheses. */
const ENTRY = /^- \*\*(.+?)\*\* \((.+?)\): (.+)$/;
const REF = /\[([^\]]+)\]\(([^)]+)\)/g;
const ABBREVIATED = /^(.+?)\s*\(([^()]+)\)$/;

export function parseGlossary(text: string, path = 'resources/glossary.md'): GlossaryEntry[] {
  const dir = posix.dirname(path);
  const entries: GlossaryEntry[] = [];
  for (const line of text.split('\n')) {
    const match = ENTRY.exec(line);
    if (!match) continue;
    const term = match[1] ?? '';
    const refs = [...(match[2] ?? '').matchAll(REF)].map((ref) => ({
      label: ref[1] ?? '',
      path: posix.normalize(posix.join(dir, ref[2] ?? '')),
    }));
    entries.push({ id: slugify(term), term, definition: match[3] ?? '', refs });
  }
  return entries;
}

/** The ways a note may write a term: `X (Y)` also matches as X and as Y; forms shorter than 3 characters are dropped. */
export function termForms(term: string): string[] {
  const match = ABBREVIATED.exec(term);
  if (!match) return [term];
  const parts = [match[1] ?? '', match[2] ?? '']
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  return [term, ...parts];
}
```

- [ ] **Step 4: Implement `scripts/content/lib/registry.ts`**

```ts
import { Document, parse as parseYaml, visit } from 'yaml';
import { z } from 'zod';
import { ConceptId, ModuleNumber, NoteId, Slug, TaskId } from '../../../schemas/common.ts';
import { CONCEPTS_FILE, type LessonNote, type Note } from './context.ts';
import { type GlossaryEntry, termForms } from './glossary.ts';
import { notesAnchors, slugify } from './markdown.ts';

/** A registry entry as content/concepts.yaml holds it before the schema's checks: a seeded entry has an empty anchor and no tasks. */
export interface RawConcept {
  id: string;
  name: string;
  home: string;
  anchor: string;
  tasks?: string[];
  tested?: boolean;
  confusableWith?: string[];
  aliases?: string[];
  splitFrom?: string;
}

/** A seeded entry waiting for the registry-writer, with every lesson note that lists its tag. */
export interface PendingEntry {
  id: string;
  name: string;
  home: string;
  listedIn: string[];
}

/** What a registry-writer agent returns in .results/registry/mNN.json; the alias-only review file has no module. */
export const RegistryResult = z.strictObject({
  module: ModuleNumber.optional(),
  concepts: z.array(
    z.strictObject({
      id: ConceptId,
      name: z.string().min(1),
      home: NoteId,
      anchor: Slug,
      tasks: z.array(TaskId).max(3),
      tested: z.literal(false).optional(),
      confusableWith: z.array(ConceptId).max(3).optional(),
    }),
  ),
  aliases: z
    .array(z.strictObject({ alias: ConceptId, of: ConceptId, reason: z.string().min(1) }))
    .default([]),
});
export type RegistryResult = z.infer<typeof RegistryResult>;

export const REGISTRY_HEADER =
  '# The one concept registry (spec 2.4). Edit it by hand or with pnpm content:concepts.';
const KEY_ORDER = [
  'id',
  'name',
  'home',
  'anchor',
  'tasks',
  'tested',
  'confusableWith',
  'aliases',
  'splitFrom',
] as const;

const isLesson = (note: Note): note is LessonNote => note.kind === 'lesson';
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const sentenceCase = (tag: string): string => {
  const words = tag.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Reads the raw registry, keeping entries that the schema would still reject; no file or a blank file is an empty registry. */
export function readConcepts(text: string | null): RawConcept[] {
  if (text === null || text.trim() === '') return [];
  const data: unknown = parseYaml(text);
  if (data === null) return [];
  if (!Array.isArray(data)) throw new Error(`${CONCEPTS_FILE} must be a YAML list`);
  for (const [i, entry] of data.entries()) {
    if (!isRecord(entry) || typeof entry.id !== 'string') {
      throw new Error(`${CONCEPTS_FILE}: entry ${i + 1} has no id`);
    }
  }
  return data as RawConcept[];
}

/** Writes the registry with a fixed key order, one block per concept and every list in flow style. */
export function stringifyConcepts(entries: readonly RawConcept[]): string {
  const ordered = entries.map((entry) => {
    const out: Record<string, unknown> = {};
    for (const key of KEY_ORDER) {
      if (entry[key] !== undefined) out[key] = entry[key];
    }
    return out;
  });
  const doc = new Document(ordered);
  visit(doc, {
    Seq(_, node, path) {
      if (path.length > 1) node.flow = true;
    },
  });
  return `${REGISTRY_HEADER}\n${doc.toString({ lineWidth: 0 })}`;
}

/** Display names keyed by tag: every form of every glossary term, slugified; the first term to claim a slug wins. */
export function namesFromGlossary(entries: readonly GlossaryEntry[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const entry of entries) {
    for (const form of termForms(entry.term)) {
      const id = slugify(form);
      if (!names.has(id)) names.set(id, form);
    }
  }
  return names;
}

/** Appends one entry per unregistered tag, homed at the first lesson that lists it, with an empty anchor and no tasks (spec 2.4). */
export function seedEntries(
  existing: readonly RawConcept[],
  notes: readonly Note[],
  names: ReadonlyMap<string, string>,
): RawConcept[] {
  const known = new Set(existing.flatMap((entry) => [entry.id, ...(entry.aliases ?? [])]));
  const out = [...existing];
  const lessons = notes.filter(isLesson).sort((a, b) => a.module - b.module || a.number - b.number);
  for (const note of lessons) {
    for (const tag of note.fm?.concepts ?? []) {
      if (known.has(tag)) continue;
      known.add(tag);
      out.push({ id: tag, name: names.get(tag) ?? sentenceCase(tag), home: note.id, anchor: '' });
    }
  }
  return out;
}

const listedIn = (id: string, lessons: readonly LessonNote[]): string[] =>
  lessons.filter((note) => note.fm?.concepts.includes(id)).map((note) => note.id);

/** The seeded entries homed in module NN that still have no anchor. */
export function pendingFor(
  module: number,
  entries: readonly RawConcept[],
  notes: readonly Note[],
): PendingEntry[] {
  const prefix = `m${String(module).padStart(2, '0')}/`;
  const lessons = notes.filter(isLesson);
  return entries
    .filter((entry) => entry.home.startsWith(prefix) && entry.anchor === '')
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      home: entry.home,
      listedIn: listedIn(entry.id, lessons),
    }));
}

/** Problems that would stop a result from applying cleanly; an empty list means the result is ready. */
export function checkResult(
  result: RegistryResult,
  entries: readonly RawConcept[],
  notes: readonly Note[],
): string[] {
  const problems: string[] = [];
  const registered = new Set(entries.map((entry) => entry.id));
  const lessons = notes.filter(isLesson);

  if (result.module !== undefined) {
    const pending = new Set(pendingFor(result.module, entries, notes).map((entry) => entry.id));
    const counts = new Map<string, number>();
    for (const c of result.concepts) counts.set(c.id, (counts.get(c.id) ?? 0) + 1);
    for (const id of pending) {
      if (!counts.has(id)) {
        problems.push(`${id} is pending for module ${result.module} but missing from the result`);
      }
    }
    for (const [id, count] of counts) {
      if (!pending.has(id)) problems.push(`${id} is not pending for module ${result.module}`);
      if (count > 1) problems.push(`${id} appears ${count} times`);
    }
  }

  for (const c of result.concepts) {
    const homes = listedIn(c.id, lessons);
    const home = lessons.find((note) => note.id === c.home);
    if (home === undefined || !homes.includes(c.home)) {
      problems.push(
        `[${c.id}] home ${c.home} is not one of the notes that list it: ${homes.join(', ') || 'none'}`,
      );
    } else if (!notesAnchors(home.headings).includes(c.anchor)) {
      problems.push(`[${c.id}] anchor '${c.anchor}' is not an H3 under ## Notes in ${c.home}`);
    }
    if (c.tested !== false && c.tasks.length === 0) {
      problems.push(`[${c.id}] a tested concept needs 1 to 3 tasks`);
    }
    for (const other of c.confusableWith ?? []) {
      if (other === c.id || !registered.has(other)) {
        problems.push(`[${c.id}] confusableWith '${other}' is not another registered concept`);
      }
    }
  }

  for (const a of result.aliases) {
    for (const id of [a.alias, a.of]) {
      if (!registered.has(id)) {
        problems.push(`alias ${a.alias} of ${a.of}: '${id}' is not a registered concept`);
      }
    }
    if (a.alias === a.of) problems.push(`alias ${a.alias} points at itself`);
  }
  return problems;
}

/**
 * Fills entries from the results, then merges aliases (resolving chains such as a into b into c),
 * then rewrites every confusableWith through the merges. Entries keep their positions.
 */
export function applyResults(
  entries: readonly RawConcept[],
  results: readonly RegistryResult[],
): { entries: RawConcept[]; log: string[] } {
  const byId = new Map(entries.map((entry) => [entry.id, entry] as const));
  for (const result of results) {
    for (const c of result.concepts) {
      const old = byId.get(c.id);
      if (old === undefined) throw new Error(`${c.id} is not in ${CONCEPTS_FILE}`);
      byId.set(c.id, {
        id: c.id,
        name: c.name,
        home: c.home,
        anchor: c.anchor,
        tasks: [...c.tasks],
        ...(c.tested === false ? { tested: false } : {}),
        ...(c.confusableWith !== undefined && c.confusableWith.length > 0
          ? { confusableWith: [...c.confusableWith] }
          : {}),
        ...(old.aliases === undefined ? {} : { aliases: old.aliases }),
        ...(old.splitFrom === undefined ? {} : { splitFrom: old.splitFrom }),
      });
    }
  }

  const mergedInto = new Map<string, string>();
  const resolve = (id: string): string => {
    let current = id;
    for (let next = mergedInto.get(current); next !== undefined; next = mergedInto.get(current)) {
      current = next;
    }
    return current;
  };
  const log: string[] = [];
  for (const result of results) {
    for (const { alias, of, reason } of result.aliases) {
      const gone = resolve(alias);
      const survivor = resolve(of);
      if (gone === survivor) continue;
      const goneEntry = byId.get(gone);
      const survivorEntry = byId.get(survivor);
      if (goneEntry === undefined || survivorEntry === undefined) {
        throw new Error(`cannot make ${alias} an alias of ${of}: unknown concept`);
      }
      byId.delete(gone);
      const aliases = [...new Set([...(survivorEntry.aliases ?? []), gone, ...(goneEntry.aliases ?? [])])];
      byId.set(survivor, { ...survivorEntry, aliases });
      mergedInto.set(gone, survivor);
      log.push(`${gone} is now an alias of ${survivor}: ${reason}`);
    }
  }

  const out: RawConcept[] = [];
  for (const entry of byId.values()) {
    const { confusableWith, ...rest } = entry;
    const targets = [...new Set((confusableWith ?? []).map(resolve))].filter((id) => id !== entry.id);
    out.push(targets.length > 0 ? { ...rest, confusableWith: targets } : rest);
  }
  return { entries: out, log };
}
```

`checkResult` also reports a tested concept with no task, so an agent fixes that while it loops on `--check`, before R1 would reject it after `--apply`.

- [ ] **Step 5: Run the tests to see them pass**

```bash
pnpm test tests/unit/registry.test.ts
```

Expected: PASS, 11 tests.

- [ ] **Step 6: Write the command `scripts/content/concepts.ts`**

```ts
/**
 * pnpm content:concepts: seeds content/concepts.yaml from the note tags, lists a module's pending entries,
 * and checks and applies the registry-writer results (spec 2.4).
 *   --seed            add every unregistered tag with an empty anchor
 *   --pending NN      print module NN's pending entries as JSON
 *   --check <file>    check one result file against the registry and the notes
 *   --apply <dir>     check, then apply every *.json result in <dir>, sorted by name
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CONCEPTS_FILE, loadContext } from './lib/context.ts';
import { parseGlossary } from './lib/glossary.ts';
import {
  applyResults,
  checkResult,
  namesFromGlossary,
  pendingFor,
  type RawConcept,
  RegistryResult,
  readConcepts,
  seedEntries,
  stringifyConcepts,
} from './lib/registry.ts';

const USAGE = 'usage: pnpm content:concepts --seed | --pending NN | --check <file> | --apply <dir>';
const root = resolve(import.meta.dirname, '..', '..');
const ctx = loadContext(root);
const entries = readConcepts(ctx.read(CONCEPTS_FILE));
const [mode, arg] = process.argv.slice(2);

const write = (next: readonly RawConcept[]): void =>
  writeFileSync(join(root, CONCEPTS_FILE), stringifyConcepts(next));

/** Parses one result file, returning the result or the reasons it is not one. */
function readResult(file: string): { result: RegistryResult | null; problems: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return { result: null, problems: [`${file}: ${error instanceof Error ? error.message : String(error)}`] };
  }
  const parsed = RegistryResult.safeParse(data);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${file}: ${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`,
    );
    return { result: null, problems };
  }
  return {
    result: parsed.data,
    problems: checkResult(parsed.data, entries, ctx.notes).map((p) => `${file}: ${p}`),
  };
}

function fail(lines: readonly string[]): never {
  for (const line of lines) console.error(line);
  process.exit(1);
}

if (mode === '--seed') {
  const names = namesFromGlossary(parseGlossary(ctx.read('resources/glossary.md') ?? ''));
  const next = seedEntries(entries, ctx.notes, names);
  write(next);
  console.log(`${next.length - entries.length} seeded, ${next.length} in the registry`);
} else if (mode === '--pending' && arg !== undefined && /^(?:0?[1-9]|1[0-3])$/.test(arg)) {
  const module = Number(arg);
  console.log(JSON.stringify({ module, entries: pendingFor(module, entries, ctx.notes) }, null, 2));
} else if (mode === '--check' && arg !== undefined) {
  const { result, problems } = readResult(arg);
  if (result === null || problems.length > 0) fail(problems);
  console.log(`OK ${arg}: ${result.concepts.length} concepts, ${result.aliases.length} aliases`);
} else if (mode === '--apply' && arg !== undefined) {
  const files = readdirSync(arg)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(arg, name));
  const read = files.map(readResult);
  const problems = read.flatMap((r) => r.problems);
  if (problems.length > 0) fail(problems);
  const results = read.flatMap((r) => (r.result === null ? [] : [r.result]));
  const { entries: next, log } = applyResults(entries, results);
  write(next);
  for (const line of log) console.log(line);
  const filled = results.reduce((total, r) => total + r.concepts.length, 0);
  console.log(
    `${files.length} results: ${filled} concepts filled, ${log.length} aliases merged, ${next.length} in the registry`,
  );
} else {
  fail([USAGE]);
}
```

`--apply` checks every result before it writes anything, so a bad file never leaves the registry half merged.

- [ ] **Step 7: Smoke-run the command**

```bash
pnpm --silent content:concepts --pending 11
```

Expected, because `content/concepts.yaml` does not exist yet:

```json
{
  "module": 11,
  "entries": []
}
```

```bash
pnpm --silent content:concepts ; echo "exit $?"
```

Expected: `usage: pnpm content:concepts --seed | --pending NN | --check <file> | --apply <dir>`, then `exit 1`.

- [ ] **Step 8: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add scripts/content/lib/glossary.ts scripts/content/lib/registry.ts scripts/content/concepts.ts tests/unit/registry.test.ts
git commit -m "Add the concept registry tools" -m "pnpm content:concepts seeds the registry from note tags, lists a module's pending entries, and checks and applies registry-writer results, merging aliases and rewriting confusables."
```

---

## Task 15: Seed and complete the registry with agents

Thirteen `registry-writer` agents, one per module, fill the seeded entries in parallel, each writing only its own result file, and one reviewer then looks for duplicates across modules (spec 2.7).
`pnpm content:concepts --apply` merges the results in one step, so `content/concepts.yaml` has a single writer.

**Files:**
- Create: `content/concepts.yaml` (seeded, then completed), `agents/registry-writer.md`
- Not committed: `.results/registry/m01.json` to `m13.json` and `zz-aliases.json` (Task 1 ignores `.results/`)

- [ ] **Step 1: Seed the registry**

```bash
pnpm content:concepts --seed && head -9 content/concepts.yaml
```

Expected:

```
430 seeded, 430 in the registry
# The one concept registry (spec 2.4). Edit it by hand or with pnpm content:concepts.
- id: client-server-model
  name: Client-server model
  home: m01/welcome-to-aws-cloud-practitioner-essentials
  anchor: ""
- id: coffee-shop-analogy
  name: Coffee shop analogy
  home: m01/welcome-to-aws-cloud-practitioner-essentials
```

Every seeded entry fails R1 until its anchor and tasks are filled, which is the point of the next steps.

- [ ] **Step 2: Write the agent prompt `agents/registry-writer.md`**

````markdown
---
name: registry-writer
version: 1
---

# Registry writer

You complete the seeded entries of one module in `content/concepts.yaml`, the one concept registry (spec 2.4).
You write a result file, and `pnpm content:concepts --apply` merges it, so you never edit `content/concepts.yaml` or a note yourself.

## Inputs

- Your module number `NN`, given in your task.
- The output of `pnpm --silent content:concepts --pending NN`, run from the repository root: JSON whose `entries` give each pending concept's `id`, seeded `name`, seeded `home` and `listedIn`, the lesson notes whose `concepts` frontmatter lists the tag.
- `content/exam/blueprint.yaml`, which holds the 19 exam task statements with their `text` and the `terms` the exam guide names.
- The notes themselves: note id `mNN/<slug>` is the file `resources/NN-<module-slug>/LL-<slug>.md`, and you read every note in `listedIn`.
- `content/concepts.yaml`, read-only, for the ids of other modules' concepts.

## What to decide for each entry

- **name:** the display name.
  Use the exam's current name for an AWS service, as the blueprint spells it (for example `Amazon Quick Sight` or `AWS IAM Identity Center`), and sentence case for an idea (`Pay-as-you-go pricing`).
- **home:** one of the entry's `listedIn` notes, the one that teaches the concept most fully.
- **anchor:** the slug of one H3 under `## Notes` in the home note, the section that teaches the concept.
  To build the slug, drop `*` and backticks, lowercase the heading, delete every character that is not a letter, digit, space or hyphen, trim, turn each run of spaces into one hyphen, and turn each run of hyphens into one.
  For example, `### Launch types for ECS and EKS: EC2 or Fargate` becomes `launch-types-for-ecs-and-eks-ec2-or-fargate`.
- **tasks:** 1 to 3 blueprint task ids that an exam question on the concept would test, most specific first, written as strings such as `"3.3"`.
- **tested:** leave it out for every concept an exam could ask about.
  Write `"tested": false` with `"tasks": []` only for course scaffolding that no exam could ask about, such as the course's coffee shop analogy.
- **confusableWith:** optional, up to 3 registered ids that an exam distractor would pair with the concept, such as two compute services for the same job.
  Write a pair only on the concept whose id sorts first alphabetically, so `aws-fargate` lists `aws-lambda` and `aws-lambda` does not list `aws-fargate`.
  You write only your own module's entries, so leave out a pair whose first id belongs to another module.

## Aliases

- Propose an alias only when two tags name exactly the same idea, such as one service tagged once by its full name and once by its short name.
- The survivor is the tag whose home note teaches the idea better, and the other tag becomes its alias.
- Never merge two different services, or a service with one of its features.
- Still fill the entry that becomes an alias in `concepts`, because the result must cover every pending entry.
- Each alias is `{ "alias": "<id that disappears>", "of": "<id that survives>", "reason": "<one line>" }`.

## Output

Write `.results/registry/mNN.json`, for example `.results/registry/m03.json`, in this shape, with `module` as a number:

```json
{
  "module": 3,
  "concepts": [
    {
      "id": "aws-lambda",
      "name": "AWS Lambda",
      "home": "m03/aws-lambda",
      "anchor": "what-lambda-is",
      "tasks": ["3.3", "2.1"]
    },
    {
      "id": "aws-fargate",
      "name": "AWS Fargate",
      "home": "m03/containers-and-orchestration-on-aws",
      "anchor": "launch-types-for-ecs-and-eks-ec2-or-fargate",
      "tasks": ["3.3"],
      "confusableWith": ["aws-lambda"]
    }
  ],
  "aliases": []
}
```

## Rules

- Read the notes yourself, and never guess an anchor from a concept's name.
- Use only anchors that exist in the home note and task ids that exist in the blueprint.
- Cover every pending entry of your module exactly once, and no other entry.
- Never edit `content/concepts.yaml`, a note, or any file outside `.results/registry/`.
- Run `pnpm --silent content:concepts --check .results/registry/mNN.json` and fix the file until it prints a line starting with `OK`.
````

```bash
pnpm content:validate --all 2>&1 | grep 'agents/' ; echo done
```

Expected: only `done`, so the prompt itself passes R8.

- [ ] **Step 3: Run the registry fill as a workflow**

Run this script with the Workflow tool, passing it as `script`; it is tool input, not a repo file.
The 13 fill agents write different files, so they need no worktree isolation.

```js
export const meta = {
  name: 'registry-fill',
  description: 'Fill the seeded concept registry: one registry-writer agent per module, then one cross-module alias review',
  phases: [
    { title: 'Fill', detail: '13 registry-writer agents, one per module, each writing .results/registry/mNN.json' },
    { title: 'Aliases', detail: 'one reviewer writes cross-module duplicates to .results/registry/zz-aliases.json' },
  ],
}

const REPO = '/Users/danielchahine/Programs/AWS Cloud Practitioner Essentials'
const MODULES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13']
const OK_LINE = {
  type: 'object',
  properties: { ok: { type: 'string', description: 'the line pnpm content:concepts --check printed, starting with OK' } },
  required: ['ok'],
}
const isOk = (r) => Boolean(r && typeof r.ok === 'string' && r.ok.startsWith('OK '))

phase('Fill')
const fills = await parallel(
  MODULES.map((nn) => () =>
    agent(
      [
        `You are the registry-writer for module ${nn} of the CCP Study repo at "${REPO}"; run every command from that folder.`,
        'Read agents/registry-writer.md in full and follow it exactly.',
        `1. Run: pnpm --silent content:concepts --pending ${nn}`,
        '2. Read content/exam/blueprint.yaml and every note named in a listedIn field.',
        `3. Write .results/registry/m${nn}.json with "module": ${Number(nn)}.`,
        `4. Run: pnpm --silent content:concepts --check .results/registry/m${nn}.json and fix the file until it prints a line starting with OK.`,
        'Never edit content/concepts.yaml, a note, or any file outside .results/registry/.',
        'Return the OK line.',
      ].join('\n'),
      { label: `registry m${nn}`, phase: 'Fill', schema: OK_LINE },
    ),
  ),
)
const missing = MODULES.filter((_, i) => !isOk(fills[i]))
if (missing.length > 0) {
  log(`No OK line for modules ${missing.join(', ')}, so the alias review did not run`)
  return { ok: false, missing }
}

phase('Aliases')
const review = await agent(
  [
    `You review the CCP Study concept registry for duplicates across modules, in the repo at "${REPO}"; run every command from that folder.`,
    'Read agents/registry-writer.md, especially its Aliases section, and follow its rules.',
    '1. Read every .results/registry/m*.json file.',
    '2. Run pnpm --silent content:concepts --pending NN for each NN from 01 to 13 to see every entry with the notes that list it.',
    '3. Propose an alias only for two ids homed in different modules that name exactly the same idea, after reading both home notes.',
    '4. Write .results/registry/zz-aliases.json as {"concepts": [], "aliases": [...]}; an empty aliases list is a valid answer.',
    '5. Run: pnpm --silent content:concepts --check .results/registry/zz-aliases.json and fix the file until it prints a line starting with OK.',
    'Never edit content/concepts.yaml, a note, or any file outside .results/registry/.',
    'Return the OK line.',
  ].join('\n'),
  { label: 'alias review', phase: 'Aliases', schema: OK_LINE },
)
return { ok: isOk(review), fills: fills.map((f) => f.ok), aliases: review ? review.ok : null }
```

Expected: the workflow returns `ok: true`, 13 lines such as `OK .results/registry/m03.json: 21 concepts, 0 aliases`, and the alias review's line, `OK .results/registry/zz-aliases.json: 0 concepts, N aliases`.
If a module returns no OK line, re-run that one agent with the same prompt before going on.

```bash
ls .results/registry
```

Expected: `m01.json` to `m13.json` and `zz-aliases.json`.

- [ ] **Step 4: Apply the results and validate**

```bash
pnpm content:concepts --apply .results/registry
```

Expected: one line per merged alias, `<alias> is now an alias of <survivor>: <reason>`, then `14 results: 430 concepts filled, A aliases merged, R in the registry`, where A is the number of merged aliases and R is 430 minus A.

```bash
pnpm content:validate --all 2>&1 | grep -E '^R(1|2|6) ' | grep -v 'content/validate.yaml' ; echo done
```

Expected: only `done`.
The R1 finding for `content/validate.yaml` stays until Task 18 creates that file.
If R6 reports a concept finding, fix that entry in its result file, then rebuild the registry from scratch, because applied entries are no longer pending:

```bash
rm content/concepts.yaml && pnpm content:concepts --seed && pnpm content:concepts --apply .results/registry
```

- [ ] **Step 5: Print the review summary for Dani**

```bash
node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parse } from 'yaml'; const c = parse(readFileSync('content/concepts.yaml', 'utf8')); const off = c.filter((x) => x.tested === false).map((x) => x.id); console.log(c.length + ' concepts, ' + (c.length - off.length) + ' tested'); console.log('tested: false: ' + (off.join(', ') || 'none')); for (const x of c) if (x.aliases) console.log('alias: ' + x.aliases.join(', ') + ' -> ' + x.id);"
```

Expected: a count line such as `425 concepts, 418 tested`, the ids marked `tested: false` (the coffee shop analogy among them), and one `alias:` line per surviving concept with aliases.
Copy this output into the phase report, so Dani reviews the untested list and every merge.

- [ ] **Step 6: Commit**

```bash
COUNTS=$(node --input-type=module -e "import { readFileSync } from 'node:fs'; import { parse } from 'yaml'; const c = parse(readFileSync('content/concepts.yaml', 'utf8')); const aliases = c.reduce((n, x) => n + (x.aliases ?? []).length, 0); console.log(c.length + ' concepts, ' + aliases + ' aliases, ' + c.filter((x) => x.tested === false).length + ' not tested');")
git add content/concepts.yaml agents/registry-writer.md
git commit -m "Complete the concept registry" -m "Seeded every note tag and filled each entry with 13 registry-writer agents and one alias review: $COUNTS."
```

---

## Task 16: Module 11 "Exam guide update" lines

The course teaches five Support plans, while the exam guide and the Support plans page name four (spec 2.3, risk K1).
Module 11 keeps the course's list and gains seven sourced update lines, and the six fact sentences among them are the rank facts of spec 3.4, word for word.

**Files:**
- Modify: `resources/11-pricing-and-support/04-aws-support-plans.md` (7 update lines and 3 concept tags), `content/concepts.yaml` (3 entries)

- [ ] **Step 1: Confirm the facts on the live pages**

Fetch both pages with WebFetch:

- https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html
- https://aws.amazon.com/premiumsupport/plans/

On 2026-10-09 they showed the following, and each must still hold:

- Domain 4, Task Statement 4.3, names Basic Support, AWS Business Support+, AWS Enterprise Support and AWS Unified Operations as Support options.
- The plans page calls Business Support+ the "Minimum recommended plan for production workloads by AWS."
- Under "Business/Mission-critical system down", it lists "< 30 mins" for Business Support+, "< 15 mins" for Enterprise Support, and "< 5 mins from Incident Management Engineer" for Unified Operations.
- It lists a "Designated Technical Account Manager" for Enterprise Support.
- It marks "24/7 workload monitoring" for Unified Operations only.

If a page contradicts any of these, stop and report it to the controller instead of inventing new wording, because the six fact sentences become the rank facts.

- [ ] **Step 2: Add the update lines and the concept tags**

The script appends the seven bullets after the existing bullet of `### End of support notice`, stamps them with today's date (the fetch date), and adds the three tags to the note's `concepts` list.

```bash
python3 - <<'EOF'
from datetime import date
from pathlib import Path

note = Path('resources/11-pricing-and-support/04-aws-support-plans.md')
text = note.read_text()
today = date.today().isoformat()
guide = '[CLF-C02 Domain 4](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html)'
plans = '[Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)'
facts = [
    (guide, 'The exam guide names four Support plans: Basic Support, AWS Business Support+, AWS Enterprise Support and AWS Unified Operations.'),
    (plans, 'AWS calls Business Support+ the minimum plan it recommends for production workloads.'),
    (plans, 'With Business Support+, a business-critical or mission-critical system that is down gets a response in under 30 minutes.'),
    (plans, 'Enterprise Support includes a designated technical account manager.'),
    (plans, 'With Enterprise Support, a business-critical or mission-critical system that is down gets a response in under 15 minutes.'),
    (plans, 'Unified Operations is the only plan that includes 24/7 workload monitoring.'),
    (plans, 'With Unified Operations, an Incident Management Engineer responds in under 5 minutes when a business-critical or mission-critical system is down.'),
]
updates = ''.join(f'- **Exam guide update** (verified_on {today}, {source}): {sentence}\n' for source, sentence in facts)
notice = '- Per the course, Developer, Business and Enterprise On-Ramp Support end on January 1, 2027, and a linked page compares the new options.\n'
last_tag = '  - aws-self-support-resources\n---\n'
assert text.count(notice) == 1, 'the End of support notice bullet is not as expected; re-read the note before editing'
assert text.count(last_tag) == 1, 'the concepts list does not end with aws-self-support-resources; re-read the note'
assert '**Exam guide update**' not in text, 'the note already has update lines'
text = text.replace(notice, notice + updates)
text = text.replace(last_tag, '  - aws-self-support-resources\n  - aws-business-support-plus\n  - aws-enterprise-support\n  - aws-unified-operations\n---\n')
note.write_text(text)
print(f'added 7 update lines verified on {today} and 3 concept tags')
EOF
```

Expected: `added 7 update lines verified on 2026-10-09 and 3 concept tags`, with today's date.

```bash
sed -n '/^### End of support notice/,/^### Beyond the plans/p' resources/11-pricing-and-support/04-aws-support-plans.md
```

Expected (with today's date):

```markdown
### End of support notice

- Per the course, Developer, Business and Enterprise On-Ramp Support end on January 1, 2027, and a linked page compares the new options.
- **Exam guide update** (verified_on 2026-10-09, [CLF-C02 Domain 4](https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02-domain4.html)): The exam guide names four Support plans: Basic Support, AWS Business Support+, AWS Enterprise Support and AWS Unified Operations.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): AWS calls Business Support+ the minimum plan it recommends for production workloads.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): With Business Support+, a business-critical or mission-critical system that is down gets a response in under 30 minutes.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): Enterprise Support includes a designated technical account manager.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): With Enterprise Support, a business-critical or mission-critical system that is down gets a response in under 15 minutes.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): Unified Operations is the only plan that includes 24/7 workload monitoring.
- **Exam guide update** (verified_on 2026-10-09, [Compare AWS Support plans](https://aws.amazon.com/premiumsupport/plans/)): With Unified Operations, an Incident Management Engineer responds in under 5 minutes when a business-critical or mission-critical system is down.

### Beyond the plans
```

- [ ] **Step 3: Register the three plans**

The tags did not exist before this task, so the registry fill cannot have created them; the script still keeps any id that is already registered as an id or an alias.

```bash
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs';
import { readConcepts, stringifyConcepts } from './scripts/content/lib/registry.ts';

const file = 'content/concepts.yaml';
const entries = readConcepts(readFileSync(file, 'utf8'));
const known = new Set(entries.flatMap((c) => [c.id, ...(c.aliases ?? [])]));
const plans = [
  ['aws-business-support-plus', 'AWS Business Support+'],
  ['aws-enterprise-support', 'AWS Enterprise Support'],
  ['aws-unified-operations', 'AWS Unified Operations'],
];
const added = plans
  .filter(([id]) => !known.has(id))
  .map(([id, name]) => ({ id, name, home: 'm11/aws-support-plans', anchor: 'end-of-support-notice', tasks: ['4.3'] }));
const at = entries.findLastIndex((c) => c.home === 'm11/aws-support-plans') + 1 || entries.length;
entries.splice(at, 0, ...added);
writeFileSync(file, stringifyConcepts(entries));
for (const [id] of plans) console.log(`${known.has(id) ? 'kept' : 'added'} ${id}`);
EOF
```

Expected: `added aws-business-support-plus`, `added aws-enterprise-support` and `added aws-unified-operations`.
If it prints `kept` for an id, open that entry and make sure its anchor is `end-of-support-notice` or another H3 of the note that teaches the plan, and that its `tasks` include `"4.3"`.

- [ ] **Step 4: Validate**

```bash
pnpm content:validate --all 2>&1 | grep 'aws-support-plans\|concepts.yaml' ; echo done
```

Expected: only `done`, so the note passes R6, R7, R8 and R13 and the new entries pass R1, R2 and R6.

- [ ] **Step 5: Commit**

```bash
git add resources/11-pricing-and-support/04-aws-support-plans.md content/concepts.yaml
git commit -m "Add the current Support plans as exam guide updates" -m "Module 11 keeps the course's five plans and gains seven sourced lines on the four current plans, whose six fact sentences are the rank facts, plus three registered concepts."
```

---

## Task 17: Missions 0 and 1 (read-only pages)

Phase 0 ships both missions as pages that Dani follows by hand; the gated mission flow arrives in Phase 6 (spec 5.3).

Mission 0 departs from spec 5.3 on one point, found while checking its sources on 2026-10-09.
The IAM Identity Center user guide says that enabling IAM Identity Center on a standalone account creates an AWS organization, and that on a free-plan account creating an organization upgrades the account to the Paid plan and the credits expire at once.
The other option, an account instance of IAM Identity Center, supports no permission sets and therefore no access to AWS accounts.
So the admin is an IAM user named `ccp-admin` with MFA, and the CLI signs in with `aws login --profile ccp-admin`, which the AWS CLI guide recommends for IAM users and which gives short-term credentials with no access keys.
The profile name stays `ccp-admin`, so `pnpm site:deploy` and Mission 1 work unchanged.

**Files:**
- Create: `content/missions/mission-00-guardrails.md`, `content/missions/mission-01-host-this-site.md`
- Modify: `docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md` (sections 1.4 and 5.3 name the Mission 0 admin)

- [ ] **Step 1: Confirm the sources**

Fetch every source URL in the two frontmatter blocks below with WebFetch, and check that each page still supports the steps that cite it.
The console wording in both pages (button and menu names in bold) comes from these pages as fetched on 2026-10-09.
If a page now names a control differently, use the page's new wording, and where no page confirms a detail, describe the goal of the step instead of guessing a menu name.
In particular, confirm on the IAM Identity Center page that enabling it on a standalone account still creates an organization, and on the AWS CLI page that `aws login` still works for IAM users.

- [ ] **Step 2: Write `content/missions/mission-00-guardrails.md`**

````markdown
---
id: mission-00
title: "Guardrails before anything else"
modules: [9, 11]
services: [AWS Identity and Access Management, AWS Budgets, AWS Billing and Cost Management]
expectedCredits: "$0"
gate: true
keep: false
canUseCredits: []
leftovers: []
sources:
  - { url: "https://aws.amazon.com/free/", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/enable-virt-mfa-for-root.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sign-in.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budget-templates.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/tracking-free-tier-usage.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-best-practices.html", verified_on: "2026-10-09" }
---

## Goal

Make the new free-plan account safe before any other mission touches it.
Every sign-in uses MFA, everyday work runs as an admin user instead of the root user, two budgets email you at the first sign of real spend, and you know which services the free plan offers.

## Before you start

- Use a new AWS account on the free plan that you created yourself; agents never create accounts or type credentials.
- After this mission, never sign in as the root user again.
- Pick one home Region now and use it for every mission.
- Install AWS CLI version 2.32.0 or later, the first version with the `aws login` command.

## Steps

### Root user MFA

- Sign in as the root user, choose your account name on the right side of the navigation bar, and choose **Security credentials**.
- In the **Multi-Factor Authentication (MFA)** section, choose **Assign MFA device**, name the device, choose **Authenticator app**, and finish the wizard with two consecutive codes from the app.
- Keep a secure backup of the QR code or secret key, because losing the only MFA device locks the root user out until AWS customer service removes it.

### Admin user with MFA

- In the IAM console, create a user named `ccp-admin` with console access.
- Attach the `AdministratorAccess` and `SignInLocalDevelopmentAccess` managed policies to it.
- In the IAM console, choose **Users**, choose `ccp-admin`, open the **Security credentials** tab, choose **Assign MFA device** under **Multi-factor authentication (MFA)**, and finish the wizard as for the root user.
- Sign out of the root user and sign in as `ccp-admin` for everything that follows.
- If the account opened in the new AWS experience, with projects and AWS Settings, the IAM user guide says IAM users with console access cannot be created there, so stop and adapt this step from the current AWS pages before going on.

### CLI sign-in without access keys

- Run `aws login --profile ccp-admin`, enter your home Region when the CLI asks for one, and finish the sign-in as `ccp-admin` in the browser.
- Check it with `aws sts get-caller-identity --profile ccp-admin`, which prints the ARN of the `ccp-admin` user.
- The CLI refreshes these short-term credentials for up to 12 hours, and running `aws login --profile ccp-admin` again starts a new session.

### Two budgets with credits excluded

- In the Billing and Cost Management console, choose **Budgets**, then **Create budget**, then **Use a template (simplified)**.
- Create the **Zero spend budget** template with your email as the recipient, so spending beyond the Free Tier limits sends an email.
- Create the **Monthly cost budget** template with a budget amount of $5 and the same recipient.
- In each budget, choose **Custom** under **Template settings** and exclude credits in the cost options, so each budget tracks the usage that the credits pay for.
- Set the $5 budget's alerts to 50%, 80% and 100% of actual cost and 100% of forecasted cost.
- Wait for no alert email: an actual-cost alert is sent only when a threshold is first reached, and forecast alerts need about 5 weeks of usage data.

### Free Tier usage alerts

- In the Billing console, under **Preferences**, choose **Billing preferences**.
- For **Alert preferences**, choose **Edit**, select **Receive AWS Free Tier alerts**, and choose **Update**.
- These emails arrive when a service passes 85 percent of its Free Tier limit.

### Home Region

- Choose the Region closest to you and use it in the console's Region selector for every mission.
- The `ccp-admin` CLI profile already uses it, because `aws login` asked for it.

### Plan status

- Write down your plan, your credit balance and the date the free plan ends, which the console home page shows.
- For each service a later mission uses, write down whether the free plan offers it: Amazon S3, Amazon CloudFront, AWS CloudFormation, Amazon EC2, AWS Lambda, Amazon CloudWatch Logs, Amazon DynamoDB, AWS IAM, AWS CloudTrail, Amazon SNS, Amazon VPC, AWS Pricing Calculator and AWS Well-Architected Tool.
- The AWS Free Tier page shows which services the free plan covers, and a mission that needs a service the plan lacks stays locked.

## Verify

- The Budgets page lists both budgets, each with your email as a recipient and credits excluded.
- The root user's security credentials and the `ccp-admin` user's both show an assigned MFA device.
- `aws sts get-caller-identity --profile ccp-admin` prints the `ccp-admin` user's ARN, not the root user's.
- Your plan status record holds the plan, the credit balance, the end date and a yes or no for every service above.

## Never do

- Never upgrade the account to the Paid plan.
- Never enable IAM Identity Center or create an AWS organization, because on a free-plan account creating an organization upgrades it to the Paid plan and the credits expire at once.
- Never create access keys, for the root user or for `ccp-admin`, because `aws login` gives the CLI short-term credentials.
- Never create NAT gateways, idle public IPv4 addresses or unattached Elastic IPs.
- Never create RDS or Aurora databases, EKS clusters, Redshift, OpenSearch or SageMaker endpoints.
- Never turn on Shield Advanced or order Direct Connect.
- Never register Route 53 domains or create hosted zones.
- Never buy Reserved Instances or Savings Plans, and never subscribe to Marketplace products.
````

- [ ] **Step 3: Write `content/missions/mission-01-host-this-site.md`**

````markdown
---
id: mission-01
title: "Host this site on S3 and CloudFront"
modules: [4, 5, 6]
services: [Amazon S3, Amazon CloudFront, AWS CloudFormation]
expectedCredits: "cents per month at most"
keep: true
canUseCredits: [S3 storage and requests, CloudFront requests and data transfer out]
leftovers: []
sources:
  - { url: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/cli/latest/reference/cloudformation/deploy.html", verified_on: "2026-10-09" }
  - { url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html", verified_on: "2026-10-09" }
---

## Goal

Serve this study site from a private S3 bucket that only CloudFront can read, so you can read every note on your phone.

## Before you start

- Mission 0 is done and its Verify holds.
- Your plan status record says the free plan offers Amazon S3, Amazon CloudFront and AWS CloudFormation; if any of them is missing, stop here and keep using `pnpm preview` on the Mac.
- Your terminal is signed in with `aws login --profile ccp-admin`.
- The repo has no uncommitted changes and `pnpm verify` passes, because the deploy command refuses to run otherwise.

## Steps

### Create the hosting stack

```bash
aws cloudformation deploy --template-file infra/site.yaml --stack-name ccp-study-site --profile ccp-admin
```

- The stack creates a private bucket with all four Block Public Access settings on, a CloudFront distribution that reads the bucket through origin access control (OAC), and a response headers policy with the site's Content-Security-Policy.
- The command waits until the stack is created, and running it again later updates the same stack.

### Upload the site

```bash
pnpm site:deploy
```

- The command runs `pnpm verify`, uploads the build to the bucket, invalidates the entry files, removes chunks that no recent build uses, and prints the site URL.

## Verify

- Open the printed `SiteUrl` on your phone and check that Home lists the 13 modules.
- Check that the bucket refuses a direct read: the commands below print `403` and then `AccessDenied`.

```bash
BUCKET=$(aws cloudformation describe-stacks --stack-name ccp-study-site --profile ccp-admin --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" --output text)
REGION=$(aws configure get region --profile ccp-admin)
curl -s -o /dev/null -w '%{http_code}\n' "https://$BUCKET.s3.$REGION.amazonaws.com/index.html"
curl -s "https://$BUCKET.s3.$REGION.amazonaws.com/index.html" | grep -o AccessDenied
```

## Keep it running

- The bucket and the distribution carry the tag `ccp:keep=site`, so a Tag Editor search for that tag across all Regions lists both, and the cleanup of later missions leaves them alone.
- The next day, open Cost Explorer with daily costs grouped by service, and check that Amazon S3 and Amazon CloudFront stay within a few cents.
- This mission has no cleanup step and no time limit, because the site stays up.
````

- [ ] **Step 4: Stamp the fetch date and validate**

If `date +%F` prints a later day than 2026-10-09, stamp it on every source you checked in Step 1:

```bash
perl -pi -e "s/verified_on: \"2026-10-09\"/verified_on: \"$(date +%F)\"/" content/missions/mission-00-guardrails.md content/missions/mission-01-host-this-site.md
```

```bash
pnpm content:validate --all 2>&1 | grep missions ; echo done
```

Expected: only `done`, so both pages pass R1 (schema), R2 (unique ids), R6 (ids match file names), R8 (style) and R13 (sources).

- [ ] **Step 5: Bring the spec in line with Mission 0**

Spec 1.4 and the Mission 0 row of spec 5.3 still name an IAM Identity Center admin, so the script below names the IAM user instead, adds the organization to the never-create list, and records the fact in Appendix B.

```bash
python3 - <<'EOF'
from pathlib import Path

spec = Path('docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md')
text = spec.read_text()
free_tier_faq_row = '| When the free plan ends, AWS suspends the account, keeps its data for 90 days during which an upgrade to the Paid plan restores access, and then erases the account and its content | [AWS Free Tier FAQs](https://aws.amazon.com/free/free-tier-faqs/) |\n'
edits = [
    (
        'with `AWS_PROFILE=ccp-admin` (the IAM Identity Center admin from Mission 0):',
        'with `AWS_PROFILE=ccp-admin` (the IAM admin user from Mission 0, signed in with `aws login`):',
    ),
    (
        'an IAM Identity Center admin user with MFA, set up for the CLI with `aws configure sso --profile ccp-admin`;',
        'an IAM admin user `ccp-admin` with MFA, signed in for the CLI with `aws login --profile ccp-admin`;',
    ),
    ('| 9, 11 | budgets, Identity Center user | $0 |', '| 9, 11 | budgets, IAM user | $0 |'),
    (
        'Marketplace subscriptions; root access keys.',
        'Marketplace subscriptions; root access keys; an AWS organization, including the one that enabling IAM Identity Center creates, because it upgrades a free-plan account to the Paid plan.',
    ),
    (
        free_tier_faq_row,
        free_tier_faq_row
        + '| On a free-plan account, creating an AWS organization, which enabling IAM Identity Center on a standalone account does, upgrades the account to the Paid plan and the free-plan credits expire at once | [Enable IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/enable-identity-center.html) |\n',
    ),
]
for old, new in edits:
    assert text.count(old) == 1, f'not found exactly once: {old[:60]}'
    text = text.replace(old, new)
spec.write_text(text)
print('spec 1.4, 5.3 and Appendix B now name the IAM admin user')
EOF
grep -c 'Identity Center' docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
pnpm content:validate --all 2>&1 | grep 'docs/' ; echo done
```

Expected: the script's line, then `3` (the lines holding the exam guide's term in Appendix B, the never-create rule and the new Appendix B row), then only `done`, so the spec still passes R8.

- [ ] **Step 6: Commit**

```bash
git add content/missions docs/superpowers/specs/2026-10-09-aws-cpe-study-site-design.md
git commit -m "Add Missions 0 and 1 as read-only pages" -m "Mission 0 sets up MFA, an IAM admin user with aws login, two budgets with credits excluded, Free Tier alerts and the plan status; Mission 1 hosts the site on private S3 behind CloudFront. Mission 0 avoids IAM Identity Center, because the organization it creates would upgrade a free-plan account, and spec 1.4, 5.3 and Appendix B now say so."
```

---

## Task 18: Switch the rules on, `pnpm check` and the pre-commit hook

From this task on, every commit runs the fast gate (spec 1.3).

**Files:**
- Create: `content/validate.yaml`, `.githooks/pre-commit`

- [ ] **Step 1: Run the validator without its switches**

```bash
pnpm content:validate ; echo "exit $?"
```

Expected: `R1 content/validate.yaml  required file is missing`, then `content:validate: content/validate.yaml is missing or invalid` and `exit 1`.

- [ ] **Step 2: Write `content/validate.yaml`**

```yaml
# Active validator rules and R10 switches, raised phase by phase (spec 2.9).
# Phase 0: R1, R2, R6, R7, R8 and R13.
rules: [R1, R2, R6, R7, R8, R13]
practicePerConcept: 0
examQuotas: false
blueprintTerms: false
```

- [ ] **Step 3: Run the Phase 0 rules**

```bash
pnpm content:validate ; echo "exit $?"
```

Expected: `content:validate: 6 rules, 0 findings`, then `exit 0`.
If a finding remains, fix it at its cause: a note through the notes workflow's rules, a registry entry by hand, and never by loosening a rule; then run the command again until it prints 0 findings.

- [ ] **Step 4: Add the pre-commit hook**

`.githooks/pre-commit`:

```sh
#!/bin/sh
# Runs the fast gate before every commit (spec 1.3); enabled once per clone with: git config core.hooksPath .githooks
exec pnpm check
```

```bash
chmod +x .githooks/pre-commit && git config core.hooksPath .githooks && git config core.hooksPath
```

Expected: `.githooks`.

- [ ] **Step 5: Run the fast gate**

```bash
pnpm check
```

Expected: `tsc` prints nothing, Biome reports no errors, `content:validate: 6 rules, 0 findings`, and Vitest reports every test passed.

- [ ] **Step 6: Commit through the hook**

```bash
git add content/validate.yaml .githooks/pre-commit
git commit -m "Switch on the Phase 0 content rules and the pre-commit hook" -m "content/validate.yaml turns on R1, R2, R6, R7, R8 and R13, and .githooks/pre-commit runs pnpm check before every commit."
```

Expected: the hook prints the `pnpm check` output, then git prints the new commit.
If the hook fails, fix the cause and commit again; never pass `--no-verify`.

---

## Task 19: Content build

The build turns one loaded `Context` into hashed JSON chunks: one per module with its lesson HTML, one search chunk, and an index that names them (spec 2.10).
It never runs a rule; the Vite plugin in Task 20 runs the rules and the build side by side.
Three facts measured against marked 18 and TypeScript 7.0.2 shape the renderer:
- Inline text tokens carry raw text and the renderer escapes it, so glossary terms are matched on the raw text and each piece is escaped after, which lets a term such as "AWS Cost & Usage Report" match.
- The token's `text` of a heading is its Markdown, so section names and ids come from it, never from the rendered inner HTML.
- `new Marked<string, string>(...)` names its type arguments, because a renderer method that only throws returns `never`, and TypeScript would otherwise infer the renderer output as `never` and reject every other method.

R6 already proves that every relative link points at a file; the build also needs that file to be a note with a page, so a link from a note to `glossary.md` fails here with the note's path in the message.

**Files:**
- Create: `schemas/chunks.ts`, `scripts/content/lib/render.ts`, `scripts/content/build.ts`, `src/app/search.ts` (`normalize` only; Task 23 adds `rank`)
- Modify: `scripts/content/lib/glossary.ts` (add `TermMatcher` and `termMatcher`)
- Test: `tests/unit/render.test.ts`, `tests/unit/build.test.ts`, `tests/unit/build-real.test.ts`

- [ ] **Step 1: Write the chunk types `schemas/chunks.ts`**

These are TypeScript types only, shared by the build and the app.

```ts
/** Types of the JSON chunks that scripts/content/build.ts writes and the app reads (spec 2.10). */

export interface LessonMeta {
  n: number;
  slug: string;
  title: string;
  concepts: string[];
}

export interface ModuleMeta {
  n: number;
  slug: string;
  title: string;
  /** The title without its "Module N: " prefix. */
  short: string;
  lessons: LessonMeta[];
  /** Path of the module's chunk from the site root, such as content/m03.1a2b3c4d.json. */
  chunk: string;
}

export interface ConceptMeta {
  id: string;
  name: string;
  home: string;
  anchor: string;
  tested: boolean;
}

export interface GlossaryItem {
  id: string;
  term: string;
  /** The definition rendered as inline HTML. */
  html: string;
  refs: { label: string; route: string }[];
}

export interface MissionMeta {
  id: string;
  title: string;
  modules: number[];
  services: string[];
  expectedCredits: string;
  gate: boolean;
  keep: boolean;
  maxLiveHours: number | null;
  canUseCredits: string[];
  leftovers: string[];
  sources: { url: string; verified_on: string }[];
  html: string;
}

/** One H2 section of a rendered note; the part before the first H2 has the id and title ''. */
export interface Section {
  id: string;
  title: string;
  html: string;
}

export interface HeadingMeta {
  depth: 2 | 3;
  id: string;
  text: string;
}

export interface LessonChunk {
  slug: string;
  html: string;
  headings: HeadingMeta[];
}

/** content/mNN.<hash>.json */
export interface ModuleChunk {
  module: number;
  readme: Section[];
  lessons: Record<string, LessonChunk>;
}

export interface SearchEntry {
  kind: 'module' | 'lesson' | 'concept' | 'term' | 'mission';
  title: string;
  detail: string;
  route: string;
  /** Normalized text the palette matches word prefixes against. */
  text: string;
}

/** content/search.<hash>.json */
export interface SearchChunk {
  entries: SearchEntry[];
}

/** content/index.<hash>.json, whose name the build injects into index.html. */
export interface ContentIndex {
  contentVersion: string;
  modules: ModuleMeta[];
  concepts: ConceptMeta[];
  glossary: GlossaryItem[];
  missions: MissionMeta[];
  /** Path of the search chunk from the site root. */
  search: string;
}
```

- [ ] **Step 2: Write the failing render tests**

`tests/unit/render.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { type GlossaryEntry, termMatcher } from '../../scripts/content/lib/glossary.ts';
import { renderDoc, renderInline } from '../../scripts/content/lib/render.ts';

const PATH = 'resources/01-baking-basics/01-what-a-bakery-cloud-is.md';
const ROUTES = new Map([
  [PATH, '#/m/01/l/what-a-bakery-cloud-is'],
  ['resources/01-baking-basics/02-ovens.md', '#/m/01/l/ovens'],
  ['resources/01-baking-basics/README.md', '#/m/01'],
]);
const entry = (term: string, id: string): GlossaryEntry => ({
  id,
  term,
  definition: `Fixture definition of ${term}.`,
  refs: [{ label: 'Module 1, What a Bakery Cloud Is', path: PATH }],
});
const TERMS = termMatcher([entry('Amazon S3', 'amazon-s3'), entry('Shared kitchen', 'shared-kitchen')]);
const BUTTON_S3 = '<button type="button" class="term" data-term="amazon-s3">Amazon S3</button>';

const BODY = [
  '# What a Bakery Cloud Is',
  '',
  '## Notes',
  '',
  '### Amazon S3 basics',
  '',
  '- Amazon S3 stores the recipes, and Amazon S3 keeps every version.',
  '- Read [the oven lesson](02-ovens.md) and [the guide](https://docs.aws.amazon.com/x.html).',
  '- **Exam guide update** (verified_on 2026-10-01, [CLF-C02 Domain 1](https://docs.aws.amazon.com/d1.html)): The guide calls the shared kitchen a commissary.',
  '',
  '## Terms',
  '',
  '- **Amazon S3**: object storage for recipes.',
].join('\n');

const render = (body: string) => renderDoc(body, { path: PATH, routes: ROUTES, terms: TERMS });
const count = (html: string, needle: string): number => html.split(needle).length - 1;

describe('renderDoc', () => {
  const { sections, headings } = render(BODY);
  const html = sections.map((s) => s.html).join('');

  it('splits sections at each H2 and gives H2 and H3 slug ids, but not the H1', () => {
    expect(sections.map((s) => s.id)).toEqual(['', 'notes', 'terms']);
    expect(headings).toEqual([
      { depth: 2, id: 'notes', text: 'Notes' },
      { depth: 3, id: 'amazon-s3-basics', text: 'Amazon S3 basics' },
      { depth: 2, id: 'terms', text: 'Terms' },
    ]);
    expect(html).toContain('<h1>What a Bakery Cloud Is</h1>');
    expect(html).toContain('<h3 id="amazon-s3-basics">Amazon S3 basics</h3>');
  });

  it('turns only the first use of a term into a button, never in a heading or the Terms section', () => {
    expect(count(html, 'data-term="amazon-s3"')).toBe(1);
    expect(html).toContain(`<li>${BUTTON_S3} stores the recipes, and Amazon S3 keeps every version.</li>`);
    expect(sections[2]?.html).not.toContain('<button');
    expect(render('## Terms\n\n- **Amazon S3**: object storage.\n').sections[0]?.html).not.toContain(
      '<button',
    );
  });

  it('never puts a term button inside a link', () => {
    const linked =
      render('[Amazon S3 docs](https://aws.amazon.com/s3/) then Amazon S3 again.').sections[0]?.html ?? '';
    expect(linked).toBe(
      `<p><a href="https://aws.amazon.com/s3/" rel="noopener noreferrer" target="_blank">Amazon S3 docs</a> then ${BUTTON_S3} again.</p>\n`,
    );
  });

  it('resolves relative links to routes and opens external links in a new tab', () => {
    expect(html).toContain(
      '<li>Read <a href="#/m/01/l/ovens">the oven lesson</a> and <a href="https://docs.aws.amazon.com/x.html" rel="noopener noreferrer" target="_blank">the guide</a>.</li>',
    );
    expect(render('See [the module](README.md).').sections[0]?.html).toContain(
      '<a href="#/m/01">the module</a>',
    );
    expect(render('See [a topic](02-ovens.md#hot-ovens).').sections[0]?.html).toContain(
      '<a href="#/m/01/l/ovens/hot-ovens">',
    );
  });

  it('labels an Exam guide update line with its date and source', () => {
    expect(html).toContain(
      '<li class="update"><span class="update-label">Exam guide update</span> ' +
        '<span class="update-meta">verified 2026-10-01, <a href="https://docs.aws.amazon.com/d1.html" rel="noopener noreferrer" target="_blank">CLF-C02 Domain 1</a></span> ' +
        '<span class="update-text">The guide calls the <button type="button" class="term" data-term="shared-kitchen">shared kitchen</button> a commissary.</span></li>',
    );
  });

  it('escapes text and matches terms before escaping', () => {
    const terms = termMatcher([entry('AWS Cost & Usage Report', 'aws-cost-usage-report')]);
    const out = renderDoc('Read the AWS Cost & Usage Report <3 times.', { path: PATH, routes: ROUTES, terms })
      .sections[0]?.html;
    expect(out).toBe(
      '<p>Read the <button type="button" class="term" data-term="aws-cost-usage-report">AWS Cost &amp; Usage Report</button> &lt;3 times.</p>\n',
    );
  });

  it('refuses raw HTML and links to pages the site does not have', () => {
    expect(() => render('Text with <b>bold</b>.')).toThrow(`${PATH}: raw HTML is not allowed in Markdown`);
    expect(() => render('See [gone](03-gone.md).')).toThrow(
      `${PATH}: link to 03-gone.md has no page on the site`,
    );
  });
});

describe('termMatcher', () => {
  const matcher = termMatcher([
    entry('Amazon Elastic Compute Cloud (Amazon EC2)', 'amazon-elastic-compute-cloud-amazon-ec2'),
    entry('Amazon EC2 Auto Scaling', 'amazon-ec2-auto-scaling'),
    entry('Availability Zone (AZ)', 'availability-zone-az'),
  ]);
  const ids = (text: string): (string | undefined)[] =>
    [...text.matchAll(matcher.pattern)].map((m) => matcher.idByForm.get(m[0].toLowerCase()));

  it('matches the full term, its short forms of 3 or more characters, and the longest form first', () => {
    expect(ids('Amazon EC2 Auto Scaling grows Amazon EC2 fleets; see Amazon Elastic Compute Cloud.')).toEqual(
      [
        'amazon-ec2-auto-scaling',
        'amazon-elastic-compute-cloud-amazon-ec2',
        'amazon-elastic-compute-cloud-amazon-ec2',
      ],
    );
    expect(ids('one availability zone, one AZ')).toEqual(['availability-zone-az']);
  });

  it('stops at word and hyphen boundaries', () => {
    expect(ids('Amazon EC2-based and xAmazon EC2')).toEqual([]);
  });

  it('never matches with no entries', () => {
    expect('anything at all'.match(termMatcher([]).pattern)).toBeNull();
  });
});

describe('renderInline', () => {
  it('renders inline Markdown and refuses raw HTML', () => {
    expect(renderInline('A **pool** of ovens.', 'resources/glossary.md')).toBe(
      'A <strong>pool</strong> of ovens.',
    );
    expect(() => renderInline('A <i>pool</i>.', 'resources/glossary.md')).toThrow('raw HTML is not allowed');
  });
});
```

- [ ] **Step 3: Run them to see them fail**

```bash
pnpm test tests/unit/render.test.ts
```

Expected: FAIL, because `scripts/content/lib/render.ts` does not exist and `glossary.ts` exports no `termMatcher`.

- [ ] **Step 4: Add `termMatcher` to `scripts/content/lib/glossary.ts`**

Append this to the end of the file; it uses `GlossaryEntry` and `termForms` from Task 14, so the imports stay as they are.

```ts
/** Finds glossary terms in note text: one case-insensitive pattern and the glossary id behind each lowercased form. */
export interface TermMatcher {
  pattern: RegExp;
  idByForm: ReadonlyMap<string, string>;
}

const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Full terms claim their form first, so a short form such as "Amazon EC2" never steals a term of its own. */
export function termMatcher(entries: readonly GlossaryEntry[]): TermMatcher {
  const idByForm = new Map<string, string>();
  for (const entry of entries) {
    const form = entry.term.toLowerCase();
    if (!idByForm.has(form)) idByForm.set(form, entry.id);
  }
  for (const entry of entries) {
    for (const extra of termForms(entry.term)) {
      const form = extra.toLowerCase();
      if (!idByForm.has(form)) idByForm.set(form, entry.id);
    }
  }
  if (idByForm.size === 0) return { pattern: /(?!)/g, idByForm };
  const alts = [...idByForm.keys()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  return { pattern: new RegExp(`(?<![A-Za-z0-9-])(?:${alts})(?![A-Za-z0-9-])`, 'gi'), idByForm };
}
```

- [ ] **Step 5: Implement `scripts/content/lib/render.ts`**

```ts
import { posix } from 'node:path';
import { Marked, type Parser, type Token } from 'marked';
import type { HeadingMeta, Section } from '../../../schemas/chunks.ts';
import type { Note } from './context.ts';
import type { TermMatcher } from './glossary.ts';
import { slugify } from './markdown.ts';
import { parseUpdateLine } from './update-line.ts';

const EXTERNAL = /^(?:https?:|mailto:)/;
const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/** The hash route of a note: #/m/NN for a module README, #/m/NN/l/<slug> for a lesson. */
export function routeOf(note: Note): string {
  const nn = String(note.module).padStart(2, '0');
  return note.kind === 'module' ? `#/m/${nn}` : `#/m/${nn}/l/${note.slugFromPath}`;
}

export interface RenderOptions {
  /** Repo path of the Markdown file, used to resolve its relative links and to name it in errors. */
  path: string;
  /** Repo path of every note to its hash route. */
  routes: ReadonlyMap<string, string>;
  /** Glossary terms to turn into popover buttons, or null for none. */
  terms: TermMatcher | null;
}

export interface RenderedDoc {
  sections: Section[];
  headings: HeadingMeta[];
}

const externalLink = (href: string, inner: string): string =>
  `<a href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${inner}</a>`;
const plainText = (markdown: string): string => markdown.replace(/[*`_]/g, '').trim();

/**
 * Renders a note body to HTML sections, one per H2, with the site's rules: H2 and H3 ids from slugify,
 * links resolved to hash routes, "Exam guide update" lines labelled, the first use of each glossary
 * term outside headings, links and the Terms section turned into a button, and raw HTML refused.
 */
export function renderDoc(body: string, { path, routes, terms }: RenderOptions): RenderedDoc {
  const headings: HeadingMeta[] = [];
  const usedTerms = new Set<string>();
  let section = '';
  let inlineDepth = 0;

  const nested = (parser: Parser, tokens: Token[]): string => {
    inlineDepth += 1;
    try {
      return parser.parseInline(tokens);
    } finally {
      inlineDepth -= 1;
    }
  };

  const wrapTerms = (raw: string): string => {
    if (terms === null || inlineDepth > 0 || section === 'Terms') return escapeHtml(raw);
    let html = '';
    let last = 0;
    for (const match of raw.matchAll(terms.pattern)) {
      const id = terms.idByForm.get(match[0].toLowerCase());
      if (id === undefined || usedTerms.has(id)) continue;
      usedTerms.add(id);
      html += escapeHtml(raw.slice(last, match.index));
      html += `<button type="button" class="term" data-term="${id}">${escapeHtml(match[0])}</button>`;
      last = match.index + match[0].length;
    }
    return html + escapeHtml(raw.slice(last));
  };

  const routeFor = (href: string): string => {
    const hash = href.indexOf('#');
    const target = hash === -1 ? href : href.slice(0, hash);
    const fragment = hash === -1 ? '' : href.slice(hash + 1);
    const file = target === '' ? path : posix.normalize(posix.join(posix.dirname(path), target));
    const route = routes.get(file);
    if (route === undefined) throw new Error(`${path}: link to ${href} has no page on the site`);
    if (fragment === '') return route;
    if (!route.includes('/l/')) {
      throw new Error(`${path}: link to ${href} points into a module page, which has no anchors`);
    }
    return `${route}/${fragment}`;
  };

  const md: Marked = new Marked<string, string>({
    gfm: true,
    async: false,
    renderer: {
      heading({ tokens, depth, text }) {
        // Use the token's Markdown text for the section name and the id, never the rendered inner HTML.
        if (depth === 2) section = text.trim();
        const inner = nested(this.parser, tokens);
        if (depth !== 2 && depth !== 3) return `<h${depth}>${inner}</h${depth}>\n`;
        const id = slugify(text);
        headings.push({ depth, id, text: plainText(text) });
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, tokens }) {
        const inner = nested(this.parser, tokens);
        return EXTERNAL.test(href)
          ? externalLink(href, inner)
          : `<a href="${escapeHtml(routeFor(href))}">${inner}</a>`;
      },
      listitem(item) {
        const update = parseUpdateLine(`- ${item.text}`);
        if (update === null) return false;
        const meta = `verified ${update.verifiedOn}, ${externalLink(update.url, escapeHtml(update.title))}`;
        const sentence = md.parseInline(update.sentence, { async: false });
        return `<li class="update"><span class="update-label">Exam guide update</span> <span class="update-meta">${meta}</span> <span class="update-text">${sentence}</span></li>\n`;
      },
      text(token) {
        if ('tokens' in token && token.tokens) return this.parser.parseInline(token.tokens);
        if ('escaped' in token && token.escaped) return token.text;
        return wrapTerms(token.text);
      },
      html() {
        throw new Error(`${path}: raw HTML is not allowed in Markdown`);
      },
    },
  });

  let current: { title: string; tokens: Token[] } = { title: '', tokens: [] };
  const groups = [current];
  for (const token of md.lexer(body)) {
    if (token.type === 'heading' && token.depth === 2) {
      current = { title: plainText(token.text), tokens: [] };
      groups.push(current);
    }
    current.tokens.push(token);
  }
  const sections = groups
    .filter((group, i) => i > 0 || group.tokens.some((token) => token.type !== 'space'))
    .map((group) => ({ id: slugify(group.title), title: group.title, html: md.parser(group.tokens) }));
  return { sections, headings };
}

/** Renders one line of Markdown, such as a glossary definition; raw HTML and links into the notes are refused. */
export function renderInline(src: string, path: string): string {
  const md = new Marked<string, string>({
    gfm: true,
    async: false,
    renderer: {
      link({ href, tokens }) {
        if (!EXTERNAL.test(href)) throw new Error(`${path}: link to ${href} has no page on the site`);
        return externalLink(href, this.parser.parseInline(tokens));
      },
      html() {
        throw new Error(`${path}: raw HTML is not allowed in Markdown`);
      },
    },
  });
  return md.parseInline(src, { async: false });
}
```

`listitem` returns `false` for every other list item, which makes marked fall back to its own renderer.
The update sentence is rendered with the same `Marked` instance, so it may hold the first use of a glossary term, as the test shows.

- [ ] **Step 6: Run the render tests to see them pass**

```bash
pnpm test tests/unit/render.test.ts
```

Expected: PASS, 11 tests.

- [ ] **Step 7: Write the failing build tests**

`tests/unit/build.test.ts` builds the fixture tree:

```ts
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ContentIndex, ModuleChunk, SearchChunk } from '../../schemas/chunks.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';
import { normalize } from '../../src/app/search.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const LESSON_ROUTE = '#/m/01/l/what-a-bakery-cloud-is';

function build(root = makeFixtureRoot()) {
  const built = buildContent(loadContext(root, { today: FIXTURE_TODAY }));
  const json = <T>(name: string): T => JSON.parse(built.files.get(name) ?? 'null') as T;
  const index = json<ContentIndex>(built.indexFile);
  return { built, index, json };
}

describe('buildContent on the fixture tree', () => {
  it('names every file by its content hash and records the index name', () => {
    const { built, index } = build();
    expect(built.indexFile).toMatch(/^content\/index\.[0-9a-f]{8}\.json$/);
    expect(built.contentVersion).toMatch(/^c-[0-9a-f]{6}$/);
    expect(index.contentVersion).toBe(built.contentVersion);
    expect(index.modules.map((m) => [m.n, m.short, m.lessons.length])).toEqual([[1, 'Baking Basics', 1]]);
    expect(index.modules[0]?.chunk).toMatch(/^content\/m01\.[0-9a-f]{8}\.json$/);
    expect(index.search).toMatch(/^content\/search\.[0-9a-f]{8}\.json$/);
    expect([...built.files.keys()].sort()).toEqual(
      [built.indexFile, index.modules[0]?.chunk, index.search].sort(),
    );
  });

  it('renders the lesson with its H1 and update line, and the README by sections', () => {
    const { index, json } = build();
    const chunk = json<ModuleChunk>(index.modules[0]?.chunk ?? '');
    const lesson = chunk.lessons['what-a-bakery-cloud-is'];
    expect(lesson?.html).toContain('<h1>What a Bakery Cloud Is</h1>');
    expect(lesson?.html).toContain('<li class="update"><span class="update-label">Exam guide update</span>');
    expect(lesson?.headings.filter((h) => h.depth === 3).map((h) => h.id)).toEqual([
      'shared-kitchen',
      'paying-by-the-minute',
    ]);
    expect(chunk.readme.map((s) => s.id)).toEqual([
      '',
      'what-this-module-covers',
      'lessons',
      'key-takeaways',
      'what-the-assessment-focuses-on',
      'summary',
      'further-reading',
    ]);
    expect(chunk.readme[2]?.html).toContain(`<a href="${LESSON_ROUTE}">What a Bakery Cloud Is</a>`);
  });

  it('indexes concepts, the glossary and missions with their routes', () => {
    const { index } = build();
    expect(index.concepts).toEqual([
      {
        id: 'shared-kitchen',
        name: 'Shared kitchen',
        home: 'm01/what-a-bakery-cloud-is',
        anchor: 'shared-kitchen',
        tested: true,
      },
      {
        id: 'per-minute-rental',
        name: 'Per-minute rental',
        home: 'm01/what-a-bakery-cloud-is',
        anchor: 'paying-by-the-minute',
        tested: true,
      },
    ]);
    expect(index.glossary).toEqual([
      {
        id: 'shared-kitchen',
        term: 'Shared kitchen',
        html: 'A pool of ovens that many branches use.',
        refs: [{ label: 'Module 1, What a Bakery Cloud Is', route: LESSON_ROUTE }],
      },
    ]);
    expect(index.missions.map((m) => [m.id, m.gate, m.maxLiveHours])).toEqual([['mission-00', true, null]]);
    expect(index.missions[0]?.html).toContain('<h2 id="goal">Goal</h2>');
  });

  it('writes a search chunk with a normalized entry per module, lesson, concept, term and mission', () => {
    const { index, json } = build();
    const { entries } = json<SearchChunk>(index.search);
    expect(entries.map((e) => `${e.kind} ${e.route}`)).toEqual([
      'module #/m/01',
      `lesson ${LESSON_ROUTE}`,
      `concept ${LESSON_ROUTE}/shared-kitchen`,
      `concept ${LESSON_ROUTE}/paying-by-the-minute`,
      `term ${LESSON_ROUTE}`,
      'mission #/missions/mission-00',
    ]);
    expect(entries[1]).toEqual({
      kind: 'lesson',
      title: 'What a Bakery Cloud Is',
      detail: 'Module 1: Baking Basics',
      route: LESSON_ROUTE,
      text: 'what a bakery cloud is shared kitchen paying by the minute',
    });
    expect(normalize('  AWS Business Support+ (Auto-Scaling)! ')).toBe('aws business support+ auto scaling');
  });

  it('gives the same names when built twice', () => {
    expect(build().built.indexFile).toBe(build().built.indexFile);
  });

  it('fails on a link to a page the site does not have', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', '01-baking-basics', '01-what-a-bakery-cloud-is.md'),
      '\n- See [later](02-gone.md).\n',
    );
    expect(() => build(root)).toThrow('link to 02-gone.md has no page on the site');
  });
});
```

`tests/unit/build-real.test.ts` builds the real notes, with the registry from Task 15, the update lines from Task 16 and the missions from Task 17:

```ts
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { ContentIndex, ModuleChunk } from '../../schemas/chunks.ts';
import { buildContent } from '../../scripts/content/build.ts';
import { loadContext } from '../../scripts/content/lib/context.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CHUNK_BUDGET = 120 * 1024;
const built = buildContent(loadContext(ROOT));
const read = <T>(name: string): T => JSON.parse(built.files.get(name) ?? 'null') as T;
const index = read<ContentIndex>(built.indexFile);
const chunks = new Map(index.modules.map((m) => [m.n, read<ModuleChunk>(m.chunk)] as const));

describe('buildContent on the real notes', () => {
  it('builds all 13 modules and 87 lessons', () => {
    expect(index.modules.map((m) => m.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(index.modules.reduce((total, m) => total + m.lessons.length, 0)).toBe(87);
  });

  it('routes every glossary term to at least one lesson', () => {
    expect(index.glossary.length).toBeGreaterThan(0);
    for (const item of index.glossary) {
      expect(item.refs.length, item.term).toBeGreaterThan(0);
      for (const ref of item.refs) expect(ref.route, item.term).toMatch(/^#\/m\/\d{2}\/l\/[a-z0-9-]+$/);
    }
  });

  it('renders every concept anchor as a heading id in its home lesson', () => {
    expect(index.concepts.length).toBeGreaterThan(0);
    for (const concept of index.concepts) {
      const [m = '', slug = ''] = concept.home.split('/');
      const lesson = chunks.get(Number(m.slice(1)))?.lessons[slug];
      expect(
        lesson?.headings.map((h) => h.id),
        concept.id,
      ).toContain(concept.anchor);
    }
  });

  it('labels the Exam guide update lines of the Support plans lesson', () => {
    const html = chunks.get(11)?.lessons['aws-support-plans']?.html ?? '';
    expect(html.split('<li class="update">').length - 1).toBeGreaterThanOrEqual(7);
  });

  it('keeps every module chunk within 120 KB gzipped', () => {
    for (const m of index.modules) {
      const size = gzipSync(built.files.get(m.chunk) ?? '', { level: 9 }).length;
      expect(size, m.chunk).toBeLessThanOrEqual(CHUNK_BUDGET);
    }
  });
});
```

- [ ] **Step 8: Run them to see them fail**

```bash
pnpm test tests/unit/build.test.ts tests/unit/build-real.test.ts
```

Expected: FAIL, because `scripts/content/build.ts` and `src/app/search.ts` do not exist.

- [ ] **Step 9: Write `src/app/search.ts`**

The build and the palette must normalize text the same way, so the function lives in the app and the build imports it.

```ts
/** Lowercases and keeps letters, digits and plus signs, so "Business Support+" and "EC2 Auto-Scaling" match what people type. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim();
}
```

- [ ] **Step 10: Implement `scripts/content/build.ts`**

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
  SearchChunk,
  SearchEntry,
} from '../../schemas/chunks.ts';
import { normalize } from '../../src/app/search.ts';
import { CONCEPTS_FILE, type Context, type LessonNote, type ModuleNote } from './lib/context.ts';
import { parseGlossary, termMatcher } from './lib/glossary.ts';
import { renderDoc, renderInline, routeOf } from './lib/render.ts';

const GLOSSARY_FILE = 'resources/glossary.md';

/** The content build's output: every chunk by its path from the site root, and the name of the index. */
export interface BuiltContent {
  contentVersion: string;
  indexFile: string;
  files: Map<string, string>;
}

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Renders the notes, glossary and missions of a loaded context into hashed JSON chunks (spec 2.10). */
export function buildContent(ctx: Context): BuiltContent {
  const files = new Map<string, string>();
  const emit = (stem: string, data: unknown): string => {
    const json = JSON.stringify(data);
    const name = `content/${stem}.${sha256(json).slice(0, 8)}.json`;
    files.set(name, json);
    return name;
  };

  const glossaryEntries = parseGlossary(ctx.read(GLOSSARY_FILE) ?? '');
  const seen = new Set<string>();
  for (const entry of glossaryEntries) {
    if (seen.has(entry.id)) throw new Error(`${GLOSSARY_FILE}: two terms share the id ${entry.id}`);
    seen.add(entry.id);
  }
  const terms = termMatcher(glossaryEntries);
  const routes = new Map(ctx.notes.map((note) => [note.path, routeOf(note)] as const));
  const notesById = new Map(ctx.notes.map((note) => [note.id, note] as const));
  const search: SearchEntry[] = [];

  const modules: ModuleMeta[] = [];
  for (const n of [...new Set(ctx.notes.map((note) => note.module))].sort((a, b) => a - b)) {
    const readme = ctx.notes.find((note): note is ModuleNote => note.kind === 'module' && note.module === n);
    if (readme === undefined || readme.fm === null) {
      throw new Error(`module ${n} has no README with valid frontmatter; run pnpm content:validate`);
    }
    const short = readme.fm.title.replace(/^Module \d+: /, '');
    const lessonNotes = ctx.notes.filter(
      (note): note is LessonNote => note.kind === 'lesson' && note.module === n,
    );
    search.push({
      kind: 'module',
      title: readme.fm.title,
      detail: `${lessonNotes.length} lessons`,
      route: routeOf(readme),
      text: normalize(readme.fm.title),
    });
    const lessons: LessonMeta[] = [];
    const chunkLessons: Record<string, LessonChunk> = {};
    for (const note of lessonNotes) {
      if (note.fm === null) throw new Error(`${note.path}: invalid frontmatter; run pnpm content:validate`);
      const { sections, headings } = renderDoc(note.body, { path: note.path, routes, terms });
      chunkLessons[note.slugFromPath] = {
        slug: note.slugFromPath,
        html: sections.map((s) => s.html).join(''),
        headings,
      };
      lessons.push({
        n: note.number,
        slug: note.slugFromPath,
        title: note.fm.title,
        concepts: [...note.fm.concepts],
      });
      search.push({
        kind: 'lesson',
        title: note.fm.title,
        detail: `Module ${n}: ${short}`,
        route: routeOf(note),
        text: normalize(
          [note.fm.title, ...headings.filter((h) => h.depth === 3).map((h) => h.text)].join(' '),
        ),
      });
    }
    const readmeSections = renderDoc(readme.body, { path: readme.path, routes, terms: null }).sections;
    const chunk: ModuleChunk = { module: n, readme: readmeSections, lessons: chunkLessons };
    modules.push({
      n,
      slug: readme.fm.slug,
      title: readme.fm.title,
      short,
      lessons,
      chunk: emit(`m${pad2(n)}`, chunk),
    });
  }

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
    return { id: c.id, name: c.name, home: c.home, anchor: c.anchor, tested: c.tested !== false };
  });

  const glossary: GlossaryItem[] = glossaryEntries.map((entry) => {
    const refs = entry.refs.map((ref) => {
      const route = routes.get(ref.path);
      if (route === undefined) {
        throw new Error(`${GLOSSARY_FILE}: ${entry.term} links to ${ref.path}, which is not a note`);
      }
      return { label: ref.label, route };
    });
    const first = refs[0];
    if (first === undefined) throw new Error(`${GLOSSARY_FILE}: ${entry.term} links to no lesson`);
    search.push({
      kind: 'term',
      title: entry.term,
      detail: first.label,
      route: first.route,
      text: normalize(`${entry.term} ${entry.definition}`),
    });
    return { id: entry.id, term: entry.term, html: renderInline(entry.definition, GLOSSARY_FILE), refs };
  });

  const missions: MissionMeta[] = [...ctx.missions]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((mission) => {
      const fm = mission.fm;
      if (fm === null) throw new Error(`${mission.path}: invalid frontmatter; run pnpm content:validate`);
      const { sections } = renderDoc(mission.body, { path: mission.path, routes, terms: null });
      search.push({
        kind: 'mission',
        title: fm.title,
        detail: `Mission ${Number(mission.id.slice('mission-'.length))}`,
        route: `#/missions/${mission.id}`,
        text: normalize([fm.title, ...fm.services].join(' ')),
      });
      return {
        id: mission.id,
        title: fm.title,
        modules: [...fm.modules],
        services: [...fm.services],
        expectedCredits: fm.expectedCredits,
        gate: fm.gate === true,
        keep: fm.keep,
        maxLiveHours: fm.maxLiveHours ?? null,
        canUseCredits: [...fm.canUseCredits],
        leftovers: [...fm.leftovers],
        sources: fm.sources.map((s) => ({ url: s.url, verified_on: s.verified_on })),
        html: sections.map((s) => s.html).join(''),
      };
    });

  const searchChunk: SearchChunk = { entries: search };
  const body = { modules, concepts, glossary, missions, search: emit('search', searchChunk) };
  const contentVersion = `c-${sha256(JSON.stringify(body)).slice(0, 6)}`;
  const index: ContentIndex = { contentVersion, ...body };
  return { contentVersion, indexFile: emit('index', index), files };
}
```

Every chunk name hashes the chunk's own JSON, and `contentVersion` hashes the index body, so the same notes always give the same names and any change to a note renames its module chunk and the index.

- [ ] **Step 11: Run the build tests to see them pass**

```bash
pnpm test tests/unit/build.test.ts tests/unit/build-real.test.ts
```

Expected: PASS, 11 tests (6 on the fixture tree, 5 on the real notes).
If `build-real` stops at "has no page on the site", the named note links to a file that is not a note: change the link in the note through the notes workflow, never the renderer.
If it stops at "raw HTML is not allowed", replace the HTML in the named note with Markdown the same way.

- [ ] **Step 12: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add schemas/chunks.ts scripts/content/lib/glossary.ts scripts/content/lib/render.ts scripts/content/build.ts src/app/search.ts tests/unit/render.test.ts tests/unit/build.test.ts tests/unit/build-real.test.ts
git commit -m "Add the content build" -m "Notes render to hashed JSON chunks with heading ids, routed links, labelled Exam guide update lines and first-use glossary buttons, plus an index and a search chunk."
```

The pre-commit hook runs `pnpm check`, which now includes the real-notes build test.

---

## Task 20: Vite plugin, entry HTML and size budgets

The plugin runs validation and the content build inside Vite, so `pnpm dev` shows content problems in the Vite overlay and `pnpm build` fails on them (spec 2.10).
In dev it serves the chunks from memory, and in the build it emits them as assets and writes the index name into `index.html` as `<meta name="ccp-content">`.

**Files:**
- Create: `scripts/csp.ts`, `scripts/content/vite-plugin.ts`, `vite.config.ts`, `index.html`, `src/ui/favicon.svg`, `src/main.tsx`, `scripts/check-budgets.ts`
- Test: `tests/unit/vite-plugin.test.ts`

- [ ] **Step 1: Write the failing plugin test**

The test drives the build hooks the way Vite calls them, with a stub plugin context.

`tests/unit/vite-plugin.test.ts`:

```ts
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contentPlugin } from '../../scripts/content/vite-plugin.ts';
import { makeFixtureRoot } from '../fixtures/content-root.ts';

type HookName = 'configResolved' | 'buildStart' | 'generateBundle' | 'transformIndexHtml';
interface Emitted {
  type: string;
  fileName: string;
  source: string;
}

/** Calls a plugin hook the way Vite does; a hook may be a function or a { handler } object. */
function callHook(plugin: Plugin, name: HookName, context: object, ...args: unknown[]): unknown {
  const hook: unknown = plugin[name];
  const fn: unknown = typeof hook === 'object' && hook !== null && 'handler' in hook ? hook.handler : hook;
  if (typeof fn !== 'function') throw new Error(`the plugin has no ${name} hook`);
  return fn.apply(context, args);
}

/** Runs the plugin's build hooks in order against a stub plugin context. */
function build(root: string): { emitted: Emitted[]; tags: unknown } {
  const emitted: Emitted[] = [];
  const context = {
    error(message: string): never {
      throw new Error(message);
    },
    emitFile(file: Emitted): string {
      emitted.push(file);
      return file.fileName;
    },
  };
  const plugin = contentPlugin(root);
  callHook(plugin, 'configResolved', context, { command: 'build' });
  callHook(plugin, 'buildStart', context);
  callHook(plugin, 'generateBundle', context);
  return { emitted, tags: callHook(plugin, 'transformIndexHtml', context) };
}

describe('contentPlugin during vite build', () => {
  // The plugin checks sources against the local date, so pin it to the fixtures' date.
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 9, 10, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits every content file and injects the index name into index.html', () => {
    const { emitted, tags } = build(makeFixtureRoot());
    const index = emitted.find((file) => file.fileName.startsWith('content/index.'));
    expect(emitted.map((file) => file.type)).toEqual(['asset', 'asset', 'asset']);
    expect(index?.fileName).toMatch(/^content\/index\.[0-9a-f]{8}\.json$/);
    expect(tags).toEqual([
      { tag: 'meta', attrs: { name: 'ccp-content', content: index?.fileName }, injectTo: 'head' },
    ]);
  });

  it('fails the build with the rule findings and the build error', () => {
    const root = makeFixtureRoot();
    appendFileSync(
      join(root, 'resources', '01-baking-basics', '01-what-a-bakery-cloud-is.md'),
      '\n- See [later](02-gone.md).\n',
    );
    expect(() => build(root)).toThrow(
      /broken link 02-gone\.md[\s\S]*content build: .*has no page on the site/,
    );
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
pnpm test tests/unit/vite-plugin.test.ts
```

Expected: FAIL, because `scripts/content/vite-plugin.ts` does not exist.

- [ ] **Step 3: Write `scripts/csp.ts`**

```ts
/**
 * The Content-Security-Policy of the site (spec 1.4): CloudFront sends it from infra/site.yaml,
 * and `vite preview` sends it too, so the end-to-end tests run under the production policy.
 */
export const CSP = "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";
```

- [ ] **Step 4: Implement `scripts/content/vite-plugin.ts`**

```ts
import { join, relative, sep } from 'node:path';
import type { ErrorPayload, Plugin, ResolvedConfig } from 'vite';
import { type BuiltContent, buildContent } from './build.ts';
import { loadContext, localDate } from './lib/context.ts';
import { formatFinding, runRules } from './rules/index.ts';

const WATCHED = ['resources', 'content'];
const CHUNK_URL = /^\/content\/[^/]+\.json$/;
const DEBOUNCE_MS = 100;

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const errorPayload = (message: string): ErrorPayload => ({ type: 'error', err: { message, stack: '' } });

/**
 * Builds the content chunks inside Vite (spec 2.10): validates and builds at start and on every change
 * under resources/ or content/, shows problems in the Vite overlay, serves the chunks from memory in dev,
 * fails `vite build` on any problem, and injects the index name into index.html.
 */
export function contentPlugin(root: string): Plugin {
  let command: ResolvedConfig['command'] = 'serve';
  let output: BuiltContent | null = null;
  let problem: string | null = null;

  /** Loads, validates and builds once; returns the problems and keeps the last good output when the build throws. */
  const check = (): string[] => {
    const problems: string[] = [];
    const ctx = loadContext(root, { today: localDate() });
    if (ctx.config === null) {
      problems.push(...ctx.loadErrors.map(formatFinding), 'content/validate.yaml is missing or invalid');
    } else {
      const { findings, missing } = runRules(ctx, ctx.config.rules);
      problems.push(...missing.map((id) => `${id} is switched on but not implemented yet`));
      problems.push(...findings.map(formatFinding));
    }
    try {
      output = buildContent(ctx);
    } catch (error) {
      problems.push(`content build: ${errorText(error)}`);
    }
    return problems;
  };

  const rebuild = (): void => {
    let problems: string[];
    try {
      problems = check();
    } catch (error) {
      problems = [`content check: ${errorText(error)}`];
    }
    problem = problems.length === 0 ? null : problems.join('\n');
  };

  return {
    name: 'ccp-content',
    configResolved(config) {
      command = config.command;
    },
    buildStart() {
      rebuild();
      if (command === 'build' && problem !== null) this.error(problem);
    },
    generateBundle() {
      if (output === null) this.error('the content build produced no output');
      for (const [fileName, source] of output.files) this.emitFile({ type: 'asset', fileName, source });
    },
    transformIndexHtml() {
      if (output === null) return [];
      return [{ tag: 'meta', attrs: { name: 'ccp-content', content: output.indexFile }, injectTo: 'head' }];
    },
    configureServer(server) {
      server.watcher.add(WATCHED.map((dir) => join(root, dir)));
      let timer: ReturnType<typeof setTimeout> | undefined;
      const onChange = (file: string): void => {
        if (!WATCHED.some((dir) => relative(root, file).startsWith(dir + sep))) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          rebuild();
          server.ws.send(problem === null ? { type: 'full-reload' } : errorPayload(problem));
        }, DEBOUNCE_MS);
      };
      server.watcher.on('change', onChange);
      server.watcher.on('add', onChange);
      server.watcher.on('unlink', onChange);
      server.ws.on('vite:client:connect', (_data, client) => {
        if (problem !== null) client.send(errorPayload(problem));
      });
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0] ?? '';
        if (!CHUNK_URL.test(path)) {
          next();
          return;
        }
        const body = output?.files.get(path.slice(1));
        res.statusCode = body === undefined ? 404 : 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(body ?? JSON.stringify({ error: `${path} is not a current content chunk` }));
      });
    },
  };
}
```

`vite:client:connect` fires for every new browser tab or reload, so a page opened while a problem stands still shows the overlay.
A request for a chunk name that is no longer current gets a 404 instead of falling through to Vite's file server.

- [ ] **Step 5: Run the plugin test to see it pass**

```bash
pnpm test tests/unit/vite-plugin.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Write `vite.config.ts`**

```ts
import { fileURLToPath } from 'node:url';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
import { contentPlugin } from './scripts/content/vite-plugin.ts';
import { CSP } from './scripts/csp.ts';

export default defineConfig({
  plugins: [preact(), contentPlugin(fileURLToPath(new URL('.', import.meta.url)))],
  build: { target: 'es2022', assetsInlineLimit: 0 },
  preview: { headers: { 'Content-Security-Policy': CSP } },
});
```

`assetsInlineLimit: 0` keeps every asset a hashed file, and the preview server sends the production CSP so the end-to-end tests in Task 24 run under it.

- [ ] **Step 7: Write the entry page, the icon and the placeholder app**

`index.html` has no inline script or style, because the CSP forbids both:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>CCP Study</title>
    <link rel="icon" type="image/svg+xml" href="/src/ui/favicon.svg" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/ui/favicon.svg` is a graphite hexagon; the `<title>` names it, which Biome's `noSvgWithoutTitle` rule requires because Biome lints SVG files too:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><title>CCP Study</title><path d="M16 2 28 9v14L16 30 4 23V9z" fill="#2d2d2d"/></svg>
```

`src/main.tsx` renders a placeholder until Task 21 replaces it with the app and adds the two CSS imports:

```tsx
import { render } from 'preact';

const root = document.getElementById('app');
if (root === null) throw new Error('index.html has no #app element');
render(<p>Loading</p>, root);
```

- [ ] **Step 8: Write `scripts/check-budgets.ts`**

```ts
/** Fails the build when the initial JavaScript or a module's content chunk exceeds its gzip budget (spec 1.1). */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const KB = 1024;
const INITIAL_JS_BUDGET = 50 * KB;
const CHUNK_BUDGET = 120 * KB;
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

console.log(
  `budgets: initial JS ${kb(initialJs)} of ${kb(INITIAL_JS_BUDGET)} in ${scripts.length} script(s); ` +
    `largest module chunk ${largest.name} ${kb(largest.size)} of ${kb(CHUNK_BUDGET)} across ${chunks.length} chunks`,
);
for (const breach of breaches) console.error(`budget breach: ${breach}`);
process.exit(breaches.length > 0 ? 1 : 0);
```

The initial JS is every script that `index.html` loads or preloads, so a chunk the app imports lazily later never counts against it.

- [ ] **Step 9: Build and check the budgets**

```bash
rm -rf dist && pnpm build
```

Expected: Vite lists `dist/index.html`, `dist/assets/favicon-<hash>.svg`, one `dist/assets/index-<hash>.js`, 13 `dist/content/mNN.<hash>.json` chunks, `dist/content/search.<hash>.json` and `dist/content/index.<hash>.json`, then `✓ built`, then a line like `budgets: initial JS 4.7 KB of 50.0 KB in 1 script(s); largest module chunk m06.<hash>.json 18.3 KB of 120.0 KB across 13 chunks`, and the command exits 0.
A prototype of this build over the current notes measured module chunks of 6 to 19 KB gzipped and an index of about 31 KB, so the budget leaves room for the questions of later phases.
If the build stops with `[plugin ccp-content]`, the message lists every finding and build error; fix each at its cause and build again.

- [ ] **Step 10: Check the output files**

```bash
ls dist/content && grep -o '<meta name="ccp-content"[^>]*>' dist/index.html
```

Expected: `index.<hash>.json`, `m01.<hash>.json` to `m13.<hash>.json` and `search.<hash>.json`, then `<meta name="ccp-content" content="content/index.<hash>.json">` with the same index name.

- [ ] **Step 11: Check the dev server**

Start the dev server in a second terminal and leave it running:

```bash
pnpm dev --port 5173 --strictPort
```

Then, in the first terminal:

```bash
INDEX=$(curl -s http://localhost:5173/ | grep -o 'content/index\.[0-9a-f]*\.json')
echo "$INDEX"
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "http://localhost:5173/$INDEX"
curl -s "http://localhost:5173/$INDEX" | head -c 90; echo
```

Expected: the index name, then `200 application/json; charset=utf-8`, then `{"contentVersion":"c-` followed by six hex digits and `","modules":[{"n":1,"slug":"introduction-to-the-cloud"`.

Open http://localhost:5173/ in the browser, where the page shows "Loading", and break a link on purpose:

```bash
printf '\n- See [a missing page](09-missing.md).\n' >> resources/04-going-global/01-introduction-to-going-global.md
```

Expected: within a second the Vite overlay shows an `R6 resources/04-going-global/01-introduction-to-going-global.md:<line>  broken link 09-missing.md` line and a `content build: ... has no page on the site` line, and reloading the tab shows the overlay again.

```bash
git checkout -- resources/04-going-global/01-introduction-to-going-global.md
```

Expected: the page reloads by itself without the overlay.
Stop the dev server with Ctrl+C.

- [ ] **Step 12: Commit**

```bash
pnpm lint:fix && pnpm typecheck && git status --short
```

Expected: only this task's files are untracked (git may list `src/ui/` as one folder), and `dist/` is not listed because `.gitignore` already ignores it.

```bash
git add scripts/csp.ts scripts/content/vite-plugin.ts scripts/check-budgets.ts vite.config.ts index.html src/main.tsx src/ui/favicon.svg tests/unit/vite-plugin.test.ts
git commit -m "Build content chunks inside Vite" -m "The Vite plugin validates and builds the content at start and on every change, shows problems in the overlay, serves chunks from memory in dev, emits them in the build and names the index in index.html; the build checks the 50 KB and 120 KB gzip budgets."
```

---

## Task 21: App shell

The shell holds the pure router and lesson order, the signals the screens read, the content loader, the styles and the top bar.
The route lives in one signal that only a single `hashchange` listener writes; that listener also closes any open dialog, because a modal dialog makes the rest of the page inert and `#main` could not take focus otherwise.
Screens arrive in Task 22, so this task ends with an interim screen that names the route, which is enough to check the shell by hand.
The keyboard hook arrives in Task 23 together with the dialogs it opens, so this task has no stub for it.

**Files:**
- Create: `src/app/router.ts`, `src/app/nav.ts`, `src/app/state.ts`, `src/app/content.ts`, `src/app/App.tsx`, `src/app/screens/Screen.tsx` (interim; Task 22 replaces it), `src/ui/tokens.css`, `src/ui/base.css`, `src/ui/Html.tsx`, `src/ui/useTitle.ts`, `src/ui/Breadcrumbs.tsx`
- Modify: `biome.json` (switch on the React rules), `src/main.tsx` (render the app)
- Test: `tests/unit/router.test.ts`, `tests/unit/nav.test.ts`

- [ ] **Step 1: Switch on Biome's React rules for Preact**

Biome 2 runs its hook and JSX rules (`useExhaustiveDependencies`, `useHookAtTopLevel`, `useJsxKeyInIterable`, `noDangerouslySetInnerHtml`) only when the `react` domain is on, and it does not detect Preact from `package.json`.
With the Task 1 configuration none of them checks this app (measured with Biome 2.5.15), so the exhaustive-dependency rule this plan relies on would never fire.
In `biome.json`, insert one line directly under `"linter": {` and leave `rules` exactly as it is, so the block starts like this:

```json
  "linter": {
    "domains": { "react": "recommended" },
    "rules": {
```

Then run:

```bash
pnpm lint
```

Expected: no errors.
The `biome-ignore` comment that Step 10 adds to `Html.tsx` doubles as a check: with the domain off, Biome reports it as a suppression with no effect.

- [ ] **Step 2: Write the failing router and lesson-order tests**

`tests/unit/router.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pad2, parseHash, type Route, toHash } from '../../src/app/router.ts';

describe('parseHash', () => {
  it('reads every route the site has', () => {
    expect(parseHash('')).toEqual({ kind: 'home' });
    expect(parseHash('#/')).toEqual({ kind: 'home' });
    expect(parseHash('#/missions')).toEqual({ kind: 'missions' });
    expect(parseHash('#/m/03')).toEqual({ kind: 'module', module: 3 });
    expect(parseHash('#/m/03/l/aws-lambda')).toEqual({
      kind: 'lesson',
      module: 3,
      slug: 'aws-lambda',
      anchor: null,
    });
    expect(parseHash('#/m/11/l/aws-support-plans/end-of-support-notice')).toEqual({
      kind: 'lesson',
      module: 11,
      slug: 'aws-support-plans',
      anchor: 'end-of-support-notice',
    });
    expect(parseHash('#/missions/mission-00')).toEqual({ kind: 'mission', id: 'mission-00' });
  });

  it('sends anything else to not-found with the hash it got', () => {
    for (const hash of [
      '#/m/00',
      '#/m/14',
      '#/m/3',
      '#/m/03/l/',
      '#/m/03/l/Bad_Slug',
      '#/missions/m-1',
      '#/x',
      '#m/03',
    ]) {
      expect(parseHash(hash)).toEqual({ kind: 'not-found', hash });
    }
  });
});

describe('toHash', () => {
  const routes: Route[] = [
    { kind: 'home' },
    { kind: 'module', module: 5 },
    { kind: 'lesson', module: 3, slug: 'aws-lambda', anchor: null },
    { kind: 'lesson', module: 11, slug: 'aws-support-plans', anchor: 'plan-comparison' },
    { kind: 'missions' },
    { kind: 'mission', id: 'mission-01' },
    { kind: 'not-found', hash: '#/nowhere' },
  ];

  it.each(routes)('round-trips $kind through parseHash', (route) => {
    expect(parseHash(toHash(route))).toEqual(route);
  });

  it('pads module numbers to two digits', () => {
    expect(toHash({ kind: 'module', module: 5 })).toBe('#/m/05');
    expect(pad2(13)).toBe('13');
  });
});
```

`tests/unit/nav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ModuleMeta } from '../../schemas/chunks.ts';
import { neighbors, up } from '../../src/app/nav.ts';

const lesson = (n: number, slug: string) => ({ n, slug, title: `Title of ${slug}`, concepts: [] });
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
});
```

- [ ] **Step 3: Run them to see them fail**

```bash
pnpm test tests/unit/router.test.ts tests/unit/nav.test.ts
```

Expected: FAIL, because `src/app/router.ts` and `src/app/nav.ts` do not exist.

- [ ] **Step 4: Implement `src/app/router.ts`**

```ts
/** Hash routes (spec 7.3); pure, so the tests run without a browser. */
export type Route =
  | { kind: 'home' }
  | { kind: 'module'; module: number }
  | { kind: 'lesson'; module: number; slug: string; anchor: string | null }
  | { kind: 'missions' }
  | { kind: 'mission'; id: string }
  | { kind: 'not-found'; hash: string };

const MODULE = '(0[1-9]|1[0-3])';
const SLUG = '([a-z0-9]+(?:-[a-z0-9]+)*)';
const MODULE_PATH = new RegExp(`^/m/${MODULE}$`);
const LESSON_PATH = new RegExp(`^/m/${MODULE}/l/${SLUG}(?:/([a-z0-9-]+))?$`);
const MISSION_PATH = /^\/missions\/(mission-\d{2})$/;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Reads `location.hash`; anything unknown becomes a not-found route that keeps the hash. */
export function parseHash(hash: string): Route {
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  if (path === '' || path === '/') return { kind: 'home' };
  if (path === '/missions') return { kind: 'missions' };
  const module = MODULE_PATH.exec(path);
  if (module) return { kind: 'module', module: Number(module[1]) };
  const lesson = LESSON_PATH.exec(path);
  if (lesson) {
    return { kind: 'lesson', module: Number(lesson[1]), slug: lesson[2] ?? '', anchor: lesson[3] ?? null };
  }
  const mission = MISSION_PATH.exec(path);
  if (mission) return { kind: 'mission', id: mission[1] ?? '' };
  return { kind: 'not-found', hash };
}

export function toHash(route: Route): string {
  switch (route.kind) {
    case 'home':
      return '#/';
    case 'module':
      return `#/m/${pad2(route.module)}`;
    case 'lesson':
      return `#/m/${pad2(route.module)}/l/${route.slug}${route.anchor === null ? '' : `/${route.anchor}`}`;
    case 'missions':
      return '#/missions';
    case 'mission':
      return `#/missions/${route.id}`;
    case 'not-found':
      return route.hash;
  }
}
```

- [ ] **Step 5: Implement `src/app/nav.ts`**

```ts
import type { ModuleMeta } from '../../schemas/chunks.ts';
import type { Route } from './router.ts';

export interface LessonLink {
  module: number;
  slug: string;
  title: string;
}

/** The lessons before and after this one in course order, across module boundaries. */
export function neighbors(
  modules: readonly ModuleMeta[],
  module: number,
  slug: string,
): { prev: LessonLink | null; next: LessonLink | null } {
  const all = modules.flatMap((m) => m.lessons.map((l) => ({ module: m.n, slug: l.slug, title: l.title })));
  const i = all.findIndex((l) => l.module === module && l.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return { prev: all[i - 1] ?? null, next: all[i + 1] ?? null };
}

/** Where Escape goes: one level up, or null at Home. */
export function up(route: Route): Route | null {
  switch (route.kind) {
    case 'lesson':
      return { kind: 'module', module: route.module };
    case 'module':
    case 'missions':
    case 'not-found':
      return { kind: 'home' };
    case 'mission':
      return { kind: 'missions' };
    case 'home':
      return null;
  }
}
```

- [ ] **Step 6: Run the tests to see them pass**

```bash
pnpm test tests/unit/router.test.ts tests/unit/nav.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 7: Write the app state `src/app/state.ts`**

```ts
import { batch, signal } from '@preact/signals';
import { parseHash, type Route } from './router.ts';

export type Overlay = 'palette' | 'help';

export interface OpenTerm {
  id: string;
  anchor: HTMLElement;
}

/** The current route; only the hashchange listener below writes it. */
export const route = signal<Route>(parseHash(location.hash));
/** The open modal dialog, if any. */
export const overlay = signal<Overlay | null>(null);
/** The glossary popover and the term button that opened it. */
export const openTerm = signal<OpenTerm | null>(null);

/** Closes the glossary popover and gives focus back to its term button. */
export function closeTerm(): void {
  const open = openTerm.value;
  if (open === null) return;
  openTerm.value = null;
  open.anchor.focus();
}

window.addEventListener('hashchange', () => {
  for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) dialog.close();
  batch(() => {
    route.value = parseHash(location.hash);
    overlay.value = null;
    openTerm.value = null;
  });
  document.getElementById('main')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
```

The listener runs once, when `App.tsx` first imports this module.
It focuses `#main` without scrolling, then scrolls to the top; a lesson screen scrolls on to its anchor afterwards, in its own effect.

- [ ] **Step 8: Write the content loader `src/app/content.ts`**

```ts
import { computed, signal } from '@preact/signals';
import type {
  ContentIndex,
  GlossaryItem,
  ModuleChunk,
  SearchChunk,
  SearchEntry,
} from '../../schemas/chunks.ts';

/** The content index named by the build in `<meta name="ccp-content">`. */
export const index = signal<ContentIndex | null>(null);
/** Set when any content file fails to load; the app shows it instead of a screen. */
export const loadError = signal<string | null>(null);
/** Module chunks loaded so far, by module number. */
export const modules = signal<ReadonlyMap<number, ModuleChunk>>(new Map());
/** The search entries, once the palette has asked for them. */
export const searchEntries = signal<readonly SearchEntry[] | null>(null);
/** Glossary items by id, for the term popovers. */
export const glossary = computed<ReadonlyMap<string, GlossaryItem>>(
  () => new Map((index.value?.glossary ?? []).map((item) => [item.id, item])),
);

const requested = new Set<string>();
let searchWanted = false;

/** Fetches one content file at most once; a failure sets `loadError` and allows a later retry. */
function load<T>(name: string, apply: (data: T) => void): void {
  if (requested.has(name)) return;
  requested.add(name);
  fetch(name)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<T>;
    })
    .then(apply)
    .catch((error: unknown) => {
      requested.delete(name);
      loadError.value = `Could not load ${name}: ${error instanceof Error ? error.message : String(error)}`;
    });
}

export function loadIndex(): void {
  const name = document.querySelector<HTMLMetaElement>('meta[name="ccp-content"]')?.content;
  if (name === undefined || name === '') {
    loadError.value = 'This page has no content index; rebuild the site.';
    return;
  }
  load<ContentIndex>(name, (data) => {
    index.value = data;
    if (searchWanted) ensureSearch();
  });
}

export function ensureModule(n: number): void {
  const meta = index.value?.modules.find((m) => m.n === n);
  if (meta === undefined || modules.value.has(n)) return;
  load<ModuleChunk>(meta.chunk, (chunk) => {
    modules.value = new Map(modules.value).set(n, chunk);
  });
}

/** Loads the search entries; asked for before the index has arrived, it loads them once the index does. */
export function ensureSearch(): void {
  searchWanted = true;
  const name = index.value?.search;
  if (name === undefined || searchEntries.value !== null) return;
  load<SearchChunk>(name, (chunk) => {
    searchEntries.value = chunk.entries;
  });
}
```

Content file names come from the build (`content/index.<hash>.json`, `content/mNN.<hash>.json`, `content/search.<hash>.json`), and `fetch` resolves them against the page, which is always the site root under hash routing.
A palette opened before the index arrives still gets its entries, because `ensureSearch` remembers the request.

- [ ] **Step 9: Write the tokens and the base styles**

`src/ui/tokens.css` holds the spec 7.1 values verbatim, one declaration per line as Biome formats CSS:

```css
/* Visual tokens from spec 7.1, verbatim; v1 is light only, so a dark remap is one more block later. */
:root {
  --surface: #f3f3f2;
  --pane: #ffffff;
  --line: #e3e3e1;
  --text: #1e1e1e;
  --muted: #6a6a6a;
  --active: #2d2d2d; /* graphite */
  --ok: #2f7d4a;
  --bad: #b42318; /* correctness, always with icon + word */
  --d1: #5b7083;
  --d2: #7a5c61;
  --d3: #5e7559;
  --d4: #8a7550; /* exam domains, charts only */
  --live: #9a6700; /* live AWS resources only */
  --update: #5b6b7a; /* "Exam guide update" label and rule */
}
```

`src/ui/base.css` (no gradients and no accent colour; graphite marks the active state):

```css
/* Base styles (spec 7.1): system fonts, a 68ch reading column, neutral surfaces, graphite for the active state. */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  background: var(--surface);
}

a {
  color: var(--active);
}

:focus-visible {
  outline: 2px solid var(--active);
  outline-offset: 2px;
}

#main:focus {
  outline: none;
}

h1,
h2,
h3 {
  line-height: 1.25;
  color: var(--active);
}

h1 {
  margin: 0 0 8px;
  font-size: 1.75rem;
}

h2 {
  margin: 32px 0 8px;
  font-size: 1.25rem;
}

h3 {
  margin: 24px 0 4px;
  font-size: 1.0625rem;
}

h2[id],
h3[id] {
  scroll-margin-top: 60px;
}

p,
ul,
ol,
dl {
  margin: 0 0 12px;
}

code,
kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.875em;
}

code {
  padding: 0 4px;
  overflow-wrap: anywhere;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 4px;
}

kbd {
  display: inline-block;
  min-width: 1.75em;
  padding: 0 6px;
  text-align: center;
  background: var(--pane);
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  border-radius: 4px;
}

.muted {
  color: var(--muted);
}

/* Top bar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  background: var(--pane);
  border-bottom: 1px solid var(--line);
}

.topbar-inner {
  display: flex;
  align-items: center;
  gap: 20px;
  max-width: calc(68ch + 32px);
  height: 44px;
  margin: 0 auto;
  padding: 0 16px;
}

.topbar a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--text);
  text-decoration: none;
}

.topbar a:hover {
  text-decoration: underline;
}

.topbar .brand {
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--active);
}

.search {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  margin-left: auto;
  padding: 0 6px 0 12px;
  font: inherit;
  font-size: 0.875rem;
  color: var(--muted);
  cursor: pointer;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
}

/* Page */
.page {
  max-width: calc(68ch + 32px);
  margin: 0 auto;
  padding: 24px 16px 64px;
}

.lede {
  margin-bottom: 24px;
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 8px;
  margin: 0 0 16px;
  padding: 0;
  font-size: 0.875rem;
  list-style: none;
  color: var(--muted);
}

.crumbs li + li::before {
  margin-right: 8px;
  content: "/";
}

.crumbs a {
  display: inline-block;
  padding: 2px 0;
  color: var(--muted);
}

/* Glossary popover */
.popover {
  position: absolute;
  z-index: 4;
  width: max-content;
  max-width: min(320px, 100vw - 32px);
  padding: 12px 16px;
  font-size: 0.9375rem;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgb(30 30 30 / 0.08);
}

.popover p,
.popover ul {
  margin: 0 0 8px;
}

.popover > :last-child {
  margin-bottom: 0;
}

.popover-label {
  font-size: 0.8125rem;
  color: var(--muted);
}

.popover-def {
  margin: 0 0 8px;
}

.popover-refs {
  padding: 0;
  list-style: none;
}

.popover-refs a {
  display: inline-block;
  padding: 2px 0;
}

/* Notes */
.prose ul,
.prose ol {
  padding-left: 1.5em;
}

.prose li {
  margin: 4px 0;
}

.prose li > ul,
.prose li > ol {
  margin: 4px 0 0;
}

.prose img {
  max-width: 100%;
  height: auto;
}

.prose pre {
  padding: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.prose pre code {
  padding: 0;
  border: 0;
}

/* Tables keep a readable width and scroll sideways on a phone, inside the focusable region of tables.ts. */
.table-scroll {
  margin: 0 0 16px;
  overflow-x: auto;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.prose table {
  width: 100%;
  min-width: 32rem;
  font-size: 0.875rem;
  border-collapse: collapse;
  border-style: hidden;
}

.prose th,
.prose td {
  padding: 6px 8px;
  text-align: left;
  vertical-align: top;
  border: 1px solid var(--line);
}

.prose th {
  font-weight: 600;
}

.update {
  margin: 8px 0;
  padding: 2px 0 2px 12px;
  list-style: none;
  border-left: 3px solid var(--update);
}

.update-label {
  margin-right: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--update);
}

.update-meta {
  font-size: 0.875rem;
  color: var(--muted);
}

.update-text {
  display: block;
}

.term {
  padding: 0;
  font: inherit;
  line-height: inherit;
  color: inherit;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
  cursor: help;
  background: none;
  border: 0;
}

.term:hover {
  text-decoration-style: solid;
}

/* List rows */
.rows {
  margin: 0 0 24px;
  padding: 0;
  list-style: none;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.rows li + li {
  border-top: 1px solid var(--line);
}

.row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-height: 44px;
  padding: 10px 16px;
  color: var(--text);
  text-decoration: none;
}

.row-n {
  flex: none;
  min-width: 2ch;
  text-align: right;
  color: var(--muted);
}

.row-title {
  min-width: 0;
}

.row:hover .row-title {
  text-decoration: underline;
}

.row-meta {
  flex: none;
  margin-left: auto;
  font-size: 0.875rem;
  white-space: nowrap;
  color: var(--muted);
}

.pager {
  display: flex;
  gap: 16px;
  margin-top: 48px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.pager a {
  display: flex;
  flex-direction: column;
  max-width: 48%;
  min-height: 44px;
  color: var(--text);
  text-decoration: none;
}

.pager a:hover .pager-title {
  text-decoration: underline;
}

.pager a[rel="next"] {
  margin-left: auto;
  text-align: right;
}

.pager-label {
  font-size: 0.875rem;
  color: var(--muted);
}

/* Missions */
.facts {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 4px 16px;
  margin: 16px 0 24px;
  padding: 12px 16px;
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.facts dt {
  color: var(--muted);
}

.facts dd {
  margin: 0;
}

.sources {
  padding-left: 1.5em;
}

.sources a {
  overflow-wrap: anywhere;
}

/* Dialogs: the palette and the help sheet */
dialog {
  padding: 0;
  color: var(--text);
  background: var(--pane);
  border: 1px solid var(--line);
  border-radius: 8px;
}

dialog::backdrop {
  background: rgb(30 30 30 / 0.2);
}

dialog.palette {
  width: min(560px, calc(100vw - 32px));
  max-width: none;
  margin: 12vh auto auto;
}

dialog.sheet {
  width: min(480px, calc(100vw - 32px));
  max-width: none;
}

.palette-input {
  position: sticky;
  top: 0;
  width: 100%;
  padding: 12px 16px;
  font: inherit;
  font-size: 1.0625rem;
  color: var(--text);
  background: var(--pane);
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
}

.palette-input:focus-visible {
  outline: none;
  border-bottom-color: var(--active);
  box-shadow: inset 0 -1px 0 var(--active);
}

.palette-status {
  margin: 0;
  padding: 12px 16px;
}

.results {
  margin: 0;
  padding: 4px 0;
  list-style: none;
}

.result {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 12px;
  min-height: 44px;
  padding: 10px 16px;
  cursor: pointer;
  scroll-margin-top: 56px;
}

.result[aria-selected="true"] {
  background: var(--surface);
  box-shadow: inset 3px 0 0 var(--active);
}

.result-kind {
  flex: none;
  width: 4.5rem;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.result-title {
  min-width: 0;
}

.result-detail {
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--muted);
}

.sheet-body {
  padding: 16px 24px 24px;
}

.sheet-body h2 {
  margin-top: 0;
}

.keys {
  width: 100%;
  margin: 0 0 16px;
  border-collapse: collapse;
}

.keys th,
.keys td {
  padding: 6px 0;
  text-align: left;
  border-bottom: 1px solid var(--line);
}

.keys th {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--muted);
}

.button {
  min-height: 36px;
  padding: 0 16px;
  font: inherit;
  color: var(--pane);
  cursor: pointer;
  background: var(--active);
  border: 0;
  border-radius: 6px;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: no-preference) {
  dialog[open],
  dialog[open]::backdrop,
  .popover {
    animation: fade-in 120ms ease-out;
  }
}

@media (max-width: 480px) {
  .facts {
    grid-template-columns: 1fr;
  }

  .facts dd {
    margin-bottom: 8px;
  }
}
```

Three choices in this file matter for later tasks.
Tables keep a minimum width of 32rem and scroll sideways inside a `.table-scroll` region, which Task 22's `tables.ts` makes focusable.
The palette list has no scroll box of its own: the dialog scrolls when needed, with the sticky input inside it, so no scrolling region lacks focusable content (axe rule `scrollable-region-focusable`).
The sections are ordered so that Biome's `noDescendingSpecificity` check stays quiet.

- [ ] **Step 10: Write the shared UI pieces**

`src/ui/Html.tsx`, the only place the app injects HTML:

```tsx
/** Renders HTML that the content build produced; the only place the app injects HTML. */
export function Html({ html, className }: { html: string; className?: string }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: the content build escapes text and rejects raw HTML in notes
  return <div class={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
```

`src/ui/useTitle.ts`:

```ts
import { useEffect } from 'preact/hooks';

/** Sets the browser tab title for the current screen. */
export function useTitle(text: string): void {
  useEffect(() => {
    document.title = `${text} · CCP`;
  }, [text]);
}
```

`src/ui/Breadcrumbs.tsx`:

```tsx
export interface Crumb {
  label: string;
  href: string;
}

/** The trail from Home to the current page; the last crumb is the page itself. */
export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol class="crumbs">
        {items.map((item, i) => (
          <li key={item.href}>
            {i === items.length - 1 ? (
              <span aria-current="page">{item.label}</span>
            ) : (
              <a href={item.href}>{item.label}</a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 11: Write the shell and render it**

`src/app/App.tsx`:

```tsx
import { useEffect } from 'preact/hooks';
import { index, loadError, loadIndex } from './content.ts';
import { Screen } from './screens/Screen.tsx';
import { route } from './state.ts';

/** The shell: the top bar, then the screen for the route once the content index has loaded. */
export function App() {
  useEffect(() => loadIndex(), []);
  return (
    <>
      <TopBar />
      <main id="main" class="page" tabIndex={-1}>
        <Body />
      </main>
    </>
  );
}

function TopBar() {
  return (
    <header class="topbar">
      <nav class="topbar-inner" aria-label="Site">
        <a class="brand" href="#/">
          CCP
        </a>
        <a href="#/missions">Missions</a>
      </nav>
    </header>
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

`src/app/screens/Screen.tsx`, the interim screen that Task 22 replaces:

```tsx
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { type Route, toHash } from '../router.ts';

/** Interim screen until Task 22: names the route and the loaded content, so the shell can be checked by hand. */
export function Screen({ route, idx }: { route: Route; idx: ContentIndex }) {
  useTitle(toHash(route));
  return (
    <>
      <h1>{toHash(route)}</h1>
      <p class="muted">
        {idx.modules.length} modules loaded, content version {idx.contentVersion}
      </p>
    </>
  );
}
```

Replace `src/main.tsx` (the Task 20 placeholder) with:

```tsx
import { render } from 'preact';
import { App } from './app/App.tsx';
import './ui/tokens.css';
import './ui/base.css';

const root = document.getElementById('app');
if (root === null) throw new Error('index.html has no #app element');
render(<App />, root);
```

- [ ] **Step 12: Check the shell by hand**

```bash
pnpm typecheck && pnpm lint && pnpm dev
```

Expected: `tsc` and Biome print no errors, and Vite serves the site on `http://localhost:5173/`.
Open it: the top bar shows `CCP` and `Missions`, the page shows the heading `#/` and the line `13 modules loaded, content version c-` followed by six hex digits.
Open `http://localhost:5173/#/m/11/l/aws-support-plans/plan-comparison`: the heading reads `#/m/11/l/aws-support-plans/plan-comparison` and the tab title ends in `· CCP`.
Open `#/m/14`: the heading reads `#/m/14`, the not-found route.
Stop the server with Ctrl+C.

- [ ] **Step 13: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add biome.json src tests/unit/router.test.ts tests/unit/nav.test.ts
git commit -m "Add the app shell" -m "Hash router, lesson order, app state, the content loader, the spec 7.1 tokens and base styles, and the top bar, with Biome's React rules switched on for Preact."
```

---

## Task 22: Screens

The reader screens: Home, a module, a lesson with glossary popovers and a pager, the missions list and a mission page.
Popover placement is a pure function with its own test, so the clamping and flipping rules are proven without a browser.

**Files:**
- Create: `src/ui/position.ts`, `src/ui/TermPopover.tsx`, `src/ui/tables.ts`, `src/app/screens/Home.tsx`, `src/app/screens/ModulePage.tsx`, `src/app/screens/LessonPage.tsx`, `src/app/screens/MissionsPage.tsx`, `src/app/screens/MissionPage.tsx`, `src/app/screens/NotFound.tsx`
- Modify: `src/app/screens/Screen.tsx` (replace the interim screen with the route switch)
- Test: `tests/unit/position.test.ts`

- [ ] **Step 1: Write the failing placement test**

`tests/unit/position.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { popoverPosition } from '../../src/ui/position.ts';

const VIEW = { width: 1280, height: 800, scrollX: 0, scrollY: 500 };
const BOX = { width: 300, height: 120 };

describe('popoverPosition', () => {
  it('opens below the term, at its left edge, in page coordinates', () => {
    expect(popoverPosition({ top: 200, bottom: 220, left: 400 }, BOX, VIEW)).toEqual({ top: 726, left: 400 });
  });

  it('keeps 16 px from the right and left edges of a phone screen', () => {
    const phone = { width: 375, height: 812, scrollX: 0, scrollY: 0 };
    expect(popoverPosition({ top: 300, bottom: 320, left: 200 }, BOX, phone).left).toBe(59);
    expect(popoverPosition({ top: 300, bottom: 320, left: 4 }, BOX, phone).left).toBe(16);
  });

  it('flips above the term when there is no room below', () => {
    expect(popoverPosition({ top: 700, bottom: 720, left: 400 }, BOX, VIEW).top).toBe(500 + 700 - 6 - 120);
  });

  it('stays below when there is no room above either, so it never hides under the top bar', () => {
    const short = { width: 1280, height: 200, scrollX: 0, scrollY: 0 };
    expect(popoverPosition({ top: 90, bottom: 110, left: 400 }, BOX, short).top).toBe(116);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
pnpm test tests/unit/position.test.ts
```

Expected: FAIL, because `src/ui/position.ts` does not exist.

- [ ] **Step 3: Implement `src/ui/position.ts`**

```ts
/** Where the glossary popover goes: pure, so it is tested without a browser. */
const EDGE = 16;
const GAP = 6;
/** Height of the sticky top bar in base.css; the popover never opens above it. */
const TOP_BAR = 44;

export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface View extends Size {
  scrollX: number;
  scrollY: number;
}

/**
 * Page coordinates for a popover of `box` size: below the anchor at its left edge, clamped 16 px
 * inside the viewport, and flipped above the anchor when it fits there but not below.
 */
export function popoverPosition(anchor: AnchorRect, box: Size, view: View): { top: number; left: number } {
  const left = Math.max(EDGE, Math.min(anchor.left, view.width - EDGE - box.width));
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - box.height;
  const fitsBelow = below + box.height <= view.height - EDGE;
  const top = !fitsBelow && above >= TOP_BAR + EDGE ? above : below;
  return { top: top + view.scrollY, left: left + view.scrollX };
}
```

- [ ] **Step 4: Run it to see it pass**

```bash
pnpm test tests/unit/position.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Write the glossary popover `src/ui/TermPopover.tsx`**

```tsx
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { GlossaryItem } from '../../schemas/chunks.ts';
import { openTerm } from '../app/state.ts';
import { Html } from './Html.tsx';
import { popoverPosition } from './position.ts';

/**
 * The glossary popover for one term button: a non-modal dialog placed under the term,
 * focused once placed, closed by Escape (keyboard.ts), a click elsewhere or focus leaving it.
 */
export function TermPopover({ item, anchor }: { item: GlossaryItem; anchor: HTMLElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const box = ref.current;
    if (box === null) return;
    const root = document.documentElement;
    setPlace(
      popoverPosition(
        anchor.getBoundingClientRect(),
        { width: box.offsetWidth, height: box.offsetHeight },
        {
          width: root.clientWidth,
          height: root.clientHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
      ),
    );
  }, [anchor]);

  useEffect(() => {
    if (place !== null) ref.current?.focus();
  }, [place]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent): void => {
      const target = event.target;
      if (target instanceof Node && (ref.current?.contains(target) || anchor.contains(target))) return;
      openTerm.value = null;
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [anchor]);

  return (
    <div
      ref={ref}
      class="popover"
      role="dialog"
      aria-label={item.term}
      tabIndex={-1}
      style={
        place === null ? { top: 0, left: 0, visibility: 'hidden' } : { top: place.top, left: place.left }
      }
      onFocusOut={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && !event.currentTarget.contains(next)) openTerm.value = null;
      }}
    >
      <p>
        <strong>{item.term}</strong>
      </p>
      <Html className="popover-def" html={item.html} />
      <p class="popover-label">Defined in</p>
      <ul class="popover-refs">
        {item.refs.map((source) => (
          <li key={source.route}>
            <a href={source.route}>{source.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

The popover renders hidden at the page origin, the layout effect measures it and places it before the first paint, and a second effect focuses it once placed.
Its position is set through Preact's style object, which writes CSSOM properties, so the CSP without `'unsafe-inline'` allows it (checked in Chromium under the production header).

- [ ] **Step 6: Write `src/ui/tables.ts`**

```ts
/**
 * Wraps each table of a rendered note in a focusable region that scrolls sideways, so wide tables stay
 * readable on a phone and keyboard users can scroll them (axe rule scrollable-region-focusable).
 */
export function scrollableTables(root: HTMLElement): void {
  for (const table of root.querySelectorAll('table')) {
    if (table.parentElement?.classList.contains('table-scroll')) continue;
    const region = document.createElement('div');
    region.className = 'table-scroll';
    region.tabIndex = 0;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', `${headingBefore(table) ?? 'Table'}, scrolls sideways`);
    table.before(region);
    region.append(table);
  }
}

/** The text of the nearest heading before the element in the same parent, if any. */
function headingBefore(element: Element): string | null {
  for (let e = element.previousElementSibling; e !== null; e = e.previousElementSibling) {
    if (/^H[1-6]$/.test(e.tagName)) return e.textContent;
  }
  return null;
}
```

The lesson screen calls this after each render of a note.
A table that scrolls without a focusable region fails axe's `scrollable-region-focusable` rule at 375 px, and letting cells wrap instead breaks words in the middle on a phone (both measured with axe-core 4.13 on the Support plans table).

- [ ] **Step 7: Write the not-found and Home screens**

`src/app/screens/NotFound.tsx`:

```tsx
import { useTitle } from '../../ui/useTitle.ts';

export function NotFound({ hash }: { hash: string }) {
  useTitle('Not found');
  return (
    <>
      <h1>Page not found</h1>
      <p>
        Nothing lives at <code>{hash}</code>.
      </p>
      <p>
        <a href="#/">Go to Home</a>
      </p>
    </>
  );
}
```

`src/app/screens/Home.tsx`:

```tsx
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { pad2 } from '../router.ts';

/** Home `#/`: the 13 modules, in course order. */
export function Home({ idx }: { idx: ContentIndex }) {
  useTitle('Home');
  const lessons = idx.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  return (
    <>
      <h1>AWS Cloud Practitioner Essentials</h1>
      <p class="muted lede">
        {idx.modules.length} modules, {lessons} lessons
      </p>
      <ul class="rows">
        {idx.modules.map((m) => (
          <li key={m.n}>
            <a class="row" href={`#/m/${pad2(m.n)}`}>
              <span class="row-n">{m.n}</span>
              <span class="row-title">{m.short}</span>
              <span class="row-meta">
                {m.lessons.length === 1 ? '1 lesson' : `${m.lessons.length} lessons`}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p>
        <a href="#/missions">Missions: real AWS, done by hand</a>
      </p>
    </>
  );
}
```

- [ ] **Step 8: Write the module screen `src/app/screens/ModulePage.tsx`**

```tsx
import { useEffect } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, modules } from '../content.ts';
import { pad2 } from '../router.ts';
import { NotFound } from './NotFound.tsx';

/** Module `#/m/NN`: the lesson list, then the module README without its title and lesson list. */
export function ModulePage({ idx, module }: { idx: ContentIndex; module: number }) {
  const meta = idx.modules.find((m) => m.n === module);
  useTitle(meta === undefined ? 'Not found' : `Module ${module}: ${meta.short}`);
  useEffect(() => ensureModule(module), [module]);
  if (meta === undefined) return <NotFound hash={`#/m/${pad2(module)}`} />;
  const chunk = modules.value.get(module);
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: `Module ${module}: ${meta.short}`, href: `#/m/${pad2(module)}` },
        ]}
      />
      <h1>{meta.short}</h1>
      <p class="muted lede">
        Module {module}, {meta.lessons.length === 1 ? '1 lesson' : `${meta.lessons.length} lessons`}
      </p>
      <h2>Lessons</h2>
      <ul class="rows">
        {meta.lessons.map((l) => (
          <li key={l.slug}>
            <a class="row" href={`#/m/${pad2(module)}/l/${l.slug}`}>
              <span class="row-n">{l.n}</span>
              <span class="row-title">{l.title}</span>
            </a>
          </li>
        ))}
      </ul>
      {chunk === undefined ? (
        <p class="muted">Loading</p>
      ) : (
        chunk.readme
          .filter((s) => s.id !== '' && s.id !== 'lessons')
          .map((s) => <Html key={s.id} className="prose" html={s.html} />)
      )}
    </>
  );
}
```

The README sections with ids `''` (the title) and `lessons` are left out, because the screen shows its own title and lesson rows.

- [ ] **Step 9: Write the lesson screen `src/app/screens/LessonPage.tsx`**

```tsx
import { useEffect, useRef } from 'preact/hooks';
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { TermPopover } from '../../ui/TermPopover.tsx';
import { scrollableTables } from '../../ui/tables.ts';
import { useTitle } from '../../ui/useTitle.ts';
import { ensureModule, glossary, modules } from '../content.ts';
import { neighbors } from '../nav.ts';
import { pad2 } from '../router.ts';
import { openTerm } from '../state.ts';
import { NotFound } from './NotFound.tsx';

interface Props {
  idx: ContentIndex;
  module: number;
  slug: string;
  anchor: string | null;
}

/** Lesson `#/m/NN/l/<slug>[/<anchor>]`: the note, its glossary popovers and the pager. */
export function LessonPage({ idx, module, slug, anchor }: Props) {
  const body = useRef<HTMLDivElement>(null);
  const meta = idx.modules.find((m) => m.n === module);
  const lessonMeta = meta?.lessons.find((l) => l.slug === slug);
  const lesson = modules.value.get(module)?.lessons[slug];
  useTitle(lessonMeta?.title ?? 'Not found');
  useEffect(() => ensureModule(module), [module]);

  useEffect(() => {
    const root = body.current;
    if (root === null || lesson === undefined) return;
    scrollableTables(root);
    if (anchor !== null) root.querySelector(`[id="${anchor}"]`)?.scrollIntoView();
    const onClick = (event: MouseEvent): void => {
      const button = event.target instanceof Element ? event.target.closest('button.term') : null;
      if (!(button instanceof HTMLButtonElement) || button.dataset.term === undefined) return;
      openTerm.value = openTerm.value?.anchor === button ? null : { id: button.dataset.term, anchor: button };
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [lesson, anchor]);

  if (meta === undefined || lessonMeta === undefined) {
    return <NotFound hash={`#/m/${pad2(module)}/l/${slug}`} />;
  }
  const { prev, next } = neighbors(idx.modules, module, slug);
  const term = openTerm.value;
  const item = term === null ? undefined : glossary.value.get(term.id);
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: `Module ${module}: ${meta.short}`, href: `#/m/${pad2(module)}` },
          { label: lessonMeta.title, href: `#/m/${pad2(module)}/l/${slug}` },
        ]}
      />
      <div ref={body}>
        {lesson === undefined ? <p class="muted">Loading</p> : <Html className="prose" html={lesson.html} />}
      </div>
      {term !== null && item !== undefined && <TermPopover key={term.id} item={item} anchor={term.anchor} />}
      <nav class="pager" aria-label="Lessons">
        {prev !== null && (
          <a rel="prev" href={`#/m/${pad2(prev.module)}/l/${prev.slug}`}>
            <span class="pager-label">Previous</span>
            <span class="pager-title">{prev.title}</span>
          </a>
        )}
        {next !== null && (
          <a rel="next" href={`#/m/${pad2(next.module)}/l/${next.slug}`}>
            <span class="pager-label">Next</span>
            <span class="pager-title">{next.title}</span>
          </a>
        )}
      </nav>
    </>
  );
}
```

One effect, keyed on the lesson and the anchor, wraps the tables, scrolls to the anchor inside the note and listens for clicks on `button.term`; clicking the open term again closes its popover.
The anchor is looked up inside the note only, so a heading id can never collide with the shell's ids.

- [ ] **Step 10: Write the missions screens**

`src/app/screens/MissionsPage.tsx`:

```tsx
import type { ContentIndex } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { useTitle } from '../../ui/useTitle.ts';

/** Missions `#/missions`: the real-AWS missions, read-only in Phase 0. */
export function MissionsPage({ idx }: { idx: ContentIndex }) {
  useTitle('Missions');
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Home', href: '#/' },
          { label: 'Missions', href: '#/missions' },
        ]}
      />
      <h1>Missions</h1>
      <p class="muted lede">
        These pages are read-only for now: you do each mission by hand, in your own AWS account.
      </p>
      <ul class="rows">
        {idx.missions.map((m) => (
          <li key={m.id}>
            <a class="row" href={`#/missions/${m.id}`}>
              <span class="row-n">{Number(m.id.slice('mission-'.length))}</span>
              <span class="row-title">{m.title}</span>
              <span class="row-meta">{m.expectedCredits}</span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
```

`src/app/screens/MissionPage.tsx`:

```tsx
import type { ContentIndex, MissionMeta } from '../../../schemas/chunks.ts';
import { Breadcrumbs } from '../../ui/Breadcrumbs.tsx';
import { Html } from '../../ui/Html.tsx';
import { useTitle } from '../../ui/useTitle.ts';
import { pad2 } from '../router.ts';
import { NotFound } from './NotFound.tsx';

function lifetime(m: MissionMeta): string {
  if (m.keep) return 'Kept running';
  if (m.maxLiveHours !== null) return `Cleaned up within ${m.maxLiveHours} hours`;
  return 'No live resources';
}

/** Mission `#/missions/mission-NN`: the facts box, the steps and the sources they were checked against. */
export function MissionPage({ idx, id }: { idx: ContentIndex; id: string }) {
  const m = idx.missions.find((x) => x.id === id);
  useTitle(m?.title ?? 'Not found');
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
      <Html className="prose" html={m.html} />
      <h2>Sources</h2>
      <ul class="sources">
        {m.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} rel="noopener noreferrer" target="_blank">
              {s.url}
            </a>{' '}
            <span class="muted">checked {s.verified_on}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
```

- [ ] **Step 11: Replace `src/app/screens/Screen.tsx` with the route switch**

```tsx
import type { ContentIndex } from '../../../schemas/chunks.ts';
import type { Route } from '../router.ts';
import { Home } from './Home.tsx';
import { LessonPage } from './LessonPage.tsx';
import { MissionPage } from './MissionPage.tsx';
import { MissionsPage } from './MissionsPage.tsx';
import { ModulePage } from './ModulePage.tsx';
import { NotFound } from './NotFound.tsx';

/** The screen for a route; the content index is always loaded by the time this renders. */
export function Screen({ route, idx }: { route: Route; idx: ContentIndex }) {
  switch (route.kind) {
    case 'home':
      return <Home idx={idx} />;
    case 'module':
      return <ModulePage idx={idx} module={route.module} />;
    case 'lesson':
      return <LessonPage idx={idx} module={route.module} slug={route.slug} anchor={route.anchor} />;
    case 'missions':
      return <MissionsPage idx={idx} />;
    case 'mission':
      return <MissionPage idx={idx} id={route.id} />;
    case 'not-found':
      return <NotFound hash={route.hash} />;
  }
}
```

- [ ] **Step 12: Check the screens by hand**

```bash
pnpm typecheck && pnpm lint && pnpm dev
```

Expected: no `tsc` or Biome errors, and Vite serves `http://localhost:5173/`.
Check each of these in the browser:

1. Home shows the H1 "AWS Cloud Practitioner Essentials", the line `13 modules, 87 lessons` and 13 module rows.
2. Module 11 shows breadcrumbs, the H1 "Pricing and Support", its lesson rows, then the README sections from "What this module covers" on.
3. The Support plans lesson shows its H1, and under "End of support notice" each update line shows the small uppercase label "Exam guide update", then "verified" with the date and a source link, then its sentence.
4. Clicking a dotted term opens its popover just under it, with the definition and "Defined in" links; clicking elsewhere closes it (Escape arrives in Task 23).
5. The pager at the end links the previous and next lessons, and from the last lesson of Module 10 Next goes to the first lesson of Module 11.
6. With the window 375 px wide, the "Plan comparison" table scrolls sideways inside its bordered box while the page itself never scrolls sideways.
7. `#/missions` lists Missions 0 and 1, and `#/missions/mission-00` shows the facts box, the steps and the Sources list with checked dates.

Stop the server with Ctrl+C.

- [ ] **Step 13: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add src tests/unit/position.test.ts
git commit -m "Add the reader screens" -m "Home, module, lesson with glossary popovers, scrollable tables and a pager, the missions list and mission pages."
```

---

## Task 23: Search palette, help and keyboard

The palette ranks the search entries in the browser, the help sheet lists the shortcuts, and one window listener maps keys to commands.
The mapping from a key to a command is pure (`src/app/keys.ts`), so every shortcut is tested in Vitest; the hook in `keyboard.ts` only feeds it events and applies its commands.

**Files:**
- Create: `src/app/keys.ts`, `src/app/keyboard.ts`, `src/ui/backdrop.ts`, `src/app/screens/Palette.tsx`, `src/app/screens/Help.tsx`
- Modify: `src/app/search.ts` (add `rank`), `src/app/App.tsx` (keyboard, Search button and dialogs)
- Test: `tests/unit/search.test.ts`, `tests/unit/keys.test.ts`, `tests/unit/backdrop.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/unit/search.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { SearchEntry } from '../../schemas/chunks.ts';
import { normalize, rank } from '../../src/app/search.ts';

const entry = (
  kind: SearchEntry['kind'],
  title: string,
  route: string,
  text = normalize(title),
): SearchEntry => ({
  kind,
  title,
  detail: '',
  route,
  text,
});

const ENTRIES: SearchEntry[] = [
  entry('term', 'AWS Lambda', '#/m/03/l/aws-lambda'),
  entry('concept', 'AWS Lambda', '#/m/03/l/aws-lambda/how-lambda-works'),
  entry('module', 'Exploring Compute Services', '#/m/03'),
  entry('lesson', 'AWS Lambda', '#/m/03/l/aws-lambda'),
  entry('module', 'Introduction to the Cloud', '#/m/01'),
  entry('term', 'S3 Glacier', '#/m/06/l/amazon-s3'),
  entry('module', 'Amazon S3 storage', '#/m/06'),
  entry(
    'lesson',
    'Serverless computing',
    '#/m/03/l/serverless',
    'serverless computing run code without managing servers',
  ),
];

describe('rank', () => {
  it('ranks the lesson above the concept and the term of the same name', () => {
    expect(rank(ENTRIES, 'lambda').map((e) => e.kind)).toEqual(['lesson', 'concept', 'term']);
  });

  it('lists the modules in course order for an empty query', () => {
    expect(rank(ENTRIES, '  ').map((e) => e.route)).toEqual(['#/m/03', '#/m/01', '#/m/06']);
  });

  it('puts a title prefix above a word match, whatever the kinds', () => {
    expect(rank(ENTRIES, 's3').map((e) => e.title)).toEqual(['S3 Glacier', 'Amazon S3 storage']);
  });

  it('matches every query word as a word prefix in the text, and nothing else', () => {
    expect(rank(ENTRIES, 'manag serv').map((e) => e.title)).toEqual(['Serverless computing']);
    expect(rank(ENTRIES, 'ambda')).toEqual([]);
  });
});
```

`tests/unit/keys.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ModuleMeta } from '../../schemas/chunks.ts';
import { type KeyContext, type KeyInput, keyCommand } from '../../src/app/keys.ts';

const lesson = (n: number, slug: string) => ({ n, slug, title: slug, concepts: [] });
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
});
```

`tests/unit/backdrop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { closeOnBackdrop } from '../../src/ui/backdrop.ts';

function fakeDialog() {
  const dialog = {
    closed: false,
    getBoundingClientRect: () => ({ left: 100, right: 500, top: 100, bottom: 400 }),
    close() {
      dialog.closed = true;
    },
  };
  return dialog;
}

describe('closeOnBackdrop', () => {
  it('closes on a press outside the dialog box', () => {
    const dialog = fakeDialog();
    closeOnBackdrop(dialog, { target: dialog, clientX: 50, clientY: 200 });
    expect(dialog.closed).toBe(true);
  });

  it('stays open for a press on the dialog itself, such as its scrollbar, or on its content', () => {
    const dialog = fakeDialog();
    closeOnBackdrop(dialog, { target: dialog, clientX: 495, clientY: 200 });
    closeOnBackdrop(dialog, { target: {}, clientX: 50, clientY: 200 });
    expect(dialog.closed).toBe(false);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

```bash
pnpm test tests/unit/search.test.ts tests/unit/keys.test.ts tests/unit/backdrop.test.ts
```

Expected: FAIL; the search tests report `rank is not a function`, and `src/app/keys.ts` and `src/ui/backdrop.ts` do not exist.

- [ ] **Step 3: Add `rank` to `src/app/search.ts`**

Add this import as the first line of `src/app/search.ts`:

```ts
import type { SearchEntry } from '../../schemas/chunks.ts';
```

Then append this below `normalize`, which stays as Task 19 wrote it:

```ts
const KIND_WEIGHT: Record<SearchEntry['kind'], number> = {
  module: 4,
  lesson: 3,
  concept: 2,
  term: 1,
  mission: 0,
};

function score(entry: SearchEntry, q: string, words: readonly string[]): number {
  const title = normalize(entry.title);
  let base = 0;
  if (title === q) base = 400;
  else if (title.startsWith(q)) base = 300;
  else if (` ${title}`.includes(` ${q}`)) base = 200;
  else if (words.every((w) => ` ${entry.text}`.includes(` ${w}`))) base = 100;
  if (base === 0) return 0;
  return base + KIND_WEIGHT[entry.kind] * 10 - Math.min(entry.title.length, 60) / 100;
}

/**
 * Palette results, best first: exact title, title prefix, word prefix in the title, then every query word
 * as a word prefix in the text; kind breaks ties (module, lesson, concept, term, mission), then shorter titles.
 * An empty query lists the modules in course order.
 */
export function rank(entries: readonly SearchEntry[], query: string): SearchEntry[] {
  const q = normalize(query);
  if (q === '') return entries.filter((e) => e.kind === 'module');
  const words = q.split(' ');
  return entries
    .map((entry) => ({ entry, score: score(entry, q, words) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map((s) => s.entry);
}
```

The import is type-only, so `scripts/content/build.ts` still runs this file under Node's type stripping.
The kind weight adds at most 40, less than the 100 between two match tiers, so it only orders entries within a tier.

- [ ] **Step 4: Implement `src/app/keys.ts`**

```ts
import type { ModuleMeta } from '../../schemas/chunks.ts';
import { neighbors, up } from './nav.ts';
import { type Route, toHash } from './router.ts';

/** The parts of a keydown event the shortcuts look at. */
export interface KeyInput {
  key: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  /** True when the event comes from a text field. */
  typing: boolean;
  /** The event's timestamp in milliseconds. */
  at: number;
}

export interface KeyContext {
  route: Route;
  modules: readonly ModuleMeta[];
  overlayOpen: boolean;
  termOpen: boolean;
  /** When `g` was pressed, if it was the previous key. */
  gAt: number | null;
}

export type KeyCommand =
  | { kind: 'palette' }
  | { kind: 'help' }
  | { kind: 'close-term' }
  | { kind: 'g'; at: number }
  | { kind: 'navigate'; hash: string };

/** How long `g` waits for its second key. */
export const G_WINDOW_MS = 1000;

/** The global shortcuts of spec 7.4 that Phase 0 has; null means the key is not ours. */
export function keyCommand(input: KeyInput, ctx: KeyContext): KeyCommand | null {
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if ((input.meta || input.ctrl) && !input.alt && key === 'k') return { kind: 'palette' };
  if (input.meta || input.ctrl || input.alt || ctx.overlayOpen) return null;
  if (key === 'Escape' && ctx.termOpen) return { kind: 'close-term' };
  if (input.typing) return null;
  switch (key) {
    case '/':
      return { kind: 'palette' };
    case '?':
      return { kind: 'help' };
    case 'g':
      return { kind: 'g', at: input.at };
    case 'h':
      return ctx.gAt !== null && input.at - ctx.gAt <= G_WINDOW_MS ? { kind: 'navigate', hash: '#/' } : null;
    case 'Escape': {
      const parent = up(ctx.route);
      return parent === null ? null : { kind: 'navigate', hash: toHash(parent) };
    }
    case '[':
    case ']': {
      if (ctx.route.kind !== 'lesson') return null;
      const { prev, next } = neighbors(ctx.modules, ctx.route.module, ctx.route.slug);
      const target = key === '[' ? prev : next;
      return target === null
        ? null
        : {
            kind: 'navigate',
            hash: toHash({ kind: 'lesson', module: target.module, slug: target.slug, anchor: null }),
          };
    }
    default:
      return null;
  }
}
```

- [ ] **Step 5: Implement `src/ui/backdrop.ts`**

```ts
/** The parts of a dialog and a mouse event that `closeOnBackdrop` reads, so tests can pass plain objects. */
export interface DialogLike {
  getBoundingClientRect: () => { left: number; right: number; top: number; bottom: number };
  close: () => void;
}

export interface PressLike {
  target: unknown;
  clientX: number;
  clientY: number;
}

/**
 * Closes a modal dialog when a press lands on its backdrop: the event targets the dialog itself,
 * but outside its box (a press on the dialog's padding or scrollbar also targets the dialog).
 */
export function closeOnBackdrop(dialog: DialogLike, event: PressLike): void {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  const inside =
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom;
  if (!inside) dialog.close();
}
```

A press on a dialog's padding or scrollbar also targets the dialog element, so checking the target alone would close the palette when its scrollbar is dragged.

- [ ] **Step 6: Run the tests to see them pass**

```bash
pnpm test tests/unit/search.test.ts tests/unit/keys.test.ts tests/unit/backdrop.test.ts
```

Expected: PASS, 11 tests.

- [ ] **Step 7: Write the keyboard hook `src/app/keyboard.ts`**

```ts
import { useEffect } from 'preact/hooks';
import { index } from './content.ts';
import { keyCommand } from './keys.ts';
import { closeTerm, openTerm, overlay, route } from './state.ts';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** The one window keydown listener for the global shortcuts (spec 7.4); dialogs handle their own keys. */
export function useKeyboard(): void {
  useEffect(() => {
    let gAt: number | null = null;
    const onKeyDown = (event: KeyboardEvent): void => {
      const command = keyCommand(
        {
          key: event.key,
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          typing: isTyping(event.target),
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
      gAt = command?.kind === 'g' ? command.at : null;
      if (command === null) return;
      event.preventDefault();
      switch (command.kind) {
        case 'palette':
          overlay.value = 'palette';
          break;
        case 'help':
          overlay.value = 'help';
          break;
        case 'close-term':
          closeTerm();
          break;
        case 'navigate':
          location.hash = command.hash;
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

Escape reaches this listener before a modal dialog handles it, and the open overlay makes `keyCommand` return null, so Escape closes the dialog without also going up a level.

- [ ] **Step 8: Write the palette `src/app/screens/Palette.tsx`**

```tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import type { SearchEntry } from '../../../schemas/chunks.ts';
import { closeOnBackdrop } from '../../ui/backdrop.ts';
import { ensureSearch, searchEntries } from '../content.ts';
import { rank } from '../search.ts';
import { overlay } from '../state.ts';

/** Enough rows for the 13 modules that an empty query lists. */
const MAX_RESULTS = 13;
const KIND_LABEL: Record<SearchEntry['kind'], string> = {
  module: 'Module',
  lesson: 'Lesson',
  concept: 'Concept',
  term: 'Term',
  mission: 'Mission',
};
const optionId = (i: number): string => `palette-option-${i}`;

/** The search palette (`/` or Cmd+K): a modal dialog with a combobox over the search entries. */
export function Palette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const entries = searchEntries.value;
  const results = entries === null ? [] : rank(entries, query).slice(0, MAX_RESULTS);
  const expanded = results.length > 0;

  useEffect(() => {
    const el = dialog.current;
    if (el !== null && !el.open) el.showModal();
    ensureSearch();
  }, []);

  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (entry: SearchEntry | undefined): void => {
    if (entry !== undefined) location.hash = entry.route;
  };

  return (
    <dialog
      ref={dialog}
      class="palette"
      aria-label="Search the notes"
      onClose={() => {
        if (overlay.value === 'palette') overlay.value = null;
      }}
      onMouseDown={(event) => closeOnBackdrop(event.currentTarget, event)}
      onClick={(event) => {
        const option = event.target instanceof Element ? event.target.closest('[role="option"]') : null;
        if (option !== null) go(results[Number(option.getAttribute('data-index'))]);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const step = event.key === 'ArrowDown' ? 1 : -1;
          setActive((i) => Math.min(Math.max(i + step, 0), Math.max(results.length - 1, 0)));
        } else if (event.key === 'Enter') {
          event.preventDefault();
          go(results[active]);
        }
      }}
    >
      <input
        class="palette-input"
        type="search"
        role="combobox"
        aria-label="Search"
        aria-autocomplete="list"
        aria-controls={expanded ? 'palette-results' : undefined}
        aria-expanded={expanded}
        aria-activedescendant={expanded ? optionId(active) : undefined}
        placeholder="Search lessons, concepts and terms"
        autocomplete="off"
        spellcheck={false}
        value={query}
        onInput={(event) => {
          setQuery(event.currentTarget.value);
          setActive(0);
        }}
      />
      {expanded ? (
        <div id="palette-results" class="results" role="listbox" aria-label="Results">
          {results.map((entry, i) => (
            <div
              key={`${entry.kind} ${entry.route}`}
              id={optionId(i)}
              class="result"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              data-index={i}
            >
              <span class="result-kind">{KIND_LABEL[entry.kind]}</span>
              <span class="result-title">{entry.title}</span>
              <span class="result-detail">{entry.detail}</span>
            </div>
          ))}
        </div>
      ) : (
        <p class="muted palette-status" role="status">
          {entries === null ? 'Loading' : 'No results'}
        </p>
      )}
    </dialog>
  );
}
```

Each option is the `div[role=option]` itself, not a link inside it, because axe's `nested-interactive` rule fails any link inside an option, even one with `tabIndex={-1}` (measured with axe-core 4.13).
Biome's a11y rules ask for `div` elements rather than `ul` and `li` for the listbox roles, and for `tabIndex={-1}` on each option.
The palette shows at most 13 results, so the empty query lists all 13 modules.
`aria-controls` and `aria-activedescendant` are set only while the listbox exists, and the "Loading" or "No results" status sits outside it.
Opening the palette with `/` never types the slash into the input, because the keydown is cancelled before the dialog opens.

- [ ] **Step 9: Write the help sheet `src/app/screens/Help.tsx`**

```tsx
import { useEffect, useRef } from 'preact/hooks';
import { closeOnBackdrop } from '../../ui/backdrop.ts';
import { overlay } from '../state.ts';

const SHORTCUTS: readonly { keys: readonly string[]; joiner: string; action: string }[] = [
  { keys: ['/', 'Cmd+K'], joiner: 'or', action: 'Search' },
  { keys: ['?'], joiner: '', action: 'This help' },
  { keys: ['g', 'h'], joiner: 'then', action: 'Home' },
  { keys: ['[', ']'], joiner: 'and', action: 'Previous or next lesson' },
  { keys: ['Esc'], joiner: '', action: 'Close, or go up one level' },
];

/** The keyboard help sheet (`?`). */
export function Help() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (el !== null && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      class="sheet"
      aria-labelledby="help-title"
      onClose={() => {
        if (overlay.value === 'help') overlay.value = null;
      }}
      onMouseDown={(event) => closeOnBackdrop(event.currentTarget, event)}
    >
      <div class="sheet-body">
        <h2 id="help-title">Keyboard shortcuts</h2>
        <table class="keys">
          <thead>
            <tr>
              <th scope="col">Keys</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.action}>
                <td>
                  {s.keys.map((k, i) => (
                    <span key={k}>
                      {i > 0 && ` ${s.joiner} `}
                      <kbd>{k}</kbd>
                    </span>
                  ))}
                </td>
                <td>{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form method="dialog">
          <button class="button" type="submit">
            Close
          </button>
        </form>
      </div>
    </dialog>
  );
}
```

Each dialog's `onClose` clears `overlay` only while it still names that dialog, so switching from help to the palette with Cmd+K never closes the palette that just opened.

- [ ] **Step 10: Replace `src/app/App.tsx`**

```tsx
import { useEffect } from 'preact/hooks';
import { index, loadError, loadIndex } from './content.ts';
import { useKeyboard } from './keyboard.ts';
import { Help } from './screens/Help.tsx';
import { Palette } from './screens/Palette.tsx';
import { Screen } from './screens/Screen.tsx';
import { overlay, route } from './state.ts';

/** The shell: the top bar, the screen for the route once the content index has loaded, and the open dialog. */
export function App() {
  useEffect(() => loadIndex(), []);
  useKeyboard();
  return (
    <>
      <TopBar />
      <main id="main" class="page" tabIndex={-1}>
        <Body />
      </main>
      {overlay.value === 'palette' && <Palette />}
      {overlay.value === 'help' && <Help />}
    </>
  );
}

function TopBar() {
  return (
    <header class="topbar">
      <nav class="topbar-inner" aria-label="Site">
        <a class="brand" href="#/">
          CCP
        </a>
        <a href="#/missions">Missions</a>
        <button
          class="search"
          type="button"
          onClick={() => {
            overlay.value = 'palette';
          }}
        >
          Search <kbd>/</kbd>
        </button>
      </nav>
    </header>
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

- [ ] **Step 11: Run the fast gate and the build**

```bash
pnpm check && pnpm build
```

Expected: `pnpm check` passes, and the build's budget line reports initial JS of about 14 KB gzipped, under the 50 KB budget.

- [ ] **Step 12: Check the keyboard and the dialogs by hand under the production CSP**

```bash
pnpm preview
```

Open `http://localhost:4173/` with the browser console showing, and check:

1. `/` opens the palette with the 13 modules listed and the first one selected, and the input holds no slash.
2. Typing `aws lambda` selects the lesson "AWS Lambda" first, above the concept and the glossary term of the same name, and Enter lands on `#/m/03/l/aws-lambda` with the palette closed.
   Typing only `lambda` ranks the concepts and terms whose titles start with "Lambda" above the lesson, whose title matches only at a word, which is the ranking working as designed.
3. On that lesson, Tab to the dotted term and press Enter: the popover opens with focus in it, Escape closes it, focus returns to the term and the page stays on the lesson.
4. `]` moves to the next lesson and `[` moves back.
5. `?` opens the help sheet; Escape closes it and the page stays on the lesson.
6. Escape alone goes up to Module 3, and `g` then `h` goes Home.
7. Cmd+K opens the palette, and a click on the dimmed backdrop closes it.
8. The console shows no error, in particular no Content-Security-Policy violation.

Stop the server with Ctrl+C.

- [ ] **Step 13: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add src tests/unit/search.test.ts tests/unit/keys.test.ts tests/unit/backdrop.test.ts
git commit -m "Add search, help and keyboard shortcuts" -m "A ranked search palette, the shortcut sheet and the spec 7.4 global keys, with the key mapping pure and tested."
```

---

## Task 24: End-to-end and accessibility tests

The suite runs the production build in desktop Chromium and in mobile WebKit at 375 px, served by `vite preview`, which sends the same CSP as CloudFront (Task 20).
An `afterEach` hook fails any test that logged a console error or threw a page error, so every test also proves that the app runs under that CSP.
The axe scan checks WCAG 2.2 AA on every Phase 0 screen and on both overlays, and each screen must fit the viewport with no sideways scroll, because reading on a phone is the Phase 0 outcome.
The palette test types "aws lambda", so the lesson's exact title match (400 points in Task 23's `rank`) outranks the concepts and glossary terms whose names merely start with "Lambda".

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/reader.spec.ts`
- Modify: whichever app file a failing test or axe violation points at (under `src/`, or the renderer in `scripts/content/lib/render.ts`)

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

/** End-to-end and accessibility tests against the production build, which `vite preview` serves with the site's CSP. */
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4173',
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

`devices['iPhone 13']` brings WebKit, touch and the mobile user agent, and the viewport override sets the 375 px width that spec 9 tests.

- [ ] **Step 2: Write the tests**

`tests/e2e/reader.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, test } from '@playwright/test';

const HOME_TITLE = 'AWS Cloud Practitioner Essentials';
const SUPPORT_PLANS = '/#/m/11/l/aws-support-plans';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Console errors and uncaught page errors of the running test; a CSP violation shows up here as a console error. */
let problems: string[] = [];

test.beforeEach(({ page }) => {
  problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    problems.push(`page error: ${error.message}`);
  });
});

test.afterEach(() => {
  expect(problems, 'console errors and page errors during the test').toEqual([]);
});

const h1 = (page: Page, name: string): Locator => page.getByRole('heading', { level: 1, name, exact: true });

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations = results.violations.map(
    (v) => `${v.id} (${v.nodes.length} nodes): ${v.help}; first: ${v.nodes[0]?.html ?? ''}`,
  );
  expect(violations).toEqual([]);
}

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'pixels of horizontal overflow').toBe(0);
}

test('Home lists the 13 modules', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await expect(page.locator('main a[href^="#/m/"]')).toHaveCount(13);
  await expect(page.locator('main a[href="#/m/05"]')).toContainText('Networking');
});

test('a lesson shows its exam guide updates and a glossary popover that Escape closes', async ({ page }) => {
  await page.goto(SUPPORT_PLANS);
  await expect(h1(page, 'AWS Support Plans')).toBeVisible();
  const update = page.locator('li.update').first();
  await expect(update).toContainText('Exam guide update');
  await expect(update).toContainText('verified');

  const term = page.locator('button.term').first();
  const label = (await term.innerText()).trim();
  expect(label).not.toBe('');
  await term.click();
  const popover = page.getByRole('dialog', { name: label });
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('Defined in');
  await expect(popover).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
  await expect(term).toBeFocused();
  await expect(page).toHaveURL(/#\/m\/11\/l\/aws-support-plans$/);
});

test('the palette finds a lesson and Enter opens it', async ({ page }) => {
  await page.goto('/');
  await expect(h1(page, HOME_TITLE)).toBeVisible();
  await page.keyboard.press('/');
  const search = page.getByRole('combobox');
  await expect(search).toBeVisible();
  await search.fill('aws lambda');
  await expect(page.getByRole('option', { selected: true })).toContainText('AWS Lambda');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/m\/03\/l\/aws-lambda$/);
  await expect(h1(page, 'AWS Lambda')).toBeVisible();
  await expect(page.getByRole('combobox')).toHaveCount(0);
});

test('] and [ move to the next lesson and back', async ({ page }) => {
  await page.goto(SUPPORT_PLANS);
  await expect(h1(page, 'AWS Support Plans')).toBeVisible();
  await page.keyboard.press(']');
  await expect(page).toHaveURL(/#\/m\/11\/l\/aws-marketplace-and-aws-partners$/);
  await expect(h1(page, 'AWS Marketplace and AWS Partners')).toBeVisible();
  await page.keyboard.press('[');
  await expect(page).toHaveURL(/#\/m\/11\/l\/aws-support-plans$/);
  await expect(h1(page, 'AWS Support Plans')).toBeVisible();
});

test('the missions list shows Missions 0 and 1', async ({ page }) => {
  await page.goto('/#/missions');
  const rows = page.locator('main a[href^="#/missions/"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Guardrails before anything else');
  await expect(rows.nth(1)).toContainText('Host this site on S3 and CloudFront');
});

test('a mission page shows its facts and its sources', async ({ page }) => {
  await page.goto('/#/missions/mission-00');
  await expect(h1(page, 'Guardrails before anything else')).toBeVisible();
  const facts = page.locator('dl.facts');
  await expect(facts).toContainText('AWS Budgets');
  await expect(facts).toContainText('$0');
  await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible();
  await expect(page.locator('main a[href="https://aws.amazon.com/free/"]').first()).toBeVisible();
});

const SCREENS: { name: string; path: string; ready: (page: Page) => Locator }[] = [
  { name: 'Home', path: '/', ready: (page) => h1(page, HOME_TITLE) },
  {
    name: 'Module 5',
    path: '/#/m/05',
    ready: (page) => page.getByRole('heading', { level: 2, name: 'Key takeaways' }),
  },
  {
    name: 'the Support plans lesson',
    path: SUPPORT_PLANS,
    ready: (page) => page.locator('li.update').first(),
  },
  {
    name: 'Missions',
    path: '/#/missions',
    ready: (page) => page.locator('main a[href="#/missions/mission-01"]'),
  },
  { name: 'Mission 0', path: '/#/missions/mission-00', ready: (page) => page.locator('dl.facts') },
];

test.describe('accessibility and layout', () => {
  for (const view of SCREENS) {
    test(`${view.name} has no axe violations and no sideways scroll`, async ({ page }) => {
      await page.goto(view.path);
      await expect(view.ready(page)).toBeVisible();
      await expectNoAxeViolations(page);
      await expectNoSidewaysScroll(page);
    });
  }

  test('the open palette has no axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(h1(page, HOME_TITLE)).toBeVisible();
    await page.keyboard.press('/');
    await page.getByRole('combobox').fill('aws lambda');
    await expect(page.getByRole('option').first()).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('the open help sheet has no axe violations', async ({ page }) => {
    await page.goto('/');
    await expect(h1(page, HOME_TITLE)).toBeVisible();
    await page.keyboard.press('?');
    await expect(page.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
```

The tests rely on this DOM contract from Tasks 19 to 23: Home rows link to `#/m/NN`, mission rows link to `#/missions/mission-NN`, update lines are `li.update`, glossary terms are `button.term`, the term popover is a `role="dialog"` named after its term, the palette input is a `combobox` whose `option` elements carry `aria-selected`, and mission facts sit in `dl.facts`.

- [ ] **Step 3: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: `tsc` prints nothing and Biome reports no errors.
If `tsc` says that one `Page` type is not assignable to another, `@axe-core/playwright` resolved a second copy of `playwright-core`; pin it to the runner's version with `pnpm add -D -E playwright-core@1.63.0` and re-run.

- [ ] **Step 4: See the console guard catch a CSP violation**

Break the built page on purpose, run one test, then rebuild:

```bash
pnpm build
python3 - <<'EOF'
from pathlib import Path
page = Path('dist/index.html')
html = page.read_text()
assert '</head>' in html
page.write_text(html.replace('</head>', '<script>document.title = "inline"</script></head>'))
EOF
pnpm exec playwright test --project chromium-desktop --grep 'Home lists'; echo "exit $?"
pnpm build
```

Expected: the test fails in its `afterEach` with `console error: Refused to execute inline script because it violates the following Content Security Policy directive: "default-src 'self'"` and the rest of Chrome's message, then `exit 1`.
The last `pnpm build` restores `dist/index.html`.

- [ ] **Step 5: Run the whole suite**

```bash
pnpm build && pnpm e2e
```

Expected: the budget line from the build, then Playwright's list ending with `26 passed`, 13 tests in each of `chromium-desktop` and `webkit-mobile`.
For any failure, open its trace with `pnpm exec playwright show-trace test-results/<test folder>/trace.zip`, find the cause in the app and fix it there; never loosen, skip or retry a test.
Two findings are the likeliest at 375 px, each with its fix at the cause:
- axe `scrollable-region-focusable` on a wide note table means a table escaped the focusable `.table-scroll` region of Task 22, so check that the screen showing it calls `scrollableTables` after the note renders and that `.table-scroll`, not the table, carries `overflow-x: auto` in `src/ui/base.css`.
- Sideways scroll from a long unbroken word or URL needs `overflow-wrap: anywhere` on `.prose` in `src/ui/base.css`.

After a renderer change, run `pnpm test` too, because `tests/unit/render.test.ts` pins the rendered HTML.

- [ ] **Step 6: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add playwright.config.ts tests src scripts
git commit -m "Add end-to-end and accessibility tests" -m "Playwright runs the production build under its CSP in desktop Chromium and mobile WebKit, with axe at WCAG 2.2 AA on every Phase 0 screen and no sideways scroll at 375 px."
```

---

## Task 25: Hosting template and deploy command

`infra/site.yaml` is the Mission 1 stack of spec 1.4, and `pnpm site:deploy` publishes `dist/` to it.
The template uses long-form intrinsics only, so the `yaml` package parses it and a unit test pins every security property.
The logic that decides what to delete is pure and tested, the script around it only calls the AWS CLI, and no test calls AWS.

**Files:**
- Create: `infra/site.yaml`, `scripts/lib/deploy.ts`, `scripts/site-deploy.ts`
- Test: `tests/unit/infra.test.ts`, `tests/unit/deploy.test.ts`

- [ ] **Step 1: Write the failing template test**

`tests/unit/infra.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseDocument } from 'yaml';
import { CSP } from '../../scripts/csp.ts';

const text = readFileSync(fileURLToPath(new URL('../../infra/site.yaml', import.meta.url)), 'utf8');
const doc = parseDocument(text);
const template: unknown = doc.toJS();

/** Walks a dotted path through the parsed template; a numeric segment indexes a list. */
function at(path: string): unknown {
  let node: unknown = template;
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

/** A Fn::Sub value; the escaped template literals below keep CloudFormation's ${...} placeholders literal. */
const sub = (value: string) => ({ 'Fn::Sub': value });
const KEEP_TAG = [{ Key: 'ccp:keep', Value: 'site' }];

describe('infra/site.yaml', () => {
  it('parses as plain YAML, with long-form intrinsics only', () => {
    expect(doc.errors).toEqual([]);
    expect(doc.warnings).toEqual([]);
    expect(text).not.toMatch(/!(?:Ref|GetAtt|Sub|Join|Select|If|Equals)\b/);
  });

  it('keeps the bucket private, owner-enforced and encrypted', () => {
    expect(at('Resources.SiteBucket.Type')).toBe('AWS::S3::Bucket');
    expect(at('Resources.SiteBucket.Properties.PublicAccessBlockConfiguration')).toEqual({
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    });
    expect(at('Resources.SiteBucket.Properties.OwnershipControls.Rules')).toEqual([
      { ObjectOwnership: 'BucketOwnerEnforced' },
    ]);
    expect(at('Resources.SiteBucket.Properties.BucketEncryption.ServerSideEncryptionConfiguration')).toEqual([
      { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
    ]);
  });

  it('signs every origin request with Origin Access Control', () => {
    expect(at('Resources.OriginAccessControl.Type')).toBe('AWS::CloudFront::OriginAccessControl');
    expect(at('Resources.OriginAccessControl.Properties.OriginAccessControlConfig')).toMatchObject({
      Name: sub(`\${AWS::StackName}-oac`),
      OriginAccessControlOriginType: 's3',
      SigningBehavior: 'always',
      SigningProtocol: 'sigv4',
    });
  });

  it('sends the CSP of scripts/csp.ts and the other security headers', () => {
    const headers = 'Resources.HeadersPolicy.Properties.ResponseHeadersPolicyConfig.SecurityHeadersConfig';
    expect(at(`${headers}.ContentSecurityPolicy`)).toEqual({ ContentSecurityPolicy: CSP, Override: true });
    expect(at(`${headers}.StrictTransportSecurity`)).toEqual({
      AccessControlMaxAgeSec: 63072000,
      IncludeSubdomains: true,
      Override: true,
    });
    expect(at(`${headers}.ContentTypeOptions`)).toEqual({ Override: true });
    expect(at(`${headers}.FrameOptions`)).toEqual({ FrameOption: 'DENY', Override: true });
    expect(at(`${headers}.ReferrerPolicy`)).toEqual({ ReferrerPolicy: 'no-referrer', Override: true });
  });

  it('serves index.html at / over HTTPS only, through the bucket origin and the managed cache policy', () => {
    const config = 'Resources.Distribution.Properties.DistributionConfig';
    expect(at(`${config}.Enabled`)).toBe(true);
    expect(at(`${config}.DefaultRootObject`)).toBe('index.html');
    expect(at(`${config}.HttpVersion`)).toBe('http2and3');
    expect(at(`${config}.IPV6Enabled`)).toBe(true);
    expect(at(`${config}.PriceClass`)).toBe('PriceClass_100');
    expect(at(`${config}.Origins`)).toEqual([
      {
        Id: 'site-bucket',
        DomainName: { 'Fn::GetAtt': ['SiteBucket', 'RegionalDomainName'] },
        OriginAccessControlId: { 'Fn::GetAtt': ['OriginAccessControl', 'Id'] },
        S3OriginConfig: { OriginAccessIdentity: '' },
      },
    ]);
    expect(at(`${config}.DefaultCacheBehavior`)).toEqual({
      TargetOriginId: 'site-bucket',
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: ['GET', 'HEAD'],
      CachedMethods: ['GET', 'HEAD'],
      Compress: true,
      CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
      ResponseHeadersPolicyId: { Ref: 'HeadersPolicy' },
    });
  });

  it('lets only this distribution read the bucket', () => {
    expect(at('Resources.SiteBucketPolicy.Properties.Bucket')).toEqual({ Ref: 'SiteBucket' });
    expect(at('Resources.SiteBucketPolicy.Properties.PolicyDocument.Statement')).toEqual([
      {
        Sid: 'AllowCloudFrontRead',
        Effect: 'Allow',
        Principal: { Service: 'cloudfront.amazonaws.com' },
        Action: 's3:GetObject',
        Resource: sub(`\${SiteBucket.Arn}/*`),
        Condition: {
          StringEquals: {
            'AWS:SourceArn': sub(
              `arn:\${AWS::Partition}:cloudfront::\${AWS::AccountId}:distribution/\${Distribution}`,
            ),
          },
        },
      },
    ]);
  });

  it('tags the kept resources and outputs what pnpm site:deploy reads', () => {
    expect(at('Resources.SiteBucket.Properties.Tags')).toEqual(KEEP_TAG);
    expect(at('Resources.Distribution.Properties.Tags')).toEqual(KEEP_TAG);
    expect(at('Outputs.BucketName.Value')).toEqual({ Ref: 'SiteBucket' });
    expect(at('Outputs.DistributionId.Value')).toEqual({ Ref: 'Distribution' });
    expect(at('Outputs.SiteUrl.Value')).toEqual(sub(`https://\${Distribution.DomainName}`));
  });
});
```

- [ ] **Step 2: Run it to see it fail**

```bash
pnpm test tests/unit/infra.test.ts
```

Expected: FAIL with `ENOENT`, because `infra/site.yaml` does not exist.

- [ ] **Step 3: Write `infra/site.yaml`**

```yaml
# CCP Study hosting (spec 1.4, Mission 1): a private S3 bucket that only this CloudFront distribution can read.
# Long-form intrinsics only (Ref, Fn::GetAtt, Fn::Sub), so plain YAML parsers and tests/unit/infra.test.ts can read it.
AWSTemplateFormatVersion: "2010-09-09"
Description: CCP Study site, a private S3 bucket behind CloudFront with Origin Access Control.

Resources:
  SiteBucket:
    Type: AWS::S3::Bucket
    Properties:
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      OwnershipControls:
        Rules:
          - ObjectOwnership: BucketOwnerEnforced
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      Tags:
        - Key: ccp:keep
          Value: site

  OriginAccessControl:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Name:
          Fn::Sub: "${AWS::StackName}-oac"
        Description: Signs every CloudFront request to the site bucket.
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4

  HeadersPolicy:
    Type: AWS::CloudFront::ResponseHeadersPolicy
    Properties:
      ResponseHeadersPolicyConfig:
        Name:
          Fn::Sub: "${AWS::StackName}-headers"
        Comment: The CSP of scripts/csp.ts plus HSTS, nosniff, DENY framing and no referrer.
        SecurityHeadersConfig:
          ContentSecurityPolicy:
            ContentSecurityPolicy: "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'"
            Override: true
          StrictTransportSecurity:
            AccessControlMaxAgeSec: 63072000
            IncludeSubdomains: true
            Override: true
          ContentTypeOptions:
            Override: true
          FrameOptions:
            FrameOption: DENY
            Override: true
          ReferrerPolicy:
            ReferrerPolicy: no-referrer
            Override: true

  Distribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Comment: CCP Study site
        Enabled: true
        DefaultRootObject: index.html
        HttpVersion: http2and3
        IPV6Enabled: true
        PriceClass: PriceClass_100
        Origins:
          - Id: site-bucket
            DomainName:
              Fn::GetAtt: [SiteBucket, RegionalDomainName]
            OriginAccessControlId:
              Fn::GetAtt: [OriginAccessControl, Id]
            S3OriginConfig:
              OriginAccessIdentity: ""
        DefaultCacheBehavior:
          TargetOriginId: site-bucket
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods: [GET, HEAD]
          CachedMethods: [GET, HEAD]
          Compress: true
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
          ResponseHeadersPolicyId:
            Ref: HeadersPolicy
      Tags:
        - Key: ccp:keep
          Value: site

  SiteBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket:
        Ref: SiteBucket
      PolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Sid: AllowCloudFrontRead
            Effect: Allow
            Principal:
              Service: cloudfront.amazonaws.com
            Action: s3:GetObject
            Resource:
              Fn::Sub: "${SiteBucket.Arn}/*"
            Condition:
              StringEquals:
                AWS:SourceArn:
                  Fn::Sub: "arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${Distribution}"

Outputs:
  BucketName:
    Description: The private bucket that pnpm site:deploy uploads to.
    Value:
      Ref: SiteBucket
  DistributionId:
    Description: The distribution that pnpm site:deploy invalidates.
    Value:
      Ref: Distribution
  SiteUrl:
    Description: The address of the site.
    Value:
      Fn::Sub: "https://${Distribution.DomainName}"
```

The CSP string must stay identical to `scripts/csp.ts`, and the test fails when only one of them changes.
`658327ea-f89d-4fab-a63d-7e88639e58f6` is the AWS managed `CachingOptimized` cache policy.
`S3OriginConfig.OriginAccessIdentity` stays empty, because Origin Access Control replaces the legacy origin access identity.

- [ ] **Step 4: Run the test to see it pass**

```bash
pnpm test tests/unit/infra.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Lint the template against the CloudFormation schemas**

```bash
uvx cfn-lint@1.57.2 infra/site.yaml; echo "exit $?"
```

Expected: no findings, then `exit 0`.
`uvx` (from Homebrew's `uv`) runs the pinned cfn-lint without adding it to the repo.
It checks every property name and value against the resource schemas, which the unit test does only for the properties it names; for example, it rejects `IPv6Enabled` and suggests `IPV6Enabled`.

- [ ] **Step 6: Write the failing deploy tests**

`tests/unit/deploy.test.ts`:

```ts
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';
import {
  type DeployLog,
  distFiles,
  LOG_FILE,
  nextLog,
  parseKeys,
  parseLog,
  prunable,
  stackOutputs,
} from '../../scripts/lib/deploy.ts';

/** A log whose deploys hold the given file lists, dated one day apart. */
const logOf = (...lists: string[][]): DeployLog => ({
  deploys: lists.map((files, i) => ({ at: `2026-10-1${i}T08:00:00.000Z`, files })),
});

describe('prunable', () => {
  const existing = [
    'index.html',
    'sw.js',
    LOG_FILE,
    'assets/index-old.js',
    'assets/index-prev.js',
    'assets/index-new.js',
    'content/m01.0ld0ld00.json',
  ];

  it('deletes files that belong to neither this build nor the previous deploy', () => {
    const log = logOf(
      ['index.html', 'assets/index-old.js', 'content/m01.0ld0ld00.json'],
      ['index.html', 'assets/index-prev.js'],
    );
    expect(prunable(existing, log, ['index.html', 'assets/index-new.js'])).toEqual([
      'assets/index-old.js',
      'content/m01.0ld0ld00.json',
    ]);
  });

  it('never deletes the entry files or the log, even before the first logged deploy', () => {
    expect(prunable(existing, logOf(), ['assets/index-new.js'])).toEqual([
      'assets/index-old.js',
      'assets/index-prev.js',
      'content/m01.0ld0ld00.json',
    ]);
  });
});

describe('nextLog', () => {
  it('keeps the previous deploy and the new one', () => {
    const third = { at: '2026-10-12T08:00:00.000Z', files: ['assets/index-new.js'] };
    expect(nextLog(logOf(['a.js'], ['b.js']), third)).toEqual({
      deploys: [{ at: '2026-10-11T08:00:00.000Z', files: ['b.js'] }, third],
    });
    expect(nextLog(logOf(), third)).toEqual({ deploys: [third] });
  });
});

describe('parseLog, parseKeys and stackOutputs', () => {
  it('reads a missing log as no deploys and rejects a malformed one', () => {
    expect(parseLog(null)).toEqual({ deploys: [] });
    expect(parseLog(JSON.stringify(logOf(['index.html'])))).toEqual(logOf(['index.html']));
    expect(() => parseLog('{"deploys":"none"}')).toThrow();
  });

  it('reads an empty bucket listing, which the CLI prints as null', () => {
    expect(parseKeys('null\n')).toEqual([]);
    expect(parseKeys('["assets/a.js", "index.html"]\n')).toEqual(['assets/a.js', 'index.html']);
  });

  it('picks the three stack outputs and names a missing one', () => {
    const outputs = [
      { OutputKey: 'BucketName', OutputValue: 'ccp-study-site-sitebucket-1a2b3c' },
      { OutputKey: 'DistributionId', OutputValue: 'E2EXAMPLE' },
      {
        OutputKey: 'SiteUrl',
        OutputValue: 'https://d111111abcdef8.cloudfront.net',
        Description: 'The address',
      },
    ];
    expect(stackOutputs(JSON.stringify(outputs))).toEqual({
      bucket: 'ccp-study-site-sitebucket-1a2b3c',
      distributionId: 'E2EXAMPLE',
      siteUrl: 'https://d111111abcdef8.cloudfront.net',
    });
    expect(() => stackOutputs(JSON.stringify(outputs.slice(0, 2)))).toThrow(
      'stack output SiteUrl is missing',
    );
  });
});

describe('distFiles', () => {
  it('lists every file below the folder as sorted posix paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccp-dist-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    mkdirSync(join(dir, 'assets'));
    mkdirSync(join(dir, 'content'));
    for (const file of ['index.html', 'assets/index-abc123.js', 'content/m01.0123abcd.json']) {
      writeFileSync(join(dir, file), 'x');
    }
    expect(distFiles(dir)).toEqual(['assets/index-abc123.js', 'content/m01.0123abcd.json', 'index.html']);
  });
});
```

- [ ] **Step 7: Run them to see them fail**

```bash
pnpm test tests/unit/deploy.test.ts
```

Expected: FAIL, because `scripts/lib/deploy.ts` does not exist.

- [ ] **Step 8: Implement `scripts/lib/deploy.ts`**

```ts
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

/** The only unhashed files the site serves: uploaded with no-cache, invalidated on every deploy, never pruned (spec 1.4). */
export const ENTRY_FILES = ['index.html', 'sw.js'] as const;
/** The manifest in the bucket that remembers the files of the last two deploys. */
export const LOG_FILE = 'deploys.json';

export const DeployLog = z.strictObject({
  deploys: z.array(z.strictObject({ at: z.string(), files: z.array(z.string()) })),
});
export type DeployLog = z.infer<typeof DeployLog>;
export type Deploy = DeployLog['deploys'][number];

export interface StackOutputs {
  bucket: string;
  distributionId: string;
  siteUrl: string;
}

const Outputs = z.array(z.object({ OutputKey: z.string(), OutputValue: z.string() }));
const Keys = z.array(z.string()).nullable();

/**
 * Bucket keys to delete: those in neither this build nor the last logged deploy, so a browser that still
 * holds the previous index.html can load its chunks; entry files and the log are never pruned.
 */
export function prunable(existing: readonly string[], log: DeployLog, current: readonly string[]): string[] {
  const keep = new Set<string>([...current, ...(log.deploys.at(-1)?.files ?? []), ...ENTRY_FILES, LOG_FILE]);
  return existing.filter((key) => !keep.has(key));
}

/** The log to write after a deploy: the previous deploy and this one. */
export function nextLog(log: DeployLog, deploy: Deploy): DeployLog {
  const previous = log.deploys.at(-1);
  return { deploys: previous === undefined ? [deploy] : [previous, deploy] };
}

/** Reads deploys.json; a missing log (null) means nothing was deployed yet. */
export function parseLog(text: string | null): DeployLog {
  return text === null ? { deploys: [] } : DeployLog.parse(JSON.parse(text));
}

/** Reads `aws s3api list-objects-v2 --query 'Contents[].Key'` output, which is null for an empty bucket. */
export function parseKeys(text: string): string[] {
  return Keys.parse(JSON.parse(text)) ?? [];
}

/** Reads `aws cloudformation describe-stacks --query 'Stacks[0].Outputs'` output for the three outputs of infra/site.yaml. */
export function stackOutputs(text: string): StackOutputs {
  const outputs = new Map(Outputs.parse(JSON.parse(text)).map((o) => [o.OutputKey, o.OutputValue] as const));
  const get = (key: string): string => {
    const value = outputs.get(key);
    if (value === undefined) throw new Error(`stack output ${key} is missing`);
    return value;
  };
  return { bucket: get('BucketName'), distributionId: get('DistributionId'), siteUrl: get('SiteUrl') };
}

/** Every file below dir, as sorted posix paths relative to it. */
export function distFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const path = rel === '' ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) out.push(path);
    }
  };
  walk('');
  return out.sort();
}
```

- [ ] **Step 9: Run the tests to see them pass**

```bash
pnpm test tests/unit/deploy.test.ts tests/unit/infra.test.ts
```

Expected: PASS, 14 tests.

- [ ] **Step 10: Write the command `scripts/site-deploy.ts`**

```ts
/** pnpm site:deploy: runs the full gate, then publishes dist/ to the Mission 1 stack (spec 1.4). */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  distFiles,
  ENTRY_FILES,
  LOG_FILE,
  nextLog,
  parseKeys,
  parseLog,
  prunable,
  stackOutputs,
} from './lib/deploy.ts';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const stack = process.env.CCP_STACK ?? 'ccp-study-site';
const profile = process.env.AWS_PROFILE ?? 'ccp-admin';
const IMMUTABLE = ['--cache-control', 'public, max-age=31536000, immutable'];
const NO_CACHE = ['--cache-control', 'no-cache'];
const QUIET = ['--only-show-errors'];
/** The most keys one s3api delete-objects call accepts. */
const DELETE_BATCH = 1000;

/** Runs the AWS CLI with the deploy profile and returns its stdout; stderr goes straight to the terminal. */
function aws(args: readonly string[], input?: string): string {
  return execFileSync('aws', args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, AWS_PROFILE: profile, AWS_PAGER: '' },
    stdio: ['pipe', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
    ...(input === undefined ? {} : { input }),
  });
}

const query = (expression: string, output = 'json'): string[] => ['--query', expression, '--output', output];

function main(): void {
  const changes = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  if (changes.trim() !== '') {
    throw new Error('uncommitted changes; commit them first so the site matches a commit');
  }
  execFileSync('pnpm', ['verify'], { cwd: root, stdio: 'inherit' });

  const outputs = aws([
    'cloudformation',
    'describe-stacks',
    '--stack-name',
    stack,
    ...query('Stacks[0].Outputs'),
  ]);
  const { bucket, distributionId, siteUrl } = stackOutputs(outputs);
  const target = `s3://${bucket}`;
  const current = distFiles(dist);

  // 1. Hashed files, never overwritten in place, so no --delete (pruning below removes old ones).
  const excludes = ENTRY_FILES.flatMap((file) => ['--exclude', file]);
  aws(['s3', 'sync', dist, target, ...excludes, ...IMMUTABLE, ...QUIET]);
  console.log(`site:deploy: synced the hashed files to ${target}`);

  // 2. Entry files that this build has, with no-cache.
  for (const file of ENTRY_FILES) {
    if (!existsSync(join(dist, file))) continue;
    aws(['s3', 'cp', join(dist, file), `${target}/${file}`, ...NO_CACHE, ...QUIET]);
    console.log(`site:deploy: uploaded ${file} with no-cache`);
  }

  // 3. Invalidation of the entry paths.
  const paths = ['/', ...ENTRY_FILES.map((file) => `/${file}`)];
  const invalidation = aws([
    'cloudfront',
    'create-invalidation',
    '--distribution-id',
    distributionId,
    '--paths',
    ...paths,
    ...query('Invalidation.Id', 'text'),
  ]);
  console.log(`site:deploy: invalidation ${invalidation.trim()} for ${paths.join(', ')}`);

  // 4. Prune what neither this build nor the previous deploy uses, then log this deploy.
  const existing = parseKeys(
    aws(['s3api', 'list-objects-v2', '--bucket', bucket, ...query('Contents[].Key')]),
  );
  const log = parseLog(existing.includes(LOG_FILE) ? aws(['s3', 'cp', `${target}/${LOG_FILE}`, '-']) : null);
  const stale = prunable(existing, log, current);
  for (let i = 0; i < stale.length; i += DELETE_BATCH) {
    const batch = { Objects: stale.slice(i, i + DELETE_BATCH).map((key) => ({ Key: key })), Quiet: true };
    aws(['s3api', 'delete-objects', '--bucket', bucket, '--delete', JSON.stringify(batch)]);
  }
  const noun = stale.length === 1 ? 'file' : 'files';
  console.log(`site:deploy: pruned ${stale.length} ${noun} that only older deploys used`);

  const next = nextLog(log, { at: new Date().toISOString(), files: current });
  const logArgs = [
    's3',
    'cp',
    '-',
    `${target}/${LOG_FILE}`,
    ...NO_CACHE,
    '--content-type',
    'application/json',
  ];
  aws(logArgs, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`site:deploy: done, ${siteUrl}`);
}

try {
  main();
} catch (error) {
  console.error(`site:deploy: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
```

The order follows spec 1.4: hashed files first with `aws s3 sync` and no `--delete`, then the entry files with `no-cache`, then the invalidation, then the prune and the new `deploys.json`.
An entry file that the build lacks is skipped, so `sw.js` starts uploading by itself once the service worker ships in Phase 2.
`AWS_PAGER` is emptied so the CLI never waits on a pager.

- [ ] **Step 11: Check the refusal path, which makes no AWS call**

```bash
pnpm site:deploy; echo "exit $?"
```

Expected: `site:deploy: uncommitted changes; commit them first so the site matches a commit`, pnpm's note that the script failed, then `exit 1`.
This task's files are still uncommitted, so the script stops before `pnpm verify` and before its first `aws` call.

- [ ] **Step 12: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add infra scripts/lib/deploy.ts scripts/site-deploy.ts tests/unit/infra.test.ts tests/unit/deploy.test.ts
git commit -m "Add the hosting template and deploy command" -m "A private S3 bucket behind CloudFront with Origin Access Control and the site's security headers, and pnpm site:deploy, which uploads, invalidates and prunes files that only older deploys used."
```

---

## Task 26: Repo README and the full gate

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Check it against R8**

```bash
pnpm content:validate
```

Expected: `content:validate: 6 rules, 0 findings`, because R8 reads the new `README.md` like every Markdown file in the repo.

- [ ] **Step 3: Run the full gate**

```bash
pnpm verify
```

Expected, in order: `tsc` silent, Biome without errors, `content:validate: 6 rules, 0 findings`, every Vitest file passing, the build with its budget line, and Playwright's `26 passed`.

- [ ] **Step 4: Commit**

```bash
pnpm lint:fix && pnpm typecheck
git add README.md
git commit -m "Add the repo README" -m "Purpose, commands, setup, deploying, and where the course text lives."
```

- [ ] **Step 5: Prove the setup on a fresh clone**

This step alone runs outside the repository root, in a throwaway clone, to show that nothing depends on ignored or local-only files such as the course data, `.results/` or an old `dist/`.

```bash
rm -rf "$TMPDIR/ccp-clone" && git clone --quiet . "$TMPDIR/ccp-clone" && cd "$TMPDIR/ccp-clone" && fnm use && pnpm install --frozen-lockfile && pnpm verify; echo "exit $?"
rm -rf "$TMPDIR/ccp-clone"
```

Expected: the same output as Step 3, then `exit 0`.
If it fails, fix the cause in the repo (usually a file that should be committed, or a path that assumes the original checkout), commit the fix, and repeat this step.

---

## Task 27: Dani deploys (manual, exit criterion)

This task is Dani's: agents never create AWS accounts, enter credentials or run commands against his AWS account.
The controller hands him these steps after Task 26, waits for his report, and records the results in the phase report.

**Files:** none; nothing in the repo changes.

- [ ] **Step 1: Dani completes Mission 0**

Dani follows `#/missions/mission-00` (on `pnpm preview` or `pnpm dev`) in his new free-plan account, including every Verify check.
The recorded plan status must show Amazon S3, Amazon CloudFront and AWS CloudFormation on the plan.
If any of the three is missing, stop here: Dani keeps reading the site with `pnpm preview` (spec 11, risk K12), and the phase report says that the CloudFront exit criterion waits on plan fit.

- [ ] **Step 2: Sign in with the admin profile**

```bash
aws login --profile ccp-admin && aws sts get-caller-identity --profile ccp-admin --query Arn --output text
```

Expected: a browser sign-in as the IAM user `ccp-admin` with its MFA code, then the user's ARN, `arn:aws:iam::<account id>:user/ccp-admin`.
Mission 0 signs in with `aws login` rather than IAM Identity Center, because enabling Identity Center creates an AWS organization, which upgrades a free-plan account to the Paid plan (Task 17).

- [ ] **Step 3: Create the stack**

```bash
aws cloudformation deploy --template-file infra/site.yaml --stack-name ccp-study-site --profile ccp-admin
```

Expected: `Waiting for changeset to be created..`, `Waiting for stack create/update to complete`, then `Successfully created/updated stack - ccp-study-site`; the distribution takes several minutes.

- [ ] **Step 4: Publish the site**

```bash
pnpm site:deploy
```

Expected: the `pnpm verify` output, then `site:deploy:` lines for the sync, `index.html`, the invalidation and `pruned 0 files that only older deploys used`, ending with `site:deploy: done, https://<id>.cloudfront.net`.

- [ ] **Step 5: Check the headers and the private bucket from the terminal**

```bash
stack_output() {
  aws cloudformation describe-stacks --stack-name ccp-study-site --profile ccp-admin \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
SITE_URL=$(stack_output SiteUrl)
OBJECT_URL="https://$(stack_output BucketName).s3.$(aws configure get region --profile ccp-admin).amazonaws.com/index.html"
curl -sI "$SITE_URL" | grep -iE '^(HTTP|content-security-policy|strict-transport-security|x-content-type-options|x-frame-options|referrer-policy|cache-control)'
curl -s -o /dev/null -w '%{http_code}\n' "$OBJECT_URL"
printf 'Site: %s\nDirect S3 object: %s\n' "$SITE_URL" "$OBJECT_URL"
```

Expected: a `200` status line, `content-security-policy: default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'`, `strict-transport-security: max-age=63072000; includeSubDomains`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: no-referrer` and `cache-control: no-cache`.
Then `403` for the direct object, and the two URLs for the phone check.

- [ ] **Step 6: Dani runs the two Mission 1 Verify checks on his phone**

On his phone, Dani opens the site URL: Home lists the 13 modules, the Support plans lesson shows its "Exam guide update" lines, and a glossary term opens its popover.
He then opens the direct S3 object URL on the phone and sees an `AccessDenied` error.

- [ ] **Step 7: Confirm the Phase 0 exit criteria**

```bash
grep '^rules' content/validate.yaml && pnpm content:validate && pnpm content:validate --all
```

Expected: `rules: [R1, R2, R6, R7, R8, R13]`, then `content:validate: 6 rules, 0 findings` twice, once for the configured rules and once for every implemented rule over every note.
With Steps 5 and 6, this meets the Phase 0 exit criteria of spec 10.1: the six rules are on, every note passes R6, R7 and R8, and the site serves through CloudFront.

- [ ] **Step 8: Dani checks the cost the next day**

The day after the deploy, Dani opens Cost Explorer with daily granularity grouped by service and confirms that S3 and CloudFront stay within the cents of Mission 1's `expectedCredits`, as its "Keep it running" section says.

---

## Self-review

### Spec coverage

| Spec 10.1, Phase 0 | Tasks |
|---|---|
| Node 24 pinned | 1 |
| Site scaffold commit | 1, 20 and 21 |
| Pre-commit hook | 18 |
| `validate.yaml` | 18 |
| Fingerprints and `allow.txt` | 3 and 5 |
| `concepts.yaml` seeded and completed | 14, 15 and 16 |
| `blueprint.yaml` with all 19 tasks and their terms | 4 and 13 |
| Rules R1, R2, R6, R7, R8 and R13 | 7, 11, 9, 10, 8 and 12, switched on in 18 |
| Reader | 19, 20, 21 and 22 |
| Palette | 23 |
| Glossary | 14 (parser), 19 (matcher and items) and 22 (popover) |
| Update-line rendering | 6 (parser), 19 (renderer), 22 (screen) and 24 (end to end) |
| Module 11 update lines | 16 |
| Missions 0 and 1 as read-only pages, done by hand | 17, 22 and 27 |
| Usable outcome: read every note on a phone at the CloudFront URL | 24 (mobile WebKit at 375 px), 25 and 27 |
| Exit: the six rules on, and every note passes R6, R7 and R8 | 18 and 27 |
| Exit: the site serves through CloudFront | 25 and 27 |

| Other spec sections Phase 0 implements | Tasks |
|---|---|
| 1.1 stack and size budgets | 1 and 20 |
| 1.3 `pnpm check`, `pnpm verify` and the hook | 1, 18 and 26 |
| 1.4 hosting and `pnpm site:deploy` | 25 and 27 |
| 2.3 to 2.5 and 2.9 update lines, registry, fingerprints and rules | 2 to 18 |
| 2.10 build outputs and the Vite plugin | 19 and 20 |
| 7.1 tokens, and 7.3 to 7.5 for the reader, palette, keyboard and accessibility | 21 to 24 |
| 9 end-to-end and axe | 24 |

### Deliberate deviations

- The search chunk is a list of entries with normalized text rather than the prebuilt token index of spec 2.10, and ranking it in the browser is fast enough at about 1,100 entries.
- R2's `HEAD` comparison covers concept ids in Phase 0 and grows to questions, labs and forms as their schemas arrive.
- The rank-fact check of R13 joins in Phase 3, when `content/game/ranks.yaml` exists.
- The Biome rule that keeps `src/engine/` free of DOM and UI imports arrives with `src/engine/` in Phase 1.
- The content index holds no blueprint, ranks or badges yet (spec 2.10), and each joins it in the phase whose screens read it.
- Phase 0's end-to-end suite covers the reader, the palette, the missions pages and axe on every Phase 0 screen, while the nine journeys and the `toHaveScreenshot` baselines of spec 9 arrive with the features they exercise, the baselines in Phase 6 as spec 10.1 plans.
- `sw.js` is already an entry file for upload, invalidation and pruning, and the deploy skips it while the build has none, so the Phase 2 service worker needs no deploy change.
- The headers policy adds `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer` to the headers that spec 1.4 names.
- Mission 0 makes the admin an IAM user, `ccp-admin` with MFA and `aws login`, instead of the IAM Identity Center user of spec 5.3, because enabling Identity Center on a standalone account creates an AWS organization, and on a free-plan account that upgrades it to the Paid plan and ends the credits at once; Task 17 updates spec 1.4, 5.3 and Appendix B to match.

### Placeholders

No step leaves a placeholder.
The only values a step cannot know in advance (the fetch dates of Tasks 13, 16 and 17, the registry decisions of Task 15 and the CloudFront domain of Task 27) come from a command or an agent run inside that step.

### Names used across tasks

| Name | Defined in | Used in |
|---|---|---|
| `words`, `mask`, `MASK`, `phrasesFrom`, `stripMarkdown`, `fencedLines`, `emDashLines`, `multiSentenceLines` (`scripts/content/lib/text.ts`) | 2 | 3, 5, 6, 8, 9, 10 |
| `buildSet`, `pack`, `unpack`, `runsAgainst`, `shareAgainst`, `HashSet` (`scripts/content/lib/fingerprint.ts`) | 3 | 5, 6, 10 |
| `PackedSet`, `FingerprintFile` (`schemas/fingerprint.ts`) | 3 | 4, 5, 6 |
| `Slug`, `ConceptId`, `NoteId`, `ModuleNumber`, `IsoDate`, `HttpsUrl`, `TASK_IDS`, `TaskId` (`schemas/common.ts`) | 4 | 4, 14 |
| `Concept`, `Blueprint`, `LessonFrontmatter`, `ModuleFrontmatter`, `MissionFrontmatter`, `ValidateConfig`, `RuleId` (`schemas/*.ts`) | 4 | 6, 7, 13 |
| `splitItems`, `sourceTitles`, `fingerprintModule`, `allowFile` (`scripts/content/lib/source.ts`, `fingerprint-files.ts`) | 5 | 5, 6 |
| `slugify`, `headingsOf`, `notesAnchors`, `splitFrontmatter`, `Heading` (`scripts/content/lib/markdown.ts`) | 6 | 9, 14, 19 |
| `parseUpdateLine`, `UPDATE_PREFIX` (`scripts/content/lib/update-line.ts`) | 6 | 12, 19 |
| `Context`, `Note`, `LessonNote`, `ModuleNote`, `Mission`, `TextFile`, `Finding`, `loadContext`, `localDate`, `CONFIG_FILE`, `CONCEPTS_FILE`, `BLUEPRINT_FILE`, `ALLOW_FILE` (`scripts/content/lib/context.ts`) | 6 | 7 to 12, 14, 19, 20 |
| `makeFixtureRoot`, `FIXTURE_TODAY` (`tests/fixtures/content-root.ts`) | 6 | 7 to 12, 14, 19, 20 |
| `Rule`, `finding` (`scripts/content/rules/rule.ts`), `RULES`, `runRules`, `formatFinding` (`scripts/content/rules/index.ts`) | 7 | 8 to 12, 20 |
| `GlossaryEntry`, `parseGlossary`, `termForms` (`scripts/content/lib/glossary.ts`) | 14 | 14, 19 |
| `RawConcept`, `RegistryResult`, `readConcepts`, `stringifyConcepts`, `namesFromGlossary`, `seedEntries`, `pendingFor`, `checkResult`, `applyResults` (`scripts/content/lib/registry.ts`) | 14 | 14 (`scripts/content/concepts.ts`, which Tasks 15 and 16 run) |
| `termMatcher`, `TermMatcher` (`scripts/content/lib/glossary.ts`) | 19 | 19 (`renderDoc` and `buildContent`) |
| `escapeHtml`, `routeOf`, `renderDoc`, `renderInline` (`scripts/content/lib/render.ts`) | 19 | 19 (`scripts/content/build.ts`) |
| `buildContent` (`scripts/content/build.ts`) | 19 | 20 |
| `LessonMeta`, `ModuleMeta`, `ConceptMeta`, `GlossaryItem`, `MissionMeta`, `Section`, `HeadingMeta`, `LessonChunk`, `ModuleChunk`, `SearchEntry`, `SearchChunk`, `ContentIndex` (`schemas/chunks.ts`) | 19 | 19, 21, 22, 23 |
| `normalize` (`src/app/search.ts`) | 19 | 19, 23 |
| `rank` (`src/app/search.ts`) | 23 | 23 (`Palette`), and Task 24's palette query relies on its exact-title score |
| `CSP` (`scripts/csp.ts`) | 20 | 20 (`vite preview`), 25 (`infra/site.yaml` and its test) |
| `contentPlugin` (`scripts/content/vite-plugin.ts`) | 20 | 20 (`vite.config.ts`) |
| `Route`, `parseHash`, `toHash`, `pad2` (`src/app/router.ts`) | 21 | 21, 22, 23 |
| `neighbors`, `up` (`src/app/nav.ts`) | 21 | 22, 23 |
| `route`, `overlay`, `openTerm`, `closeTerm` (`src/app/state.ts`) | 21 | 21, 22, 23 |
| `index`, `loadError`, `modules`, `searchEntries`, `glossary`, `loadIndex`, `ensureModule`, `ensureSearch` (`src/app/content.ts`) | 21 | 21, 22, 23 |
| `Html`, `useTitle`, `Breadcrumbs`, `Crumb` (`src/ui/`) | 21 | 21 (interim `Screen`), 22, 23 |
| `Screen` (`src/app/screens/Screen.tsx`) | 21 (interim), 22 (route switch) | 21 and 23 (`App`) |
| `popoverPosition` (`src/ui/position.ts`), `scrollableTables` (`src/ui/tables.ts`) | 22 | 22 (`TermPopover`, `LessonPage`) |
| `TermPopover` (`src/ui/TermPopover.tsx`) | 22 | 22 (`LessonPage`) |
| `keyCommand`, `KeyInput`, `KeyContext`, `KeyCommand`, `G_WINDOW_MS` (`src/app/keys.ts`) | 23 | 23 (`useKeyboard`) |
| `closeOnBackdrop` (`src/ui/backdrop.ts`) | 23 | 23 (`Palette`, `Help`) |
| `useKeyboard` (`src/app/keyboard.ts`) | 23 | 23 (`App`) |
| `Palette`, `Help` (`src/app/screens/`) | 23 | 23 (`App`) |
| `ENTRY_FILES`, `LOG_FILE`, `DeployLog`, `Deploy`, `StackOutputs`, `prunable`, `nextLog`, `parseLog`, `parseKeys`, `stackOutputs`, `distFiles` (`scripts/lib/deploy.ts`) | 25 | 25 (`scripts/site-deploy.ts`) |
| DOM contract: `li.update`, `button.term`, the `role="dialog"` popover named after its term, the palette `combobox` and its `option` elements, `dl.facts`, Home rows linking `#/m/NN`, mission rows linking `#/missions/mission-NN` | 19, 21, 22, 23 | 24 |
