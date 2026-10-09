import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Runs the real pre-commit hook in a scratch repository whose node, pnpm and fnm are stubs,
// so it shows which Node the hook would run `pnpm check` on without running the real checks.
const HOOK = resolve('.githooks/pre-commit');
const PINNED = '24.21.0';

let dir: string;
let repo: string;
let marker: string;

function stub(binDir: string, name: string, body: string): void {
  mkdirSync(binDir, { recursive: true });
  const path = join(binDir, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
}

function git(...args: string[]): void {
  const result = spawnSync('git', args, { cwd: repo, env: cleanEnv(process.env.PATH ?? '') });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
}

function cleanEnv(path: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('GIT_') && !key.startsWith('FNM_')) env[key] = value;
  }
  return { ...env, PATH: path, MARKER: marker };
}

function runHook(path: string) {
  return spawnSync('/bin/sh', [HOOK], { cwd: repo, env: cleanEnv(path), encoding: 'utf8' });
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ccp-hook-test-'));
  repo = join(dir, 'repo');
  marker = join(dir, 'pnpm-ran-on');
  mkdirSync(join(repo, 'node_modules'), { recursive: true });
  git('init', '--quiet');
  git('config', 'user.email', 'hook@test');
  git('config', 'user.name', 'hook test');
  writeFileSync(join(repo, '.node-version'), `${PINNED}\n`);
  git('add', '.node-version');
  git('commit', '--quiet', '--no-verify', '-m', 'pin node');
  // pnpm records the Node it would have run the checks on.
  stub(join(dir, 'bin'), 'pnpm', 'node --version > "$MARKER"');
  stub(join(dir, 'bin'), 'node', 'echo v22.22.3');
  stub(join(dir, 'node24'), 'node', `echo v${PINNED}`);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('pre-commit hook', () => {
  it('switches to the pinned Node through fnm before running the checks', () => {
    stub(
      join(dir, 'bin'),
      'fnm',
      [
        'case "$1" in',
        `  env) echo 'export PATH="${join(dir, 'node24')}:$PATH"' ;;`,
        '  use) [ -f .node-version ] || exit 1 ;;',
        'esac',
      ].join('\n'),
    );
    const result = runHook(`${join(dir, 'bin')}:/usr/bin:/bin`);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(readFileSync(marker, 'utf8').trim()).toBe(`v${PINNED}`);
  });

  it('refuses to run the checks on a Node other than the pinned one', () => {
    const result = runHook(`${join(dir, 'bin')}:/usr/bin:/bin`);
    expect(result.status).not.toBe(0);
    expect(result.stderr.trim().split('\n')).toHaveLength(1);
    expect(result.stderr).toContain('v22.22.3');
    expect(result.stderr).toContain(`v${PINNED}`);
    expect(existsSync(marker)).toBe(false);
  });
});
