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

window.addEventListener('hashchange', () => {
  for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) dialog.close();
  batch(() => {
    route.value = parseHash(location.hash);
    overlay.value = null;
    openTerm.value = null;
  });
  document.getElementById('main')?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
