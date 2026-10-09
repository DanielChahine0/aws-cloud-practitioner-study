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
