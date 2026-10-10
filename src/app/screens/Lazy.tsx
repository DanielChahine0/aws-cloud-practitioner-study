import type { ComponentType } from 'preact';
import { useEffect, useState } from 'preact/hooks';

/** The line a lazy screen shows when its code cannot load, which offline means the service worker lacks it. */
export const LAZY_ERROR = 'This screen could not load. Check your connection and reload.';

/**
 * A screen whose code loads on first use through `import()`, so exam code stays out of the initial bundle
 * (the 50 KB budget of spec 2.10); it shows `Loading` until then.
 */
export function lazyScreen<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<ComponentType<P>> | null = null;
  return function LazyScreen(props: P) {
    const [, setReady] = useState(0);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (loaded !== null) return;
      pending ??= load();
      let live = true;
      pending.then(
        (component) => {
          loaded = component;
          if (live) setReady((n) => n + 1);
        },
        () => {
          pending = null;
          if (live) setFailed(true);
        },
      );
      return () => {
        live = false;
      };
    }, []);
    if (loaded !== null) {
      const Loaded = loaded;
      return <Loaded {...props} />;
    }
    return failed ? <p role="alert">{LAZY_ERROR}</p> : <p class="muted">Loading</p>;
  };
}
