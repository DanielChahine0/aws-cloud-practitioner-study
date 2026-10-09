import { describe, expect, it } from 'vitest';
import { headingsOf, notesAnchors, slugify, splitFrontmatter } from '../../scripts/content/lib/markdown.ts';
import { parseUpdateLine } from '../../scripts/content/lib/update-line.ts';

describe('splitFrontmatter', () => {
  it('returns the YAML, the body and the body start line', () => {
    expect(splitFrontmatter('---\na: 1\n---\n# T\n')).toEqual({ yaml: 'a: 1', body: '# T\n', bodyLine: 4 });
    expect(splitFrontmatter('# T\n')).toEqual({ yaml: null, body: '# T\n', bodyLine: 1 });
  });
});

describe('slugify', () => {
  it('keeps letters, digits, spaces and hyphens', () => {
    expect(slugify('From Amazon.com to AWS')).toBe('from-amazoncom-to-aws');
    expect(slugify('  Plan  comparison ')).toBe('plan-comparison');
    expect(slugify('Amazon EC2 **Auto** Scaling')).toBe('amazon-ec2-auto-scaling');
  });
});

describe('headingsOf and notesAnchors', () => {
  const body = [
    '# Title',
    '## Objectives',
    '### Not an anchor',
    '## Notes',
    '### First topic',
    '```',
    '### Inside code',
    '```',
    '### Second topic',
    '## Terms',
  ].join('\n');

  it('lists H2 and H3 outside code with file line numbers', () => {
    const headings = headingsOf(body, 10);
    expect(headings.map((h) => [h.depth, h.slug, h.line])).toEqual([
      [2, 'objectives', 11],
      [3, 'not-an-anchor', 12],
      [2, 'notes', 13],
      [3, 'first-topic', 14],
      [3, 'second-topic', 18],
      [2, 'terms', 19],
    ]);
  });

  it('takes anchors only from H3s under ## Notes', () => {
    expect(notesAnchors(headingsOf(body, 1))).toEqual(['first-topic', 'second-topic']);
  });
});

describe('parseUpdateLine', () => {
  it('reads the date, source and sentence, and rejects other shapes', () => {
    const line =
      '- **Exam guide update** (verified_on 2026-10-09, [CLF-C02 Domain 4](https://docs.aws.amazon.com/x.html)): The guide names four plans.';
    expect(parseUpdateLine(line)).toEqual({
      verifiedOn: '2026-10-09',
      title: 'CLF-C02 Domain 4',
      url: 'https://docs.aws.amazon.com/x.html',
      sentence: 'The guide names four plans.',
    });
    expect(parseUpdateLine('- **Exam guide update**: missing the date')).toBeNull();
  });
});
