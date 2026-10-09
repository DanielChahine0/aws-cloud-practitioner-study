/** Where the glossary popover goes: pure, so it is tested without a browser. */
const EDGE = 16;
const GAP = 6;
/** Height of the sticky top bar in base.css; the popover never opens above it. */
const TOP_BAR = 44;

export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface View extends Size {
  scrollX: number;
  scrollY: number;
}

/**
 * Page coordinates for a popover of `box` size: below the anchor at its left edge, clamped 16 px
 * inside the viewport, and flipped above the anchor when it fits there but not below.
 */
export function popoverPosition(anchor: AnchorRect, box: Size, view: View): { top: number; left: number } {
  const left = Math.max(EDGE, Math.min(anchor.left, view.width - EDGE - box.width));
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - box.height;
  const fitsBelow = below + box.height <= view.height - EDGE;
  const top = !fitsBelow && above >= TOP_BAR + EDGE ? above : below;
  return { top: top + view.scrollY, left: left + view.scrollX };
}
