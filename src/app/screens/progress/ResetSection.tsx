import { useState } from 'preact/hooks';
import { resetAll } from '../../progress.ts';
import { RESET_WORD } from '../../progress-lines.ts';

/** Deletes all progress after the reset word is typed (spec 7.3 settings); no modal, the confirmation is inline. */
export function ResetSection() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [done, setDone] = useState(false);
  return (
    <>
      <h3>Reset</h3>
      {done ? (
        <p class="import-done" role="status">
          Deleted. This browser has no progress now.
        </p>
      ) : !open ? (
        <p class="sheet-actions">
          <button class="button button-quiet" type="button" onClick={() => setOpen(true)}>
            Reset all progress
          </button>
        </p>
      ) : (
        <div class="reset">
          <p>Type {RESET_WORD} to delete every event and setting in this browser.</p>
          <label class="date-field">
            Reset word
            <input
              type="text"
              value={typed}
              autocomplete="off"
              spellcheck={false}
              onInput={(event) => setTyped(event.currentTarget.value)}
            />
          </label>
          <p class="sheet-actions">
            <button
              class="button"
              type="button"
              disabled={typed !== RESET_WORD}
              onClick={() => {
                void resetAll().then(() => setDone(true));
              }}
            >
              Delete everything
            </button>
            <button class="link-button" type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </p>
        </div>
      )}
    </>
  );
}
