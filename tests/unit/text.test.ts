import { describe, expect, it } from 'vitest';
import {
  emDashLines,
  fencedLines,
  MASK,
  mask,
  multiSentenceLines,
  phrasesFrom,
  stripMarkdown,
  words,
} from '../../scripts/content/lib/text.ts';

describe('words', () => {
  it('lowercases and keeps apostrophe suffixes, like overlap_check.py', () => {
    expect(words("AWS's Lambda don’t run_fast 2026-10-09")).toEqual([
      "aws's",
      'lambda',
      'don’t',
      'run',
      'fast',
      '2026',
      '10',
      '09',
    ]);
  });
});

describe('stripMarkdown', () => {
  it('drops frontmatter, link targets, URLs and Markdown punctuation', () => {
    const text =
      '---\nmodule: 1\n---\n# Title\n- **Bold** [label](../x.md) https://docs.aws.amazon.com/x `code`';
    expect(words(stripMarkdown(text))).toEqual(['title', 'bold', 'label', 'code']);
  });
});

describe('phrasesFrom and mask', () => {
  it('skips comments, blanks and one-word lines, and sorts longest first', () => {
    expect(phrasesFrom(['# comment', '', 'Amazon EC2', 'Assessment', 'Amazon EC2 Auto Scaling'])).toEqual([
      ['amazon', 'ec2', 'auto', 'scaling'],
      ['amazon', 'ec2'],
    ]);
  });

  it('masks the longest phrase first', () => {
    const phrases = phrasesFrom(['Amazon EC2', 'Amazon EC2 Auto Scaling']);
    expect(mask(words('Use Amazon EC2 Auto Scaling with Amazon EC2'), phrases)).toEqual([
      'use',
      MASK,
      MASK,
      MASK,
      MASK,
      'with',
      MASK,
      MASK,
    ]);
  });
});

describe('fencedLines', () => {
  it('closes a fence only with at least as many of the same character', () => {
    const lines = ['a', '````md', '```json', '{}', '```', '````', 'b'];
    expect(fencedLines(lines)).toEqual([false, true, true, true, true, true, false]);
  });
});

describe('emDashLines', () => {
  it('reports 1-based line numbers', () => {
    expect(emDashLines('a\nb \u2014 c\nd')).toEqual([2]);
  });
});

describe('multiSentenceLines', () => {
  it('flags two sentences on a line and exempts abbreviations, initials, tables, code and list markers', () => {
    const md = [
      '---',
      'title: x',
      '---',
      '# Head',
      'One sentence. Two sentences.',
      'Use e.g. This is fine',
      'Ends with U.S. Government here',
      'Single J. Smith initial',
      '| a. B. | c |',
      '```',
      'Code. Here.',
      '```',
      '1. Item one.',
      'Version 1.2 works.',
      'Done! Next',
    ].join('\n');
    expect(multiSentenceLines(md)).toEqual([5, 15]);
  });
});

describe('CRLF files', () => {
  it('find fences and frontmatter in CRLF text as in LF text', () => {
    const lf = '---\ntitle: x\n---\n# T\n\n```\nfoo. Bar\n```\n\nOne. Two\n';
    const crlf = lf.replaceAll('\n', '\r\n');
    expect(multiSentenceLines(crlf)).toEqual(multiSentenceLines(lf));
    expect(multiSentenceLines(lf)).toEqual([10]);
    expect(fencedLines(crlf.split('\n'))).toEqual(fencedLines(lf.split('\n')));
  });
});
