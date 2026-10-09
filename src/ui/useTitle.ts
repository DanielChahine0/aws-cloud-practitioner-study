import { useEffect } from 'preact/hooks';

/** Sets the browser tab title for the current screen. */
export function useTitle(text: string): void {
  useEffect(() => {
    document.title = `${text} · CCP`;
  }, [text]);
}
