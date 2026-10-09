/**
 * Wraps each table of a rendered note in a focusable region that scrolls sideways, so wide tables stay
 * readable on a phone and keyboard users can scroll them (axe rule scrollable-region-focusable).
 */
export function scrollableTables(root: HTMLElement): void {
  for (const table of root.querySelectorAll('table')) {
    if (table.parentElement?.classList.contains('table-scroll')) continue;
    const region = document.createElement('div');
    region.className = 'table-scroll';
    region.tabIndex = 0;
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', `${headingBefore(table) ?? 'Table'}, scrolls sideways`);
    table.before(region);
    region.append(table);
  }
}

/** The text of the nearest heading before the element in the same parent, if any. */
function headingBefore(element: Element): string | null {
  for (let e = element.previousElementSibling; e !== null; e = e.previousElementSibling) {
    if (/^H[1-6]$/.test(e.tagName)) return e.textContent;
  }
  return null;
}
