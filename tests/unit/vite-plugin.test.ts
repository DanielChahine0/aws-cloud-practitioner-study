import { EventEmitter } from 'node:events';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { contentPlugin } from '../../scripts/content/vite-plugin.ts';
import { makeFixtureRoot } from '../fixtures/content-root.ts';
import { bakeryLab, writeLab } from '../fixtures/labs.ts';

type HookName = 'configResolved' | 'buildStart' | 'generateBundle' | 'transformIndexHtml' | 'configureServer';
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

  it('fails the build with an R11 line for a lab whose solution misses a goal', () => {
    const root = makeFixtureRoot();
    writeLab(root, bakeryLab({ solution: bakeryLab().solution.slice(0, 3) }));
    expect(() => build(root)).toThrow(
      /R11 content\/labs\/01-baking-basics\/sort-the-bakes\.yaml +lab-m01-sort-the-bakes: the solution leaves g2 unmet: 1 of 2 right/,
    );
  });
});

const LESSON = join('resources', '01-baking-basics', '01-what-a-bakery-cloud-is.md');

type Middleware = (req: { url?: string }, res: object, next: () => void) => void;
interface Response {
  status: number | null;
  type: string | undefined;
  body: string | null;
  passedOn: boolean;
}

/** Starts the plugin the way `vite` (dev) does, against a stub server that records what the plugin sends. */
function serve(root: string) {
  const plugin = contentPlugin(root);
  const context = {
    error(message: string): never {
      throw new Error(message);
    },
  };
  callHook(plugin, 'configResolved', context, { command: 'serve' });
  callHook(plugin, 'buildStart', context);
  const tags = callHook(plugin, 'transformIndexHtml', context) as { attrs: { content: string } }[];

  const watcher = Object.assign(new EventEmitter(), { add: vi.fn() });
  const sent: unknown[] = [];
  const handlers = new Map<string, (data: unknown, client: { send: (payload: unknown) => void }) => void>();
  const middlewares: Middleware[] = [];
  const server = {
    watcher,
    ws: {
      send: (payload: unknown) => sent.push(payload),
      on: (event: string, handler: (data: unknown, client: { send: (payload: unknown) => void }) => void) =>
        handlers.set(event, handler),
    },
    middlewares: { use: (middleware: Middleware) => middlewares.push(middleware) },
  };
  callHook(plugin, 'configureServer', context, server);

  const request = (url: string): Response => {
    const out: Response = { status: null, type: undefined, body: null, passedOn: false };
    const headers = new Map<string, string>();
    const res = {
      set statusCode(code: number) {
        out.status = code;
      },
      setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), value),
      end: (body: string) => {
        out.body = body;
      },
    };
    for (const middleware of middlewares) {
      middleware({ url }, res, () => {
        out.passedOn = true;
      });
    }
    out.type = headers.get('content-type');
    return out;
  };
  /** A file event, then the debounce. */
  const touch = (event: 'change' | 'add' | 'unlink', file: string): void => {
    watcher.emit(event, join(root, file));
  };
  const connect = (): unknown[] => {
    const replayed: unknown[] = [];
    handlers.get('vite:client:connect')?.(undefined, { send: (payload) => replayed.push(payload) });
    return replayed;
  };
  return { indexFile: tags[0]?.attrs.content ?? '', watched: watcher.add, sent, request, touch, connect };
}

describe('contentPlugin in the dev server', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(new Date(2026, 9, 10, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('watches resources/ and content/ and serves the current chunks from memory', () => {
    const root = makeFixtureRoot();
    const dev = serve(root);
    expect(dev.watched).toHaveBeenCalledWith([join(root, 'resources'), join(root, 'content')]);
    expect(dev.indexFile).toMatch(/^content\/index\.[0-9a-f]{8}\.json$/);

    const index = dev.request(`/${dev.indexFile}?t=1`);
    expect(index.status).toBe(200);
    expect(index.type).toBe('application/json; charset=utf-8');
    expect(JSON.parse(index.body ?? '')).toHaveProperty('contentVersion');

    const outdated = dev.request('/content/index.00000000.json');
    expect(outdated.status).toBe(404);
    expect(outdated.body).toContain('/content/index.00000000.json is not a current content chunk');

    expect(dev.request('/src/main.tsx')).toMatchObject({ status: null, passedOn: true });
  });

  it('rebuilds once per burst of changes under resources/ or content/ and ignores every other file', () => {
    const root = makeFixtureRoot();
    const dev = serve(root);
    dev.touch('change', join('src', 'main.tsx'));
    dev.touch('change', join('resources-old', 'notes.md'));
    vi.advanceTimersByTime(1000);
    expect(dev.sent).toEqual([]);

    dev.touch('change', LESSON);
    dev.touch('add', join('content', 'validate.yaml'));
    dev.touch('unlink', LESSON);
    vi.advanceTimersByTime(99);
    expect(dev.sent).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(dev.sent).toEqual([{ type: 'full-reload' }]);
  });

  it('shows a broken note in the overlay, replays it to a new client, keeps serving the last good chunks, and reloads once fixed', () => {
    const root = makeFixtureRoot();
    const dev = serve(root);
    expect(dev.connect()).toEqual([]);
    const good = readFileSync(join(root, LESSON), 'utf8');

    appendFileSync(join(root, LESSON), '\n- See [later](02-gone.md).\n');
    dev.touch('change', LESSON);
    vi.advanceTimersByTime(100);
    const overlay = {
      type: 'error',
      err: { message: expect.stringMatching(/broken link 02-gone\.md/), stack: '' },
    };
    expect(dev.sent).toEqual([overlay]);
    expect(dev.connect()).toEqual([overlay]);
    expect(dev.request(`/${dev.indexFile}`).status).toBe(200);

    writeFileSync(join(root, LESSON), good);
    dev.touch('change', LESSON);
    vi.advanceTimersByTime(100);
    expect(dev.sent).toEqual([overlay, { type: 'full-reload' }]);
    expect(dev.connect()).toEqual([]);
  });
});
