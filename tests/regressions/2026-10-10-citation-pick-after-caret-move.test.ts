import { describe, expect, it } from 'vitest';
import type { ConceptMeta } from '../../schemas/chunks.ts';
import { conceptNames, openCitation, pickCitation, suggestions } from '../../src/app/project.ts';

// The Why list kept the `[[` it opened on while End or ArrowLeft moved the caret, so Enter picked a name for a
// stale citation and rewrote the text from its start to the new caret: what Dani wrote after it was lost.
// The Project route lands in Task 18, so this pins the pick rule the screen calls rather than driving a browser.
const concept = (id: string, name: string): ConceptMeta => ({
  id,
  name,
  home: 'm01/what-a-bakery-cloud-is',
  anchor: 'ovens',
  tested: true,
  tasks: ['1.1'],
  confusableWith: [],
  aliases: [],
  splitFrom: null,
});
const CONCEPTS = conceptNames([concept('oven-timer', 'Oven timer'), concept('hired-oven', 'Hired oven')]);

const TEXT = 'We pick [[ov because mornings peak.';
const TYPED = 'We pick [[ov'.length;

describe('a citation pick after the caret moves', () => {
  it('inserts the name while the caret still ends the open query', () => {
    const open = openCitation(TEXT, TYPED);
    expect(open).not.toBeNull();
    if (open === null) return;
    expect(pickCitation(TEXT, TYPED, open, 'Oven timer')).toEqual({
      text: 'We pick [[Oven timer]] because mornings peak.',
      caret: 'We pick [[Oven timer]]'.length,
    });
  });

  it('never rewrites the text once End or ArrowLeft has moved the caret', () => {
    const open = openCitation(TEXT, TYPED);
    if (open === null) throw new Error('the [[ov citation should be open');
    expect(pickCitation(TEXT, TEXT.length, open, 'Oven timer')).toBeNull();
    expect(pickCitation(TEXT, TYPED - 1, open, 'Oven timer')).toBeNull();
  });

  it('closes the list when the caret re-tracked at the end of the line matches no concept', () => {
    const atEnd = openCitation(TEXT, TEXT.length);
    expect(atEnd === null ? [] : suggestions(atEnd.query, CONCEPTS)).toEqual([]);
  });
});
