/**
 * Keeps the focused control clear of the sticky button bars at the bottom of a phone screen (WCAG 2.4.11).
 * Browsers treat a control under a sticky footer as already in view, so focus never scrolls it out;
 * and the bars change height as their buttons and hint wrap, so no fixed scroll-padding fits them all.
 */

/** The runner's and the labs' bars, which base.css makes sticky below 480 px. */
const BARS = '.submit-bar, .lab-actions';
/** Room left between the control and the bar. */
const GAP = 8;
/** The sticky top bar plus its gap, as `scroll-padding-top` in base.css. */
const TOP_CLEAR = 52;

export interface Span {
  top: number;
  bottom: number;
}

/**
 * How far to scroll down so `box` ends GAP px above `bar`; 0 when the box does not reach the bar.
 * It never scrolls the box's top under the top bar.
 */
export function scrollToClear(box: Span, bar: Span): number {
  if (box.bottom + GAP <= bar.top || box.top >= bar.bottom) return 0;
  return Math.max(0, Math.min(box.bottom + GAP - bar.top, box.top - TOP_CLEAR));
}

/** After each focus move, and after the browser's own focus scrolling, scrolls the focused control out from under a stuck bar. */
export function keepFocusClearOfBars(): void {
  document.addEventListener('focusin', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    requestAnimationFrame(() => {
      if (document.activeElement !== el) return;
      for (const bar of document.querySelectorAll(BARS)) {
        if (bar.contains(el) || getComputedStyle(bar).position !== 'sticky') continue;
        // An option's visible target is its whole label, not the small radio or checkbox inside it.
        const by = scrollToClear(
          (el.closest('label') ?? el).getBoundingClientRect(),
          bar.getBoundingClientRect(),
        );
        if (by > 0) {
          window.scrollBy(0, by);
          return;
        }
      }
    });
  });
}
