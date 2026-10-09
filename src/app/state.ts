import { batch, signal } from '@preact/signals';
import { parseHash, type Route } from './router.ts';

export type Overlay = 'palette' | 'help';

export interface OpenTerm {
  id: string;
  anchor: HTMLElement;
}

/** The current route; only the hashchange listener below writes it. */
export const route = signal<Route>(parseHash(location.hash));
/** The open modal dialog, if any. */
export const overlay = signal<Overlay | null>(null);
/** The glossary popover and the term button that opened it. */
export const openTerm = signal<OpenTerm | null>(null);

/** Closes the glossary popover and gives focus back to its term button. */
export function closeTerm(): void {
  const open = openTerm.value;
  if (open === null) return;
  openTerm.value = null;
  open.anchor.focus();
}

/** Arriving at a route: close any dialog and the popover, and focus the page. */
function arrive(): void {
  for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) dialog.close();
  batch(() => {
    route.value = parseHash(location.hash);
    overlay.value = null;
    openTerm.value = null;
  });
  document.getElementById('main')?.focus({ preventScroll: true });
}

window.addEventListener('hashchange', () => {
  arrive();
  window.scrollTo(0, 0);
});

/**
 * Goes to a hash route. Going to the route already shown fires no hashchange, so it arrives directly
 * and scrolls back to the route's anchor, or to the top.
 */
export function navigate(hash: string): void {
  if (hash !== location.hash) {
    location.hash = hash;
    return;
  }
  arrive();
  const current = route.value;
  const target =
    current.kind === 'lesson' && current.anchor !== null ? document.getElementById(current.anchor) : null;
  if (target === null) window.scrollTo(0, 0);
  else target.scrollIntoView();
}

// A plain click on a link to the route already shown, such as a popover's "Defined in" link, arrives there too.
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest('a') : null;
  if (link === null || link.target !== '' || link.getAttribute('href') !== location.hash) return;
  event.preventDefault();
  navigate(location.hash);
});
