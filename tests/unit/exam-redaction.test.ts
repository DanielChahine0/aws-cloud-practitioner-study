import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse, stringify } from 'yaml';
import { grade, prepare, RESULTS_DIR, stampQuestions } from '../../scripts/content/lib/checks.ts';
import { type Context, FORMS_FILE, loadContext } from '../../scripts/content/lib/context.ts';
import { draftCheck } from '../../scripts/content/lib/draft.ts';
import { runForms } from '../../scripts/content/lib/forms-command.ts';
import { examTargets, report } from '../../scripts/content/lib/report.ts';
import { formatFinding, RULES, runRules } from '../../scripts/content/rules/index.ts';
import { contentPlugin } from '../../scripts/content/vite-plugin.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';
import { writeExamPool } from '../fixtures/exam-pool.ts';
import {
  fixtureQuotas,
  multiQuestion,
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

  it('keeps content:report and --exam-targets to counts and ids', () => {
    const ctx = { ...loadContext(examRoot(), { today: FIXTURE_TODAY }), quotas: fixtureQuotas() };
    const lines = report(ctx);
    expect(lines).toContain(
      'm01 exam: 1 (single 1, multi 0); correct option longest in 0 of 1 singles (0%); negative stems 0 (0%)',
    );
    expect(leaks(lines)).toBe(false);
    expect(leaks([JSON.stringify(examTargets(ctx))])).toBe(false);
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

describe('content:checks grade, content:stamp and content:forms print exam items by id only', () => {
  const load = (root: string) => loadContext(root, { today: FIXTURE_TODAY });

  it('keeps exam item text and checker reasons out of grade and stamp output', () => {
    const root = makeFixtureRoot();
    mkdirSync(join(root, 'agents'), { recursive: true });
    for (const name of ['solve-closed', 'solve-notes', 'critic']) {
      writeFileSync(join(root, 'agents', `${name}.md`), `---\nname: ${name}\nversion: 1\n---\n\n# ${name}\n`);
    }
    const single = singleQuestion({ id: 'q-e1a2b3', pool: 'exam' });
    const multi = multiQuestion({ id: 'q-e7f8g9', pool: 'exam', concept: 'per-minute-rental' });
    writePool(root, [
      { ...single, stem: `${single.stem} ${TOKEN}`, takeaway: `${single.takeaway} ${TOKEN}` },
      { ...multi, stem: `${multi.stem} ${TOKEN}`, takeaway: `${multi.takeaway} ${TOKEN}` },
    ]);
    const { paths } = prepare(load(root), [1], 1, 'exam');
    for (const path of paths) {
      const batch = JSON.parse(readFileSync(join(root, path), 'utf8')) as {
        batch: string;
        kind: string;
        questions: { id: string }[];
      };
      const answers = batch.questions.map(({ id }) =>
        batch.kind === 'solve-closed'
          ? { id, picked: [1], secondDefensible: true, reason: `Two options fit ${TOKEN}.` }
          : batch.kind === 'solve-notes'
            ? { id, picked: [1], quote: `- ${TOKEN}` }
            : batch.kind === 'critic-cue'
              ? { id, guess: [1], basis: 'tell', reason: `The longest option says ${TOKEN}.` }
              : {
                  id,
                  distractorsWrong: false,
                  noTell: false,
                  taskFits: true,
                  styleHolds: true,
                  problems: [TOKEN],
                },
      );
      writeFileSync(
        join(root, RESULTS_DIR, 'answers', `${batch.batch}.json`),
        JSON.stringify({ batch: batch.batch, answers }),
      );
    }
    const graded = grade(root, FIXTURE_TODAY);
    const stamp = stampQuestions(load(root), FIXTURE_TODAY);
    expect(graded.failures.length).toBeGreaterThan(0);
    expect(graded.lines.length).toBe(graded.failures.length);
    expect(stamp.log).toEqual([
      'review q-e1a2b3 attempts 1 solve-closed',
      'review q-e7f8g9 attempts 1 solve-closed',
    ]);
    expect(leaks([...graded.lines, ...stamp.log, ...stamp.revise, stamp.summary])).toBe(false);
  });

  it('keeps exam item text out of content:forms output and forms.yaml', () => {
    const root = makeFixtureRoot();
    writeExamPool(root, { text: TOKEN });
    const built = runForms(root, []);
    const forms = parse(readFileSync(join(root, FORMS_FILE), 'utf8')) as { forms: { qids: string[] }[] };
    forms.forms[0]?.qids.pop();
    writeFileSync(join(root, FORMS_FILE), stringify(forms));
    const refused = runForms(root, ['--freeze']);
    const rebuilt = runForms(root, []);
    const frozen = runForms(root, ['--freeze']);
    expect([built.code, refused.code, rebuilt.code, frozen.code]).toEqual([0, 1, 0, 0]);
    expect(leaks([...built.out, ...refused.out, ...rebuilt.out, ...frozen.out])).toBe(false);
    expect(leaks([readFileSync(join(root, FORMS_FILE), 'utf8')])).toBe(false);
  });
});
