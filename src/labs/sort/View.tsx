import type { SortAction, SortSpec } from '../../../schemas/lab.ts';
import { TRAY_EMPTY } from '../../app/lab.ts';
import type { SortState } from './model.ts';

export interface SortViewProps {
  spec: SortSpec;
  state: SortState;
  /** The card picked up, or null. */
  held: string | null;
  onHold(card: string | null): void;
  onAction(action: SortAction): void;
}

/**
 * The Sort board (spec 5.1): tap a card to pick it up, then tap a bucket to place it; tapping the held card puts it
 * down. Nothing needs dragging (WCAG 2.5.7), and the lab screen mirrors every tap with a key.
 * The tray and the buckets are two regions, each one tab stop; the lab screen moves the roving tab stop.
 */
export function SortView({ spec, state, held, onHold, onAction }: SortViewProps) {
  const card = (id: string) => {
    const c = spec.cards.find((x) => x.id === id);
    if (c === undefined) return null;
    return (
      <button
        key={c.id}
        type="button"
        class="card"
        aria-pressed={held === c.id}
        data-lab-item
        data-card={c.id}
        tabIndex={-1}
        onClick={() => onHold(held === c.id ? null : c.id)}
      >
        {c.text}
      </button>
    );
  };
  const tray = state.cards.filter((id) => state.placed[id] === undefined);
  return (
    <>
      <fieldset class="sort-tray" data-lab-region>
        <legend class="visually-hidden">Cards</legend>
        {tray.length === 0 ? <p class="muted">{TRAY_EMPTY}</p> : tray.map(card)}
      </fieldset>
      <div class="buckets" data-lab-region>
        {spec.buckets.map((b, i) => {
          const inside = state.cards.filter((id) => state.placed[id] === b.id);
          return (
            <section key={b.id} class="bucket" aria-labelledby={`bucket-${b.id}`}>
              <button
                id={`bucket-${b.id}`}
                type="button"
                class="bucket-target"
                data-lab-item
                data-bucket={b.id}
                tabIndex={-1}
                onClick={() => {
                  if (held !== null) onAction({ t: 'place', card: held, bucket: b.id });
                }}
              >
                <span class="bucket-n" aria-hidden="true">
                  {i < 9 ? i + 1 : 0}
                </span>{' '}
                <span class="bucket-label">{b.label}</span>{' '}
                <span class="bucket-count">({inside.length})</span>
              </button>
              {b.detail !== undefined && <p class="muted bucket-detail">{b.detail}</p>}
              {inside.map(card)}
            </section>
          );
        })}
      </div>
    </>
  );
}
