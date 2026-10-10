import { describe, expect, it } from 'vitest';
import { injectManifest, SW_PLACEHOLDER, swManifest } from '../../scripts/lib/sw-manifest.ts';

const BUILD = [
  'sw.js',
  'index.html',
  'content/m02.2efa04cd.json',
  'assets/index-BmD2kQ9x.js',
  'content/index.328894ee.json',
  'assets/index-BmD2kQ9x.js.map',
  'content/m01.bf78409a.json',
  'assets/index-C4f1aZ7e.css',
  'deploys.json',
];
const HTML = '<!doctype html><title>CCP Study</title>';

describe('swManifest', () => {
  it('lists / first, then every build file sorted, without sw.js, deploys.json and source maps', () => {
    expect(swManifest(BUILD, HTML).files).toEqual([
      '/',
      '/assets/index-BmD2kQ9x.js',
      '/assets/index-C4f1aZ7e.css',
      '/content/index.328894ee.json',
      '/content/m01.bf78409a.json',
      '/content/m02.2efa04cd.json',
      '/index.html',
    ]);
  });

  it('names the version after the file list and index.html', () => {
    const { version } = swManifest(BUILD, HTML);
    expect(version).toMatch(/^sw-[0-9a-f]{12}$/);
    expect(swManifest([...BUILD].reverse(), HTML).version).toBe(version);
    const renamed = BUILD.map((f) => (f === 'content/m02.2efa04cd.json' ? 'content/m02.0badc0de.json' : f));
    expect(swManifest(renamed, HTML).version).not.toBe(version);
    expect(swManifest(BUILD, `${HTML}\n`).version).not.toBe(version);
  });
});

describe('injectManifest', () => {
  const manifest = { version: 'sw-0123456789ab', files: ['/', '/index.html'] };
  const json = JSON.stringify(manifest);

  it('replaces the placeholder in single, double or back quotes with the manifest as JSON', () => {
    expect(injectManifest(`const m='${SW_PLACEHOLDER}';use(m);`, manifest)).toBe(`const m=${json};use(m);`);
    expect(injectManifest(`const m = "${SW_PLACEHOLDER}";`, manifest)).toBe(`const m = ${json};`);
    expect(injectManifest(`var{version:e,files:t}=\`${SW_PLACEHOLDER}\`,n=1;`, manifest)).toBe(
      `var{version:e,files:t}=${json},n=1;`,
    );
  });

  it('leaves a placeholder with mismatched quotes alone', () => {
    expect(() => injectManifest(`m='${SW_PLACEHOLDER}"`, manifest)).toThrow(
      'sw.js has no manifest placeholder',
    );
  });

  it('keeps dollar signs in file names as they are', () => {
    const odd = { version: 'sw-0123456789ab', files: ["/assets/a$'b.js"] };
    expect(injectManifest(`x('${SW_PLACEHOLDER}')`, odd)).toBe(`x(${JSON.stringify(odd)})`);
  });

  it('refuses code with no placeholder or with more than one', () => {
    expect(() => injectManifest('const m = {};', manifest)).toThrow('sw.js has no manifest placeholder');
    expect(() => injectManifest(`a('${SW_PLACEHOLDER}');b("${SW_PLACEHOLDER}")`, manifest)).toThrow(
      'sw.js has more than one manifest placeholder',
    );
  });
});
