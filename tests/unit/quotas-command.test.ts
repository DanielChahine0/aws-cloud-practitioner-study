import { appendFileSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { TASK_IDS } from '../../schemas/common.ts';
import { Quotas } from '../../schemas/exam.ts';
import { loadContext, QUOTAS_FILE } from '../../scripts/content/lib/context.ts';
import {
  QUOTAS_HEADER,
  QUOTAS_USAGE,
  quotasOf,
  runQuotas,
} from '../../scripts/content/lib/quotas-command.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

/** A fixture root whose registry tags one tested concept per task in Module 1 and one more in Module 2. */
function quotaRoot(): string {
  const root = makeFixtureRoot();
  const entries = [1, 2].flatMap((module) =>
    TASK_IDS.map((task) => {
      const id = `m${module}-task-${task.replace('.', '-')}`;
      return `- { id: ${id}, name: Concept ${id}, home: m0${module}/what-a-bakery-cloud-is, anchor: ${id}, tasks: ["${task}"] }`;
    }),
  );
  writeFileSync(join(root, 'content/concepts.yaml'), `${entries.join('\n')}\n`);
  return root;
}

/** Per-form counts when every task of a domain has the same number of concepts: largest remainder, earlier task first. */
const PER_FORM: Record<string, number> = {
  '1.1': 4,
  '1.2': 4,
  '1.3': 4,
  '1.4': 4,
  '2.1': 5,
  '2.2': 5,
  '2.3': 5,
  '2.4': 4,
  '3.1': 3,
  '3.2': 3,
  '3.3': 3,
  '3.4': 3,
  '3.5': 3,
  '3.6': 3,
  '3.7': 2,
  '3.8': 2,
  '4.1': 3,
  '4.2': 3,
  '4.3': 2,
};

describe('pnpm content:quotas', () => {
  it('writes quotas.yaml and prints the pool size and each task count', () => {
    const root = quotaRoot();
    expect(runQuotas(root, [])).toEqual({
      code: 0,
      out: [
        'quotas: 260 items in 38 cells over 2 modules',
        ...TASK_IDS.map((t) => `${t} per form ${PER_FORM[t]}, pool ${4 * (PER_FORM[t] ?? 0)}`),
      ],
    });
    const text = readFileSync(join(root, QUOTAS_FILE), 'utf8');
    expect(text.split('\n')[0]).toBe(QUOTAS_HEADER);
    const written = Quotas.parse(parse(text));
    expect(written).toEqual(quotasOf(loadContext(root, { today: FIXTURE_TODAY })));
    expect(written.cells.filter((c) => c.task === '2.1')).toEqual([
      { module: 1, task: '2.1', target: 10 },
      { module: 2, task: '2.1', target: 10 },
    ]);
    expect(loadContext(root, { today: FIXTURE_TODAY }).loadErrors).toEqual([]);
  });

  it('passes --check after a write and fails it after a hand edit, writing nothing', () => {
    const root = quotaRoot();
    runQuotas(root, []);
    expect(runQuotas(root, ['--check']).out.at(-1)).toBe('quotas.yaml is up to date');
    appendFileSync(join(root, QUOTAS_FILE), '# edited by hand\n');
    const before = readFileSync(join(root, QUOTAS_FILE), 'utf8');
    expect(runQuotas(root, ['--check'])).toEqual({
      code: 1,
      out: ['quotas.yaml is out of date; run pnpm content:quotas'],
    });
    expect(readFileSync(join(root, QUOTAS_FILE), 'utf8')).toBe(before);
  });

  it('prints the usage for an unknown flag and names a missing blueprint', () => {
    const root = quotaRoot();
    expect(runQuotas(root, ['--write'])).toEqual({ code: 1, out: [QUOTAS_USAGE] });
    unlinkSync(join(root, 'content/exam/blueprint.yaml'));
    expect(runQuotas(root, [])).toEqual({
      code: 1,
      out: ['quotas: content/exam/blueprint.yaml is missing or invalid'],
    });
  });
});
