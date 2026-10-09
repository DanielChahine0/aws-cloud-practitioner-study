import type { ModuleMeta } from '../../schemas/chunks.ts';
import { neighbors, up } from './nav.ts';
import { type Route, toHash } from './router.ts';

/** The parts of a keydown event the shortcuts look at. */
export interface KeyInput {
  key: string;
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  /** True when the event comes from a text field. */
  typing: boolean;
  /** The event's timestamp in milliseconds. */
  at: number;
}

export interface KeyContext {
  route: Route;
  modules: readonly ModuleMeta[];
  overlayOpen: boolean;
  termOpen: boolean;
  /** When `g` was pressed, if it was the previous key. */
  gAt: number | null;
}

export type KeyCommand =
  | { kind: 'palette' }
  | { kind: 'help' }
  | { kind: 'close-term' }
  | { kind: 'g'; at: number }
  | { kind: 'navigate'; hash: string };

/** How long `g` waits for its second key. */
export const G_WINDOW_MS = 1000;
/** Keys that only modify the next one and send a keydown of their own first, like the Shift of Shift+H. */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'CapsLock']);

/** One keydown as keyboard.ts handles it: the command, and when `g` is pending, which a modifier's own keydown keeps. */
export function keyStep(
  input: KeyInput,
  ctx: KeyContext,
): { command: KeyCommand | null; gAt: number | null } {
  if (MODIFIER_KEYS.has(input.key)) return { command: null, gAt: ctx.gAt };
  const command = keyCommand(input, ctx);
  return { command, gAt: command?.kind === 'g' ? command.at : null };
}

/** The global shortcuts of spec 7.4 that Phase 0 has; null means the key is not ours. */
export function keyCommand(input: KeyInput, ctx: KeyContext): KeyCommand | null {
  const key = input.key.length === 1 ? input.key.toLowerCase() : input.key;
  if ((input.meta || input.ctrl) && !input.alt && key === 'k') return { kind: 'palette' };
  if (input.meta || input.ctrl || input.alt || ctx.overlayOpen) return null;
  if (key === 'Escape' && ctx.termOpen) return { kind: 'close-term' };
  if (input.typing) return null;
  switch (key) {
    case '/':
      return { kind: 'palette' };
    case '?':
      return { kind: 'help' };
    case 'g':
      return { kind: 'g', at: input.at };
    case 'h':
      return ctx.gAt !== null && input.at - ctx.gAt <= G_WINDOW_MS ? { kind: 'navigate', hash: '#/' } : null;
    case 'Escape': {
      const parent = up(ctx.route);
      return parent === null ? null : { kind: 'navigate', hash: toHash(parent) };
    }
    case '[':
    case ']': {
      if (ctx.route.kind !== 'lesson') return null;
      const { prev, next } = neighbors(ctx.modules, ctx.route.module, ctx.route.slug);
      const target = key === '[' ? prev : next;
      return target === null
        ? null
        : {
            kind: 'navigate',
            hash: toHash({ kind: 'lesson', module: target.module, slug: target.slug, anchor: null }),
          };
    }
    default:
      return null;
  }
}
