/** One row of the keyboard help sheet: its keys, the word between them, and the action. */
export interface Shortcut {
  keys: readonly string[];
  joiner: string;
  action: string;
}

/** The rows of the keyboard help sheet (`?`, spec 7.4), in order; every action is unique, so it keys the row. */
export const SHORTCUTS: readonly Shortcut[] = [
  { keys: ['/', 'Cmd+K'], joiner: 'or', action: 'Search' },
  { keys: ['?'], joiner: '', action: 'This help' },
  { keys: ['g', 'h'], joiner: 'then', action: 'Home' },
  { keys: ['g', 'r'], joiner: 'then', action: 'Review' },
  { keys: ['g', 'p'], joiner: 'then', action: 'Progress' },
  { keys: ['Enter'], joiner: '', action: 'Next (Home)' },
  { keys: ['j', 'k'], joiner: 'and', action: 'Move (Home and Module)' },
  { keys: ['[', ']'], joiner: 'and', action: 'Previous or next lesson' },
  { keys: ['c'], joiner: '', action: 'Check yourself' },
  { keys: ['Esc'], joiner: '', action: 'Close, or go up one level' },
  { keys: ['1', '6'], joiner: 'to', action: 'Choose an option (toggle in multi)' },
  { keys: ['Enter'], joiner: '', action: 'Check (not sure), then Next' },
  { keys: ['Shift+Enter'], joiner: '', action: 'Sure' },
  { keys: ['e'], joiner: '', action: 'Expand every explanation' },
  { keys: ['o'], joiner: '', action: 'Read in notes' },
  { keys: ['!'], joiner: '', action: 'Report a problem' },
  { keys: ['1', '5'], joiner: 'to', action: 'Match: pick a left item' },
  { keys: ['a', 'e'], joiner: 'to', action: 'Match: pair it' },
  { keys: ['Backspace'], joiner: '', action: 'Match: unpair' },
  { keys: ['1', '6'], joiner: 'to', action: 'Exam: choose an option' },
  { keys: ['←', '→'], joiner: 'and', action: 'Exam: previous or next question' },
  { keys: ['f'], joiner: '', action: 'Exam: flag for review' },
  { keys: ['g'], joiner: '', action: 'Exam: open the question grid' },
  { keys: ['Ctrl+Enter'], joiner: '', action: 'Exam: submit' },
  { keys: ['Tab'], joiner: '', action: 'Lab: next region' },
  { keys: ['↑', '↓'], joiner: 'and', action: 'Lab: move within a region' },
  { keys: ['Space'], joiner: '', action: 'Lab: pick up a card' },
  { keys: ['1', '0'], joiner: 'to', action: 'Lab: place it in that bucket (0 is the tenth)' },
  { keys: ['Backspace'], joiner: '', action: 'Lab: send it back to the tray' },
  { keys: ['Enter'], joiner: '', action: 'Lab: check the goals' },
  { keys: ['h'], joiner: '', action: 'Lab: show a hint' },
  { keys: ['r'], joiner: '', action: 'Lab: reset' },
];
