import { useEffect } from 'preact/hooks';
import { index } from './content.ts';
import { keyStep } from './keys.ts';
import { closeTerm, navigate, openTerm, overlay, route } from './state.ts';

/** Input types that take no typed text, so single-letter shortcuts stay on while one has focus. */
const NON_TEXT_INPUTS = new Set(['radio', 'checkbox', 'button', 'submit', 'reset', 'file', 'range', 'color']);

/** True when keys typed now would go into a text field, a text area or a select. */
export const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    (target instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(target.type)));

/** The one window keydown listener for the global shortcuts (spec 7.4); dialogs handle their own keys. */
export function useKeyboard(): void {
  useEffect(() => {
    let gAt: number | null = null;
    const onKeyDown = (event: KeyboardEvent): void => {
      const step = keyStep(
        {
          key: event.key,
          meta: event.metaKey,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          typing: isTyping(event.target),
          at: event.timeStamp,
        },
        {
          route: route.value,
          modules: index.value?.modules ?? [],
          overlayOpen: overlay.value !== null,
          termOpen: openTerm.value !== null,
          gAt,
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
        case 'navigate':
          navigate(command.hash);
          break;
        case 'g':
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
