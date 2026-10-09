/** The parts of a dialog and a mouse event that `closeOnBackdrop` reads, so tests can pass plain objects. */
export interface DialogLike {
  getBoundingClientRect: () => { left: number; right: number; top: number; bottom: number };
  close: () => void;
}

export interface PressLike {
  target: unknown;
  clientX: number;
  clientY: number;
}

/**
 * Closes a modal dialog when a press lands on its backdrop: the event targets the dialog itself,
 * but outside its box (a press on the dialog's padding or scrollbar also targets the dialog).
 */
export function closeOnBackdrop(dialog: DialogLike, event: PressLike): void {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  const inside =
    event.clientX >= box.left &&
    event.clientX <= box.right &&
    event.clientY >= box.top &&
    event.clientY <= box.bottom;
  if (!inside) dialog.close();
}
