import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { agentVersion } from '../../scripts/content/lib/key-point-checks.ts';
import { splitFrontmatter } from '../../scripts/content/lib/markdown.ts';

const ROOT = resolve(import.meta.dirname, '..', '..');
const read = (name: string): string => readFileSync(join(ROOT, 'agents', `${name}.md`), 'utf8');

describe('the key point prompts', () => {
  it.each(['key-point-writer', 'key-point-critic'])('%s names itself and carries version 1', (name) => {
    const { yaml, body } = splitFrontmatter(read(name));
    expect(parse(yaml ?? '')).toEqual({ name, version: 1 });
    expect(body).toMatch(/^\n?# /);
    expect(body).not.toContain(String.fromCharCode(0x2014));
  });

  it('gives the critic a version the stamp can read', () => {
    expect(agentVersion(ROOT, 'key-point-critic')).toBe(1);
  });

  it('points the writer at the brief, its concepts, the style rules and its draft check, and away from the exam', () => {
    const writer = read('key-point-writer');
    for (const text of [
      'content/project/brief.yaml',
      'key-points.ts concepts --module NN',
      'content/STYLE.md',
      '## Numbers',
      '## Current names',
      'key-points.ts draft',
      'Never read',
      'content/exam/',
      'content/fingerprints/',
      '.results/',
    ]) {
      expect(writer).toContain(text);
    }
  });

  it('keeps the critic to its batch, its four checks and its lint loop', () => {
    const critic = read('key-point-critic');
    for (const text of [
      '.results/key-points/batches/',
      '.results/key-points/answers/',
      'content/STYLE.md',
      'Never open',
      '`accurate`',
      '`grounded`',
      '`fitsBrief`',
      '`currentNames`',
      'key-points.ts lint',
    ]) {
      expect(critic).toContain(text);
    }
  });
});
