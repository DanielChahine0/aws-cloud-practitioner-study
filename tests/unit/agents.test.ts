import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { LabFile } from '../../schemas/lab.ts';
import { CHECK_NAMES } from '../../schemas/question.ts';
import { checkVersion } from '../../scripts/content/lib/checks.ts';
import { splitFrontmatter } from '../../scripts/content/lib/markdown.ts';
import { labProblems } from '../../scripts/content/rules/r11-labs.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
/** Each prompt's current version; a new version of a prompt changes its line here. */
const VERSIONS: Record<string, number> = {
  'question-writer': 4,
  'exam-writer': 1,
  'solve-closed': 1,
  'solve-notes': 1,
  critic: 1,
  'update-writer': 1,
  'lab-writer': 2,
  'lab-critic': 2,
};
const PROMPTS = Object.keys(VERSIONS);

describe('agent prompts', () => {
  it.each(PROMPTS)('%s names itself and carries a version', (name) => {
    const { yaml, body } = splitFrontmatter(readFileSync(join(ROOT, 'agents', `${name}.md`), 'utf8'));
    expect(parse(yaml ?? '')).toEqual({ name, version: VERSIONS[name] });
    expect(body).toMatch(/^\n?# /);
    expect(body).not.toContain('\u2014');
  });

  it('gives every check a version that content:checks can read', () => {
    expect(CHECK_NAMES.map((name) => checkVersion(ROOT, name))).toEqual([1, 1, 1]);
  });

  it('points every writer at the style guide, and keeps checkers away from keys and notes', () => {
    const read = (name: string): string => readFileSync(join(ROOT, 'agents', `${name}.md`), 'utf8');
    expect(read('question-writer')).toContain('content/STYLE.md');
    expect(read('question-writer')).toContain('`need`');
    expect(read('question-writer')).toContain('3 open questions');
    expect(read('question-writer')).not.toMatch(/\b2 (?:open )?questions/);
    for (const name of ['solve-closed', 'solve-notes', 'critic']) expect(read(name)).toContain('keys.json');
    expect(readFileSync(join(ROOT, 'content', 'STYLE.md'), 'utf8')).toContain('**NOT**');
    for (const name of ['lab-writer', 'lab-critic']) {
      expect(read(name)).toContain('content/STYLE.md');
      expect(read(name)).toContain('content:validate --draft');
      expect(read(name)).toContain('Never read');
    }
    expect(readFileSync(join(ROOT, 'content', 'STYLE.md'), 'utf8')).toContain('## Labs');
  });
});

describe('the exam writer (spec 2.7)', () => {
  const prompt = readFileSync(join(ROOT, 'agents', 'exam-writer.md'), 'utf8');

  it('points at the style guide and the pool, and works from --exam-targets', () => {
    expect(prompt).toContain('content/STYLE.md');
    expect(prompt).toContain('content/exam/pool/');
    expect(prompt).toContain('--exam-targets');
    expect(prompt).toContain('pool: exam');
  });

  it('forbids the practice questions, the fingerprints and the course, and returns ids only', () => {
    const never = prompt.split('\n').find((line) => line.startsWith('Never read'));
    for (const banned of ['content/questions/', 'content/fingerprints/', '.results/', 'AWS exam questions']) {
      expect(never, banned).toContain(banned);
    }
    expect(prompt).toContain('Never quote a stem');
  });

  it('has the style guide replace the cafe rules for exam items', () => {
    expect(readFileSync(join(ROOT, 'content', 'STYLE.md'), 'utf8')).toContain(
      'For an item with pool: exam, the cafe rules above do not apply, and this section replaces them.',
    );
  });
});

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
