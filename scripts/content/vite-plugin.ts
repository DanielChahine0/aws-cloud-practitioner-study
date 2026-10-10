import { join, relative, sep } from 'node:path';
import type { ErrorPayload, Plugin, ResolvedConfig } from 'vite';
import { type BuiltContent, buildContent } from './build.ts';
import { loadContext, localDate } from './lib/context.ts';
import { formatFinding, redact, runRules } from './rules/index.ts';

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
      problems.push(
        ...ctx.loadErrors.map((f) => formatFinding(redact(f))),
        'content/validate.yaml is missing or invalid',
      );
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
