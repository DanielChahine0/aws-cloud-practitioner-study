import { describe, expect, it } from 'vitest';
import { type LessonNote, loadContext } from '../../scripts/content/lib/context.ts';
import { evidenceForm, noteLines, sectionAt } from '../../scripts/content/lib/evidence.ts';
import { headingsOf } from '../../scripts/content/lib/markdown.ts';
import { FIXTURE_TODAY, makeFixtureRoot } from '../fixtures/content-root.ts';

const UPDATE = 'The fixture guide names a newer billing term.';

function lesson(): LessonNote {
  const ctx = loadContext(makeFixtureRoot(), { today: FIXTURE_TODAY });
  const note = ctx.notes.find((n) => n.id === 'm01/what-a-bakery-cloud-is');
  if (note?.kind !== 'lesson') throw new Error('the fixture lesson is missing');
  return note;
}

/** A made-up note body, starting at file line 1, for the cases the fixture lesson does not have. */
function noteOf(body: string): LessonNote {
  return {
    ...lesson(),
    text: body,
    body,
    bodyLine: 1,
    headings: headingsOf(body, 1),
  };
}

describe('evidenceForm', () => {
  it('strips one list marker, bold markers and link targets', () => {
    expect(evidenceForm('- **Amazon S3** stores [objects](https://x).')).toBe('Amazon S3 stores objects.');
    expect(evidenceForm('  2. Ovens **warm** up.  ')).toBe('Ovens warm up.');
    expect(evidenceForm('Plain line.')).toBe('Plain line.');
  });
});

describe('noteLines', () => {
  it('maps each citable line to its file line, an update line to its sentence only', () => {
    const note = lesson();
    const lines = noteLines(note);
    const fileLines = note.text.split('\n');
    const shared = 'Branches use ovens from one central kitchen when their queues grow.';
    expect(fileLines[(lines.get(shared) ?? 0) - 1]).toBe(`- ${shared}`);
    expect(fileLines[(lines.get(UPDATE) ?? 0) - 1]).toContain('Exam guide update');
    expect([...lines.keys()].some((key) => key.includes('verified_on'))).toBe(false);
  });

  it('skips lines inside a code fence, blank lines, and keeps the first of two equal lines', () => {
    const lines = noteLines(noteOf('## Notes\n\n```\n- Inside a fence.\n```\n- Twice.\n- Twice.\n'));
    expect(lines.has('Inside a fence.')).toBe(false);
    expect(lines.has('')).toBe(false);
    expect(lines.get('Twice.')).toBe(6);
  });
});

describe('sectionAt', () => {
  it('finds the H3 that holds the update line of the fixture lesson', () => {
    const note = lesson();
    expect(sectionAt(note, noteLines(note).get(UPDATE) ?? 0)?.slug).toBe('paying-by-the-minute');
  });

  it('falls back to the H2 when no H3 follows it, and is null above every heading', () => {
    const note = noteOf('Intro line.\n## Key takeaways\n- Borrow and return.\n');
    expect(sectionAt(note, 3)?.slug).toBe('key-takeaways');
    expect(sectionAt(note, 1)).toBeNull();
  });
});
