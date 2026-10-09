import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, onTestFinished } from 'vitest';
import {
  type DeployLog,
  distFiles,
  LOG_FILE,
  nextLog,
  parseKeys,
  parseLog,
  prunable,
  stackOutputs,
} from '../../scripts/lib/deploy.ts';

/** A log whose deploys hold the given file lists, dated one day apart. */
const logOf = (...lists: string[][]): DeployLog => ({
  deploys: lists.map((files, i) => ({ at: `2026-10-1${i}T08:00:00.000Z`, files })),
});

describe('prunable', () => {
  const existing = [
    'index.html',
    'sw.js',
    LOG_FILE,
    'assets/index-old.js',
    'assets/index-prev.js',
    'assets/index-new.js',
    'content/m01.0ld0ld00.json',
  ];

  it('deletes files that belong to neither this build nor the previous deploy', () => {
    const log = logOf(
      ['index.html', 'assets/index-old.js', 'content/m01.0ld0ld00.json'],
      ['index.html', 'assets/index-prev.js'],
    );
    expect(prunable(existing, log, ['index.html', 'assets/index-new.js'])).toEqual([
      'assets/index-old.js',
      'content/m01.0ld0ld00.json',
    ]);
  });

  it('never deletes the entry files or the log, even before the first logged deploy', () => {
    expect(prunable(existing, logOf(), ['assets/index-new.js'])).toEqual([
      'assets/index-old.js',
      'assets/index-prev.js',
      'content/m01.0ld0ld00.json',
    ]);
  });
});

describe('nextLog', () => {
  it('keeps the previous deploy and the new one', () => {
    const third = { at: '2026-10-12T08:00:00.000Z', files: ['assets/index-new.js'] };
    expect(nextLog(logOf(['a.js'], ['b.js']), third)).toEqual({
      deploys: [{ at: '2026-10-11T08:00:00.000Z', files: ['b.js'] }, third],
    });
    expect(nextLog(logOf(), third)).toEqual({ deploys: [third] });
  });
});

describe('parseLog, parseKeys and stackOutputs', () => {
  it('reads a missing log as no deploys and rejects a malformed one', () => {
    expect(parseLog(null)).toEqual({ deploys: [] });
    expect(parseLog(JSON.stringify(logOf(['index.html'])))).toEqual(logOf(['index.html']));
    expect(() => parseLog('{"deploys":"none"}')).toThrow();
  });

  it('reads an empty bucket listing, which the CLI prints as null', () => {
    expect(parseKeys('null\n')).toEqual([]);
    expect(parseKeys('["assets/a.js", "index.html"]\n')).toEqual(['assets/a.js', 'index.html']);
  });

  it('picks the three stack outputs and names a missing one', () => {
    const outputs = [
      { OutputKey: 'BucketName', OutputValue: 'ccp-study-site-sitebucket-1a2b3c' },
      { OutputKey: 'DistributionId', OutputValue: 'E2EXAMPLE' },
      {
        OutputKey: 'SiteUrl',
        OutputValue: 'https://d111111abcdef8.cloudfront.net',
        Description: 'The address',
      },
    ];
    expect(stackOutputs(JSON.stringify(outputs))).toEqual({
      bucket: 'ccp-study-site-sitebucket-1a2b3c',
      distributionId: 'E2EXAMPLE',
      siteUrl: 'https://d111111abcdef8.cloudfront.net',
    });
    expect(() => stackOutputs(JSON.stringify(outputs.slice(0, 2)))).toThrow(
      'stack output SiteUrl is missing',
    );
  });
});

describe('distFiles', () => {
  it('lists every file below the folder as sorted posix paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccp-dist-'));
    onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
    mkdirSync(join(dir, 'assets'));
    mkdirSync(join(dir, 'content'));
    for (const file of ['index.html', 'assets/index-abc123.js', 'content/m01.0123abcd.json']) {
      writeFileSync(join(dir, file), 'x');
    }
    expect(distFiles(dir)).toEqual(['assets/index-abc123.js', 'content/m01.0123abcd.json', 'index.html']);
  });
});
