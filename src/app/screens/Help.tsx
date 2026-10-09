import { useEffect, useRef } from 'preact/hooks';
import { closeOnBackdrop } from '../../ui/backdrop.ts';
import { overlay } from '../state.ts';

const SHORTCUTS: readonly { keys: readonly string[]; joiner: string; action: string }[] = [
  { keys: ['/', 'Cmd+K'], joiner: 'or', action: 'Search' },
  { keys: ['?'], joiner: '', action: 'This help' },
  { keys: ['g', 'h'], joiner: 'then', action: 'Home' },
  { keys: ['[', ']'], joiner: 'and', action: 'Previous or next lesson' },
  { keys: ['Esc'], joiner: '', action: 'Close, or go up one level' },
];

/** The keyboard help sheet (`?`). */
export function Help() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (el !== null && !el.open) el.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      class="sheet"
      aria-labelledby="help-title"
      onClose={() => {
        if (overlay.value === 'help') overlay.value = null;
      }}
      onMouseDown={(event) => closeOnBackdrop(event.currentTarget, event)}
    >
      <div class="sheet-body">
        <h2 id="help-title">Keyboard shortcuts</h2>
        <table class="keys">
          <thead>
            <tr>
              <th scope="col">Keys</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.action}>
                <td>
                  {s.keys.map((k, i) => (
                    <span key={k}>
                      {i > 0 && ` ${s.joiner} `}
                      <kbd>{k}</kbd>
                    </span>
                  ))}
                </td>
                <td>{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form method="dialog">
          <button class="button" type="submit">
            Close
          </button>
        </form>
      </div>
    </dialog>
  );
}
