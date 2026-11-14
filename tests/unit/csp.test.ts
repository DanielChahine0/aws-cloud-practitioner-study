import { describe, expect, it } from 'vitest';
import { CSP, cspMetaPlugin, META_CSP } from '../../scripts/csp.ts';

describe('META_CSP', () => {
  it('is the header policy without frame-ancestors, which a meta policy cannot carry', () => {
    expect(META_CSP).toBe("default-src 'self'; img-src 'self' data:; connect-src 'self'");
    expect(CSP.startsWith(`${META_CSP}; `)).toBe(true);
  });
});

describe('cspMetaPlugin', () => {
  const plugin = cspMetaPlugin();
  const hook = plugin.transformIndexHtml as { order: string; handler: (html: string) => string };
  const transform = (html: string): string => hook.handler(html);

  it('runs at build time only, before the other index.html transforms', () => {
    expect(plugin.apply).toBe('build');
    expect(hook.order).toBe('pre');
  });

  it('puts the policy right after the charset, ahead of every script', () => {
    const html = '<head>\n    <meta charset="utf-8" />\n    <script src="./a.js"></script>\n</head>';
    expect(transform(html)).toBe(
      `<head>\n    <meta charset="utf-8" />\n    <meta http-equiv="Content-Security-Policy" content="${META_CSP}" />\n    <script src="./a.js"></script>\n</head>`,
    );
  });

  it('fails the build when index.html has no charset tag, or more than one', () => {
    expect(() => transform('<head></head>')).toThrow(
      'index.html must hold <meta charset="utf-8" /> exactly once',
    );
    expect(() => transform('<meta charset="utf-8" /><meta charset="utf-8" />')).toThrow('exactly once');
  });
});
