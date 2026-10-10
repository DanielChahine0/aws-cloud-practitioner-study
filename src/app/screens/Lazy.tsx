import type { ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

/** The line a lazy screen shows when its code cannot load, which offline means the service worker lacks it. */
export const LAZY_ERROR = 'This screen could not load. Check your connection and reload.';

/** One shared `import()` that every mounted instance of a lazy screen joins. */
export interface LazyLoader<T> {
  /** The loaded value, or null until the load resolves. */
  current(): T | null;
  /**
   * Starts or joins the load for an instance whose render showed `shown`, and calls `settled` once that render is stale:
   * when the load resolves or fails, or at once when it already resolved after the render.
   * The returned function detaches the instance, so an unmounted one is never called.
   */
  attach(shown: T | null, settled: (failed: boolean) => void): () => void;
}

export function lazyLoader<T>(load: () => Promise<T>): LazyLoader<T> {
  let loaded: T | null = null;
  let pending: Promise<T> | null = null;
  return {
    current: () => loaded,
    attach(shown, settled) {
      if (loaded !== null) {
        if (shown !== loaded) settled(false);
        return () => {};
      }
      pending ??= load();
      let live = true;
      pending.then(
        (value) => {
          loaded = value;
          if (live) settled(false);
        },
        () => {
          pending = null;
          if (live) settled(true);
        },
      );
      return () => {
        live = false;
      };
    },
  };
}

/**
 * A screen whose code loads on first use through `import()`, so exam code stays out of the initial bundle
 * (the 50 KB budget of spec 2.10); it shows `Loading` until then.
 */
export function lazyScreen<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  const loader = lazyLoader(load);
  return function LazyScreen(props: P) {
    const [, setReady] = useState(0);
    const [failed, setFailed] = useState(false);
    // Preact runs effects after paint, so the load can resolve between the first render and its effect.
    const shown = useRef(loader.current());
    useEffect(
      () => loader.attach(shown.current, (didFail) => (didFail ? setFailed(true) : setReady((n) => n + 1))),
      [],
    );
    const Loaded = loader.current();
    if (Loaded !== null) return <Loaded {...props} />;
    return failed ? <p role="alert">{LAZY_ERROR}</p> : <p class="muted">Loading</p>;
  };
}
