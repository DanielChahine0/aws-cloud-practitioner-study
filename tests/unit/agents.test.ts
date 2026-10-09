import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { CHECK_NAMES } from '../../schemas/question.ts';
import { checkVersion } from '../../scripts/content/lib/checks.ts';
import { splitFrontmatter } from '../../scripts/content/lib/markdown.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const PROMPTS = ['question-writer', 'solve-closed', 'solve-notes', 'critic', 'update-writer'];

describe('agent prompts', () => {
  it.each(PROMPTS)('%s names itself and carries a version', (name) => {
    const { yaml, body } = splitFrontmatter(readFileSync(join(ROOT, 'agents', `${name}.md`), 'utf8'));
    expect(parse(yaml ?? '')).toEqual({ name, version: 1 });
    expect(body).toMatch(/^\n?# /);
  });

  it('gives every check a version that content:checks can read', () => {
    expect(CHECK_NAMES.map((name) => checkVersion(ROOT, name))).toEqual([1, 1, 1]);
  });

  it('points every writer at the style guide, and keeps checkers away from keys and notes', () => {
    const read = (name: string): string => readFileSync(join(ROOT, 'agents', `${name}.md`), 'utf8');
    expect(read('question-writer')).toContain('content/STYLE.md');
    for (const name of ['solve-closed', 'solve-notes', 'critic']) expect(read(name)).toContain('keys.json');
    expect(readFileSync(join(ROOT, 'content', 'STYLE.md'), 'utf8')).toContain('**NOT**');
  });
});
