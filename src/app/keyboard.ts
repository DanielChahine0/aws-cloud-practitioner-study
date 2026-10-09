import { useEffect } from 'preact/hooks';
import { index } from './content.ts';
import { keyCommand } from './keys.ts';
import { closeTerm, openTerm, overlay, route } from './state.ts';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** The one window keydown listener for the global shortcuts (spec 7.4); dialogs handle their own keys. */
export function useKeyboard(): void {
  useEffect(() => {
    let gAt: number | null = null;
    const onKeyDown = (event: KeyboardEvent): void => {
      const command = keyCommand(
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
      gAt = command?.kind === 'g' ? command.at : null;
      if (command === null) return;
      event.preventDefault();
      switch (command.kind) {
        case 'palette':
          overlay.value = 'palette';
          break;
        case 'help':
          overlay.value = 'help';
          break;
        case 'close-term':
          closeTerm();
          break;
        case 'navigate':
          location.hash = command.hash;
          break;
        case 'g':
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
