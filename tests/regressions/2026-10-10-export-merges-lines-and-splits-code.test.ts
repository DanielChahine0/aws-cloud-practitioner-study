import { describe, expect, it } from 'vitest';
import { emDashLines, multiSentenceLines } from '../../scripts/content/lib/text.ts';
import { oneSentencePerLine } from '../../src/engine/plan.ts';

/**
 * The plan export (spec 6) changed Dani's text where it had no reason to.
 * Its em dash pattern absorbed any whitespace, so a dash at the start or end of a line ate the line breaks around it
 * and a dash-style list or a paragraph break collapsed into one line.
 * It also split sentences inside fenced code blocks, which rule R8 exempts, so a pasted command or policy changed.
 */
describe('the plan export', () => {
  it('keeps line breaks and blank lines around an em dash', () => {
    expect(oneSentencePerLine('Options:\n\n\u2014 Rent a kitchen.\n\u2014 Build one.')).toBe(
      'Options:\n\n- Rent a kitchen.\n- Build one.',
    );
    expect(oneSentencePerLine('A.\n\n\u2014 B.')).toBe('A.\n\n- B.');
    expect(oneSentencePerLine('A\u2014\nB.')).toBe('A -\nB.');
    expect(oneSentencePerLine('We rent.\u2014\nThen we grow.')).toBe('We rent. -\nThen we grow.');
  });

  it('still turns an em dash inside a line into a spaced dash', () => {
    expect(oneSentencePerLine('Rent\t\u2014  then build.')).toBe('Rent - then build.');
  });

  it('leaves fenced code blocks unchanged', () => {
    const backticks = '```\necho "Done. Next"\n```';
    expect(oneSentencePerLine(backticks)).toBe(backticks);
    const tildes =
      'See below. It runs.\n\n~~~~json\n{ "Note": "Allow. Deny." }\n~~~\nstill code. Yes.\n~~~~\nAfter. Done.';
    expect(oneSentencePerLine(tildes)).toBe(
      'See below.\nIt runs.\n\n~~~~json\n{ "Note": "Allow. Deny." }\n~~~\nstill code. Yes.\n~~~~\nAfter.\nDone.',
    );
    expect(multiSentenceLines(oneSentencePerLine(tildes))).toEqual([]);
  });

  it('never leaves an em dash, even inside a fence', () => {
    expect(emDashLines(oneSentencePerLine('```\na \u2014 b\n```'))).toEqual([]);
  });
});
