import type { PlaceAction, PlaceSpec } from '../../../schemas/lab-place.ts';
import { DOWN_MARK, FAILURE_LEGEND, failureButton, PIECES_EMPTY, PIECES_LEGEND } from '../../app/lab.ts';
import { isDown, type PlaceState } from './model.ts';

export interface PlaceViewProps {
  spec: PlaceSpec;
  state: PlaceState;
  /** The piece picked up, or null. */
  held: string | null;
  onHold(piece: string | null): void;
  onAction(action: PlaceAction): void;
}

type Container = PlaceSpec['containers'][number];

/**
 * The Place board (spec 5.1): tap a piece to pick it up, then tap a slot to place it; tapping the held piece puts it
 * down. The map nests the containers in slot order, so the slot numbers run in sequence and the bench comes last.
 * The tray and the map are two regions, each one tab stop; the failure buttons preview one failure at a time and never
 * change a check. Nothing needs dragging (WCAG 2.5.7), and the lab screen mirrors every tap with a key.
 */
export function PlaceView({ spec, state, held, onHold, onAction }: PlaceViewProps) {
  const down = (slot: string): boolean => state.failed !== null && isDown(spec, slot, state.failed);
  const piece = (id: string, slot: string | null) => {
    const p = spec.pieces.find((x) => x.id === id);
    if (p === undefined) return null;
    return (
      <button
        key={p.id}
        type="button"
        class="piece"
        aria-pressed={held === p.id}
        data-lab-item
        data-piece={p.id}
        tabIndex={-1}
        onClick={() => onHold(held === p.id ? null : p.id)}
      >
        {p.label}
        {slot !== null && down(slot) && <span class="down-mark"> {DOWN_MARK}</span>}
        {slot === null && p.detail !== undefined && <span class="piece-detail">{p.detail}</span>}
      </button>
    );
  };
  const box = (c: Container) => {
    const children = spec.containers.filter((k) => k.parent === c.id);
    const n = state.slots.indexOf(c.id);
    const failedHere = state.failed === c.id;
    const mark = failedHere && <span class="down-mark"> {DOWN_MARK}</span>;
    const inside = state.pieces.filter((id) => state.placed[id] === c.id);
    return (
      <section
        key={c.id}
        class={failedHere ? 'place-box is-down' : 'place-box'}
        data-kind={c.kind}
        aria-labelledby={`place-${c.id}`}
      >
        {children.length === 0 ? (
          <button
            id={`place-${c.id}`}
            type="button"
            class="slot-target"
            data-lab-item
            data-slot={c.id}
            tabIndex={-1}
            onClick={() => {
              if (held !== null) onAction({ t: 'place', piece: held, slot: c.id });
            }}
          >
            {n >= 0 && n < 10 && (
              <span class="slot-n" aria-hidden="true">
                {n < 9 ? n + 1 : 0}
              </span>
            )}{' '}
            {c.label} <span class="slot-count">({inside.length})</span>
            {mark}
          </button>
        ) : (
          <p id={`place-${c.id}`} class="place-name">
            {c.label}
            {mark}
          </p>
        )}
        {c.detail !== undefined && <p class="muted place-detail">{c.detail}</p>}
        {children.length === 0 ? inside.map((id) => piece(id, c.id)) : children.map(box)}
      </section>
    );
  };
  const tops = spec.containers.filter((c) => c.parent === undefined && c.kind !== 'bench');
  const bench = spec.containers.find((c) => c.kind === 'bench');
  const tray = state.pieces.filter((id) => state.placed[id] === undefined);
  return (
    <>
      <fieldset class="place-tray" data-lab-region>
        <legend class="visually-hidden">{PIECES_LEGEND}</legend>
        {tray.length === 0 ? <p class="muted">{PIECES_EMPTY}</p> : tray.map((id) => piece(id, null))}
      </fieldset>
      <div class="place-map" data-lab-region>
        {tops.map(box)}
        {bench !== undefined && box(bench)}
      </div>
      {spec.failures.length > 0 && (
        <fieldset class="place-failures">
          <legend>{FAILURE_LEGEND}</legend>
          {spec.failures.map((id) => (
            <button
              key={id}
              type="button"
              class="button button-quiet lab-button"
              aria-pressed={state.failed === id}
              onClick={() => onAction(state.failed === id ? { t: 'restore' } : { t: 'fail', container: id })}
            >
              {failureButton(spec.containers.find((c) => c.id === id)?.label ?? '')}
            </button>
          ))}
        </fieldset>
      )}
    </>
  );
}
