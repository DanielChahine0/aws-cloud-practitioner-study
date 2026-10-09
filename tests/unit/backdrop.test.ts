import { describe, expect, it } from 'vitest';
import { closeOnBackdrop } from '../../src/ui/backdrop.ts';

function fakeDialog() {
  const dialog = {
    closed: false,
    getBoundingClientRect: () => ({ left: 100, right: 500, top: 100, bottom: 400 }),
    close() {
      dialog.closed = true;
    },
  };
  return dialog;
}

describe('closeOnBackdrop', () => {
  it('closes on a press outside the dialog box', () => {
    const dialog = fakeDialog();
    closeOnBackdrop(dialog, { target: dialog, clientX: 50, clientY: 200 });
    expect(dialog.closed).toBe(true);
  });

  it('stays open for a press on the dialog itself, such as its scrollbar, or on its content', () => {
    const dialog = fakeDialog();
    closeOnBackdrop(dialog, { target: dialog, clientX: 495, clientY: 200 });
    closeOnBackdrop(dialog, { target: {}, clientX: 50, clientY: 200 });
    expect(dialog.closed).toBe(false);
  });
});
