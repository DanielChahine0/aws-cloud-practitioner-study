import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Context, loadContext } from '../../scripts/content/lib/context.ts';
import { draftCheck } from '../../scripts/content/lib/draft.ts';
import { formatFinding, RULES, runRules } from '../../scripts/content/rules/index.ts';
import { contentPlugin } from '../../scripts/content/vite-plugin.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';
import {
  POOL_FILE,
  QUESTION_FILE,
  singleQuestion,
  writePool,
  writeQuestions,
} from '../fixtures/questions.ts';

/** A made-up token in every text field of the sentinel items: output that shows it has leaked item text. */
const TOKEN = 'ZZLEAKZZ';
/** Whether output shows the token in any case; R3 lowercases the option text it quotes. */
const leaks = (lines: readonly string[]): boolean =>
  lines.join('\n').toLowerCase().includes(TOKEN.toLowerCase());
const BROKEN_FILE = 'content/exam/pool/01-broken.yaml';
/** A 9-word run of the fixture course, so R7 fires on the item (see r07.test.ts). */
const COURSE_RUN = 'bakers rent proofing cabinets by the minute and hand them back';

/** A live item that trips R3 (repeated option), R5 (evidence), R7 (course run), R9 (no stamp) and the number check. */
function leaky(pool: 'practice' | 'exam') {
  return singleQuestion({
    id: 'q-zz0001',
    pool,
    status: 'live',
    stem: `${TOKEN} The harbour branch bakes 7777 trays on market days. Which arrangement gives it capacity?`,
    options: [
      {
        id: 'a',
        text: `${TOKEN} borrow central ovens`,
        correct: true,
        why: `${TOKEN} central ovens are lent out.`,
      },
      {
        id: 'b',
        text: `${TOKEN} borrow central ovens`,
        correct: false,
        why: `${TOKEN} ${COURSE_RUN} later.`,
      },
      { id: 'c', text: `${TOKEN} order ahead`, correct: false, why: `${TOKEN} orders add no ovens at all.` },
      {
        id: 'd',
        text: `${TOKEN} bake at night`,
        correct: false,
        why: `${TOKEN} night baking adds no ovens.`,
      },
    ],
    evidence: [`${TOKEN} is not a line of the note.`],
    takeaway: `${TOKEN} borrow ovens for peaks.`,
  });
}

/** The fixture tree with the sentinel items in an exam-pool file, a schema-breaking item and a file that does not parse. */
function examRoot(): string {
  const root = makeFixtureRoot();
  writePool(root, [leaky('exam'), { ...singleQuestion({ id: 'q-zz0002', pool: 'exam' }), [TOKEN]: TOKEN }]);
  writeFileSync(join(root, BROKEN_FILE), `questions:\n  - id: q-zz0003\n    stem: ${TOKEN}: [unclosed\n`);
  return root;
}

const ruleOutput = (ctx: Context): string[] =>
  runRules(
    ctx,
    RULES.map((r) => r.id),
  ).findings.map(formatFinding);

/** The message the Vite overlay and `vite build` show for the tree. */
function overlayMessage(root: string): string {
  const plugin: Plugin = contentPlugin(root);
  const call = (name: 'configResolved' | 'buildStart', ...args: unknown[]): void => {
    const hook: unknown = plugin[name];
    const fn = typeof hook === 'object' && hook !== null && 'handler' in hook ? hook.handler : hook;
    if (typeof fn !== 'function') throw new Error(`the plugin has no ${name} hook`);
    fn.apply(
      {
        error(message: string): never {
          throw new Error(message);
        },
      },
      args,
    );
  };
  call('configResolved', { command: 'build' });
  try {
    call('buildStart');
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return '';
}

describe('ids-only output for exam-pool files (spec 2.6)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date(2026, 9, 10, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires R1, R3, R5, R7 and R9 on the sentinel items without showing their text', () => {
    const output = ruleOutput(loadContext(examRoot(), { today: FIXTURE_TODAY }));
    expect(leaks(output)).toBe(false);
    expect(output.filter((line) => line.includes('content/exam/pool/'))).toEqual([
      `R1 ${POOL_FILE}:33  questions[1] (q-zz0002): Unrecognized key: "..."`,
      `R1 ${BROKEN_FILE}:3  YAML: parse error at line 3, column 11`,
      `R3 ${POOL_FILE}:2  q-zz0001: two options share the text "..."`,
      `R5 ${POOL_FILE}:2  q-zz0001: evidence is not a whole line of m01/what-a-bakery-cloud-is: "..."`,
      `R7 ${POOL_FILE}:2  q-zz0001 copies a 9-word run from the course: "..."`,
      `R9 ${POOL_FILE}:2  q-zz0001: live but not verified; run the checks and pnpm content:stamp`,
    ]);
  });

  it('keeps draftCheck output for a pool file to ids, the number check included', () => {
    const problems = draftCheck(loadContext(examRoot(), { today: FIXTURE_TODAY }), POOL_FILE).problems;
    expect(leaks(problems)).toBe(false);
    expect(problems).toContain(`${POOL_FILE}:2  q-zz0001: the number "..."`);
  });

  it('keeps the Vite overlay message to ids', () => {
    const message = overlayMessage(examRoot());
    expect(message).toContain(`R3 ${POOL_FILE}:2  q-zz0001: two options share the text "..."`);
    expect(leaks([message])).toBe(false);
  });

  it('keeps the load errors to ids when validate.yaml is broken', () => {
    const root = examRoot();
    writeFileSync(join(root, 'content/validate.yaml'), 'rules: [\n');
    const message = overlayMessage(root);
    expect(message).toContain(`R1 ${POOL_FILE}:33  questions[1] (q-zz0002): Unrecognized key: "..."`);
    expect(leaks([message])).toBe(false);
  });

  it('keeps the text of the same findings on a practice file', () => {
    const root = makeFixtureRoot();
    writeQuestions(root, [leaky('practice')], QUESTION_FILE);
    const output = ruleOutput(loadContext(root, { today: FIXTURE_TODAY }));
    expect(output).toContain(
      `R3 ${QUESTION_FILE}:2  q-zz0001: two options share the text "${TOKEN.toLowerCase()} borrow central ovens"`,
    );
  });
});
