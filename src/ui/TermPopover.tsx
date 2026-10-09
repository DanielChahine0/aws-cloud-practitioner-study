import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { GlossaryItem } from '../../schemas/chunks.ts';
import { openTerm } from '../app/state.ts';
import { Html } from './Html.tsx';
import { popoverPosition } from './position.ts';

/**
 * The glossary popover for one term button: a non-modal dialog placed under the term,
 * focused once placed, closed by Escape (keyboard.ts), a click elsewhere or focus leaving it.
 */
export function TermPopover({ item, anchor }: { item: GlossaryItem; anchor: HTMLElement }) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const box = ref.current;
    if (box === null) return;
    const root = document.documentElement;
    setPlace(
      popoverPosition(
        anchor.getBoundingClientRect(),
        { width: box.offsetWidth, height: box.offsetHeight },
        {
          width: root.clientWidth,
          height: root.clientHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
      ),
    );
  }, [anchor]);

  useEffect(() => {
    if (place !== null) ref.current?.focus();
  }, [place]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent): void => {
      const target = event.target;
      if (target instanceof Node && (ref.current?.contains(target) || anchor.contains(target))) return;
      openTerm.value = null;
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [anchor]);

  return (
    <div
      ref={ref}
      class="popover"
      role="dialog"
      aria-label={item.term}
      tabIndex={-1}
      style={
        place === null ? { top: 0, left: 0, visibility: 'hidden' } : { top: place.top, left: place.left }
      }
      onFocusOut={(event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && !event.currentTarget.contains(next)) openTerm.value = null;
      }}
    >
      <p>
        <strong>{item.term}</strong>
      </p>
      <Html className="popover-def" html={item.html} />
      <p class="popover-label">Defined in</p>
      <ul class="popover-refs">
        {item.refs.map((source) => (
          <li key={source.route}>
            <a href={source.route}>{source.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
