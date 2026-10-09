import { useEffect, useRef, useState } from 'preact/hooks';
import type { SearchEntry } from '../../../schemas/chunks.ts';
import { closeOnBackdrop } from '../../ui/backdrop.ts';
import { ensureSearch, searchEntries } from '../content.ts';
import { rank } from '../search.ts';
import { overlay } from '../state.ts';

/** Enough rows for the 13 modules that an empty query lists. */
const MAX_RESULTS = 13;
const KIND_LABEL: Record<SearchEntry['kind'], string> = {
  module: 'Module',
  lesson: 'Lesson',
  concept: 'Concept',
  term: 'Term',
  mission: 'Mission',
};
const optionId = (i: number): string => `palette-option-${i}`;

/** The search palette (`/` or Cmd+K): a modal dialog with a combobox over the search entries. */
export function Palette() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const entries = searchEntries.value;
  const results = entries === null ? [] : rank(entries, query).slice(0, MAX_RESULTS);
  const expanded = results.length > 0;

  useEffect(() => {
    const el = dialog.current;
    if (el !== null && !el.open) el.showModal();
    ensureSearch();
  }, []);

  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (entry: SearchEntry | undefined): void => {
    if (entry !== undefined) location.hash = entry.route;
  };

  return (
    <dialog
      ref={dialog}
      class="palette"
      aria-label="Search the notes"
      onClose={() => {
        if (overlay.value === 'palette') overlay.value = null;
      }}
      onMouseDown={(event) => closeOnBackdrop(event.currentTarget, event)}
      onClick={(event) => {
        const option = event.target instanceof Element ? event.target.closest('[role="option"]') : null;
        if (option !== null) go(results[Number(option.getAttribute('data-index'))]);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const step = event.key === 'ArrowDown' ? 1 : -1;
          setActive((i) => Math.min(Math.max(i + step, 0), Math.max(results.length - 1, 0)));
        } else if (event.key === 'Enter') {
          event.preventDefault();
          go(results[active]);
        }
      }}
    >
      <input
        class="palette-input"
        type="search"
        role="combobox"
        aria-label="Search"
        aria-autocomplete="list"
        aria-controls={expanded ? 'palette-results' : undefined}
        aria-expanded={expanded}
        aria-activedescendant={expanded ? optionId(active) : undefined}
        placeholder="Search lessons, concepts and terms"
        autocomplete="off"
        spellcheck={false}
        value={query}
        onInput={(event) => {
          setQuery(event.currentTarget.value);
          setActive(0);
        }}
      />
      {expanded ? (
        <div id="palette-results" class="results" role="listbox" aria-label="Results">
          {results.map((entry, i) => (
            <div
              key={`${entry.kind} ${entry.route}`}
              id={optionId(i)}
              class="result"
              role="option"
              aria-selected={i === active}
              tabIndex={-1}
              data-index={i}
            >
              <span class="result-kind">{KIND_LABEL[entry.kind]}</span>
              <span class="result-main">
                <span class="result-title">{entry.title}</span>
                <span class="result-detail">{entry.detail}</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p class="muted palette-status" role="status">
          {entries === null ? 'Loading' : 'No results'}
        </p>
      )}
    </dialog>
  );
}
