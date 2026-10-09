/**
 * The blocks of a rendered note whose text is an evidence line (spec 2.8), compared with whitespace collapsed.
 * An evidence line is one line of the note's Markdown, so a list item counts by its own text without its nested
 * lists, and a table row counts in its Markdown form, `| a | b |`.
 * Self-contained, with no imports, so the e2e test can run this exact function in the page.
 */
export function findEvidence(root: ParentNode, text: string): HTMLElement[] {
  const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim();
  const lineText = (el: HTMLElement): string => {
    if (el.tagName === 'TR') {
      return `| ${[...el.children].map((cell) => collapse(cell.textContent ?? '')).join(' | ')} |`;
    }
    if (el.tagName !== 'LI') return el.textContent ?? '';
    const own = el.cloneNode(true) as HTMLElement;
    for (const nested of own.querySelectorAll('ul, ol')) nested.remove();
    return own.textContent ?? '';
  };
  const wanted = collapse(text);
  return [...root.querySelectorAll<HTMLElement>('p, li, tr, td, .update-text')].filter(
    (el) => collapse(lineText(el)) === wanted,
  );
}
