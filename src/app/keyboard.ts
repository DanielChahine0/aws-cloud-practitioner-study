import { useEffect } from 'preact/hooks';
import { now } from './clock.ts';
import { index } from './content.ts';
import { nextLabel } from './home.ts';
import { G_WINDOW_MS, keyStep } from './keys.ts';
import { nextUp } from './memory.ts';
import { closeTerm, exam, labHolding, navigate, openTerm, overlay, route } from './state.ts';

/** Input types that take no typed text, so single-letter shortcuts stay on while one has focus. */
const NON_TEXT_INPUTS = new Set(['radio', 'checkbox', 'button', 'submit', 'reset', 'file', 'range', 'color']);

/** True when keys typed now would go into a text field, a text area or a select. */
export const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    (target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)));

/** True when focus is on an element that answers Enter itself: a link, a button, a form field or a summary. */
export const isControl = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest('a, button, input, select, textarea, summary') !== null;

/** When `g` was pressed, if it was the previous key; the global listener below keeps it. */
let gAt: number | null = null;
/** The keydown the global listener handled last, and whether a `g` was pending when it came. */
let handled: { at: number; pending: boolean } | null = null;

/**
 * True when the keydown at `at` follows a `g` still open, so a screen's own `h` or `r` leaves the `g h` and `g r`
 * sequences alone, whichever window listener sees the keydown first.
 */
export function gPending(at: number): boolean {
  if (handled !== null && handled.at === at) return handled.pending;
  return gAt !== null && at - gAt <= G_WINDOW_MS;
}

/** Follows the Next button, when it has somewhere to go. */
function followNext(): void {
  const idx = index.value;
  const action = nextUp.value;
  if (idx === null || action === null) return;
  const { href } = nextLabel(action, idx, now.value);
  if (href !== null) navigate(href);
}

/** Focuses the next or previous `[data-nav-item]`, clamped at both ends; with none focused, the first. */
function moveFocus(delta: 1 | -1): void {
  const items = [...document.querySelectorAll<HTMLElement>('[data-nav-item]')];
  if (items.length === 0) return;
  const active = document.activeElement;
  const at = active instanceof HTMLElement ? items.indexOf(active) : -1;
  const target = at === -1 ? 0 : Math.min(items.length - 1, Math.max(0, at + delta));
  items[target]?.focus();
}

/** The one window keydown listener for the global shortcuts (spec 7.4); dialogs handle their own keys. */
export function useKeyboard(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      handled = { at: event.timeStamp, pending: gAt !== null && event.timeStamp - gAt <= G_WINDOW_MS };
      const step = keyStep(
        {
          key: event.key,
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          typing: isTyping(event.target),
          control: isControl(event.target),
          at: event.timeStamp,
        },
        {
          route: route.value,
          modules: index.value?.modules ?? [],
          overlayOpen: overlay.value !== null,
          termOpen: openTerm.value !== null,
          gAt,
          exam: exam.value !== null,
          labHolding: labHolding.value,
        },
      );
      gAt = step.gAt;
      const command = step.command;
      if (command === null) return;
      event.preventDefault();
      switch (command.kind) {
        case 'palette':
          overlay.value = 'palette';
          break;
        case 'help':
          overlay.value = 'help';
          break;
        case 'progress':
          overlay.value = 'progress';
          break;
        case 'close-term':
          closeTerm();
          break;
        case 'close-sheet':
          overlay.value = null;
          break;
        case 'navigate':
          navigate(command.hash);
          break;
        case 'next':
          followNext();
          break;
        case 'move':
          moveFocus(command.delta);
          break;
        case 'g':
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
